use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::io::Read;
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Serialize)]
pub struct DockerContainer {
    id: String,
    name: String,
    state: String,
    cpu_percent: Option<f64>,
    memory_bytes: Option<u64>,
}
#[derive(Clone, Serialize)]
pub struct DockerState {
    running: usize,
    stopped: usize,
    total: usize,
    containers: Vec<DockerContainer>,
    cpu_percent: Option<f64>,
    memory_bytes: Option<u64>,
    stats_count: usize,
    stats_error: Option<String>,
}
static CACHE: Mutex<Option<(Instant, DockerState)>> = Mutex::new(None);
fn parse_containers(output: &str) -> Result<DockerState, String> {
    let mut containers = Vec::new();
    let mut ids = HashSet::new();
    for line in output.lines().filter(|s| !s.trim().is_empty()) {
        if containers.len() >= 10000 {
            return Err("Docker container list exceeds the size limit".into());
        }
        let row: serde_json::Value =
            serde_json::from_str(line).map_err(|_| "Docker returned invalid container data")?;
        let id = row["ID"]
            .as_str()
            .filter(|v| (12..=64).contains(&v.len()) && v.bytes().all(|c| c.is_ascii_hexdigit()))
            .ok_or("Invalid Docker container ID")?;
        if !ids.insert(id.to_owned()) {
            return Err("Docker returned duplicate containers".into());
        }
        let state = row["State"]
            .as_str()
            .filter(|v| {
                [
                    "running",
                    "created",
                    "restarting",
                    "removing",
                    "paused",
                    "exited",
                    "dead",
                ]
                .contains(v)
            })
            .ok_or("Unknown Docker container state")?;
        let name = row["Names"]
            .as_str()
            .filter(|v| !v.is_empty() && v.len() <= 1024)
            .ok_or("Docker container name unavailable")?;
        containers.push(DockerContainer {
            id: id.into(),
            name: name.into(),
            state: state.into(),
            cpu_percent: None,
            memory_bytes: None,
        });
    }
    let running = containers.iter().filter(|c| c.state == "running").count();
    let total = containers.len();
    Ok(DockerState {
        running,
        stopped: total - running,
        total,
        containers,
        cpu_percent: None,
        memory_bytes: None,
        stats_count: 0,
        stats_error: None,
    })
}
fn memory_bytes(value: &str) -> Result<u64, String> {
    let value = value.split('/').next().unwrap_or("").trim();
    let boundary = value
        .find(|c: char| !c.is_ascii_digit() && c != '.')
        .unwrap_or(value.len());
    let amount = value[..boundary]
        .parse::<f64>()
        .map_err(|_| "Invalid Docker memory statistic")?;
    let multiplier = match value[boundary..].trim() {
        "B" => 1.0,
        "kB" | "KB" => 1e3,
        "MB" => 1e6,
        "GB" => 1e9,
        "TB" => 1e12,
        "KiB" => 1024.0,
        "MiB" => 1048576.0,
        "GiB" => 1073741824.0,
        "TiB" => 1099511627776.0,
        _ => return Err("Unknown Docker memory unit".into()),
    };
    let bytes = amount * multiplier;
    if !bytes.is_finite() || bytes < 0.0 || bytes > u64::MAX as f64 {
        return Err("Invalid Docker memory statistic".into());
    }
    Ok(bytes.round() as u64)
}
fn apply_stats(state: &mut DockerState, output: &str) -> Result<(), String> {
    let mut values = HashMap::new();
    for line in output.lines().filter(|s| !s.trim().is_empty()) {
        if values.len() >= 10000 {
            return Err("Too many Docker statistics".into());
        }
        let row: serde_json::Value =
            serde_json::from_str(line).map_err(|_| "Invalid Docker statistics")?;
        let id = row["ID"]
            .as_str()
            .ok_or("Docker statistic has no container ID")?;
        let cpu = row["CPUPerc"]
            .as_str()
            .and_then(|v| v.trim().strip_suffix('%'))
            .and_then(|v| v.trim().parse::<f64>().ok())
            .filter(|v| v.is_finite() && *v >= 0.0 && *v <= 1000000.0)
            .ok_or("Invalid Docker CPU statistic")?;
        let memory = memory_bytes(
            row["MemUsage"]
                .as_str()
                .ok_or("Docker memory unavailable")?,
        )?;
        if values.insert(id.to_owned(), (cpu, memory)).is_some() {
            return Err("Duplicate Docker statistics".into());
        }
    }
    let mut cpu = 0.0;
    let mut memory = 0u64;
    for container in &mut state.containers {
        if let Some((c, m)) = values.get(&container.id) {
            container.cpu_percent = Some(*c);
            container.memory_bytes = Some(*m);
            cpu += c;
            memory = memory
                .checked_add(*m)
                .ok_or("Docker memory total overflow")?;
            state.stats_count += 1;
        }
    }
    if state.stats_count > 0
        || state
            .containers
            .iter()
            .all(|c| !["running", "paused", "restarting"].contains(&c.state.as_str()))
    {
        state.cpu_percent = Some(cpu);
        state.memory_bytes = Some(memory);
    }
    Ok(())
}
fn docker(args: &[&str]) -> Result<String, String> {
    let mut child = Command::new("docker.exe")
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|_| "Docker CLI unavailable")?;
    let reader = child.stdout.take().ok_or("Docker output unavailable")?;
    let (sender, receiver) = mpsc::sync_channel(1);
    std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let read = reader.take(2097153).read_to_end(&mut bytes);
        let _ = sender.send(read.map(|_| bytes));
    });
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() < Duration::from_secs(10) => {
                std::thread::sleep(Duration::from_millis(25))
            }
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Docker request timed out".into());
            }
        }
    };
    let bytes = receiver
        .recv_timeout(Duration::from_secs(1))
        .map_err(|_| "Docker output timed out")?
        .map_err(|_| "Could not read Docker output")?;
    if bytes.len() > 2097152 {
        return Err("Docker output exceeds the size limit".into());
    }
    if !status.success() {
        return Err("Docker daemon unavailable or access denied".into());
    }
    String::from_utf8(bytes).map_err(|_| "Docker returned invalid UTF-8".into())
}
fn docker_state() -> Result<DockerState, String> {
    let mut cache = CACHE.lock().map_err(|_| "Docker cache unavailable")?;
    if let Some((at, state)) = cache.as_ref() {
        if at.elapsed() < Duration::from_secs(5) {
            return Ok(state.clone());
        }
    }
    let mut state = parse_containers(&docker(&[
        "container",
        "ls",
        "--all",
        "--no-trunc",
        "--format",
        "{{json .}}",
    ])?)?;
    if state
        .containers
        .iter()
        .any(|c| ["running", "paused", "restarting"].contains(&c.state.as_str()))
    {
        match docker(&[
            "container",
            "stats",
            "--no-stream",
            "--no-trunc",
            "--format",
            "{{json .}}",
        ]) {
            Ok(output) => {
                if let Err(error) = apply_stats(&mut state, &output) {
                    state.stats_error = Some(error)
                }
            }
            Err(error) => state.stats_error = Some(error),
        }
    } else {
        apply_stats(&mut state, "")?;
    }
    *cache = Some((Instant::now(), state.clone()));
    Ok(state)
}
#[tauri::command]
pub async fn widget_docker(window: tauri::Window) -> Result<DockerState, String> {
    if !["desktop-dock", "widget-dev_docker"].contains(&window.label()) {
        return Err("Docker information unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(docker_state)
        .await
        .map_err(|_| "Docker request failed".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn aggregates_actual_cpu_and_memory_without_truncating_the_list() {
        let mut state=parse_containers("{\"ID\":\"abcdef123456\",\"Names\":\"api\",\"State\":\"running\"}\n{\"ID\":\"abcdef123457\",\"Names\":\"worker\",\"State\":\"exited\"}\n").unwrap();
        apply_stats(
            &mut state,
            "{\"ID\":\"abcdef123456\",\"CPUPerc\":\"125.50%\",\"MemUsage\":\"2.5MiB / 1GiB\"}",
        )
        .unwrap();
        assert_eq!(
            (state.running, state.stopped, state.total, state.stats_count),
            (1, 1, 2, 1)
        );
        assert_eq!(state.cpu_percent, Some(125.5));
        assert_eq!(state.memory_bytes, Some(2621440));
        assert_eq!(state.containers[0].name, "api");
        let many = (0..101)
            .map(|i| {
                format!("{{\"ID\":\"{i:012x}\",\"Names\":\"item{i}\",\"State\":\"exited\"}}\n")
            })
            .collect::<String>();
        assert_eq!(parse_containers(&many).unwrap().total, 101);
    }
    #[test]
    fn invalid_data_never_turns_into_zero_resource_usage() {
        assert_eq!(memory_bytes("38.21 MiB").unwrap(), 40066089);
        assert_eq!(memory_bytes("1.5MB / 2GB").unwrap(), 1500000);
        for value in ["NaNMiB", "-1MiB", "1 unknown", ""] {
            assert!(memory_bytes(value).is_err());
        }
        assert!(parse_containers("{\"ID\":\"not-an-id\",\"State\":\"running\"}").is_err());
        let mut state =
            parse_containers("{\"ID\":\"abcdef123456\",\"Names\":\"api\",\"State\":\"running\"}")
                .unwrap();
        apply_stats(&mut state, "").unwrap();
        assert!(state.cpu_percent.is_none());
        assert!(state.memory_bytes.is_none());
        assert!(apply_stats(
            &mut state,
            "{\"ID\":\"abcdef123456\",\"CPUPerc\":\"NaN%\",\"MemUsage\":\"2B\"}"
        )
        .is_err());
    }
}

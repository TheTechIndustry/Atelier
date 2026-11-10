use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Read, Write};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant};

static CACHE: Mutex<Option<(PathBuf, Instant, Value)>> = Mutex::new(None);

struct Server(Child);
impl Drop for Server {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn packaged_codex() -> Option<PathBuf> {
    use windows::core::{w, PWSTR};
    use windows::Win32::Storage::Packaging::Appx::{
        GetPackagePathByFullName, GetPackagesByPackageFamily,
    };
    unsafe {
        let mut count = 0u32;
        let mut size = 0u32;
        let family = w!("OpenAI.Codex_2p2nqsd0c76g0");
        let _ = GetPackagesByPackageFamily(family, &mut count, None, &mut size, PWSTR::null());
        if count == 0 || count > 128 || size == 0 || size > 65536 {
            return None;
        }
        let mut names = vec![PWSTR::null(); count as usize];
        let mut buffer = vec![0u16; size as usize];
        if GetPackagesByPackageFamily(
            family,
            &mut count,
            Some(names.as_mut_ptr()),
            &mut size,
            PWSTR(buffer.as_mut_ptr()),
        )
        .0 != 0
        {
            return None;
        }
        for name in names.into_iter().take(count as usize) {
            if name.is_null() {
                continue;
            }
            let mut len = 0u32;
            let _ = GetPackagePathByFullName(name, &mut len, PWSTR::null());
            if len == 0 || len > 32768 {
                continue;
            }
            let mut path = vec![0u16; len as usize];
            if GetPackagePathByFullName(name, &mut len, PWSTR(path.as_mut_ptr())).0 != 0 {
                continue;
            }
            let end = path.iter().position(|v| *v == 0).unwrap_or(path.len());
            let candidate = PathBuf::from(String::from_utf16_lossy(&path[..end]))
                .join("app")
                .join("resources")
                .join("codex.exe");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
        None
    }
}

fn executable_path(value: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(value);
    if value == "codex.exe" {
        let from_path = std::env::var_os("PATH")
            .into_iter()
            .flat_map(|value| std::env::split_paths(&value).collect::<Vec<_>>())
            .filter(|dir| dir.is_absolute())
            .map(|dir| dir.join("codex.exe"))
            .find(|path| path.is_file());
        if let Some(path) = from_path {
            return Ok(path);
        }
        if let Some(path) = packaged_codex() {
            return Ok(path);
        }
        for (var, suffix) in [
            ("USERPROFILE", ".cargo\\bin\\codex.exe"),
            ("LOCALAPPDATA", "Microsoft\\WindowsApps\\codex.exe"),
        ] {
            if let Some(path) = std::env::var_os(var)
                .map(|root| PathBuf::from(root).join(suffix))
                .filter(|path| path.is_file())
            {
                return Ok(path);
            }
        }
        if let Some(root) = std::env::var_os("ProgramFiles") {
            let mut packages: Vec<_> = std::fs::read_dir(PathBuf::from(root).join("WindowsApps"))
                .into_iter()
                .flatten()
                .flatten()
                .filter(|entry| {
                    entry
                        .file_name()
                        .to_string_lossy()
                        .starts_with("OpenAI.Codex_")
                })
                .map(|entry| entry.path().join("app").join("resources").join("codex.exe"))
                .filter(|path| path.is_file())
                .collect();
            packages.sort();
            if let Some(path) = packages.pop() {
                return Ok(path);
            }
        }
        return Err(
            "Codex CLI not found; install Codex CLI or set its absolute codex.exe path".into(),
        );
    }
    if !path.is_absolute()
        || !path
            .file_name()
            .is_some_and(|v| v.eq_ignore_ascii_case("codex.exe"))
        || !path.is_file()
    {
        return Err("Set the absolute path to an installed codex.exe".into());
    }
    Ok(path)
}

fn sanitize_quota(value: &Value) -> Result<Value, String> {
    let bucket = value
        .get("rateLimitsByLimitId")
        .and_then(|v| v.get("codex"))
        .or_else(|| {
            value.get("rateLimits").filter(|v| {
                v.get("limitId")
                    .and_then(Value::as_str)
                    .is_none_or(|id| id == "codex")
            })
        })
        .ok_or("No Codex plan quota returned; sign in to Codex with ChatGPT")?;
    let mut rows = Vec::new();
    for field in ["primary", "secondary"] {
        let Some(window) = bucket.get(field).filter(|v| !v.is_null()) else {
            continue;
        };
        let used = window["usedPercent"]
            .as_f64()
            .filter(|v| v.is_finite() && *v >= 0.0 && *v <= 100.0)
            .ok_or("Invalid Codex usage percentage")?;
        let minutes = window["windowDurationMins"]
            .as_u64()
            .filter(|v| *v > 0 && *v <= 525600)
            .ok_or("Invalid Codex quota duration")?;
        let reset = window["resetsAt"]
            .as_u64()
            .filter(|v| *v <= 4102444800)
            .ok_or("Invalid Codex quota reset")?;
        rows.push(json!({"used_percent":used,"window_minutes":minutes,"resets_at":reset}));
    }
    if rows.is_empty() {
        return Err("Codex returned no quota windows".into());
    }
    let plan = bucket
        .get("planType")
        .and_then(Value::as_str)
        .filter(|v| v.len() <= 64);
    Ok(json!({"windows":rows,"plan":plan}))
}

fn exchange(mut reader: impl BufRead, mut writer: impl Write) -> Result<Value, String> {
    let send = |writer: &mut dyn Write, value: Value| -> Result<(), String> {
        serde_json::to_writer(&mut *writer, &value).map_err(|_| "Could not write to Codex")?;
        writer
            .write_all(b"\n")
            .and_then(|_| writer.flush())
            .map_err(|_| "Could not write to Codex".into())
    };
    send(
        &mut writer,
        json!({"id":0,"method":"initialize","params":{"clientInfo":{"name":"atelier_widgets","title":"Atelier Widgets","version":env!("CARGO_PKG_VERSION")}}}),
    )?;
    let mut initialized = false;
    let mut total = 0;
    for _ in 0..128 {
        let mut bytes = Vec::new();
        let count = reader
            .by_ref()
            .take(65537)
            .read_until(b'\n', &mut bytes)
            .map_err(|_| "Could not read Codex response")?;
        total += count;
        if count == 0 {
            return Err("Codex closed the connection".into());
        }
        if count > 65536 || total > 1048576 {
            return Err("Codex response exceeded the size limit".into());
        }
        let value: Value =
            serde_json::from_slice(&bytes).map_err(|_| "Codex returned invalid JSON")?;
        if value.get("id") == Some(&json!(0)) {
            if initialized
                || value.get("error").is_some()
                || !value.get("result").is_some_and(Value::is_object)
            {
                return Err("Codex app-server initialization failed; update the CLI".into());
            }
            initialized = true;
            send(&mut writer, json!({"method":"initialized","params":{}}))?;
            send(
                &mut writer,
                json!({"id":1,"method":"account/rateLimits/read"}),
            )?;
        } else if value.get("id") == Some(&json!(1)) && initialized {
            if value.get("error").is_some() {
                return Err("Cannot read Codex quotas; sign in with ChatGPT in Codex".into());
            }
            return sanitize_quota(&value["result"]);
        }
    }
    Err("Codex returned too many notifications".into())
}

fn quota(executable: &str) -> Result<Value, String> {
    let path = executable_path(executable)?;
    let mut cache = CACHE.lock().map_err(|_| "Codex quota cache unavailable")?;
    if let Some((cached_path, at, result)) = cache.as_ref() {
        if *cached_path == path && at.elapsed() < Duration::from_secs(60) {
            return Ok(result.clone());
        }
    }
    let mut child = Server(
        Command::new(&path)
            .args(["app-server", "--listen", "stdio://"])
            .current_dir(std::env::temp_dir())
            .creation_flags(0x08000000)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|_| "Could not start Codex app-server")?,
    );
    let reader = child.0.stdout.take().ok_or("Codex output unavailable")?;
    let writer = child.0.stdin.take().ok_or("Codex input unavailable")?;
    let (sender, receiver) = mpsc::sync_channel(1);
    std::thread::spawn(move || {
        let _ = sender.send(exchange(BufReader::new(reader), writer));
    });
    let result = receiver
        .recv_timeout(Duration::from_secs(20))
        .map_err(|_| "Codex quota request timed out")??;
    *cache = Some((path, Instant::now(), result.clone()));
    Ok(result)
}

#[tauri::command]
pub async fn widget_codex_quota(
    window: tauri::Window,
    executable: String,
) -> Result<Value, String> {
    if !["main", "desktop-dock", "widget-ai_chatgpt"].contains(&window.label()) {
        return Err("Codex quotas unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || quota(&executable))
        .await
        .map_err(|_| "Codex quota request failed".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore]
    fn live_packaged_codex_connection() {
        assert!(
            packaged_codex().is_some(),
            "Packaged Codex was not detected"
        );
        match quota("codex.exe") {
            Ok(data) => assert!(data["windows"]
                .as_array()
                .is_some_and(|rows| !rows.is_empty())),
            Err(error) => panic!("Codex quota request failed: {error}"),
        }
    }
    #[test]
    fn performs_handshake_without_creating_an_agent_turn() {
        let input = concat!("{\"id\":0,\"result\":{}}\n", "{\"method\":\"account/updated\",\"params\":{}}\n", "{\"id\":1,\"result\":{\"rateLimits\":{\"primary\":{\"usedPercent\":25,\"windowDurationMins\":300,\"resetsAt\":1800000000}}}}\n");
        let mut output = Vec::new();
        let value = exchange(input.as_bytes(), &mut output).unwrap();
        assert_eq!(value["windows"][0]["used_percent"], 25.0);
        let requests: Vec<Value> = String::from_utf8(output)
            .unwrap()
            .lines()
            .map(|s| serde_json::from_str(s).unwrap())
            .collect();
        assert_eq!(
            requests
                .iter()
                .map(|v| v["method"].as_str().unwrap())
                .collect::<Vec<_>>(),
            ["initialize", "initialized", "account/rateLimits/read"]
        );
    }
    #[test]
    fn refuses_missing_malformed_and_wrong_bucket_quotas() {
        for value in [
            json!({}),
            json!({"rateLimits":{"limitId":"other","primary":{"usedPercent":1,"windowDurationMins":300,"resetsAt":1800000000}}}),
            json!({"rateLimits":{"primary":{"usedPercent":101,"windowDurationMins":300,"resetsAt":1800000000}}}),
            json!({"rateLimits":{"primary":{"usedPercent":1}}}),
        ] {
            assert!(sanitize_quota(&value).is_err());
        }
        assert!(exchange(b"{\"id\":0,\"error\":{}}\n".as_slice(), Vec::new()).is_err());
        assert!(exchange(&vec![b'x'; 65537][..], Vec::new()).is_err());
    }
    #[test]
    fn selects_codex_bucket_without_returning_other_account_data() {
        let result = sanitize_quota(&json!({"email":"private@example.com","rateLimitsByLimitId":{"codex":{"planType":"plus","primary":{"usedPercent":0,"windowDurationMins":10080,"resetsAt":1800000000}}}})).unwrap();
        assert_eq!(result["plan"], "plus");
        assert!(result.get("email").is_none());
        assert!(executable_path("./codex.exe").is_err());
        assert!(executable_path("C:/Windows/System32/cmd.exe").is_err());
    }
}

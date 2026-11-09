use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::sync::Mutex;
use std::time::Instant;
use tauri::Manager;
use windows::core::PWSTR;
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::SystemInformation::{GetLocalTime, GetTickCount64};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};

#[derive(Default, Clone, Serialize, Deserialize)]
struct Day {
    date: String,
    seconds: u64,
    hours: Vec<u64>,
    apps: BTreeMap<String, u64>,
}
#[derive(Default)]
struct State {
    days: Vec<Day>,
    last: Option<Instant>,
    dirty: u32,
}
pub struct ScreenTime(Mutex<State>);

fn path() -> std::path::PathBuf {
    super::settings_path()
        .unwrap_or_else(|| std::env::temp_dir().join("Atelier/settings.json"))
        .with_file_name("screen-time.json")
}
impl Default for ScreenTime {
    fn default() -> Self {
        let days: Vec<Day> = std::fs::read(path())
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        Self(Mutex::new(State {
            days,
            ..Default::default()
        }))
    }
}
fn record(days: &mut Vec<Day>, date: &str, hour: usize, app: &str, seconds: u64) {
    if seconds == 0 || hour >= 24 {
        return;
    }
    if !days.iter().any(|day| day.date == date) {
        days.push(Day {
            date: date.into(),
            hours: vec![0; 24],
            ..Default::default()
        });
    }
    days.sort_by(|a, b| a.date.cmp(&b.date));
    if days.len() > 7 {
        days.drain(..days.len() - 7);
    }
    if let Some(day) = days.iter_mut().find(|day| day.date == date) {
        day.hours.resize(24, 0);
        day.seconds = day.seconds.saturating_add(seconds);
        day.hours[hour] = day.hours[hour].saturating_add(seconds);
        *day.apps.entry(app.to_string()).or_default() += seconds;
    }
}
fn active_process() -> Option<String> {
    unsafe {
        let mut info = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            ..Default::default()
        };
        if !GetLastInputInfo(&mut info).as_bool()
            || (GetTickCount64() as u32).wrapping_sub(info.dwTime) > 120_000
        {
            return None;
        }
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut name = [0u16; 32768];
        let mut size = name.len() as u32;
        let result = QueryFullProcessImageNameW(
            process,
            PROCESS_NAME_WIN32,
            PWSTR(name.as_mut_ptr()),
            &mut size,
        );
        let _ = CloseHandle(process);
        if result.is_err() {
            return None;
        }
        let full = String::from_utf16_lossy(&name[..size as usize]);
        std::path::Path::new(&full)
            .file_stem()
            .map(|s| s.to_string_lossy().into_owned())
            .filter(|s| !s.is_empty())
    }
}
fn enabled(app: &tauri::AppHandle) -> bool {
    let kinds = ["prod_screentime", "prod_day_timeline"];
    let desktop = app
        .state::<super::desktop_widgets::Widgets>()
        .0
        .lock()
        .map(|items| {
            items
                .iter()
                .any(|item| item.enabled && kinds.contains(&item.kind.as_str()))
        })
        .unwrap_or(false);
    desktop
        || app
            .state::<super::desktop_dock::DockState>()
            .widgets_enabled(&kinds)
}
fn save(days: &[Day]) -> Result<(), String> {
    let file = path();
    std::fs::create_dir_all(file.parent().ok_or("Invalid settings path")?)
        .map_err(|e| e.to_string())?;
    std::fs::write(file, serde_json::to_vec(days).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}
pub fn start(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            let active = enabled(&app);
            let process = if active { active_process() } else { None };
            let now = Instant::now();
            let local = unsafe { GetLocalTime() };
            let date = format!("{:04}-{:02}-{:02}", local.wYear, local.wMonth, local.wDay);
            if let Ok(mut state) = app.state::<ScreenTime>().0.lock() {
                let elapsed = state
                    .last
                    .replace(now)
                    .map(|last| now.duration_since(last).as_secs().min(6))
                    .unwrap_or(0);
                if active {
                    if let Some(name) = process {
                        record(&mut state.days, &date, local.wHour as usize, &name, elapsed);
                        state.dirty += 1;
                    }
                }
                if state.dirty > 0 {
                    if save(&state.days).is_ok() {
                        state.dirty = 0;
                    }
                }
            }
        }
    });
}
#[tauri::command]
pub fn widget_screen_time(
    window: tauri::Window,
    state: tauri::State<'_, ScreenTime>,
) -> Result<serde_json::Value, String> {
    if ![
        "widget-prod_screentime",
        "widget-prod_day_timeline",
        "desktop-dock",
        "main",
    ]
    .contains(&window.label())
    {
        return Err("Screen time is unavailable to this window".into());
    }
    let now = unsafe { GetLocalTime() };
    let today = format!("{:04}-{:02}-{:02}", now.wYear, now.wMonth, now.wDay);
    let state = state.0.lock().map_err(|e| e.to_string())?;
    let day = state
        .days
        .iter()
        .find(|d| d.date == today)
        .cloned()
        .unwrap_or_else(|| Day {
            date: today,
            hours: vec![0; 24],
            ..Default::default()
        });
    Ok(serde_json::json!({"today":day,"days":state.days}))
}
#[tauri::command]
pub fn widget_screen_time_clear(
    window: tauri::Window,
    state: tauri::State<'_, ScreenTime>,
) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Screen time settings are unavailable to this window".into());
    }
    let mut state = state.0.lock().map_err(|e| e.to_string())?;
    save(&[])?;
    state.days.clear();
    state.last = None;
    state.dirty = 0;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn records_hourly_and_app_totals_and_limits_history() {
        let mut days = Vec::new();
        record(&mut days, "2026-01-01", 10, "editor", 5);
        record(&mut days, "2026-01-01", 10, "editor", 3);
        assert_eq!(days[0].seconds, 8);
        assert_eq!(days[0].hours[10], 8);
        assert_eq!(days[0].apps["editor"], 8);
        for i in 2..=10 {
            record(&mut days, &format!("2026-01-{i:02}"), 12, "browser", 5);
        }
        assert_eq!(days.len(), 7);
        assert_eq!(days[0].date, "2026-01-04");
    }
}

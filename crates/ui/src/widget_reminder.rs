use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use windows::Win32::System::Diagnostics::Debug::MessageBeep;
use windows::Win32::UI::WindowsAndMessaging::MB_ICONINFORMATION;
struct Reminder {
    due: Instant,
    minutes: u32,
    alerted: bool,
}
#[tauri::command]
pub fn widget_break_reminder(
    window: tauri::Window,
    action: String,
    minutes: u32,
) -> Result<serde_json::Value, String> {
    if window.label() != "desktop-dock" && window.label() != "widget-prod_standup" {
        return Err("Break reminder unavailable to this window".into());
    }
    if !["get", "reset"].contains(&action.as_str()) {
        return Err("Unknown reminder action".into());
    }
    static REMINDER: OnceLock<Mutex<Option<Reminder>>> = OnceLock::new();
    let mut state = REMINDER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|e| e.to_string())?;
    let minutes = minutes.clamp(1, 240);
    let now = Instant::now();
    if state
        .as_ref()
        .is_none_or(|reminder| reminder.minutes != minutes)
        || action == "reset"
    {
        *state = Some(Reminder {
            due: now + Duration::from_secs(minutes as u64 * 60),
            minutes,
            alerted: false,
        });
    }
    let reminder = state.as_mut().ok_or("Reminder unavailable")?;
    let due = now >= reminder.due;
    if due && !reminder.alerted {
        reminder.alerted = true;
        unsafe {
            let _ = MessageBeep(MB_ICONINFORMATION);
        }
    }
    Ok(
        serde_json::json!({"due":due,"seconds":reminder.due.saturating_duration_since(now).as_secs()}),
    )
}

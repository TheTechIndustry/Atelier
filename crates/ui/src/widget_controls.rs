use serde::Serialize;
use std::ptr;
use windows::core::PCWSTR;
use windows::Win32::Foundation::HWND;
use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
use windows::Win32::Media::Audio::{
    eCapture, eMultimedia, eRender, IMMDeviceEnumerator, MMDeviceEnumerator,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_ALL, COINIT_MULTITHREADED,
};
use windows::Win32::UI::Shell::{SHEmptyRecycleBinW, SHQueryRecycleBinW, SHQUERYRBINFO};

#[derive(Serialize)]
pub struct AudioState {
    level: u32,
    muted: bool,
}
fn audio_device(kind: &str, action: &str, step: u32) -> Result<AudioState, String> {
    let flow = match kind {
        "volume" => eRender,
        "microphone" => eCapture,
        _ => return Err("Unknown audio device".into()),
    };
    if !["get", "toggle_mute", "up", "down", "set"].contains(&action)
        || (kind == "microphone" && ["up", "down", "set"].contains(&action))
    {
        return Err("Unknown audio action".into());
    }
    unsafe {
        CoInitializeEx(None, COINIT_MULTITHREADED)
            .ok()
            .map_err(|e| e.to_string())?;
        let result = (|| {
            let enumerator: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                    .map_err(|_| "Audio service unavailable")?;
            let device = enumerator
                .GetDefaultAudioEndpoint(flow, eMultimedia)
                .map_err(|_| "No default audio device")?;
            let endpoint: IAudioEndpointVolume = device
                .Activate(CLSCTX_ALL, None)
                .map_err(|_| "Audio controls unavailable")?;
            let level = endpoint
                .GetMasterVolumeLevelScalar()
                .map_err(|_| "Could not read volume")?;
            let muted = endpoint
                .GetMute()
                .map_err(|_| "Could not read mute state")?
                .as_bool();
            match action {
                "toggle_mute" => endpoint
                    .SetMute(!muted, ptr::null())
                    .map_err(|_| "Could not change mute")?,
                "set" => endpoint
                    .SetMasterVolumeLevelScalar(step.min(100) as f32 / 100.0, ptr::null())
                    .map_err(|_| "Could not change volume")?,
                "up" | "down" => {
                    let delta = step.clamp(1, 50) as f32 / 100.0;
                    let next =
                        (level + if action == "up" { delta } else { -delta }).clamp(0.0, 1.0);
                    endpoint
                        .SetMasterVolumeLevelScalar(next, ptr::null())
                        .map_err(|_| "Could not change volume")?;
                }
                _ => {}
            }
            Ok(AudioState {
                level: (endpoint
                    .GetMasterVolumeLevelScalar()
                    .map_err(|_| "Could not read volume")?
                    * 100.0)
                    .round() as u32,
                muted: endpoint
                    .GetMute()
                    .map_err(|_| "Could not read mute state")?
                    .as_bool(),
            })
        })();
        CoUninitialize();
        result
    }
}
#[tauri::command]
pub async fn widget_audio_device(
    window: tauri::Window,
    kind: String,
    action: String,
    step: u32,
) -> Result<AudioState, String> {
    let label = window.label();
    if label != "desktop-dock"
        && !(label == "dynamic-island" && kind == "volume")
        && !(label == "main" && kind == "volume" && action == "get")
        && !(label == "widget-ctrl_volume" && kind == "volume")
        && !(label == "widget-ctrl_mic_mute" && kind == "microphone")
    {
        return Err("Audio controls unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || audio_device(&kind, &action, step))
        .await
        .map_err(|_| "Audio request failed".to_string())?
}
fn brightness(action: &str, value: u32) -> Result<u32, String> {
    use std::os::windows::process::CommandExt;
    if !["get", "set"].contains(&action) {
        return Err("Unknown brightness action".into());
    }
    let script = if action == "set" {
        format!("$m=Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop | Select-Object -First 1; if(!$m){{exit 2}}; Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{{Brightness=[byte]{};Timeout=[uint32]1}} -ErrorAction Stop | Out-Null", value.min(100))
    } else {
        "$b=Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction Stop | Select-Object -First 1 -ExpandProperty CurrentBrightness; if($null -eq $b){exit 2}; [Console]::Write($b)".to_string()
    };
    let output = std::process::Command::new("powershell.exe")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(0x08000000)
        .output()
        .map_err(|_| "Brightness controls unavailable")?;
    if !output.status.success() {
        return Err("Brightness is unavailable for this display".into());
    }
    if action == "set" {
        return Ok(value.min(100));
    }
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<u32>()
        .map(|value| value.min(100))
        .map_err(|_| "Brightness is unavailable for this display".into())
}
#[tauri::command]
pub async fn widget_brightness(
    window: tauri::Window,
    action: String,
    value: u32,
) -> Result<u32, String> {
    if window.label() != "desktop-dock" && window.label() != "widget-ctrl_brightness" {
        return Err("Brightness unavailable to this window".into());
    }
    tauri::async_runtime::spawn_blocking(move || brightness(&action, value))
        .await
        .map_err(|_| "Brightness request failed".to_string())?
}
#[tauri::command]
pub fn widget_open_sound_settings(window: tauri::Window) -> Result<(), String> {
    use windows::core::w;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
    if window.label() != "desktop-dock" && window.label() != "widget-ctrl_audio_switch" {
        return Err("Sound settings unavailable to this window".into());
    }
    let result = unsafe {
        ShellExecuteW(
            None,
            w!("open"),
            w!("ms-settings:sound"),
            None,
            None,
            SW_SHOWNORMAL,
        )
    };
    if result.0 as isize <= 32 {
        Err("Could not open Windows sound settings".into())
    } else {
        Ok(())
    }
}
#[tauri::command]
pub async fn widget_recycle_bin(
    window: tauri::Window,
    action: String,
) -> Result<serde_json::Value, String> {
    if window.label() != "desktop-dock" && window.label() != "widget-ctrl_recycle_bin" {
        return Err("Recycle Bin unavailable to this window".into());
    }
    if !["get", "empty"].contains(&action.as_str()) {
        return Err("Unknown Recycle Bin action".into());
    }
    let owner = window
        .hwnd()
        .map_err(|_| "Recycle Bin window unavailable")?
        .0 as isize;
    tauri::async_runtime::spawn_blocking(move || unsafe {
        if action == "empty" {
            SHEmptyRecycleBinW(HWND(owner as *mut _), PCWSTR::null(), 0)
                .map_err(|_| "Recycle Bin was not emptied")?;
        }
        let mut info = SHQUERYRBINFO {
            cbSize: std::mem::size_of::<SHQUERYRBINFO>() as u32,
            ..Default::default()
        };
        SHQueryRecycleBinW(PCWSTR::null(), &mut info).map_err(|_| "Recycle Bin is unavailable")?;
        Ok(serde_json::json!({"items":info.i64NumItems,"bytes":info.i64Size}))
    })
    .await
    .map_err(|_| "Recycle Bin request failed".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn invalid_audio_actions_are_rejected_before_accessing_hardware() {
        assert!(audio_device("unknown", "get", 5).is_err());
        assert!(audio_device("volume", "unknown", 5).is_err());
        assert!(audio_device("microphone", "up", 5).is_err());
    }
}

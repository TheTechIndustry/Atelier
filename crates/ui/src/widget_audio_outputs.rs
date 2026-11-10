use serde::Serialize;
use std::ffi::c_void;
use windows::core::{IUnknown, IUnknown_Vtbl, Interface, GUID, HRESULT, PCWSTR};
use windows::Win32::Media::Audio::{
    eCommunications, eConsole, eMultimedia, eRender, ERole, IMMDevice, IMMDeviceEnumerator,
    MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
    COINIT_MULTITHREADED, STGM_READ,
};
use windows::Win32::UI::Shell::PropertiesSystem::PROPERTYKEY;

#[repr(transparent)]
#[derive(Clone, Debug, PartialEq, Eq)]
struct PolicyConfig(IUnknown);
unsafe impl Interface for PolicyConfig {
    type Vtable = PolicyVtable;
    const IID: GUID = GUID::from_u128(0xf8679f50_850a_41cf_9c72_430f290290c8);
}
#[repr(C)]
struct PolicyVtable {
    base: IUnknown_Vtbl,
    unused: [usize; 10],
    set_default: unsafe extern "system" fn(*mut c_void, PCWSTR, ERole) -> HRESULT,
}
struct Com;
impl Drop for Com {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}

#[derive(Serialize)]
pub struct AudioOutput {
    id: String,
    name: String,
    selected: bool,
}

unsafe fn device_id(device: &IMMDevice) -> Result<String, String> {
    let raw = device
        .GetId()
        .map_err(|_| "Could not read audio device ID")?;
    let result = raw
        .to_string()
        .map_err(|_| "Invalid audio device ID".into());
    CoTaskMemFree(Some(raw.0.cast()));
    result
}
unsafe fn outputs(enumerator: &IMMDeviceEnumerator) -> Result<Vec<AudioOutput>, String> {
    let selected = enumerator
        .GetDefaultAudioEndpoint(eRender, eMultimedia)
        .ok()
        .and_then(|v| device_id(&v).ok());
    let devices = enumerator
        .EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
        .map_err(|_| "Could not list audio outputs")?;
    let count = devices
        .GetCount()
        .map_err(|_| "Could not count audio outputs")?;
    if count > 128 {
        return Err("Too many audio outputs".into());
    }
    let friendly = PROPERTYKEY {
        fmtid: GUID::from_u128(0xa45c254e_df1c_4efd_8020_67d146a850e0),
        pid: 14,
    };
    let mut result = Vec::new();
    for index in 0..count {
        let device = devices
            .Item(index)
            .map_err(|_| "Audio output changed during enumeration")?;
        let id = device_id(&device)?;
        let name = device
            .OpenPropertyStore(STGM_READ)
            .ok()
            .and_then(|v| v.GetValue(&friendly).ok())
            .and_then(|v| windows::core::BSTR::try_from(&v).ok())
            .map(|v| v.to_string())
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| format!("Audio output {}", index + 1));
        result.push(AudioOutput {
            selected: selected.as_ref() == Some(&id),
            id,
            name,
        });
    }
    Ok(result)
}
fn audio_outputs(target: Option<&str>, communications: bool) -> Result<Vec<AudioOutput>, String> {
    if target.is_some_and(|v| v.is_empty() || v.len() > 2048 || v.contains('\0')) {
        return Err("Invalid audio output ID".into());
    }
    unsafe {
        CoInitializeEx(None, COINIT_MULTITHREADED)
            .ok()
            .map_err(|_| "Audio service unavailable")?;
        let _com = Com;
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|_| "Audio service unavailable")?;
        let current = outputs(&enumerator)?;
        let Some(target) = target else {
            return Ok(current);
        };
        if !current.iter().any(|v| v.id == target) {
            return Err("Audio output is disconnected or unavailable".into());
        }
        let roles = if communications {
            vec![eConsole, eMultimedia, eCommunications]
        } else {
            vec![eConsole, eMultimedia]
        };
        let mut previous = Vec::new();
        for role in &roles {
            previous.push((
                *role,
                device_id(
                    &enumerator
                        .GetDefaultAudioEndpoint(eRender, *role)
                        .map_err(|_| "Could not read current audio output")?,
                )?,
            ));
        }
        let policy: PolicyConfig = CoCreateInstance(
            &GUID::from_u128(0x870af99c_171d_4f9e_af0d_e63df40c2bc9),
            None,
            CLSCTX_ALL,
        )
        .map_err(|_| "Direct audio switching is unavailable on this Windows version")?;
        let id: Vec<u16> = target.encode_utf16().chain(Some(0)).collect();
        for role in &roles {
            if (Interface::vtable(&policy).set_default)(
                Interface::as_raw(&policy),
                PCWSTR(id.as_ptr()),
                *role,
            )
            .is_err()
            {
                for (old_role, old_id) in &previous {
                    let wide: Vec<u16> = old_id.encode_utf16().chain(Some(0)).collect();
                    let _ = (Interface::vtable(&policy).set_default)(
                        Interface::as_raw(&policy),
                        PCWSTR(wide.as_ptr()),
                        *old_role,
                    );
                }
                return Err("Windows could not switch the default audio output".into());
            }
        }
        let result = outputs(&enumerator)?;
        if !result.iter().any(|v| v.id == target && v.selected) {
            return Err("Windows did not confirm the selected audio output".into());
        }
        Ok(result)
    }
}
#[tauri::command]
pub async fn widget_audio_outputs(
    window: tauri::Window,
    device_id: Option<String>,
    communications: bool,
) -> Result<Vec<AudioOutput>, String> {
    use tauri::{Emitter, Manager};
    if !["desktop-dock", "widget-ctrl_audio_switch", "audio-output-panel"].contains(&window.label()) {
        return Err("Audio switching unavailable to this window".into());
    }
    let changed = device_id.is_some();
    let result = tauri::async_runtime::spawn_blocking(move || {
        audio_outputs(device_id.as_deref(), communications)
    })
    .await
    .map_err(|_| "Audio output request failed".to_string())??;
    if changed { let _ = window.app_handle().emit("widget-audio-output-changed", ()); }
    Ok(result)
}

#[tauri::command]
pub async fn widget_open_audio_outputs(window: tauri::Window, communications: bool) -> Result<(), String> {
    use tauri::{Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    if !["desktop-dock", "widget-ctrl_audio_switch"].contains(&window.label()) {
        return Err("Audio output menu unavailable to this window".into());
    }
    let app = window.app_handle();
    if let Some(old) = app.get_webview_window("audio-output-panel") {
        old.close().map_err(|e| e.to_string())?;
    }
    let mut point = windows::Win32::Foundation::POINT::default();
    unsafe { GetCursorPos(&mut point).map_err(|e| e.to_string())?; }
    let panel = WebviewWindowBuilder::new(app, "audio-output-panel", WebviewUrl::App(format!("audio-output-panel.html?communications={communications}").into()))
        .title("Audio outputs").decorations(false).transparent(true).shadow(false)
        .skip_taskbar(true).always_on_top(true).resizable(false).visible(false)
        .inner_size(280., 220.).build().map_err(|e| e.to_string())?;
    if let Some(monitor) = window.current_monitor().map_err(|e| e.to_string())? {
        let area=monitor.work_area();let scale=monitor.scale_factor();
        let width=(280. * scale).round() as i32;let height=(220. * scale).round() as i32;
        let left=area.position.x;let top=area.position.y;
        let right=left+area.size.width as i32;let bottom=top+area.size.height as i32;
        let x=(point.x-width/2).clamp(left,(right-width).max(left));
        let y=(point.y-height-(8.*scale) as i32).clamp(top,(bottom-height).max(top));
        panel.set_position(PhysicalPosition::new(x,y)).map_err(|e| e.to_string())?;
    }
    panel.show().map_err(|e| e.to_string())?;
    panel.set_focus().map_err(|e| e.to_string())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn policy_method_has_the_expected_com_slot_and_invalid_ids_are_rejected() {
        assert_eq!(
            std::mem::offset_of!(PolicyVtable, set_default),
            13 * std::mem::size_of::<usize>()
        );
        assert!(audio_outputs(Some(""), false).is_err());
        assert!(audio_outputs(Some("invalid\0id"), false).is_err());
        assert!(audio_outputs(Some(&"a".repeat(2049)), false).is_err());
    }
}

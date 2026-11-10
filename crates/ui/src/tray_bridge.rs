use crate::tray_protocol::{click_messages, decode_frame, TrayClick, TrayIcons};
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{Emitter, Manager};
use tokio::io::AsyncReadExt;
use tokio::net::windows::named_pipe::{PipeMode, ServerOptions};
use windows::{
    core::{s, w, PCWSTR},
    Win32::{
        Foundation::{CloseHandle, HWND, LPARAM, WPARAM},
        System::{
            LibraryLoader::{GetProcAddress, LoadLibraryW},
            Threading::CreateMutexW,
        },
        UI::WindowsAndMessaging::*,
    },
};

const BRIDGE: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/atelier_tray_bridge.dll"));
const PIPE: &str = r"\\.\pipe\atelier_systray_monitor";
#[derive(Default)]
pub struct TrayBridge {
    started: AtomicBool,
    icons: Arc<Mutex<TrayIcons>>,
    error: Arc<Mutex<String>>,
    nvidia: Arc<Mutex<Option<IconView>>>,
}
#[derive(Clone, PartialEq, Eq, serde::Serialize)]
pub struct IconView {
    id: String,
    title: String,
    icon: String,
    single_as_double: bool,
}
impl TrayBridge {
    pub fn start(&self, app: tauri::AppHandle) {
        if self.started.swap(true, Ordering::SeqCst) {
            return;
        }
        let cache = self.nvidia.clone();
        let notify = app.clone();
        std::thread::spawn(move || loop {
            let next = registered_nvidia_icon();
            if let Ok(mut current) = cache.lock() {
                if *current != next {
                    *current = next;
                    let _ = notify.emit_to("tray-panel", "tray-icons-changed", ());
                }
            }
            std::thread::sleep(Duration::from_secs(15));
        });
        let icons = self.icons.clone();
        let error = self.error.clone();
        std::thread::spawn(move || {
            let result = run(Some(app), icons, error.clone());
            if let Err(err) = result {
                *error.lock().unwrap() = err;
            }
        });
    }
}
fn run(
    app: Option<tauri::AppHandle>,
    icons: Arc<Mutex<TrayIcons>>,
    error: Arc<Mutex<String>>,
) -> Result<(), String> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|e| e.to_string())?;
    let mutex = unsafe { CreateMutexW(None, true, w!("Local\\AtelierTrayHookAlive")) }
        .map_err(|e| e.to_string())?;
    runtime.block_on(async move {
        loop {
            let server = match ServerOptions::new()
                .first_pipe_instance(true)
                .reject_remote_clients(true)
                .pipe_mode(PipeMode::Message)
                .create(PIPE)
            {
                Ok(s) => s,
                Err(e) => {
                    *error.lock().unwrap() = e.to_string();
                    tokio::time::sleep(Duration::from_secs(3)).await;
                    continue;
                }
            };
            let hook = match attach() {
                Ok(h) => h,
                Err(e) => {
                    *error.lock().unwrap() = e;
                    tokio::time::sleep(Duration::from_secs(3)).await;
                    continue;
                }
            };
            let connected = tokio::time::timeout(Duration::from_secs(8), server.connect()).await;
            unsafe {
                let _ = UnhookWindowsHookEx(hook);
            }
            if !matches!(connected, Ok(Ok(()))) {
                *error.lock().unwrap() = "Explorer tray bridge did not connect".into();
                continue;
            }
            *error.lock().unwrap() = String::new();
            let mut server = server;
            let mut data = vec![0u8; 280000];
            let mut ready = false;
            loop {
                match server.read(&mut data).await {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if !ready
                            && n >= 4
                            && u32::from_le_bytes(data[..4].try_into().unwrap()) == 1
                            && String::from_utf8_lossy(&data[4..n])
                                .contains("Successfully subclassed")
                        {
                            ready = true;
                            unsafe {
                                let msg = RegisterWindowMessageW(w!("TaskbarCreated"));
                                if msg != 0 {
                                    let _ = SendNotifyMessageW(HWND_BROADCAST, msg, None, None);
                                }
                            }
                        }
                        if let Some(event) = decode_frame(&data[..n]) {
                            icons.lock().unwrap().apply(event);
                            if let Some(app) = &app {
                                let _ = app.emit_to("tray-panel", "tray-icons-changed", ());
                            }
                        }
                    }
                }
            }
            *icons.lock().unwrap() = TrayIcons::default();
            if let Some(app) = &app {
                let _ = app.emit_to("tray-panel", "tray-icons-changed", ());
            }
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    });
    #[allow(unreachable_code)]
    unsafe {
        let _ = CloseHandle(mutex);
    }
    #[allow(unreachable_code)]
    Ok(())
}
fn attach() -> Result<HHOOK, String> {
    let path = std::env::temp_dir().join(format!(
        "atelier-tray-{:x}.dll",
        BRIDGE
            .iter()
            .fold(0xcbf29ce484222325u64, |h, b| (h ^ *b as u64)
                .wrapping_mul(0x100000001b3))
    ));
    if !path.exists() {
        std::fs::write(&path, BRIDGE).map_err(|e| e.to_string())?;
    }
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    unsafe {
        let module = LoadLibraryW(PCWSTR(wide.as_ptr())).map_err(|e| e.to_string())?;
        let proc =
            GetProcAddress(module, s!("GetMsgProc")).ok_or("Tray bridge export unavailable")?;
        let taskbar =
            crate::desktop_dock::real_primary_taskbar().ok_or("Windows taskbar unavailable")?;
        let tid = GetWindowThreadProcessId(taskbar, None);
        let hook = SetWindowsHookExW(WH_GETMESSAGE, Some(std::mem::transmute(proc)), module, tid)
            .map_err(|e| e.to_string())?;
        PostThreadMessageW(tid, WM_NULL, None, None).map_err(|e| e.to_string())?;
        Ok(hook)
    }
}
use std::os::windows::ffi::OsStrExt;
#[tauri::command]
pub async fn tray_icons(
    window: tauri::Window,
    bridge: tauri::State<'_, TrayBridge>,
) -> Result<Vec<IconView>, String> {
    if window.label() != "tray-panel" {
        return Err("Only the tray panel can access tray icons".into());
    }
    let icons: Vec<_> = {
        let guard = bridge.icons.lock().map_err(|e| e.to_string())?;
        guard.values().cloned().collect()
    };
    let mut out = Vec::new();
    let preferences = overflow_preferences();
    for icon in &icons {
        let owner = icon_owner_with_preferences(icon, &preferences);
        if icon.hidden
            || icon_owner_pid(icon.hwnd) == Some(std::process::id())
            || !should_show_overflow(icon.guid, icon.uid, &owner, &preferences)
        {
            continue;
        }
        let Some(image) = &icon.image else { continue };
        let mut png = Vec::new();
        {
            let mut enc = png::Encoder::new(&mut png, image.width, image.height);
            enc.set_color(png::ColorType::Rgba);
            enc.set_depth(png::BitDepth::Eight);
            enc.write_header()
                .map_err(|e| e.to_string())?
                .write_image_data(&image.rgba)
                .map_err(|e| e.to_string())?;
        }
        out.push(IconView {
            id: format!("{}:{}", icon.hwnd, icon.uid),
            title: icon.tooltip.clone(),
            icon: format!("data:image/png;base64,{}", crate::base64_encode(&png)),
            single_as_double: owner.eq_ignore_ascii_case("telegram.exe"),
        });
    }
    if let Some(fallback) = bridge.nvidia.lock().map_err(|e| e.to_string())?.clone() {
        if !out.iter().any(|icon| icon.id == fallback.id) {
            out.push(fallback);
        }
    }

    out.push(IconView {
        id: "atelier:self".into(),
        title: "Atelier".into(),
        icon: atelier_icon()?,
        single_as_double: false,
    });
    out.sort_by(|a, b| {
        a.title
            .to_lowercase()
            .cmp(&b.title.to_lowercase())
            .then(a.id.cmp(&b.id))
    });
    if out.is_empty() {
        let err = bridge.error.lock().map_err(|e| e.to_string())?;
        if !err.is_empty() {
            return Err(err.clone());
        }
    }
    Ok(out)
}
#[tauri::command]
pub async fn tray_icon_click(
    window: tauri::Window,
    bridge: tauri::State<'_, TrayBridge>,
    id: String,
    button: String,
) -> Result<(), String> {
    if window.label() != "tray-panel" {
        return Err("Only the tray panel can activate tray icons".into());
    }
    if id == "atelier:self" {
        return match button.as_str() {
            "left" | "double" => crate::show_or_create_studio(window.app_handle()),
            "right" => {
                let mut point = windows::Win32::Foundation::POINT::default();
                unsafe {
                    GetCursorPos(&mut point).map_err(|e| e.to_string())?;
                }
                crate::tray_panel::show_app_menu(
                    window.app_handle(),
                    point.x as f64,
                    point.y as f64,
                )
                .map_err(|e| e.to_string())
            }
            _ => Err("Invalid click".into()),
        };
    }
    let (hwnd, uid) = id.split_once(':').ok_or("Invalid icon")?;
    let hwnd: u32 = hwnd.parse().map_err(|_| "Invalid icon")?;
    let uid: u32 = uid.parse().map_err(|_| "Invalid icon")?;
    let kind = match button.as_str() {
        "left" => TrayClick::Left,
        "right" => TrayClick::Right,
        "double" => TrayClick::DoubleLeft,
        _ => return Err("Invalid click".into()),
    };
    let icon = {
        let icons = bridge.icons.lock().map_err(|e| e.to_string())?;
        let found = icons
            .values()
            .find(|i| i.hwnd == hwnd && i.uid == uid && !i.hidden)
            .cloned();
        found
    };
    let Some(icon) = icon else {
        if bridge
            .nvidia
            .lock()
            .map_err(|e| e.to_string())?
            .as_ref()
            .is_some_and(|view| view.id == id)
        {
            request_icon_registration(hwnd);
            return Err(
                "NVIDIA has not supplied its tray action yet. Restart NVIDIA App and try again."
                    .into(),
            );
        }
        return Err("Icon no longer available".into());
    };
    let owner = icon_owner_executable(&icon);

    if owner == "securityhealthsystray.exe"
        && matches!(kind, TrayClick::Left | TrayClick::DoubleLeft)
    {
        let result = unsafe {
            windows::Win32::UI::Shell::ShellExecuteW(
                HWND::default(),
                w!("open"),
                w!("windowsdefender:"),
                None,
                None,
                SW_SHOWNORMAL,
            )
        };
        return if result.0 as isize > 32 {
            Ok(())
        } else {
            Err("Could not open Windows Security".into())
        };
    }
    let kind = normalize_click(&owner, kind);
    if icon.callback.is_none() {
        request_icon_registration(hwnd);
        return Err("The app has not registered its tray action. Restart that app after Atelier starts, then try again.".into());
    }

    unsafe {
        let handle = HWND(hwnd as usize as *mut _);
        if !IsWindow(handle).as_bool() {
            return Err("Icon no longer available".into());
        }
        let mut pid = 0;
        GetWindowThreadProcessId(handle, Some(&mut pid));
        let _ = AllowSetForegroundWindow(pid);

        if matches!(kind, TrayClick::Right) {
            let _ = SetForegroundWindow(handle);
        }
        let mut p = windows::Win32::Foundation::POINT::default();
        GetCursorPos(&mut p).map_err(|e| e.to_string())?;
        for msg in
            click_messages(&icon, kind, p.x as i16, p.y as i16).ok_or("Icon has no callback")?
        {
            SendNotifyMessageW(handle, msg.message, WPARAM(msg.wparam), LPARAM(msg.lparam))
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn request_icon_registration(hwnd: u32) {
    unsafe {
        let handle = HWND(hwnd as usize as *mut _);
        if IsWindow(handle).as_bool() {
            let msg = RegisterWindowMessageW(w!("TaskbarCreated"));
            if msg != 0 {
                let _ = PostMessageW(handle, msg, None, None);
            }
        }
    }
}

fn registered_nvidia_icon() -> Option<IconView> {
    use windows::Win32::{
        Foundation::BOOL,
        UI::Shell::{Shell_NotifyIconGetRect, NOTIFYICONIDENTIFIER},
    };
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    struct Search {
        uid: u32,
        hwnd: Option<u32>,
    }
    unsafe extern "system" fn visit(hwnd: HWND, param: LPARAM) -> BOOL {
        let state = &mut *(param.0 as *mut Search);
        let raw = hwnd.0 as usize as u32;
        if icon_process_name(raw).as_deref() != Some("nvcontainer.exe") {
            return BOOL(1);
        }
        let id = NOTIFYICONIDENTIFIER {
            cbSize: std::mem::size_of::<NOTIFYICONIDENTIFIER>() as u32,
            hWnd: hwnd,
            uID: state.uid,
            ..Default::default()
        };
        if Shell_NotifyIconGetRect(&id).is_ok() {
            state.hwnd = Some(raw);
            return BOOL(0);
        }
        BOOL(1)
    }
    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey(r"Control Panel\NotifyIconSettings")
        .ok()?;
    for name in key.enum_keys().flatten() {
        let Ok(entry) = key.open_subkey(name) else {
            continue;
        };
        let path: String = entry.get_value("ExecutablePath").unwrap_or_default();
        if !path
            .rsplit(['\\', '/'])
            .next()
            .unwrap_or("")
            .eq_ignore_ascii_case("nvcontainer.exe")
            || entry.get_value::<u32, _>("IsPromoted").unwrap_or(0) != 0
        {
            continue;
        }
        let Ok(uid) = entry.get_value::<u32, _>("UID") else {
            continue;
        };
        let Ok(raw) = entry.get_raw_value("IconSnapshot") else {
            continue;
        };
        if raw.bytes.len() > 512_000 || !raw.bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            continue;
        }
        let mut state = Search { uid, hwnd: None };
        unsafe {
            let param = LPARAM(&mut state as *mut _ as isize);
            let _ = EnumWindows(Some(visit), param);

            if state.hwnd.is_none() {
                let mut previous = HWND::default();
                for _ in 0..512 {
                    let Ok(next) = FindWindowExW(HWND_MESSAGE, previous, None, None) else {
                        break;
                    };
                    if next.0.is_null() || next == previous {
                        break;
                    }
                    previous = next;
                    if !visit(next, param).as_bool() {
                        break;
                    }
                }
            }
        }
        if let Some(hwnd) = state.hwnd {
            let title = entry
                .get_value::<String, _>("InitialTooltip")
                .ok()
                .filter(|v| !v.trim().is_empty())
                .unwrap_or_else(|| "NVIDIA".into());
            return Some(IconView {
                id: format!("{hwnd}:{uid}"),
                title,
                icon: format!("data:image/png;base64,{}", crate::base64_encode(&raw.bytes)),
                single_as_double: false,
            });
        }
    }
    None
}
fn atelier_icon() -> Result<String, String> {
    static IMAGE: std::sync::OnceLock<Result<String, String>> = std::sync::OnceLock::new();
    IMAGE
        .get_or_init(|| {
            let mut bytes = Vec::new();
            {
                let mut encoder = png::Encoder::new(&mut bytes, 128, 128);
                encoder.set_color(png::ColorType::Rgba);
                encoder.set_depth(png::BitDepth::Eight);
                encoder
                    .write_header()
                    .map_err(|e| e.to_string())?
                    .write_image_data(include_bytes!("../icons/icon.rgba"))
                    .map_err(|e| e.to_string())?;
            }
            Ok(format!(
                "data:image/png;base64,{}",
                crate::base64_encode(&bytes)
            ))
        })
        .clone()
}
fn icon_owner_pid(hwnd: u32) -> Option<u32> {
    unsafe {
        let mut pid = 0;
        GetWindowThreadProcessId(HWND(hwnd as usize as *mut _), Some(&mut pid));
        (pid != 0).then_some(pid)
    }
}
fn normalize_click(process: &str, click: TrayClick) -> TrayClick {
    if process.eq_ignore_ascii_case("telegram.exe") && matches!(click, TrayClick::Left) {
        TrayClick::DoubleLeft
    } else {
        click
    }
}
fn icon_owner_executable(icon: &crate::tray_protocol::TrayIcon) -> String {
    icon_owner_with_preferences(icon, &overflow_preferences())
}
fn icon_owner_with_preferences(
    icon: &crate::tray_protocol::TrayIcon,
    prefs: &[OverflowPreference],
) -> String {
    if let Some(guid) = icon.guid.map(guid_string) {
        if let Some(pref) = prefs
            .iter()
            .find(|p| p.guid.as_deref() == Some(guid.as_str()))
        {
            if !pref.executable.is_empty() {
                return pref.executable.clone();
            }
        }
    }
    icon_process_name(icon.hwnd).unwrap_or_default()
}

#[derive(Default)]
struct OverflowPreference {
    guid: Option<String>,
    executable: String,
    uid: Option<u32>,
    promoted: bool,
}
fn overflow_preferences() -> Vec<OverflowPreference> {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};
    let root = RegKey::predef(HKEY_CURRENT_USER);
    let Ok(key) = root.open_subkey(r"Control Panel\NotifyIconSettings") else {
        return Vec::new();
    };
    key.enum_keys()
        .flatten()
        .filter_map(|name| {
            let child = key.open_subkey(name).ok()?;
            let path: String = child.get_value("ExecutablePath").unwrap_or_default();
            let executable = path
                .rsplit(['\\', '/'])
                .next()
                .unwrap_or("")
                .to_ascii_lowercase();
            let guid: Option<String> = child
                .get_value::<String, _>("IconGuid")
                .ok()
                .map(|v| v.trim_matches(['{', '}']).to_ascii_lowercase());
            let uid = child.get_value::<u32, _>("UID").ok();
            let promoted = child.get_value::<u32, _>("IsPromoted").unwrap_or(0) != 0;
            Some(OverflowPreference {
                guid,
                executable,
                uid,
                promoted,
            })
        })
        .collect()
}
fn icon_process_name(hwnd: u32) -> Option<String> {
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    unsafe {
        let mut pid = 0;
        GetWindowThreadProcessId(HWND(hwnd as usize as *mut _), Some(&mut pid));
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 32768];
        let mut len = buf.len() as u32;
        let result = QueryFullProcessImageNameW(
            process,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buf.as_mut_ptr()),
            &mut len,
        );
        let _ = CloseHandle(process);
        result.ok()?;
        let path = String::from_utf16_lossy(&buf[..len as usize]);
        Some(
            path.rsplit(['\\', '/'])
                .next()
                .unwrap_or("")
                .to_ascii_lowercase(),
        )
    }
}
fn guid_string(g: [u8; 16]) -> String {
    format!(
        "{:08x}-{:04x}-{:04x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        u32::from_le_bytes(g[0..4].try_into().unwrap()),
        u16::from_le_bytes(g[4..6].try_into().unwrap()),
        u16::from_le_bytes(g[6..8].try_into().unwrap()),
        g[8],
        g[9],
        g[10],
        g[11],
        g[12],
        g[13],
        g[14],
        g[15]
    )
}
fn should_show_overflow(
    guid: Option<[u8; 16]>,
    uid: u32,
    process: &str,
    prefs: &[OverflowPreference],
) -> bool {
    if ["explorer.exe", "sihost.exe", "shellexperiencehost.exe"].contains(&process) {
        return false;
    }
    let guid = guid.map(guid_string);
    let matched = prefs
        .iter()
        .find(|p| guid.as_ref().is_some_and(|g| p.guid.as_ref() == Some(g)))
        .or_else(|| {
            prefs.iter().find(|p| {
                p.guid.is_none()
                    && p.uid == Some(uid)
                    && !process.is_empty()
                    && p.executable == process
            })
        });
    matched.is_none_or(|p| !p.promoted)
}
#[cfg(test)]
mod live_tests {
    use super::*;
    #[test]
    fn telegram_accepts_one_click_without_changing_other_apps() {
        assert_eq!(
            normalize_click("Telegram.exe", TrayClick::Left),
            TrayClick::DoubleLeft
        );
        assert_eq!(
            normalize_click("Telegram.exe", TrayClick::Right),
            TrayClick::Right
        );
        assert_eq!(
            normalize_click("ChatGPT.exe", TrayClick::Left),
            TrayClick::Left
        );
    }
    #[test]
    fn app_tray_icon_is_a_valid_png() {
        assert!(atelier_icon()
            .unwrap()
            .starts_with("data:image/png;base64,iVBOR"));
    }
    #[test]
    fn filters_promoted_and_shell_owned_icons() {
        let p = OverflowPreference {
            guid: None,
            executable: "example.exe".into(),
            uid: Some(2),
            promoted: true,
        };
        assert!(!should_show_overflow(None, 2, "example.exe", &[p]));
        assert!(!should_show_overflow(None, 0, "sihost.exe", &[]));
        assert!(should_show_overflow(None, 2, "other.exe", &[]));
    }
    #[test]
    #[ignore = "interacts with the live Windows notification area"]
    fn explorer_bridge_receives_real_icons() {
        let icons = Arc::new(Mutex::new(TrayIcons::default()));
        let error = Arc::new(Mutex::new(String::new()));
        let result = icons.clone();
        let failures = error.clone();
        std::thread::spawn(move || {
            let _ = run(None, icons, error);
        });
        let deadline = std::time::Instant::now() + Duration::from_secs(15);
        while std::time::Instant::now() < deadline {
            let count = result
                .lock()
                .unwrap()
                .values()
                .filter(|i| i.image.is_some() && i.callback.is_some())
                .count();
            if count > 0 {
                println!("received {count} usable icons");
                return;
            }
            std::thread::sleep(Duration::from_millis(200));
        }
        panic!(
            "No usable icons from Explorer: {}",
            failures.lock().unwrap()
        );
    }
}

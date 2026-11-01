use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::c_void;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager};
use windows::core::w;
use windows::Win32::Foundation::{BOOL, COLORREF, HWND, LPARAM};
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWINDOWATTRIBUTE};
use windows::Win32::Graphics::Gdi::{
    RedrawWindow, HRGN, RDW_ALLCHILDREN, RDW_ERASE, RDW_FRAME, RDW_INVALIDATE,
};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetClassNameW, GetForegroundWindow, GetWindowLongPtrW, GetWindowTextW,
    GetWindowThreadProcessId, IsIconic, IsWindowVisible, SetLayeredWindowAttributes,
    SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, LWA_ALPHA,
    SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOMOVE,
    SWP_NOSIZE, SWP_NOZORDER, SW_SHOWNORMAL, WS_EX_LAYERED,
};

const DWMWA_USE_IMMERSIVE_DARK_MODE_ATTR: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(20);
const DWMWA_WINDOW_CORNER_PREFERENCE_ATTR: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(33);
const DWMWA_BORDER_COLOR_ATTR: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(34);
const DWMWA_CAPTION_COLOR_ATTR: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(35);
const DWMWA_SYSTEMBACKDROP_TYPE_ATTR: DWMWINDOWATTRIBUTE = DWMWINDOWATTRIBUTE(38);
const DWMWA_COLOR_DEFAULT: u32 = 0xFFFFFFFF;

static MODIFIED_WINDOWS: OnceLock<Mutex<HashMap<isize, (u32, bool)>>> = OnceLock::new();

fn modified_set() -> &'static Mutex<HashMap<isize, (u32, bool)>> {
    MODIFIED_WINDOWS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct SystemAppearanceConfig {
    pub enabled: bool,
    pub scope: String,
    pub backdrop: String,
    pub opacity: u32,
    pub inactive_opacity: u32,
    pub corner_preference: String,
    pub border_color: String,
    pub border_width: u32,
    pub titlebar_mode: String,
    pub titlebar_color: String,
    pub target_explorer: bool,
    pub target_dialogs: bool,
    pub target_tools: bool,
    pub target_terminal: bool,
    pub target_settings: bool,
    pub target_flyouts: bool,
    pub excluded_apps: Vec<String>,
    pub exclude_fullscreen_games: bool,
}

impl Default for SystemAppearanceConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            scope: "system_only".into(),
            backdrop: "mica".into(),
            opacity: 100,
            inactive_opacity: 100,
            corner_preference: "rounded".into(),
            border_color: "default".into(),
            border_width: 1,
            titlebar_mode: "system".into(),
            titlebar_color: "default".into(),
            target_explorer: true,
            target_dialogs: true,
            target_tools: true,
            target_terminal: true,
            target_settings: true,
            target_flyouts: true,
            excluded_apps: vec![
                "cyberpunk2077.exe".into(),
                "steam.exe".into(),
                "discord.exe".into(),
            ],
            exclude_fullscreen_games: true,
        }
    }
}

pub fn parse_hex_color(hex: &str) -> Option<COLORREF> {
    let clean = hex.trim().trim_start_matches('#');
    if clean.len() != 6 {
        return None;
    }
    let r = u8::from_str_radix(&clean[0..2], 16).ok()?;
    let g = u8::from_str_radix(&clean[2..4], 16).ok()?;
    let b = u8::from_str_radix(&clean[4..6], 16).ok()?;
    Some(COLORREF(r as u32 | ((g as u32) << 8) | ((b as u32) << 16)))
}

impl SystemAppearanceConfig {
    pub fn normalize(&mut self) {
        self.opacity = self.opacity.clamp(50, 100);
        self.inactive_opacity = self.inactive_opacity.clamp(50, 100);
        self.border_width = self.border_width.clamp(0, 4);

        if self.scope != "system_only" && self.scope != "all_windows" {
            self.scope = "system_only".into();
        }
        if !["default", "mica", "mica_alt", "acrylic", "glass"]
            .contains(&self.backdrop.as_str())
        {
            self.backdrop = "mica".into();
        }
        if !["default", "rounded", "small_rounded", "square"]
            .contains(&self.corner_preference.as_str())
        {
            self.corner_preference = "rounded".into();
        }
        if !["system", "dark", "light", "custom"].contains(&self.titlebar_mode.as_str()) {
            self.titlebar_mode = "system".into();
        }
        if self.border_color != "default" && parse_hex_color(&self.border_color).is_none() {
            self.border_color = "default".into();
        }
        if self.titlebar_color != "default" && parse_hex_color(&self.titlebar_color).is_none() {
            self.titlebar_color = "default".into();
        }
    }
}

pub struct AppearanceState(pub Mutex<SystemAppearanceConfig>);

fn path() -> PathBuf {
    super::settings_path()
        .unwrap_or_else(|| std::env::temp_dir().join("Atelier/settings.json"))
        .with_file_name("appearance.json")
}

impl AppearanceState {
    pub fn new() -> Self {
        let mut config: SystemAppearanceConfig = std::fs::read(path())
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        config.normalize();
        if !config.enabled {
            restore_all_system_and_desktop_windows();
        }
        Self(Mutex::new(config))
    }
}

impl Drop for AppearanceState {
    fn drop(&mut self) {
        cleanup();
    }
}

fn get_window_process_name(hwnd: HWND) -> Option<String> {
    let mut pid = 0;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    if pid == 0 || pid == std::process::id() {
        return None;
    }
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) }.ok()?;
    let mut buf = [0u16; 260];
    let mut size = buf.len() as u32;
    let success = unsafe {
        QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buf.as_mut_ptr()),
            &mut size,
        )
    };
    let _ = unsafe { windows::Win32::Foundation::CloseHandle(handle) };
    if success.is_ok() && size > 0 {
        let full = String::from_utf16_lossy(&buf[..size as usize]);
        let name = std::path::Path::new(&full)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();
        Some(name)
    } else {
        None
    }
}

fn get_window_class_name(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetClassNameW(hwnd, &mut buf) };
    if len > 0 {
        String::from_utf16_lossy(&buf[..len as usize])
    } else {
        String::new()
    }
}

fn get_window_title(hwnd: HWND) -> String {
    let mut buf = [0u16; 256];
    let len = unsafe { GetWindowTextW(hwnd, &mut buf) };
    if len > 0 {
        String::from_utf16_lossy(&buf[..len as usize])
    } else {
        String::new()
    }
}

pub fn is_fullscreen_or_game(hwnd: HWND, class: &str) -> bool {
    if class == "Valve001" || class == "UnrealWindow" || class == "UnityWndClass" {
        return true;
    }
    let mut rect = windows::Win32::Foundation::RECT::default();
    if unsafe { windows::Win32::UI::WindowsAndMessaging::GetWindowRect(hwnd, &mut rect) }.is_ok() {
        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;
        let sm_cx = unsafe { windows::Win32::UI::WindowsAndMessaging::GetSystemMetrics(windows::Win32::UI::WindowsAndMessaging::SM_CXSCREEN) };
        let sm_cy = unsafe { windows::Win32::UI::WindowsAndMessaging::GetSystemMetrics(windows::Win32::UI::WindowsAndMessaging::SM_CYSCREEN) };
        if width >= sm_cx && height >= sm_cy {
            let style = unsafe { windows::Win32::UI::WindowsAndMessaging::GetWindowLongW(hwnd, windows::Win32::UI::WindowsAndMessaging::GWL_STYLE) } as u32;
            let has_border = (style & windows::Win32::UI::WindowsAndMessaging::WS_THICKFRAME.0) != 0;
            let has_caption = (style & windows::Win32::UI::WindowsAndMessaging::WS_CAPTION.0) != 0;
            if !has_border || !has_caption {
                return true;
            }
        }
    }
    false
}

pub fn matches_target(
    hwnd: HWND,
    class: &str,
    title: &str,
    proc_name: &str,
    config: &SystemAppearanceConfig,
) -> bool {
    if !config.enabled {
        return false;
    }

    let lower_proc = proc_name.to_lowercase();
    if config
        .excluded_apps
        .iter()
        .any(|app| lower_proc == app.to_lowercase() || lower_proc.ends_with(&format!("\\{}", app.to_lowercase())))
    {
        return false;
    }

    if config.exclude_fullscreen_games && is_fullscreen_or_game(hwnd, class) {
        return false;
    }

    if class == "CabinetWClass"
        || class == "ExploreWClass"
        || class == "ShellTabWindowClass"
        || class == "XamlExplorerHostIslandWindow"
    {
        return config.target_explorer;
    }

    if class == "#32770"
        || class == "OperationStatusWindow"
        || class == "ProgressDialog"
        || title == "Run"
        || title == "Выполнить"
    {
        return config.target_dialogs;
    }

    if class == "TaskManagerWindow"
        || class == "Notepad"
        || class == "RichEditD2DPT"
        || lower_proc == "taskmgr.exe"
        || lower_proc == "notepad.exe"
    {
        return config.target_tools;
    }

    if class == "ConsoleWindowClass"
        || class == "CASCADIA_HOSTING_WINDOW_CLASS"
        || lower_proc == "windowsterminal.exe"
        || lower_proc == "cmd.exe"
        || lower_proc == "powershell.exe"
    {
        return config.target_terminal;
    }

    if lower_proc == "systemsettings.exe"
        || (class == "ApplicationFrameWindow"
            && (title.contains("Settings")
                || title.contains("Параметри")
                || title.contains("Налаштування")))
    {
        return config.target_settings;
    }

    if class == "TopLevelWindowForOverflowXamlIsland"
        || class == "NotifyIconOverflowWindow"
        || class == "ControlCenterWindow"
        || class == "ClockFlyoutWindow"
        || class == "InputSwitchWindow"
        || (class == "Windows.UI.Core.CoreWindow"
            && (title.contains("Clock")
                || title.contains("Date")
                || title.contains("Input")
                || title.contains("Action")
                || title.contains("Language")
                || title.contains("Годинник")
                || title.contains("Мова")))
    {
        return config.target_flyouts;
    }

    if config.scope == "all_windows" {
        let style = unsafe { windows::Win32::UI::WindowsAndMessaging::GetWindowLongW(hwnd, windows::Win32::UI::WindowsAndMessaging::GWL_STYLE) } as u32;
        let has_caption = (style & windows::Win32::UI::WindowsAndMessaging::WS_CAPTION.0) != 0;
        let is_child = (style & windows::Win32::UI::WindowsAndMessaging::WS_CHILD.0) != 0;
        return has_caption && !is_child;
    }

    false
}

fn restore_single_window(hwnd: HWND, originally_layered: bool) {
    let corner = 0u32;
    let color_default = DWMWA_COLOR_DEFAULT;
    let backdrop_auto = 0u32;
    let dark_mode_default = 0u32;

    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE_ATTR,
            &corner as *const _ as *const c_void,
            4,
        )
    };
    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR_ATTR,
            &color_default as *const _ as *const c_void,
            4,
        )
    };
    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_CAPTION_COLOR_ATTR,
            &color_default as *const _ as *const c_void,
            4,
        )
    };
    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_SYSTEMBACKDROP_TYPE_ATTR,
            &backdrop_auto as *const _ as *const c_void,
            4,
        )
    };
    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_USE_IMMERSIVE_DARK_MODE_ATTR,
            &dark_mode_default as *const _ as *const c_void,
            4,
        )
    };

    let ex_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) };
    if !originally_layered && (ex_style & (WS_EX_LAYERED.0 as isize)) != 0 {
        let _ = unsafe {
            SetLayeredWindowAttributes(
                hwnd,
                COLORREF(0),
                255,
                LWA_ALPHA,
            )
        };
        let _ = unsafe {
            SetWindowLongPtrW(
                hwnd,
                GWL_EXSTYLE,
                ex_style & !(WS_EX_LAYERED.0 as isize),
            )
        };
    }

    let _ = unsafe {
        SetWindowPos(
            hwnd,
            HWND::default(),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        )
    };
    let _ = unsafe {
        RedrawWindow(
            hwnd,
            None,
            HRGN::default(),
            RDW_INVALIDATE | RDW_ERASE | RDW_FRAME | RDW_ALLCHILDREN,
        )
    };
}

fn restore_tracked_window(hwnd: HWND) {
    let record = modified_set().lock().ok().and_then(|mut set| set.remove(&(hwnd.0 as isize)));
    if let Some((original_pid, originally_layered)) = record {
        let mut pid = 0;
        unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
        if pid != 0 && pid == original_pid { restore_single_window(hwnd, originally_layered); }
    }
}

pub fn restore_all_system_and_desktop_windows() {
    let handles: Vec<isize> = modified_set().lock().map(|set| set.keys().copied().collect()).unwrap_or_default();
    for raw in handles { restore_tracked_window(HWND(raw as *mut c_void)); }
}

pub fn cleanup() {
    restore_all_system_and_desktop_windows();
}

pub fn apply_to_window(hwnd: HWND, config: &SystemAppearanceConfig, is_active: bool) {
    if !unsafe { IsWindowVisible(hwnd) }.as_bool() || unsafe { IsIconic(hwnd) }.as_bool() {
        return;
    }
    let class = get_window_class_name(hwnd);
    let title = get_window_title(hwnd);
    let proc_name = get_window_process_name(hwnd).unwrap_or_default();
    if proc_name == "atelier.exe" {
        return;
    }

    let raw_hwnd = hwnd.0 as isize;

    if !matches_target(hwnd, &class, &title, &proc_name, config) {
        restore_tracked_window(hwnd);
        return;
    }

    let mut pid = 0;
    unsafe { GetWindowThreadProcessId(hwnd, Some(&mut pid)) };
    if pid == 0 { return; }
    let originally_layered = {
        let Ok(mut set) = modified_set().lock() else { return };
        let ex_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) };
        let record = set.entry(raw_hwnd).or_insert((pid, (ex_style & WS_EX_LAYERED.0 as isize) != 0));
        if record.0 != pid { *record = (pid, (ex_style & WS_EX_LAYERED.0 as isize) != 0); }
        record.1
    };

    let corner_val: u32 = match config.corner_preference.as_str() {
        "square" => 1,
        "rounded" => 2,
        "small_rounded" => 3,
        _ => 0,
    };
    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_WINDOW_CORNER_PREFERENCE_ATTR,
            &corner_val as *const _ as *const c_void,
            4,
        )
    };

    let border_color = if config.border_color == "default" {
        DWMWA_COLOR_DEFAULT
    } else if let Some(c) = parse_hex_color(&config.border_color) {
        c.0
    } else {
        DWMWA_COLOR_DEFAULT
    };
    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_BORDER_COLOR_ATTR,
            &border_color as *const _ as *const c_void,
            4,
        )
    };

    if config.titlebar_mode != "custom" || config.titlebar_color == "default" {
        let color = DWMWA_COLOR_DEFAULT;
        let _ = unsafe { DwmSetWindowAttribute(hwnd, DWMWA_CAPTION_COLOR_ATTR, &color as *const _ as *const c_void, 4) };
    }
    match config.titlebar_mode.as_str() {
        "dark" => {
            let dark = 1u32;
            let _ = unsafe {
                DwmSetWindowAttribute(
                    hwnd,
                    DWMWA_USE_IMMERSIVE_DARK_MODE_ATTR,
                    &dark as *const _ as *const c_void,
                    4,
                )
            };
        }
        "light" => {
            let dark = 0u32;
            let _ = unsafe {
                DwmSetWindowAttribute(
                    hwnd,
                    DWMWA_USE_IMMERSIVE_DARK_MODE_ATTR,
                    &dark as *const _ as *const c_void,
                    4,
                )
            };
        }
        "custom" => {
            if let Some(c) = parse_hex_color(&config.titlebar_color) {
                let _ = unsafe {
                    DwmSetWindowAttribute(
                        hwnd,
                        DWMWA_CAPTION_COLOR_ATTR,
                        &c.0 as *const _ as *const c_void,
                        4,
                    )
                };
            }
        }
        _ => {}
    }

    let backdrop_type: u32 = match config.backdrop.as_str() {
        "mica" => 2,
        "acrylic" => 3,
        "mica_alt" => 4,
        _ => 0,
    };
    let _ = unsafe {
        DwmSetWindowAttribute(
            hwnd,
            DWMWA_SYSTEMBACKDROP_TYPE_ATTR,
            &backdrop_type as *const _ as *const c_void,
            4,
        )
    };

    let target_opacity = if is_active {
        config.opacity
    } else {
        config.inactive_opacity
    };
    if !originally_layered && target_opacity < 100 {
        let ex_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) };
        if (ex_style & (WS_EX_LAYERED.0 as isize)) == 0 {
            let _ = unsafe {
                SetWindowLongPtrW(
                    hwnd,
                    GWL_EXSTYLE,
                    ex_style | (WS_EX_LAYERED.0 as isize),
                )
            };
        }
        let alpha = (target_opacity * 255 / 100).clamp(30, 255) as u8;
        let _ = unsafe {
            SetLayeredWindowAttributes(
                hwnd,
                COLORREF(0),
                alpha,
                LWA_ALPHA,
            )
        };
    } else if !originally_layered {
        let ex_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) };
        if (ex_style & (WS_EX_LAYERED.0 as isize)) != 0 {
            let _ = unsafe {
                SetLayeredWindowAttributes(
                    hwnd,
                    COLORREF(0),
                    255,
                    LWA_ALPHA,
                )
            };
            let _ = unsafe {
                SetWindowLongPtrW(
                    hwnd,
                    GWL_EXSTYLE,
                    ex_style & !(WS_EX_LAYERED.0 as isize),
                )
            };
        }
    }
}

pub fn apply_to_all_windows(config: &SystemAppearanceConfig) {
    if !config.enabled {
        restore_all_system_and_desktop_windows();
        return;
    }
    let foreground = unsafe { GetForegroundWindow() };
    struct EnumData<'a> {
        config: &'a SystemAppearanceConfig,
        foreground: HWND,
    }
    let data = EnumData {
        config,
        foreground,
    };
    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = unsafe { &*(lparam.0 as *const EnumData) };
        apply_to_window(hwnd, data.config, hwnd == data.foreground);
        BOOL(1)
    }
    let _ = unsafe {
        EnumWindows(
            Some(enum_proc),
            LPARAM(&data as *const _ as isize),
        )
    };
}

pub fn start(app: &tauri::AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut last_foreground_raw: isize = 0;
        let mut scan_tick = 0u8;
        let mut was_enabled = false;
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            let config = match app.state::<AppearanceState>().0.lock() {
                Ok(c) => c.clone(),
                Err(_) => continue,
            };
            if !config.enabled {
                if was_enabled {
                    restore_all_system_and_desktop_windows();
                    was_enabled = false;
                }
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                continue;
            }
            was_enabled = true;
            scan_tick = scan_tick.wrapping_add(1);
            if scan_tick % 20 == 0 { apply_to_all_windows(&config); }
            let current_fg = unsafe { GetForegroundWindow() };
            let current_raw = current_fg.0 as isize;
            if current_raw != last_foreground_raw {
                if last_foreground_raw != 0 {
                    apply_to_window(HWND(last_foreground_raw as *mut c_void), &config, false);
                }
                if current_raw != 0 {
                    apply_to_window(current_fg, &config, true);
                }
                last_foreground_raw = current_raw;
            }
        }
    });
}

#[tauri::command]
pub fn get_system_appearance(
    state: tauri::State<'_, AppearanceState>,
) -> Result<SystemAppearanceConfig, String> {
    state.0.lock().map_err(|e| e.to_string()).map(|c| c.clone())
}

#[tauri::command]
pub async fn set_system_appearance(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppearanceState>,
    mut config: SystemAppearanceConfig,
) -> Result<SystemAppearanceConfig, String> {
    config.normalize();
    let p = path();
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let data = serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(p, data).map_err(|e| e.to_string())?;
    *state.0.lock().map_err(|e| e.to_string())? = config.clone();
    if !config.enabled {
        restore_all_system_and_desktop_windows();
    } else {
        apply_to_all_windows(&config);
    }
    let _ = app.emit("appearance-config-changed", &config);
    Ok(config)
}

#[tauri::command]
pub async fn restore_system_appearance(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppearanceState>,
) -> Result<(), String> {
    restore_all_system_and_desktop_windows();
    let mut disabled = SystemAppearanceConfig {
        enabled: false,
        ..Default::default()
    };
    disabled.normalize();
    let p = path();
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let data = serde_json::to_vec_pretty(&disabled).map_err(|e| e.to_string())?;
    let _ = std::fs::write(p, data);
    *state.0.lock().map_err(|e| e.to_string())? = disabled.clone();
    let _ = app.emit("appearance-config-changed", &disabled);
    Ok(())
}

#[tauri::command]
pub fn open_windows_appearance_settings() -> Result<(), String> {
    let result = unsafe {
        ShellExecuteW(
            HWND::default(),
            w!("open"),
            w!("ms-settings:colors"),
            None,
            None,
            SW_SHOWNORMAL,
        )
    };
    if (result.0 as isize) <= 32 {
        Err("Could not open Windows appearance settings".into())
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_hex_color_valid_and_invalid() {
        assert_eq!(parse_hex_color("#ff0000"), Some(COLORREF(0x000000FF)));
        assert_eq!(parse_hex_color("00ff00"), Some(COLORREF(0x0000FF00)));
        assert_eq!(parse_hex_color("#0000ff"), Some(COLORREF(0x00FF0000)));
        assert_eq!(parse_hex_color("bad"), None);
        assert_eq!(parse_hex_color("#12345"), None);
    }

    #[test]
    fn defaults_and_normalization() {
        let mut c = SystemAppearanceConfig {
            opacity: 10,
            inactive_opacity: 120,
            corner_preference: "invalid".into(),
            backdrop: "invalid".into(),
            border_color: "bad_color".into(),
            border_width: 10,
            titlebar_mode: "invalid".into(),
            ..Default::default()
        };
        c.normalize();
        assert_eq!(c.opacity, 50);
        assert_eq!(c.inactive_opacity, 100);
        assert_eq!(c.corner_preference, "rounded");
        assert_eq!(c.backdrop, "mica");
        assert_eq!(c.border_color, "default");
        assert_eq!(c.border_width, 4);
        assert_eq!(c.titlebar_mode, "system");
        assert!(c.target_explorer && c.target_dialogs && c.target_tools);
    }

    #[test]
    fn matches_target_filters_and_scopes() {
        let mut config = SystemAppearanceConfig {
            enabled: true,
            scope: "system_only".into(),
            ..Default::default()
        };
        assert!(matches_target(HWND::default(), "CabinetWClass", "Docs", "explorer.exe", &config));
        assert!(matches_target(HWND::default(), "#32770", "Properties", "explorer.exe", &config));
        assert!(matches_target(HWND::default(), "TaskManagerWindow", "Task Manager", "taskmgr.exe", &config));
        assert!(matches_target(HWND::default(), "ConsoleWindowClass", "cmd", "cmd.exe", &config));

        assert!(!matches_target(HWND::default(), "Chrome_WidgetWin_1", "Google Chrome", "chrome.exe", &config));

        config.excluded_apps.push("chrome.exe".into());
        config.scope = "all_windows".into();
        assert!(!matches_target(HWND::default(), "Chrome_WidgetWin_1", "Google Chrome", "chrome.exe", &config));

        assert!(!matches_target(HWND::default(), "Valve001", "Counter-Strike", "cs2.exe", &config));
        assert!(!matches_target(HWND::default(), "UnrealWindow", "Cyberpunk 2077", "cyberpunk2077.exe", &config));

        config.enabled = false;
        assert!(!matches_target(HWND::default(), "CabinetWClass", "Docs", "explorer.exe", &config));
    }
}

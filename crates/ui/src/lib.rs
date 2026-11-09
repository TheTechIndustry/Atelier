mod dock_glass;
mod folder_ghost;
use atelier_audio::AudioManager;
use atelier_common::config::{AtelierConfig, TaskbarConfig, TaskbarStyle};
use atelier_common::presets::ThemePreset;
use atelier_taskbar::TaskbarManager;
use atelier_wallpaper::WallpaperEngine;
use atelier_widget::WidgetSubsystem;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::image::Image;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
mod app_usage;
mod desktop_background;
mod desktop_dock;
mod desktop_island;
mod desktop_wallpaper;
mod desktop_widgets;
pub mod installer;
mod scene_effects;
mod scene_geometry;
mod scene_preview;
mod scene_properties;
mod steam_workshop;
mod system_animations;
mod system_appearance;
mod tray_panel;
mod tray_bridge;
#[allow(dead_code)]
mod tray_protocol;
mod wallpaper_performance;
mod wallpaper_scene;
mod widget_auth;
mod widget_billing;
mod widget_codex;
mod widget_google;
mod widget_appstore;
mod widget_playstore;
mod widget_clipboard;
mod widget_controls;
mod widget_audio_outputs;
mod widget_docker;
mod widget_gpu;
mod widget_network;
mod widget_reminder;
mod widget_metrics;
mod widget_photo;
mod widget_screentime;
mod widget_timers;
pub fn watchdog_args() -> bool {
    atelier_taskbar::position::guardian_args() || desktop_dock::watchdog_args()
}
#[cfg(debug_assertions)]
#[path = "../tests/support/dock_fixture.rs"]
mod dock_fixture;
pub fn desktop_test_args() -> bool {
    #[cfg(debug_assertions)]
    if wallpaper_scene::test_args() {
        return true;
    }
    #[cfg(debug_assertions)]
    {
        dock_fixture::run()
    }
    #[cfg(not(debug_assertions))]
    {
        false
    }
}
fn dock_test_mode() -> bool {
    cfg!(debug_assertions) && std::env::var_os("ATELIER_DOCK_ONLY_TEST").is_some()
}

pub struct AppState {
    pub taskbar: Arc<TaskbarManager>,
    pub wallpaper: Option<Arc<WallpaperEngine>>,
    pub audio: Arc<Mutex<AudioManager>>,
    pub widget: Arc<WidgetSubsystem>,
}

fn settings_path() -> Option<PathBuf> {
    let root = std::env::var_os("ATELIER_DATA_DIR")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(|root| PathBuf::from(root).join("Atelier")))?;
    Some(root.join("settings.json"))
}

fn save_settings(config: &TaskbarConfig) -> Result<(), String> {
    let path = settings_path().ok_or("Atelier data directory is unavailable")?;
    std::fs::create_dir_all(path.parent().ok_or("Invalid settings path")?)
        .map_err(|e| e.to_string())?;
    let bytes = serde_json::to_vec_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(path, bytes).map_err(|e| e.to_string())
}

fn native_taskbar_enabled_path() -> Option<PathBuf> {
    settings_path().map(|p| p.with_file_name("native-taskbar-enabled.json"))
}
fn load_native_taskbar_enabled() -> Option<bool> {
    native_taskbar_enabled_path()
        .and_then(|p| std::fs::read(p).ok())
        .and_then(|data| serde_json::from_slice(&data).ok())
}
#[tauri::command]
fn get_native_taskbar_enabled(state: tauri::State<AppState>) -> bool {
    state.taskbar.is_enabled()
}
#[tauri::command]
fn set_native_taskbar_enabled(
    state: tauri::State<AppState>,
    enabled: bool,
) -> Result<bool, String> {
    let previous = state.taskbar.is_enabled();
    state
        .taskbar
        .set_enabled(enabled)
        .map_err(|e| e.to_string())?;
    let result = (|| {
        let p = native_taskbar_enabled_path().ok_or("Atelier data directory is unavailable")?;
        std::fs::create_dir_all(p.parent().ok_or("Invalid settings path")?)
            .map_err(|e| e.to_string())?;
        std::fs::write(p, serde_json::to_vec(&enabled).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())
    })();
    if let Err(error) = result {
        let _ = state.taskbar.set_enabled(previous);
        return Err(error);
    }
    Ok(enabled)
}

#[tauri::command]
fn get_taskbar_config(state: tauri::State<AppState>) -> Result<TaskbarConfig, String> {
    state.taskbar.config().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_taskbar_capabilities() -> serde_json::Value {
    let taskbars = atelier_taskbar::discovery::find_all_taskbars();
    let has_xaml = taskbars
        .iter()
        .copied()
        .any(atelier_taskbar::discovery::has_xaml_background);
    let xaml_unsupported = has_xaml && !atelier_taskbar::xaml::is_supported();
    serde_json::json!({
        "taskbar_count": taskbars.len(),
        "xaml_background": xaml_unsupported,
        "native_appearance": has_xaml && atelier_taskbar::xaml::is_supported(),
    })
}

#[tauri::command]
fn set_taskbar_config(
    state: tauri::State<AppState>,
    config: TaskbarConfig,
) -> Result<TaskbarConfig, String> {
    let mut config = config;
    config.floating_margin = config.floating_margin.clamp(0, 600);
    config.corner_radius = config.corner_radius.clamp(0, 36);
    config.vertical_gap = config.vertical_gap.clamp(0, 24);
    config.appearance.normalize();
    state
        .taskbar
        .set_config(config.clone())
        .map_err(|e| e.to_string())?;
    save_settings(&config)?;
    Ok(config)
}

#[tauri::command]
fn apply_style(
    state: tauri::State<AppState>,
    style_name: String,
    tint: Option<i64>,
) -> Result<(), String> {
    let tint_u32 = tint.map(|t| t as u32);
    let style = match style_name.to_lowercase().as_str() {
        "clear" => TaskbarStyle::Clear,
        "blur" => TaskbarStyle::Blur,
        "acrylic" => TaskbarStyle::Acrylic {
            tint: tint_u32.unwrap_or(0xCC1A0033),
        },
        "mica" => TaskbarStyle::Mica,
        _ => TaskbarStyle::Default,
    };

    state.taskbar.set_style(style).map_err(|e| e.to_string())?;
    save_settings(&state.taskbar.config().map_err(|e| e.to_string())?)
}

#[tauri::command]
fn set_floating_dock(
    state: tauri::State<AppState>,
    enabled: bool,
    margin: i32,
) -> Result<(), String> {
    state
        .taskbar
        .set_floating_dock(enabled, margin)
        .map_err(|e| e.to_string())?;
    save_settings(&state.taskbar.config().map_err(|e| e.to_string())?)
}

#[tauri::command]
fn apply_preset(state: tauri::State<AppState>, name: String) -> Result<(), String> {
    let preset = match name.to_lowercase().as_str() {
        "macos sonoma" | "sonoma" => ThemePreset::macos_sonoma(),
        "macos big sur" | "big sur" => ThemePreset::macos_big_sur(),
        "cupertino dark" | "dark dock" => ThemePreset::cupertino_dark(),
        "cupertino light" | "light dock" => ThemePreset::cupertino_light(),
        "clean glass" | "clean" => ThemePreset::clean_glass(),
        "windows default" | "windows" | "stock" => ThemePreset::windows_default(),
        "minimal clean" | "minimal" => ThemePreset::minimal_clean(),
        "cyberpunk neon" | "cyberpunk" | "neon" => ThemePreset::cyberpunk_neon(),
        "frosted glass" | "frosted" => ThemePreset::frosted_glass(),
        "nordic dark" | "nordic" => ThemePreset::nordic_dark(),
        _ => ThemePreset::macos_sonoma(),
    };

    state
        .taskbar
        .set_config(preset.taskbar)
        .map_err(|e| e.to_string())?;
    save_settings(&state.taskbar.config().map_err(|e| e.to_string())?)?;

    if let Ok(a) = state.audio.lock() {
        a.set_tint(preset.accent_color);
    }

    Ok(())
}

#[tauri::command]
fn reset_defaults(state: tauri::State<AppState>) -> Result<(), String> {
    state.taskbar.reset_all().map_err(|e| e.to_string())?;
    state.taskbar.repair_icons().map_err(|e| e.to_string())?;
    save_settings(&state.taskbar.config().map_err(|e| e.to_string())?)
}
#[tauri::command]
fn repair_taskbar_icons(state: tauri::State<AppState>) -> Result<TaskbarConfig, String> {
    let mut config = state.taskbar.config().map_err(|e| e.to_string())?;
    config.appearance.icon_size = 0;
    config.appearance.hover_scale = 100;
    state.taskbar.repair_icons().map_err(|e| e.to_string())?;
    state
        .taskbar
        .set_config(config.clone())
        .map_err(|e| e.to_string())?;
    save_settings(&config)?;
    Ok(config)
}

#[tauri::command]
fn hide_window(window: tauri::Window) {
    if window.label() == "main" {
        let _ = window.destroy();
        crate::app_usage::trim_memory();
    } else {
        let _ = window.hide();
    }
}

pub fn show_or_create_studio(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(());
    }

    let icon = Image::new(include_bytes!("../icons/icon.rgba"), 128, 128);
    let mut builder =
        tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
            .title("Atelier Desktop Studio")
            .inner_size(940.0, 660.0)
            .min_inner_size(640.0, 500.0)
            .resizable(true)
            .decorations(false)
            .transparent(true)
            .shadow(true);

    if let Some(effects) = app
        .config()
        .app
        .windows
        .first()
        .and_then(|w| w.window_effects.clone())
    {
        builder = builder.effects(effects);
    }

    let window = builder.build().map_err(|e| e.to_string())?;
    let _ = window.set_icon(icon);
    let _ = window.set_theme(Some(tauri::Theme::Dark));

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE};
        if let Ok(raw_hwnd) = window.hwnd() {
            let dark: i32 = 1;
            let _ = unsafe {
                DwmSetWindowAttribute(
                    HWND(raw_hwnd.0 as _),
                    DWMWA_USE_IMMERSIVE_DARK_MODE,
                    &dark as *const _ as _,
                    std::mem::size_of::<i32>() as u32,
                )
            };
        }
    }

    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn get_system_status(
    state: tauri::State<AppState>,
    wallpapers: tauri::State<desktop_wallpaper::Wallpapers>,
) -> Result<serde_json::Value, String> {
    let audio_running = state.audio.lock().map(|a| a.is_active()).unwrap_or(false);
    let is_fullscreen = atelier_wallpaper::occlusion::is_fullscreen_window_active()
        || atelier_wallpaper::occlusion::is_fullscreen_game_or_presentation();
    Ok(
        serde_json::json!({"audio_active":audio_running,"wallpaper_active":wallpapers.is_active(),"fullscreen_occluded":is_fullscreen,"widgets_active":true}),
    )
}

#[derive(Clone, Serialize, Deserialize)]
pub struct TaskbarAppIcon {
    pub name: String,
    pub icon: String,
    pub is_running: bool,
    pub is_active: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct TaskbarPreviewInfo {
    pub apps: Vec<TaskbarAppIcon>,
    pub clock: String,
    pub language: String,
}

fn base64_encode(data: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARSET[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARSET[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARSET[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARSET[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn hicon_to_bmp_base64(
    icon: windows::Win32::UI::WindowsAndMessaging::HICON,
    size: i32,
) -> Option<String> {
    use windows::Win32::Graphics::Gdi::*;
    use windows::Win32::UI::WindowsAndMessaging::*;
    unsafe {
        let hdc = CreateCompatibleDC(None);
        if hdc.0.is_null() {
            return None;
        }

        let bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: size,
                biHeight: -size,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: 0,
                biSizeImage: (size * size * 4) as u32,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [RGBQUAD::default()],
        };

        let mut bits: *mut std::ffi::c_void = std::ptr::null_mut();
        let hbmp = CreateDIBSection(hdc, &bi, DIB_RGB_COLORS, &mut bits, None, 0).ok()?;
        let old_bmp = SelectObject(hdc, hbmp);

        std::slice::from_raw_parts_mut(bits as *mut u8, (size * size * 4) as usize).fill(0);

        let _ = DrawIconEx(hdc, 0, 0, icon, size, size, 0, None, DI_NORMAL);

        let pixel_bytes = std::slice::from_raw_parts(bits as *const u8, (size * size * 4) as usize);

        let pixels = pixel_bytes.as_chunks::<4>().0;
        let has_alpha = pixels.iter().any(|p| p[3] != 0);
        let mut rgba = Vec::with_capacity(pixel_bytes.len());
        for p in pixels {
            let alpha = if has_alpha {
                p[3]
            } else if p[..3].iter().any(|v| *v != 0) {
                255
            } else {
                0
            };
            let unpremultiply = |v: u8| {
                if alpha == 0 {
                    0
                } else {
                    ((v as u32 * 255) / (alpha as u32)).min(255) as u8
                }
            };
            rgba.extend_from_slice(&[
                unpremultiply(p[2]),
                unpremultiply(p[1]),
                unpremultiply(p[0]),
                alpha,
            ]);
        }

        SelectObject(hdc, old_bmp);
        let _ = DeleteObject(hbmp);
        let _ = DeleteDC(hdc);

        let mut output = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut output, size as u32, size as u32);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().ok()?;
            writer.write_image_data(&rgba).ok()?;
        }
        Some(format!("data:image/png;base64,{}", base64_encode(&output)))
    }
}

#[repr(C)]
struct ShFileInfoW {
    h_icon: windows::Win32::UI::WindowsAndMessaging::HICON,
    i_icon: i32,
    dw_attributes: u32,
    sz_display_name: [u16; 260],
    sz_type_name: [u16; 80],
}

#[link(name = "shell32")]
extern "system" {
    fn SHGetFileInfoW(
        pszpath: *const u16,
        dwfileattributes: u32,
        psfi: *mut ShFileInfoW,
        cbfileinfo: u32,
        uflags: u32,
    ) -> usize;
}

#[link(name = "user32")]
extern "system" {
    fn GetKeyboardLayout(id_thread: u32) -> isize;
}

#[tauri::command]
fn get_taskbar_preview_info() -> Result<TaskbarPreviewInfo, String> {
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, WPARAM};
    use windows::Win32::UI::WindowsAndMessaging::*;

    struct OpenWinItem {
        title: String,
        short_name: String,
        icon: Option<String>,
        is_active: bool,
    }

    let foreground = unsafe { GetForegroundWindow() };

    unsafe extern "system" fn enum_win(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let state = unsafe { &mut *(lparam.0 as *mut (Vec<OpenWinItem>, HWND)) };
        if state.0.len() >= 32 {
            return BOOL(0);
        }
        if unsafe { IsWindowVisible(hwnd) }.as_bool() {
            let style = unsafe { GetWindowLongW(hwnd, GWL_STYLE) } as u32;
            let ex = unsafe { GetWindowLongW(hwnd, GWL_EXSTYLE) } as u32;
            if (style & WS_CHILD.0) == 0 && (ex & WS_EX_TOOLWINDOW.0) == 0 {
                let mut title = [0u16; 256];
                let len = unsafe { GetWindowTextW(hwnd, &mut title) };
                if len > 0 {
                    let text = String::from_utf16_lossy(&title[..len as usize]);
                    let trimmed = text.trim();
                    if !trimmed.is_empty() && trimmed != "Program Manager" {
                        let short = trimmed
                            .split(" - ")
                            .last()
                            .unwrap_or(trimmed)
                            .trim()
                            .to_string();
                        let is_active = hwnd == state.1;
                        let mut b64 = None;
                        let mut icon = HICON(unsafe {
                            SendMessageW(hwnd, WM_GETICON, WPARAM(2), LPARAM(0)).0
                                as *mut std::ffi::c_void
                        });
                        if icon.0.is_null() {
                            icon = HICON(unsafe {
                                SendMessageW(hwnd, WM_GETICON, WPARAM(0), LPARAM(0)).0
                                    as *mut std::ffi::c_void
                            });
                        }
                        if icon.0.is_null() {
                            icon = HICON(unsafe {
                                GetClassLongPtrW(hwnd, GCLP_HICON) as *mut std::ffi::c_void
                            });
                        }
                        if !icon.0.is_null() {
                            b64 = hicon_to_bmp_base64(icon, 32);
                        }
                        state.0.push(OpenWinItem {
                            title: text,
                            short_name: short,
                            icon: b64,
                            is_active,
                        });
                    }
                }
            }
        }
        BOOL(1)
    }

    let mut open_state: (Vec<OpenWinItem>, HWND) = (Vec::new(), foreground);
    let _ = unsafe { EnumWindows(Some(enum_win), LPARAM(&mut open_state as *mut _ as isize)) };
    let open_windows = open_state.0;

    let mut apps = Vec::new();
    let mut used_open_windows = std::collections::HashSet::new();

    let pinned_dir = std::env::var_os("APPDATA")
        .map(std::path::PathBuf::from)
        .map(|p| p.join("Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar"));

    if let Some(dir) = pinned_dir {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("lnk") {
                    let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
                    wide.push(0);

                    let mut shinfo = ShFileInfoW {
                        h_icon: HICON::default(),
                        i_icon: 0,
                        dw_attributes: 0,
                        sz_display_name: [0; 260],
                        sz_type_name: [0; 80],
                    };

                    let res = unsafe {
                        SHGetFileInfoW(
                            wide.as_ptr(),
                            0,
                            &mut shinfo,
                            std::mem::size_of::<ShFileInfoW>() as u32,
                            0x000000100,
                        )
                    };

                    if res != 0 && !shinfo.h_icon.0.is_null() {
                        if let Some(b64) = hicon_to_bmp_base64(shinfo.h_icon, 32) {
                            let name = path
                                .file_stem()
                                .and_then(|s| s.to_str())
                                .unwrap_or("App")
                                .to_string();

                            let mut is_running = false;
                            let mut is_active = false;
                            for (idx, win) in open_windows.iter().enumerate() {
                                let pn = name.to_lowercase();
                                let wt = win.title.to_lowercase();
                                let ws = win.short_name.to_lowercase();
                                if wt.contains(&pn) || ws.contains(&pn) || pn.contains(&ws) {
                                    is_running = true;
                                    if win.is_active {
                                        is_active = true;
                                    }
                                    used_open_windows.insert(idx);
                                    break;
                                }
                            }

                            apps.push(TaskbarAppIcon {
                                name,
                                icon: b64,
                                is_running,
                                is_active,
                            });
                        }
                        let _ = unsafe { DestroyIcon(shinfo.h_icon) };
                    }
                }
            }
        }
    }

    let mut seen: std::collections::HashSet<String> = apps
        .iter()
        .map(|a: &TaskbarAppIcon| a.name.to_lowercase())
        .collect();

    for (idx, win) in open_windows.iter().enumerate() {
        if !used_open_windows.contains(&idx) {
            if let Some(b64) = &win.icon {
                let key = win.short_name.to_lowercase();
                if !seen.contains(&key) && apps.len() < 24 {
                    seen.insert(key);
                    apps.push(TaskbarAppIcon {
                        name: win.short_name.clone(),
                        icon: b64.clone(),
                        is_running: true,
                        is_active: win.is_active,
                    });
                }
            }
        }
    }

    let st = unsafe { windows::Win32::System::SystemInformation::GetLocalTime() };
    let clock = format!("{:02}:{:02}", st.wHour, st.wMinute);

    let layout = unsafe { GetKeyboardLayout(0) };
    let lang_id = (layout as usize & 0xFFFF) as u16;
    let language = match lang_id {
        0x0422 => "УКР",
        0x0409 => "ENG",
        0x0419 => "РУС",
        0x0407 => "DEU",
        0x040C => "FRA",
        0x0415 => "POL",
        _ => "УКР",
    }
    .to_string();

    Ok(TaskbarPreviewInfo {
        apps,
        clock,
        language,
    })
}

pub fn run() {
    #[cfg(target_os = "windows")]
    {
        #[link(name = "kernel32")]
        extern "system" {
            fn SetConsoleCtrlHandler(
                handler_routine: Option<unsafe extern "system" fn(u32) -> i32>,
                add: i32,
            ) -> i32;
        }
        unsafe extern "system" fn ctrl_handler(_: u32) -> i32 {
            system_appearance::cleanup();
            if dock_test_mode() {
                return 0;
            }
            let taskbars = atelier_taskbar::discovery::find_all_taskbars();
            for &hwnd in &taskbars {
                let _ = atelier_taskbar::style::apply_taskbar_style(
                    hwnd,
                    atelier_common::config::TaskbarStyle::Default,
                    false,
                );
                let _ = atelier_taskbar::dock::reset_floating_dock(hwnd, false);
            }
            0
        }
        unsafe {
            let _ = SetConsoleCtrlHandler(Some(ctrl_handler), 1);
        }
    }

    let native_enabled_setting = load_native_taskbar_enabled();
    let native_enabled = native_enabled_setting.unwrap_or(true);
    let saved_config = if native_enabled_setting.is_some() {
        settings_path()
            .and_then(|p| std::fs::read(p).ok())
            .and_then(|v| serde_json::from_slice::<TaskbarConfig>(&v).ok())
    } else {
        None
    };
    let restore_native = native_enabled
        && saved_config
            .as_ref()
            .is_some_and(|c| *c != TaskbarConfig::default());
    let config = AtelierConfig {
        taskbar: saved_config.unwrap_or_default(),
        ..Default::default()
    };

    let taskbar = Arc::new(if dock_test_mode() {
        TaskbarManager::passive(config.taskbar)
    } else {
        TaskbarManager::new(config.taskbar)
    });
    if !dock_test_mode() {
        if !native_enabled {
            let _ = taskbar.set_enabled(false);
        }
        let _ = taskbar.start_recovery();
        if restore_native {
            if let Err(error) = taskbar.apply_current_style() {
                tracing::error!(%error, "Could not restore Windows taskbar customization");
            }
        }
    }

    let wallpaper = None;

    let audio = Arc::new(Mutex::new(AudioManager::new(0x00FF8800)));

    let widget = Arc::new(WidgetSubsystem::new());

    let state = AppState {
        taskbar,
        wallpaper,
        audio,
        widget,
    };

    let _ = tauri::Builder::default()
        .register_asynchronous_uri_scheme_protocol("wallpaper-media", |_ctx, request, responder| {
            std::thread::spawn(move || responder.respond(desktop_wallpaper::response(request)));
        })
        .register_asynchronous_uri_scheme_protocol("workshop-media", |_ctx, request, responder| {
            std::thread::spawn(move || {
                responder.respond(steam_workshop::workshop_media_response(request))
            });
        })
        .register_asynchronous_uri_scheme_protocol("wallpaper-scene", |_ctx, request, responder| {
            std::thread::spawn(move || responder.respond(wallpaper_scene::response(request)));
        })
        .register_uri_scheme_protocol("widget-photo", |_ctx, request| {
            widget_photo::response(request)
        })
        .manage(state)
        .manage(app_usage::UsageMonitor::default())
        .manage(tray_panel::TrayUsage::default())
        .manage(tray_bridge::TrayBridge::default())
        .manage(desktop_dock::DockState::new())
        .manage(desktop_widgets::Widgets::new())
        .manage(desktop_island::IslandState::new())
        .manage(system_appearance::AppearanceState::new())
        .manage(system_animations::AnimationsState::new())
        .manage(widget_photo::PhotoUploads::default())
        .manage(widget_clipboard::ClipboardHistory::default())
        .manage(widget_screentime::ScreenTime::default())
        .manage(desktop_wallpaper::Wallpapers::new())
        .setup(|app| {
            if !dock_test_mode() { widget_screentime::start(app.handle().clone()); widget_timers::start(); }
            let audio = app.state::<AppState>().audio.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    let audio = audio.clone();
                    let _ = tauri::async_runtime::spawn_blocking(move || {
                        if let Ok(mut audio) = audio.lock() {
                            audio.stop_if_idle(std::time::Duration::from_secs(3));
                        }
                    })
                    .await;
                }
            });
            let icon = Image::new(include_bytes!("../icons/icon.rgba"), 128, 128);
            if let Some(window) = app.get_webview_window("main") {
                window.set_icon(icon.clone())?;
                window.set_title("Atelier Desktop Studio")?;
                let _ = window.set_theme(Some(tauri::Theme::Dark));
                #[cfg(target_os = "windows")]
                {
                    use windows::Win32::Foundation::HWND;
                    use windows::Win32::Graphics::Dwm::{
                        DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE,
                    };
                    if let Ok(raw_hwnd) = window.hwnd() {
                        let dark: i32 = 1;
                        let _ = unsafe {
                            DwmSetWindowAttribute(
                                HWND(raw_hwnd.0 as _),
                                DWMWA_USE_IMMERSIVE_DARK_MODE,
                                &dark as *const _ as _,
                                std::mem::size_of::<i32>() as u32,
                            )
                        };
                    }
                }
            }
            tray_panel::create(app.handle())?;
            if app.state::<desktop_dock::DockState>().widgets_enabled(&["sys_tray"]) {
                app.state::<tray_bridge::TrayBridge>().start(app.handle().clone());
            }
            let menu = tray_panel::app_menu(app.handle())?;
            app.on_menu_event(tray_panel::handle_menu_event);
            let _tray = TrayIconBuilder::new()
                .tooltip("Atelier Desktop Engine")
                .icon(icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        let _ = show_or_create_studio(tray.app_handle());
                    }
                    _ => {}
                })
                .build(app)?;
            if !dock_test_mode() || std::env::var_os("ATELIER_WIDGET_TEST").is_some() {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = desktop_widgets::start(&handle) {
                        tracing::error!(%error, "Could not start widgets");
                    }
                });
            }
            if !dock_test_mode() {
                system_appearance::start(&app.handle());
                system_animations::start(&app.handle());
                let island_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = desktop_island::start(&island_handle) {
                        tracing::error!(%error, "Could not start Dynamic Island");
                    }
                });
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = desktop_wallpaper::start(&handle) {
                        tracing::error!(%error,"Could not restore wallpaper");
                        desktop_wallpaper::report_start_error(&handle, &error);
                    }
                });
            }
            if let Err(error) = desktop_dock::start(app.handle()) {
                tracing::error!(%error, "Could not start desktop dock");
            }
            #[cfg(debug_assertions)]
            if dock_test_mode() && std::env::var_os("ATELIER_DOCK_NATIVE_TEST").is_some() {
                let app = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.eval(include_str!("../tests/dock-native.js"));
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(|invoke| {
            if invoke.message.webview_ref().label().starts_with("billing-") {
                invoke.resolver.reject("Billing websites cannot invoke Atelier commands");
                return true;
            }
            let handler:fn(tauri::ipc::Invoke<tauri::Wry>)->bool=tauri::generate_handler![
            app_usage::atelier_usage,
            app_usage::widget_top_processes,
            app_usage::trim_atelier_memory,
            tray_panel::tray_usage,
            tray_panel::tray_action,
            system_appearance::get_system_appearance,
            system_appearance::set_system_appearance,
            system_appearance::restore_system_appearance,
            system_appearance::open_windows_appearance_settings,
            system_animations::get_animations_config,
            system_animations::set_animations_config,
            system_animations::get_window_animation,
            system_animations::set_window_animation,
            steam_workshop::workshop_list_local,
            steam_workshop::workshop_import_video,
            steam_workshop::workshop_import_scene,
            steam_workshop::workshop_open_page,
            steam_workshop::workshop_open_client,
            steam_workshop::workshop_open_browse,
            desktop_wallpaper::wallpaper_snapshot,
            desktop_wallpaper::wallpaper_import_begin,
            desktop_wallpaper::wallpaper_import_chunk,
            desktop_wallpaper::wallpaper_import_finish,
            desktop_wallpaper::wallpaper_add_preset,
            desktop_wallpaper::wallpaper_apply,
            desktop_wallpaper::wallpaper_options,
            desktop_wallpaper::wallpaper_audio_options,
            desktop_wallpaper::wallpaper_audio_error,
            desktop_wallpaper::wallpaper_scene_info,
            desktop_wallpaper::wallpaper_scene_options,
            desktop_wallpaper::wallpaper_performance_options,
            desktop_wallpaper::wallpaper_playback_state,
            desktop_wallpaper::wallpaper_remove,
            desktop_wallpaper::wallpaper_should_pause,
            desktop_wallpaper::wallpaper_pause_reason,
            desktop_wallpaper::wallpaper_repair,
            desktop_wallpaper::wallpaper_report,
            widget_photo::photo_upload_begin,
            widget_photo::photo_upload_chunk,
            widget_photo::photo_upload_finish,
            get_native_taskbar_enabled,
            set_native_taskbar_enabled,
            desktop_island::get_island,
            desktop_island::set_island,
            desktop_island::island_monitors,
            desktop_island::island_expand,
            desktop_widgets::get_widgets,
            widget_auth::widget_verify_service,
            widget_auth::widget_service_data,
            widget_appstore::widget_appstore_sales,
            widget_codex::widget_codex_quota,
            widget_billing::widget_billing_open,
            widget_billing::widget_billing_snapshot,
            widget_billing::widget_billing_disconnect,
            widget_google::widget_ga4_service_report,
            widget_playstore::widget_play_report,
            widget_screentime::widget_screen_time,
            widget_screentime::widget_screen_time_clear,
            widget_controls::widget_audio_device,
            widget_controls::widget_brightness,
            widget_controls::widget_open_sound_settings,
            widget_audio_outputs::widget_audio_outputs,
            widget_controls::widget_recycle_bin,
            widget_clipboard::widget_clipboard_snapshot,
            widget_clipboard::widget_clipboard_copy,
            desktop_widgets::fetch_antigravity_quota,
            desktop_widgets::set_widget,
            desktop_widgets::audio_spectrum,
            desktop_widgets::audio_widget_fullscreen,
            desktop_widgets::widget_stats,
            desktop_widgets::widget_drive_usage,
            widget_network::widget_ping,
            widget_docker::widget_docker,
            widget_network::widget_wifi,
            widget_network::widget_bluetooth,
            widget_metrics::widget_gpu_memory,
            widget_reminder::widget_break_reminder,
            widget_timers::widget_timer,
            desktop_widgets::widget_media,
            desktop_widgets::widget_media_control,
            desktop_widgets::widget_media_seek,
            desktop_widgets::widget_battery,
            desktop_widgets::widget_open_settings,
            desktop_widgets::widget_resize_focus,
            desktop_widgets::widget_bounds,
            desktop_widgets::widget_resize,
            desktop_widgets::widget_position,
            desktop_widgets::widget_move,
            get_taskbar_config,
            get_taskbar_capabilities,
            set_taskbar_config,
            apply_style,
            set_floating_dock,
            apply_preset,
            reset_defaults,
            repair_taskbar_icons,
            hide_window,
            get_system_status,
            get_taskbar_preview_info,
            desktop_dock::get_dock_snapshot,
            desktop_dock::set_dock_config,
            desktop_dock::get_dock_audio,
            desktop_dock::set_dock_audio,
            desktop_dock::dock_audio_error,
            desktop_dock::reset_desktop_dock,
            desktop_dock::dock_resize,
            desktop_dock::dock_backdrop,
            desktop_dock::dock_menu_open,
            desktop_dock::dock_activate,
            desktop_dock::dock_pin,
            desktop_dock::dock_set_hidden,
            desktop_dock::dock_open_system,
            desktop_dock::dock_input_language,
            desktop_dock::dock_languages,
            desktop_dock::dock_open_language,
            desktop_dock::dock_open_folder,
            desktop_dock::dock_open_tray,
            folder_ghost::folder_ghost_start,
            folder_ghost::folder_ghost_move,
            folder_ghost::folder_ghost_end,
            folder_ghost::folder_ghost_icon,
            tray_bridge::tray_icons,
            tray_bridge::tray_icon_click,
            desktop_dock::dock_select_language,
            desktop_dock::dock_reorder,
            desktop_dock::dock_widget_set,
            desktop_dock::dock_widgets_reorder,
            desktop_dock::dock_items_reorder,
            desktop_dock::dock_set_icon,
            desktop_dock::dock_open_studio,
            desktop_dock::dock_native_test_probe,
            ];
            handler(invoke)
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                desktop_widgets::dismiss_resize(window);
                if window.label() == "dock-language" || window.label() == "tray-panel" {
                    let _ = window.hide();
                }
            }
            if let tauri::WindowEvent::Moved(position) = event {
                desktop_widgets::moved(window, position);
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.destroy();
                    crate::app_usage::trim_memory();
                }
            }
        })
        .run(tauri::generate_context!());
    desktop_dock::restore_all_taskbars();
    if let Err(error) = desktop_background::shutdown() {
        tracing::error!(%error, "Could not restore Windows background after exit");
    }
}

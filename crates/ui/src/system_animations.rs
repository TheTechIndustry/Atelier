use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager};
use windows::core::w;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Dwm::{
    DwmRegisterThumbnail, DwmUnregisterThumbnail, DwmUpdateThumbnailProperties,
    DWM_THUMBNAIL_PROPERTIES, DWM_TNP_OPACITY, DWM_TNP_RECTDESTINATION, DWM_TNP_VISIBLE,
};
use windows::Win32::UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, GetSystemMetrics,
    GetWindowRect, RegisterClassExW, SetLayeredWindowAttributes, ShowWindow, SystemParametersInfoW,
    TranslateMessage, ANIMATIONINFO, CS_HREDRAW, CS_VREDRAW, LWA_ALPHA, MSG, SM_CXSCREEN,
    SM_CYSCREEN, SPIF_SENDCHANGE, SPIF_UPDATEINIFILE, SPI_GETANIMATION, SPI_SETANIMATION, SW_HIDE,
    SW_SHOWNOACTIVATE, WNDCLASSEXW, WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOOLWINDOW,
    WS_EX_TOPMOST, WS_EX_TRANSPARENT, WS_POPUP,
};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct SystemAnimationsConfig {
    pub enabled: bool,
    pub window_transitions: bool,
    pub window_effect: String,
    pub window_duration: u32,
    pub window_easing: String,
    pub native_min_max_animation: bool,
    pub dock_bounce: String,
    pub dock_bounce_count: u32,
    pub dock_hover_wave: bool,
    pub dock_hover_scale: u32,
    pub dock_click_feedback: String,
}

impl Default for SystemAnimationsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            window_transitions: true,
            window_effect: "dock_expand".into(),
            window_duration: 240,
            window_easing: "spring".into(),
            native_min_max_animation: false,
            dock_bounce: "launch_only".into(),
            dock_bounce_count: 2,
            dock_hover_wave: true,
            dock_hover_scale: 135,
            dock_click_feedback: "bounce".into(),
        }
    }
}

impl SystemAnimationsConfig {
    pub fn normalize(&mut self) {
        self.window_duration = self.window_duration.clamp(50, 1000);
        self.dock_bounce_count = self.dock_bounce_count.clamp(1, 5);
        self.dock_hover_scale = self.dock_hover_scale.clamp(100, 180);

        if self.window_effect == "macos_scale" {
            self.window_effect = "dock_expand".into();
        }
        if ![
            "dock_expand",
            "scale",
            "genie",
            "glide",
            "fade_pop",
            "spring",
        ]
        .contains(&self.window_effect.as_str())
        {
            self.window_effect = "dock_expand".into();
        }
        if !["spring", "ease_out", "snappy", "linear"].contains(&self.window_easing.as_str()) {
            self.window_easing = "spring".into();
        }
        if !["always", "launch_only", "notification", "off"].contains(&self.dock_bounce.as_str()) {
            self.dock_bounce = "launch_only".into();
        }
        if !["bounce", "press", "pulse", "none"].contains(&self.dock_click_feedback.as_str()) {
            self.dock_click_feedback = "bounce".into();
        }
    }
}

pub struct AnimationsState(pub Mutex<SystemAnimationsConfig>);

static OVERLAY_HWND: OnceLock<Mutex<isize>> = OnceLock::new();
static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
static OVERLAY_LOCK: Mutex<()> = Mutex::new(());
static DOCK_ICON_HINTS: Mutex<
    Option<std::collections::HashMap<isize, (RECT, std::time::Instant)>>,
> = Mutex::new(None);
static ANIMATING_WINDOWS: Mutex<Option<std::collections::HashMap<isize, std::time::Instant>>> =
    Mutex::new(None);

pub fn set_dock_icon_hint(hwnd: HWND, rc_icon: RECT) {
    if let Ok(mut lock) = DOCK_ICON_HINTS.lock() {
        let map = lock.get_or_insert_with(std::collections::HashMap::new);
        map.insert(hwnd.0 as isize, (rc_icon, std::time::Instant::now()));
    }
}

pub fn take_dock_icon_hint(hwnd: HWND) -> Option<RECT> {
    if let Ok(mut lock) = DOCK_ICON_HINTS.lock() {
        if let Some(map) = lock.as_mut() {
            if let Some((rc, time)) = map.remove(&(hwnd.0 as isize)) {
                if time.elapsed().as_millis() < 2000 {
                    return Some(rc);
                }
            }
        }
    }
    None
}

fn overlay_mutex() -> &'static Mutex<isize> {
    OVERLAY_HWND.get_or_init(|| Mutex::new(0))
}

pub fn get_or_create_overlay() -> HWND {
    let mut lock = match overlay_mutex().lock() {
        Ok(l) => l,
        Err(poisoned) => poisoned.into_inner(),
    };
    if *lock != 0 {
        let hwnd = HWND(*lock as *mut std::ffi::c_void);
        if unsafe { windows::Win32::UI::WindowsAndMessaging::IsWindow(hwnd) }.as_bool() {
            return hwnd;
        }
    }

    unsafe extern "system" fn overlay_wnd_proc(
        hwnd: HWND,
        msg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        DefWindowProcW(hwnd, msg, wparam, lparam)
    }

    let class_name = w!("AtelierWindowAnimOverlay");
    let wc = WNDCLASSEXW {
        cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
        style: CS_HREDRAW | CS_VREDRAW,
        lpfnWndProc: Some(overlay_wnd_proc),
        lpszClassName: class_name,
        ..Default::default()
    };
    let _ = unsafe { RegisterClassExW(&wc) };

    let screen_w = unsafe { GetSystemMetrics(SM_CXSCREEN) };
    let screen_h = unsafe { GetSystemMetrics(SM_CYSCREEN) };

    let hwnd = unsafe {
        CreateWindowExW(
            WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_TOPMOST | WS_EX_NOACTIVATE,
            class_name,
            w!("Atelier Animation Overlay"),
            WS_POPUP,
            0,
            0,
            screen_w,
            screen_h,
            HWND::default(),
            None,
            None,
            None,
        )
    }
    .unwrap_or_default();

    if !hwnd.is_invalid() {
        let _ = unsafe {
            SetLayeredWindowAttributes(
                hwnd,
                windows::Win32::Foundation::COLORREF(0),
                255,
                LWA_ALPHA,
            )
        };
        *lock = hwnd.0 as isize;
    }

    hwnd
}

fn lerp(a: i32, b: i32, t: f32) -> i32 {
    a + ((b - a) as f32 * t).round() as i32
}

pub fn play_window_transition(
    source_hwnd: HWND,
    is_restoring: bool,
    target_rect: Option<RECT>,
    config: &SystemAnimationsConfig,
) {
    if source_hwnd.0 == std::ptr::null_mut() {
        return;
    }

    let _guard = match OVERLAY_LOCK.lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };

    let mut rc_win = RECT::default();
    if unsafe { GetWindowRect(source_hwnd, &mut rc_win) }.is_err() {
        return;
    }
    if rc_win.left <= -10000 || rc_win.top <= -10000 {
        let mut wp = windows::Win32::UI::WindowsAndMessaging::WINDOWPLACEMENT {
            length: std::mem::size_of::<windows::Win32::UI::WindowsAndMessaging::WINDOWPLACEMENT>()
                as u32,
            ..Default::default()
        };
        if unsafe {
            windows::Win32::UI::WindowsAndMessaging::GetWindowPlacement(source_hwnd, &mut wp)
        }
        .is_ok()
        {
            rc_win = wp.rcNormalPosition;
        }
    }
    let win_w = rc_win.right - rc_win.left;
    let win_h = rc_win.bottom - rc_win.top;
    if win_w <= 20 || win_h <= 20 {
        return;
    }

    let screen_w = unsafe { GetSystemMetrics(SM_CXSCREEN) };
    let screen_h = unsafe { GetSystemMetrics(SM_CYSCREEN) };

    let rc_dock = target_rect.unwrap_or_else(|| {
        let mut pt = windows::Win32::Foundation::POINT::default();
        if unsafe { windows::Win32::UI::WindowsAndMessaging::GetCursorPos(&mut pt) }.is_ok()
            && pt.x > 0
            && pt.x < screen_w
            && pt.y > 0
            && pt.y < screen_h
        {
            RECT {
                left: (pt.x - 24).clamp(0, screen_w - 48),
                top: (pt.y - 24).clamp(0, screen_h - 48),
                right: (pt.x + 24).clamp(48, screen_w),
                bottom: (pt.y + 24).clamp(48, screen_h),
            }
        } else {
            let center_x = (rc_win.left + rc_win.right) / 2;
            let dock_y = screen_h - 48;
            RECT {
                left: (center_x - 24).clamp(0, screen_w - 48),
                top: dock_y,
                right: (center_x + 24).clamp(48, screen_w),
                bottom: dock_y + 48,
            }
        }
    });

    let (rc_from, rc_to) = if is_restoring {
        (rc_dock, rc_win)
    } else {
        (rc_win, rc_dock)
    };

    let overlay = get_or_create_overlay();
    if overlay.is_invalid() {
        return;
    }

    let Ok(thumb_id) = (unsafe { DwmRegisterThumbnail(overlay, source_hwnd) }) else {
        return;
    };

    let _ = unsafe { ShowWindow(overlay, SW_SHOWNOACTIVATE) };

    let duration_ms = config.window_duration.clamp(60, 1000);
    let total_frames = (duration_ms / 16).max(4);

    for frame in 0..=total_frames {
        let raw_t = frame as f32 / total_frames as f32;
        let p = match config.window_easing.as_str() {
            "spring" => {
                if raw_t >= 1.0 {
                    1.0
                } else {
                    1.0 - (-6.0 * raw_t).exp() * (2.0 * std::f32::consts::PI * (raw_t * 1.15)).cos()
                }
            }
            "snappy" => raw_t * (2.0 - raw_t),
            "linear" => raw_t,
            _ => 1.0 - (1.0 - raw_t).powi(3),
        };

        let mut curr_rect = RECT {
            left: lerp(rc_from.left, rc_to.left, p),
            top: lerp(rc_from.top, rc_to.top, p),
            right: lerp(rc_from.right, rc_to.right, p),
            bottom: lerp(rc_from.bottom, rc_to.bottom, p),
        };

        if config.window_effect == "genie" {
            let waist = ((raw_t * std::f32::consts::PI).sin() * 24.0) as i32;
            curr_rect.left += waist;
            curr_rect.right -= waist;
        }

        let alpha: u8 = if config.window_effect == "glide" || config.window_effect == "fade_pop" {
            if is_restoring {
                (raw_t * 255.0).clamp(0.0, 255.0) as u8
            } else {
                ((1.0 - raw_t) * 255.0).clamp(0.0, 255.0) as u8
            }
        } else {
            255
        };

        let props = DWM_THUMBNAIL_PROPERTIES {
            dwFlags: DWM_TNP_RECTDESTINATION | DWM_TNP_VISIBLE | DWM_TNP_OPACITY,
            rcDestination: curr_rect,
            fVisible: BOOL(1),
            opacity: alpha,
            ..Default::default()
        };
        let _ = unsafe { DwmUpdateThumbnailProperties(thumb_id, &props) };
        std::thread::sleep(std::time::Duration::from_millis(16));
    }

    let _ = unsafe { DwmUnregisterThumbnail(thumb_id) };
    let _ = unsafe { ShowWindow(overlay, SW_HIDE) };
}

unsafe extern "system" fn win_event_hook_proc(
    _hook: HWINEVENTHOOK,
    event: u32,
    hwnd: HWND,
    id_object: i32,
    id_child: i32,
    _id_event_thread: u32,
    _dwms_event_time: u32,
) {
    if id_object != 0 || id_child != 0 || hwnd.0 == std::ptr::null_mut() {
        return;
    }
    let root = windows::Win32::UI::WindowsAndMessaging::GetAncestor(
        hwnd,
        windows::Win32::UI::WindowsAndMessaging::GA_ROOT,
    );
    if root != hwnd {
        return;
    }
    let overlay_raw = *overlay_mutex().lock().unwrap_or_else(|p| p.into_inner());
    if overlay_raw != 0 && hwnd.0 as isize == overlay_raw {
        return;
    }

    let Some(app) = APP_HANDLE.get() else {
        return;
    };
    let Ok(state) = app.try_state::<AnimationsState>().ok_or(()) else {
        return;
    };
    let Ok(config) = state.0.lock() else {
        return;
    };
    if !config.enabled || !config.window_transitions {
        return;
    }
    let is_restoring = event == 0x0017;
    let is_minimizing = event == 0x0016;

    if !is_minimizing && !is_restoring {
        return;
    }

    let raw_hwnd = hwnd.0 as isize;
    let now = std::time::Instant::now();

    {
        let mut lock = match ANIMATING_WINDOWS.lock() {
            Ok(l) => l,
            Err(p) => p.into_inner(),
        };
        let map = lock.get_or_insert_with(std::collections::HashMap::new);
        map.retain(|_, time| time.elapsed().as_millis() < 2000);
        if let Some(prev) = map.get(&raw_hwnd) {
            if prev.elapsed().as_millis() < 600 {
                return;
            }
        }
        map.insert(raw_hwnd, now);
    }

    let target_hint = take_dock_icon_hint(hwnd);
    let cfg = config.clone();

    std::thread::spawn(move || {
        play_window_transition(
            HWND(raw_hwnd as *mut std::ffi::c_void),
            is_restoring,
            target_hint,
            &cfg,
        );
    });
}

pub fn start(app: &tauri::AppHandle) {
    let _ = APP_HANDLE.set(app.clone());
    std::thread::spawn(move || {
        let hook =
            unsafe { SetWinEventHook(0x0016, 0x0017, None, Some(win_event_hook_proc), 0, 0, 0) };
        let mut msg = MSG::default();
        while unsafe { GetMessageW(&mut msg, None, 0, 0) }.as_bool() {
            let _ = unsafe { TranslateMessage(&msg) };
            unsafe { DispatchMessageW(&msg) };
        }
        if hook.0 != std::ptr::null_mut() {
            let _ = unsafe { UnhookWinEvent(hook) };
        }
    });
}

fn path() -> PathBuf {
    super::settings_path()
        .unwrap_or_else(|| std::env::temp_dir().join("Atelier/settings.json"))
        .with_file_name("animations.json")
}

impl AnimationsState {
    pub fn new() -> Self {
        let mut config: SystemAnimationsConfig = std::fs::read(path())
            .ok()
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default();
        config.normalize();
        let native = if config.enabled && config.window_transitions {
            config.native_min_max_animation
        } else {
            true
        };
        let _ = apply_native_animation(native);
        Self(Mutex::new(config))
    }
}

pub fn get_native_min_max_animation() -> Result<bool, String> {
    let mut info = ANIMATIONINFO {
        cbSize: std::mem::size_of::<ANIMATIONINFO>() as u32,
        iMinAnimate: 0,
    };
    unsafe {
        SystemParametersInfoW(
            SPI_GETANIMATION,
            info.cbSize,
            Some((&mut info as *mut ANIMATIONINFO).cast()),
            Default::default(),
        )
    }
    .map_err(|e| e.to_string())?;
    Ok(info.iMinAnimate != 0)
}

pub fn apply_native_animation(enabled: bool) -> Result<bool, String> {
    let mut info = ANIMATIONINFO {
        cbSize: std::mem::size_of::<ANIMATIONINFO>() as u32,
        iMinAnimate: i32::from(enabled),
    };
    unsafe {
        SystemParametersInfoW(
            SPI_SETANIMATION,
            info.cbSize,
            Some((&mut info as *mut ANIMATIONINFO).cast()),
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
        )
    }
    .map_err(|e| e.to_string())?;
    get_native_min_max_animation()
}

#[tauri::command]
pub fn get_window_animation() -> Result<bool, String> {
    get_native_min_max_animation()
}

#[tauri::command]
pub fn set_window_animation(enabled: bool) -> Result<bool, String> {
    apply_native_animation(enabled)
}

#[tauri::command]
pub fn get_animations_config(
    state: tauri::State<'_, AnimationsState>,
) -> Result<SystemAnimationsConfig, String> {
    state.0.lock().map_err(|e| e.to_string()).map(|c| c.clone())
}

#[tauri::command]
pub async fn set_animations_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, AnimationsState>,
    mut config: SystemAnimationsConfig,
) -> Result<SystemAnimationsConfig, String> {
    config.normalize();
    let native = if config.enabled && config.window_transitions {
        config.native_min_max_animation
    } else {
        true
    };
    let _ = apply_native_animation(native);
    let p = path();
    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let data = serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(p, data).map_err(|e| e.to_string())?;
    *state.0.lock().map_err(|e| e.to_string())? = config.clone();
    let _ = app.emit("animations-config-changed", &config);
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_normalization_clamp_bounds() {
        let mut c = SystemAnimationsConfig {
            window_duration: 9999,
            dock_bounce_count: 99,
            dock_hover_scale: 500,
            window_effect: "invalid".into(),
            window_easing: "invalid".into(),
            dock_bounce: "invalid".into(),
            dock_click_feedback: "invalid".into(),
            ..Default::default()
        };
        c.normalize();
        assert_eq!(c.window_duration, 1000);
        assert_eq!(c.dock_bounce_count, 5);
        assert_eq!(c.dock_hover_scale, 180);
        assert_eq!(c.window_effect, "dock_expand");
        assert_eq!(c.window_easing, "spring");
        assert_eq!(c.dock_bounce, "launch_only");
        assert_eq!(c.dock_click_feedback, "bounce");
    }

    #[test]
    fn lower_bounds_are_clamped() {
        let mut c = SystemAnimationsConfig {
            window_duration: 1,
            dock_bounce_count: 0,
            dock_hover_scale: 10,
            ..Default::default()
        };
        c.normalize();
        assert_eq!(c.window_duration, 50);
        assert_eq!(c.dock_bounce_count, 1);
        assert_eq!(c.dock_hover_scale, 100);
    }
}

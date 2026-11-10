use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Mutex,
};
use tauri::{Emitter, Manager};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct IslandModule {
    pub kind: String,
    #[serde(default)]
    pub style: String,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub detail: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub tint: Option<String>,
    #[serde(default)]
    pub show_progress: Option<bool>,
    #[serde(default)]
    pub show_controls: Option<bool>,
    #[serde(default)]
    pub show_volume: Option<bool>,
    #[serde(default)]
    pub show_lyrics: Option<bool>,
    #[serde(default)]
    pub show_artwork: Option<bool>,
    #[serde(default)]
    pub artwork_layout: Option<String>,
    #[serde(default)]
    pub show_artist: Option<bool>,
    #[serde(default)]
    pub show_times: Option<bool>,
    #[serde(default)]
    pub show_secondary: Option<bool>,
    #[serde(default)]
    pub show_calendar_grid: Option<bool>,
}
impl Default for IslandModule {
    fn default() -> Self {
        Self {
            kind: String::new(),
            style: String::new(),
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            label: None,
            detail: None,
            icon: None,
            tint: None,
            show_progress: None,
            show_controls: None,
            show_volume: None,
            show_lyrics: None,
            show_artwork: None,
            artwork_layout: None,
            show_artist: None,
            show_times: None,
            show_secondary: None,
            show_calendar_grid: None,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct IslandPage {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub style: String,
    pub layout: Vec<IslandModule>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct IslandConfig {
    enabled: bool,
    monitor: usize,
    offset: u32,
    width: u32,
    radius: u32,
    opacity: u32,
    color: String,
    open_on_hover: bool,
    animation_duration: u32,
    show_media: bool,
    show_calendar: bool,
    show_battery: bool,
    hide_fullscreen: bool,
    horizontal_offset: i32,
    auto_close: bool,
    close_delay: u32,
    hide_maximized: bool,
    shape: String,
    compact_content: String,
    compact_indicator: bool,
    show_clock: bool,
    show_system: bool,
    module_order: String,
    info_first: String,
    compact_width: u32,
    compact_height: u32,
    expanded_height: u32,
    compact_align: String,
    indicator_position: String,
    artwork_size: u32,
    text_size: u32,
    text_color: String,
    border_color: String,
    border_width: u32,
    audio_reactive: bool,
    audio_color: String,
    audio_strength: u32,
    show_disk: bool,
    show_network: bool,
    info_order: Vec<String>,
    layout: Option<Vec<IslandModule>>,
    pages: Option<Vec<IslandPage>>,
    tab_style: String,
    tab_position: String,
    weather_city: String,
    weather_fahrenheit: bool,
    note_text: String,
    countdown_title: String,
    countdown_date: String,
}
impl Default for IslandConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            monitor: 0,
            offset: 0,
            width: 520,
            radius: 24,
            opacity: 96,
            color: "#08090c".into(),
            open_on_hover: false,
            animation_duration: 80,
            show_media: true,
            show_calendar: true,
            show_battery: true,
            hide_fullscreen: true,
            horizontal_offset: 0,
            auto_close: true,
            close_delay: 700,
            hide_maximized: true,
            shape: "rounded".into(),
            compact_content: "music".into(),
            compact_indicator: true,
            show_clock: false,
            show_system: false,
            module_order: "media-first".into(),
            info_first: "calendar".into(),
            compact_width: 230,
            compact_height: 46,
            expanded_height: 220,
            compact_align: "left".into(),
            indicator_position: "right".into(),
            artwork_size: 30,
            text_size: 12,
            text_color: "#f8f8fa".into(),
            border_color: "#ffffff".into(),
            border_width: 0,
            audio_reactive: false,
            audio_color: "#8b5cf6".into(),
            audio_strength: 50,
            show_disk: false,
            show_network: false,
            info_order: vec![],
            layout: None,
            pages: None,
            tab_style: "buttons".into(),
            tab_position: "top".into(),
            weather_city: String::new(),
            weather_fahrenheit: false,
            note_text: String::new(),
            countdown_title: String::new(),
            countdown_date: String::new(),
        }
    }
}
impl IslandConfig {
    fn normalize(&mut self) {
        self.horizontal_offset = self.horizontal_offset.clamp(-2000, 2000);
        self.close_delay = self.close_delay.clamp(0, 5000);
        self.animation_duration = self.animation_duration.min(1000);
        self.offset = self.offset.min(200);
        self.width = self.width.clamp(380, 800);
        self.radius = self.radius.clamp(8, 48);
        self.opacity = self.opacity.clamp(50, 100);
        if !["rounded", "pill", "notch", "square"].contains(&self.shape.as_str()) {
            self.shape = "rounded".into();
        }
        if !["music", "clock", "music-clock", "date"].contains(&self.compact_content.as_str()) {
            self.compact_content = "music".into();
        }
        if !["media-first", "info-first"].contains(&self.module_order.as_str()) {
            self.module_order = "media-first".into();
        }
        if !["calendar", "clock", "battery", "system"].contains(&self.info_first.as_str()) {
            self.info_first = "calendar".into();
        }
        self.compact_width = self.compact_width.clamp(80, 500);
        self.compact_height = self.compact_height.clamp(28, 100);
        self.expanded_height = self.expanded_height.clamp(200, 500);
        self.artwork_size = self.artwork_size.clamp(12, 80);
        self.text_size = self.text_size.clamp(9, 24);
        self.border_width = self.border_width.min(5);
        self.audio_strength = self.audio_strength.min(100);
        if !["left", "center", "right"].contains(&self.compact_align.as_str()) {
            self.compact_align = "left".into();
        }
        if !["left", "right"].contains(&self.indicator_position.as_str()) {
            self.indicator_position = "right".into();
        }
        let allowed = ["calendar", "clock", "battery", "system", "disk", "network"];
        self.info_order.retain(|v| allowed.contains(&v.as_str()));
        let mut seen = std::collections::HashSet::new();
        self.info_order.retain(|v| seen.insert(v.clone()));
        if self.info_order.is_empty() {
            self.info_order.push(self.info_first.clone());
        }
        for item in allowed {
            if !self.info_order.iter().any(|v| v == item) {
                self.info_order.push(item.into());
            }
        }
        if self.layout.is_none() {
            let mut layout = Vec::new();
            let info: Vec<&str> = self
                .info_order
                .iter()
                .filter_map(|kind| {
                    let enabled = match kind.as_str() {
                        "calendar" => self.show_calendar,
                        "clock" => self.show_clock,
                        "battery" => self.show_battery,
                        "system" => self.show_system,
                        "disk" => self.show_disk,
                        "network" => self.show_network,
                        _ => false,
                    };
                    enabled.then_some(kind.as_str())
                })
                .collect();
            let media_width = if info.is_empty() { 12 } else { 7 };
            let info_x = if self.show_media && self.module_order == "media-first" {
                7
            } else {
                0
            };
            if self.show_media {
                layout.push(IslandModule {
                    kind: "media".into(),
                    style: String::new(),
                    x: if self.module_order == "info-first" && !info.is_empty() {
                        5
                    } else {
                        0
                    },
                    y: 0,
                    w: media_width,
                    h: 12,
                    ..Default::default()
                });
            }
            if !info.is_empty() {
                let info_w = if self.show_media { 5 } else { 12 };
                let n = info.len() as u32;
                for (i, kind) in info.iter().enumerate() {
                    let y = i as u32 * 12 / n;
                    let bottom = (i as u32 + 1) * 12 / n;
                    layout.push(IslandModule {
                        kind: (*kind).into(),
                        style: String::new(),
                        x: info_x,
                        y,
                        w: info_w,
                        h: bottom - y,
                        ..Default::default()
                    });
                }
            }
            self.layout = Some(layout);
        }
        self.weather_city = self.weather_city.trim().chars().take(120).collect();
        self.note_text = self.note_text.chars().take(1000).collect();
        self.countdown_title = self.countdown_title.chars().take(120).collect();
        if self.countdown_date.len() != 10
            || !self.countdown_date.bytes().enumerate().all(|(i, b)| {
                if i == 4 || i == 7 {
                    b == b'-'
                } else {
                    b.is_ascii_digit()
                }
            })
        {
            self.countdown_date.clear();
        }
        if let Some(layout) = &mut self.layout {
            let mut kinds = std::collections::HashSet::new();
            layout.retain(|item| {
                [
                    "media",
                    "audio",
                    "calendar",
                    "clock",
                    "battery",
                    "system",
                    "disk",
                    "network",
                    "memory",
                    "gpu",
                    "uptime",
                    "cpu_frequency",
                    "date",
                    "weather",
                    "note",
                    "countdown",
                ]
                .contains(&item.kind.as_str())
                    && kinds.insert(item.kind.clone())
            });
            for item in layout {
                item.w = item.w.clamp(1, 12);
                item.h = item.h.clamp(1, 12);
                item.x = item.x.min(12 - item.w);
                item.y = item.y.min(12 - item.h);
            }
        }
        if !["buttons", "dots", "none"].contains(&self.tab_style.as_str()) {
            self.tab_style = "buttons".into();
        }
        if !["top", "bottom", "left", "right"].contains(&self.tab_position.as_str()) {
            self.tab_position = "top".into();
        }
        if self.pages.is_none() {
            let layout = self
                .layout
                .as_deref()
                .unwrap_or_default()
                .iter()
                .map(|item| {
                    let convert = |value: u32| ((value * 100 + 6) / 12).min(100);
                    let x = convert(item.x);
                    let y = convert(item.y);
                    IslandModule {
                        kind: item.kind.clone(),
                        style: item.style.clone(),
                        x,
                        y,
                        w: convert(item.x + item.w).saturating_sub(x).max(1),
                        h: convert(item.y + item.h).saturating_sub(y).max(1),
                        label: item.label.clone(),
                        detail: item.detail.clone(),
                        icon: item.icon.clone(),
                        tint: item.tint.clone(),
                        show_progress: item.show_progress,
                        show_controls: item.show_controls,
                        show_volume: item.show_volume,
                        show_lyrics: item.show_lyrics,
                        show_artwork: item.show_artwork,
                        artwork_layout: item.artwork_layout.clone(),
                        show_artist: item.show_artist,
                        show_times: item.show_times,
                        show_secondary: item.show_secondary,
                        show_calendar_grid: item.show_calendar_grid,
                    }
                })
                .collect();
            self.pages = Some(vec![IslandPage {
                id: "page-1".into(),
                name: "Home".into(),
                icon: None,
                style: String::new(),
                layout,
            }]);
        }
        if let Some(pages) = &mut self.pages {
            pages.truncate(6);
            if pages.is_empty() {
                pages.push(IslandPage {
                    id: "page-1".into(),
                    name: "Home".into(),
                    icon: None,
                    style: String::new(),
                    layout: vec![],
                });
            }
            let mut page_ids = std::collections::HashSet::new();
            for (index, page) in pages.iter_mut().enumerate() {
                if page.id.is_empty()
                    || page.id.len() > 40
                    || !page
                        .id
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
                    || !page_ids.insert(page.id.clone())
                {
                    let mut suffix = index + 1;
                    loop {
                        let candidate = format!("page-{suffix}");
                        if page_ids.insert(candidate.clone()) {
                            page.id = candidate;
                            break;
                        }
                        suffix += 1;
                    }
                }
                page.name = page.name.trim().chars().take(24).collect();
                if page.name.is_empty() {
                    page.name = format!("Page {}", index + 1);
                }
                if !["default", "outline", "filled"].contains(&page.style.as_str()) {
                    page.style = "default".into();
                }
                let mut kinds = std::collections::HashSet::new();
                page.layout.retain(|item| {
                    [
                        "media",
                        "audio",
                        "calendar",
                        "clock",
                        "battery",
                        "system",
                        "disk",
                        "network",
                        "memory",
                        "gpu",
                        "uptime",
                        "cpu_frequency",
                        "date",
                        "weather",
                        "note",
                        "countdown",
                    ]
                    .contains(&item.kind.as_str())
                        && kinds.insert(item.kind.clone())
                });
                for item in &mut page.layout {
                    if item
                        .artwork_layout
                        .as_deref()
                        .is_some_and(|v| !["small", "medium", "large"].contains(&v))
                    {
                        item.artwork_layout = None;
                    }
                    if !["glass", "soft", "clear"].contains(&item.style.as_str()) {
                        item.style = "glass".into();
                    }
                    item.w = item.w.clamp(1, 100);
                    item.h = item.h.clamp(1, 100);
                    item.x = item.x.min(100 - item.w);
                    item.y = item.y.min(100 - item.h);
                }
            }
        }
        for color in [
            &mut self.text_color,
            &mut self.border_color,
            &mut self.audio_color,
        ] {
            if color.len() != 7
                || !color.starts_with('#')
                || !color.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)
            {
                *color = "#ffffff".into();
            }
        }
        if self.color.len() != 7
            || !self.color.starts_with('#')
            || !self.color.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)
        {
            self.color = "#08090c".into();
        }
    }
}
pub struct IslandState(
    Mutex<IslandConfig>,
    AtomicU64,
    AtomicBool,
    Mutex<()>,
    AtomicBool,
);
impl IslandState {
    pub fn audio_effects_enabled(&self) -> bool {
        self.0
            .lock()
            .map(|c| c.enabled && c.audio_reactive)
            .unwrap_or(false)
    }
}
fn path() -> std::path::PathBuf {
    super::settings_path()
        .unwrap_or_else(|| std::env::temp_dir().join("Atelier/settings.json"))
        .with_file_name("island.json")
}
impl IslandState {
    pub fn new() -> Self {
        let mut c: IslandConfig = std::fs::read(path())
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .unwrap_or_default();
        c.normalize();
        Self(
            Mutex::new(c),
            AtomicU64::new(0),
            AtomicBool::new(false),
            Mutex::new(()),
            AtomicBool::new(false),
        )
    }
}
fn notch_shoulder(c: &IslandConfig) -> u32 {
    if c.shape == "notch" {
        c.radius.min(c.compact_height / 2)
    } else {
        0
    }
}
fn place_size(
    app: &tauri::AppHandle,
    c: &IslandConfig,
    width: u32,
    height: u32,
) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};

    let w = app
        .get_webview_window("dynamic-island")
        .ok_or("Island window unavailable")?;
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let m = monitors
        .get(c.monitor)
        .or_else(|| monitors.first())
        .ok_or("No monitor available")?;
    let scale = m.scale_factor();
    let window_width = width + 2 * notch_shoulder(c);
    let pw = (window_width as f64 * scale).round() as i32;
    let ph = (height as f64 * scale).round() as i32;
    let available = (m.size().width as i32 - pw).max(0);
    let offset = (c.horizontal_offset as f64 * scale).round() as i32;
    let x = m.position().x + (available / 2 + offset).clamp(0, available);
    let y = m.position().y
        + (if c.shape == "notch" {
            0
        } else {
            (c.offset as f64 * scale).round() as i32
        });
    let hwnd = w.hwnd().map_err(|e| e.to_string())?;
    unsafe {
        let _ = SetWindowPos(
            HWND(hwnd.0 as _),
            HWND::default(),
            x,
            y,
            pw,
            ph,
            SWP_NOACTIVATE | SWP_NOZORDER,
        );
    }
    Ok(())
}
fn place(app: &tauri::AppHandle, c: &IslandConfig, expanded: bool) -> Result<(), String> {
    place_size(
        app,
        c,
        if expanded { c.width } else { c.compact_width },
        if expanded {
            c.expanded_height
        } else {
            c.compact_height
        },
    )
}
fn covers_monitor(rect: (i32, i32, i32, i32), origin: (i32, i32), size: (u32, u32)) -> bool {
    let tolerance = 10;
    rect.0 <= origin.0 + tolerance
        && rect.1 <= origin.1 + tolerance
        && rect.2 >= origin.0.saturating_add(size.0 as i32) - tolerance
        && rect.3 >= origin.1.saturating_add(size.1 as i32) - tolerance
}
fn should_hide_for_window(
    hide_fullscreen: bool,
    hide_maximized: bool,
    is_fullscreen: bool,
    is_maximized: bool,
) -> bool {
    (hide_fullscreen && (is_fullscreen || is_maximized)) || (hide_maximized && is_maximized)
}
fn covers_work_area(rect: (i32, i32, i32, i32), work: (i32, i32, i32, i32)) -> bool {
    rect.0 <= work.0 + 10 && rect.1 <= work.1 + 10 && rect.2 >= work.2 - 10 && rect.3 >= work.3 - 10
}
fn hide_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_HIDE};
    let raw = window.hwnd().map_err(|e| e.to_string())?;
    unsafe {
        let _ = ShowWindow(HWND(raw.0 as _), SW_HIDE);
    }
    Ok(())
}
fn show_without_activation(window: &tauri::WebviewWindow) -> Result<(), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{ShowWindow, SW_SHOWNOACTIVATE};
    let raw = window.hwnd().map_err(|e| e.to_string())?;
    unsafe {
        let _ = ShowWindow(HWND(raw.0 as _), SW_SHOWNOACTIVATE);
    }
    Ok(())
}
fn covered_by_foreground(app: &tauri::AppHandle, c: &IslandConfig) -> bool {
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_CLOAKED};
    use windows::Win32::Graphics::Gdi::{
        ClientToScreen, GetMonitorInfoW, MonitorFromPoint, MonitorFromWindow, MONITORINFO,
        MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetClientRect, GetForegroundWindow, GetTopWindow, GetWindow, GetWindowLongW,
        GetWindowRect, GetWindowThreadProcessId, IsIconic, IsWindowVisible, IsZoomed, GWL_EXSTYLE,
        GW_HWNDNEXT, WS_EX_TOOLWINDOW,
    };

    if !c.hide_fullscreen && !c.hide_maximized {
        return false;
    }

    if c.hide_fullscreen && atelier_wallpaper::occlusion::is_fullscreen_game_or_presentation() {
        return true;
    }

    if c.hide_fullscreen && super::desktop_dock::fullscreen_on_monitor(app, c.monitor) {
        return true;
    }

    let Ok(monitors) = app.available_monitors() else {
        return false;
    };
    let Some(m) = monitors.get(c.monitor).or_else(|| monitors.first()) else {
        return false;
    };
    let p = m.position();
    let size = m.size();
    let target = unsafe {
        MonitorFromPoint(
            POINT {
                x: p.x.saturating_add((size.width / 2) as i32),
                y: p.y.saturating_add((size.height / 2) as i32),
            },
            MONITOR_DEFAULTTONEAREST,
        )
    };

    let mut mi = MONITORINFO {
        cbSize: std::mem::size_of::<MONITORINFO>() as u32,
        ..Default::default()
    };
    let has_mi = unsafe { GetMonitorInfoW(target, &mut mi) }.as_bool();
    let (mon_origin, mon_size) = if has_mi {
        (
            (mi.rcMonitor.left, mi.rcMonitor.top),
            (
                (mi.rcMonitor.right - mi.rcMonitor.left).max(0) as u32,
                (mi.rcMonitor.bottom - mi.rcMonitor.top).max(0) as u32,
            ),
        )
    } else {
        ((p.x, p.y), (size.width, size.height))
    };

    let main = app
        .get_webview_window("main")
        .and_then(|w| w.hwnd().ok())
        .map(|h| h.0 as isize);
    let island_hwnd = app
        .get_webview_window("dynamic-island")
        .and_then(|w| w.hwnd().ok())
        .map(|h| h.0 as isize);

    let check_window = |candidate: HWND| -> (bool, bool) {
        if candidate.0.is_null() {
            return (false, false);
        }
        let raw = candidate.0 as isize;
        if Some(raw) == island_hwnd {
            return (false, false);
        }
        let mut pid = 0;
        unsafe {
            GetWindowThreadProcessId(candidate, Some(&mut pid));
        }
        if pid == 0 || (pid == std::process::id() && main != Some(raw)) {
            return (false, false);
        }
        let mut cloaked = 0u32;
        let _ = unsafe {
            DwmGetWindowAttribute(
                candidate,
                DWMWA_CLOAKED,
                (&mut cloaked as *mut u32).cast(),
                std::mem::size_of::<u32>() as u32,
            )
        };
        if cloaked != 0
            || !unsafe { IsWindowVisible(candidate) }.as_bool()
            || unsafe { IsIconic(candidate) }.as_bool()
        {
            return (false, false);
        }
        let mut class = [0u16; 64];
        let len = unsafe { GetClassNameW(candidate, &mut class) }.max(0) as usize;
        let class_str = String::from_utf16_lossy(&class[..len]);
        if [
            "Progman",
            "WorkerW",
            "Shell_TrayWnd",
            "Shell_SecondaryTrayWnd",
        ]
        .contains(&class_str.as_str())
        {
            return (false, false);
        }
        let tool =
            unsafe { GetWindowLongW(candidate, GWL_EXSTYLE) } & WS_EX_TOOLWINDOW.0 as i32 != 0;
        if tool {
            return (false, false);
        }
        if unsafe { MonitorFromWindow(candidate, MONITOR_DEFAULTTONEAREST) } != target {
            return (false, false);
        }

        let mut is_max = unsafe { IsZoomed(candidate) }.as_bool();

        let mut is_full = false;
        let mut rect = RECT::default();
        if unsafe { GetWindowRect(candidate, &mut rect) }.is_ok() {
            let bounds = (rect.left, rect.top, rect.right, rect.bottom);
            is_full = covers_monitor(bounds, mon_origin, mon_size);
            if has_mi {
                let work = mi.rcWork;
                is_max |= covers_work_area(bounds, (work.left, work.top, work.right, work.bottom));
            }
        }
        if !is_full && unsafe { GetClientRect(candidate, &mut rect) }.is_ok() {
            let mut origin = POINT::default();
            if unsafe { ClientToScreen(candidate, &mut origin) }.as_bool() {
                rect.right += origin.x;
                rect.bottom += origin.y;
                rect.left = origin.x;
                rect.top = origin.y;
                if covers_monitor(
                    (rect.left, rect.top, rect.right, rect.bottom),
                    mon_origin,
                    mon_size,
                ) {
                    is_full = true;
                }
            }
        }
        (is_max, is_full)
    };

    let foreground = unsafe { GetForegroundWindow() };
    if !foreground.0.is_null() {
        let (is_max, is_full) = check_window(foreground);
        if should_hide_for_window(c.hide_fullscreen, c.hide_maximized, is_full, is_max) {
            return true;
        }
    }

    let Ok(mut candidate) = (unsafe { GetTopWindow(HWND::default()) }) else {
        return false;
    };
    for _ in 0..1024 {
        let (is_max, is_full) = check_window(candidate);
        if should_hide_for_window(c.hide_fullscreen, c.hide_maximized, is_full, is_max) {
            return true;
        }
        let Ok(next) = (unsafe { GetWindow(candidate, GW_HWNDNEXT) }) else {
            break;
        };
        candidate = next;
    }
    false
}

fn apply(app: &tauri::AppHandle, c: &IslandConfig) -> Result<(), String> {
    if !c.enabled {
        app.state::<IslandState>().4.store(true, Ordering::SeqCst);
        app.state::<IslandState>().1.fetch_add(1, Ordering::SeqCst);
        app.state::<IslandState>().2.store(false, Ordering::SeqCst);
        let _ = app.emit_to("dynamic-island", "island-reset", ());
        if let Some(w) = app.get_webview_window("dynamic-island") {
            hide_window(&w)?;
        }
        return Ok(());
    }
    if app.get_webview_window("dynamic-island").is_none() {
        tauri::WebviewWindowBuilder::new(
            app,
            "dynamic-island",
            tauri::WebviewUrl::App("island.html".into()),
        )
        .title("Atelier Dynamic Island")
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .skip_taskbar(true)
        .resizable(false)
        .always_on_top(true)
        .focused(false)
        .visible(false)
        .inner_size(230.0, 46.0)
        .build()
        .map_err(|e| e.to_string())?;
    }
    {
        let state = app.state::<IslandState>();
        let _geometry = state.3.lock().map_err(|e| e.to_string())?;
        place(app, c, state.2.load(Ordering::SeqCst))?;
    }
    let _ = app.emit_to("dynamic-island", "island-config", c);
    let window = app
        .get_webview_window("dynamic-island")
        .ok_or("Island window unavailable")?;
    if covered_by_foreground(app, c) {
        let state = app.state::<IslandState>();
        let _geometry = state.3.lock().map_err(|e| e.to_string())?;
        state.4.store(true, Ordering::SeqCst);
        state.1.fetch_add(1, Ordering::SeqCst);
        state.2.store(false, Ordering::SeqCst);
        hide_window(&window)?;
        let _ = app.emit_to("dynamic-island", "island-reset", ());
    } else if !window.is_visible().unwrap_or(false) {
        app.state::<IslandState>().4.store(false, Ordering::SeqCst);
        show_without_activation(&window)?;
    } else {
        app.state::<IslandState>().4.store(false, Ordering::SeqCst);
    }
    Ok(())
}
pub fn start(app: &tauri::AppHandle) -> Result<(), String> {
    let c = app
        .state::<IslandState>()
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    apply(app, &c)?;
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            let c = match app.state::<IslandState>().0.lock() {
                Ok(c) => c.clone(),
                Err(_) => continue,
            };
            if !c.enabled {
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                continue;
            }
            if let Some(w) = app.get_webview_window("dynamic-island") {
                let hide = covered_by_foreground(&app, &c);
                let visible = w.is_visible().unwrap_or(false);
                let state = app.state::<IslandState>();
                if let Ok(_geometry) = state.3.lock() {
                    if hide {
                        let was_hidden = state.4.swap(true, Ordering::SeqCst);
                        if !was_hidden || visible {
                            state.1.fetch_add(1, Ordering::SeqCst);
                            state.2.store(false, Ordering::SeqCst);
                            let _ = hide_window(&w);
                            let _ = app.emit_to("dynamic-island", "island-reset", ());
                        }
                    } else {
                        let was_hidden = state.4.swap(false, Ordering::SeqCst);
                        if was_hidden || !visible {
                            state.1.fetch_add(1, Ordering::SeqCst);
                            state.2.store(false, Ordering::SeqCst);
                            let _ = place(&app, &c, false);
                            let _ = app.emit_to("dynamic-island", "island-reset", ());
                            let _ = app.emit_to("dynamic-island", "island-config", &c);
                            let _ = show_without_activation(&w);
                        }
                    }
                };
            }
        }
    });
    Ok(())
}
#[tauri::command]
pub fn get_island(state: tauri::State<IslandState>) -> Result<IslandConfig, String> {
    Ok(state.0.lock().map_err(|e| e.to_string())?.clone())
}
#[tauri::command]
pub fn island_monitors(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    Ok(app
        .available_monitors()
        .map_err(|e| e.to_string())?
        .iter()
        .enumerate()
        .map(|(i, _)| format!("Display {}", i + 1))
        .collect())
}

#[tauri::command]
pub async fn island_lyrics(
    window: tauri::Window,
    title: String,
    artist: String,
    album: Option<String>,
    duration: Option<f64>,
) -> Result<serde_json::Value, String> {
    if !["main", "dynamic-island"].contains(&window.label()) {
        return Err("Not an island window".into());
    }
    let title = title.trim();
    let artist = artist.trim();
    if title.is_empty() || artist.is_empty() || title.len() > 512 || artist.len() > 512 {
        return Err("Track title and artist are required".into());
    }
    let mut url = url::Url::parse("https://lrclib.net/api/get").map_err(|e| e.to_string())?;
    {
        let mut query = url.query_pairs_mut();
        query
            .append_pair("track_name", title)
            .append_pair("artist_name", artist);
        if let Some(album) = album
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty() && v.len() <= 512)
        {
            query.append_pair("album_name", album);
        }
        if let Some(seconds) = duration.filter(|v| v.is_finite() && *v >= 1.0 && *v <= 3600.0) {
            query.append_pair("duration", &format!("{seconds:.0}"));
        }
    }
    tauri::async_runtime::spawn_blocking(move || {
        let response = super::widget_auth::request("public_feed", url.as_str(), None, true)?
            .and_then(|v| v.as_str().map(str::to_owned))
            .ok_or("Lyrics unavailable")?;
        let record: serde_json::Value =
            serde_json::from_str(&response).map_err(|_| "Invalid lyrics response")?;
        Ok(serde_json::json!({
            "plain": record.get("plainLyrics").and_then(|v| v.as_str()),
            "synced": record.get("syncedLyrics").and_then(|v| v.as_str()),
            "instrumental": record.get("instrumental").and_then(|v| v.as_bool()).unwrap_or(false)
        }))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn island_update_note(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, IslandState>,
    text: String,
) -> Result<(), String> {
    if window.label() != "dynamic-island" {
        return Err("Not the island window".into());
    }
    let mut config = state.0.lock().map_err(|e| e.to_string())?;
    config.note_text = text.chars().take(1000).collect();
    let target = path();
    std::fs::create_dir_all(target.parent().ok_or("Invalid settings path")?)
        .map_err(|e| e.to_string())?;
    std::fs::write(
        target,
        serde_json::to_vec_pretty(&*config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let _ = app.emit("island-note", &config.note_text);
    Ok(())
}

#[tauri::command]
pub async fn set_island(
    app: tauri::AppHandle,
    state: tauri::State<'_, IslandState>,
    mut config: IslandConfig,
) -> Result<IslandConfig, String> {
    config.normalize();
    state.1.fetch_add(1, Ordering::SeqCst);
    let mut current = state.0.lock().map_err(|e| e.to_string())?;
    let p = path();
    std::fs::create_dir_all(p.parent().ok_or("Invalid settings path")?)
        .map_err(|e| e.to_string())?;
    std::fs::write(
        p,
        serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    *current = config.clone();
    drop(current);
    apply(&app, &config)?;
    Ok(config)
}
#[tauri::command]
pub fn island_pointer_inside(window: tauri::Window) -> Result<bool, String> {
    use windows::Win32::Foundation::{HWND, POINT, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetWindowRect};
    if window.label() != "dynamic-island" {
        return Err("Not the island window".into());
    }
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    let mut point = POINT::default();
    let mut rect = RECT::default();
    unsafe {
        GetCursorPos(&mut point).map_err(|e| e.to_string())?;
        GetWindowRect(HWND(hwnd.0 as _), &mut rect).map_err(|e| e.to_string())?;
    }
    let pad = 2;
    Ok(point.x >= rect.left - pad
        && point.x < rect.right + pad
        && point.y >= rect.top - pad
        && point.y < rect.bottom + pad)
}

#[tauri::command]
pub async fn island_expand(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, IslandState>,
    expanded: bool,
) -> Result<(), String> {
    if window.label() != "dynamic-island" {
        return Err("Not the island window".into());
    }
    let c = state.0.lock().map_err(|e| e.to_string())?.clone();
    let island = app
        .get_webview_window("dynamic-island")
        .ok_or("Island window unavailable")?;
    let hwnd = island.hwnd().map_err(|e| e.to_string())?;

    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let scale = monitors
        .get(c.monitor)
        .or_else(|| monitors.first())
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);

    let (generation, start_width, start_height) = {
        let _geometry = state.3.lock().map_err(|e| e.to_string())?;
        if state.4.load(Ordering::SeqCst) || !c.enabled {
            return Ok(());
        }
        state.2.store(expanded, Ordering::SeqCst);
        let generation = state.1.fetch_add(1, Ordering::SeqCst) + 1;

        let mut rect = windows::Win32::Foundation::RECT::default();
        let ok = unsafe {
            windows::Win32::UI::WindowsAndMessaging::GetWindowRect(
                windows::Win32::Foundation::HWND(hwnd.0 as _),
                &mut rect,
            )
        };
        let (current_w, current_h) =
            if ok.is_ok() && rect.right > rect.left && rect.bottom > rect.top {
                (
                    ((rect.right - rect.left) as f64 / scale).round() as u32,
                    ((rect.bottom - rect.top) as f64 / scale).round() as u32,
                )
            } else {
                let inner = island.inner_size().map_err(|e| e.to_string())?;
                (
                    (inner.width as f64 / scale).round() as u32,
                    (inner.height as f64 / scale).round() as u32,
                )
            };
        let sw = current_w.saturating_sub(2 * notch_shoulder(&c));
        (generation, sw, current_h)
    };

    let (end_width, end_height) = if expanded {
        (c.width, c.expanded_height)
    } else {
        (c.compact_width, c.compact_height)
    };

    let duration_ms = if c.animation_duration == 0 {
        0
    } else {
        c.animation_duration.max(160)
    };

    let start = tokio::time::Instant::now();
    loop {
        let t = if duration_ms == 0 {
            1.0
        } else {
            (start.elapsed().as_secs_f64() * 1000.0 / duration_ms as f64).min(1.0)
        };
        let eased = 1.0 - (1.0 - t).powi(3);
        let width =
            (start_width as f64 + (end_width as f64 - start_width as f64) * eased).round() as u32;
        let height = (start_height as f64 + (end_height as f64 - start_height as f64) * eased)
            .round() as u32;
        {
            let _geometry = state.3.lock().map_err(|e| e.to_string())?;
            if state.1.load(Ordering::SeqCst) != generation {
                return Ok(());
            }
            if t >= 1.0 {
                place_size(&app, &c, end_width, end_height)?;
                break;
            } else {
                place_size(&app, &c, width, height)?;
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(16)).await;
    }
    {
        let _geometry = state.3.lock().map_err(|e| e.to_string())?;
        if state.1.load(Ordering::SeqCst) == generation && !state.4.load(Ordering::SeqCst) {
            let _ = app.emit_to("dynamic-island", "island-expand-finished", expanded);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn new_system_modules_survive_settings_normalization() {
        let mut c: IslandConfig = serde_json::from_str(r#"{"pages":[{"id":"page-1","name":"Home","layout":[{"kind":"memory","x":0,"y":0,"w":20,"h":20},{"kind":"gpu","x":20,"y":0,"w":20,"h":20},{"kind":"uptime","x":40,"y":0,"w":20,"h":20},{"kind":"cpu_frequency","x":60,"y":0,"w":20,"h":20},{"kind":"date","x":80,"y":0,"w":20,"h":20}]}]}"#).unwrap();
        c.normalize();
        assert_eq!(c.pages.unwrap()[0].layout.len(), 5);
    }
    #[test]
    fn module_content_preferences_survive_normalization_and_serialization() {
        let mut c: IslandConfig = serde_json::from_str(r#"{"pages":[{"id":"page-1","name":"Home","layout":[{"kind":"media","x":0,"y":0,"w":50,"h":50,"show_lyrics":true,"show_artwork":false,"show_artist":false,"show_times":false},{"kind":"calendar","x":50,"y":0,"w":50,"h":50,"show_calendar_grid":false}]}]}"#).unwrap();
        c.normalize();
        let serialized = serde_json::to_value(&c).unwrap();
        let modules = &serialized["pages"][0]["layout"];
        assert_eq!(modules[0]["show_lyrics"], true);
        assert_eq!(modules[0]["show_artwork"], false);
        assert_eq!(modules[0]["show_artist"], false);
        assert_eq!(modules[0]["show_times"], false);
        assert_eq!(modules[1]["show_calendar_grid"], false);
    }
    #[test]
    fn artwork_size_survives_normalization_and_rejects_invalid_values() {
        let mut c: IslandConfig = serde_json::from_str(r#"{"pages":[{"id":"page-1","name":"Home","layout":[{"kind":"media","x":0,"y":0,"w":40,"h":40,"artwork_layout":"large"},{"kind":"clock","x":40,"y":0,"w":30,"h":30,"artwork_layout":"invalid"}]}]}"#).unwrap();
        c.normalize();
        let pages = c.pages.unwrap();
        assert_eq!(pages[0].layout[0].artwork_layout.as_deref(), Some("large"));
        assert_eq!(pages[0].layout[1].artwork_layout, None);
    }
    #[test]
    fn removed_quick_actions_do_not_remove_other_modules() {
        let mut c: IslandConfig = serde_json::from_str(r#"{"pages":[{"id":"page-1","name":"Home","layout":[{"kind":"actions","x":0,"y":0,"w":20,"h":20},{"kind":"clock","x":20,"y":0,"w":30,"h":20}]}]}"#).unwrap();
        c.normalize();
        let pages = c.pages.unwrap();
        assert_eq!(pages[0].layout.len(), 1);
        assert_eq!(pages[0].layout[0].kind, "clock");
    }
    #[test]
    fn page_navigation_none_and_button_styles_survive_normalization() {
        let mut c: IslandConfig = serde_json::from_str(r#"{"tab_style":"none","pages":[{"id":"page-1","name":"Home","icon":"home","style":"outline","layout":[]},{"id":"page-2","name":"Work","style":"invalid","layout":[]}]}"#).unwrap();
        c.normalize();
        assert_eq!(c.tab_style, "none");
        let pages = c.pages.unwrap();
        assert_eq!(pages[0].style, "outline");
        assert_eq!(pages[0].icon.as_deref(), Some("home"));
        assert_eq!(pages[1].style, "default");
    }
    #[test]
    fn pages_migrate_legacy_layout_and_keep_independent_positions() {
        let mut c: IslandConfig = serde_json::from_str(r#"{"layout":[{"kind":"media","x":0,"y":0,"w":7,"h":12},{"kind":"clock","x":7,"y":0,"w":5,"h":3}]}"#).unwrap();
        c.normalize();
        let pages = c.pages.as_mut().unwrap();
        assert_eq!(
            (
                pages[0].layout[0].w,
                pages[0].layout[1].x,
                pages[0].layout[1].w
            ),
            (58, 58, 42)
        );
        pages.push(IslandPage {
            id: "work".into(),
            name: "Work".into(),
            icon: None,
            style: String::new(),
            layout: vec![IslandModule {
                kind: "clock".into(),
                style: "soft".into(),
                x: 13,
                y: 22,
                w: 30,
                h: 20,
                ..Default::default()
            }],
        });
        c.normalize();
        let pages = c.pages.unwrap();
        assert_eq!(pages.len(), 2);
        assert_eq!((pages[1].layout[0].x, pages[1].layout[0].y), (13, 22));
        assert_eq!(pages[0].layout[0].style, "glass");
        assert_eq!(pages[1].layout[0].style, "soft");
        assert_eq!(pages[0].layout.len(), 2);
    }
    #[test]
    fn pages_are_bounded_and_have_unique_ids() {
        let mut c: IslandConfig = serde_json::from_str(r#"{"tab_style":"invalid","pages":[{"id":"page-2","name":"Home","layout":[]},{"id":"page-2","name":" ","layout":[{"kind":"clock","x":99,"y":99,"w":30,"h":20},{"kind":"clock","x":0,"y":0,"w":2,"h":2},{"kind":"unknown","x":0,"y":0,"w":2,"h":2}]}]}"#).unwrap();
        c.normalize();
        let pages = c.pages.unwrap();
        assert_ne!(pages[0].id, pages[1].id);
        assert_eq!(pages[1].name, "Page 2");
        assert_eq!(pages[1].layout.len(), 1);
        assert_eq!(pages[1].layout[0].style, "glass");
        assert_eq!((pages[1].layout[0].x, pages[1].layout[0].y), (70, 80));
        assert_eq!(c.tab_style, "buttons");
    }
    #[test]
    fn settings_are_bounded_and_invalid_color_is_replaced() {
        let mut c = IslandConfig {
            width: 1,
            offset: 999,
            radius: 999,
            opacity: 1,
            color: "invalid".into(),
            horizontal_offset: -9000,
            close_delay: 9999,
            shape: "bad".into(),
            compact_content: "bad".into(),
            module_order: "bad".into(),
            ..Default::default()
        };
        c.normalize();
        assert_eq!((c.width, c.offset, c.radius, c.opacity), (380, 200, 48, 50));
        assert_eq!(c.color, "#08090c");
        assert_eq!((c.horizontal_offset, c.close_delay), (-2000, 5000));
        assert_eq!(
            (
                c.shape.as_str(),
                c.compact_content.as_str(),
                c.module_order.as_str()
            ),
            ("rounded", "music", "media-first")
        );
    }
    #[test]
    fn module_order_is_sanitized_and_compact_dimensions_are_bounded() {
        let mut c = IslandConfig {
            compact_width: 1,
            compact_height: 300,
            animation_duration: 5000,
            info_order: vec![
                "disk".into(),
                "unknown".into(),
                "disk".into(),
                "clock".into(),
            ],
            ..Default::default()
        };
        c.normalize();
        assert_eq!(
            (c.compact_width, c.compact_height, c.animation_duration),
            (80, 100, 1000)
        );
        assert_eq!(
            c.info_order,
            ["disk", "clock", "calendar", "battery", "system", "network"]
        );
    }
    #[test]
    fn legacy_modules_are_migrated_and_empty_layout_remains_empty() {
        let mut old: IslandConfig = serde_json::from_str(
            r#"{"show_media":true,"show_calendar":true,"show_battery":false}"#,
        )
        .unwrap();
        old.normalize();
        let layout = old.layout.unwrap();
        assert_eq!(
            layout.iter().map(|m| m.kind.as_str()).collect::<Vec<_>>(),
            ["media", "calendar"]
        );
        assert_eq!((layout[0].x, layout[0].w, layout[1].x), (0, 7, 7));
        let mut empty: IslandConfig = serde_json::from_str(r#"{"layout":[]}"#).unwrap();
        empty.normalize();
        assert!(empty.layout.unwrap().is_empty());
    }
    #[test]
    fn extra_modules_and_content_are_normalized() {
        let mut c = IslandConfig {
            weather_city: "  Kyiv  ".into(),
            note_text: "x".repeat(1500),
            countdown_date: "invalid".into(),
            layout: Some(vec![
                IslandModule {
                    kind: "weather".into(),
                    style: String::new(),
                    x: 0,
                    y: 0,
                    w: 3,
                    h: 2,
                    ..Default::default()
                },
                IslandModule {
                    kind: "note".into(),
                    style: String::new(),
                    x: 3,
                    y: 0,
                    w: 3,
                    h: 2,
                    ..Default::default()
                },
                IslandModule {
                    kind: "countdown".into(),
                    style: String::new(),
                    x: 6,
                    y: 0,
                    w: 3,
                    h: 2,
                    ..Default::default()
                },
            ]),
            ..Default::default()
        };
        c.normalize();
        assert_eq!(c.weather_city, "Kyiv");
        assert_eq!(c.note_text.len(), 1000);
        assert!(c.countdown_date.is_empty());
        assert_eq!(c.layout.unwrap().len(), 3);
    }
    #[test]
    fn attached_shoulders_extend_outside_configured_width() {
        let c = IslandConfig {
            shape: "notch".into(),
            radius: 24,
            compact_height: 46,
            ..Default::default()
        };
        assert_eq!(notch_shoulder(&c), 23);
        assert_eq!(c.compact_width + 2 * notch_shoulder(&c), 276);
        assert_eq!(c.width + 2 * notch_shoulder(&c), 566);
        assert_eq!(
            notch_shoulder(&IslandConfig {
                shape: "rounded".into(),
                ..c
            }),
            0
        );
    }
    #[test]
    fn fullscreen_coverage_uses_monitor_coordinates() {
        assert!(covers_monitor(
            (-1920, 0, 0, 1080),
            (-1920, 0),
            (1920, 1080)
        ));
        assert!(!covers_monitor(
            (-1920, 0, 0, 1040),
            (-1920, 0),
            (1920, 1080)
        ));
        assert!(!covers_monitor(
            (0, 0, 1920, 1080),
            (-1920, 0),
            (1920, 1080)
        ));
    }
    #[test]
    fn fullscreen_setting_hides_for_maximized_apps_as_well() {
        assert!(should_hide_for_window(true, false, true, false));
        assert!(should_hide_for_window(true, false, false, true));
        assert!(should_hide_for_window(false, true, false, true));
        assert!(!should_hide_for_window(false, true, true, false));
        assert!(!should_hide_for_window(true, true, false, false));
        assert!(!should_hide_for_window(false, false, true, true));
    }
    #[test]
    fn work_area_coverage_detects_borderless_maximized_windows() {
        let work = (0, 0, 1920, 1040);
        assert!(covers_work_area((0, 0, 1920, 1040), work));
        assert!(covers_work_area((-8, -8, 1928, 1048), work));
        assert!(!covers_work_area((100, 80, 1800, 1000), work));
        assert!(covers_work_area((-1920, 0, 0, 1040), (-1920, 0, 0, 1040)));
        assert!(!covers_work_area((0, 0, 1920, 1040), (-1920, 0, 0, 1040)));
    }
    #[test]
    fn older_settings_receive_new_defaults() {
        let c: IslandConfig = serde_json::from_str(r#"{"enabled":true}"#).unwrap();
        assert!(
            c.enabled
                && c.show_media
                && c.show_calendar
                && c.hide_fullscreen
                && c.hide_maximized
                && c.auto_close
        );
        assert_eq!(
            (c.horizontal_offset, c.close_delay, c.animation_duration),
            (0, 700, 80)
        );
    }
}

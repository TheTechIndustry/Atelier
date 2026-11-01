use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};
use tauri::{Emitter, Manager};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct IslandModule {
    pub kind: String,
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
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
                    x: if self.module_order == "info-first" && !info.is_empty() {
                        5
                    } else {
                        0
                    },
                    y: 0,
                    w: media_width,
                    h: 12,
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
                        x: info_x,
                        y,
                        w: info_w,
                        h: bottom - y,
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
                    "calendar",
                    "clock",
                    "battery",
                    "system",
                    "disk",
                    "network",
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
pub struct IslandState(Mutex<IslandConfig>, AtomicU64);
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
        Self(Mutex::new(c), AtomicU64::new(0))
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
    let pw = (window_width as f64 * scale).round() as u32;
    let available = (m.size().width as i32 - pw as i32).max(0);
    let offset = (c.horizontal_offset as f64 * scale).round() as i32;
    let x = m.position().x + (available / 2 + offset).clamp(0, available);
    let y = m.position().y
        + (if c.shape == "notch" {
            0
        } else {
            (c.offset as f64 * scale).round() as i32
        });
    w.set_size(tauri::LogicalSize::new(window_width, height))
        .map_err(|e| e.to_string())?;
    w.set_position(tauri::PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
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
    let tolerance = 2;
    rect.0 <= origin.0 + tolerance
        && rect.1 <= origin.1 + tolerance
        && rect.2 >= origin.0.saturating_add(size.0 as i32) - tolerance
        && rect.3 >= origin.1.saturating_add(size.1 as i32) - tolerance
}
fn covered_by_foreground(app: &tauri::AppHandle, c: &IslandConfig) -> bool {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Foundation::RECT;
    use windows::Win32::Graphics::Gdi::{
        MonitorFromPoint, MonitorFromWindow, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId, IsIconic, IsWindowVisible,
        IsZoomed,
    };
    let foreground = unsafe { GetForegroundWindow() };
    let mut pid = 0;
    unsafe {
        GetWindowThreadProcessId(foreground, Some(&mut pid));
    }
    if foreground.0.is_null()
        || pid == 0
        || pid == std::process::id()
        || !unsafe { IsWindowVisible(foreground) }.as_bool()
        || unsafe { IsIconic(foreground) }.as_bool()
    {
        return false;
    }
    let Ok(monitors) = app.available_monitors() else {
        return false;
    };
    let Some(m) = monitors.get(c.monitor).or_else(|| monitors.first()) else {
        return false;
    };
    let p = m.position();
    let size = m.size();
    let point = POINT {
        x: p.x.saturating_add((size.width / 2) as i32),
        y: p.y.saturating_add((size.height / 2) as i32),
    };
    if unsafe {
        MonitorFromWindow(foreground, MONITOR_DEFAULTTONEAREST)
            != MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST)
    } {
        return false;
    }
    if c.hide_maximized && unsafe { IsZoomed(foreground) }.as_bool() {
        return true;
    }
    if !c.hide_fullscreen {
        return false;
    }
    let mut rect = RECT::default();
    if unsafe { GetWindowRect(foreground, &mut rect) }.is_err() {
        return false;
    }
    covers_monitor(
        (rect.left, rect.top, rect.right, rect.bottom),
        (p.x, p.y),
        (size.width, size.height),
    )
}
fn apply(app: &tauri::AppHandle, c: &IslandConfig) -> Result<(), String> {
    if !c.enabled {
        if let Some(w) = app.get_webview_window("dynamic-island") {
            w.hide().map_err(|e| e.to_string())?;
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
    place(app, c, false)?;
    let _ = app.emit_to("dynamic-island", "island-config", c);
    if !covered_by_foreground(app, c) {
        app.get_webview_window("dynamic-island")
            .ok_or("Island window unavailable")?
            .show()
            .map_err(|e| e.to_string())?;
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
            tokio::time::sleep(std::time::Duration::from_millis(350)).await;
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
                if hide && visible {
                    app.state::<IslandState>().1.fetch_add(1, Ordering::SeqCst);
                    let _ = w.hide();
                } else if !hide && !visible {
                    let _ = place(&app, &c, false);
                    let _ = app.emit_to("dynamic-island", "island-config", &c);
                    let _ = w.show();
                }
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
        .map(|(i, m)| {
            format!(
                "Display {} — {} × {}",
                i + 1,
                m.size().width,
                m.size().height
            )
        })
        .collect())
}
#[tauri::command]
pub async fn set_island(
    app: tauri::AppHandle,
    state: tauri::State<'_, IslandState>,
    mut config: IslandConfig,
) -> Result<IslandConfig, String> {
    config.normalize();
    state.1.fetch_add(1, Ordering::SeqCst);
    let p = path();
    std::fs::create_dir_all(p.parent().ok_or("Invalid settings path")?)
        .map_err(|e| e.to_string())?;
    std::fs::write(
        p,
        serde_json::to_vec_pretty(&config).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    *state.0.lock().map_err(|e| e.to_string())? = config.clone();
    apply(&app, &config)?;
    Ok(config)
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
    let generation = state.1.fetch_add(1, Ordering::SeqCst) + 1;
    let (start_width, end_width, start_height, end_height) = if expanded {
        (
            c.compact_width,
            c.width,
            c.compact_height,
            c.expanded_height,
        )
    } else {
        (
            c.width,
            c.compact_width,
            c.expanded_height,
            c.compact_height,
        )
    };
    let start = tokio::time::Instant::now();
    loop {
        if state.1.load(Ordering::SeqCst) != generation {
            return Ok(());
        }
        let t = if c.animation_duration == 0 {
            1.0
        } else {
            (start.elapsed().as_secs_f64() * 1000.0 / c.animation_duration as f64).min(1.0)
        };
        let eased = 1.0 - (1.0 - t).powi(3);
        let width =
            (start_width as f64 + (end_width as f64 - start_width as f64) * eased).round() as u32;
        let height = (start_height as f64 + (end_height as f64 - start_height as f64) * eased)
            .round() as u32;
        place_size(&app, &c, width, height)?;
        if t >= 1.0 {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(16)).await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
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
                    x: 0,
                    y: 0,
                    w: 3,
                    h: 2,
                },
                IslandModule {
                    kind: "note".into(),
                    x: 3,
                    y: 0,
                    w: 3,
                    h: 2,
                },
                IslandModule {
                    kind: "countdown".into(),
                    x: 6,
                    y: 0,
                    w: 3,
                    h: 2,
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

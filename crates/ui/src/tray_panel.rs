use tauri::{Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder};

#[derive(Default)]
pub struct TrayUsage(pub crate::app_usage::UsageMonitor);

#[tauri::command]
pub fn tray_usage(monitor: tauri::State<'_, TrayUsage>) -> Result<crate::app_usage::Usage, String> {
    monitor.0.sample()
}

pub fn create(app: &tauri::AppHandle) -> tauri::Result<()> {
    WebviewWindowBuilder::new(app, "tray-panel", WebviewUrl::App("tray.html".into()))
        .title("Atelier")
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .resizable(false)
        .visible(false)
        .focused(false)
        .disable_drag_drop_handler()
        .inner_size(240., 228.)
        .build()?;
    Ok(())
}

pub fn show(app: &tauri::AppHandle, x: f64, y: f64) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("tray-panel") else {
        return Ok(());
    };
    if window.is_visible()? {
        window.hide()?;
        return Ok(());
    }
    let monitors = app.available_monitors()?;
    let monitor = monitors
        .iter()
        .find(|m| {
            let p = m.position();
            let s = m.size();
            x >= p.x as f64
                && x < (p.x as f64 + s.width as f64)
                && y >= p.y as f64
                && y < (p.y as f64 + s.height as f64)
        })
        .or_else(|| monitors.first());
    if let Some(monitor) = monitor {
        let area = monitor.work_area();
        let scale = monitor.scale_factor();
        let width = (240. * scale).round() as i32;
        let height = (228. * scale).round() as i32;
        let left = area.position.x;
        let top = area.position.y;
        let right = left + area.size.width as i32;
        let bottom = top + area.size.height as i32;
        let px = ((x as i32) - width / 2).clamp(left, (right - width).max(left));
        let py = ((y as i32) - height - (8. * scale) as i32).clamp(top, (bottom - height).max(top));
        window.set_position(PhysicalPosition::new(px, py))?;
    }
    window.show()?;
    window.set_focus()?;
    Ok(())
}

#[tauri::command]
pub async fn tray_action(app: tauri::AppHandle, action: String) -> Result<(), String> {
    match action.as_str() {
        "show" => {
            if let Some(w) = app.get_webview_window("main") {
                w.unminimize().map_err(|e| e.to_string())?;
                w.show().map_err(|e| e.to_string())?;
                w.set_focus().map_err(|e| e.to_string())?;
            }
        }
        "minimal clean" | "cyberpunk neon" | "frosted glass" | "nordic dark" => {
            crate::apply_preset(app.state::<crate::AppState>(), action)?;
        }
        "reset" => {
            crate::desktop_dock::reset_desktop_dock(app.clone()).await?;
            crate::reset_defaults(app.state::<crate::AppState>())?;
        }
        "quit" => {
            crate::system_appearance::cleanup();
            if let Err(error) = crate::desktop_background::shutdown() {
                tracing::error!(%error, "Could not restore Windows background on exit");
            }
            app.state::<crate::desktop_dock::DockState>().shutdown();
            let _ = app.state::<crate::AppState>().taskbar.reset_all();
            app.exit(0);
        }
        _ => return Err("Unknown tray action".into()),
    }
    if let Some(w) = app.get_webview_window("tray-panel") {
        let _ = w.hide();
    }
    Ok(())
}

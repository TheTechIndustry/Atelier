use std::sync::{Mutex, OnceLock};
use tauri::{Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

static DRAG_ICON: OnceLock<Mutex<(String, String)>> = OnceLock::new();
static DRAG_OFFSET: OnceLock<Mutex<(f64, f64)>> = OnceLock::new();
fn drag_offset() -> &'static Mutex<(f64, f64)> {
    DRAG_OFFSET.get_or_init(|| Mutex::new((26., 26.)))
}
fn icon_state() -> &'static Mutex<(String, String)> {
    DRAG_ICON.get_or_init(|| Mutex::new((String::new(), String::new())))
}
fn allowed(window: &tauri::Window) -> Result<(), String> {
    if window.label() == "widget-folder-flyout" {
        Ok(())
    } else {
        Err("Only the app group may display a drag preview".into())
    }
}
fn preview(app: &tauri::AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app.get_webview_window("widget-folder-drag-ghost") {
        return Ok(window);
    }
    let window = WebviewWindowBuilder::new(
        app,
        "widget-folder-drag-ghost",
        WebviewUrl::App("dock-drag-ghost.html".into()),
    )
    .title("App drag preview")
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .skip_taskbar(true)
    .always_on_top(true)
    .resizable(false)
    .focusable(false)
    .focused(false)
    .visible(false)
    .disable_drag_drop_handler()
    .inner_size(52., 52.)
    .build()
    .map_err(|e| e.to_string())?;
    window
        .set_ignore_cursor_events(true)
        .map_err(|e| e.to_string())?;
    Ok(window)
}
fn preview_origin(cursor: (i32, i32), scale: f64, offset: (f64, f64)) -> (i32, i32) {
    (
        (cursor.0 as f64 - offset.0 * scale).round() as i32,
        (cursor.1 as f64 - offset.1 * scale).round() as i32,
    )
}
fn position(window: &WebviewWindow) -> Result<(), String> {
    let mut cursor = windows::Win32::Foundation::POINT::default();
    unsafe { windows::Win32::UI::WindowsAndMessaging::GetCursorPos(&mut cursor) }
        .map_err(|e| e.to_string())?;
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let offset = *drag_offset().lock().map_err(|e| e.to_string())?;
    let (x, y) = preview_origin((cursor.x, cursor.y), scale, offset);
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn folder_ghost_start(
    window: tauri::Window,
    icon: String,
    name: String,
    x: f64,
    y: f64,
    grab_x: f64,
    grab_y: f64,
) -> Result<(), String> {
    allowed(&window)?;
    if !grab_x.is_finite() || !grab_y.is_finite() || grab_x.abs() > 128. || grab_y.abs() > 128. {
        return Err("Invalid drag anchor".into());
    }
    let _ = (x, y);
    *drag_offset().lock().map_err(|e| e.to_string())? = (8. + grab_x, 8. + grab_y);
    if icon.len() > 2_000_000
        || (!icon.is_empty() && !icon.starts_with("data:image/"))
        || name.len() > 1024
    {
        return Err("Invalid icon".into());
    }
    *icon_state().lock().map_err(|e| e.to_string())? = (icon.clone(), name.clone());
    let ghost = preview(window.app_handle())?;
    position(&ghost)?;
    let _ = ghost.emit(
        "folder-ghost-icon",
        serde_json::json!({"icon":icon,"name":name}),
    );
    ghost.show().map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub async fn folder_ghost_move(window: tauri::Window, x: f64, y: f64) -> Result<(), String> {
    allowed(&window)?;
    let _ = (x, y);
    if let Some(ghost) = window
        .app_handle()
        .get_webview_window("widget-folder-drag-ghost")
    {
        position(&ghost)?;
    }
    Ok(())
}
#[tauri::command]
pub async fn folder_ghost_end(window: tauri::Window) -> Result<(), String> {
    allowed(&window)?;
    if let Some(ghost) = window
        .app_handle()
        .get_webview_window("widget-folder-drag-ghost")
    {
        ghost.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
pub fn folder_ghost_icon(window: tauri::Window) -> Result<(String, String), String> {
    if window.label() != "widget-folder-drag-ghost" {
        return Err("Only the drag preview may access its icon".into());
    }
    Ok(icon_state().lock().map_err(|e| e.to_string())?.clone())
}

#[cfg(test)]
mod tests {
    use super::preview_origin;
    #[test]
    fn retains_grab_point_at_different_display_scales() {
        assert_eq!(preview_origin((800, 600), 1.0, (13., 19.)), (787, 581));
        assert_eq!(preview_origin((800, 600), 1.5, (13., 19.)), (781, 572));
    }
}

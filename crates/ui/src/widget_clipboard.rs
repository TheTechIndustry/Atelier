use std::collections::VecDeque;
use std::sync::Mutex;
use windows::Win32::Foundation::{GlobalFree, HANDLE, HGLOBAL, HWND};
use windows::Win32::System::DataExchange::{
    CloseClipboard, EmptyClipboard, GetClipboardData, OpenClipboard, SetClipboardData,
};
use windows::Win32::System::Memory::{
    GlobalAlloc, GlobalLock, GlobalSize, GlobalUnlock, GMEM_MOVEABLE,
};
use windows::Win32::System::Ole::CF_UNICODETEXT;

#[derive(Default)]
pub struct ClipboardHistory(Mutex<VecDeque<String>>);

fn permitted(window: &tauri::Window) -> Result<(), String> {
    if window.label() == "widget-prod_clipboard" || window.label() == "desktop-dock" {
        Ok(())
    } else {
        Err("Clipboard history is unavailable to this window".into())
    }
}

struct OpenClipboardGuard;
impl Drop for OpenClipboardGuard {
    fn drop(&mut self) {
        unsafe {
            let _ = CloseClipboard();
        }
    }
}

fn current_text() -> Result<Option<String>, String> {
    unsafe {
        OpenClipboard(HWND::default()).map_err(|_| "Clipboard is busy".to_string())?;
        let _guard = OpenClipboardGuard;
        let handle = match GetClipboardData(CF_UNICODETEXT.0 as u32) {
            Ok(handle) => HGLOBAL(handle.0),
            Err(_) => return Ok(None),
        };
        let bytes = GlobalSize(handle);
        if bytes > 131_072 {
            return Ok(None);
        }
        let size = bytes / 2;
        if size == 0 {
            return Ok(None);
        }
        let ptr = GlobalLock(handle) as *const u16;
        if ptr.is_null() {
            return Err("Unable to read clipboard".into());
        }
        let data = std::slice::from_raw_parts(ptr, size);
        let length = data.iter().position(|value| *value == 0).unwrap_or(size);
        let text = String::from_utf16_lossy(&data[..length]);
        let _ = GlobalUnlock(handle);
        if text.is_empty() {
            Ok(None)
        } else {
            Ok(Some(text))
        }
    }
}

fn record(history: &mut VecDeque<String>, text: Option<String>) {
    if let Some(text) = text {
        if history.front() != Some(&text) {
            history.retain(|item| item != &text);
            history.push_front(text);
        }
    }
    history.truncate(50);
}

#[tauri::command]
pub fn widget_clipboard_snapshot(
    window: tauri::Window,
    state: tauri::State<'_, ClipboardHistory>,
    limit: usize,
) -> Result<Vec<String>, String> {
    permitted(&window)?;
    let text = current_text()?;
    let mut history = state.0.lock().map_err(|e| e.to_string())?;
    record(&mut history, text);
    Ok(history.iter().take(limit.clamp(1, 50)).cloned().collect())
}

#[tauri::command]
pub fn widget_clipboard_copy(
    window: tauri::Window,
    state: tauri::State<'_, ClipboardHistory>,
    text: String,
) -> Result<(), String> {
    permitted(&window)?;
    if !state.0.lock().map_err(|e| e.to_string())?.contains(&text) {
        return Err("Clipboard item is no longer available".into());
    }
    let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        OpenClipboard(HWND(hwnd.0)).map_err(|_| "Clipboard is busy".to_string())?;
        let _guard = OpenClipboardGuard;
        let memory = GlobalAlloc(GMEM_MOVEABLE, wide.len() * 2)
            .map_err(|_| "Unable to allocate clipboard memory".to_string())?;
        let ptr = GlobalLock(memory) as *mut u16;
        if ptr.is_null() {
            let _ = GlobalFree(memory);
            return Err("Unable to write clipboard".into());
        }
        std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
        let _ = GlobalUnlock(memory);
        if EmptyClipboard().is_err() {
            let _ = GlobalFree(memory);
            return Err("Unable to clear clipboard".into());
        }
        if SetClipboardData(CF_UNICODETEXT.0 as u32, HANDLE(memory.0)).is_err() {
            let _ = GlobalFree(memory);
            return Err("Unable to write clipboard".into());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn history_deduplicates_and_bounds_entries() {
        let mut history = VecDeque::new();
        record(&mut history, Some("first".into()));
        record(&mut history, Some("second".into()));
        record(&mut history, Some("first".into()));
        assert_eq!(
            history.iter().cloned().collect::<Vec<_>>(),
            vec!["first", "second"]
        );
        for i in 0..60 {
            record(&mut history, Some(i.to_string()));
        }
        assert_eq!(history.len(), 50);
        assert_eq!(history.front().map(String::as_str), Some("59"));
    }
}



use std::collections::HashMap;

const NIF_MESSAGE: u32 = 1;
const NIF_ICON: u32 = 2;
const NIF_TIP: u32 = 4;
const NIF_STATE: u32 = 8;
const NIF_GUID: u32 = 32;
const NIS_HIDDEN: u32 = 1;
const HEADER_LEN: usize = 28;
const TRAY_PREFIX: usize = 8;
const MAX_ICON_SIDE: u32 = 256;
const MAX_PAYLOAD: usize = 8192;

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrayImage {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrayEvent {
    pub operation: u32,
    pub hwnd: u32,
    pub uid: u32,
    pub guid: Option<[u8; 16]>,
    pub callback: Option<u32>,
    pub tooltip: Option<String>,
    pub hidden: Option<bool>,
    pub version: Option<u32>,
    pub image: Option<TrayImage>,
}
fn u32_at(b: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(
        b.get(at..at.checked_add(4)?)?.try_into().ok()?,
    ))
}
fn utf16_at(b: &[u8], at: usize, bytes: usize) -> Option<String> {
    let data = b.get(at..at.checked_add(bytes)?)?;
    let units: Vec<u16> = data
        .chunks_exact(2)
        .map(|v| u16::from_le_bytes([v[0], v[1]]))
        .take_while(|v| *v != 0)
        .collect();
    Some(String::from_utf16_lossy(&units))
}

pub fn decode_frame(frame: &[u8]) -> Option<TrayEvent> {
    if u32_at(frame, 0)? != 2 {
        return None;
    }
    let payload_len = u32_at(frame, 12)? as usize;
    let width = u32_at(frame, 16)?;
    let height = u32_at(frame, 20)?;
    let image_len = u32_at(frame, 24)? as usize;
    if payload_len > MAX_PAYLOAD || width > MAX_ICON_SIDE || height > MAX_ICON_SIDE {
        return None;
    }
    let end = HEADER_LEN.checked_add(payload_len)?;
    let image_end = end.checked_add(image_len)?;
    if image_end != frame.len() || payload_len < TRAY_PREFIX + 24 {
        return None;
    }
    let payload = frame.get(HEADER_LEN..end)?;
    let operation = u32_at(payload, 4)?;
    if ![0, 1, 2, 4].contains(&operation) {
        return None;
    }
    let data = payload.get(TRAY_PREFIX..)?;
    let cb_size = u32_at(data, 0)? as usize;
    let flags = u32_at(data, 12)?;
    let bounded = data.get(..cb_size.min(data.len()))?;
    let hwnd = u32_at(bounded, 4)?;
    let uid = u32_at(bounded, 8)?;
    let guid = if flags & NIF_GUID != 0 {
        Some(bounded.get(936..952)?.try_into().ok()?)
    } else {
        None
    };
    let callback = if flags & NIF_MESSAGE != 0 {
        Some(u32_at(bounded, 16)?)
    } else {
        None
    };
    let tooltip = if flags & NIF_TIP != 0 {
        Some(utf16_at(bounded, 24, 256)?)
    } else {
        None
    };
    let hidden = if flags & NIF_STATE != 0 {
        let state = u32_at(bounded, 280)?;
        let mask = u32_at(bounded, 284)?;
        (mask & NIS_HIDDEN != 0).then_some(state & NIS_HIDDEN != 0)
    } else {
        None
    };
    let version = if operation == 4 {
        Some(u32_at(bounded, 800)?)
    } else {
        None
    };
    let image = if image_len != 0 {
        if flags & NIF_ICON == 0
            || width == 0
            || height == 0
            || (width as usize)
                .checked_mul(height as usize)?
                .checked_mul(4)?
                != image_len
        {
            return None;
        }
        Some(TrayImage {
            width,
            height,
            rgba: frame.get(end..image_end)?.to_vec(),
        })
    } else {
        None
    };
    Some(TrayEvent {
        operation,
        hwnd,
        uid,
        guid,
        callback,
        tooltip,
        hidden,
        version,
        image,
    })
}
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrayIcon {
    pub hwnd: u32,
    pub uid: u32,
    pub guid: Option<[u8; 16]>,
    pub callback: Option<u32>,
    pub tooltip: String,
    pub hidden: bool,
    pub version: Option<u32>,
    pub image: Option<TrayImage>,
}
#[derive(Default)]
pub struct TrayIcons {
    icons: HashMap<(u32, u32), TrayIcon>,
}
impl TrayIcons {
    pub fn apply(&mut self, event: TrayEvent) {
        let key = event
            .guid
            .and_then(|guid| {
                self.icons
                    .iter()
                    .find_map(|(key, icon)| (icon.guid == Some(guid)).then_some(*key))
            })
            .unwrap_or((event.hwnd, event.uid));
        if event.operation == 2 {
            self.icons.remove(&key);
            return;
        }
        let destination = if event.hwnd != 0 {
            (event.hwnd, event.uid)
        } else {
            key
        };
        if destination != key {
            if let Some(icon) = self.icons.remove(&key) {
                self.icons.insert(destination, icon);
            }
        }
        let icon = self.icons.entry(destination).or_insert_with(|| TrayIcon {
            hwnd: event.hwnd,
            uid: event.uid,
            guid: None,
            callback: None,
            tooltip: String::new(),
            hidden: false,
            version: None,
            image: None,
        });


        if event.hwnd != 0 {
            icon.hwnd = event.hwnd;
            icon.uid = event.uid;
        }
        if let Some(guid) = event.guid {
            icon.guid = Some(guid);
        }
        if let Some(callback) = event.callback {
            icon.callback = Some(callback);
        }
        if let Some(tooltip) = event.tooltip {
            icon.tooltip = tooltip;
        }
        if let Some(hidden) = event.hidden {
            icon.hidden = hidden;
        }
        if let Some(version) = event.version {
            icon.version = Some(version);
        }
        if let Some(image) = event.image {
            icon.image = Some(image);
        }
    }
    pub fn values(&self) -> impl Iterator<Item = &TrayIcon> {
        self.icons.values()
    }
}


#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TrayClick {
    Left,
    Right,
    DoubleLeft,
}
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct CallbackMessage {
    pub message: u32,
    pub wparam: usize,
    pub lparam: isize,
}
pub fn click_messages(
    icon: &TrayIcon,
    click: TrayClick,
    x: i16,
    y: i16,
) -> Option<Vec<CallbackMessage>> {
    let callback = icon.callback?;
    let modern = icon.version.is_some_and(|v| v >= 4);
    let pack = |low: u16, high: u16| u32::from(low) | (u32::from(high) << 16);
    let position = pack(x as u16, y as u16);
    let build = |event: u32| CallbackMessage {
        message: callback,
        wparam: if modern {
            position as usize
        } else {
            icon.uid as usize
        },
        lparam: if modern {
            pack(event as u16, icon.uid as u16) as i32 as isize
        } else {
            event as isize
        },
    };
    let events: &[u32] = match click {
        TrayClick::Left => &[0x0201, 0x0202],
        TrayClick::Right => &[0x0204, 0x0205],
        TrayClick::DoubleLeft => &[0x0203, 0x0202],
    };
    let mut result: Vec<_> = events.iter().map(|event| build(*event)).collect();
    if icon.version.is_some_and(|v| v >= 3) {
        result.push(build(match click {
            TrayClick::Right => 0x007b,
            _ => 0x0400,
        }));
    }
    Some(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn frame(op: u32, flags: u32) -> Vec<u8> {
        let mut b = vec![0; HEADER_LEN + TRAY_PREFIX + 952];
        b[0..4].copy_from_slice(&2u32.to_le_bytes());
        b[12..16].copy_from_slice(&(960u32).to_le_bytes());
        b[HEADER_LEN + 4..HEADER_LEN + 8].copy_from_slice(&op.to_le_bytes());
        let n = HEADER_LEN + TRAY_PREFIX;
        b[n..n + 4].copy_from_slice(&952u32.to_le_bytes());
        b[n + 4..n + 8].copy_from_slice(&123u32.to_le_bytes());
        b[n + 8..n + 12].copy_from_slice(&7u32.to_le_bytes());
        b[n + 12..n + 16].copy_from_slice(&flags.to_le_bytes());
        b
    }
    #[test]
    fn rejects_truncation_and_unbounded_dimensions() {
        let mut b = frame(0, 0);
        assert!(decode_frame(&b).is_some());
        b.pop();
        assert!(decode_frame(&b).is_none());
        let mut b = frame(0, 0);
        b[16..20].copy_from_slice(&257u32.to_le_bytes());
        assert!(decode_frame(&b).is_none());
    }
    #[test]
    fn partial_update_keeps_previous_data_and_delete_removes() {
        let mut icons = TrayIcons::default();
        let mut add = frame(0, NIF_MESSAGE | NIF_TIP);
        let n = HEADER_LEN + TRAY_PREFIX;
        add[n + 16..n + 20].copy_from_slice(&1234u32.to_le_bytes());
        add[n + 24..n + 26].copy_from_slice(&65u16.to_le_bytes());
        icons.apply(decode_frame(&add).unwrap());
        let mut update = frame(1, NIF_STATE);
        update[n + 280..n + 284].copy_from_slice(&1u32.to_le_bytes());
        update[n + 284..n + 288].copy_from_slice(&1u32.to_le_bytes());
        icons.apply(decode_frame(&update).unwrap());
        let icon = icons.values().next().unwrap();
        assert_eq!(icon.callback, Some(1234));
        assert_eq!(icon.tooltip, "A");
        assert!(icon.hidden);
        icons.apply(decode_frame(&frame(2, 0)).unwrap());
        assert_eq!(icons.values().count(), 0);
    }
    #[test]
    fn callback_parameters_follow_icon_version() {
        let mut icon = TrayIcon {
            hwnd: 3,
            uid: 12,
            guid: None,
            callback: Some(0x500),
            tooltip: String::new(),
            hidden: false,
            version: Some(4),
            image: None,
        };
        let messages = click_messages(&icon, TrayClick::Right, -10, 20).unwrap();
        assert_eq!(messages.len(), 3);
        assert_eq!(messages[0].message, 0x500);
        assert_eq!(messages[0].wparam, 0x0014fff6);
        assert_eq!(messages[0].lparam, 0x000c0204);
        assert_eq!(messages[2].lparam, 0x000c007b);
        icon.version = None;
        let legacy = click_messages(&icon, TrayClick::Left, 1, 2).unwrap();
        assert_eq!(legacy[0].wparam, 12);
        assert_eq!(legacy[0].lparam, 0x201);
        assert_eq!(legacy.len(), 2);
    }
    #[test]
    fn guid_registration_tracks_new_owner_and_preserves_guid_only_updates() {
        let mut icons = TrayIcons::default();
        let mut event = decode_frame(&frame(0, 0)).unwrap();
        event.guid = Some([7; 16]);
        event.callback = Some(0x500);
        icons.apply(event.clone());
        event.operation = 1;
        event.hwnd = 456;
        event.uid = 9;
        event.callback = None;
        icons.apply(event.clone());
        let icon = icons.values().next().unwrap();
        assert_eq!((icon.hwnd, icon.uid, icon.callback), (456, 9, Some(0x500)));
        event.hwnd = 0;
        event.uid = 0;
        icons.apply(event);
        let icon = icons.values().next().unwrap();
        assert_eq!((icon.hwnd, icon.uid), (456, 9));
        icons.apply(
            decode_frame(&{
                let mut b = frame(2, 0);
                let n = HEADER_LEN + TRAY_PREFIX;
                b[n + 4..n + 8].copy_from_slice(&456u32.to_le_bytes());
                b[n + 8..n + 12].copy_from_slice(&9u32.to_le_bytes());
                b
            })
            .unwrap(),
        );
        assert_eq!(icons.values().count(), 0);
    }
    #[test]
    fn verifies_rgba_dimensions() {
        let mut b = frame(0, NIF_ICON);
        b[16..20].copy_from_slice(&1u32.to_le_bytes());
        b[20..24].copy_from_slice(&1u32.to_le_bytes());
        b[24..28].copy_from_slice(&4u32.to_le_bytes());
        b.extend_from_slice(&[1, 2, 3, 4]);
        assert_eq!(decode_frame(&b).unwrap().image.unwrap().rgba, [1, 2, 3, 4]);
        b.pop();
        assert!(decode_frame(&b).is_none());
    }
}

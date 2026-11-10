use atelier_common::error::{AtelierError, Result};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus,
};

#[derive(Debug, Clone, Default, PartialEq)]
pub struct MediaTrackInfo {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub is_playing: bool,
    pub artwork: Option<Vec<u8>>,
    pub can_play: bool,
    pub can_pause: bool,
    pub can_next: bool,
    pub can_previous: bool,
    pub can_seek: bool,
    pub position: Option<f64>,
    pub duration: Option<f64>,
}

pub struct SystemMediaMonitor;

fn media_manager() -> Result<GlobalSystemMediaTransportControlsSessionManager> {
    static MANAGER: std::sync::OnceLock<GlobalSystemMediaTransportControlsSessionManager> = std::sync::OnceLock::new();
    if let Some(manager) = MANAGER.get() { return Ok(manager.clone()); }
    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .and_then(|operation| operation.get())
        .map_err(|e| AtelierError::Platform(format!("Media session unavailable: {e}")))?;
    let _ = MANAGER.set(manager.clone());
    Ok(manager)
}

fn position_at(position: f64, updated: i64, now: i64, playing: bool, duration: Option<f64>) -> f64 {
    let current = if playing && updated > 0 && now >= updated {
        position + (now - updated) as f64 / 10_000_000.0
    } else {
        position
    };
    duration.map_or(current.max(0.0), |length| current.clamp(0.0, length))
}

impl SystemMediaMonitor {
    pub fn control(action: &str) -> Result<bool> {
        let manager = media_manager()?;
        let session = manager
            .GetCurrentSession()
            .map_err(|e| AtelierError::Platform(format!("No active media session: {e}")))?;
        let operation = match action {
            "play" => session.TryPlayAsync(),
            "pause" => session.TryPauseAsync(),
            "previous" => session.TrySkipPreviousAsync(),
            "next" => session.TrySkipNextAsync(),
            _ => return Err(AtelierError::Platform("Unknown media action".into())),
        }
        .map_err(|e| AtelierError::Platform(format!("Media control unavailable: {e}")))?;
        operation
            .get()
            .map_err(|e| AtelierError::Platform(format!("Media control failed: {e}")))
    }
    pub fn seek(position: i64) -> Result<bool> {
        let manager = media_manager()?;
        let session = manager
            .GetCurrentSession()
            .map_err(|e| AtelierError::Platform(format!("No active media session: {e}")))?;
        session
            .TryChangePlaybackPositionAsync(position)
            .and_then(|op| op.get())
            .map_err(|e| AtelierError::Platform(format!("Seeking unavailable: {e}")))
    }
    pub fn poll() -> Result<MediaTrackInfo> {
        let manager = media_manager()?;

        let session = match manager.GetCurrentSession() {
            Ok(s) => s,
            Err(_) => return Ok(MediaTrackInfo::default()),
        };

        let is_playing = match session.GetPlaybackInfo() {
            Ok(info) => match info.PlaybackStatus() {
                Ok(status) => {
                    status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing
                }
                Err(_) => false,
            },
            Err(_) => false,
        };

        let controls = session
            .GetPlaybackInfo()
            .ok()
            .and_then(|i| i.Controls().ok());
        let can_play = controls
            .as_ref()
            .and_then(|c| c.IsPlayEnabled().ok())
            .unwrap_or(false);
        let can_pause = controls
            .as_ref()
            .and_then(|c| c.IsPauseEnabled().ok())
            .unwrap_or(false);
        let can_next = controls
            .as_ref()
            .and_then(|c| c.IsNextEnabled().ok())
            .unwrap_or(false);
        let can_previous = controls
            .as_ref()
            .and_then(|c| c.IsPreviousEnabled().ok())
            .unwrap_or(false);
        let can_seek = controls
            .as_ref()
            .and_then(|c| c.IsPlaybackPositionEnabled().ok())
            .unwrap_or(false);
        let timeline = session.GetTimelineProperties().ok();
        let position = timeline
            .as_ref()
            .and_then(|t| t.Position().ok())
            .map(|t| t.Duration as f64 / 10_000_000.0);
        let duration = timeline
            .as_ref()
            .and_then(|t| t.EndTime().ok())
            .map(|t| t.Duration as f64 / 10_000_000.0)
            .filter(|n| *n > 0.0);
        let updated = timeline.as_ref().and_then(|t| t.LastUpdatedTime().ok()).map(|t| t.UniversalTime).unwrap_or(0);
        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).ok().map(|t| ((t.as_secs() + 11_644_473_600) as i64).saturating_mul(10_000_000).saturating_add(t.subsec_nanos() as i64 / 100)).unwrap_or(0);
        let position = position.map(|p| position_at(p, updated, now, is_playing, duration));
        let media_props = match session.TryGetMediaPropertiesAsync() {
            Ok(async_props) => match async_props.get() {
                Ok(props) => props,
                Err(_) => {
                    return Ok(MediaTrackInfo {
                        is_playing,
                        ..Default::default()
                    })
                }
            },
            Err(_) => {
                return Ok(MediaTrackInfo {
                    is_playing,
                    ..Default::default()
                })
            }
        };

        let title = media_props
            .Title()
            .map(|s| s.to_string())
            .unwrap_or_default();

        let artist = media_props
            .Artist()
            .map(|s| s.to_string())
            .unwrap_or_default();

        let album = media_props
            .AlbumTitle()
            .map(|s| s.to_string())
            .unwrap_or_default();

        let artwork = (|| -> Option<Vec<u8>> {
            let stream = media_props
                .Thumbnail()
                .ok()?
                .OpenReadAsync()
                .ok()?
                .get()
                .ok()?;
            let size = stream.Size().ok()?;
            if size == 0 || size > 2_000_000 {
                return None;
            }
            let reader = windows::Storage::Streams::DataReader::CreateDataReader(
                &stream.GetInputStreamAt(0).ok()?,
            )
            .ok()?;
            let count = reader.LoadAsync(size as u32).ok()?.get().ok()?;
            if count != size as u32 {
                return None;
            }
            let mut bytes = vec![0; count as usize];
            reader.ReadBytes(&mut bytes).ok()?;
            if !(bytes.starts_with(&[0xff, 0xd8, 0xff])
                || bytes.starts_with(b"\x89PNG\r\n\x1a\n")
                || bytes.starts_with(b"GIF8")
                || (bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP")))
            {
                return None;
            }
            Some(bytes)
        })();
        Ok(MediaTrackInfo {
            artwork,
            can_play,
            can_pause,
            can_next,
            can_previous,
            can_seek,
            position,
            duration,
            title,
            artist,
            album,
            is_playing,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::position_at;
    #[test]
    fn media_position_advances_only_while_playing_and_stays_in_range() {
        assert_eq!(position_at(10.0, 100_000_000, 125_000_000, true, Some(60.0)), 12.5);
        assert_eq!(position_at(10.0, 100_000_000, 125_000_000, false, Some(60.0)), 10.0);
        assert_eq!(position_at(59.0, 100_000_000, 125_000_000, true, Some(60.0)), 60.0);
        assert_eq!(position_at(10.0, 0, 125_000_000, true, None), 10.0);
    }
}

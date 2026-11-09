use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use windows::Win32::System::Diagnostics::Debug::MessageBeep;
use windows::Win32::UI::WindowsAndMessaging::MB_ICONINFORMATION;

struct Timer {
    kind: String,
    running: bool,
    progress_ms: u64,
    last: Instant,
    duration: u64,
    focus: u64,
    rest: u64,
    rounds: u32,
    round: u32,
    phase: &'static str,
    laps: Vec<u64>,
}
impl Timer {
    fn new(kind: &str, now: Instant, duration: u64, focus: u64, rest: u64, rounds: u32) -> Self {
        Self {
            kind: kind.into(),
            running: false,
            progress_ms: 0,
            last: now,
            duration,
            focus,
            rest,
            rounds,
            round: 1,
            phase: "focus",
            laps: Vec::new(),
        }
    }
    fn phase_length(&self) -> u64 {
        if self.kind == "timer" {
            self.duration
        } else if self.phase == "focus" {
            self.focus
        } else {
            self.rest
        }
    }
    fn next_phase(&mut self) {
        if self.phase == "focus" {
            self.phase = "break";
        } else {
            self.phase = "focus";
            self.round = if self.round >= self.rounds {
                1
            } else {
                self.round + 1
            };
        }
        self.progress_ms = 0;
    }
    fn advance(&mut self, now: Instant) -> bool {
        if self.running {
            self.progress_ms = self.progress_ms.saturating_add(
                now.saturating_duration_since(self.last)
                    .as_millis()
                    .min(u64::MAX as u128) as u64,
            );
            self.last = now;
            if self.kind != "stopwatch" && self.progress_ms >= self.phase_length() * 1000 {
                self.running = false;
                if self.kind == "pomodoro" {
                    self.next_phase();
                } else {
                    self.progress_ms = self.duration * 1000;
                }
                return true;
            }
        }
        false
    }
    fn configure(&mut self, duration: u64, focus: u64, rest: u64, rounds: u32) {
        if !self.running
            && ((self.kind == "timer" && self.duration != duration)
                || (self.kind == "pomodoro" && (self.focus != focus || self.rest != rest)))
        {
            self.progress_ms = 0;
        }
        self.duration = duration;
        self.focus = focus;
        self.rest = rest;
        self.rounds = rounds;
        self.round = self.round.min(rounds);
    }
    fn action(&mut self, action: &str, now: Instant) -> Result<(), String> {
        match action {
            "get" => (),
            "toggle" => {
                if self.running {
                    self.running = false;
                } else {
                    if self.kind == "timer" && self.progress_ms >= self.duration * 1000 {
                        self.progress_ms = 0;
                    }
                    self.last = now;
                    self.running = true;
                }
            }
            "reset" => {
                self.running = false;
                self.progress_ms = 0;
                self.phase = "focus";
                self.round = 1;
                self.laps.clear();
            }
            "skip" if self.kind == "pomodoro" => {
                self.running = false;
                self.next_phase();
            }
            "lap" if self.kind == "stopwatch" && self.running => {
                if self.laps.len() >= 100 {
                    return Err("The stopwatch supports up to 100 laps".into());
                }
                self.laps.push(self.progress_ms);
            }
            _ => return Err("Unknown timer action".into()),
        }
        Ok(())
    }
    fn snapshot(&self) -> serde_json::Value {
        let millis = if self.kind == "stopwatch" {
            self.progress_ms
        } else {
            (self.phase_length() * 1000).saturating_sub(self.progress_ms)
        };
        let seconds = if self.kind == "stopwatch" {
            millis / 1000
        } else {
            millis.saturating_add(999) / 1000
        };
        serde_json::json!({"running":self.running,"seconds":seconds,"milliseconds":millis,"phase":self.phase,"round":self.round,"rounds":self.rounds,"laps":self.laps})
    }
}
static TIMERS: OnceLock<Mutex<HashMap<String, Timer>>> = OnceLock::new();
#[derive(Serialize, Deserialize)]
struct SavedTimer {
    kind: String,
    running: bool,
    progress_ms: u64,
    saved_at_ms: u64,
    duration: u64,
    focus: u64,
    rest: u64,
    rounds: u32,
    round: u32,
    phase: String,
    #[serde(default)]
    laps: Vec<u64>,
}
fn wallclock_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .min(u64::MAX as u128) as u64
}
fn saved(timer: &Timer, now: u64) -> SavedTimer {
    SavedTimer {
        kind: timer.kind.clone(),
        running: timer.running,
        progress_ms: timer.progress_ms.saturating_add(if timer.running {
            timer.last.elapsed().as_millis().min(u64::MAX as u128) as u64
        } else {
            0
        }),
        saved_at_ms: now,
        duration: timer.duration,
        focus: timer.focus,
        rest: timer.rest,
        rounds: timer.rounds,
        round: timer.round,
        phase: timer.phase.into(),
        laps: timer.laps.clone(),
    }
}
fn restore(value: SavedTimer, now: u64, instant: Instant) -> Option<Timer> {
    if !["timer", "stopwatch", "pomodoro"].contains(&value.kind.as_str())
        || ![value.duration, value.focus, value.rest]
            .iter()
            .all(|n| (60..=86400).contains(n))
        || !(1..=24).contains(&value.rounds)
        || !(1..=value.rounds).contains(&value.round)
        || !["focus", "break"].contains(&value.phase.as_str())
        || value.progress_ms > 315360000000
        || value.laps.len() > 100
        || value.laps.windows(2).any(|w| w[1] < w[0])
        || value.laps.iter().any(|lap| *lap > value.progress_ms)
    {
        return None;
    }
    let mut timer = Timer::new(
        &value.kind,
        instant,
        value.duration,
        value.focus,
        value.rest,
        value.rounds,
    );
    timer.running = value.running;
    timer.progress_ms = value.progress_ms;
    timer.phase = if value.phase == "break" {
        "break"
    } else {
        "focus"
    };
    timer.round = value.round;
    timer.laps = value.laps;
    if timer.running {
        timer.progress_ms = timer
            .progress_ms
            .saturating_add(now.saturating_sub(value.saved_at_ms));
    }
    timer.advance(instant);
    Some(timer)
}
fn load() -> HashMap<String, Timer> {
    let Some(path) = super::settings_path().map(|p| p.with_file_name("timers.json")) else {
        return HashMap::new();
    };
    let read = || -> Option<Vec<SavedTimer>> {
        let mut bytes = Vec::new();
        std::fs::File::open(path)
            .ok()?
            .take(65537)
            .read_to_end(&mut bytes)
            .ok()?;
        if bytes.len() > 65536 {
            return None;
        }
        serde_json::from_slice(&bytes).ok()
    };
    let now = wallclock_ms();
    let instant = Instant::now();
    read()
        .unwrap_or_default()
        .into_iter()
        .take(3)
        .filter_map(|v| restore(v, now, instant))
        .map(|v| (v.kind.clone(), v))
        .collect()
}
fn persist(timers: &HashMap<String, Timer>) -> Result<(), String> {
    let path = super::settings_path()
        .ok_or("Timer data directory unavailable")?
        .with_file_name("timers.json");
    std::fs::create_dir_all(path.parent().ok_or("Invalid timer data directory")?)
        .map_err(|_| "Could not create timer data directory")?;
    let now = wallclock_ms();
    let values: Vec<_> = timers.values().map(|v| saved(v, now)).collect();
    let bytes = serde_json::to_vec(&values).map_err(|_| "Could not encode timer state")?;
    let temporary = path.with_extension("json.tmp");
    std::fs::write(&temporary, bytes)
        .and_then(|_| std::fs::rename(temporary, path))
        .map_err(|_| "Could not save timer state".into())
}
fn timers() -> &'static Mutex<HashMap<String, Timer>> {
    TIMERS.get_or_init(|| Mutex::new(load()))
}
fn notify() {
    unsafe {
        let _ = MessageBeep(MB_ICONINFORMATION);
    }
}
pub fn start() {
    tauri::async_runtime::spawn(async {
        let mut last_save = Instant::now();
        loop {
            tokio::time::sleep(Duration::from_millis(500)).await;
            let finished = timers()
                .lock()
                .map(|mut timers| {
                    let finished = timers
                        .values_mut()
                        .fold(false, |done, timer| timer.advance(Instant::now()) || done);
                    if finished
                        || (last_save.elapsed() >= Duration::from_secs(5)
                            && timers.values().any(|t| t.running))
                    {
                        if persist(&timers).is_err() {
                            tracing::warn!("Timer checkpoint could not be saved");
                        }
                        last_save = Instant::now();
                    }
                    finished
                })
                .unwrap_or(false);
            if finished {
                notify();
            }
        }
    });
}
#[tauri::command]
pub fn widget_timer(
    window: tauri::Window,
    kind: String,
    action: String,
    duration: u32,
    focus: u32,
    rest: u32,
    rounds: u32,
) -> Result<serde_json::Value, String> {
    if !["timer", "stopwatch", "pomodoro"].contains(&kind.as_str()) {
        return Err("Unknown timer".into());
    }
    if window.label() != "desktop-dock" && window.label() != format!("widget-prod_{kind}") {
        return Err("Timer unavailable to this window".into());
    }
    if !["get", "toggle", "reset", "skip", "lap"].contains(&action.as_str())
        || (action == "skip" && kind != "pomodoro")
        || (action == "lap" && kind != "stopwatch")
    {
        return Err("Unknown timer action".into());
    }
    let now = Instant::now();
    let duration = duration.clamp(1, 1440) as u64 * 60;
    let focus = focus.clamp(1, 1440) as u64 * 60;
    let rest = rest.clamp(1, 1440) as u64 * 60;
    let rounds = rounds.clamp(1, 24);
    let mut all = timers().lock().map_err(|_| "Timer state unavailable")?;
    let timer = all
        .entry(kind.clone())
        .or_insert_with(|| Timer::new(&kind, now, duration, focus, rest, rounds));
    let finished = timer.advance(now);
    timer.configure(duration, focus, rest, rounds);
    timer.action(&action, now)?;
    let mut result = timer.snapshot();
    if action != "get" || finished {
        if let Err(error) = persist(&all) {
            result["persistence_error"] = error.into();
        }
    }
    drop(all);
    if finished {
        notify();
    }
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn timers_pause_resume_and_complete_from_monotonic_time() {
        let now = Instant::now();
        let mut timer = Timer::new("timer", now, 60, 1500, 300, 4);
        timer.action("toggle", now).unwrap();
        timer.advance(now + Duration::from_secs(20));
        assert_eq!(timer.snapshot()["seconds"], 40);
        timer
            .action("toggle", now + Duration::from_secs(20))
            .unwrap();
        timer.advance(now + Duration::from_secs(100));
        assert_eq!(timer.snapshot()["seconds"], 40);
        timer
            .action("toggle", now + Duration::from_secs(100))
            .unwrap();
        assert!(timer.advance(now + Duration::from_secs(141)));
        assert_eq!(timer.snapshot()["seconds"], 0);
        assert!(!timer.running);
    }
    #[test]
    fn pomodoro_advances_once_and_stopwatch_keeps_time() {
        let now = Instant::now();
        let mut p = Timer::new("pomodoro", now, 60, 60, 30, 2);
        p.action("toggle", now).unwrap();
        assert!(p.advance(now + Duration::from_secs(61)));
        assert_eq!(p.phase, "break");
        assert!(!p.running);
        assert!(!p.advance(now + Duration::from_secs(90)));
        p.action("skip", now).unwrap();
        assert_eq!((p.phase, p.round), ("focus", 2));
        let mut s = Timer::new("stopwatch", now, 60, 60, 30, 2);
        s.action("toggle", now).unwrap();
        s.advance(now + Duration::from_millis(1250));
        assert_eq!(s.snapshot()["milliseconds"], 1250);
    }
    #[test]
    fn running_timers_restore_elapsed_time_and_paused_timers_do_not() {
        let now = Instant::now();
        let mut timer = Timer::new("timer", now, 60, 1500, 300, 4);
        timer.action("toggle", now).unwrap();
        timer.advance(now + Duration::from_secs(10));
        let restored = restore(saved(&timer, 100000), 120000, now).unwrap();
        assert_eq!(restored.snapshot()["seconds"], 30);
        assert!(restored.running);
        let restored = restore(saved(&timer, 100000), 200000, now).unwrap();
        assert_eq!(restored.snapshot()["seconds"], 0);
        assert!(!restored.running);
        timer.action("toggle", now).unwrap();
        assert_eq!(
            restore(saved(&timer, 100000), 200000, now)
                .unwrap()
                .snapshot()["seconds"],
            50
        );
        assert_eq!(
            restore(saved(&timer, 100000), 90000, now)
                .unwrap()
                .snapshot()["seconds"],
            50
        );
    }
    #[test]
    fn laps_are_shared_persisted_and_cleared_by_reset() {
        let now = Instant::now();
        let mut timer = Timer::new("stopwatch", now, 60, 1500, 300, 4);
        assert!(timer.action("lap", now).is_err());
        timer.action("toggle", now).unwrap();
        timer.advance(now + Duration::from_millis(1234));
        timer.action("lap", now).unwrap();
        timer.advance(now + Duration::from_millis(2500));
        timer.action("lap", now).unwrap();
        let mut restored = restore(saved(&timer, 100000), 100000, now).unwrap();
        assert_eq!(restored.snapshot()["laps"], serde_json::json!([1234, 2500]));
        restored.action("reset", now).unwrap();
        assert!(restored.laps.is_empty());
        let mut invalid = saved(&timer, 100000);
        invalid.laps = vec![3000, 1000];
        assert!(restore(invalid, 100000, now).is_none());
    }
}

use serde::Serialize;
use std::{
    collections::{HashMap, HashSet},
    sync::Mutex,
};
use windows::core::{s, w};
use windows::Win32::{
    Foundation::FILETIME,
    System::{
        LibraryLoader::{GetModuleHandleW, GetProcAddress},
        ProcessStatus::EmptyWorkingSet,
        Threading::{
            GetSystemTimes, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_QUOTA,
        },
    },
};

pub struct UsageMonitor(Mutex<UsageState>);

#[derive(Default)]
struct UsageState {
    sys_time: u64,
    process_times: HashMap<usize, u64>,
    sample_count: u64,
}

#[derive(Clone, Debug, Serialize)]
pub struct Usage {
    pub cpu_percent: Option<f64>,
    pub memory_bytes: u64,
}

fn ticks(t: FILETIME) -> u64 {
    (u64::from(t.dwHighDateTime) << 32) | u64::from(t.dwLowDateTime)
}

type NtQuerySystemInformationFn =
    unsafe extern "system" fn(u32, *mut std::ffi::c_void, u32, *mut u32) -> i32;

struct RawProcessEntry {
    pid: usize,
    parent_pid: usize,
    name: String,
    ws_private: u64,
    cpu_time: u64,
}

static PROC_BUFFER: Mutex<Vec<u8>> = Mutex::new(Vec::new());

fn query_system_processes() -> Result<Vec<RawProcessEntry>, String> {
    let ntdll = unsafe { GetModuleHandleW(w!("ntdll.dll")) }.map_err(|e| e.to_string())?;
    let proc = unsafe { GetProcAddress(ntdll, s!("NtQuerySystemInformation")) };
    let Some(proc) = proc else {
        return Err("NtQuerySystemInformation unavailable".into());
    };
    let nt_query: NtQuerySystemInformationFn = unsafe { std::mem::transmute(proc) };

    let mut buf = PROC_BUFFER.lock().unwrap_or_else(|e| e.into_inner());
    if buf.len() < 1024 * 1024 * 2 {
        buf.resize(1024 * 1024 * 2, 0);
    }
    let mut ret_len = 0u32;
    let status = unsafe {
        nt_query(
            5,
            buf.as_mut_ptr() as *mut _,
            buf.len() as u32,
            &mut ret_len,
        )
    };
    if status != 0 {
        if ret_len as usize > buf.len() {
            buf.resize(ret_len as usize + 65536, 0);
            let s2 = unsafe {
                nt_query(
                    5,
                    buf.as_mut_ptr() as *mut _,
                    buf.len() as u32,
                    &mut ret_len,
                )
            };
            if s2 != 0 {
                return Err(format!("NtQuerySystemInformation failed: {s2:#x}"));
            }
        } else {
            return Err(format!("NtQuerySystemInformation failed: {status:#x}"));
        }
    }

    let mut entries = Vec::new();
    let mut offset = 0usize;
    loop {
        if offset + 96 > buf.len() {
            break;
        }
        let ptr = unsafe { buf.as_ptr().add(offset) };
        let next_offset = unsafe { *(ptr as *const u32) } as usize;
        let ws_private_raw = unsafe { *(ptr.add(8) as *const i64) };
        let user_time = unsafe { *(ptr.add(40) as *const i64) };
        let kernel_time = unsafe { *(ptr.add(48) as *const i64) };
        let u_len = unsafe { *(ptr.add(56) as *const u16) } as usize;
        let u_buf = unsafe { *(ptr.add(64) as *const *const u16) };
        let pid = unsafe { *(ptr.add(80) as *const usize) };
        let parent_pid = unsafe { *(ptr.add(88) as *const usize) };

        let name = if !u_buf.is_null() && u_len > 0 {
            let slice = unsafe { std::slice::from_raw_parts(u_buf, u_len / 2) };
            String::from_utf16_lossy(slice).to_ascii_lowercase()
        } else {
            String::new()
        };

        let ws_private = ws_private_raw.max(0) as u64;
        let cpu_time = (user_time.max(0) as u64).saturating_add(kernel_time.max(0) as u64);

        entries.push(RawProcessEntry {
            pid,
            parent_pid,
            name,
            ws_private,
            cpu_time,
        });

        if next_offset == 0 {
            break;
        }
        offset += next_offset;
    }

    Ok(entries)
}

impl Default for UsageMonitor {
    fn default() -> Self {
        let monitor = Self(Mutex::new(UsageState::default()));
        let _ = monitor.sample();
        monitor
    }
}

impl UsageMonitor {
    pub fn sample(&self) -> Result<Usage, String> {
        let mut idle = FILETIME::default();
        let mut kernel = FILETIME::default();
        let mut user = FILETIME::default();
        unsafe { GetSystemTimes(Some(&mut idle), Some(&mut kernel), Some(&mut user)) }
            .map_err(|e| e.to_string())?;
        let current_sys = ticks(kernel).saturating_add(ticks(user));

        let all_procs = query_system_processes()?;

        let root_pid = std::process::id() as usize;
        let mut atelier_pids = HashSet::from([root_pid]);

        loop {
            let old_len = atelier_pids.len();
            for p in &all_procs {
                if atelier_pids.contains(&p.parent_pid)
                    && (p.name.contains("msedgewebview2")
                        || p.name.contains("atelier")
                        || p.name.contains("webview2"))
                {
                    atelier_pids.insert(p.pid);
                }
            }
            if atelier_pids.len() == old_len {
                break;
            }
        }

        let mut total_memory_bytes = 0u64;
        let mut current_process_times = HashMap::new();

        for p in &all_procs {
            if atelier_pids.contains(&p.pid) {
                total_memory_bytes = total_memory_bytes.saturating_add(p.ws_private);
                current_process_times.insert(p.pid, p.cpu_time);
            }
        }

        let mut state = self.0.lock().map_err(|e| e.to_string())?;
        let sys_elapsed = current_sys.saturating_sub(state.sys_time);

        let cpu_percent = if state.sys_time != 0 && sys_elapsed > 0 {
            let proc_delta: u64 = current_process_times
                .iter()
                .filter_map(|(pid, &curr)| {
                    state
                        .process_times
                        .get(pid)
                        .map(|&old| curr.saturating_sub(old))
                })
                .sum();
            Some(((proc_delta as f64 * 100.0) / (sys_elapsed as f64)).clamp(0.0, 100.0))
        } else {
            None
        };

        state.sys_time = current_sys;
        state.process_times = current_process_times;
        state.sample_count = state.sample_count.wrapping_add(1);

        if state.sample_count % 30 == 0 {
            trim_pids(&atelier_pids);
        }

        Ok(Usage {
            cpu_percent,
            memory_bytes: total_memory_bytes,
        })
    }
}

#[tauri::command]
pub fn atelier_usage(monitor: tauri::State<'_, UsageMonitor>) -> Result<Usage, String> {
    monitor.sample()
}

pub fn trim_pids(pids: &HashSet<usize>) {
    for &pid in pids {
        if let Ok(handle) = unsafe {
            OpenProcess(
                PROCESS_SET_QUOTA | PROCESS_QUERY_LIMITED_INFORMATION,
                false,
                pid as u32,
            )
        } {
            let _ = unsafe { EmptyWorkingSet(handle) };
            let _ = unsafe { windows::Win32::Foundation::CloseHandle(handle) };
        }
    }
}

pub fn trim_memory() {
    let Ok(all_procs) = query_system_processes() else {
        return;
    };
    let root_pid = std::process::id() as usize;
    let mut atelier_pids = HashSet::from([root_pid]);
    loop {
        let old_len = atelier_pids.len();
        for p in &all_procs {
            if atelier_pids.contains(&p.parent_pid) {
                atelier_pids.insert(p.pid);
            }
        }
        if atelier_pids.len() == old_len {
            break;
        }
    }
    trim_pids(&atelier_pids);
}

#[tauri::command]
pub fn trim_atelier_memory() {
    trim_memory();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn query_system_processes_finds_current_process() {
        let procs = query_system_processes().expect("query should succeed");
        let my_pid = std::process::id() as usize;
        let me = procs.iter().find(|p| p.pid == my_pid);
        assert!(
            me.is_some(),
            "Current process must be present in NT process list"
        );
        let me = me.unwrap();
        assert!(me.ws_private > 0, "Private working set must be > 0");
    }

    #[test]
    fn sample_returns_accurate_memory() {
        let monitor = UsageMonitor::default();
        std::thread::sleep(std::time::Duration::from_millis(50));
        let usage = monitor.sample().expect("sample should succeed");
        assert!(usage.memory_bytes > 0, "Memory bytes must be > 0");
        assert!(
            usage.memory_bytes < 500 * 1024 * 1024,
            "Private working set must be reasonable: got {} MB",
            usage.memory_bytes / 1024 / 1024
        );
    }
}

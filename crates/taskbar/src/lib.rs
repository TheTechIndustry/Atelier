pub mod accent;
pub mod discovery;
pub mod dock;
pub mod position;
pub mod recovery;
pub mod style;
pub mod xaml;

use atelier_common::config::{TaskbarAppearance, TaskbarConfig, TaskbarStyle};
use atelier_common::error::Result;
use discovery::find_all_taskbars;
use dock::{apply_floating_dock, reset_floating_dock};
use recovery::TaskbarRecoveryListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use style::apply_taskbar_style;

#[derive(Clone)]
pub struct TaskbarManager {
    config: Arc<Mutex<TaskbarConfig>>,
    recovery: Arc<Mutex<Option<TaskbarRecoveryListener>>>,
    restore_on_drop: bool,
    appearance_applied: Arc<AtomicBool>,
    modified: Arc<AtomicBool>,
    enabled: Arc<AtomicBool>,
    position: Arc<position::NativePositionController>,
}

impl TaskbarManager {
    pub fn new(mut config: TaskbarConfig) -> Self {
        config.appearance.normalize();
        if matches!(config.appearance.position, 0 | 2) {
            config.floating_dock = false;
        }
        Self {
            config: Arc::new(Mutex::new(config)),
            recovery: Arc::new(Mutex::new(None)),
            restore_on_drop: true,
            appearance_applied: Arc::new(AtomicBool::new(false)),
            modified: Arc::new(AtomicBool::new(false)),
            enabled: Arc::new(AtomicBool::new(true)),
            position: Arc::new(position::NativePositionController::default()),
        }
    }

    pub fn passive(config: TaskbarConfig) -> Self {
        let mut manager = Self::new(config);
        manager.restore_on_drop = false;
        manager
    }

    pub fn apply_current_style(&self) -> Result<()> {
        if !self.enabled.load(Ordering::SeqCst) {
            return Ok(());
        }
        self.modified.store(true, Ordering::Relaxed);
        let config = {
            let lock = self
                .config
                .lock()
                .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))?;
            lock.clone()
        };

        self.position.apply(config.appearance.position)?;
        let mut buttons = config.appearance.clone();
        buttons.position = -1;
        let custom_buttons = buttons != TaskbarAppearance::default();
        let taskbars = find_all_taskbars();
        if taskbars.is_empty() {
            return Err(atelier_common::error::AtelierError::Platform(
                "Windows taskbar was not found. Start Explorer and try again.".to_string(),
            ));
        }
        for &hwnd in &taskbars {
            apply_taskbar_style(hwnd, config.style, config.hide_top_border)?;
            if custom_buttons || self.appearance_applied.load(Ordering::Relaxed) {
                if !discovery::has_xaml_background(hwnd) {
                    return Err(atelier_common::error::AtelierError::Platform(
                        "Native icon customization requires the Windows 11 XAML taskbar".into(),
                    ));
                }
                self.appearance_applied.store(true, Ordering::Relaxed);
                xaml::apply_native_appearance(hwnd, &config.appearance)?;
            }

            if config.floating_dock {
                apply_floating_dock(
                    hwnd,
                    config.floating_margin,
                    config.corner_radius,
                    config.vertical_gap,
                    config.hide_top_border,
                )?;
            } else {
                reset_floating_dock(hwnd, config.hide_top_border)?;
            }
        }
        self.appearance_applied
            .store(custom_buttons, Ordering::Relaxed);

        Ok(())
    }

    pub fn set_style(&self, style: TaskbarStyle) -> Result<()> {
        {
            let mut lock = self
                .config
                .lock()
                .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))?;
            lock.style = style;
        }
        self.apply_current_style()
    }

    pub fn config(&self) -> Result<TaskbarConfig> {
        self.config
            .lock()
            .map(|c| c.clone())
            .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))
    }

    pub fn set_config(&self, mut config: TaskbarConfig) -> Result<()> {
        config.appearance.normalize();
        if matches!(config.appearance.position, 0 | 2) {
            config.floating_dock = false;
        }
        let previous = {
            let mut lock = self
                .config
                .lock()
                .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))?;
            std::mem::replace(&mut *lock, config)
        };
        if let Err(error) = self.apply_current_style() {
            if let Ok(mut lock) = self.config.lock() {
                *lock = previous;
            }
            let _ = self.apply_current_style();
            return Err(error);
        }
        Ok(())
    }

    pub fn set_floating_dock(&self, enabled: bool, margin: i32) -> Result<()> {
        {
            let mut lock = self
                .config
                .lock()
                .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))?;
            lock.floating_dock = enabled;
            lock.floating_margin = if enabled && margin < 4 {
                16
            } else {
                margin.clamp(0, 800)
            };
        }
        self.apply_current_style()
    }

    pub fn set_corner_radius(&self, radius: i32) -> Result<()> {
        {
            let mut lock = self
                .config
                .lock()
                .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))?;
            lock.corner_radius = radius.clamp(0, 32);
        }
        self.apply_current_style()
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled.load(Ordering::SeqCst)
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<()> {
        if enabled == self.is_enabled() {
            return Ok(());
        }
        if !enabled {
            let previous = self.config()?;
            self.reset_all()?;
            *self
                .config
                .lock()
                .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))? =
                previous;
            self.enabled.store(false, Ordering::SeqCst);
        } else {
            self.enabled.store(true, Ordering::SeqCst);
            if let Err(error) = self.apply_current_style() {
                let saved = self.config()?;
                let _ = self.reset_all();
                if let Ok(mut config) = self.config.lock() {
                    *config = saved;
                }
                self.enabled.store(false, Ordering::SeqCst);
                return Err(error);
            }
        }
        Ok(())
    }

    pub fn reset_all(&self) -> Result<()> {
        if !self.modified.load(Ordering::Relaxed) {
            return Ok(());
        }
        self.set_config(TaskbarConfig {
            style: TaskbarStyle::Default,
            floating_dock: false,
            floating_margin: 0,
            corner_radius: 0,
            vertical_gap: 0,
            hide_top_border: false,
            appearance: Default::default(),
        })?;
        self.modified.store(false, Ordering::Relaxed);
        Ok(())
    }
    pub fn repair_icons(&self) -> Result<()> {
        for hwnd in find_all_taskbars() {
            if discovery::has_xaml_background(hwnd) {
                xaml::repair_native_icons(hwnd)?;
            }
        }
        Ok(())
    }

    pub fn start_recovery(&self) -> Result<()> {
        let self_clone = self.clone();
        let listener = TaskbarRecoveryListener::start(move || {
            if self_clone.modified.load(Ordering::Relaxed) {
                let _ = self_clone.apply_current_style();
            }
        })?;

        let mut lock = self
            .recovery
            .lock()
            .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))?;
        *lock = Some(listener);

        Ok(())
    }

    pub fn stop_recovery(&self) -> Result<()> {
        let mut lock = self
            .recovery
            .lock()
            .map_err(|e| atelier_common::error::AtelierError::Generic(e.to_string()))?;
        if let Some(mut listener) = lock.take() {
            listener.stop();
        }
        Ok(())
    }
}

impl Drop for TaskbarManager {
    fn drop(&mut self) {
        if self.restore_on_drop && Arc::strong_count(&self.config) <= 2 {
            let _ = self.reset_all();
        }
    }
}

#[cfg(test)]
mod enabled_tests {
    use super::*;
    #[test]
    fn disabled_manager_preserves_edits_without_applying() {
        let manager = TaskbarManager::passive(TaskbarConfig::default());
        manager.set_enabled(false).unwrap();
        let mut config = manager.config().unwrap();
        config.style = TaskbarStyle::Clear;
        manager.set_config(config.clone()).unwrap();
        assert!(!manager.is_enabled());
        assert_eq!(manager.config().unwrap(), config);
        assert!(!manager.modified.load(Ordering::SeqCst));
    }
}

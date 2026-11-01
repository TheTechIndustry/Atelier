use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;

// Console utilities must not create a visible terminal for a GUI installer.
fn hidden_command(program: &str) -> Command {
    let mut command = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    command
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstallerInfo {
    pub default_dir: String,
    pub current_version: String,
    pub is_already_installed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstallOptions {
    pub install_dir: String,
    pub create_desktop_shortcut: bool,
    pub create_start_menu_shortcut: bool,
    pub launch_on_startup: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub installed_path: String,
}

pub fn is_installer_mode() -> bool {
    let args: Vec<String> = std::env::args().collect();
    if args
        .iter()
        .any(|a| a == "--installer" || a == "--setup" || a == "-s")
    {
        return true;
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(name) = exe.file_name().and_then(|n| n.to_str()) {
            let lower = name.to_lowercase();
            if lower.contains("setup") || lower.contains("installer") {
                return true;
            }
        }
    }
    false
}

pub fn is_uninstall_mode() -> bool {
    let args: Vec<String> = std::env::args().collect();
    args.iter().any(|a| a == "--uninstall" || a == "-u")
}

pub fn default_install_dir() -> PathBuf {
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        PathBuf::from(local).join("Atelier")
    } else if let Some(userprofile) = std::env::var_os("USERPROFILE") {
        PathBuf::from(userprofile)
            .join("AppData")
            .join("Local")
            .join("Atelier")
    } else {
        PathBuf::from(r"C:\Atelier")
    }
}

#[tauri::command]
pub fn installer_get_info() -> InstallerInfo {
    let default_dir = default_install_dir();
    let is_already_installed = default_dir.join("Atelier.exe").exists();
    InstallerInfo {
        default_dir: default_dir.to_string_lossy().to_string(),
        current_version: env!("CARGO_PKG_VERSION").to_string(),
        is_already_installed,
    }
}

#[tauri::command]
pub fn installer_browse_folder(current: String) -> Option<String> {
    let script = format!(
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; \
        Add-Type -AssemblyName System.Windows.Forms; \
        $f = New-Object System.Windows.Forms.FolderBrowserDialog; \
        $f.Description = 'Select destination folder for Atelier'; \
        $f.SelectedPath = '{}'; \
        if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{ [Console]::Out.Write($f.SelectedPath) }}",
        current.replace('\'', "''")
    );
    let output = hidden_command("powershell")
        .args(["-NoProfile", "-NonInteractive", "-STA", "-Command", &script])
        .output()
        .ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Some(path);
        }
    }
    None
}

#[tauri::command]
pub fn installer_perform_install(options: InstallOptions) -> Result<InstallResult, String> {
    let target_dir = PathBuf::from(&options.install_dir);
    if !target_dir.is_absolute() || target_dir.parent().is_none() {
        return Err("Choose an absolute installation folder, not a drive root.".into());
    }
    std::fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create folder: {}", e))?;

    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to get current executable path: {}", e))?;
    let target_exe = target_dir.join("Atelier.exe");

    // Close running Atelier instance if updating
    if current_exe != target_exe {
        std::fs::copy(&current_exe, &target_exe)
            .map_err(|e| format!("Failed to copy Atelier.exe: {}", e))?;
    }

    let target_exe_str = target_exe.to_string_lossy().replace('\'', "''");
    let target_dir_str = target_dir.to_string_lossy().replace('\'', "''");

    // Shortcuts
    if options.create_desktop_shortcut {
        let script = format!(
            "$ws = New-Object -ComObject WScript.Shell; \
            $desktop = [Environment]::GetFolderPath('Desktop'); \
            $s = $ws.CreateShortcut(\"$desktop\\Atelier.lnk\"); \
            $s.TargetPath = '{}'; \
            $s.WorkingDirectory = '{}'; \
            $s.Description = 'Atelier Desktop Studio'; \
            $s.Save();",
            target_exe_str, target_dir_str
        );
        let _ = hidden_command("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .output();
    }

    if options.create_start_menu_shortcut {
        let script = format!(
            "$ws = New-Object -ComObject WScript.Shell; \
            $programs = [Environment]::GetFolderPath('Programs'); \
            $dir = \"$programs\\Atelier\"; \
            [System.IO.Directory]::CreateDirectory($dir) | Out-Null; \
            $s = $ws.CreateShortcut(\"$dir\\Atelier.lnk\"); \
            $s.TargetPath = '{}'; \
            $s.WorkingDirectory = '{}'; \
            $s.Description = 'Atelier Desktop Studio'; \
            $s.Save();",
            target_exe_str, target_dir_str
        );
        let _ = hidden_command("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .output();
    }

    // Startup
    if options.launch_on_startup {
        let _ = hidden_command("reg")
            .args([
                "add",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                "/v",
                "Atelier",
                "/t",
                "REG_SZ",
                "/d",
                &format!("\"{}\"", target_exe.to_string_lossy()),
                "/f",
            ])
            .output();
    }

    if !options.launch_on_startup {
        let _ = hidden_command("reg")
            .args([
                "delete",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                "/v",
                "Atelier",
                "/f",
            ])
            .output();
    }

    // Windows Add/Remove Programs uninstall registry entry
    let uninstall_key = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier";
    let _ = hidden_command("reg")
        .args([
            "add",
            uninstall_key,
            "/v",
            "DisplayName",
            "/t",
            "REG_SZ",
            "/d",
            "Atelier Desktop Studio",
            "/f",
        ])
        .output();
    let _ = hidden_command("reg")
        .args([
            "add",
            uninstall_key,
            "/v",
            "DisplayVersion",
            "/t",
            "REG_SZ",
            "/d",
            env!("CARGO_PKG_VERSION"),
            "/f",
        ])
        .output();
    let _ = hidden_command("reg")
        .args([
            "add",
            uninstall_key,
            "/v",
            "Publisher",
            "/t",
            "REG_SZ",
            "/d",
            "Atelier",
            "/f",
        ])
        .output();
    let _ = hidden_command("reg")
        .args([
            "add",
            uninstall_key,
            "/v",
            "InstallLocation",
            "/t",
            "REG_SZ",
            "/d",
            &target_dir.to_string_lossy(),
            "/f",
        ])
        .output();
    let _ = hidden_command("reg")
        .args([
            "add",
            uninstall_key,
            "/v",
            "DisplayIcon",
            "/t",
            "REG_SZ",
            "/d",
            &format!("\"{}\",0", target_exe.to_string_lossy()),
            "/f",
        ])
        .output();
    let _ = hidden_command("reg")
        .args([
            "add",
            uninstall_key,
            "/v",
            "UninstallString",
            "/t",
            "REG_SZ",
            "/d",
            &format!("\"{}\" --uninstall", target_exe.to_string_lossy()),
            "/f",
        ])
        .output();

    Ok(InstallResult {
        success: true,
        message: "Atelier installed successfully.".to_string(),
        installed_path: target_exe.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn installer_launch_app(
    installed_path: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let path = PathBuf::from(installed_path);
    Command::new(&path).spawn().map_err(|e| e.to_string())?;
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub fn installer_exit(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

pub fn run_uninstaller() {
    let _ = hidden_command("reg")
        .args([
            "delete",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            "Atelier",
            "/f",
        ])
        .output();
    let _ = hidden_command("reg")
        .args([
            "delete",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Atelier",
            "/f",
        ])
        .output();
    let _ = hidden_command("reg")
        .args(["delete", r"HKCU\Software\Atelier", "/f"])
        .output();

    let script = "\
        $desktop = [Environment]::GetFolderPath('Desktop'); \
        Remove-Item \"$desktop\\Atelier.lnk\" -ErrorAction SilentlyContinue; \
        $programs = [Environment]::GetFolderPath('Programs'); \
        Remove-Item \"$programs\\Atelier\\Atelier.lnk\" -Force -ErrorAction SilentlyContinue; \
        Remove-Item \"$programs\\Atelier\\Uninstall Atelier.lnk\" -Force -ErrorAction SilentlyContinue; \
        [System.IO.Directory]::Delete(\"$programs\\Atelier\", $false);";
    let _ = hidden_command("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output();

    // Wait for the running executable to exit before deleting it.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let quote = |p: &std::path::Path| p.to_string_lossy().replace('\'', "''");
            let script = format!(
                "Wait-Process -Id {} -ErrorAction SilentlyContinue; Remove-Item -LiteralPath '{}' -Force -ErrorAction SilentlyContinue; Remove-Item -LiteralPath '{}' -Force -ErrorAction SilentlyContinue; [System.IO.Directory]::Delete('{}', $false)",
                std::process::id(), quote(&exe), quote(&dir.join("atelier-core.exe")), quote(dir)
            );
            let _ = hidden_command("powershell")
                .args([
                    "-NoProfile",
                    "-NonInteractive",
                    "-WindowStyle",
                    "Hidden",
                    "-Command",
                    &script,
                ])
                .spawn();
        }
    }
}

pub fn run_installer() {
    let mut context = tauri::generate_context!();
    let effects = context
        .config()
        .app
        .windows
        .first()
        .and_then(|window| window.window_effects.clone());
    context.config_mut().app.windows.clear();
    let result = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            installer_get_info,
            installer_browse_folder,
            installer_perform_install,
            installer_launch_app,
            installer_exit,
        ])
        .setup(move |app| {
            let mut builder = tauri::WebviewWindowBuilder::new(
                app,
                "installer",
                tauri::WebviewUrl::App("installer.html".into()),
            )
            .title("Atelier Setup")
            .inner_size(680.0, 520.0)
            .resizable(false)
            .decorations(false)
            .transparent(true)
            .center();
            if let Some(effects) = effects {
                builder = builder.effects(effects);
            }
            let installer_win = builder.build()?;

            #[cfg(target_os = "windows")]
            {
                use windows::Win32::Foundation::HWND;
                use windows::Win32::Graphics::Dwm::{
                    DwmSetWindowAttribute, DWMWA_USE_IMMERSIVE_DARK_MODE,
                };
                if let Ok(raw_hwnd) = installer_win.hwnd() {
                    let dark: i32 = 1;
                    let _ = unsafe {
                        DwmSetWindowAttribute(
                            HWND(raw_hwnd.0 as _),
                            DWMWA_USE_IMMERSIVE_DARK_MODE,
                            &dark as *const _ as _,
                            std::mem::size_of::<i32>() as u32,
                        )
                    };
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                window.app_handle().exit(0);
            }
        })
        .run(context);
    if let Err(error) = result {
        eprintln!("Installer failed: {error}");
    }
}

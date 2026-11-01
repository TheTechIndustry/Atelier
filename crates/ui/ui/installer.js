const invoke = (cmd, args) => {
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  return Promise.reject(new Error("Installer connection unavailable. Restart setup."));
};

const $ = (id) => document.getElementById(id);

let installedPath = "";

async function init() {
  $("btn-close").onclick = () => invoke("installer_exit");
  $("btn-cancel").onclick = () => invoke("installer_exit");
  $("btn-finish-close").onclick = () => invoke("installer_exit");

  try {
    const info = await invoke("installer_get_info");
    if (info) {
      if (info.default_dir) $("install-dir").value = info.default_dir;
      if (info.current_version) $("app-version").textContent = "v" + info.current_version;
      if (info.is_already_installed) {
        $("btn-install").textContent = "Update Atelier";
      }
    }
  } catch (err) {
    console.error("Failed to get installer info:", err);
    alert("Could not start setup: " + err);
    $("btn-install").disabled = true;
  }

  $("btn-browse").onclick = async () => {
    try {
      const selected = await invoke("installer_browse_folder", { current: $("install-dir").value });
      if (selected) {
        $("install-dir").value = selected;
      }
    } catch (e) {
      console.error(e);
    }
  };

  $("btn-launch").onclick = async () => {
    try {
      await invoke("installer_launch_app", { installedPath: installedPath || $("install-dir").value + "\\Atelier.exe" });
    } catch (e) {
      console.error(e);
      alert("Could not launch Atelier: " + e);
    }
  };

  $("btn-install").onclick = startInstall;
}

async function startInstall() {
  const installDir = $("install-dir").value.trim();
  if (!installDir) {
    alert("Please enter a destination folder.");
    return;
  }

  $("view-options").classList.add("hidden");
  $("view-progress").classList.remove("hidden");

  const setProgress = (pct, status, subtext) => {
    $("progress-bar").style.width = pct + "%";
    if (status) $("progress-status").textContent = status;
    if (subtext) $("progress-subtext").textContent = subtext;
  };

  setProgress(15, "Initializing installation...", "Verifying directory permissions");
  await sleep(250);

  setProgress(40, "Deploying Atelier Studio...", "Extracting binaries and assets");
  await sleep(350);

  try {
    const options = {
      install_dir: installDir,
      create_desktop_shortcut: $("chk-desktop").checked,
      create_start_menu_shortcut: $("chk-start").checked,
      launch_on_startup: $("chk-startup").checked,
    };

    setProgress(65, "Configuring Windows Shell...", "Creating Desktop and Start Menu shortcuts");
    const result = await invoke("installer_perform_install", { options });
    if (!result?.success || !result.installed_path) throw new Error(result?.message || "Installation failed.");
    installedPath = result.installed_path;

    setProgress(85, "Registering System Integration...", "Setting startup and uninstaller hooks");
    await sleep(350);

    setProgress(100, "Installation Complete!", "Ready to launch");
    await sleep(250);

    $("view-progress").classList.add("hidden");
    $("view-finish").classList.remove("hidden");
    $("finish-desc").textContent = `Atelier has been successfully installed to "${installDir}". You can launch it now or find it on your Desktop and Start Menu.`;
  } catch (err) {
    alert("Installation failed: " + err);
    $("view-progress").classList.add("hidden");
    $("view-options").classList.remove("hidden");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

document.addEventListener("DOMContentLoaded", init);

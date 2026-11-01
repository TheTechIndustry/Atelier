const invoke = (cmd, args) => {
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  console.warn("Tauri invoke unavailable, falling back:", cmd, args);
  return Promise.resolve();
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
        $("btn-install").innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Update Atelier
        `;
      }
    }
  } catch (err) {
    console.error("Failed to get installer info:", err);
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
      await invoke("installer_exit");
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
    installedPath = result?.installed_path || (installDir + "\\Atelier.exe");

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

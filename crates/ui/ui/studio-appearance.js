'use strict';
(()=>{
  const invoke = window.__TAURI__?.core?.invoke;
  const $ = id => document.getElementById(id);
  const status = $('appearance-status');
  const previewCard = $('app-preview-card');
  let config = null, timer = null, saving = false, revision = 0, queued = false;

  const fields = [
    { id: 'app-enabled', key: 'enabled', type: 'checkbox' },
    { id: 'app-scope', key: 'scope', type: 'value' },
    { id: 'app-target-explorer', key: 'target_explorer', type: 'checkbox' },
    { id: 'app-target-dialogs', key: 'target_dialogs', type: 'checkbox' },
    { id: 'app-target-tools', key: 'target_tools', type: 'checkbox' },
    { id: 'app-target-terminal', key: 'target_terminal', type: 'checkbox' },
    { id: 'app-target-settings', key: 'target_settings', type: 'checkbox' },
    { id: 'app-target-flyouts', key: 'target_flyouts', type: 'checkbox' },
    { id: 'app-exclude-fullscreen', key: 'exclude_fullscreen_games', type: 'checkbox' },
    { id: 'app-excluded-apps', key: 'excluded_apps', type: 'array' },
    { id: 'app-backdrop', key: 'backdrop', type: 'value' },
    { id: 'app-opacity', key: 'opacity', type: 'number', output: '%' },
    { id: 'app-inactive-opacity', key: 'inactive_opacity', type: 'number', output: '%' },
    { id: 'app-corner-preference', key: 'corner_preference', type: 'value' },
    { id: 'app-border-color', key: 'border_color', type: 'color' },
    { id: 'app-border-width', key: 'border_width', type: 'number', output: 'px' },
    { id: 'app-titlebar-mode', key: 'titlebar_mode', type: 'value' },
    { id: 'app-titlebar-color', key: 'titlebar_color', type: 'color' }
  ];

  function paint(c) {
    if (!c) return;
    config = c;
    for (const f of fields) {
      const el = $(f.id);
      if (!el) continue;
      if (f.type === 'checkbox') el.checked = Boolean(c[f.key]);
      else if (f.type === 'color') {
        el.value = (c[f.key] && c[f.key].startsWith('#')) ? c[f.key] : '#ffffff';
      } else if (f.type === 'array') {
        el.value = Array.isArray(c[f.key]) ? c[f.key].join(', ') : '';
      } else {
        el.value = c[f.key] ?? '';
      }
      if (f.output) {
        const out = $(f.id + '-val');
        if (out) out.textContent = el.value + f.output;
      }
    }
    updatePreview();
  }

  function read() {
    const c = { ...(config || {}) };
    for (const f of fields) {
      const el = $(f.id);
      if (!el) continue;
      if (f.type === 'checkbox') c[f.key] = el.checked;
      else if (f.type === 'number') c[f.key] = Number(el.value);
      else if (f.type === 'array') {
        c[f.key] = el.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      } else if (f.type === 'color') {
        c[f.key] = c[f.key] === 'default' && el.value === '#ffffff' ? 'default' : el.value;
      } else {
        c[f.key] = el.value;
      }
    }
    return c;
  }

  function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(save, 200);
  }

  async function save() {
    if (!invoke) return;
    if (saving) { queued = true; return; }
    saving = true;
    const startRevision = revision;
    try {
      const next = read();
      const saved = await invoke('set_system_appearance', { config: next });
      if (revision === startRevision) paint(saved); else queued = true;
      if (status) status.textContent = '';
    } catch (e) {
      if (status) status.textContent = 'Could not update appearance: ' + String(e);
    } finally {
      saving = false;
      if (queued) { queued = false; save(); }
    }
  }

  function updatePreview(previewInactive = previewCard?.dataset.state === 'inactive') {
    if (!previewCard || !config) return;
    const corner = config.corner_preference === 'square' ? '0px' :
                   config.corner_preference === 'small_rounded' ? '6px' : '12px';
    previewCard.style.borderRadius = corner;

    const bWidth = config.border_width !== undefined ? config.border_width : 1;
    const bColor = (config.border_color && config.border_color !== 'default') ? config.border_color : 'rgba(255,255,255,0.25)';
    previewCard.style.border = bWidth > 0 ? `${bWidth}px solid ${bColor}` : 'none';

    const op = previewInactive ? (config.inactive_opacity || 92) : (config.opacity || 100);
    previewCard.style.opacity = (op / 100).toFixed(2);

    const titlebar = $('app-preview-titlebar');
    if (titlebar) {
      if (config.titlebar_mode === 'dark') {
        titlebar.style.background = '#1a1b24';
        titlebar.style.color = '#f0f0f5';
      } else if (config.titlebar_mode === 'light') {
        titlebar.style.background = '#f5f5f7';
        titlebar.style.color = '#1c1c1e';
      } else if (config.titlebar_mode === 'custom' && config.titlebar_color && config.titlebar_color !== 'default') {
        titlebar.style.background = config.titlebar_color;
        titlebar.style.color = '#ffffff';
      } else {
        titlebar.style.background = '';
        titlebar.style.color = '';
      }
    }

    const body = $('app-preview-body');
    if (body) {
      body.className = 'app-preview-body material-' + (config.backdrop || 'mica');
    }
  }

  for (const f of fields) {
    const el = $(f.id);
    if (!el) continue;
    el.addEventListener('input', () => {
      revision++;
      if (f.output) {
        const out = $(f.id + '-val');
        if (out) out.textContent = el.value + f.output;
      }
      if (f.type === 'color' && config) config[f.key] = el.value;
      config = read();
      updatePreview();
      scheduleSave();
    });
    el.addEventListener('change', () => {
      revision++;
      config = read();
      scheduleSave();
    });
  }

  const btnApply = $('app-apply-now');
  if (btnApply) btnApply.onclick = () => save();

  const btnRestore = $('app-restore-defaults');
  if (btnRestore) {
    btnRestore.onclick = async () => {
      if (!invoke) return;
      clearTimeout(timer);
      if (saving) { status.textContent = 'Please wait for the current change to finish.'; return; }
      queued = false;
      try {
        await invoke('restore_system_appearance');
        const c = await invoke('get_system_appearance');
        paint(c);
        if (status) status.textContent = '';
      } catch (e) {
        if (status) status.textContent = 'Could not restore: ' + String(e);
      }
    };
  }

  const btnSettings = $('app-open-windows-colors');
  if (btnSettings) {
    btnSettings.onclick = () => {
      if (invoke) invoke('open_windows_appearance_settings').catch(e => {
        if (status) status.textContent = String(e);
      });
    };
  }

  const borderDefaultBtn = $('app-border-color-default');
  if (borderDefaultBtn) {
    borderDefaultBtn.onclick = () => {
      const input = $('app-border-color');
      if (input) input.value = '#ffffff';
      if (config) config.border_color = 'default';
      revision++;
      updatePreview();
      scheduleSave();
    };
  }

  const titlebarDefaultBtn = $('app-titlebar-color-default');
  if (titlebarDefaultBtn) {
    titlebarDefaultBtn.onclick = () => {
      const input = $('app-titlebar-color');
      if (input) input.value = '#ffffff';
      if (config) config.titlebar_color = 'default';
      revision++;
      updatePreview();
      scheduleSave();
    };
  }

  const previewToggle = $('app-preview-toggle-active');
  if (previewToggle) {
    previewToggle.onclick = () => {
      const isInactive = previewCard?.dataset.state === 'inactive';
      if (isInactive) {
        previewCard.dataset.state = 'active';
        previewToggle.textContent = 'Preview Inactive Window';
        updatePreview(false);
      } else {
        previewCard.dataset.state = 'inactive';
        previewToggle.textContent = 'Preview Active Window';
        updatePreview(true);
      }
    };
  }

  if (invoke) {
    invoke('get_system_appearance').then(c => {
      paint(c);
      if (status) status.textContent = '';
    }).catch(e => {
      if (status) status.textContent = 'Could not load system appearance: ' + String(e);
    });
  } else {
    paint({
      enabled: false,
      scope: 'system_only',
      backdrop: 'mica',
      opacity: 100,
      inactive_opacity: 92,
      corner_preference: 'rounded',
      border_color: 'default',
      border_width: 1,
      titlebar_mode: 'system',
      titlebar_color: 'default',
      target_explorer: true,
      target_dialogs: true,
      target_tools: true,
      target_terminal: true,
      target_settings: true,
      target_flyouts: true,
      exclude_fullscreen_games: true,
      excluded_apps: ['cyberpunk2077.exe', 'steam.exe', 'discord.exe']
    });
  }
})();

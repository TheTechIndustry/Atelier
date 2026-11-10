'use strict';
(()=>{
  const invoke = window.__TAURI__?.core?.invoke;
  const $ = id => document.getElementById(id);
  const status = $('animation-status');
  const dockStatus = $('dock-animation-status');
  const previewWindow = $('anim-preview-window');
  let config = null, timer = null, saving = false, revision = 0, queued = false;

  const fields = [
    { id: 'anim-enabled', key: 'enabled', type: 'checkbox' },
    { id: 'anim-window-transitions', key: 'window_transitions', type: 'checkbox' },
    { id: 'anim-window-effect', key: 'window_effect', type: 'value' },
    { id: 'anim-window-duration', key: 'window_duration', type: 'number', output: 'ms' },
    { id: 'anim-window-easing', key: 'window_easing', type: 'value' },
    { id: 'anim-native-min-max', key: 'native_min_max_animation', type: 'checkbox' },
    { id: 'anim-dock-bounce', key: 'dock_bounce', type: 'value' },
    { id: 'anim-dock-bounce-count', key: 'dock_bounce_count', type: 'number', output: 'x' },
    { id: 'anim-dock-hover-wave', key: 'dock_hover_wave', type: 'checkbox' },
    { id: 'anim-dock-hover-scale', key: 'dock_hover_scale', type: 'number', output: '%' },
    { id: 'anim-dock-click-feedback', key: 'dock_click_feedback', type: 'value' }
  ];

  function paint(c) {
    if (!c) return;
    config = c;
    for (const f of fields) {
      const el = $(f.id);
      if (!el) continue;
      if (f.type === 'checkbox') el.checked = Boolean(c[f.key]);
      else el.value = c[f.key];
      if (f.output) {
        const out = $(f.id + '-val');
        if (out) out.textContent = el.value + f.output;
      }
    }
    updatePreviewStyles();
    window.dispatchEvent(new CustomEvent('dock-animation-preview', {detail: c}));
  }

  function read() {
    const c = { ...(config || {}) };
    for (const f of fields) {
      const el = $(f.id);
      if (!el) continue;
      c[f.key] = f.type === 'checkbox' ? el.checked : f.type === 'number' ? Number(el.value) : el.value;
    }
    return c;
  }

  function scheduleSave() {
    clearTimeout(timer);
    timer = setTimeout(save, 160);
  }

  async function save() {
    if (!invoke) return;
    if (saving) { queued = true; return; }
    saving = true;
    const startRevision = revision;
    try {
      const next = read();
      const saved = await invoke('set_animations_config', { config: next });
      if (revision === startRevision) paint(saved); else queued = true;
      if (status) status.textContent = '';
      if (dockStatus) dockStatus.textContent = '';
    } catch (e) {
      if (status) status.textContent = String(e);
      if (dockStatus) dockStatus.textContent = String(e);
    } finally {
      saving = false;
      if (queued) { queued = false; save(); }
    }
  }

  function updatePreviewStyles() {
    if (!previewWindow || !config) return;
    const dur = (config.window_duration || 240) + 'ms';
    const easing = config.window_easing === 'spring' ? 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' :
                   config.window_easing === 'snappy' ? 'cubic-bezier(0.2, 0.9, 0.2, 1)' :
                   config.window_easing === 'linear' ? 'linear' : 'cubic-bezier(0.16, 1, 0.3, 1)';
    previewWindow.style.setProperty('--anim-duration', dur);
    previewWindow.style.setProperty('--anim-easing', easing);
  }

  let isWindowMinimized = false, animationRevision = 0;

  function playWindowAnimation(type) {
    if (!previewWindow || !config) return;
    const currentAnimation = ++animationRevision;
    updatePreviewStyles();
    previewWindow.className = 'anim-window';
    void previewWindow.offsetWidth;

    let effect = config.window_effect || 'dock_expand';
    if (effect === 'macos_scale') effect = 'dock_expand';

    if (type === 'minimize') {
      isWindowMinimized = true;
      previewWindow.classList.add('anim-minimizing', 'effect-' + effect);
      setTimeout(() => {
        if (currentAnimation === animationRevision && isWindowMinimized) previewWindow.classList.add('is-minimized');
      }, (config.window_duration || 240));
    } else {
      isWindowMinimized = false;
      previewWindow.classList.remove('is-minimized');
      previewWindow.classList.add('anim-restoring', 'effect-' + effect);
    }
  }

  function setupPreviewEvents() {
    const btnRestore = $('anim-test-restore');
    const btnMinimize = $('anim-test-minimize');
    if (btnRestore) btnRestore.onclick = () => playWindowAnimation('restore');
    if (btnMinimize) btnMinimize.onclick = () => playWindowAnimation('minimize');

    const dockIcons = document.querySelectorAll('.anim-mini-icon');
    dockIcons.forEach(icon => {
      icon.onclick = () => {
        const feedback = config?.dock_click_feedback || 'bounce';
        const count = config?.dock_bounce_count || 2;
        icon.style.setProperty('--bounce-repeat', count);
        icon.classList.remove('anim-jump', 'anim-press', 'anim-pulse');
        void icon.offsetWidth;
        if (feedback === 'bounce') icon.classList.add('anim-jump');
        else if (feedback === 'press') icon.classList.add('anim-press');
        else if (feedback === 'pulse') icon.classList.add('anim-pulse');
      };
    });

    const dockBar = $('anim-mini-dock');
    if (dockBar) {
      dockBar.onpointermove = (e) => {
        if (!config?.dock_hover_wave) return;
        const rect = dockBar.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const maxScale = (config?.dock_hover_scale || 135) / 100;

        dockIcons.forEach(icon => {
          const iconCenter = icon.offsetLeft + icon.offsetWidth / 2;
          const dist = Math.abs(mouseX - iconCenter);
          const influence = Math.max(0, 1 - dist / 90);
          const scale = 1 + (maxScale - 1) * Math.sin(influence * Math.PI / 2);
          icon.style.transform = `scale(${scale.toFixed(3)})`;
        });
      };
      dockBar.onpointerleave = () => {
        dockIcons.forEach(icon => icon.style.transform = '');
      };
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
      config = read();
      updatePreviewStyles();
      if (['window_effect', 'window_duration', 'window_easing'].includes(f.key)) playWindowAnimation('restore');
      window.dispatchEvent(new CustomEvent('dock-animation-preview', {detail: config}));
      scheduleSave();
    });
    el.addEventListener('change', () => {
      revision++;
      config = read();
      window.dispatchEvent(new CustomEvent('dock-animation-preview', {detail: config}));
      scheduleSave();
    });
  }

  setupPreviewEvents();

  if (invoke) {
    invoke('get_animations_config').then(c => {
      paint(c);
      if (status) status.textContent = '';
      if (dockStatus) dockStatus.textContent = '';
    }).catch(e => {
      if (status) status.textContent = String(e);
      if (dockStatus) dockStatus.textContent = String(e);
    });
  } else {
    paint({
      enabled: true,
      window_transitions: true,
      window_effect: 'dock_expand',
      window_duration: 240,
      window_easing: 'spring',
      native_min_max_animation: true,
      dock_bounce: 'launch_only',
      dock_bounce_count: 2,
      dock_hover_wave: true,
      dock_hover_scale: 135,
      dock_click_feedback: 'bounce'
    });
  }
})();

'use strict';
(() => {
  const invoke = window.__TAURI__.core.invoke;
  const cpu = document.getElementById('cpu');
  const memory = document.getElementById('memory');
  const error = document.getElementById('error');
  let timer, generation = 0;
  async function update(run) {
    if (document.hidden || run !== generation) return;
    try {
      const usage = await invoke('tray_usage');
      if (run !== generation) return;
      cpu.textContent = usage.cpu_percent == null ? '—' : `${usage.cpu_percent.toFixed(1)}%`;
      const mb = usage.memory_bytes / 1048576;
      memory.textContent = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
    } catch (_) {
      if (run !== generation) return;
      cpu.textContent = memory.textContent = '—';
    }
    if (!document.hidden && run === generation) timer = setTimeout(() => update(run), 1000);
  }
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer); generation++;
    if (!document.hidden) { error.textContent = ''; update(generation); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.__TAURI__.window.getCurrentWindow().hide();
  });
  document.addEventListener('click', async e => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'reset' && !window.confirm('Restore Windows defaults and reset the Atelier dock?')) return;
    button.disabled = true; error.textContent = '';
    try { await invoke('tray_action', { action: button.dataset.action }); }
    catch (err) { error.textContent = `Could not complete action: ${err}`; }
    finally { button.disabled = false; }
  });
  update(generation);
})();

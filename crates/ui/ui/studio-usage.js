'use strict';
(() => {
  const cpu = document.getElementById('app-usage-cpu');
  const memory = document.getElementById('app-usage-memory');
  if (!cpu || !memory) return;

  let timer, generation = 0;

  async function update(run) {
    if (document.hidden) return;
    const invoke = window.__TAURI__?.core?.invoke;
    if (!invoke) {
      if (run === generation) timer = setTimeout(() => update(run), 100);
      return;
    }

    try {
      const usage = await invoke('atelier_usage');
      if (run !== generation) return;

      if (usage.cpu_percent != null) {
        cpu.textContent = `${usage.cpu_percent.toFixed(1)}%`;
      } else if (!cpu.textContent || cpu.textContent === '—') {
        cpu.textContent = '0.0%';
      }

      if (usage.memory_bytes > 0) {
        const mb = usage.memory_bytes / (1024 * 1024);
        memory.textContent = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
      }
    } catch (_) {
      if (run !== generation) return;
      if (!cpu.textContent) cpu.textContent = '—';
      if (!memory.textContent) memory.textContent = '—';
    }

    if (!document.hidden && run === generation) {
      timer = setTimeout(() => update(run), 1000);
    }
  }

  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    generation++;
    if (!document.hidden) update(generation);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => update(generation));
  } else {
    update(generation);
  }
})();

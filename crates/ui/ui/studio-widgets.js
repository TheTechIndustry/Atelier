(()=>{
  const list = document.getElementById('widget-list');
  const status = document.getElementById('widget-status');
  const searchInput = document.getElementById('widget-search');
  const countBadge = document.getElementById('widgets-count');
  const invoke = window.__TAURI__?.core?.invoke;
  let dockWidgets = [];

  const layout = document.getElementById('widgets-layout');
  const detailPanel = document.getElementById('widget-detail');
  const detailContent = document.getElementById('widget-detail-content');
  const detailClose = document.getElementById('widget-detail-close');
  const detailBadge = document.getElementById('widget-detail-badge');
  const detailPreview = document.getElementById('widget-detail-preview');
  const customSection = document.getElementById('widget-detail-custom-section');
  const customFields = document.getElementById('widget-detail-custom-fields');
  const appearanceFields = document.getElementById('widget-detail-appearance-fields');
  const colorPresetsWrap = document.getElementById('widget-color-presets');
  const actionsSection = document.getElementById('widget-detail-actions-section');

  const catalog = window.WIDGETS_CATALOG || [];
  const categories = window.WIDGET_CATEGORIES || [
    { id: 'ai', name: 'AI Limits', desc: 'How much of your AI plan is left, read from the tools you already use.' },
    { id: 'productivity', name: 'Productivity', desc: 'Screen time, focus timers, a stopwatch, tasks, notes and your next event.' },
    { id: 'dev', name: 'Dev Life', desc: 'GitHub commits, PRs, CI builds, Vercel deployments and package metrics.' },
    { id: 'revenue', name: 'Revenue & SaaS', desc: 'Stripe MRR, Lemon Squeezy sales, Shopify orders and churn rates.' },
    { id: 'finance', name: 'Crypto & Stocks', desc: 'Live Bitcoin, Ethereum, Solana prices and market metrics.' },
    { id: 'system', name: 'System & Stats', desc: 'Live CPU, memory, GPU temperatures, disk space and network speeds.' },
    { id: 'controls', name: 'Quick Controls', desc: 'One-click audio volume, microphone mute, recycle bin and system controls.' },
    { id: 'utilities', name: 'Media & Feeds', desc: 'Music playback, Hacker News top stories, weather and world clocks.' }
  ];
  const icons = window.WIDGET_ICONS || {};

  const legacyNames = {
    clock: 'Clock', calendar: 'Calendar', system: 'System Monitor',
    media: 'Now Playing', battery: 'Battery', notes: 'Notes',
    weather: 'Weather', photo: 'Photo Frame', countdown: 'Countdown'
  };
  const legacyDescriptions = {
    clock: 'Local time and date with customizable 24h & seconds',
    calendar: 'Today and current month calendar grid',
    system: 'Live CPU, RAM, GPU, Disk and Network metrics',
    media: 'Current Windows media session (Spotify, YouTube, Music)',
    battery: 'Battery charge level and AC power status',
    notes: 'Sticky memo on your desktop with quick text',
    weather: 'Live conditions, temperature and 7-day forecast',
    photo: 'Display a favorite photo, artwork, or animated GIF',
    countdown: 'Days until a deadline, birthday, or milestone'
  };
  const legacyOptions = {
    clock: [['show_date','Show date'],['show_seconds','Show seconds'],['hour_24','24-hour clock']],
    calendar: [['show_month','Show month grid'],['show_weekday','Show weekday']],
    system: [['show_cpu','CPU usage'],['show_memory','Memory usage'],['show_gpu','GPU usage'],['show_network','Network traffic'],['show_disk','System drive usage'],['show_details','Show details']],
    media: [['show_artist','Show artist'],['show_album','Show album'],['show_status','Show playback status'],['show_artwork','Show artwork']],
    battery: [['show_status','Show power status']],
    notes: [],
    weather: [['fahrenheit','Fahrenheit'],['show_forecast','7-day forecast']],
    photo: [],
    countdown: []
  };

  const stylePresets = [
    { id: 'dark', name: 'Dark Obsidian', bg: '#161720', fg: '#ffffff', border: '#2a2b36', borderWidth: 1, opacity: 95 },
    { id: 'light', name: 'iOS White', bg: '#ffffff', fg: '#111827', border: '#e2e8f0', borderWidth: 1, opacity: 98 },
    { id: 'glass', name: 'iOS Crystal Glass', bg: '#ffffff', fg: '#ffffff', border: 'rgba(255, 255, 255, 0.35)', borderWidth: 1.5, opacity: 35 },
    { id: 'ghost', name: 'Transparent Ghost', bg: '#000000', fg: '#ffffff', border: 'rgba(255, 255, 255, 0.4)', borderWidth: 1, opacity: 0 },
    { id: 'slate', name: 'Frosted Slate', bg: '#1f2230', fg: '#ffffff', border: '#33384c', borderWidth: 1, opacity: 80 },
    { id: 'midnight', name: 'Midnight', bg: '#0b0c10', fg: '#ffffff', border: '#1e2029', borderWidth: 1, opacity: 95 }
  ];

  function getCapsuleAccent(k, a = 1) {
    if (k.includes('pomodoro')) return `rgba(239, 68, 68, ${a})`;
    if (k.includes('stopwatch')) return `rgba(249, 115, 22, ${a})`;
    return `rgba(56, 189, 248, ${a})`;
  }

  function applyWidgetStyling(el, c, k) {
    if (!el || !c) return;
    const isCapsule = ['pomodoro','timer','stopwatch','prod_pomodoro','prod_timer','prod_stopwatch'].includes(k);
    const opacity = c.custom?.opacity !== undefined ? Number(c.custom.opacity) : (c.opacity !== undefined ? Number(c.opacity) : 95);
    const alpha = Math.max(0, Math.min(100, opacity)) / 100;
    const radius = c.radius !== undefined ? Number(c.radius) : 22;
    const fg = c.foreground || '#ffffff';
    const preset = c.custom?.style_preset || (c.background === '#ffffff' ? 'light' : (c.opacity === 0 || c.background === 'transparent' ? 'ghost' : 'dark'));

    el.style.borderRadius = radius + 'px';
    el.style.boxSizing = 'border-box';
    el.style.color = fg;

    if (c.custom?.tag_color) {
      el.style.setProperty('--widget-tag-color', c.custom.tag_color);
    } else {
      el.style.removeProperty('--widget-tag-color');
    }
    if (c.custom?.accent_color) {
      el.style.setProperty('--widget-accent-color', c.custom.accent_color);
    } else {
      el.style.removeProperty('--widget-accent-color');
    }

    if (preset === 'light' || c.background === '#ffffff') {
      el.style.background = `rgba(255, 255, 255, ${Math.max(0.04, alpha)})`;
      el.style.backdropFilter = 'blur(20px)';
      el.style.webkitBackdropFilter = 'blur(20px)';
      el.style.boxShadow = '0 6px 24px rgba(0, 0, 0, 0.12)';
    } else if (preset === 'ghost' || c.background === 'transparent' || opacity === 0) {
      el.style.background = `rgba(0, 0, 0, ${alpha * 0.1})`;
      el.style.backdropFilter = 'none';
      el.style.webkitBackdropFilter = 'none';
      el.style.boxShadow = 'none';
    } else if (preset === 'glass' || preset === 'crystal' || c.background === 'glass') {
      el.style.background = `rgba(255, 255, 255, ${Math.max(0.04, alpha * 0.22)})`;
      el.style.backdropFilter = 'blur(24px) saturate(180%)';
      el.style.webkitBackdropFilter = 'blur(24px) saturate(180%)';
      el.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.4)';
    } else {
      let hex = c.background || '#161720';
      if (hex === '#f8f9fc') hex = '#161720';
      let r = 22, g = 23, b = 32;
      if (typeof hex === 'string' && hex.startsWith('#')) {
        const full = hex.length === 4 ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
        r = parseInt(full.slice(1, 3), 16) || 22;
        g = parseInt(full.slice(3, 5), 16) || 23;
        b = parseInt(full.slice(5, 7), 16) || 32;
      }
      el.style.background = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      el.style.backdropFilter = 'blur(16px)';
      el.style.webkitBackdropFilter = 'blur(16px)';
      el.style.boxShadow = isCapsule ? '0 4px 20px rgba(0, 0, 0, 0.35)' : '0 4px 18px rgba(0, 0, 0, 0.3)';
    }

    const customBorderWidth = c.custom?.border_width != null ? Number(c.custom.border_width) : null;
    const customBorderColor = c.custom?.border_color;
    const finalBorderWidth = customBorderWidth != null ? customBorderWidth : (isCapsule ? 2 : 1);

    if (finalBorderWidth === 0) {
      el.style.border = 'none';
    } else {
      let finalBorderColor = customBorderColor;
      if (!finalBorderColor) {
        if (isCapsule) finalBorderColor = getCapsuleAccent(k, Math.max(0.6, alpha));
        else if (preset === 'light') finalBorderColor = 'rgba(0, 0, 0, 0.12)';
        else if (preset === 'ghost') finalBorderColor = `rgba(255, 255, 255, ${Math.max(0.2, alpha * 0.7)})`;
        else if (preset === 'glass') finalBorderColor = 'rgba(255, 255, 255, 0.35)';
        else finalBorderColor = 'rgba(255, 255, 255, 0.1)';
      }
      el.style.border = `${finalBorderWidth}px solid ${finalBorderColor}`;
    }
  }

  function widgetAuthInfo(entry, c) {
    if (!entry?.fields) return { required: false, authorized: true, keyName: '', fieldKey: '' };
    const authField = entry.fields.find(f => 
      f.type === 'password' || 
      ['api_key', 'token', 'access_token', 'session_token', 'secret'].includes(f.key) ||
      f.auth === true
    );
    if (!authField) return { required: false, authorized: true, keyName: '', fieldKey: '' };

    const val = c.custom?.[authField.key] || c[authField.key];
    const isAccountConnected = c.custom?.auth_provider === 'antigravity' || c.custom?.auth_provider === 'codex' || c.custom?.auth_provider === 'account';
    const authorized = isAccountConnected || (typeof val === 'string' && val.trim().length > 0 && !val.startsWith('session_auth_'));
    return {
      required: true,
      authorized,
      isAccountConnected,
      provider: c.custom?.auth_provider || null,
      accountName: c.custom?.account_name || (c.custom?.auth_provider === 'antigravity' ? 'Antigravity Account' : (c.custom?.auth_provider === 'codex' ? 'OpenAI Codex' : '')),
      keyName: authField.label || 'API Key',
      fieldKey: authField.key
    };
  }

  let configs = [];
  let selectedKind = null;
  let pending = Promise.resolve();
  let timers = {};
  let previewUpdates = {};
  let searchQuery = '';

  function save(c) {
    clearTimeout(timers[c.kind]);
    timers[c.kind] = setTimeout(() => {
      const copy = structuredClone(c);
      status.textContent = 'Saving…';
      pending = pending
        .catch(() => {})
        .then(() => invoke('set_widget', { config: copy }))
        .then(() => { status.textContent = ''; })
        .catch(e => { status.textContent = 'Could not update widget: ' + String(e); });
    }, 180);
  }

  function setDetail(open) {
    if (layout) layout.classList.toggle('has-selection', open);
    if (detailPanel) {
      detailPanel.setAttribute('aria-hidden', String(!open));
      detailPanel.inert = !open;
    }
    if (open) {
      if (detailContent) detailContent.hidden = false;
    } else {
      selectedKind = null;
      updateSelectedTiles();
    }
  }

  function updateSelectedTiles() {
    for (const card of list.querySelectorAll('.widget-option')) {
      const isSel = card.dataset.kind === selectedKind;
      card.classList.toggle('selected', isSel);
    }
  }

  function renderWidgetPreview(wrap, c, entry) {
    wrap.replaceChildren();
    wrap.className = 'widget-preview';
    applyWidgetStyling(wrap, c, c.kind);

    if (c.livePreviewData) {
      const metric = c.livePreviewData;
      const iconSvg = icons[entry?.iconKey] || icons.generic;

      if (metric.items && metric.items.length > 0) {
        const rowsHtml = metric.items.map(it => `
          <div class="luma-plan-row">
            <span>${it.label}</span>
            ${it.bar != null ? `<div class="luma-slim-bar"><div class="luma-slim-bar-fill" style="width:${Math.min(100, Math.max(0, it.bar))}%;${it.color ? 'background:' + it.color : ''}"></div></div>` : '<div></div>'}
            <span class="luma-plan-meta">${it.sub || ''}</span>
            <span class="luma-plan-pct" ${it.color ? 'style="color:' + it.color + '"' : ''}>${it.value || ''}</span>
          </div>`).join('');
        wrap.innerHTML = `
          <div class="luma-row-card">
            <div class="luma-icon">${iconSvg}</div>
            <div class="luma-plan-list">${rowsHtml}</div>
          </div>`;
        return;
      }

      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${iconSvg}</div>
          <div class="luma-main-content">
            <div class="luma-top-meta">
              <span class="luma-title">${metric.title || entry?.name || c.kind}</span>
              ${metric.badge ? `<span class="widget-badge" style="font-size:8px;padding:1px 5px">${metric.badge}</span>` : metric.change ? `<span class="luma-sub" style="color:${metric.change.startsWith('+') ? '#22c55e' : '#ef4444'}">${metric.change}</span>` : `<span class="luma-sub">${metric.detail || ''}</span>`}
            </div>
            ${metric.value ? `<div class="luma-big-val">${metric.value}</div>` : ''}
            ${metric.progress != null ? `<div class="luma-slim-bar"><div class="luma-slim-bar-fill" style="width:${Math.min(100, Math.max(0, metric.progress))}%;background:${metric.barColor || '#22c55e'}"></div></div>` : ''}
            ${metric.sub ? `<div class="luma-sub">${metric.sub}</div>` : ''}
          </div>
        </div>`;
      return;
    }

    const t = entry?.template || c.kind;

    if (t === 'pomodoro' || t === 'timer' || t === 'stopwatch') {
      wrap.classList.add(t);
      const tag = t === 'pomodoro' ? 'Focus 1/4' : t === 'timer' ? (c.custom?.label || 'Timer') : (c.custom?.label || 'Stopwatch');
      const digits = t === 'pomodoro' ? '25:00' : t === 'timer' ? '1:00' : '0:00';
      const tagColor = c.custom?.tag_color || (t === 'pomodoro' ? '#ef4444' : t === 'timer' ? '#38bdf8' : '#f97316');
      const btnColor = c.custom?.accent_color || (t === 'pomodoro' ? '#ef4444' : t === 'timer' ? '#3b82f6' : '#f97316');
      wrap.innerHTML = `
        <div class="luma-capsule ${t}">
          <div class="luma-cap-left">
            <div class="luma-cap-tag" style="color:${tagColor}">${tag}</div>
            <div class="luma-cap-digits" style="color:${c.foreground || '#ffffff'}">${digits}</div>
          </div>
          <div class="luma-cap-controls">
            ${t === 'pomodoro' ? '<button class="luma-btn-skip" type="button" aria-label="Skip"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg></button>' : ''}
            <button class="luma-btn-play" type="button" aria-label="Play" style="background:${btnColor}"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
          </div>
        </div>`;
      return;
    }

    if (t === 'screentime') {
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${icons.screentime_watch || icons.generic}</div>
          <div class="luma-main-content">
            <div class="luma-sub">Screen Time</div>
            <div class="luma-big-val">1h 38m</div>
          </div>
          <div class="luma-chart-bars">
            <div class="luma-chart-bar" style="height:8px"></div>
            <div class="luma-chart-bar" style="height:14px"></div>
            <div class="luma-chart-bar" style="height:6px"></div>
            <div class="luma-chart-bar" style="height:20px"></div>
            <div class="luma-chart-bar" style="height:16px"></div>
            <div class="luma-chart-bar" style="height:24px"></div>
            <div class="luma-chart-bar" style="height:12px"></div>
          </div>
        </div>`;
      return;
    }

    if (t === 'todos') {
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div style="width:30px;height:30px;border-radius:50%;border:2px solid #38bdf8;display:grid;place-items:center;font-size:11px;font-weight:700">1</div>
          <div class="luma-main-content" style="flex-direction:row;align-items:center;gap:8px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            <span class="luma-title">${c.custom?.task || 'Ship the 0.1.11 update'}</span>
          </div>
        </div>`;
      return;
    }

    if (t === 'notes_memo' || c.kind === 'notes') {
      const noteTitle = c.notes ? (c.notes.split('\n')[0].slice(0, 24) || 'Sticky Note') : 'Meeting notes';
      const noteDesc = c.notes ? (c.notes.split('\n')[1] || 'Desktop note') : 'Discuss launch timeline and assign...';
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${icons.notes_pad || icons.generic}</div>
          <div class="luma-main-content">
            <div class="luma-title">${noteTitle}</div>
            <div class="luma-sub">${noteDesc}</div>
          </div>
          <div class="luma-btn-skip">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        </div>`;
      return;
    }

    if (t === 'calendar_event' || c.kind === 'calendar') {
      const now = new Date();
      const mStr = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(now).toUpperCase();
      const dNum = now.getDate();
      const wStr = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(now);
      if (t === 'calendar_event') {
        wrap.innerHTML = `
          <div class="luma-row-card">
            <div class="luma-cal-badge">
              <div class="luma-cal-badge-top">${mStr}</div>
              <div class="luma-cal-badge-day">${dNum}</div>
            </div>
            <div class="luma-main-content">
              <div class="luma-top-meta"><span style="display:flex;align-items:center;gap:6px;font-weight:600;"><svg width="10" height="10" viewBox="0 0 24 24" fill="#3b82f6"><rect width="24" height="24" rx="4"/></svg>Design review</span></div>
              <div class="luma-sub">4:05 PM · in 23 min</div>
            </div>
          </div>`;
      } else {
        wrap.innerHTML = `
          <div class="luma-row-card">
            <div class="luma-cal-badge">
              <div class="luma-cal-badge-top">${mStr}</div>
              <div class="luma-cal-badge-day">${dNum}</div>
            </div>
            <div class="luma-main-content">
              <div class="luma-title">${wStr}</div>
              <div class="luma-sub">Current month calendar</div>
            </div>
          </div>`;
      }
      return;
    }

    if (t === 'currency') {
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-main-content">
            <div class="luma-sub">${c.custom?.amount || entry.amount || '500'}</div>
            <div class="luma-big-val">${entry.converted || '74,44'}</div>
          </div>
          <div class="luma-main-content" style="align-items:flex-end">
            <div class="luma-sub">${c.custom?.from || entry.from || 'CNY'}</div>
            <div style="opacity:0.6"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l-4-4M17 20l4-4"/></svg></div>
            <div class="luma-sub">${c.custom?.to || entry.to || 'USD'}</div>
          </div>
        </div>`;
      return;
    }

    if (t === 'timeline') {
      wrap.innerHTML = `
        <div class="luma-card">
          <div class="luma-top-meta">
            <span class="luma-sub">Tue 20 Oct</span>
            <span class="luma-sub">6h 5m on the PC · 4 rounds</span>
          </div>
          <div class="luma-timeline-bar">
            <div class="luma-tl-seg" style="width:15%;background:#f59e0b"></div>
            <div class="luma-tl-seg" style="width:8%;background:#3b82f6"></div>
            <div class="luma-tl-seg" style="width:22%;background:#10b981"></div>
            <div class="luma-tl-seg" style="width:12%;background:#ec4899"></div>
            <div class="luma-tl-seg" style="width:18%;background:#6366f1"></div>
            <div class="luma-tl-seg" style="width:25%;background:#06b6d4"></div>
          </div>
        </div>`;
      return;
    }

    if (t === 'ai_usage' || t === 'ai_single_bar' || t === 'ai_stat') {
      const iconSvg = icons[entry?.iconKey] || icons.generic;
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${iconSvg}</div>
          <div class="luma-main-content">
            <div class="luma-top-meta">
              <span class="luma-title">${entry?.title || 'Session'}</span>
              <span class="luma-sub">${entry?.meta || ''}</span>
            </div>
            ${entry?.value ? `<div class="luma-big-val">${entry.value}</div>` : ''}
            ${entry?.pct != null ? `<div class="luma-slim-bar"><div class="luma-slim-bar-fill" style="width:${entry.pct}%;background:${entry.accent || '#22c55e'}"></div></div>` : ''}
          </div>
        </div>`;
      return;
    }

    if (t === 'ai_plan') {
      const iconSvg = icons[entry?.iconKey] || icons.generic;
      const rowsHtml = (entry?.rows || []).map(r => `
        <div class="luma-plan-row">
          <span>${r.label}</span>
          <div class="luma-slim-bar"><div class="luma-slim-bar-fill" style="width:${r.pct}%"></div></div>
          <span class="luma-plan-meta">${r.time}</span>
          <span class="luma-plan-pct">${r.pct}%</span>
        </div>`).join('');
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${iconSvg}</div>
          <div class="luma-plan-list">
            ${rowsHtml}
            ${entry?.footer ? `<div class="luma-sub">${entry.footer}</div>` : ''}
          </div>
        </div>`;
      return;
    }

    if (t === 'key_value_list') {
      const iconSvg = icons[entry?.iconKey] || icons.generic;
      const itemsHtml = (entry?.items || []).map(it => `
        <div class="luma-top-meta">
          <span class="luma-sub">${it.label}</span>
          <span class="luma-title">${it.value}</span>
        </div>`).join('');
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${iconSvg}</div>
          <div class="luma-plan-list">${itemsHtml}</div>
        </div>`;
      return;
    }

    if (t === 'minimal_clock' || c.kind === 'clock') {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: c.show_seconds ? '2-digit' : undefined, hour12: !c.hour_24 }).format(now);
      const dateStr = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(now);
      wrap.innerHTML = `
        <div class="luma-row-card" style="justify-content:space-between">
          <div>
            <div class="luma-cap-digits" style="font-size:24px">${timeStr}</div>
            <div class="luma-sub" style="margin-top:2px">${dateStr}</div>
          </div>
          <div class="luma-icon" style="opacity:0.6">${icons.timer || ''}</div>
        </div>`;
      return;
    }

    if (c.kind === 'system') {
      wrap.innerHTML = `
        <div class="luma-row-card" style="justify-content:space-around">
          <div style="display:flex;align-items:center;gap:7px">
            <div style="width:28px;height:28px;border-radius:50%;border:2px solid #54c777;display:grid;place-items:center;font-size:9px;font-weight:700">32%</div>
            <div><div style="font-size:10px;font-weight:600">CPU</div><div class="luma-sub">4.2 GHz</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:7px">
            <div style="width:28px;height:28px;border-radius:50%;border:2px solid #38bdf8;display:grid;place-items:center;font-size:9px;font-weight:700">64%</div>
            <div><div style="font-size:10px;font-weight:600">RAM</div><div class="luma-sub">10.2 GB</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:7px">
            <div style="width:28px;height:28px;border-radius:50%;border:2px solid #a855f7;display:grid;place-items:center;font-size:9px;font-weight:700">23%</div>
            <div><div style="font-size:10px;font-weight:600">GPU</div><div class="luma-sub">52 °C</div></div>
          </div>
        </div>`;
      return;
    }

    if (c.kind === 'media') {
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${icons.music}</div>
          <div class="luma-main-content">
            <div class="luma-title">Your music</div>
            <div class="luma-sub">Artist · Playing</div>
          </div>
          <div class="luma-cap-controls">
            <button class="luma-btn-skip" type="button" aria-label="Previous"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>
            <button class="luma-btn-play" type="button" aria-label="Play" style="width:28px;height:28px;background:#ffffff;color:#000"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
            <button class="luma-btn-skip" type="button" aria-label="Next"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg></button>
          </div>
        </div>`;
      return;
    }

    if (c.kind === 'battery') {
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-big-val" style="font-size:22px">82%</div>
          <div class="luma-main-content">
            <div class="luma-slim-bar" style="height:6px;margin:0"><div class="luma-slim-bar-fill" style="width:82%;background:#22c55e"></div></div>
          </div>
          <div class="luma-sub">Connected to power</div>
        </div>`;
      return;
    }

    if (c.kind === 'weather') {
      const city = c.city || 'Texas';
      wrap.className = 'widget-preview weather-preview';
      wrap.innerHTML = `
        <div class="luma-weather-card">
          <div class="luma-weather-left">
            <div class="luma-weather-icon-temp">
              <div class="luma-weather-icon">${icons.weather}</div>
              <div class="luma-weather-big-temp">18°C</div>
            </div>
            <div class="luma-weather-meta">
              <span class="luma-title">${city}</span>
              <span class="luma-sub">Cloudy · 12 km/h</span>
            </div>
          </div>
          <div class="luma-weather-forecast">
            <div class="luma-wf-day"><span class="luma-wf-label">Mon</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg><span class="luma-wf-temp">18°</span></div>
            <div class="luma-wf-day"><span class="luma-wf-label">Tue</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg><span class="luma-wf-temp">19°</span></div>
            <div class="luma-wf-day"><span class="luma-wf-label">Wed</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg><span class="luma-wf-temp">20°</span></div>
            <div class="luma-wf-day"><span class="luma-wf-label">Thu</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 19v2M12 21v2M16 19v2"/></svg><span class="luma-wf-temp">21°</span></div>
            <div class="luma-wf-day"><span class="luma-wf-label">Fri</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg><span class="luma-wf-temp">22°</span></div>
          </div>
        </div>`;
      return;
    }

    if (c.kind === 'photo') {
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${icons.photo}</div>
          <div class="luma-main-content">
            <div class="luma-title">Photo Frame</div>
            <div class="luma-sub">A favorite photo, artwork or GIF</div>
          </div>
        </div>`;
      return;
    }

    if (c.kind === 'countdown') {
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${icons.countdown}</div>
          <div class="luma-main-content">
            <div class="luma-title">${c.countdown_title || 'Launch Day'}</div>
            <div class="luma-sub">days until deadline</div>
          </div>
          <div class="luma-big-val" style="font-size:24px;margin-left:auto;color:#f59e0b">14</div>
        </div>`;
      return;
    }

    if (t === 'news') {
      const iconSvg = icons[entry?.iconKey] || icons.hackernews;
      wrap.innerHTML = `
        <div class="luma-row-card">
          <div class="luma-icon">${iconSvg}</div>
          <div class="luma-main-content">
            <div class="luma-top-meta">
              <span class="luma-title">${entry?.source || 'News'}</span>
              <span class="luma-sub">${entry?.meta || ''}</span>
            </div>
            <div class="luma-sub" style="color:var(--text);font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${entry?.title || ''}</div>
          </div>
        </div>`;
      return;
    }

    const iconSvg = icons[entry?.iconKey] || icons.generic;
    let changeStyle = '';
    if (entry?.change?.startsWith('+')) changeStyle = 'style="color:#22c55e"';
    else if (entry?.change?.startsWith('-')) changeStyle = 'style="color:#ef4444"';

    wrap.innerHTML = `
      <div class="luma-row-card">
        <div class="luma-icon">${iconSvg}</div>
        <div class="luma-main-content">
          <div class="luma-top-meta">
            <span class="luma-title">${entry?.symbol || entry?.title || entry?.name || c.kind}</span>
            ${(entry?.meta || entry?.change) ? `<span class="luma-sub" ${changeStyle}>${entry.meta || entry.change}</span>` : ''}
          </div>
          ${entry?.value ? `<div class="luma-big-val">${entry.value}</div>` : ''}
          ${(entry?.sub || entry?.desc) ? `<div class="luma-sub">${entry.sub || entry.desc}</div>` : ''}
        </div>
      </div>`;
  }

  function renderDrawer(c, entry) {
    if (!c) return;
    const widgetName = entry?.name || legacyNames[c.kind] || c.kind;
    const categoryName = entry?.category?.toUpperCase() || (c.kind === 'system' ? 'SYSTEM' : 'PRODUCTIVITY');

    if (detailBadge) detailBadge.textContent = `${categoryName} · ${widgetName.toUpperCase()}`;

    function refreshDrawerPreview() {
      if (detailPreview) renderWidgetPreview(detailPreview, c, entry);
      if (previewUpdates[c.kind]) previewUpdates[c.kind]();
    }
    refreshDrawerPreview();

    if (colorPresetsWrap) {
      colorPresetsWrap.replaceChildren();
      const currentPresetId = c.custom?.style_preset || (c.background === '#ffffff' ? 'light' : (c.opacity === 0 || c.background === 'transparent' ? 'ghost' : 'dark'));
      for (const preset of stylePresets) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'widget-color-preset';
        btn.dataset.preset = preset.id;
        btn.title = preset.name;
        btn.setAttribute('aria-label', preset.name);
        if (currentPresetId === preset.id) btn.classList.add('active');

        btn.onclick = () => {
          if (!c.custom) c.custom = {};
          c.custom.style_preset = preset.id;
          c.background = preset.bg;
          c.foreground = preset.fg;
          c.opacity = preset.opacity;
          c.custom.border_color = preset.border;
          c.custom.border_width = preset.borderWidth;
          if (preset.id === 'ghost') c.custom.opacity = 0;
          else delete c.custom.opacity;

          const bgInput = appearanceFields.querySelector('input[data-field="background"]');
          if (bgInput) bgInput.value = preset.bg.startsWith('#') ? preset.bg : '#ffffff';
          const fgInput = appearanceFields.querySelector('input[data-field="foreground"]');
          if (fgInput) fgInput.value = preset.fg;
          const bcInput = appearanceFields.querySelector('input[data-field="border_color"]');
          if (bcInput) bcInput.value = preset.border.startsWith('#') ? preset.border : '#2a2b36';
          const bwInput = appearanceFields.querySelector('input[data-field="border_width"]');
          if (bwInput) bwInput.value = preset.borderWidth;
          const opSlider = appearanceFields.querySelector('input[type="range"][data-field="opacity"]');
          if (opSlider) {
            opSlider.value = preset.opacity;
            const opVal = opSlider.nextElementSibling;
            if (opVal) opVal.textContent = preset.opacity + '%';
          }

          for (const b of colorPresetsWrap.children) b.classList.remove('active');
          btn.classList.add('active');
          refreshDrawerPreview();
          save(c);
        };
        colorPresetsWrap.append(btn);
      }
    }

    if (appearanceFields) {
      appearanceFields.replaceChildren();

      function addRow(label, inputEl) {
        const row = document.createElement('label');
        row.className = 'widget-detail-row';
        const span = document.createElement('span');
        span.textContent = label;
        row.append(span, inputEl);
        appearanceFields.append(row);
      }

      for (const [key, label, min, max] of [
        ['width', 'Width (px)', 140, 1200],
        ['height', 'Height (px)', 120, 900]
      ]) {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = min;
        input.max = max;
        input.value = c[key];
        input.dataset.field = key;
        input.onchange = () => {
          c[key] = Math.max(min, Math.min(max, Number(input.value) || min));
          input.value = c[key];
          refreshDrawerPreview();
          save(c);
        };
        addRow(label, input);
      }

      const radiusWrap = document.createElement('div');
      radiusWrap.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;max-width:210px;';
      const radSlider = document.createElement('input');
      radSlider.type = 'range';
      radSlider.min = 0;
      radSlider.max = 80;
      radSlider.value = c.radius;
      radSlider.style.flex = '1';
      const radVal = document.createElement('span');
      radVal.style.cssText = 'font-size:11px;min-width:32px;text-align:right;';
      radVal.textContent = c.radius + 'px';
      radSlider.oninput = () => {
        c.radius = Number(radSlider.value);
        radVal.textContent = c.radius + 'px';
        refreshDrawerPreview();
        save(c);
      };
      radiusWrap.append(radSlider, radVal);
      addRow('Corner radius', radiusWrap);

      const opacityWrap = document.createElement('div');
      opacityWrap.style.cssText = 'display:flex;align-items:center;gap:10px;flex:1;max-width:210px;';
      const opSlider = document.createElement('input');
      opSlider.type = 'range';
      opSlider.min = 0;
      opSlider.max = 100;
      opSlider.dataset.field = 'opacity';
      const currentOpacity = c.custom?.opacity !== undefined ? c.custom.opacity : (c.opacity !== undefined ? c.opacity : 95);
      opSlider.value = currentOpacity;
      opSlider.style.flex = '1';
      const opVal = document.createElement('span');
      opVal.style.cssText = 'font-size:11px;min-width:32px;text-align:right;';
      opVal.textContent = currentOpacity + '%';
      opSlider.oninput = () => {
        const val = Number(opSlider.value);
        if (!c.custom) c.custom = {};
        c.custom.opacity = val;
        c.opacity = Math.max(20, val);
        opVal.textContent = val + '%';
        refreshDrawerPreview();
        save(c);
      };
      opacityWrap.append(opSlider, opVal);
      addRow('Opacity', opacityWrap);

      for (const [key, label, isCustom, defVal] of [
        ['background', 'Background', false, '#161720'],
        ['foreground', 'Text color', false, '#ffffff'],
        ['tag_color', 'Label color', true, '#38bdf8'],
        ['accent_color', 'Button color', true, '#3b82f6'],
        ['border_color', 'Border color', true, '#2a2b36']
      ]) {
        const input = document.createElement('input');
        input.type = 'color';
        const val = isCustom ? c.custom?.[key] : c[key];
        input.value = val && val.startsWith('#') ? val : defVal;
        input.dataset.field = key;
        input.oninput = () => {
          if (isCustom) {
            if (!c.custom) c.custom = {};
            c.custom[key] = input.value;
          } else {
            c[key] = input.value;
          }
          if (!c.custom) c.custom = {};
          c.custom.style_preset = 'custom';
          for (const b of colorPresetsWrap.children) b.classList.remove('active');
          refreshDrawerPreview();
          save(c);
        };
        addRow(label, input);
      }

      const bwInput = document.createElement('input');
      bwInput.type = 'number';
      bwInput.min = 0;
      bwInput.max = 12;
      bwInput.dataset.field = 'border_width';
      bwInput.value = c.custom?.border_width != null ? c.custom.border_width : (['pomodoro','timer','stopwatch','prod_pomodoro','prod_timer','prod_stopwatch'].includes(c.kind) ? 2 : 1);
      bwInput.onchange = () => {
        if (!c.custom) c.custom = {};
        c.custom.border_width = Math.max(0, Math.min(12, Number(bwInput.value) || 0));
        bwInput.value = c.custom.border_width;
        refreshDrawerPreview();
        save(c);
      };
      addRow('Border width (px)', bwInput);

      const specific = legacyOptions[c.kind] || [];
      for (const [key, label] of specific) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'switch';
        input.checked = c[key];
        input.onchange = () => {
          c[key] = input.checked;
          refreshDrawerPreview();
          save(c);
        };
        addRow(label, input);
      }
    }

    if (customFields && customSection) {
      customFields.replaceChildren();

      function addCustomRow(label, inputEl) {
        const row = document.createElement('label');
        row.className = 'widget-detail-row';
        const span = document.createElement('span');
        span.textContent = label;
        row.append(span, inputEl);
        customFields.append(row);
      }

      if (!c.custom || typeof c.custom !== 'object') c.custom = {};

      const auth = widgetAuthInfo(entry, c);
      if (auth.required) {
        const authCard = document.createElement('div');
        authCard.style.cssText = 'padding:14px;border-radius:10px;background:var(--surface2);border:1px solid var(--border-strong);display:flex;flex-direction:column;gap:12px;margin-bottom:12px;';
        if (auth.authorized) {
          const isAgy = c.custom.auth_provider === 'antigravity';
          authCard.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <div style="display:flex;align-items:center;gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <div>
                  <div style="font-size:12px;font-weight:600;color:#22c55e">Connected: ${auth.accountName || 'Real Credentials'}</div>
                  <div style="font-size:10px;color:var(--muted)">Signed-in application session (Live Quotas)</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                ${isAgy ? '<button type="button" class="auth-sync-btn" style="background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:11px;padding:3px 8px;cursor:pointer;">Sync Quotas</button>' : ''}
                <button type="button" class="auth-disconnect-btn" style="background:none;border:none;color:#ef4444;font-size:11px;cursor:pointer;text-decoration:underline;">Disconnect</button>
              </div>
            </div>`;
          const syncBtn = authCard.querySelector('.auth-sync-btn');
          if (syncBtn) {
            syncBtn.onclick = async () => {
              syncBtn.disabled = true;
              syncBtn.textContent = 'Syncing...';
              try {
                const live = await window.WidgetMetrics?.getLiveAntigravityQuota();
                if (live) {
                  if (c.kind === 'ai_gemini') {
                    c.custom.five_hour_pct = live.gemini5h.pct;
                    c.custom.five_hour_reset = live.gemini5h.reset;
                    c.custom.weekly_pct = live.geminiWeekly.pct;
                    c.custom.weekly_reset = live.geminiWeekly.reset;
                  } else if (c.kind === 'ai_claude' || c.kind === 'ai_claude_plan') {
                    c.custom.session_pct = live.claudeSession.pct;
                    c.custom.weekly_pct = live.claudeWeekly.pct;
                    c.custom.session_reset = live.claudeSession.reset;
                  } else if (c.kind === 'ai_chatgpt') {
                    c.custom.session_pct = live.claudeSession.pct;
                    c.custom.weekly_pct = live.claudeWeekly.pct;
                  }
                  save(c);
                  refreshDrawerPreview();
                  renderDrawer(c, entry);
                }
              } catch (err) {
                console.warn(err);
              }
            };
          }
          authCard.querySelector('.auth-disconnect-btn').onclick = () => {
            const k = auth.fieldKey || 'api_key';
            delete c.custom[k];
            delete c.custom.auth_provider;
            delete c.custom.account_name;
            c.enabled = false;
            syncCardAuth(c.kind);
            refreshDrawerPreview();
            renderDrawer(c, entry);
            save(c);
          };
        } else {
          authCard.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Sign in with App Account</span>
            </div>
            <p style="font-size:11px;color:var(--muted);margin:0;line-height:1.4">Connect with your signed-in local app account (Antigravity or Codex) to automatically sync real limits without entering API keys.</p>

            <div style="display:flex;flex-direction:column;gap:8px;">
              <button type="button" class="connect-antigravity-btn" style="width:100%;min-height:36px;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;background:#2563eb;color:#ffffff;border:none;border-radius:8px;cursor:pointer;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span>Connect Antigravity Account</span>
              </button>

              <button type="button" class="connect-codex-btn" style="width:100%;min-height:34px;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--surface3);border:1px solid var(--border-strong);color:var(--text);border-radius:8px;cursor:pointer;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                <span>Connect OpenAI Codex App</span>
              </button>
            </div>

            <div style="margin-top:4px;border-top:1px solid var(--border);padding-top:10px;">
              <p style="font-size:11px;color:var(--muted);margin:0 0 8px 0;">Or verify with a custom API key from below:</p>
              <button type="button" class="auth-verify-btn" style="width:100%;min-height:32px;font-size:11px;background:var(--surface);border:1px solid var(--border-strong);color:var(--text);border-radius:6px;cursor:pointer;">Verify Manual API Key</button>
              <div class="auth-verify-status" style="font-size:11px;display:none;line-height:1.3;margin-top:6px;"></div>
            </div>`;

          const agyBtn = authCard.querySelector('.connect-antigravity-btn');
          const codexBtn = authCard.querySelector('.connect-codex-btn');
          const verifyBtn = authCard.querySelector('.auth-verify-btn');
          const statusEl = authCard.querySelector('.auth-verify-status');

          agyBtn.onclick = async () => {
            agyBtn.disabled = true;
            agyBtn.style.opacity = '0.7';
            c.custom.auth_provider = 'antigravity';
            c.custom.account_name = 'Antigravity Account';
            try {
              const live = await window.WidgetMetrics?.getLiveAntigravityQuota();
              if (live) {
                if (c.kind === 'ai_gemini') {
                  c.custom.five_hour_pct = live.gemini5h.pct;
                  c.custom.five_hour_reset = live.gemini5h.reset;
                  c.custom.weekly_pct = live.geminiWeekly.pct;
                  c.custom.weekly_reset = live.geminiWeekly.reset;
                } else if (c.kind === 'ai_claude' || c.kind === 'ai_claude_plan') {
                  c.custom.session_pct = live.claudeSession.pct;
                  c.custom.weekly_pct = live.claudeWeekly.pct;
                  c.custom.session_reset = live.claudeSession.reset;
                } else if (c.kind === 'ai_chatgpt') {
                  c.custom.session_pct = live.claudeSession.pct;
                  c.custom.weekly_pct = live.claudeWeekly.pct;
                }
              }
            } catch (err) {
              console.warn('Could not sync live quota:', err);
            }
            c.enabled = true;
            save(c);
            syncCardAuth(c.kind);
            renderDrawer(c, entry);
          };

          codexBtn.onclick = () => {
            c.custom.auth_provider = 'codex';
            c.custom.account_name = 'OpenAI Codex Desktop';
            c.custom.session_pct = 100;
            c.custom.weekly_pct = 100;
            c.enabled = true;
            save(c);
            syncCardAuth(c.kind);
            renderDrawer(c, entry);
          };

          verifyBtn.onclick = async () => {
            const k = auth.fieldKey || 'api_key';
            const inputVal = (c.custom[k] || '').trim();
            if (!inputVal) {
              statusEl.style.display = 'block';
              statusEl.style.color = '#ef4444';
              statusEl.textContent = 'Please enter your ' + auth.keyName + ' below first';
              const passInput = customFields.querySelector('input[type="password"]');
              if (passInput) passInput.focus();
              return;
            }
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = `<svg class="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Verifying with service…</span>`;
            statusEl.style.display = 'none';
            try {
              if (window.WidgetMetrics?.verifyServiceKey) {
                await window.WidgetMetrics.verifyServiceKey(c.kind, inputVal);
              }
              c.enabled = true;
              save(c);
              syncCardAuth(c.kind);
              renderDrawer(c, entry);
            } catch (err) {
              verifyBtn.disabled = false;
              verifyBtn.innerHTML = `<span>Verify Manual API Key</span>`;
              statusEl.style.display = 'block';
              statusEl.style.color = '#ef4444';
              statusEl.textContent = 'Verification error: ' + (err.message || 'Invalid key');
            }
          };
        }
        customFields.append(authCard);
      }

      if (entry?.fields?.length) {
        for (const f of entry.fields) {
          if (f.type === 'switch') {
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'switch';
            input.checked = c.custom[f.key] != null ? c.custom[f.key] : (f.default || false);
            input.onchange = () => {
              c.custom[f.key] = input.checked;
              refreshDrawerPreview();
              save(c);
            };
            addCustomRow(f.label, input);
          } else if (f.type === 'select') {
            const sel = document.createElement('select');
            for (const opt of f.options || []) {
              const optEl = document.createElement('option');
              optEl.value = opt;
              optEl.textContent = opt;
              if ((c.custom[f.key] || f.default) === opt) optEl.selected = true;
              sel.append(optEl);
            }
            sel.onchange = () => {
              c.custom[f.key] = sel.value;
              refreshDrawerPreview();
              save(c);
            };
            addCustomRow(f.label, sel);
          } else if (f.type === 'password') {
            const container = document.createElement('div');
            container.style.cssText = 'display:flex;align-items:center;position:relative;width:100%;max-width:210px;';
            const input = document.createElement('input');
            input.type = 'password';
            input.style.cssText = 'flex:1;padding-right:32px;width:100%;';
            if (f.placeholder) input.placeholder = f.placeholder;
            input.value = c.custom[f.key] || f.default || '';
            input.oninput = () => {
              c.custom[f.key] = input.value.trim();
              syncCardAuth(c.kind);
              refreshDrawerPreview();
              save(c);
            };
            const toggleBtn = document.createElement('button');
            toggleBtn.type = 'button';
            toggleBtn.style.cssText = 'position:absolute;right:6px;background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;display:flex;align-items:center;';
            toggleBtn.setAttribute('aria-label', 'Toggle visibility');
            const eyeSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" r="3"/></svg>`;
            const eyeOffSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
            toggleBtn.innerHTML = eyeSvg;
            toggleBtn.onclick = (e) => {
              e.preventDefault();
              if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.innerHTML = eyeOffSvg;
              } else {
                input.type = 'password';
                toggleBtn.innerHTML = eyeSvg;
              }
            };
            container.append(input, toggleBtn);
            addCustomRow(f.label, container);
          } else {
            const input = document.createElement('input');
            input.type = f.type || 'text';
            if (f.placeholder) input.placeholder = f.placeholder;
            input.value = c.custom[f.key] || f.default || '';
            input.oninput = () => {
              c.custom[f.key] = input.value.trim();
              syncCardAuth(c.kind);
              refreshDrawerPreview();
              save(c);
            };
            addCustomRow(f.label, input);
          }
        }
      }

      if ((entry?.template === 'timer' || c.kind === 'prod_timer') && !entry?.fields?.some(f => f.key === 'duration_minutes')) {
        const durInput = document.createElement('input');
        durInput.type = 'number';
        durInput.min = 1;
        durInput.max = 180;
        durInput.value = c.custom.duration_minutes || 1;
        durInput.onchange = () => {
          c.custom.duration_minutes = Math.max(1, Number(durInput.value) || 1);
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Timer duration (mins)', durInput);

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.value = c.custom.label || 'Timer';
        labelInput.onchange = () => {
          c.custom.label = labelInput.value.trim();
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Timer label', labelInput);
      }

      if (entry?.template === 'pomodoro' || c.kind === 'prod_pomodoro') {
        const fInput = document.createElement('input');
        fInput.type = 'number';
        fInput.min = 5;
        fInput.max = 90;
        fInput.value = c.custom.focus_mins || 25;
        fInput.onchange = () => {
          c.custom.focus_mins = Math.max(1, Number(fInput.value) || 25);
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Focus duration (mins)', fInput);

        const bInput = document.createElement('input');
        bInput.type = 'number';
        bInput.min = 1;
        bInput.max = 30;
        bInput.value = c.custom.break_mins || 5;
        bInput.onchange = () => {
          c.custom.break_mins = Math.max(1, Number(bInput.value) || 5);
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Break duration (mins)', bInput);

        const rInput = document.createElement('input');
        rInput.type = 'number';
        rInput.min = 1;
        rInput.max = 12;
        rInput.value = c.custom.rounds || 4;
        rInput.onchange = () => {
          c.custom.rounds = Math.max(1, Number(rInput.value) || 4);
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Target rounds', rInput);
      }

      if (entry?.template === 'water' || c.kind === 'prod_water') {
        const goalInput = document.createElement('input');
        goalInput.type = 'number';
        goalInput.min = 1;
        goalInput.max = 20;
        goalInput.value = c.custom.goal_cups || 8;
        goalInput.onchange = () => {
          c.custom.goal_cups = Number(goalInput.value) || 8;
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Daily goal (cups)', goalInput);

        const mlInput = document.createElement('input');
        mlInput.type = 'number';
        mlInput.min = 250;
        mlInput.max = 5000;
        mlInput.step = 250;
        mlInput.value = c.custom.goal_ml || 2000;
        mlInput.onchange = () => {
          c.custom.goal_ml = Number(mlInput.value) || 2000;
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Target volume (mL)', mlInput);
      }

      if (entry?.template === 'todos' || c.kind === 'prod_todos') {
        const taskInput = document.createElement('input');
        taskInput.type = 'text';
        taskInput.value = c.custom.task || 'Ship the 0.1.11 update';
        taskInput.onchange = () => {
          c.custom.task = taskInput.value.trim();
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Primary task', taskInput);
      }

      if (c.kind === 'notes') {
        const input = document.createElement('textarea');
        input.maxLength = 2000;
        input.placeholder = 'Write your sticky note text...';
        input.value = c.notes;
        input.oninput = () => {
          c.notes = input.value;
          refreshDrawerPreview();
          save(c);
        };
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-direction:column;gap:6px;width:100%;';
        const span = document.createElement('span');
        span.style.fontSize = '12px';
        span.textContent = 'Desktop Note Text';
        row.append(span, input);
        customFields.append(row);
      }

      if (c.kind === 'weather') {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter city (e.g. Kyiv, London)';
        input.value = c.city;
        input.onchange = () => {
          c.city = input.value.trim();
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Forecast city', input);
      }

      if (c.kind === 'countdown') {
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.value = c.countdown_title;
        titleInput.onchange = () => {
          c.countdown_title = titleInput.value.trim();
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Event title', titleInput);

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = c.countdown_date;
        dateInput.onchange = () => {
          c.countdown_date = dateInput.value;
          refreshDrawerPreview();
          save(c);
        };
        addCustomRow('Target date', dateInput);
      }

      if (c.kind === 'photo') {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.setAttribute('aria-label', 'Upload photo or GIF');
        const prog = document.createElement('div');
        prog.className = 'widget-help';
        fileInput.onchange = async () => {
          const file = fileInput.files[0];
          if (!file) return;
          fileInput.disabled = true;
          try {
            const signature = new Uint8Array(await file.slice(0, 6).arrayBuffer());
            const isGif = String.fromCharCode(...signature) === 'GIF87a' || String.fromCharCode(...signature) === 'GIF89a';
            let photo;
            if (isGif) {
              const id = await invoke('photo_upload_begin', { size: file.size });
              const chunkSize = 256 * 1024;
              for (let offset = 0; offset < file.size; offset += chunkSize) {
                const encoded = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onerror = () => reject(Error('Could not read image'));
                  reader.onload = () => resolve(String(reader.result).split(',')[1]);
                  reader.readAsDataURL(file.slice(offset, offset + chunkSize));
                });
                await invoke('photo_upload_chunk', { id, offset, data: encoded });
                prog.textContent = 'Uploading GIF ' + Math.round(Math.min(offset + chunkSize, file.size) * 100 / file.size) + '%';
              }
              photo = await invoke('photo_upload_finish', { id });
            } else {
              if (file.size > 15 * 1024 * 1024) throw Error('Choose an image smaller than 15 MB');
              const bitmap = await createImageBitmap(file);
              const canvas = document.createElement('canvas');
              const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
              canvas.width = Math.max(1, Math.round(bitmap.width * scale));
              canvas.height = Math.max(1, Math.round(bitmap.height * scale));
              canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              bitmap.close();
              photo = canvas.toDataURL('image/jpeg', 0.82);
              if (photo.length > 1500000) throw Error('Image is too large');
            }
            c.photo = photo;
            refreshDrawerPreview();
            save(c);
            prog.textContent = 'Photo ready';
          } catch (e) {
            prog.textContent = String(e);
          } finally {
            fileInput.disabled = false;
          }
        };
        addCustomRow('Photo image', fileInput);
        customFields.append(prog);
      }

      customSection.hidden = customFields.children.length === 0;
    }

    if (actionsSection) {
      actionsSection.replaceChildren();
      const localWidgets = new Set([
        'timer', 'stopwatch', 'pomodoro', 'prod_timer', 'prod_stopwatch', 'prod_pomodoro',
        'clock', 'calendar', 'notes', 'battery', 'system', 'system_cpu', 'system_ram', 'system_gpu',
        'system_disk', 'system_net', 'water', 'habits', 'todos', 'countdown', 'photo',
        'ctrl_volume', 'ctrl_mic_mute', 'ctrl_brightness', 'ctrl_wifi', 'ctrl_bluetooth',
        'screentime', 'timeline'
      ]);

      const isLocal = localWidgets.has(c.kind) || localWidgets.has(entry?.template);
      const auth = widgetAuthInfo(entry, c);
      const isRemoteMetric = !isLocal && (
        auth.required ||
        ['ai', 'revenue', 'dev', 'finance'].includes(entry?.category) ||
        ['weather', 'crypto_btc', 'crypto_eth', 'crypto_sol', 'stocks_nvda', 'stocks_aapl'].includes(c.kind)
      );

      if (isRemoteMetric) {
        const testBtn = document.createElement('button');
        testBtn.type = 'button';
        testBtn.className = 'wallpaper-primary';
        testBtn.style.cssText = 'width:100%;min-height:38px;font-size:12px;margin-top:4px;';
        testBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> <span>Test & Fetch Live Data</span>`;

        const testStatus = document.createElement('div');
        testStatus.className = 'widget-help';
        testStatus.style.cssText = 'font-size:11px;min-height:16px;line-height:1.4;margin-top:6px;';

        testBtn.onclick = async () => {
          testBtn.disabled = true;
          testStatus.style.color = 'var(--text)';
          testStatus.textContent = 'Connecting and fetching live metric…';
          try {
            if (!window.WidgetMetrics) throw Error('Widget metrics engine not loaded');
            const metric = await window.WidgetMetrics.resolveMetric(entry || { id: c.kind, template: c.kind }, c);
            testStatus.style.color = '#22c55e';
            testStatus.textContent = `Connected! ${metric.title ? metric.title + ': ' : ''}${metric.value || metric.detail || 'Live data retrieved'}`;
            c.livePreviewData = metric;
            refreshDrawerPreview();
          } catch (err) {
            testStatus.style.color = '#ef4444';
            testStatus.textContent = `Connection failed: ${err.message || String(err)}`;
          } finally {
            testBtn.disabled = false;
          }
        };

        actionsSection.append(testBtn, testStatus);
      }
    }
  }

  function selectWidget(kind) {
    if (selectedKind === kind) {
      setDetail(false);
      return;
    }
    selectedKind = kind;
    updateSelectedTiles();
    const c = configs.find(x => x.kind === kind);
    const entry = catalog.find(x => x.id === kind);
    renderDrawer(c, entry);
    setDetail(true);
  }

  if (detailClose) {
    detailClose.onclick = () => setDetail(false);
  }
  document.addEventListener('click', event => {
    if (selectedKind && detailPanel && !detailPanel.contains(event.target) && !event.target.closest('.widget-option')) {
      setDetail(false);
    }
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') setDetail(false);
  });

  function build() {
    list.replaceChildren();
    let displayList = configs.slice();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      displayList = displayList.filter(c => {
        const entry = catalog.find(x => x.id === c.kind);
        const name = (entry?.name || legacyNames[c.kind] || c.kind).toLowerCase();
        const desc = (entry?.desc || legacyDescriptions[c.kind] || '').toLowerCase();
        const cat = (entry?.category || '').toLowerCase();
        return name.includes(q) || desc.includes(q) || cat.includes(q) || c.kind.toLowerCase().includes(q);
      });
    }

    if (countBadge) {
      const activeCount = configs.filter(c => c.enabled).length;
      countBadge.textContent = `${activeCount} active on desktop · Showing ${displayList.length} of ${configs.length}`;
    }

    if (displayList.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = 'padding: 48px; text-align: center; color: var(--muted); font-size: 13px;';
      emptyMsg.textContent = 'No widgets found matching your search. Try another keyword.';
      list.append(emptyMsg);
      return;
    }

    for (const cat of categories) {
      const catConfigs = displayList.filter(c => {
        const entry = catalog.find(x => x.id === c.kind);
        const categoryId = entry?.category || (c.kind === 'system' ? 'system' : 'productivity');
        return categoryId === cat.id;
      });

      if (catConfigs.length === 0) continue;

      const section = document.createElement('section');
      section.className = 'widget-cat-section';
      section.dataset.catId = cat.id;

      const header = document.createElement('div');
      header.className = 'widget-cat-header';
      const title = document.createElement('h3');
      title.className = 'widget-cat-title';
      title.textContent = cat.name;
      const desc = document.createElement('p');
      desc.className = 'widget-cat-desc';
      desc.textContent = cat.desc;
      header.append(title, desc);
      section.append(header);

      const gallery = document.createElement('div');
      gallery.className = 'widget-gallery';

      for (const c of catConfigs) {
        const entry = catalog.find(x => x.id === c.kind);
        const widgetName = entry?.name || legacyNames[c.kind] || c.kind;
        const widgetDesc = entry?.desc || legacyDescriptions[c.kind] || 'Glanceable desktop widget';

        const row = document.createElement('article');
        row.className = 'widget-option';
        row.dataset.kind = c.kind;
        if (selectedKind === c.kind) row.classList.add('selected');

        row.onclick = (e) => {
          if (e.target.closest('input.switch, label.widget-toggle, .widget-dock-button')) return;
          selectWidget(c.kind);
        };

        const previewWrap = document.createElement('div');
        previewWrap.className = 'widget-preview-wrap';

        const preview = document.createElement('div');
        preview.className = 'widget-preview';

        function updatePreview() {
          renderWidgetPreview(preview, c, entry);
        }

        previewUpdates[c.kind] = updatePreview;
        updatePreview();

        const authOverlay = document.createElement('div');
        authOverlay.className = 'widget-auth-overlay';
        authOverlay.title = 'Click to configure and connect API key';
        authOverlay.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Authorize</span>`;
        authOverlay.onclick = (e) => {
          e.stopPropagation();
          selectWidget(c.kind);
          setTimeout(() => {
            const agyBtn = drawer.querySelector('.connect-antigravity-btn');
            if (agyBtn) {
              agyBtn.focus();
              agyBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
              const passInput = drawer.querySelector('input[type="password"]');
              if (passInput) passInput.focus();
            }
          }, 150);
        };
        previewWrap.append(preview, authOverlay);

        const details = document.createElement('div');
        details.className = 'widget-details';
        const nameEl = document.createElement('strong');
        nameEl.textContent = widgetName;
        const descEl = document.createElement('p');
        descEl.textContent = widgetDesc;
        details.append(nameEl, descEl);

        const controls = document.createElement('div');
        controls.className = 'widget-controls';
        const label = document.createElement('label');
        label.className = 'widget-toggle';
        label.onclick = (e) => e.stopPropagation();
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.className = 'switch';
        toggle.setAttribute('aria-label', 'Enable ' + widgetName);
        const toggleText = document.createElement('span');

        const auth = widgetAuthInfo(entry, c);
        if (auth.required && !auth.authorized) {
          c.enabled = false;
          row.classList.add('needs-auth');
          authOverlay.style.display = 'flex';
          toggle.disabled = true;
          toggle.checked = false;
          toggleText.textContent = 'Add to desktop';
          label.title = 'Click card or badge to Authorize';
          label.style.opacity = '0.45';
        } else {
          row.classList.remove('needs-auth');
          authOverlay.style.display = 'none';
          toggle.disabled = false;
          toggle.checked = c.enabled;
          toggleText.textContent = c.enabled ? 'On desktop' : 'Add to desktop';
          label.title = '';
          label.style.opacity = '1';
        }

        toggle.onchange = (e) => {
          e.stopPropagation();
          const currentAuth = widgetAuthInfo(entry, c);
          if (currentAuth.required && !currentAuth.authorized) {
            toggle.checked = false;
            c.enabled = false;
            selectWidget(c.kind);
            return;
          }
          c.enabled = toggle.checked;
          toggleText.textContent = c.enabled ? 'On desktop' : 'Add to desktop';
          if (countBadge) {
            const activeCount = configs.filter(x => x.enabled).length;
            countBadge.textContent = `${activeCount} active on desktop · Showing ${displayList.length} of ${configs.filter(x => x.kind !== 'audio').length}`;
          }
          save(c);
        };
        label.append(toggleText, toggle);
        const dockButton = document.createElement('button');
        dockButton.type = 'button';
        dockButton.className = 'widget-dock-button';
        const paintDockButton = () => {
          const added = dockWidgets.includes(c.kind);
          dockButton.textContent = added ? '−' : '+';
          dockButton.title = added ? 'Remove from taskbar' : 'Add to taskbar';
          dockButton.setAttribute('aria-label', dockButton.title + ': ' + widgetName);
          dockButton.setAttribute('aria-pressed', String(added));
        };
        paintDockButton();
        dockButton.onclick = async e => {
          e.stopPropagation();
          dockButton.disabled = true;
          try {
            await invoke('dock_widget_set', { id: c.kind, added: !dockWidgets.includes(c.kind) });
            dockWidgets = (await invoke('get_dock_snapshot')).config.widgets || [];
            paintDockButton();
          } catch (error) { status.textContent = 'Could not update taskbar: ' + String(error); }
          finally { dockButton.disabled = false; }
        };
        controls.append(label, dockButton);

        row.append(previewWrap, details, controls);
        gallery.append(row);
      }

      section.append(gallery);
      list.append(section);
    }
  }

  function syncCardAuth(kind) {
    const card = list.querySelector(`[data-kind="${kind}"]`);
    if (!card) return;
    const c = configs.find(x => x.kind === kind);
    const entry = catalog.find(x => x.id === kind);
    if (!c) return;
    const auth = widgetAuthInfo(entry, c);
    const ct = card.querySelector('input.switch');
    const ctt = card.querySelector('.widget-toggle span');
    const cl = card.querySelector('.widget-toggle');
    const overlay = card.querySelector('.widget-auth-overlay');

    if (auth.required && !auth.authorized) {
      card.classList.add('needs-auth');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Authorize</span>`;
      }
      c.enabled = false;
      if (ct) {
        ct.disabled = true;
        ct.checked = false;
      }
      if (ctt) {
        ctt.textContent = 'Add to desktop';
      }
      if (cl) {
        cl.style.opacity = '0.45';
        cl.title = 'Click card or badge to Authorize';
      }
    } else {
      card.classList.remove('needs-auth');
      if (overlay) overlay.style.display = 'none';
      if (ct) {
        ct.disabled = false;
        ct.checked = c.enabled;
      }
      if (ctt) {
        ctt.textContent = c.enabled ? 'On desktop' : 'Add to desktop';
      }
      if (cl) {
        cl.style.opacity = '1';
        cl.title = '';
      }
    }
  }

  if (searchInput) {
    searchInput.oninput = () => {
      searchQuery = searchInput.value.trim();
      build();
    };
  }

  async function init() {
    try {
      [configs, dockWidgets] = await Promise.all([invoke('get_widgets'), invoke('get_dock_snapshot').then(x => x.config.widgets || [])]);
      for (const c of configs) {
        if (c.background === '#f8f9fc' && c.kind !== 'notes') {
          c.background = '#161720';
          c.foreground = '#ffffff';
        }
        if (c.custom && typeof c.custom === 'object') {
          let cleaned = false;
          for (const k of Object.keys(c.custom)) {
            if (typeof c.custom[k] === 'string' && c.custom[k].startsWith('session_auth_')) {
              delete c.custom[k];
              cleaned = true;
            }
          }
          if (cleaned) {
            c.enabled = false;
            save(c);
          }
        }
      }
      build();
    } catch (e) {
      status.textContent = 'Could not load widgets: ' + String(e);
    }
  }

  window.__TAURI__?.event?.listen('dock-config-changed', event => { dockWidgets = event.payload?.widgets || []; build(); });

  window.__TAURI__?.event?.listen('widget-geometry', event => {
    const updated = event.payload;
    const c = configs.find(item => item.kind === updated.kind);
    if (!c) return;
    Object.assign(c, { width: updated.width, height: updated.height, x: updated.x, y: updated.y });
    if (selectedKind === c.kind) {
      const entry = catalog.find(x => x.id === c.kind);
      renderDrawer(c, entry);
    }
    previewUpdates[c.kind]?.();
  });

  window.__TAURI__?.event?.listen('widget-open-settings', event => {
    if (event.payload === 'audio') {
      document.querySelector('[data-tab="audio"]')?.click();
      return;
    }
    document.querySelector('[data-tab="widgets"]')?.click();
    selectWidget(event.payload);
    const row = list.querySelector(`[data-kind="${event.payload}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  });

  if (invoke) init();
  else status.textContent = 'Launch Atelier to use desktop widgets.';
})();

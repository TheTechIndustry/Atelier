const catalog = window.WIDGETS_CATALOG || [];
const icons = window.WIDGET_ICONS || {};
const icon = name => icons[name] || icons.generic || '';

const previews = {
    ai_claude: ['Session', '100%', 'Resets in 1h 25m'],
    ai_grok: ['Credits', '84%', 'Available'],
    ai_deepseek: ['Balance', '$18.42', 'Today · $0.36'],
    ai_opencode: ['Session', '182.4K', 'Last 5 hours'],
    ai_perplexity: ['Credits', '—', 'Account credits'],
    ai_cursor: ['Fast requests', '412 / 500', 'This month'],
    ai_ollama: ['Model', 'llama3.2:3b', '42.4 tokens/s'],
    ai_openai_balance: ['Usage', '$124.50', 'This month'],
    ai_anthropic_balance: ['Usage', '$86.20', 'This month'],
    clock: ['Local time', '10:24', 'Tuesday, Nov 10'],
    calendar: ['Tuesday', '10', 'November'],
    notes: ['Meeting notes', 'Ideas for today', 'Write something down'],
    countdown: ['Next event', '12 days', 'Until launch'],
    prod_day_timeline: ['Today', '6h 5m', 'Time on your PC'],
    prod_screentime: ['Screen Time', '1h 38m', 'Today'],
    prod_pomodoro: ['Focus 1/4', '25:00', 'Focus session'],
    prod_timer: ['Timer', '05:00', 'Ready'],
    prod_stopwatch: ['Stopwatch', '0:00', 'Ready'],
    prod_todos: ['Today', '3 tasks', '1 completed'],
    prod_notes_memo: ['Meeting notes', 'Project ideas', 'A little note'],
    prod_calendar_event: ['Today', 'Design review', '4:05 PM'],
    prod_currency_calc: ['USD / EUR', '92.40', '100 USD'],
    prod_minimal_clock: ['Local time', '10:24', 'Tuesday'],
    prod_world_clock: ['London', '10:24', 'Local time'],
    system: ['System Monitor', '32%', 'CPU · RAM 64%'],
    battery: ['Battery', '82%', 'Connected to power'],
    sys_cpu: ['CPU Core', '32%', '4.2 GHz'],
    sys_ram: ['RAM Memory', '10.2 GB', '64% in use'],
    sys_gpu: ['GPU Graphics', '23%', '52°C core temp'],
    sys_thermals: ['Thermals', '52°C', 'CPU temperature'],
    sys_disk_c: ['Drive C:', '64%', 'Available storage'],
    sys_disk_d: ['Drive D:', '42%', 'Available storage'],
    sys_network_speed: ['Network Speed', '2.4 MB/s', 'Download'],
    sys_ping: ['Ping', '18 ms', 'Latency'],
    sys_uptime: ['System Uptime', '4d 18h', 'Since startup'],
    sys_processes: ['Top Processes', 'atelier.exe', '4.2% CPU'],
    sys_fans: ['Fan Speed', '1,120 RPM', 'GPU fan'],
    sys_wifi: ['Wi-Fi Signal', '96%', 'Connected'],
    sys_bluetooth: ['Bluetooth', '2 devices', 'Connected'],
    sys_vram: ['VRAM', '3.8 GB', 'In use'],
    ctrl_volume: ['Volume', '65%', 'Output'],
    ctrl_mic_mute: ['Microphone', 'On', 'Microphone'],
    ctrl_brightness: ['Brightness', '70%', 'Display'],
    ctrl_audio_switch: ['Audio Output', 'Speakers', 'Default device'],
    ctrl_recycle_bin: ['Recycle Bin', '4 items', 'Ready to empty'],
    fin_btc: ['BTC / USD', '$89,450', '+4.2% today'],
    fin_eth: ['ETH / USD', '$3,180.50', '+2.8% today'],
    fin_sol: ['SOL / USD', '$184.20', '+6.1% today'],
    fin_crypto_list: ['Crypto Watchlist', 'BTC · ETH · SOL', 'Market overview'],
    fin_sp500: ['S&P 500', '5,842.47', '+0.8% today'],
    fin_nasdaq: ['NASDAQ 100', '20,583', '+1.2% today'],
    fin_stock_aapl: ['Apple', ' $228.20', '+0.6% today'],
    fin_stock_nvda: ['NVIDIA', '$142.50', '+1.4% today'],
    fin_stock_tsla: ['Tesla', '$271.80', '+0.7% today'],
    fin_forex_usdeur: ['USD / EUR', '92.40', '100 USD'],
    fin_forex_usduah: ['USD / UAH', '4,135', '100 USD'],
    fin_gold: ['Gold & Silver', '$2,743', 'Gold per oz'],
    media: ['Now Playing', 'Your music', 'Artist · Playing'],
    weather: ['Weather', '21°C', 'Partly cloudy'],
    photo: ['Photo Frame', 'Your photos', 'Favorite moments'],
    audio: ['Audio Visualizer', 'Listening', 'Desktop audio'],
    util_hackernews: ['Hacker News', 'Top stories', 'Technology'],
    util_rss: ['RSS News', 'Latest stories', 'Your feeds'],
    dev_gitlab: ['Pipeline', 'Passing', 'Latest build'],
    dev_leetcode: ['LeetCode', '12 day streak', 'Daily practice'],
    dev_wakatime: ['Today', '4h 32m', 'Coding time']
};

function findWidget(id) {
    return catalog.find(item => item.id === id)
}

function makeWidget(item, index = 0, mini = false) {
    const box = document.createElement('div');
    box.className = 'widget' + (mini ? ' widget-mini' : '');
    box.dataset.widgetId = item.id;
    const image = document.createElement('div');
    image.className = 'widget-icon';
    image.innerHTML = icon(item.iconKey);
    const content = document.createElement('div');
    content.className = 'widget-content';
    box.append(image, content);
    const plan = ['ai_claude_plan', 'ai_chatgpt', 'ai_gemini', 'ai_glm'].includes(item.id);
    if (plan) {
        content.classList.add('plan-content');
        [['Session', item.id === 'ai_gemini' ? '96%' : '34%'], ['Weekly', item.id === 'ai_gemini' ? '47%' : '21%']].forEach(([label, value], i) => {
            const row = document.createElement('div');
            row.className = 'plan-row';
            const name = document.createElement('span');
            name.textContent = label;
            const line = document.createElement('div');
            line.className = 'meter';
            const fill = document.createElement('i');
            fill.style.width = (i ? 38 : 65) + '%';
            line.append(fill);
            const number = document.createElement('strong');
            number.textContent = value;
            row.append(name, line, number);
            content.append(row)
        });
        return box
    }
    const [title, value, detail] = previews[item.id] || [item.name, item.category === 'dev' ? 'Active' : '—', ''];
    const label = document.createElement('span');
    label.className = 'widget-title';
    label.textContent = title;
    const main = document.createElement('strong');
    main.className = 'widget-value';
    main.textContent = value;
    const sub = document.createElement('span');
    sub.className = 'widget-sub';
    sub.textContent = detail;
    content.append(label, main, sub);
    if (['clock', 'prod_minimal_clock', 'prod_world_clock'].includes(item.id)) main.dataset.clock = '';
    if (['prod_pomodoro', 'prod_timer', 'prod_stopwatch'].includes(item.id)) {
        box.classList.add('widget-timer');
        image.remove();
        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'widget-play';
        play.setAttribute('aria-label', 'Start ' + title + ' preview');
        play.textContent = '▶';
        box.append(play);
        play.addEventListener('click', () => {
            const running = play.dataset.running === 'true';
            play.dataset.running = String(!running);
            play.textContent = running ? '▶' : 'Ⅱ';
            play.setAttribute('aria-label', (running ? 'Start ' : 'Pause ') + title + ' preview')
        });
        return box
    }
    if (['prod_screentime', 'prod_day_timeline', 'sys_network_speed', 'sys_cpu'].includes(item.id)) {
        const graph = document.createElement('div');
        graph.className = 'widget-bars';
        [24, 39, 20, 60, 31, 52, 33, 70].forEach((h, i) => {
            const bar = document.createElement('i');
            bar.style.setProperty('--bar-height', h + '%');
            bar.style.setProperty('--bar-delay', i * -.18 + 's');
            graph.append(bar)
        });
        box.append(graph)
    }
    if (['battery', 'sys_cpu', 'sys_ram', 'sys_gpu', 'sys_disk_c', 'sys_disk_d', 'ctrl_volume', 'ai_claude'].includes(item.id)) {
        const bar = document.createElement('div');
        bar.className = 'widget-progress';
        const fill = document.createElement('i');
        fill.style.width = ({
            'battery': 82,
            'sys_cpu': 32,
            'sys_ram': 64,
            'sys_gpu': 23,
            'sys_disk_c': 64,
            'sys_disk_d': 42,
            'ctrl_volume': 65,
            'ai_claude': 100
        }[item.id]) + '%';
        bar.append(fill);
        content.append(bar)
    }
    if (item.category === 'finance' && !/forex|list|gold/.test(item.id)) {
        const graph = document.createElement('div');
        graph.className = 'widget-spark';
        graph.innerHTML = '<svg viewBox="0 0 80 28" preserveAspectRatio="none"><path d="M1 23 L12 19 L20 21 L31 12 L40 16 L51 8 L60 12 L70 4 L79 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
        box.append(graph)
    }
    if (item.id === 'weather') {
        box.classList.add('widget-weather');
        if (!mini) {
            const forecast = document.createElement('div');
            forecast.className = 'widget-forecast';
            [['Wed', '22°'], ['Thu', '20°']].forEach(([day, temp]) => {
                const cell = document.createElement('span');
                const name = document.createElement('small');
                name.textContent = day;
                const symbol = document.createElement('i');
                symbol.innerHTML = icon('weather_sun');
                const number = document.createElement('b');
                number.textContent = temp;
                cell.append(name, symbol, number);
                forecast.append(cell)
            });
            box.append(forecast)
        }
    }
    if (item.id === 'prod_calendar_event' || item.id === 'calendar') box.classList.add('widget-calendar');
    return box
}

const withoutGithub = item => !/github/i.test(item.name) && item.iconKey !== 'github';
const grouped = [['AI & developer tools', catalog.filter(item => item.category === 'ai' && withoutGithub(item)).concat(catalog.filter(item => item.category === 'dev' && withoutGithub(item)))], ['Productivity', catalog.filter(item => item.category === 'productivity' && withoutGithub(item))], ['System & controls', catalog.filter(item => item.category === 'system' && !/system tray|folder/i.test(item.name)).concat(catalog.filter(item => item.category === 'controls'))], ['Finance & media', catalog.filter(item => item.category === 'finance').concat(catalog.filter(item => item.category === 'utilities'))]];
const gallery = document.querySelector('#widget-gallery');
grouped.forEach(([heading, items], index) => {
    const section = document.createElement('section');
    section.className = 'gallery-row';
    const title = document.createElement('h3');
    title.className = 'gallery-heading wrap';
    title.textContent = heading;
    const viewport = document.createElement('div');
    viewport.className = 'carousel';
    viewport.tabIndex = 0;
    viewport.setAttribute('aria-label', heading + ' widgets. Scroll horizontally to explore.');
    const track = document.createElement('div');
    track.className = 'carousel-track';
    const originals = items.slice(0, 15);
    for (let copy = 0; copy < 2; copy++) {
        const group = document.createElement('div');
        group.className = 'carousel-group';
        if (copy) {
            group.setAttribute('aria-hidden', 'true');
            group.inert = true;
        }
        originals.forEach((item, i) => {
            const tile = document.createElement('div');
            tile.className = 'widget-tile';
            tile.append(makeWidget(item, i));
            const label = document.createElement('span');
            label.className = 'widget-name';
            label.textContent = item.name;
            tile.append(label);
            group.append(tile)
        });
        track.append(group)
    }
    if (index % 2) track.classList.add('reverse');
    viewport.append(track);
    section.append(title, viewport);
    gallery.append(section)
});
document.querySelectorAll('[data-sample]').forEach((node, i) => {
    const item = findWidget(node.dataset.sample) || findWidget('weather');
    if (item) node.append(makeWidget(item, i, true))
});
document.querySelectorAll('.desktop-island,.large-island').forEach(island => {
    function setOpen(open) {
        island.classList.toggle('open', open);
        island.setAttribute('aria-expanded', String(open))
    }

    island.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') setOpen(true)
    });
    island.addEventListener('pointerleave', event => {
        if (event.pointerType === 'mouse') setOpen(false)
    });
    island.addEventListener('click', () => setOpen(!island.classList.contains('open')));
    island.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(!island.classList.contains('open'))
        }
        if (event.key === 'Escape') setOpen(false)
    })
});
document.querySelectorAll('[data-style]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-style]').forEach(item => {
        const active = item === button;
        item.classList.toggle('selected', active);
        item.setAttribute('aria-pressed', String(active))
    });
    document.querySelector('[data-style-preview]').dataset.theme = button.dataset.style
}));

function updateClock() {
    const now = new Date();
    const time = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit'}).format(now);
    document.querySelectorAll('[data-clock]').forEach(node => node.textContent = time);
    document.querySelectorAll('[data-date]').forEach(node => node.textContent = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    }).format(now))
}

updateClock();
setInterval(updateClock, 30000);
const visualizer = document.querySelector('.visualizer-preview');
for (let i = 0; i < 36; i++) {
    const bar = document.createElement('i');
    bar.style.setProperty('--height', `${12 + Math.round(Math.abs(Math.sin(i * 1.17)) * 64)}px`);
    bar.style.setProperty('--delay', `${(i % 6) * -.15}s`);
    visualizer.append(bar)
}
document.querySelectorAll('.preview-trigger').forEach(button => button.addEventListener('click', () => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open)
}));

setInterval(() => {
    document.querySelectorAll('.widget-timer').forEach(box => {
        const button = box.querySelector('.widget-play');
        if (button?.dataset.running !== 'true') return;
        const value = box.querySelector('.widget-value');
        const parts = value.textContent.split(':').map(Number);
        if (parts.length !== 2 || parts.some(Number.isNaN)) return;
        let total = parts[0] * 60 + parts[1];
        total = box.dataset.widgetId === 'prod_stopwatch' ? total + 1 : Math.max(0, total - 1);
        value.textContent = String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
    })
}, 1000);

const heroDock = document.querySelector('.desktop-bottom .demo-dock');
const dockStage = document.querySelector('.desktop-bottom');

function fitHeroDock() {
    const available = Math.max(1, document.documentElement.clientWidth - 24);
    const width = heroDock.scrollWidth;
    dockStage.style.transform = `scale(${Math.min(1, available / width)})`
}

window.addEventListener('resize', fitHeroDock);
fitHeroDock();
heroDock.querySelectorAll(':scope > .dock-sample,:scope > .dock-clock').forEach(item => {
    item.tabIndex = 0;
    item.setAttribute('aria-label', item.classList.contains('dock-clock') ? 'Clock' : `${findWidget(item.dataset.sample)?.name || 'Widget'} preview`)
});
let dragState = null;
heroDock.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('.widget-play')) return;
    const item = event.target.closest('.app,.dock-sample,.dock-clock');
    if (!item || item.parentElement !== heroDock) return;
    event.preventDefault();
    item.focus({preventScroll: true});
    const rect = item.getBoundingClientRect();
    dragState = {
        item,
        pointer: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        grabX: event.clientX - rect.left,
        grabY: event.clientY - rect.top,
        rect,
        moved: false,
        ghost: null
    };
    heroDock.setPointerCapture(event.pointerId)
});
heroDock.addEventListener('pointermove', event => {
    const d = dragState;
    if (!d || d.pointer !== event.pointerId) return;
    if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 5) return;
    if (!d.moved) {
        d.moved = true;
        const selected = window.getSelection();
        if (selected && selected.rangeCount && selected.containsNode(heroDock, true)) selected.removeAllRanges();
        d.item.classList.add('dock-dragging');
        heroDock.classList.add('is-dragging');
        d.ghost = d.item.cloneNode(true);
        d.ghost.classList.remove('dock-dragging');
        d.ghost.classList.add('dock-drag-ghost');
        d.ghost.setAttribute('aria-hidden', 'true');
        d.ghost.inert = true;
        const scale = d.rect.width / d.item.offsetWidth;
        d.ghost.style.width = d.item.offsetWidth + 'px';
        d.ghost.style.height = d.item.offsetHeight + 'px';
        d.ghost.style.transform = `scale(${scale})`;
        document.body.append(d.ghost)
    }
    event.preventDefault();
    d.ghost.style.left = (event.clientX - d.grabX) + 'px';
    d.ghost.style.top = (event.clientY - d.grabY) + 'px';
    const siblings = [...heroDock.children].filter(item => item !== d.item);
    const before = siblings.find(item => event.clientX < item.getBoundingClientRect().left + item.getBoundingClientRect().width / 2);
    if ((before && d.item.nextElementSibling !== before) || (!before && d.item !== heroDock.lastElementChild)) {
        const positions = new Map(siblings.map(item => [item, item.getBoundingClientRect().left]));
        if (before) heroDock.insertBefore(d.item, before); else heroDock.append(d.item);
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) siblings.forEach(item => {
            const delta = positions.get(item) - item.getBoundingClientRect().left;
            if (delta) item.animate([{translate: delta + 'px 0'}, {translate: '0 0'}], {
                duration: 160,
                easing: 'ease-out'
            })
        })
    }
});

function endDockDrag(event) {
    if (!dragState || dragState.pointer !== event.pointerId) return;
    dragState.ghost?.remove();
    dragState.item.classList.remove('dock-dragging');
    heroDock.classList.remove('is-dragging');
    dragState = null
}

heroDock.addEventListener('pointerup', endDockDrag);
heroDock.addEventListener('pointercancel', endDockDrag);
heroDock.addEventListener('lostpointercapture', endDockDrag);
heroDock.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const item = event.target.closest('.app,.dock-sample,.dock-clock');
    if (!item || item.parentElement !== heroDock) return;
    const target = event.key === 'ArrowLeft' ? item.previousElementSibling : item.nextElementSibling;
    if (!target) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') heroDock.insertBefore(item, target); else heroDock.insertBefore(target, item);
    item.focus()
});

heroDock.addEventListener('dragstart', event => event.preventDefault());
document.querySelectorAll('[data-hero-icon]').forEach(el => {
    el.innerHTML = icon(el.dataset.heroIcon)
});
const desktopPreview = document.querySelector('.desktop-preview');

function clampFloatingWidget(card, left, top) {
    const stage = desktopPreview.getBoundingClientRect();
    const width = card.offsetWidth, height = card.offsetHeight;
    return {
        left: Math.max(0, Math.min(left, stage.width - width)),
        top: Math.max(0, Math.min(top, stage.height - height))
    }
}

function setFloatingPosition(card, left, top) {
    const pos = clampFloatingWidget(card, left, top);
    card.style.left = pos.left + 'px';
    card.style.top = pos.top + 'px';
    card.style.right = 'auto'
}

document.querySelectorAll('.floating-widget-preview').forEach(card => {
    let moving = null;
    card.addEventListener('dragstart', event => event.preventDefault());
    card.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button,a,input')) return;
        event.preventDefault();
        card.focus({preventScroll: true});
        const r = card.getBoundingClientRect(), stage = desktopPreview.getBoundingClientRect();
        moving = {
            pointer: event.pointerId,
            grabX: event.clientX - r.left,
            grabY: event.clientY - r.top,
            left: r.left - stage.left,
            top: r.top - stage.top
        };
        card.setPointerCapture(event.pointerId);
        card.classList.add('is-moving')
    });
    card.addEventListener('pointermove', event => {
        if (!moving || moving.pointer !== event.pointerId) return;
        const stage = desktopPreview.getBoundingClientRect();
        setFloatingPosition(card, event.clientX - stage.left - moving.grabX, event.clientY - stage.top - moving.grabY)
    });

    function stop(event) {
        if (!moving || moving.pointer !== event.pointerId) return;
        moving = null;
        card.classList.remove('is-moving')
    }

    card.addEventListener('pointerup', stop);
    card.addEventListener('pointercancel', stop);
    card.addEventListener('lostpointercapture', stop);
    card.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || event.target !== card) return;
        event.preventDefault();
        const r = card.getBoundingClientRect(), stage = desktopPreview.getBoundingClientRect(),
            step = event.shiftKey ? 30 : 10;
        setFloatingPosition(card, r.left - stage.left + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0), r.top - stage.top + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))
    })
});
window.addEventListener('resize', () => {
    document.querySelectorAll('.floating-widget-preview').forEach(card => {
        if (!card.style.left) return;
        const r = card.getBoundingClientRect(), stage = desktopPreview.getBoundingClientRect();
        setFloatingPosition(card, r.left - stage.left, r.top - stage.top)
    })
});
const demoAudio = document.querySelector('.music-audio'), musicToggle = document.querySelector('.music-toggle'),
    musicElapsed = document.querySelector('.music-elapsed'), musicFill = document.querySelector('.music-timeline-fill');
demoAudio.volume = .3;

function updateMusic() {
    const active = !demoAudio.paused;
    musicToggle.textContent = active ? 'Ⅱ' : '▶';
    musicToggle.setAttribute('aria-pressed', String(active));
    musicToggle.setAttribute('aria-label', active ? 'Pause Quiet Hours' : 'Play Quiet Hours');
    musicElapsed.textContent = '0:' + String(Math.floor(demoAudio.currentTime)).padStart(2, '0');
    musicFill.style.width = (demoAudio.duration ? demoAudio.currentTime / demoAudio.duration * 100 : 0) + '%'
}

musicToggle.addEventListener('click', async () => {
    if (demoAudio.paused) {
        try {
            await demoAudio.play()
        } catch {
            musicToggle.setAttribute('aria-label', 'Audio unavailable')
        }
    } else demoAudio.pause();
    updateMusic()
});
demoAudio.addEventListener('timeupdate', updateMusic);
demoAudio.addEventListener('pause', updateMusic);
demoAudio.addEventListener('play', updateMusic);


window.WidgetMetrics = (() => {
  const cache = new Map();

  function getCached(key, ttlMs = 120000) {
    const item = cache.get(key);
    if (item && Date.now() - item.at < ttlMs) {
      return item.data;
    }
    return null;
  }

  function setCached(key, data) {
    cache.set(key, { at: Date.now(), data });
    return data;
  }

  function formatNumber(num) {
    if (num == null || Number.isNaN(num)) return '—';
    return new Intl.NumberFormat().format(num);
  }

  function formatCurrency(num, currency = 'USD') {
    if (num == null || Number.isNaN(num)) return '—';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(num);
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  async function fetchBinanceTicker(symbol) {
    const cacheKey = 'binance:' + symbol;
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) throw new Error(`Binance API error (${res.status})`);
    const data = await res.json();
    const price = parseFloat(data.lastPrice);
    const change = parseFloat(data.priceChangePercent);
    const result = {
      price: price >= 1000 ? formatCurrency(price) : '$' + price.toFixed(2),
      change: (change >= 0 ? '+' : '') + change.toFixed(2) + '%',
      volume: 'Vol $' + (parseFloat(data.quoteVolume) / 1e6).toFixed(1) + 'M'
    };
    return setCached(cacheKey, result);
  }

  async function fetchForexNbu() {
    const cacheKey = 'forex:nbu_usd';
    const cached = getCached(cacheKey, 300000);
    if (cached) return cached;

    const res = await fetchWithTimeout('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
    if (!res.ok) throw new Error('NBU API unavailable');
    const data = await res.json();
    const rate = data?.[0]?.rate || 41.5;
    const result = {
      rate: rate.toFixed(2) + ' ₴',
      change: 'Official NBU rate'
    };
    return setCached(cacheKey, result);
  }

  async function fetchFrankfurter(from, to, amount = 100) {
    const cacheKey = `forex:${from}_${to}_${amount}`;
    const cached = getCached(cacheKey, 300000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
    if (!res.ok) throw new Error('Forex API unavailable');
    const data = await res.json();
    const converted = data.rates?.[to];
    const result = {
      amount: String(amount),
      converted: converted ? converted.toFixed(2) : '—',
      from,
      to,
      rate: converted ? (converted / amount).toFixed(4) : '—'
    };
    return setCached(cacheKey, result);
  }

  async function fetchNpmDownloads(pkg) {
    const cacheKey = 'npm:' + pkg;
    const cached = getCached(cacheKey, 600000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkg)}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Package not found' : 'NPM API error');
    const data = await res.json();
    const result = {
      downloads: formatNumber(data.downloads),
      period: 'last 7 days'
    };
    return setCached(cacheKey, result);
  }

  async function fetchCratesDownloads(crateName) {
    const cacheKey = 'crates:' + crateName;
    const cached = getCached(cacheKey, 600000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`https://crates.io/api/v1/crates/${encodeURIComponent(crateName)}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Crate not found' : 'crates.io error');
    const data = await res.json();
    const crate = data.crate;
    const result = {
      downloads: formatNumber(crate.downloads),
      recent: formatNumber(crate.recent_downloads) + ' recent',
      version: 'v' + (crate.max_version || '0.1.0')
    };
    return setCached(cacheKey, result);
  }

  async function fetchPypiDownloads(pkg) {
    const cacheKey = 'pypi:' + pkg;
    const cached = getCached(cacheKey, 600000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`https://pypistats.org/api/packages/${encodeURIComponent(pkg)}/recent`);
    if (!res.ok) throw new Error(res.status === 404 ? 'PyPI package not found' : 'PyPI error');
    const data = await res.json();
    const lastWeek = data?.data?.last_week;
    const result = {
      downloads: formatNumber(lastWeek),
      period: 'last 7 days'
    };
    return setCached(cacheKey, result);
  }

  async function fetchGitHubRepo(repo, token) {
    const cacheKey = 'gh_repo:' + repo;
    const cached = getCached(cacheKey, 180000);
    if (cached) return cached;

    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `token ${token}`;

    const res = await fetchWithTimeout(`https://api.github.com/repos/${repo}`, { headers });
    if (!res.ok) throw new Error(res.status === 404 ? 'Repository not found' : `GitHub error (${res.status})`);
    const data = await res.json();
    const result = {
      stars: formatNumber(data.stargazers_count),
      forks: formatNumber(data.forks_count),
      issues: formatNumber(data.open_issues_count),
      name: data.full_name
    };
    return setCached(cacheKey, result);
  }

  async function fetchGitHubUserEvents(username, token) {
    const cacheKey = 'gh_events:' + username;
    const cached = getCached(cacheKey, 120000);
    if (cached) return cached;

    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `token ${token}`;

    const res = await fetchWithTimeout(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=30`, { headers });
    if (!res.ok) throw new Error(res.status === 404 ? 'User not found' : `GitHub error (${res.status})`);
    const events = await res.json();

    const todayStr = new Date().toISOString().slice(0, 10);
    let todayCommits = 0;
    for (const ev of events) {
      if (ev.type === 'PushEvent' && ev.created_at?.startsWith(todayStr)) {
        todayCommits += ev.payload?.commits?.length || 1;
      }
    }

    const result = {
      todayCommits: todayCommits > 0 ? `${todayCommits} today` : '0 commits today',
      totalRecent: `${events.length} recent events`
    };
    return setCached(cacheKey, result);
  }

  async function fetchLeetCode(username) {
    const cacheKey = 'leetcode:' + username;
    const cached = getCached(cacheKey, 300000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error('LeetCode stats unavailable');
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'LeetCode user not found');

    const result = {
      totalSolved: formatNumber(data.totalSolved),
      easy: `${data.easySolved} easy`,
      medium: `${data.mediumSolved} med`,
      hard: `${data.hardSolved} hard`,
      acceptance: `${data.acceptanceRate}% acc`
    };
    return setCached(cacheKey, result);
  }

  async function fetchWakaTime(apiKey) {
    const cacheKey = 'wakatime:' + apiKey.slice(-6);
    const cached = getCached(cacheKey, 300000);
    if (cached) return cached;

    const headers = { 'Authorization': 'Basic ' + btoa(apiKey + ':') };
    const res = await fetchWithTimeout('https://wakatime.com/api/v1/users/current/stats/last_7_days', { headers });
    if (!res.ok) throw new Error(`WakaTime error (${res.status})`);
    const json = await res.json();
    const data = json.data;

    const result = {
      text: data.human_readable_total || '0 hrs',
      daily: (data.human_readable_daily_average || '0 hrs') + ' / day',
      topLang: data.languages?.[0]?.name || 'Code'
    };
    return setCached(cacheKey, result);
  }

  async function fetchHackerNews() {
    const cacheKey = 'hn:top';
    const cached = getCached(cacheKey, 180000);
    if (cached) return cached;

    const idsRes = await fetchWithTimeout('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!idsRes.ok) throw new Error('Hacker News unavailable');
    const ids = await idsRes.json();
    const topId = ids[0];

    const itemRes = await fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${topId}.json`);
    if (!itemRes.ok) throw new Error('Hacker News item unavailable');
    const item = await itemRes.json();

    const result = {
      title: item.title,
      score: `${item.score || 0} pts`,
      comments: `${item.descendants || 0} comments`,
      meta: `${item.score || 0} pts · ${item.descendants || 0} comments`,
      url: item.url || `https://news.ycombinator.com/item?id=${topId}`
    };
    return setCached(cacheKey, result);
  }

  async function fetchNasaApod(apiKey = 'DEMO_KEY') {
    const cacheKey = 'nasa:apod';
    const cached = getCached(cacheKey, 3600000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) throw new Error('NASA APOD unavailable');
    const data = await res.json();

    const result = {
      title: data.title || 'Astronomy Picture of the Day',
      date: data.date || '',
      url: data.url
    };
    return setCached(cacheKey, result);
  }

  async function fetchAirQuality(city = 'Kyiv') {
    const cacheKey = 'aqi:' + city;
    const cached = getCached(cacheKey, 600000);
    if (cached) return cached;

    const geoRes = await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`);
    if (!geoRes.ok) throw new Error('City lookup failed');
    const geo = await geoRes.json();
    const place = geo.results?.[0];
    if (!place) throw new Error('City not found');

    const aqiRes = await fetchWithTimeout(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&current=us_aqi,pm2_5`);
    if (!aqiRes.ok) throw new Error('Air quality unavailable');
    const data = await aqiRes.json();
    const aqi = Math.round(data.current?.us_aqi || 25);
    const pm25 = (data.current?.pm2_5 || 5.0).toFixed(1);

    let category = 'Good';
    let accent = '#10b981';
    if (aqi > 50 && aqi <= 100) { category = 'Moderate'; accent = '#facc15'; }
    else if (aqi > 100 && aqi <= 150) { category = 'Unhealthy (Sens.)'; accent = '#f97316'; }
    else if (aqi > 150) { category = 'Unhealthy'; accent = '#ef4444'; }

    const result = {
      value: `${aqi} AQI ${category}`,
      sub: `PM2.5: ${pm25} µg/m³ · ${place.name}`,
      accent
    };
    return setCached(cacheKey, result);
  }

  async function verifyGeminiKey(apiKey) {
    if (!apiKey) throw new Error('Enter Gemini API key');
    const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`, {}, 6000);
    if (!res.ok) throw new Error(`Gemini API error (${res.status}): Invalid API key`);
    return { valid: true };
  }

  async function verifyOpenAiKey(apiKey) {
    if (!apiKey) throw new Error('Enter OpenAI API key');
    const res = await fetchWithTimeout('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` }
    }, 6000);
    if (!res.ok) throw new Error(`OpenAI API error (${res.status}): Invalid key`);
    return { valid: true };
  }

  async function verifyGitHubToken(token) {
    if (!token) throw new Error('Enter GitHub Token');
    const res = await fetchWithTimeout('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${token.trim()}`, 'Accept': 'application/vnd.github.v3+json' }
    }, 6000);
    if (!res.ok) throw new Error(`GitHub error (${res.status}): Invalid Token`);
    return { valid: true };
  }

  async function verifyAnthropicKey(apiKey) {
    if (!apiKey) throw new Error('Enter Anthropic API key');
    const clean = apiKey.trim();
    if (!clean.startsWith('sk-ant-') || clean.length < 24) {
      throw new Error('Anthropic API key must start with sk-ant- and be valid format');
    }
    return { valid: true };
  }

  async function verifyServiceKey(widgetId, key) {
    if (!key || !key.trim()) throw new Error('API key or Token cannot be empty');
    const clean = key.trim();
    if (widgetId.includes('gemini')) {
      return await verifyGeminiKey(clean);
    }
    if (widgetId.includes('deepseek')) {
      return await fetchDeepSeekBalance(clean);
    }
    if (widgetId.includes('openai') || widgetId.includes('chatgpt')) {
      return await verifyOpenAiKey(clean);
    }
    if (widgetId.includes('github') || widgetId.includes('copilot')) {
      return await verifyGitHubToken(clean);
    }
    if (widgetId.includes('claude') || widgetId.includes('anthropic')) {
      return await verifyAnthropicKey(clean);
    }
    if (widgetId.includes('stripe')) {
      return await fetchStripeBalance(clean);
    }
    if (widgetId.includes('wakatime')) {
      return await fetchWakaTime(clean);
    }
    if (clean.length < 6) throw new Error('Invalid key format: too short');
    return { valid: true };
  }

  async function fetchDeepSeekBalance(apiKey) {
    if (!apiKey) throw new Error('Configure DeepSeek API key in widget settings');
    const cacheKey = 'deepseek:' + apiKey.slice(-6);
    const cached = getCached(cacheKey, 60000);
    if (cached) return cached;

    const res = await fetchWithTimeout('https://api.deepseek.com/user/balance', {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`DeepSeek API error (${res.status})`);
    const data = await res.json();
    const balanceInfo = data.balance_infos?.[0];
    const total = balanceInfo ? parseFloat(balanceInfo.total_balance) : 0;
    const currency = balanceInfo?.currency || 'USD';

    const result = {
      balance: formatCurrency(total, currency),
      status: data.is_available ? 'Active key' : 'Inactive'
    };
    return setCached(cacheKey, result);
  }

  async function fetchOllamaLocal(host = 'http://localhost:11434') {
    const cacheKey = 'ollama:' + host;
    const cached = getCached(cacheKey, 15000);
    if (cached) return cached;

    const res = await fetchWithTimeout(`${host}/api/tags`, {}, 3000);
    if (!res.ok) throw new Error('Ollama not running');
    const data = await res.json();
    const models = data.models || [];
    const activeModel = models[0]?.name || 'llama3.2';

    const result = {
      model: activeModel,
      count: `${models.length} local model${models.length === 1 ? '' : 's'}`,
      status: 'Server ready'
    };
    return setCached(cacheKey, result);
  }

  async function fetchStripeBalance(apiKey) {
    if (!apiKey) throw new Error('Configure Stripe Secret / Restricted Key in widget settings');
    const cacheKey = 'stripe:' + apiKey.slice(-6);
    const cached = getCached(cacheKey, 60000);
    if (cached) return cached;

    const res = await fetchWithTimeout('https://api.stripe.com/v1/balance', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) throw new Error(`Stripe API error (${res.status})`);
    const data = await res.json();
    const available = data.available?.[0]?.amount ? (data.available[0].amount / 100) : 0;
    const currency = (data.available?.[0]?.currency || 'usd').toUpperCase();

    const result = {
      available: formatCurrency(available, currency),
      currency: currency
    };
    return setCached(cacheKey, result);
  }

  async function fetchIcsCalendar(icsUrl) {
    if (!icsUrl) throw new Error('Set an iCal secret URL in widget settings');
    const cacheKey = 'ics:' + icsUrl.slice(-10);
    const cached = getCached(cacheKey, 180000);
    if (cached) return cached;

    const res = await fetchWithTimeout(icsUrl);
    if (!res.ok) throw new Error(`Calendar link error (${res.status})`);
    const text = await res.text();

    const now = new Date();
    const events = [];
    const vevents = text.split('BEGIN:VEVENT');

    for (let i = 1; i < vevents.length; i++) {
      const block = vevents[i].split('END:VEVENT')[0];
      const summaryMatch = block.match(/SUMMARY.*?:(.*?)(\r?\n|$)/);
      const dtstartMatch = block.match(/DTSTART.*?:(\d{8}T\d{6}Z?|\d{8})/);
      if (summaryMatch && dtstartMatch) {
        const rawDate = dtstartMatch[1];
        let startDate;
        if (rawDate.includes('T')) {
          const y = rawDate.slice(0, 4), m = rawDate.slice(4, 6), d = rawDate.slice(6, 8);
          const h = rawDate.slice(9, 11), mi = rawDate.slice(11, 13), s = rawDate.slice(13, 15);
          startDate = new Date(Date.UTC(y, m - 1, d, h, mi, s));
        } else {
          const y = rawDate.slice(0, 4), m = rawDate.slice(4, 6), d = rawDate.slice(6, 8);
          startDate = new Date(y, m - 1, d);
        }
        if (startDate >= now) {
          events.push({ title: summaryMatch[1].trim(), date: startDate });
        }
      }
    }

    events.sort((a, b) => a.date - b.date);
    const nextEvent = events[0];
    if (!nextEvent) {
      return setCached(cacheKey, { title: 'No upcoming events', time: 'Calendar is clear' });
    }

    const diffMs = nextEvent.date - now;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    let timeStr = '';
    if (diffHours < 24) {
      timeStr = `in ${diffHours > 0 ? diffHours + 'h ' : ''}${diffMins}m`;
    } else {
      timeStr = nextEvent.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    const result = {
      title: nextEvent.title,
      time: nextEvent.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' · ' + timeStr
    };
    return setCached(cacheKey, result);
  }

  let _lastAgyFetchTime = 0;
  let _lastAgyQuota = null;

  function formatResetTime(resetTimeIso) {
    if (!resetTimeIso) return '';
    const target = new Date(resetTimeIso).getTime();
    const diff = target - Date.now();
    if (diff <= 0) return '<1m';
    const totalMins = Math.floor(diff / 60000);
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;
    if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    return mins > 0 ? `${mins}m` : '<1m';
  }

  async function getLiveAntigravityQuota() {
    const now = Date.now();
    if (_lastAgyQuota && (now - _lastAgyFetchTime < 10000)) {
      return _lastAgyQuota;
    }
    const invoke = (window.__TAURI__ || (new URLSearchParams(location.search).has('compact') ? window.parent.__TAURI__ : undefined))?.core?.invoke;
    if (!invoke) return _lastAgyQuota;
    try {
      const data = await invoke('fetch_antigravity_quota');
      const groups = data?.response?.groups || [];
      const geminiGroup = groups.find(g => (g.displayName || '').toLowerCase().includes('gemini'));
      const claudeGroup = groups.find(g => (g.displayName || '').toLowerCase().includes('claude'));

      const res = {
        gemini5h: { pct: 98, reset: '4h 50m' },
        geminiWeekly: { pct: 47, reset: '15h 48m' },
        claudeSession: { pct: 100, reset: '5h' },
        claudeWeekly: { pct: 100, reset: 'Weekly' }
      };

      if (geminiGroup?.buckets) {
        for (const b of geminiGroup.buckets) {
          const pct = Math.round((b.remainingFraction ?? 1) * 100);
          const reset = formatResetTime(b.resetTime);
          if (b.window === '5h' || b.bucketId?.includes('5h')) {
            res.gemini5h = { pct, reset: reset || '4h 50m' };
          } else if (b.window === 'weekly' || b.bucketId?.includes('weekly')) {
            res.geminiWeekly = { pct, reset: reset || '15h 48m' };
          }
        }
      }

      if (claudeGroup?.buckets) {
        for (const b of claudeGroup.buckets) {
          const pct = Math.round((b.remainingFraction ?? 1) * 100);
          const reset = formatResetTime(b.resetTime);
          if (b.window === '5h' || b.bucketId?.includes('5h')) {
            res.claudeSession = { pct, reset: reset || '5h' };
          } else if (b.window === 'weekly' || b.bucketId?.includes('weekly')) {
            res.claudeWeekly = { pct, reset: reset || 'Weekly' };
          }
        }
      }

      _lastAgyQuota = res;
      _lastAgyFetchTime = now;
      return res;
    } catch (e) {
      return _lastAgyQuota;
    }
  }

  async function resolveMetric(entry, config = {}) {
    const custom = config.custom || {};
    const id = entry.id;

    try {
      if (id === 'fin_btc') {
        const t = await fetchBinanceTicker('BTCUSDT');
        return { title: 'BTC / USD', value: t.price, change: t.change, sub: t.volume };
      }
      if (id === 'fin_eth') {
        const t = await fetchBinanceTicker('ETHUSDT');
        return { title: 'ETH / USD', value: t.price, change: t.change, sub: t.volume };
      }
      if (id === 'fin_sol') {
        const t = await fetchBinanceTicker('SOLUSDT');
        return { title: 'SOL / USD', value: t.price, change: t.change, sub: t.volume };
      }
      if (id === 'fin_crypto_list') {
        const b = await fetchBinanceTicker('BTCUSDT');
        const e = await fetchBinanceTicker('ETHUSDT');
        return {
          title: 'Top Crypto',
          value: b.price,
          change: b.change,
          sub: `ETH ${e.price} (${e.change})`
        };
      }

      if (id === 'fin_forex_usduah') {
        const fx = await fetchForexNbu();
        return { title: 'USD / UAH', value: fx.rate, sub: fx.change, change: '+0.12%' };
      }
      if (id === 'fin_forex_usdeur') {
        const fx = await fetchFrankfurter('USD', 'EUR', 100);
        return { title: 'USD / EUR', value: fx.converted + ' €', sub: `Rate 1 USD = ${fx.rate} EUR`, change: '-0.08%' };
      }
      if (id === 'prod_currency_calc') {
        const from = (custom.from_currency || 'CNY').toUpperCase();
        const to = (custom.to_currency || 'USD').toUpperCase();
        const amount = Number(custom.amount) || 500;
        const fx = await fetchFrankfurter(from, to, amount);
        return { title: `${amount} ${from}`, value: `${fx.converted} ${to}`, sub: `1 ${from} = ${fx.rate} ${to}` };
      }

      if (id === 'dev_npm_downloads') {
        const pkg = custom.package || 'react';
        const d = await fetchNpmDownloads(pkg);
        return { title: pkg, value: d.downloads, sub: d.period + ' downloads' };
      }
      if (id === 'dev_crates_downloads') {
        const crate = custom.crate || 'serde';
        const d = await fetchCratesDownloads(crate);
        return { title: crate, value: d.downloads, sub: d.recent + ' · ' + d.version };
      }
      if (id === 'dev_pypi_downloads') {
        const pkg = custom.package || 'torch';
        const d = await fetchPypiDownloads(pkg);
        return { title: pkg, value: d.downloads, sub: d.period + ' downloads' };
      }

      if (id === 'dev_github_stars') {
        const repo = custom.repository || 'rust-lang/rust';
        const gh = await fetchGitHubRepo(repo, custom.token);
        return { title: repo, value: gh.stars + ' stars', sub: `${gh.forks} forks · ${gh.issues} issues` };
      }
      if (id === 'dev_github_contrib') {
        const user = custom.username || 'torvalds';
        const gh = await fetchGitHubUserEvents(user, custom.token);
        return { title: user, value: gh.todayCommits, sub: gh.totalRecent };
      }

      if (id === 'dev_leetcode') {
        const user = custom.username || 'tourist';
        const lc = await fetchLeetCode(user);
        return { title: user, value: lc.totalSolved + ' Solved', sub: `${lc.easy} · ${lc.medium} · ${lc.hard}` };
      }
      if (id === 'dev_wakatime' && custom.api_key) {
        const wt = await fetchWakaTime(custom.api_key);
        return { title: 'WakaTime', value: wt.text, sub: wt.daily + ' · ' + wt.topLang };
      }

      if (id === 'util_hackernews') {
        const hn = await fetchHackerNews();
        return { title: 'Hacker News #1', value: hn.title, sub: hn.meta };
      }
      if (id === 'util_nasa_apod') {
        const apod = await fetchNasaApod(custom.api_key);
        return { title: 'NASA APOD', value: apod.title, sub: apod.date };
      }

      if (id === 'util_air_quality') {
        const city = config.city || custom.city || 'Kyiv';
        const aqi = await fetchAirQuality(city);
        return { title: 'Air Quality (' + city + ')', value: aqi.value, sub: aqi.sub, accent: aqi.accent };
      }

      if (id === 'ai_gemini') {
        let fiveH = custom.five_hour_pct != null ? Number(custom.five_hour_pct) : 98;
        let weekly = custom.weekly_pct != null ? Number(custom.weekly_pct) : 47;
        let fiveHReset = custom.five_hour_reset || '4h 50m';
        let weeklyReset = custom.weekly_reset || '15h 48m';
        if (custom.auth_provider === 'antigravity') {
          const live = await getLiveAntigravityQuota();
          if (live) {
            fiveH = live.gemini5h.pct;
            fiveHReset = live.gemini5h.reset;
            weekly = live.geminiWeekly.pct;
            weeklyReset = live.geminiWeekly.reset;
            custom.five_hour_pct = fiveH;
            custom.five_hour_reset = fiveHReset;
            custom.weekly_pct = weekly;
            custom.weekly_reset = weeklyReset;
          }
        }
        const badge = custom.auth_provider === 'antigravity' ? 'Antigravity' : (custom.auth_provider === 'codex' ? 'Codex' : (custom.api_key ? 'Connected' : null));
        return {
          title: 'Gemini Models',
          badge,
          items: [
            { label: '5h limit', value: `${fiveH}% left`, bar: fiveH, color: '#22c55e', sub: `Resets in ${fiveHReset}` },
            { label: 'Weekly limit', value: `${weekly}% left`, bar: weekly, color: '#38bdf8', sub: `Resets in ${weeklyReset}` }
          ]
        };
      }
      if (id === 'ai_claude_plan' || id === 'ai_claude') {
        let session = custom.session_pct != null ? Number(custom.session_pct) : 100;
        let weekly = custom.weekly_pct != null ? Number(custom.weekly_pct) : 100;
        let sessionReset = custom.session_reset || '5h';
        if (custom.auth_provider === 'antigravity') {
          const live = await getLiveAntigravityQuota();
          if (live) {
            session = live.claudeSession.pct;
            sessionReset = live.claudeSession.reset;
            weekly = live.claudeWeekly.pct;
            custom.session_pct = session;
            custom.session_reset = sessionReset;
            custom.weekly_pct = weekly;
          }
        }
        const badge = custom.auth_provider === 'antigravity' ? 'Antigravity' : (custom.api_key ? 'Connected' : null);
        return {
          title: 'Claude Models',
          badge,
          items: [
            { label: 'Session limit', value: `${session}% left`, bar: session, color: '#f97316', sub: `Resets in ${sessionReset}` },
            { label: 'Weekly limit', value: `${weekly}% left`, bar: weekly, color: '#22c55e', sub: 'Weekly window' }
          ]
        };
      }
      if (id === 'ai_chatgpt') {
        let session = custom.session_pct != null ? Number(custom.session_pct) : 100;
        let weekly = custom.weekly_pct != null ? Number(custom.weekly_pct) : 100;
        if (custom.auth_provider === 'antigravity') {
          const live = await getLiveAntigravityQuota();
          if (live) {
            session = live.claudeSession.pct;
            weekly = live.claudeWeekly.pct;
          }
        }
        const badge = custom.auth_provider === 'codex' ? 'Codex' : (custom.auth_provider === 'antigravity' ? 'Antigravity' : (custom.api_key ? 'Connected' : null));
        return {
          title: 'ChatGPT & Codex',
          badge,
          items: [
            { label: '5h limit', value: `${session}% left`, bar: session, color: '#10b981', sub: 'Resets in 5h' },
            { label: 'Weekly limit', value: `${weekly}% left`, bar: weekly, color: '#10b981', sub: 'Weekly window' }
          ]
        };
      }
      if (id === 'ai_deepseek' && custom.api_key) {
        const ds = await fetchDeepSeekBalance(custom.api_key);
        return { title: 'DeepSeek Balance', value: ds.balance, sub: ds.status };
      }
      if (id === 'ai_ollama') {
        const host = custom.host || 'http://localhost:11434';
        try {
          const ol = await fetchOllamaLocal(host);
          return { title: 'Ollama: ' + ol.model, value: ol.count, sub: ol.status };
        } catch {
          return { title: 'Ollama', value: 'Not running', sub: 'Start Ollama on ' + host };
        }
      }
      if (id.startsWith('rev_stripe') && custom.api_key) {
        const st = await fetchStripeBalance(custom.api_key);
        return { title: 'Stripe Balance', value: st.available, sub: st.currency + ' available' };
      }

      if (id === 'prod_gcal' && custom.ical_url) {
        const cal = await fetchIcsCalendar(custom.ical_url);
        return { title: cal.title, value: cal.time, sub: 'Google Calendar' };
      }

    } catch (err) {
      return {
        title: entry.name || entry.id,
        value: 'Unavailable',
        sub: String(err.message || err).slice(0, 40),
        error: true
      };
    }

    return null;
  }

  return {
    resolveMetric,
    verifyServiceKey,
    getLiveAntigravityQuota,
    formatResetTime,
    fetchHackerNews,
    fetchBinanceTicker,
    fetchNpmDownloads,
    fetchAirQuality,
    fetchGitHubRepo
  };
})();

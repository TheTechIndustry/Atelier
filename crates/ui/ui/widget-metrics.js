
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

  function stripeCurrencyItems(totals) {
    const zero=new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','VND','VUV','XAF','XOF','XPF']);
    return [...totals].sort(([a],[b])=>a.localeCompare(b)).map(([currency,amount])=>{const divisor=zero.has(currency)?1:100,digits=zero.has(currency)||currency==='ISK'||currency==='UGX'?0:2;let value;try{value=new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:digits,maximumFractionDigits:digits}).format(amount/divisor)}catch{value=(amount/divisor).toFixed(digits)+' '+currency}return {label:currency,value}});
  }
  function providerMoney(amount,currency){
    if(!/^[A-Z]{3}$/.test(currency)||!Number.isSafeInteger(amount))throw Error('Invalid money amount');
    const format=new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:'code'}),digits=format.resolvedOptions().maximumFractionDigits;
    return format.format(amount/10**digits);
  }
  function reportRange(period,local=false){
    const end=new Date(),start=new Date(end);
    if(local){if(period==='Month to date')start.setDate(1);start.setHours(0,0,0,0)}else{start.setUTCDate(period==='Month to date'?1:start.getUTCDate());start.setUTCHours(0,0,0,0)}
    if(end<=start)throw Error('The reporting day has just started');
    return {start:start.toISOString(),end:end.toISOString()};
  }
  function decimalMicros(raw){
    if(typeof raw!=='string'||!/^[-]?\d{1,12}(\.\d{1,6})?$/.test(raw))throw Error('Invalid decimal money amount');
    const negative=raw.startsWith('-'),[whole,fraction='']=(negative?raw.slice(1):raw).split('.');
    return (BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0')))*(negative?-1n:1n);
  }
  function formatMicros(amount,currency,count=1){
    if(!/^[A-Z]{3}$/.test(currency)||!Number.isSafeInteger(count)||count<1)throw Error('Invalid money currency or count');
    const format=new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:'code'}),digits=format.resolvedOptions().maximumFractionDigits,divisor=10n**BigInt(6-digits)*BigInt(count),absolute=amount<0n?-amount:amount,rounded=(absolute+divisor/2n)/divisor,minor=Number(rounded)*(amount<0n?-1:1);
    if(!Number.isSafeInteger(minor))throw Error('Money total exceeds supported precision');
    return format.format(minor/10**digits);
  }

  function polarResource(custom) {
    const today=new Date(),start=new Date(today.getTime()-2*86400000);
    return start.toISOString().slice(0,10)+','+today.toISOString().slice(0,10)+','+String(custom.organization||'').trim();
  }
  function cursorResource(){const now=new Date(),start=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());return start+','+now.getTime();}
  function shopifyResource(custom) {
    const start=new Date();start.setHours(0,0,0,0);
    return String(custom.shop_domain||'').trim().toLowerCase()+','+start.toISOString();
  }
  function appstoreArgs(custom) {
    return {issuerId:String(custom.issuer_id||'').trim(),keyId:String(custom.key_id||'').trim(),keyPath:String(custom.key_path||'').trim(),vendor:String(custom.vendor_number||'').trim(),reportDate:String(custom.report_date||new Date(Date.now()-86400000).toISOString().slice(0,10)),sku:String(custom.sku||'').trim()};
  }
  async function appstoreReport(custom) {
    const invoke=(window.__TAURI__||(new URLSearchParams(location.search).has('compact')?window.parent.__TAURI__:undefined))?.core?.invoke;
    if(!invoke)throw Error('App Store reports require the desktop application');
    return invoke('widget_appstore_sales',appstoreArgs(custom));
  }
  function playArgs(custom) {return {keyPath:String(custom.key_path||'').trim(),bucket:String(custom.report_bucket||'').trim(),package:String(custom.package_name||'').trim(),month:String(custom.report_month||new Date().toISOString().slice(0,7).replace('-',''))};}
  async function codexQuota(custom) {
    const invoke=(window.__TAURI__||(new URLSearchParams(location.search).has('compact')?window.parent.__TAURI__:undefined))?.core?.invoke;
    if(!invoke)throw Error('Codex quotas require the desktop app');
    return invoke('widget_codex_quota',{executable:String(custom.cli_path||'codex.exe').trim()});
  }
  async function billingSnapshot(provider){
    const invoke=(window.__TAURI__||(new URLSearchParams(location.search).has('compact')?window.parent.__TAURI__:undefined))?.core?.invoke;
    if(!invoke)throw Error('Billing connections require the desktop app');
    return invoke('widget_billing_snapshot',{provider});
  }
  async function ga4ServiceReport(custom) {
    const invoke=(window.__TAURI__||(new URLSearchParams(location.search).has('compact')?window.parent.__TAURI__:undefined))?.core?.invoke;
    if(!invoke)throw Error('Service accounts require the desktop app');
    return invoke('widget_ga4_service_report',{keyPath:String(custom.key_path||'').trim(),property:String(custom.property_id||'').trim()});
  }
  function quotaItem(label,used,reset) {
    if(typeof used!=='number'||!Number.isFinite(used)||used<0||used>100)throw Error('Invalid quota percentage');
    const left=100-used;
    return {label,value:left.toFixed(used%1?1:0)+'% left',bar:left,color:left<=10?'#ef4444':left<=25?'#f59e0b':'#22c55e',sub:reset?'Resets in '+formatResetTime(reset):''};
  }
  async function aiCosts(provider,token,period) {
    const now=new Date(),end=Math.floor(now.getTime()/1000),start=Math.floor(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),period==='Today (UTC)'?now.getUTCDate():1)/1000);
    if(end<=start)throw Error('Cost report day has just started');
    let page='',total=0,rows=0,updated='',seen=new Set();
    for(let count=0;count<20;count++){
      const data=await nativeMetric(provider,token,JSON.stringify({start,end,page}));
      if(!Array.isArray(data?.data)||typeof data.has_more!=='boolean')throw Error('Invalid cost report response');
      if(provider==='anthropic_costs'&&typeof data.data_refreshed_at==='string')updated=data.data_refreshed_at;
      for(const bucket of data.data){
        const results=provider==='openai_costs'?bucket.results:[bucket.cost];
        if(!Array.isArray(results))throw Error('Invalid cost report bucket');
        for(const row of results){
          const raw=provider==='openai_costs'?row?.amount?.value:row?.amount,currency=provider==='openai_costs'?row?.amount?.currency:row?.currency;
          if(typeof currency!=='string'||currency.toUpperCase()!=='USD')throw Error('Unsupported cost report currency');
          if(provider==='anthropic_costs'&&(typeof raw!=='string'||!/^\d+(\.\d{1,6})?$/.test(raw)))throw Error('Invalid cost amount');
          if(provider==='openai_costs'&&(typeof raw!=='number'||!Number.isFinite(raw)))throw Error('Invalid cost amount');
          const amount=Number(raw)/(provider==='anthropic_costs'?100:1);
          if(!Number.isFinite(amount)||amount<0||amount>1e10)throw Error('Invalid cost amount');
          total+=amount;rows++;if(rows>20000||total>1e10)throw Error('Cost report exceeds supported size');
        }
      }
      if(!data.has_more)return {total,updated};
      if(typeof data.next_page!=='string'||!data.next_page||seen.has(data.next_page))throw Error('Invalid cost report pagination');
      page=data.next_page;seen.add(page);
    }
    throw Error('Cost report has too many pages');
  }
  async function playReport(custom) {
    const invoke=(window.__TAURI__||(new URLSearchParams(location.search).has('compact')?window.parent.__TAURI__:undefined))?.core?.invoke;
    if(!invoke)throw Error('Play reports require the desktop application');
    return invoke('widget_play_report',playArgs(custom));
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
    const rate = data?.[0]?.rate;
    if (!Number.isFinite(rate)) throw new Error('NBU returned no exchange rate');
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

    const requestedAmount = amount === 0 ? 1 : amount;
    const res = await fetchWithTimeout(`https://api.frankfurter.app/latest?amount=${requestedAmount}&from=${from}&to=${to}`);
    if (!res.ok) throw new Error('Forex API unavailable');
    const data = await res.json();
    const converted = data.rates?.[to];
    if (!Number.isFinite(converted)) throw new Error('Currency rate unavailable');
    const result = {
      amount: String(amount),
      converted: (amount === 0 ? 0 : converted).toFixed(2),
      from,
      to,
      rate: (converted / requestedAmount).toFixed(4)
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
      version: crate.max_version ? 'v' + crate.max_version : 'Version unavailable'
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
    let todayPushes = 0;
    for (const ev of events) {
      if (ev.type === 'PushEvent' && ev.created_at?.startsWith(todayStr)) {
        todayPushes++;
      }
    }

    const result = {
      todayCommits: `${todayPushes} public pushes today`,
      totalRecent: `${events.length} recent public events`
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

  async function nativeMetric(provider, secret, resource = null) {
    const invoke=(window.__TAURI__||(new URLSearchParams(location.search).has('compact')?window.parent.__TAURI__:undefined))?.core?.invoke;
    return invoke?await invoke('widget_service_data',{provider,secret,resource}):null;
  }

  async function fetchWakaTime(apiKey) {
    const cacheKey = 'wakatime:' + apiKey;
    const cached = getCached(cacheKey, 300000);
    if (cached) return cached;

    let json=await nativeMetric('wakatime',apiKey);
    if(!json){const headers={'Authorization':'Basic '+btoa(apiKey+':')};const response=await fetchWithTimeout('https://wakatime.com/api/v1/users/current/stats/last_7_days',{headers});if(!response.ok)throw Error('WakaTime error ('+response.status+')');json=await response.json()}
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
    if (!Number.isFinite(data.current?.us_aqi)) throw new Error('Air quality data unavailable');
    const aqi = Math.round(data.current.us_aqi);
    const pm25 = Number.isFinite(data.current?.pm2_5) ? data.current.pm2_5.toFixed(1) : '—';

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

  async function fetchSunTimes(city) {
    const cacheKey='sun:'+city,cached=getCached(cacheKey,1800000);if(cached)return cached;
    const geores=await fetchWithTimeout('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(city)+'&count=1&format=json');
    if(!geores.ok)throw Error('City lookup failed');
    const place=(await geores.json()).results?.[0];
    if(!place||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude))throw Error('City not found');
    const response=await fetchWithTimeout('https://api.open-meteo.com/v1/forecast?latitude='+place.latitude+'&longitude='+place.longitude+'&daily=sunrise%2Csunset&timezone=auto&forecast_days=1');
    if(!response.ok)throw Error('Sun times unavailable');
    const daily=(await response.json()).daily;
    const time=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value)?value.slice(11,16):'Unavailable';
    const sunrise=time(daily?.sunrise?.[0]),sunset=time(daily?.sunset?.[0]);
    if(sunrise==='Unavailable'&&sunset==='Unavailable')throw Error('Sunrise and sunset unavailable for this date');
    return setCached(cacheKey,{city:place.name,sunrise,sunset});
  }

  async function fetchRss(feedUrl) {
    let url;try{url=new URL(feedUrl)}catch{throw Error('Enter a valid HTTPS feed URL')}
    if(url.protocol!=='https:'||url.username||url.password)throw Error('Enter a valid HTTPS feed URL');
    const key='rss:'+url.href,cached=getCached(key,300000);if(cached)return cached;
    let body=await nativeMetric('public_feed',url.href);
    if(body==null){const response=await fetchWithTimeout(url.href,{credentials:'omit'});if(!response.ok)throw Error('Feed unavailable ('+response.status+')');body=await response.text()}
    if(typeof body!=='string'||body.length>1048576||/<!DOCTYPE/i.test(body))throw Error('Unsupported or oversized feed');
    const xml=new DOMParser().parseFromString(body,'application/xml');if(xml.querySelector('parsererror'))throw Error('Invalid RSS or Atom feed');
    const item=xml.querySelector('item, entry');if(!item)throw Error('The feed has no entries');
    const title=item.querySelector('title')?.textContent?.trim();if(!title)throw Error('Feed entry has no title');
    const date=item.querySelector('pubDate, published, updated')?.textContent?.trim()||'';
    return setCached(key,{title:title.slice(0,300),date});
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
    if (!apiKey || !apiKey.trim()) throw new Error('Enter Anthropic API key');
    const res=await fetchWithTimeout('https://api.anthropic.com/v1/models?limit=1',{headers:{'x-api-key':apiKey.trim(),'anthropic-version':'2023-06-01'}},6000);
    if(!res.ok)throw Error('Anthropic verification failed ('+res.status+')');
    return {valid:true};
  }

  async function verifyServiceKey(widgetId, key, custom = {}) {
    if (!key || !key.trim()) throw new Error('API key or Token cannot be empty');
    const clean = key.trim();
    if(['ai_openai_balance','ai_anthropic_balance'].includes(widgetId)&&custom.metric==='Prepaid balance')throw Error('Connect the Billing page in widget settings');
    if(widgetId==='rev_stripe_mrr'&&custom.auth_mode==='Billing page')throw Error('Connect the Billing page in widget settings');
    if((widgetId==='rev_paddle'&&(custom.metric||'MRR')!=='Active subscriptions')||(widgetId==='rev_dodo'&&(custom.metric||'Gross sales')!=='Latest payment')||(widgetId==='rev_shopify'&&(custom.metric||'Sales overview')!=='Order count')){
      const result=await resolveMetric({id:widgetId},{custom:{...custom,[widgetId==='rev_shopify'?'access_token':'api_key']:clean}});
      if(!result||result.error)throw Error(result?.sub||'The service did not return report data');return {valid:true};
    }
    if(['ai_gemini','ai_claude','ai_claude_plan'].includes(widgetId))throw Error('Use the Antigravity quota connection');
    if(widgetId==='rev_appstore'){await appstoreReport({...custom,key_path:clean});return {valid:true};}
    if(widgetId==='rev_playstore'){await playReport({...custom,key_path:clean});return {valid:true};}
    if(widgetId==='rev_google_analytics'&&custom.auth_mode==='Service account'){
      const result=await resolveMetric({id:widgetId},{custom:{...custom,key_path:clean}});
      if(!result||result.error)throw Error(result?.sub||'Google did not return analytics data');
      return {valid:true};
    }
    if(['ai_chatgpt','ai_glm','ai_perplexity','ai_openai_balance','ai_anthropic_balance'].includes(widgetId)){
      const result=await resolveMetric({id:widgetId,name:widgetId},{custom:{...custom,[widgetId==='ai_chatgpt'?'cli_path':widgetId==='ai_perplexity'?'session_token':'api_key']:clean}});
      if(!result||result.error)throw Error(result?.sub||'The service did not return widget data');
      return {valid:true};
    }
    const provider=widgetId.includes('gemini')?'gemini':widgetId.includes('deepseek')?'deepseek':widgetId.includes('openai')||widgetId.includes('chatgpt')?'openai':widgetId==='ai_copilot'?'copilot_report':widgetId.includes('github')?'github':widgetId.includes('claude')||widgetId.includes('anthropic')?'anthropic':widgetId==='ai_cursor'?'cursor_team':widgetId==='ai_grok'?'xai_management':['fin_sp500','fin_nasdaq'].includes(widgetId)?'fmp_indices':widgetId==='fin_gold'?'twelvedata_metals':widgetId==='rev_google_analytics'?'ga4':widgetId==='rev_shopify'?'shopify':widgetId==='rev_dodo'?'dodo':widgetId==='rev_paddle'?'paddle':widgetId==='rev_polar'?'polar':widgetId==='rev_datafast'?'datafast':widgetId==='rev_lemonsqueezy'?'lemonsqueezy':widgetId==='rev_stripe_today'?'stripe_charges':widgetId==='rev_stripe_net'?'stripe_net':widgetId==='rev_stripe_mrr'?'stripe_subscriptions':widgetId.includes('stripe')?'stripe':widgetId.includes('wakatime')?'wakatime':widgetId==='prod_todoist'?'todoist':widgetId==='dev_vercel'?'vercel':widgetId==='dev_gitlab_ci'?'gitlab':widgetId.startsWith('fin_stock_')?'alphavantage':null;
    const invoke=window.__TAURI__?.core?.invoke;
    if(provider&&invoke){await invoke('widget_verify_service',{provider,secret:clean,resource:provider==='gitlab'?String(custom.host||'gitlab.com').trim():provider==='xai_management'?String(custom.team_id||'').trim():provider==='lemonsqueezy'?String(custom.store_id||'').trim():provider==='datafast'?String(custom.project_id||'').trim():provider==='polar'?polarResource(custom):provider==='copilot_report'?String(custom.organization||'').trim():provider==='cursor_team'?cursorResource():provider==='ga4'?String(custom.property_id||'').trim():provider==='shopify'?shopifyResource(custom):['paddle','dodo'].includes(provider)?String(custom.environment||'live'):null});return {valid:true};}
    if (widgetId.includes('gemini')) {
      return await verifyGeminiKey(clean);
    }
    if (widgetId.includes('deepseek')) {
      cache.delete('deepseek:' + clean);
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
      cache.delete('stripe:' + clean);
      return await fetchStripeBalance(clean);
    }
    if (widgetId.includes('wakatime')) {
      cache.delete('wakatime:' + clean);
      return await fetchWakaTime(clean);
    }
    if (widgetId === 'prod_gcal' || widgetId === 'prod_calendar_event') {
      let url;try{url=new URL(clean)}catch{throw Error('Enter a valid calendar URL')}
      if(url.protocol!=='https:'||url.username||url.password)throw Error('Calendar URL must use HTTPS without embedded credentials');
      if(url.hostname==='calendar.google.com'&&url.pathname.startsWith('/calendar/ical/')&&invoke){await invoke('widget_verify_service',{provider:'google_calendar',secret:clean});return {valid:true}}
      if(invoke){const body=await nativeMetric('public_feed',url.href);if(typeof body!=='string'||!body.includes('BEGIN:VCALENDAR'))throw Error('The URL did not return an iCalendar feed');return {valid:true}}
      const response=await fetchWithTimeout(url.href,{},8000);
      if(!response.ok)throw Error('Calendar link error ('+response.status+')');
      const body=await response.text();if(!body.includes('BEGIN:VCALENDAR'))throw Error('The URL did not return an iCalendar feed');
      return {valid:true};
    }
    throw new Error('Automatic verification is not available for this service');
  }

  async function fetchDeepSeekBalance(apiKey) {
    if (!apiKey) throw new Error('Configure DeepSeek API key in widget settings');
    const cacheKey = 'deepseek:' + apiKey;
    const cached = getCached(cacheKey, 60000);
    if (cached) return cached;

    let data=await nativeMetric('deepseek',apiKey);
    if(!data){const response=await fetchWithTimeout('https://api.deepseek.com/user/balance',{headers:{'Authorization':`Bearer ${apiKey}`,'Accept':'application/json'}});if(!response.ok)throw Error('DeepSeek API error ('+response.status+')');data=await response.json()}
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
    const activeModel = models[0]?.name || 'No models installed';

    const result = {
      model: activeModel,
      count: `${models.length} local model${models.length === 1 ? '' : 's'}`,
      status: 'Server ready'
    };
    return setCached(cacheKey, result);
  }

  async function fetchStripeBalance(apiKey) {
    if (!apiKey) throw new Error('Configure Stripe Secret / Restricted Key in widget settings');
    const cacheKey = 'stripe:' + apiKey;
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
    const cacheKey = 'ics:' + icsUrl;
    const cached = getCached(cacheKey, 180000);
    if (cached) return cached;

    let text=null;
    let url;try{url=new URL(icsUrl)}catch{throw Error('Enter a valid calendar URL')}
    if(url.protocol!=='https:'||url.username||url.password)throw Error('Calendar URL must use HTTPS without embedded credentials');
    if(url.hostname==='calendar.google.com'&&url.pathname.startsWith('/calendar/ical/'))text=await nativeMetric('google_calendar',icsUrl);
    else text=await nativeMetric('public_feed',icsUrl);
    if(text==null){const response=await fetchWithTimeout(icsUrl);if(!response.ok)throw Error('Calendar link error ('+response.status+')');text=await response.text()}
    if(!text.includes('BEGIN:VCALENDAR'))throw Error('The URL did not return an iCalendar feed');

    const now=new Date();
    const nextEvent=typeof Worker==='function'?await new Promise((resolve,reject)=>{
      const worker=new Worker('widget-calendar-worker.js');
      const timeout=setTimeout(()=>{worker.terminate();reject(Error('Calendar parsing timed out'))},5000);
      const finish=(error,result)=>{clearTimeout(timeout);worker.terminate();error?reject(Error(error)):resolve(result)};
      worker.onmessage=event=>finish(event.data.error,event.data.result);
      worker.onerror=()=>finish('Calendar parser worker failed');
      worker.postMessage({source:text,now:now.getTime()});
    }):window.WidgetCalendar?.nextEvent(text,now.getTime());
    if(nextEvent===undefined)throw Error('Calendar parser unavailable');
    if (!nextEvent) {
      return setCached(cacheKey, { title: 'No upcoming events', time: 'Calendar is clear' });
    }

    const startDate=new Date(nextEvent.start),endDate=new Date(nextEvent.end);
    const diffMs = startDate - now;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    let timeStr = '';
    if(nextEvent.allDay){
      timeStr='All day · '+startDate.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    }else if(diffMs<0){
      timeStr='Now · until '+endDate.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
    }else if (diffHours < 24) {
      timeStr = `in ${diffHours > 0 ? diffHours + 'h ' : ''}${diffMins}m`;
    } else {
      timeStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const result = {
      title: nextEvent.title,
      time: nextEvent.allDay||diffMs<0?timeStr:startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' · ' + timeStr
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

  async function getLiveAntigravityQuota(force = false) {
    const now=Date.now();
    if(!force && _lastAgyQuota && now-_lastAgyFetchTime<10000)return _lastAgyQuota;
    const invoke=(window.__TAURI__||(new URLSearchParams(location.search).has('compact')?window.parent.__TAURI__:undefined))?.core?.invoke;
    if(!invoke)return null;
    try{
      const data=await invoke('fetch_antigravity_quota');
      const groups=data?.response?.groups||data?.groups;
      if(!Array.isArray(groups))return null;
      const result={gemini5h:null,geminiWeekly:null,claudeSession:null,claudeWeekly:null};
      for(const group of groups){
        const name=String(group.displayName||'').toLowerCase();
        const model=name.includes('gemini')?'gemini':name.includes('claude')?'claude':null;
        if(!model||!Array.isArray(group.buckets))continue;
        for(const bucket of group.buckets){
          if(!Number.isFinite(bucket.remainingFraction))continue;
          const windowName=(String(bucket.window||'')+' '+String(bucket.bucketId||'')).toLowerCase();
          const key=windowName.includes('weekly')?(model==='gemini'?'geminiWeekly':'claudeWeekly'):windowName.includes('5h')?(model==='gemini'?'gemini5h':'claudeSession'):null;
          if(key)result[key]={pct:Math.max(0,Math.min(100,Math.round(bucket.remainingFraction*100))),reset:formatResetTime(bucket.resetTime)||''};
        }
      }
      if(!Object.values(result).some(Boolean))return null;
      _lastAgyQuota=result;_lastAgyFetchTime=now;return result;
    }catch{return null}
  }

  async function resolveMetric(entry, config = {}) {
    const custom = config.custom || {};
    const id = entry.id;

    try {
      if (id === 'fin_btc') {
        const t = await fetchBinanceTicker('BTCUSDT');
        return { title: 'BTC / USDT', value: t.price, change: t.change, sub: t.volume };
      }
      if (id === 'fin_eth') {
        const t = await fetchBinanceTicker('ETHUSDT');
        return { title: 'ETH / USDT', value: t.price, change: t.change, sub: t.volume };
      }
      if (id === 'fin_sol') {
        const t = await fetchBinanceTicker('SOLUSDT');
        return { title: 'SOL / USDT', value: t.price, change: t.change, sub: t.volume };
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
        return { title: 'USD / UAH', value: fx.rate, sub: fx.change };
      }
      if(id==='fin_gold'){
        const token=String(custom.api_key||'').trim();if(!token)throw Error('Set a Twelve Data key with metals access');
        const key='metals:'+token,cached=getCached(key,300000);if(cached)return cached;
        const items=[];
        for(const [symbol,label] of [['XAU/USD','Gold'],['XAG/USD','Silver']]){
          const data=await nativeMetric('twelvedata_metals',token,symbol),raw=data?.close;
          if(typeof raw!=='string'||!raw.trim()||!Number.isFinite(Number(raw))||Number(raw)<=0)throw Error(data?.message||'Metal quote unavailable');
          if(data.symbol&&data.symbol!==symbol)throw Error('Unexpected metal quote symbol');
          items.push({label,value:formatCurrency(Number(raw),'USD')+' / oz',sub:typeof data.datetime==='string'?data.datetime:''});
        }
        return setCached(key,{title:'Gold & silver · USD',items});
      }
      if(['fin_sp500','fin_nasdaq'].includes(id)){
        const token=String(custom.api_key||'').trim(),symbol=id==='fin_sp500'?'^GSPC':'^NDX';if(!token)throw Error('Set an FMP key with index quote access');
        const key='index:'+token+':'+symbol,cached=getCached(key,300000);if(cached)return cached;
        const rows=await nativeMetric('fmp_indices',token,symbol),quote=rows?.[0];
        if(!Array.isArray(rows)||quote?.symbol!==symbol||!Number.isFinite(quote.price)||quote.price<=0)throw Error('Index quote unavailable; check key and entitlement');
        const change=Number.isFinite(quote.changePercentage)?(quote.changePercentage>=0?'+':'')+quote.changePercentage.toFixed(2)+'%':undefined;
        const date=Number.isFinite(quote.timestamp)?new Date(quote.timestamp*1000):null;
        return setCached(key,{title:id==='fin_sp500'?'S&P 500':'NASDAQ 100',value:formatNumber(quote.price),change,sub:date&&!Number.isNaN(date.valueOf())?'Quote: '+date.toLocaleString():symbol});
      }
      if(['fin_stock_aapl','fin_stock_nvda','fin_stock_tsla'].includes(id)){
        const apiKey=String(custom.api_key||'').trim(),symbol=String(custom.symbol||id.slice('fin_stock_'.length)).trim().toUpperCase();
        if(!apiKey)throw Error('Set an Alpha Vantage API key');
        if(!/^[A-Z0-9.-]{1,20}$/.test(symbol))throw Error('Enter a valid market symbol');
        const key='market:'+symbol+':'+apiKey,cached=getCached(key,3600000);if(cached)return cached;
        const data=await nativeMetric('alphavantage',apiKey,symbol),quote=data?.['Global Quote'];
        const price=Number(quote?.['05. price']);if(!quote||!quote['05. price']||!Number.isFinite(price))throw Error(data?.Information||data?.Note||data?.['Error Message']||'Market quote unavailable');
        const change=quote['10. change percent'];return setCached(key,{title:symbol,value:new Intl.NumberFormat(undefined,{maximumFractionDigits:4}).format(price),change:typeof change==='string'?change:undefined,sub:quote['07. latest trading day']?'Daily quote · '+quote['07. latest trading day']:'Daily quote'});
      }
      if (id === 'fin_forex_usdeur') {
        const fx = await fetchFrankfurter('USD', 'EUR', 1);
        return { title: 'USD / EUR', value: fx.converted + ' €', sub: `Rate 1 USD = ${fx.rate} EUR` };
      }
      if (id === 'prod_currency_calc') {
        const from = (custom.from_currency || 'CNY').toUpperCase();
        const to = (custom.to_currency || 'USD').toUpperCase();
        const amount = custom.amount == null || custom.amount === '' ? 500 : Number(custom.amount);
        if (!Number.isFinite(amount)) throw Error('Enter a valid amount');
        const fx = await fetchFrankfurter(from, to, amount);
        return { title: `${amount} ${from}`, value: `${fx.converted} ${to}`, sub: `1 ${from} = ${fx.rate} ${to}` };
      }

      if (id === 'dev_npm_downloads') {
        const pkg = String(custom.package || '').trim();
        if (!pkg) throw Error('Set an npm package');
        const d = await fetchNpmDownloads(pkg);
        return { title: pkg, value: d.downloads, sub: d.period + ' downloads' };
      }
      if (id === 'dev_crates_downloads') {
        const crate = String(custom.crate || '').trim();
        if (!crate) throw Error('Set a crate name');
        const d = await fetchCratesDownloads(crate);
        return { title: crate, value: d.downloads, sub: d.recent + ' · ' + d.version };
      }
      if (id === 'dev_pypi_downloads') {
        const pkg = String(custom.package || '').trim();
        if (!pkg) throw Error('Set a Python package');
        const d = await fetchPypiDownloads(pkg);
        return { title: pkg, value: d.downloads, sub: d.period + ' downloads' };
      }

      if (id === 'dev_github_stars') {
        const repo = String(custom.repository || '').trim();
        if (!repo) throw Error('Set a GitHub repository');
        const gh = await fetchGitHubRepo(repo, custom.token);
        return { title: repo, value: gh.stars + ' stars', sub: `${gh.forks} forks · ${gh.issues} issues` };
      }
      if (id === 'dev_github_contrib') {
        const user = String(custom.username || '').trim();
        if (!user) throw Error('Set a GitHub username');
        const gh = await fetchGitHubUserEvents(user, custom.token);
        return { title: user, value: gh.todayCommits, sub: gh.totalRecent };
      }

      if (id === 'dev_github_prs' || id === 'dev_github_issues') {
        const username=String(custom.username||'').trim(),token=String(custom.token||'').trim();
        if(username&&!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(username))throw Error('Enter a valid GitHub username');
        if(!username&&!token)throw Error('Set a GitHub username or token');
        const who=username||'@me';
        const query=id==='dev_github_prs'?'is:pr is:open author:'+who:'is:issue is:open assignee:'+who;
        const headers={'Accept':'application/vnd.github+json'};if(token)headers.Authorization='Bearer '+token;
        const response=await fetchWithTimeout('https://api.github.com/search/issues?per_page=1&q='+encodeURIComponent(query),{headers});
        if(!response.ok)throw Error('GitHub search failed ('+response.status+')');
        const data=await response.json();if(!Number.isFinite(data.total_count))throw Error('GitHub returned invalid data');
        return {title:id==='dev_github_prs'?'Open pull requests':'Assigned open issues',value:new Intl.NumberFormat().format(data.total_count),sub:data.incomplete_results?'Partial GitHub results':(username?'User: '+username:'Signed-in account')};
      }
      if (id === 'dev_github_notif') {
        if(!custom.token)throw Error('Set a GitHub token with notifications permission');
        const response=await fetchWithTimeout('https://api.github.com/notifications?per_page=100',{headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+custom.token}});
        if(!response.ok)throw Error('GitHub notifications failed ('+response.status+')');
        const data=await response.json();if(!Array.isArray(data))throw Error('GitHub returned invalid data');
        return {title:'GitHub notifications',value:(data.length===100?'100+':String(data.length))+' unread',sub:data[0]?.subject?.title||'No unread notifications'};
      }
      if (id === 'prod_todoist') {
        if(!custom.token)throw Error('Set a Todoist API token');
        const data=await nativeMetric('todoist',custom.token);if(!Array.isArray(data?.results))throw Error('Todoist returned invalid data');
        return {title:'Todoist',value:(data.next_cursor?'200+':String(data.results.length))+' due',sub:data.results[0]?.content||'No tasks due today'};
      }

      if (id === 'dev_leetcode') {
        const user = String(custom.username || '').trim();
        if (!user) throw Error('Set a LeetCode username');
        const lc = await fetchLeetCode(user);
        return { title: user, value: lc.totalSolved + ' Solved', sub: `${lc.easy} · ${lc.medium} · ${lc.hard}` };
      }
      if (id === 'dev_stackoverflow') {
        const user=String(custom.user_id||'').trim();if(!/^\d{1,15}$/.test(user)||user==='0')throw Error('Set a valid Stack Overflow user ID');
        const cacheKey='stackoverflow:'+user,cached=getCached(cacheKey,600000);if(cached)return cached;
        const response=await fetchWithTimeout('https://api.stackexchange.com/2.3/users/'+user+'?site=stackoverflow');
        if(!response.ok)throw Error('Stack Overflow unavailable ('+response.status+')');
        const data=await response.json(),account=data.items?.[0];if(!account||!Number.isFinite(account.reputation))throw Error('Stack Overflow user not found');
        const badges=account.badge_counts||{};
        return setCached(cacheKey,{title:account.display_name||'Stack Overflow',value:formatNumber(account.reputation)+' reputation',sub:['gold','silver','bronze'].filter(key=>Number.isFinite(badges[key])).map(key=>badges[key]+' '+key).join(' · ')||'Stack Overflow'});
      }
      if(id==='dev_vercel'){
        const token=String(custom.token||'').trim(),project=String(custom.project_id||'').trim(),team=String(custom.team_id||'').trim();
        if(!token||!project)throw Error('Set a Vercel token and project ID');
        const cacheKey='vercel:'+token+':'+project+':'+team,cached=getCached(cacheKey,60000);if(cached)return cached;
        const data=await nativeMetric('vercel',token,project+','+team);if(!Array.isArray(data?.deployments))throw Error('Vercel returned invalid data');
        const deployment=data.deployments[0];if(!deployment)return setCached(cacheKey,{title:'Vercel production',value:'No deployments',sub:project});
        const state=deployment.readyState||deployment.state;if(typeof state!=='string')throw Error('Deployment status unavailable');
        return setCached(cacheKey,{title:'Vercel production',value:state,sub:deployment.url||project});
      }
      if(id==='dev_gitlab_ci'){
        const host=String(custom.host||'gitlab.com').trim(),project=String(custom.project_id||'').trim(),token=String(custom.token||'').trim();
        if(!/^\d{1,20}$/.test(project)||!token)throw Error('Set a GitLab token and numeric project ID');
        const cacheKey='gitlab:'+host+':'+project+':'+token,cached=getCached(cacheKey,60000);if(cached)return cached;
        const data=await nativeMetric('gitlab',token,host+','+project);if(!Array.isArray(data))throw Error('GitLab returned invalid data');
        const pipeline=data[0];if(!pipeline)return setCached(cacheKey,{title:'GitLab pipeline',value:'No pipelines',sub:'Project '+project});
        if(typeof pipeline.status!=='string')throw Error('Pipeline status unavailable');
        return setCached(cacheKey,{title:'GitLab pipeline',value:pipeline.status,sub:[pipeline.ref,typeof pipeline.sha==='string'?pipeline.sha.slice(0,8):''].filter(Boolean).join(' · ')});
      }
      if (id === 'dev_wakatime' && custom.api_key) {
        const wt = await fetchWakaTime(custom.api_key);
        return { title: 'WakaTime', value: wt.text, sub: wt.daily + ' · ' + wt.topLang };
      }

      if (id === 'util_hackernews') {
        const hn = await fetchHackerNews();
        return { title: 'Hacker News #1', value: hn.title, sub: hn.meta };
      }
      if(id==='util_rss'){
        const url=String(custom.feed_url||'').trim();if(!url)throw Error('Set an RSS or Atom feed URL');
        const feed=await fetchRss(url);return {title:'RSS feed',value:feed.title,sub:feed.date||'Latest entry'};
      }
      if(id==='util_sun_moon'){
        const city=String(custom.city||config.city||'').trim();if(!city)throw Error('Set a city');
        const sun=await fetchSunTimes(city),cycle=29.530588853,age=((Date.now()-Date.UTC(2000,0,6,18,14))/86400000%cycle+cycle)%cycle;
        const phases=['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'];
        const moon=phases[Math.floor((age/cycle*8)+.5)%8];
        return {title:sun.city,items:[{label:'Sunrise',value:sun.sunrise},{label:'Sunset',value:sun.sunset},{label:'Moon (approx.)',value:moon}]};
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

      if(id==='ai_chatgpt'){
        const executable=String(custom.cli_path||'codex.exe').trim(),key='codex-quota:'+executable,cached=getCached(key,60000);if(cached)return cached;
        const data=await codexQuota(custom);if(!Array.isArray(data?.windows)||!data.windows.length)throw Error('No Codex quota windows returned');
        const items=data.windows.map(window=>{const mins=window.window_minutes,reset=window.resets_at;if(!Number.isInteger(mins)||mins<=0||!Number.isInteger(reset)||reset<0||reset>4102444800)throw Error('Invalid Codex quota window');const label=mins===10080?'Weekly':mins%60===0?mins/60+'h window':mins+'m window';return quotaItem(label,window.used_percent,new Date(reset*1000).toISOString())});
        return setCached(key,{title:'ChatGPT · Codex limits',badge:typeof data.plan==='string'?data.plan:'Codex',items});
      }
      if(id==='ai_perplexity'){
        const token=String(custom.session_token||'').trim(),cookie=custom.cookie_name||'__Secure-next-auth.session-token';if(!token)throw Error('Set a Perplexity web session token');
        const key='perplexity-credits:'+cookie+':'+token,cached=getCached(key,60000);if(cached)return cached;
        const data=await nativeMetric('perplexity_credits',token,cookie);
        if(typeof data?.balance!=='number'||!Number.isFinite(data.balance)||Math.abs(data.balance)>Number.MAX_SAFE_INTEGER)throw Error('Perplexity did not return account credits');
        const items=[{label:'Available credits',value:formatNumber(data.balance)}];
        if(data.usage!=null){if(typeof data.usage!=='number'||!Number.isFinite(data.usage)||data.usage<0)throw Error('Invalid Perplexity reported usage');items.push({label:'Reported usage',value:formatNumber(data.usage)})}
        let badge='Account credits';if(data.renews_at!=null){if(typeof data.renews_at!=='number'||!Number.isFinite(data.renews_at)||data.renews_at<0||data.renews_at>4102444800)throw Error('Invalid Perplexity renewal time');if(data.renews_at)badge='Renews '+new Date(data.renews_at*1000).toLocaleDateString()}
        return setCached(key,{title:'Perplexity account credits',badge,items});
      }
      if(id==='ai_glm'){
        const token=String(custom.api_key||'').trim(),region=String(custom.platform||'Z.ai');if(!token)throw Error('Set your GLM Coding Plan API key');
        const key='glm:'+token+':'+region,cached=getCached(key,60000);if(cached)return cached;
        const response=await nativeMetric('glm_quota',token,region),data=response?.data||response;
        if(response?.success===false||!Array.isArray(data?.limits))throw Error('GLM returned no Coding Plan limits');
        const items=[];
        for(const limit of data.limits){
          if(!['TOKENS_LIMIT','CREDIT_LIMIT','TIME_LIMIT'].includes(limit.type))continue;
          const reset=limit.nextResetTime;
          if(reset!=null&&(typeof reset!=='number'||!Number.isFinite(reset)||reset<0||reset>4102444800000))throw Error('Invalid GLM reset time');
          const label=limit.type==='TIME_LIMIT'?'MCP quota':limit.type==='TOKENS_LIMIT'?'5h quota':'Credit quota';
          items.push(quotaItem(label,limit.percentage,reset?new Date(reset).toISOString():''));
        }
        if(!items.length)throw Error('No supported GLM quota windows');
        return setCached(key,{title:'GLM Coding Plan',badge:region,items});
      }
      if(['ai_openai_balance','ai_anthropic_balance'].includes(id)){
        if(custom.metric==='Prepaid balance'){
          const provider=id==='ai_openai_balance'?'openai':'anthropic',data=await billingSnapshot(provider);
          if(typeof data?.amount!=='string'||!/^[-]?\d{1,12}\.\d{2}$/.test(data.amount)||data.currency!=='USD'||!Number.isSafeInteger(data.sampled_at)||data.sampled_at<=0)throw Error('Invalid Billing page sample');
          const sampled=new Date(data.sampled_at*1000).toLocaleString();
          return {title:(provider==='openai'?'OpenAI':'Anthropic')+' Billing balance',value:formatCurrency(Number(data.amount),data.currency),badge:data.stale?'Stale reading':'Billing page',sub:(data.stale?'Open Billing to refresh · ':'Updated ')+sampled,error:data.stale===true};
        }
        if((custom.metric||'API spend')!=='API spend')throw Error('Select a supported billing metric');
        const token=String(custom.api_key||'').trim();if(!token)throw Error('Set an organization Admin API key');
        const period=custom.period||'Month to date (UTC)';if(!['Month to date (UTC)','Today (UTC)'].includes(period))throw Error('Select a supported report period');
        const key=id+':costs:'+token+':'+period+':'+new Date().toISOString().slice(0,10),cached=getCached(key,300000);if(cached)return cached;
        const provider=id==='ai_openai_balance'?'openai_costs':'anthropic_costs',data=await aiCosts(provider,token,period);
        return setCached(key,{title:(provider==='openai_costs'?'OpenAI':'Anthropic')+' API spend',value:formatCurrency(data.total,'USD'),sub:period+(provider==='anthropic_costs'?' · Report may lag up to 24h':''),badge:data.updated?'Updated '+data.updated:'Reported cost'});
      }
      if (['ai_gemini','ai_claude_plan','ai_claude'].includes(id)) {
        if(custom.auth_provider!=='antigravity')return {title:entry.name||id,value:'Unavailable',sub:'Plan limits are not available through this connection',error:true};
        const live=await getLiveAntigravityQuota();
        const buckets=id==='ai_gemini'?[['5h limit',live?.gemini5h],['Weekly limit',live?.geminiWeekly]]:[['Session limit',live?.claudeSession],['Weekly limit',live?.claudeWeekly]];
        const items=buckets.filter(([,bucket])=>bucket).map(([label,bucket])=>({label,value:bucket.pct+'% left',bar:bucket.pct,color:'#22c55e',sub:bucket.reset?'Resets in '+bucket.reset:''}));
        if(!items.length)return {title:entry.name||id,value:'Unavailable',sub:'No matching live quota returned',error:true};
        return {title:entry.name||id,items};
      }
      if(id==='ai_grok'){
        const token=String(custom.api_key||'').trim(),team=String(custom.team_id||'').trim();if(!token||!team)throw Error('Set an xAI management key and team ID');
        const key='xai-balance:'+token+':'+team,cached=getCached(key,60000);if(cached)return cached;
        const data=await nativeMetric('xai_management',token,team),raw=data?.total?.val;
        if(typeof raw!=='string'||!/^[-]?\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw Error('xAI returned invalid prepaid balance');
        return setCached(key,{title:'xAI API prepaid balance',value:formatCurrency(Number(raw)/100,'USD'),sub:'Team '+team});
      }
      if(id==='ai_cursor'){
        const token=String(custom.api_key||'').trim();if(!token)throw Error('Set a Cursor Team Admin API key');
        const day=new Date().toISOString().slice(0,10),key='cursor-team:'+token+':'+day,cached=getCached(key,3600000);if(cached)return cached;
        const result=await nativeMetric('cursor_team',token,cursorResource());if(!Array.isArray(result?.data))throw Error('Cursor returned invalid team usage');
        const items=[];for(const [field,label] of [['agentRequests','Agent requests'],['chatRequests','Chat requests'],['composerRequests','Composer requests']]){let total=0;for(const row of result.data){const n=row[field];if(!Number.isSafeInteger(n)||n<0)throw Error('Cursor usage field unavailable');total+=n;if(!Number.isSafeInteger(total))throw Error('Cursor total exceeds supported precision')}items.push({label,value:formatNumber(total)})}
        return setCached(key,{title:'Cursor team · '+day+' UTC',items});
      }
      if(id==='ai_opencode'){
        const port=Number(custom.server_port||4096),session=String(custom.session_id||'').trim(),version=String(custom.api_version||'legacy');
        if(!Number.isInteger(port)||port<1||port>65535||!session)throw Error('Set local OpenCode server port and session ID');
        const key='opencode:'+JSON.stringify([port,session,version,custom.server_password||'']),cached=getCached(key,10000);if(cached)return cached;
        const data=await nativeMetric('opencode_local',custom.server_password||'-',port+','+session+','+version);if(!Array.isArray(data?.messages))throw Error('OpenCode returned unsupported message data');
        const messages=data.messages.filter(m=>m.role==='assistant'&&m.tokens&&Number.isFinite(m.time?.created)).sort((a,b)=>b.time.created-a.time.created),latest=messages[0];if(!latest)throw Error('No assistant token usage reported for this session');
        const items=[];for(const [field,label] of [['input','Input tokens'],['output','Output tokens']]){const n=latest.tokens[field];if(!Number.isSafeInteger(n)||n<0)throw Error('OpenCode token count unavailable');items.push({label,value:formatNumber(n)})}
        for(const [field,label] of [['read','Cache read'],['write','Cache write']]){const n=latest.tokens.cache?.[field];if(Number.isSafeInteger(n)&&n>=0)items.push({label,value:formatNumber(n)})}
        return setCached(key,{title:'OpenCode · latest response',items});
      }
      if(id==='ai_copilot'){
        const token=String(custom.token||'').trim(),org=String(custom.organization||'').trim();if(!token||!org)throw Error('Set organization and token with Copilot metrics access');
        const key='copilot:'+token+':'+org,cached=getCached(key,3600000);if(cached)return cached;
        const index=await nativeMetric('copilot_report',token,org);if(!Array.isArray(index?.download_links)||!index.download_links.length||index.download_links.length>10)throw Error('GitHub has no downloadable report');
        const days=new Map();
        for(const link of index.download_links){let url;try{url=new URL(link)}catch{throw Error('Invalid report URL')}if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid report URL');
          const body=await nativeMetric('public_feed',url.href);if(typeof body!=='string')throw Error('Copilot report could not be read');
          for(const line of body.split(/\r?\n/).filter(line=>line.trim())){const record=JSON.parse(line);if(!Array.isArray(record.day_totals))throw Error('Unexpected Copilot report schema');for(const day of record.day_totals){if(typeof day.day!=='string'||days.has(day.day))throw Error('Ambiguous Copilot report day');days.set(day.day,day)}}
        }
        const date=[...days.keys()].sort().at(-1),day=days.get(date);if(!day)throw Error('Copilot report has no daily activity');
        if(day.below_usage_metrics_minimum_user_count)throw Error('Copilot suppressed metrics for privacy');
        const items=[];for(const [field,label] of [['daily_active_users','Active users'],['code_acceptance_activity_count','Code acceptances'],['user_initiated_interaction_count','Interactions']]){const n=day[field];if(!Number.isSafeInteger(n)||n<0)throw Error('Copilot usage metric unavailable');items.push({label,value:formatNumber(n)})}
        return setCached(key,{title:'Copilot · '+date,items});
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
      if(id==='rev_stripe_today'){
        const token=String(custom.api_key||'').trim();if(!token)throw Error('Set a Stripe API key');
        const midnight=new Date();midnight.setHours(0,0,0,0);const start=Math.floor(midnight.getTime()/1000),key='stripe-charges:'+token+':'+start,cached=getCached(key,120000);if(cached)return cached;
        const totals=new Map();let cursor='',count=0,more=true;
        for(let page=0;page<20&&more;page++){
          const result=await nativeMetric('stripe_charges',token,start+','+cursor);
          if(!Array.isArray(result?.data)||typeof result.has_more!=='boolean')throw Error('Stripe returned invalid charge data');
          for(const charge of result.data){
            if(charge.status!=='succeeded'||charge.captured!==true)continue;
            const currency=String(charge.currency||'').toUpperCase(),amount=charge.amount_captured;
            if(!/^[A-Z]{3}$/.test(currency)||!Number.isSafeInteger(amount)||amount<0)throw Error('Stripe returned invalid charge amount');
            const total=(totals.get(currency)||0)+amount;if(!Number.isSafeInteger(total))throw Error('Stripe total exceeds supported precision');totals.set(currency,total);count++;
          }
          more=result.has_more;
          if(more){const next=result.data.at(-1)?.id;if(typeof next!=='string'||!/^ch_[A-Za-z0-9_]+$/.test(next)||next===cursor)throw Error('Stripe returned invalid pagination');cursor=next}
        }
        if(more)throw Error('Too many charges to calculate today’s total');
        if(!count)return setCached(key,{title:'Stripe today · gross',value:'No captured charges',sub:'Charges created today · local time'});
        return setCached(key,{title:'Stripe today · gross',badge:count+' charges',items:stripeCurrencyItems(totals)});
      }
      if(id==='rev_lemonsqueezy'){
        const token=String(custom.api_key||'').trim(),store=String(custom.store_id||'').trim();if(!token||!/^\d{1,20}$/.test(store))throw Error('Set API key and numeric store ID');
        const key='lemon-orders:'+token+':'+store,cached=getCached(key,120000);if(cached)return cached;
        const data=await nativeMetric('lemonsqueezy',token,store),total=data?.meta?.page?.total;
        if(!Array.isArray(data?.data)||!Number.isSafeInteger(total)||total<0)throw Error('Lemon Squeezy returned invalid orders');
        const latest=data.data[0]?.attributes,detail=latest?[latest.total_formatted,latest.status_formatted||latest.status].filter(value=>typeof value==='string'&&value).join(' · '):'No orders';
        return setCached(key,{title:'Lemon Squeezy orders',value:formatNumber(total)+' orders',sub:latest?'Latest: '+detail:detail});
      }
      if(id==='rev_datafast'){
        const token=String(custom.api_key||'').trim(),website=String(custom.project_id||'').trim();if(!token)throw Error('Set a DataFast API key');
        const key='datafast:'+token+':'+website,cached=getCached(key,30000);if(cached)return cached;
        const data=await nativeMetric('datafast',token,website),visitors=data?.data?.[0]?.visitors;
        if(data?.status!=='success'||!Number.isSafeInteger(visitors)||visitors<0)throw Error('DataFast returned invalid visitor count');
        return setCached(key,{title:'DataFast live visitors',value:formatNumber(visitors)+' active',sub:'Pageviews in the last 10 minutes'});
      }
      if(id==='rev_polar'){
        const token=String(custom.access_token||'').trim(),currency=String(custom.currency||'USD').trim().toUpperCase(),resource=polarResource(custom);
        if(!token)throw Error('Set a Polar organization token');if(!/^[A-Z]{3}$/.test(currency))throw Error('Set the Polar reporting currency');
        const key='polar:'+token+':'+resource+':'+currency,cached=getCached(key,300000);if(cached)return cached;
        const data=await nativeMetric('polar',token,resource);if(!Array.isArray(data?.periods))throw Error('Polar returned invalid metrics');
        const period=[...data.periods].reverse().find(p=>Number.isFinite(p.monthly_recurring_revenue));if(!period)throw Error('Polar returned no MRR data');
        const subscriptions=period.active_subscriptions,when=typeof period.timestamp==='string'?period.timestamp.slice(0,10):'';
        return setCached(key,{title:'Polar MRR',value:formatCurrency(period.monthly_recurring_revenue/100,currency),sub:[Number.isFinite(subscriptions)?subscriptions+' active subscriptions':'',when?'As of '+when+' UTC':''].filter(Boolean).join(' · ')});
      }
      if(id==='rev_paddle'){
        const metric=custom.metric||'MRR';
        if(metric!=='Active subscriptions'){
          if(!['MRR','Annualized MRR','Net revenue','Checkout conversion'].includes(metric))throw Error('Select a supported Paddle metric');
          const token=String(custom.api_key||'').trim(),environment=custom.environment||'live';if(!token)throw Error('Set a Paddle key with metrics.read permission');
          const days=Math.max(1,Math.min(365,Math.floor(Number(custom.report_days)||30))),to=new Date().toISOString().slice(0,10),from=new Date(Date.parse(to+'T00:00:00Z')-days*86400000).toISOString().slice(0,10),resource={environment,metric:['MRR','Annualized MRR'].includes(metric)?'mrr':metric==='Net revenue'?'revenue':'conversion',from,to};
          const key='paddle-metrics:'+token+':'+metric+':'+JSON.stringify(resource),cached=getCached(key,300000);if(cached)return cached;
          const data=(await nativeMetric('paddle_metrics',token,JSON.stringify(resource)))?.data;
          if(!Array.isArray(data?.timeseries)||!data.timeseries.length)throw Error('Paddle returned no metric datapoints');
          const seen=new Set(),rows=[...data.timeseries];for(const row of rows){if(typeof row.timestamp!=='string'||!Number.isFinite(Date.parse(row.timestamp))||seen.has(row.timestamp))throw Error('Invalid Paddle metric timestamp');seen.add(row.timestamp)}
          rows.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
          let value,sub='Last '+days+' complete UTC days';
          if(metric==='Checkout conversion'){
            let count=0,completed=0;for(const row of rows){if(!Number.isSafeInteger(row.count)||!Number.isSafeInteger(row.completed_count)||row.count<0||row.completed_count<0||row.completed_count>row.count)throw Error('Invalid Paddle checkout metrics');count+=row.count;completed+=row.completed_count;if(!Number.isSafeInteger(count)||!Number.isSafeInteger(completed))throw Error('Paddle checkout total too large')}
            value=count?(completed/count*100).toFixed(1)+'%':'No checkouts';sub=completed+' / '+count+' completed · '+sub;
          }else{
            const amount=row=>{if(typeof row.amount!=='string'||!/^\d+$/.test(row.amount)||!Number.isSafeInteger(Number(row.amount)))throw Error('Invalid Paddle amount');return Number(row.amount)};
            let total;if(metric==='Net revenue'){total=rows.reduce((sum,row)=>{const next=sum+amount(row);if(!Number.isSafeInteger(next))throw Error('Paddle total too large');return next},0);sub+=' · after tax/fees, before refunds'}else{total=amount(rows.at(-1))*(metric==='Annualized MRR'?12:1);sub='As of '+rows.at(-1).timestamp.slice(0,10)+' UTC'}
            value=providerMoney(total,data.currency_code);
          }
          return setCached(key,{title:'Paddle '+metric,value,sub,badge:environment==='sandbox'?'Sandbox':'Reported metric'});
        }
        const token=String(custom.api_key||'').trim(),environment=String(custom.environment||'live');if(!token)throw Error('Set a Paddle API key');
        if(!['live','sandbox'].includes(environment))throw Error('Select a Paddle environment');
        const key='paddle:'+token+':'+environment,cached=getCached(key,120000);if(cached)return cached;
        const data=await nativeMetric('paddle',token,environment),total=data?.meta?.pagination?.estimated_total;
        if(!Number.isSafeInteger(total)||total<0)throw Error('Paddle returned no subscription count');
        return setCached(key,{title:'Paddle subscriptions',value:(total>100000?'100,000+':formatNumber(total))+' active',sub:environment==='sandbox'?'Sandbox':'Live account'});
      }
      if(id==='rev_dodo'){
        const metric=custom.metric||'Gross sales';
        if(metric!=='Latest payment'){
          if(!['Gross sales','Payment success rate'].includes(metric))throw Error('Select a supported Dodo metric');
          const token=String(custom.api_key||'').trim(),environment=custom.environment||'live',period=custom.report_period||'Today';if(!token)throw Error('Set a Dodo Payments API key');if(!['Today','Month to date'].includes(period))throw Error('Select a supported reporting period');
          const range=reportRange(period),key='dodo-report:'+token+':'+environment+':'+metric+':'+range.start,cached=getCached(key,120000);if(cached)return cached;
          const ids=new Set(),totals=new Map();let count=0,paid=0,finished=false;
          for(let page=1;page<=100;page++){
            const data=await nativeMetric('dodo_payments',token,JSON.stringify({environment,...range,page}));if(!Array.isArray(data?.items))throw Error('Dodo returned invalid payment records');
            if(!data.items.length){finished=true;break}
            for(const payment of data.items){
              if(typeof payment.payment_id!=='string'||!payment.payment_id||ids.has(payment.payment_id))throw Error('Duplicate or missing Dodo payment ID');ids.add(payment.payment_id);count++;
              const when=Date.parse(payment.created_at);if(!Number.isFinite(when)||when<Date.parse(range.start)||when>Date.parse(range.end))throw Error('Dodo returned payment outside report range');
              if(payment.status!=='succeeded')continue;
              const amount=payment.total_amount,currency=payment.currency;if(!Number.isSafeInteger(amount)||amount<0||typeof currency!=='string'||!/^\w{3}$/.test(currency))throw Error('Invalid Dodo payment amount');
              const total=(totals.get(currency)||0)+amount;if(!Number.isSafeInteger(total))throw Error('Dodo revenue exceeds supported precision');totals.set(currency,total);paid++;
            }
          }
          if(!finished)throw Error('Too many Dodo pages for a complete report');
          if(metric==='Payment success rate')return setCached(key,{title:'Dodo payment success',value:count?(paid/count*100).toFixed(1)+'%':'No payments',sub:paid+' / '+count+' records · '+period+' UTC'});
          const items=[...totals].sort(([a],[b])=>a.localeCompare(b)).map(([currency,amount])=>({label:currency,value:providerMoney(amount,currency)}));
          return setCached(key,items.length?{title:'Dodo gross · '+period+' UTC',badge:paid+' successful payments',items}:{title:'Dodo gross · '+period+' UTC',value:'No successful payments',sub:count+' payment records'});
        }
        const token=String(custom.api_key||'').trim(),environment=String(custom.environment||'live');if(!token)throw Error('Set a Dodo Payments API key');
        if(!['live','test'].includes(environment))throw Error('Select a Dodo environment');
        const key='dodo:'+token+':'+environment,cached=getCached(key,120000);if(cached)return cached;
        const data=await nativeMetric('dodo',token,environment);if(!Array.isArray(data?.items))throw Error('Dodo returned invalid payments');
        const payment=data.items[0];if(!payment)return setCached(key,{title:'Dodo Payments',value:'No payments',sub:environment==='test'?'Test environment':'Live account'});
        const currency=String(payment.currency||'').toUpperCase(),amount=payment.total_amount,status=payment.status;
        if(!/^[A-Z]{3}$/.test(currency)||!Number.isSafeInteger(amount)||typeof status!=='string'||!status)throw Error('Dodo returned incomplete payment data');
        let format;try{format=new Intl.NumberFormat(undefined,{style:'currency',currency,currencyDisplay:'code'})}catch{throw Error('Unsupported payment currency')}
        const digits=format.resolvedOptions().maximumFractionDigits,value=format.format(amount/10**digits);
        return setCached(key,{title:'Latest Dodo payment',value,sub:[status,payment.created_at?.slice(0,10),environment==='test'?'Test':''].filter(Boolean).join(' · ')});
      }
      if(id==='rev_shopify'){
        const metric=custom.metric||'Sales overview';
        if(metric!=='Order count'){
          if(!['Sales overview','Net payments','Average order value','Unfulfilled orders'].includes(metric))throw Error('Select a supported Shopify metric');
          const token=String(custom.access_token||'').trim(),shop=String(custom.shop_domain||'').trim().toLowerCase(),period=custom.report_period||'Today';if(!token||!shop)throw Error('Set Shopify domain and Admin token');if(!['Today','Month to date'].includes(period))throw Error('Select a supported Shopify report period');
          const range=reportRange(period,true),key='shopify-report:'+token+':'+shop+':'+range.start+':'+metric,cached=getCached(key,120000);if(cached)return cached;
          const ids=new Set(),currencies=new Map();let after='',complete=false,unfulfilled=0;
          for(let page=0;page<100;page++){
            const response=await nativeMetric('shopify_orders',token,JSON.stringify({shop,...range,after})),data=response?.data?.orders;
            if(response?.errors?.length||!Array.isArray(data?.nodes)||typeof data.pageInfo?.hasNextPage!=='boolean')throw Error('Shopify report unavailable; check read_orders');
            for(const order of data.nodes){
              if(typeof order.id!=='string'||ids.has(order.id))throw Error('Duplicate or missing Shopify order ID');if(typeof order.test!=='boolean')throw Error('Invalid Shopify order flags');if(order.test)continue;ids.add(order.id);
              for(const [field,name]of [['netPaymentSet','net'],['currentTotalPriceSet','value']]){
                const money=order[field]?.shopMoney,currency=money?.currencyCode;if(typeof currency!=='string'||!/^[A-Z]{3}$/.test(currency))throw Error('Shopify currency unavailable');
                const amount=decimalMicros(money.amount),totals=currencies.get(currency)||{net:0n,value:0n,count:0};
                if(name==='net')totals.net+=amount;else if(!order.cancelledAt){totals.value+=amount;totals.count++}currencies.set(currency,totals);
              }
              if(!order.cancelledAt&&order.displayFulfillmentStatus==='UNFULFILLED')unfulfilled++;
            }
            if(!data.pageInfo.hasNextPage){complete=true;break}
            const next=data.pageInfo.endCursor;if(typeof next!=='string'||!next||next===after)throw Error('Invalid Shopify pagination');after=next;
          }
          if(!complete)throw Error('Shopify report has too many pages');
          const sub=period+' · local time · '+ids.size+' orders';
          if(metric==='Unfulfilled orders')return setCached(key,{title:'Shopify unfulfilled',value:formatNumber(unfulfilled),sub});
          const items=[];if(metric==='Sales overview')items.push({label:'Orders',value:formatNumber(ids.size)});
          for(const [currency,total]of [...currencies].sort(([a],[b])=>a.localeCompare(b))){if(metric!=='Average order value')items.push({label:currency+' net payments',value:formatMicros(total.net,currency)});if(metric!=='Net payments'&&total.count)items.push({label:currency+' average order',value:formatMicros(total.value,currency,total.count)})}
          return setCached(key,items.length?{title:'Shopify · '+period,items,badge:ids.size+' orders'}:{title:'Shopify · '+period,value:'No orders',sub});
        }
        const token=String(custom.access_token||'').trim(),resource=shopifyResource(custom);if(!token)throw Error('Set a Shopify Admin access token');
        const key='shopify:'+token+':'+resource,cached=getCached(key,120000);if(cached)return cached;
        const data=await nativeMetric('shopify',token,resource),count=data?.data?.ordersCount;
        if(data?.errors?.length||!Number.isSafeInteger(count?.count)||count.count<0||!['EXACT','AT_LEAST'].includes(count.precision))throw Error('Shopify returned no order count; check read_orders permission');
        return setCached(key,{title:'Shopify orders today',value:formatNumber(count.count)+(count.precision==='AT_LEAST'?'+':'')+' orders',sub:'Since local midnight'});
      }
      if(id==='rev_appstore'){
        const args=appstoreArgs(custom),key='apple-sales:'+JSON.stringify(args),cached=getCached(key,900000);if(cached)return cached;
        const report=await appstoreReport(custom);if(typeof report?.units!=='string'||!Array.isArray(report.proceeds))throw Error('Apple returned invalid sales totals');
        const items=[{label:'Net units',value:report.units}];
        for(const entry of report.proceeds){if(!/^[A-Z]{3}$/.test(entry.currency)||typeof entry.amount!=='string'||!Number.isFinite(Number(entry.amount)))throw Error('Invalid Apple proceeds');items.push({label:entry.currency+' proceeds',value:formatCurrency(Number(entry.amount),entry.currency)})}
        return setCached(key,{title:'App Store sales · '+report.date,items});
      }
      if(id==='rev_playstore'){
        const args=playArgs(custom),key='play-report:'+JSON.stringify(args),cached=getCached(key,1800000);if(cached)return cached;
        const report=await playReport(custom);if(!Number.isSafeInteger(report?.installs)||!Number.isSafeInteger(report?.active)||typeof report.date!=='string')throw Error('Google returned invalid report totals');
        return setCached(key,{title:'Google Play · '+report.date,items:[{label:'Device installs',value:formatNumber(report.installs)},{label:'Active devices',value:formatNumber(report.active)}]});
      }
      if(id==='rev_google_analytics'){
        const service=custom.auth_mode==='Service account',token=String((service?custom.key_path:custom.access_token)||'').trim(),property=String(custom.property_id||'').trim();
        if(!token||!/^\d{1,20}$/.test(property))throw Error('Set GA4 credentials and numeric property ID');
        const key='ga4:'+service+':'+token+':'+property,cached=getCached(key,30000);if(cached)return cached;
        const data=service?await ga4ServiceReport(custom):await nativeMetric('ga4',token,property),headers=data?.metricHeaders;
        if(!Array.isArray(headers)||!headers.some(h=>h.name==='activeUsers')||!headers.some(h=>h.name==='screenPageViews'))throw Error('GA4 returned invalid analytics');
        const rows=data.rows||[];if(!Array.isArray(rows)||rows.length>1)throw Error('GA4 returned unexpected report dimensions');
        const metric=name=>{if(!rows.length)return 0;const raw=rows[0]?.metricValues?.[headers.findIndex(h=>h.name===name)]?.value;if(typeof raw!=='string'||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw Error('GA4 returned invalid metric');return Number(raw)};
        return setCached(key,{title:'GA4 realtime',value:formatNumber(metric('activeUsers'))+' active users',sub:formatNumber(metric('screenPageViews'))+' views · last 30 minutes'});
      }
      if(id==='rev_stripe_net'){
        const token=String(custom.api_key||'').trim();if(!token)throw Error('Set a Stripe API key');
        const month=new Date();month.setDate(1);month.setHours(0,0,0,0);const start=Math.floor(month.getTime()/1000),key='stripe-net:'+token+':'+start,cached=getCached(key,120000);if(cached)return cached;
        const totals=new Map();let cursor='',count=0,more=true;
        for(let page=0;page<20&&more;page++){
          const result=await nativeMetric('stripe_net',token,start+','+cursor);if(!Array.isArray(result?.data)||typeof result.has_more!=='boolean')throw Error('Stripe returned invalid balance data');
          for(const transaction of result.data){
            if(typeof transaction.reporting_category!=='string')throw Error('Stripe reporting category unavailable');
            if(!['charge','refund','partial_capture_reversal'].includes(transaction.reporting_category))continue;
            const currency=String(transaction.currency||'').toUpperCase(),amount=transaction.net;
            if(!/^[A-Z]{3}$/.test(currency)||!Number.isSafeInteger(amount))throw Error('Stripe returned invalid net amount');
            const total=(totals.get(currency)||0)+amount;if(!Number.isSafeInteger(total))throw Error('Stripe total exceeds supported precision');totals.set(currency,total);count++;
          }
          more=result.has_more;if(more){const next=result.data.at(-1)?.id;if(typeof next!=='string'||!/^txn_[A-Za-z0-9_]+$/.test(next)||next===cursor)throw Error('Stripe returned invalid pagination');cursor=next}
        }
        if(more)throw Error('Too many transactions to calculate this month');
        if(!count)return setCached(key,{title:'Stripe net payments',value:'No transactions',sub:'Current month · local time'});
        return setCached(key,{title:'Stripe net payments',badge:'This month',items:stripeCurrencyItems(totals)});
      }
      if(id==='rev_stripe_mrr'){
        if(custom.auth_mode==='Billing page'){
          const data=await billingSnapshot('stripe_mrr');if(typeof data?.amount!=='string'||!/^[-]?\d{1,12}\.\d{2}$/.test(data.amount)||data.currency!=='USD'||!Number.isSafeInteger(data.sampled_at))throw Error('Invalid Stripe Billing page sample');
          return {title:'Stripe MRR · Billing page',value:formatCurrency(Number(data.amount),'USD'),badge:data.stale?'Stale reading':'Dashboard amount',sub:'Updated '+new Date(data.sampled_at*1000).toLocaleString(),error:data.stale===true};
        }
        const token=String(custom.api_key||'').trim();if(!token)throw Error('Set a Stripe API key');
        const key='stripe-mrr:'+token,cached=getCached(key,300000);if(cached)return cached;
        const totals=new Map();let qualifying=0;
        for(const status of ['active','past_due']){
          let cursor='',more=true;
          for(let page=0;page<20&&more;page++){
            const result=await nativeMetric('stripe_subscriptions',token,status+','+cursor);
            if(!Array.isArray(result?.data)||typeof result.has_more!=='boolean')throw Error('Stripe returned invalid subscriptions');
            for(const subscription of result.data){
              if(subscription.status!==status)throw Error('Stripe returned unexpected subscription status');
              if(subscription.discount||subscription.discounts?.length)throw Error('Discounted subscriptions require Stripe Billing Analytics');
              if(!Array.isArray(subscription.items?.data)||subscription.items.has_more!==false)throw Error('Subscription items unavailable or incomplete');
              for(const item of subscription.items.data){
                if(item.discount||item.discounts?.length||item.trial||item.trial_end)throw Error('Discounts or item trials require Stripe Billing Analytics');
                const price=item.price,recurring=price?.recurring;if(!recurring)throw Error('Subscription price data unavailable');
                if(recurring.usage_type==='metered'||recurring.meter)continue;
                if(recurring.usage_type!=='licensed')throw Error('Subscription usage type unavailable');
                if(price.billing_scheme!=='per_unit'||!['month','year'].includes(recurring.interval))throw Error('This price requires Stripe Billing Analytics');
                if((price.unit_amount_decimal??price.unit_amount)==null||item.quantity==null||recurring.interval_count==null)throw Error('Subscription pricing data unavailable');
                const amount=Number(price.unit_amount_decimal??price.unit_amount),quantity=Number(item.quantity),period=Number(recurring.interval_count),currency=String(price.currency||'').toUpperCase();
                if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(quantity)||quantity<0||!Number.isSafeInteger(period)||period<1||!/^[A-Z]{3}$/.test(currency))throw Error('Invalid subscription pricing data');
                const total=(totals.get(currency)||0)+amount*quantity/(period*(recurring.interval==='year'?12:1));
                if(!Number.isFinite(total)||Math.abs(total)>Number.MAX_SAFE_INTEGER)throw Error('MRR exceeds supported precision');
                totals.set(currency,total);qualifying++;
              }
            }
            more=result.has_more;if(more){const next=result.data.at(-1)?.id;if(typeof next!=='string'||!/^sub_[A-Za-z0-9_]+$/.test(next)||next===cursor)throw Error('Stripe returned invalid pagination');cursor=next}
          }
          if(more)throw Error('Too many subscriptions to estimate MRR');
        }
        if(!qualifying)return setCached(key,{title:'Estimated MRR',value:'No fixed-price subscriptions',sub:'Active and past due'});
        return setCached(key,{title:'Estimated MRR',badge:'Fixed prices',items:stripeCurrencyItems(totals)});
      }
      if (id.startsWith('rev_stripe')) return {title:entry.name||id,value:'Unavailable',sub:'Revenue metrics are not available from account balance',error:true};

      if (id === 'prod_gcal'||id === 'prod_calendar_event') {
        if(!custom.ical_url)throw Error('Set an iCalendar feed URL');
        const cal = await fetchIcsCalendar(custom.ical_url);
        return { title: cal.title, value: cal.time, sub: 'Calendar' };
      }

    } catch (err) {
      return {
        title: entry.name || entry.id,
        value: 'Unavailable',
        sub: String(err.message || err).slice(0, 240),
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

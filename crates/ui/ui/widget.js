const params=new URLSearchParams(location.search),kind=params.get('kind'),preview=params.has('preview'),compact=params.has('compact'),card=document.getElementById('card'),tauri=window.__TAURI__||(compact?window.parent.__TAURI__:undefined),invoke=tauri?.core?.invoke;
let config={background:'#f8f9fc',foreground:'#202332',opacity:94,radius:22,show_date:true,show_seconds:false,hour_24:true,show_month:true,show_weekday:true,show_cpu:true,show_memory:true,show_gpu:false,show_network:false,show_disk:false,show_details:true,show_artist:true,show_album:false,show_status:true,show_artwork:true,show_forecast:true,notes:'',city:'',fahrenheit:false,photo:'',countdown_title:'',countdown_date:''};
const dockDisplayDefaults={show_date:true,show_seconds:false,hour_24:true,show_month:true,show_weekday:true,show_cpu:true,show_memory:true,show_gpu:false,show_network:false,show_disk:false,show_details:true,show_artist:true,show_album:false,show_status:true,show_artwork:true,show_forecast:true,fahrenheit:false};
let savedWidgetConfig=null;
function persistWidgetConfig(){
  if(!invoke||preview)return Promise.resolve();
  const next={...config};
  if(compact&&savedWidgetConfig)for(const key of Object.keys(dockDisplayDefaults))next[key]=savedWidgetConfig[key];
  return invoke('set_widget',{config:next});
}
card.classList.add(kind);
const visualizer=kind==='audio'?window.createAudioVisualizer(card,{preview,invoke}):null;
let weatherCache=null,weatherRequest=null,renderSeq=0,clipboardIndex=0,clipboardSignature=null;
function text(tag,cls,value,parent=card){const e=document.createElement(tag);e.className=cls;e.textContent=value;parent.append(e);return e}
function getCapsuleAccent(k, a = 1) {
  if (k.includes('pomodoro')) return `rgba(239, 68, 68, ${a})`;
  if (k.includes('stopwatch')) return `rgba(249, 115, 22, ${a})`;
  return `rgba(56, 189, 248, ${a})`;
}

function applyWidgetStyling(el, c, k) {
  if (!el || !c) return;
  const isCapsule = ['pomodoro','timer','stopwatch','prod_pomodoro','prod_timer','prod_stopwatch'].includes(k);
  const opacity = k === 'audio' ? Number(c.opacity ?? 95) : (c.custom?.opacity !== undefined ? Number(c.custom.opacity) : (c.opacity !== undefined ? Number(c.opacity) : 95));
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

  if (k === 'audio') {
    const color = /^#[0-9a-f]{6}$/i.test(c.background || '') ? c.background : '#20212b';
    const rgb = [1,3,5].map(i => parseInt(color.slice(i,i+2),16));
    el.style.background = `rgba(${rgb.join(',')},${alpha})`;
    el.style.border = alpha ? `1px solid rgba(255,255,255,${alpha * 0.1})` : 'none';
    el.style.boxShadow = 'none';
    el.style.backdropFilter = 'none';
    el.style.webkitBackdropFilter = 'none';
    return;
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

function evaluateCalculator(input){
  const source=String(input).replaceAll('×','*').replaceAll('÷','/').replace(/\s+/g,'');
  if(!source||source.length>120||!/^[\d.+\-*/^()%]+$/.test(source))throw Error('Enter a valid expression');
  let at=0,depth=0;
  function primary(){
    if(source[at]==='+'){at++;return primary()}if(source[at]==='-'){at++;return -primary()}
    if(source[at]==='('){if(++depth>20)throw Error('Expression is too complex');at++;const value=sum();if(source[at++]!==')')throw Error('Missing closing parenthesis');depth--;return value}
    const match=source.slice(at).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(!match)throw Error('Expected a number');at+=match[0].length;return Number(match[0]);
  }
  function power(){let value=primary();while(source[at]==='%'){value/=100;at++}if(source[at]==='^'){at++;value=Math.pow(value,power())}return value}
  function term(){let value=power();while(source[at]==='*'||source[at]==='/'){const op=source[at++],right=power();value=op==='*'?value*right:value/right}return value}
  function sum(){let value=term();while(source[at]==='+'||source[at]==='-'){const op=source[at++],right=term();value=op==='+'?value+right:value-right}return value}
  const value=sum();if(at!==source.length||!Number.isFinite(value))throw Error('Invalid or non-finite result');return value;
}

function updateDockAppearance(){
  if(!compact)return;
  if(typeof kind!=='undefined'&&(kind==='sys_tray'||kind==='app_folder'))return;
  const appearance=config.custom?.dock_appearance||{},custom=appearance.custom_style===true;
  const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback;
  const root=document.documentElement.style;
  root.setProperty('--compact-scale',String(Math.max(.7,Math.min(1.4,(Number(appearance.text_scale)||100)/100))));
  if(custom){root.setProperty('--compact-foreground',color(appearance.foreground,'#ffffff'));root.setProperty('--compact-accent',color(appearance.accent,'#3b82f6'));}
  else{root.removeProperty('--compact-foreground');root.removeProperty('--compact-accent')}
  try{
    const frame=window.frameElement,host=frame?.closest('.dock-capsule');if(!host)return;
    const vertical=document.documentElement.classList.contains('vertical-compact');
    const requested=Math.max(0,Math.min(600,Number(appearance.width)||0));
    const length=requested?Math.max(100,requested)+'px':'';
    const nextWidth=vertical?'':length,nextHeight=vertical?length:'';
    const changed=host.style.width!==nextWidth||host.style.height!==nextHeight;
    host.style.width=nextWidth;host.style.height=nextHeight;
    if(custom){const hex=color(appearance.background,'#20212b');const alpha=Math.max(.1,Math.min(1,(Number(appearance.opacity)||85)/100));const rgb=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));host.style.background='rgba('+rgb.join(',')+','+alpha+')';}
    else host.style.background='';
    if(changed)window.parent.scheduleMeasure?.();
  }catch{}
}

function widgetRemoveInset(radius){
  return 21+Math.max(10,Math.ceil(Math.max(0,Number(radius)||0)*.3)+2);
}

function applyConfig(c){
  const oldCity=config.city,oldUnit=config.fahrenheit;
  savedWidgetConfig=c;
  config={...config,...c};
  if(compact){const options=c.custom?.dock_appearance?.options||{};for(const [key,value] of Object.entries(dockDisplayDefaults))config[key]=typeof options[key]==='boolean'?options[key]:value;}
  const display=compact?(c.custom?.dock_appearance?.options||{}):(c.custom||{});
  card.dataset.showIcon=String(display.show_icon!==false);
  card.dataset.showTitle=String(display.show_title!==false);
  for(const key of ['subtitle','value','progress','controls'])card.dataset['show'+key[0].toUpperCase()+key.slice(1)]=String(display['show_'+key]!==false);
  if(config.city!==oldCity||config.fahrenheit!==oldUnit)weatherCache=null;
  if(!preview&&!compact){
    applyWidgetStyling(card, config, kind);
    document.documentElement.style.setProperty('--widget-remove-inset',widgetRemoveInset(config.radius)+'px');
    const handles=document.querySelector('.resize-handles');
    if(handles)handles.style.borderRadius=config.radius+'px';
    card.style.setProperty('--ring-bg',config.background||'#161720');
  }
  if(compact)updateDockAppearance();
  visualizer?.setConfig(compact&&config.custom?.dock_appearance?.custom_style?{...config,foreground:config.custom.dock_appearance.foreground||'#ffffff'}:config);
  refresh();
}
window.applyConfig=applyConfig;
window.updateDockAppearance=updateDockAppearance;
window.refresh=refresh;
if(kind==='ctrl_audio_switch')tauri?.event?.listen('widget-audio-output-changed',()=>refresh());
window.addEventListener('message',e=>{if(e.data?.widgetConfig&&(!kind||e.data.widgetConfig.kind===kind))applyConfig(e.data.widgetConfig);});

function setDesktopEditMode(enabled) {
  if (compact || preview) return;
  let btn = document.getElementById('widget-desktop-remove-btn');
  if (enabled) {
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'widget-desktop-remove-btn';
      btn.className = 'widget-desktop-remove-btn';
      btn.type = 'button';
      btn.title = 'Remove from desktop';
      btn.setAttribute('aria-label', 'Remove from desktop');
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="10.5" width="18" height="3" rx="1.5"/></svg>';
      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.disabled) return;
        btn.disabled = true;
        try {
          await invoke('dock_widget_set', {id:kind, added:false});
          config.enabled = false;
          await persistWidgetConfig();
        } catch (error) {
          config.enabled = true;
          btn.title = 'Could not remove widget: ' + String(error.message || error);
          btn.disabled = false;
        }
      });
      btn.addEventListener('pointerdown', e => e.stopPropagation());
      document.body.append(btn);
    }
    btn.style.display = 'grid';
  } else if (btn) {
    btn.style.display = 'none';
  }
}
if (!preview && !compact) {
  tauri?.event?.listen('widget-edit-mode', event => setDesktopEditMode(Boolean(event.payload)));
}
window.addEventListener('message', e => {
  if (typeof e.data?.widgetEditMode === 'boolean') setDesktopEditMode(e.data.widgetEditMode);
});
if(preview){window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.widgetPreview?.kind===kind)applyConfig(e.data.widgetPreview)})}
else if(invoke){invoke('get_widgets').then(cs=>{const c=cs.find(x=>x.kind===kind);if(c)applyConfig(c)});tauri?.event?.listen('widget-config',e=>{if(e.payload?.kind===kind)applyConfig(e.payload)});}
card.addEventListener('contextmenu',e=>{e.preventDefault();if(!preview)invoke('widget_open_settings',{kind}).catch(()=>{})});
let drag=null,moveQueue=Promise.resolve(),lastClick=null;
async function toggleResize(){if(document.body.classList.contains('resizing')){document.body.classList.remove('resizing');return}try{await invoke('widget_resize_focus');document.body.classList.add('resizing')}catch{}}
card.addEventListener('pointerdown',e=>{if(preview||compact||e.button!==0||e.target.closest('button,input,textarea,select,[contenteditable="true"]'))return;e.preventDefault();card.setPointerCapture(e.pointerId);const d=drag={id:e.pointerId,startX:e.screenX,startY:e.screenY,x:e.screenX,y:e.screenY,origin:null,moved:false};invoke('widget_position').then(pos=>{d.origin=pos;if(d.moved)move(d)}).catch(()=>{if(drag===d)drag=null})});
function move(d){if(!d.origin||!d.moved)return;const x=Math.round(d.origin.x+(d.x-d.startX)*devicePixelRatio),y=Math.round(d.origin.y+(d.y-d.startY)*devicePixelRatio);moveQueue=moveQueue.catch(()=>{}).then(()=>invoke('widget_move',{x,y}));}
card.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.x=e.screenX;drag.y=e.screenY;if(Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>4)drag.moved=true;move(drag)});
card.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;d.x=e.screenX;d.y=e.screenY;if(Math.hypot(d.x-d.startX,d.y-d.startY)>4)d.moved=true;move(d);drag=null;if(d.moved){lastClick=null;return}const now=Date.now();if(lastClick&&now-lastClick.time<450&&Math.hypot(e.screenX-lastClick.x,e.screenY-lastClick.y)<8){lastClick=null;toggleResize()}else lastClick={time:now,x:e.screenX,y:e.screenY}});
card.addEventListener('pointercancel',()=>{drag=null;lastClick=null});
if(!preview){
 const handles=document.createElement('div');handles.className='resize-handles';handles.setAttribute('aria-label','Resize widget');document.body.append(handles);
 let resizing=null,resizeQueue=Promise.resolve();
 function geometry(d){const b=d.bounds,scale=b.scale,dx=Math.round((d.x-d.startX)*scale),dy=Math.round((d.y-d.startY)*scale),maxWidth=kind==='audio'?16384:1200;let x=b.x,y=b.y,w=b.width,h=b.height;const clamp=(v,min,max)=>Math.max(Math.round(min*scale),Math.min(Math.round(max*scale),v));if(d.edge==='left'){w=clamp(b.width-dx,140,maxWidth);x=b.x+b.width-w}else if(d.edge==='right')w=clamp(b.width+dx,140,maxWidth);else if(d.edge==='top'){h=clamp(b.height-dy,120,900);y=b.y+b.height-h}else h=clamp(b.height+dy,120,900);return {x,y,width:w,height:h}}
 function update(d,commit){if(!d.bounds)return;const next=geometry(d);resizeQueue=resizeQueue.catch(()=>{}).then(()=>invoke('widget_resize',{...next,commit}));resizeQueue.catch(()=>{});}
 for(const [edge,symbol] of [['left','↔'],['right','↔'],['top','↕'],['bottom','↕']]){const h=document.createElement('button');h.type='button';h.className='resize-handle '+edge;h.textContent=symbol;h.setAttribute('aria-label','Resize '+edge+' edge');handles.append(h);
 h.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();h.setPointerCapture(e.pointerId);const d=resizing={id:e.pointerId,edge,startX:e.screenX,startY:e.screenY,x:e.screenX,y:e.screenY,bounds:null,ended:false};invoke('widget_bounds').then(bounds=>{d.bounds=bounds;update(d,d.ended)}).catch(()=>{if(resizing===d)resizing=null})});
 h.addEventListener('pointermove',e=>{if(!resizing||e.pointerId!==resizing.id)return;resizing.x=e.screenX;resizing.y=e.screenY;update(resizing,false)});
 h.addEventListener('pointerup',e=>{if(!resizing||e.pointerId!==resizing.id)return;const d=resizing;d.x=e.screenX;d.y=e.screenY;d.ended=true;update(d,true);resizing=null});
 h.addEventListener('pointercancel',()=>{if(resizing){resizing.ended=true;update(resizing,true)}resizing=null});}
 window.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('resizing')});tauri?.event?.listen('widget-dismiss-resize',e=>{if(e.payload===kind)document.body.classList.remove('resizing')});
}
function renderTime(){const d=new Date();card.replaceChildren();if(kind==='clock'){text('div','time',new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',...(config.show_seconds?{second:'2-digit'}:{}),hour12:!config.hour_24}).format(d));if(config.show_date)text('div','date',new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(d))}else{const row=text('div','calrow',''),left=text('div','','',row);text('div','month',new Intl.DateTimeFormat('en-US',{month:'long'}).format(d),left);text('div','day',d.getDate(),left);if(config.show_weekday)text('div','weekday',new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(d),left);if(config.show_month&&card.clientWidth>220){const grid=text('div','grid','',row);for(let i=0;i<7;i++)text('span','weekday',new Intl.DateTimeFormat('en-US',{weekday:'narrow'}).format(new Date(2024,0,1+i)),grid);for(let i=0;i<(new Date(d.getFullYear(),d.getMonth(),1).getDay()+6)%7;i++)text('span','','',grid);for(let n=1;n<=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();n++)text('span',n===d.getDate()?'today':'',n,grid)}}}
function weatherSvg(type){if(type==='sun')return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';if(type==='rain')return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 19v2M8 13v2M12 21v2M12 15v2M16 19v2M16 13v2"/></svg>';if(type==='snow')return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5f3fc" stroke-width="2"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>';if(type==='thunder')return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>'}
function weatherDescription(code){if(code===0)return [weatherSvg('sun'),'Clear'];if(code<=3)return [weatherSvg('cloud'),'Cloudy'];if(code<=48)return [weatherSvg('cloud'),'Fog'];if(code<=67||code>=80&&code<=82)return [weatherSvg('rain'),'Rain'];if(code<=77||code<=86)return [weatherSvg('snow'),'Snow'];return [weatherSvg('thunder'),'Thunderstorm']}
async function getWeather(){const city=config.city.trim(),unit=config.fahrenheit?'fahrenheit':'celsius',key=city+'|'+unit;if(!city)throw Error('Set a city in widget settings');if(weatherCache?.key===key&&Date.now()-weatherCache.at<900000)return weatherCache.value;if(weatherRequest?.key===key)return weatherRequest.promise;const promise=(async()=>{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&format=json`);if(!r.ok)throw Error('Location lookup failed');const place=(await r.json()).results?.[0];if(!place)throw Error('City not found');const url=`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&temperature_unit=${unit}&timezone=auto`;const result=await fetch(url);if(!result.ok)throw Error('Weather unavailable');const response=await result.json(),data=response.current,daily=response.daily;if(!data||!Number.isFinite(data.temperature_2m))throw Error('Weather unavailable');const value={city:place.name,temp:data.temperature_2m,code:data.weather_code,wind:data.wind_speed_10m,unit:unit==='fahrenheit'?'°F':'°C',days:(daily?.time||[]).map((date,i)=>({date,code:daily.weather_code?.[i],high:daily.temperature_2m_max?.[i],low:daily.temperature_2m_min?.[i]}))};weatherCache={key,at:Date.now(),value};return value})();weatherRequest={key,promise};try{return await promise}finally{if(weatherRequest?.promise===promise)weatherRequest=null}}
function speed(n){if(n==null)return 'Unavailable';if(n>=1048576)return (n/1048576).toFixed(1)+' MB/s';return (n/1024).toFixed(0)+' KB/s'}
let publicMetricCache = null;
async function getPublicMetric(entry) {
  const github = entry.id === 'dev_github_stars';
  const input = String(config.custom?.[github ? 'repository' : 'package'] || '').trim();
  if (!input) throw Error(github ? 'Set a repository in widget settings' : 'Set a package name in widget settings');
  const key = entry.id + ':' + input;
  if (publicMetricCache?.key === key && Date.now() - publicMetricCache.at < 300000) return publicMetricCache.value;
  let url;
  if (github) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input)) throw Error('Use owner/repository');
    url = 'https://api.github.com/repos/' + input.split('/').map(encodeURIComponent).join('/');
  } else {
    if (!/^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i.test(input)) throw Error('Invalid npm package name');
    url = 'https://api.npmjs.org/downloads/point/last-week/' + encodeURIComponent(input);
  }
  const response = await fetch(url);
  if (!response.ok) throw Error(response.status === 404 ? 'Repository or package not found' : 'Service unavailable (' + response.status + ')');
  const data = await response.json();
  const count = github ? data.stargazers_count : data.downloads;
  if (!Number.isFinite(count)) throw Error('Metric unavailable');
  const value = { title: input, value: new Intl.NumberFormat().format(count), detail: github ? 'Stars · GitHub' : 'Downloads · last 7 days' };
  publicMetricCache = { key, at: Date.now(), value };
  return value;
}
function renderPublicMetric(entry, metric) {
  card.replaceChildren();
  const wrap = text('div', 'luma-row-card', '');
  const icon = text('div', 'luma-icon', '', wrap);
  icon.innerHTML = window.WIDGET_ICONS?.[entry.iconKey] || window.WIDGET_ICONS?.generic || '';
  const content = text('div', 'luma-main-content', '', wrap);
  text('div', 'luma-title', metric.title, content);
  text('div', 'luma-big-val', metric.value, content);
  text('div', 'luma-sub', metric.detail, content);
}
function renderLiveMetric(entry, metric) {
  card.replaceChildren();
  card.title=metric.error?String(metric.sub||metric.value||'Unavailable'):'';
  const icons = window.WIDGET_ICONS || {};
  const iconSvg = icons[entry.iconKey] || icons.generic || '';

  if (metric.items && metric.items.length > 0) {
    const wrap = text('div', 'luma-row-card', '');
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = iconSvg;
    const content = text('div', 'luma-main-content', '', wrap);
    const top = text('div', 'luma-top-meta', '', content);
    text('span', 'luma-title', metric.title || entry.name, top);
    if (metric.badge) {
      const b = text('span', 'widget-badge', metric.badge, top);
      b.style.fontSize = '8px';
      b.style.padding = '1px 5px';
    }
    const list = text('div', 'luma-plan-list', '', content);
    for (const item of metric.items) {
      const r = text('div', 'luma-plan-row', '', list);
      text('span', 'luma-title', item.label, r);
      if (item.bar != null) {
        const barWrap = text('div', 'luma-slim-bar', '', r);
        barWrap.style.margin = '0 4px';
        const fill = text('div', 'luma-slim-bar-fill', '', barWrap);
        fill.style.width = Math.min(100, Math.max(0, item.bar)) + '%';
        if (item.color) fill.style.background = item.color;
      } else {
        text('span', '', '', r);
      }
      text('span', 'luma-sub', item.sub || '', r);
      const val = text('span', 'luma-plan-pct', item.value || '', r);
      if (item.color) val.style.color = item.color;
    }
    return;
  }

  const wrap = text('div', 'luma-row-card', '');
  const icon = text('div', 'luma-icon', '', wrap);
  icon.innerHTML = iconSvg;
  const content = text('div', 'luma-main-content', '', wrap);

  const top = text('div', 'luma-top-meta', '', content);
  text('span', 'luma-title', metric.title || entry.name, top);

  if (metric.badge) {
    const b = text('span', 'widget-badge', metric.badge, top);
    b.style.fontSize = '8px';
    b.style.padding = '1px 5px';
  } else if (metric.change) {
    const m = text('span', 'luma-sub', metric.change, top);
    if (metric.change.startsWith('+')) m.style.color = '#22c55e';
    else if (metric.change.startsWith('-')) m.style.color = '#ef4444';
  } else if (metric.detail && !metric.value) {
    text('span', 'luma-sub', metric.detail, top);
  }

  if (metric.value) {
    text('div', 'luma-big-val', metric.value, content);
  }

  if (metric.progress != null) {
    const bar = text('div', 'luma-slim-bar', '', content);
    const fill = text('div', 'luma-slim-bar-fill', '', bar);
    fill.style.width = Math.min(100, Math.max(0, metric.progress)) + '%';
    fill.style.background = metric.barColor || '#22c55e';
  }

  const sub = metric.sub || (metric.value ? metric.detail : '');
  if (sub) {
    const subEl = text('div', 'luma-sub', sub, content);
    if (metric.subColor) subEl.style.color = metric.subColor;
  }
}
const widgetInteractivity = {
  timer: { running: false, remaining: null, total: 60, timerId: null },
  stopwatch: { running: false, elapsed: 0, timerId: null },
  pomodoro: { running: false, phase: 'focus', round: 1, maxRounds: 4, remaining: null, focusMins: 25, breakMins: 5, timerId: null },
  water: { cups: null, goal: 8 },
  habits: { done: null, total: 4 },
  todos: { done: false },
  mic: { muted: false },
  volume: { level: 65, muted: false }
};

function renderCatalogWidget(entry, stats){
  card.replaceChildren();
  const icons = window.WIDGET_ICONS || {};

  if (entry.template === 'timer') {
    const t = widgetInteractivity.timer;
    const configuredMins = Math.max(1, Number(config.custom?.duration_mins ?? config.custom?.duration_minutes ?? 1));
    const total = configuredMins * 60;
    if (t.remaining == null || (!t.running && t.total !== total)) t.remaining = total;
    t.total = total;

    const tag = config.custom?.label || 'Timer';
    const tagColor = config.custom?.tag_color || '#38bdf8';
    const btnColor = config.custom?.accent_color || '#3b82f6';
    const mins = Math.floor(t.remaining / 60);
    const secs = t.remaining % 60;
    const digits = `${mins}:${String(secs).padStart(2, '0')}`;

    const wrap = text('div', 'luma-capsule timer', '');
    wrap.style.cssText = 'width:100%;height:100%;box-sizing:border-box;cursor:pointer;';
    const left = text('div', 'luma-cap-left', '', wrap);
    const tagEl = text('div', 'luma-cap-tag', tag, left);
    if (!compact && config.custom?.tag_color) tagEl.style.color = tagColor;
    const digEl = text('div', 'luma-cap-digits', digits, left);
    if (config.foreground && !compact) digEl.style.color = config.foreground;
    if (t.remaining === 0) digEl.style.color = '#ef4444';

    const controls = text('div', 'luma-cap-controls', '', wrap);
    const resetBtn = text('button', 'luma-btn-skip', '', controls);
    resetBtn.type = 'button';
    resetBtn.setAttribute('aria-label', 'Reset timer');
    resetBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
    resetBtn.onclick = (e) => {
      e.stopPropagation();
      clearInterval(t.timerId);
      t.running = false;
      t.remaining = t.total;
      renderCatalogWidget(entry, stats);
    };

    const playBtn = text('button', 'luma-btn-play', '', controls);
    playBtn.type = 'button';
    if (!compact && config.custom?.accent_color) playBtn.style.background = btnColor;
    playBtn.setAttribute('aria-label', t.running ? 'Pause' : 'Start');
    playBtn.innerHTML = t.running
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (t.running) {
        clearInterval(t.timerId);
        t.running = false;
      } else {
        if (t.remaining <= 0) t.remaining = t.total;
        t.running = true;
        t.timerId = setInterval(() => {
          if (t.remaining > 0) {
            t.remaining--;
            renderCatalogWidget(entry, stats);
          } else {
            clearInterval(t.timerId);
            t.running = false;
            renderCatalogWidget(entry, stats);
          }
        }, 1000);
      }
      renderCatalogWidget(entry, stats);
    };

    wrap.onclick = () => { playBtn.click(); };
    return;
  }

  if (entry.template === 'stopwatch') {
    const sw = widgetInteractivity.stopwatch;
    const tag = config.custom?.label || 'Stopwatch';
    const tagColor = config.custom?.tag_color || '#f97316';
    const btnColor = config.custom?.accent_color || '#f97316';
    const mins = Math.floor(sw.elapsed / 60);
    const secs = sw.elapsed % 60;
    const digits = `${mins}:${String(secs).padStart(2, '0')}`;

    const wrap = text('div', 'luma-capsule stopwatch', '');
    wrap.style.cssText = 'width:100%;height:100%;box-sizing:border-box;cursor:pointer;';
    const left = text('div', 'luma-cap-left', '', wrap);
    const tagEl = text('div', 'luma-cap-tag', tag, left);
    if (config.custom?.tag_color) tagEl.style.color = tagColor;
    const digEl = text('div', 'luma-cap-digits', digits, left);
    if (config.foreground && !compact) digEl.style.color = config.foreground;

    const controls = text('div', 'luma-cap-controls', '', wrap);
    const resetBtn = text('button', 'luma-btn-skip', '', controls);
    resetBtn.type = 'button';
    resetBtn.setAttribute('aria-label', 'Reset stopwatch');
    resetBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
    resetBtn.onclick = (e) => {
      e.stopPropagation();
      clearInterval(sw.timerId);
      sw.running = false;
      sw.elapsed = 0;
      renderCatalogWidget(entry, stats);
    };

    const playBtn = text('button', 'luma-btn-play', '', controls);
    playBtn.type = 'button';
    if (config.custom?.accent_color) playBtn.style.background = btnColor;
    playBtn.setAttribute('aria-label', sw.running ? 'Pause' : 'Start');
    playBtn.innerHTML = sw.running
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (sw.running) {
        clearInterval(sw.timerId);
        sw.running = false;
      } else {
        sw.running = true;
        sw.timerId = setInterval(() => {
          sw.elapsed++;
          renderCatalogWidget(entry, stats);
        }, 1000);
      }
      renderCatalogWidget(entry, stats);
    };

    wrap.onclick = () => { playBtn.click(); };
    return;
  }

  if (entry.template === 'pomodoro') {
    const p = widgetInteractivity.pomodoro;
    const focusMins = Math.max(1, Number(config.custom?.work_mins ?? config.custom?.focus_mins ?? 25));
    if (!p.running && p.phase === 'focus' && p.focusMins !== focusMins) p.remaining = focusMins * 60;
    p.focusMins = focusMins;
    p.breakMins = Math.max(1, Number(config.custom?.break_mins || 5));
    p.maxRounds = Math.max(1, Number(config.custom?.rounds || 4));

    if (p.remaining == null) p.remaining = p.focusMins * 60;

    const isFocus = p.phase === 'focus';
    const tag = isFocus ? `Focus ${p.round}/${p.maxRounds}` : `Break ${p.round}/${p.maxRounds}`;
    const tagColor = !isFocus ? '#22c55e' : (config.custom?.tag_color || '#ef4444');
    const btnColor = !isFocus ? '#22c55e' : (config.custom?.accent_color || '#ef4444');
    const mins = Math.floor(p.remaining / 60);
    const secs = p.remaining % 60;
    const digits = `${mins}:${String(secs).padStart(2, '0')}`;

    const wrap = text('div', 'luma-capsule pomodoro', '');
    wrap.style.cssText = 'width:100%;height:100%;box-sizing:border-box;cursor:pointer;';
    if (!isFocus) {
      card.style.borderColor = '#22c55e';
    } else {
      card.style.borderColor = config.custom?.border_color || getCapsuleAccent('pomodoro', 1);
    }
    const left = text('div', 'luma-cap-left', '', wrap);
    const tagEl = text('div', 'luma-cap-tag', tag, left);
    if (!compact) tagEl.style.color = tagColor;
    const digEl = text('div', 'luma-cap-digits', digits, left);
    if (config.foreground && !compact) digEl.style.color = config.foreground;

    const controls = text('div', 'luma-cap-controls', '', wrap);
    const skipBtn = text('button', 'luma-btn-skip', '', controls);
    skipBtn.type = 'button';
    skipBtn.setAttribute('aria-label', 'Skip phase');
    skipBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>`;
    skipBtn.onclick = (e) => {
      e.stopPropagation();
      clearInterval(p.timerId);
      p.running = false;
      if (p.phase === 'focus') {
        p.phase = 'break';
        p.remaining = p.breakMins * 60;
      } else {
        p.phase = 'focus';
        p.round = (p.round >= p.maxRounds) ? 1 : (p.round + 1);
        p.remaining = p.focusMins * 60;
      }
      renderCatalogWidget(entry, stats);
    };

    const playBtn = text('button', 'luma-btn-play', '', controls);
    playBtn.type = 'button';
    if (!compact) playBtn.style.background = btnColor;
    playBtn.setAttribute('aria-label', p.running ? 'Pause' : 'Start');
    playBtn.innerHTML = p.running
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (p.running) {
        clearInterval(p.timerId);
        p.running = false;
      } else {
        p.running = true;
        p.timerId = setInterval(() => {
          if (p.remaining > 0) {
            p.remaining--;
            renderCatalogWidget(entry, stats);
          } else {
            clearInterval(p.timerId);
            p.running = false;
            skipBtn.click();
          }
        }, 1000);
      }
      renderCatalogWidget(entry, stats);
    };

    wrap.onclick = () => { playBtn.click(); };
    return;
  }

  if (entry.template === 'screentime') {
    const wrap = text('div', 'luma-row-card', '');
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.screentime_watch || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);
    text('div', 'luma-sub', 'Screen Time', content);
    text('div', 'luma-big-val', '1h 38m', content);
    const bars = text('div', 'luma-chart-bars', '', wrap);
    for (const h of [8, 14, 6, 20, 16, 24, 12]) {
      const b = text('div', 'luma-chart-bar', '', bars);
      b.style.height = h + 'px';
    }
    return;
  }

  if (entry.template === 'todos') {
    const raw=config.custom?.tasks||config.custom?.task||'';
    const tasks=String(raw).split(',').map(x=>x.trim()).filter(Boolean).slice(0,50);
    const done=new Set(Array.isArray(config.custom?.tasks_done)?config.custom.tasks_done:config.custom?.done&&config.custom?.task?[config.custom.task]:[]);
    const wrap=text('div','todo-widget','');const heading=text('div','todo-heading','',wrap);
    text('strong','','Tasks',heading);text('span','',tasks.filter(task=>done.has(task)).length+' / '+tasks.length,heading);
    const list=text('div','todo-list','',wrap);const visible=compact?(tasks.filter(task=>!done.has(task)).slice(0,1).length?tasks.filter(task=>!done.has(task)).slice(0,1):tasks.slice(0,1)):tasks;
    if(!visible.length)text('div','empty','Add tasks in widget settings',list);
    for(const task of visible){
      const button=text('button','todo-item','',list);button.type='button';button.setAttribute('aria-pressed',String(done.has(task)));
      text('span','todo-check',done.has(task)?'✓':'○',button);text('span','todo-text',task,button);
      button.onclick=e=>{e.stopPropagation();if(done.has(task))done.delete(task);else done.add(task);if(!config.custom)config.custom={};config.custom.tasks_done=[...done];if(invoke&&!preview)persistWidgetConfig().catch(()=>{});renderCatalogWidget(entry,stats)};
    }
    return;
  }

  if (entry.template === 'notes_memo') {
    const wrap = text('div', 'luma-row-card', '');
    wrap.style.cssText = 'width:100%;height:100%;box-sizing:border-box;';
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.notes_pad || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);

    const titleEl = text('div', 'luma-title', config.custom?.memo_title || 'Meeting notes', content);
    titleEl.contentEditable = 'true';
    titleEl.spellcheck = false;
    titleEl.style.outline = 'none';
    titleEl.style.cursor = 'text';
    titleEl.style.padding = '1px 3px';
    titleEl.style.borderRadius = '3px';

    const descEl = text('div', 'luma-sub', config.custom?.memo_text ?? config.custom?.memo_desc ?? '', content);
    descEl.contentEditable = 'true';
    descEl.spellcheck = false;
    descEl.style.outline = 'none';
    descEl.style.cursor = 'text';
    descEl.style.padding = '1px 3px';
    descEl.style.borderRadius = '3px';

    let memoSaveTimer = null;
    const saveMemo = () => {
      if (!config.custom) config.custom = {};
      config.custom.memo_title = titleEl.textContent.trim();
      config.custom.memo_text = descEl.textContent.trim();
      clearTimeout(memoSaveTimer);
      memoSaveTimer = setTimeout(() => {
        if (invoke && !preview) persistWidgetConfig().catch(() => {});
      }, 300);
    };
    titleEl.oninput = saveMemo;
    descEl.oninput = saveMemo;
    return;
  }

  if (entry.template === 'calendar_event') {
    const wrap = text('div', 'luma-row-card', '');
    const badge = text('div', 'luma-cal-badge', '', wrap);
    text('div', 'luma-cal-badge-top', 'TUE', badge);
    text('div', 'luma-cal-badge-day', '20', badge);
    const content = text('div', 'luma-main-content', '', wrap);
    const titleRow = text('div', 'luma-top-meta', '', content);
    titleRow.innerHTML = `<span style="display:flex;align-items:center;gap:6px;font-weight:600;"><svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6"><rect width="24" height="24" rx="4"/></svg>Design review</span>`;
    text('div', 'luma-sub', '4:05 PM · in 23 min', content);
    return;
  }

  if (entry.template === 'currency') {
    const wrap = text('div', 'luma-row-card', '');
    const left = text('div', 'luma-main-content', '', wrap);
    text('div', 'luma-sub', entry.amount || '500', left);
    text('div', 'luma-big-val', entry.converted || '74,44', left);
    const right = text('div', 'luma-main-content', '', wrap);
    right.style.alignItems = 'flex-end';
    text('div', 'luma-sub', entry.from || 'CNY', right);
    const arr = text('div', '', '', right);
    arr.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l-4-4M17 20l4-4"/></svg>`;
    text('div', 'luma-sub', entry.to || 'USD', right);
    return;
  }

  if (entry.template === 'timeline') {
    const wrap = text('div', 'luma-card', '');
    const meta = text('div', 'luma-top-meta', '', wrap);
    text('span', 'luma-sub', 'Tue 20 Oct', meta);
    text('span', 'luma-sub', '6h 5m on the PC · 4 rounds', meta);
    const bar = text('div', 'luma-timeline-bar', '', wrap);
    for (const s of [
      { w: 15, c: '#f59e0b' }, { w: 8, c: '#3b82f6' }, { w: 22, c: '#10b981' },
      { w: 12, c: '#ec4899' }, { w: 18, c: '#6366f1' }, { w: 25, c: '#06b6d4' }
    ]) {
      const seg = text('div', 'luma-tl-seg', '', bar);
      seg.style.width = s.w + '%';
      seg.style.background = s.c;
    }
    return;
  }

  if (entry.template === 'ai_usage' || entry.template === 'ai_single_bar' || entry.template === 'ai_stat') {
    const wrap = text('div', 'luma-row-card', '');
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons[entry.iconKey] || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);
    const top = text('div', 'luma-top-meta', '', content);
    text('span', 'luma-title', entry.title || 'Session', top);
    text('span', 'luma-sub', entry.meta || '', top);
    if (entry.value) text('div', 'luma-big-val', entry.value, content);
    if (entry.pct != null) {
      const bar = text('div', 'luma-slim-bar', '', content);
      const fill = text('div', 'luma-slim-bar-fill', '', bar);
      fill.style.width = entry.pct + '%';
      if (entry.accent) fill.style.background = entry.accent;
    }
    return;
  }

  if (entry.template === 'ai_plan') {
    const wrap = text('div', 'luma-row-card', '');
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons[entry.iconKey] || icons.generic;
    const list = text('div', 'luma-plan-list', '', wrap);
    let rows = entry.rows || [];
    if (entry.id === 'ai_gemini') {
      const fiveH = config.custom?.five_hour_pct != null ? Number(config.custom.five_hour_pct) : 96;
      const weekly = config.custom?.weekly_pct != null ? Number(config.custom.weekly_pct) : 47;
      const fiveHReset = config.custom?.five_hour_reset || '4h 34m';
      const weeklyReset = config.custom?.weekly_reset || '15h 32m';
      rows = [
        { label: '5h limit', time: fiveHReset, pct: fiveH },
        { label: 'Weekly limit', time: weeklyReset, pct: weekly }
      ];
    } else if (entry.id === 'ai_claude_plan') {
      const session = config.custom?.session_pct != null ? Number(config.custom.session_pct) : 100;
      const weekly = config.custom?.weekly_pct != null ? Number(config.custom.weekly_pct) : 100;
      rows = [
        { label: 'Session', time: '1h 25m', pct: session },
        { label: 'Weekly', time: 'Weekly', pct: weekly }
      ];
    } else if (entry.id === 'ai_chatgpt') {
      const session = config.custom?.session_pct != null ? Number(config.custom.session_pct) : 100;
      const weekly = config.custom?.weekly_pct != null ? Number(config.custom.weekly_pct) : 100;
      rows = [
        { label: 'Session', time: '5h limit', pct: session },
        { label: 'Weekly', time: 'Weekly', pct: weekly }
      ];
    }
    for (const row of rows) {
      const r = text('div', 'luma-plan-row', '', list);
      text('span', '', row.label, r);
      const b = text('div', 'luma-slim-bar', '', r);
      const f = text('div', 'luma-slim-bar-fill', '', b);
      f.style.width = row.pct + '%';
      text('span', 'luma-plan-meta', row.time, r);
      text('span', 'luma-plan-pct', row.pct + '%', r);
    }
    if (entry.footer) {
      text('div', 'luma-sub', entry.footer, list);
    }
    return;
  }

  if (entry.template === 'key_value_list') {
    const wrap = text('div', 'luma-row-card', '');
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons[entry.iconKey] || icons.generic;
    const list = text('div', 'luma-plan-list', '', wrap);
    for (const item of entry.items || []) {
      const r = text('div', 'luma-top-meta', '', list);
      text('span', 'luma-sub', item.label, r);
      text('span', 'luma-title', item.value, r);
    }
    return;
  }

  if (entry.template === 'minimal_clock') {
    const d = new Date();
    const wrap = text('div', 'luma-card', '');
    text('div', 'luma-cap-digits', new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: config.custom?.hour_24 === false, ...(config.custom?.show_seconds ? { second: '2-digit' } : {}) }).format(d), wrap);
    const meta = text('div', 'luma-top-meta', '', wrap);
    text('span', 'luma-title', new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d).toUpperCase(), meta);
    text('span', 'luma-sub', new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d), meta);
    return;
  }
  if (entry.template === 'world_clock') {
    const d = new Date();
    const wrap = text('div', 'luma-row-card', '');
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.timer || icons.generic;
    const list = text('div', 'luma-plan-list', '', wrap);
    const known={Kyiv:'Europe/Kyiv',London:'Europe/London','New York':'America/New_York',Tokyo:'Asia/Tokyo',Paris:'Europe/Paris',Berlin:'Europe/Berlin',Warsaw:'Europe/Warsaw',Sydney:'Australia/Sydney'};
    const cities=String(config.custom?.cities||'Kyiv, London, New York, Tokyo').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);
    for (const name of cities) {
      const r=text('div','luma-top-meta','',list);text('span','luma-sub',name,r);
      try{text('span','luma-title',new Intl.DateTimeFormat('en-US',{timeZone:known[name]||name,hour:'2-digit',minute:'2-digit'}).format(d),r)}catch{text('span','luma-title','Unknown time zone',r)}
    }
    return;
  }

  if (entry.template === 'habits') {
    const h = widgetInteractivity.habits;
    const today=new Date().toLocaleDateString('en-CA');
    const habitNames=String(config.custom?.habits||'Code, Gym, Reading, Meditation').split(',').map(x=>x.trim()).filter(Boolean);
    h.total=Math.max(1,habitNames.length);
    h.done=config.custom?.habits_date===today?Math.max(0,Math.min(h.total,Number(config.custom?.completed)||0)):0;
    const pct = Math.min(100, Math.round((h.done / h.total) * 100));

    const wrap = text('div', 'luma-row-card', '');
    wrap.style.cssText = 'width:100%;height:100%;cursor:pointer;user-select:none;';
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.habits || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);
    const top = text('div', 'luma-top-meta', '', content);
    text('span', 'luma-title', config.custom?.title || 'Daily Habits', top);
    text('span', 'luma-sub', `${h.done} / ${h.total} completed`, top);
    const bar = text('div', 'luma-slim-bar', '', content);
    const fill = text('div', 'luma-slim-bar-fill', '', bar);
    fill.style.width = pct + '%';
    fill.style.background = '#f97316';
    text('div', 'luma-sub', h.done<h.total ? 'Next: '+(habitNames[h.done]||'Habit') : 'All habits completed today', content);

    wrap.onclick = (e) => {
      e.stopPropagation();
      h.done = (h.done >= h.total) ? 0 : (h.done + 1);
      if (!config.custom) config.custom = {};
      config.custom.completed = h.done;
      config.custom.habits_date = today;
      if (invoke && !preview) persistWidgetConfig().catch(() => {});
      renderCatalogWidget(entry, stats);
    };
    return;
  }
  if (entry.template === 'water') {
    const w = widgetInteractivity.water;
    const today=new Date().toLocaleDateString('en-CA');
    w.cups=config.custom?.water_date===today?Math.max(0,Number(config.custom?.cups)||0):0;
    w.goal=Math.max(1,Number(config.custom?.goal_cups)||8);
    const mlPerCup=Math.max(1,Number(config.custom?.cup_ml)||250);
    const totalMl=w.goal*mlPerCup;
    const currentMl = Math.min(totalMl, w.cups * mlPerCup);
    const pct = Math.min(100, Math.round((w.cups / w.goal) * 100));

    const wrap = text('div', 'luma-row-card', '');
    wrap.style.cssText = 'width:100%;height:100%;cursor:pointer;user-select:none;';
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.water || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);
    const top = text('div', 'luma-top-meta', '', content);
    text('span', 'luma-title', config.custom?.title || 'Hydration', top);
    text('span', 'luma-sub', `${w.cups} / ${w.goal} cups`, top);
    const bar = text('div', 'luma-slim-bar', '', content);
    const fill = text('div', 'luma-slim-bar-fill', '', bar);
    fill.style.width = pct + '%';
    fill.style.background = '#0284c7';
    text('div', 'luma-sub', `${new Intl.NumberFormat().format(currentMl)} / ${new Intl.NumberFormat().format(totalMl)} mL · Click to +1 cup`, content);

    wrap.onclick = (e) => {
      e.stopPropagation();
      w.cups = (w.cups >= w.goal + 4) ? 0 : (w.cups + 1);
      if (!config.custom) config.custom = {};
      config.custom.cups = w.cups;
      config.custom.water_date = today;
      if (invoke && !preview) persistWidgetConfig().catch(() => {});
      renderCatalogWidget(entry, stats);
    };
    return;
  }

  if (entry.template === 'quote') {
    const prompts={stoicism:['Focus on what you can influence today.','Meet the moment with patience and care.','Make room for what matters most.'],philosophy:['What assumption could you examine today?','A good question can change the direction of a day.','Make time to notice what you value.'],tech:['Build a small thing, learn from it, improve it.','A clear problem is a useful first step.','Make the next change easier to understand.'],creativity:['Give an unfinished idea room to grow.','Try a different perspective on something familiar.','Make something small before judging it.']};
    const category=config.custom?.category||'stoicism',list=prompts[category]||prompts.stoicism;
    const today=new Date(),day=Math.floor(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())/86400000);
    const wrap=text('div','luma-row-card','');const icon=text('div','luma-icon','',wrap);icon.innerHTML=icons.notes_pad||icons.generic;const content=text('div','luma-main-content','',wrap);text('div','luma-title','Daily prompt',content);text('div','luma-sub',list[((day%list.length)+list.length)%list.length],content);return;
  }
  if (entry.template === 'year_progress') {
    const now=new Date(),requested=Number(config.custom?.target_year),year=Number.isInteger(requested)&&requested>=1970&&requested<=9998?requested:now.getFullYear();
    const start=new Date(year,0,1),end=new Date(year+1,0,1),pct=Math.round(Math.max(0,Math.min(1,(now-start)/(end-start)))*1000)/10;
    const wrap=text('div','luma-row-card','');const icon=text('div','luma-icon','',wrap);icon.innerHTML=icons.timer||icons.generic;const content=text('div','luma-main-content','',wrap);const top=text('div','luma-top-meta','',content);text('span','luma-title',year+' progress',top);text('span','luma-sub',pct+'%',top);const bar=text('div','luma-slim-bar','',content);const fill=text('div','luma-slim-bar-fill','',bar);fill.style.width=pct+'%';fill.style.background='#f43f5e';
    text('div','luma-sub',now<start?Math.ceil((start-now)/86400000)+' days until start':now>=end?'Year complete':Math.ceil((end-now)/86400000)+' days remaining',content);return;
  }

  if (entry.id === 'ctrl_volume') {
    const v = widgetInteractivity.volume;
    const wrap = text('div', 'luma-row-card', '');
    wrap.style.cssText = 'width:100%;height:100%;cursor:pointer;';
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.volume || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);
    const top = text('div', 'luma-top-meta', '', content);
    text('span', 'luma-title', 'Volume', top);
    text('span', 'luma-sub', v.muted ? 'Muted' : `${v.level}%`, top);
    const bar = text('div', 'luma-slim-bar', '', content);
    const fill = text('div', 'luma-slim-bar-fill', '', bar);
    fill.style.width = v.muted ? '0%' : `${v.level}%`;
    fill.style.background = v.muted ? '#ef4444' : '#38bdf8';
    text('div', 'luma-sub', v.muted ? 'Audio muted · Click to unmute' : 'Speakers (Realtek) · Click to mute', content);

    wrap.onclick = (e) => {
      e.stopPropagation();
      v.muted = !v.muted;
      renderCatalogWidget(entry, stats);
    };
    return;
  }
  if (entry.id === 'ctrl_mic_mute') {
    const m = widgetInteractivity.mic;
    const wrap = text('div', 'luma-row-card', '');
    wrap.style.cssText = 'width:100%;height:100%;cursor:pointer;';
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.mic || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);
    text('div', 'luma-title', 'Microphone', content);
    const sub = text('div', 'luma-sub', m.muted ? 'Muted · Input blocked (Click to unmute)' : 'Input active · Rode NT-USB (Click to mute)', content);
    if (m.muted) sub.style.color = '#ef4444';

    wrap.onclick = (e) => {
      e.stopPropagation();
      m.muted = !m.muted;
      renderCatalogWidget(entry, stats);
    };
    return;
  }
  if (entry.id === 'ctrl_recycle_bin') {
    const wrap = text('div', 'luma-row-card', '');
    const icon = text('div', 'luma-icon', '', wrap);
    icon.innerHTML = icons.recycle || icons.generic;
    const content = text('div', 'luma-main-content', '', wrap);
    text('div', 'luma-title', 'Recycle Bin', content);
    text('div', 'luma-sub', '42 items · 1.8 GB disk used', content);
    return;
  }

  if (entry.template === 'news') {
    const wrap = text('div', 'luma-card', '');
    const meta = text('div', 'luma-top-meta', '', wrap);
    text('span', 'luma-sub', entry.source || 'News', meta);
    text('span', 'luma-sub', entry.meta || '', meta);
    text('div', 'luma-title', entry.title || '', wrap);
    return;
  }

  const wrap = text('div', 'luma-row-card', '');
  const icon = text('div', 'luma-icon', '', wrap);
  icon.innerHTML = icons[entry.iconKey] || icons.generic;
  const content = text('div', 'luma-main-content', '', wrap);
  const top = text('div', 'luma-top-meta', '', content);
  text('span', 'luma-title', entry.symbol || entry.title || entry.name, top);
  if (entry.meta || entry.change) {
    const m = text('span', 'luma-sub', entry.meta || entry.change, top);
    if (entry.change?.startsWith('+')) m.style.color = '#22c55e';
    else if (entry.change?.startsWith('-')) m.style.color = '#ef4444';
  }

  let displayVal = entry.value || '';
  let subText = entry.sub || entry.desc || '';

  if (!preview && stats) {
    if (entry.metric === 'cpu') {
      displayVal = stats.cpu == null ? 'Unavailable' : `${Math.round(stats.cpu)}%`;
      subText = stats.frequency ? `${(stats.frequency/1000).toFixed(2)} GHz clock` : 'CPU Usage';
    } else if (entry.metric === 'ram') {
      displayVal = `${(stats.used/1024).toFixed(1)} / ${(stats.total/1024).toFixed(1)} GB`;
      subText = `${Math.round(stats.memory)}% allocated`;
    } else if (entry.metric === 'gpu') {
      displayVal = stats.gpu == null ? 'Unavailable' : `${Math.round(stats.gpu)}%`;
      subText = stats.gpu_temp != null ? `${stats.gpu_temp} °C core temp` : 'GPU Load';
    } else if (entry.metric === 'disk') {
      displayVal = stats.disk == null ? 'Unavailable' : `${Math.round(stats.disk)}% used`;
    } else if (entry.metric === 'network') {
      displayVal = speed(stats.network);
    }
  }

  if (displayVal) text('div', 'luma-big-val', displayVal, content);
  if (subText) text('div', 'luma-sub', subText, content);
}
async function refresh(){if(kind==='audio')return;const seq=++renderSeq;if(kind==='clock'||kind==='calendar'){renderTime();return}if(kind==='notes'){
  if(preview){
    card.replaceChildren();
    text('div',config.notes?'notes-text':'empty',config.notes||'Add a note in widget settings');
    return;
  }
  let textarea=card.querySelector('textarea.notes-text');
  if(!textarea){
    card.replaceChildren();
    textarea=document.createElement('textarea');
    textarea.className='notes-text';
    textarea.placeholder=compact?'Add a note…':'Type your note directly here...';
    textarea.value=config.notes||'';
    let saveNoteTimer=null;
    textarea.oninput=()=>{
      config.notes=textarea.value;
      clearTimeout(saveNoteTimer);
      saveNoteTimer=setTimeout(()=>{
        if(invoke&&!preview)persistWidgetConfig().catch(()=>{});
      },250);
    };
    card.append(textarea);
  }else if(document.activeElement!==textarea && textarea.value!==config.notes){
    textarea.value=config.notes||'';
  }
  return;
}if(kind==='photo'){const src=config.photo?.startsWith('stored:')?'http://widget-photo.localhost/'+config.photo.slice(7):config.photo;if(src&&card.querySelector('.photo')?.getAttribute('src')===src)return;card.replaceChildren();if(src){const img=document.createElement('img');img.className='photo';img.src=src;img.alt='Selected photo';img.onerror=()=>{card.replaceChildren();text('div','empty','Could not load the photo; choose it again in settings')};card.append(img)}else text('div','empty','Choose a photo in settings');return}if(kind==='countdown'){card.replaceChildren();if(!config.countdown_date){text('div','empty','Choose a date in settings');return}const target=new Date(config.countdown_date+'T00:00:00'),today=new Date();today.setHours(0,0,0,0);const days=Math.round((target-today)/86400000);text('div','countdown-title',config.countdown_title||'Countdown');text('div','battery-value',String(Math.abs(days)));text('div','hint',days===0?'Today':days>0?'days to go':'days ago');return}if(kind==='weather'){if(!preview&&!config.city){card.replaceChildren();text('div','empty','Set a city in widget settings');return}try{const w=preview?{city:config.city||'Your city',temp:18,code:1,wind:12,unit:config.fahrenheit?'°F':'°C',days:Array.from({length:7},(_,i)=>({date:new Date(Date.now()+i*86400000).toISOString().slice(0,10),code:[1,0,3,61,2,0,3][i],high:18+i,low:10+i}))}:await getWeather();if(seq!==renderSeq)return;card.replaceChildren();const [icon,desc]=weatherDescription(w.code);text('div','weather-city',w.city);const wt=text('div','weather-temp','');wt.innerHTML=`${icon} <span>${Math.round(w.temp)}${w.unit}</span>`;text('div','hint',`${desc} · ${Math.round(w.wind)} km/h`);if(config.show_forecast&&w.days?.length){const week=text('div','forecast','');for(const day of w.days){const col=text('div','forecast-day','',week);const date=new Date(day.date+'T12:00:00');text('div','forecast-label',Number.isNaN(date.valueOf())?'—':new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(date),col);const fi=text('div','forecast-icon','',col);fi.innerHTML=weatherDescription(day.code)[0];text('div','forecast-temp',Number.isFinite(day.high)?`${Math.round(day.high)}°`:'—',col)}}}catch(e){if(seq===renderSeq){card.replaceChildren();text('div','empty',String(e.message||e))}}return}
if(kind==='prod_clipboard'){
  if(preview){card.replaceChildren();const row=text('div','luma-row-card','');const icon=text('div','luma-icon','',row);icon.innerHTML=window.WIDGET_ICONS?.clipboard||'';const content=text('div','luma-main-content','',row);text('div','luma-title','Clipboard',content);text('div','luma-sub','Copied text appears here',content);return}
  try{
    const limit=Math.max(1,Math.min(50,Number(config.custom?.max_items)||30));
    const history=await invoke('widget_clipboard_snapshot',{limit});if(seq!==renderSeq)return;
    clipboardIndex=Math.min(clipboardIndex,Math.max(0,history.length-1));
    const signature=JSON.stringify([clipboardIndex,history]);if(signature===clipboardSignature)return;clipboardSignature=signature;
    card.replaceChildren();const wrap=text('div','clipboard-widget','');const header=text('div','clipboard-header','',wrap);
    text('strong','','Clipboard',header);
    if(compact&&history.length>1){
      clipboardIndex=Math.min(clipboardIndex,history.length-1);
      const nav=text('div','clipboard-nav','',header);
      for(const [label,delta] of [['Previous',-1],['Next',1]]){const button=text('button','clipboard-nav-button',delta<0?'‹':'›',nav);button.type='button';button.setAttribute('aria-label',label+' clipboard item');button.onclick=e=>{e.stopPropagation();clipboardIndex=(clipboardIndex+delta+history.length)%history.length;refresh()}}
      text('span','clipboard-count',(clipboardIndex+1)+' / '+history.length,header);
    }else text('span','clipboard-count',history.length+' items',header);
    const list=text('div','clipboard-list','',wrap);
    if(!history.length)text('div','empty','Copy text to see it here',list);
    for(const value of compact?history.slice(clipboardIndex,clipboardIndex+1):history.slice(0,limit)){
      const item=text('button','clipboard-item','',list);item.type='button';item.title=value;
      const label=text('span','clipboard-item-text',value.replace(/\s+/g,' '),item);
      const action=text('span','clipboard-item-action','Copy',item);
      item.onclick=async e=>{e.stopPropagation();try{await invoke('widget_clipboard_copy',{text:value});action.textContent='Copied';setTimeout(()=>{action.textContent='Copy'},1200)}catch(err){action.textContent='Unavailable';item.title=String(err)}};
    }
  }catch(error){if(seq===renderSeq&&!clipboardSignature){card.replaceChildren();text('div','empty',String(error.message||error),card)}}
  return;
}
async function loadControl(action='get',value=null){
  if(kind==='ctrl_brightness'){const level=await invoke('widget_brightness',{action,value:Math.max(0,Math.min(100,Number(value)||0))});return {level};}
  const audio=kind==='ctrl_volume'||kind==='ctrl_mic_mute';
  const step=action==='set'?Math.max(0,Math.min(100,Number(value)||0)):Math.max(1,Math.min(50,Number(config.custom?.step)||5));
  return audio?invoke('widget_audio_device',{kind:kind==='ctrl_volume'?'volume':'microphone',action,step}):invoke('widget_recycle_bin',{action});
}
function renderRealControl(data){
  card.replaceChildren();const wrap=text('div','control-widget','');const label=text('div','control-widget-label','',wrap);
  text('strong','',kind==='ctrl_volume'?'Volume':kind==='ctrl_mic_mute'?'Microphone':kind==='ctrl_brightness'?'Brightness':'Recycle Bin',label);
  const value=text('span','control-widget-value','',label);
  const controls=text('div','control-widget-actions','',wrap);
  const button=(caption,action)=>{const b=text('button','control-widget-button',caption,controls);b.type='button';b.onclick=async event=>{event.stopPropagation();b.disabled=true;try{renderRealControl(await loadControl(action))}catch(error){value.textContent=String(error)}finally{b.disabled=false}};return b};
  if(kind==='ctrl_recycle_bin'){
    const bytes=Number(data.bytes)||0;value.textContent=(Number(data.items)||0)+' items · '+(bytes/1048576).toFixed(1)+' MB';
    button('Empty…','empty').setAttribute('aria-label','Empty Recycle Bin (Windows will ask for confirmation)');return;
  }
  value.textContent=data.muted?'Muted':kind==='ctrl_volume'||kind==='ctrl_brightness'?data.level+'%':'On';
  if(kind==='ctrl_volume'||kind==='ctrl_brightness'){
    const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.value=data.level;slider.setAttribute('aria-label',kind==='ctrl_brightness'?'Display brightness':'Master volume');controls.append(slider);
    slider.onchange=async event=>{event.stopPropagation();try{renderRealControl(await loadControl('set',slider.value))}catch(error){value.textContent=String(error)}};
  }
  if(kind!=='ctrl_brightness')button(data.muted?'Unmute':'Mute','toggle_mute');
}
function formatActive(seconds){const minutes=Math.floor((Number(seconds)||0)/60),hours=Math.floor(minutes/60);return hours?hours+'h '+minutes%60+'m':minutes+'m'}
function renderScreenTime(data){
  card.replaceChildren();const day=data.today||{},hours=Array.isArray(day.hours)?day.hours:[];
  const wrap=text('div',kind==='prod_day_timeline'?'activity-widget timeline-widget':'activity-widget','');
  const heading=text('div','activity-heading','',wrap);text('span','activity-label',kind==='prod_day_timeline'?'Today’s activity':'Screen Time',heading);text('strong','activity-total',formatActive(day.seconds),heading);
  const chart=text('div','activity-chart','',wrap);
  hours.forEach((seconds,index)=>{const bar=text('span','activity-bar','',chart);bar.style.height=Math.max(3,Math.round(Math.min(1,Number(seconds)/3600)*100))+'%';bar.style.opacity=seconds?'.9':'.2';bar.title=String(index).padStart(2,'0')+':00 · '+formatActive(seconds)});
  if(kind==='prod_screentime'&&!compact){const apps=Object.entries(day.apps||{}).sort((a,b)=>b[1]-a[1]).slice(0,3);const list=text('div','activity-apps','',wrap);for(const [name,seconds] of apps){const row=text('div','activity-app','',list);text('span','',name,row);text('span','',formatActive(seconds),row)}if(!apps.length)text('span','empty','Activity appears while this widget is enabled',list)}
}
let folderExpanded = false;
async function renderAppFolderWidget() {
  card.replaceChildren();
  const folderAppIds = Array.isArray(config.custom?.folder_apps) ? config.custom.folder_apps : [];
  let apps = [];
  try {
    if (invoke && folderAppIds.length > 0) {
      const snap = await invoke('get_dock_snapshot');
      const allItems = snap?.items || [];
      const norm = p => String(p || '').replace(/\\/g, '/').toLowerCase();
      apps = folderAppIds.map(id => {
        const targetNorm = norm(id);
        const baseName = targetNorm.split('/').pop().replace('.lnk', '').replace('.exe', '');
        const found = allItems.find(i => {
          const itemNorm = norm(i.id);
          return itemNorm === targetNorm || norm(i.path) === targetNorm || norm(i.name) === targetNorm || itemNorm.endsWith('/' + baseName + '.lnk') || norm(i.name) === baseName;
        });
        return found || { id, name: id.split('/').pop().split('\\').pop().replace('.lnk', '').replace('.exe', ''), icon: '' };
      });
    }
  } catch {}

  const folderName = config.custom?.folder_name || 'Apps';
  const isLight = document.documentElement.classList.contains('light-compact');

  if (compact) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'app-folder-btn';
    btn.title = folderName + (apps.length ? ' (' + apps.length + ' apps)' : '');
    btn.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:transparent;border:0;padding:0;margin:0;cursor:pointer;outline:none;';

    if (apps.length > 0) {
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:2.5px;width:24px;height:24px;align-content:center;justify-content:center;';
      const colors = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899'];
      for (let i = 0; i < Math.min(4, apps.length); i++) {
        const a = apps[i];
        const cell = document.createElement('div');
        cell.style.cssText = 'width:10.5px;height:10.5px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:2px;';
        if (a.icon) {
          const img = document.createElement('img');
          img.src = a.icon;
          img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
          cell.append(img);
        } else {
          cell.style.background = colors[i % colors.length];
          cell.style.color = '#fff';
          cell.style.fontSize = '7px';
          cell.style.fontWeight = '700';
          cell.textContent = a.name ? a.name[0] : '·';
        }
        grid.append(cell);
      }
      btn.append(grid);
    }

    btn.onclick = async (e) => {
      e.stopPropagation();
      btn.style.transform = 'scale(0.88)';
      setTimeout(() => btn.style.transform = '', 120);
      const rect = (window.frameElement || btn).getBoundingClientRect();
      if (invoke) {
        try {
          await invoke('dock_open_folder', {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            folderName,
            appCount: apps.length,
            isLight
          });
          return;
        } catch (err) {
          console.warn('dock_open_folder error', err);
        }
      }
    };
    card.append(btn);
    return;
  }


  const grid = text('div', 'folder-desktop-grid', '');
  for (const app of apps) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'folder-desktop-app'; button.title = app.name;
    button.setAttribute('aria-label', app.name);
    if (app.icon) { const img = document.createElement('img'); img.src = app.icon; img.alt = ''; button.append(img); }
    else button.textContent = app.name?.[0] || '·';
    button.onclick = e => { e.stopPropagation(); invoke?.('dock_activate', {id: app.id, newInstance: false}).catch(console.error); };
    grid.append(button);
  }

}

if (kind === 'sys_tray') {
  card.replaceChildren();
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'sys-tray-btn'; btn.title = 'System Tray';
  btn.setAttribute('aria-label', 'Open Atelier tray');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>';
  btn.onclick = e => {
    e.stopPropagation();
    const rect = (window.frameElement || btn).getBoundingClientRect();
    invoke?.('dock_open_tray', {x:rect.left,y:rect.top,width:rect.width,height:rect.height}).catch(console.error);
  };
  card.append(btn);
  return;
}

if (kind === 'app_folder') {
  renderAppFolderWidget();
  return;
}

if(!preview&&['prod_screentime','prod_day_timeline','ctrl_volume','ctrl_mic_mute','ctrl_recycle_bin','ctrl_brightness'].includes(kind)){
  try{const data=kind.startsWith('prod_')?await invoke('widget_screen_time'):await loadControl();if(seq!==renderSeq)return;if(kind.startsWith('prod_'))renderScreenTime(data);else if(!card.contains(document.activeElement))renderRealControl(data)}catch(error){if(seq===renderSeq){card.replaceChildren();text('div','empty',String(error.message||error))}}
  return;
}
if(kind==='prod_calculator'&&!preview){
  if(card.querySelector('.calculator-widget')&&card.contains(document.activeElement))return;
  card.replaceChildren();const wrap=text('div','calculator-widget','');const input=document.createElement('input');input.type='text';input.inputMode='decimal';input.value=config.custom?.expression||'';input.placeholder='e.g. 1024 × 768';input.setAttribute('aria-label','Expression');wrap.append(input);
  const result=text('output','calculator-result','',wrap);const button=text('button','calculator-button','=',wrap);button.type='button';button.setAttribute('aria-label','Calculate');
  const calculate=()=>{try{const value=evaluateCalculator(input.value);const precision=Math.max(0,Math.min(8,Number(config.custom?.precision??2)));result.textContent=new Intl.NumberFormat(undefined,{maximumFractionDigits:precision}).format(value);if(!config.custom)config.custom={};config.custom.expression=input.value;persistWidgetConfig().catch(()=>{})}catch(error){result.textContent=String(error.message||error)}};
  button.onclick=e=>{e.stopPropagation();calculate()};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();calculate()}};
  if(input.value)try{const precision=Math.max(0,Math.min(8,Number(config.custom?.precision??2)));result.textContent=new Intl.NumberFormat(undefined,{maximumFractionDigits:precision}).format(evaluateCalculator(input.value))}catch{}
  return;
}
if(kind==='prod_standup'&&!preview){
  try{
    const minutes=Math.max(1,Math.min(240,Number(config.custom?.interval_mins)||45));
    const data=await invoke('widget_break_reminder',{action:'get',minutes});if(seq!==renderSeq)return;
    if(card.contains(document.activeElement))return;
    card.replaceChildren();const wrap=text('div','control-widget','');const heading=text('div','control-widget-label','',wrap);text('strong','','Break reminder',heading);
    const remaining=Math.max(0,Number(data.seconds)||0);text('span','control-widget-value',data.due?'Take a break':Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'),heading);
    const actions=text('div','control-widget-actions','',wrap);const button=text('button','control-widget-button',data.due?'Start next interval':'Restart',actions);button.type='button';button.onclick=async e=>{e.stopPropagation();try{await invoke('widget_break_reminder',{action:'reset',minutes});refresh()}catch(error){heading.title=String(error)}};
  }catch(error){if(seq===renderSeq){card.replaceChildren();text('div','empty',String(error.message||error))}}return;
}
if(!preview&&['prod_timer','prod_stopwatch','prod_pomodoro'].includes(kind)){
  const timerKind=kind.slice(5),c=config.custom||{};
  const whole=(value,fallback,max)=>Math.max(1,Math.min(max,Math.floor(Number(value)||fallback)));
  const args={kind:timerKind,duration:whole(c.duration_mins??c.duration_minutes,1,1440),focus:whole(c.work_mins??c.focus_mins,25,1440),rest:whole(c.break_mins,5,1440),rounds:whole(c.rounds,4,24)};
  const draw=data=>{
    card.replaceChildren();const root=timerKind==='stopwatch'?text('div','stopwatch-widget',''):card;const wrap=text('div','luma-capsule '+timerKind,'',root);wrap.style.cssText='width:100%;height:100%;box-sizing:border-box;';
    if(data.persistence_error)wrap.title=data.persistence_error;
    const left=text('div','luma-cap-left','',wrap),isBreak=timerKind==='pomodoro'&&data.phase==='break';
    const label=timerKind==='pomodoro'?(isBreak?'Break ':'Focus ')+data.round+'/'+data.rounds:(c.label||(timerKind==='timer'?'Timer':'Stopwatch'));
    const tag=text('div','luma-cap-tag',label,left);if(!compact&&c.tag_color)tag.style.color=c.tag_color;
    const seconds=Number(data.seconds)||0,mins=Math.floor(seconds/60),secs=String(seconds%60).padStart(2,'0');
    const fraction=timerKind==='stopwatch'&&c.show_millis?'.'+String(Math.floor((Number(data.milliseconds)||0)%1000/10)).padStart(2,'0'):'';
    const digits=text('div','luma-cap-digits',mins+':'+secs+fraction,left);if(config.foreground&&!compact)digits.style.color=config.foreground;
    const controls=text('div','luma-cap-controls','',wrap);
    const button=(label,action,svg,cls)=>{const b=text('button',cls,'',controls);b.type='button';b.setAttribute('aria-label',label);b.innerHTML=svg;b.onclick=async e=>{e.stopPropagation();b.disabled=true;const actionSeq=++renderSeq;try{const next=await invoke('widget_timer',{...args,action});if(actionSeq===renderSeq)draw(next)}catch(error){if(actionSeq===renderSeq){card.replaceChildren();text('div','empty',String(error.message||error))}}};return b};
    const reset='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
    const skip='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
    button(timerKind==='pomodoro'?'Skip phase':'Reset',timerKind==='pomodoro'?'skip':'reset',timerKind==='pomodoro'?skip:reset,'luma-btn-skip');
    const play=data.running?'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const playButton=button(data.running?'Pause':'Start','toggle',play,'luma-btn-play');if(!compact&&c.accent_color)playButton.style.background=c.accent_color;
    if(timerKind==='stopwatch'){
      const laps=Array.isArray(data.laps)?data.laps:[],formatLap=ms=>Math.floor(ms/60000)+':'+String(Math.floor(ms/1000)%60).padStart(2,'0')+'.'+String(Math.floor(ms%1000/10)).padStart(2,'0');
      const lap=button('Record lap','lap','<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V3h13l-3 5 3 5H5"/></svg>','luma-btn-skip');lap.disabled=!data.running||laps.length>=100;
      if(laps.length){tag.textContent=label+' · '+laps.length+' laps';wrap.title=(wrap.title?wrap.title+' · ':'')+'Last lap: '+formatLap(laps.at(-1)-(laps.at(-2)||0));}
      if(!compact&&laps.length&&c.show_laps!==false){
        wrap.style.height='auto';const list=text('div','stopwatch-laps','',root);list.setAttribute('aria-label','Stopwatch laps');
        for(let i=laps.length-1;i>=0;i--){const row=text('div','stopwatch-lap','',list);text('span','','Lap '+(i+1),row);text('span','',formatLap(laps[i]-(laps[i-1]||0)),row);text('span','',formatLap(laps[i]),row);}
      }
    }
  };
  try{const data=await invoke('widget_timer',{...args,action:'get'});if(seq===renderSeq)draw(data)}catch(error){if(seq===renderSeq){card.replaceChildren();text('div','empty',String(error.message||error))}}return;
}
const catalogEntry=window.WIDGETS_CATALOG?.find(item=>item.id===kind);
if(catalogEntry&&!['clock','calendar','system','media','battery','notes','weather','photo','countdown','audio'].includes(kind)){
  if(!preview&&kind==='dev_docker'){
    try{
      const data=await invoke('widget_docker');if(seq!==renderSeq)return;
      if(!Number.isSafeInteger(data.total)||!Number.isSafeInteger(data.running)||data.running<0||data.running>data.total)throw Error('Invalid Docker container count');
      const mode=config.custom?.metric||'Overview',cpu=Number.isFinite(data.cpu_percent)?data.cpu_percent.toFixed(1)+'%':'Unavailable',memory=Number.isFinite(data.memory_bytes)?(data.memory_bytes/1073741824).toFixed(2)+' GiB':'Unavailable';
      if(mode==='CPU'||mode==='Memory'){renderLiveMetric(catalogEntry,{title:'Docker '+mode,value:mode==='CPU'?cpu:memory,sub:data.stats_error||data.stats_count+' sampled containers',error:(mode==='CPU'?cpu:memory)==='Unavailable'});return}
      if(mode==='Containers'){
        const list=Array.isArray(data.containers)?data.containers:[],count=Math.max(1,Math.min(10,Number(config.custom?.top_count)||5));
        const items=[...list].sort((a,b)=>(b.cpu_percent??-1)-(a.cpu_percent??-1)).slice(0,count).map(item=>({label:item.name,value:item.state,sub:Number.isFinite(item.cpu_percent)?item.cpu_percent.toFixed(1)+'% · '+(item.memory_bytes/1048576).toFixed(0)+' MiB':''}));
        renderLiveMetric(catalogEntry,items.length?{title:'Docker · '+data.total+' containers',items}:{title:'Docker',value:'No containers'});return;
      }
      renderLiveMetric(catalogEntry,{title:'Docker containers',badge:data.stats_error?'Stats unavailable':data.stats_count+' sampled',items:[{label:'Running',value:String(data.running)},{label:'CPU',value:cpu},{label:'Memory',value:memory},{label:'Other states',value:String(data.stopped)}]});
    }catch(error){if(seq===renderSeq)renderLiveMetric(catalogEntry,{title:'Docker containers',value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }
  if(!preview&&kind==='ctrl_audio_switch'){
    if(card.contains(document.activeElement))return;
    const communications=config.custom?.also_communications===true;
    const draw=devices=>{
      card.replaceChildren();const wrap=text('div','control-widget','');const heading=text('div','control-widget-label','',wrap);text('strong','','Audio output',heading);
      const selected=devices.find(device=>device.selected),status=text('span','control-widget-value',selected?.name||'No default output',heading);
      const actions=text('div','control-widget-actions','',wrap);
      if(devices.length){
        const select=text('button','audio-output-select',selected?.name||'Choose output',actions);select.type='button';select.setAttribute('aria-label','Choose audio output');
        select.onclick=async e=>{e.stopPropagation();try{await invoke('widget_open_audio_outputs',{communications})}catch(error){status.textContent='Unavailable';status.title=String(error.message||error)}};
      }else status.textContent='No connected outputs';
      const button=text('button','control-widget-button','Settings',actions);button.type='button';button.onclick=async e=>{e.stopPropagation();try{await invoke('widget_open_sound_settings')}catch(error){status.textContent='Unavailable';status.title=String(error.message||error)}};
    };
    try{const devices=await invoke('widget_audio_outputs',{deviceId:null,communications});if(seq===renderSeq)draw(devices)}catch(error){if(seq===renderSeq)renderLiveMetric(catalogEntry,{title:'Audio outputs',value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }
  let stats=null;
  if(invoke&&!preview&&(kind.startsWith('sys_')||catalogEntry.category==='system')&&!['sys_disk_c','sys_disk_d','sys_ping','sys_processes','sys_wifi','sys_bluetooth','sys_vram','sys_fans'].includes(kind)){try{stats=await invoke('widget_stats')}catch{}}
  if(seq!==renderSeq)return;
  if(!preview && ['sys_disk_c','sys_disk_d'].includes(kind)){
    try{const drive=config.custom?.drive_letter||(kind==='sys_disk_d'?'D:':'C:');const data=await invoke('widget_drive_usage',{drive});if(seq!==renderSeq)return;renderLiveMetric(catalogEntry,{title:'Drive '+data.drive+':',value:Math.round(data.percent)+'% used',sub:(data.free/1073741824).toFixed(1)+' GB free'});}
    catch(error){renderLiveMetric(catalogEntry,{title:catalogEntry.name,value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }
  if(!preview&&kind==='sys_uptime'){
    const seconds=Number(stats?.uptime_seconds);if(!Number.isFinite(seconds)){renderLiveMetric(catalogEntry,{title:'Uptime',value:'Unavailable',error:true});return}
    const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60);
    const value=config.custom?.show_days===false?(days*24+hours)+'h '+minutes+'m':(days?days+'d ':'')+hours+'h '+minutes+'m';renderLiveMetric(catalogEntry,{title:'System uptime',value,sub:'Since Windows started'});return;
  }
  if(!preview&&kind==='sys_thermals'){
    const temp=stats?.gpu_temp;if(temp==null){renderLiveMetric(catalogEntry,{title:'GPU temperature',value:'Unavailable',sub:'Sensor not exposed by this GPU',error:true});return}
    const fahrenheit=config.custom?.temp_unit==='Fahrenheit';renderLiveMetric(catalogEntry,{title:'GPU temperature',value:Math.round(fahrenheit?temp*9/5+32:temp)+(fahrenheit?' °F':' °C'),sub:'GPU sensor'});return;
  }
  if(!preview&&kind==='sys_ping'){
    try{const host=String(config.custom?.host||'1.1.1.1');const ms=await invoke('widget_ping',{host});if(seq!==renderSeq)return;renderLiveMetric(catalogEntry,{title:'Ping',value:ms+' ms',sub:host})}catch(error){if(seq===renderSeq)renderLiveMetric(catalogEntry,{title:'Ping',value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }
  if(!preview&&kind==='sys_processes'){
    try{const count=Math.max(1,Math.min(10,Number(config.custom?.top_count)||5));const processes=await invoke('widget_top_processes',{count});if(seq!==renderSeq)return;const entries=processes.map(process=>({label:process.name,value:(process.cpu==null?'':process.cpu.toFixed(1)+'% · ')+(process.memory_bytes/1048576).toFixed(0)+' MB'}));renderLiveMetric(catalogEntry,entries.length?{title:'Top processes',items:entries}:{title:'Top processes',value:'No process data'});}catch(error){if(seq===renderSeq)renderLiveMetric(catalogEntry,{title:'Top processes',value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }
  if(!preview&&kind==='sys_wifi'){
    try{const data=await invoke('widget_wifi',{adapter:String(config.custom?.adapter||'')});if(seq!==renderSeq)return;renderLiveMetric(catalogEntry,{title:data.ssid||'Connected Wi-Fi',value:data.signal+'% signal',sub:data.adapter})}catch(error){if(seq===renderSeq)renderLiveMetric(catalogEntry,{title:'Wi-Fi',value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }
  if(!preview&&['sys_vram','sys_fans'].includes(kind)){
    try{const data=await invoke('widget_gpu_memory');if(seq!==renderSeq)return;if(kind==='sys_fans'){if(data.fan_percent==null)throw Error('NVIDIA fan speed is not exposed by this GPU');renderLiveMetric(catalogEntry,{title:'GPU fan',value:data.fan_percent+'%',sub:'NVIDIA fan speed'})}else{const used=(data.used/1073741824).toFixed(1),total=(data.total/1073741824).toFixed(1);renderLiveMetric(catalogEntry,{title:'GPU memory',value:used+' GB used',sub:config.custom?.show_total===false?'NVIDIA GPU':total+' GB total · NVIDIA GPU'})}}catch(error){if(seq===renderSeq)renderLiveMetric(catalogEntry,{title:catalogEntry.name,value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }
  if(!preview&&kind==='sys_bluetooth'){
    try{const devices=await invoke('widget_bluetooth');if(seq!==renderSeq)return;renderLiveMetric(catalogEntry,devices.length?{title:'Bluetooth devices',items:devices.map(name=>({label:name,value:'Connected'}))}:{title:'Bluetooth devices',value:'No connected devices'})}catch(error){if(seq===renderSeq)renderLiveMetric(catalogEntry,{title:'Bluetooth',value:'Unavailable',sub:String(error.message||error),error:true})}return;
  }

  if(['pomodoro','timer','stopwatch'].includes(catalogEntry.template)){
    renderCatalogWidget(catalogEntry,stats);
    return;
  }

  if(window.WidgetMetrics){
    try{
      const liveData=await window.WidgetMetrics.resolveMetric(catalogEntry,config);
      if(seq===renderSeq&&liveData){
        renderLiveMetric(catalogEntry,liveData);
        return;
      }
    }catch(err){
      if(seq===renderSeq&&!preview){
        card.replaceChildren();
        const wrap=text('div','luma-row-card','');
        const icon=text('div','luma-icon','',wrap);
        icon.innerHTML=window.WIDGET_ICONS?.[catalogEntry.iconKey]||window.WIDGET_ICONS?.generic||'';
        const content=text('div','luma-main-content','',wrap);
        text('div','luma-title',catalogEntry.name||catalogEntry.id,content);
        const errMsg=text('div','luma-sub',err.message||'Configuration required',content);
        errMsg.style.color='#f59e0b';
        return;
      }
    }
  }

  if(!preview && (['ai','revenue','dev','finance'].includes(catalogEntry.category)||catalogEntry.fields?.some(f=>f.type==='password'))){
    renderLiveMetric(catalogEntry,{title:catalogEntry.name,value:'Unavailable',sub:'Live integration is not available',error:true});return;
  }
  if(!preview&&card.contains(document.activeElement)&&document.activeElement?.isContentEditable)return;
  renderCatalogWidget(catalogEntry,stats);
  return;
}
if(!invoke&&!preview)return;try{if(kind==='system'){const s=preview?{cpu:32,memory:64,used:10240,total:16384,gpu:23,frequency:4200,network:510000,disk:62,gpu_temp:52,network_percent:15}:await invoke('widget_stats');if(seq!==renderSeq)return;card.replaceChildren();const stats=text('div','stats','');const all=[['CPU',s.cpu,s.frequency==null?'Frequency unavailable':`${(s.frequency/1000).toFixed(2)} GHz`,config.show_cpu],['RAM',s.memory,`${(s.used/1024).toFixed(1)} / ${(s.total/1024).toFixed(1)} GB`,config.show_memory],['GPU',s.gpu,s.gpu_temp==null?'Temperature unavailable':`${s.gpu_temp} °C`,config.show_gpu],['Disk',s.disk,'System drive used',config.show_disk]];for(const [name,value,detail,show] of all){if(!show)continue;const row=text('div','stat','',stats),ring=text('div','ring','',row);ring.style.setProperty('--value',Math.round(value||0));text('b','',value==null?'—':`${Math.round(value)}%`,ring);const desc=text('div','','',row);text('strong','',name,desc);if(config.show_details)text('small','',value==null?'Unavailable':detail,desc)}if(config.show_network){const row=text('div','stat','',stats),ring=text('div','ring','',row);ring.style.setProperty('--value',Math.round(s.network_percent||0));text('b','',s.network_percent==null?'—':`${Math.round(s.network_percent)}%`,ring);const desc=text('div','','',row);text('strong','','Network',desc);text('small','',speed(s.network),desc)}if(!stats.children.length)text('div','empty','Choose metrics in settings',stats)}else if(kind==='media'){const m=preview?{title:'Your music',artist:'Artist',album:'Album',playing:true}:await invoke('widget_media');if(seq!==renderSeq)return;card.replaceChildren();const wrap=text('div','media-layout','');if(config.show_artwork&&m.artwork){const image=document.createElement('img');image.className='artwork';image.src=m.artwork;image.alt='Album artwork';wrap.append(image)}else if(config.show_artwork){const n=text('div','note','',wrap);n.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';}const info=text('div','media-info','',wrap);text('div','track',m.title||'Nothing playing',info);if(config.show_artist&&m.artist)text('div','artist',m.artist,info);if(config.show_album&&m.album)text('div','artist',m.album,info);if(config.show_status)text('div','hint',m.title?(m.playing?'Playing':'Paused'):'Open a music or video app',info);const controls=text('div','media-controls','',wrap);const icons={previous:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 5 8 12l10 7z"/></svg>',play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',next:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 5l10 7-10 7z"/></svg>'};for(const [action,label,enabled] of [['previous','Previous track',m.can_previous],[m.playing?'pause':'play',m.playing?'Pause':'Play',m.playing?m.can_pause:m.can_play],['next','Next track',m.can_next]]){const button=text('button','media-button','',controls);button.innerHTML=icons[action];button.type='button';button.setAttribute('aria-label',label);button.disabled=preview||!enabled;button.addEventListener('click',async e=>{e.stopPropagation();button.disabled=true;try{await invoke('widget_media_control',{action});setTimeout(refresh,300)}catch(error){const message=text('div','media-error',String(error),wrap);message.setAttribute('role','status');button.disabled=false}})}}else if(kind==='battery'){const b=preview?{available:true,percent:82,charging:true}:await invoke('widget_battery');if(seq!==renderSeq)return;card.replaceChildren();if(!b.available){text('div','empty','Battery unavailable');return}text('div','battery-value',`${b.percent}%`);const bar=text('div','battery-bar',''),fill=text('div','battery-fill','',bar);fill.style.width=b.percent+'%';if(config.show_status)text('div','hint',b.charging?'Connected to power':'On battery')}}catch{if(seq===renderSeq){card.replaceChildren();text('div','empty','Data unavailable')}}}
function refreshDelay(){if(kind==='prod_stopwatch'&&config.custom?.show_millis)return 250;if(['clock','prod_minimal_clock','prod_world_clock','prod_standup','prod_timer','prod_stopwatch','prod_pomodoro'].includes(kind))return 1000;if(kind==='prod_clipboard')return 750;if(kind==='weather')return 60000;if(kind.startsWith('sys_'))return Math.max(kind==='sys_wifi'?30000:1000,Math.min(60000,(Number(kind==='sys_bluetooth'?config.custom?.check_interval:config.custom?.update_rate_sec)||5)*1000));return kind==='system'?3000:10000}
async function refreshLoop(){try{await refresh()}catch(error){card.replaceChildren();text('div','empty',String(error.message||error))}finally{setTimeout(refreshLoop,refreshDelay())}}
refreshLoop();window.addEventListener('resize',()=>{if(kind==='calendar')refresh()});

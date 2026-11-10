(function(root){
 function element(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  if(!node.dataset)node.dataset={};
  if(!node.setAttribute)node.setAttribute=(k,v)=>{node[k]=v};
  return node;
 }
 function text(cls,value,tag='span'){return element(tag,cls,value)}

 const ICONS={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  music:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  sparkles:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  battery:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="10" x="2" y="7" rx="2"/><line x1="22" x2="22" y1="11" y2="13"/><line x1="6" x2="6" y1="11" y2="13"/></svg>',
  cpu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>',
  storage:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  network:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5M12 4v16M7 9l5-5 5 5"/></svg>',
  weather:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/></svg>',
  timer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 8 14"/></svg>',
  volume:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
  terminal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  sliders:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>',
  message:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  area:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/></svg>',
  screen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>',
  camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>',
  pipette:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 5-5M19 8l-7 7-4-4 7-7a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8Z"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  prev:'<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>',
  next:'<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>'
 };

 function iconSvg(key,cls='island-icon-svg'){
  const span=element('span',cls);
  if(span.innerHTML!==undefined)span.innerHTML=ICONS[key]||ICONS.sparkles;
  return span;
 }

 function fmtTime(sec){
  const s=Math.max(0,Math.floor(sec||0));
  return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
 }
 function slider(cls,label,value,max,enabled){const input=element('input',cls);input.type='range';input.min='0';input.max=String(max);input.step='1';input.value=String(Math.max(0,Math.min(max,Number(value)||0)));input.style.setProperty('--range-progress',(Number(input.value)/max*100)+'%');input.disabled=!enabled;input.setAttribute('aria-label',label);return input}

 function create(kind,data={},example=false){
  const card=element('div','island-module-preview island-module-'+kind);
  const item=data.item||{};
  if(item.tint)card.style.setProperty('--card-tint',item.tint);
  const now=new Date(),track=data.track||{},stats=data.stats||{},battery=data.battery||{},weather=data.weather||{};

  if(kind==='media'){
   const artworkLayout=['medium','large'].includes(item.artwork_layout)?item.artwork_layout:'small';
   const player=element('div','island-player-layout artwork-'+artworkLayout);
   if(item.show_artwork!==false&&artworkLayout!=='small')player.className+=' artwork-visible';
   const mediaWrap=element('div','island-adaptive-media');
   const mainRow=element('div','island-media-main');
   const art=element('div','island-media-artwork');
   if(!example&&track.artwork){
    const img=element('img');img.src=track.artwork;img.alt='';
    art.append(img);
   }else{
    art.className+=' is-empty';
    art.append(iconSvg('music','island-media-fallback-icon'));
   }

   const info=element('div','island-media-details');
   const titleText=item.label||(example?'Now Playing':(track.title||'Nothing playing'));
   const artistText=item.detail||(example?'Audio source':(track.artist||''));
   const titleNode=text('island-card-title',titleText);
   const artistNode=text('island-card-sub',artistText);
   info.append(titleNode);
   if(artistText)info.append(artistNode);
   if(item.show_artist===false)artistNode.textContent='';
   if(item.show_artwork!==false){if(artworkLayout==='small')mainRow.append(art);else player.append(art)}
   mainRow.append(info);
   mediaWrap.append(mainRow);

   if(item.show_progress!==false){
    const progRow=element('div','island-media-progress-bar');
    const posSec=example?85:(track.position||0);
    const durSec=example?214:(track.duration||0);
    const posText=text('island-time-code',fmtTime(posSec));
    const durText=text('island-time-code',durSec?('-'+fmtTime(durSec-posSec)):'--:--');
    posText.dataset.mediaPosition='';durText.dataset.mediaRemaining='';
    const trackBar=slider('island-scrub-track','Playback position',durSec?posSec/durSec*1000:0,1000,example||Boolean(track.can_seek&&durSec));trackBar.dataset.mediaSeek='';
    if(item.show_times!==false)progRow.append(posText);
    progRow.append(trackBar);
    if(item.show_times!==false)progRow.append(durText);
    mediaWrap.append(progRow);
   }

   const controlLine=element('div','island-media-control-line');
   if(item.show_controls!==false){
    const ctrlRow=element('div','island-media-btn-row');
    const prevBtn=element('button','island-btn-ctrl');prevBtn.type='button';prevBtn.dataset.action='prev';prevBtn.setAttribute('aria-label','Previous track');prevBtn.append(iconSvg('prev'));
    const playBtn=element('button','island-btn-play');playBtn.type='button';playBtn.dataset.action='play';playBtn.setAttribute('aria-label','Play or pause');playBtn.append(iconSvg(track.playing?'pause':'play'));
    const nextBtn=element('button','island-btn-ctrl');nextBtn.type='button';nextBtn.dataset.action='next';nextBtn.setAttribute('aria-label','Next track');nextBtn.append(iconSvg('next'));
    ctrlRow.append(prevBtn,playBtn,nextBtn);
    controlLine.append(ctrlRow);
   }

   if(item.show_volume){
    const volRow=element('div','island-volume-row');

    const level=example?65:data.volume?.level;
    const volTrack=slider('island-vol-bar','System volume',level,100,example||level!=null);volTrack.dataset.volume='';
    const volText=text('island-vol-text',level==null?'--':level+'%');volText.dataset.volumeValue='';
    volRow.append(volTrack,volText);
    controlLine.append(volRow);
   }
   if(controlLine.children.length)mediaWrap.append(controlLine);

   player.append(mediaWrap);
   if(item.show_lyrics){
    card.className+=' island-with-lyrics';
    const pane=element('div','island-lyrics-pane');
    pane.setAttribute('aria-label','Lyrics');
    const lyrics=data.lyrics||{status:'waiting'};
    if(lyrics.status==='synced'){
     const selected=Math.max(0,root.IslandLyrics?.current(lyrics.lines,track.position)??0);
     pane.className+=' is-synced';
     for(const offset of [-1,0,1]){const line=lyrics.lines[selected+offset],row=text(offset===0?'island-lyrics-line active':'island-lyrics-line',line?.text||'','button');row.type='button';row.dataset.lyricSlot=String(offset);if(line)row.dataset.lyricTime=String(line.time);row.disabled=!line||!track.can_seek;pane.append(row)}
    }else if(lyrics.status==='plain')pane.append(text('island-lyrics-plain',lyrics.text));
    else pane.append(text('island-lyrics-status',lyrics.status==='loading'?'Loading lyrics…':lyrics.status==='instrumental'?'Instrumental track':lyrics.status==='unavailable'?'Lyrics unavailable':'Play a track to see lyrics'));
    card.append(player,pane);
   }else card.append(player);
   return card;
  }

  if(kind==='audio'){
   const wrap=element('div','island-adaptive-audio');
   const head=element('div','island-card-header');
   head.append(text('island-card-title',item.label||'Volume'));
   const valRow=element('div','island-audio-val-row');
   const level=example?65:data.volume?.level;
   const value=text('island-big-val',level==null?'--':level+'%');value.dataset.volumeValue='';
   valRow.append(value,text('island-card-sub',item.detail||'Output Device'));
   const bar=slider('island-volume-slider','System volume',level,100,example||level!=null);bar.dataset.volume='';
   wrap.append(head,valRow,bar);
   card.append(wrap);
   return card;
  }

  if(kind==='weather'){
   const wrap=element('div','island-weather-card');const code=example?2:weather.code;
   const symbol=element('span','island-weather-icon');if(Number.isFinite(code)&&root.IslandExtras?.weatherSvg)symbol.innerHTML=root.IslandExtras.weatherSvg(code);
   const values=element('div','island-weather-values');const city=item.label||(example?'Weather':weather.city||'Weather');
   values.append(text('island-card-sub',city));const row=element('div','island-weather-temperature');row.append(symbol,text('island-big-val',example?'22°C':Number.isFinite(weather.temp)?`${Math.round(weather.temp)}${weather.unit||'°'}`:'--'));
   values.append(row);if(item.show_secondary!==false)values.append(text('island-card-sub',item.detail||(example?'Cloudy':weather.city||'Set a city')));wrap.append(values);card.append(wrap);return card;
  }

  if(kind==='calendar'){
   const wrap=element('div','island-adaptive-calendar');
   const monthName=now.toLocaleDateString('en-US',{month:'short',year:'numeric'});
   const head=element('div','island-card-header');
   head.append(text('island-card-title',item.label||monthName));
   const brief=text('island-calendar-brief',now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}));
   const grid=element('div','island-cal-grid');
   for(const d of ['M','T','W','T','F','S','S'])grid.append(text('island-cal-day-head',d));
   const first=(new Date(now.getFullYear(),now.getMonth(),1).getDay()+6)%7;
   const totalDays=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
   for(let i=0;i<42;i++){
    const dayNum=i-first+1;
    const isToday=dayNum===now.getDate();
    const cell=text(isToday?'island-cal-cell today':'island-cal-cell',dayNum>0&&dayNum<=totalDays?String(dayNum):'');
    grid.append(cell);
   }
   if(item.show_calendar_grid===false)wrap.className+=' calendar-brief-only';
   wrap.append(head,brief,grid);
   card.append(wrap);
   return card;
  }

  if(kind==='note'&&data.interactive){const input=element('textarea','island-note-editor');input.value=data.note||'';input.maxLength=1000;input.placeholder='Write a note';input.setAttribute('aria-label','Note');input.dataset.noteEditor='';card.append(input);return card}

  const defaultTitles={
   clock:now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}),
   battery:example?'82%':battery.available?`${battery.percent}%`:'--',
   system:example?'CPU 32%':data.stats?`CPU ${Math.round(stats.cpu||0)}%`:'CPU --',
   disk:example?'64% used':stats.disk!=null?`${Math.round(stats.disk)}% used`:'Disk',
   network:example?'2.4 MB/s':stats.network!=null?`${Math.round(stats.network/1024)} KB/s`:'Network',
   memory:example?'RAM 64%':stats.memory!=null?`RAM ${Math.round(stats.memory)}%`:'RAM --',
   gpu:example?'GPU 23%':stats.gpu!=null?`GPU ${Math.round(stats.gpu)}%`:'GPU unavailable',
   uptime:example?'4d 18h':stats.uptime_seconds!=null?`${Math.floor(stats.uptime_seconds/86400)}d ${Math.floor(stats.uptime_seconds%86400/3600)}h`:'Uptime unavailable',
   cpu_frequency:example?'4.2 GHz':stats.frequency!=null?`${(stats.frequency/1000).toFixed(2)} GHz`:'Frequency unavailable',
   date:now.toLocaleDateString('en-US',{month:'short',day:'numeric'}),
   weather:example?'22°C':data.weather?`${Math.round(weather.temp)}${weather.unit||'°'}`:'Weather',
   note:example?'Notes':data.note||'Note',
   countdown:example?'12 days':data.countdown||'Event'
  };

  const defaultSubs={
   clock:now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),
   battery:example?'Connected':battery.charging?'Charging':'Battery',
   system:example?'RAM 64%':data.stats?`RAM ${Math.round(stats.memory||0)}%`:'Memory',
   disk:example?'Storage free':'Storage',
   network:example?'Throughput':'Activity',
   memory:example?'10.2 / 16 GB':stats.total?`${(stats.used/1024).toFixed(1)} / ${(stats.total/1024).toFixed(1)} GB`:'Memory',
   gpu:stats.gpu_temp!=null?`${stats.gpu_temp}°C`:'Graphics',
   uptime:'Since last restart',cpu_frequency:'Processor frequency',date:now.toLocaleDateString('en-US',{weekday:'long',year:'numeric'}),
   weather:example?'Partly cloudy':weather.city||'',
   note:example?'Quick thoughts':'',
   countdown:example?'Remaining':'Target'
  };

  const displayTitle=item.label||defaultTitles[kind]||kind;
  const displaySub=item.detail||defaultSubs[kind]||'';

  const wrap=element('div','island-adaptive-card');
  const body=element('div','island-card-body');
  body.append(text('island-big-val',displayTitle));
  if(item.show_secondary!==false&&displaySub){
   body.append(text('island-card-sub',displaySub));
  }

  if(['battery','system','disk','memory','gpu'].includes(kind)&&item.show_progress!==false){
   const bar=element('div','island-gauge-track');
   const fill=element('span');
   const percentage=example?(kind==='battery'?82:kind==='system'?32:64):kind==='battery'?battery.percent:kind==='system'?stats.cpu:kind==='memory'?stats.memory:kind==='gpu'?stats.gpu:stats.disk;fill.style.width=Math.max(0,Math.min(100,Number(percentage)||0))+'%';
   bar.append(fill);
   body.append(bar);
  }

  wrap.append(body);
  card.append(wrap);
  return card;
 }

 root.IslandModulePreview={create,ICONS};
})(window);

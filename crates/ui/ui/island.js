document.addEventListener('contextmenu', event => event.preventDefault());
(()=>{
 const invoke=window.__TAURI__.core.invoke, listen=window.__TAURI__.event.listen, $=id=>document.getElementById(id), island=$('island');
 let config={},activePage=0,expanded=false,track={},stats={},battery={},weather=null,volume=null,timer,revision=0,lyricsScrollKey='',mediaUpdatedAt=0,lastMediaSample=null,mediaVersion=0,mediaPollBusy=false,interacting=false,noteTimer=null,noteWrites=Promise.resolve(),volumeBusy=false,volumeNext=null,seeking=false,seekNext=null,lastActiveLyric=-2,activeLyrics=[];
 const lyrics=window.IslandLyrics.create(invoke,()=>{if(expanded)renderActivePage()});

 function setShape(element){
  const color=parseInt(config.color.slice(1),16),shoulder=Math.min(config.radius,Math.floor(config.compact_height/2));
  element.classList.toggle('island-notch',config.shape==='notch');
  element.style.setProperty('--notch-shoulder',shoulder+'px');
  element.style.setProperty('--notch-radius',config.radius+'px');
  element.style.setProperty('--notch-fill',`rgba(${color>>16},${color>>8&255},${color&255},${config.opacity/100})`);
  element.style.setProperty('--notch-border-width',config.border_width+'px');
  element.style.setProperty('--notch-border-color',config.border_color);
  return config.shape==='notch'?shoulder:0;
 }

 function configure(c,preserveExpanded=false){
  revision++;
  const pages=Array.isArray(c.pages)&&c.pages.length?c.pages:[{id:"page-1",name:"Home",layout:(c.layout||[])}];
  activePage=c.tab_style==='none'?0:Math.min(activePage,pages.length-1);
  config={...c,pages};

  const n=parseInt(config.color.slice(1),16);
  setShape(island);
  island.style.setProperty('--bg',`${n>>16},${(n>>8)&255},${n&255}`);
  island.style.setProperty('--opacity',config.opacity/100);
  island.style.setProperty('--reveal-duration',config.animation_duration+'ms');
  island.style.setProperty('--text-color',config.text_color);
  island.style.setProperty('--text-size',config.text_size+'px');
  island.style.setProperty('--border-width',config.border_width+'px');
  island.style.setProperty('--border-color',config.border_color);
  island.style.setProperty('--art-size',config.artwork_size+'px');
  island.style.setProperty('--compact-align',({left:'flex-start',center:'center',right:'flex-end'})[config.compact_align]||'flex-start');
  island.style.setProperty('--radius',config.shape==='pill'?'110px':config.shape==='square'?'5px':config.shape==='notch'?`0 0 ${config.radius}px ${config.radius}px`:config.radius+'px');

  $('compact').classList.toggle('indicator-left',config.indicator_position==='left');
  island.style.setProperty('--compact-height',(config.compact_height||46)+'px');
  const audioColor=parseInt(config.audio_color.slice(1),16);
  island.style.setProperty('--audio-color',`${audioColor>>16},${(audioColor>>8)&255},${audioColor&255}`);
  if(!config.audio_reactive)island.style.setProperty('--audio-alpha','0');

  $('small-state').classList.toggle('hidden',!config.compact_indicator);
  if(!preserveExpanded){expanded=false;island.classList.remove('expanded');invoke('island_expand',{expanded:false}).catch(()=>{})}

  renderActivePage();
  updateCompact();
  syncAudioTimer();
 }

 function renderActivePage(){
  const nav=$('island-page-nav'),body=$('island-body'),content=$('island-content');
  if(!nav||!body||!content)return;
  if(interacting||content.querySelector('[data-note-editor]:focus'))return;
  const multi=config.pages.length>1&&config.tab_style!=='none';
  const showArrows=config.tab_style==='dots'&&multi;

  body.className='body nav-'+(config.tab_position||'top');
  body.classList.toggle('has-pages',multi);
  body.classList.toggle('has-arrows',showArrows);

  const prevBtn=$('island-nav-prev'),nextBtn=$('island-nav-next');
  if(prevBtn){
   prevBtn.hidden=!showArrows;
   prevBtn.onclick=e=>{
    e.stopPropagation();
    activePage=(activePage-1+config.pages.length)%config.pages.length;
    renderActivePage();
   };
  }
  if(nextBtn){
   nextBtn.hidden=!showArrows;
   nextBtn.onclick=e=>{
    e.stopPropagation();
    activePage=(activePage+1)%config.pages.length;
    renderActivePage();
   };
  }

  nav.replaceChildren();
  nav.hidden=!multi;
  nav.className='island-page-nav '+(config.tab_style==='dots'?'dots':'buttons');

  if(multi){
   config.pages.forEach((p,index)=>{
    const button=document.createElement('button');
    button.type='button';
    button.setAttribute('aria-label',p.name||'Page');
    button.setAttribute('aria-current',String(index===activePage));

    if(config.tab_style!=='dots'){
     if(p.icon&&window.IslandModulePreview?.ICONS?.[p.icon]){const ico=document.createElement('span');ico.className='island-icon-svg page-tab-icon';ico.innerHTML=window.IslandModulePreview.ICONS[p.icon];button.append(ico)}else{const name=document.createElement('span');name.className='page-tab-name';name.textContent=p.name||'Page';button.append(name)}button.dataset.pageStyle=p.style||'default';
    }

    button.onclick=e=>{
     e.stopPropagation();
     activePage=index;
     renderActivePage();
    };
    nav.append(button);
   });
  }

  const currentLyricsKey=JSON.stringify([track?.title,track?.artist,activePage]);
  const sameLyrics=lyricsScrollKey===currentLyricsKey;
  const lyricsScroll=sameLyrics?(content.querySelector('.island-lyrics-pane')?.scrollTop||0):0;
  lyricsScrollKey=currentLyricsKey;
  content.replaceChildren();
  const currentLayout=config.pages[config.tab_style==='none'?0:activePage]?.layout||[];
  const music=currentLayout.find(item=>item.kind==='media');
  const lyricView=lyrics.update(track,Boolean(expanded&&music?.show_lyrics));
  activeLyrics=lyricView.status==='synced'?lyricView.lines:[];
  const elapsed=track.playing&&mediaUpdatedAt?Math.min(5,(Date.now()-mediaUpdatedAt)/1000):0;
  const displayTrack={...track,position:Math.max(0,(Number(track.position)||0)+elapsed)};

  for(const item of currentLayout){
   const node=document.createElement('div');
   node.className='island-live-module island-surface';
   node.dataset.kind=item.kind;
   node.dataset.style=item.style||'glass';
   node.style.position='absolute';
   node.style.left=item.x+'%';
   node.style.top=item.y+'%';
   node.style.width=item.w+'%';
   node.style.height=item.h+'%';
   if(item.tint)node.style.setProperty('--card-tint',item.tint);

   const card=window.IslandModulePreview.create(item.kind,{
    item,track:displayTrack,stats,battery,weather,volume,lyrics:lyricView,interactive:true,
    note:config.note_text,
    countdown:window.IslandExtras?.countdown(config.countdown_date,config.countdown_title)
   },false);

   if(item.kind==='media'){
    card.querySelectorAll('[data-action]').forEach(btn=>{
     btn.onclick=async e=>{
      e.stopPropagation();
      const act=btn.dataset.action;
      const action=act==='prev'?'previous':act;
      const nextAction=action==='play'?(track?.playing?'pause':'play'):action;
      mediaVersion++;
      const request=invoke('widget_media_control',{action:nextAction});
      if(action==='play'){track.position=(Number(track.position)||0)+(track.playing&&mediaUpdatedAt?(Date.now()-mediaUpdatedAt)/1000:0);track.playing=!track.playing;mediaUpdatedAt=Date.now();renderActivePage()}
      try{
       await request;
       await updateMedia();
      }catch(err){
       console.error(err);
      }
     };
    });
   }

   card.querySelectorAll('[data-volume]').forEach(input=>{
    input.onpointerdown=e=>{interacting=true;if(e.pointerId!=null)input.setPointerCapture?.(e.pointerId)};
    input.oninput=()=>{input.style.setProperty('--range-progress',input.value+'%');volume={...(volume||{}),level:Number(input.value)};card.querySelectorAll('[data-volume-value]').forEach(label=>label.textContent=input.value+'%');setVolume(Number(input.value))};
    input.onchange=()=>{interacting=false;setVolume(Number(input.value))};
    input.onpointercancel=()=>{interacting=false};
   });
   const seek=card.querySelector('[data-media-seek]');
   if(seek){seek.onpointerdown=e=>{interacting=true;if(e.pointerId!=null)seek.setPointerCapture?.(e.pointerId)};seek.oninput=()=>{track.position=Number(seek.value)/1000*(track.duration||0);mediaUpdatedAt=Date.now();updatePlayback()};seek.onchange=()=>{interacting=false;seekTo(Number(seek.value)/1000*(track.duration||0))};seek.onpointercancel=()=>{interacting=false}}
   card.querySelectorAll('[data-lyric-slot]').forEach(line=>{line.onclick=e=>{e.stopPropagation();if(line.dataset.lyricTime!==undefined)seekTo(Number(line.dataset.lyricTime))}});
   const note=card.querySelector('[data-note-editor]');
   if(note){const saveNote=value=>{noteWrites=noteWrites.catch(()=>{}).then(()=>invoke('island_update_note',{text:value})).catch(console.error)};note.oninput=()=>{config.note_text=note.value;clearTimeout(noteTimer);noteTimer=setTimeout(()=>saveNote(note.value),300)};note.onkeydown=e=>e.stopPropagation();note.onblur=()=>{clearTimeout(noteTimer);saveNote(note.value);if(config.auto_close&&!island.matches(':hover'))setExpanded(false)}}

   node.append(card);
   content.append(node);
  }
  const lyricsPane=content.querySelector('.island-lyrics-pane');
  if(lyricsPane)lyricsPane.scrollTop=lyricsScroll;
  if(!sameLyrics)lastActiveLyric=-2;
  updatePlayback();
 }

 async function setVolume(level){volumeNext=Math.max(0,Math.min(100,Math.round(level)));if(volumeBusy)return;volumeBusy=true;try{while(volumeNext!==null){const next=volumeNext;volumeNext=null;try{volume=await invoke('widget_audio_device',{kind:'volume',action:'set',step:next})}catch(e){console.error(e)}}}finally{volumeBusy=false}}
 async function seekTo(seconds){if(!track.can_seek)return;mediaVersion++;lastMediaSample=null;seekNext=Math.max(0,seconds);track.position=seekNext;mediaUpdatedAt=Date.now();updatePlayback();if(seeking)return;seeking=true;try{while(seekNext!==null){const next=seekNext;seekNext=null;try{await invoke('widget_media_seek',{seconds:next})}catch(e){console.error(e)}}}finally{seeking=false;setTimeout(updateMedia,300)}}
 function updatePlayback(){if(!expanded)return;const position=Math.min(Number(track.duration)||Infinity,Math.max(0,(Number(track.position)||0)+(track.playing&&mediaUpdatedAt?Math.max(0,(Date.now()-mediaUpdatedAt)/1000):0)));const fmt=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');document.querySelectorAll('[data-media-position]').forEach(n=>n.textContent=fmt(position));document.querySelectorAll('[data-media-remaining]').forEach(n=>n.textContent=track.duration?'-'+fmt(Math.max(0,track.duration-position)):'--:--');document.querySelectorAll('[data-media-seek]').forEach(n=>{if(!interacting)n.value=track.duration?String(Math.round(position/track.duration*1000)):'0';n.style.setProperty('--range-progress',(Number(n.value)/10)+'%')});const rows=[...document.querySelectorAll('[data-lyric-slot]')];const index=activeLyrics.length?Math.max(0,window.IslandLyrics.current(activeLyrics,position)):-1;if(index!==lastActiveLyric){rows.forEach(row=>{const offset=Number(row.dataset.lyricSlot),line=activeLyrics[index+offset];row.textContent=line?.text||'';if(line)row.dataset.lyricTime=String(line.time);else delete row.dataset.lyricTime;row.disabled=!line||!track.can_seek;row.classList.toggle('active',offset===0&&Boolean(line))});const pane=document.querySelector('.island-lyrics-pane.is-synced');if(pane&&lastActiveLyric>=0&&index>=0&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)pane.animate([{opacity:.55,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'});lastActiveLyric=index}}

 let expansionRevision=0,lastExpandedAt=0;
 function setExpanded(value){
  clearTimeout(timer);
  timer=null;
  if(expanded===value)return;
  expansionRevision++;
  expanded=value;
  if(value){
    lastExpandedAt=Date.now();
    island.classList.add('expanded');
    renderActivePage();
    updateMedia();
    updateStats();
    updateVolume();
   }else{
    island.classList.remove('expanded');
   }
  invoke('island_expand',{expanded:value}).catch(e=>{
    console.error(e);
    expanded=!value;
    island.classList.toggle('expanded',expanded);
  });
 }

 $('compact').onclick=()=>setExpanded(true);
 $('compact').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setExpanded(true)}};
 island.addEventListener('click',e=>{if(expanded&&(e.target===island||e.target.classList.contains('body')))setExpanded(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)setExpanded(false)});
 function scheduleClose(){if(!timer&&expanded&&config.auto_close&&!interacting&&!document.querySelector('[data-note-editor]:focus')){const delay=typeof config.close_delay==='number'?config.close_delay:400;timer=setTimeout(()=>{timer=null;setExpanded(false)},delay)}}
 island.onmouseenter=()=>{clearTimeout(timer);timer=null;if(config.open_on_hover)setExpanded(true)};
 island.onmouseleave=scheduleClose;
 document.addEventListener('pointerup',()=>{if(interacting)setTimeout(()=>{interacting=false;if(!island.matches(':hover'))scheduleClose()},0)});
 window.addEventListener('blur',()=>{interacting=false});
 let pointerCheckPending=false;
 setInterval(async()=>{if(!expanded||!config.auto_close||interacting||pointerCheckPending||document.querySelector('[data-note-editor]:focus'))return;pointerCheckPending=true;const checkedRevision=revision,checkedExpansion=expansionRevision;try{const inside=await invoke('island_pointer_inside');if(expanded&&checkedRevision===revision&&checkedExpansion===expansionRevision){if(inside){clearTimeout(timer);timer=null}else scheduleClose()}}catch(e){console.error(e)}finally{pointerCheckPending=false}},150);

 function updateCompact(){
  if(!config.enabled)return;
  const mode=config.compact_content||'music',now=new Date();
  const music=mode==='music'||mode==='music-clock';
  const clock=mode==='clock'||mode==='music-clock';
  const date=mode==='date';

  const smallArt=$('small-art');
  if(smallArt){
   if(music&&track?.artwork){smallArt.src=track.artwork;smallArt.hidden=false}
   else smallArt.hidden=true;
  }
  const smallTitle=$('small-title');
  if(smallTitle){
   smallTitle.textContent=music?(track?.title||'Nothing playing'):date?now.toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'}):'';
   smallTitle.classList.toggle('hidden',clock&&!music);
  }
  const smallTime=$('small-time');
  if(smallTime){
   smallTime.classList.toggle('hidden',!clock);
   smallTime.textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});
  }
  const smallState=$('small-state');
  if(smallState){
   smallState.textContent=track?.playing?'♫':'●';
  }
 }

 async function updateMedia(){
  if(seeking||mediaPollBusy)return;
  mediaPollBusy=true;
  const requestVersion=mediaVersion;
  try{
   const previous=track;
   const next=await invoke('widget_media');
   if(requestVersion!==mediaVersion||seeking)return;
   const rawPosition=Number(next.position)||0;
   const sameTrack=next.title===previous.title&&next.artist===previous.artist&&next.album===previous.album;
   if(sameTrack&&next.playing&&previous.playing&&lastMediaSample===rawPosition&&mediaUpdatedAt){const estimated=(Number(previous.position)||0)+(Date.now()-mediaUpdatedAt)/1000;next.position=Math.min(Number(next.duration)||Infinity,Math.max(rawPosition,estimated))}
   lastMediaSample=rawPosition;
   track=next;
   mediaUpdatedAt=Date.now();
   updateCompact();
   if(expanded){const keys=['title','artist','album','artwork','playing','can_play','can_pause','can_seek','can_next','can_previous','duration'];if(keys.some(key=>track[key]!==previous[key]))renderActivePage();else updatePlayback()}
  }catch(e){
   console.error(e);
  }finally{mediaPollBusy=false}
 }

 async function updateVolume(){if(!expanded||volumeBusy||interacting)return;const items=config.pages?.[config.tab_style==='none'?0:activePage]?.layout||[];if(!items.some(item=>item.kind==='audio'||item.kind==='media'&&item.show_volume))return;try{const next=await invoke('widget_audio_device',{kind:'volume',action:'get',step:0});const changed=next.level!==volume?.level||next.muted!==volume?.muted;volume=next;if(changed)renderActivePage()}catch(e){volume=null}}

 async function updateStats(){
  try{
   stats=await invoke('widget_stats');
   if(expanded)renderActivePage();
  }catch(e){}
 }

 async function updateBattery(){
  try{
   battery=await invoke('widget_battery');
   if(expanded)renderActivePage();
  }catch(e){}
 }

 async function updateWeather(){
  if(!config.weather_city?.trim())return;
  try{
   weather=await window.IslandExtras?.get(config.weather_city,config.weather_fahrenheit);
   if(expanded)renderActivePage();
  }catch(e){}
 }

 let audioPending=false,audioLevel=0,audioRetry=0,audioTimer=null;
 function syncAudioTimer(){
  const needed=Boolean(config.enabled&&config.audio_reactive&&!document.hidden);
  if(needed&&!audioTimer){
   audioTimer=setInterval(updateAudio,120);
  }else if(!needed&&audioTimer){
   clearInterval(audioTimer);
   audioTimer=null;
   audioLevel=0;
   island.style.setProperty('--audio-alpha','0');
  }
 }

 async function updateAudio(){
  if(!config.audio_reactive||!config.enabled||document.hidden){
   audioLevel=0;island.style.setProperty('--audio-alpha','0');
   syncAudioTimer();return;
  }
  if(audioPending||Date.now()<audioRetry)return;
  audioPending=true;
  try{
   const data=await invoke('audio_spectrum');
   const target=Math.min(1,Math.max(0,(Number(data.bass)||0)*2.5+(Number(data.mid)||0)*.5));
   audioLevel+=(target-audioLevel)*.35;
   island.style.setProperty('--audio-alpha',(audioLevel*(config.audio_strength/100)*.8).toFixed(3));
  }catch{
   audioLevel=0;
   island.style.setProperty('--audio-alpha','0');
   audioRetry=Date.now()+2000;
  }finally{
   audioPending=false;
  }
 }

 listen('island-config',e=>configure(e.payload,true));
 listen('island-reset',()=>{clearTimeout(timer);timer=null;expansionRevision++;expanded=false;interacting=false;island.classList.remove('expanded')});
 listen('island-expand-finished',e=>{const isExp=Boolean(e.payload);if(expanded!==isExp){expanded=isExp;island.classList.toggle('expanded',isExp);if(isExp)renderActivePage()}});
 invoke('get_island').then(configure).catch(console.error);

 setInterval(updateMedia,1500);
 setInterval(()=>{updateCompact();updatePlayback()},250);
 setInterval(updateVolume,2000);
 setInterval(updateStats,5000);
 setInterval(updateBattery,10000);
 setInterval(updateWeather,60000);

 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){updateWeather();updateMedia()}
  syncAudioTimer();
 });
})();

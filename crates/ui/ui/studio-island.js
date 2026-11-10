(()=>{
 const invoke=window.__TAURI__?.core?.invoke,status=document.getElementById('island-status'),layoutStatus=document.getElementById('island-layout-status'),fields=[...document.querySelectorAll('[data-island]')],grid=document.getElementById('island-editor-grid'),frame=document.getElementById('island-editor-frame'),palette=document.getElementById('island-palette'),L=window.IslandFreeLayout;
 if(!invoke){status.textContent='Launch Atelier to use Dynamic Island.';return}

 const islandLayout=document.getElementById('island-layout');
 const drawer=document.getElementById('island-module-drawer');
 const drawerContent=document.getElementById('island-drawer-content');
 const drawerClose=document.getElementById('island-drawer-close');
 const drawerTitle=document.getElementById('island-drawer-title');
 const drawerPreview=document.getElementById('island-drawer-preview');
 const drawerFields=document.getElementById('island-drawer-fields');

 const catalog={
  media:{name:'Music Player',w:7,h:8},
  audio:{name:'Volume & Output',w:5,h:4},
  clock:{name:'Clock',w:4,h:3},
  calendar:{name:'Calendar',w:5,h:7},
  battery:{name:'Battery',w:3,h:3},
  system:{name:'CPU & memory',w:4,h:3},
  disk:{name:'Storage',w:3,h:3},
  network:{name:'Network',w:4,h:3},
  memory:{name:'Memory',w:4,h:3},
  gpu:{name:'GPU',w:4,h:3},
  uptime:{name:'PC Uptime',w:4,h:3},
  cpu_frequency:{name:'CPU Frequency',w:4,h:3},
  date:{name:'Date',w:4,h:3},
  weather:{name:'Weather',w:4,h:4},
  note:{name:'Note',w:5,h:4},
  countdown:{name:'Countdown',w:4,h:3}
 };

 const ICONS=['home','music','sparkles','clock','calendar','battery','cpu','storage','network','weather','note','timer','terminal','volume','star','heart','folder','sliders'];
 const PAGE_ICONS=['home','music','sparkles','calendar','clock','battery','cpu','storage','network','weather','note','timer','terminal','star','heart','folder','sliders'];
 const TINTS=[
  {name:'Default',value:''},
  {name:'Violet',value:'rgba(139,92,246,0.22)'},
  {name:'Blue',value:'rgba(59,130,246,0.22)'},
  {name:'Emerald',value:'rgba(16,185,129,0.22)'},
  {name:'Rose',value:'rgba(244,63,94,0.22)'},
  {name:'Amber',value:'rgba(245,158,11,0.22)'}
 ];

 const moduleFit=window.IslandFit.create();
 let config,pending=Promise.resolve(),serial=0,selected=null,drag=null,track=null,battery=null,stats=null,weather=null,volume=null,weatherError=null,compactPreview=true,refreshSerial=0,activePageId=null;
 const lyrics=window.IslandLyrics.create(invoke,()=>{if(config&&!drag&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))render()});

 function page(){return config.tab_style==='none'?config.pages[0]:(config.pages.find(p=>p.id===activePageId)||config.pages[0])}

 function switchPage(delta){
  if(config.pages.length<=1)return;
  const idx=config.pages.findIndex(p=>p.id===page().id);
  const nextIdx=(idx+delta+config.pages.length)%config.pages.length;
  activePageId=config.pages[nextIdx].id;
  closeDrawer();
  render();
  refresh();
 }

 function pageButtonContent(button,item){if(item.icon&&window.IslandModulePreview?.ICONS?.[item.icon]){const ico=document.createElement('span');ico.className='island-icon-svg page-tab-icon';ico.innerHTML=window.IslandModulePreview.ICONS[item.icon];button.append(ico)}else{const txt=document.createElement('span');txt.className='page-tab-name';txt.textContent=item.name||'Page';button.append(txt)}button.dataset.pageStyle=item.style||'default';button.title=item.name||'Page'}
 function renderPages(){const tabs=document.getElementById('island-page-tabs'),addPage=document.getElementById('island-page-add');tabs.replaceChildren();for(const item of config.pages){const b=document.createElement('button');b.type='button';b.disabled=config.tab_style==='none'&&item.id!==config.pages[0].id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(item.id===page().id));b.setAttribute('aria-label',item.name||'Page');pageButtonContent(b,item);b.onclick=()=>{activePageId=item.id;closeDrawer();render();openPageDrawer(item);refresh()};tabs.append(b)}addPage.disabled=config.pages.length>=6||config.tab_style==='none';addPage.onclick=()=>{if(addPage.disabled)return;let n=1;while(config.pages.some(p=>p.id==='page-'+n))n++;const item={id:'page-'+n,name:'Page '+n,layout:[]};config.pages.push(item);activePageId=item.id;closeDrawer();render();openPageDrawer(item);save()}}
 function openPageDrawer(item){selected=null;for(const n of grid.children)n.classList.remove('selected');islandLayout?.classList.add('has-selection');drawer?.setAttribute('aria-hidden','false');if(drawer)drawer.inert=false;if(drawerContent)drawerContent.hidden=false;document.getElementById('island-drawer-badge').textContent='PAGE SETTINGS';drawerTitle.textContent=item.name||'Page';drawerPreview.replaceChildren();const sample=document.createElement('button');sample.type='button';sample.className='island-page-sample';pageButtonContent(sample,item);drawerPreview.append(sample);drawerFields.replaceChildren();const fields=document.createElement('div');fields.className='island-drawer-section';fields.innerHTML='<div class="island-drawer-section-title">Page</div>';const row=document.createElement('label');row.className='island-drawer-row';row.append(document.createTextNode('Name'));const input=document.createElement('input');input.type='text';input.maxLength=24;input.value=item.name||'';input.onchange=()=>{item.name=input.value.trim()||'Page';render();openPageDrawer(item);save()};row.append(input);fields.append(row);const caption=document.createElement('div');caption.className='island-drawer-section-title';caption.textContent='Button content';fields.append(caption);const icons=document.createElement('div');icons.className='island-icon-palette';for(const key of [null,...PAGE_ICONS]){const b=document.createElement('button');b.type='button';b.className='island-icon-opt'+((item.icon||null)===key?' active':'');b.title=key||'Text';b.setAttribute('aria-label',key||'Text');if(key){const ico=document.createElement('span');ico.className='island-icon-svg';ico.innerHTML=window.IslandModulePreview.ICONS[key];b.append(ico)}else b.textContent='T';b.onclick=()=>{item.icon=key;render();openPageDrawer(item);save()};icons.append(b)}fields.append(icons);const styleLabel=document.createElement('div');styleLabel.className='island-drawer-section-title';styleLabel.textContent='Button style';fields.append(styleLabel);const styles=document.createElement('div');styles.className='island-appearance-options';for(const [value,label] of [['default','Default'],['outline','Outline'],['filled','Filled']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String((item.style||'default')===value));b.onclick=()=>{item.style=value;render();openPageDrawer(item);save()};styles.append(b)}fields.append(styles);drawerFields.append(fields);const del=document.createElement('button');del.type='button';del.className='island-drawer-remove-btn';del.textContent='Delete page';del.disabled=config.pages.length<=1;del.onclick=()=>{if(config.pages.length<=1)return;config.pages=config.pages.filter(p=>p.id!==item.id);activePageId=config.pages[0].id;closeDrawer();render();save()};drawerFields.append(del)}
 function renderCanvasNavigation(){
  const nav=document.getElementById('island-editor-navigation');
  const prevArrow=document.getElementById('island-editor-nav-prev');
  const nextArrow=document.getElementById('island-editor-nav-next');
  const pos=config.tab_position||'top';
  frame.className='island-editor-frame nav-'+pos;
  const multi=config.pages.length>1&&config.tab_style!=='none';
  const showArrows=config.tab_style==='dots'&&multi;

  if(prevArrow){
   prevArrow.hidden=!showArrows;
   prevArrow.onclick=e=>{e.stopPropagation();switchPage(-1)};
  }
  if(nextArrow){
   nextArrow.hidden=!showArrows;
   nextArrow.onclick=e=>{e.stopPropagation();switchPage(1)};
  }
  frame.classList.toggle('has-arrows',showArrows);

  if(!nav)return;
  nav.replaceChildren();
  nav.hidden=!multi;
  nav.classList.toggle('dots',config.tab_style==='dots');
  if(nav.hidden)return;

  for(const item of config.pages){
   const label=document.createElement('span');
   label.classList.toggle('active',item.id===page().id);
   if(config.tab_style!=='dots'){
    pageButtonContent(label,item);
   }
   label.onclick=e=>{e.stopPropagation();activePageId=item.id;closeDrawer();render();openPageDrawer(item);refresh()};
   nav.append(label);
  }
 }

 function save(){
  const copy=structuredClone(config),request=++serial;
  status.textContent='Saving…';
  pending=pending.catch(()=>{}).then(()=>invoke('set_island',{config:copy})).then(()=>{if(request===serial)status.textContent=''}).catch(e=>{if(request===serial)status.textContent='Could not update Dynamic Island: '+e});
 }

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

 function appearance(){
  const color=parseInt(config.color.slice(1),16),shoulder=setShape(frame);
  const targetW = Math.min(620, Math.max(380, config.width || 520));
  const targetH = Math.max(180, Math.min(450, config.expanded_height || 220));
  frame.style.width = targetW + 'px';
  frame.style.height = targetH + 'px';
  frame.style.background=`rgba(${color>>16},${color>>8&255},${color&255},${config.opacity/100})`;
  frame.style.color=config.text_color;
  frame.style.borderRadius=config.shape==='pill'?'100px':config.shape==='square'?'5px':config.shape==='notch'?`0 0 ${config.radius}px ${config.radius}px`:config.radius+'px';
  frame.style.boxShadow=`inset 0 0 0 ${config.border_width}px ${config.border_color}`;
 }

 function message(text){layoutStatus.textContent=text}

 function preview(kind,example=false,item={}){
  return window.IslandModulePreview.create(kind,{
   item,track,battery,stats,weather,volume,
   lyrics:kind==='media'&&!example?lyrics.update(track,Boolean(item.show_lyrics)):null,
   note:config.note_text,
   countdown:window.IslandExtras.countdown(config.countdown_date,config.countdown_title)
  },example);
 }

 function livePreview(){
  const outer=document.getElementById('island-live-frame');
  const content=document.getElementById('island-live-content');
  if(!outer||!content)return;
  outer.replaceChildren(content);content.replaceChildren();content.className='island-live-content';
  const color=parseInt(config.color.slice(1),16),shoulder=setShape(outer);
  outer.style.width=((compactPreview?config.compact_width:config.width)+2*shoulder)+'px';
  outer.style.height=compactPreview?config.compact_height+'px':config.expanded_height+'px';
  outer.style.background=`rgba(${color>>16},${color>>8&255},${color&255},${config.opacity/100})`;
  outer.style.color=config.text_color;
  outer.style.borderRadius=config.shape==='pill'?'100px':config.shape==='square'?'5px':config.shape==='notch'?`0 0 ${config.radius}px ${config.radius}px`:config.radius+'px';
  outer.style.boxShadow=`inset 0 0 0 ${config.border_width}px ${config.border_color}`;
  outer.style.setProperty('--art-size',config.artwork_size+'px');
  outer.style.setProperty('--compact-align',({left:'flex-start',center:'center',right:'flex-end'})[config.compact_align]||'flex-start');

  if(compactPreview){
   outer.className='island-live-frame';setShape(outer);
   const comp=document.createElement('div');comp.className='island-live-compact';
   const now=new Date();
   const mode=config.compact_content||'music',music=mode==='music'||mode==='music-clock',clock=mode==='clock'||mode==='music-clock';
   const textRow=document.createElement('div');textRow.className='island-live-compact-content';
   if(music&&track?.artwork){const art=document.createElement('img');art.src=track.artwork;art.alt='';art.className='island-compact-art';textRow.append(art)}
   if(music||mode==='date'){const label=document.createElement('span');label.textContent=music?(track?.title||'Nothing playing'):now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});textRow.append(label)}
   if(clock){const time=document.createElement('span');time.textContent=now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});textRow.append(time)}
   comp.append(textRow);
   if(config.compact_indicator){
    const dot=document.createElement('span');dot.className='island-live-dot';dot.textContent='●';
    if(config.indicator_position==='left')dot.style.left='12px';else dot.style.right='12px';
    comp.append(dot);
   }
   content.append(comp);
   return;
  }

  const multi=config.pages.length>1&&config.tab_style!=='none';
  const showArrows=config.tab_style==='dots'&&multi;
  const pos=config.tab_position||'top';
  outer.className='island-live-frame';setShape(outer);content.className='island-live-content nav-'+pos;
  outer.classList.toggle('has-arrows',showArrows);

  if(showArrows){
   const leftArrow=document.createElement('button');leftArrow.type='button';leftArrow.className='island-nav-arrow island-nav-prev';leftArrow.textContent='‹';leftArrow.title='Previous page';leftArrow.onclick=e=>{e.stopPropagation();switchPage(-1)};
   const rightArrow=document.createElement('button');rightArrow.type='button';rightArrow.className='island-nav-arrow island-nav-next';rightArrow.textContent='›';rightArrow.title='Next page';rightArrow.onclick=e=>{e.stopPropagation();switchPage(1)};
   content.append(leftArrow,rightArrow);
  }

  const nav=document.createElement('div');nav.className='island-live-pages pos-'+pos+' '+(config.tab_style==='dots'?'dots':'buttons');
  if(multi){
   for(const p of config.pages){
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',p.name);b.setAttribute('aria-current',String(p.id===page().id));
    if(config.tab_style!=='dots'){
     pageButtonContent(b,p);
    }
    b.onclick=e=>{e.stopPropagation();activePageId=p.id;closeDrawer();render();refresh()};
    nav.append(b);
   }
   content.append(nav);
  }

  const inner=document.createElement('div');
  inner.className='island-live-inner';
  for(const item of page().layout){
   const node=document.createElement('div');
   node.className='island-live-module island-surface';
   node.dataset.style=item.style||'glass';
   geometry(node,item);
   node.append(preview(item.kind,false,item));
   inner.append(node);
  }
  content.append(inner);
 }

 function geometry(element,item){
  element.style.left=item.x+'%';element.style.top=item.y+'%';element.style.width=item.w+'%';element.style.height=item.h+'%';
  if(item.tint)element.style.setProperty('--card-tint',item.tint);
  else element.style.removeProperty('--card-tint');
 }

 function updateItem(next){
  const items=page().layout;
  const currentIdx=items.findIndex(i=>i.kind===next.kind);
  if(currentIdx===-1)return;
  const valid=L.valid(items,next);
  if(valid){
   items[currentIdx]=next;message('');
  }else{
   message('Cannot overlap another module. Repositioned back.');
  }
  render();save();refresh();
 }

 function openDrawer(item){
  if(!item){closeDrawer();return}
  selected=item.kind;document.getElementById('island-drawer-badge').textContent='MODULE SETTINGS';
  for(const n of grid.children)n.classList.toggle('selected',n.dataset.kind===selected);
  islandLayout?.classList.add('has-selection');
  drawer?.setAttribute('aria-hidden','false');
  if(drawer)drawer.inert=false;
  if(drawerContent)drawerContent.hidden=false;
  renderDrawerContent(item);
 }

 function closeDrawer(){
  selected=null;
  for(const n of grid.children)n.classList.remove('selected');
  islandLayout?.classList.remove('has-selection');
  drawer?.setAttribute('aria-hidden','true');
  if(drawer)drawer.inert=true;
  if(drawerContent)drawerContent.hidden=true;
 }

 if(drawerClose){
  drawerClose.onclick=()=>closeDrawer();
 }

 function renderDrawerContent(item){
  if(!drawerFields||!item)return;
  drawerFields.replaceChildren();
  if(drawerTitle)drawerTitle.textContent=catalog[item.kind]?.name||item.kind;
  if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));

  const contentSec=document.createElement('div');
  contentSec.className='island-drawer-section';
  contentSec.innerHTML='<div class="island-drawer-section-title">Labels & Titles</div>';

  const labelRow=document.createElement('label');
  labelRow.className='island-drawer-row';
  labelRow.innerHTML='<span>Title / Label</span>';
  const labelInput=document.createElement('input');
  labelInput.type='text';labelInput.maxLength=32;labelInput.placeholder='Default title';
  labelInput.value=item.label||'';
  labelInput.oninput=()=>{
   item.label=labelInput.value.trim()||undefined;
   if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));
   renderCanvasItem(item);livePreview();save();
  };
  labelRow.append(labelInput);

  const detailRow=document.createElement('label');
  detailRow.className='island-drawer-row';
  detailRow.innerHTML='<span>Subtitle / Details</span>';
  const detailInput=document.createElement('input');
  detailInput.type='text';detailInput.maxLength=40;detailInput.placeholder='Default details';
  detailInput.value=item.detail||'';
  detailInput.oninput=()=>{
   item.detail=detailInput.value.trim()||undefined;
   if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));
   renderCanvasItem(item);livePreview();save();
  };
  detailRow.append(detailInput);
  contentSec.append(labelRow,detailRow);
  drawerFields.append(contentSec);

  const styleSec=document.createElement('div');
  styleSec.className='island-drawer-section';
  styleSec.innerHTML='<div class="island-drawer-section-title">Card surface</div>';
  const styleRow=document.createElement('div');
  styleRow.className='island-appearance-options';
  for(const mode of ['glass','soft','clear']){
   const btn=document.createElement('button');
   btn.type='button';btn.setAttribute('aria-pressed',String((item.style||'glass')===mode));
   btn.textContent=mode[0].toUpperCase()+mode.slice(1);
   btn.onclick=()=>{
    item.style=mode;
    for(const b of styleRow.children)b.setAttribute('aria-pressed',String(b===btn));
    if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));
    renderCanvasItem(item);livePreview();save();
   };
   styleRow.append(btn);
  }
  styleSec.append(styleRow);

  const tintTitle=document.createElement('div');
  tintTitle.className='island-drawer-section-title';tintTitle.style.marginTop='6px';tintTitle.textContent='Accent tint';
  const tintRow=document.createElement('div');
  tintRow.className='island-tint-chips';
  for(const tint of TINTS){
   const chip=document.createElement('button');
   chip.type='button';chip.className='island-tint-chip'+((item.tint||'')===tint.value?' active':'');
   chip.title=tint.name;chip.style.background=tint.value||'rgba(255,255,255,0.08)';
   chip.onclick=()=>{
    item.tint=tint.value||undefined;
    for(const c of tintRow.children)c.classList.toggle('active',c===chip);
    if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));
    renderCanvasItem(item);livePreview();save();
   };
   tintRow.append(chip);
  }
  const colorRow=document.createElement('label');colorRow.className='island-drawer-row';colorRow.append(document.createTextNode('Custom color'));const color=document.createElement('input');color.type='color';color.setAttribute('aria-label','Custom accent color');color.value=/^#[0-9a-f]{6}/i.test(item.tint||'')?item.tint.slice(0,7):'#8b5cf6';color.oninput=()=>{item.tint=color.value+'38';for(const c of tintRow.children)c.classList.remove('active');renderCanvasItem(item);if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));livePreview();save()};colorRow.append(color);styleSec.append(tintTitle,tintRow,colorRow);
  drawerFields.append(styleSec);

  const togglesSec=document.createElement('div');
  togglesSec.className='island-drawer-section';
  togglesSec.innerHTML='<div class="island-drawer-section-title">Module options</div>';
  const togglesBox=document.createElement('div');
  togglesBox.className='island-toggles';

  function addToggle(label,key,defVal=true){
   const row=document.createElement('label');
   row.className='island-toggle-label';
   const chk=document.createElement('input');chk.type='checkbox';chk.className='switch';
   chk.checked=item[key]!==undefined?Boolean(item[key]):defVal;
   chk.onchange=()=>{
    item[key]=chk.checked;
    if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));
    renderCanvasItem(item);livePreview();save();
   };
   row.append(chk,document.createTextNode(label));
   togglesBox.append(row);
  }

  if(item.kind==='media'){
   addToggle('Show album artwork','show_artwork',true);
   addToggle('Show artist','show_artist',true);
   addToggle('Show progress bar','show_progress',true);
   addToggle('Show playback times','show_times',true);
   addToggle('Show playback controls','show_controls',true);
   addToggle('Show volume slider','show_volume',false);
   addToggle('Show lyrics','show_lyrics',false);
  }else if(item.kind==='calendar'){
   addToggle('Show month grid','show_calendar_grid',true);
  }else if(['battery','system','disk','memory','gpu'].includes(item.kind)){
   addToggle('Show secondary details','show_secondary',true);
   addToggle('Show progress gauge','show_progress',true);
  }else{
   addToggle('Show secondary details','show_secondary',true);
  }
  if(togglesBox.children.length>0){
   togglesSec.append(togglesBox);
   if(item.kind==='media'){
    const row=document.createElement('label');row.className='island-drawer-row';row.append(document.createTextNode('Artwork size'));const select=document.createElement('select');select.setAttribute('aria-label','Artwork size');for(const [value,label] of [['small','Small'],['medium','Medium'],['large','Large']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}select.value=item.artwork_layout||'small';select.onchange=()=>{item.artwork_layout=select.value;renderCanvasItem(item);if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));livePreview();save()};row.append(select);togglesSec.append(row);
    const hint=document.createElement('p');hint.className='island-lyrics-hint';hint.textContent='Lyrics by LRCLIB. When enabled, the track and artist are sent to LRCLIB.';togglesSec.append(hint);
   }
   drawerFields.append(togglesSec);
  }

  if(item.kind==='weather'){
   const wSec=document.createElement('div');
   wSec.className='island-drawer-section';
   wSec.innerHTML='<div class="island-drawer-section-title">Weather location</div>';
   const cityRow=document.createElement('label');
   cityRow.className='island-drawer-row';
   cityRow.innerHTML='<span>City name</span>';
   const cityInput=document.createElement('input');
   cityInput.type='text';cityInput.placeholder='e.g. London, Tokyo';
   cityInput.value=config.weather_city||'';
   cityInput.onchange=()=>{config.weather_city=cityInput.value.trim();save();refresh()};
   cityRow.append(cityInput);

   const fahrRow=document.createElement('label');
   fahrRow.className='island-toggle-label';
   const fahrChk=document.createElement('input');fahrChk.type='checkbox';fahrChk.className='switch';
   fahrChk.checked=Boolean(config.weather_fahrenheit);
   fahrChk.onchange=()=>{config.weather_fahrenheit=fahrChk.checked;save();refresh()};
   fahrRow.append(fahrChk,document.createTextNode('Use Fahrenheit (°F)'));

   wSec.append(cityRow,fahrRow);
   drawerFields.append(wSec);
  }else if(item.kind==='countdown'){
   const cdSec=document.createElement('div');
   cdSec.className='island-drawer-section';
   cdSec.innerHTML='<div class="island-drawer-section-title">Countdown target</div>';
   const titleRow=document.createElement('label');
   titleRow.className='island-drawer-row';
   titleRow.innerHTML='<span>Event title</span>';
   const cdTitle=document.createElement('input');
   cdTitle.type='text';cdTitle.value=config.countdown_title||'';
   cdTitle.onchange=()=>{config.countdown_title=cdTitle.value.trim();save();renderCanvasItem(item);if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));livePreview()};
   titleRow.append(cdTitle);

   const dateRow=document.createElement('label');
   dateRow.className='island-drawer-row';
   dateRow.innerHTML='<span>Target date</span>';
   const cdDate=document.createElement('input');
   cdDate.type='date';cdDate.value=config.countdown_date||'';
   cdDate.onchange=()=>{config.countdown_date=cdDate.value;save();renderCanvasItem(item);if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));livePreview()};
   dateRow.append(cdDate);

   cdSec.append(titleRow,dateRow);
   drawerFields.append(cdSec);
  }else if(item.kind==='note'){
   const noteSec=document.createElement('div');
   noteSec.className='island-drawer-section';
   noteSec.innerHTML='<div class="island-drawer-section-title">Note text</div>';
   const noteArea=document.createElement('textarea');
   noteArea.rows=3;noteArea.value=config.note_text||'';
   noteArea.onchange=()=>{config.note_text=noteArea.value;save();renderCanvasItem(item);if(drawerPreview)drawerPreview.replaceChildren(preview(item.kind,false,item));livePreview()};
   noteSec.append(noteArea);
   drawerFields.append(noteSec);
  }

  const removeBtn=document.createElement('button');
  removeBtn.type='button';removeBtn.className='island-drawer-remove-btn';
  removeBtn.textContent='Remove from island';
  removeBtn.onclick=()=>{
   page().layout=page().layout.filter(i=>i.kind!==item.kind);
   closeDrawer();message('');render();save();refresh();
  };
  drawerFields.append(removeBtn);
 }

 function renderCanvasItem(item){
  const node=grid.querySelector(`[data-kind="${item.kind}"]`);
  if(!node)return;
  node.dataset.style=item.style||'glass';
  geometry(node,item);
  const oldContent=node.querySelector('.island-editor-content');
  const newContent=preview(item.kind,false,item);
  newContent.classList.add('island-editor-content');
  if(oldContent)node.replaceChild(newContent,oldContent);
  else node.prepend(newContent);
  moduleFit.observe(node,newContent,item.kind);
 }

 function begin(e,item,resizing){
  e.preventDefault();
  openDrawer(item);
  const rect=grid.getBoundingClientRect();
  drag={item:{...item},candidate:{...item},x:e.clientX,y:e.clientY,rect,resizing,node:e.currentTarget.closest('.island-editor-item')};
  document.addEventListener('pointermove',move);
  document.addEventListener('pointerup',finish,{once:true});
  document.addEventListener('pointercancel',cancel,{once:true});
 }

 function move(e){
  if(!drag)return;
  const dx=Math.round((e.clientX-drag.x)/drag.rect.width*100),dy=Math.round((e.clientY-drag.y)/drag.rect.height*100);
  drag.candidate=L.clamp(drag.resizing?{...drag.item,w:drag.item.w+dx,h:drag.item.h+dy}:{...drag.item,x:drag.item.x+dx,y:drag.item.y+dy});
  geometry(drag.node,drag.candidate);
  drag.node.classList.toggle('invalid',!L.valid(page().layout,drag.candidate));
 }

 function cleanup(){
  document.removeEventListener('pointermove',move);
  document.removeEventListener('pointerup',finish);
  document.removeEventListener('pointercancel',cancel);
 }

 function finish(){
  if(!drag)return;
  const candidate=drag.candidate;
  drag=null;cleanup();updateItem(candidate);
 }

 function cancel(){drag=null;cleanup();render()}

 function add(kind,point){
  if(page().layout.some(i=>i.kind===kind))return;
  const d=catalog[kind];if(!d)return;
  const w=Math.round(d.w/12*100),h=Math.round(d.h/12*100);
  let item=point?L.clamp({kind,x:point.x,y:point.y,w,h}):L.findSpace(page().layout,kind,w,h);
  if(!item||!L.valid(page().layout,item)){message('');return}
  page().layout.push(item);message('');render();save();refresh();
  openDrawer(item);
 }

 function render(){
  if(!config)return;
  renderPages();renderCanvasNavigation();appearance();livePreview();moduleFit.disconnect();
  grid.replaceChildren();
  for(const item of page().layout){
   const node=document.createElement('div');
   node.className='island-editor-item island-surface'+(selected===item.kind?' selected':'');
   node.dataset.kind=item.kind;node.dataset.style=item.style||'glass';
   node.tabIndex=0;node.setAttribute('role','button');
   node.setAttribute('aria-label',(catalog[item.kind]?.name||item.kind)+' module');
   geometry(node,item);
   const content=preview(item.kind,false,item);
   content.classList.add('island-editor-content');
   node.append(content);

   const remove=document.createElement('button');
   remove.type='button';remove.className='island-editor-remove';
   remove.setAttribute('aria-label','Remove '+(catalog[item.kind]?.name||item.kind));
   remove.title='Remove '+(catalog[item.kind]?.name||item.kind);
   remove.textContent='−';
   remove.onpointerdown=e=>e.stopPropagation();
   remove.onclick=e=>{
    e.stopPropagation();
    page().layout=page().layout.filter(i=>i.kind!==item.kind);
    if(selected===item.kind)closeDrawer();
    message('');render();save();refresh();
   };
   node.append(remove);

   const handle=document.createElement('div');
   handle.className='island-editor-resize';handle.title='Drag to resize';
   handle.onpointerdown=e=>begin(e,item,true);
   node.append(handle);

   node.onpointerdown=e=>{if(e.target===remove||e.target===handle)return;begin(e,item,false)};
   node.onclick=()=>openDrawer(item);
   grid.append(node);
   moduleFit.observe(node,content,item.kind);
  }

  palette.replaceChildren();
  for(const [kind,data] of Object.entries(catalog)){
   const added=page().layout.some(i=>i.kind===kind),button=document.createElement('button');
   const available=added||Boolean(L.findSpace(page().layout,kind,Math.round(data.w/12*100),Math.round(data.h/12*100)));
   button.type='button';button.className='island-palette-card'+(added?' is-added':'');
   button.disabled=!available;
   button.setAttribute('aria-label',(added?'Remove ':'Add ')+data.name+' module');
   button.draggable=false;
   const visual=document.createElement('div');visual.className='island-palette-visual';visual.append(preview(kind,true));
   const label=document.createElement('span');label.className='island-palette-title';label.textContent=data.name;const action=document.createElement('span');action.className='island-palette-add';action.textContent=added?'Remove':'Add';button.append(label,visual,action);
   button.onclick=()=>{if(added){page().layout=page().layout.filter(i=>i.kind!==kind);if(selected===kind)closeDrawer();message('');render();save();refresh()}else add(kind)};
   palette.append(button);
  }

  if(selected){
   const currentItem=page().layout.find(i=>i.kind===selected);
   if(currentItem)renderDrawerContent(currentItem);
   else closeDrawer();
  }
 }

 grid.onclick=e=>{if(e.target===grid)closeDrawer()};
 document.addEventListener('click',e=>{if(!islandLayout?.classList.contains('has-selection')||!e.target.isConnected)return;if(drawer.contains(e.target)||e.target.closest('.island-page-tabs,.island-page-action,.island-editor-item,.island-editor-navigation,.island-palette-card'))return;closeDrawer()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});

 async function refresh(){
  if(!config||!document.getElementById('island')?.classList.contains('active')||drag)return;
  const request=++refreshSerial,types=new Set(page().layout.map(x=>x.kind));
  const city=config.weather_city,unit=config.weather_fahrenheit;
  const [m,b,s,w,v]=await Promise.allSettled([
   (types.has('media')||['music','music-clock'].includes(config.compact_content))?invoke('widget_media'):Promise.resolve(null),
   types.has('battery')?invoke('widget_battery'):Promise.resolve(null),
   ['system','disk','network','memory','gpu','uptime','cpu_frequency'].some(t=>types.has(t))?invoke('widget_stats'):Promise.resolve(null),
   types.has('weather')?window.IslandExtras.get(city,unit):Promise.resolve(null),
   (types.has('audio')||page().layout.some(item=>item.kind==='media'&&item.show_volume))?invoke('widget_audio_device',{kind:'volume',action:'get',step:0}):Promise.resolve(null)
  ]);
  if(request!==refreshSerial||city!==config.weather_city||unit!==config.weather_fahrenheit)return;
  track=m.status==='fulfilled'?m.value:null;
  battery=b.status==='fulfilled'?b.value:null;
  stats=s.status==='fulfilled'?s.value:null;
  weather=w.status==='fulfilled'?w.value:null;
  volume=v.status==='fulfilled'?v.value:null;
  weatherError=w.status==='rejected'?String(w.reason?.message||w.reason):null;

  const isEditingField=document.activeElement?.tagName==='INPUT'||document.activeElement?.tagName==='TEXTAREA';
  if(!drag&&!isEditingField)render();
 }

 async function init(){
  try{
   const [c,monitors]=await Promise.all([invoke('get_island'),invoke('island_monitors')]);
   config=c;activePageId=config.pages[0].id;
   const select=document.querySelector('[data-island="monitor"]');
   monitors.forEach((name,i)=>{const option=document.createElement('option');option.value=i;option.textContent=name;select.append(option)});
   for(const el of fields){const v=config[el.dataset.island];if(el.type==='checkbox')el.checked=v;else el.value=v}
   render();refresh();
  }catch(e){status.textContent='Could not load settings: '+e}
 }

 for(const el of fields)el.addEventListener('change',()=>{
  if(!config)return;
  const key=el.dataset.island;
  let value=el.type==='checkbox'?el.checked:el.type==='number'||key==='monitor'?Number(el.value):el.value;
  if(el.type==='number'){if(!Number.isFinite(value))value=Number(el.min)||0;value=Math.max(Number(el.min),Math.min(Number(el.max),value));el.value=value}
  config[key]=value;if(key==='tab_style'&&value==='none'){activePageId=config.pages[0].id;closeDrawer()}render();save();
  if(key==='weather_city'||key==='weather_fahrenheit')refresh();
 });

 document.getElementById('island-preview-toggle').onclick=()=>{
  if(!config)return;
  compactPreview=!compactPreview;
  document.getElementById('island-preview-toggle').textContent=compactPreview?'Show expanded':'Show compact';
  livePreview();
 };

 document.querySelector('[data-tab="island"]').addEventListener('click',()=>setTimeout(refresh,0));
 window.__TAURI__?.event?.listen?.('island-note',event=>{if(config&&typeof event.payload==='string'){config.note_text=event.payload;if(!drag&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))render()}});
 setInterval(()=>{if(document.getElementById('island')?.classList.contains('active'))refresh()},5000);
 init();
})();

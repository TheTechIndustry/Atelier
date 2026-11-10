'use strict';
const isPreview=Boolean(window.location&&new URLSearchParams(window.location.search).has('preview'));
const invoke=isPreview?undefined:window.__TAURI__?.core?.invoke;
const $=id=>document.getElementById(id);
let cfg,items=[],refreshing=false,collapsed=false,fullscreenHidden=false,fullscreenRevision=0,hideTimer,dragId,menuItem=null,errorTimer,lastSignature='',sizeTimer,animCfg=null;
if(invoke)invoke('get_animations_config').then(a=>{animCfg=a}).catch(()=>{});
if(!isPreview)window.__TAURI__?.event?.listen('animations-config-changed',event=>{animCfg=event.payload});
let visibleSize={width:320,height:110};
const dockAudio=isPreview?null:window.createDockAudio?.({element:$('dock'),invoke});
document.addEventListener('contextmenu',event=>event.preventDefault());
function error(e){$('error').textContent=String(e);$('error').hidden=false;clearTimeout(errorTimer);errorTimer=setTimeout(()=>$('error').hidden=true,5000)}
function config(c){
  cfg=c;document.documentElement.dataset.material=c.material||'solid';const rgb=[1,3,5].map(i=>parseInt(c.tint.slice(i,i+2),16));document.documentElement.classList.toggle('light-dock',(c.material||'solid')==='solid'&&rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>180);dockAudio?.configure(c.audio,Boolean(c.enabled&&!collapsed&&!fullscreenHidden),c.position);document.body.className=[c.position,c.icon_style,c.indicator,c.full_width?'full-width':'',collapsed?'collapsed':''].filter(Boolean).join(' ');
  const style=document.documentElement.style;
  const zoomExtra=c.magnification>100?Math.ceil(c.icon_size*(c.magnification/100-1)):0;
  const roomSize=Math.max(34,zoomExtra+26);
  for(const [name,value]of Object.entries({'--icon':c.icon_size+'px','--gap':c.spacing+'px','--padding':c.padding+'px','--radius':c.radius+'px','--alpha':c.opacity/100,'--inactive':c.inactive_opacity/100,'--indicator':c.indicator_color,'--zoom':c.magnification/100,'--room':roomSize+'px','--active-fill':c.active_background?'rgba(255,255,255,.12)':'transparent'}))style.setProperty(name,value);
  style.setProperty('--tint',[1,3,5].map(i=>parseInt(c.tint.slice(i,i+2),16)).join(','));
  style.setProperty('--dock-width',(c.dock_width&&Number(c.dock_width)>0)?c.dock_width+'px':'auto');
  $('clock').hidden=!c.show_clock;for(const id of ['tray','language','network','volume'])$(id).hidden=!c['show_'+id];$('utilities').hidden=!c.show_clock&&!c.show_tray&&!c.show_language&&!c.show_network&&!c.show_volume;$('start').hidden=c.show_start===false;$('search').hidden=c.show_search===false;$('studio').hidden=c.show_studio===false;$('divider').hidden=$('utilities').hidden&&c.show_studio===false;
  if(!c.show_labels)$('label').hidden=true;
  if(!c.auto_hide&&collapsed){collapsed=false;document.body.classList.remove('collapsed');dockAudio?.configure(c.audio,Boolean(c.enabled&&!fullscreenHidden),c.position)}
  renderDockWidgets();
  for(const frame of document.querySelectorAll('.dock-widget-frame'))syncWidgetFrame(frame);
  scheduleMeasure();
}
async function refresh(){
  if(!invoke||refreshing||dragId||menuItem)return;refreshing=true;const revision=fullscreenRevision;
  try{const snapshot=await invoke('get_dock_snapshot');if(dragId)return;if(revision===fullscreenRevision)fullscreenHidden=Boolean(snapshot.fullscreen_hidden);config(snapshot.config);items=snapshot.items;await loadFolderApps();renderDockWidgets();render();}
  catch(e){error(e)}finally{refreshing=false}
}
function render(){
  const visible=items.filter(i=>!i.hidden&&!folderAppIds.has(i.id));const signature=JSON.stringify(visible.map(i=>[i.id,i.name,i.pinned,i.active,i.running,i.icon]));
  if(signature===lastSignature){applyItemOrder();return;}lastSignature=signature;
  const current=new Map([...$('apps').children].filter(e=>e.classList.contains('app')).map(e=>[e.dataset.id,e]));
  for(const [index,item] of visible.entries()){
    let button=current.get(item.id);if(!button){button=document.createElement('button');button.className='app';button.dataset.id=item.id;
      const image=document.createElement('img');image.alt='';image.draggable=false;
      image.addEventListener('error',()=>{image.hidden=true;button.querySelector('.fallback').hidden=false});
      const fallback=document.createElement('span');fallback.className='fallback';
      const icon=document.createElement('span');icon.className='icon';icon.append(image,fallback);
      const indicator=document.createElement('span');indicator.className='indicator';button.append(icon,indicator);
      button.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();return}button.blur();$('label').hidden=true;activate(button.dataset.id,false)});
      button.addEventListener('pointerenter',()=>showLabel(button));button.addEventListener('pointerleave',()=>$('label').hidden=true);
      button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))showLabel(button)});button.addEventListener('blur',()=>$('label').hidden=true);
      button.addEventListener('contextmenu',e=>{e.preventDefault();if(!isPreview)openMenu(button.dataset.id)});
      button.addEventListener('pointerdown',startReorder);
    }
    button.draggable=false;button.dataset.pinned=String(item.pinned);button.setAttribute('aria-label',item.name+(item.active?', active':item.running?', running':''));
    button.classList.toggle('active',item.active);button.classList.toggle('running',item.running);
    const image=button.querySelector('img');if(image.getAttribute('src')!==item.icon)image.src=item.icon;
    image.hidden=!item.icon;
    const fallback=button.querySelector('.fallback');fallback.hidden=!!item.icon;fallback.textContent=item.name[0]||'·';
    if(!button.parentNode)$('apps').append(button);current.delete(item.id);
  }
  for(const button of current.values())button.remove();applyItemOrder();scheduleMeasure();
}

let reorder=null,suppressClickUntil=0;
let folderAppIds=new Set(),folderName='Apps';
async function loadFolderApps(){if(!invoke)return;try{const configs=await invoke('get_widgets');const folder=configs.find(c=>c.kind==='app_folder');folderAppIds=new Set(folder?.custom?.folder_apps||[]);folderName=folder?.custom?.folder_name||'Apps'}catch{}}
const itemMotion=new WeakMap();
const systemOrderIds=['start','search','divider','tray','language','network','volume','clock','studio'];
function orderElements(){
  const apps=[...$('apps').children].filter(el=>el.classList.contains('app')||el.classList.contains('dock-capsule'));
  apps.sort((a,b)=>Number(a.classList.contains('dock-capsule'))-Number(b.classList.contains('dock-capsule')));
  for(const el of apps)el.dataset.orderKey=el.classList.contains('app')?'app:'+el.dataset.id:'widget:'+el.dataset.widgetId;
  const system=systemOrderIds.map(id=>$(id));
  for(const el of system)el.dataset.orderKey='system:'+el.id;
  return [...system.slice(0,2),...apps,...system.slice(2)];
}
function orderedItems(){return orderElements().sort((a,b)=>Number(a.style.order)-Number(b.style.order));}
function isOrderVisible(el){return !el.hidden&&!el.parentElement?.hidden;}
function applyItemOrder(){
  if(reorder)return;
  const elements=orderElements(),byKey=new Map(elements.map(el=>[el.dataset.orderKey,el]));
  const saved=cfg?.item_order||[],hasSystem=saved.some(key=>key.startsWith('system:'));
  const ordered=[];
  if(!hasSystem)for(const el of elements.slice(0,2)){ordered.push(el);byKey.delete(el.dataset.orderKey)}
  for(const key of saved){const el=byKey.get(key);if(el){ordered.push(el);byKey.delete(key)}}
  for(const el of elements)if(byKey.has(el.dataset.orderKey)){ordered.push(el);byKey.delete(el.dataset.orderKey)}
  ordered.forEach((el,index)=>el.style.order=String(index));
}
function startReorder(event,element){
  const button=element||event.currentTarget;
  if(!invoke||event.button!==0||dragId)return;
  const rect=button.getBoundingClientRect();
  button.blur?.();reorder={button,pointerId:event.pointerId,x:event.clientX,y:event.clientY,grabX:event.clientX-rect.left,grabY:event.clientY-rect.top,moved:false,dx:0,dy:0,original:orderedItems().map(el=>el.dataset.orderKey)};
  dragId=button.dataset.orderKey;
  if(!element)button.setPointerCapture(event.pointerId);
  clearTimeout(hideTimer);
}
function folderAtPoint(x,y,dragged){
  const previous=dragged.style.pointerEvents;dragged.style.pointerEvents='none';
  const target=document.elementFromPoint(x,y)?.closest('.dock-capsule[data-widget-id="app_folder"]');
  dragged.style.pointerEvents=previous;return target;
}
function moveReorder(event){
  const state=reorder;if(!state||event.pointerId!==state.pointerId)return;
  if(!state.moved&&Math.hypot(event.clientX-state.x,event.clientY-state.y)<6)return;
  state.moved=true;event.preventDefault?.();$('label').hidden=true;
  document.body.classList.add('reordering');state.button.classList.add('dragging');
  const vertical=['left','right'].includes(cfg.position),pos=vertical?event.clientY:event.clientX;
  const container=$('dock'),bounds=container.getBoundingClientRect(),start=vertical?bounds.top:bounds.left,end=vertical?bounds.bottom:bounds.right;
  const beforeScroll=vertical?container.scrollTop:container.scrollLeft;
  if(vertical)container.scrollTop+=pos<start+28?-14:pos>end-28?14:0;else container.scrollLeft+=pos<start+28?-14:pos>end-28?14:0;
  const afterScroll=vertical?container.scrollTop:container.scrollLeft;
  state.scrollPoint={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY};
  if(afterScroll!==beforeScroll&&!state.scrollFrame&&window.requestAnimationFrame){
    state.scrollFrame=window.requestAnimationFrame(()=>{state.scrollFrame=0;if(reorder===state)moveReorder(state.scrollPoint)});
  }
  if(state.button.classList.contains('app')&&typeof document.elementFromPoint==='function'){
    const target=folderAtPoint(event.clientX,event.clientY,state.button);
    document.querySelectorAll?.('.dock-capsule.folder-drop-hover')?.forEach?.(el=>{if(el!==target)el.classList.remove('folder-drop-hover')});
    if(target){
      target.classList.add('folder-drop-hover');
      const rect=state.button.getBoundingClientRect();
      state.dx=event.clientX-state.grabX-(rect.left-state.dx);state.dy=event.clientY-state.grabY-(rect.top-state.dy);
      state.button.style.translate=state.dx+'px '+state.dy+'px';
      return;
    }
  }
  document.querySelectorAll?.('.dock-capsule.folder-drop-hover')?.forEach?.(el=>el.classList.remove('folder-drop-hover'));

  const all=orderedItems(),visible=all.filter(isOrderVisible),siblings=visible.filter(el=>el!==state.button);
  let index=siblings.findIndex(el=>{const r=el.getBoundingClientRect();return pos<(vertical?r.top+r.height/2:r.left+r.width/2)});
  if(index<0)index=siblings.length;siblings.splice(index,0,state.button);
  const changed=visible.some((el,i)=>el!==siblings[i]);
  if(changed){
    const before=new Map(siblings.filter(el=>el!==state.button).map(el=>[el,el.getBoundingClientRect()]));
    for(const el of siblings)if(el!==state.button)itemMotion.get(el)?.cancel();
    let i=0;for(const el of all)if(isOrderVisible(el))siblings[i++].style.order=String(all.indexOf(el));
    if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)for(const el of siblings){
      if(el===state.button||!el.animate)continue;const old=before.get(el),now=el.getBoundingClientRect(),dx=old.left-now.left,dy=old.top-now.top;
      if(dx||dy)itemMotion.set(el,el.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'}));
    }
  }
  const rect=state.button.getBoundingClientRect();
  state.dx=event.clientX-state.grabX-(rect.left-state.dx);state.dy=event.clientY-state.grabY-(rect.top-state.dy);
  state.button.style.translate=state.dx+'px '+state.dy+'px';
}
async function addAppToFolder(appId){
  try{
    const configs=await invoke('get_widgets');
    let folderConfig=configs.find(c=>c.kind==='app_folder');
    if(!folderConfig)folderConfig={kind:'app_folder',custom:{folder_apps:[]}};
    if(!folderConfig.custom)folderConfig.custom={};
    const list=Array.isArray(folderConfig.custom.folder_apps)?[...folderConfig.custom.folder_apps]:[];
    if(!list.includes(appId)){
      list.unshift(appId);
      folderConfig.custom.folder_apps=list;
      await invoke('set_widget',{config:folderConfig});
      folderAppIds=new Set(list);renderDockWidgets();
      document.querySelectorAll?.('.dock-widget-frame')?.forEach?.(frame=>{
        try{
          frame.contentWindow?.postMessage?.({widgetConfig:folderConfig},'*');
          frame.contentWindow?.refresh?.();
        }catch{}
      });
    }
  }catch(err){console.error('Failed to add app to folder',err)}
}
async function finishReorder(event,cancel=false){
  const state=reorder;if(!state||event.pointerId!==state.pointerId)return;
  document.querySelectorAll?.('.dock-capsule.folder-drop-hover')?.forEach?.(el=>el.classList.remove('folder-drop-hover'));
  reorder=null;if(state.scrollFrame)window.cancelAnimationFrame?.(state.scrollFrame);document.body.classList.remove('reordering');state.button.classList.remove('dragging');
  const offset=state.button.style.translate;state.button.style.translate='';
  if(state.moved&&!cancel&&state.button.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)state.button.animate([{translate:offset},{translate:'0px 0px'}],{duration:160,easing:'cubic-bezier(.2,.8,.2,1)'});
  if(state.button.hasPointerCapture?.(state.pointerId))state.button.releasePointerCapture(state.pointerId);

  if(!cancel&&state.moved&&state.button.classList.contains('app')&&typeof document.elementFromPoint==='function'){
    const folderTarget=folderAtPoint(event.clientX,event.clientY,state.button);
    if(folderTarget){
      const appId=state.button.dataset.id;
      if(appId){
        suppressClickUntil=Date.now()+400;
        await addAppToFolder(appId);
        dragId=null;
        applyItemOrder();
        await refresh();
        return;
      }
    }
  }

  const ids=orderedItems().map(el=>el.dataset.orderKey);
  if(!state.moved){dragId=null;return;}
  suppressClickUntil=Date.now()+400;
  try{if(!cancel&&ids.join('\0')!==state.original.join('\0')){await invoke('dock_items_reorder',{ids});cfg.item_order=ids;}}
  catch(e){error(e)}finally{dragId=null;if(cancel)applyItemOrder();await refresh();}
}
document.addEventListener('pointermove',moveReorder);
document.addEventListener('pointerup',event=>finishReorder(event));
document.addEventListener('pointercancel',event=>finishReorder(event,true));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&reorder)finishReorder({pointerId:reorder.pointerId},true)});
window.addEventListener('blur',()=>{if(reorder)finishReorder({pointerId:reorder.pointerId},true)});

async function activate(id,newInstance){
  const button=[...$('apps').children].find(b=>b.dataset.id===id),item=items.find(i=>i.id===id);
  const feedback=animCfg?.dock_click_feedback||'bounce';
  const bounceMode=animCfg?.dock_bounce||'launch_only';
  const shouldBounce=(cfg?.launch_animation!==false)&&(bounceMode==='always'||(bounceMode==='launch_only'&&(newInstance||!item?.running)));
  if(shouldBounce&&button){
    const repeat=animCfg?.dock_bounce_count||2;
    button.style.setProperty('--bounce-count',repeat);
    button.classList.remove('launching','pulse','press');
    void button.offsetWidth;
    button.classList.add('launching');
    if(feedback==='pulse'||feedback==='press')button.classList.add(feedback);
    clearTimeout(button.launchTimer);
    button.launchTimer=setTimeout(()=>{button.classList.remove('launching','pulse','press');button.style.removeProperty('--bounce-count')},550*repeat);
  }
  if(isPreview)return;
  try{await invoke('dock_activate',{id,newInstance});setTimeout(refresh,250)}catch(e){error(e)}

}
function showLabel(button){
  if(dragId||!cfg?.show_labels||menuItem||(!button.matches(':hover')&&!button.matches(':focus-visible')))return;const item=items.find(i=>i.id===button.dataset.id);if(!item)return;
  const label=$('label');label.textContent=item.name+(item.windows>1?' · '+item.windows+' windows':'');label.hidden=false;
  const r=button.getBoundingClientRect(),l=label.getBoundingClientRect();
  let x=r.x+(r.width-l.width)/2,y=r.y-l.height-5;
  if(cfg.position==='top')y=r.bottom+8;
  if(cfg.position==='left'){x=r.right+8;y=r.y+(r.height-l.height)/2}
  if(cfg.position==='right'){x=r.x-l.width-8;y=r.y+(r.height-l.height)/2}
  label.style.left=Math.max(2,Math.min(innerWidth-l.width-2,x))+'px';label.style.top=Math.max(2,Math.min(innerHeight-l.height-2,y))+'px';
}
function openMenu(id){
  const item=items.find(i=>i.id===id);if(!item)return;menuItem=item;clearTimeout(hideTimer);$('label').hidden=true;
  const menu=$('menu');menu.replaceChildren();const name=document.createElement('div');name.className='name';name.textContent=item.name;menu.append(name);
  const action=(label,callback)=>{const b=document.createElement('button');b.role='menuitem';b.textContent=label;b.addEventListener('click',async()=>{closeMenu();try{await callback()}catch(e){error(e)}});menu.append(b)};
  action(item.running?'Show window':'Open',()=>activate(id,false));action('Open new instance',()=>activate(id,true));
  action(item.pinned?'Unpin from dock':'Keep in dock',async()=>{await invoke('dock_pin',{id,pinned:!item.pinned});await refresh()});
  action('Dock settings',()=>invoke('dock_open_studio'));menu.hidden=false;if(invoke)invoke('dock_menu_open',{open:true}).catch(()=>{});
}
function closeMenu(){menuItem=null;$('menu').hidden=true;if(invoke)invoke('dock_menu_open',{open:false}).catch(()=>{});syncBackdrop().catch(()=>{});}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
document.addEventListener('pointerdown',e=>{if(!$('menu').contains(e.target))closeMenu()});
function scheduleMeasure(){if(isPreview)return;clearTimeout(sizeTimer);sizeTimer=setTimeout(measure,60)}
async function measure(){
  if(!cfg||!invoke||menuItem||dragId)return;
  const vertical=['left','right'].includes(cfg.position),room=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--room'));
  const count=items.filter(i=>!i.hidden).length;const appLength=count*cfg.icon_size+Math.max(0,count-1)*cfg.spacing+8;
  const utility=(cfg.show_studio!==false?cfg.icon_size*.65+cfg.spacing:0)+(cfg.show_clock?40:0)+(cfg.show_start!==false?cfg.icon_size+cfg.spacing:0)+(cfg.show_search!==false?cfg.icon_size+cfg.spacing:0)+(cfg.show_tray?28:0)+(cfg.show_language?34:0)+(cfg.show_network?28:0)+(cfg.show_volume?28:0)+cfg.spacing*2+10;
  const widgets=[...document.querySelectorAll('.dock-capsule')];
  const widgetsLength=widgets.reduce((sum,el)=>sum+(vertical?el.offsetHeight:el.offsetWidth),0)+Math.max(0,widgets.length-1)*cfg.spacing;
  let targetDockLength=appLength+widgetsLength+utility+cfg.padding*2;
  if(cfg.dock_width&&Number(cfg.dock_width)>0)targetDockLength=Math.max(targetDockLength,Number(cfg.dock_width));
  let length=Math.min(targetDockLength+28,vertical?window.screen.availHeight:window.screen.availWidth);
  if(cfg.full_width)length=vertical?window.screen.availHeight:window.screen.availWidth;
  const thickness=cfg.icon_size+7+cfg.padding*2+room;
  visibleSize=vertical?{width:thickness,height:length}:{width:length,height:thickness};
  try{await invoke('dock_resize',{...visibleSize,collapsed});await syncBackdrop()}catch(e){error(e)}
}
let backdropSignature="";
async function syncBackdrop(){
  if(!invoke)return;
  const signature=JSON.stringify([cfg.enabled,cfg.material,cfg.position,cfg.monitor]);
  if(signature===backdropSignature)return;
  try{await invoke('dock_backdrop',{left:0,top:0,width:0,height:0,radius:0,collapsed});}catch{}
  backdropSignature=signature;
}
async function setCollapsed(value){
  if(!cfg?.auto_hide||menuItem||collapsed===value)return;collapsed=value;document.body.classList.toggle('collapsed',value);dockAudio?.configure(cfg.audio,Boolean(cfg.enabled&&!value&&!fullscreenHidden),cfg.position);$('label').hidden=true;
  try{await invoke('dock_resize',{...visibleSize,collapsed:value});await syncBackdrop()}catch(e){error(e)}
}
document.documentElement.addEventListener('pointerenter',()=>{clearTimeout(hideTimer);setCollapsed(false)});
document.documentElement.addEventListener('pointerleave',()=>{closeMenu();$('label').hidden=true;clearTimeout(hideTimer);if(cfg?.auto_hide&&!dragId)hideTimer=setTimeout(()=>setCollapsed(true),cfg.hide_delay)});
window.addEventListener('blur',()=>{closeMenu();$('label').hidden=true});
let scrollVelocity = 0, scrollAnimId = null;
function physicsScrollLoop(isVertical) {
  const dock = $('dock');
  if (!dock) { scrollAnimId = null; return; }
  const max = isVertical ? (dock.scrollHeight - dock.clientHeight) : (dock.scrollWidth - dock.clientWidth);
  if (max <= 0) { scrollVelocity = 0; scrollAnimId = null; return; }

  const current = isVertical ? dock.scrollTop : dock.scrollLeft;
  const next = Math.max(0, Math.min(max, current + scrollVelocity));
  if (isVertical) dock.scrollTop = next;
  else dock.scrollLeft = next;

  if (next <= 0 || next >= max) {
    scrollVelocity = 0;
  } else {
    scrollVelocity *= 0.88;
  }

  if (Math.abs(scrollVelocity) > 0.25) {
    scrollAnimId = requestAnimationFrame(() => physicsScrollLoop(isVertical));
  } else {
    scrollVelocity = 0;
    scrollAnimId = null;
  }
}

function scrollDock(delta) {
  const dock = $('dock');
  if (!dock || !delta) return;
  const isVertical = ['left', 'right'].includes(cfg?.position);
  const max = isVertical ? (dock.scrollHeight - dock.clientHeight) : (dock.scrollWidth - dock.clientWidth);
  if (max <= 0) return;

  const impulse = Math.sign(delta) * Math.min(38, Math.max(7, Math.abs(delta) * 0.24));
  scrollVelocity += impulse;
  scrollVelocity = Math.max(-55, Math.min(55, scrollVelocity));

  if (!scrollAnimId) {
    scrollAnimId = requestAnimationFrame(() => physicsScrollLoop(isVertical));
  }
}
$('dock').addEventListener('wheel',event=>{const delta=event.deltaY||event.deltaX;if(!delta)return;scrollDock(delta);event.preventDefault()},{passive:false});
$('apps').addEventListener('pointermove',event=>{
  if(dragId||!animCfg?.dock_hover_wave||!cfg)return;
  const isVertical=['left','right'].includes(cfg.position);
  const maxScale=(animCfg.dock_hover_scale||135)/100;
  const buttons=[...$('apps').children].filter(el=>el.classList.contains('app'));
  const pointerPos=isVertical?event.clientY:event.clientX;
  for(const btn of buttons){
    const r=btn.getBoundingClientRect();
    const center=isVertical?(r.top+r.height/2):(r.left+r.width/2);
    const dist=Math.abs(pointerPos-center);
    const reach=(isVertical?r.height:r.width)*2.2;
    const influence=Math.max(0,1-dist/reach);
    const scale=1+(maxScale-1)*Math.sin(influence*Math.PI/2);
    const icon=btn.querySelector('.icon');
    if(icon)icon.style.transform=scale>1.01?`scale(${scale.toFixed(3)})`:'';
  }
});
$('apps').addEventListener('pointerleave',()=>{
  for(const btn of $('apps').children){
    const icon=btn.querySelector('.icon');
    if(icon)icon.style.transform='';
  }
});
for(const action of ['start','search','tray','language','network','volume','clock']){const el=$(action);el.addEventListener('pointerdown',startReorder);el.addEventListener('click',e=>{if(isPreview)return;if(Date.now()<suppressClickUntil){e.preventDefault();return}invoke('dock_open_system',{action}).catch(error)});}

$('studio').addEventListener('pointerdown',startReorder);$('studio').addEventListener('click',e=>{if(isPreview)return;if(Date.now()<suppressClickUntil){e.preventDefault();return}invoke('dock_open_studio').catch(error)});
function updateClock(){$('clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}updateClock();setInterval(updateClock,10000);
async function refreshLanguage(){if(!invoke||!cfg?.show_language)return;try{$('language').textContent=await invoke('dock_input_language')}catch{}}
setInterval(refreshLanguage,2500);$('language').addEventListener('pointerenter',refreshLanguage);window.addEventListener('focus',refreshLanguage);
let widgetEditMode = false;
function updateCapsuleEditBadge(capsule) {
  let btn = capsule.querySelector('.dock-capsule-remove-btn');
  if (widgetEditMode) {
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'dock-capsule-remove-btn';
      btn.type = 'button';
      btn.title = 'Remove from taskbar';
      btn.setAttribute('aria-label', 'Remove from taskbar');
      btn.innerHTML = '<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="10.5" width="18" height="3" rx="1.5"/></svg>';
      btn.addEventListener('click', async e => {
        e.preventDefault();
        e.stopPropagation();
        const widgetId = capsule.dataset.widgetId;
        if (widgetId && invoke) {
          try { await invoke('dock_widget_set', { id: widgetId, added: false }); } catch {}
        }
      });
      btn.addEventListener('pointerdown', e => e.stopPropagation());
      capsule.append(btn);
    }
    btn.style.display = 'grid';
  } else if (btn) {
    btn.style.display = 'none';
  }
}

function setWidgetEditMode(enabled) {
  widgetEditMode = enabled;
  document.querySelectorAll('.dock-capsule').forEach(updateCapsuleEditBadge);
}

if (!isPreview) {
  window.__TAURI__?.event?.listen('widget-edit-mode', event => setWidgetEditMode(Boolean(event.payload)));
}
window.addEventListener('message', event => {
  if (typeof event.data?.widgetEditMode === 'boolean') setWidgetEditMode(event.data.widgetEditMode);
});

function applyWidgetConfigUpdate(updated){
  if(!updated?.kind)return;
  if(updated.kind==='app_folder'){folderAppIds=new Set(updated.custom?.folder_apps||[]);folderName=updated.custom?.folder_name||'Apps';renderDockWidgets();lastSignature='';render();return;}
  const capsule=document.querySelector(`.dock-capsule[data-widget-id="${updated.kind}"]`);
  if(!capsule)return;
  const frame=capsule.querySelector('iframe');
  if(!frame)return;
  try{
    if(frame.contentWindow?.applyConfig)frame.contentWindow.applyConfig(updated);
    else frame.contentWindow?.postMessage({widgetConfig:updated},'*');
  }catch{}
  syncWidgetFrame(frame);
  scheduleMeasure();
}
if(!isPreview)window.__TAURI__?.event?.listen('widget-config',event=>applyWidgetConfigUpdate(event?.payload));
window.addEventListener('message',event=>{if(event.data?.widgetConfig)applyWidgetConfigUpdate(event.data.widgetConfig)});
if(!isPreview)window.__TAURI__?.event?.listen('folder-app-drop',async event=>{
  const drop=event.payload;if(!drop||typeof drop.id!=='string'||!Number.isFinite(drop.x)||!Number.isFinite(drop.y))return;
  try{
    const win=window.__TAURI__.window.getCurrentWindow(),[origin,scale]=await Promise.all([win.outerPosition(),win.scaleFactor()]);
    const x=(drop.x-origin.x)/scale,y=(drop.y-origin.y)/scale,rect=$('dock').getBoundingClientRect();
    if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return;
    const configs=await invoke('get_widgets'),folder=configs.find(c=>c.kind==='app_folder');
    if(!folder?.custom?.folder_apps?.includes(drop.id))return;
    const app=items.find(i=>i.id===drop.id);if(!app?.pinned)await invoke('dock_pin',{id:drop.id,pinned:true});
    folder.custom.folder_apps=folder.custom.folder_apps.filter(id=>id!==drop.id);
    await invoke('set_widget',{config:folder});
    folderAppIds=new Set(folder.custom.folder_apps);lastSignature='';await refresh();
    const all=orderedItems(),key='app:'+drop.id,appEl=all.find(el=>el.dataset.orderKey===key);
    if(appEl){
      const others=all.filter(el=>el!==appEl),vertical=['left','right'].includes(cfg.position),pos=vertical?y:x;
      let index=others.findIndex(el=>{if(!isOrderVisible(el))return false;const r=el.getBoundingClientRect();return pos<(vertical?r.top+r.height/2:r.left+r.width/2)});
      if(index<0)index=others.length;others.splice(index,0,appEl);
      const ids=others.map(el=>el.dataset.orderKey);await invoke('dock_items_reorder',{ids});cfg.item_order=ids;applyItemOrder();
    }
    await window.__TAURI__.event.emitTo('widget-folder-flyout','folder-app-drop-complete',{});
  }catch(e){error(e)}
});
if(!isPreview)window.__TAURI__?.event?.listen('dock-config-changed',()=>{lastSignature='';refresh()});
if(!isPreview)window.__TAURI__?.event?.listen('dock-fullscreen-changed',event=>{fullscreenRevision++;fullscreenHidden=Boolean(event.payload);backdropSignature='';syncBackdrop().catch(error);if(cfg)dockAudio?.configure(cfg.audio,Boolean(cfg.enabled&&!collapsed&&!fullscreenHidden),cfg.position)});
function syncWidgetFrame(frame){
  try{const root=frame.contentDocument?.documentElement;if(!root)return;root.classList.toggle('light-compact',document.documentElement.classList.contains('light-dock'));root.classList.toggle('vertical-compact',['left','right'].includes(cfg?.position));frame.contentWindow?.updateDockAppearance?.();frame.contentWindow?.refresh?.();}catch{}
}
function renderDockWidgets(){
  const container=$('apps');if(!container||reorder)return;
  const ids=cfg?.widgets||[];
  const existing=new Map([...container.children].filter(el=>el.classList.contains('dock-capsule')).map(el=>[el.dataset.widgetId,el]));
  for(const id of ids){
    let el=existing.get(id);
    if(!el){
      el=document.createElement('div');el.className='dock-capsule';el.dataset.widgetId=id;el.dataset.orderKey='widget:'+id;
      if(id==='sys_tray'||id==='app_folder'){
        const button=document.createElement('button');button.type='button';button.className='dock-special-button';
        button.setAttribute('aria-label',id==='sys_tray'?'Open Windows notification area':'Open app group');
        if(id==='sys_tray')button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>';
        button.addEventListener('pointerdown',e=>{startReorder(e,el);if(reorder)button.setPointerCapture(e.pointerId)});
        button.addEventListener('click',e=>{if(Date.now()<suppressClickUntil)return;const r=el.getBoundingClientRect();
          if(id==='sys_tray')invoke('dock_open_tray',{x:r.left,y:r.top,width:r.width,height:r.height}).catch(error);
          else invoke('dock_open_folder',{x:r.left,y:r.top,width:r.width,height:r.height,folderName,appCount:folderAppIds.size,isLight:document.documentElement.classList.contains('light-dock')}).catch(error);
        });
        el.append(button);
      }else{
      const frame=document.createElement('iframe');frame.className='dock-widget-frame';frame.title=id;frame.src='widget.html?compact&kind='+encodeURIComponent(id);
      frame.addEventListener('load',()=>{try{
        const doc=frame.contentDocument;syncWidgetFrame(frame);
        const mapped=e=>{const r=frame.getBoundingClientRect();return {pointerId:e.pointerId,button:e.button,clientX:r.left+e.clientX,clientY:r.top+e.clientY,preventDefault:()=>e.preventDefault()}};
        doc.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,textarea,select,[contenteditable=true],.sys-tray-btn,.app-folder-btn'))return;startReorder(mapped(e),el);if(reorder)e.preventDefault();if(reorder)try{e.target.setPointerCapture(e.pointerId)}catch{}},true);
        doc.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
        doc.addEventListener('pointermove',e=>moveReorder(mapped(e)),true);
        doc.addEventListener('pointerup',e=>finishReorder(mapped(e)),true);
        doc.addEventListener('pointercancel',e=>finishReorder(mapped(e),true),true);
        doc.addEventListener('wheel',e=>{scrollDock(e.deltaY||e.deltaX);e.preventDefault()},{passive:false});
      }catch{}});
      el.append(frame);
      }
      container.append(el);
    }
    if(id==='app_folder'){
      const button=el.querySelector('.dock-special-button');button.replaceChildren();
      const grid=document.createElement('span');grid.className='dock-folder-grid';
      for(const appId of [...folderAppIds].slice(0,4)){
        const app=items.find(item=>item.id===appId),cell=document.createElement('span');cell.className='dock-folder-cell';
        if(app?.icon){const img=document.createElement('img');img.src=app.icon;img.alt='';cell.append(img)}
        else {cell.textContent=(app?.name||appId.split(/[\\/]/).pop()||'·')[0];}
        grid.append(cell);
      }
      button.append(grid);
    }
    updateCapsuleEditBadge(el);
    existing.delete(id);
  }
  for(const el of existing.values())el.remove();applyItemOrder();
}

if(isPreview){window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent||!event.data?.dockPreview)return;const snapshot=event.data.dockPreview;if(!snapshot.config||!Array.isArray(snapshot.items))return;animCfg=snapshot.animations||null;config(snapshot.config);items=snapshot.items;if(typeof snapshot.language==='string')$('language').textContent=snapshot.language;render()})}else{refresh();setInterval(refresh,2500)}

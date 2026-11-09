'use strict';
const invoke = window.__TAURI__?.core?.invoke;
const titleEl = document.getElementById('folder-title');
const badgeEl = document.getElementById('folder-badge');
const contentArea = document.getElementById('content-area');
const manageBtn = document.getElementById('toggle-manage-btn');

let currentFolderName = 'Apps';
let selectedAppId = null;
let suppressClickUntil = 0;
let folderDragging = false;
let pendingGhostEnd = null;
let folderApps = [];
let allDockItems = [];
let widgetConfig = null;

async function loadData() {
  if (!invoke) return;
  try {
    const [configs, snap] = await Promise.all([
      invoke('get_widgets'),
      invoke('get_dock_snapshot')
    ]);
    widgetConfig = configs.find(c => c.kind === 'app_folder');
    if (widgetConfig) {
      currentFolderName = widgetConfig.custom?.folder_name || 'Apps';
      folderApps = Array.isArray(widgetConfig.custom?.folder_apps) ? widgetConfig.custom.folder_apps : [];
    }
    allDockItems = (snap?.items || []).filter(i => !i.hidden);

    applyFolderTheme(snap?.config);
    render();
  } catch (err) {
    console.error('loadData error', err);
  }
}

function applyFolderTheme(c){
  if(!c||!/^#[0-9a-f]{6}$/i.test(c.tint||''))return;
  const rgb=[1,3,5].map(i=>parseInt(c.tint.slice(i,i+2),16));const isLight=(c.material||'solid')==='solid'&&(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>180);
  const root=document.documentElement;root.classList.toggle('light-dock',isLight);root.dataset.material=c.material||'solid';
  root.style.setProperty('--folder-tint',rgb.join(','));root.style.setProperty('--folder-alpha',String(Math.max(.1,Math.min(1,Number(c.opacity??90)/100))));
}
window.__TAURI__?.event?.listen('dock-config-changed',e=>applyFolderTheme(e.payload));

async function saveFolderApps(newApps) {
  folderApps = newApps;
  if (!widgetConfig) {
    widgetConfig = { kind: 'app_folder', custom: {} };
  }
  if (!widgetConfig.custom) widgetConfig.custom = {};
  widgetConfig.custom.folder_apps = folderApps;
  try {
    await invoke('set_widget', { config: widgetConfig });
  } catch (e) {
    console.error('saveFolderApps error', e);
  }
  render();
}

function render() {
  titleEl.textContent = currentFolderName;
  contentArea.replaceChildren();

  const colors = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

  if (folderApps.length === 0) {
    badgeEl.style.display = 'none';
    manageBtn.style.display = 'none';
    selectedAppId = null;

    return;
  }

  badgeEl.style.display = '';
  badgeEl.textContent = `${folderApps.length} apps`;
  manageBtn.style.display = '';
  manageBtn.style.display = 'none';

  const grid = document.createElement('div');
  grid.className = 'apps-grid' + (folderApps.length > 6 ? ' many-apps' : (folderApps.length > 4 ? ' more-apps' : ''));

  folderApps.forEach((id, idx) => {
    const app = allDockItems.find(i => i.id === id) || { id, name: id.split('/').pop().replace('.exe', ''), icon: '' };
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.draggable = false;
    btn.ondragstart = event => event.preventDefault();
    btn.className = 'app-item'; btn.dataset.appId = id;
    btn.title = app.name;

    const iconWrap = document.createElement('div');
    iconWrap.className = 'app-icon';

    if (app.icon) {
      const img = document.createElement('img');
      img.src = app.icon;
      img.draggable = false;
      img.alt = app.name;
      img.onerror = () => {
        img.remove();
        const fallback = document.createElement('div');
        fallback.className = 'fallback';
        fallback.textContent = app.name ? app.name[0] : '·';
        iconWrap.style.background = colors[idx % colors.length];
        iconWrap.append(fallback);
      };
      iconWrap.append(img);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'fallback';
      fallback.textContent = app.name ? app.name[0] : '·';
      iconWrap.style.background = colors[idx % colors.length];
      iconWrap.append(fallback);
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'app-name';
    nameEl.textContent = app.name;

    btn.append(iconWrap);

    if (selectedAppId === id) {
      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove-badge'; removeBtn.title = 'Remove from folder';
      removeBtn.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="10.5" width="18" height="3" rx="1.5"/></svg>';
      removeBtn.onclick = e => { e.stopPropagation(); selectedAppId = null; saveFolderApps(folderApps.filter(x => x !== id)); };
      btn.append(removeBtn);
    }
    btn.onclick = async () => {
      if (Date.now() < suppressClickUntil) return;
      try { await invoke('dock_activate', {id: app.id, newInstance: false}); } catch (e) { console.error(e); }
      window.__TAURI__?.window?.getCurrentWindow()?.hide();
    };
    btn.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); selectedAppId = selectedAppId === id ? null : id; render(); };
    btn.onpointerdown = e => {
      if(e.button!==0 || e.target.closest('.remove-badge'))return;
      const pointerId=e.pointerId,startX=e.clientX,startY=e.clientY,win=window.__TAURI__?.window?.getCurrentWindow();
      const iconRect=iconWrap.getBoundingClientRect();
      const grabX=(e.clientX-iconRect.left)*36/(iconRect.width||36),grabY=(e.clientY-iconRect.top)*36/(iconRect.height||36);
      const location=Promise.all([win.outerPosition(),win.scaleFactor()]);
      let moved=false,ghostStarted=false,ghostStopped=false,ghostBusy=false,ghostLatest=null,ghostReady=Promise.resolve();folderDragging=true;btn.setPointerCapture(pointerId);
      const point=async (x,y)=>{const [origin,scale]=await location;return {x:origin.x+x*scale,y:origin.y+y*scale}};
      const pump=async()=>{if(ghostBusy||ghostStopped||!ghostLatest)return;ghostBusy=true;const p=ghostLatest;ghostLatest=null;try{await invoke('folder_ghost_move',await point(p.x,p.y))}catch{}finally{ghostBusy=false;if(ghostLatest&&!ghostStopped)pump()}};
      const endGhost=()=>{ghostStopped=true;ghostLatest=null;ghostReady.then(()=>invoke('folder_ghost_end')).catch(()=>{});};
      const move=event=>{if(event.pointerId!==pointerId)return;const dx=event.clientX-startX,dy=event.clientY-startY;
        if(!moved && Math.hypot(dx,dy)<6)return;event.preventDefault?.();moved=true;btn.classList.add('dragging');
        if(!ghostStarted){ghostStarted=true;iconWrap.style.opacity='0';const x=event.clientX,y=event.clientY;ghostReady=point(x,y).then(p=>invoke('folder_ghost_start',{icon:app.icon||'',name:app.name||'',grabX,grabY,...p})).then(()=>{pump()}).catch(()=>{if(!ghostStopped)iconWrap.style.opacity=''});}
        else {ghostLatest={x:event.clientX,y:event.clientY};ghostReady.then(pump);}
        iconWrap.style.transform='translate('+dx+'px,'+dy+'px)';};
      const finish=async event=>{if(event.pointerId!==pointerId)return;btn.removeEventListener('pointermove',move);btn.removeEventListener('pointerup',finish);btn.removeEventListener('pointercancel',cancel);
        folderDragging=false;btn.classList.remove('dragging');iconWrap.style.opacity='';iconWrap.style.transform='';if(!moved){endGhost();return;}suppressClickUntil=Date.now()+500;
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.app-item');
        const targetId=target?.dataset.appId;
        if(targetId && targetId!==id){const index=folderApps.indexOf(targetId);const reordered=folderApps.filter(appId=>appId!==id);if(index>=0){reordered.splice(index,0,id);await saveFolderApps(reordered)}endGhost();return;}
        if(pendingGhostEnd)pendingGhostEnd();
        const timer=setTimeout(()=>{if(pendingGhostEnd===finishGhost)pendingGhostEnd=null;endGhost()},1000);
        const finishGhost=()=>{clearTimeout(timer);pendingGhostEnd=null;endGhost()};pendingGhostEnd=finishGhost;
        try{const [origin,scale]=await location;await window.__TAURI__.event.emitTo('desktop-dock','folder-app-drop',{id,x:origin.x+event.clientX*scale,y:origin.y+event.clientY*scale});}catch(err){finishGhost();console.error(err)}
      };
      const cancel=event=>{if(event.pointerId!==pointerId)return;btn.removeEventListener('pointermove',move);btn.removeEventListener('pointerup',finish);btn.removeEventListener('pointercancel',cancel);folderDragging=false;endGhost();btn.classList.remove('dragging');iconWrap.style.opacity='';iconWrap.style.transform='';};
      btn.addEventListener('pointermove',move);btn.addEventListener('pointerup',finish);btn.addEventListener('pointercancel',cancel);
    };

    grid.append(btn);
  });

  contentArea.append(grid);
}

if (window.__TAURI__?.event?.listen) {
  window.__TAURI__.event.listen('folder-config', event => {
    const payload = event?.payload;
    if (typeof payload === 'object' && payload !== null) {
      if (payload.name) currentFolderName = payload.name;
      if (typeof payload.is_light === 'boolean') {
        document.documentElement.classList.toggle('light-dock', payload.is_light);
      }
    } else if (typeof payload === 'string') {
      currentFolderName = payload;
    }
    loadData();
  });
}

contentArea.addEventListener('contextmenu', e => { e.preventDefault(); selectedAppId = null; render(); });
window.__TAURI__?.event?.listen('folder-app-drop-complete', () => {pendingGhostEnd?.();window.__TAURI__?.window?.getCurrentWindow()?.hide()});

window.addEventListener('blur', () => {
  if(folderDragging)return;
  selectedAppId = null;
  window.__TAURI__?.window?.getCurrentWindow()?.hide();
});

loadData();

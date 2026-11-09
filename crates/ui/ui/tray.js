'use strict';
const invoke=window.__TAURI__?.core?.invoke, grid=document.getElementById('icons'),status=document.getElementById('status');
let sequence=0;
async function refresh(){
  const run=++sequence;
  try{const icons=await invoke('tray_icons');if(run!==sequence)return;const signature=JSON.stringify(icons);status.textContent='';if(signature===refresh.signature)return;
    const existing=new Map([...grid.children].map(button=>[button.dataset.id,button]));
    for(const [index,icon] of icons.entries()){
      let b=existing.get(icon.id);
      if(!b){b=document.createElement('button');b.type='button';b.className='icon';b.dataset.id=icon.id;
        const img=document.createElement('img');img.alt='';img.draggable=false;b.append(img);
        b.onclick=e=>{if(e.detail<2)activate(b.dataset.id,'left')};b.oncontextmenu=e=>{e.preventDefault();activate(b.dataset.id,'right')};
        b.ondblclick=e=>{e.preventDefault();if(b.dataset.singleAsDouble!=='true')activate(b.dataset.id,'double')};}
      b.dataset.singleAsDouble=String(Boolean(icon.single_as_double));
      b.title=icon.title||'Tray icon';b.setAttribute('aria-label',b.title);
      const img=b.querySelector('img');if(img.getAttribute('src')!==icon.icon)img.src=icon.icon;
      if(grid.children[index]!==b)grid.insertBefore(b,grid.children[index]||null);
      existing.delete(icon.id);
    }
    for(const b of existing.values())b.remove();
    refresh.signature=signature;
  }catch(e){if(run===sequence)status.textContent=String(e)}
}
async function activate(id,button){try{await invoke('tray_icon_click',{id,button})}catch(e){status.textContent=String(e)}}
function applyTheme(c){if(!c)return;const hex=/^#[0-9a-f]{6}$/i.test(c.tint)?c.tint:'#202124';const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const root=document.documentElement;root.dataset.material=c.material||'solid';root.style.setProperty('--tray-tint',rgb.join(','));root.style.setProperty('--tray-alpha',String(Math.max(.1,Math.min(1,Number(c.opacity??90)/100))));root.style.setProperty('--tray-fg',(c.material||'solid')==='solid'&&rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>180?'#222':'#eee')}
async function theme(){try{applyTheme((await invoke('get_dock_snapshot')).config)}catch{}}
window.__TAURI__?.event?.listen('dock-config-changed',e=>applyTheme(e.payload));
window.__TAURI__?.event?.listen('tray-icons-changed',refresh);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){theme();refresh()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.__TAURI__?.window?.getCurrentWindow()?.hide()});
window.addEventListener('blur',()=>window.__TAURI__?.window?.getCurrentWindow()?.hide());
theme();refresh();

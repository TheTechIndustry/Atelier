'use strict';
const img=document.querySelector('img'),label=document.querySelector('span');
function show(icon,name){img.style.display=icon?'':'none';label.style.display=icon?'none':'block';if(icon)img.src=icon;label.textContent=(name||'·')[0]}
window.__TAURI__?.event?.listen('folder-ghost-icon',e=>show(e.payload.icon,e.payload.name));
window.__TAURI__?.core?.invoke('folder_ghost_icon').then(([icon,name])=>show(icon,name)).catch(()=>{});

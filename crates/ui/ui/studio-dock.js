(()=>{
  'use strict';
  const $=id=>document.getElementById(id),invoke=window.__TAURI__?.core?.invoke;
  const root=$('desktop-dock-settings');
  const fields=[...document.querySelectorAll('#custom-taskbar [id^="dd-"]')].filter(e=>['INPUT','SELECT'].includes(e.tagName));
  let saved=null,items=[],previewLanguage=null,busy=false,queued=false,timer=null,refreshing=false,revision=0;
  const presetGeometry = {padding:9,spacing:6,icon_size:38};
  const stylePresets = {
    black: {material:'solid',tint:'#000000',opacity:100,radius:14,...presetGeometry,indicator_color:'#f3f0ea'},
    white: {material:'solid',tint:'#f5f5f7',opacity:96,radius:14,...presetGeometry,indicator_color:'#333847'},
    liquid: {material:'liquid',tint:'#ffffff',opacity:14,radius:24,...presetGeometry,indicator_color:'#ffffff'},
    ios: {material:'ios',tint:'#ffffff',opacity:20,radius:26,...presetGeometry,indicator_color:'#ffffff'},
    midnight: {material:'solid',tint:'#171c29',opacity:90,radius:14,...presetGeometry,indicator_color:'#a6b9ef'}
  };
  function syncPreset(c){for(const button of document.querySelectorAll('[data-dock-style]'))button.setAttribute('aria-pressed',String(Object.entries(stylePresets[button.dataset.dockStyle]).every(([key,value])=>c[key]===value)));}
  const primaryPreview=window.createDockPreview?.($('dock-preview'));
  const animationPreview=window.createDockPreview?.($('anim-dock-preview'),{withoutWidgets:true});
  const preview={render(...args){primaryPreview?.render(...args);animationPreview?.render(...args)}};
  window.addEventListener('dock-animation-preview',event=>animationPreview?.setAnimations(event.detail));
  function outputs(){
    const autoWorkarea = $('dd-auto_adjust_workarea')?.checked;
    const gapInput = $('dd-maximized_bottom_gap');
    const isFull = $('dd-full_width')?.checked;
    const widthInput = $('dd-dock_width');
    const edgeInput = $('dd-edge_gap');
    if (gapInput && autoWorkarea) {
      const icon = Number($('dd-icon_size')?.value || 38);
      const pad = Number($('dd-padding')?.value || 9);
      const edge = isFull ? 0 : Number($('dd-edge_gap')?.value || 0);
      const autoGap = Math.min(200, icon + 7 + pad * 2 + edge + 4);
      gapInput.value = autoGap;
      gapInput.disabled = true;
      if (gapInput.nextElementSibling) gapInput.nextElementSibling.textContent = autoGap + ' px (Auto)';
    } else if (gapInput) {
      gapInput.disabled = false;
    }
    if (widthInput) {
      widthInput.disabled = !!isFull;
    }
    if (edgeInput) {
      edgeInput.disabled = !!isFull;
    }
    for(const input of fields.filter(e=>e.type==='range')){
      if (input === gapInput && autoWorkarea) continue;
      if (input === widthInput && isFull) {
        if (input.nextElementSibling) input.nextElementSibling.textContent = '100% (Full)';
        continue;
      }
      if (input === widthInput) {
        const val = Number(input.value) || 0;
        input.nextElementSibling.textContent = val === 0 ? 'Auto' : val + ' px';
        continue;
      }
      if (input === edgeInput && isFull) {
        if (input.nextElementSibling) input.nextElementSibling.textContent = '0 px (Docked)';
        continue;
      }
      const name=input.id.slice(3),suffix=['opacity','inactive_opacity','magnification'].includes(name)?'%':name==='hide_delay'?' ms':' px';
      input.nextElementSibling.textContent=input.value+suffix;
    }
  }
  function paint(c){saved=c;syncPreset(c);for(const field of fields){const value=c[field.id.slice(3)];if(field.type==='checkbox')field.checked=!!value;else field.value=value;}outputs();preview?.render(c,items,previewLanguage);$('dd-status').textContent=c.enabled?'Desktop dock is on':'Desktop dock is off';}
  function read(){const c={...saved};for(const field of fields){const name=field.id.slice(3);c[name]=field.type==='checkbox'?field.checked:['range','number'].includes(field.type)||name==='monitor'?Number(field.value):field.value;}c.full_width=Boolean(c.full_width);c.dock_width=Number(c.dock_width)||0;if(c.auto_adjust_workarea){const extra=c.full_width?0:(Number(c.edge_gap)||0);c.maximized_bottom_gap=Math.min(200,(Number(c.icon_size)||38)+7+(Number(c.padding)||9)*2+extra+4);}c.hide_windows_taskbar=c.enabled;return c;}
  async function refresh(){
    if(!invoke||refreshing||busy||timer)return;refreshing=true;const startRevision=revision;
    try{const data=await invoke('get_dock_snapshot');if(startRevision!==revision||busy||timer)return;const selected=data.config.monitor;$('dd-monitor').replaceChildren(...data.monitors.map((name,i)=>{const o=document.createElement('option');o.value=i;const match=name.match(/^\\\\\.\\DISPLAY(\d+)$/i);o.textContent=match?'Display '+match[1]:name;return o}));$('dd-monitor').value=selected;items=data.items;paint(data.config);renderApps();if(data.config.show_language){invoke('dock_input_language').then(language=>{previewLanguage=language;if(saved)preview?.render(read(),items,previewLanguage)}).catch(()=>{})}}
    catch(e){$('dd-status').textContent=String(e)}finally{refreshing=false}
  }
  function eyeSvg(hidden){return hidden?'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.8 5.3A11.4 11.4 0 0 1 12 5c5 0 8.5 4.3 9 7-.3 1.2-1.1 2.5-2.2 3.6M6.1 6.1C4.3 7.4 3.3 9.3 3 12c.5 2.7 4 7 9 7 1.2 0 2.4-.3 3.4-.8"/></svg>':'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 12c.5-2.7 4-7 9-7s8.5 4.3 9 7c-.5 2.7-4 7-9 7s-8.5-4.3-9-7Z"/><circle cx="12" cy="12" r="3"/></svg>'}
  function renderApps(){
    const list=$('dd-apps');list.replaceChildren();
    const pinned=items.filter(i=>i.pinned);
    for(const [key,label,icon] of [['show_start','Windows Start','<path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" fill="currentColor" stroke="none"/>'],['show_search','Windows Search','<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'],['show_tray','Hidden tray icons','<path d="m6 14 6-6 6 6"/>'],['show_language','Input language','<path d="M4 19l4-14 4 14M5 15h6m2-7h8m-4-3v3m-2 3c1 4 3 6 6 8m-1-8c-1 4-3 6-6 8"/>'],['show_network','Network','<rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21h8m-4-4v4"/>'],['show_volume','Volume','<path d="M3 9h4l5-4v14l-5-4H3zm12-1a6 6 0 0 1 0 8"/>'],['show_clock','Clock and notifications','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],['show_studio','Atelier','']]){const row=document.createElement('div');row.className='dd-app';const image=document.createElement('span');image.innerHTML=key==='show_studio'?'<img src="atelier-mark.png" alt="" width="20" height="20">':'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">'+icon+'</svg>';const name=document.createElement('span');name.className='dd-app-name';name.textContent=label;const state=document.createElement('small');state.textContent=saved[key]?'Visible':'Hidden';const eye=document.createElement('button');eye.type='button';eye.setAttribute('aria-label',(saved[key]?'Hide ':'Show ')+label);eye.innerHTML=eyeSvg(!saved[key]);eye.setAttribute('aria-pressed',String(!!saved[key]));eye.onclick=()=>{const input=$('dd-'+key);input.checked=!input.checked;revision++;save()};row.append(image,name,state,eye);list.append(row)}
    for(const item of items){
      const row=document.createElement('div');row.className='dd-app';
      const icon=document.createElement('img');icon.src=item.icon;icon.alt='';if(!item.icon)icon.hidden=true;
      const name=document.createElement('span');name.className='dd-app-name';name.textContent=item.name;name.title=item.name;
      const state=document.createElement('small');state.textContent=item.hidden?'Hidden':item.active?'Active':item.running?'Running':item.pinned?'Pinned':'Unavailable';
      row.append(icon,name,state);
      const button=(text,label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.addEventListener('click',async()=>{b.disabled=true;try{await action();await refresh()}catch(e){toast(String(e),true)}finally{b.disabled=false}});row.append(b);return b};
      const visibility=button('',(item.hidden?'Show ':'Hide ')+item.name,()=>invoke('dock_set_hidden',{id:item.id,hidden:!item.hidden}));visibility.innerHTML=eyeSvg(item.hidden);visibility.setAttribute('aria-pressed',String(!item.hidden));
      if(item.pinned){const at=pinned.findIndex(i=>i.id===item.id);for(const [text,delta]of [['↑',-1],['↓',1]]){const b=button(text,`Move ${item.name} ${delta<0?'earlier':'later'}`,async()=>{const ids=pinned.map(i=>i.id);const target=at+delta;[ids[at],ids[target]]=[ids[target],ids[at]];await invoke('dock_reorder',{ids})});b.disabled=at+delta<0||at+delta>=pinned.length;}
        const picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp';picker.hidden=true;picker.setAttribute('aria-label','Choose icon for '+item.name);row.append(picker);
        const choose=document.createElement('button');choose.type='button';choose.textContent='Icon';choose.setAttribute('aria-label','Change icon for '+item.name);choose.addEventListener('click',()=>picker.click());row.append(choose);
        picker.addEventListener('change',async()=>{const file=picker.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('Choose an image smaller than 5 MB');const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');const ratio=Math.min(256/bitmap.width,256/bitmap.height);const w=bitmap.width*ratio,h=bitmap.height*ratio;ctx.drawImage(bitmap,(256-w)/2,(256-h)/2,w,h);bitmap.close();await invoke('dock_set_icon',{id:item.id,icon:canvas.toDataURL('image/png')});await refresh()}catch(e){toast(String(e),true)}});
        if(saved.pinned.some(p=>p.path===item.id&&p.icon))button('Reset icon','Reset icon for '+item.name,()=>invoke('dock_set_icon',{id:item.id,icon:null}));
      }
      if(item.pinned||item.running)button(item.pinned?'Unpin':'Pin',(item.pinned?'Unpin ':'Pin ')+item.name,()=>invoke('dock_pin',{id:item.id,pinned:!item.pinned}));list.append(row);
    }
  }
  async function save(){
    clearTimeout(timer);timer=null;if(!invoke||!saved)return;
    if(busy){queued=true;return;}busy=true;const next=read();$('dd-status').textContent='Applying…';
    try{const c=await invoke('set_dock_config',{config:next});const changed=JSON.stringify(read())!==JSON.stringify(next);saved=c;if(!queued&&!changed)paint(c);else if(changed)queued=true;}
    catch(e){paint(saved);toast('Could not update dock: '+e,true)}
    finally{busy=false;if(queued){queued=false;save()}else refresh()}
  }
  for(const field of fields){
    field.addEventListener('input',()=>{
      if(field.id==='dd-material'){
        const mat=field.value;
        if(mat==='liquid'||mat==='ios'){
          const opField=$('dd-opacity');
          if(opField&&Number(opField.value)>30){opField.value=mat==='liquid'?14:20;}
          const radField=$('dd-radius');
          if(radField&&Number(radField.value)<20){radField.value=mat==='liquid'?24:26;}
          const tintField=$('dd-tint');
          if(tintField&&(tintField.value==='#000000'||tintField.value==='#171c29'||tintField.value==='#d3dbe8')){tintField.value='#ffffff';}
        }
      }
      revision++;outputs();if(saved){syncPreset(read());preview?.render(read(),items,previewLanguage)}if(field.type==='range'||field.type==='color'){clearTimeout(timer);timer=setTimeout(save,180)}
    });
    field.addEventListener('change',()=>{revision++;if(saved)preview?.render(read(),items);save()});
  }
  document.querySelectorAll('[data-dock-color]').forEach(button=>button.addEventListener('click',()=>{if(!saved)return;$('dd-tint').value=button.dataset.dockColor;revision++;syncPreset(read());preview?.render(read(),items,previewLanguage);save()}));
  function preset(values){if(!saved)return;revision++;const previous=saved;paint({...read(),...values,enabled:true});saved=previous;save()}
  for(const button of document.querySelectorAll('[data-dock-style]'))button.addEventListener('click',()=>preset({...stylePresets[button.dataset.dockStyle],position:'bottom',alignment:'center',edge_gap:8,magnification:125,icon_style:'original',inactive_opacity:100,active_background:false,indicator:'dot',show_clock:true}));
  if(!invoke){document.querySelectorAll('[data-dock-style],[data-dock-color]').forEach(e=>e.disabled=true);fields.forEach(e=>e.disabled=true);root.querySelectorAll('button').forEach(e=>e.disabled=true);$('dd-status').textContent='Launch Atelier to use the desktop dock';return}
  window.__TAURI__?.event?.listen('dock-config-changed',()=>{if(!busy&&!timer)refresh()});
  refresh();setInterval(()=>{if(document.getElementById('custom-taskbar').classList.contains('active')&&($('desktop-dock-details')?.open??true))refresh()},4000);
})();

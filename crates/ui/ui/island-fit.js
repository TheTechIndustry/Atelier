(function(root){
 function mode(kind,width,height){
  if(kind==='media'){if(width<110||height<42)return 'tiny';if(height<70)return 'dense';if(width<210||height<105)return 'compact';return 'full'}
  if(kind==='calendar'){if(width<80||height<38)return 'tiny';if(width<120||height<65)return 'compact';return 'full'}
  return 'simple';
 }
 function create(){const records=new Map();const observer=new ResizeObserver(entries=>{for(const entry of entries)update(entry.target)});
  function update(container){const record=records.get(container);if(!record)return;container.dataset.layout=mode(record.kind,container.clientWidth,container.clientHeight)}
  function observe(container,content,kind){content.style.position='absolute';content.style.inset='0';content.style.width='100%';content.style.height='100%';records.set(container,{kind});observer.observe(container);update(container)}
  function disconnect(){observer.disconnect();records.clear()}
  return {observe,update,disconnect};
 }
 root.IslandFit={mode,create};
})(typeof window==='undefined'?globalThis:window);

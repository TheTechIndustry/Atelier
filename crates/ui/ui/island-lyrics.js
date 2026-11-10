(function(root){
 function parse(raw){
  const lines=[];
  for(const row of String(raw||'').slice(0,100000).split(/\r?\n/)){
   const prefix=row.match(/^(?:\[\d{1,3}:\d{2}(?:\.\d{1,3})?\])+/);
   const content=prefix?row.slice(prefix[0].length).trim():'';
   if(!content)continue;
   for(const match of prefix[0].matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g))lines.push({time:Number(match[1])*60+Number(match[2])+Number('0.'+(match[3]||'0')),text:content});
  }
  return lines.sort((a,b)=>a.time-b.time);
 }
 function create(invoke,onChange){
  let key='',state={status:'idle'},generation=0;
  const cache=new Map();
  function update(track,enabled){
   if(!enabled){key='';generation++;state={status:'idle'};return state}
   const title=String(track?.title||'').trim(),artist=String(track?.artist||'').trim();
   if(!title||!artist){key='';generation++;state={status:'waiting'};return state}
   const next=JSON.stringify([title,artist,track?.album||'',Math.round(track?.duration||0)]);
   if(next===key&&(state.status!=='unavailable'||Date.now()-(cache.get(next)?.time||0)<60000))return state;
   key=next;const request=++generation,cached=cache.get(key);
   if(cached&&Date.now()-cached.time<(cached.state.status==='unavailable'?60000:300000)){state=cached.state;return state}
   state={status:'loading'};
   Promise.resolve().then(()=>invoke('island_lyrics',{title,artist,album:track?.album||null,duration:Number(track?.duration)||null})).then(record=>{
    const synced=parse(record?.synced),plain=String(record?.plain||'').slice(0,100000).trim();
    const result=record?.instrumental?{status:'instrumental'}:synced.length?{status:'synced',lines:synced}:plain?{status:'plain',text:plain}:{status:'unavailable'};
    cache.set(next,{time:Date.now(),state:result});if(cache.size>20)cache.delete(cache.keys().next().value);
    if(request===generation&&next===key){state=result;onChange?.()}
   }).catch(()=>{const result={status:'unavailable'};cache.set(next,{time:Date.now(),state:result});if(cache.size>20)cache.delete(cache.keys().next().value);if(request===generation&&next===key){state=result;onChange?.()}});
   return state;
  }
  return {update};
 }
 function current(lines,position){let index=-1;for(let i=0;i<lines.length;i++){if(lines[i].time>Number(position||0))break;index=i}return index}
 root.IslandLyrics={parse,create,current};
})(typeof window==='undefined'?globalThis:window);

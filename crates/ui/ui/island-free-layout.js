(function(root){
 const SIZE=100;
 const LIMITS={
  media:{minW:25,minH:25,maxW:100,maxH:100},
  actions:{minW:20,minH:20,maxW:100,maxH:100},
  audio:{minW:18,minH:18,maxW:100,maxH:100},
  calendar:{minW:20,minH:25,maxW:100,maxH:100},
  clock:{minW:15,minH:15,maxW:100,maxH:100},
  battery:{minW:15,minH:15,maxW:100,maxH:100},
  system:{minW:18,minH:18,maxW:100,maxH:100},
  disk:{minW:18,minH:18,maxW:100,maxH:100},
  network:{minW:18,minH:18,maxW:100,maxH:100},
  weather:{minW:18,minH:18,maxW:100,maxH:100},
  note:{minW:18,minH:18,maxW:100,maxH:100},
  countdown:{minW:15,minH:15,maxW:100,maxH:100}
 };
 function clamp(item){
  const lim=LIMITS[item.kind]||{minW:10,minH:10,maxW:SIZE,maxH:SIZE};
  const minW=lim.minW,maxW=lim.maxW,minH=lim.minH,maxH=lim.maxH;
  const w=Math.max(minW,Math.min(maxW,Math.min(SIZE,Math.round(item.w)||minW)));
  const h=Math.max(minH,Math.min(maxH,Math.min(SIZE,Math.round(item.h)||minH)));
  return {...item,w,h,x:Math.max(0,Math.min(SIZE-w,Math.round(item.x)||0)),y:Math.max(0,Math.min(SIZE-h,Math.round(item.y)||0))};
 }
 function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
 function valid(layout,item){return !layout.some(other=>other.kind!==item.kind&&overlaps(other,item))}
 function findSpace(layout,kind,w,h){const xs=[...new Set([0,...layout.map(item=>item.x+item.w)])].sort((a,b)=>a-b),ys=[...new Set([0,...layout.map(item=>item.y+item.h)])].sort((a,b)=>a-b);for(const y of ys)for(const x of xs){if(x+w>SIZE||y+h>SIZE)continue;const item={kind,x,y,w,h};if(valid(layout,item))return item}return null}
 root.IslandFreeLayout={SIZE,LIMITS,clamp,overlaps,valid,findSpace};
})(typeof window==='undefined'?globalThis:window);

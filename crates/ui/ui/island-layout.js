(function(root){
 const SIZE=12;
 function clamp(item){const w=Math.max(1,Math.min(SIZE,Math.round(item.w)||1)),h=Math.max(1,Math.min(SIZE,Math.round(item.h)||1));return {...item,w,h,x:Math.max(0,Math.min(SIZE-w,Math.round(item.x)||0)),y:Math.max(0,Math.min(SIZE-h,Math.round(item.y)||0))}}
 function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
 function valid(layout,item){return !layout.some(other=>other.kind!==item.kind&&overlaps(other,item))}
 function findSpace(layout,kind,w,h){for(let y=0;y<=SIZE-h;y++)for(let x=0;x<=SIZE-w;x++){const item={kind,x,y,w,h};if(valid(layout,item))return item}return null}
 root.IslandLayout={SIZE,clamp,overlaps,valid,findSpace};
})(typeof window==='undefined'?globalThis:window);

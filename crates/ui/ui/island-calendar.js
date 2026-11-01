(function(root){
 function monthView(year,month,today=new Date(),locale){
  const first=new Date(year,month,1),last=new Date(first.getFullYear(),first.getMonth()+1,0),start=(first.getDay()+6)%7;
  const weekdays=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(locale,{weekday:'narrow'}).format(new Date(2024,0,1+i)));
  return {label:first.toLocaleDateString(locale,{month:'long',year:'numeric'}),weekdays,days:[...Array(start).fill(null),...Array.from({length:last.getDate()},(_,i)=>({day:i+1,today:first.getFullYear()===today.getFullYear()&&first.getMonth()===today.getMonth()&&i+1===today.getDate()}))]};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={monthView};else root.IslandCalendar={monthView};
})(typeof window==='undefined'?globalThis:window);

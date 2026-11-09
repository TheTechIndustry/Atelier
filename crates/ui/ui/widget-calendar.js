(typeof window==='undefined'?globalThis:window).WidgetCalendar=(()=>{
  const root=typeof window==='undefined'?globalThis:window;
  function registerZone(ICAL,id){
    if(ICAL.TimezoneService.has(id))return;
    let formatter;
    try{formatter=new Intl.DateTimeFormat('en-US-u-ca-iso8601-nu-latn',{timeZone:id,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})}catch{throw Error('Unknown calendar timezone: '+id)}
    const stamp=parts=>{const date=new Date(0);date.setUTCFullYear(parts.year,parts.month-1,parts.day);date.setUTCHours(parts.hour||0,parts.minute||0,parts.second||0,0);return date.getTime()};
    const offset=utc=>{const parts={};for(const p of formatter.formatToParts(new Date(utc)))if(p.type!=='literal')parts[p.type]=Number(p.value);return (stamp(parts)-utc)/1000};
    const zone=new ICAL.Timezone({tzid:id});
    zone.utcOffset=time=>{
      const naive=stamp(time);
      if(time.zone!==zone)return offset(naive);
      const candidates=[...new Set([offset(naive-129600000),offset(naive),offset(naive+129600000)])].map(o=>naive-o*1000).filter(utc=>utc+offset(utc)*1000===naive);
      return candidates.length?(naive-Math.min(...candidates))/1000:offset(naive-129600000);
    };
    ICAL.TimezoneService.register(id,zone);
  }
  function nextEvent(source,nowMs=Date.now()){
    const ICAL=root.ICAL;
    if(!ICAL)throw Error('Calendar parser unavailable');
    if(typeof source!=='string'||source.length>1048576||!Number.isFinite(nowMs))throw Error('Invalid calendar input');
    const calendar=new ICAL.Component(ICAL.parse(source));
    if(calendar.name!=='vcalendar')throw Error('The feed is not an iCalendar');
    ICAL.TimezoneService.reset();
    for(const component of calendar.getAllSubcomponents('vtimezone')){const zone=new ICAL.Timezone(component);ICAL.TimezoneService.register(zone.tzid,zone)}
    const referenced=new Set();
    const visit=component=>{for(const prop of component.getAllProperties()){const id=prop.getParameter('tzid');if(id)referenced.add(id)}for(const child of component.getAllSubcomponents())visit(child)};
    visit(calendar);
    if(referenced.size>64)throw Error('Calendar has too many timezones');
    for(const id of referenced)registerZone(ICAL,id);
    const selected=new Map();
    for(const comp of calendar.getAllSubcomponents('vevent')){
      const uid=comp.getFirstPropertyValue('uid');
      if(typeof uid!=='string'||!uid)throw Error('Calendar event UID is missing');
      const id=uid+'\n'+(comp.getFirstPropertyValue('recurrence-id')?.toString()||''),previous=selected.get(id);
      if(!previous||Number(comp.getFirstPropertyValue('sequence')||0)>=Number(previous.getFirstPropertyValue('sequence')||0))selected.set(id,comp);
    }
    if(selected.size>10000)throw Error('Calendar has too many events');
    const events=[...selected.values()].map(comp=>new ICAL.Event(comp,{exceptions:[],strictExceptions:true}));
    const exceptions=new Map();
    for(const event of events)if(event.isRecurrenceException()){const list=exceptions.get(event.uid)||[];list.push(event);exceptions.set(event.uid,list)}
    let best=null,iterations=0;
    const consider=(item,start,end)=>{
      if(String(item.component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED'||!start)return;
      const from=start.toJSDate().getTime(),until=end?.toJSDate().getTime()??from;
      if(!Number.isFinite(from)||!Number.isFinite(until)||until<from)throw Error('Invalid calendar event time');
      if(from<nowMs&&until<=nowMs)return;
      const candidate={title:String(item.summary||'Untitled event'),start:from,end:until,allDay:start.isDate};
      if(!best||Math.max(from,nowMs)<Math.max(best.start,nowMs))best=candidate;
    };
    for(const event of events){
      if(String(event.component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED')continue;
      if(event.isRecurrenceException()){consider(event,event.startDate,event.endDate);continue}
      if(!event.startDate)throw Error('Calendar event DTSTART is missing');
      let backward=0;const ranges=[];
      for(const exception of exceptions.get(event.uid)||[]){
        if(exception.modifiesFuture())ranges.push(exception);
        if(String(exception.component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED'){
          const value=JSON.parse(JSON.stringify(exception.component.getFirstProperty('recurrence-id').toJSON()));value[0]='exdate';event.component.addProperty(new ICAL.Property(value));
        }else{
          event.relateException(exception);
          if(exception.modifiesFuture())backward=Math.max(backward,(exception.recurrenceId.toUnixTime()-exception.startDate.toUnixTime())*1000);
        }
      }
      if(!event.isRecurring()){consider(event,event.startDate,event.endDate);continue}
      ranges.sort((a,b)=>a.recurrenceId.compare(b.recurrenceId));
      const iterator=event.iterator();
      while(true){
        if(++iterations>50000)throw Error('Calendar recurrence limit exceeded');
        const occurrence=iterator.next();if(!occurrence)break;
        const range=ranges.filter(item=>item.recurrenceId.compare(occurrence)<=0).at(-1);
        if(range&&String(range.component.getFirstPropertyValue('status')).toUpperCase()==='CANCELLED'){
          if(ranges.at(-1)===range)break;
          continue;
        }
        const raw=occurrence.toJSDate().getTime();
        if(best&&raw>Math.max(best.start,nowMs)+backward+86400000)break;
        const detail=event.getOccurrenceDetails(occurrence);consider(detail.item,detail.startDate,detail.endDate);
      }
    }
    return best;
  }
  return {nextEvent};
})();

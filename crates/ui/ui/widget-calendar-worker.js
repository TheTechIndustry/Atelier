importScripts('vendor/ical.min.js','widget-calendar.js');
onmessage=event=>{try{postMessage({result:WidgetCalendar.nextEvent(event.data.source,event.data.now)})}catch(error){postMessage({error:String(error.message||error)})}};

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({window:{},Intl,Date});
vm.runInContext(fs.readFileSync('crates/ui/ui/vendor/ical.min.js','utf8'),context);
vm.runInContext(fs.readFileSync('crates/ui/ui/widget-calendar.js','utf8'),context);
const next=(events,now,extra='')=>context.window.WidgetCalendar.nextEvent('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'+extra+events+'END:VCALENDAR\r\n',new Date(now).getTime());
const event=(uid,body)=>'BEGIN:VEVENT\r\nUID:'+uid+'\r\n'+body+'END:VEVENT\r\n';
test('calendar unfolds and unescapes summaries and keeps active events',()=>{
 const result=next(event('one','DTSTART:20261108T100000Z\r\nDTEND:20261108T110000Z\r\nSUMMARY:Review\\, alpha\r\n  team\r\n'),'2026-11-08T10:30:00Z');
 assert.equal(result.title,'Review, alpha team');assert.equal(result.start,Date.parse('2026-11-08T10:00:00Z'));
});
test('weekly recurrence respects COUNT and EXDATE',()=>{
 const body=event('weekly','DTSTART:20261020T090000Z\r\nDURATION:PT1H\r\nRRULE:FREQ=WEEKLY;COUNT=4\r\nEXDATE:20261103T090000Z\r\nSUMMARY:Weekly\r\n');
 assert.equal(next(body,'2026-10-30T00:00:00Z').start,Date.parse('2026-11-10T09:00:00Z'));
 assert.equal(next(body,'2026-11-11T00:00:00Z'),null);
});
test('moved and canceled occurrences are related only to their own UID',()=>{
 const source=event('series','DTSTART:20261020T090000Z\r\nDURATION:PT1H\r\nRRULE:FREQ=WEEKLY;COUNT=5\r\nSUMMARY:Original\r\n')+
 event('series','RECURRENCE-ID:20261027T090000Z\r\nSTATUS:CANCELLED\r\n')+
 event('series','RECURRENCE-ID:20261103T090000Z\r\nDTSTART:20261105T140000Z\r\nDTEND:20261105T150000Z\r\nSUMMARY:Moved\r\n')+
 event('other','RECURRENCE-ID:20261110T090000Z\r\nSTATUS:CANCELLED\r\n');
 const result=next(source,'2026-10-25T00:00:00Z');assert.equal(result.title,'Moved');assert.equal(result.start,Date.parse('2026-11-05T14:00:00Z'));
 assert.equal(next(source,'2026-11-06T00:00:00Z').start,Date.parse('2026-11-10T09:00:00Z'));
});
test('a delayed occurrence does not hide an earlier normal occurrence',()=>{
 const source=event('daily','DTSTART:20261108T090000Z\r\nDURATION:PT1H\r\nRRULE:FREQ=DAILY;COUNT=5\r\nSUMMARY:Normal\r\n')+
 event('daily','RECURRENCE-ID:20261108T090000Z\r\nDTSTART:20261208T090000Z\r\nDTEND:20261208T100000Z\r\nSUMMARY:Delayed\r\n');
 const result=next(source,'2026-11-08T00:00:00Z');assert.equal(result.title,'Normal');assert.equal(result.start,Date.parse('2026-11-09T09:00:00Z'));
});
test('THISANDFUTURE changes and cancellations affect following instances',()=>{
 const master=event('range','DTSTART:20261101T090000Z\r\nDURATION:PT1H\r\nRRULE:FREQ=DAILY\r\nSUMMARY:Original\r\n');
 const moved=event('range','RECURRENCE-ID;RANGE=THISANDFUTURE:20261103T090000Z\r\nDTSTART:20261103T110000Z\r\nDTEND:20261103T120000Z\r\nSUMMARY:Later\r\n');
 const canceled=event('range','RECURRENCE-ID;RANGE=THISANDFUTURE:20261105T090000Z\r\nSTATUS:CANCELLED\r\n');
 assert.equal(next(master+moved,'2026-11-04T00:00:00Z').start,Date.parse('2026-11-04T11:00:00Z'));
 assert.equal(next(master+moved+canceled,'2026-11-06T00:00:00Z'),null);
});
test('IANA timezones follow DST across recurring occurrences',()=>{
 const source=event('kyiv','DTSTART;TZID=Europe/Kyiv:20261024T090000\r\nDURATION:PT1H\r\nRRULE:FREQ=DAILY;COUNT=3\r\nSUMMARY:Local morning\r\n');
 assert.equal(next(source,'2026-10-24T18:00:00Z').start,Date.parse('2026-10-25T07:00:00Z'));
});
test('DST folds use the first instant and gaps use the pre-transition offset',()=>{
 assert.equal(next(event('fold','DTSTART;TZID=America/New_York:20261101T013000\r\nSUMMARY:Fold\r\n'),'2026-10-31T00:00:00Z').start,Date.parse('2026-11-01T05:30:00Z'));
 assert.equal(next(event('gap','DTSTART;TZID=America/New_York:20260308T023000\r\nSUMMARY:Gap\r\n'),'2026-03-01T00:00:00Z').start,Date.parse('2026-03-08T07:30:00Z'));
});
test('embedded VTIMEZONE definitions take priority over IANA fallbacks',()=>{
 const zone='BEGIN:VTIMEZONE\r\nTZID:Custom/Office\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:+0230\r\nTZOFFSETTO:+0230\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n';
 assert.equal(next(event('custom','DTSTART;TZID=Custom/Office:20261108T090000\r\nSUMMARY:Office\r\n'),'2026-11-08T00:00:00Z',zone).start,Date.parse('2026-11-08T06:30:00Z'));
});
test('all-day events remain visible today and floating times use local time',()=>{
 const now=new Date(2026,10,8,12).getTime();
 const source=event('date','DTSTART;VALUE=DATE:20261108\r\nDTEND;VALUE=DATE:20261109\r\nSUMMARY:Holiday\r\n');
 const result=context.window.WidgetCalendar.nextEvent('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'+source+'END:VCALENDAR\r\n',now);
 assert.equal(result.allDay,true);assert.equal(result.start,new Date(2026,10,8).getTime());
 assert.equal(next(event('float','DTSTART:20261109T090000\r\nSUMMARY:Floating\r\n'),'2026-11-08T00:00:00Z').start,new Date(2026,10,9,9).getTime());
});
test('RDATE and monthly BYSETPOS recurrences are expanded',()=>{
 assert.equal(next(event('rdate','DTSTART:20261101T090000Z\r\nRDATE:20261110T090000Z,20261120T090000Z\r\nSUMMARY:Extra\r\n'),'2026-11-08T00:00:00Z').start,Date.parse('2026-11-10T09:00:00Z'));
 assert.equal(next(event('monthly','DTSTART:20261102T090000Z\r\nRRULE:FREQ=MONTHLY;COUNT=2;BYDAY=MO;BYSETPOS=1\r\nSUMMARY:Monthly\r\n'),'2026-11-03T00:00:00Z').start,Date.parse('2026-12-07T09:00:00Z'));
});
test('newer canceled revisions win and malformed zones fail explicitly',()=>{
 assert.equal(next(event('one','DTSTART:20261109T090000Z\r\nSEQUENCE:1\r\nSUMMARY:Old\r\n')+event('one','STATUS:CANCELLED\r\nSEQUENCE:2\r\n'),'2026-11-08T00:00:00Z'),null);
 assert.throws(()=>next(event('bad','DTSTART;TZID=Not/AZone:20261109T090000\r\n'),'2026-11-08T00:00:00Z'),/timezone/);
 assert.throws(()=>next(event('too-frequent','DTSTART:20261101T000000Z\r\nRRULE:FREQ=SECONDLY\r\n'),'2026-11-08T00:00:00Z'),/recurrence limit/);
});

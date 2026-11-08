const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('crates/ui/ui/dock.js','utf8');
const measureSource=source.slice(source.indexOf('async function measure(){'),source.indexOf('let backdropSignature='));
const syncSource=source.slice(source.indexOf('function syncWidgetFrame('),source.indexOf('function renderDockWidgets('));
test('widget frame follows light and vertical dock changes',()=>{
 let light=true;const states={};const root={classList:{toggle:(name,value)=>states[name]=value}};const context=vm.createContext({cfg:{position:'left'},document:{documentElement:{classList:{contains:()=>light}}}});
 vm.runInContext(syncSource,context);context.syncWidgetFrame({contentDocument:{documentElement:root}});
 assert.equal(states['light-compact'],true);assert.equal(states['vertical-compact'],true);
 light=false;context.cfg.position='bottom';context.syncWidgetFrame({contentDocument:{documentElement:root}});
 assert.equal(states['light-compact'],false);assert.equal(states['vertical-compact'],false);
});
for(const vertical of [false,true])test('dock measures actual widget sizes '+(vertical?'vertically':'horizontally'),async()=>{
 const calls=[];const cfg={position:vertical?'left':'bottom',icon_size:32,spacing:4,padding:8,show_start:false,show_search:false,show_studio:false,widgets:['media','notes'],dock_width:0,full_width:false};
 const context=vm.createContext({cfg,items:[],invoke:async(cmd,args)=>calls.push({cmd,args}),menuItem:null,dragId:null,collapsed:false,visibleSize:{},document:{documentElement:{},querySelectorAll:()=>[{offsetWidth:200,offsetHeight:130},{offsetWidth:130,offsetHeight:90}]},getComputedStyle:()=>({getPropertyValue:()=> '34'}),window:{screen:{availWidth:1600,availHeight:1000}},syncBackdrop:async()=>{},error:e=>{throw e}});
 vm.runInContext(measureSource,context);await context.measure();const actual=calls[0].args;
 assert.equal(vertical?actual.height:actual.width,vertical?294:404);
});

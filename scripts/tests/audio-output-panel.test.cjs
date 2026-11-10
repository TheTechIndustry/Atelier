const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('custom audio menu displays actual devices and switches the selected output',async()=>{
 const calls=[],events={},list={children:[],replaceChildren(){this.children=[]},append(child){this.children.push(child)}},status={};let closed=false;
 const document={getElementById:id=>id==='list'?list:status,createElement:()=>({children:[],setAttribute(){},append(child){this.children.push(child)}}),addEventListener(){},documentElement:{style:{setProperty(){}}},body:{classList:{toggle(){}}}};
 const invoke=async(name,args)=>{calls.push({name,args});if(name==='get_dock_snapshot')return{config:{tint:'#20212b',opacity:90,material:'solid'}};return[{id:'a',name:'Speakers',selected:true},{id:'b',name:'Headphones',selected:false}]};
 const window={addEventListener:(name,fn)=>events[name]=fn,__TAURI__:{core:{invoke},window:{getCurrentWindow:()=>({close:async()=>{closed=true}})}}};
 const context=vm.createContext({window,document,location:{search:'?communications=true'},URLSearchParams});vm.runInContext(fs.readFileSync('crates/ui/ui/audio-output-panel.js','utf8'),context);await new Promise(setImmediate);
 assert.equal(list.children.length,2);assert.equal(list.children[0].children[0].textContent,'Speakers');assert.equal(list.children[0].children[1].textContent,'✓');await list.children[1].onclick();const selection=calls.find(call=>call.args?.deviceId==='b');assert.equal(selection.name,'widget_audio_outputs');assert.equal(selection.args.communications,true);assert.equal(closed,true);
});

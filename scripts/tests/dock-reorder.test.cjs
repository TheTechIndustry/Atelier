const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('crates/ui/ui/dock.js','utf8').split('let reorder=null,suppressClickUntil=0;')[1].split('async function activate')[0];
function fixture(position='bottom',reduced=true){
 const classes={add(){},remove(){}};const apps={children:[]};const elements={};const animations=[];
 const dock={scrollLeft:0,scrollTop:0,getBoundingClientRect:()=>({left:0,top:0,right:600,bottom:600})};
 const parent={hidden:false};
 function add(key,type,hidden=false){
  const id=key.split(':')[1];const button={id:type==='system'?id:'',hidden,parentElement:parent,dataset:{orderKey:key,...(type==='app'?{id}:type==='widget'?{widgetId:id}:{})},style:{order:'0',translate:''},classList:{...classes,contains(name){return name===(type==='app'?'app':type==='widget'?'dock-capsule':'system-button')}},blur(){},animate(frames,options){animations.push({key:this.dataset.orderKey,frames,options});return {cancel(){}}},setPointerCapture(){this.captured=true},hasPointerCapture(){return this.captured},releasePointerCapture(){this.captured=false},getBoundingClientRect(){const ordered=Object.values(elements).filter(el=>!el.hidden).sort((a,b)=>Number(a.style.order)-Number(b.style.order));const n=ordered.indexOf(this);const trans=(this.style.translate||'0px 0px').split(' ').map(parseFloat);return{left:n*40+(trans[0]||0),top:n*40+(trans[1]||0),width:40,height:40}}};elements[key]=button;if(type!=='system')apps.children.push(button);return button;
 }
 for(const id of ['start','search','divider','tray','language','network','volume','clock','studio'])add('system:'+id,'system',['tray','language','network','volume'].includes(id));
 for(const key of ['app:a','widget:timer','app:b'])add(key,key.startsWith('app:')?'app':'widget');
 const calls=[];const context=vm.createContext({Date,Math,Map,clearTimeout,cfg:{position,item_order:['app:a','widget:timer','app:b']},dragId:null,hideTimer:null,document:{body:{classList:classes},addEventListener(){}},window:{addEventListener(){},matchMedia:()=>({matches:reduced})},$:id=>id==='apps'?apps:id==='dock'?dock:elements['system:'+id]||{hidden:false},invoke:async(cmd,args)=>calls.push({cmd,args}),refresh:async()=>{},error(e){throw e}});
 vm.runInContext('let reorder=null,suppressClickUntil=0;'+source,context);context.applyItemOrder();
 const event=(x,y,target)=>({pointerId:1,button:0,clientX:x,clientY:y,currentTarget:target,preventDefault(){}});
 return{context,apps,dock,calls,event,elements,animations};
}
function visible(f){return Array.from(f.context.orderedItems()).filter(e=>!e.hidden).map(e=>e.dataset.orderKey)}
for(const position of ['bottom','left'])test('widgets can move past Start, Search, and the divider: '+position,async()=>{
 const f=fixture(position),widget=f.elements['widget:timer'];let rect=widget.getBoundingClientRect();f.context.startReorder(f.event(rect.left+20,rect.top+20,widget));f.context.moveReorder(f.event(2,2,widget));await f.context.finishReorder(f.event(2,2,widget));
 assert.equal(visible(f)[0],'widget:timer');assert.equal(f.calls[0].cmd,'dock_items_reorder');assert.ok(Array.from(f.calls[0].args.ids).includes('system:tray'));
 rect=widget.getBoundingClientRect();f.context.startReorder(f.event(rect.left+20,rect.top+20,widget));f.context.moveReorder(f.event(400,400,widget));await f.context.finishReorder(f.event(400,400,widget));
 assert.ok(visible(f).indexOf('widget:timer')>visible(f).indexOf('system:divider'));
});
test('apps and system controls move in the same order',async()=>{const f=fixture();const app=f.elements['app:a'],search=f.elements['system:search'];let r=app.getBoundingClientRect();f.context.startReorder(f.event(r.left+20,r.top+20,app));f.context.moveReorder(f.event(0,0,app));await f.context.finishReorder(f.event(0,0,app));assert.equal(visible(f)[0],'app:a');r=search.getBoundingClientRect();f.context.startReorder(f.event(r.left+20,r.top+20,search));f.context.moveReorder(f.event(400,400,search));await f.context.finishReorder(f.event(400,400,search));assert.equal(visible(f).at(-1),'system:search')});
test('click below threshold does not save or suppress clicks',async()=>{const f=fixture(),el=f.elements['app:a'],r=el.getBoundingClientRect();f.context.startReorder(f.event(r.left+20,r.top+20,el));f.context.moveReorder(f.event(r.left+22,r.top+22,el));await f.context.finishReorder(f.event(r.left+22,r.top+22,el));assert.equal(f.calls.length,0);assert.equal(vm.runInContext('suppressClickUntil',f.context),0)});
test('cancel restores saved order and clears visual translation',async()=>{const f=fixture(),before=visible(f),el=f.elements['app:a'],r=el.getBoundingClientRect();f.context.startReorder(f.event(r.left+20,r.top+20,el));f.context.moveReorder(f.event(400,400,el));assert.notEqual(el.style.translate,'');await f.context.finishReorder(f.event(400,400,el),true);assert.equal(f.calls.length,0);assert.equal(el.style.translate,'');assert.deepEqual(visible(f),before)});

test('dragged icon follows the pointer and other items animate into place',async()=>{const f=fixture('bottom',false),el=f.elements['app:a'],r=el.getBoundingClientRect();f.context.startReorder(f.event(r.left+20,r.top+20,el));f.context.moveReorder(f.event(400,400,el));assert.notEqual(el.style.translate,'');assert.ok(f.animations.some(a=>a.key!=='app:a'));await f.context.finishReorder(f.event(400,400,el));assert.equal(el.style.translate,'');assert.ok(f.animations.some(a=>a.key==='app:a'&&a.options.duration===160))});

test('edge scrolling follows the latest pointer position and stops on release',async()=>{const f=fixture(),el=f.elements['app:a'],r=el.getBoundingClientRect();let next,cancelled=false;f.context.window.requestAnimationFrame=cb=>{next=cb;return 1};f.context.window.cancelAnimationFrame=()=>{cancelled=true};f.context.startReorder(f.event(r.left+20,r.top+20,el));f.context.moveReorder(f.event(590,20,el));assert.equal(f.dock.scrollLeft,14);const pending=next;f.context.moveReorder(f.event(300,20,el));pending();assert.equal(f.dock.scrollLeft,14);await f.context.finishReorder(f.event(300,20,el));assert.equal(f.context.dragId,null)});

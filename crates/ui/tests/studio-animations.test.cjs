const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

function fixture(){
  const elements=new Map(),timers=[];
  class MockElement {
    constructor(id=''){
      this.id=id;
      this.value='';
      this.checked=false;
      this.className='';
      this.classList={
        values:new Set(),
        add:(...c)=>c.forEach(x=>this.classList.values.add(x)),
        remove:(...c)=>c.forEach(x=>this.classList.values.delete(x)),
        contains:x=>this.classList.values.has(x)
      };
      this.style={
        props:new Map(),
        setProperty(k,v){this.props.set(k,v)},
        getProperty(k){return this.props.get(k)}
      };
      this.offsetWidth=100;
      this.offsetHeight=40;
      this.offsetLeft=0;
      this.children=[];
      this.events=new Map();
    }
    addEventListener(k,fn){this.events.set(k,fn)}
    getBoundingClientRect(){return {left:0,top:0,right:200,bottom:50,width:200,height:50}}
  }

  const get=id=>{
    if(!elements.has(id))elements.set(id,new MockElement(id));
    return elements.get(id);
  };

  const initial={
    enabled:true,
    window_transitions:true,
    window_effect:'dock_expand',
    window_duration:240,
    window_easing:'spring',
    native_min_max_animation:true,
    dock_bounce:'launch_only',
    dock_bounce_count:2,
    dock_hover_wave:true,
    dock_hover_scale:135,
    dock_click_feedback:'bounce'
  };

  const saves=[];
  const invoke=async(name,args)=>{
    if(name==='get_animations_config') return structuredClone(initial);
    if(name==='set_animations_config'){
      saves.push(args.config);
      return args.config;
    }
    return {};
  };

  const miniDock=new MockElement('anim-mini-dock');
  const miniIcons=[new MockElement('i1'),new MockElement('i2'),new MockElement('i3')];
  miniDock.children=miniIcons;

  const window={
    __TAURI__:{core:{invoke},event:{listen(){}}},
    addEventListener(){}
  };
  const document={
    getElementById:get,
    querySelectorAll:(q)=>q==='.anim-mini-icon'?miniIcons:[]
  };

  const context=vm.createContext({
    window,
    document,
    structuredClone,
    setTimeout:(fn,ms)=>{timers.push(fn);return timers.length},
    clearTimeout(){},
    Promise,
    Number,
    Object,
    Math,
    Boolean
  });

  vm.runInContext(fs.readFileSync(path.join(__dirname,'../ui/studio-animations.js'),'utf8'),context);
  return {get,timers,saves,miniIcons,miniDock};
}

const turn=()=>new Promise(setImmediate);

test('loads animation configuration and updates inputs correctly',async()=>{
  const f=fixture();
  await turn();
  assert.equal(f.get('anim-window-transitions').checked,true);
  assert.equal(f.get('anim-window-effect').value,'dock_expand');
  assert.equal(f.get('anim-window-duration').value,240);
  assert.equal(f.get('anim-dock-bounce').value,'launch_only');
  assert.equal(f.get('anim-dock-hover-scale').value,135);
});

test('changing window animation effect and duration updates preview and saves',async()=>{
  const f=fixture();
  await turn();
  const effect=f.get('anim-window-effect');
  effect.value='genie';
  effect.events.get('input')?.();
  const dur=f.get('anim-window-duration');
  dur.value=320;
  dur.events.get('input')?.();

  f.timers.at(-1)();
  await turn();
  assert.equal(f.saves.at(-1).window_effect,'genie');
  assert.equal(f.saves.at(-1).window_duration,320);

  const preview=f.get('anim-preview-window');
  assert.equal(preview.style.props.get('--anim-duration'),'320ms');
});

test('test buttons trigger minimize and restore animation classes',async()=>{
  const f=fixture();
  await turn();
  const preview=f.get('anim-preview-window');
  const btnMin=f.get('anim-test-minimize');
  btnMin.onclick();
  assert.equal(preview.classList.contains('anim-minimizing'),true);
  assert.equal(preview.classList.contains('effect-dock_expand'),true);

  const btnRestore=f.get('anim-test-restore');
  btnRestore.onclick();
  assert.equal(preview.classList.contains('anim-restoring'),true);
});

test('clicking mini dock icon triggers configured feedback animation',async()=>{
  const f=fixture();
  await turn();
  const icon=f.miniIcons[0];
  icon.onclick();
  assert.equal(icon.classList.contains('anim-jump'),true);

  f.get('anim-dock-click-feedback').value='press';
  f.get('anim-dock-click-feedback').events.get('input')?.();
  f.timers.at(-1)();
  await turn();

  icon.onclick();
  assert.equal(icon.classList.contains('anim-press'),true);
});


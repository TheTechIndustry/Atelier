const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');

function fixture(){
  const elements=new Map(),timers=[];
  class MockElement {
    constructor(id=''){
      this.id=id;
      this.value='';
      this.checked=false;
      this.className='';
      this.textContent='';
      this.dataset={};
      this.style={
        borderRadius:'',
        border:'',
        opacity:'',
        background:'',
        color:''
      };
      this.events=new Map();
    }
    addEventListener(k,fn){this.events.set(k,fn)}
  }

  const get=id=>{
    if(!elements.has(id))elements.set(id,new MockElement(id));
    return elements.get(id);
  };

  const initial={
    enabled:true,
    scope:'system_only',
    backdrop:'mica',
    opacity:100,
    inactive_opacity:85,
    corner_preference:'rounded',
    border_color:'#4f46e5',
    border_width:2,
    titlebar_mode:'dark',
    titlebar_color:'default',
    target_explorer:true,
    target_dialogs:true,
    target_tools:true,
    target_terminal:false,
    target_settings:true,
    target_flyouts:true,
    exclude_fullscreen_games:true,
    excluded_apps:['cyberpunk2077.exe','discord.exe']
  };

  const saves=[];
  let restored=false;
  const invoke=async(name,args)=>{
    if(name==='get_system_appearance') return structuredClone(initial);
    if(name==='set_system_appearance'){
      saves.push(args.config);
      return args.config;
    }
    if(name==='restore_system_appearance'){
      restored=true;
      initial.enabled=false;
      return {};
    }
    return {};
  };

  const window={
    __TAURI__:{core:{invoke},event:{listen(){}}},
    addEventListener(){}
  };
  const document={getElementById:get};

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
    Boolean,
    Array
  });

  vm.runInContext(fs.readFileSync(path.join(__dirname,'../ui/studio-appearance.js'),'utf8'),context);
  return {get,timers,saves,isRestored:()=>restored};
}

const turn=()=>new Promise(setImmediate);

test('loads appearance configuration and populates controls',async()=>{
  const f=fixture();
  await turn();
  assert.equal(f.get('app-enabled').checked,true);
  assert.equal(f.get('app-scope').value,'system_only');
  assert.equal(f.get('app-target-explorer').checked,true);
  assert.equal(f.get('app-target-terminal').checked,false);
  assert.equal(f.get('app-exclude-fullscreen').checked,true);
  assert.equal(f.get('app-excluded-apps').value,'cyberpunk2077.exe, discord.exe');
  assert.equal(f.get('app-backdrop').value,'mica');
  assert.equal(f.get('app-opacity').value,100);
  assert.equal(f.get('app-inactive-opacity').value,85);
  assert.equal(f.get('app-corner-preference').value,'rounded');
  assert.equal(f.get('app-border-color').value,'#4f46e5');
  assert.equal(f.get('app-border-width').value,2);
});

test('changing backdrop and opacity updates preview and saves config',async()=>{
  const f=fixture();
  await turn();
  const backdrop=f.get('app-backdrop');
  backdrop.value='acrylic';
  backdrop.events.get('input')?.();

  const opacity=f.get('app-opacity');
  opacity.value=90;
  opacity.events.get('input')?.();

  f.timers.at(-1)();
  await turn();

  assert.equal(f.saves.at(-1).backdrop,'acrylic');
  assert.equal(f.saves.at(-1).opacity,90);

  const card=f.get('app-preview-card');
  assert.equal(card.style.opacity,'0.90');

  const body=f.get('app-preview-body');
  assert.equal(body.className,'app-preview-body material-acrylic');
});

test('preview toggle switches between active and inactive window opacity',async()=>{
  const f=fixture();
  await turn();
  const card=f.get('app-preview-card');
  assert.equal(card.style.opacity,'1.00');

  const toggle=f.get('app-preview-toggle-active');
  toggle.onclick();
  assert.equal(card.style.opacity,'0.85');
  assert.equal(toggle.textContent,'Preview Active Window');

  toggle.onclick();
  assert.equal(card.style.opacity,'1.00');
});

test('restore defaults invokes restore_system_appearance',async()=>{
  const f=fixture();
  await turn();
  const btn=f.get('app-restore-defaults');
  await btn.onclick();
  await turn();
  assert.equal(f.isRestored(),true);
});

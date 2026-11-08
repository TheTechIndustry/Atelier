const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('crates/ui/ui/studio-dock.js','utf8');
const definitions=source.slice(source.indexOf('  const presetGeometry'),source.indexOf('  function syncPreset'));
const handlers=source.slice(source.indexOf('  function preset(values)'),source.indexOf('  if(!invoke)'));
function fixture(){
 const buttons=['black','white','liquid','ios','midnight'].map(style=>({dataset:{dockStyle:style},addEventListener(name,fn){this.click=fn}}));
 const initial={enabled:true,position:'right',alignment:'start',edge_gap:4,icon_size:72,padding:20,spacing:12,widgets:['clock'],item_order:['widget:clock']};
 const context=vm.createContext({document:{querySelectorAll:selector=>selector==='[data-dock-style]'?buttons:[]},saved:initial,revision:0,controls:initial,read(){return {...context.controls}},paint(c){context.controls=c;context.saved=c},save(){context.saved={...context.controls}}});
 vm.runInContext(definitions+handlers,context);return {buttons,context};
}
test('every dock style uses Liquid dimensions and placement',()=>{
 const {buttons,context}=fixture();let baseline;
 for(const button of buttons){button.click();const c=context.saved;const geometry=[c.icon_size,c.padding,c.spacing,c.position,c.alignment,c.edge_gap,c.magnification];if(!baseline)baseline=geometry;else assert.deepEqual(geometry,baseline,button.dataset.dockStyle);assert.deepEqual(Array.from(c.widgets),['clock']);assert.deepEqual(Array.from(c.item_order),['widget:clock'])}
 assert.deepEqual(baseline,[38,9,6,'bottom','center',8,125]);
});
test('each dock preset keeps its own appearance',()=>{
 const {buttons,context}=fixture();const styles={};for(const button of buttons){button.click();styles[button.dataset.dockStyle]=[context.saved.material,context.saved.tint,context.saved.opacity]}
 assert.deepEqual(styles.liquid,['liquid','#ffffff',14]);assert.deepEqual(styles.white,['solid','#f5f5f7',96]);assert.deepEqual(styles.ios,['ios','#ffffff',20]);assert.notDeepEqual(styles.black,styles.midnight);
});

const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const ctx={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/island-layout.js'),'utf8'),ctx);const {clamp,valid,findSpace}=ctx.IslandLayout;
test('layout clamps moves and resizing to the grid',()=>{const a=clamp({kind:'clock',x:11,y:-4,w:5,h:2});assert.equal(a.x,7);assert.equal(a.y,0);assert.equal(a.w,5)});
test('layout rejects overlapping modules and finds empty space',()=>{const items=[{kind:'media',x:0,y:0,w:7,h:12}];assert.equal(valid(items,{kind:'clock',x:6,y:0,w:2,h:2}),false);const item=findSpace(items,'clock',2,2);assert.equal(item.x,7);assert.equal(item.y,0);assert.equal(valid(items,item),true)});
test('layout permits moving the existing module within its own footprint',()=>{const items=[{kind:'media',x:0,y:0,w:7,h:12}];assert.equal(valid(items,{kind:'media',x:1,y:0,w:7,h:12}),true)});

test('layout reports when a module does not fit',()=>{assert.equal(findSpace([{kind:'media',x:0,y:0,w:12,h:12}],'clock',2,2),null)});

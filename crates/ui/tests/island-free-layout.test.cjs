const test = require('node:test');
const assert = require('node:assert/strict');
require('../ui/island-free-layout.js');

const layout = globalThis.IslandFreeLayout;

test('module geometry stays within the responsive canvas', () => {
    assert.deepEqual(layout.clamp({kind:'clock',x:99,y:-5,w:25,h:120}), {kind:'clock',x:75,y:0,w:25,h:100});
});

test('space detection agrees with exhaustive placement for varied layouts', () => {
    let seed=1234;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed};
    for(let trial=0;trial<25;trial++){
        const items=[];
        for(let i=0;i<5;i++){const w=10+random()%35,h=10+random()%35,x=random()%(101-w),y=random()%(101-h);const item={kind:'k'+i,x,y,w,h};if(layout.valid(items,item))items.push(item)}
        const w=10+random()%45,h=10+random()%45;let possible=false;
        for(let y=0;y<=100-h&&!possible;y++)for(let x=0;x<=100-w;x++)if(layout.valid(items,{kind:'new',x,y,w,h})){possible=true;break}
        assert.equal(Boolean(layout.findSpace(items,'new',w,h)),possible);
    }
});

test('modules may touch but cannot overlap, and can be moved within their own bounds', () => {
    const items = [{kind:'clock',x:0,y:0,w:40,h:50}];
    assert.equal(layout.valid(items,{kind:'note',x:40,y:0,w:30,h:50}),true);
    assert.equal(layout.valid(items,{kind:'note',x:39,y:0,w:30,h:50}),false);
    assert.equal(layout.valid(items,{kind:'clock',x:10,y:0,w:40,h:50}),true);
    assert.deepEqual(layout.findSpace(items,'note',60,50),{kind:'note',x:40,y:0,w:60,h:50});
    assert.equal(layout.findSpace(items,'note',100,100),null);
});

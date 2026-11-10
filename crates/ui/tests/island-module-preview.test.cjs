const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function node(tag) {
    return {tagName:tag,children:[],style:{setProperty(k,v){this[k]=v}},textContent:'',append(...children){this.children.push(...children)}};
}
const context = {window:{},document:{createElement:node},Date,Math};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui/island-module-preview.js'),'utf8'),context);
const create = context.window.IslandModulePreview.create;
const texts = item => [item.textContent,...item.children.flatMap(texts)];
const classes = item => [item.className || '',...item.children.flatMap(classes)];
const findClass = (item, name) => item.className === name ? item : item.children.map(child => findClass(child, name)).find(Boolean);

test('artwork size changes placement and can be hidden', () => {
    const small=create('media',{item:{artwork_layout:'small'}},false);
    const large=create('media',{item:{artwork_layout:'large'}},false);
    assert.ok(findClass(small,'island-media-main').children.some(child=>child.className.startsWith('island-media-artwork')));
    assert.ok(findClass(large,'island-player-layout artwork-large artwork-visible').children[0].className.startsWith('island-media-artwork'));
    assert.ok(!classes(create('media',{item:{artwork_layout:'medium',show_artwork:false}},false)).some(name=>name.startsWith('island-media-artwork')));
});

test('synchronized lyrics render only the current and neighboring lines', () => {
    context.window.IslandLyrics={current:()=>2};
    const lines=Array.from({length:8},(_,i)=>({time:i*10,text:`Line ${i}`}));
    const card=create('media',{item:{show_lyrics:true},track:{can_seek:true,position:22},lyrics:{status:'synced',lines}},false);
    const pane=findClass(card,'island-lyrics-pane is-synced');
    assert.deepEqual(pane.children.map(row=>row.textContent),['Line 1','Line 2','Line 3']);
    assert.deepEqual(pane.children.map(row=>row.dataset.lyricTime),['10','20','30']);
});

test('weather renders an icon for its current condition', () => {
    context.window.IslandExtras={weatherSvg:code=>`<svg data-code="${code}"></svg>`};
    const card=create('weather',{weather:{code:3,city:'Kyiv',temp:18,unit:'°C'}},false);
    assert.match(findClass(card,'island-weather-icon').innerHTML,/data-code="3"/);
    assert.ok(texts(card).includes('Kyiv'));
});

test('library previews show adaptive content for each module', () => {
    for (const kind of ['media','audio','calendar','clock','battery','system','disk','network','weather','note','countdown','memory','gpu','uptime','cpu_frequency','date']) {
        const preview = create(kind,{},true);
        assert.match(preview.className,new RegExp(`island-module-${kind}`));
        assert.ok(preview.children.length > 0);
    }
    assert.ok(texts(create('media',{},true)).includes('Now Playing'));
    assert.ok(texts(create('weather',{},true)).includes('22°C'));
});

test('media and volume controls use actual values and supported actions', () => {
    const media=create('media',{item:{show_volume:true},volume:{level:53},track:{can_seek:true,duration:120,position:30}},false);
    const seek=findClass(media,'island-scrub-track'),volume=findClass(media,'island-vol-bar');
    assert.equal(seek.value,'250');
    assert.equal(seek.disabled,false);
    assert.equal(volume.value,'53');
    const standalone=create('audio',{volume:{level:72}},false);
    assert.equal(findClass(standalone,'island-volume-slider').value,'72');
    const unavailable=create('audio',{},false);
    assert.equal(findClass(unavailable,'island-volume-slider').disabled,true);
});

test('new system modules render supplied measurements', () => {
    const stats={memory:42,used:8192,total:16384,gpu:23,uptime_seconds:90000,frequency:4200};
    assert.ok(texts(create('memory',{stats},false)).includes('RAM 42%'));
    assert.ok(texts(create('gpu',{stats},false)).includes('GPU 23%'));
    assert.ok(texts(create('uptime',{stats},false)).includes('1d 1h'));
    assert.ok(texts(create('cpu_frequency',{stats},false)).includes('4.20 GHz'));
});

test('placed modules show supplied data and custom labels', () => {
    const media = texts(create('media',{track:{title:'A real track',artist:'An artist'}},false));
    assert.ok(media.includes('A real track'));
    assert.ok(texts(create('battery',{battery:{available:true,percent:42}},false)).includes('42%'));
    assert.ok(texts(create('note',{note:'My note'},false)).includes('My note'));

    const custom = texts(create('clock',{item:{label:'Custom Clock',detail:'My City'}},false));
    assert.ok(custom.includes('Custom Clock'));
    assert.ok(custom.includes('My City'));
});

test('module preview provides vector svg icons for all supported modules and pages', () => {
    const ICONS = context.window.IslandModulePreview.ICONS;
    assert.ok(ICONS.home && ICONS.home.startsWith('<svg'));
    assert.ok(ICONS.music && ICONS.music.startsWith('<svg'));
    assert.ok(ICONS.sparkles && ICONS.sparkles.startsWith('<svg'));
    assert.ok(ICONS.battery && ICONS.battery.startsWith('<svg'));
    assert.ok(ICONS.weather && ICONS.weather.startsWith('<svg'));
    assert.ok(ICONS.star && ICONS.star.startsWith('<svg'));
    assert.ok(ICONS.terminal && ICONS.terminal.startsWith('<svg'));
});

test('module content has no decorative icons apart from the music artwork fallback', () => {
    for (const kind of ['media','audio','calendar','clock','battery','system','disk','network','weather','note','countdown']) {
        const names = classes(create(kind,{},true));
        assert.ok(!names.some(name => name.includes('island-header-icon')), kind);
    }
    assert.ok(classes(create('media',{},true)).some(name => name.includes('island-btn-play')));
    assert.ok(classes(create('media',{},true)).some(name => name.includes('island-media-fallback-icon')));
});

test('calendar covers every day and gauges use current measurements', () => {
    const calendar = create('calendar', {}, false);
    assert.equal(findClass(calendar, 'island-cal-grid').children.length, 49);
    const battery = create('battery', {battery:{available:true,percent:42}}, false);
    assert.equal(findClass(battery, 'island-gauge-track').children[0].style.width, '42%');
    const cpu = create('system', {stats:{cpu:73}}, false);
    assert.equal(findClass(cpu, 'island-gauge-track').children[0].style.width, '73%');
});

test('system metrics keep their value, memory and gauge together in order', () => {
    const card = create('system',{stats:{cpu:15,memory:59}},false);
    const body = findClass(card, 'island-card-body');
    assert.deepEqual(body.children.map(child => child.className), ['island-big-val','island-card-sub','island-gauge-track']);
    assert.equal(body.children[0].textContent, 'CPU 15%');
    assert.equal(body.children[1].textContent, 'RAM 59%');
});

test('clock uses a 24-hour time without a period suffix', () => {
    const values = texts(create('clock', {}, false));
    assert.ok(values.some(value => /^\d{2}:\d{2}$/.test(value)));
    assert.ok(!values.some(value => /\b(?:AM|PM)\b/.test(value)));
});

test('module content options hide only the selected elements', () => {
    const media = create('media',{item:{show_artwork:false,show_artist:false,show_times:false,show_lyrics:true},track:{title:'Track',artist:'Artist'},lyrics:{status:'plain',text:'Available lyrics'}},false);
    assert.ok(classes(media).includes('island-lyrics-pane'));
    assert.ok(texts(media).includes('Available lyrics'));
    assert.ok(!classes(media).includes('island-media-artwork'));
    assert.ok(!classes(media).includes('island-time-code'));
    assert.ok(!texts(media).includes('Artist'));
    const clock = create('clock',{item:{show_secondary:false}},false);
    assert.ok(!classes(clock).includes('island-card-sub'));
    const calendar = create('calendar',{item:{show_calendar_grid:false}},false);
    assert.ok(classes(calendar).some(name => name.includes('calendar-brief-only')));
});

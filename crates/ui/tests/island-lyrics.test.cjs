const test = require('node:test');
const assert = require('node:assert/strict');
require('../ui/island-lyrics.js');
const lyrics = globalThis.IslandLyrics;
const flush = () => new Promise(resolve => setImmediate(resolve));

test('parses timestamped lines and finds the current line', () => {
    const lines = lyrics.parse('[00:12.50] Second\n[00:03.2] First\n[ar:Artist]\n[00:15.00]  ');
    assert.deepEqual(lines, [{time:3.2,text:'First'},{time:12.5,text:'Second'}]);
    assert.equal(lyrics.current(lines, 2), -1);
    assert.equal(lyrics.current(lines, 13), 1);
    assert.deepEqual(lyrics.parse('[00:01.00][00:05.00] Refrain'),[{time:1,text:'Refrain'},{time:5,text:'Refrain'}]);
});

test('only requests lyrics when enabled and ignores a stale track', async () => {
    const calls = [],pending = [];
    const service = lyrics.create((name,args) => {calls.push({name,args});return new Promise(resolve => pending.push(resolve))}, () => {});
    const first = {title:'First',artist:'Artist',duration:120};
    const second = {title:'Second',artist:'Artist',duration:140};
    assert.equal(service.update(first,false).status,'idle');
    assert.equal(calls.length,0);
    assert.equal(service.update(first,true).status,'loading');
    await flush();
    assert.equal(service.update(second,true).status,'loading');
    await flush();
    pending[0]({plain:'Old lyrics'});
    await flush();
    assert.equal(service.update(second,true).status,'loading');
    pending[1]({synced:'[00:01.00] Current line'});
    await flush();
    assert.equal(service.update(second,true).lines[0].text,'Current line');
    assert.equal(calls.length,2);
    assert.equal(calls[0].name,'island_lyrics');
});

test('missing and instrumental tracks have distinct states', async () => {
    const state = lyrics.create(async () => ({instrumental:true}), () => {});
    assert.equal(state.update({},true).status,'waiting');
    state.update({title:'Track',artist:'Artist'},true);
    await flush();
    assert.equal(state.update({title:'Track',artist:'Artist'},true).status,'instrumental');
    assert.equal(state.update({title:'Track',artist:'Artist'},false).status,'idle');
});

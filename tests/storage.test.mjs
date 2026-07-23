import assert from 'node:assert/strict';

const data=new Map();
globalThis.localStorage={get length(){return data.size},key:i=>Array.from(data.keys())[i]??null,getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
await import('../config.js');
await import('../storage.js');
const store=globalThis.NovaRunStorage;

assert.deepEqual(store.snapshot().challenge,{completed:[],records:{}},'fresh saves include challenge progress');
for(let i=0;i<5;i++)store.beginRun();
assert.ok(store.unlockedScenes().includes('dreamPeak'),'five played runs unlock Dreammist Prism Peak');
store.completeChallenge('dreamPeak',{score:900,time:130,deaths:4});
assert.ok(store.unlockedScenes().includes('tideCity'),'completing Dream Peak unlocks Tidal City');
store.completeChallenge('dreamPeak',{score:1200,time:125,deaths:2,grade:'A',allCollects:true,timeBadge:true});
assert.deepEqual(store.challengeRecord('dreamPeak'),{bestScore:1200,bestTime:125,minDeaths:2,bestGrade:'A',badges:{allCollects:true,noDeaths:false,time:true},completed:true},'repeat completions retain best records, grade, and earned badges');
store.completeChallenge('tideCity',{score:1800,time:170,deaths:3});
assert.ok(store.unlockedScenes().includes('sandClock'),'completing Tidal City unlocks Sandsea Clockwork City');
assert.equal(store.snapshot().version,5,'save is migrated to fullscreen and PWA preference schema version 5');

console.log('challenge progression storage checks passed');

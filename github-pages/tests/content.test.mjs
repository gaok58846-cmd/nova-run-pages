import assert from 'node:assert/strict';

await import('../config.js');
await import('../storage.js');
const store=globalThis.NovaRunStorage;

store.clearAll();
assert.deepEqual(store.unlockedScenes(),['guangzhou'],'a fresh save starts with the beginner scene');
assert.deepEqual(store.unlockedSkins(),['nova'],'a fresh save starts with one cosmetic');
assert.equal(store.settings().musicEnabled,false,'background music is opt-in and cannot create an unsolicited repeating sound');
store.setTutorialComplete(true);
assert.equal(store.snapshot().tutorialComplete,true,'tutorial completion is persisted in the profile');
store.setTutorialComplete(false);

const firstDaily=store.dailyTemplate('2026-07-21');
const repeatedDaily=store.dailyTemplate('2026-07-21');
const nextDaily=store.dailyTemplate('2026-07-22');
assert.deepEqual(firstDaily,repeatedDaily,'daily tasks are deterministic for a local date');
assert.notDeepEqual(firstDaily.tasks.map(task=>task.target),nextDaily.tasks.map(task=>task.target),'daily targets rotate without a server');
assert.deepEqual(firstDaily.tasks.map(task=>task.id),['distance','perfect','breaks']);

store.beginRun();
const result=store.finishRun({distance:2100,score:5000,maxCombo:10,collects:85,perfect:4,breaks:3,unlockedScenesBefore:['guangzhou'],unlockedSkinsBefore:['nova']});
assert.ok(store.unlockedScenes().includes('shenzhen'),'play distance unlocks scenes');
assert.ok(store.unlockedSkins().includes('prism')&&store.unlockedSkins().includes('ace'),'collections and combo unlock cosmetics');
assert.equal(result.profile.stats.runs,1);
assert.equal(result.profile.stats.distance,2100);
assert.equal(result.profile.stats.collects,85);
assert.equal(result.profile.stats.maxCombo,10);
assert.ok(result.profile.achievements.includes('firstRun')&&result.profile.achievements.includes('combo10'),'small achievements unlock from ordinary play');

store.updateSettings({musicVolume:.25,vibration:false,highContrast:true,touchOpacity:.6});
const settings=store.settings();
assert.equal(settings.musicVolume,.25);
assert.equal(settings.vibration,false);
assert.equal(settings.highContrast,true);
assert.equal(settings.touchOpacity,.6);
store.updateSettings({theme:'light'});
assert.equal(store.settings().theme,'light','day or night selection is saved locally');

console.log('local progression, daily task, cosmetic, and settings checks passed');

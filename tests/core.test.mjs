import assert from 'node:assert/strict';
await import('../config.js');
const {DIFFICULTY,PHYSICS,SCENES,RUNNER_SCENES,CHALLENGE_SCENES,CONTENT,canFollow,createRandom,minimumSafeGap,sceneScaleForHeight}=globalThis.NovaRunConfig;

assert.equal(SCENES.length,9,'six runner scenes plus three hand-built platform maps remain available');
assert.equal(RUNNER_SCENES.length,6);
assert.deepEqual(CHALLENGE_SCENES,['dreamPeak','tideCity','sandClock']);
assert.ok(SCENES.includes('dreamPeak'),'wallpaper-inspired platform map is selectable');
assert.ok(PHYSICS.jumpBuffer>0&&PHYSICS.coyoteTime>0,'jump forgiveness windows are enabled');
assert.ok(PHYSICS.releasedGravity>PHYSICS.heldGravity,'releasing jump produces an earlier fall');
assert.ok(CONTENT.skins.length>=3&&CONTENT.skins.length<=6,'lightweight progression offers three to six cosmetic styles');
assert.ok(CONTENT.achievements.length>0&&Object.keys(CONTENT.sceneUnlocks).length===SCENES.length,'achievements and scene unlocks are centrally configured');
assert.ok(CONTENT.skins.every(item=>!('speed' in item)&&!('jump' in item)&&!('energy' in item)),'cosmetics never grant permanent gameplay power');

for(const [name,config] of Object.entries(DIFFICULTY)){
  const gap=minimumSafeGap(config.maxSpeed,config);
  assert.ok(gap>=config.maxSpeed*.7,`${name} keeps a reaction window at maximum speed`);
  assert.ok(config.spawnMin>0,`${name} spawn timer remains positive`);
}

for(const height of [320,375,390]){
  const floor=height*.79;
  const top=floor-360*sceneScaleForHeight(height);
  assert.ok(top>=27.9,`landmark remains visible at ${height}px landscape height`);
}

assert.equal(canFollow('gap','gap'),false);
assert.equal(canFollow('gap','gate'),false);
assert.equal(canFollow('gate','drone'),false);
assert.equal(canFollow('drone','gate'),false);
assert.equal(canFollow('spike','crate'),true);

const first=createRandom('challenge-42');
const second=createRandom('challenge-42');
for(let i=0;i<50;i++)assert.equal(first(),second(),'seeded obstacle randomizer is reproducible');

console.log('core gameplay checks passed');

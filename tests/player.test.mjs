import assert from 'node:assert/strict';

await import('../player.js');
const profile=globalThis.NovaRunPlayerRenderer.movementProfile;

const easyStart=profile({diff:'easy',speed:355});
const easyFast=profile({diff:'easy',speed:650});
const mediumStart=profile({diff:'medium',speed:430});
const hardStart=profile({diff:'hard',speed:510});
const hardFast=profile({diff:'hard',speed:980});
const challengeIdle=profile({challenge:true,motionIntensity:0});
const challengeMoving=profile({challenge:true,motionIntensity:.75});

assert.ok(easyFast.cadence>easyStart.cadence&&easyFast.stride>easyStart.stride,'animation accelerates as running speed increases');
assert.ok(easyFast.armCadence>easyStart.armCadence&&easyFast.armLift>easyStart.armLift,'arm frequency and hand height rise with actual speed');
assert.ok(mediumStart.cadence>easyStart.cadence,'medium difficulty starts with a quicker gait than easy');
assert.ok(hardStart.cadence>mediumStart.cadence&&hardStart.armCadence>mediumStart.armCadence&&hardStart.lean>mediumStart.lean,'hard difficulty starts with a visibly more urgent full-body posture');
assert.ok(hardFast.armSwing>hardStart.armSwing&&hardFast.armLift>hardStart.armLift&&hardFast.bob>hardStart.bob,'top speed expands both horizontal arm reach and vertical hand lift');
assert.ok(hardFast.armSwing>=24&&hardFast.armLift>=15,'maximum-speed arm action remains clearly visible at gameplay scale');
assert.equal(challengeIdle.intensity,0,'challenge idle has no gait intensity');
assert.ok(challengeMoving.cadence>challengeIdle.cadence&&challengeMoving.stride>challengeIdle.stride,'challenge gait follows actual horizontal speed');

function renderIdle(time){
  const calls=[],ctx=new Proxy({}, {get(target,key){if(!(key in target))target[key]=(...args)=>calls.push([String(key),...args]);return target[key]},set(target,key,value){calls.push([`set:${String(key)}`,value]);target[key]=value;return true}});
  globalThis.NovaRunPlayerRenderer.draw(ctx,{player:{x:90,y:120,w:38,h:58,vx:0,vy:0,ground:true,jumps:0,dash:0,slide:0,land:0,hurt:0,shield:0},game:{time,speed:0,diff:'medium',over:0,challenge:true,motionIntensity:0},reducedMotion:false,accent:'#f0a348',trail:'#8ee3cf',theme:{fg:'#f7efe4',card:'#202729',one:'#8ee3cf',two:'#f0a348',three:'#78d996'}});
  return calls;
}
assert.deepEqual(renderIdle(0),renderIdle(2),'stationary challenge runner keeps a fixed body and limb pose');

console.log('speed-linked runner animation checks passed');

import assert from 'node:assert/strict';

await import('../challenge-engine.js');
await import('../mountain-map.js');
await import('../tide-city-map.js');
await import('../sand-clock-map.js');

const engine=globalThis.NovaChallengeEngine;
const maps=[globalThis.NovaMountainMap,globalThis.NovaTideCityMap,globalThis.NovaSandClockMap];
const idle=()=>({left:false,right:false,down:false,jumpHeld:false,jumpPressed:false,dashPressed:false,autoRun:false});
assert.deepEqual(engine.ids(),['dreamPeak','tideCity','sandClock'],'all challenge stages register in progression order');

function mockContext(){
  const gradient={addColorStop(){}};
  return new Proxy({}, {get(target,key){if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;if(!(key in target))target[key]=()=>{};return target[key]},set(target,key,value){target[key]=value;return true}});
}

for(const map of maps){
  const audit=map.validateLevel();
  assert.equal(audit.ok,true,`${map.id} route is valid: ${audit.errors.join(',')}`);
  assert.ok(map.PLAYER.deathDepth<=48,`${map.id} uses an immediate DeathZone`);
  assert.ok(map.PLATFORMS.filter(p=>p.main!==false&&p.type!=='hidden').every(p=>p.w>=150),`${map.id} main route avoids precision-width platforms`);
  for(const [width,height] of [[320,568],[393,873],[568,320],[667,375],[844,390],[915,412],[1280,720]])assert.doesNotThrow(()=>map.render(mockContext(),map.createState(width,height),width,height,{skin:'#f4d9b3'}),`${map.id} renders at ${width}x${height}`);
  const manual=map.createState(900,650),startX=manual.player.x;for(let frame=0;frame<120;frame++)map.update(manual,idle(),1/60,900,650);assert.equal(manual.player.x,startX,`${map.id} never moves without manual input`);const right=idle();right.right=true;for(let frame=0;frame<10;frame++)map.update(manual,right,1/60,900,650);assert.ok(manual.player.x>startX,`${map.id} responds immediately to right movement input`);
  assert.ok(map.FINISH&&map.FINISH.h>=80,`${map.id} defines a visible finish-gate collision area`);const beforeFinish=map.createState(900,650);beforeFinish.player.x=map.FINISH.x-beforeFinish.player.w-1;beforeFinish.player.y=map.floorFor(650)-beforeFinish.player.h;map.update(beforeFinish,idle(),0,900,650);assert.equal(beforeFinish.finished,false,`${map.id} does not finish before touching the gate`);beforeFinish.player.x=map.FINISH.x-beforeFinish.player.w+2;const finishEvents=map.update(beforeFinish,idle(),0,900,650);assert.ok(beforeFinish.finished&&finishEvents.some(event=>event.type==='finish'),`${map.id} finishes exactly when the player enters the visible gate`);
  const state=map.createState(900,650);state.player.y=map.floorFor(650)+map.PLAYER.deathDepth-state.player.h+1;
  const events=map.update(state,idle(),1/60,900,650);
  assert.equal(state.deaths,1,`${map.id} kills immediately below the route`);
  assert.ok(events.some(event=>event.type==='respawn'&&event.reason==='death-zone'));
}

{
  const map=globalThis.NovaSandClockMap,state=map.createState(915,412);state.chaseActive=true;const before={time:state.time,phase:state.phase,sinking:Object.keys(state.sinking).length,broken:state.brokenLevers.size,chase:state.chaseActive};for(let i=0;i<5;i++){map.render(mockContext(),state,915,412,i%2?{bg:'#181919',fg:'#fff'}:{bg:'#f4efe7',fg:'#24211f'})}assert.deepEqual({time:state.time,phase:state.phase,sinking:Object.keys(state.sinking).length,broken:state.brokenLevers.size,chase:state.chaseActive},before,'five day/night redraws do not create or retain duplicate sand-city visual objects');
}

{
  const map=globalThis.NovaTideCityMap,state=map.createState(900,650),float=map.PLATFORMS.find(p=>p.type==='buoyant');
  const before=map.platformRect(float,state,650,0),after=map.platformRect(float,state,650,2);
  assert.notEqual(before.y,after.y,'buoyant platforms follow the tide');
  const floor=map.floorFor(650);state.player.x=map.SLUICE.valve.x+8;state.player.y=floor+map.SLUICE.valve.y+2;
  let events=map.update(state,idle(),0,900,650);
  assert.ok(events.some(event=>event.type==='tideFreeze')&&state.tideFrozenUntil>=7,'sluice valve freezes the tide for a fair window');
  state.player.x=map.GRATE.x-state.player.w+4;state.player.y=floor-state.player.h;state.player.facing=1;
  const input=idle();input.dashPressed=true;events=map.update(state,input,0,900,650);
  assert.ok(events.some(event=>event.type==='grateBreak')&&state.brokenGrates.has(map.GRATE.id),'dash breaks the rust grate');
}

{
  const map=globalThis.NovaSandClockMap,state=map.createState(900,650),gear=map.PLATFORMS.find(p=>p.type==='gear');
  assert.notDeepEqual(map.platformRect(gear,state,650,0),map.platformRect(gear,state,650,1),'gear platforms visibly travel on their rails');
  const floor=map.floorFor(650),toggle=map.SWITCHES[0];state.player.x=toggle.x+4;state.player.y=floor+toggle.y+2;
  let events=map.update(state,idle(),0,900,650);
  assert.ok(events.some(event=>event.type==='phaseShift')&&state.phase===1,'time-wheel switch changes platform phase');
  const sink=map.PLATFORMS.find(p=>p.type==='sinking'),rect=map.platformRect(sink,state,650,0);state.player.x=rect.x+20;state.player.y=rect.y-state.player.h-2;state.player.vy=150;
  events=map.update(state,idle(),.02,900,650);
  assert.ok(events.some(event=>event.type==='sandSink'),'landing starts a warned sinking platform');
  state.player.x=map.LEVER.x-state.player.w+4;state.player.y=floor-state.player.h;state.player.facing=1;const input=idle();input.dashPressed=true;
  events=map.update(state,input,0,900,650);
  assert.ok(events.some(event=>event.type==='leverBreak')&&state.brokenLevers.has(map.LEVER.id),'dash restores the clockwork lever');
}

console.log('three challenge-stage mechanics checks passed');

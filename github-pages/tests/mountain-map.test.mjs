import assert from 'node:assert/strict';

await import('../challenge-engine.js');
await import('../mountain-map.js');
const MAP=globalThis.NovaMountainMap;
const idle=()=>({left:false,right:false,down:false,jumpHeld:false,jumpPressed:false,dashPressed:false});

{
  const state=MAP.createState(900,650),start=state.player.x,input={...idle(),autoRun:false};
  for(let frame=0;frame<60;frame++)MAP.update(state,input,1/60,900,650);
  assert.ok(Math.abs(state.player.x-start)<1,'platform map remains still without directional input');
  input.right=true;for(let frame=0;frame<60;frame++)MAP.update(state,input,1/60,900,650);
  assert.ok(state.player.x>start+150,'right input moves the player immediately');
}

const audit=MAP.validateLevel();
assert.equal(audit.ok,true,`hand-built route is comfortably reachable: ${audit.errors.join(',')}`);
assert.ok(MAP.PLATFORMS.filter(item=>item.type!=='hidden').every(item=>item.w>=150),'main route avoids narrow precision platforms');
assert.ok(MAP.PLAYER.deathDepth<=48,'DeathZone begins immediately below the playable floor');
assert.ok(MAP.CHECKPOINTS.length>=4,'level has multiple recovery checkpoints');
assert.ok(MAP.PORTALS.length>=2,'level has main and secret portals');
for(const checkpoint of MAP.CHECKPOINTS){
  const spawn={x:checkpoint.x,y:MAP.floorFor(650)+checkpoint.y-MAP.PLAYER.h,w:MAP.PLAYER.w,h:MAP.PLAYER.h};
  for(const hazard of MAP.HAZARDS){const rect={x:hazard.x,y:MAP.floorFor(650)+hazard.y,w:hazard.w,h:hazard.h};assert.equal(spawn.x<rect.x+rect.w&&spawn.x+spawn.w>rect.x&&spawn.y<rect.y+rect.h&&spawn.y+spawn.h>rect.y,false,`${checkpoint.id} respawn is outside every hazard`)}
}

for(const mechanism of ['moving','crumble','bounce','hidden'])assert.ok(MAP.PLATFORMS.some(item=>item.type===mechanism),`map includes ${mechanism} platforms`);

{
  const flight=Math.abs(MAP.PLAYER.jumpVelocity)/MAP.PLAYER.gravity+Math.sqrt((MAP.PLAYER.jumpVelocity*MAP.PLAYER.jumpVelocity/MAP.PLAYER.gravity)/MAP.PLAYER.gravity),maxJumpDistance=MAP.PLAYER.runSpeed*flight,jumpHeight=MAP.PLAYER.jumpVelocity*MAP.PLAYER.jumpVelocity/(2*MAP.PLAYER.gravity);
  const main=MAP.PLATFORMS.filter(item=>item.type!=='hidden').slice().sort((a,b)=>a.x-b.x);
  for(let index=1;index<main.length;index++){
    const previous=main[index-1],next=main[index],worstGap=(next.x+(next.moveX||0))-((previous.x-(previous.moveX||0))+previous.w),worstRise=(previous.y+(previous.moveY||0))-(next.y-(next.moveY||0));
    assert.ok(worstGap<=maxJumpDistance*.9,`${previous.id} to ${next.id} has a non-precision horizontal margin`);
    if(next.id!=='portal-exit')assert.ok(worstRise<=jumpHeight,`${previous.id} to ${next.id} stays below maximum jump height`);
  }
}

{
  const state=MAP.createState(900,650),floor=MAP.floorFor(650);
  state.player.y=floor+MAP.PLAYER.deathDepth-state.player.h+1;
  const events=MAP.update(state,idle(),1/60,900,650);
  assert.equal(state.deaths,1,'crossing the DeathZone kills immediately');
  assert.equal(state.player.x,MAP.CHECKPOINTS[0].x,'DeathZone respawns at the latest checkpoint');
  assert.ok(events.some(event=>event.type==='respawn'&&event.reason==='death-zone'));
}

{
  const state=MAP.createState(900,650),floor=MAP.floorFor(650),cp=MAP.CHECKPOINTS[2];
  state.player.x=cp.x+2;state.player.y=floor+cp.y-state.player.h;
  MAP.update(state,idle(),0,900,650);
  assert.equal(state.checkpoint,2,'crossing a checkpoint stores the latest safe respawn');
  state.player.y=floor+MAP.PLAYER.deathDepth;
  MAP.update(state,idle(),1/60,900,650);
  assert.equal(state.player.x,cp.x,'death returns to the stored checkpoint');
}

{
  const state=MAP.createState(900,650),floor=MAP.floorFor(650);
  for(const item of MAP.COLLECTIBLES.filter(item=>!item.hidden)){
    state.player.x=item.x-5;state.player.y=floor+item.y-5;MAP.update(state,idle(),0,900,650);
  }
  assert.ok(['sun-shard','mist-shard','ridge-shard'].every(id=>state.collected.has(id)),'three route collectibles unlock the crystal gate');
  state.player.x=MAP.GATES.switch.x+8;state.player.y=floor+MAP.GATES.switch.y;MAP.update(state,idle(),0,900,650);
  assert.ok(state.doorOpenUntil-state.time>=MAP.GATES.switch.duration-.01,'timed switch opens the second door for the full fair window');
}

{
  const state=MAP.createState(900,650),floor=MAP.floorFor(650),portal=MAP.PORTALS[0];
  state.player.x=portal.x+4;state.player.y=floor+portal.y+8;MAP.update(state,idle(),0,900,650);
  assert.equal(state.player.x,portal.toX,'portal transfers the player to its safe landing');
}

{
  const state=MAP.createState(900,650),moving=MAP.PLATFORMS.find(item=>item.type==='moving');
  const before=MAP.platformRect(moving,state,650,0),after=MAP.platformRect(moving,state,650,1);
  assert.notDeepEqual([before.x,before.y],[after.x,after.y],'moving platform changes position over time');
}

for(const type of ['crumble','bounce','hidden']){
  const state=MAP.createState(900,650),platform=MAP.PLATFORMS.find(item=>item.type===type),rect=MAP.platformRect(platform,state,650,0);
  state.player.x=rect.x+30;state.player.y=rect.y-state.player.h-2;state.player.vy=150;
  const events=MAP.update(state,idle(),.02,900,650);
  if(type==='crumble')assert.ok(events.some(event=>event.type==='crumble')&&state.crumble[platform.id]!=null,'stepped platform starts its visible fall timer');
  if(type==='bounce')assert.ok(events.some(event=>event.type==='bounce')&&state.player.vy<0,'bounce platform launches the player');
  if(type==='hidden')assert.ok(events.some(event=>event.type==='secret')&&state.hiddenFound,'landing on the high ridge reveals the hidden route');
}

{
  const outside=MAP.createState(900,650),inside=MAP.createState(900,650),floor=MAP.floorFor(650);
  outside.player.x=1800;inside.player.x=MAP.GRAVITY_ZONE.x+80;outside.player.y=inside.player.y=floor-260;outside.player.vy=inside.player.vy=0;
  MAP.update(outside,idle(),.02,900,650);MAP.update(inside,idle(),.02,900,650);
  assert.ok(inside.player.vy<outside.player.vy,'gravity zone provides forgiving low gravity');
}

function mockContext(){
  const gradient={addColorStop(){}};
  return new Proxy({}, {get(target,key){if(key==='createLinearGradient'||key==='createRadialGradient')return()=>gradient;if(key==='roundRect')return()=>{};if(!(key in target))target[key]=()=>{};return target[key]},set(target,key,value){target[key]=value;return true}});
}
for(const [width,height] of [[320,568],[568,320],[900,650],[1280,720]])assert.doesNotThrow(()=>MAP.render(mockContext(),MAP.createState(width,height),width,height),'map renders across phone and desktop sizes');

{
  const state=MAP.createState(900,650);state.player.x=MAP.WORLD_LENGTH-90;state.player.y=MAP.floorFor(650)-state.player.h;
  const events=MAP.update(state,idle(),0,900,650);
  assert.ok(state.finished&&events.some(event=>event.type==='finish'),'glowing summit portal is a real level endpoint');
}

console.log('wallpaper-inspired platform map checks passed');

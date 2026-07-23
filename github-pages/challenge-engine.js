(()=>{
'use strict';

const registry=new Map();
const BASE_PLAYER=Object.freeze({w:38,h:58,runSpeed:255,groundAccel:1900,airAccel:1050,friction:1750,jumpVelocity:-690,dashSpeed:510,dashTime:.18,dashCooldown:.85,gravity:1850,maxFall:1020,coyote:.12,jumpBuffer:.13,deathDepth:40});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const moveToward=(value,target,amount)=>value<target?Math.min(target,value+amount):Math.max(target,value-amount);
function polygon(ctx,points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawFinishGate(ctx,state,height,finish,style={}){
  const floor=height*(style.floorRatio||.82),x=finish.x,y=floor+finish.y,w=finish.w,h=finish.h,primary=style.primary||'#f0bd62',secondary=style.secondary||'#fff0c7',body=style.body||'#5f4934',energy=style.energy||'#78d996',motion=state.reducedMotion?0:state.time;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=10;ctx.shadowColor=primary;
  rounded(ctx,x-17,floor-12,w+34,12,5,body,primary);rounded(ctx,x-13,y+31,18,h-31,7,body,primary);rounded(ctx,x+w-5,y+31,18,h-31,7,body,primary);
  ctx.lineWidth=12;ctx.strokeStyle=body;ctx.beginPath();ctx.moveTo(x-4,y+35);ctx.quadraticCurveTo(x+w/2,y-19,x+w+4,y+35);ctx.stroke();ctx.lineWidth=4;ctx.strokeStyle=primary;ctx.stroke();
  const pulse=state.reducedMotion ? .14 : .12+Math.sin(motion*2.2)*.025;ctx.globalAlpha=pulse;rounded(ctx,x+8,y+34,w-16,h-43,Math.min(22,w*.28),energy);ctx.globalAlpha=1;
  ctx.save();ctx.translate(x+w/2,y+22);ctx.rotate(state.reducedMotion?Math.PI/4:motion*.35);polygon(ctx,[[0,-13],[13,0],[0,13],[-13,0]],secondary,primary);ctx.rotate(-motion*.7);ctx.globalAlpha=.72;polygon(ctx,[[0,-6],[6,0],[0,6],[-6,0]],energy);ctx.restore();
  ctx.shadowBlur=0;for(let i=0;i<8;i++){ctx.fillStyle=i%2?secondary:body;ctx.fillRect(x-10+i*(w+20)/8,floor-9,(w+20)/8,5)}
  if(!state.reducedMotion){for(let i=0;i<5;i++){const py=floor-24-((motion*24+i*31)%(h-28)),px=x+8+(i*19%(Math.max(12,w-16)));ctx.globalAlpha=.24+(i%2)*.14;ctx.fillStyle=i%2?energy:primary;ctx.fillRect(px,py,3,3)}ctx.globalAlpha=1}
  ctx.restore();
}

function createMap(definition){
  const id=definition.id,WORLD_LENGTH=definition.worldLength,PLAYER=Object.freeze({...BASE_PLAYER,...definition.player}),PLATFORMS=Object.freeze(definition.platforms),CHECKPOINTS=Object.freeze(definition.checkpoints),COLLECTIBLES=Object.freeze(definition.collectibles||[]),PORTALS=Object.freeze(definition.portals||[]),HAZARDS=Object.freeze(definition.hazards||[]),FINISH=definition.finish?Object.freeze({...definition.finish}):null;
  const floorFor=height=>height*(definition.floorRatio||.82);
  function platformRect(platform,state,height,atTime=state.time){
    const floor=floorFor(height),crumbleAt=state.crumble[platform.id];
    if(platform.type==='crumble'&&crumbleAt!=null&&atTime-crumbleAt>(platform.breakAfter||1.45))return null;
    let rect={x:platform.x,y:floor+platform.y,w:platform.w,h:platform.h||18,id:platform.id,type:platform.type,hidden:platform.type==='hidden'};
    if(platform.type==='moving'){rect.x+=Math.sin(atTime*platform.speed+platform.phase)*(platform.moveX||0);rect.y+=Math.sin(atTime*platform.speed+platform.phase)*(platform.moveY||0)}
    if(platform.type==='crumble'&&crumbleAt!=null){const elapsed=Math.max(0,atTime-crumbleAt-(platform.fallDelay||.55));rect.y+=elapsed*elapsed*(platform.fallSpeed||420)}
    return definition.platformMotion?definition.platformMotion(platform,state,height,atTime,rect):rect;
  }
  function createState(width=900,height=650){
    const floor=floorFor(height),spawn=CHECKPOINTS[0];
    return Object.assign({mapId:id,time:0,cameraX:0,lastFloor:floor,player:{x:spawn.x,y:floor+spawn.y-PLAYER.h,w:PLAYER.w,h:PLAYER.h,vx:0,vy:0,ground:false,groundId:'',coyote:0,jumpBuffer:0,dash:0,dashCooldown:0,facing:1},checkpoint:0,collected:new Set(),crumble:{},hiddenFound:false,deaths:0,finished:false,respawnFlash:0,events:[],score:0,manualControl:false,width,height,reducedMotion:false},definition.createState?definition.createState(width,height):{});
  }
  function respawn(state,height,reason='death'){
    const floor=floorFor(height),checkpoint=CHECKPOINTS[state.checkpoint],player=state.player;
    Object.assign(player,{x:checkpoint.x,y:floor+checkpoint.y-player.h,vx:0,vy:0,ground:false,groundId:'',coyote:0,jumpBuffer:0,dash:0});
    state.crumble={};state.portalCooldown=.5;state.deaths++;state.respawnFlash=.32;state.events.push({type:'respawn',reason,checkpoint:checkpoint.id});if(definition.onRespawn)definition.onRespawn(state,reason);
  }
  function consumeInputs(input){input.jumpPressed=false;input.dashPressed=false}
  function update(state,input,dt,width,height){
    const events=state.events;events.length=0;if(state.finished){consumeInputs(input);return events}
    dt=Math.min(.033,Math.max(0,dt));state.time+=dt;state.width=width;state.height=height;state.respawnFlash=Math.max(0,state.respawnFlash-dt);state.portalCooldown=Math.max(0,(state.portalCooldown||0)-dt);
    const floor=floorFor(height),floorDelta=floor-state.lastFloor,player=state.player;player.y+=floorDelta;state.lastFloor=floor;
    const previous={x:player.x,y:player.y,bottom:player.y+player.h};
    if(player.groundId){const platform=PLATFORMS.find(item=>item.id===player.groundId),now=platform&&platformRect(platform,state,height,state.time),before=platform&&platformRect(platform,state,height,state.time-dt);if(now&&before){player.x+=now.x-before.x;player.y+=now.y-before.y}}
    const context={floor,width,height,dt,player,PLAYER,WORLD_LENGTH,platformRect,overlap,clamp},environment=definition.environment?definition.environment(state,input,context)||{}:{};
    state.manualControl=input.autoRun===false;const direction=input.left?-1:input.right?1:input.autoRun?1:0,accel=player.ground?PLAYER.groundAccel:PLAYER.airAccel,targetSpeed=PLAYER.runSpeed*(environment.speedScale||1);
    if(direction){player.vx=moveToward(player.vx,direction*targetSpeed,accel*dt);player.facing=direction}else player.vx=moveToward(player.vx,0,(player.ground?PLAYER.friction:PLAYER.airAccel*.35)*dt);
    player.dashCooldown=Math.max(0,player.dashCooldown-dt);player.dash=Math.max(0,player.dash-dt);
    if(input.dashPressed&&player.dashCooldown<=0){player.dash=PLAYER.dashTime;player.dashCooldown=PLAYER.dashCooldown;player.vx=player.facing*PLAYER.dashSpeed;events.push({type:'dash'})}
    if(input.jumpPressed)player.jumpBuffer=PLAYER.jumpBuffer;else player.jumpBuffer=Math.max(0,player.jumpBuffer-dt);player.coyote=player.ground?PLAYER.coyote:Math.max(0,player.coyote-dt);
    if(player.jumpBuffer>0&&player.coyote>0){player.vy=PLAYER.jumpVelocity;player.ground=false;player.groundId='';player.coyote=0;player.jumpBuffer=0;events.push({type:'jump'})}
    const gravity=PLAYER.gravity*(environment.gravityScale||1)*(input.jumpHeld&&player.vy<0?.76:1.18);player.vy=Math.min(PLAYER.maxFall,player.vy+gravity*dt+(environment.forceY||0)*dt);player.vx+=(environment.forceX||0)*dt;
    player.x+=player.vx*dt;player.y+=player.vy*dt;player.x=clamp(player.x,0,WORLD_LENGTH-player.w);
    const blockers=definition.blockers?definition.blockers(state,context)||[]:[];for(const rect of blockers)if(overlap(player,rect)){if(previous.x+player.w<=rect.x+6)player.x=rect.x-player.w;else if(previous.x>=rect.x+rect.w-6)player.x=rect.x+rect.w;player.vx=0}
    player.ground=false;player.groundId='';
    for(const platform of PLATFORMS){const rect=platformRect(platform,state,height);if(!rect)continue;if(previous.bottom<=rect.y+10&&player.y+player.h>=rect.y&&player.vy>=0&&player.x+player.w>rect.x+5&&player.x<rect.x+rect.w-5){player.y=rect.y-player.h;player.vy=0;player.ground=true;player.groundId=platform.id;player.coyote=PLAYER.coyote;if(platform.type==='crumble'&&state.crumble[platform.id]==null){state.crumble[platform.id]=state.time;events.push({type:'crumble'})}if(platform.type==='bounce'){player.vy=platform.bounceVelocity||-880;player.ground=false;player.groundId='';events.push({type:'bounce'})}if(platform.type==='hidden'&&!state.hiddenFound){state.hiddenFound=true;events.push({type:'secret'})}if(definition.onLand)definition.onLand(state,platform,context,events);break}}
    for(const item of COLLECTIBLES){if(state.collected.has(item.id)||definition.collectibleVisible&& !definition.collectibleVisible(item,state))continue;const rect={x:item.x-14,y:floor+item.y-14,w:28,h:28};if(overlap(player,rect)){state.collected.add(item.id);events.push({type:'collect',id:item.id})}}
    for(let index=state.checkpoint+1;index<CHECKPOINTS.length;index++){const checkpoint=CHECKPOINTS[index];if(player.x>=checkpoint.x){state.checkpoint=index;events.push({type:'checkpoint',id:checkpoint.id})}else break}
    for(const portal of PORTALS){if(portal.hidden&&!state.hiddenFound)continue;const rect={x:portal.x,y:floor+portal.y,w:portal.w,h:portal.h};if(state.portalCooldown<=0&&overlap(player,rect)){player.x=portal.toX;player.y=floor+portal.toY;player.vx=Math.max(120,player.vx);player.vy=0;state.portalCooldown=.7;events.push({type:'portal',id:portal.id})}}
    for(const hazard of HAZARDS){if(definition.hazardActive&&!definition.hazardActive(hazard,state))continue;const rect=definition.hazardRect?definition.hazardRect(hazard,state,height):{x:hazard.x,y:floor+hazard.y,w:hazard.w,h:hazard.h};if(rect&&overlap(player,rect)){respawn(state,height,hazard.reason||'hazard');break}}
    if(definition.afterPhysics)definition.afterPhysics(state,input,context,events,{respawn});
    if(player.y+player.h>=floor+PLAYER.deathDepth)respawn(state,height,'death-zone');const finishRect=FINISH?{x:FINISH.x,y:floor+FINISH.y,w:FINISH.w,h:FINISH.h}:null;if(!state.finished&&(finishRect?overlap(player,finishRect):player.x+player.w>=WORLD_LENGTH-80)){state.finished=true;events.push({type:'finish'})}
    const targetCamera=clamp(player.x-width*.34,0,Math.max(0,WORLD_LENGTH-width));state.cameraX+=(targetCamera-state.cameraX)*Math.min(1,dt*5.5);state.score=definition.score?definition.score(state):Math.floor(player.x+state.collected.size*420+state.checkpoint*260+(state.hiddenFound?900:0)-state.deaths*75);
    consumeInputs(input);return events;
  }
  function validateLevel(){
    const errors=[],main=PLATFORMS.filter(item=>item.type!=='hidden'&&item.main!==false).slice().sort((a,b)=>a.x-b.x),mechanisms=new Set(PLATFORMS.map(item=>item.type)),minWidth=definition.minPlatformWidth||150,maxGap=definition.maxGap||150,maxRise=definition.maxRise||125;
    for(const platform of main)if(platform.w<minWidth)errors.push(`platform-too-narrow-${platform.id}`);
    for(let i=1;i<main.length;i++){const gap=main[i].x-(main[i-1].x+main[i-1].w);if(gap>maxGap)errors.push(`gap-too-wide-${main[i-1].id}-${main[i].id}`);if(main[i].y<main[i-1].y-maxRise&&main[i].allowHighRise!==true)errors.push(`rise-too-high-${main[i].id}`)}
    for(const required of definition.requiredMechanisms||[])if(!mechanisms.has(required))errors.push(`missing-${required}`);if(CHECKPOINTS.length<(definition.minCheckpoints||4))errors.push('missing-checkpoints');if(PLAYER.deathDepth>48)errors.push('death-zone-too-deep');if(FINISH&&(FINISH.x<0||FINISH.x+FINISH.w>WORLD_LENGTH||FINISH.h<80))errors.push('invalid-finish-gate');if(definition.validate)errors.push(...definition.validate());return{ok:errors.length===0,errors};
  }
  const map=Object.freeze({id,WORLD_LENGTH,PLAYER,PLATFORMS,CHECKPOINTS,COLLECTIBLES,PORTALS,HAZARDS,FINISH,floorFor,platformRect,createState,update,render:(ctx,state,width,height,theme)=>definition.render(ctx,state,width,height,theme,{floorFor,platformRect,polygon,rounded,drawFinishGate,clamp}),validateLevel,definition});registry.set(id,map);return map;
}
function get(id){return registry.get(id)||null}
globalThis.NovaChallengeEngine=Object.freeze({BASE_PLAYER,createMap,get,has:id=>registry.has(id),ids:()=>Array.from(registry.keys()),polygon,rounded,drawFinishGate,clamp,overlap});
})();

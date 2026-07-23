(()=>{
'use strict';

const WORLD_LENGTH=7200;
const PLAYER=Object.freeze({w:38,h:58,runSpeed:255,groundAccel:1900,airAccel:1050,friction:1750,jumpVelocity:-690,dashSpeed:510,dashTime:.18,dashCooldown:.85,gravity:1850,lowGravity:.5,maxFall:1020,coyote:.12,jumpBuffer:.13,deathDepth:40});

const PLATFORMS=Object.freeze([
  {id:'start',x:0,w:620,y:0,type:'solid'},
  {id:'warmup-a',x:700,w:240,y:-24,type:'solid'},
  {id:'moving-a',x:1010,w:220,y:-72,type:'moving',moveX:54,moveY:18,speed:.8,phase:.2},
  {id:'crumble-a',x:1300,w:190,y:-108,type:'crumble'},
  {id:'bounce-a',x:1560,w:180,y:-58,type:'bounce'},
  {id:'portal-ledge',x:1810,w:250,y:-104,type:'solid'},
  {id:'portal-exit',x:2200,w:310,y:-72,type:'solid'},
  {id:'wind-a',x:2580,w:220,y:-116,type:'solid'},
  {id:'wind-moving',x:2880,w:230,y:-166,type:'moving',moveY:42,speed:1.05,phase:1.7},
  {id:'gravity-a',x:3200,w:250,y:-136,type:'solid'},
  {id:'gravity-b',x:3530,w:250,y:-194,type:'solid'},
  {id:'gravity-c',x:3860,w:250,y:-136,type:'crumble'},
  {id:'gate-road',x:4170,w:940,y:0,type:'solid'},
  {id:'switch-step',x:4380,w:190,y:-82,type:'solid'},
  {id:'door-step-a',x:4650,w:180,y:-126,type:'moving',moveY:34,speed:1.15,phase:2.4},
  {id:'door-step-b',x:4910,w:200,y:-72,type:'crumble'},
  {id:'checkpoint-road',x:5180,w:320,y:-18,type:'solid'},
  {id:'secret-bounce',x:5520,w:160,y:-38,type:'bounce'},
  {id:'combo-moving',x:5750,w:220,y:-108,type:'moving',moveX:48,moveY:26,speed:1.2,phase:.8},
  {id:'combo-crumble',x:6050,w:200,y:-132,type:'crumble'},
  {id:'main-rest',x:6330,w:330,y:-42,type:'solid'},
  {id:'finish-road',x:6750,w:450,y:0,type:'solid'},
  {id:'hidden-a',x:5660,w:250,y:-244,type:'hidden'},
  {id:'hidden-b',x:5980,w:250,y:-270,type:'hidden'},
  {id:'hidden-c',x:6300,w:270,y:-220,type:'hidden'}
]);
const PLATFORM_BY_ID=new Map(PLATFORMS.map(platform=>[platform.id,platform]));

const WIND_ZONE=Object.freeze({x:2500,w:610,top:-300,bottom:28});
const GRAVITY_ZONE=Object.freeze({x:3120,w:1000,top:-330,bottom:30});
const PORTALS=Object.freeze([{id:'portal-a',x:1940,y:-160,w:46,h:80,toX:2245,toY:-145},{id:'secret-return',x:6450,y:-292,w:42,h:72,toX:6520,toY:-128,hidden:true}]);
const COLLECTIBLES=Object.freeze([{id:'sun-shard',x:3305,y:-226},{id:'mist-shard',x:3645,y:-286},{id:'ridge-shard',x:3975,y:-226},{id:'secret-shard',x:6110,y:-344,hidden:true}]);
const CHECKPOINTS=Object.freeze([{id:'cp-start',x:120,y:-70},{id:'cp-wind',x:2290,y:-150},{id:'cp-gate',x:4250,y:-72},{id:'cp-combo',x:5270,y:-90},{id:'cp-finish',x:6550,y:-110}]);
const HAZARDS=Object.freeze([{id:'shard-a',x:4460,y:-34,w:68,h:34},{id:'shard-b',x:5000,y:-106,w:62,h:34},{id:'shard-c',x:6410,y:-76,w:72,h:34}]);
const GATES=Object.freeze({crystal:{x:4128,w:34,h:190},timed:{x:5130,w:34,h:190},switch:{x:4440,y:-116,w:60,h:34,duration:8}});
const FINISH=Object.freeze({x:7085,y:-142,w:76,h:142});

let challengeMap=null;
const floorFor=height=>challengeMap.floorFor(height);
const platformRect=(platform,state,height,atTime)=>challengeMap.platformRect(platform,state,height,atTime);
const createState=(width,height)=>challengeMap.createState(width,height);
const update=(state,input,dt,width,height)=>challengeMap.update(state,input,dt,width,height);

function polygon(ctx,points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}

function renderBackground(ctx,state,width,height){
  const floor=floorFor(height),gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#e8d2ae');gradient.addColorStop(.58,'#f5dfbd');gradient.addColorStop(1,'#cbbda5');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  ctx.save();ctx.globalAlpha=.88;ctx.fillStyle='#fff8df';ctx.beginPath();ctx.arc(width*.55,height*.28,Math.min(width,height)*.12,0,Math.PI*2);ctx.fill();ctx.restore();
  const drift=state.cameraX*.045,base=floor+10,peakX=width*.58-drift%width;
  polygon(ctx,[[peakX-width*.72,base],[peakX-width*.28,base-height*.18],[peakX,base-height*.64],[peakX+width*.42,base-height*.17],[peakX+width*.72,base]],'#303437');
  polygon(ctx,[[peakX-width*.51,base],[peakX-width*.14,base-height*.39],[peakX,base-height*.64],[peakX-width*.06,base-height*.23],[peakX-width*.24,base]],'#d47221');
  polygon(ctx,[[peakX-width*.08,base-height*.43],[peakX,base-height*.64],[peakX+width*.12,base-height*.42],[peakX+width*.04,base-height*.5],[peakX-.02*width,base-height*.43]],'#f4eee1');
  polygon(ctx,[[-80,base],[width*.2,base-height*.22],[width*.36,base],[width*.66,base-height*.28],[width+80,base],[width+80,height],[-80,height]],'#23292d');
  ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#fff9e8';for(let i=0;i<5;i++){const y=floor-125+i*30,drift=state.reducedMotion?0:Math.sin(state.time*.12+i)*60;ctx.beginPath();ctx.ellipse(width*.5+drift,y,width*(.34+i*.035),12+i*3,0,0,Math.PI*2);ctx.fill()}ctx.restore();
  ctx.fillStyle='#34383a';for(let i=0;i<7;i++){const x=(i*311-state.cameraX*.08)%(width+100);ctx.fillRect(x<0?x+width+100:x,floor-6-(i%3)*4,34+i%2*18,5)}
  // Removed ambiguous bird arcs that overlapped the NOVA RUN branding.
}

function drawPlatform(ctx,rect,state){
  let fill='#353a3d',edge='#d87522';if(rect.type==='moving')edge='#f0a348';if(rect.type==='bounce')edge='#fff3c9';if(rect.type==='crumble')edge='#a95e2c';if(rect.hidden){fill=state.hiddenFound?'#3b4143':'rgba(52,57,59,.28)';edge=state.hiddenFound?'#efd29e':'rgba(239,210,158,.3)'}
  if(rect.type==='moving'){
    const source=PLATFORM_BY_ID.get(rect.id),phase=source?Math.sin(state.time*source.speed+source.phase):0,moveX=source?.moveX||0,moveY=source?.moveY||0,baseX=source?.x??rect.x,baseY=rect.y-phase*moveY,cx=baseX+rect.w/2,cy=baseY+rect.h/2;
    ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(240,163,72,.48)';ctx.lineWidth=5;ctx.setLineDash([12,9]);ctx.beginPath();ctx.moveTo(cx-moveX,cy-moveY);ctx.lineTo(cx+moveX,cy+moveY);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f7d6a6';for(const sign of [-1,1]){ctx.beginPath();ctx.arc(cx+moveX*sign,cy+moveY*sign,5,0,Math.PI*2);ctx.fill()}ctx.restore();
  }
  rounded(ctx,rect.x,rect.y,rect.w,rect.h,6,fill,edge);ctx.fillStyle=edge;ctx.fillRect(rect.x+8,rect.y+3,rect.w-16,3);
  if(rect.type==='moving'){ctx.fillStyle='#f8ddb5';ctx.globalAlpha=.9;for(let x=rect.x+rect.w*.38;x<=rect.x+rect.w*.62;x+=rect.w*.12){ctx.fillRect(x-3,rect.y+9,6,8)}ctx.globalAlpha=1;ctx.fillStyle=edge;ctx.beginPath();ctx.arc(rect.x+rect.w/2,rect.y+rect.h-5,3,0,Math.PI*2);ctx.fill()}
  if(rect.type==='crumble'){ctx.strokeStyle='#efd29e';for(let x=rect.x+28;x<rect.x+rect.w-20;x+=46){ctx.beginPath();ctx.moveTo(x,rect.y+3);ctx.lineTo(x+12,rect.y+11);ctx.lineTo(x+4,rect.y+17);ctx.stroke()}}
  if(rect.type==='bounce'){ctx.fillStyle='#fff3c9';for(let x=rect.x+16;x<rect.x+rect.w-12;x+=28)polygon(ctx,[[x,rect.y+14],[x+8,rect.y+5],[x+16,rect.y+14]],'#fff3c9')}
}

function render(ctx,state,width,height,theme={}){
  const floor=floorFor(height),camera=state.cameraX;renderBackground(ctx,state,width,height);
  ctx.save();ctx.translate(-camera,0);
  ctx.fillStyle='rgba(226,239,224,.13)';ctx.fillRect(WIND_ZONE.x,floor-300,WIND_ZONE.w,330);ctx.strokeStyle='rgba(255,249,226,.38)';for(let x=WIND_ZONE.x+30;x<WIND_ZONE.x+WIND_ZONE.w;x+=74){ctx.beginPath();ctx.moveTo(x,floor-42);ctx.quadraticCurveTo(x+28,floor-125,x+10,floor-205);ctx.stroke()}
  ctx.fillStyle='rgba(107,118,133,.13)';ctx.fillRect(GRAVITY_ZONE.x,floor-330,GRAVITY_ZONE.w,360);ctx.strokeStyle='rgba(245,222,183,.28)';for(let x=GRAVITY_ZONE.x+25;x<GRAVITY_ZONE.x+GRAVITY_ZONE.w;x+=92){ctx.beginPath();ctx.arc(x,floor-110,26,0,Math.PI*2);ctx.stroke()}
  for(const platform of PLATFORMS){const rect=platformRect(platform,state,height);if(rect)drawPlatform(ctx,rect,state)}

  const crystalOpen=['sun-shard','mist-shard','ridge-shard'].every(id=>state.collected.has(id)),timedOpen=state.time<state.doorOpenUntil;
  for(const gate of [{...GATES.crystal,open:crystalOpen,color:'#d87522'},{...GATES.timed,open:timedOpen,color:'#f3d7a7'}])if(!gate.open){ctx.fillStyle=gate.color;ctx.globalAlpha=.78;ctx.fillRect(gate.x,floor-gate.h,gate.w,gate.h);ctx.globalAlpha=1;ctx.strokeStyle='#fff6df';for(let y=floor-gate.h+12;y<floor;y+=24){ctx.beginPath();ctx.moveTo(gate.x+4,y);ctx.lineTo(gate.x+gate.w-4,y);ctx.stroke()}}
  const remaining=Math.max(0,state.doorOpenUntil-state.time);ctx.fillStyle=timedOpen?'#f7e9cb':'#c87532';rounded(ctx,GATES.switch.x,floor+GATES.switch.y,GATES.switch.w,GATES.switch.h,8,ctx.fillStyle,'#fff4d4');if(remaining>0){ctx.fillStyle='#fff4d4';ctx.fillRect(GATES.switch.x,floor+GATES.switch.y-8,GATES.switch.w*(remaining/GATES.switch.duration),4)}

  for(const item of COLLECTIBLES){if(state.collected.has(item.id)||(item.hidden&&!state.hiddenFound))continue;const x=item.x,y=floor+item.y,pulse=state.reducedMotion?1:1+Math.sin(state.time*4+item.x)*.12;ctx.save();ctx.translate(x,y);ctx.scale(pulse,pulse);ctx.shadowBlur=10;ctx.shadowColor='#f09a31';polygon(ctx,[[0,-14],[11,0],[0,14],[-11,0]],'#f3aa42','#fff4d6');ctx.restore()}
  for(let index=0;index<CHECKPOINTS.length;index++){const cp=CHECKPOINTS[index],active=index<=state.checkpoint,x=cp.x,y=floor+cp.y,color=active?'#e9872f':'rgba(239,220,186,.42)';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-45);ctx.stroke();polygon(ctx,[[x,y-57],[x+10,y-47],[x,y-37],[x-10,y-47]],color,active?'#fff0d0':'rgba(239,220,186,.3)')}
  for(const portal of PORTALS){if(portal.hidden&&!state.hiddenFound)continue;const x=portal.x+portal.w/2,y=floor+portal.y+portal.h/2;ctx.save();ctx.translate(x,y);ctx.rotate(state.reducedMotion?0:state.time*.65);ctx.strokeStyle='#f4ddba';ctx.lineWidth=5;ctx.shadowBlur=10;ctx.shadowColor='#e07825';ctx.beginPath();ctx.ellipse(0,0,portal.w*.42,portal.h*.46,0,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,portal.w*.26,portal.h*.32,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  for(const hazard of HAZARDS){const x=hazard.x,y=floor+hazard.y;ctx.shadowBlur=8;ctx.shadowColor='#e36920';for(let dx=0;dx<hazard.w;dx+=22)polygon(ctx,[[x+dx,y+hazard.h],[x+dx+11,y],[x+dx+22,y+hazard.h]],'#d9651f','#fff0d0');ctx.shadowBlur=0}
  globalThis.NovaChallengeEngine.drawFinishGate(ctx,state,height,FINISH,{floorRatio:.82,primary:'#e87825',secondary:'#fff2cf',body:'#4d4540',energy:'#78d996'});

  ctx.restore();

  ctx.save();ctx.fillStyle='rgba(38,42,44,.72)';rounded(ctx,18,18,250,54,14,ctx.fillStyle,'rgba(244,224,190,.35)');ctx.fillStyle='#fff0d0';ctx.font='600 13px system-ui';ctx.fillText(`◇ ${state.collected.size}/4   ⚑ ${state.checkpoint+1}/${CHECKPOINTS.length}   ☠ ${state.deaths}`,34,41);ctx.fillStyle='#e9953d';ctx.fillText(`${state.hiddenFound?'HIDDEN RIDGE FOUND':'DREAM PEAK'}   ${state.manualControl?'MANUAL':'AUTO ▶'}`,34,61);ctx.restore();
  if(state.respawnFlash>0&&!state.reducedMotion){ctx.fillStyle=`rgba(233,126,39,${state.respawnFlash*.55})`;ctx.fillRect(0,0,width,height)}
}

function mountainEnvironment(state,input,{player}){const center=player.x+player.w*.5,inWind=center>WIND_ZONE.x&&center<WIND_ZONE.x+WIND_ZONE.w,inGravity=center>GRAVITY_ZONE.x&&center<GRAVITY_ZONE.x+GRAVITY_ZONE.w;return{gravityScale:inGravity?PLAYER.lowGravity:1,forceX:inWind?42:0,forceY:inWind?-150:0}}
function mountainBlockers(state,{floor}){const blockers=[];if(!['sun-shard','mist-shard','ridge-shard'].every(id=>state.collected.has(id)))blockers.push({x:GATES.crystal.x,y:floor-GATES.crystal.h,w:GATES.crystal.w,h:GATES.crystal.h});if(state.time>=state.doorOpenUntil)blockers.push({x:GATES.timed.x,y:floor-GATES.timed.h,w:GATES.timed.w,h:GATES.timed.h});return blockers}
function mountainAfterPhysics(state,input,{floor,player,overlap},events){const rect={x:GATES.switch.x,y:floor+GATES.switch.y,w:GATES.switch.w,h:GATES.switch.h};if(overlap(player,rect)&&state.doorOpenUntil<state.time+1){state.doorOpenUntil=state.time+GATES.switch.duration;events.push({type:'switch',duration:GATES.switch.duration})}}
function validateExtras(){const errors=[];if(PORTALS.length<2)errors.push('missing-portals');if(COLLECTIBLES.length<4)errors.push('missing-collectibles');if(GATES.switch.duration<6)errors.push('timed-door-too-short');return errors}

const engine=globalThis.NovaChallengeEngine;if(!engine)throw new Error('Challenge engine unavailable');
challengeMap=engine.createMap({id:'dreamPeak',worldLength:WORLD_LENGTH,player:PLAYER,platforms:PLATFORMS,checkpoints:CHECKPOINTS,collectibles:COLLECTIBLES,portals:PORTALS,hazards:HAZARDS,finish:FINISH,floorRatio:.82,requiredMechanisms:['moving','crumble','bounce','hidden'],createState:()=>({doorOpenUntil:0}),environment:mountainEnvironment,blockers:mountainBlockers,afterPhysics:mountainAfterPhysics,collectibleVisible:(item,state)=>!item.hidden||state.hiddenFound,score:state=>Math.floor(state.player.x+state.collected.size*420+state.checkpoint*260+(state.hiddenFound?900:0)-state.deaths*75),render,validate:validateExtras});
globalThis.NovaMountainMap=Object.freeze({...challengeMap,WIND_ZONE,GRAVITY_ZONE,GATES,FINISH});
})();

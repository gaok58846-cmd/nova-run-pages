(()=>{
'use strict';
const engine=globalThis.NovaChallengeEngine;if(!engine)throw new Error('Challenge engine unavailable');
const WORLD_LENGTH=8200;
const PLAYER={runSpeed:268,jumpVelocity:-705,dashSpeed:540,dashCooldown:.82};
const PLATFORMS=Object.freeze([
  {id:'sun-start',x:0,w:620,y:0,type:'solid'},{id:'gear-a',x:700,w:210,y:-35,type:'gear',orbitX:34,orbitY:24,speed:.75,phase:.2},{id:'gear-b',x:980,w:210,y:-78,type:'gear',orbitX:28,orbitY:36,speed:.9,phase:1.1},{id:'ruin-a',x:1260,w:320,y:-40,type:'solid'},
  {id:'phase-a1',x:1650,w:220,y:-82,type:'phaseA'},{id:'phase-a2',x:1930,w:210,y:-126,type:'phaseA'},{id:'phase-b1',x:1650,w:220,y:-16,type:'phaseB',main:false},{id:'phase-b2',x:1930,w:210,y:-58,type:'phaseB',main:false},{id:'hourglass-rest',x:2210,w:320,y:-55,type:'solid'},
  {id:'sink-a',x:2600,w:210,y:-58,type:'sinking'},{id:'sink-b',x:2880,w:210,y:-104,type:'sinking'},{id:'sink-rest',x:3160,w:300,y:-42,type:'solid'},{id:'clock-road',x:3540,w:800,y:0,type:'solid'},
  {id:'phase-a3',x:4420,w:220,y:-72,type:'phaseA'},{id:'phase-a4',x:4700,w:220,y:-124,type:'phaseA'},{id:'phase-b3',x:4420,w:220,y:-18,type:'phaseB',main:false},{id:'phase-b4',x:4700,w:220,y:-64,type:'phaseB',main:false},{id:'lever-road',x:5000,w:190,y:-36,type:'solid'},
  {id:'hidden-clock',x:4580,w:250,y:-245,type:'hidden',main:false},{id:'chase-start',x:5260,w:360,y:0,type:'solid'},{id:'chase-a',x:5690,w:200,y:-50,type:'gear',orbitX:25,orbitY:18,speed:1.05,phase:.6},{id:'chase-b',x:5960,w:200,y:-88,type:'sinking'},
  {id:'chase-c',x:6230,w:210,y:-42,type:'gear',orbitX:30,orbitY:24,speed:1.18,phase:1.8},{id:'chase-d',x:6510,w:210,y:-96,type:'sinking'},{id:'oasis-rest',x:6790,w:380,y:-32,type:'solid'},
  {id:'final-gear-a',x:7250,w:210,y:-88,type:'gear',orbitX:42,orbitY:36,speed:1.15,phase:.3},{id:'final-gear-b',x:7530,w:210,y:-132,type:'gear',orbitX:38,orbitY:42,speed:1.28,phase:1.4},{id:'clock-tower',x:7810,w:390,y:0,type:'solid'}
]);
const CHECKPOINTS=Object.freeze([{id:'cp-sun',x:120,y:-70},{id:'cp-hourglass',x:2200,y:-125},{id:'cp-clock',x:3450,y:-112},{id:'cp-chase',x:5180,y:-106},{id:'cp-oasis',x:6770,y:-102},{id:'cp-tower',x:7740,y:-70}]);
const COLLECTIBLES=Object.freeze([{id:'time-sigil-a',x:1080,y:-190},{id:'time-sigil-b',x:2990,y:-220},{id:'time-sigil-c',x:6360,y:-205},{id:'time-sigil-secret',x:4700,y:-330,hidden:true}]);
const HAZARDS=Object.freeze([{id:'sun-spike-a',x:1540,y:-30,w:60,h:30},{id:'sun-spike-b',x:4300,y:-30,w:62,h:30},{id:'sun-spike-c',x:7145,y:-30,w:60,h:30}]);
const SWITCHES=Object.freeze([{id:'phase-switch-a',x:1390,y:-92,w:70,h:38},{id:'phase-switch-b',x:3910,y:-92,w:70,h:38}]);
const LEVER=Object.freeze({id:'clock-lever',x:5138,w:38,h:170});
const FINISH=Object.freeze({x:8085,y:-154,w:78,h:154});
function platformMotion(platform,state,height,time,rect){
  if(platform.type==='gear'){rect.x+=Math.sin(time*platform.speed+platform.phase)*platform.orbitX;rect.y+=Math.cos(time*platform.speed+platform.phase)*platform.orbitY}
  if(platform.type==='phaseA'&&state.phase!==0||platform.type==='phaseB'&&state.phase!==1)return null;
  if(platform.type==='sinking'&&state.sinking[platform.id]!=null){const elapsed=Math.max(0,time-state.sinking[platform.id]);if(elapsed>4.6)return null;rect.y+=Math.min(105,elapsed*elapsed*9+elapsed*9)}return rect;
}
function onLand(state,platform,context,events){if(platform.type==='sinking'&&state.sinking[platform.id]==null){state.sinking[platform.id]=state.time;events.push({type:'sandSink',id:platform.id})}}
function blockers(state,{floor}){return state.brokenLevers.has(LEVER.id)?[]:[{x:LEVER.x,y:floor-LEVER.h,w:LEVER.w,h:LEVER.h}]}
function afterPhysics(state,input,{floor,height,player,overlap,dt},events,{respawn}){
  let touching=false;for(const item of SWITCHES){const rect={x:item.x,y:floor+item.y,w:item.w,h:item.h};if(overlap(player,rect)){touching=true;if(!state.switchContact){state.phase=state.phase?0:1;events.push({type:'phaseShift',phase:state.phase})}}}state.switchContact=touching;
  if(!state.brokenLevers.has(LEVER.id)&&player.dash>0&&Math.abs(player.x+player.w-LEVER.x)<12){state.brokenLevers.add(LEVER.id);events.push({type:'leverBreak',id:LEVER.id});player.vx=Math.max(player.vx,230)}
  if(player.x>5260){if(!state.chaseActive){state.chaseActive=true;state.sandWaveX=Math.min(player.x-260,5260)}state.sandWaveX+=dt*(150+Math.max(0,player.x-state.sandWaveX-330)*.28);if(player.x<state.sandWaveX+64)respawn(state,height,'sand-wave')}
}
function onRespawn(state){state.sinking={};state.chaseActive=state.checkpoint>=3;state.sandWaveX=CHECKPOINTS[state.checkpoint].x-290;state.switchContact=false}
function score(state){return Math.floor(state.player.x+state.collected.size*520+state.checkpoint*340+state.brokenLevers.size*650+(state.hiddenFound?800:0)-state.deaths*90)}
function render(ctx,state,width,height,theme,api){
  const {floorFor,platformRect,polygon,rounded,drawFinishGate}=api,floor=floorFor(height),camera=state.cameraX;const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#ead5ad');sky.addColorStop(.58,'#d6a86e');sky.addColorStop(1,'#5d4937');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);ctx.fillStyle='rgba(255,237,190,.8)';ctx.beginPath();ctx.arc(width*.22,height*.2,Math.min(width,height)*.105,0,Math.PI*2);ctx.fill();
  for(let i=0;i<7;i++){const x=(i*220-state.cameraX*.06)%(width+260);ctx.fillStyle=i%2?'#6c5742':'#8b6a49';ctx.fillRect(x<0?x+width+260:x,floor-90-(i%3)*52,95,100+(i%3)*52)}ctx.save();ctx.translate(-camera,0);
  if(state.chaseActive){const x=state.sandWaveX,crest=x+68,wave=ctx.createLinearGradient(x,0,x+165,0);wave.addColorStop(0,'rgba(112,65,39,.78)');wave.addColorStop(.46,'rgba(194,121,61,.7)');wave.addColorStop(1,'rgba(242,190,105,.08)');ctx.fillStyle=wave;ctx.beginPath();ctx.moveTo(x,floor+24);ctx.lineTo(x,floor-28);ctx.bezierCurveTo(x+18,floor-65,x+25,floor-116,crest,floor-136);ctx.bezierCurveTo(x+106,floor-112,x+122,floor-52,x+165,floor-20);ctx.lineTo(x+165,floor+24);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(255,220,155,.7)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+10,floor-36);ctx.bezierCurveTo(x+34,floor-72,x+31,floor-111,crest,floor-132);ctx.stroke();ctx.lineWidth=2;ctx.globalAlpha=.42;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+28+i*17,floor-24-i*19);ctx.quadraticCurveTo(x+73+i*10,floor-46-i*17,x+126,floor-29-i*9);ctx.stroke()}ctx.globalAlpha=1}
  for(const platform of PLATFORMS){const rect=platformRect(platform,state,height);if(!rect)continue;const gear=platform.type==='gear',phase=platform.type==='phaseA'||platform.type==='phaseB',sink=platform.type==='sinking';rounded(ctx,rect.x,rect.y,rect.w,rect.h,4,gear?'#9d7948':phase?(state.phase?'#50625d':'#c18a58'):sink?'#b98854':'#d6bd8e',gear?'#f0bd62':'#544638');ctx.fillStyle=gear?'#3b3730':'rgba(61,52,43,.55)';for(let x=rect.x+12;x<rect.x+rect.w-10;x+=28)ctx.fillRect(x,rect.y+5,12,5)}
  for(const item of SWITCHES){const active=state.phase===SWITCHES.indexOf(item)%2,cx=item.x+item.w/2,cy=floor+item.y+item.h/2;rounded(ctx,item.x,floor+item.y,item.w,item.h,8,active?'#d5b069':'#4f5e58','#fff0c7');polygon(ctx,[[cx,cy-11],[cx+11,cy],[cx,cy+11],[cx-11,cy]],active?'#7b4f34':'#e4c27c','#fff0c7')}
  if(!state.brokenLevers.has(LEVER.id)){ctx.fillStyle='#6d4c35';ctx.fillRect(LEVER.x,floor-LEVER.h,LEVER.w,LEVER.h);ctx.strokeStyle='#f0bd62';ctx.lineWidth=4;for(let y=floor-LEVER.h+12;y<floor;y+=25){ctx.beginPath();ctx.moveTo(LEVER.x,y);ctx.lineTo(LEVER.x+LEVER.w,y+12);ctx.stroke()}}
  for(const item of COLLECTIBLES)if(!state.collected.has(item.id)&&(!item.hidden||state.hiddenFound)){ctx.save();ctx.translate(item.x,floor+item.y);ctx.rotate(state.reducedMotion?0:state.time*.8);polygon(ctx,[[0,-13],[12,0],[0,13],[-12,0]],'#efb65f','#fff1ca');ctx.restore()}
  for(let i=0;i<CHECKPOINTS.length;i++){const cp=CHECKPOINTS[i],active=i<=state.checkpoint,y=floor+cp.y,color=active?'#d77850':'#8b7256';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cp.x,y);ctx.lineTo(cp.x,y-45);ctx.stroke();polygon(ctx,[[cp.x,y-57],[cp.x+10,y-47],[cp.x,y-37],[cp.x-10,y-47]],color,active?'#fff0c7':'#6e5944')}
  for(const h of HAZARDS){ctx.fillStyle='#b94f37';for(let dx=0;dx<h.w;dx+=20)polygon(ctx,[[h.x+dx,floor+h.y+h.h],[h.x+dx+10,floor+h.y],[h.x+dx+20,floor+h.y+h.h]],'#b94f37','#ffcf89')}
  drawFinishGate(ctx,state,height,FINISH,{floorRatio:.82,primary:'#f0bd62',secondary:'#fff0c7',body:'#6d4c35',energy:'#d77850'});ctx.restore();
    ctx.save();

  const portraitHud=height>width;
  const challengeHudWidth=portraitHud
    ? Math.min(width-32,360)
    : 300;

  const challengeHudX=portraitHud
    ? (width-challengeHudWidth)/2
    : 16;

  const challengeHudY=portraitHud
    ? 104
    : 16;

  const challengeHudFont=portraitHud&&width<370
    ? 11
    : 12;

  rounded(
    ctx,
    challengeHudX,
    challengeHudY,
    challengeHudWidth,
    58,
    14,
    'rgba(50,43,35,.8)',
    'rgba(240,189,98,.35)'
  );

  ctx.fillStyle='#fff0c7';
  ctx.font=`700 ${challengeHudFont}px system-ui`;

  ctx.fillText(
    `PHASE ${state.phase?'UMBRA':'SOL'}   ◇ ${state.collected.size}/4   ⚑ ${state.checkpoint+1}/6`,
    challengeHudX+14,
    challengeHudY+23
  );

  ctx.fillStyle=state.chaseActive
    ? '#ef8c5e'
    : '#f0bd62';

  ctx.fillText(
    state.chaseActive
      ? 'SAND SURGE — KEEP MOVING'
      : 'CLOCKWORK STABLE',
    challengeHudX+14,
    challengeHudY+43
  );

  ctx.restore();

  if(state.respawnFlash>0&&!state.reducedMotion){
    ctx.fillStyle=`rgba(215,120,76,${state.respawnFlash*.42})`;
    ctx.fillRect(0,0,width,height);
  }
}
const map=engine.createMap({id:'sandClock',worldLength:WORLD_LENGTH,player:PLAYER,platforms:PLATFORMS,checkpoints:CHECKPOINTS,collectibles:COLLECTIBLES,hazards:HAZARDS,finish:FINISH,floorRatio:.82,requiredMechanisms:['gear','sinking','phaseA','phaseB'],minCheckpoints:6,createState:()=>({phase:0,sinking:{},switchContact:false,brokenLevers:new Set(),chaseActive:false,sandWaveX:4970}),platformMotion,onLand,blockers,afterPhysics,onRespawn,collectibleVisible:(item,state)=>!item.hidden||state.hiddenFound,score,render,validate:()=>PLATFORMS.filter(p=>p.type==='gear').length>=5?[]:['missing-gear-platforms']});
globalThis.NovaSandClockMap=Object.freeze({...map,SWITCHES,LEVER,FINISH});
})();

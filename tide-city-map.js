(()=>{
'use strict';
const engine=globalThis.NovaChallengeEngine;if(!engine)throw new Error('Challenge engine unavailable');
const WORLD_LENGTH=7600;
const PLAYER={runSpeed:262,jumpVelocity:-700,dashSpeed:525};
const PLATFORMS=Object.freeze([
  {id:'harbor-start',x:0,w:600,y:0,type:'solid'},{id:'dock-a',x:680,w:260,y:-20,type:'solid'},{id:'tide-watch',x:1020,w:260,y:-65,type:'solid'},
  {id:'float-a',x:1350,w:220,y:-94,type:'buoyant',lift:46,phase:.1},{id:'float-b',x:1630,w:210,y:-132,type:'buoyant',lift:55,phase:.45},{id:'upper-quay',x:1910,w:300,y:-95,type:'solid'},
  {id:'current-entry',x:2280,w:260,y:-40,type:'solid'},{id:'current-float',x:2610,w:220,y:-112,type:'buoyant',lift:42,phase:.7},{id:'sluice-road',x:2900,w:800,y:0,type:'solid'},
  {id:'valve-step',x:3170,w:180,y:-88,type:'moving',moveY:28,speed:.9,phase:.4,main:false},{id:'split-high-a',x:3780,w:240,y:-108,type:'solid'},
  {id:'split-low-a',x:3820,w:250,y:-10,type:'hidden',main:false},{id:'float-c',x:4090,w:220,y:-146,type:'buoyant',lift:58,phase:1.1},{id:'tide-tower',x:4380,w:260,y:-100,type:'solid'},
  {id:'current-a',x:4720,w:260,y:-50,type:'solid'},{id:'current-b',x:5050,w:220,y:-108,type:'buoyant',lift:44,phase:1.5},{id:'rest-quay',x:5340,w:340,y:-40,type:'solid'},
  {id:'rust-road',x:5750,w:760,y:0,type:'solid'},{id:'final-float',x:6570,w:220,y:-80,type:'buoyant',lift:38,phase:2.1},{id:'lighthouse-road',x:6860,w:740,y:0,type:'solid'}
]);
const CHECKPOINTS=Object.freeze([{id:'cp-harbor',x:120,y:-70},{id:'cp-current',x:1940,y:-165},{id:'cp-sluice',x:3650,y:-70},{id:'cp-ruins',x:5320,y:-110},{id:'cp-light',x:6820,y:-70}]);
const COLLECTIBLES=Object.freeze([{id:'tide-pearl-a',x:1530,y:-220},{id:'tide-pearl-b',x:2730,y:-210},{id:'tide-pearl-c',x:4220,y:-245},{id:'tide-pearl-secret',x:3950,y:-85}]);
const HAZARDS=Object.freeze([{id:'hot-vent-a',x:1220,y:-18,w:68,h:55,reason:'heated-water'},{id:'hot-vent-b',x:4510,y:-20,w:75,h:55,reason:'heated-water'},{id:'hot-vent-c',x:6450,y:-18,w:70,h:55,reason:'heated-water'}]);
const CURRENT_ZONES=Object.freeze([{x:2220,w:650,force:105},{x:4620,w:660,force:-72}]);
const SLUICE=Object.freeze({gate:{x:3628,w:34,h:190},valve:{x:3205,y:-120,w:72,h:38,duration:7}});
const GRATE=Object.freeze({id:'rust-grate',x:6210,w:38,h:170});
const FINISH=Object.freeze({x:7485,y:-146,w:76,h:146});
const tideAmount=state=>state.time<state.tideFrozenUntil?state.frozenTide:(Math.sin(state.time*.55)+1)*.5;
const waterLevel=(state,height)=>height*.82-82-tideAmount(state)*62;
function platformMotion(platform,state,height,time,rect){if(platform.type==='buoyant'){const tide=tideAmount(state),bob=state.reducedMotion?0:Math.sin(time*1.15+platform.phase)*5;rect.y-=tide*platform.lift+bob}return rect}
function environment(state,input,{player,height}){const level=waterLevel(state,height),submerged=player.y+player.h*.72>level;let forceX=0;if(submerged)for(const zone of CURRENT_ZONES)if(player.x+player.w*.5>zone.x&&player.x<zone.x+zone.w)forceX+=zone.force;return{submerged,gravityScale:submerged?.48:1,speedScale:submerged?.74:1,forceX,forceY:submerged?-42:0}}
function blockers(state,{floor}){const list=[];if(state.time>=state.tideFrozenUntil)list.push({x:SLUICE.gate.x,y:floor-SLUICE.gate.h,w:SLUICE.gate.w,h:SLUICE.gate.h});if(!state.brokenGrates.has(GRATE.id))list.push({x:GRATE.x,y:floor-GRATE.h,w:GRATE.w,h:GRATE.h});return list}
function afterPhysics(state,input,{floor,player,overlap},events){
  const valve={x:SLUICE.valve.x,y:floor+SLUICE.valve.y,w:SLUICE.valve.w,h:SLUICE.valve.h};if(overlap(player,valve)&&state.valveCooldown<=state.time){state.frozenTide=tideAmount(state);state.tideFrozenUntil=state.time+SLUICE.valve.duration;state.valveCooldown=state.time+1;events.push({type:'tideFreeze',duration:SLUICE.valve.duration})}
  if(!state.brokenGrates.has(GRATE.id)&&player.dash>0&&Math.abs(player.x+player.w-GRATE.x)<12){state.brokenGrates.add(GRATE.id);events.push({type:'grateBreak',id:GRATE.id});player.vx=Math.max(player.vx,210)}
}
function score(state){return Math.floor(state.player.x+state.collected.size*480+state.checkpoint*300+state.brokenGrates.size*600-state.deaths*80)}
function render(ctx,state,width,height,theme,api){
  const {floorFor,platformRect,polygon,rounded,drawFinishGate}=api,floor=floorFor(height),level=waterLevel(state,height),camera=state.cameraX;const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#efe5cf');sky.addColorStop(.62,'#cddfd6');sky.addColorStop(1,'#507b7c');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  ctx.fillStyle='rgba(248,238,214,.78)';ctx.beginPath();ctx.arc(width*.72,height*.22,Math.min(width,height)*.1,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const x=(i*190-state.cameraX*.08)%(width+230);ctx.fillStyle=i%2?'#d8cfb8':'#ece2cc';ctx.fillRect(x<0?x+width+230:x,floor-150-(i%3)*48,90,155+(i%3)*48)}
  ctx.save();ctx.translate(-camera,0);ctx.fillStyle='rgba(36,111,116,.64)';ctx.fillRect(0,level,WORLD_LENGTH,height-level);ctx.strokeStyle='rgba(213,246,235,.72)';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<WORLD_LENGTH;x+=24){const y=level+(state.reducedMotion?0:Math.sin(x*.025+state.time*2)*3);x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
  for(const zone of CURRENT_ZONES){ctx.fillStyle='rgba(84,190,182,.12)';ctx.fillRect(zone.x,level,zone.w,height-level);ctx.strokeStyle='rgba(222,255,242,.4)';for(let x=zone.x+30;x<zone.x+zone.w;x+=95){ctx.beginPath();ctx.moveTo(x,level+45);ctx.lineTo(x+Math.sign(zone.force)*34,level+45);ctx.stroke()}}
  for(const platform of PLATFORMS){const rect=platformRect(platform,state,height);if(!rect)continue;const buoyant=platform.type==='buoyant';rounded(ctx,rect.x,rect.y,rect.w,rect.h,5,buoyant?'#bb8462':'#e4d7bd',buoyant?'#8ee3cf':'#426f70');ctx.fillStyle=buoyant?'#3f7777':'#87755e';ctx.fillRect(rect.x+10,rect.y+5,rect.w-20,4)}
  const gateOpen=state.time<state.tideFrozenUntil;if(!gateOpen){ctx.fillStyle='#b96f4f';ctx.fillRect(SLUICE.gate.x,floor-SLUICE.gate.h,SLUICE.gate.w,SLUICE.gate.h)}rounded(ctx,SLUICE.valve.x,floor+SLUICE.valve.y,SLUICE.valve.w,SLUICE.valve.h,9,gateOpen?'#79b5a8':'#b96f4f','#f4ead2');
  if(!state.brokenGrates.has(GRATE.id)){ctx.strokeStyle='#b86e49';ctx.lineWidth=5;for(let y=floor-GRATE.h;y<floor;y+=22){ctx.beginPath();ctx.moveTo(GRATE.x,y);ctx.lineTo(GRATE.x+GRATE.w,y);ctx.stroke()}}
  for(const item of COLLECTIBLES)if(!state.collected.has(item.id)){ctx.save();ctx.translate(item.x,floor+item.y);ctx.fillStyle='#f1be7d';ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff3db';ctx.stroke();ctx.restore()}
  for(let i=0;i<CHECKPOINTS.length;i++){const cp=CHECKPOINTS[i],active=i<=state.checkpoint,y=floor+cp.y,color=active?'#e59a61':'#8ba6a1';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cp.x,y);ctx.lineTo(cp.x,y-43);ctx.stroke();polygon(ctx,[[cp.x,y-55],[cp.x+10,y-45],[cp.x,y-35],[cp.x-10,y-45]],color,active?'#fff2cf':'#557b79')}
  for(const h of HAZARDS){ctx.fillStyle='#cf5d3f';ctx.globalAlpha=.82;ctx.fillRect(h.x,floor+h.y,h.w,h.h);ctx.globalAlpha=1;ctx.fillStyle='#ffd6a2';for(let x=h.x+8;x<h.x+h.w;x+=18){ctx.beginPath();ctx.arc(x,floor+h.y+8,4,0,Math.PI*2);ctx.fill()}}
  drawFinishGate(ctx,state,height,FINISH,{floorRatio:.82,primary:'#8ee3cf',secondary:'#fff2cf',body:'#356466',energy:'#f1be7d'});ctx.restore();
    ctx.save();

  const portraitHud=height>width;
  const challengeHudWidth=portraitHud
    ? Math.min(width-32,360)
    : 286;

  const challengeHudX=portraitHud
    ? (width-challengeHudWidth)/2
    : 16;

  const challengeHudY=portraitHud
    ? 76
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
    'rgba(29,55,57,.78)',
    'rgba(213,246,235,.32)'
  );

  ctx.fillStyle='#f7ead2';
  ctx.font=`700 ${challengeHudFont}px system-ui`;

  ctx.fillText(
    `TIDE ${Math.round(tideAmount(state)*100)}%   ◇ ${state.collected.size}/4   ⚑ ${state.checkpoint+1}/5`,
    challengeHudX+14,
    challengeHudY+23
  );

  ctx.fillStyle=state.time<state.tideFrozenUntil
    ? '#f2bb7e'
    : '#8ee3cf';

  ctx.fillText(
    state.time<state.tideFrozenUntil
      ? 'TIDE LOCKED'
      : 'CURRENT ACTIVE',
    challengeHudX+14,
    challengeHudY+43
  );

  ctx.restore();

  if(state.respawnFlash>0&&!state.reducedMotion){
    ctx.fillStyle=`rgba(77,174,168,${state.respawnFlash*.42})`;
    ctx.fillRect(0,0,width,height);
  }
const map=engine.createMap({id:'tideCity',worldLength:WORLD_LENGTH,player:PLAYER,platforms:PLATFORMS,checkpoints:CHECKPOINTS,collectibles:COLLECTIBLES,hazards:HAZARDS,finish:FINISH,floorRatio:.82,requiredMechanisms:['buoyant'],minCheckpoints:5,createState:()=>({tideFrozenUntil:0,frozenTide:.5,valveCooldown:0,brokenGrates:new Set()}),platformMotion,environment,blockers,afterPhysics,score,render,validate:()=>PLATFORMS.filter(p=>p.type==='buoyant').length>=4?[]:['missing-buoyant-platforms']});
globalThis.NovaTideCityMap=Object.freeze({...map,CURRENT_ZONES,SLUICE,GRATE,FINISH,tideAmount,waterLevel});
})();

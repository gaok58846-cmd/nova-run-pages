(()=>{
'use strict';

const DIFFICULTY = Object.freeze({
  easy: Object.freeze({startSpeed:355,maxSpeed:650,accel:.04,spawnBase:1.48,spawnMin:.8,spawnJitter:.55,gapBase:105,gapExtra:45,energyRegen:3.4,scoreMult:.85,startEnergy:65,safeTime:1.05,introSeconds:4.8,introDistance:145,earlyUntil:620,lateAt:1850,maxPattern:2,midComboChance:.14,lateComboChance:.3,forceComboAfter:5}),
  medium: Object.freeze({startSpeed:430,maxSpeed:840,accel:.065,spawnBase:1.2,spawnMin:.58,spawnJitter:.5,gapBase:125,gapExtra:65,energyRegen:2.6,scoreMult:1,startEnergy:40,safeTime:.86,introSeconds:4.2,introDistance:165,earlyUntil:520,lateAt:1450,maxPattern:3,midComboChance:.3,lateComboChance:.54,forceComboAfter:4}),
  hard: Object.freeze({startSpeed:510,maxSpeed:980,accel:.09,spawnBase:.98,spawnMin:.46,spawnJitter:.38,gapBase:150,gapExtra:90,energyRegen:1.8,scoreMult:1.35,startEnergy:25,safeTime:.72,introSeconds:3.7,introDistance:185,earlyUntil:440,lateAt:1050,maxPattern:3,midComboChance:.46,lateComboChance:.72,forceComboAfter:3})
});

const RUNNER_SCENES=Object.freeze(['guangzhou','shanghai','shenzhen','snow','volcano','jiuzhaigou']);
const CHALLENGE_SCENES=Object.freeze(['dreamPeak','tideCity','sandClock']);
const SCENES = Object.freeze([...RUNNER_SCENES,...CHALLENGE_SCENES]);

const PHYSICS = Object.freeze({
  coyoteTime:.11,
  jumpBuffer:.12,
  firstJumpVelocity:-700,
  secondJumpVelocity:-610,
  heldGravity:1850,
  releasedGravity:2350,
  maxFallSpeed:1080,
  dashCost:22,
  dashDuration:.3,
  slideDuration:.5
});

const PARALLAX = Object.freeze({scene:1.4,stars:.08,mid:.65,near:3.8,track:10});
const GATE_GAP_HEIGHT=Object.freeze({easy:148,medium:136,hard:122});
const CONTENT=Object.freeze({
  sceneUnlocks:Object.freeze({guangzhou:0,shanghai:800,shenzhen:2000,snow:4500,volcano:8000,jiuzhaigou:12000,dreamPeak:'runs:5',tideCity:Object.freeze({complete:'dreamPeak'}),sandClock:Object.freeze({complete:'tideCity'})}),
  skins:Object.freeze([
    Object.freeze({id:'nova',distance:0,nameKey:'skin_nova',descriptionKey:'skinDesc_nova',pattern:'nova',color:'one',trail:'one',palette:Object.freeze({body:'#d8edf2',bodyShade:'#5d8794',visor:'#79d6ef',core:'#78c8ff',outline:'#7bd9e6',particle:'#9ce9f5',trail:'#67cbe8'})}),
    Object.freeze({id:'pulse',distance:1800,nameKey:'skin_pulse',descriptionKey:'skinDesc_pulse',pattern:'pulse',color:'three',trail:'three',palette:Object.freeze({body:'#d9eee4',bodyShade:'#3f8064',visor:'#79e5b6',core:'#68e39b',outline:'#63d99a',particle:'#8ff0b6',trail:'#43c981'})}),
    Object.freeze({id:'sunset',distance:5000,nameKey:'skin_sunset',descriptionKey:'skinDesc_sunset',pattern:'sunset',color:'two',trail:'two',palette:Object.freeze({body:'#f2dfd3',bodyShade:'#a8563f',visor:'#ffb17d',core:'#ff875d',outline:'#ee7c55',particle:'#ffc08b',trail:'#ef7550'})}),
    Object.freeze({id:'prism',collects:80,nameKey:'skin_prism',descriptionKey:'skinDesc_prism',pattern:'prism',color:'four',trail:'five',palette:Object.freeze({body:'#e5ddf2',bodyShade:'#725a9c',visor:'#d4a5ff',core:'#ae7cff',outline:'#b899e8',particle:'#d1b6ff',trail:'#866fd3'})}),
    Object.freeze({id:'ace',combo:10,nameKey:'skin_ace',descriptionKey:'skinDesc_ace',pattern:'aurora',color:'five',trail:'three',palette:Object.freeze({body:'#f0eee5',bodyShade:'#536a75',visor:'#c6fff1',core:'#ffd489',outline:'#80d7c7',particle:'#eab8ff',trail:'#79d7b6',aurora:Object.freeze(['#6fd9c0','#8db9ff','#d7a4f2','#f1bf78'])})})
  ]),
  achievements:Object.freeze([
    Object.freeze({id:'firstRun',type:'runs',target:1}),
    Object.freeze({id:'distance5k',type:'distance',target:5000}),
    Object.freeze({id:'collector100',type:'collects',target:100}),
    Object.freeze({id:'combo10',type:'combo',target:10}),
    Object.freeze({id:'breaker25',type:'breaks',target:25}),
    Object.freeze({id:'daily3',type:'daily',target:3})
  ])
});

const HAZARDS = Object.freeze({
  crate:Object.freeze({width:48,action:'jump',recovery:.2,dashBreakable:true}),
  spike:Object.freeze({width:66,action:'jump',recovery:.18,dashBreakable:true}),
  drone:Object.freeze({width:58,action:'slide',recovery:.28,commitment:true,dashBreakable:true}),
  gate:Object.freeze({width:32,action:'precisionJump',recovery:.38,commitment:true,gateLike:true,dashBreakable:true}),
  gap:Object.freeze({width:120,action:'gapJump',recovery:.42,commitment:true,gapLike:true}),
  spring:Object.freeze({width:58,action:'jump',recovery:.16,assist:true}),
  billboard:Object.freeze({width:72,action:'jump',recovery:.22,dashBreakable:true,scene:'guangzhou'}),
  bridgeBar:Object.freeze({width:92,action:'slide',recovery:.3,commitment:true,scene:'guangzhou'}),
  train:Object.freeze({width:118,action:'jump',recovery:.34,commitment:true,approachSpeed:170,scene:'shanghai'}),
  shutter:Object.freeze({width:38,action:'precisionJump',recovery:.4,commitment:true,gateLike:true,dashBreakable:true,scene:'shanghai'}),
  laser:Object.freeze({width:30,action:'jumpOrDash',recovery:.24,dashBreakable:true,electronic:true,scene:'shenzhen'}),
  robot:Object.freeze({width:52,action:'jumpOrDash',recovery:.26,dashBreakable:true,electronic:true,scene:'shenzhen'}),
  scanner:Object.freeze({width:86,action:'slideOrDash',recovery:.3,commitment:true,dashBreakable:true,electronic:true,scene:'shenzhen'}),
  snowball:Object.freeze({width:50,action:'jump',recovery:.24,dashBreakable:true,approachSpeed:50,scene:'snow'}),
  icicle:Object.freeze({width:48,action:'slide',recovery:.28,commitment:true,scene:'snow'}),
  crackedIce:Object.freeze({width:118,action:'gapJump',recovery:.42,commitment:true,gapLike:true,scene:'snow'}),
  rock:Object.freeze({width:52,action:'jump',recovery:.28,dashBreakable:true,warning:true,scene:'volcano'}),
  flame:Object.freeze({width:46,action:'jump',recovery:.32,commitment:true,warning:true,scene:'volcano'}),
  lava:Object.freeze({width:122,action:'gapJump',recovery:.44,commitment:true,gapLike:true,warning:true,scene:'volcano'}),
  log:Object.freeze({width:94,action:'jump',recovery:.25,dashBreakable:true,scene:'jiuzhaigou'}),
  waterPlatform:Object.freeze({width:68,action:'jump',recovery:.18,assist:true,scene:'jiuzhaigou'}),
  waterfall:Object.freeze({width:78,action:'slide',recovery:.3,commitment:true,scene:'jiuzhaigou'}),
  brokenBridge:Object.freeze({width:126,action:'gapJump',recovery:.42,commitment:true,gapLike:true,scene:'jiuzhaigou'})
});

// Each scene has a deliberately different vocabulary and its own proven templates.
// Gaps stay single hazards; their width provides the challenge without hiding a
// second commitment beyond the landing edge.
const SCENE_RULES = Object.freeze({
  guangzhou:Object.freeze({pace:.95,cooldownScale:1.08,comboScale:.78,signatureEvery:9,signature:Object.freeze(['billboard','drone','crate']),intro:Object.freeze(['crate','billboard']),pool:Object.freeze(['crate','spike','drone','billboard','bridgeBar','spring']),combos:Object.freeze([Object.freeze(['billboard','drone']),Object.freeze(['crate','bridgeBar']),Object.freeze(['spike','drone']),Object.freeze(['billboard','spring'])])}),
  shanghai:Object.freeze({pace:1.07,cooldownScale:.9,comboScale:1.18,signatureEvery:8,signature:Object.freeze(['train','drone','spike']),intro:Object.freeze(['crate','spike']),pool:Object.freeze(['crate','spike','drone','train','shutter']),combos:Object.freeze([Object.freeze(['crate','drone']),Object.freeze(['train','drone']),Object.freeze(['spike','shutter']),Object.freeze(['shutter','crate']),Object.freeze(['crate','drone','spike'])])}),
  shenzhen:Object.freeze({pace:1.03,cooldownScale:.96,comboScale:1.12,signatureEvery:8,signature:Object.freeze(['laser','robot','scanner']),intro:Object.freeze(['crate','robot']),pool:Object.freeze(['crate','spike','laser','robot','scanner','spring']),combos:Object.freeze([Object.freeze(['laser','robot']),Object.freeze(['crate','scanner']),Object.freeze(['robot','laser']),Object.freeze(['scanner','spring']),Object.freeze(['laser','robot','scanner'])])}),
  snow:Object.freeze({pace:.98,cooldownScale:1.04,comboScale:.94,signatureEvery:9,signature:Object.freeze(['snowball','icicle','spring']),intro:Object.freeze(['crate','snowball']),pool:Object.freeze(['crate','spike','snowball','icicle','crackedIce','spring']),combos:Object.freeze([Object.freeze(['snowball','icicle']),Object.freeze(['spike','snowball']),Object.freeze(['icicle','crate']),Object.freeze(['spring','icicle'])])}),
  volcano:Object.freeze({pace:1,cooldownScale:1.02,comboScale:1,signatureEvery:8,signature:Object.freeze(['rock','crate','flame']),intro:Object.freeze(['crate','rock']),pool:Object.freeze(['crate','spike','rock','flame','lava']),combos:Object.freeze([Object.freeze(['rock','spike']),Object.freeze(['crate','flame']),Object.freeze(['flame','crate']),Object.freeze(['rock','crate','flame'])])}),
  jiuzhaigou:Object.freeze({pace:.96,cooldownScale:1.06,comboScale:.88,signatureEvery:9,signature:Object.freeze(['log','waterPlatform','waterfall']),intro:Object.freeze(['crate','log']),pool:Object.freeze(['crate','log','waterPlatform','waterfall','brokenBridge','spring']),combos:Object.freeze([Object.freeze(['log','waterPlatform']),Object.freeze(['crate','waterfall']),Object.freeze(['waterPlatform','log']),Object.freeze(['log','waterfall'])])})
});

function createRandom(seed){
  if(!seed)return Math.random;
  let state=Array.from(String(seed)).reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,2166136261);
  return()=>{state=(state+0x6D2B79F5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296};
}

function sceneScaleForHeight(height){
  const floor=height*.79;
  return Math.min(1,Math.max(.58,(floor-28)/360));
}

function movementEnvelope(speed,physics=PHYSICS){
  const firstRise=Math.abs(physics.firstJumpVelocity)/physics.heldGravity;
  const firstHeight=physics.firstJumpVelocity*physics.firstJumpVelocity/(2*physics.heldGravity);
  const firstFall=Math.sqrt(2*firstHeight/physics.releasedGravity);
  const secondRise=Math.abs(physics.secondJumpVelocity)/physics.heldGravity;
  const secondHeight=physics.secondJumpVelocity*physics.secondJumpVelocity/(2*physics.heldGravity);
  const doubleFall=Math.sqrt(2*(firstHeight+secondHeight)/physics.releasedGravity);
  const firstFlight=firstRise+firstFall;
  const doubleFlight=firstRise+secondRise+doubleFall;
  return Object.freeze({
    firstFlight,
    doubleFlight,
    jumpDistance:speed*firstFlight,
    doubleJumpDistance:speed*doubleFlight,
    slideDistance:speed*physics.slideDuration,
    dashDistance:speed*physics.dashDuration,
    maxGapWidth:Math.max(96,Math.floor(speed*firstFlight*.68))
  });
}

function hazardWidth(type,difficulty,roll=.5,speed=difficulty.startSpeed){
  if(!HAZARDS[type].gapLike)return HAZARDS[type].width;
  const desired=difficulty.gapBase+Math.max(0,Math.min(1,roll))*difficulty.gapExtra;
  return Math.min(desired,movementEnvelope(speed).maxGapWidth);
}

function requiredGapForPair(previous,next,speed,difficulty,withinPattern=false){
  const previousProfile=HAZARDS[previous]||{action:'none',recovery:0};
  const nextProfile=HAZARDS[next]||{action:'none',recovery:0};
  const envelope=movementEnvelope(speed);
  const transition=previousProfile.action!==nextProfile.action?.14:.04;
  const precisionLead=nextProfile.action==='precisionJump'?.3:nextProfile.action==='gapJump'?.12:0;
  const reaction=difficulty.safeTime*(withinPattern?.56:1);
  const recoveryDistance=speed*(previousProfile.recovery+transition+precisionLead);
  const jumpRecovery=/jump/i.test(previousProfile.action)?envelope.jumpDistance*.42:0;
  const slideRecovery=previousProfile.action==='slide'?envelope.slideDistance*.72:0;
  const dashRecovery=(previous==='crate'||previous==='spike')?envelope.dashDistance*.58:0;
  const approachRecovery=(nextProfile.approachSpeed||0)*1.5;
  return Math.ceil(Math.max(155,speed*reaction,recoveryDistance,jumpRecovery,slideRecovery,dashRecovery,approachRecovery));
}

function minimumSafeGap(speed,difficulty){
  return requiredGapForPair('', '', speed, difficulty, false);
}

function canFollow(previous,next,history=[]){
  if(!previous)return true;
  const priorProfile=HAZARDS[previous]||{},nextProfile=HAZARDS[next]||{};
  if(priorProfile.gapLike&&nextProfile.commitment)return false;
  if(nextProfile.gapLike&&priorProfile.commitment)return false;
  if(priorProfile.gateLike&&nextProfile.commitment)return false;
  if(nextProfile.gateLike&&priorProfile.commitment)return false;
  if(priorProfile.action==='slide'&&nextProfile.action==='slide')return false;
  const recent=history.slice(-2);
  if(next==='spike'&&recent.length===2&&recent.every(type=>type==='spike'))return false;
  return true;
}

function phaseForRun(elapsed,distance,difficulty){
  if(elapsed<difficulty.introSeconds||distance<difficulty.introDistance)return'intro';
  if(distance<difficulty.earlyUntil)return'early';
  if(distance<difficulty.lateAt)return'mid';
  return'late';
}

function openingSpawnDelay(viewWidth,runnerX,speed,introSeconds){
  const travel=Math.max(0,(viewWidth+80-runnerX)/Math.max(1,speed));
  return Math.max(.65,introSeconds-travel);
}

function bestScoreKey(difficulty){return`nova-run-best-${difficulty}`}

function createObstacleDirector(options={}){
  const scene=SCENE_RULES[options.scene]?options.scene:'guangzhou';
  const difficultyName=DIFFICULTY[options.difficulty]?options.difficulty:'medium';
  const difficulty=DIFFICULTY[difficultyName];
  const rules=SCENE_RULES[scene];
  const seed=options.seed?`${options.seed}|${scene}|${difficultyName}`:'';
  const random=createRandom(seed);
  const history=[];
  let singleStreak=0,spawnCount=0;

  function pick(list){return list[Math.floor(random()*list.length)]}
  function allowed(types){
    let prior=history[history.length-1]||'';
    const combined=history.slice();
    for(const type of types){
      if(rules.pool.indexOf(type)<0||!canFollow(prior,type,combined))return false;
      combined.push(type);prior=type;
    }
    return true;
  }
  function next(state={}){
    const elapsed=Math.max(0,state.elapsed||0),distance=Math.max(0,state.distance||0);
    const speed=Math.max(1,state.speed||difficulty.startSpeed);
    // A queued plan may wait behind the previous obstacle while speed continues
    // to rise. Design spacing with headroom so it cannot become stale in flight.
    const designSpeed=Math.min(difficulty.maxSpeed*1.4,speed*1.12);
    const phase=phaseForRun(elapsed,distance,difficulty);
    const maxItems=phase==='intro'||phase==='early'?1:phase==='mid'?Math.min(2,difficulty.maxPattern):difficulty.maxPattern;
    const comboChance=(phase==='mid'?difficulty.midComboChance:phase==='late'?difficulty.lateComboChance:0)*rules.comboScale;
    const combos=rules.combos.filter(types=>types.length<=maxItems&&allowed(types));
    const signature=(rules.signature||[]).slice(0,difficulty.maxPattern),useSignature=phase==='late'&&spawnCount>0&&spawnCount%(rules.signatureEvery||9)===0&&allowed(signature);
    const forceCombo=combos.length>0&&singleStreak>=difficulty.forceComboAfter;
    const useCombo=!useSignature&&combos.length>0&&(forceCombo||random()<comboChance);
    let types;
    if(useSignature){types=signature.slice();singleStreak=0}
    else if(useCombo){types=pick(combos).slice();singleStreak=0}
    else{
      const source=phase==='intro'?rules.intro:rules.pool;
      const singles=source.filter(type=>allowed([type]));
      types=[pick(singles.length?singles:rules.intro)];singleStreak++;
    }
    const items=[];
    let offset=0,previous=history[history.length-1]||'';
    for(let index=0;index<types.length;index++){
      const type=types[index],roll=random(),width=hazardWidth(type,difficulty,roll,speed);
      if(index>0)offset+=items[index-1].width+requiredGapForPair(previous,type,designSpeed,difficulty,true);
      items.push(Object.freeze({type,offset,width,roll,detail:random()}));
      previous=type;
    }
    const first=items[0].type,lastBefore=history[history.length-1]||'';
    const entryGap=requiredGapForPair(lastBefore,first,designSpeed,difficulty,false);
    for(const type of types){history.push(type);if(history.length>4)history.shift()}
    spawnCount++;
    const cooldown=(Math.max(difficulty.spawnMin,difficulty.spawnBase-distance/6000)+random()*difficulty.spawnJitter)*rules.cooldownScale;
    const powerRoll=random();
    return Object.freeze({scene,difficulty:difficultyName,phase,spawnCount,highlight:useSignature,playSpeed:speed,designSpeed,items:Object.freeze(items),entryGap,cooldown,powerRoll,history:Object.freeze(history.slice())});
  }
  return Object.freeze({next,debugState:()=>Object.freeze({scene,difficulty:difficultyName,seed:options.seed||'',history:history.slice(),spawnCount,singleStreak})});
}

function validateObstaclePlan(plan,context={}){
  const errors=[],difficulty=DIFFICULTY[plan.difficulty]||context.difficulty||DIFFICULTY.medium;
  const rules=SCENE_RULES[plan.scene]||context.rules;
  const speed=context.speed||difficulty.startSpeed,prior=context.previous||'';
  const before=Array.isArray(context.history)?context.history.slice():[];
  if(!plan.items||!plan.items.length)errors.push('empty-plan');
  if(plan.phase==='intro'&&plan.items.length!==1)errors.push('intro-must-be-single');
  if(plan.items&&plan.items.length>difficulty.maxPattern)errors.push('pattern-too-long');
  let previous=prior;
  for(let index=0;index<(plan.items||[]).length;index++){
    const item=plan.items[index];
    if(!HAZARDS[item.type])errors.push(`unknown-${item.type}`);
    if(rules&&rules.pool.indexOf(item.type)<0)errors.push(`outside-scene-pool-${item.type}`);
    if(!canFollow(previous,item.type,before))errors.push(`unsafe-follow-${previous}-${item.type}`);
    if(HAZARDS[item.type]&&HAZARDS[item.type].gapLike&&item.width>movementEnvelope(speed).maxGapWidth)errors.push('gap-too-wide');
    if(index===0&&prior&&plan.entryGap<requiredGapForPair(prior,item.type,speed,difficulty,false))errors.push('entry-gap-too-small');
    if(index>0){
      const priorItem=plan.items[index-1],actual=item.offset-priorItem.offset-priorItem.width;
      if(actual<requiredGapForPair(priorItem.type,item.type,speed,difficulty,true))errors.push(`internal-gap-too-small-${index}`);
    }
    before.push(item.type);previous=item.type;
  }
  return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors)});
}

globalThis.NovaRunConfig=Object.freeze({DIFFICULTY,RUNNER_SCENES,CHALLENGE_SCENES,SCENES,PHYSICS,PARALLAX,GATE_GAP_HEIGHT,CONTENT,HAZARDS,SCENE_RULES,createRandom,sceneScaleForHeight,movementEnvelope,hazardWidth,requiredGapForPair,minimumSafeGap,canFollow,phaseForRun,openingSpawnDelay,bestScoreKey,createObstacleDirector,validateObstaclePlan});
})();

import assert from 'node:assert/strict';

await import('../config.js');
const {
  DIFFICULTY,SCENES,SCENE_RULES,movementEnvelope,requiredGapForPair,
  createObstacleDirector,validateObstaclePlan,bestScoreKey,openingSpawnDelay
}=globalThis.NovaRunConfig;
const RUNNER_SCENES=globalThis.NovaRunConfig.RUNNER_SCENES;

assert.equal(new Set(RUNNER_SCENES.map(scene=>SCENE_RULES[scene].pool.join('|'))).size,RUNNER_SCENES.length,'every runner scene has a distinct obstacle pool');
assert.equal(new Set(Object.keys(DIFFICULTY).map(bestScoreKey)).size,3,'each difficulty uses a separate best-score key');

for(const width of [320,390,568,844,1280])for(const config of Object.values(DIFFICULTY)){
  const runnerX=Math.max(80,width*.14),travel=(width+80-runnerX)/config.startSpeed;
  assert.ok(openingSpawnDelay(width,runnerX,config.startSpeed,config.introSeconds)+travel>=config.introSeconds,'first hazard cannot reach the runner before the adaptation window ends');
}

for(const [name,config] of Object.entries(DIFFICULTY)){
  const envelope=movementEnvelope(config.maxSpeed);
  assert.ok(envelope.jumpDistance>envelope.slideDistance,`${name} jump range is derived from flight time`);
  assert.ok(envelope.doubleJumpDistance>envelope.jumpDistance,`${name} double jump extends the reachable range`);
  assert.equal(envelope.dashDistance,config.maxSpeed*.3,`${name} dash reach uses dash duration`);
  assert.ok(requiredGapForPair('drone','crate',config.maxSpeed,config)>=envelope.slideDistance*.72,`${name} spacing accounts for slide recovery`);
  assert.ok(requiredGapForPair('spike','crate',config.maxSpeed,config)>=envelope.dashDistance*.58,`${name} spacing accounts for dash window`);
}

function serial(plan){return plan.items.map(item=>`${item.type}:${item.offset}:${item.width.toFixed(3)}:${item.detail.toFixed(6)}`).join(',')}
for(const scene of RUNNER_SCENES){
  for(const difficulty of Object.keys(DIFFICULTY)){
    const a=createObstacleDirector({scene,difficulty,seed:'repeatable-42'});
    const b=createObstacleDirector({scene,difficulty,seed:'repeatable-42'});
    for(let index=0;index<80;index++){
      const state={elapsed:8+index*.8,distance:220+index*42,speed:Math.min(DIFFICULTY[difficulty].maxSpeed,DIFFICULTY[difficulty].startSpeed+index*8)};
      assert.equal(serial(a.next(state)),serial(b.next(state)),`${scene}/${difficulty} seeded sequence repeats exactly`);
    }
  }
}

const phaseComplexity={easy:0,medium:0,hard:0};
for(const scene of RUNNER_SCENES){
  for(const difficulty of Object.keys(DIFFICULTY)){
    const config=DIFFICULTY[difficulty];
    const director=createObstacleDirector({scene,difficulty,seed:`audit-${scene}-${difficulty}`});
    let previous='',history=[],lateCombos=0;
    for(let index=0;index<360;index++){
      const intro=index<12;
      const elapsed=intro?config.introSeconds*.5:8+index;
      const distance=intro?config.introDistance*.5:config.lateAt+index*35;
      const speed=Math.min(config.maxSpeed,config.startSpeed+distance*config.accel);
      const plan=director.next({elapsed,distance,speed});
      const result=validateObstaclePlan(plan,{speed,previous,history});
      assert.equal(result.ok,true,`${scene}/${difficulty} plan ${index} is theoretically passable: ${result.errors.join(',')}`);
      if(intro){assert.equal(plan.phase,'intro');assert.equal(plan.items.length,1,'opening adaptation only uses a single obstacle')}
      if(plan.phase==='late'&&plan.items.length>1)lateCombos++;
      for(const item of plan.items){history.push(item.type);if(history.length>4)history.shift();previous=item.type}
    }
    assert.ok(lateCombos>8,`${scene}/${difficulty} adds combinations as distance rises`);
    phaseComplexity[difficulty]+=lateCombos;
  }
}
assert.ok(phaseComplexity.easy<phaseComplexity.medium&&phaseComplexity.medium<phaseComplexity.hard,'combination pressure rises from easy to medium to hard');

const defaultA=createObstacleDirector({scene:'shenzhen',difficulty:'medium'});
const defaultB=createObstacleDirector({scene:'shenzhen',difficulty:'medium'});
const randomA=Array.from({length:20},(_,i)=>serial(defaultA.next({elapsed:30,distance:2000+i*50,speed:700}))).join('|');
const randomB=Array.from({length:20},(_,i)=>serial(defaultB.next({elapsed:30,distance:2000+i*50,speed:700}))).join('|');
assert.notEqual(randomA,randomB,'normal play remains unseeded and random');

console.log('obstacle director and theoretical passability checks passed');

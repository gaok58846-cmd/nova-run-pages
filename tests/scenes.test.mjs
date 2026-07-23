import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../config.js');
const {DIFFICULTY,RUNNER_SCENES,GATE_GAP_HEIGHT,HAZARDS,SCENE_RULES,createObstacleDirector,validateObstaclePlan}=globalThis.NovaRunConfig;
const gameSource=fs.readFileSync(new URL('../game.js',import.meta.url),'utf8');
const allowedActions=new Set(['jump','slide','precisionJump','gapJump','jumpOrDash','slideOrDash']);

for(const scene of RUNNER_SCENES){
  const rules=SCENE_RULES[scene];
  const unique=rules.pool.filter(type=>HAZARDS[type].scene===scene);
  assert.ok(unique.length>=2,`${scene} exposes at least two scene-exclusive mechanics`);
  for(const type of rules.pool){
    assert.ok(HAZARDS[type],`${scene}/${type} has collision and action metadata`);
    if(!HAZARDS[type].assist)assert.ok(allowedActions.has(HAZARDS[type].action),`${scene}/${type} reuses jump, slide, or dash controls`);
  }
  const seen=new Set();
  for(let seedIndex=0;seedIndex<5;seedIndex++){
    const director=createObstacleDirector({scene,difficulty:'hard',seed:`scene-coverage-${seedIndex}`});
    let previous='',history=[];
    for(let index=0;index<220;index++){
      const plan=director.next({elapsed:40,distance:2500+index*25,speed:DIFFICULTY.hard.maxSpeed*rules.pace*1.25});
      const result=validateObstaclePlan(plan,{speed:DIFFICULTY.hard.maxSpeed*rules.pace*1.25,previous,history});
      assert.equal(result.ok,true,`${scene} plan remains passable: ${result.errors.join(',')}`);
      for(const item of plan.items){seen.add(item.type);history.push(item.type);if(history.length>4)history.shift();previous=item.type}
    }
  }
  for(const type of unique)assert.ok(seen.has(type),`${scene} actually generates ${type}`);
}

assert.ok(SCENE_RULES.guangzhou.pace<1&&SCENE_RULES.guangzhou.comboScale<1,'Guangzhou remains the beginner-friendly route');
assert.ok(SCENE_RULES.shanghai.pace>1&&SCENE_RULES.shanghai.cooldownScale<1,'Shanghai runs at a faster rhythm');
assert.ok(SCENE_RULES.shanghai.combos.some(combo=>combo.some((type,index)=>index>0&&HAZARDS[combo[index-1]].action==='jump'&&HAZARDS[type].action==='slide')),'Shanghai includes jump-to-slide sequences');
assert.deepEqual(GATE_GAP_HEIGHT,{easy:148,medium:136,hard:122},'vertical gates keep generous openings on every difficulty');
assert.ok(HAZARDS.gate.dashBreakable&&HAZARDS.shutter.dashBreakable,'precision gates can be bypassed with dash');
assert.ok(gameSource.includes('gapY+gapH/2-11'),'coins clearly mark the safe route through vertical gates');

const electronics=SCENE_RULES.shenzhen.pool.filter(type=>HAZARDS[type].electronic);
assert.ok(electronics.length>=2&&electronics.every(type=>HAZARDS[type].dashBreakable),'Shenzhen electronics can be disabled by dash');
assert.ok(gameSource.includes("note(tr('systemOffline')"),'electronic dash destruction has explicit feedback');

assert.ok(gameSource.includes('p.iceDrift=Math.min(18'),'snow inertia is strictly capped');
assert.ok(['snowball','icicle','crackedIce'].every(type=>SCENE_RULES.snow.pool.includes(type)),'snow route includes snowball, icicle, and cracked ice');

for(const type of ['rock','flame','lava'])assert.equal(HAZARDS[type].warning,true,`${type} has a warning phase`);
assert.ok(gameSource.includes("reducedMotion?0:scene==='volcano'?5:9")&&gameSource.includes("reducedMotion?0:scene==='volcano'?2:3.5"),'screen shake is restrained and can be disabled');

assert.ok(['log','waterPlatform','waterfall','brokenBridge'].every(type=>SCENE_RULES.jiuzhaigou.pool.includes(type)),'Jiuzhaigou includes logs, water platforms, waterfalls, and broken bridges');
assert.ok(gameSource.includes("ctx.globalAlpha=.08")&&gameSource.includes("scene==='jiuzhaigou'"),'Jiuzhaigou uses a lightweight reflection pass');

console.log('scene-specific mechanics and shared-control checks passed');

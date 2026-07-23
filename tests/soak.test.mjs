import assert from 'node:assert/strict';

await import('../config.js');
const {DIFFICULTY,RUNNER_SCENES,SCENE_RULES,createObstacleDirector,validateObstaclePlan}=globalThis.NovaRunConfig;

for(const scene of RUNNER_SCENES){
  for(const [name,config] of Object.entries(DIFFICULTY)){
    const director=createObstacleDirector({scene,difficulty:name,seed:`ten-minute-${scene}-${name}`});
    const active=[];
    let previous='',history=[],pending=null,timer=1.2,time=0,distance=0,speed=config.startSpeed,maxActive=0,spawned=0;
    for(let frame=0;frame<60*60*10;frame++){
      const dt=1/60;
      const world=speed*SCENE_RULES[scene].pace;
      time+=dt;distance+=world*dt/10;
      speed=Math.min(config.maxSpeed,config.startSpeed+distance*config.accel);
      timer-=dt;
      for(const obstacle of active)obstacle.x-=(world+(obstacle.approachSpeed||0))*dt;
      let write=0;
      for(const obstacle of active)if(obstacle.x+obstacle.width>-220)active[write++]=obstacle;
      active.length=write;
      if(timer<=0){
        const planningSpeed=world*1.25;
        pending=pending||director.next({elapsed:time,distance,speed:planningSpeed});
        const right=active.reduce((value,item)=>Math.max(value,item.x+item.width),-Infinity);
        if(980-right>=pending.entryGap){
          const result=validateObstaclePlan(pending,{speed:planningSpeed,previous,history});
          assert.equal(result.ok,true,`${scene}/${name} generated a passable plan: ${result.errors.join(',')}`);
          for(const item of pending.items)active.push({type:item.type,x:980+item.offset,width:item.width,approachSpeed:globalThis.NovaRunConfig.HAZARDS[item.type].approachSpeed||0});
          for(const item of pending.items){history.push(item.type);if(history.length>4)history.shift();previous=item.type}
          timer=pending.cooldown;pending=null;spawned++;
        }else timer=.06;
      }
      maxActive=Math.max(maxActive,active.length);
      const upcoming=active.filter(item=>item.x+item.width>150).sort((a,b)=>a.x-b.x);
      for(let index=1;index<upcoming.length;index++)assert.ok(upcoming[index].x-(upcoming[index-1].x+upcoming[index-1].width)>-1,`${scene}/${name} moving hazards never overlap into an impossible wall`);
    }
    assert.ok(spawned>100,`${scene}/${name} exercised enough spawns`);
    assert.ok(maxActive<16,`${scene}/${name} obstacle memory stays bounded`);
  }
}

console.log('all-scene ten-minute obstacle soak checks passed');

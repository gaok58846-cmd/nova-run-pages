import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const config=read('config.js'),backgrounds=read('backgrounds.js'),effects=read('state-effects.js'),game=read('game.js'),html=read('index.html'),sw=read('sw.js');
const gradient=()=>({addColorStop(){}}),fakeContext=()=>new Proxy({canvas:{width:1280,height:720},createLinearGradient:gradient,createRadialGradient:gradient,measureText:()=>({width:40}),getContext(){return this}}, {get(target,key){if(key in target)return target[key];return()=>{}},set(target,key,value){target[key]=value;return true}});
const context={console,document:{createElement:()=>({width:1,height:1,getContext:()=>fakeContext()})}};context.globalThis=context;
vm.runInNewContext(config,context);vm.runInNewContext(backgrounds,context);
const api=context.NovaRunBackgrounds,scenes=['guangzhou','shanghai','shenzhen','snow','volcano','jiuzhaigou'];

assert.ok(api&&api.describeChunk&&api.visibleChunkIndices,'procedural background API is available');
assert.equal(api.CHUNK_WIDTH,720);assert.equal(api.CACHE_LIMIT,18);
for(const scene of scenes){
  const first=api.describeChunk(scene,'fixed-seed',1,7),again=api.describeChunk(scene,'fixed-seed',1,7);
  assert.equal(JSON.stringify(first),JSON.stringify(again),`${scene} chunks are deterministic`);
  const signatures=new Set();let buildingCount=0,featureCount=0;for(let index=0;index<10;index++){const chunk=api.describeChunk(scene,'fixed-seed',1,index);buildingCount+=chunk.buildings.length;featureCount+=chunk.features.length;signatures.add(JSON.stringify({buildings:chunk.buildings.map(item=>[item.kind,Math.round(item.width),Math.round(item.height),item.windowPattern]),features:chunk.features.map(item=>[item.kind,Math.round(item.width),Math.round(item.height)])}))}
  assert.equal(signatures.size,10,`${scene} has ten distinct consecutive skyline chunks`);
  if(['snow','volcano','jiuzhaigou'].includes(scene)){assert.ok(buildingCount<=2,`${scene} keeps man-made structures sparse`);assert.ok(featureCount>=20&&featureCount<=60,`${scene} uses paced natural features with open breathing room`)}else assert.ok(buildingCount>=70,`${scene} retains a dense varied skyline`);
}
{
  const zones=scene=>Array.from({length:24},(_,index)=>api.zoneFor(scene,'zone-audit',index)),jiuzhai=zones('jiuzhaigou'),snow=zones('snow'),volcano=zones('volcano');
  assert.ok(jiuzhai.filter(zone=>zone==='openWater').length>=14,'Jiuzhaigou is dominated by open-water chunks');assert.ok(jiuzhai.filter(zone=>zone==='karst').length<=2,'Jiuzhaigou high karst landmarks stay rare');
  assert.ok(snow.filter(zone=>zone==='snowPlain').length>=12,'snow uses open plains as its primary rhythm');assert.ok(snow.filter(zone=>zone==='peak').length<=2,'large snow peaks stay rare');
  assert.ok(volcano.filter(zone=>zone==='lavaPlain'||zone==='basaltField').length>=16,'volcano is dominated by plains and basalt fields');assert.ok(volcano.filter(zone=>zone==='caldera').length<=2,'calderas stay rare');
  for(const scene of ['snow','volcano','jiuzhaigou'])for(let index=0;index<24;index++){assert.equal(api.describeChunk(scene,'zone-audit',1,index).landmark,false,`${scene} mid layer never creates a mountain landmark`);assert.equal(api.describeChunk(scene,'zone-audit',2,index).landmark,false,`${scene} near layer never creates a mountain landmark`)}
  assert.ok(.79-api.WATER_TOP_RATIO>=.25,'Jiuzhaigou water remains visible across at least one quarter of the frame');
}
for(const boundary of [719.9,720,720.1,1439.9,1440,1440.1]){
  const chunks=api.visibleChunkIndices(boundary,1280,.7);assert.ok(chunks.length>=4);for(let index=1;index<chunks.length;index++)assert.equal(chunks[index],chunks[index-1]+1,'visible background chunks stay contiguous at boundaries');
}
assert.doesNotMatch(backgrounds,/Math\.random\(/,'background generation never uses per-frame Math.random');
assert.doesNotMatch(game,/panels=shift<\.5\?1:2/,'the discontinuous whole-screen panel switch is removed');
assert.match(game,/backgroundRenderer\.render\(/,'runner scenes use the chunk renderer');
assert.match(backgrounds,/drawLayer\(LAYERS\[0\][\s\S]*drawJiuzhaiWater[\s\S]*layer!==LAYERS\[0\]/,'Jiuzhaigou renders distant terrain, then water, then shore and island layers');
assert.match(html,/backgrounds\.js[\s\S]*state-effects\.js[\s\S]*game\.js/,'background and state modules load before the game');
assert.ok(sw.includes("'./backgrounds.js?v=20260723-mobile-pwa12'")&&sw.includes("'./state-effects.js?v=20260723-mobile-pwa12'"),'new modules are available offline');
assert.doesNotMatch(effects,/strokeRect|ellipse\(W|ellipse\(width|arc\([^\n]*Math\.min\(width,height\)/,'state effects contain no full-screen geometric outlines');
assert.doesNotMatch(effects,/moveTo\(0,[^\n]*lineTo\(width|moveTo\(width,[^\n]*lineTo\(0/,'state effects contain no cross-screen status lines');
assert.match(effects,/drawHexShield[\s\S]*drawMagnetParticles[\s\S]*drawSlowDust[\s\S]*drawReadyCore/,'all power states use local player-centered effects');
assert.doesNotMatch(game,/function drawStateAtmosphere\(\)[\s\S]{500,}function drawWarning/,'state rendering no longer lives as a large block in game.js');
{
  const ctx=fakeContext(),renderer=api.create({ctx}),palette={bg:'rgb(24,25,25)',fg:'rgb(248,242,233)',card:'rgb(40,41,40)',border:'rgb(105,98,89)',one:'rgb(103,165,164)',two:'rgb(217,119,83)',three:'rgb(143,187,127)',four:'rgb(203,132,154)'};
  renderer.setScene('shenzhen','render-seed');renderer.resize({width:1280,height:720,dpr:1.5,theme:'dark',quality:1});
  for(let distance=0;distance<18000;distance+=240)renderer.render({distance,time:distance/400,floor:568,palette,reducedMotion:false,performanceMode:'quality',visualQuality:1});
  assert.ok(renderer.cacheSize<=api.CACHE_LIMIT,'long runs keep the background LRU cache bounded');
  const fxContext={console};fxContext.globalThis=fxContext;vm.runInNewContext(effects,fxContext);
  assert.doesNotThrow(()=>fxContext.NovaRunStateEffects.draw(ctx,{player:{x:180,y:480,w:42,h:68,dash:.2,hurt:.2,shield:3,magnet:3,slow:3},game:{time:2,over:2,overReady:true,perfect:.2},width:1280,height:720,palette,reducedMotion:false,performanceMode:'quality',visualQuality:1}));
}

console.log('deterministic continuous skylines and local state effects checks passed');

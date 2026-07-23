(()=>{
'use strict';

const Config=globalThis.NovaRunConfig;
const CHUNK_WIDTH=720,CACHE_LIMIT=18;
const LAYERS=Object.freeze([
  Object.freeze({id:'far',speed:.16,scale:.62,alpha:.34,count:6}),
  Object.freeze({id:'mid',speed:.38,scale:.82,alpha:.62,count:8}),
  Object.freeze({id:'near',speed:.7,scale:1,alpha:.9,count:9})
]);
const TYPES=Object.freeze({
  guangzhou:['slab','stepped','rounded','arcade','twin','spire'],
  shanghai:['artdeco','stepped','rounded','taper','twin','spire'],
  shenzhen:['campus','cantilever','taper','twin','stepped','rounded'],
  snow:['station','observatory','cable','stepped','slab'],
  volcano:['refinery','geothermal','pipeworks','slab','twin'],
  jiuzhaigou:['pavilion','watchtower','lodge','bridge','stepped']
});
const FEATURE_TYPES=Object.freeze({snow:['iceSpire','snowPine','boulder','snowDrift'],volcano:['basalt','lavaVent','rockArch','fumarole'],jiuzhaigou:['forestPine','lakeIsland','karst','waterfall']});
const SCENE_INDEX=Object.freeze({guangzhou:0,shanghai:1,shenzhen:2,snow:3,volcano:4,jiuzhaigou:5});
const WATER_TOP_RATIO=.48;
const ZONE_CYCLES=Object.freeze({
  jiuzhaigou:Object.freeze(['openWater','openWater','openWater','openWater','openWater','openWater','openWater','forestShore','forestShore','openWater','openWater','openWater','openWater','lakeIsland','lakeIsland','waterfall','openWater','openWater','openWater','forestShore','shoreFacility','lakeIsland','karst','waterfall']),
  snow:Object.freeze(['snowPlain','snowPlain','snowPlain','snowPlain','snowPlain','sparsePines','snowPlain','iceField','snowPlain','sparsePines','snowPlain','iceValley','snowPlain','sparsePines','snowPlain','iceField','snowPlain','sparsePines','snowPlain','iceValley','snowPlain','sparsePines','peak','facility']),
  volcano:Object.freeze(['lavaPlain','lavaPlain','basaltField','lavaPlain','fumaroleField','lavaPlain','basaltField','lavaPlain','lavaLake','basaltField','lavaPlain','fumaroleField','lavaPlain','basaltField','lavaPlain','lavaLake','basaltField','lavaPlain','fumaroleField','lavaPlain','basaltField','lavaPlain','caldera','facility'])
});

const rgba=(color,alpha)=>{const values=String(color||'').match(/[\d.]+/g);return values&&values.length>=3?`rgba(${values[0]},${values[1]},${values[2]},${alpha})`:color};
const mod=(value,size)=>((value%size)+size)%size;
const snap=(value,dpr)=>Math.round(value*Math.max(1,dpr||1))/Math.max(1,dpr||1);
function randomFor(scene,seed,layer,index){return Config.createRandom(`${seed}|${scene}|${layer}|${index}`)}
function zoneFor(scene,seed,index){const cycle=ZONE_CYCLES[scene];if(!cycle)return'city';const offset=Math.floor(Config.createRandom(`${seed}|${scene}|zone-offset`)()*cycle.length);return cycle[mod(index+offset,cycle.length)]}

function describeChunk(scene,seed,layer,index){
  scene=TYPES[scene]?scene:'guangzhou';
  const layerIndex=Math.max(0,Math.min(2,Number(layer)||0)),cfg=LAYERS[layerIndex],random=randomFor(scene,seed,cfg.id,index),types=TYPES[scene],natural=!!FEATURE_TYPES[scene],zone=zoneFor(scene,seed,index),buildings=[],features=[];
  if(natural){
    const open=['openWater','snowPlain','lavaPlain'].includes(zone),featurePool=scene==='jiuzhaigou'?(zone==='forestShore'||zone==='shoreFacility'?['forestPine','forestPine','reed','lakeIsland']:zone==='lakeIsland'?['lakeIsland','forestPine','reed']:zone==='waterfall'?['waterfall','karst','mist']:zone==='karst'?['karst','waterfall','forestPine']:['reed','lakeIsland','shoreRock']):scene==='snow'?(zone==='sparsePines'?['snowPine','snowPine','snowDrift']:zone==='iceValley'||zone==='iceField'?['iceSpire','boulder','snowDrift']:['snowDrift','boulder']):(zone==='basaltField'?['basalt','basalt','rockArch']:zone==='fumaroleField'?['fumarole','basalt','lavaCrack']:zone==='lavaLake'?['lavaVent','lavaCrack','basalt']:['lavaCrack','lavaVent','boulder']),baseCount=open?2:zone==='peak'||zone==='caldera'||zone==='karst'?3:5,count=Math.max(1,baseCount+(layerIndex===2?1:0));
    let x=18+random()*90;for(let slot=0;slot<count;slot++){const width=26+random()*(layerIndex===2?64:48),height=(open?18+random()*34:30+random()*(layerIndex===0?82:62))*cfg.scale,kind=featurePool[Math.floor(random()*featurePool.length)];features.push({x,width,height,kind,tone:random(),detail:Math.floor(random()*5)});x+=Math.max(90,CHUNK_WIDTH/count)+random()*34}
    if((zone==='facility'||zone==='shoreFacility')&&layerIndex===1){const kind=types[Math.floor(random()*Math.min(3,types.length))],width=scene==='jiuzhaigou'?74:scene==='snow'?62:68,height=scene==='jiuzhaigou'?58:scene==='snow'?72:86;buildings.push({x:180+random()*(CHUNK_WIDTH-360),width,height:height*cfg.scale,kind,detail:Math.floor(random()*5),tone:random(),roof:random(),windowPattern:Math.floor(random()*5)})}
  }else{
    let x=-70-random()*45,slot=0;while(x<CHUNK_WIDTH+65&&slot<14){const width=42+random()*(layerIndex===2?88:68),height=(72+random()*(layerIndex===0?150:layerIndex===1?235:285))*cfg.scale,gap=8+random()*30,kind=types[Math.floor(random()*types.length)],detail=Math.floor(random()*5),tone=random(),roof=random(),windowPattern=Math.floor(random()*5);buildings.push({x,width,height,kind,detail,tone,roof,windowPattern});x+=width+gap;slot++}
  }
  const sceneOffset=SCENE_INDEX[scene]||0,period=5+(sceneOffset%2),landmark=natural?layerIndex===0&&['peak','caldera','karst'].includes(zone):layerIndex===1&&mod(index+sceneOffset*2,period)===0;
  return Object.freeze({scene,seed:String(seed),layer:layerIndex,index,zone,landmark,landmarkVariant:mod(index+sceneOffset,3),features:Object.freeze(features),buildings:Object.freeze(buildings)});
}

function visibleChunkIndices(distance,viewportWidth,speed){
  const camera=Math.max(0,distance||0)*(speed||1),start=Math.floor(camera/CHUNK_WIDTH)-1,end=Math.ceil((camera+viewportWidth)/CHUNK_WIDTH)+1,result=[];
  for(let index=start;index<=end;index++)result.push(index);
  return result;
}

function roundedPath(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function polygon(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath()}

function drawTerrain(ctx,descriptor,base,C){
  const {scene,index,layer,zone}=descriptor,random=randomFor(scene,descriptor.seed,`terrain-${layer}`,index),fade=layer===0?.28:.12;
  if(scene==='snow'){
    if(layer===0&&zone==='peak'){ctx.fillStyle=rgba(C.fg,.3);polygon(ctx,[[0,base],[CHUNK_WIDTH*.18,base-42],[CHUNK_WIDTH*.42,base-236],[CHUNK_WIDTH*.57,base-88],[CHUNK_WIDTH*.74,base-176],[CHUNK_WIDTH,base]]);ctx.fill()}
    else if(layer===0&&(zone==='iceValley'||zone==='iceField')){ctx.fillStyle=rgba(C.fg,.16);ctx.beginPath();ctx.moveTo(0,base);for(let x=0;x<=CHUNK_WIDTH;x+=150)ctx.quadraticCurveTo(x+75,base-38-random()*42,x+150,base-12-random()*12);ctx.lineTo(CHUNK_WIDTH,base);ctx.closePath();ctx.fill()}
    else if(layer>0){ctx.fillStyle=rgba(C.fg,.07);ctx.beginPath();ctx.moveTo(0,base);for(let x=0;x<=CHUNK_WIDTH;x+=180)ctx.quadraticCurveTo(x+90,base-10-random()*14,x+180,base);ctx.closePath();ctx.fill()}
  }else if(scene==='jiuzhaigou'){
    if(layer===0&&zone==='karst'){ctx.fillStyle=rgba(C.border,.26);polygon(ctx,[[0,base],[CHUNK_WIDTH*.16,base-34],[CHUNK_WIDTH*.34,base-142],[CHUNK_WIDTH*.5,base-58],[CHUNK_WIDTH*.68,base-188],[CHUNK_WIDTH*.84,base-48],[CHUNK_WIDTH,base]]);ctx.fill()}
    else if(layer===0&&(zone==='forestShore'||zone==='shoreFacility')){ctx.fillStyle=rgba(C.one,.12);ctx.beginPath();ctx.moveTo(0,base);for(let x=0;x<=CHUNK_WIDTH;x+=180)ctx.quadraticCurveTo(x+90,base-25-random()*28,x+180,base-7);ctx.lineTo(CHUNK_WIDTH,base);ctx.closePath();ctx.fill()}
  }else if(scene==='volcano'){
    if(layer===0&&zone==='caldera'){ctx.fillStyle=rgba(C.card,.5);polygon(ctx,[[0,base],[CHUNK_WIDTH*.18,base-38],[CHUNK_WIDTH*.38,base-158],[CHUNK_WIDTH*.48,base-174],[CHUNK_WIDTH*.58,base-164],[CHUNK_WIDTH*.8,base-44],[CHUNK_WIDTH,base]]);ctx.fill();ctx.fillStyle=rgba(C.two,.2);ctx.beginPath();ctx.ellipse(CHUNK_WIDTH*.5,base-169,48,11,0,0,7);ctx.fill()}
    else if(layer<2&&zone!=='lavaPlain'){ctx.fillStyle=rgba(C.card,fade);ctx.beginPath();ctx.moveTo(0,base);for(let x=0;x<=CHUNK_WIDTH;x+=160)ctx.lineTo(x+80,base-18-random()*36),ctx.lineTo(x+160,base-5-random()*10);ctx.lineTo(CHUNK_WIDTH,base);ctx.closePath();ctx.fill()}
  }else{
    const haze=ctx.createLinearGradient(0,base-190,0,base);haze.addColorStop(0,rgba(C.one,0));haze.addColorStop(1,rgba(C.one,layer===0?.08:.025));ctx.fillStyle=haze;ctx.fillRect(0,base-200,CHUNK_WIDTH,200);
  }
}

function drawNaturalFeature(ctx,feature,base,layer,C){
  const x=feature.x,w=feature.width,h=feature.height,y=base-h,alpha=LAYERS[layer].alpha*(layer===2?.8:.68);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=feature.kind==='iceSpire'||feature.kind==='waterfall'?rgba(C.fg,.72):feature.kind==='lavaVent'?rgba(C.two,.72):feature.kind==='forestPine'||feature.kind==='snowPine'?rgba(C.one,.68):rgba(C.border,.82);ctx.strokeStyle=feature.kind==='lavaVent'?rgba(C.two,.72):rgba(C.one,.3);ctx.lineWidth=1;
  if(feature.kind==='iceSpire'){polygon(ctx,[[x,base],[x+w*.38,y+h*.18],[x+w*.58,y],[x+w,base]]);ctx.fill();ctx.stroke();ctx.fillStyle=rgba(C.fg,.35);polygon(ctx,[[x+w*.38,y+h*.18],[x+w*.58,y],[x+w*.62,base],[x+w*.5,base]]);ctx.fill()}
  else if(feature.kind==='snowPine'||feature.kind==='forestPine'){const color=feature.kind==='snowPine'?rgba(C.fg,.68):rgba(C.one,.72);ctx.fillStyle=color;for(let i=0;i<3;i++)polygon(ctx,[[x+w*.5,y+i*h*.18],[x+w*(.12+i*.03),y+h*(.52+i*.16)],[x+w*(.88-i*.03),y+h*(.52+i*.16)]]),ctx.fill();ctx.fillStyle=rgba(C.card,.6);ctx.fillRect(x+w*.47,base-h*.16,w*.08,h*.16)}
  else if(feature.kind==='boulder'||feature.kind==='lakeIsland'){ctx.beginPath();ctx.ellipse(x+w*.5,base-h*.28,w*.5,h*.3,0,0,7);ctx.fill();if(feature.kind==='lakeIsland'){ctx.fillStyle=rgba(C.three,.34);ctx.beginPath();ctx.ellipse(x+w*.5,base-2,w*.7,5,0,0,7);ctx.fill()}}
  else if(feature.kind==='snowDrift'){ctx.beginPath();ctx.moveTo(x,base);ctx.quadraticCurveTo(x+w*.42,y,x+w,base);ctx.closePath();ctx.fill()}
  else if(feature.kind==='reed'){ctx.strokeStyle=rgba(C.three,.58);ctx.lineWidth=1.5;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+i*w*.22,base);ctx.quadraticCurveTo(x+i*w*.22+3,y+h*.55,x+i*w*.22+(i%2?5:-3),y+h*.18);ctx.stroke()}}
  else if(feature.kind==='shoreRock'){ctx.beginPath();ctx.ellipse(x+w*.5,base-h*.18,w*.48,h*.22,0,0,7);ctx.fill()}
  else if(feature.kind==='mist'){ctx.fillStyle=rgba(C.fg,.13);for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x+w*(.28+i*.23),y+h*(.42+i*.12),w*.28,h*.16,0,0,7);ctx.fill()}}
  else if(feature.kind==='basalt'){for(let i=0;i<3;i++){const bw=w/3+1,bh=h*(.55+(i%2)*.35);ctx.fillRect(x+i*w/3,base-bh,bw,bh)}}
  else if(feature.kind==='lavaVent'){polygon(ctx,[[x,base],[x+w*.32,y+h*.32],[x+w*.48,y],[x+w*.68,y+h*.35],[x+w,base]]);ctx.fill();ctx.fillStyle=rgba(C.three,.5);ctx.fillRect(x+w*.45,y+h*.2,w*.1,h*.72)}
  else if(feature.kind==='rockArch'){ctx.fillRect(x,y+h*.35,w*.25,h*.65);ctx.fillRect(x+w*.75,y+h*.35,w*.25,h*.65);polygon(ctx,[[x,y+h*.38],[x+w*.18,y+h*.08],[x+w*.5,y],[x+w*.82,y+h*.08],[x+w,y+h*.38]]);ctx.fill()}
  else if(feature.kind==='fumarole'){ctx.fillRect(x+w*.42,base-h*.32,w*.16,h*.32);ctx.fillStyle=rgba(C.fg,.14);for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x+w*.5+(i-1)*w*.12,y+h*(.18+i*.12),w*(.2+i*.05),h*.12,0,0,7);ctx.fill()}}
  else if(feature.kind==='lavaCrack'){ctx.strokeStyle=rgba(C.two,.74);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,base-2);ctx.lineTo(x+w*.28,base-h*.35);ctx.lineTo(x+w*.53,base-h*.1);ctx.lineTo(x+w,base-h*.48);ctx.stroke()}
  else if(feature.kind==='karst'){polygon(ctx,[[x,base],[x+w*.18,y+h*.42],[x+w*.48,y],[x+w*.7,y+h*.22],[x+w,base]]);ctx.fill();ctx.stroke()}
  else if(feature.kind==='waterfall'){ctx.fillStyle=rgba(C.border,.66);polygon(ctx,[[x,base],[x+w*.15,y+h*.28],[x+w*.48,y],[x+w*.82,y+h*.24],[x+w,base]]);ctx.fill();ctx.fillStyle=rgba(C.fg,.52);ctx.fillRect(x+w*.47,y+h*.22,Math.max(2,w*.08),h*.7)}
  ctx.restore();
}

function drawWindows(ctx,x,y,w,h,building,C,alpha,quality){
  if(quality<.58||w<34||h<45)return;
  const columns=Math.max(2,Math.min(6,Math.floor(w/17))),rows=Math.max(2,Math.min(9,Math.floor(h/24))),sx=w/(columns+1),sy=h/(rows+1),color=building.tone>.55?C.one:C.two;
  ctx.fillStyle=rgba(color,alpha*(quality<.85?.22:.32));
  for(let row=1;row<=rows;row++)for(let col=1;col<=columns;col++)if(mod(row*3+col*5+building.windowPattern,4)!==0)ctx.fillRect(Math.round(x+col*sx),Math.round(y+row*sy),building.windowPattern%2?3:4,building.windowPattern===3?2:4);
}

function drawBuilding(ctx,building,base,layer,C,quality){
  const x=building.x,w=building.width,h=building.height,y=base-h,alpha=LAYERS[layer].alpha,fill=rgba(building.tone>.52?C.card:C.border,alpha),edge=rgba(building.tone>.52?C.one:C.two,alpha*.42);
  ctx.fillStyle=fill;ctx.strokeStyle=edge;ctx.lineWidth=1;
  switch(building.kind){
    case 'stepped':case 'artdeco':{
      const levels=building.kind==='artdeco'?3:2;for(let i=0;i<levels;i++){const inset=i*w*.1,top=y+i*h*.17;ctx.fillRect(x+inset,top,w-inset*2,base-top);ctx.strokeRect(x+inset+.5,top+.5,w-inset*2-1,base-top-1)}break;
    }
    case 'rounded':case 'observatory':{
      roundedPath(ctx,x,y,w,h,building.kind==='observatory'?w*.48:Math.min(18,w*.2));ctx.fill();ctx.stroke();break;
    }
    case 'taper':case 'spire':case 'watchtower':{
      const tip=building.kind==='spire'?y-h*.12:y,topWidth=building.kind==='watchtower'?w*.55:w*.42;polygon(ctx,[[x,base],[x+(w-topWidth)/2,y],[x+w/2,tip],[x+(w+topWidth)/2,y],[x+w,base]]);ctx.fill();ctx.stroke();break;
    }
    case 'twin':{
      const tower=w*.38;ctx.fillRect(x,y+h*.12,tower,h*.88);ctx.fillRect(x+w-tower,y,tower,h);ctx.strokeRect(x+.5,y+h*.12+.5,tower-1,h*.88-1);ctx.strokeRect(x+w-tower+.5,y+.5,tower-1,h-1);ctx.fillStyle=rgba(C.one,alpha*.45);ctx.fillRect(x+tower,base-h*.52,w-tower*2,6);break;
    }
    case 'arcade':case 'pavilion':case 'lodge':case 'campus':{
      const roof=building.kind==='pavilion'?18:9;polygon(ctx,[[x-4,y+roof],[x+w*.5,y],[x+w+4,y+roof],[x+w,base],[x,base]]);ctx.fill();ctx.stroke();if(building.kind==='arcade'||building.kind==='pavilion'){ctx.fillStyle=rgba(C.bg,.38);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x+w*(.22+i*.28),base-8,w*.09,Math.PI,Math.PI*2);ctx.fill()}}break;
    }
    case 'cantilever':{
      ctx.fillRect(x+w*.18,y,w*.62,h);ctx.fillRect(x,y+h*.2,w,h*.22);ctx.strokeRect(x+.5,y+h*.2+.5,w-1,h*.22-1);break;
    }
    case 'station':case 'refinery':case 'geothermal':case 'pipeworks':case 'cable':case 'bridge':{
      ctx.fillRect(x,y+h*.42,w,h*.58);ctx.strokeRect(x+.5,y+h*.42+.5,w-1,h*.58-1);ctx.fillStyle=rgba(C.one,alpha*.35);const stacks=building.kind==='refinery'||building.kind==='geothermal'?3:2;for(let i=0;i<stacks;i++){const px=x+w*(.22+i*.28);ctx.fillRect(px,y+h*(.08+i*.07),5,h*(.36-i*.07))}if(building.kind==='bridge'||building.kind==='cable'){ctx.strokeStyle=edge;ctx.beginPath();ctx.moveTo(x,base-h*.3);ctx.quadraticCurveTo(x+w*.5,y+h*.1,x+w,base-h*.3);ctx.stroke()}break;
    }
    default:ctx.fillRect(x,y,w,h);ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  }
  if(building.roof>.72&&building.kind!=='spire'){ctx.strokeStyle=edge;ctx.beginPath();ctx.moveTo(x+w*.5,y);ctx.lineTo(x+w*.5,y-9-building.detail*2);ctx.stroke()}
  drawWindows(ctx,x,y,w,h,building,C,alpha,quality);
}

function drawLandmark(ctx,descriptor,base,C){
  const scene=descriptor.scene,v=descriptor.landmarkVariant,x=CHUNK_WIDTH*(.42+v*.08),accent=scene==='volcano'?C.two:scene==='snow'?C.fg:scene==='jiuzhaigou'?C.three:C.one;
  ctx.save();ctx.globalAlpha=.72;ctx.fillStyle=rgba(C.card,.88);ctx.strokeStyle=rgba(accent,.68);ctx.lineWidth=2;
  if(scene==='guangzhou'){ctx.beginPath();ctx.moveTo(x-18,base);ctx.bezierCurveTo(x-5,base-82,x-14,base-208,x,base-250);ctx.bezierCurveTo(x+14,base-208,x+5,base-82,x+18,base);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(x,base-218,24,7,0,0,7);ctx.stroke()}
  else if(scene==='shanghai'){ctx.fillRect(x-7,base-220,14,220);for(const [dy,r] of [[-188,22],[-112,14],[-61,8]]){ctx.beginPath();ctx.arc(x,base+dy,r,0,7);ctx.fill();ctx.stroke()}}
  else if(scene==='shenzhen'){ctx.beginPath();ctx.moveTo(x-27,base);ctx.quadraticCurveTo(x-24,base-175,x,base-260);ctx.quadraticCurveTo(x+24,base-175,x+27,base);ctx.closePath();ctx.fill();ctx.stroke();for(let y=base-220;y<base-20;y+=23){ctx.beginPath();ctx.moveTo(x-19,y);ctx.lineTo(x+19,y);ctx.stroke()}}
  else if(scene==='snow'){polygon(ctx,[[x-108,base],[x-54,base-118],[x-18,base-72],[x+18,base-224],[x+52,base-96],[x+112,base]]);ctx.fill();ctx.stroke();ctx.fillStyle=rgba(C.fg,.46);polygon(ctx,[[x-18,base-72],[x+18,base-224],[x+27,base-101],[x+3,base-130]]);ctx.fill()}
  else if(scene==='volcano'){polygon(ctx,[[x-124,base],[x-46,base-102],[x-18,base-178],[x+24,base-190],[x+52,base-108],[x+126,base]]);ctx.fill();ctx.stroke();ctx.fillStyle=rgba(C.two,.46);ctx.beginPath();ctx.ellipse(x+4,base-184,28,8,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(x,base-176);ctx.bezierCurveTo(x-18,base-120,x+25,base-72,x+8,base);ctx.stroke()}
  else{polygon(ctx,[[x-112,base],[x-62,base-82],[x-18,base-58],[x+14,base-174],[x+48,base-74],[x+112,base]]);ctx.fill();ctx.stroke();ctx.fillStyle=rgba(C.fg,.5);ctx.fillRect(x+10,base-146,8,122);ctx.fillStyle=rgba(C.three,.38);ctx.beginPath();ctx.ellipse(x+14,base-16,42,7,0,0,7);ctx.fill()}
  ctx.restore();
}

function create({ctx}){
  let width=900,height=650,dpr=1,scene='guangzhou',seed='nova',theme='dark',quality=1,paletteKey='',cache=new Map(),skyGradient=null;
  function invalidate(){cache.clear();skyGradient=null}
  function resize(next={}){const changed=next.width!==width||next.height!==height||next.dpr!==dpr||next.theme!==theme||next.quality!==quality;width=next.width||width;height=next.height||height;dpr=next.dpr||dpr;theme=next.theme||theme;quality=next.quality==null?quality:next.quality;if(changed)invalidate()}
  function setScene(next,nextSeed){if(next!==scene||String(nextSeed)!==String(seed)){scene=TYPES[next]?next:'guangzhou';seed=String(nextSeed||'nova');invalidate()}}
  function cacheChunk(layer,index,C,frameQuality){
    const key=`${scene}|${seed}|${layer}|${index}|${height}|${theme}|${Math.round(frameQuality*10)}|${paletteKey}`;
    if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value}
    const scale=Math.min(dpr,frameQuality<.7?1:1.35),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(CHUNK_WIDTH*scale));canvas.height=Math.max(1,Math.round(height*scale));const local=canvas.getContext('2d');local.setTransform(scale,0,0,scale,0,0);local.imageSmoothingEnabled=true;
    const descriptor=describeChunk(scene,seed,layer,index),base=height*.79+3;drawTerrain(local,descriptor,base,C);for(const feature of descriptor.features)drawNaturalFeature(local,feature,base,layer,C);for(const building of descriptor.buildings)drawBuilding(local,building,base,layer,C,frameQuality);if(descriptor.landmark)drawLandmark(local,descriptor,base,C);
    cache.set(key,canvas);while(cache.size>CACHE_LIMIT)cache.delete(cache.keys().next().value);return canvas;
  }
  function drawSky(C){if(!skyGradient){const colors=scene==='volcano'?[C.bg,C.two]:scene==='snow'?[C.four,C.fg]:scene==='jiuzhaigou'?[C.one,C.three]:scene==='shenzhen'?[C.bg,C.three]:scene==='shanghai'?[C.bg,C.one]:[C.bg,C.four];skyGradient=ctx.createLinearGradient(0,0,0,height);skyGradient.addColorStop(0,colors[0]);skyGradient.addColorStop(.62,rgba(colors[1],theme==='light'?.26:.2));skyGradient.addColorStop(1,rgba(C.bg,.96))}ctx.fillStyle=skyGradient;ctx.fillRect(0,0,width,height)}
  function drawJiuzhaiWater(frame,C){const top=height*WATER_TOP_RATIO,bottom=frame.floor,water=ctx.createLinearGradient(0,top,0,bottom);water.addColorStop(0,rgba(C.three,theme==='light'?.28:.22));water.addColorStop(.48,rgba(C.one,theme==='light'?.24:.17));water.addColorStop(1,rgba(C.bg,.18));ctx.fillStyle=water;ctx.fillRect(0,top,width,Math.max(1,bottom-top));ctx.fillStyle=rgba(C.fg,.08);for(let i=0;i<6;i++){const x=mod(i*211-frame.distance*.22,width+100)-50,w=34+(i%3)*23;ctx.fillRect(x,top+28+i*17,w,1)}if(!frame.reducedMotion){ctx.strokeStyle=rgba(C.fg,.1);ctx.lineWidth=1;for(let row=0;row<5;row++){const y=top+48+row*31;ctx.beginPath();for(let x=0;x<=width;x+=36)ctx.lineTo(x,y+Math.sin(x*.026+frame.time*.7+row)*1.7);ctx.stroke()}}const reflection=ctx.createLinearGradient(0,top,0,bottom);reflection.addColorStop(0,rgba(C.fg,.09));reflection.addColorStop(1,rgba(C.fg,0));ctx.fillStyle=reflection;for(let i=0;i<5;i++){const x=mod(i*257-frame.distance*.14,width+120)-60;ctx.fillRect(x,top+5,12+(i%3)*9,Math.max(18,(bottom-top)*(.25+(i%2)*.12)))}}
  function drawLayer(layer,frame,C,frameQuality){const layerIndex=LAYERS.indexOf(layer),camera=Math.max(0,frame.distance)*layer.speed,indices=visibleChunkIndices(frame.distance,width,layer.speed);for(const index of indices){const image=cacheChunk(layerIndex,index,C,frameQuality),x=snap(index*CHUNK_WIDTH-camera,dpr);ctx.drawImage(image,x,0,CHUNK_WIDTH,height)}}
  function ambient(frame,C){
    const time=frame.reducedMotion?0:frame.time,base=frame.floor;ctx.save();
    if(scene==='snow'){ctx.fillStyle=rgba(C.fg,.35);for(let i=0;i<10;i++){const x=mod(i*127-frame.distance*.28,width+30)-15,y=mod(i*73+time*(10+i%3*4),Math.max(80,base-30));ctx.fillRect(x,y,1.5,1.5)}}
    else if(scene==='volcano'){ctx.fillStyle=rgba(C.two,.38);for(let i=0;i<8;i++){const x=mod(i*101-frame.distance*.22,width),y=base-25-mod(i*47+time*(14+i%4*3),Math.max(70,base*.48));ctx.fillRect(x,y,2,3)}}
    else if(scene==='jiuzhaigou'){ctx.fillStyle=rgba(C.fg,.075);for(let i=0;i<4;i++){const x=mod(i*283-frame.distance*.12,width+160)-80,y=height*.43+i*18;ctx.beginPath();ctx.ellipse(x,y,72+i*13,9+i*2,0,0,7);ctx.fill()}}
    ctx.restore();
  }
  function render(frame){
    const C=frame.palette,frameQuality=Math.max(.45,Math.min(1,frame.visualQuality==null?quality:frame.visualQuality)),nextPalette=[C.bg,C.card,C.border,C.one,C.two,C.three,C.four,C.fg].join('|');if(nextPalette!==paletteKey){paletteKey=nextPalette;invalidate()}drawSky(C);
    const layers=frame.performanceMode==='performance'?[LAYERS[0],LAYERS[2]]:LAYERS;
    if(scene==='jiuzhaigou'){drawLayer(LAYERS[0],frame,C,frameQuality);drawJiuzhaiWater(frame,C);for(const layer of layers)if(layer!==LAYERS[0])drawLayer(layer,frame,C,frameQuality)}else for(const layer of layers)drawLayer(layer,frame,C,frameQuality);ambient(frame,C);
  }
  return Object.freeze({setScene,resize,render,invalidate,get cacheSize(){return cache.size}})
}

globalThis.NovaRunBackgrounds=Object.freeze({create,describeChunk,visibleChunkIndices,zoneFor,ZONE_CYCLES,WATER_TOP_RATIO,CHUNK_WIDTH,CACHE_LIMIT});
})();

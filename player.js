(()=>{
'use strict';
function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,r);else{const q=Math.min(r,w/2,h/2);ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath()}if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function ghost(ctx,x,y,h,alpha,color){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;rounded(ctx,x+9,y+17,24,Math.max(14,h-28),8,color);ctx.beginPath();ctx.arc(x+23,y+11,9,0,7);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+15,y+h-13);ctx.lineTo(x+7,y+h+1);ctx.moveTo(x+29,y+h-13);ctx.lineTo(x+38,y+h-1);ctx.stroke();ctx.restore()}
function skinColors(model){const C=model.theme||{},skin=model.skin||{},p=skin.palette||{};return{body:p.body||C.fg||'#f6f0e7',shade:p.bodyShade||C.card||'#39404a',visor:p.visor||model.accent||C.two||'#7bd9e6',core:p.core||C.two||'#ff9c67',outline:p.outline||model.accent||C.one||'#7bd9e6',particle:p.particle||model.trail||C.three||'#8de0c0',trail:p.trail||model.trail||model.accent||C.one||'#72cae6',aurora:p.aurora||null,pattern:skin.pattern||'nova'}}
function movementProfile(game){if(game.challenge)return{intensity:Math.max(0,Math.min(1,game.motionIntensity||0)),cadence:9+(game.motionIntensity||0)*13,stride:5+(game.motionIntensity||0)*12,armCadence:9+(game.motionIntensity||0)*13,armSwing:8+(game.motionIntensity||0)*17,armLift:4+(game.motionIntensity||0)*12,lean:.01+(game.motionIntensity||0)*.12,bob:.6+(game.motionIntensity||0)*1.7};const ranges={easy:[355,650,.12],medium:[430,840,.42],hard:[510,980,.7]},range=ranges[game.diff]||ranges.medium,progress=Math.max(0,Math.min(1,(game.speed-range[0])/Math.max(1,range[1]-range[0]))),intensity=Math.min(1,range[2]+progress*.3),cadence=10.5+intensity*13.5;return{intensity,cadence,stride:5+intensity*12,armCadence:cadence,armSwing:8+intensity*17,armLift:4+intensity*12,lean:.01+intensity*.12,bob:.6+intensity*1.7}}
  function drawCoreShutdown(ctx,C,S,reducedMotion,sliding){
  const cx=sliding?24:22;
  const cy=sliding?18:30;
  const radius=sliding?13:17;

  ctx.save();
  ctx.lineCap='round';
  ctx.lineJoin='round';

  /*
   * 两段不完整能量弧。
   * 不形成完整圆环，也不会像护盾。
   */
  ctx.globalCompositeOperation='lighter';

  ctx.globalAlpha=.72;
  ctx.strokeStyle=C.two;
  ctx.shadowColor=C.two;
  ctx.shadowBlur=reducedMotion?0:5;
  ctx.lineWidth=1.8;

  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius,
    -1.55,
    -.18
  );
  ctx.stroke();

  ctx.globalAlpha=.42;
  ctx.strokeStyle=C.one;
  ctx.shadowColor=C.one;
  ctx.lineWidth=1.1;

  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius+4,
    2.05,
    3.55
  );
  ctx.stroke();

  /*
   * 核心失稳裂痕。
   */
  ctx.globalCompositeOperation='source-over';
  ctx.shadowBlur=0;
  ctx.globalAlpha=.85;
  ctx.strokeStyle=C.two;
  ctx.lineWidth=1.6;

  ctx.beginPath();
  ctx.moveTo(cx-5,cy-7);
  ctx.lineTo(cx,cy-2);
  ctx.lineTo(cx-3,cy+2);
  ctx.lineTo(cx+5,cy+8);
  ctx.stroke();

  /*
   * 两枚静态能量碎片。
   * 不写入粒子数组，不增加游戏状态。
   */
  ctx.globalAlpha=.46;
  ctx.fillStyle=S.particle;

  ctx.fillRect(
    cx+8,
    cy-9,
    3,
    1.2
  );

  ctx.fillRect(
    cx-10,
    cy+8,
    2.5,
    1
  );

  ctx.restore();
}
function draw(ctx,model){
  const {player:p,game,reducedMotion,theme:C}=model,S=skinColors(model),motion=movementProfile(game),sliding=p.slide&&p.ground,h=sliding?36:p.h,py=p.y+p.h-h,secondJump=!p.ground&&p.jumps===2,moving=!game.challenge||motion.intensity>.035,phaseStrength=game.challenge?(moving?motion.intensity:0):1,runPhase=Math.sin(game.time*motion.cadence)*phaseStrength*(reducedMotion?.45:1),armPhase=Math.sin(game.time*motion.armCadence+.22)*phaseStrength*(reducedMotion?.5:1),boosting=game.over>0||p.dash>0;
  const fatal=
  game.mode==='over'&&
  p.hurt>=.9;

const activeBoosting=
  boosting&&
  !fatal;
  if(activeBoosting&&p.dash>0&&!reducedMotion){
  for(let i=4;i>0;i--){
    ghost(
      ctx,
      p.x-i*15,
      py+(4-i)*.7,
      h,
      .035+i*.045,
      S.trail
    );
  }
}
  ctx.save();ctx.translate(p.x+p.w/2,py+h/2);if(p.land>0)ctx.scale(1.09,.91);if(p.hurt)ctx.rotate(-.48);else if(p.dash>0)ctx.rotate(.09);else if(!p.ground&&!reducedMotion)ctx.rotate(secondJump?Math.sin(game.time*10)*.16:p.vy/5200);else if(p.ground&&!sliding&&moving)ctx.rotate(motion.lean*(reducedMotion?.45:1));if(p.ground&&!sliding&&!p.hurt&&moving)ctx.translate(0,Math.abs(runPhase)*motion.bob);ctx.translate(-p.w/2,-h/2);
  const activeAccent = activeBoosting
  ? ctx.createLinearGradient(
      5,
      2,
      37,
      h
    )
  : S.outline;

if(activeBoosting){
  /*
   * 超载：暖橙高光 → 皮肤主色 → 冷青蓝
   * 普通冲刺：减少橙色，保持更克制。
   */
  activeAccent.addColorStop(
    0,
    game.over > 0
      ? C.two
      : S.outline
  );

  activeAccent.addColorStop(
    .42,
    S.outline
  );

  activeAccent.addColorStop(
    1,
    C.one
  );
}
  ctx.shadowBlur =
  activeBoosting && !reducedMotion
    ? 10
    : 8;

ctx.shadowColor =
  activeBoosting
    ? S.trail
    : S.outline;ctx.lineCap='round';ctx.lineJoin='round';
  if(!sliding){const scarf=12+motion.intensity*14+(activeBoosting&&game.over>0?18:0);ctx.fillStyle=S.trail;ctx.globalAlpha=reducedMotion?.55:.72;ctx.beginPath();ctx.moveTo(12,23);ctx.lineTo(-scarf,18-runPhase*.12);ctx.lineTo(8,31);ctx.closePath();ctx.fill();if(S.pattern==='prism'){ctx.fillStyle=S.particle;ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(8,25);ctx.lineTo(-scarf*.72,29+runPhase*.08);ctx.lineTo(7,33);ctx.closePath();ctx.fill()}ctx.globalAlpha=1}
  if(sliding){const reach=39+motion.intensity*8;ctx.strokeStyle=activeAccent;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(8,29);ctx.lineTo(29,29);ctx.lineTo(reach,34);ctx.moveTo(14,24);ctx.lineTo(4-motion.intensity*4,32);ctx.stroke();rounded(ctx,10,12,27,17,8,S.body,activeAccent);rounded(ctx,18,3,19,16,7,S.shade,activeAccent);rounded(ctx,23,7,13,5,2,S.visor);ctx.fillStyle=activeAccent;ctx.fillRect(8,27,28,3)}else{
    const legA=p.ground?runPhase*motion.stride:secondJump?-6-motion.intensity*3:5+motion.intensity*5,legB=p.ground?-runPhase*motion.stride:secondJump?6+motion.intensity*3:-4-motion.intensity*4,armA=p.ground?-armPhase*motion.armSwing:secondJump?-5:-9-motion.intensity*4,armB=p.ground?armPhase*motion.armSwing:secondJump?5:-8-motion.intensity*3,liftA=p.ground?Math.max(0,-armPhase)*motion.armLift:0,liftB=p.ground?Math.max(0,armPhase)*motion.armLift:0,dropA=p.ground?Math.max(0,armPhase)*3:0,dropB=p.ground?Math.max(0,-armPhase)*3:0;
    ctx.strokeStyle=activeAccent;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(16,40);ctx.lineTo(13+legA*.35,55);ctx.lineTo(8+legA,66);ctx.moveTo(27,40);ctx.lineTo(29+legB*.35,55);ctx.lineTo(34+legB,66);ctx.stroke();ctx.strokeStyle=S.body;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(13,25);ctx.lineTo(7+armA*.35,36-liftA*.45+dropA*.4);ctx.lineTo(6+armA,45-liftA+dropA);ctx.moveTo(30,25);ctx.lineTo(35+armB*.35,35-liftB*.45+dropB*.4);ctx.lineTo(36+armB,43-liftB+dropB);ctx.stroke();if(p.ground&&motion.intensity>.6){ctx.fillStyle=activeAccent;ctx.globalAlpha=.2+.16*motion.intensity;ctx.beginPath();ctx.moveTo(9,22);ctx.lineTo(-3-motion.intensity*8,28+runPhase*2);ctx.lineTo(10,33);ctx.closePath();ctx.fill();ctx.globalAlpha=1}rounded(ctx,10,17,25,30,9,S.body,activeAccent);rounded(ctx,14,21,17,19,6,S.shade);if(S.pattern==='pulse'){ctx.strokeStyle=S.core;ctx.lineWidth=2;for(let y=25;y<40;y+=6){ctx.beginPath();ctx.moveTo(16,y);ctx.lineTo(29,y-2);ctx.stroke()}}else if(S.pattern==='sunset'){ctx.fillStyle=S.core;ctx.globalAlpha=.42;ctx.beginPath();ctx.moveTo(12,20);ctx.lineTo(22,25);ctx.lineTo(14,31);ctx.closePath();ctx.fill();ctx.globalAlpha=1}else if(S.pattern==='prism'){const prism=ctx.createLinearGradient(12,21,32,43);prism.addColorStop(0,S.core);prism.addColorStop(1,S.particle);ctx.fillStyle=prism;ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(15,22);ctx.lineTo(31,28);ctx.lineTo(18,43);ctx.closePath();ctx.fill();ctx.globalAlpha=1}else if(S.pattern==='aurora'){const aurora=ctx.createLinearGradient(11,20,34,43);(S.aurora||[S.outline,S.core]).forEach((color,index,all)=>aurora.addColorStop(index/Math.max(1,all.length-1),color));ctx.fillStyle=aurora;ctx.globalAlpha=.5;rounded(ctx,15,22,15,18,5,aurora);ctx.globalAlpha=1}ctx.fillStyle=activeAccent;ctx.beginPath();ctx.moveTo(12,38);ctx.lineTo(32,29);ctx.lineTo(32,35);ctx.lineTo(14,44);ctx.closePath();ctx.fill();ctx.fillStyle=
  fatal
    ?S.shade
    :game.over>0
      ?C.three
      :S.core;if(S.pattern==='pulse'){ctx.beginPath();ctx.arc(22,30,6,0,7);ctx.fill();ctx.strokeStyle=S.particle;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(22,30,9,0,7);ctx.stroke()}else if(S.pattern==='sunset'){ctx.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,x=22+Math.cos(a)*7,y=30+Math.sin(a)*7;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill()}else if(S.pattern==='prism'){ctx.beginPath();ctx.moveTo(22,23);ctx.lineTo(29,35);ctx.lineTo(15,35);ctx.closePath();ctx.fill()}else{ctx.beginPath();ctx.moveTo(22,24);ctx.lineTo(28,30);ctx.lineTo(22,36);ctx.lineTo(16,30);ctx.closePath();ctx.fill()}ctx.strokeStyle=S.body;ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=S.shade;ctx.strokeStyle=activeAccent;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(22,10,10,0,7);ctx.fill();ctx.stroke();rounded(ctx,16,7,16,6,3,S.visor);ctx.fillStyle=S.body;ctx.globalAlpha=.8;ctx.fillRect(26,8,4,2);ctx.globalAlpha=1;if(secondJump){ctx.strokeStyle=S.core;ctx.lineWidth=2;ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(22,32,25,-2.3,-.2);ctx.stroke();ctx.globalAlpha=1}
  }
  if(fatal){
  drawCoreShutdown(
    ctx,
    C,
    S,
    reducedMotion,
    sliding
  );
}

ctx.restore()
}
function drawChallenge(ctx,state,theme,skin){const p=state.player,speed=Math.min(1,Math.abs(p.vx)/260),model={player:{...p,slide:0,land:0,hurt:0,shield:0,jumps:p.ground?0:1},game:{time:state.time,speed:Math.abs(p.vx),diff:'medium',over:p.dash>0?.18:0,challenge:true,motionIntensity:speed},reducedMotion:!!state.reducedMotion,skin,accent:skin?.palette?.outline||theme.skin||theme.one,trail:skin?.palette?.trail||theme.three||theme.skin,theme};draw(ctx,model)}
function drawPreview(ctx,options){const width=options.width||ctx.canvas.width,height=options.height||ctx.canvas.height,skin=options.skin||{},theme=options.theme||{bg:'#161a1d',card:'#2b3035',fg:'#f5efe6',one:'#7bd9e6',two:'#ef815c',three:'#74d58b'},time=Number(options.time)||0,reducedMotion=!!options.reducedMotion,S=skinColors({skin,theme});ctx.save();ctx.clearRect(0,0,width,height);const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,theme.card||'#24292d');bg.addColorStop(1,theme.bg||'#151719');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);ctx.globalAlpha=.16;ctx.strokeStyle=S.outline;for(let i=-2;i<8;i++){ctx.beginPath();ctx.moveTo(width*.5,height*.72);ctx.lineTo(i*width*.18,height);ctx.stroke()}ctx.globalAlpha=1;const scale=Math.min(width/118,height/105),p={x:width/2/scale-21,y:height*.76/scale-68,w:42,h:68,vy:0,jumps:0,ground:true,jumpHeld:false,slide:0,dash:options.dash?0.22:0,shield:0,land:0,hurt:0};ctx.scale(scale,scale);draw(ctx,{player:p,game:{time,speed:520,diff:'medium',over:0,challenge:false},reducedMotion,skin,theme,accent:S.outline,trail:S.trail});ctx.restore();if(!reducedMotion){ctx.save();ctx.fillStyle=S.particle;for(let i=0;i<5;i++){const x=width*.21+(i*37+time*18)%Math.max(60,width*.56),y=height*.35+Math.sin(time*1.5+i)*height*.17;ctx.globalAlpha=.16+i*.05;ctx.beginPath();ctx.arc(x,y,1.5+i*.35,0,7);ctx.fill()}ctx.restore()}}
globalThis.NovaRunPlayerRenderer=Object.freeze({draw,drawChallenge,drawPreview,movementProfile});
})();

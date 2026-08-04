(()=>{
'use strict';

const rgba=(color,alpha)=>{const values=String(color||'').match(/[\d.]+/g);return values&&values.length>=3?`rgba(${values[0]},${values[1]},${values[2]},${alpha})`:color};
function polygon(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath()}
function diamond(ctx,x,y,size){polygon(ctx,[[x,y-size],[x+size,y],[x,y+size],[x-size,y]])}

function softVignette(ctx,width,height,color,alpha,focusX,focusY){
  const radius=Math.hypot(width,height)*.68,gradient=ctx.createRadialGradient(focusX,focusY,Math.min(width,height)*.2,focusX,focusY,radius);gradient.addColorStop(0,rgba(color,0));gradient.addColorStop(.66,rgba(color,.01));gradient.addColorStop(1,rgba(color,alpha));ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
}
function trailRibbon(ctx,p,time,color,index,strength){
  const sliding=p.slide>0&&p.ground;
  const effectH=sliding?36:p.h;
  const effectY=sliding?p.y+p.h-effectH:p.y;

  const centerY=effectY+effectH*(
    sliding
      ?.58+index*.07
      :.34+index*.12
  );

  const length=(
    62+
    index*27+
    strength*70
  )*(sliding?1.08:1);

  const wave=
    Math.sin(
      time*(7-index*.8)+index*1.7
    )*(sliding?1.5:4);

  const thickness=Math.max(
    2.4,
    (sliding?5.2:8)-
    index*(sliding?.7:1.4)
  );

  const startX=p.x+(sliding?18:8);

  ctx.fillStyle=rgba(
    color,
    (sliding?.18:.14)+
    strength*.12-
    index*.018
  );

  ctx.beginPath();
  ctx.moveTo(
    startX,
    centerY-thickness
  );

  ctx.bezierCurveTo(
    startX-length*.3,
    centerY-thickness-wave,
    startX-length*.72,
    centerY+wave,
    startX-length,
    centerY
  );

  ctx.bezierCurveTo(
    startX-length*.72,
    centerY-wave,
    startX-length*.3,
    centerY+thickness+wave,
    startX,
    centerY+thickness
  );

  ctx.closePath();
  ctx.fill();
}
function drawHexShield(ctx,p,C,time,reduced){
  const cx=p.x+p.w/2,cy=p.y+p.h/2,r=44+(reduced?0:Math.sin(time*4)*1.5);ctx.save();ctx.fillStyle=rgba(C.one,.08);ctx.strokeStyle=rgba(C.one,.45);ctx.lineWidth=1.6;polygon(ctx,Array.from({length:6},(_,i)=>[cx+Math.cos(Math.PI/3*i-Math.PI/6)*r,cy+Math.sin(Math.PI/3*i-Math.PI/6)*r*1.12]));ctx.fill();ctx.stroke();ctx.globalAlpha=.18;for(let i=0;i<3;i++){const a=time*.35+i*Math.PI*2/3,x=cx+Math.cos(a)*r*.72,y=cy+Math.sin(a)*r*.8;diamond(ctx,x,y,3);ctx.fillStyle=C.fg;ctx.fill()}ctx.restore();
}
function drawMagnetParticles(ctx,p,C,time,reduced,lowQuality){
  const cx=p.x+p.w/2,cy=p.y+p.h*.48,count=lowQuality?4:8;ctx.save();for(let i=0;i<count;i++){const phase=reduced?.45:(time*(.55+i*.035)+i/count)%1,radius=95*(1-phase)+18,angle=i*2.399+time*(reduced?0:.3),x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius*.58;ctx.globalAlpha=.2+phase*.55;ctx.fillStyle=i%2?C.two:C.one;diamond(ctx,x,y,2.2+phase*1.3);ctx.fill()}ctx.restore();
}
function drawSlowDust(ctx,p,C,time,reduced,lowQuality){
  const count=lowQuality?4:7,cx=p.x+p.w/2,cy=p.y+p.h/2;ctx.save();for(let i=0;i<count;i++){const angle=i*2.17+(reduced?0:time*.12),radius=34+i*7,x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius*.62;ctx.globalAlpha=.16+i*.025;ctx.fillStyle=C.four;ctx.fillRect(x,y,2+i%2,2+i%2)}ctx.restore();
}
function drawReadyCore(ctx,p,C,time,reduced,lowQuality){
  const cx=p.x+p.w/2,cy=p.y+p.h*.46,count=lowQuality?4:6,pulse=reduced?1:.82+Math.sin(time*5)*.18;ctx.save();for(let i=0;i<count;i++){const angle=i*Math.PI*2/count+(reduced?0:time*.65),r=29+(i%2)*8,x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*.76;ctx.globalAlpha=.28+.2*pulse;ctx.fillStyle=i%2?C.three:C.one;diamond(ctx,x,y,2.4+(i%2));ctx.fill()}ctx.restore();
}
function drawPerfectCut(ctx,p,C,time,amount){
  const cx=p.x+p.w/2,cy=p.y+p.h/2,progress=1-Math.min(1,amount/.36),radius=32+progress*34;ctx.save();ctx.translate(cx,cy);ctx.rotate(-.5);ctx.globalAlpha=(1-progress)*.5;ctx.fillStyle=C.fg;for(const side of [-1,1]){polygon(ctx,[[side*(radius-5),-2],[side*(radius+22),-5],[side*(radius+10),2],[side*(radius-3),4]]);ctx.fill()}ctx.restore();
}
function drawOverImpact(ctx,p,C,amount,finish){
  const cx=p.x+p.w/2,cy=p.y+p.h*.48,limit=finish?.62:.3,progress=1-Math.min(1,amount/limit),radius=24+progress*(finish?86:42);ctx.save();ctx.translate(cx,cy);ctx.globalAlpha=(1-progress)*(finish?.5:.68);ctx.fillStyle=finish?C.three:C.fg;for(let i=0;i<6;i++){const angle=i*Math.PI/3+(finish?.22:0),x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*.62;ctx.save();ctx.translate(x,y);ctx.rotate(angle);polygon(ctx,[[0,-3],[finish?24:14,0],[0,3],[-5,0]]);ctx.fill();ctx.restore()}ctx.restore();
}
function drawSignatureMoment(ctx,frame,time){
  const {game,palette:C,width,height,scene}=frame,amount=Math.min(1,game.signature/.75,(5.2-game.signature)/.45),base=height*.79;ctx.save();ctx.globalAlpha=Math.max(0,amount)*.42;const right=width*.7;
  if(scene==='guangzhou'){
    ctx.strokeStyle=C.one;ctx.lineWidth=1.5;for(let i=0;i<3;i++){const x=right+i*42+Math.sin(time*2+i)*7,y=height*.35+i*24;polygon(ctx,[[x-8,y-5],[x+8,y-5],[x+8,y+5],[x-8,y+5]]);ctx.stroke();ctx.fillStyle=C.two;diamond(ctx,x,y,2.5);ctx.fill()}ctx.fillStyle=rgba(C.two,.3);for(let i=0;i<5;i++)ctx.fillRect(width*.52+i*72,base-17,36,3);
  }else if(scene==='shanghai'){
    ctx.fillStyle=rgba(C.two,.32);for(let i=0;i<7;i++)ctx.fillRect(width*.5+i*42-time%1*18,base-48-(i%2)*7,24,3);ctx.fillStyle=rgba(C.one,.28);ctx.fillRect(width*.58,base-58,width*.34,12);
  }else if(scene==='shenzhen'){
    const scanX=width*.58+(Math.sin(time*1.8)*.5+.5)*width*.3,g=ctx.createLinearGradient(scanX-38,0,scanX+38,0);g.addColorStop(0,rgba(C.three,0));g.addColorStop(.5,rgba(C.three,.18));g.addColorStop(1,rgba(C.three,0));ctx.fillStyle=g;ctx.fillRect(scanX-38,height*.2,76,base-height*.2);ctx.fillStyle=C.three;for(let i=0;i<4;i++)diamond(ctx,scanX+Math.sin(i)*28,height*.3+i*55,3),ctx.fill();
  }else if(scene==='snow'){
    ctx.strokeStyle=rgba(C.fg,.55);ctx.lineWidth=1.5;for(let i=0;i<9;i++){const x=width*.48+(i*71+time*90)%(width*.52),y=height*.22+(i*47)%(base-height*.22);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-18,y+8);ctx.stroke()}
  }else if(scene==='volcano'){
    ctx.fillStyle=C.two;for(let i=0;i<9;i++){const x=width*.5+(i*67)%(width*.48),y=base-18-((i*31+time*58)%(height*.38));diamond(ctx,x,y,2+(i%3));ctx.fill()}
  }else if(scene==='jiuzhaigou'){
    ctx.strokeStyle=rgba(C.three,.45);ctx.lineWidth=1.4;for(let i=0;i<4;i++){const x=width*.58+i*86,y=base-22-i%2*11;ctx.beginPath();ctx.ellipse(x,y,24+Math.sin(time*2+i)*5,5,0,0,7);ctx.stroke()}ctx.fillStyle=rgba(C.fg,.36);ctx.fillRect(width*.72,height*.43,5,base-height*.43-24);
  }
  ctx.restore();
}

function draw(ctx,frame){
  const p=frame.player,game=frame.game,C=frame.palette,width=frame.width,height=frame.height,time=frame.reducedMotion?0:game.time,lowQuality=frame.performanceMode==='performance'||frame.visualQuality<.7;
  const over=game.over>0,ready=game.overReady,dashing=p.dash>0,hurt=p.hurt>0,shield=p.shield>0,magnet=p.magnet>0,slowed=p.slow>0,perfect=game.perfect>0;
  const signature=game.signature>0,overImpact=game.overPulse>0,overFinish=game.overFinish>0;
  if(!over&&!ready&&!dashing&&!hurt&&!shield&&!magnet&&!slowed&&!perfect&&!signature&&!overImpact&&!overFinish)return;
  ctx.save();
  if(hurt)softVignette(ctx,width,height,C.two,Math.min(.16,.06+p.hurt*.1),p.x+p.w*.5,p.y+p.h*.5);
  else if(slowed)softVignette(ctx,width,height,C.four,.055,p.x+p.w*.5,p.y+p.h*.5);
  else if(over)softVignette(ctx,width,height,C.three,.045,p.x+p.w*.5,p.y+p.h*.5);
  if(over||dashing){
  ctx.globalCompositeOperation='lighter';

  const count=
    frame.reducedMotion
      ?1
      :lowQuality
        ?2
        :4;

  const strength=over?1:.55;

  /*
   * 保持原来的层数、透明度、长度和性能逻辑，
   * 只让不同层使用不同颜色。
   */
  const colors=over
    ?[
        C.three, // NOVA 主色
        C.one,   // 冷色辅助
        C.two,   // 暖色高光
        C.four   // 少量紫粉点缀
      ]
    :[
        C.one,   // 普通冲刺主色
        C.three, // 辅助色
        C.two,   // 暖色高光
        C.four   // 少量紫粉点缀
      ];

  for(let i=0;i<count;i++){
    trailRibbon(
      ctx,
      p,
      time,
      colors[i%colors.length],
      i,
      strength
    );
  }

  ctx.globalCompositeOperation='source-over';
}
  if(ready&&!over)drawReadyCore(ctx,p,C,time,frame.reducedMotion,lowQuality);
  if(shield)drawHexShield(ctx,p,C,time,frame.reducedMotion);
  if(magnet)drawMagnetParticles(ctx,p,C,time,frame.reducedMotion,lowQuality);
  if(slowed)drawSlowDust(ctx,p,C,time,frame.reducedMotion,lowQuality);
  if(perfect&&!frame.reducedMotion)drawPerfectCut(ctx,p,C,time,game.perfect);
  if(signature&&!frame.reducedMotion)drawSignatureMoment(ctx,frame,time);
  if(overImpact&&!frame.reducedMotion)drawOverImpact(ctx,p,C,game.overPulse,false);
  if(overFinish&&!frame.reducedMotion)drawOverImpact(ctx,p,C,game.overFinish,true);
  ctx.restore();
}

globalThis.NovaRunStateEffects=Object.freeze({draw});
})();

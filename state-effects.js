(()=>{
'use strict';

const ION=Object.freeze({
  core:'#F5FBFF',
  cyan:'#71D7E5',
  coral:'#E78361'
});

function rgba(color,alpha){
  const value=String(color||'').trim();

  if(/^#[0-9a-f]{3}$/i.test(value)){
    const r=parseInt(value[1]+value[1],16);
    const g=parseInt(value[2]+value[2],16);
    const b=parseInt(value[3]+value[3],16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  if(/^#[0-9a-f]{6}$/i.test(value)){
    const r=parseInt(value.slice(1,3),16);
    const g=parseInt(value.slice(3,5),16);
    const b=parseInt(value.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const values=value.match(/[\d.]+/g);

  return values&&values.length>=3
    ?`rgba(${values[0]},${values[1]},${values[2]},${alpha})`
    :value;
}

function polygon(ctx,points){
  ctx.beginPath();
  ctx.moveTo(points[0][0],points[0][1]);

  for(let i=1;i<points.length;i++){
    ctx.lineTo(points[i][0],points[i][1]);
  }

  ctx.closePath();
}

function diamond(ctx,x,y,size){
  polygon(ctx,[
    [x,y-size],
    [x+size,y],
    [x,y+size],
    [x-size,y]
  ]);
}

function effectColors(frame){
  const palette=frame.skin?.palette||{};

  return{
    trail:palette.trail||ION.cyan,
    particle:palette.particle||palette.core||ION.cyan,
    core:ION.core,
    coral:ION.coral
  };
}

function softVignette(
  ctx,
  width,
  height,
  color,
  alpha,
  focusX,
  focusY
){
  const radius=Math.hypot(width,height)*.68;

  const gradient=ctx.createRadialGradient(
    focusX,
    focusY,
    Math.min(width,height)*.18,
    focusX,
    focusY,
    radius
  );

  gradient.addColorStop(0,rgba(color,0));
  gradient.addColorStop(.64,rgba(color,.008));
  gradient.addColorStop(1,rgba(color,alpha));

  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,width,height);
}

function ribbon(
  ctx,
  startX,
  centerY,
  length,
  thickness,
  wave,
  color,
  alpha
){
  ctx.fillStyle=rgba(color,alpha);

  ctx.beginPath();
  ctx.moveTo(startX,centerY-thickness);

  ctx.bezierCurveTo(
    startX-length*.27,
    centerY-thickness-wave,
    startX-length*.7,
    centerY+wave,
    startX-length,
    centerY
  );

  ctx.bezierCurveTo(
    startX-length*.7,
    centerY-wave,
    startX-length*.27,
    centerY+thickness+wave,
    startX,
    centerY+thickness
  );

  ctx.closePath();
  ctx.fill();
}

function drawGroundCuts(
  ctx,
  p,
  time,
  colors,
  strength,
  quality,
  reducedMotion
){
  const sliding=p.slide>0&&p.ground;

  if(!sliding||reducedMotion){
    return;
  }

  const count=quality===2?7:quality===1?5:3;
  const groundY=p.y+p.h-2;

  ctx.save();
  ctx.lineCap='round';

  for(let i=0;i<count;i++){
    const phase=(time*(250+i*17)+i*41)%96;
    const startX=p.x+14-phase*.22;
    const length=24+i*7+strength*28;
    const coral=i%4===3;

    ctx.globalAlpha=coral?.48:.34;
    ctx.strokeStyle=coral?colors.coral:colors.core;
    ctx.lineWidth=coral?1.3:1.7;

    ctx.beginPath();
    ctx.moveTo(startX,groundY-i%2*3);
    ctx.lineTo(startX-length,groundY+2+i%3);
    ctx.stroke();
  }

  ctx.restore();
}

function drawIonTrail(ctx,frame){
  const p=frame.player;
  const game=frame.game;

  const over=game.over>0;
  const dashing=p.dash>0;

  if(!over&&!dashing){
    return;
  }

  const colors=effectColors(frame);
  const sliding=p.slide>0&&p.ground;
  const reducedMotion=!!frame.reducedMotion;

  const lowQuality=
    frame.performanceMode==='performance'||
    frame.visualQuality<.7;

  const quality=
    reducedMotion||lowQuality
      ?0
      :frame.performanceMode==='quality'
        ?2
        :1;

  const laneCount=quality===2?3:quality===1?2:1;
  const effectH=sliding?36:p.h;
  const effectY=sliding?p.y+p.h-effectH:p.y;

  const strength=over?1:.62;

  const pulse=
    over&&!reducedMotion
      ?.95+Math.sin(game.time*4.3)*.05
      :1;

  const slideScale=sliding?1.14:1;
  const startX=p.x+(sliding?18:9);

  ctx.save();

  for(let i=0;i<laneCount;i++){
    const laneOffset=
      sliding
        ?(i-(laneCount-1)/2)*5
        :(i-(laneCount-1)/2)*10;

    const centerY=
      effectY+
      effectH*(sliding?.62:.46)+
      laneOffset;

    const wave=
      reducedMotion
        ?0
        :Math.sin(
            game.time*(6.2-i*.55)+i*1.8
          )*(sliding?1.3:3.4);

    const outerLength=
      (110+strength*150+i*16)*
      slideScale*
      pulse;

    const mainLength=
      (85+strength*120+i*11)*
      slideScale*
      pulse;

    const coreLength=
      (58+strength*90+i*8)*
      slideScale*
      pulse;

    if(quality>0){
      ribbon(
        ctx,
        startX,
        centerY,
        outerLength,
        sliding?7.5:11,
        wave,
        colors.trail,
        over?.075:.055
      );
    }

    ribbon(
      ctx,
      startX,
      centerY,
      mainLength,
      sliding?4.2:6.2,
      wave*.65,
      colors.trail,
      over?.23:.17
    );

    if(!reducedMotion){
      ctx.globalCompositeOperation='lighter';

      ribbon(
        ctx,
        startX,
        centerY,
        coreLength,
        sliding?1.35:1.8,
        wave*.28,
        colors.core,
        over?.64:.48
      );

      ctx.globalCompositeOperation='source-over';
    }
  }

  drawGroundCuts(
    ctx,
    p,
    game.time,
    colors,
    strength,
    quality,
    reducedMotion
  );

  ctx.restore();
}

function drawHexShield(ctx,p,C,time,reduced){
  const cx=p.x+p.w/2;
  const cy=p.y+p.h/2;

  const r=
    44+
    (
      reduced
        ?0
        :Math.sin(time*4)*1.5
    );

  ctx.save();

  ctx.fillStyle=rgba(C.one,.08);
  ctx.strokeStyle=rgba(C.one,.45);
  ctx.lineWidth=1.6;

  polygon(
    ctx,
    Array.from(
      {length:6},
      (_,i)=>[
        cx+Math.cos(Math.PI/3*i-Math.PI/6)*r,
        cy+Math.sin(Math.PI/3*i-Math.PI/6)*r*1.12
      ]
    )
  );

  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha=.18;

  for(let i=0;i<3;i++){
    const angle=time*.35+i*Math.PI*2/3;
    const x=cx+Math.cos(angle)*r*.72;
    const y=cy+Math.sin(angle)*r*.8;

    ctx.fillStyle=C.fg;
    diamond(ctx,x,y,3);
    ctx.fill();
  }

  ctx.restore();
}

function drawMagnetParticles(
  ctx,
  p,
  C,
  time,
  reduced,
  lowQuality
){
  const cx=p.x+p.w/2;
  const cy=p.y+p.h*.48;
  const count=lowQuality?4:8;

  ctx.save();

  for(let i=0;i<count;i++){
    const phase=
      reduced
        ?.45
        :(time*(.55+i*.035)+i/count)%1;

    const radius=95*(1-phase)+18;
    const angle=i*2.399+time*(reduced?0:.3);

    const x=cx+Math.cos(angle)*radius;
    const y=cy+Math.sin(angle)*radius*.58;

    ctx.globalAlpha=.2+phase*.55;
    ctx.fillStyle=i%2?C.two:C.one;

    diamond(ctx,x,y,2.2+phase*1.3);
    ctx.fill();
  }

  ctx.restore();
}

function drawSlowDust(
  ctx,
  p,
  C,
  time,
  reduced,
  lowQuality
){
  const count=lowQuality?4:7;
  const cx=p.x+p.w/2;
  const cy=p.y+p.h/2;

  ctx.save();

  for(let i=0;i<count;i++){
    const angle=i*2.17+(reduced?0:time*.12);
    const radius=34+i*7;

    const x=cx+Math.cos(angle)*radius;
    const y=cy+Math.sin(angle)*radius*.62;

    ctx.globalAlpha=.16+i*.025;
    ctx.fillStyle=C.four;
    ctx.fillRect(x,y,2+i%2,2+i%2);
  }

  ctx.restore();
}

function drawReadyCore(
  ctx,
  p,
  time,
  reduced,
  lowQuality,
  colors
){
  const sliding=p.slide>0&&p.ground;

  const cx=p.x+p.w/2;
  const cy=
    sliding
      ?p.y+p.h-20
      :p.y+p.h*.46;

  const count=lowQuality?4:6;

  const pulse=
    reduced
      ?1
      :.82+Math.sin(time*5)*.18;

  ctx.save();

  for(let i=0;i<count;i++){
    const angle=
      i*Math.PI*2/count+
      (
        reduced
          ?0
          :time*.65
      );

    const radius=29+(i%2)*8;

    const x=cx+Math.cos(angle)*radius;
    const y=cy+Math.sin(angle)*radius*.76;

    ctx.globalAlpha=.28+.2*pulse;

    ctx.fillStyle=
      i%3===0
        ?colors.coral
        :i%2
          ?colors.core
          :colors.trail;

    diamond(ctx,x,y,2.4+(i%2));
    ctx.fill();
  }

  ctx.restore();
}

function drawOverdriveCore(
  ctx,
  p,
  time,
  reduced,
  colors
){
  const sliding=p.slide>0&&p.ground;

  const cx=p.x+p.w*.52;
  const cy=
    sliding
      ?p.y+p.h-19
      :p.y+p.h*.43;

  const pulse=
    reduced
      ?1
      :.88+Math.sin(time*4.1)*.12;

  const gradient=ctx.createRadialGradient(
    cx,
    cy,
    1,
    cx,
    cy,
    30*pulse
  );

  gradient.addColorStop(0,rgba(colors.core,.62));
  gradient.addColorStop(.34,rgba(colors.trail,.22));
  gradient.addColorStop(.72,rgba(colors.coral,.075));
  gradient.addColorStop(1,rgba(colors.trail,0));

  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=gradient;

  ctx.beginPath();
  ctx.arc(cx,cy,30*pulse,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawPerfectCut(ctx,p,C,time,amount){
  const cx=p.x+p.w/2;
  const cy=p.y+p.h/2;

  const progress=
    1-Math.min(1,amount/.36);

  const radius=32+progress*34;

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(-.5);

  ctx.globalAlpha=(1-progress)*.5;
  ctx.fillStyle=C.fg;

  for(const side of [-1,1]){
    polygon(ctx,[
      [side*(radius-5),-2],
      [side*(radius+22),-5],
      [side*(radius+10),2],
      [side*(radius-3),4]
    ]);

    ctx.fill();
  }

  ctx.restore();
}

function drawBehind(ctx,frame){
  drawIonTrail(ctx,frame);
}

function drawFront(ctx,frame){
  const p=frame.player;
  const game=frame.game;
  const C=frame.palette;

  const width=frame.width;
  const height=frame.height;

  const time=
    frame.reducedMotion
      ?0
      :game.time;

  const lowQuality=
    frame.performanceMode==='performance'||
    frame.visualQuality<.7;

  const colors=effectColors(frame);

  const over=game.over>0;
  const ready=game.overReady;
  const hurt=p.hurt>0;
  const shield=p.shield>0;
  const magnet=p.magnet>0;
  const slowed=p.slow>0;
  const perfect=game.perfect>0;

  if(
    !over&&
    !ready&&
    !hurt&&
    !shield&&
    !magnet&&
    !slowed&&
    !perfect
  ){
    return;
  }

  ctx.save();

  if(hurt){
    softVignette(
      ctx,
      width,
      height,
      C.two,
      Math.min(.16,.06+p.hurt*.1),
      p.x+p.w*.5,
      p.y+p.h*.5
    );
  }else if(slowed){
    softVignette(
      ctx,
      width,
      height,
      C.four,
      .055,
      p.x+p.w*.5,
      p.y+p.h*.5
    );
  }else if(over){
    softVignette(
      ctx,
      width,
      height,
      colors.trail,
      .032,
      p.x+p.w*.5,
      p.y+p.h*.5
    );
  }

  if(over){
    drawOverdriveCore(
      ctx,
      p,
      time,
      frame.reducedMotion,
      colors
    );
  }

  if(ready&&!over){
    drawReadyCore(
      ctx,
      p,
      time,
      frame.reducedMotion,
      lowQuality,
      colors
    );
  }

  if(shield){
    drawHexShield(
      ctx,
      p,
      C,
      time,
      frame.reducedMotion
    );
  }

  if(magnet){
    drawMagnetParticles(
      ctx,
      p,
      C,
      time,
      frame.reducedMotion,
      lowQuality
    );
  }

  if(slowed){
    drawSlowDust(
      ctx,
      p,
      C,
      time,
      frame.reducedMotion,
      lowQuality
    );
  }

  if(perfect&&!frame.reducedMotion){
    drawPerfectCut(
      ctx,
      p,
      C,
      time,
      game.perfect
    );
  }

  ctx.restore();
}

/* 兼容旧调用方式。 */
function draw(ctx,frame){
  drawBehind(ctx,frame);
  drawFront(ctx,frame);
}

globalThis.NovaRunStateEffects=Object.freeze({
  draw,
  drawBehind,
  drawFront
});

})();

(()=>{
'use strict';

const rgba=(color,alpha)=>{const values=String(color||'').match(/[\d.]+/g);return values&&values.length>=3?`rgba(${values[0]},${values[1]},${values[2]},${alpha})`:color};
function polygon(ctx,points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath()}
function diamond(ctx,x,y,size){polygon(ctx,[[x,y-size],[x+size,y],[x,y+size],[x-size,y]])}

function softVignette(ctx,width,height,color,alpha,focusX,focusY){
  const radius=Math.hypot(width,height)*.68,gradient=ctx.createRadialGradient(focusX,focusY,Math.min(width,height)*.2,focusX,focusY,radius);gradient.addColorStop(0,rgba(color,0));gradient.addColorStop(.66,rgba(color,.01));gradient.addColorStop(1,rgba(color,alpha));ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
}
function trailRibbon(ctx,p,time,color,index,strength){
  const centerY=p.y+p.h*(.34+index*.12),length=62+index*27+strength*70,wave=Math.sin(time*(7-index*.8)+index*1.7)*4,thickness=8-index*1.4;
  ctx.fillStyle=rgba(color,.14+strength*.12-index*.018);ctx.beginPath();ctx.moveTo(p.x+8,centerY-thickness);ctx.bezierCurveTo(p.x-length*.3,centerY-thickness-wave,p.x-length*.72,centerY+wave,p.x-length,centerY);ctx.bezierCurveTo(p.x-length*.72,centerY-wave,p.x-length*.3,centerY+thickness+wave,p.x+8,centerY+thickness);ctx.closePath();ctx.fill();
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

function draw(ctx,frame){
  const p=frame.player,game=frame.game,C=frame.palette,width=frame.width,height=frame.height,time=frame.reducedMotion?0:game.time,lowQuality=frame.performanceMode==='performance'||frame.visualQuality<.7;
  const over=game.over>0,ready=game.overReady,dashing=p.dash>0,hurt=p.hurt>0,shield=p.shield>0,magnet=p.magnet>0,slowed=p.slow>0,perfect=game.perfect>0;
  if(!over&&!ready&&!dashing&&!hurt&&!shield&&!magnet&&!slowed&&!perfect)return;
  ctx.save();
  if(hurt)softVignette(ctx,width,height,C.two,Math.min(.16,.06+p.hurt*.1),p.x+p.w*.5,p.y+p.h*.5);
  else if(slowed)softVignette(ctx,width,height,C.four,.055,p.x+p.w*.5,p.y+p.h*.5);
  else if(over)softVignette(ctx,width,height,C.three,.045,p.x+p.w*.5,p.y+p.h*.5);
  if(over||dashing){ctx.globalCompositeOperation='lighter';const count=frame.reducedMotion?1:lowQuality?2:4,strength=over?1:.55;for(let i=0;i<count;i++)trailRibbon(ctx,p,time,over?C.three:C.one,i,strength);ctx.globalCompositeOperation='source-over'}
  if(ready&&!over)drawReadyCore(ctx,p,C,time,frame.reducedMotion,lowQuality);
  if(shield)drawHexShield(ctx,p,C,time,frame.reducedMotion);
  if(magnet)drawMagnetParticles(ctx,p,C,time,frame.reducedMotion,lowQuality);
  if(slowed)drawSlowDust(ctx,p,C,time,frame.reducedMotion,lowQuality);
  if(perfect&&!frame.reducedMotion)drawPerfectCut(ctx,p,C,time,game.perfect);
  ctx.restore();
}

globalThis.NovaRunStateEffects=Object.freeze({draw});
})();

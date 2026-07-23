(()=>{
  'use strict';
  try{
  const {DIFFICULTY:DIFF,SCENES,CHALLENGE_SCENES,PHYSICS,PARALLAX,GATE_GAP_HEIGHT,CONTENT,HAZARDS,SCENE_RULES,sceneScaleForHeight,openingSpawnDelay,bestScoreKey,createObstacleDirector}=globalThis.NovaRunConfig||{};
  if(!DIFF||!SCENES||!PHYSICS)throw new Error('Configuration unavailable');
  const root=document.getElementById('nova-run-game');
  if(!root||root.getAttribute('data-ready'))return;
  root.setAttribute('data-ready','1');
  const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D unavailable');
  const coverDesktop=new Image(),coverMobile=new Image();coverDesktop.decoding='async';coverMobile.decoding='async';coverDesktop.src='./assets/nova-cover.webp?v=20260721';coverMobile.src='./assets/nova-cover-mobile.webp?v=20260721';
  const Store=globalThis.NovaRunStorage,Sound=globalThis.NovaRunAudio,UI=globalThis.NovaRunUI,PlayerRenderer=globalThis.NovaRunPlayerRenderer,PlatformService=globalThis.NovaRunPlatform,BackgroundService=globalThis.NovaRunBackgrounds,StateEffects=globalThis.NovaRunStateEffects;
  if(!Store||!Sound||!UI||!PlayerRenderer||!PlatformService||!BackgroundService||!StateEffects)throw new Error('Game services unavailable');
  const savedSettings=Store.settings();root.dataset.theme=savedSettings.theme==='light'?'light':'dark';
  let W=900,H=650,DPR=1,last=0,shake=0,flash=0,visible=true,scheduled=false,frameId=0,sizedW=0,sizedH=0,visualQuality=1,slowFrameScore=0,resizeQueued=false,appUi=null,platform=null,modalResume=false;
  const raf=window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(fn){return setTimeout(function(){fn(Date.now())},16)};
  const caf=window.cancelAnimationFrame?window.cancelAnimationFrame.bind(window):clearTimeout;
  const fallbackColors={'--background':'rgb(24,24,24)','--foreground':'rgb(255,255,255)','--card':'rgb(45,45,45)','--muted-foreground':'rgb(170,170,170)','--border':'rgb(75,75,75)','--viz-series-1':'rgb(131,195,255)','--viz-series-2':'rgb(245,154,86)','--viz-series-3':'rgb(116,213,139)','--viz-series-4':'rgb(240,143,192)','--viz-series-5':'rgb(170,145,239)'};
  const colorProbe=document.createElement('span');colorProbe.hidden=true;root.appendChild(colorProbe);
  const cv=n=>{colorProbe.style.color=fallbackColors[n]||'#fff';colorProbe.style.color=`var(${n})`;return getComputedStyle(colorProbe).color||fallbackColors[n]||'#fff'};
  const C={};function refreshColors(){Object.assign(C,{bg:cv('--background'),fg:cv('--foreground'),card:cv('--card'),muted:cv('--muted-foreground'),border:cv('--border'),one:cv('--viz-series-1'),two:cv('--viz-series-2'),three:cv('--viz-series-3'),four:cv('--viz-series-4'),five:cv('--viz-series-5')})}refreshColors();
  const I18N=globalThis.NovaRunI18n;
  if(!I18N)throw new Error('Translations unavailable');
  const CHALLENGES=globalThis.NovaChallengeEngine;
  let language=I18N[savedSettings.language]?savedSettings.language:'zh',difficulty=DIFF[savedSettings.difficulty]?savedSettings.difficulty:'medium',scene=SCENES.includes(savedSettings.scene)?savedSettings.scene:'guangzhou',reducedMotion=!!savedSettings.reducedMotion,vibrationEnabled=savedSettings.vibration!==false,shakeStrength=Number.isFinite(savedSettings.shakeStrength)?savedSettings.shakeStrength:.7,skin=savedSettings.skin||'nova',performanceMode=['auto','quality','performance'].includes(savedSettings.performanceMode)?savedSettings.performanceMode:'auto';
  const tr=(key,vars={})=>{let text=(I18N[language]&&I18N[language][key])||I18N.zh[key]||key;for(const name in vars)if(Object.prototype.hasOwnProperty.call(vars,name))text=text.split(`{${name}}`).join(vars[name]);return text};
  const loadBest=()=>{try{return +localStorage.getItem(bestScoreKey(difficulty))||0}catch(e){return 0}};
  let seedParam='';try{const params=new URLSearchParams(location.search),challengeScene=params.get('scene'),challengeDifficulty=params.get('difficulty');seedParam=params.get('seed')||'';if(SCENES.includes(challengeScene))scene=challengeScene;if(DIFF[challengeDifficulty])difficulty=challengeDifficulty}catch(e){}
  if(!Store.unlockedScenes().includes(scene))scene='guangzhou';
  if(seedParam)root.dataset.seed=seedParam;
  const randomSeed=()=>`${Date.now().toString(36)}-${Math.floor(Math.random()*0xffffff).toString(36)}`;let activeSeed=seedParam||randomSeed();
  const backgroundRenderer=BackgroundService.create({ctx});backgroundRenderer.setScene(scene,activeSeed);
  let director=createObstacleDirector({scene,difficulty,seed:activeSeed});
  const game={mode:'menu',time:0,score:0,best:(CHALLENGE_SCENES||[]).includes(scene)?Store.challengeRecord(scene).bestScore:loadBest(),distance:0,speed:DIFF[difficulty].startSpeed,combo:1,comboT:0,energy:40,over:0,overReady:false,overWindow:0,overBreaks:0,perfect:0,flow:1,flowPerfect:0,spawn:.7,diff:difficulty,lastHazard:'',pendingPlan:null,generatorPhase:'intro',generatorCount:0,checkpointDistance:0,rescueAvailable:false,things:[],particles:[],notes:[],stars:[],towers:[]};
  coverDesktop.onload=coverMobile.onload=()=>{if(game.mode==='menu')render()};
  const runStats={collects:0,perfect:0,breaks:0,maxCombo:1,rescues:0,unlockedScenesBefore:[],unlockedSkinsBefore:[],finished:false};
  const p={x:150,y:0,w:42,h:68,vy:0,jumps:0,ground:true,coyote:PHYSICS.coyoteTime,jumpBuffer:0,jumpHeld:false,slide:0,slideState:'idle',dash:0,shield:0,magnet:0,slow:0,rot:0,land:0,hurt:0,iceDrift:0};
  let mountainState=null;
  const mountainInput={left:false,right:false,down:false,jumpHeld:false,jumpPressed:false,dashPressed:false,autoRun:false};
  const challengeMap=()=>CHALLENGES&&CHALLENGES.get(scene);
  const isMountain=()=>!!challengeMap();
  const floor=()=>H*.79;
  const runnerX=()=>Math.max(80,W*.14);
  const scenePace=()=>SCENE_RULES[scene]&&SCENE_RULES[scene].pace||1;
  const skinProfile=()=>CONTENT.skins.find(item=>item.id===skin)||CONTENT.skins[0];
  const palette=name=>C[name]||C.one;
  const skinAccent=()=>palette(skinProfile().color),skinTrail=()=>palette(skinProfile().trail);
  const isHazard=type=>!!HAZARDS[type];
  const sceneScale=()=>sceneScaleForHeight(H);
  function fitSceneHeight(fy=floor()){const scale=sceneScale();ctx.translate(0,fy);ctx.scale(1,scale);ctx.translate(0,-fy);return scale}
  const rgba=(color,a)=>{const m=color.match(/[\d.]+/g);return m&&m.length>=3?`rgba(${m[0]},${m[1]},${m[2]},${a})`:color};
  const gradientCache=new Map();
  function linearGradient(key,x0,y0,x1,y1,stops){if(gradientCache.has(key))return gradientCache.get(key);const gradient=ctx.createLinearGradient(x0,y0,x1,y1);for(const stop of stops)gradient.addColorStop(stop[0],stop[1]);gradientCache.set(key,gradient);return gradient}
  const languageSelect=root.querySelector('[data-setting="language"]'),difficultySelect=root.querySelector('[data-setting="difficulty"]'),sceneSelect=root.querySelector('[data-setting="scene"]'),motionToggle=root.querySelector('[data-setting="motion"]');
  const orientationButton=root.querySelector('[data-orientation-toggle]'),orientationLabel=root.querySelector('[data-orientation-label]'),orientationHint=root.querySelector('[data-orientation-hint]');
  const pauseButton=root.querySelector('[data-quick="pause"]'),soundButton=root.querySelector('[data-quick="sound"]'),pauseIcon=root.querySelector('[data-pause-icon]'),soundIcon=root.querySelector('[data-sound-icon]');
  const menuStart=root.querySelector('[data-menu-start]'),menuStartText=root.querySelector('[data-menu-start-text]'),menuScene=root.querySelector('[data-menu-scene]'),menuDifficulty=root.querySelector('[data-menu-difficulty]'),menuMode=root.querySelector('[data-menu-mode]'),menuFeatures=root.querySelector('[data-menu-features]'),menuControls=root.querySelector('[data-menu-controls]'),controlsHelp=root.querySelector('[data-controls-help]'),controlsHelpTrigger=root.querySelector('[data-controls-help-trigger]');
  const QUICK_TEXT={zh:{pause:'暂停',resume:'继续',soundOn:'打开声音',soundOff:'关闭声音'},en:{pause:'Pause',resume:'Resume',soundOn:'Sound on',soundOff:'Sound off'},ru:{pause:'Пауза',resume:'Продолжить',soundOn:'Включить звук',soundOff:'Выключить звук'}};
  let soundEnabled=!!(savedSettings.musicEnabled||savedSettings.sfxEnabled);Sound.setSettings(savedSettings);
  let orientationHintTimer=0;
  const isLandscape=()=>{const type=screen.orientation&&screen.orientation.type;if(type)return type.indexOf('landscape')===0;return window.innerWidth>window.innerHeight};
  function updateOrientationUi(){const next=isLandscape()?'portrait':'landscape';orientationLabel.textContent=tr(next);orientationButton.setAttribute('aria-label',tr(next==='landscape'?'switchLandscape':'switchPortrait'));orientationButton.dataset.targetOrientation=next}
  function syncQuickUi(){const text=QUICK_TEXT[language]||QUICK_TEXT.zh,isPaused=game.mode==='pause';pauseButton.setAttribute('aria-label',text[isPaused?'resume':'pause']);pauseIcon.innerHTML=isPaused?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5 18 12 8 18.5Z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';soundButton.setAttribute('aria-label',text[soundEnabled?'soundOff':'soundOn']);soundIcon.innerHTML=soundEnabled?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="nr-icon-stroke" d="M16 8.5c1 1 1.5 2.1 1.5 3.5S17 14.5 16 15.5M18.5 6c1.7 1.7 2.5 3.7 2.5 6s-.8 4.3-2.5 6"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="nr-icon-stroke" d="m16 9 5 6m0-6-5 6"/></svg>'}
  function syncSceneText(){const challenge=isMountain(),featureKey=scene==='tideCity'?'tideFeatures':scene==='sandClock'?'sandFeatures':'platformFeatures';menuScene.textContent=tr(scene);menuMode.textContent=tr(challenge?'stageMode':'parkourMode');menuStartText.textContent=tr(challenge?'startChallenge':'start');menuFeatures.textContent=tr(challenge?featureKey:'features');menuControls.textContent=tr(challenge?'platformControls':'controls');root.dataset.gameType=challenge?'challenge':'runner'}
  function setControlsHelp(open){controlsHelp.classList.toggle('is-open',open);controlsHelpTrigger.setAttribute('aria-expanded',String(open))}
  function syncModeUi(){const settings=Store.settings(),light=settings.theme==='light';root.dataset.mode=game.mode;root.dataset.scene=scene;root.dataset.theme=light?'light':'dark';root.dataset.touch=touchDevice()?'true':'false';root.style.colorScheme=light?'light':'dark';const themeMeta=document.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content=light?'#f4efe7':'#181919';root.dataset.motion=reducedMotion?'reduced':'full';root.dataset.contrast=settings.highContrast?'high':'normal';root.dataset.performance=performanceMode;root.dataset.overdrive=game.over>0?'on':game.overReady?'ready':'off';root.style.setProperty('--touch-opacity',String(settings.touchOpacity));syncQuickUi();Sound.setPlaying(game.mode==='play');platform?.setGameMode(game.mode);appUi?.syncPause(game.mode)}
  function showOrientationHint(target){clearTimeout(orientationHintTimer);orientationHint.textContent=tr(target==='landscape'?'rotateLandscapeHint':'rotatePortraitHint');orientationHint.hidden=false;orientationHintTimer=setTimeout(()=>{orientationHint.hidden=true},2600)}
  function applyUi(drawNow=true){
    root.lang=language;root.setAttribute('aria-label',tr('gameLabel'));canvas.setAttribute('aria-label',tr('canvasLabel'));root.querySelector('.nr-touch').setAttribute('aria-label',tr('touch'));
    root.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=tr(el.dataset.i18n));
    for(const action of ['jump','slide','dash']){const button=root.querySelector(`[data-act="${action}"]`);button.querySelector('[data-action-label]').textContent=tr(action);button.setAttribute('aria-label',tr(action))}
    for(const action of ['left','right'])root.querySelector(`[data-act="${action}"]`).setAttribute('aria-label',tr(action));
    for(const level of ['easy','medium','hard'])difficultySelect.querySelector(`option[value="${level}"]`).textContent=tr(level);
    for(const name of SCENES)sceneSelect.querySelector(`option[value="${name}"]`).textContent=tr(name);
    menuDifficulty.textContent=tr(difficulty);syncSceneText();
    languageSelect.setAttribute('aria-label',tr('language'));difficultySelect.setAttribute('aria-label',tr('difficulty'));sceneSelect.setAttribute('aria-label',tr('scene'));motionToggle.setAttribute('aria-label',tr('reduceMotion'));controlsHelpTrigger.setAttribute('aria-label',tr('controlsHelp'));languageSelect.value=language;difficultySelect.value=difficulty;sceneSelect.value=scene;motionToggle.checked=reducedMotion;root.dataset.scene=scene;root.dataset.motion=reducedMotion?'reduced':'full';orientationHint.hidden=true;updateOrientationUi();syncQuickUi();if(appUi)appUi.applyLanguage();if(drawNow)render()
  }
  languageSelect.addEventListener('change',()=>{language=languageSelect.value;Store.updateSettings({language});applyUi()});
  controlsHelpTrigger.addEventListener('pointerenter',()=>setControlsHelp(true));controlsHelpTrigger.addEventListener('pointerleave',()=>setControlsHelp(false));controlsHelpTrigger.addEventListener('focus',()=>setControlsHelp(true));controlsHelpTrigger.addEventListener('blur',()=>setControlsHelp(false));controlsHelpTrigger.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setControlsHelp(false);controlsHelpTrigger.blur()}});
  difficultySelect.addEventListener('change',()=>{difficulty=difficultySelect.value;game.diff=difficulty;menuDifficulty.textContent=tr(difficulty);Store.updateSettings({difficulty});if(game.mode!=='menu'){disposeActiveSession();game.best=isMountain()?Store.challengeRecord(scene).bestScore:loadBest();syncModeUi();render()}else{game.best=loadBest();game.speed=DIFF[difficulty].startSpeed;render()}});
  function clearInputState(){Object.assign(mountainInput,{left:false,right:false,down:false,jumpHeld:false,jumpPressed:false,dashPressed:false,autoRun:false});Object.assign(p,{jumpHeld:false,jumpBuffer:0,slide:0,slideState:'idle',dash:0});for(const button of root.querySelectorAll('[data-act].is-pressed'))button.classList.remove('is-pressed')}
  function disposeActiveSession(){stopLoop();clearInputState();clearTimeout(orientationHintTimer);orientationHintTimer=0;orientationHint.hidden=true;if(Sound.setIntensity)Sound.setIntensity('normal');Sound.setPlaying(false);mountainState=null;gradientCache.clear();backgroundRenderer.invalidate();Object.assign(game,{mode:'menu',time:0,score:0,distance:0,speed:DIFF[difficulty].startSpeed,combo:1,comboT:0,energy:DIFF[difficulty].startEnergy,over:0,overReady:false,overWindow:0,overBreaks:0,perfect:0,flow:1,flowPerfect:0,spawn:.7,lastHazard:'',pendingPlan:null,generatorPhase:'intro',generatorCount:0,checkpointDistance:0,rescueAvailable:false,tutorialRun:false,tutorialStage:0,things:[],particles:[],notes:[],completed:false,newBest:false,challengeResult:null});Object.assign(p,{x:runnerX(),y:floor()-68,w:42,h:68,vy:0,jumps:0,ground:true,coyote:PHYSICS.coyoteTime,shield:0,magnet:0,slow:0,rot:0,land:0,hurt:0,iceDrift:0});runStats.finished=true;if(appUi)appUi.resetTransient();last=0;shake=0;flash=0}
  function chooseScene(next){if(!SCENES.includes(next)||!Store.unlockedScenes().includes(next)){sceneSelect.value=scene;return false}if(next===scene){sceneSelect.value=scene;return true}const activeSession=game.mode!=='menu';if(activeSession)disposeActiveSession();scene=next;seedParam='';activeSeed=randomSeed();backgroundRenderer.setScene(scene,activeSeed);sceneSelect.value=scene;Store.updateSettings({scene});root.dataset.scene=scene;const map=challengeMap();mountainState=map?map.createState(W,H):null;director=map?director:createObstacleDirector({scene,difficulty:game.diff,seed:activeSeed});game.best=map?Store.challengeRecord(scene).bestScore:loadBest();syncSceneText();syncModeUi();seed();render();return true}
  sceneSelect.addEventListener('change',()=>chooseScene(sceneSelect.value));
  motionToggle.addEventListener('change',()=>{reducedMotion=motionToggle.checked;Store.updateSettings({reducedMotion});root.dataset.motion=reducedMotion?'reduced':'full';if(reducedMotion){shake=0;flash=0;game.particles.length=0;note(tr('motionReduced'),C.three)}render()});

  function dprLimit(){if(performanceMode==='performance')return 1.15;if(performanceMode==='quality')return 2;const memory=Number(navigator.deviceMemory)||4,cores=navigator.hardwareConcurrency||4,shortSide=Math.min(innerWidth,innerHeight);return memory<=4||cores<=4||shortSide<430?1.35:1.75}
  function resize(skipRender=false){const r=root.getBoundingClientRect(),nextW=Math.max(320,r.width),nextH=Math.max(280,r.height),nextDPR=Math.min(dprLimit(),Math.max(1,window.devicePixelRatio||1));updateOrientationUi();if(canvas.width&&Math.abs(nextW-sizedW)<1&&Math.abs(nextH-sizedH)<1&&Math.abs(nextDPR-DPR)<.01)return;W=nextW;H=nextH;sizedW=W;sizedH=H;DPR=nextDPR;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality=performanceMode==='performance'?'medium':'high';gradientCache.clear();backgroundRenderer.resize({width:W,height:H,dpr:DPR,theme:root.dataset.theme,quality:visualQuality});seed();p.x=runnerX();const map=challengeMap();if(map&&!mountainState)mountainState=map.createState(W,H);if(game.mode!=='play')p.y=floor()-p.h;if(!skipRender)render()}
  function scheduleResize(){if(resizeQueued)return;resizeQueued=true;raf(()=>{resizeQueued=false;resize()})}
  function seed(){const span=W;game.stars=Array.from({length:26},()=>({x:Math.random()*W,y:Math.random()*H*.68,r:Math.random()*1.6+.4,a:Math.random()*.65+.2}));game.towers=Array.from({length:12},(_,i)=>({x:i*(span/12)+Math.random()*15,w:26+Math.random()*65,h:60+Math.random()*210,z:Math.random()}))}
  try{if(typeof ResizeObserver==='function')new ResizeObserver(scheduleResize).observe(root);else addEventListener('resize',scheduleResize,{passive:true})}catch(e){addEventListener('resize',scheduleResize,{passive:true})}
  try{if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=!entries[0]||entries[0].isIntersecting!==false;if(visible){last=0;schedule()}else stopLoop()},{rootMargin:'80px'}).observe(root)}catch(e){visible=true}

  function tone(freq=440,d=.06,type='sine',vol=.035){Sound.custom(freq,d,type,vol)}
  function vibrate(pattern){if(reducedMotion||!vibrationEnabled)return;try{if(typeof navigator.vibrate==='function')navigator.vibrate(pattern)}catch(e){}}
  function burst(px,py,color=C.one,n=14,power=1){const count=Math.max(2,Math.ceil(n*visualQuality*(reducedMotion?.25:1)));for(let i=0;i<count&&game.particles.length<180;i++){const a=Math.random()*Math.PI*2,s=(55+Math.random()*250)*power*(reducedMotion?.45:1);game.particles.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:2+Math.random()*4,t:(.3+Math.random()*.5)*(reducedMotion?.55:1),color})}}
  function note(text,color=C.fg){game.notes.push({text,color,t:1,y:H*.29})}
  function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,r);else{const q=Math.min(r,w/2,h/2);ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath()}if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function fitFont(text,maxWidth,maxSize=15,minSize=10,weight='400'){let size=maxSize;do{ctx.font=`${weight} ${size}px system-ui`;size--}while(size>=minSize&&ctx.measureText(text).width>maxWidth)}
  function actionButton(y,color){ctx.save();ctx.shadowBlur=8;ctx.shadowColor=rgba(color,.55);const g=ctx.createLinearGradient(W/2-105,y,W/2+105,y+50);g.addColorStop(0,rgba(color,.78));g.addColorStop(1,rgba(C.card,.96));rr(W/2-105,y,210,50,14,g,rgba(color,.85));ctx.fillStyle=C.fg;ctx.globalAlpha=.72;ctx.beginPath();ctx.moveTo(W/2+78,y+18);ctx.lineTo(W/2+88,y+25);ctx.lineTo(W/2+78,y+32);ctx.strokeStyle=C.fg;ctx.lineWidth=2;ctx.stroke();ctx.restore()}

  function reset(){
    if(game.mode==='play'&&game.time<.35)return;
    if(Sound.setIntensity)Sound.setIntensity('normal');
    stopLoop();clearInputState();Sound.unlock();const cfg=DIFF[game.diff],scenesBefore=Store.unlockedScenes(),skinsBefore=Store.unlockedSkins();if(!seedParam)activeSeed=randomSeed();backgroundRenderer.setScene(scene,activeSeed);Store.beginRun();Object.assign(runStats,{collects:0,perfect:0,breaks:0,maxCombo:1,rescues:0,unlockedScenesBefore:scenesBefore,unlockedSkinsBefore:skinsBefore,finished:false});if(appUi){appUi.hideResults();appUi.closeSettings();appUi.closeProfile()}
    Object.assign(game,{mode:'play',time:0,score:0,distance:0,speed:cfg.startSpeed,combo:1,comboT:0,energy:cfg.startEnergy,over:0,overReady:false,overWindow:0,overBreaks:0,perfect:0,flow:1,flowPerfect:0,lastHazard:'',pendingPlan:null,generatorPhase:'intro',generatorCount:0,checkpointDistance:0,rescueAvailable:game.diff==='easy',tutorialRun:false,tutorialStage:0,things:[],particles:[],notes:[],completed:false,newBest:false,challengeResult:null});
    if(isMountain()){
      const map=challengeMap();mountainState=map.createState(W,H);game.best=Store.challengeRecord(scene).bestScore;Object.assign(mountainInput,{left:false,right:false,down:false,jumpHeld:false,jumpPressed:false,dashPressed:false,autoRun:false});game.energy=100;game.spawn=999;syncModeUi();try{canvas.focus({preventScroll:true})}catch(e){canvas.focus()}last=0;schedule();tone(520,.1,'triangle',.04);return;
    }
    director=createObstacleDirector({scene,difficulty:game.diff,seed:activeSeed});game.spawn=openingSpawnDelay(W,runnerX(),cfg.startSpeed*scenePace(),cfg.introSeconds);syncModeUi();
    Object.assign(p,{x:runnerX(),y:floor()-68,w:42,h:68,vy:0,jumps:0,ground:true,coyote:PHYSICS.coyoteTime,jumpBuffer:0,jumpHeld:false,slide:0,slideState:'idle',dash:0,shield:game.diff==='easy'?2.5:0,magnet:0,slow:0,rot:0,land:0,hurt:0,iceDrift:0});for(let i=0;i<6;i++)coin(W+120+i*48,floor()-115-Math.sin(i*.7)*35);last=0;schedule();tone(520,.1,'square',.04);
    if(appUi)game.tutorialRun=appUi.startTutorial();
  }
  function challengeUrl(){try{const url=new URL(location.href);url.search='';url.searchParams.set('scene',scene);if(!isMountain()){url.searchParams.set('difficulty',game.diff);url.searchParams.set('seed',activeSeed)}return url.href}catch(e){return location.href}}
  function finalizeRun(){if(runStats.finished)return;runStats.finished=true;runStats.maxCombo=Math.max(runStats.maxCombo,Math.floor(game.combo));const progress=Store.finishRun({distance:game.distance,score:game.score,maxCombo:runStats.maxCombo,collects:runStats.collects,perfect:runStats.perfect,breaks:runStats.breaks,unlockedScenesBefore:runStats.unlockedScenesBefore,unlockedSkinsBefore:runStats.unlockedSkinsBefore}),sceneUnlock=progress.newScenes[0],skinUnlock=progress.newSkins[0],achievement=progress.fresh[0],unlockText=sceneUnlock?tr('sceneUnlocked',{name:tr(sceneUnlock)}):skinUnlock?tr('skinUnlocked',{name:tr(`skin_${skinUnlock}`)}):achievement?tr('achievementUnlocked',{name:tr(`achievement_${achievement}`)}):'';const summary={score:Math.floor(game.score),distance:Math.floor(game.distance),best:game.best,maxCombo:runStats.maxCombo,collects:runStats.collects,scene,difficulty:isMountain()?'stageMode':game.diff,newBest:!!game.newBest,challenge:game.challengeResult||null,challengeUrl:challengeUrl(),shareText:tr('shareTemplate',{scene:tr(scene),distance:Math.floor(game.distance),score:Math.floor(game.score)}),unlockText};if(appUi){appUi.renderSettings();appUi.showResults(summary)}}
  function finish(){if(game.mode!=='play')return;if(Sound.setIntensity)Sound.setIntensity('normal');game.mode='over';p.hurt=1;p.rot=-.38;game.newBest=Math.floor(game.score)>game.best;shake=reducedMotion?0:scene==='volcano'?5:9;flash=reducedMotion?0:scene==='volcano'?.14:.26;game.best=Math.max(game.best,Math.floor(game.score));syncModeUi();try{localStorage.setItem(bestScoreKey(game.diff),game.best)}catch(e){}if(!game.newBest)Sound.sfx('fail');vibrate([24,35,50]);burst(p.x+p.w/2,p.y+p.h/2,C.two,24,.9);finalizeRun()}
  function rescueRunner(label){const cfg=DIFF[game.diff];runStats.rescues++;game.score=Math.max(0,game.score-180*cfg.scoreMult);game.combo=1;game.comboT=0;game.things.length=0;game.pendingPlan=null;game.spawn=1.15;p.x=runnerX();p.y=floor()-p.h;p.vy=0;p.ground=true;p.jumps=0;p.coyote=PHYSICS.coyoteTime;p.jumpBuffer=0;p.slide=0;p.dash=0;p.hurt=.28;shake=reducedMotion?0:2;flash=reducedMotion?0:.1;note(label,C.one);tone(180,.12,'triangle',.035);vibrate(14)}
  function respawnRunnerFromDeathZone(){if(game.mode!=='play'||isMountain())return;if(game.tutorialRun){rescueRunner(tr('tutorialTryAgain'));return}if(p.shield>0){p.shield=0;rescueRunner(tr('shieldRescue'));return}if(game.diff==='easy'&&game.rescueAvailable){game.rescueAvailable=false;rescueRunner(tr('novaRescue'));return}finish()}
  function challengeGrade(state,map){const deaths=state.deaths||0,time=state.time||0,total=map.COLLECTIBLES.length,allCollects=state.collected.size>=total,hidden=!!state.hiddenFound,timeLimit=map.WORLD_LENGTH/115;let points=100-deaths*17-Math.max(0,time-timeLimit)*.28+(allCollects?8:0)+(hidden?5:0);return{grade:points>=92?'S':points>=78?'A':points>=62?'B':'C',allCollects,timeBadge:time<=timeLimit,hidden,total}}
  function completeMountain(){if(game.mode!=='play')return;const map=challengeMap(),rating=challengeGrade(mountainState,map);game.mode='over';game.completed=true;game.challengeResult={...rating,time:mountainState.time,deaths:mountainState.deaths,collects:mountainState.collected.size};game.newBest=Math.floor(game.score)>game.best;game.best=Math.max(game.best,Math.floor(game.score));Store.completeChallenge(scene,{score:game.score,time:mountainState.time,deaths:mountainState.deaths,grade:rating.grade,allCollects:rating.allCollects,timeBadge:rating.timeBadge});syncModeUi();if(!game.newBest)Sound.sfx('checkpoint');vibrate([25,30,25]);note(`${rating.grade} · ${tr('levelComplete')}`,C.three);finalizeRun();render()}
  function showMenu(){stopLoop();clearInputState();modalResume=false;if(Sound.setIntensity)Sound.setIntensity('normal');game.mode='menu';game.completed=false;if(appUi){appUi.hideResults();appUi.closeSettings({resume:false,consumeHistory:false})}syncModeUi();render()}
  function pauseGame(){if(game.mode!=='play')return;game.mode='pause';syncModeUi();stopLoop();render()}
  function resumeGame(){if(game.mode!=='pause')return;game.mode='play';syncModeUi();last=0;schedule()}
  function pause(){if(game.mode==='play')pauseGame();else if(game.mode==='pause')resumeGame()}
  function modalOpen(){const active=game.mode==='play'||game.mode==='pause';modalResume=active;if(game.mode==='play')pauseGame()}
  function modalClose(resume){const shouldResume=modalResume&&resume;modalResume=false;if(shouldResume&&game.mode==='pause')resumeGame()}
  function touchDevice(){return 'ontouchstart' in window||(navigator.maxTouchPoints||0)>0}
  async function toggleOrientation(){const target=isLandscape()?'portrait':'landscape';let locked=false;try{if(!platform.isFullscreen()&&!platform.isStandalone())await platform.enterFullscreen()}catch(e){}try{if(screen.orientation&&typeof screen.orientation.lock==='function'){if(typeof screen.orientation.unlock==='function')screen.orientation.unlock();await screen.orientation.lock(target);locked=true}}catch(e){}if(!locked)showOrientationHint(target);platform.scheduleViewport();scheduleResize()}
  function performJump(){const second=p.jumps===1;p.vy=second?PHYSICS.secondJumpVelocity:PHYSICS.firstJumpVelocity;p.jumps=second?2:1;p.ground=false;p.coyote=0;p.jumpBuffer=0;p.slide=0;p.slideState='idle';if(second&&!reducedMotion)p.rot=-.32;Sound.sfx(second?'doubleJump':'jump');if(appUi)appUi.tutorialSignal(second?'doubleJump':'jump');burst(p.x+20,p.y+p.h,second?C.two:C.one,second?13:8,second?.75:.55)}
  function tryBufferedJump(){if(game.mode!=='play'||p.jumpBuffer<=0)return;const canFirst=p.coyote>0,canSecond=!canFirst&&p.jumps===1;if(canFirst||canSecond)performJump()}
  function pressJump(){if(game.mode==='menu'||game.mode==='over'){reset();return}if(game.mode!=='play')return;if(isMountain()){mountainInput.jumpHeld=true;mountainInput.jumpPressed=true;return}p.jumpHeld=true;p.jumpBuffer=PHYSICS.jumpBuffer;tryBufferedJump()}
  function releaseJump(){if(isMountain()){mountainInput.jumpHeld=false;return}p.jumpHeld=false;if(p.vy<-220)p.vy*=.5}
  function slide(on=true){if(game.mode!=='play')return;if(isMountain()){mountainInput.down=on;return}if(on){if(p.ground&&p.slide<=0){p.slide=PHYSICS.slideDuration;p.slideState='start';Sound.sfx('slide');if(appUi)appUi.tutorialSignal('slide');burst(p.x+8,p.y+p.h,C.three,7,.38)}}else if(p.slide>0){p.slide=Math.min(p.slide,.12);p.slideState='end'}}
  function activateOverdrive(){if(!game.overReady||game.over>0)return false;game.overReady=false;game.overWindow=0;game.over=4.2;game.overBreaks=0;game.energy=0;root.dataset.overdrive='on';if(Sound.setIntensity)Sound.setIntensity('overload');note(tr('overdriveOn'),C.three);Sound.sfx('overdrive');shake=reducedMotion?0:scene==='volcano'?2:4;burst(p.x+p.w/2,p.y+p.h/2,C.three,22,.9);return true}
  function dash(){if(game.mode!=='play')return;if(isMountain()){mountainInput.dashPressed=true;return}if(activateOverdrive())return;if(p.dash>0||game.energy<PHYSICS.dashCost)return;game.energy-=PHYSICS.dashCost;p.dash=PHYSICS.dashDuration;shake=reducedMotion?0:scene==='volcano'?2:3.5;Sound.sfx('dash');vibrate(12);burst(p.x,p.y+p.h/2,C.three,18,.85)}
  function toggleSound(){soundEnabled=!soundEnabled;const patch={musicEnabled:soundEnabled,sfxEnabled:soundEnabled};Store.updateSettings(patch);Sound.setSettings(patch);syncQuickUi();if(soundEnabled)Sound.sfx('collect');if(appUi)appUi.renderSettings()}
  function previewSetting(key,value){if(key==='touchOpacity')root.style.setProperty('--touch-opacity',String(value));if(key==='shakeStrength')shakeStrength=value;if(['masterVolume','musicVolume','sfxVolume'].includes(key))Sound.setSettings({...Store.settings(),[key]:value})}
  function applySetting(key,value){if(key==='skin'&&!Store.unlockedSkins().includes(value))return;const patch={[key]:value};Store.updateSettings(patch);if(key==='skin')skin=value;if(key==='vibration')vibrationEnabled=!!value;if(key==='shakeStrength')shakeStrength=value;if(key==='performanceMode'){performanceMode=['auto','quality','performance'].includes(value)?value:'auto';visualQuality=performanceMode==='performance'?.62:1;backgroundRenderer.resize({width:W,height:H,dpr:DPR,theme:root.dataset.theme,quality:visualQuality});scheduleResize()}if(key==='showTutorial'&&value)Store.setTutorialComplete(false);if(key==='showTutorial'&&!value&&appUi&&appUi.tutorialActive)appUi.skipTutorial();if(key==='musicEnabled'||key==='sfxEnabled')soundEnabled=!!(Store.settings().musicEnabled||Store.settings().sfxEnabled);Sound.setSettings(Store.settings());syncModeUi();if(key==='theme'){refreshColors();seed();backgroundRenderer.resize({width:W,height:H,dpr:DPR,theme:root.dataset.theme,quality:visualQuality});backgroundRenderer.invalidate()}if(key==='theme')gradientCache.clear();render()}

  addEventListener('keydown',e=>{
    if(e.defaultPrevented)return;const k=e.key.toLowerCase();if((k==='p'||k==='escape')&&!e.repeat){if(appUi&&appUi.handleBack(k))return;pause();return}if([' ','arrowup','arrowdown','arrowright','arrowleft'].indexOf(k)>=0)e.preventDefault();
    if(isMountain()){if(k==='a'||k==='arrowleft'){mountainInput.autoRun=false;mountainInput.left=true}if(k==='d'||k==='arrowright'){mountainInput.autoRun=false;mountainInput.right=true}}
    if((k===' '||k==='arrowup'||k==='w')&&!e.repeat)pressJump();if((k==='arrowdown'||k==='s')&&!e.repeat)slide(true);
    if((k==='shift'||k==='k'||(!isMountain()&&k==='arrowright'))&&!e.repeat)dash();if(k==='m'&&!e.repeat)toggleSound();if(k==='enter'&&(game.mode==='menu'||game.mode==='over'))reset();
  });
  addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(isMountain()){if(k==='a'||k==='arrowleft')mountainInput.left=false;if(k==='d'||k==='arrowright')mountainInput.right=false}if(k===' '||k==='arrowup'||k==='w')releaseJump();if(k==='arrowdown'||k==='s')slide(false)});
  function actionStart(action){if(action==='jump')pressJump();else if(action==='slide')slide(true);else if(action==='left'||action==='right'){mountainInput.autoRun=false;mountainInput[action]=true}else dash()}
  function actionEnd(action){if(action==='jump')releaseJump();if(action==='slide')slide(false);if(action==='left'||action==='right')mountainInput[action]=false}
  if(globalThis.PointerEvent){
    canvas.addEventListener('pointerdown',event=>{event.preventDefault();pressJump()});canvas.addEventListener('pointerup',event=>{event.preventDefault();releaseJump()});canvas.addEventListener('pointercancel',()=>releaseJump());
    root.querySelectorAll('[data-act]').forEach(button=>{const action=button.dataset.act;button.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();button.classList.add('is-pressed');try{button.setPointerCapture(event.pointerId)}catch(error){}actionStart(action)});for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,event=>{event.preventDefault();event.stopPropagation();button.classList.remove('is-pressed');actionEnd(action)})});
  }else{
    const stopTouch=event=>{event.preventDefault();event.stopPropagation()};
    canvas.addEventListener('touchstart',event=>{event.preventDefault();pressJump()},{passive:false});canvas.addEventListener('touchend',event=>{event.preventDefault();releaseJump()},{passive:false});canvas.addEventListener('touchcancel',()=>releaseJump(),{passive:true});
    root.querySelectorAll('[data-act]').forEach(button=>{const action=button.dataset.act;button.addEventListener('touchstart',event=>{stopTouch(event);button.classList.add('is-pressed');actionStart(action)},{passive:false});button.addEventListener('touchend',event=>{stopTouch(event);button.classList.remove('is-pressed');actionEnd(action)},{passive:false});button.addEventListener('touchcancel',()=>{button.classList.remove('is-pressed');actionEnd(action)},{passive:true})});
  }
  pauseButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();pause()});
  soundButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleSound()});
  orientationButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleOrientation()});
  menuStart.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();platform.tryEnterFullscreenFromGesture();reset()});

  function coin(x,y){game.things.push({type:'coin',x,y,w:22,h:22,spin:Math.random()*6.2,dead:false})}
  function thing(type,x,w=50,h=50,extra={}){game.things.push(Object.assign({type,x,y:floor()-h,w,h,dead:false},extra))}
  function rewardArc(x,count=4,height=110){for(let i=0;i<count;i++)coin(x+i*44,floor()-height-Math.sin(i/Math.max(1,count-1)*Math.PI)*42)}
  function spawnHazard(item,x){const type=item.type,fy=floor(),common={phase:item.roll*6,baseY:0,detail:item.detail,warning:!!HAZARDS[type].warning};if(type==='crate'){thing(type,x,item.width,54);rewardArc(x-12,5,120)}else if(type==='spike'){thing(type,x,item.width,34);rewardArc(x,4,100)}else if(type==='drone'){thing(type,x,item.width,32,{y:fy-94-item.detail*30,phase:item.roll*6,baseY:fy-94-item.detail*30});rewardArc(x-42,5,202)}else if(type==='gate'||type==='shutter'){const gapY=fy-190,gapH=GATE_GAP_HEIGHT[game.diff];thing(type,x,item.width,fy-65,{gapY,gapH,phase:item.roll*6});for(let i=0;i<7;i++)coin(x-120+i*40,gapY+gapH/2-11)}else if(HAZARDS[type].gapLike){thing(type,x,item.width,90,{y:fy,warning:!!HAZARDS[type].warning,phase:item.roll*6});rewardArc(x+18,5,98)}else if(type==='spring'||type==='waterPlatform'){thing(type,x,item.width,type==='spring'?15:18);rewardArc(x+20,6,105)}else if(type==='billboard'){thing(type,x,item.width,58,{y:fy-58,phase:item.roll*6,baseY:fy-58});rewardArc(x,4,124)}else if(type==='bridgeBar'){thing(type,x,item.width,34,{y:fy-94,phase:item.roll*6,baseY:fy-94});rewardArc(x,4,178)}else if(type==='train'){thing(type,x,item.width,48,{y:fy-48,extraSpeed:115+item.detail*55});rewardArc(x,5,115)}else if(type==='laser'){thing(type,x,item.width,76,{y:fy-76,electronic:true});rewardArc(x,4,132)}else if(type==='robot'){thing(type,x,item.width,62,{y:fy-62,phase:item.roll*6,baseY:fy-62,electronic:true});rewardArc(x,4,128)}else if(type==='scanner'){thing(type,x,item.width,30,{y:fy-92,phase:item.roll*6,baseY:fy-92,electronic:true});rewardArc(x,4,176)}else if(type==='snowball'){thing(type,x,item.width,item.width,{y:fy-item.width,spin:0,extraSpeed:25+item.detail*25});rewardArc(x,4,118)}else if(type==='icicle'){thing(type,x,item.width,44,{y:fy-106,baseY:fy-106});rewardArc(x,4,184)}else if(type==='rock'){thing(type,x,item.width,item.width,{y:fy-182-item.detail*45,vy:0,landed:false,warning:true});rewardArc(x,4,125)}else if(type==='flame'){thing(type,x,item.width,72,{y:fy-72,warning:true,phase:item.roll*6});rewardArc(x,4,138)}else if(type==='log'){thing(type,x,item.width,36,{y:fy-36,spin:0});rewardArc(x,5,112)}else if(type==='waterfall'){thing(type,x,item.width,40,{y:fy-100,phase:item.roll*6,baseY:fy-100});rewardArc(x,4,180)}else{thing(type,x,item.width,50,common);rewardArc(x,4,120)}}
  function spawnTutorial(){const stage=game.tutorialStage++,x=W+90,item=(type,width=HAZARDS[type].width,offset=0)=>spawnHazard({type,width,offset,roll:.35,detail:.35},x+offset);game.generatorPhase='tutorial';game.generatorCount=game.tutorialStage;if(stage===0)item('crate');else if(stage===1)item('drone');else if(stage===2)item('gap',108);else if(stage===3)item('crate');else if(stage===4){game.energy=86;for(let i=0;i<6;i++)coin(x+i*45,floor()-115-Math.sin(i*.6)*28)}else if(stage===5){game.energy=100;item('laser',30,0);item('robot',52,250);item('scanner',86,520);note(tr('tutorialOverload'),C.three)}else{game.tutorialRun=false;game.spawn=1.5;return}game.spawn=stage===5?5:3.8}
  function spawn(){if(game.tutorialRun){spawnTutorial();return}let rightEdge=-Infinity;for(const o of game.things)if(!o.dead&&isHazard(o.type))rightEdge=Math.max(rightEdge,o.x+o.w);const x=W+80,planningSpeed=game.speed*scenePace()*1.25,plan=game.pendingPlan||director.next({elapsed:game.time,distance:game.distance,speed:planningSpeed});game.pendingPlan=plan;if(x-rightEdge<plan.entryGap){game.spawn=.06;return}for(const item of plan.items)spawnHazard(item,x+item.offset);const lastItem=plan.items[plan.items.length-1],lastRight=x+lastItem.offset+lastItem.width;game.lastHazard=lastItem.type;game.generatorPhase=plan.phase;game.generatorCount=plan.spawnCount;if(plan.highlight){note(tr(`signature_${scene}`),C.two);tone(420,.08,'triangle',.025)}if(plan.powerRoll<.16){const bucket=Math.floor(plan.powerRoll/.054),type=bucket===0?'shield':bucket===1?'magnet':'slow';thing(type,lastRight+90,34,34,{y:floor()-145})}game.pendingPlan=null;game.spawn=plan.cooldown}
  function inGap(px){return game.things.some(o=>isHazard(o.type)&&HAZARDS[o.type].gapLike&&!o.dead&&px>o.x&&px<o.x+o.w)}
  function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function pbox(){const h=p.slide&&p.ground?36:p.h;return{x:p.x+8,y:p.y+p.h-h+7,w:p.w-16,h:h-12}}
  function obstacleBox(o){if(o.type==='spike'||o.type==='icicle')return{x:o.x+8,y:o.y+10,w:o.w-16,h:o.h-10};if(o.type==='drone'||o.type==='scanner'||o.type==='waterfall'||o.type==='bridgeBar')return{x:o.x+5,y:o.y+4,w:o.w-10,h:o.h-8};if(o.type==='snowball'||o.type==='rock')return{x:o.x+7,y:o.y+7,w:o.w-14,h:o.h-14};if(o.type==='flame')return{x:o.x+10,y:o.y+8,w:o.w-20,h:o.h-8};if(o.type==='crate'||o.type==='train'||o.type==='log')return{x:o.x+4,y:o.y+3,w:o.w-8,h:o.h-4};return{x:o.x+2,y:o.y+2,w:Math.max(1,o.w-4),h:Math.max(1,o.h-3)}}
  function collect(o){const cfg=DIFF[game.diff];o.dead=true;if(o.type==='coin'){game.score+=25*game.combo*cfg.scoreMult;game.energy=Math.min(100,game.energy+3.5);game.combo=Math.min(12,game.combo+1);game.comboT=2;runStats.collects++;runStats.maxCombo=Math.max(runStats.maxCombo,Math.floor(game.combo));Sound.sfx('collect');if(appUi)appUi.tutorialSignal('collect');burst(o.x+11,o.y+11,C.three,6,.45)}else{p[o.type]=8;note(tr(o.type==='shield'?'shieldOn':o.type==='magnet'?'magnetOn':'slowOn'),o.type==='shield'?C.one:o.type==='magnet'?C.two:C.four);Sound.sfx(o.type==='shield'?'shield':'powerup');burst(o.x,o.y,C.fg,22,.8)}}
  function hit(o){
    const cfg=DIFF[game.diff],profile=HAZARDS[o.type]||{};
    if((p.dash>0||game.over>0)&&profile.dashBreakable){
      o.dead=true;game.score+=120*game.combo*cfg.scoreMult;game.energy=Math.min(100,game.energy+8);runStats.breaks++;if(appUi)appUi.tutorialSignal('dashBreak');
      shake=reducedMotion?0:scene==='volcano'?2:5;burst(o.x+o.w/2,o.y+o.h/2,profile.electronic?C.three:C.two,22,.95);Sound.sfx('break');
      if(game.over>0){game.overBreaks++;tone(260+Math.min(7,game.overBreaks)*48,.055,'triangle',.025+.002*game.overBreaks)}
      if(profile.electronic)note(tr('systemOffline'),C.three);
      return;
    }
    if(game.tutorialRun){o.dead=true;p.hurt=.22;game.combo=1;note(tr('tutorialTryAgain'),C.two);Sound.sfx('fail');vibrate(8);return}
    if(p.shield>0){p.shield=0;p.hurt=.24;o.dead=true;shake=reducedMotion?0:scene==='volcano'?3:7;flash=reducedMotion?0:scene==='volcano'?.12:.2;note(tr('shieldBlock'),C.one);burst(p.x,p.y,C.one,24,.9);Sound.sfx('shield');return}
    finish();
  }

  function updateThingMotion(o,world,dt){
    o.x-=world*dt;
    if(o.type==='train'||o.type==='snowball')o.x-=(o.extraSpeed||0)*dt;
    if(o.type==='drone'||o.type==='billboard'||o.type==='bridgeBar'||o.type==='robot'||o.type==='scanner'||o.type==='waterfall')o.y=o.baseY+Math.sin(game.time*(o.type==='robot'?4:3.2)+o.phase)*(o.type==='robot'?7:4);
    if(o.type==='shutter')o.gapY=floor()-190+Math.sin(game.time*2.2+o.phase)*8;
    if(o.type==='snowball'||o.type==='log')o.spin=(o.spin||0)+dt*(o.type==='snowball'?7:3);
    if(o.type==='rock'&&!o.landed&&o.x<W*.88){o.vy=Math.min(760,(o.vy||0)+980*dt);o.y+=o.vy*dt;if(o.y+o.h>=floor()){o.y=floor()-o.h;o.vy=0;o.landed=true}}
  }

  function updateMountain(dt){
    const map=challengeMap();if(!map)return;mountainState=mountainState||map.createState(W,H);const events=map.update(mountainState,mountainInput,dt,W,H),mp=mountainState.player;
    game.distance=mp.x/10;game.score=mountainState.score;game.energy=Math.max(0,100*(1-mp.dashCooldown/map.PLAYER.dashCooldown));
    for(const event of events){
      if(event.type==='jump')Sound.sfx('jump');
      else if(event.type==='dash')Sound.sfx('dash');
      else if(event.type==='bounce')tone(520,.16,'triangle',.045);
      else if(event.type==='portal')tone(760,.2,'sine',.04);
      else if(event.type==='collect'){runStats.collects++;Sound.sfx('collect');note(tr('gateOpen'),C.three)}
      else if(event.type==='switch'){tone(640,.18,'square',.04);note(tr('gateOpen'),C.two)}
      else if(event.type==='checkpoint'){Sound.sfx('checkpoint');note(tr('checkpointOn'),C.one)}
      else if(event.type==='secret'){tone(840,.22,'triangle',.045);note(tr('secretFound'),C.three)}
      else if(event.type==='tideFreeze'){tone(610,.2,'triangle',.04);note(tr('tideFreeze'),C.three)}
      else if(event.type==='grateBreak'){runStats.breaks++;Sound.sfx('break');note(tr('grateBroken'),C.two)}
      else if(event.type==='phaseShift'){tone(690,.18,'square',.04);note(tr('phaseShift'),C.four)}
      else if(event.type==='sandSink'){tone(190,.11,'triangle',.025);note(tr('sandSink'),C.two)}
      else if(event.type==='leverBreak'){runStats.breaks++;Sound.sfx('break');note(tr('leverBroken'),C.two)}
      else if(event.type==='respawn'){tone(110,.16,'sawtooth',.04);note(tr('checkpointRespawn'),C.two)}
      else if(event.type==='finish')completeMountain();
    }
  }

  function update(dt){
    game.time+=dt;flash=Math.max(0,flash-dt*3.5);shake=Math.max(0,shake-dt*28);game.perfect=Math.max(0,game.perfect-dt);p.land=Math.max(0,p.land-dt);if(game.mode==='play')p.hurt=Math.max(0,p.hurt-dt);
    let write=0;
    for(const q of game.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=420*dt;q.t-=dt;q.r*=.992;if(q.t>0)game.particles[write++]=q}
    game.particles.length=write;write=0;
    for(const n of game.notes){n.t-=dt;n.y-=27*dt;if(n.t>0)game.notes[write++]=n}
    game.notes.length=write;if(game.mode!=='play')return;if(isMountain()){updateMountain(dt);return}

    const cfg=DIFF[game.diff],slow=p.slow>0?.72:1,targetBoost=game.over>0?1.25:1;
    game.flow+=(targetBoost-game.flow)*Math.min(1,dt*(targetBoost>game.flow?7:2.2));
    const boost=game.flow,world=game.speed*scenePace()*slow*boost;
    game.distance+=world*dt/10;game.score+=world*dt*.08*game.combo*cfg.scoreMult;game.speed=Math.min(cfg.maxSpeed,cfg.startSpeed+game.distance*cfg.accel);game.energy=Math.min(100,game.energy+dt*(game.over>0?0:cfg.energyRegen));const checkpoint=Math.floor(game.distance/500)*500;if(checkpoint>game.checkpointDistance){game.checkpointDistance=checkpoint;note(tr('checkpointOn'),C.one)}
    if(game.energy>=100&&game.over<=0&&!game.overReady){game.overReady=true;game.overWindow=2.4;root.dataset.overdrive='ready';note(tr('novaReady'),C.three);Sound.sfx('powerup');vibrate(10)}
    if(game.overReady){game.overWindow=Math.max(0,game.overWindow-dt);if(game.overWindow<=0)activateOverdrive()}
    const wasOver=game.over>0;game.over=Math.max(0,game.over-dt);if(wasOver&&game.over<=0){root.dataset.overdrive='off';if(Sound.setIntensity)Sound.setIntensity('normal');if(game.overBreaks>0){note(`${tr('novaFlow')} ×${game.overBreaks}`,C.three);tone(260+Math.min(6,game.overBreaks)*55,.13,'triangle',.04);burst(p.x+p.w/2,p.y+p.h/2,C.three,16,.65)}}p.dash=Math.max(0,p.dash-dt);p.slide=Math.max(0,p.slide-dt);p.slideState=p.slide<=0?'idle':p.slide>.38?'start':p.slide>.12?'active':'end';p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);p.shield=Math.max(0,p.shield-dt);p.magnet=Math.max(0,p.magnet-dt);p.slow=Math.max(0,p.slow-dt);game.flowPerfect=Math.max(0,game.flowPerfect-dt);game.comboT-=dt;if(game.comboT<=0)game.combo=Math.max(1,game.combo-dt*4);game.spawn-=dt*boost;if(game.spawn<=0)spawn();

    const wasGround=p.ground,landingSpeed=p.vy;
    p.coyote=Math.max(0,p.coyote-dt);const gravity=p.jumpHeld&&p.vy<0?PHYSICS.heldGravity:PHYSICS.releasedGravity;p.vy=Math.min(PHYSICS.maxFallSpeed,p.vy+gravity*dt);p.y+=p.vy*dt;
    const gap=inGap(p.x+p.w*.5);
    if(!gap&&p.y+p.h>=floor()&&p.vy>=0){
      p.y=floor()-p.h;p.vy=0;p.ground=true;p.coyote=PHYSICS.coyoteTime;p.jumps=0;p.rot*=.64;
      if(!wasGround&&landingSpeed>280){p.land=.11;if(scene==='snow')p.iceDrift=Math.min(18,Math.max(p.iceDrift,landingSpeed*.014));burst(p.x+p.w/2,floor(),C.one,6,.35);tone(120,.045,'sine',.018)}
    }else{if(wasGround)p.coyote=PHYSICS.coyoteTime;p.ground=false;if(p.coyote<=0&&p.jumps===0)p.jumps=1;p.rot+=dt*(p.dash?18:7)}
    const home=runnerX();
    if(scene==='snow'){if(p.ground&&p.dash>0)p.iceDrift=Math.min(18,p.iceDrift+36*dt);p.iceDrift*=Math.max(0,1-dt*1.7);p.x+=(home+p.iceDrift-p.x)*Math.min(1,dt*9)}else{p.iceDrift=0;p.x+=(home-p.x)*Math.min(1,dt*12)}
    tryBufferedJump();if(p.y+p.h>=floor()+40)respawnRunnerFromDeathZone();const pb=pbox();

    for(const o of game.things){
      updateThingMotion(o,world,dt);
      if(o.type==='coin'){o.spin+=dt*8;if(p.magnet>0){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy);if(d<260){o.x+=dx*dt*7;o.y+=dy*dt*7}}}
      const profile=HAZARDS[o.type];
      if(!o.dead&&!o.passed&&profile&&!profile.assist&&!profile.gapLike&&o.x+o.w<p.x){o.passed=true;const bonus=Math.round(60*cfg.scoreMult);game.score+=bonus*game.combo;game.energy=Math.min(100,game.energy+5);game.combo=Math.min(12,game.combo+1);game.comboT=2;game.perfect=.36;runStats.perfect++;runStats.maxCombo=Math.max(runStats.maxCombo,Math.floor(game.combo));if(runStats.perfect%3===0){game.flowPerfect=1.2;note('FLOW PERFECT',C.three);tone(720,.11,'triangle',.035)}else note(tr('perfect',{score:bonus}),C.three);burst(p.x+p.w,p.y+p.h/2,C.three,10,.5);Sound.sfx('perfect')}
      if(o.dead)continue;
      if(['coin','shield','magnet','slow'].indexOf(o.type)>=0){if(overlap(pb,o))collect(o);continue}
      if(profile&&profile.assist&&overlap(pb,{x:o.x,y:o.y-7,w:o.w,h:25})&&p.vy>=0){o.dead=true;p.vy=o.type==='waterPlatform'?-760:-900;p.jumps=1;game.score+=80*cfg.scoreMult;burst(o.x+o.w/2,o.y,C.three,18,.8);tone(o.type==='waterPlatform'?420:330,.18,'square');continue}
      if(profile&&profile.gapLike)continue;
      if(profile&&profile.gateLike){const top={x:o.x+2,y:0,w:o.w-4,h:Math.max(0,o.gapY-3)},bottom={x:o.x+2,y:o.gapY+o.gapH+3,w:o.w-4,h:Math.max(0,floor()-o.gapY-o.gapH-3)};if(overlap(pb,top)||overlap(pb,bottom))hit(o);continue}
      if(profile&&overlap(pb,obstacleBox(o)))hit(o);
    }
    write=0;for(const o of game.things)if(!o.dead&&o.x+o.w>-170)game.things[write++]=o;game.things.length=write;
    if(!reducedMotion&&(p.dash>0||game.over>0)&&game.particles.length<180)for(let i=0;i<(visualQuality<1?1:2);i++)game.particles.push({x:p.x+5,y:p.y+18+Math.random()*42,vx:-220-Math.random()*230,vy:(Math.random()-.5)*90,r:2+Math.random()*5,t:.18+Math.random()*.18,color:C.three});
  }

  function fillPath(points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function sky(mid=C.four,bottom=C.bg){ctx.fillStyle=linearGradient(`sky|${W}|${H}|${C.bg}|${mid}|${bottom}`,0,0,0,H,[[0,C.bg],[.54,rgba(mid,.25)],[1,bottom]]);ctx.fillRect(0,0,W,H)}
  function starField(color=C.one,drift=PARALLAX.stars){ctx.save();for(const s of game.stars){const px=((s.x-game.distance*(drift+s.r*.015))%(W+20)+W+20)%(W+20);ctx.globalAlpha=s.a;ctx.fillStyle=color;ctx.fillRect(px,s.y,s.r,s.r)}ctx.restore()}
  function cityBlocks(accent=C.one,secondary=C.two,density=1){const shift=((game.distance*(PARALLAX.mid+density*.08))%W+W)%W,fy=floor()+3,scale=sceneScale(),nearFacade=linearGradient(`cityN|${W}|${H}|${C.card}|${C.bg}`,0,fy-280,0,fy,[[0,rgba(C.card,.94)],[.58,rgba(C.card,.9)],[1,rgba(C.bg,.96)]]),farFacade=linearGradient(`cityF|${W}|${H}|${C.border}|${C.bg}`,0,fy-230,0,fy,[[0,rgba(C.border,.84)],[1,rgba(C.bg,.94)]]);ctx.save();for(const b of game.towers){const px=b.x-shift,h=b.h*(.72+density*.22)*scale,glow=b.z>.5?secondary:accent;ctx.globalAlpha=1;ctx.fillStyle=b.z>.5?nearFacade:farFacade;ctx.fillRect(px,fy-h,b.w,h);ctx.strokeStyle=rgba(glow,.28);ctx.lineWidth=1;ctx.strokeRect(px+.5,fy-h+.5,b.w-1,h-1);ctx.fillStyle=rgba(glow,.35);ctx.fillRect(px+2,fy-h+2,Math.max(8,b.w-4),2);if(h>118){ctx.strokeStyle=rgba(glow,.45);ctx.beginPath();ctx.moveTo(px+b.w*.5,fy-h);ctx.lineTo(px+b.w*.5,fy-h-10*scale);ctx.stroke()}for(let yy=fy-h+13;yy<fy-9;yy+=22)for(let xx=px+8;xx<px+b.w-5;xx+=17){const lit=(Math.floor((xx-px)/17)+Math.floor((yy-fy+h)/22))%3!==0;ctx.globalAlpha=lit?.2+b.z*.18:.06;ctx.fillStyle=lit?glow:C.muted;ctx.fillRect(xx,yy,3,5)}ctx.globalAlpha=1;ctx.strokeStyle=rgba(C.fg,.09);for(let y=fy-h+34;y<fy-12;y+=44){ctx.beginPath();ctx.moveTo(px+3,y);ctx.lineTo(px+b.w-3,y);ctx.stroke()}}ctx.restore()}
  function river(accent=C.two){const fy=floor(),g=ctx.createLinearGradient(0,fy-115,0,fy);g.addColorStop(0,rgba(C.bg,.45));g.addColorStop(1,rgba(accent,.22));ctx.fillStyle=g;ctx.fillRect(0,fy-115,W,115);ctx.save();ctx.strokeStyle=rgba(accent,.28);for(let y=fy-95;y<fy;y+=18){ctx.beginPath();for(let x=0;x<=W;x+=30)ctx.lineTo(x,y+Math.sin(x*.035+game.time)*3);ctx.stroke()}ctx.restore()}
  function guangzhou(){sky(C.four);starField(C.one);cityBlocks(C.one,C.two,.86);const fy=floor(),x=W*.69;river(C.two);ctx.save();fitSceneHeight(fy);ctx.shadowBlur=18;ctx.shadowColor=C.one;ctx.strokeStyle=C.one;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,fy-338);ctx.lineTo(x,fy-288);ctx.stroke();ctx.beginPath();ctx.moveTo(x-24,fy-286);ctx.bezierCurveTo(x-7,fy-230,x-8,fy-112,x-20,fy-16);ctx.lineTo(x+20,fy-16);ctx.bezierCurveTo(x+8,fy-112,x+7,fy-230,x+24,fy-286);ctx.closePath();ctx.fillStyle=rgba(C.card,.78);ctx.fill();ctx.stroke();for(let y=fy-270;y<fy-30;y+=25){const waist=8+Math.abs(y-(fy-145))*.075;ctx.globalAlpha=.48;ctx.beginPath();ctx.moveTo(x-waist,y);ctx.lineTo(x+waist,y+16);ctx.moveTo(x+waist,y);ctx.lineTo(x-waist,y+16);ctx.stroke()}ctx.globalAlpha=1;ctx.fillStyle=C.two;ctx.beginPath();ctx.ellipse(x,fy-289,29,9,0,0,7);ctx.fill();ctx.fillStyle=rgba(C.one,.35);ctx.fillRect(W*.18,fy-225,54,225);ctx.fillRect(W*.27,fy-184,66,184);ctx.strokeStyle=rgba(C.one,.45);ctx.beginPath();ctx.moveTo(0,fy-54);ctx.quadraticCurveTo(W*.5,fy-98,W,fy-54);ctx.stroke();ctx.restore()}
  function shanghai(){sky(C.one);starField(C.three);cityBlocks(C.two,C.one,.96);const fy=floor();river(C.one);ctx.save();fitSceneHeight(fy);const ox=W*.3;ctx.strokeStyle=C.two;ctx.fillStyle=rgba(C.card,.88);ctx.shadowBlur=18;ctx.shadowColor=C.two;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ox,fy-320);ctx.lineTo(ox,fy-36);ctx.stroke();for(const [y,r] of [[fy-228,28],[fy-143,18],[fy-92,10]]){ctx.fillStyle=rgba(C.two,.4);ctx.beginPath();ctx.arc(ox,y,r,0,7);ctx.fill();ctx.stroke()}ctx.fillStyle=rgba(C.card,.9);ctx.fillRect(ox-11,fy-198,22,178);const sx=W*.67;ctx.beginPath();ctx.moveTo(sx-38,fy);ctx.bezierCurveTo(sx-42,fy-108,sx-31,fy-250,sx+16,fy-302);ctx.quadraticCurveTo(sx+42,fy-285,sx+31,fy);ctx.closePath();ctx.fillStyle=rgba(C.card,.9);ctx.fill();ctx.strokeStyle=C.one;ctx.stroke();for(let y=fy-260;y<fy-20;y+=28){ctx.globalAlpha=.42;ctx.fillStyle=C.one;ctx.fillRect(sx-25,y,48,3)}ctx.globalAlpha=1;ctx.restore()}
  function shenzhen(){sky(C.three);starField(C.one);cityBlocks(C.one,C.three,1.15);const fy=floor();river(C.three);ctx.save();fitSceneHeight(fy);const x=W*.58;ctx.shadowBlur=20;ctx.shadowColor=C.one;ctx.fillStyle=rgba(C.card,.92);ctx.strokeStyle=C.one;ctx.lineWidth=3;fillPath([[x-31,fy],[x-25,fy-270],[x-9,fy-310],[x,fy-360],[x+9,fy-310],[x+25,fy-270],[x+31,fy]],rgba(C.card,.92),C.one);for(let y=fy-270;y<fy-18;y+=20){ctx.globalAlpha=.34;ctx.fillStyle=C.three;ctx.fillRect(x-21,y,42,4)}ctx.globalAlpha=1;const k=W*.25;fillPath([[k-38,fy],[k-28,fy-194],[k+19,fy-226],[k+35,fy]],rgba(C.card,.82),C.three);ctx.strokeStyle=rgba(C.three,.5);for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(0,fy-34-i*13);ctx.lineTo(W,fy-62-i*5);ctx.stroke()}ctx.restore()}
  function snowMountain(){sky(C.three,rgba(C.card,.75));starField(C.fg);const fy=floor()+3;ctx.save();ctx.fillStyle=rgba(C.fg,.72);ctx.beginPath();ctx.arc(W*.78,H*.19,32,0,7);ctx.fill();fillPath([[0,fy-90],[W*.18,fy-260],[W*.32,fy-126],[W*.49,fy-330],[W*.67,fy-145],[W*.84,fy-275],[W,fy-90],[W,fy],[0,fy]],rgba(C.border,.78),rgba(C.three,.45));fillPath([[W*.11,fy-194],[W*.18,fy-260],[W*.25,fy-193],[W*.19,fy-218]],rgba(C.fg,.68));fillPath([[W*.4,fy-242],[W*.49,fy-330],[W*.58,fy-235],[W*.5,fy-270]],rgba(C.fg,.78));fillPath([[W*.76,fy-215],[W*.84,fy-275],[W*.91,fy-209],[W*.84,fy-236]],rgba(C.fg,.68));fillPath([[0,fy-38],[W*.16,fy-130],[W*.31,fy-48],[W*.51,fy-155],[W*.69,fy-54],[W*.86,fy-145],[W,fy-38],[W,fy],[0,fy]],rgba(C.card,.92));for(const s of game.stars){const x=(s.x-game.distance*PARALLAX.stars+W)%W,y=(s.y*.72+game.time*(18+s.r*9))%(fy-8);ctx.globalAlpha=.3+s.a*.55;ctx.fillStyle=C.fg;ctx.beginPath();ctx.arc(x,y,1+s.r*.7,0,7);ctx.fill()}ctx.restore()}
  function volcano(){sky(C.two,rgba(C.two,.18));const fy=floor()+3;ctx.save();const glow=ctx.createRadialGradient(W*.58,fy-178,10,W*.58,fy-178,W*.52);glow.addColorStop(0,rgba(C.two,.5));glow.addColorStop(1,rgba(C.bg,0));ctx.fillStyle=glow;ctx.fillRect(0,0,W,fy);for(const s of game.stars){const x=(s.x-game.distance*PARALLAX.stars+W)%W,y=(fy-(s.y+game.time*(30+s.r*13))%(fy*.7));ctx.globalAlpha=.25+s.a*.7;ctx.fillStyle=s.r>1?C.two:C.three;ctx.beginPath();ctx.arc(x,y,1+s.r,0,7);ctx.fill()}ctx.globalAlpha=1;fillPath([[0,fy],[W*.16,fy-78],[W*.36,fy-130],[W*.49,fy-238],[W*.57,fy-252],[W*.64,fy-220],[W*.8,fy-90],[W,fy],[W,fy]],rgba(C.card,.96),rgba(C.two,.45));ctx.fillStyle=rgba(C.bg,.9);ctx.beginPath();ctx.ellipse(W*.565,fy-239,54,15,0,0,7);ctx.fill();ctx.strokeStyle=C.two;ctx.lineWidth=6;ctx.shadowBlur=18;ctx.shadowColor=C.two;ctx.beginPath();ctx.moveTo(W*.55,fy-228);ctx.bezierCurveTo(W*.5,fy-164,W*.61,fy-116,W*.55,fy-8);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W*.59,fy-224);ctx.bezierCurveTo(W*.66,fy-160,W*.7,fy-74,W*.74,fy-4);ctx.stroke();for(let i=0;i<5;i++){ctx.globalAlpha=.13;ctx.fillStyle=C.fg;ctx.beginPath();ctx.ellipse(W*.56+Math.sin(i)*22,fy-290-i*34,42+i*9,19+i*4,0,0,7);ctx.fill()}ctx.restore()}
  function jiuzhaigou(){sky(C.one,rgba(C.three,.18));const fy=floor()+3,lake=fy-150;ctx.save();fillPath([[0,lake+42],[W*.16,lake-118],[W*.31,lake-25],[W*.48,lake-156],[W*.63,lake-37],[W*.82,lake-134],[W,lake+42],[W,fy],[0,fy]],rgba(C.border,.72),rgba(C.one,.35));fillPath([[0,lake+78],[W*.2,lake-30],[W*.37,lake+38],[W*.57,lake-72],[W*.75,lake+25],[W*.91,lake-48],[W,lake+78],[W,fy],[0,fy]],rgba(C.card,.9));const water=ctx.createLinearGradient(0,lake,0,fy);water.addColorStop(0,rgba(C.three,.38));water.addColorStop(1,rgba(C.one,.12));ctx.fillStyle=water;ctx.fillRect(0,lake,W,fy-lake);for(let i=0;i<22;i++){const x=((i*57-game.distance*PARALLAX.near)%(W+80)+W+80)%(W+80)-40,h=24+(i%5)*9;ctx.fillStyle=i%3===0?rgba(C.two,.65):i%3===1?rgba(C.four,.58):rgba(C.one,.62);fillPath([[x,lake+12],[x+8,lake-h],[x+16,lake+12]],ctx.fillStyle);ctx.fillStyle=rgba(C.card,.8);ctx.fillRect(x+7,lake+9,2,10)}ctx.fillStyle=rgba(C.fg,.72);ctx.shadowBlur=14;ctx.shadowColor=C.fg;ctx.fillRect(W*.67,lake-76,8,82);ctx.fillStyle=rgba(C.three,.55);ctx.beginPath();ctx.ellipse(W*.674,lake+9,35,8,0,0,7);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=rgba(C.fg,.24);for(let y=lake+20;y<fy;y+=18){ctx.beginPath();ctx.ellipse(W*.5,y,W*(.12+(y-lake)/900),4,0,0,7);ctx.stroke()}ctx.restore()}
  function track(accent=C.one,edge=C.two){const fy=floor(),shoulder=20,road=ctx.createLinearGradient(0,fy,0,H);road.addColorStop(0,rgba(C.card,.98));road.addColorStop(1,C.bg);ctx.fillStyle=road;ctx.fillRect(0,fy,W,H-fy);const curb=ctx.createLinearGradient(0,fy-shoulder,0,fy+2);curb.addColorStop(0,rgba(edge,.28));curb.addColorStop(.3,rgba(C.card,.98));curb.addColorStop(1,rgba(C.border,.95));ctx.fillStyle=curb;ctx.fillRect(0,fy-shoulder,W,shoulder+3);ctx.strokeStyle=rgba(edge,.78);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,fy-shoulder);ctx.lineTo(W,fy-shoulder);ctx.moveTo(0,fy);ctx.lineTo(W,fy);ctx.stroke();const belt=((game.distance*PARALLAX.track)%(W+80)+W+80)%(W+80);ctx.fillStyle=rgba(accent,.48);for(let x=-belt-40;x<W+80;x+=82)ctx.fillRect(x,fy-13,42,3);ctx.strokeStyle=rgba(accent,.14);ctx.lineWidth=1;for(let i=-10;i<22;i++){const px=((i*90-game.distance*PARALLAX.track)%1440+1440)%1440-120;ctx.beginPath();ctx.moveTo(W/2,fy);ctx.lineTo(px,H);ctx.stroke()}for(let y=fy+34;y<H;y+=34){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
  function sceneAtmosphere(){
    const fy=floor();ctx.save();ctx.lineWidth=1;
    if(scene==='guangzhou'){
      ctx.strokeStyle=rgba(C.one,.18);for(let i=0;i<3;i++){ctx.beginPath();for(let x=0;x<=W;x+=32)ctx.lineTo(x,fy-76+i*16+Math.sin(x*.028+game.time*1.4+i)*3);ctx.stroke()}
    }else if(scene==='shanghai'){
      ctx.strokeStyle=rgba(C.two,.24);for(let i=0;i<3;i++){const y=fy-80-i*18;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y-8);ctx.stroke()}ctx.fillStyle=rgba(C.one,.18);for(let x=((game.time*180)%120)-120;x<W;x+=120)ctx.fillRect(x,fy-90,64,2);
    }else if(scene==='shenzhen'){
      ctx.strokeStyle=rgba(C.three,.15);for(let x=20;x<W;x+=86){ctx.beginPath();ctx.moveTo(x,40);ctx.lineTo(x+Math.sin(game.time+x)*16,fy);ctx.stroke()}const scan=(game.time*70)%Math.max(1,fy);ctx.fillStyle=rgba(C.one,.1);ctx.fillRect(0,scan,W,3);
    }else if(scene==='snow'){
      ctx.strokeStyle=rgba(C.one,.22);for(let i=0;i<6;i++){const x=((i*173-game.distance*4)%(W+120)+W+120)%(W+120)-60;ctx.beginPath();ctx.moveTo(x,fy+14+i%2*13);ctx.lineTo(x+70,fy+10+i%2*13);ctx.stroke()}
    }else if(scene==='volcano'){
      ctx.strokeStyle=rgba(C.two,.1);for(let i=0;i<4;i++){ctx.beginPath();for(let x=0;x<=W;x+=36)ctx.lineTo(x,fy-48-i*52+Math.sin(x*.022+game.time*1.8+i)*7);ctx.stroke()}ctx.fillStyle=rgba(C.three,.42);for(let i=0;i<10;i++){const x=((i*97-game.distance*1.6)%(W+40)+W+40)%(W+40),y=fy-28-((game.time*(18+i%4*5)+i*43)%(fy*.55));ctx.fillRect(x,y,1.5,3)}
    }else if(scene==='jiuzhaigou'){
      ctx.strokeStyle=rgba(C.fg,.12);for(let i=0;i<7;i++){const y=fy-142+i*17;ctx.beginPath();for(let x=0;x<=W;x+=42)ctx.lineTo(x,y+Math.sin(x*.026+game.time*.8+i)*2);ctx.stroke()}ctx.globalAlpha=.08;ctx.fillStyle=C.fg;for(let i=0;i<Math.min(5,game.towers.length);i++){const b=game.towers[i],x=(b.x-game.distance*.45+W)%W;ctx.fillRect(x,fy-132,b.w*.7,Math.min(82,b.h*.28))}
    }
    ctx.restore();
  }
  function background(){backgroundRenderer.setScene(scene,activeSeed);backgroundRenderer.render({distance:game.distance,time:game.time,floor:floor(),palette:C,reducedMotion,performanceMode,visualQuality});const accents={guangzhou:[C.one,C.two],shanghai:[C.two,C.one],shenzhen:[C.three,C.one],snow:[C.fg,C.three],volcano:[C.two,C.three],jiuzhaigou:[C.three,C.one]};track(...accents[scene])}

  function drawSpeedLines(){
    if(reducedMotion||game.mode!=='play')return;const cfg=DIFF[game.diff],speedRatio=Math.max(0,Math.min(1,(game.speed-cfg.startSpeed)/Math.max(1,cfg.maxSpeed-cfg.startSpeed))),strength=Math.max(speedRatio*.12,game.over>0?.18:0,p.dash>0?.14:0);if(strength<.035)return;
    ctx.save();ctx.strokeStyle=rgba(game.over>0?C.three:C.one,strength);ctx.lineWidth=1.5;for(let i=0;i<10;i++){const y=52+((i*73+game.distance*3.1)%(Math.max(90,floor()-90))),length=28+(i%4)*21,x=((i*137-game.time*(210+game.speed*.25))%(W+180)+W+180)%(W+180)-90;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y);ctx.stroke()}ctx.restore()
  }

  function drawEffects(){
    ctx.save();for(const q of game.particles){ctx.globalAlpha=Math.min(.82,q.t*2);ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(1,q.r),0,7);ctx.fill()}ctx.restore();
  }

  function drawStateAtmosphere(){if(game.mode==='play')StateEffects.draw(ctx,{player:p,game,width:W,height:H,palette:C,reducedMotion,performanceMode,visualQuality})}

  function drawWarning(o){if(!o.warning||o.x<80||o.x>W+190)return;const pulse=.66+.22*Math.sin(game.time*7),wx=Math.min(W-28,o.x+o.w/2);ctx.save();ctx.globalAlpha=pulse;ctx.fillStyle=C.two;ctx.strokeStyle=C.fg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx,floor()-112);ctx.lineTo(wx-13,floor()-88);ctx.lineTo(wx+13,floor()-88);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=C.bg;ctx.font='700 15px system-ui';ctx.textAlign='center';ctx.fillText('!',wx,floor()-92);ctx.strokeStyle=rgba(C.two,.7);ctx.beginPath();ctx.ellipse(wx,floor()-5,Math.max(24,o.w*.55),7,0,0,7);ctx.stroke();ctx.restore()}
  function drawActionCue(o){
    if(game.diff!=='easy')return;const profile=HAZARDS[o.type];if(!profile||profile.assist||o.x<55||o.x>W-20)return;let icon='↑',color=C.two,key='jumpCue';if(profile.action==='slide'){icon='↓';color=C.one;key='slideCue'}else if(profile.action==='jumpOrDash'){icon='↑⚡';color=C.three;key='dashCue'}else if(profile.action==='slideOrDash'){icon='↓⚡';color=C.three;key='dashCue'}else if(profile.dashBreakable&&profile.electronic){icon='⚡';color=C.three;key='dashCue'}const cy=profile.gateLike?o.gapY+o.gapH/2:Math.max(58,o.y-22),wide=icon.length>1?42:30;ctx.save();ctx.globalAlpha=.94;ctx.lineWidth=2;rr(o.x+o.w/2-wide/2,cy-15,wide,30,10,rgba(C.bg,.88),color);ctx.fillStyle=color;ctx.font='800 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,o.x+o.w/2,cy+1);ctx.restore();o.actionLabel=key
  }
  function drawGapHazard(o){
    const color=o.type==='crackedIce'?C.two:o.type==='lava'?C.two:o.type==='brokenBridge'?C.three:C.two;
    ctx.fillStyle=o.type==='lava'?rgba(C.two,.42):o.type==='brokenBridge'?rgba(C.three,.2):C.bg;ctx.fillRect(o.x,o.y-2,o.w,H-o.y+2);
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+o.w,o.y);ctx.stroke();
    if(o.type==='crackedIce'){ctx.strokeStyle=C.fg;ctx.globalAlpha=.75;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(o.x+i*o.w/4,o.y-3);ctx.lineTo(o.x+18+i*o.w/4,o.y+18);ctx.lineTo(o.x+8+i*o.w/4,o.y+31);ctx.stroke()}}
    if(o.type==='lava'){ctx.fillStyle=C.three;ctx.globalAlpha=.7;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(o.x+18+i*(o.w-36)/3,o.y+16+Math.sin(game.time*3+i)*5,4,0,7);ctx.fill()}}
    if(o.type==='brokenBridge'){ctx.fillStyle=rgba(C.two,.85);ctx.fillRect(o.x-12,o.y-8,22,8);ctx.fillRect(o.x+o.w-10,o.y-8,22,8);ctx.strokeStyle=C.fg;ctx.globalAlpha=.55;for(let x=o.x+8;x<o.x+o.w-8;x+=22){ctx.beginPath();ctx.moveTo(x,o.y+6);ctx.lineTo(x+12,o.y+17);ctx.stroke()}}
  }
  function drawThings(){
    for(const o of game.things){
      if(o.dead)continue;ctx.save();drawWarning(o);drawActionCue(o);
      if(o.type==='coin'){
        ctx.translate(o.x+11,o.y+11);ctx.scale(.25+Math.abs(Math.cos(o.spin))*.75,1);ctx.shadowBlur=18;ctx.shadowColor=C.three;ctx.fillStyle=C.three;ctx.beginPath();ctx.arc(0,0,10,0,7);ctx.fill();ctx.fillStyle=C.fg;ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(-2,-2,4,0,7);ctx.fill();
      }else if(o.type==='crate'){
        ctx.shadowBlur=18;ctx.shadowColor=C.two;rr(o.x,o.y,o.w,o.h,8,rgba(C.two,.2),C.two);ctx.strokeStyle=rgba(C.two,.6);ctx.beginPath();ctx.moveTo(o.x+8,o.y+8);ctx.lineTo(o.x+o.w-8,o.y+o.h-8);ctx.moveTo(o.x+o.w-8,o.y+8);ctx.lineTo(o.x+8,o.y+o.h-8);ctx.stroke();
      }else if(o.type==='spike'){
        ctx.shadowBlur=16;ctx.shadowColor=C.two;ctx.fillStyle=C.two;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(o.x+i*22,o.y+o.h);ctx.lineTo(o.x+i*22+11,o.y);ctx.lineTo(o.x+i*22+22,o.y+o.h);ctx.fill()}
      }else if(o.type==='drone'){
        ctx.shadowBlur=18;ctx.shadowColor=C.one;rr(o.x,o.y,o.w,o.h,14,rgba(C.one,.18),C.one);ctx.fillStyle=C.two;ctx.fillRect(o.x+18,o.y+12,22,7);ctx.strokeStyle=C.one;ctx.beginPath();ctx.moveTo(o.x-16,o.y+10);ctx.lineTo(o.x+4,o.y+10);ctx.moveTo(o.x+o.w-4,o.y+10);ctx.lineTo(o.x+o.w+16,o.y+10);ctx.stroke();
      }else if(HAZARDS[o.type]&&HAZARDS[o.type].gapLike){
        drawGapHazard(o);
      }else if(o.type==='spring'||o.type==='waterPlatform'){
        const color=o.type==='waterPlatform'?C.one:C.three;ctx.shadowBlur=16;ctx.shadowColor=color;rr(o.x,o.y,o.w,o.h,5,rgba(color,.25),color);ctx.fillStyle=color;for(let i=0;i<3;i++)ctx.fillRect(o.x+8+i*(o.w-16)/3,o.y-4,8,7);
      }else if(o.type==='gate'||o.type==='shutter'){
        const color=o.type==='shutter'?C.one:C.two;ctx.shadowBlur=18;ctx.shadowColor=color;ctx.fillStyle=color;ctx.fillRect(o.x,0,o.w,o.gapY);ctx.fillRect(o.x,o.gapY+o.gapH,o.w,floor()-o.gapY-o.gapH);ctx.fillStyle=C.fg;ctx.globalAlpha=.72;for(let y=8;y<floor();y+=18)ctx.fillRect(o.x+4,y,o.w-8,2);ctx.globalAlpha=1;ctx.shadowBlur=10;ctx.shadowColor=C.three;ctx.strokeStyle=C.three;ctx.lineWidth=4;ctx.strokeRect(o.x-5,o.gapY-4,o.w+10,o.gapH+8);ctx.fillStyle=C.three;ctx.beginPath();ctx.moveTo(o.x-18,o.gapY+o.gapH/2);ctx.lineTo(o.x-30,o.gapY+o.gapH/2-9);ctx.lineTo(o.x-30,o.gapY+o.gapH/2+9);ctx.closePath();ctx.fill();
      }else if(o.type==='billboard'){
        ctx.shadowBlur=16;ctx.shadowColor=C.one;rr(o.x,o.y,o.w,o.h,6,rgba(C.one,.2),C.one);ctx.fillStyle=C.two;ctx.fillRect(o.x+8,o.y+10,o.w-16,8);ctx.fillStyle=C.fg;ctx.globalAlpha=.7;ctx.fillRect(o.x+8,o.y+27,o.w*.55,4);ctx.strokeStyle=C.one;ctx.beginPath();ctx.moveTo(o.x+14,o.y+o.h);ctx.lineTo(o.x+14,floor());ctx.moveTo(o.x+o.w-14,o.y+o.h);ctx.lineTo(o.x+o.w-14,floor());ctx.stroke();
      }else if(o.type==='bridgeBar'){
        ctx.shadowBlur=14;ctx.shadowColor=C.two;rr(o.x,o.y,o.w,o.h,4,rgba(C.card,.96),C.two);ctx.fillStyle=C.two;for(let x=o.x+5;x<o.x+o.w-8;x+=18)fillPath([[x,o.y+3],[x+8,o.y+o.h-3],[x+15,o.y+3]],C.two);
      }else if(o.type==='train'){
        ctx.shadowBlur=18;ctx.shadowColor=C.two;rr(o.x,o.y,o.w,o.h,12,rgba(C.card,.96),C.two);ctx.fillStyle=C.one;for(let x=o.x+14;x<o.x+o.w-18;x+=25)rr(x,o.y+10,16,13,3,rgba(C.one,.7));ctx.fillStyle=C.two;ctx.fillRect(o.x+8,o.y+o.h-10,o.w-16,4);ctx.strokeStyle=C.fg;ctx.beginPath();ctx.moveTo(o.x+o.w-12,o.y+8);ctx.lineTo(o.x+o.w,o.y+o.h/2);ctx.lineTo(o.x+o.w-12,o.y+o.h-6);ctx.stroke();
      }else if(o.type==='laser'){
        ctx.shadowBlur=20;ctx.shadowColor=C.three;rr(o.x,o.y,10,o.h,4,rgba(C.card,.95),C.three);rr(o.x+o.w-10,o.y,10,o.h,4,rgba(C.card,.95),C.three);ctx.strokeStyle=C.two;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(o.x+10,o.y+o.h*.5);ctx.lineTo(o.x+o.w-10,o.y+o.h*.5);ctx.stroke();
      }else if(o.type==='robot'){
        ctx.shadowBlur=16;ctx.shadowColor=C.three;rr(o.x+6,o.y+12,o.w-12,o.h-12,9,rgba(C.card,.94),C.three);rr(o.x,o.y,o.w,25,8,rgba(C.one,.25),C.one);ctx.fillStyle=C.two;ctx.fillRect(o.x+11,o.y+9,7,5);ctx.fillRect(o.x+o.w-18,o.y+9,7,5);ctx.strokeStyle=C.three;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(o.x+13,o.y+o.h-3);ctx.lineTo(o.x+7,o.y+o.h+5);ctx.moveTo(o.x+o.w-13,o.y+o.h-3);ctx.lineTo(o.x+o.w-7,o.y+o.h+5);ctx.stroke();
      }else if(o.type==='scanner'){
        ctx.shadowBlur=18;ctx.shadowColor=C.three;rr(o.x,o.y,o.w,o.h,8,rgba(C.card,.94),C.three);ctx.fillStyle=C.one;ctx.fillRect(o.x+12,o.y+10,o.w-24,5);ctx.fillStyle=rgba(C.three,.12);ctx.fillRect(o.x+8,o.y+o.h,o.w-16,floor()-o.y-o.h);ctx.strokeStyle=rgba(C.three,.55);ctx.beginPath();ctx.moveTo(o.x+o.w/2,o.y+o.h);ctx.lineTo(o.x+o.w/2,floor());ctx.stroke();
      }else if(o.type==='snowball'||o.type==='rock'){
        const color=o.type==='snowball'?C.two:C.two;ctx.shadowBlur=14;ctx.shadowColor=color;ctx.fillStyle=o.type==='snowball'?rgba(C.fg,.94):rgba(C.card,.94);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w*.46,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w*.23,(o.spin||game.time)*2,(o.spin||game.time)*2+4);ctx.stroke();
      }else if(o.type==='icicle'){
        ctx.shadowBlur=16;ctx.shadowColor=C.two;fillPath([[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w*.54,o.y+o.h]],rgba(C.fg,.9),C.two);ctx.fillStyle=C.two;ctx.fillRect(o.x,o.y,o.w,4);
      }else if(o.type==='flame'){
        ctx.shadowBlur=18;ctx.shadowColor=C.two;fillPath([[o.x+o.w*.5,o.y],[o.x+o.w*.78,o.y+24],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h],[o.x+o.w*.2,o.y+31]],rgba(C.two,.8),C.three);ctx.fillStyle=rgba(C.fg,.6);ctx.beginPath();ctx.ellipse(o.x+o.w*.5,o.y+o.h*.68,o.w*.16,o.h*.24,0,0,7);ctx.fill();
      }else if(o.type==='log'){
        ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);ctx.rotate(Math.sin(o.spin||0)*.04);rr(-o.w/2,-o.h/2,o.w,o.h,o.h/2,rgba(C.two,.55),C.fg);ctx.fillStyle=rgba(C.card,.75);ctx.beginPath();ctx.arc(o.w/2-9,0,o.h*.32,0,7);ctx.fill();ctx.strokeStyle=C.fg;ctx.beginPath();ctx.arc(o.w/2-9,0,o.h*.18,0,7);ctx.stroke();ctx.restore();
      }else if(o.type==='waterfall'){
        ctx.shadowBlur=12;ctx.shadowColor=C.one;rr(o.x,o.y,o.w,o.h,8,rgba(C.one,.35),C.fg);ctx.fillStyle=rgba(C.one,.18);ctx.fillRect(o.x+8,o.y+o.h,o.w-16,floor()-o.y-o.h);ctx.strokeStyle=rgba(C.fg,.7);for(let x=o.x+12;x<o.x+o.w-8;x+=15){ctx.beginPath();ctx.moveTo(x,o.y+4);ctx.lineTo(x-5,o.y+o.h-4);ctx.stroke()}
      }else{
        const col=o.type==='shield'?C.one:o.type==='magnet'?C.two:C.four;ctx.shadowBlur=22;ctx.shadowColor=col;ctx.fillStyle=rgba(C.card,.85);ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(o.x+17,o.y+17,17,0,7);ctx.fill();ctx.stroke();ctx.fillStyle=C.fg;ctx.font='500 17px system-ui';ctx.textAlign='center';ctx.fillText(o.type==='shield'?'◆':o.type==='magnet'?'U':'◷',o.x+17,o.y+23);
      }
      ctx.restore();
    }
  }

  function player(){PlayerRenderer.draw(ctx,{player:p,game,reducedMotion,skin:skinProfile(),accent:skinAccent(),trail:skinTrail(),theme:C})}

  function hudTop(){const rootRect=root.getBoundingClientRect(),elements=[orientationButton,root.querySelector('.nr-brand'),root.querySelector('.nr-quick-controls')],bottom=elements.reduce((value,element)=>{if(!element)return value;const style=getComputedStyle(element);if(style.display==='none'||style.visibility==='hidden')return value;const rect=element.getBoundingClientRect();return Math.max(value,rect.bottom-rootRect.top)},0);return Math.max(H<460||W<560?54:86,Math.ceil(bottom+10))}

  function hud(){
    if(game.mode!=='play')return;const compact=H<460||W<560,top=hudTop(),pad=compact?10:14,leftW=compact?136:168,rightW=Math.min(compact?206:270,W-leftW-pad*3),rightX=W-rightW-pad;
    ctx.save();ctx.lineWidth=1;rr(pad,top,leftW,compact?54:62,12,rgba(C.bg,.78),rgba(C.one,.38));ctx.textAlign='left';ctx.fillStyle=C.muted;ctx.font=`700 ${compact?9:10}px system-ui`;ctx.fillText(tr('distance').toUpperCase(),pad+11,top+15);ctx.fillStyle=C.fg;ctx.font=`800 ${compact?20:25}px system-ui`;ctx.fillText(`${Math.floor(game.distance)} m`,pad+10,top+(compact?38:43));ctx.fillStyle=game.combo>=5?C.three:C.one;ctx.font=`800 ${compact?11:12}px system-ui`;ctx.textAlign='right';ctx.fillText(`×${Math.max(1,Math.floor(game.combo))}`,pad+leftW-10,top+(compact?36:42));
    const coreReady=game.overReady,coreActive=game.over>0;rr(rightX,top,rightW,compact?54:62,12,rgba(C.bg,.78),coreActive||coreReady?rgba(C.three,.76):rgba(C.one,.38));ctx.textAlign='left';ctx.font=`700 ${compact?9:10}px system-ui`;ctx.fillStyle=coreActive||coreReady?C.three:C.muted;ctx.fillText(tr(coreActive?'overdrive':coreReady?'novaReady':'energy').toUpperCase(),rightX+11,top+15);const barY=top+(compact?25:29),barW=rightW-22;rr(rightX+11,barY,barW,10,5,rgba(C.card,.9),C.border);const ratio=coreActive?game.over/4.2:coreReady?1:game.energy/100,eg=ctx.createLinearGradient(rightX,0,rightX+rightW,0);eg.addColorStop(0,coreActive||coreReady?C.three:C.one);eg.addColorStop(1,C.two);rr(rightX+13,barY+2,Math.max(0,(barW-4)*ratio),6,3,eg);ctx.fillStyle=C.fg;ctx.font=`700 ${compact?9:10}px system-ui`;ctx.textAlign='right';ctx.fillText(coreActive?`${game.over.toFixed(1)}s`:coreReady?tr('dash'):`${Math.round(game.energy)}%`,rightX+rightW-11,top+15);
    let sx=rightX+rightW-9;if(game.rescueAvailable){const label=tr('novaRescue');ctx.font='700 9px system-ui';const w=Math.min(92,ctx.measureText(label).width+13);rr(sx-w,top+(compact?42:48),w,14,7,rgba(C.card,.95),C.one);ctx.fillStyle=C.fg;ctx.textAlign='center';ctx.fillText(label,sx-w/2,top+(compact?52:58));sx-=w+4}for(const k of ['slow','magnet','shield'])if(p[k]>0){const label=`${tr(k)} ${Math.ceil(p[k])}`;ctx.font='700 9px system-ui';const w=Math.min(72,ctx.measureText(label).width+13);rr(sx-w,top+(compact?42:48),w,14,7,rgba(C.card,.95),k==='shield'?C.one:k==='magnet'?C.two:C.four);ctx.fillStyle=C.fg;ctx.textAlign='center';ctx.fillText(label,sx-w/2,top+(compact?52:58));sx-=w+4}
    if(seedParam&&!compact){ctx.font='600 9px ui-monospace,monospace';ctx.textAlign='left';ctx.fillStyle=C.three;ctx.fillText(`SEED ${seedParam.slice(0,15)} · ${game.generatorPhase.toUpperCase()} · #${game.generatorCount}`,pad,top+78)}
    for(const n of game.notes){ctx.globalAlpha=Math.min(1,n.t*2);ctx.textAlign='center';fitFont(n.text,W*.74,compact?21:27,12,'700');ctx.fillStyle=n.color;ctx.shadowBlur=8;ctx.shadowColor=n.color;ctx.fillText(n.text,W/2,n.y)}ctx.restore()
  }

  function drawActionLegend(y){const items=[[C.two,'↑',tr('jumpCue')],[C.one,'↓',tr('slideCue')],[C.three,'⚡',tr('dashCue')]],gap=8,pillW=Math.min(112,(W-48-gap*2)/3),start=W/2-(pillW*3+gap*2)/2;for(let i=0;i<items.length;i++){const [color,icon,label]=items[i],x=start+i*(pillW+gap);rr(x,y,pillW,30,10,rgba(C.bg,.8),rgba(color,.6));ctx.fillStyle=color;ctx.font='800 15px system-ui';ctx.textAlign='left';ctx.fillText(icon,x+10,y+20);ctx.fillStyle=C.fg;fitFont(label,pillW-37,11,8,'700');ctx.textAlign='right';ctx.fillText(label,x+pillW-9,y+20)}}
  function menuPanel(x,y,w,h,accent){ctx.save();ctx.lineWidth=1.5;const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,rgba(C.card,.9));g.addColorStop(1,rgba(C.bg,.92));rr(x,y,w,h,22,g,rgba(accent,.48));ctx.fillStyle=accent;ctx.fillRect(x+22,y,w-44,2);ctx.restore()}
  function drawMenuCover(){const image=W<H?coverMobile:coverDesktop;if(!image.complete||!image.naturalWidth)return false;const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight),sw=W/scale,sh=H/scale,sx=(image.naturalWidth-sw)*.5,sy=(image.naturalHeight-sh)*.5;ctx.drawImage(image,sx,sy,sw,sh,0,0,W,H);const wash=ctx.createLinearGradient(0,0,0,H);const light=root.dataset.theme==='light';wash.addColorStop(0,light?'rgba(255,250,242,.08)':'rgba(12,15,18,.42)');wash.addColorStop(.55,light?'rgba(247,238,224,.12)':'rgba(12,15,18,.32)');wash.addColorStop(1,light?'rgba(244,236,224,.34)':'rgba(12,15,18,.62)');ctx.fillStyle=wash;ctx.fillRect(0,0,W,H);return true}
  function overlay(){
    if(game.mode==='play'||game.mode==='over')return;
    ctx.save();
    if(game.mode==='menu'){
      if(!drawMenuCover()){ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H)}
      ctx.restore();return;
    }
    const compact=H<430,pw=Math.min(W-24,compact?620:640),px=(W-pw)/2;ctx.fillStyle=rgba(C.bg,compact?.78:.72);ctx.fillRect(0,0,W,H);ctx.textAlign='center';
    if(game.mode==='pause'){}
    ctx.restore();
  }
  function render(){ctx.save();C.skin=skinAccent();if(isMountain()){const map=challengeMap();mountainState=mountainState||map.createState(W,H);mountainState.reducedMotion=reducedMotion;map.render(ctx,mountainState,W,H,C);ctx.save();ctx.translate(-mountainState.cameraX,0);PlayerRenderer.drawChallenge(ctx,mountainState,C,skinProfile());ctx.restore();overlay();if(flash&&!reducedMotion){ctx.globalAlpha=flash;ctx.fillStyle=C.fg;ctx.fillRect(0,0,W,H)}ctx.restore();return}if(shake&&!reducedMotion&&shakeStrength>0)ctx.translate((Math.random()-.5)*shake*shakeStrength,(Math.random()-.5)*shake*shakeStrength);background();drawSpeedLines();drawThings();drawEffects();player();drawStateAtmosphere();hud();overlay();if(flash&&!reducedMotion){ctx.globalAlpha=flash;ctx.fillStyle=C.fg;ctx.fillRect(0,0,W,H)}ctx.restore()}
  function stopLoop(){if(frameId){caf(frameId);frameId=0}scheduled=false;last=0}
  function schedule(){if(!scheduled&&visible&&!document.hidden&&game.mode==='play'){scheduled=true;frameId=raf(loop)}}
  function loop(t){scheduled=false;frameId=0;if(game.mode!=='play'||document.hidden||!visible)return;const rawDt=last?(t-last)/1000:0,dt=Math.min(.033,rawDt);last=t;if(rawDt>.024)slowFrameScore=Math.min(180,slowFrameScore+1);else slowFrameScore=Math.max(0,slowFrameScore-1);const qualityCeiling=performanceMode==='performance'?.62:1;if(slowFrameScore>90)visualQuality=Math.min(qualityCeiling,.52);else if(slowFrameScore<24)visualQuality=qualityCeiling;try{update(dt);render()}catch(error){console.error('NOVA RUN frame error',error);visible=false;const panel=root.querySelector('[data-error]');if(panel){panel.hidden=false;panel.textContent='运行出现问题，请刷新页面后重试。';panel.dataset.detail=String(error&&error.message||error)}return}schedule()}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopLoop();clearInputState();Sound.setPlaying(false)}else{last=0;Sound.setPlaying(game.mode==='play');schedule()}});
  addEventListener('blur',clearInputState);
  addEventListener('pagehide',()=>{stopLoop();Sound.setPlaying(false)});
  addEventListener('pageshow',()=>{last=0;schedule()});
  appUi=UI.create({root,storage:Store,audio:Sound,tr,actions:{setting:applySetting,previewSetting,sceneSelect:chooseScene,retry:reset,menu:showMenu,scene:()=>{showMenu();appUi.openSettings()},pause,modalOpen,modalClose,enterFullscreen:()=>platform?.enterFullscreen(),exitFullscreen:()=>platform?.exitFullscreen(),installApp:()=>platform?.promptInstall(),applyUpdate:()=>platform?.applyUpdate()}});
  platform=PlatformService.create({root,storage:Store,onLayoutChange:scheduleResize,onUpdateReady:info=>appUi.showUpdate(info),onInstallStateChange:info=>appUi.setInstallState(info)});
  appUi.maybeShowIosInstall(platform);
  syncModeUi();applyUi(false);raf(()=>resize());
  }catch(error){const panel=document.querySelector('#nova-run-game [data-error]');if(panel){panel.hidden=false;panel.textContent='启动失败，请刷新页面或更换浏览器。';panel.dataset.detail=String(error&&error.message||error)}if(window.console&&console.error)console.error('NOVA RUN startup error',error)}
})();

(()=>{
'use strict';

// Capture the one-shot install event as soon as this deferred script runs. The
// settings UI is created later, so keeping this outside create() prevents loss.
let earlyInstallPrompt=null,earlyInstalled=false;
const installSubscribers=new Set();
const publishInstallState=()=>installSubscribers.forEach(listener=>listener());
addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  earlyInstallPrompt=event;
  earlyInstalled=false;
  publishInstallState();
},{capture:true});
addEventListener('appinstalled',()=>{
  earlyInstalled=true;
  earlyInstallPrompt=null;
  publishInstallState();
});

function create(options){
  const {root,storage}=options;
  const standaloneQuery=matchMedia('(display-mode: standalone)');
  const fullscreenDisplayQuery=matchMedia('(display-mode: fullscreen)');
  const coarseQuery=matchMedia('(pointer: coarse)');
  let viewportFrame=0,activeRegistration=null,pendingWorker=null,deferredInstall=earlyInstallPrompt,gameMode='menu',reloadWhenSafe=false,reloadingForUpdate=false,installed=false;

  const fullscreenElement=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
  const isStandalone=()=>standaloneQuery.matches||navigator.standalone===true;
  installed=isStandalone()||earlyInstalled;
  const isFullscreen=()=>!!fullscreenElement();
  const isBrowserFullscreen=()=>fullscreenDisplayQuery.matches||(
    Math.abs(innerWidth-(screen.width||innerWidth))<=3&&
    Math.abs(innerHeight-(screen.height||innerHeight))<=3
  );
  const isMobile=()=>coarseQuery.matches||(navigator.maxTouchPoints||0)>0;
  const isIosSafari=()=>{
    const ua=navigator.userAgent||'',ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&(navigator.maxTouchPoints||0)>1);
    return ios&&/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  };
  const isSecureAppContext=()=>/^https?:$/.test(location.protocol)&&'serviceWorker' in navigator;
  const isChromium=()=>/(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent||'')&&!/(?:CriOS|EdgiOS|OPiOS)/.test(navigator.userAgent||'');
  const isAndroidChromium=()=>/Android/i.test(navigator.userAgent||'')&&isChromium();
  const isDesktopChromium=()=>isChromium()&&!/Android|Mobile/i.test(navigator.userAgent||'');
  const installState=()=>{
    if(installed||isStandalone())return{status:'installed',available:false,installed:true};
    if(deferredInstall||earlyInstallPrompt)return{status:'installable',available:true,installed:false};
    if(isIosSafari())return{status:'ios-guide',available:true,installed:false};
    if(isSecureAppContext()&&isAndroidChromium())return{status:'android-menu',available:false,installed:false};
    if(isSecureAppContext()&&isDesktopChromium())return{status:'browser-menu',available:false,installed:false};
    if(!isSecureAppContext())return{status:'unsupported',available:false,installed:false};
    return{status:'checking',available:false,installed:false};
  };
  const notifyInstall=()=>options.onInstallStateChange?.(installState());
  const syncEarlyInstall=()=>{deferredInstall=earlyInstallPrompt;installed=isStandalone()||earlyInstalled;notifyInstall()};
  installSubscribers.add(syncEarlyInstall);
  async function promptInstall(){
    const prompt=deferredInstall||earlyInstallPrompt;
    if(!prompt)return installState();
    deferredInstall=null;earlyInstallPrompt=null;
    try{await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome==='accepted')installed=true}catch(error){}
    notifyInstall();return installState();
  }

  function applyViewport(){
    viewportFrame=0;
    const vv=window.visualViewport,height=Math.round(vv?.height||innerHeight),top=Math.max(0,Math.round(vv?.offsetTop||0)),bottom=Math.max(0,Math.round(innerHeight-height-top));
    root.style.setProperty('--app-height',`${height}px`);
    root.style.setProperty('--visual-top-offset',`${top}px`);
    root.style.setProperty('--visual-bottom-offset',`${bottom}px`);
    const fullscreen=isFullscreen(),standalone=isStandalone(),immersive=fullscreen||standalone||isBrowserFullscreen();
    root.dataset.fullscreen=fullscreen?'true':'false';
    root.dataset.standalone=standalone?'true':'false';
    root.dataset.immersive=immersive?'true':'false';
    root.classList.toggle('is-fullscreen',fullscreen);
    root.classList.toggle('is-standalone',standalone);
    root.classList.toggle('is-immersive',immersive);
    document.documentElement.classList.toggle('nr-immersive',immersive);
    document.body?.classList.toggle('nr-immersive',immersive);
    if(options.onLayoutChange)options.onLayoutChange();
  }
  function scheduleViewport(){if(viewportFrame)return;viewportFrame=requestAnimationFrame(applyViewport)}

  function requestFullscreen(){
    const request=root.requestFullscreen||root.webkitRequestFullscreen;
    if(!request||isStandalone()||isFullscreen())return Promise.resolve(false);
    try{
      const result=request.call(root,{navigationUI:'hide'});
      return result&&typeof result.then==='function'?result.then(()=>true).catch(()=>false):Promise.resolve(true);
    }catch(error){return Promise.resolve(false)}
  }
  function tryEnterFullscreenFromGesture(){
    const settings=storage.settings();
    if(!settings.autoFullscreen||!isMobile()||isStandalone()||isFullscreen())return Promise.resolve(false);
    return requestFullscreen();
  }
  function enterFullscreen(){return requestFullscreen()}
  function exitFullscreen(){
    const exit=document.exitFullscreen||document.webkitExitFullscreen;
    if(!exit||!isFullscreen())return Promise.resolve(false);
    try{const result=exit.call(document);return result&&typeof result.then==='function'?result.then(()=>true).catch(()=>false):Promise.resolve(true)}catch(error){return Promise.resolve(false)}
  }

  function notifyUpdate(worker){
    pendingWorker=worker||activeRegistration?.waiting||null;
    if(gameMode==='play')reloadWhenSafe=true;
    if(options.onUpdateReady)options.onUpdateReady({deferred:gameMode==='play'});
  }
  function applyUpdate(){
    if(!pendingWorker)return false;
    if(gameMode==='play'){reloadWhenSafe=true;return false}
    pendingWorker.postMessage({type:'SKIP_WAITING'});
    return true;
  }
  function setGameMode(mode){
    gameMode=mode;
    if(reloadWhenSafe&&mode!=='play'){reloadWhenSafe=false;applyUpdate()}
  }
  function registerServiceWorker(){
    if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
    if(navigator.serviceWorker.controller)navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadingForUpdate)return;reloadingForUpdate=true;location.reload()});
    navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>{
      activeRegistration=registration;
      if(registration.waiting&&navigator.serviceWorker.controller)notifyUpdate(registration.waiting);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)notifyUpdate(worker)});
      });
    }).catch(error=>console.info('NOVA RUN offline support unavailable.',error?.message||error));
  }

  addEventListener('resize',scheduleViewport,{passive:true});
  addEventListener('orientationchange',scheduleViewport,{passive:true});
  document.addEventListener('fullscreenchange',scheduleViewport);
  document.addEventListener('webkitfullscreenchange',scheduleViewport);
  window.visualViewport?.addEventListener('resize',scheduleViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',scheduleViewport,{passive:true});
  standaloneQuery.addEventListener?.('change',scheduleViewport);
  fullscreenDisplayQuery.addEventListener?.('change',scheduleViewport);
  applyViewport();
  registerServiceWorker();
  Promise.resolve().then(notifyInstall);

  return Object.freeze({isStandalone,isFullscreen,isBrowserFullscreen,isMobile,isIosSafari,installState,promptInstall,tryEnterFullscreenFromGesture,enterFullscreen,exitFullscreen,scheduleViewport,setGameMode,applyUpdate,registerServiceWorker});
}

globalThis.NovaRunPlatform=Object.freeze({create});
})();

const BUILD='2026-07-23-mobile-pwa12';
const CACHE=`nova-run-${BUILD}`;
const CORE=[
  './','./index.html','./styles.css?v=20260723-mobile-pwa12','./config.js?v=20260723-mobile-pwa12','./i18n.js?v=20260723-mobile-pwa12','./storage.js?v=20260723-mobile-pwa12','./platform.js?v=20260723-mobile-pwa12','./audio.js?v=20260722-premium7','./select-menu.js?v=20260723-mobile-pwa12','./ui.js?v=20260723-mobile-pwa12','./player.js?v=20260723-mobile-pwa12','./backgrounds.js?v=20260723-mobile-pwa12','./state-effects.js?v=20260723-mobile-pwa12','./challenge-engine.js?v=20260722-premium2','./mountain-map.js?v=20260722-premium2','./tide-city-map.js?v=20260722-premium2','./sand-clock-map.js?v=20260722-premium2','./game.js?v=20260723-mobile-pwa12','./manifest.webmanifest','./assets/nova-cover.webp?v=20260721','./assets/nova-cover-mobile.webp?v=20260721','./assets/scene-previews/guangzhou.webp','./assets/scene-previews/shanghai.webp','./assets/scene-previews/shenzhen.webp','./assets/scene-previews/snow.webp','./assets/scene-previews/volcano.webp','./assets/scene-previews/jiuzhaigou.webp','./assets/scene-previews/dream-peak.webp','./assets/scene-previews/tide-city.webp','./assets/scene-previews/sand-clock.webp','./assets/icons/icon-192.png','./assets/icons/icon-512.png','./assets/icons/icon-maskable-512.png','./assets/icons/apple-touch-icon.png'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{for(const url of CORE){try{const response=await fetch(url,{cache:'reload'});if(response.ok)await cache.put(url,response.clone())}catch(error){}}})));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nova-run-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request,{cache:'no-store'}).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put('./index.html',response.clone())}return response}).catch(async()=>await caches.match('./index.html')||await caches.match('./')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>{
    const network=fetch(request).then(async response=>{if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response}).catch(()=>cached);
    return cached||network;
  }));
});

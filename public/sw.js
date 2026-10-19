const CACHE = 'my-home-finance-blueprint-c-__BUILD__';
const APP_ROOT = '/my-home-finance/';
const PRECACHE = [APP_ROOT, `${APP_ROOT}manifest.webmanifest`, `${APP_ROOT}icon.svg`, ...__ASSETS__];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE))));
self.addEventListener('message', event => {if(event.data?.type === 'ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('my-home-finance-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(APP_ROOT,copy))}return response}).catch(()=>caches.match(APP_ROOT)));return;
 }
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok&&new URL(event.request.url).pathname.startsWith(APP_ROOT)){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response})));
});

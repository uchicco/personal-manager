const CACHE='personal-manager-v1-20261024';const ASSETS=['./','./index.html','./app.js','./logic.js','./styles.css','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(resp=>{if(resp.ok){const c=resp.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return resp}).catch(()=>caches.match(e.request)))});

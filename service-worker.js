!function(){"use strict";const s=1620140350668,e=`cache${s}`,t=["/client/client.6bde81d8.js","/client/inject_styles.5607aec6.js","/client/index.b388e4e2.js","/client/menu.aa0d0d5c.js","/client/about.f3f3f7af.js","/client/[...slug].861a298e.js","/client/index.980346f1.js","/client/index.7ac7356f.js","/client/bigBoard.2a76af3f.js"].concat(["/service-worker-index.html","/assets/boundaries.geojson","/assets/coneTexture.png","/assets/conesVilles.svg","/assets/css/main.css","/assets/data_model_v10.svg","/assets/data_model_v11.svg","/assets/earth_normalmap_flat4k.jpg","/assets/earthbump4k.jpg","/assets/earthmap4k.jpg","/assets/earthspec4k.jpg","/assets/favicon.ico","/assets/gentilis_regular.typeface.json","/assets/images/icons.png","/assets/images/icons@2x.png","/assets/images/widgets.png","/assets/images/widgets@2x.png","/assets/js/main.js","/assets/js/search.js","/assets/nwx.jpg","/assets/nwy.jpg","/assets/nwz.jpg","/assets/nx.jpg","/assets/ny.jpg","/assets/nz.jpg","/assets/pwx.jpg","/assets/pwy.jpg","/assets/pwz.jpg","/assets/px.jpg","/assets/py.jpg","/assets/pz.jpg","/bulma.css","/classes/default.html","/datasets/China_Taiwan_1M","/datasets/Europe_1M","/datasets/Europe_1M_FUA","/datasets/France","/datasets/Germany_22","/datasets/Japan","/datasets/Japan_1M","/datasets/World","/datasets/World_1M","/datasets/datasets.json","/datasets/user-test_1","/documentation.html","/modules.html"]),a=new Set(t);self.addEventListener("install",(s=>{s.waitUntil(caches.open(e).then((s=>s.addAll(t))).then((()=>{self.skipWaiting()})))})),self.addEventListener("activate",(s=>{s.waitUntil(caches.keys().then((async s=>{for(const t of s)t!==e&&await caches.delete(t);self.clients.claim()})))})),self.addEventListener("fetch",(e=>{if("GET"!==e.request.method||e.request.headers.has("range"))return;const t=new URL(e.request.url),n=t.protocol.startsWith("http"),c=t.hostname===self.location.hostname&&t.port!==self.location.port,i=t.host===self.location.host&&a.has(t.pathname),o="only-if-cached"===e.request.cache&&!i;!n||c||o||e.respondWith((async()=>i&&await caches.match(e.request)||async function(e){const t=await caches.open(`offline${s}`);try{const s=await fetch(e);return t.put(e,s.clone()),s}catch(s){const a=await t.match(e);if(a)return a;throw s}}(e.request))())}))}();

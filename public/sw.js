// عامل الخدمة: يجعل اللعبة تفتح بسرعة ويجلب أحدث نسخة دائمًا عند توفر الإنترنت
const CACHE = 'abtal-v6';
const ASSETS = ['./', 'index.html', 'teacher.html', 'css/style.css', 'css/teacher.css', 'js/app.js', 'js/teacher.js', 'js/common.js',
  'js/store.js', 'js/certificate.js', 'js/firebase-config.js', 'vendor/firebase.js', 'data/questions.json', 'manifest.webmanifest',
  'icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// الشبكة أولًا، ثم النسخة المحفوظة عند انقطاع الاتصال
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    // no-cache: نتحقق من الخادم دائمًا حتى لا تختلط ملفات نسخة قديمة بنسخة جديدة
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./')))
  );
});

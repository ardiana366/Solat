const CACHE_NAME = 'rakaat-v3';
const assets = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // Memaksa Service Worker baru langsung mengambil alih tanpa menunggu tab ditutup
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Membersihkan cache lama secara otomatis
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
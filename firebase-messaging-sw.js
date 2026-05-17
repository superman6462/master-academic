// ═══════════════════════════════════════════════
//  Master Academic & Admission Care
//  Firebase Messaging Service Worker
//  Handles push notifications when app is CLOSED
// ═══════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyD4TiBqoT2r373fsfqMBAxQ29ua1IZlPwQ",
  authDomain:        "master-eda5d.firebaseapp.com",
  projectId:         "master-eda5d",
  storageBucket:     "master-eda5d.firebasestorage.app",
  messagingSenderId: "343735612179",
  appId:             "1:343735612179:web:2eed5a03e4d578f43d20e6"
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or in background)
messaging.onBackgroundMessage(payload => {
  console.log('📨 Background message:', payload);

  const title = payload.notification?.title || '🔔 Master Academic';
  const body  = payload.notification?.body  || 'নতুন আপডেট আছে!';

  return self.registration.showNotification(title, {
    body,
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: 'master-academic-notif',
    renotify: true,
    data: { url: 'https://master-eda5d.web.app', ...payload.data },
    actions: [
      { action: 'open',  title: '📱 দেখুন' },
      { action: 'close', title: 'বন্ধ করুন' }
    ]
  });
});

// Tap on notification → open app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const url = event.notification.data?.url || 'https://master-eda5d.web.app';
  event.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
      for (const client of list) {
        if (client.url.includes('master-eda5d.web.app') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── Cache for offline ──
const CACHE = 'maac-v3';
const FILES = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

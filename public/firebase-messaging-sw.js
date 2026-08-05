/* ============================================================
   Service Worker de Firebase Cloud Messaging
   ------------------------------------------------------------
   Este archivo DEBE ir en la carpeta `public/` del proyecto,
   para que quede publicado en la raíz del sitio:
       https://tu-app.vercel.app/firebase-messaging-sw.js

   El navegador ejecuta este script en segundo plano, incluso
   con la app completamente cerrada. Por eso no puede importar
   nada del código de React: vive aparte, y usa la versión
   "compat" de Firebase cargada por importScripts.
   ============================================================ */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Misma config que en src/firebase.js (estas claves son públicas, no son secretas)
firebase.initializeApp({
  apiKey: "AIzaSyA8gYVgbT6V6qFZUVGwkgooUUoKg-3cxvc",
  authDomain: "ruleta-pelis.firebaseapp.com",
  projectId: "ruleta-pelis",
  storageBucket: "ruleta-pelis.firebasestorage.app",
  messagingSenderId: "10147267814186",
  appId: "1:10147267814186:web:56affcdbc8f32eb4eaaa93",
});

const messaging = firebase.messaging();

/* Mensajes que llegan cuando la app está cerrada o en segundo plano.
   Nota: si la Cloud Function envía un bloque `notification`, el navegador
   ya la muestra solo. Enviamos solo `data` desde la función para controlar
   aquí la apariencia y evitar notificaciones duplicadas. */
messaging.onBackgroundMessage((payload) => {
  const d = payload.data || {};
  const titulo = d.title || "🎬 Ruleta de Pelis";
  const opciones = {
    body: d.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Mismo tag = una notificación reemplaza a la anterior en vez de apilarse
    tag: d.tag || "ruleta-general",
    // FIX: antes esto quedaba fijo en `true` sin importar lo que mandara la
    // función — los cambios de estado (que piden renotify:false, para
    // reemplazar en silencio) igual vibraban cada vez. Ahora respeta el valor real.
    renotify: d.renotify === "true",
    data: { url: d.url || "/" },
    vibrate: [40, 60, 40],
  };
  return self.registration.showNotification(titulo, opciones);
});

/* Al tocar la notificación: si la app ya está abierta en alguna pestaña,
   la enfoca en vez de abrir una nueva. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((listaVentanas) => {
      for (const ventana of listaVentanas) {
        if ("focus" in ventana) return ventana.focus();
      }
      if (clients.openWindow) return clients.openWindow(destino);
      return undefined;
    })
  );
});

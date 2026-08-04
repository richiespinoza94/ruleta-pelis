import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA8gYVgbT6V6qFZUVGwkgooUUoKg-3cxvc",
  authDomain: "ruleta-pelis.firebaseapp.com",
  projectId: "ruleta-pelis",
  storageBucket: "ruleta-pelis.firebasestorage.app",
  messagingSenderId: "10147267814186",
  appId: "1:10147267814186:web:56affcdbc8f32eb4eaaa93",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* ------------------------------------------------------------------
   Clave VAPID — la sacas de Firebase Console:
   Configuración del proyecto → Cloud Messaging → "Certificados push web"
   → Generar par de claves → copiar la clave pública y pegarla aquí.
   ------------------------------------------------------------------ */
export const VAPID_KEY = "BGdBXhVWJXQaW-Si--9x8XgxA4g_r4ajsLz2-jzqS8q7ap5n_x1MzMEY-g6hp2X1rD7UaDX3LzbMfT12JKpg9nI";

/* getMessaging() truena en navegadores sin soporte (algunos iOS, modo incógnito),
   así que lo pedimos de forma segura y devolvemos null si no se puede. */
export async function getMessagingSeguro() {
  try {
    const soportado = await isSupported();
    if (!soportado) return null;
    return getMessaging(app);
  } catch (e) {
    console.warn("Cloud Messaging no disponible en este navegador:", e);
    return null;
  }
}

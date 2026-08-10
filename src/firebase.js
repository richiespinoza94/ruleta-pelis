import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyA8gYVgbT6V6qFZUVGwKgooUUoKg-3cxvc",
  authDomain: "ruleta-pelis.firebaseapp.com",
  projectId: "ruleta-pelis",
  storageBucket: "ruleta-pelis.firebasestorage.app",
  messagingSenderId: "1014726781418",
  appId: "1:1014726781418:web:56affcdbc8f32eb4eaaa93",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const functions = getFunctions(app);

/* Clave VAPID ya configurada (Firebase Console → Cloud Messaging → Certificados push web) */
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

/* Llama a la Cloud Function que autocompleta título/autor/contexto desde un link.
   Devuelve {titulo, autor, contexto} — cualquiera puede venir vacío si no se pudo inferir. */
export async function obtenerMetadatosEnlace(url) {
  try {
    const fn = httpsCallable(functions, "obtenerMetadatosEnlace");
    const res = await fn({ url });
    return res.data;
  } catch (e) {
    console.warn("No se pudieron obtener metadatos del enlace:", e);
    return { titulo: "", autor: "", contexto: "" };
  }
}

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA8gYVgbT6V6qFZUVGwkgooUUoKg-3cxvc",
  authDomain: "ruleta-pelis.firebaseapp.com",
  projectId: "ruleta-pelis",
  storageBucket: "ruleta-pelis.firebasestorage.app",
  messagingSenderId: "10147267814186",
  appId: "1:10147267814186:web:56affcdbc8f32eb4eaaa93"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

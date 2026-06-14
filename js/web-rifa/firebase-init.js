/**
 * Inicialización Firebase — web-rifa
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { loadFirebaseConfig } from "./firebase-config.loader.js";

const firebaseConfig = await loadFirebaseConfig();

/** @type {import('firebase/app').FirebaseApp} */
export const app = initializeApp(firebaseConfig);

/** @type {import('firebase/firestore').Firestore} */
export const db = getFirestore(app);

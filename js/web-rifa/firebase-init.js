/**
 * Inicialización Firebase — web-rifa
 * Importar desde vanessa-quiros/index.html como type="module"
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

/** @type {import('firebase/app').FirebaseApp} */
export const app = initializeApp(firebaseConfig);

/** @type {import('firebase/firestore').Firestore} */
export const db = getFirestore(app);

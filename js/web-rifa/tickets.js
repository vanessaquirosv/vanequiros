/**
 * Boletos — lectura Firestore (web-rifa)
 */
import {
  collection,
  getDocs,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";

const LOAD_TIMEOUT_MS = 20000;

function mapTicketDoc(data) {
  return {
    id: data.id,
    numero: data.numero,
    serieDigit: data.serieDigit,
    status: data.status,
    orderId: data.orderId ?? null,
  };
}

function parseSnapshot(snapshot) {
  if (snapshot.empty) return null;
  const tickets = snapshot.docs.map((d) => mapTicketDoc(d.data()));
  tickets.sort((a, b) => a.id - b.id);
  return tickets;
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

/**
 * Carga inicial + escucha en tiempo real.
 */
export function subscribeTickets(onTickets, onError) {
  const col = collection(db, "tickets");
  let firstLoadDone = false;

  withTimeout(
    getDocs(col),
    LOAD_TIMEOUT_MS,
    "Tiempo de espera agotado al conectar con Firestore. Verifica que Firestore esté creado en Firebase Console y que las reglas permitan lectura."
  )
    .then((snapshot) => {
      firstLoadDone = true;
      onTickets(parseSnapshot(snapshot));
    })
    .catch((err) => {
      if (!firstLoadDone) onError(err);
    });

  return onSnapshot(
    col,
    (snapshot) => {
      if (!firstLoadDone) firstLoadDone = true;
      onTickets(parseSnapshot(snapshot));
    },
    (error) => onError(error)
  );
}

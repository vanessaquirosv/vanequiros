/**
 * Boletos — lectura y suscripción en tiempo real (web-rifa)
 */
import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";

/**
 * @param {import('firebase/firestore').DocumentData} data
 */
function mapTicketDoc(data) {
  return {
    id: data.id,
    numero: data.numero,
    serieDigit: data.serieDigit,
    status: data.status,
    orderId: data.orderId ?? null,
  };
}

/**
 * Escucha cambios en la colección tickets (tiempo real).
 * @param {(tickets: Array|null) => void} onTickets - null si la colección está vacía
 * @param {(error: Error) => void} onError
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeTickets(onTickets, onError) {
  return onSnapshot(
    collection(db, "tickets"),
    (snapshot) => {
      if (snapshot.empty) {
        onTickets(null);
        return;
      }
      const tickets = snapshot.docs.map((d) => mapTicketDoc(d.data()));
      tickets.sort((a, b) => a.id - b.id);
      onTickets(tickets);
    },
    (error) => onError(error)
  );
}

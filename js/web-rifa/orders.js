/**
 * Pedidos — reserva atómica de boletos (web-rifa)
 */
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";

/**
 * Crea un pedido y reserva los boletos en una transacción Firestore.
 * @param {object} payload
 * @returns {Promise<string>} ID del pedido creado
 */
export async function createOrder(payload) {
  const ticketIds = payload.boletos.map((b) => b.id);

  return runTransaction(db, async (transaction) => {
    const ticketRefs = ticketIds.map((id) => doc(db, "tickets", String(id)));
    const ticketSnaps = await Promise.all(
      ticketRefs.map((ref) => transaction.get(ref))
    );

    for (let i = 0; i < ticketSnaps.length; i++) {
      const snap = ticketSnaps[i];
      const label = String(ticketIds[i]).padStart(3, "0");
      if (!snap.exists()) {
        throw new Error(`El boleto #${label} no existe en la base de datos.`);
      }
      if (snap.data().status !== "disponible") {
        throw new Error(`El boleto #${label} ya no está disponible.`);
      }
    }

    const orderRef = doc(collection(db, "orders"));
    transaction.set(orderRef, {
      nombre: payload.nombre,
      telefono: payload.telefono,
      instagram: payload.instagram || "",
      boletos: payload.boletos,
      total: payload.total,
      precioUnitario: payload.precioUnitario,
      status: "pendiente_pago",
      createdAt: serverTimestamp(),
      paidAt: null,
      paymentRef: null,
    });

    ticketRefs.forEach((ref) => {
      transaction.update(ref, {
        status: "reservado",
        orderId: orderRef.id,
        updatedAt: serverTimestamp(),
      });
    });

    return orderRef.id;
  });
}

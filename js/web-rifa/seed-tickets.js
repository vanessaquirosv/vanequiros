/**
 * Seed único — crear 1000 boletos en Firestore (ejecutar una sola vez)
 */
import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";

const TOTAL = 1000;
const BATCH_SIZE = 500;

/**
 * @returns {Promise<{ seeded: boolean, message: string }>}
 */
export async function seedTickets() {
  const metaRef = doc(db, "meta", "config");
  const metaSnap = await getDoc(metaRef);

  if (metaSnap.exists() && metaSnap.data().seeded === true) {
    return {
      seeded: false,
      message: "La base de datos ya fue inicializada (meta/config.seeded = true).",
    };
  }

  for (let start = 0; start < TOTAL; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    const end = Math.min(start + BATCH_SIZE, TOTAL);

    for (let id = start; id < end; id++) {
      const ticketRef = doc(db, "tickets", String(id));
      batch.set(ticketRef, {
        id,
        numero: String(id % 100).padStart(2, "0"),
        serieDigit: Math.floor(id / 100),
        status: "disponible",
        orderId: null,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  }

  await setDoc(metaRef, {
    seeded: true,
    seededAt: serverTimestamp(),
    ticketCount: TOTAL,
  });

  return {
    seeded: true,
    message: `Se crearon ${TOTAL} boletos (000–999) correctamente.`,
  };
}

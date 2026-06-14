/**
 * App rifa — Vanessa Quirós (Firebase web-rifa)
 */
import { subscribeTickets } from "./tickets.js";
import { createOrder } from "./orders.js";

// =========================================================================
// === STATE ===
// =========================================================================

const TICKET_PRICE = 2000;

/** @type {Array<{id: number, numero: string, serieDigit: number, status: string}>} */
let tickets = [];

/** IDs en carrito local (no persistidos hasta confirmar compra) */
const selectedIds = new Set();

let activeSerieDigit = 0;
let selectedDonationAmount = 0;
let firebaseReady = false;

// =========================================================================
// === HELPERS ===
// =========================================================================

function formatTicketId(id) {
  return String(id).padStart(3, "0");
}

function getTicketById(id) {
  return tickets.find((t) => t.id === id);
}

function getDisplayStatus(ticket) {
  if (selectedIds.has(ticket.id) && ticket.status === "disponible") {
    return "seleccionado";
  }
  return ticket.status;
}

function getSelectedTickets() {
  return [...selectedIds]
    .map((id) => getTicketById(id))
    .filter(Boolean);
}

function isOccupied(status) {
  return status === "vendido" || status === "reservado";
}

function setRifaUI(state, message = "") {
  const loading = document.getElementById("rifa-loading");
  const error = document.getElementById("rifa-error");
  const empty = document.getElementById("rifa-empty");
  const content = document.getElementById("rifa-content");

  loading.classList.toggle("hidden", state !== "loading");
  error.classList.toggle("hidden", state !== "error");
  empty.classList.toggle("hidden", state !== "empty");
  content.classList.toggle("hidden", state !== "ready");

  if (state === "error") {
    document.getElementById("rifa-error-msg").textContent = message;
  }
}

// =========================================================================
// === FIREBASE: TICKETS ===
// =========================================================================

function applyTicketsFromFirestore(firestoreTickets) {
  tickets = firestoreTickets;

  selectedIds.forEach((id) => {
    const t = getTicketById(id);
    if (!t || t.status !== "disponible") selectedIds.delete(id);
  });

  if (firebaseReady) {
    renderTabs();
    renderGrid();
    renderCart();
  }
}

function initFirebaseTickets() {
  setRifaUI("loading");

  return subscribeTickets(
    (data) => {
      if (data === null) {
        setRifaUI("empty");
        firebaseReady = false;
        return;
      }
      firebaseReady = true;
      setRifaUI("ready");
      applyTicketsFromFirestore(data);
    },
    (err) => {
      console.error("[web-rifa] Error Firestore:", err);
      setRifaUI(
        "error",
        err.message || "No se pudo conectar con Firebase. Revisa la consola y FIREBASE-SETUP.md."
      );
    }
  );
}

// =========================================================================
// === RENDER: GRID ===
// =========================================================================

function renderTabs() {
  const container = document.getElementById("grid-tabs");
  container.innerHTML = "";
  for (let d = 0; d <= 9; d++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", d === activeSerieDigit ? "true" : "false");
    btn.dataset.serie = String(d);
    btn.textContent = String(d);
    btn.className = getTabClasses(d === activeSerieDigit);
    btn.addEventListener("click", () => selectTab(d));
    container.appendChild(btn);
  }
}

function getTabClasses(isActive) {
  const base =
    "w-9 h-9 sm:w-11 sm:h-11 rounded-lg text-sm sm:text-base font-semibold transition-colors";
  if (isActive) {
    return `${base} bg-[#B18588] text-white shadow-md ring-2 ring-[#B76E79]/50`;
  }
  return `${base} bg-white border border-[#E8C5C8] text-[#B18588] hover:bg-[#E8C5C8]/40`;
}

function selectTab(serieDigit) {
  activeSerieDigit = serieDigit;
  document.getElementById("active-grid-label").textContent =
    `Cuadrícula ${serieDigit} — Serie ${serieDigit}XX`;
  renderTabs();
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById("number-grid");
  grid.innerHTML = "";

  tickets
    .filter((t) => t.serieDigit === activeSerieDigit)
    .forEach((ticket) => {
      const displayStatus = getDisplayStatus(ticket);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = ticket.numero;
      btn.dataset.id = String(ticket.id);
      btn.setAttribute("aria-label", `Boleto ${formatTicketId(ticket.id)}`);
      btn.className = getNumberButtonClasses(displayStatus);

      if (!isOccupied(ticket.status)) {
        btn.addEventListener("click", () => toggleTicket(ticket.id));
      } else {
        btn.disabled = true;
      }

      grid.appendChild(btn);
    });
}

function getNumberButtonClasses(status) {
  const base =
    "aspect-square flex items-center justify-center rounded text-[10px] sm:text-sm font-medium transition-colors";
  switch (status) {
    case "vendido":
    case "reservado":
      return `${base} bg-red-50 text-neutral-400 line-through cursor-not-allowed border border-red-100 opacity-70`;
    case "seleccionado":
      return `${base} bg-[#B76E79] text-white border border-[#B18588] shadow-sm`;
    default:
      return `${base} bg-white text-neutral-800 border border-[#E8C5C8]/80 hover:bg-[#E8C5C8] cursor-pointer`;
  }
}

// =========================================================================
// === RENDER: CART ===
// =========================================================================

function renderCart() {
  const selected = getSelectedTickets();
  const list = document.getElementById("cart-list");
  const empty = document.getElementById("cart-empty");
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");
  const fabCount = document.getElementById("fab-count");
  const checkoutBtn = document.getElementById("btn-checkout");

  list.innerHTML = "";
  if (selected.length === 0) {
    empty.classList.remove("hidden");
    list.classList.add("hidden");
    checkoutBtn.disabled = true;
  } else {
    empty.classList.add("hidden");
    list.classList.remove("hidden");
    selected
      .sort((a, b) => a.id - b.id)
      .forEach((t) => {
        const li = document.createElement("li");
        li.textContent = `Boleto #${formatTicketId(t.id)}`;
        list.appendChild(li);
      });
    checkoutBtn.disabled = !firebaseReady;
  }

  const total = selected.length * TICKET_PRICE;
  countEl.textContent = String(selected.length);
  totalEl.textContent = `₡${total.toLocaleString("es-CR")}`;
  fabCount.textContent = String(selected.length);

  if (selected.length > 0 && window.innerWidth < 768) {
    document.getElementById("cart-panel").classList.remove("translate-y-full");
  }
}

function toggleTicket(id) {
  const ticket = getTicketById(id);
  if (!ticket || ticket.status !== "disponible") return;

  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);

  renderGrid();
  renderCart();
}

// =========================================================================
// === DONATION ===
// =========================================================================

function updateDonationDisplay() {
  document.getElementById("donation-display").textContent =
    `₡${selectedDonationAmount.toLocaleString("es-CR")}`;
}

function initDonation() {
  document.querySelectorAll(".donation-quick").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedDonationAmount = Number(btn.dataset.amount);
      document.getElementById("custom-amount").value = "";
      document.querySelectorAll(".donation-quick").forEach((b) => {
        b.classList.remove("ring-2", "ring-[#B76E79]", "bg-[#E8C5C8]/50");
      });
      btn.classList.add("ring-2", "ring-[#B76E79]", "bg-[#E8C5C8]/50");
      updateDonationDisplay();
    });
  });

  document.getElementById("custom-amount").addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    selectedDonationAmount = isNaN(val) ? 0 : val;
    document.querySelectorAll(".donation-quick").forEach((b) => {
      b.classList.remove("ring-2", "ring-[#B76E79]", "bg-[#E8C5C8]/50");
    });
    updateDonationDisplay();
  });

  document.getElementById("btn-donation-pay").addEventListener("click", () => {
    if (selectedDonationAmount <= 0) {
      alert("Por favor selecciona o ingresa un monto.");
      return;
    }
    openModal("donation");
  });
}

// =========================================================================
// === MODALS ===
// =========================================================================

function openModal(name) {
  const modal = document.getElementById(
    name === "donation" ? "modal-donation" : "modal-checkout"
  );
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  if (name === "checkout") {
    const selected = getSelectedTickets();
    const total = selected.length * TICKET_PRICE;
    document.getElementById("modal-checkout-total").textContent =
      `₡${total.toLocaleString("es-CR")}`;
    document.getElementById("checkout-summary").innerHTML = selected
      .sort((a, b) => a.id - b.id)
      .map(
        (t) =>
          `<p>Boleto #${formatTicketId(t.id)} — ₡${TICKET_PRICE.toLocaleString("es-CR")}</p>`
      )
      .join("");
  }
}

function closeModal(name) {
  const modal = document.getElementById(
    name === "donation" ? "modal-donation" : "modal-checkout"
  );
  modal.classList.add("hidden");
  const anyOpen =
    !document.getElementById("modal-donation").classList.contains("hidden") ||
    !document.getElementById("modal-checkout").classList.contains("hidden");
  if (!anyOpen) document.body.classList.remove("modal-open");
}

function initModals() {
  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => closeModal(el.dataset.closeModal));
  });

  document.getElementById("btn-checkout").addEventListener("click", () => {
    if (getSelectedTickets().length === 0) return;
    openModal("checkout");
  });

  document.getElementById("checkout-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const selected = getSelectedTickets();
    if (selected.length === 0) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Procesando…";

    const payload = {
      nombre: document.getElementById("checkout-name").value.trim(),
      telefono: document.getElementById("checkout-phone").value.trim(),
      instagram: document.getElementById("checkout-instagram").value.trim(),
      boletos: selected.map((t) => ({
        id: t.id,
        numero: formatTicketId(t.id),
      })),
      total: selected.length * TICKET_PRICE,
      precioUnitario: TICKET_PRICE,
    };

    try {
      const orderId = await createOrder(payload);
      console.log("[web-rifa] Pedido creado:", orderId, payload);
      selectedIds.clear();
      alert(
        `¡Gracias! Tu pedido fue registrado (ref. ${orderId.slice(0, 8)}…). Realiza el SINPE y te contactaremos para confirmar.`
      );
      closeModal("checkout");
      e.target.reset();
      renderGrid();
      renderCart();
    } catch (err) {
      console.error("[web-rifa] Error al crear pedido:", err);
      alert(err.message || "No se pudo completar la reserva. Intenta de nuevo.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

function initMobileCart() {
  const panel = document.getElementById("cart-panel");
  const fab = document.getElementById("cart-fab");
  const closeBtn = document.getElementById("cart-toggle-mobile");

  fab.addEventListener("click", () => {
    panel.classList.remove("translate-y-full");
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.add("translate-y-full");
  });
}

// =========================================================================
// === INIT ===
// =========================================================================

document.getElementById("year").textContent = new Date().getFullYear();
initDonation();
initModals();
initMobileCart();
initFirebaseTickets();

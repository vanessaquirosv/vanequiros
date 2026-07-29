// ═══════════════════════════════════════════════════════════════
// Tech & Chic — estado del carrito
// Invitados: localStorage. Con sesión: se sincroniza al servidor
// (Apps Script) además de mantener la copia local.
// Ítem: { code, color, qty }
// ═══════════════════════════════════════════════════════════════

const KEY = 'tc_cart';

function read() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(arr) ? arr.filter(i => i && i.code && i.qty > 0) : [];
  } catch { return []; }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('tc:cart-changed', { detail: { items } }));
}

export function getCart() { return read(); }

export function cartCount() {
  return read().reduce((n, i) => n + i.qty, 0);
}

export function addToCart(code, qty = 1, color = '') {
  const items = read();
  const found = items.find(i => i.code === code && (i.color || '') === (color || ''));
  if (found) found.qty = Math.min(99, found.qty + qty);
  else items.push({ code, color: color || '', qty: Math.min(99, qty) });
  write(items);
}

export function setQty(code, color, qty) {
  let items = read();
  const found = items.find(i => i.code === code && (i.color || '') === (color || ''));
  if (!found) return;
  found.qty = Math.max(0, Math.min(99, qty));
  items = items.filter(i => i.qty > 0);
  write(items);
}

export function removeFromCart(code, color) {
  write(read().filter(i => !(i.code === code && (i.color || '') === (color || ''))));
}

export function clearCart() { write([]); }

/** Reemplaza el carrito completo (p. ej. al recuperar el del servidor). */
export function replaceCart(items) {
  write((items || []).filter(i => i && i.code && i.qty > 0));
}

/** Combina el carrito local con el del servidor (suma cantidades). */
export function mergeCart(serverItems) {
  const items = read();
  for (const s of serverItems || []) {
    if (!s || !s.code || !(s.qty > 0)) continue;
    const found = items.find(i => i.code === s.code && (i.color || '') === (s.color || ''));
    if (found) found.qty = Math.min(99, Math.max(found.qty, s.qty));
    else items.push({ code: s.code, color: s.color || '', qty: Math.min(99, s.qty) });
  }
  write(items);
  return items;
}

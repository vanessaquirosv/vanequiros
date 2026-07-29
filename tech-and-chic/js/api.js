// ═══════════════════════════════════════════════════════════════
// Tech & Chic — cliente del backend (Google Apps Script)
// Si TC_CONFIG.appsScriptUrl está vacío se activa un MODO DEMO
// local (todo se guarda en este navegador) para poder probar la
// página completa sin infraestructura.
// ═══════════════════════════════════════════════════════════════
import { TC_CONFIG } from './tc-config.js';
import { loadCatalog } from './catalog.js';
import { computeOperationalCost, discountedPrice } from './pricing.js';

export const ORDER_STATUSES = [
  'Pendiente de confirmación',
  'Solicitando al almacén',
  'Recibiendo Productos',
  'Coordinando Envío o Retirada',
  'Entrega Completada',
];

export const STATUS_NOTES = {
  'Pendiente de confirmación': 'Recibimos tu orden. Te confirmaremos por WhatsApp o Instagram.',
  'Solicitando al almacén': 'Estamos verificando la disponibilidad de cada producto con el almacén.',
  'Recibiendo Productos': 'Productos solicitados. Este paso puede tardar entre 1 y 2 días.',
  'Coordinando Envío o Retirada': 'Estamos coordinando contigo la mejor hora y forma de entrega.',
  'Entrega Completada': '¡Entregado! Gracias por comprar en Tech & Chic.',
};

// ── Sesión ──────────────────────────────────────────────────────
const SESSION_KEY = 'tc_session';

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}
export function setSession(token, user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
  window.dispatchEvent(new CustomEvent('tc:auth-changed', { detail: { user } }));
}
export function updateSessionUser(user) {
  const s = getSession();
  if (s) setSession(s.token, user);
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('tc:auth-changed', { detail: { user: null } }));
}

export function isDemoBackend() { return !TC_CONFIG.appsScriptUrl; }

// ── Llamada genérica ────────────────────────────────────────────
export async function api(action, data = {}) {
  if (isDemoBackend()) return mockApi(action, data);

  const session = getSession();
  const res = await fetch(TC_CONFIG.appsScriptUrl, {
    method: 'POST',
    // text/plain evita el preflight CORS con Apps Script
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: session?.token || '', data }),
  });
  if (!res.ok) throw new Error(`Error de red (${res.status})`);
  const out = await res.json();
  if (!out || out.ok !== true) throw new Error(out?.error || 'Error del servidor');
  return out;
}

// ═══════════════════════════════════════════════════════════════
// MODO DEMO (sin Apps Script): simula el backend en localStorage.
// La lógica replica lo que hará el Apps Script real.
// ═══════════════════════════════════════════════════════════════

const DB_ORDERS = 'tc_demo_orders';
const DB_USERS = 'tc_demo_users';
const DB_REVIEWS = 'tc_demo_reviews';

const dbRead = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch { return {}; } };
const dbWrite = (k, v) => localStorage.setItem(k, JSON.stringify(v));

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randCode(len = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  const rnd = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += chars[rnd[i] % chars.length];
  return out;
}

/** Precio efectivo (con descuento) y diferencia de un producto del catálogo. */
function priceInfo(prod) {
  const price = discountedPrice(prod.price, prod.discountPct);
  // `almacen` solo existe en el catálogo demo; en producción esto lo sabe el servidor.
  const almacen = typeof prod.almacen === 'number' ? prod.almacen : null;
  return { price, dif: almacen == null ? null : Math.max(0, price - almacen) };
}

async function resolveItems(items) {
  const cat = await loadCatalog();
  const out = [];
  for (const it of items || []) {
    const prod = cat.products.find(p => p.code === it.code);
    if (!prod) continue;
    const { price, dif } = priceInfo(prod);
    out.push({
      code: prod.code,
      name: prod.name,
      color: it.color || '',
      qty: Math.max(1, Math.min(99, it.qty || 1)),
      unitPrice: price,
      dif,
    });
  }
  return out;
}

function quoteFromItems(items) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const difs = items.map(i => i.dif);
  const difTotal = difs.some(d => d == null)
    ? null
    : items.reduce((s, i) => s + i.dif * i.qty, 0);
  const opCost = difTotal == null ? null : computeOperationalCost(difTotal);
  return { subtotal, opCost, total: opCost == null ? subtotal : subtotal + opCost };
}

/** Busca el usuario de la sesión DENTRO del mapa dado (misma referencia que se persiste). */
function currentMockUser(users) {
  const s = getSession();
  if (!s?.token) return null;
  return Object.values(users).find(u => u.token === s.token) || null;
}

function publicUser(u) {
  return {
    id: u.id, usuario: u.usuario, nombre: u.nombre, email: u.email,
    direccion: u.direccion || '', fotoUrl: u.fotoUrl || '',
  };
}

async function mockApi(action, data) {
  // pequeña latencia para que la UX (spinners) sea realista
  await new Promise(r => setTimeout(r, 220));
  const users = dbRead(DB_USERS);
  const orders = dbRead(DB_ORDERS);
  const reviews = dbRead(DB_REVIEWS);

  switch (action) {
    // ── Carrito / órdenes ──
    case 'quoteCart': {
      const items = await resolveItems(data.items);
      return { ok: true, items, ...quoteFromItems(items) };
    }

    case 'createOrder': {
      const items = await resolveItems(data.items);
      if (!items.length) throw new Error('El carrito está vacío.');
      const q = quoteFromItems(items);
      let code;
      do { code = 'TC-' + randCode(6); } while (orders[code]);
      const user = currentMockUser(users);
      const order = {
        code,
        createdAt: new Date().toISOString(),
        canal: data.canal || 'WhatsApp',
        buyer: {
          nombre: data.buyer?.nombre || user?.nombre || '',
          direccion: data.buyer?.direccion || user?.direccion || '',
          userId: user?.id || '',
        },
        items: items.map(i => ({
          code: i.code, name: i.name, color: i.color, qty: i.qty,
          unitPrice: i.unitPrice, subEstado: '',
        })),
        subtotal: q.subtotal,
        opCost: q.opCost,
        total: q.total,
        status: ORDER_STATUSES[0],
        history: [{ status: ORDER_STATUSES[0], at: new Date().toISOString() }],
      };
      orders[code] = order;
      dbWrite(DB_ORDERS, orders);
      return { ok: true, code, order };
    }

    case 'getOrder': {
      const code = String(data.code || '').trim().toUpperCase();
      const order = orders[code];
      if (!order) throw new Error('No encontramos ninguna compra con ese código.');
      return { ok: true, order };
    }

    case 'getMyOrders': {
      const user = currentMockUser(users);
      if (!user) throw new Error('Sesión expirada. Inicia sesión de nuevo.');
      const mine = Object.values(orders)
        .filter(o => o.buyer?.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { ok: true, orders: mine };
    }

    // ── Cuentas ──
    case 'register': {
      const { usuario, nombre, email, password } = data;
      if (!usuario || !nombre || !email || !password) throw new Error('Completa todos los campos.');
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      const uNorm = usuario.trim().toLowerCase();
      const eNorm = email.trim().toLowerCase();
      if (Object.values(users).some(u => u.usuario.toLowerCase() === uNorm)) throw new Error('Ese nombre de usuario ya existe.');
      if (Object.values(users).some(u => u.email.toLowerCase() === eNorm)) throw new Error('Ya existe una cuenta con ese email.');
      const id = 'U' + Date.now().toString(36);
      const salt = randCode(8);
      const user = {
        id, usuario: usuario.trim(), nombre: nombre.trim(), email: email.trim(),
        direccion: data.direccion || '', fotoUrl: '',
        salt, hash: await sha256(salt + password),
        token: 'tok_' + randCode(20),
        createdAt: new Date().toISOString(),
        cart: [],
      };
      users[id] = user;
      dbWrite(DB_USERS, users);
      setSession(user.token, publicUser(user));
      return { ok: true, token: user.token, user: publicUser(user) };
    }

    case 'login': {
      const idNorm = String(data.id || '').trim().toLowerCase();
      const user = Object.values(users).find(u =>
        u.email.toLowerCase() === idNorm || u.usuario.toLowerCase() === idNorm);
      if (!user) throw new Error('Usuario o contraseña incorrectos.');
      const hash = await sha256(user.salt + (data.password || ''));
      if (hash !== user.hash) throw new Error('Usuario o contraseña incorrectos.');
      user.token = 'tok_' + randCode(20);
      dbWrite(DB_USERS, users);
      setSession(user.token, publicUser(user));
      return { ok: true, token: user.token, user: publicUser(user) };
    }

    case 'logout': {
      const user = currentMockUser(users);
      if (user) { user.token = ''; dbWrite(DB_USERS, users); }
      clearSession();
      return { ok: true };
    }

    case 'updateProfile': {
      const user = currentMockUser(users);
      if (!user) throw new Error('Sesión expirada. Inicia sesión de nuevo.');
      const { field, value } = data;
      if (field === 'usuario') {
        const v = String(value || '').trim();
        if (!v) throw new Error('El nombre de usuario no puede estar vacío.');
        if (Object.values(users).some(u => u.id !== user.id && u.usuario.toLowerCase() === v.toLowerCase()))
          throw new Error('Ese nombre de usuario ya existe.');
        user.usuario = v;
      } else if (field === 'nombre') {
        if (!String(value || '').trim()) throw new Error('El nombre no puede estar vacío.');
        user.nombre = String(value).trim();
      } else if (field === 'email') {
        const v = String(value || '').trim();
        if (!/.+@.+\..+/.test(v)) throw new Error('Email inválido.');
        if (Object.values(users).some(u => u.id !== user.id && u.email.toLowerCase() === v.toLowerCase()))
          throw new Error('Ya existe una cuenta con ese email.');
        user.email = v;
      } else if (field === 'direccion') {
        user.direccion = String(value || '').trim();
      } else if (field === 'fotoUrl') {
        user.fotoUrl = String(value || '').trim();
      } else {
        throw new Error('Campo desconocido.');
      }
      dbWrite(DB_USERS, users);
      updateSessionUser(publicUser(user));
      return { ok: true, user: publicUser(user) };
    }

    case 'changePassword': {
      const user = currentMockUser(users);
      if (!user) throw new Error('Sesión expirada. Inicia sesión de nuevo.');
      const curHash = await sha256(user.salt + (data.current || ''));
      if (curHash !== user.hash) throw new Error('La contraseña actual no es correcta.');
      if (!data.next || data.next.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
      user.salt = randCode(8);
      user.hash = await sha256(user.salt + data.next);
      dbWrite(DB_USERS, users);
      return { ok: true };
    }

    // ── Carrito en servidor ──
    case 'saveCart': {
      const user = currentMockUser(users);
      if (!user) return { ok: true }; // sin sesión no aplica
      user.cart = data.items || [];
      dbWrite(DB_USERS, users);
      return { ok: true };
    }

    case 'getCart': {
      const user = currentMockUser(users);
      if (!user) throw new Error('Sesión expirada.');
      return { ok: true, items: user.cart || [] };
    }

    // ── Reseñas ──
    case 'addReview': {
      const user = currentMockUser(users);
      if (!user) throw new Error('Necesitas una cuenta para escribir reseñas.');
      const stars = Math.max(1, Math.min(5, Number(data.stars) || 0));
      const list = reviews[data.productCode] || [];
      const existing = list.find(r => r.userId === user.id);
      const rev = {
        userId: user.id, usuario: user.usuario, stars,
        text: String(data.text || '').slice(0, 600),
        at: new Date().toISOString(),
      };
      if (existing) Object.assign(existing, rev);
      else list.push(rev);
      reviews[data.productCode] = list;
      dbWrite(DB_REVIEWS, reviews);
      return { ok: true, reviews: list };
    }

    case 'getReviews': {
      return { ok: true, reviews: reviews[data.productCode] || [] };
    }

    default:
      throw new Error(`Acción desconocida: ${action}`);
  }
}

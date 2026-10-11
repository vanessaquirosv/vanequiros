// ═══════════════════════════════════════════════════════════════
// Tech & Chic — punto de entrada de la SPA
// Router por hash: el header y el footer NUNCA se recargan,
// solo se intercambia el contenido de <main id="view">.
// ═══════════════════════════════════════════════════════════════
import { TC_CONFIG } from './tc-config.js';
import { loadCatalog, catalogCategories, deptIcon } from './catalog.js';
import { cartCount } from './cart-state.js';
import { initAuth, openAccountSheet } from './auth.js';
import { openModal, escapeHtml } from './modals.js';
import { parseHash, storeHref } from './route.js';
import { initPwa } from './pwa.js';

const ROUTES = {
  inicio:   () => import('./views/home.js').then(m => m.renderHome),
  tienda:   () => import('./views/store.js').then(m => m.renderStore),
  producto: () => import('./views/product.js').then(m => m.renderProduct),
  carrito:  () => import('./views/cart.js').then(m => m.renderCart),
  compras:  () => import('./views/orders.js').then(m => m.renderOrders),
};

// pestaña del menú que se ilumina en cada ruta
const NAV_OF = { producto: 'tienda' };

const DEFAULT_TITLE = document.title;

function currentRoute() {
  const { route } = parseHash();
  return ROUTES[route] ? route : 'inicio';
}

/** Texto buscado según la URL (#/tienda?q=…). La URL es la fuente de verdad. */
export function currentQuery() {
  return parseHash().params.get('q') || '';
}

/** Deja los buscadores del header mostrando lo que dice la URL. */
function syncSearchInputs() {
  const q = currentRoute() === 'tienda' ? currentQuery() : '';
  document.querySelectorAll('[data-hdr-search]').forEach(i => { i.value = q; });
}

// ── Posición del scroll al volver atrás ─────────────────────────
// Cada entrada del historial recibe un número. Al navegar se anota
// dónde estaba la vista que se deja; si la entrada a la que se llega
// ya tenía número, es "atrás/adelante" → se restaura ese scroll
// (p. ej. volver de un producto a la misma altura de la página 3).
const scrollByEntry = new Map();
let entrySeq = 0;
let shownEntry = null;

function markEntry() {
  if (history.state?.tcEntry) return { entry: history.state.tcEntry, traversal: true };
  const entry = `${Date.now()}-${++entrySeq}`;
  history.replaceState({ ...(history.state || {}), tcEntry: entry }, '');
  return { entry, traversal: false };
}

/** ¿Hay una vista anterior de esta tienda a la cual volver con "atrás"? */
export function canGoBack() { return entrySeq > 1; }

let renderSeq = 0;

async function render() {
  const route = currentRoute();
  const view = document.getElementById('view');
  const seq = ++renderSeq;
  if (shownEntry) scrollByEntry.set(shownEntry, window.scrollY);   // la vista que se deja
  const { entry, traversal } = markEntry();
  shownEntry = entry;
  // se lee antes de vaciar la vista: el scroll a 0 lo sobrescribiría
  const savedY = traversal ? scrollByEntry.get(entry) : undefined;

  document.title = DEFAULT_TITLE;
  const nav = NAV_OF[route] || route;
  document.querySelectorAll('[data-nav]').forEach(a =>
    a.classList.toggle('active', a.dataset.nav === nav));
  syncSearchInputs();
  updateDeptBar();

  view.innerHTML = '<div class="flex justify-center py-24"><span class="tc-spinner tc-spinner-lg"></span></div>';
  window.scrollTo({ top: 0 });
  try {
    const renderer = await ROUTES[route]();
    if (seq !== renderSeq) return; // el usuario ya navegó a otra vista
    await renderer(view);
    if (seq !== renderSeq) return;
    if (savedY) window.scrollTo({ top: savedY });
  } catch (err) {
    console.error('[app] error renderizando vista', route, err);
    if (seq !== renderSeq) return;
    view.innerHTML = `
      <div class="text-center py-20">
        <p class="text-4xl mb-3">😵</p>
        <p class="text-neutral-300 font-medium">Algo salió mal cargando esta sección.</p>
        <button type="button" class="tc-btn-secondary mt-4" onclick="location.reload()">Recargar página</button>
      </div>`;
  }
}

// ── Altura real del header ──────────────────────────────────────
// El header lleva la barra de departamentos, así que su alto cambia.
// La barra de filtros de Tienda se pega justo debajo usando este valor.
function initHeaderHeight() {
  const header = document.querySelector('header');
  if (!header) return;
  const sync = () => document.documentElement.style.setProperty('--tc-header-h', `${header.offsetHeight}px`);
  sync();
  if (window.ResizeObserver) new ResizeObserver(sync).observe(header);
  else window.addEventListener('resize', sync);
}

// ── Buscador del header ─────────────────────────────────────────
/** Cualquier búsqueda lleva a Tienda, en todos los departamentos. */
function goSearch(raw) {
  const q = String(raw || '').trim();
  const target = storeHref({ q });
  if (location.hash === target) render();   // misma URL: hashchange no dispara
  else location.hash = target;
}

function initHeaderSearch() {
  document.querySelectorAll('.tc-hdr-search').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('[data-hdr-search]');
      input.blur();                          // cierra el teclado en móvil
      goSearch(input.value);
    });
  });

  // la "x" del type=search limpia la búsqueda al instante
  document.querySelectorAll('[data-hdr-search]').forEach(i => i.addEventListener('search', () => {
    if (!i.value.trim() && currentQuery()) goSearch('');
  }));
}

// ── Barra de departamentos ──────────────────────────────────────
// Navegación principal. Sin búsqueda, cada departamento abre su
// sección; con búsqueda, filtra los resultados y muestra cuántos
// hay en cada uno (los cuenta la vista Tienda).
let deptList = [];
let deptCounts = null;   // Map dep → n mientras hay una búsqueda activa

async function initDeptBar() {
  try {
    deptList = catalogCategories(await loadCatalog());
  } catch { deptList = []; }
  updateDeptBar();
}

function updateDeptBar() {
  const track = document.querySelector('[data-dept-track]');
  if (!track) return;
  if (!deptList.length) { track.parentElement.classList.add('hidden'); return; }
  track.parentElement.classList.remove('hidden');

  const { route, params } = parseHash();
  const inStore = route === 'tienda';
  const q = inStore ? (params.get('q') || '') : '';
  const dep = inStore ? (params.get('dep') || '') : '';
  const counts = q ? deptCounts : null;
  const total = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : null;

  const chip = (name, label, icon) => {
    const n = counts ? (name ? counts.get(name) || 0 : total) : null;
    const active = inStore && dep === name;
    return `<a href="${storeHref({ q, dep: name })}" class="tc-dept ${active ? 'active' : ''} ${n === 0 ? 'empty' : ''}"
              ${active ? 'aria-current="page"' : ''}>
        ${icon ? `<span aria-hidden="true">${icon}</span>` : ''}<span>${escapeHtml(label)}</span>
        ${n != null ? `<span class="tc-dept-n">${n}</span>` : ''}
      </a>`;
  };

  track.innerHTML =
    chip('', q ? 'Todos los resultados' : 'Todo', '✨') +
    deptList.map(d => chip(d.name, d.name, deptIcon(d.name))).join('');

  // el departamento activo siempre queda a la vista en la barra
  const act = track.querySelector('.tc-dept.active');
  if (act) track.scrollTo({ left: act.offsetLeft - track.clientWidth / 2 + act.clientWidth / 2, behavior: 'smooth' });
}

// ── Insignia del carrito ────────────────────────────────────────
function updateCartBadge() {
  const n = cartCount();
  document.querySelectorAll('[data-cart-badge]').forEach(el => {
    el.textContent = n > 99 ? '99+' : String(n);
    el.classList.toggle('hidden', n === 0);
  });
}

// ── Footer dinámico ─────────────────────────────────────────────
async function fillFooter() {
  const igLink = document.getElementById('footerIg');
  const waLink = document.getElementById('footerWa');
  if (igLink) igLink.href = `https://www.instagram.com/${TC_CONFIG.instagramUser}`;
  if (waLink) waLink.href = `https://wa.me/${TC_CONFIG.whatsappNumber}`;

  try {
    const cat = await loadCatalog();
    const wrap = document.getElementById('footerCats');
    if (!wrap) return;
    const cats = catalogCategories(cat);
    wrap.innerHTML = cats.length
      ? cats.map(c => `
          <div>
            <a href="${storeHref({ dep: c.name })}" class="tc-footer-link font-semibold !text-neutral-200">${escapeHtml(c.name)}</a>
            ${c.subs.slice(0, 4).map(s => `<a href="${storeHref({ dep: c.name, sub: s })}" class="tc-footer-link block mt-1 !text-[0.8rem]">${escapeHtml(s)}</a>`).join('')}
          </div>`).join('')
      : '<p class="text-sm text-neutral-600">Muy pronto más departamentos.</p>';
  } catch { /* footer sin categorías */ }
}

// ── Términos y condiciones ──────────────────────────────────────
function openTerms() {
  openModal(`
    <div class="pt-2">
      <h2 class="font-serif text-2xl font-semibold text-white">Términos y condiciones</h2>
      <div class="mt-4 space-y-3 text-sm text-neutral-400 leading-relaxed">
        <p><span class="text-neutral-200 font-medium">1. Sobre las órdenes.</span> Las compras se coordinan por WhatsApp o Instagram. Toda orden queda sujeta a confirmación de disponibilidad con nuestro almacén antes de concretarse.</p>
        <p><span class="text-neutral-200 font-medium">2. Pagos.</span> El pago se realiza por SINPE Móvil según las instrucciones que se envían por WhatsApp una vez confirmada la disponibilidad. Tech &amp; Chic no solicita ni almacena datos de tarjetas ni credenciales bancarias.</p>
        <p><span class="text-neutral-200 font-medium">3. Precios.</span> Los precios están expresados en colones costarricenses (₡) e incluyen el margen de servicio. El costo operativo del pedido se muestra en el carrito antes de ordenar.</p>
        <p><span class="text-neutral-200 font-medium">4. Entregas.</span> Los tiempos de entrega se coordinan directamente con cada cliente. La etapa de recepción de productos puede tardar entre 1 y 2 días hábiles.</p>
        <p><span class="text-neutral-200 font-medium">5. Datos personales.</span> Los datos que nos compartes (nombre, contacto, dirección) se usan únicamente para gestionar tus pedidos y nunca se comparten con terceros.</p>
        <p><span class="text-neutral-200 font-medium">6. Cuentas.</span> Crear una cuenta es opcional. Puedes solicitar la modificación o eliminación de tu información escribiéndonos por WhatsApp o Instagram.</p>
      </div>
    </div>`);
}

// ── Inicio ──────────────────────────────────────────────────────
function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('footerTerms')?.addEventListener('click', openTerms);
  document.getElementById('tabAccount')?.addEventListener('click', openAccountSheet);

  window.addEventListener('hashchange', render);
  window.addEventListener('tc:cart-changed', updateCartBadge);
  // al iniciar/cerrar sesión, la vista actual puede cambiar (historial, reseñas…)
  window.addEventListener('tc:auth-changed', render);
  // la Tienda informa cuántos resultados de la búsqueda hay por departamento
  window.addEventListener('tc:dept-counts', (e) => { deptCounts = e.detail; updateDeptBar(); });

  initPwa();
  initAuth();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  initHeaderHeight();
  initHeaderSearch();
  initDeptBar();
  updateCartBadge();
  fillFooter();
  render();
}

init();

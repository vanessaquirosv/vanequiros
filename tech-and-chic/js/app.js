// ═══════════════════════════════════════════════════════════════
// Tech & Chic — punto de entrada de la SPA
// Router por hash: el header y el footer NUNCA se recargan,
// solo se intercambia el contenido de <main id="view">.
// ═══════════════════════════════════════════════════════════════
import { TC_CONFIG } from './tc-config.js';
import { loadCatalog, catalogCategories } from './catalog.js';
import { cartCount } from './cart-state.js';
import { initAuth } from './auth.js';
import { openModal } from './modals.js';

const ROUTES = {
  inicio:  () => import('./views/home.js').then(m => m.renderHome),
  tienda:  () => import('./views/store.js').then(m => m.renderStore),
  carrito: () => import('./views/cart.js').then(m => m.renderCart),
  compras: () => import('./views/orders.js').then(m => m.renderOrders),
};

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
  return ROUTES[hash] ? hash : 'inicio';
}

let renderSeq = 0;

async function render() {
  const route = currentRoute();
  const view = document.getElementById('view');
  const seq = ++renderSeq;

  // marcar pestaña activa (desktop y móvil)
  document.querySelectorAll('[data-nav]').forEach(a =>
    a.classList.toggle('active', a.dataset.nav === route));

  // cerrar menú móvil al navegar
  document.getElementById('mobileMenu')?.classList.add('hidden');

  view.innerHTML = '<div class="flex justify-center py-24"><span class="tc-spinner tc-spinner-lg"></span></div>';
  try {
    const renderer = await ROUTES[route]();
    if (seq !== renderSeq) return; // el usuario ya navegó a otra vista
    await renderer(view);
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
  window.scrollTo({ top: 0 });
}

// ── Insignia del carrito ────────────────────────────────────────
function updateCartBadge() {
  const n = cartCount();
  for (const id of ['cartBadge', 'cartBadgeMobile']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.textContent = n > 99 ? '99+' : String(n);
    el.classList.toggle('hidden', n === 0);
  }
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
            <a href="#/tienda" class="tc-footer-link font-semibold !text-neutral-200">${c.name}</a>
            ${c.subs.slice(0, 4).map(s => `<a href="#/tienda" class="tc-footer-link block mt-1 !text-[0.8rem]">${s}</a>`).join('')}
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

  // menú móvil
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn?.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('hidden');
    menuBtn.setAttribute('aria-expanded', String(!open));
  });

  document.getElementById('footerTerms')?.addEventListener('click', openTerms);

  window.addEventListener('hashchange', render);
  window.addEventListener('tc:cart-changed', updateCartBadge);
  // al iniciar/cerrar sesión, la vista actual puede cambiar (historial, reseñas…)
  window.addEventListener('tc:auth-changed', render);

  initAuth();
  updateCartBadge();
  fillFooter();
  render();
}

init();

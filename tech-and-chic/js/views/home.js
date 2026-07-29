// ═══════════════════════════════════════════════════════════════
// Tech & Chic — vista Inicio
// Guía de compra + artículos Hot + promociones (configurables
// desde el programa de administración vía catálogo publicado).
// ═══════════════════════════════════════════════════════════════
import { loadCatalog } from '../catalog.js';
import { productCard } from '../product-card.js';
import { discountedPrice } from '../pricing.js';
import { fmtCRC } from '../tc-config.js';
import { escapeHtml } from '../modals.js';

const STEPS = [
  {
    icon: `<svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.34-4.34M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>`,
    title: '1 · Explora',
    text: 'Navega la Tienda, usa los filtros o el buscador y descubre lo que te encanta.',
  },
  {
    icon: `<svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2 5h14M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>`,
    title: '2 · Agrega al carrito',
    text: 'Elige color y cantidad. No necesitas crear una cuenta para comprar.',
  },
  {
    icon: `<svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h8m-8 4h5m-8.6 6.4L3 21l.6-3.4A9 9 0 1 1 7.4 20.4Z"/></svg>`,
    title: '3 · Ordena por WhatsApp o Instagram',
    text: 'Desde el carrito se genera tu mensaje automático con el código de tu orden.',
  },
  {
    icon: `<svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
    title: '4 · Paga por SINPE y recibe',
    text: 'Te confirmamos disponibilidad, te enviamos las instrucciones de SINPE y coordinamos la entrega. Sigue tu compra con tu código en la pestaña Compras.',
  },
];

export async function renderHome(view) {
  view.innerHTML = `
    <div class="tc-fade-in">
      <!-- Hero -->
      <section class="text-center pt-4 pb-10">
        <h1 class="font-serif text-4xl sm:text-5xl font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent tc-hero-title">
          Tech &amp; Chic
        </h1>
        <p class="mt-3 text-violet-300/80 text-xs sm:text-sm uppercase tracking-[0.3em]">Innovación con estilo</p>
        <p class="mt-5 max-w-xl mx-auto text-neutral-400 leading-relaxed text-sm sm:text-base">
          Tecnología, accesorios y detalles con estilo, seleccionados para ti.
          Comprar es fácil: sin cuentas obligatorias, sin tarjetas en línea — ordenas por WhatsApp o Instagram y pagas por SINPE.
        </p>
        <div class="mt-7 flex items-center justify-center gap-3">
          <a href="#/tienda" class="tc-btn-primary">Ir a la Tienda</a>
          <a href="#/compras" class="tc-btn-secondary">Rastrear mi compra</a>
        </div>
      </section>

      <!-- Cómo comprar -->
      <section class="py-8">
        <div class="flex flex-col items-center">
          <h2 class="tc-section-title">¿Cómo comprar?</h2>
          <div class="tc-title-rule mt-2"></div>
        </div>
        <div class="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${STEPS.map(s => `
            <div class="tc-panel p-5 text-center">
              <div class="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-fuchsia-300 bg-gradient-to-br from-violet-600/25 to-fuchsia-500/15 border border-violet-500/20">
                ${s.icon}
              </div>
              <h3 class="mt-3 font-semibold text-neutral-100 text-sm">${s.title}</h3>
              <p class="mt-1.5 text-xs text-neutral-400 leading-relaxed">${s.text}</p>
            </div>`).join('')}
        </div>
      </section>

      <!-- Hot -->
      <section id="homeHot" class="py-8 hidden">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="tc-section-title">🔥 Lo más Hot</h2>
            <div class="tc-title-rule mt-2"></div>
          </div>
          <a href="#/tienda" class="tc-btn-ghost shrink-0">Ver todo →</a>
        </div>
        <div id="homeHotGrid" class="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"></div>
      </section>

      <!-- Combos -->
      <section id="homeCombos" class="py-8 hidden">
        <div>
          <h2 class="tc-section-title">✨ Combos y ofertas exclusivas</h2>
          <div class="tc-title-rule mt-2"></div>
        </div>
        <div id="homeCombosGrid" class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"></div>
      </section>

      <!-- Promociones -->
      <section id="homePromos" class="py-8 hidden">
        <div class="flex items-end justify-between gap-4">
          <div>
            <h2 class="tc-section-title">% Promociones</h2>
            <div class="tc-title-rule mt-2"></div>
          </div>
          <a href="#/tienda" class="tc-btn-ghost shrink-0">Ver todo →</a>
        </div>
        <div id="homePromosGrid" class="mt-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"></div>
      </section>
    </div>`;

  const cat = await loadCatalog();
  if (!view.isConnected) return;

  const byCode = (code) => cat.products.find(p => p.code === code);
  const home = cat.home || {};

  // Hot
  const hot = (home.hot || []).map(byCode).filter(Boolean);
  if (hot.length) {
    view.querySelector('#homeHot').classList.remove('hidden');
    const grid = view.querySelector('#homeHotGrid');
    hot.slice(0, 8).forEach(p => grid.appendChild(productCard(p)));
  }

  // Promos
  const promos = (home.promos || []).map(byCode).filter(p => p && p.discountPct > 0);
  if (promos.length) {
    view.querySelector('#homePromos').classList.remove('hidden');
    const grid = view.querySelector('#homePromosGrid');
    promos.slice(0, 8).forEach(p => grid.appendChild(productCard(p)));
  }

  // Combos (paquetes armados desde el admin)
  const combos = home.combos || [];
  if (combos.length) {
    view.querySelector('#homeCombos').classList.remove('hidden');
    const grid = view.querySelector('#homeCombosGrid');
    combos.forEach(combo => grid.appendChild(comboCard(combo, byCode)));
  }
}

/** Tarjeta de combo: paquete con precio especial (se ordena como un solo ítem). */
function comboCard(combo, byCode) {
  const el = document.createElement('article');
  el.className = 'tc-card tc-fade-in';
  const items = (combo.items || []).map(i => ({ prod: byCode(i.code), qty: i.qty || 1 })).filter(x => x.prod);
  const regular = items.reduce((s, x) => s + discountedPrice(x.prod.price, x.prod.discountPct) * x.qty, 0);

  el.innerHTML = `
    <div class="p-5 flex flex-col h-full">
      <span class="tc-badge-promo !static self-start">Combo</span>
      <h3 class="mt-2 font-serif text-lg font-semibold text-white">${escapeHtml(combo.name || 'Combo especial')}</h3>
      ${combo.desc ? `<p class="mt-1 text-sm text-neutral-400">${escapeHtml(combo.desc)}</p>` : ''}
      <ul class="mt-3 space-y-1">
        ${items.map(x => `<li class="text-sm text-neutral-300 flex gap-2"><span class="text-fuchsia-400">▸</span>${x.qty}× ${escapeHtml(x.prod.name)}</li>`).join('')}
      </ul>
      <div class="mt-4 flex items-center justify-between gap-3">
        <div>
          <span class="text-xl font-bold text-white">${fmtCRC(combo.price || regular)}</span>
          ${combo.price && combo.price < regular ? `<span class="tc-price-old ml-1.5">${fmtCRC(regular)}</span>` : ''}
        </div>
        <button type="button" class="tc-btn-primary !px-4 !py-2 !text-sm" data-combo-add>Agregar combo</button>
      </div>
    </div>`;

  el.querySelector('[data-combo-add]').addEventListener('click', async () => {
    const { addToCart } = await import('../cart-state.js');
    const { toast } = await import('../modals.js');
    // el combo existe como pseudo-producto en el catálogo → una sola línea
    // en el carrito con su precio especial
    if (combo.code && byCode(combo.code)) {
      addToCart(combo.code, 1, '');
    } else {
      items.forEach(x => addToCart(x.prod.code, x.qty, '')); // respaldo (catálogos viejos)
    }
    toast('Combo agregado al carrito', 'success');
  });

  return el;
}

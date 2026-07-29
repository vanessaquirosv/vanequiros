// ═══════════════════════════════════════════════════════════════
// Tech & Chic — tarjeta de producto reutilizable (Inicio y Tienda)
// ═══════════════════════════════════════════════════════════════
import { addToCart } from './cart-state.js';
import { openProductModal, toast, priceHtml, productImg, imgOrPlaceholder, escapeHtml } from './modals.js';

/**
 * Crea el elemento de una tarjeta de producto con selector de
 * cantidad + botón de carrito (requisito del cliente).
 */
export function productCard(prod) {
  const card = document.createElement('article');
  card.className = 'tc-card tc-fade-in';
  const colors = prod.colors || [];

  card.innerHTML = `
    ${prod.hot ? '<span class="tc-badge-hot">🔥 Hot</span>' : ''}
    ${prod.discountPct > 0 ? `<span class="tc-badge-promo">-${prod.discountPct}%</span>` : ''}
    <button type="button" data-open class="text-left group">
      ${imgOrPlaceholder(productImg(prod), 'w-full', prod.name)}
    </button>
    <div class="flex flex-col flex-1 p-4">
      <p class="text-[11px] uppercase tracking-wider text-violet-400/70">${escapeHtml(prod.brand || '')}</p>
      <button type="button" data-open class="mt-0.5 text-left text-sm font-semibold text-neutral-100 leading-snug hover:text-fuchsia-300 transition-colors line-clamp-2">
        ${escapeHtml(prod.name)}
      </button>
      ${colors.length ? `
        <div class="mt-2 flex items-center gap-1.5">
          ${colors.slice(0, 5).map(c => `<span class="inline-block h-3.5 w-3.5 rounded-full border border-white/20" title="${escapeHtml(c.name)}" style="background:${c.hex || '#666'}"></span>`).join('')}
          ${colors.length > 5 ? `<span class="text-[10px] text-neutral-500">+${colors.length - 5}</span>` : ''}
        </div>` : ''}
      <div class="mt-2.5">${priceHtml(prod)}</div>
      <div class="mt-auto pt-3 flex items-center gap-2">
        <div class="tc-qty scale-90 origin-left">
          <button type="button" data-qty="-1" aria-label="Menos">−</button>
          <input type="number" min="1" max="99" value="1" aria-label="Cantidad">
          <button type="button" data-qty="1" aria-label="Más">+</button>
        </div>
        <button type="button" data-add class="tc-btn-primary !px-3.5 !py-2 flex-1 !text-[0.8rem]" title="Agregar al carrito">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2 5h14M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
          Agregar
        </button>
      </div>
    </div>`;

  const qtyInput = card.querySelector('.tc-qty input');
  card.querySelectorAll('[data-qty]').forEach(b => b.addEventListener('click', () => {
    qtyInput.value = Math.max(1, Math.min(99, (parseInt(qtyInput.value) || 1) + Number(b.dataset.qty)));
  }));

  card.querySelectorAll('[data-open]').forEach(b =>
    b.addEventListener('click', () => openProductModal(prod)));

  card.querySelector('[data-add]').addEventListener('click', () => {
    const qty = Math.max(1, Math.min(99, parseInt(qtyInput.value) || 1));
    // si hay varios colores, abrir el modal para elegirlo
    if ((prod.colors || []).length > 1) {
      openProductModal(prod);
      return;
    }
    addToCart(prod.code, qty, prod.colors?.[0]?.name || '');
    toast(`${prod.name} agregado al carrito`, 'success');
  });

  return card;
}

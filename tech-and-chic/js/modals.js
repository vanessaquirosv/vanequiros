// ═══════════════════════════════════════════════════════════════
// Tech & Chic — sistema de modales, toasts y modal de producto
// ═══════════════════════════════════════════════════════════════
import { fmtCRC, driveImageUrl } from './tc-config.js';
import { discountedPrice } from './pricing.js';
import { addToCart } from './cart-state.js';
import { api, getSession } from './api.js';

const modalRoot = () => document.getElementById('modalRoot');
const toastRoot = () => document.getElementById('toastRoot');

// ── Modal genérico ──────────────────────────────────────────────
export function openModal(contentHtml, { wide = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'tc-modal-overlay';
  overlay.innerHTML = `
    <div class="tc-modal ${wide ? 'tc-modal-wide' : ''}" role="dialog" aria-modal="true">
      <button type="button" data-close aria-label="Cerrar"
        class="sticky top-3 float-right mr-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900/80 text-neutral-400 hover:text-white hover:bg-violet-600/40 transition-colors">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="clear-both px-6 pb-6 pt-2 sm:px-8 sm:pb-8">${contentHtml}</div>
    </div>`;
  const close = () => { overlay.remove(); document.body.style.overflow = ''; };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close]')) close();
  });
  const escHandler = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
  document.body.style.overflow = 'hidden';
  modalRoot().appendChild(overlay);
  return { overlay, close };
}

// ── Toast ───────────────────────────────────────────────────────
export function toast(message, type = 'info', ms = 3200) {
  const el = document.createElement('div');
  el.className = `tc-toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  el.innerHTML = `<span class="${type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-violet-300'} font-bold">${icon}</span><span></span>`;
  el.querySelector('span:last-child').textContent = message;
  toastRoot().appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s ease, transform .3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    setTimeout(() => el.remove(), 320);
  }, ms);
}

// ── Estrellas ───────────────────────────────────────────────────
export function starsHtml(value, { interactive = false, size = 'h-4 w-4' } = {}) {
  let html = `<span class="tc-stars" ${interactive ? 'data-stars-input' : ''}>`;
  for (let i = 1; i <= 5; i++) {
    html += `<svg data-star="${i}" class="tc-star ${size} ${i <= value ? 'filled' : ''} ${interactive ? 'interactive' : ''}"
      fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.063 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.958z"/></svg>`;
  }
  return html + '</span>';
}

// ── Precio con descuento ────────────────────────────────────────
export function priceHtml(prod, { size = 'text-lg' } = {}) {
  const final = discountedPrice(prod.price, prod.discountPct);
  if (prod.discountPct > 0) {
    return `<span class="${size} font-bold text-white">${fmtCRC(final)}</span>
      <span class="tc-price-old ml-1.5">${fmtCRC(prod.price)}</span>`;
  }
  return `<span class="${size} font-bold text-white">${fmtCRC(final)}</span>`;
}

export function productImg(prod, colorName = '') {
  const color = (prod.colors || []).find(c => c.name === colorName);
  const src = color?.img || prod.img || '';
  return src ? driveImageUrl(src, 640) : '';
}

const IMG_FALLBACK_SVG = `
  <svg class="h-14 w-14" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
    <rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/>
    <path stroke-linecap="round" d="m5.5 17 4.2-4.2a1 1 0 0 1 1.4 0l2.4 2.4 2-2a1 1 0 0 1 1.4 0l2.6 2.6"/>
  </svg>`;

export function imgOrPlaceholder(src, cls, alt = '') {
  if (!src) return `<div class="${cls} tc-card-img-placeholder">${IMG_FALLBACK_SVG}</div>`;
  const safeAlt = alt.replace(/"/g, '&quot;');
  return `<img src="${src}" alt="${safeAlt}" loading="lazy" decoding="async" class="${cls} tc-card-img"
    onerror="this.outerHTML='<div class=&quot;${cls} tc-card-img-placeholder&quot;>${IMG_FALLBACK_SVG.replace(/"/g, '&quot;').replace(/\n/g, '')}</div>'">`;
}

// ═══════════════════════════════════════════════════════════════
// Modal de detalle de producto
// ═══════════════════════════════════════════════════════════════
export async function openProductModal(prod) {
  const colors = prod.colors || [];
  let selectedColor = colors[0]?.name || '';

  const specsHtml = (prod.specs || []).length
    ? `<ul class="mt-3 space-y-1.5">
        ${prod.specs.map(s => `<li class="flex items-start gap-2 text-sm text-neutral-300">
          <span class="mt-0.5 text-fuchsia-400">▸</span><span>${escapeHtml(s)}</span></li>`).join('')}
      </ul>`
    : '';

  const { overlay, close } = openModal(`
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      <div>
        <div id="pmImgWrap" class="rounded-xl overflow-hidden border border-violet-500/15">
          ${imgOrPlaceholder(productImg(prod, selectedColor), 'w-full', prod.name)}
        </div>
        ${prod.discountPct > 0 ? `<div class="mt-3 inline-block tc-badge-promo !static">-${prod.discountPct}% de descuento</div>` : ''}
      </div>
      <div>
        <p class="text-xs uppercase tracking-wider text-violet-400/80">${escapeHtml(prod.brand || '')} · ${escapeHtml(prod.category || '')}${prod.subcategory ? ' / ' + escapeHtml(prod.subcategory) : ''}</p>
        <h2 class="mt-1 font-serif text-2xl font-semibold text-white">${escapeHtml(prod.name)}</h2>
        <div class="mt-2 flex items-center gap-2" id="pmRating"></div>
        <div class="mt-3">${priceHtml(prod, { size: 'text-2xl' })}</div>
        <p class="mt-4 text-sm text-neutral-300 leading-relaxed">${escapeHtml(prod.desc || '')}</p>

        ${colors.length ? `
          <div class="mt-5">
            <p class="tc-label">Color: <span id="pmColorName" class="text-white font-semibold">${escapeHtml(selectedColor)}</span></p>
            <div class="flex items-center gap-2.5 mt-1" id="pmColors">
              ${colors.map(c => `<button type="button" class="tc-color-dot ${c.name === selectedColor ? 'selected' : ''}"
                title="${escapeHtml(c.name)}" data-color="${escapeHtml(c.name)}" style="background:${c.hex || '#666'}"></button>`).join('')}
            </div>
          </div>` : ''}

        <div class="mt-6 flex items-center gap-3">
          <div class="tc-qty">
            <button type="button" data-qty="-1" aria-label="Menos">−</button>
            <input id="pmQty" type="number" min="1" max="99" value="1">
            <button type="button" data-qty="1" aria-label="Más">+</button>
          </div>
          <button type="button" id="pmAdd" class="tc-btn-primary flex-1">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2 5h14M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
            Agregar al carrito
          </button>
        </div>

        ${specsHtml ? `
          <div class="mt-6">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-violet-300/90">Especificaciones</h3>
            ${specsHtml}
          </div>` : ''}
        <p class="mt-5 text-[11px] text-neutral-600">Código de producto: <span class="font-mono">${prod.code}</span></p>
      </div>
    </div>

    <div class="tc-divider my-6"></div>
    <div id="pmReviews">
      <h3 class="text-sm font-semibold uppercase tracking-wider text-violet-300/90">Reseñas</h3>
      <div id="pmReviewsList" class="mt-3"><span class="tc-spinner"></span></div>
      <div id="pmReviewForm" class="mt-4"></div>
    </div>
  `, { wide: true });

  const $ = (sel) => overlay.querySelector(sel);

  // Colores
  $('#pmColors')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]');
    if (!btn) return;
    selectedColor = btn.dataset.color;
    overlay.querySelectorAll('#pmColors .tc-color-dot').forEach(d => d.classList.toggle('selected', d === btn));
    $('#pmColorName').textContent = selectedColor;
    $('#pmImgWrap').innerHTML = imgOrPlaceholder(productImg(prod, selectedColor), 'w-full', prod.name);
  });

  // Cantidad
  overlay.querySelectorAll('[data-qty]').forEach(b => b.addEventListener('click', () => {
    const input = $('#pmQty');
    input.value = Math.max(1, Math.min(99, (parseInt(input.value) || 1) + Number(b.dataset.qty)));
  }));

  // Agregar al carrito
  $('#pmAdd').addEventListener('click', () => {
    const qty = Math.max(1, Math.min(99, parseInt($('#pmQty').value) || 1));
    addToCart(prod.code, qty, selectedColor);
    toast(`${prod.name} agregado al carrito`, 'success');
    close();
  });

  // Reseñas
  loadReviews(prod, overlay);
}

async function loadReviews(prod, overlay) {
  const list = overlay.querySelector('#pmReviewsList');
  const formWrap = overlay.querySelector('#pmReviewForm');
  const ratingWrap = overlay.querySelector('#pmRating');

  let reviews = [];
  try {
    const out = await api('getReviews', { productCode: prod.code });
    reviews = out.reviews || [];
  } catch { /* sin backend: sin reseñas */ }
  if (!list.isConnected) return;

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;
  if (ratingWrap) {
    ratingWrap.innerHTML = reviews.length
      ? `${starsHtml(Math.round(avg))}<span class="text-xs text-neutral-500">${avg.toFixed(1)} · ${reviews.length} reseña${reviews.length === 1 ? '' : 's'}</span>`
      : `<span class="text-xs text-neutral-600">Sin reseñas todavía</span>`;
  }

  list.innerHTML = reviews.length
    ? reviews.slice().reverse().map(r => `
        <div class="py-3 border-b border-violet-500/10 last:border-0">
          <div class="flex items-center gap-2">
            ${starsHtml(r.stars)}
            <span class="text-sm font-semibold text-neutral-200">${escapeHtml(r.usuario || 'Cliente')}</span>
            <span class="text-[11px] text-neutral-600">${new Date(r.at).toLocaleDateString('es-CR')}</span>
          </div>
          ${r.text ? `<p class="mt-1.5 text-sm text-neutral-400">${escapeHtml(r.text)}</p>` : ''}
        </div>`).join('')
    : '<p class="text-sm text-neutral-600">Este producto aún no tiene reseñas.</p>';

  // Formulario (solo con sesión)
  const session = getSession();
  if (!session?.user) {
    formWrap.innerHTML = `<p class="text-xs text-neutral-600">Inicia sesión para escribir una reseña.</p>`;
    return;
  }
  let myStars = reviews.find(r => r.userId === session.user.id)?.stars || 0;
  formWrap.innerHTML = `
    <div class="tc-panel p-4">
      <p class="text-sm font-medium text-neutral-200 mb-2">Tu reseña</p>
      <div class="flex items-center gap-3">
        ${starsHtml(myStars, { interactive: true, size: 'h-6 w-6' })}
        <span id="rvStarsLabel" class="text-xs text-neutral-500">${myStars ? myStars + '/5' : 'Elige tu calificación'}</span>
      </div>
      <textarea id="rvText" rows="2" maxlength="600" class="tc-input mt-3" placeholder="Cuéntanos qué te pareció (opcional)"></textarea>
      <div class="mt-3 flex justify-end">
        <button type="button" id="rvSend" class="tc-btn-secondary">Publicar reseña</button>
      </div>
    </div>`;

  const starsInput = formWrap.querySelector('[data-stars-input]');
  starsInput.addEventListener('click', (e) => {
    const st = e.target.closest('[data-star]');
    if (!st) return;
    myStars = Number(st.dataset.star);
    starsInput.querySelectorAll('.tc-star').forEach((s, i) => s.classList.toggle('filled', i < myStars));
    formWrap.querySelector('#rvStarsLabel').textContent = myStars + '/5';
  });

  formWrap.querySelector('#rvSend').addEventListener('click', async (e) => {
    if (!myStars) { toast('Elige una calificación de 1 a 5 estrellas.', 'error'); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api('addReview', { productCode: prod.code, stars: myStars, text: formWrap.querySelector('#rvText').value });
      toast('¡Gracias por tu reseña!', 'success');
      loadReviews(prod, overlay);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    }
  });
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

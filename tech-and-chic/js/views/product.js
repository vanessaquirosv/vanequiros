// ═══════════════════════════════════════════════════════════════
// Tech & Chic — página de producto (#/producto/CODIGO)
// Tiene su propia URL para poder compartirla: quien abre el enlace
// llega directo al producto. Si ya no está en el catálogo se explica
// por qué (agotado o retirado) y se ofrecen alternativas.
// ═══════════════════════════════════════════════════════════════
import { loadCatalog, getProduct, unavailableProduct } from '../catalog.js';
import { addToCart } from '../cart-state.js';
import { discountedPrice } from '../pricing.js';
import { TC_CONFIG, fmtCRC, driveImageUrl } from '../tc-config.js';
import { toast, priceHtml, productImg, imgOrPlaceholder, escapeHtml, loadReviews } from '../modals.js';
import { productCard } from '../product-card.js';
import { parseHash, storeHref, productShareUrl } from '../route.js';
import { canGoBack } from '../app.js';

const ICON_SHARE = '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0-12L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
const ICON_LINK = '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/></svg>';
const ICON_WA = '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.88 9.88 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg>';
const ICON_BACK = '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>';

export async function renderProduct(view) {
  const code = String(parseHash().args[0] || '').toUpperCase();
  const cat = await loadCatalog();
  if (!view.isConnected) return;

  const prod = getProduct(code);
  if (prod) renderFound(view, cat, prod);
  else renderMissing(view, cat, code);
}

// ── Navegación de regreso + migas ───────────────────────────────
function crumbsHtml(category, subcategory) {
  const parts = [`<a href="#/tienda" class="hover:text-fuchsia-300">Tienda</a>`];
  if (category) parts.push(`<a href="${storeHref({ dep: category })}" class="hover:text-fuchsia-300">${escapeHtml(category)}</a>`);
  if (subcategory) parts.push(`<a href="${storeHref({ dep: category, sub: subcategory })}" class="hover:text-fuchsia-300">${escapeHtml(subcategory)}</a>`);
  return `
    <div class="flex items-center gap-3 mb-4 text-xs text-neutral-500 min-w-0">
      <button type="button" data-back class="tc-back-btn shrink-0">${ICON_BACK}<span>Volver</span></button>
      <nav class="truncate" aria-label="Ruta">${parts.join(' <span class="text-neutral-700">›</span> ')}</nav>
    </div>`;
}

function wireBack(view, category) {
  view.querySelector('[data-back]')?.addEventListener('click', () => {
    // quien llegó por un enlace compartido no tiene "atrás" dentro de la tienda
    if (canGoBack()) history.back();
    else location.hash = category ? storeHref({ dep: category }) : '#/tienda';
  });
}

/** Productos parecidos: misma subcategoría primero, luego el departamento. */
function related(cat, { code, category, subcategory }, max = 8) {
  const pool = cat.products.filter(p => !p.combo && p.code !== code);
  const same = pool.filter(p => subcategory && p.category === category && p.subcategory === subcategory);
  const dept = pool.filter(p => p.category === category && !same.includes(p));
  return [...same, ...dept].slice(0, max);
}

function relatedSection(view, list, title) {
  if (!list.length) return;
  const sec = document.createElement('section');
  sec.className = 'mt-12';
  sec.innerHTML = `
    <h2 class="tc-section-title !text-xl">${escapeHtml(title)}</h2>
    <div class="tc-title-rule mt-2"></div>
    <div class="tc-hscroll mt-5" data-rel></div>`;
  const row = sec.querySelector('[data-rel]');
  list.forEach(p => row.appendChild(productCard(p)));
  view.querySelector('.tc-fade-in').appendChild(sec);
}

// ── Producto disponible ─────────────────────────────────────────
function renderFound(view, cat, prod) {
  const colors = prod.colors || [];
  let selectedColor = colors[0]?.name || '';
  const final = discountedPrice(prod.price, prod.discountPct);
  document.title = `${prod.name} — Tech & Chic`;

  view.innerHTML = `
    <div class="tc-fade-in">
      ${crumbsHtml(prod.category, prod.subcategory)}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        <div class="md:sticky md:top-[calc(var(--tc-header-h,4rem)+1rem)] self-start">
          <div class="relative rounded-2xl overflow-hidden border border-violet-500/15" id="pmImgWrap">
            ${imgOrPlaceholder(productImg(prod, selectedColor), 'w-full', prod.name)}
          </div>
          ${prod.discountPct > 0 ? `<div class="mt-3 inline-block tc-badge-promo !static">-${prod.discountPct}% de descuento</div>` : ''}
        </div>

        <div>
          <p class="text-xs uppercase tracking-wider text-violet-400/80">${escapeHtml(prod.brand || '')}</p>
          <h1 class="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-white leading-tight">${escapeHtml(prod.name)}</h1>
          <div class="mt-2 flex items-center gap-2" id="pmRating"></div>
          <div class="mt-3">${priceHtml(prod, { size: 'text-3xl' })}</div>

          ${colors.length ? `
            <div class="mt-5">
              <p class="tc-label">Color: <span id="pmColorName" class="text-white font-semibold">${escapeHtml(selectedColor)}</span></p>
              <div class="flex flex-wrap items-center gap-2.5 mt-1" id="pmColors">
                ${colors.map(c => `<button type="button" class="tc-color-dot ${c.name === selectedColor ? 'selected' : ''}"
                  title="${escapeHtml(c.name)}" aria-label="${escapeHtml(c.name)}" data-color="${escapeHtml(c.name)}" style="background:${c.hex || '#666'}"></button>`).join('')}
              </div>
            </div>` : ''}

          <div class="mt-6 flex items-center gap-3">
            <div class="tc-qty">
              <button type="button" data-qty="-1" aria-label="Menos">−</button>
              <input id="pmQty" type="number" min="1" max="99" value="1" aria-label="Cantidad">
              <button type="button" data-qty="1" aria-label="Más">+</button>
            </div>
            <button type="button" id="pmAdd" class="tc-btn-primary flex-1">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2 5h14M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
              Agregar al carrito
            </button>
          </div>

          <!-- Compartir -->
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" data-share class="tc-share-btn">${ICON_SHARE}<span>Compartir</span></button>
            <a data-share-wa class="tc-share-btn" target="_blank" rel="noopener noreferrer">${ICON_WA}<span>WhatsApp</span></a>
            <button type="button" data-copy class="tc-share-btn">${ICON_LINK}<span>Copiar enlace</span></button>
          </div>

          ${prod.desc ? `<p class="mt-6 text-sm text-neutral-300 leading-relaxed">${escapeHtml(prod.desc)}</p>` : ''}

          ${(prod.specs || []).length ? `
            <div class="mt-6">
              <h2 class="text-sm font-semibold uppercase tracking-wider text-violet-300/90">Especificaciones</h2>
              <ul class="mt-3 space-y-1.5">
                ${prod.specs.map(s => `<li class="flex items-start gap-2 text-sm text-neutral-300">
                  <span class="mt-0.5 text-fuchsia-400">▸</span><span>${escapeHtml(s)}</span></li>`).join('')}
              </ul>
            </div>` : ''}
          <p class="mt-5 text-[11px] text-neutral-600">Código de producto: <span class="font-mono">${prod.code}</span></p>
        </div>
      </div>

      <div class="tc-divider my-8"></div>
      <section id="pmReviews">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-violet-300/90">Reseñas</h2>
        <div id="pmReviewsList" class="mt-3"><span class="tc-spinner"></span></div>
        <div id="pmReviewForm" class="mt-4"></div>
      </section>
    </div>`;

  const $ = (sel) => view.querySelector(sel);
  wireBack(view, prod.category);

  // Colores
  $('#pmColors')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]');
    if (!btn) return;
    selectedColor = btn.dataset.color;
    view.querySelectorAll('#pmColors .tc-color-dot').forEach(d => d.classList.toggle('selected', d === btn));
    $('#pmColorName').textContent = selectedColor;
    $('#pmImgWrap').innerHTML = imgOrPlaceholder(productImg(prod, selectedColor), 'w-full', prod.name);
  });

  // Cantidad
  view.querySelectorAll('[data-qty]').forEach(b => b.addEventListener('click', () => {
    const input = $('#pmQty');
    input.value = Math.max(1, Math.min(99, (parseInt(input.value) || 1) + Number(b.dataset.qty)));
  }));

  // Agregar al carrito
  $('#pmAdd').addEventListener('click', () => {
    const qty = Math.max(1, Math.min(99, parseInt($('#pmQty').value) || 1));
    addToCart(prod.code, qty, selectedColor);
    toast(`${prod.name} agregado al carrito`, 'success');
  });

  // Compartir
  const url = productShareUrl(prod.code);
  const text = `${prod.name} — ${fmtCRC(final)} en Tech & Chic`;
  $('[data-share-wa]').href = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  $('[data-copy]').addEventListener('click', () => copyLink(url));
  const shareBtn = $('[data-share]');
  if (!navigator.share) shareBtn.classList.add('hidden');   // escritorio sin menú nativo
  shareBtn.addEventListener('click', async () => {
    try { await navigator.share({ title: prod.name, text, url }); }
    catch (err) { if (err?.name !== 'AbortError') copyLink(url); }
  });

  loadReviews(prod, view);
  if (!prod.combo) relatedSection(view, related(cat, prod), prod.subcategory ? `Más en ${prod.subcategory}` : `Más en ${prod.category}`);
}

async function copyLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast('Enlace copiado. ¡Pégalo donde quieras!', 'success');
  } catch {
    window.prompt('Copia este enlace:', url);
  }
}

// ── Producto que ya no está en la tienda ────────────────────────
function renderMissing(view, cat, code) {
  const gone = unavailableProduct(cat, code);   // agotado (el admin lo publica sin precio)
  document.title = `${gone?.name || 'Producto no disponible'} — Tech & Chic`;

  const ask = gone
    ? `Hola, me interesa "${gone.name}" (código ${code}). ¿Saben cuándo vuelve a estar disponible?`
    : `Hola, busco el producto con código ${code} que vi en Tech & Chic. ¿Lo tienen disponible?`;
  const img = gone?.img ? driveImageUrl(gone.img, 640) : '';

  view.innerHTML = `
    <div class="tc-fade-in">
      ${crumbsHtml(gone?.category, gone?.subcategory)}
      <div class="tc-panel p-6 sm:p-8 max-w-2xl mx-auto text-center">
        ${img ? `<div class="mx-auto w-40 rounded-xl overflow-hidden border border-violet-500/15 grayscale opacity-70">${imgOrPlaceholder(img, 'w-full', gone.name)}</div>`
              : '<p class="text-5xl">🔎</p>'}
        <span class="mt-5 inline-block tc-status-pill ${gone ? 'amber' : 'red'}">${gone ? 'Agotado por ahora' : 'Ya no está disponible'}</span>
        <h1 class="mt-3 font-serif text-2xl font-semibold text-white">${escapeHtml(gone?.name || 'Este producto ya no está en la tienda')}</h1>
        <p class="mt-3 text-sm text-neutral-400 leading-relaxed">
          ${gone
            ? 'Este producto se agotó en nuestro almacén. Escríbenos y te avisamos en cuanto vuelva, o mira opciones parecidas aquí abajo.'
            : 'El enlace que abriste corresponde a un producto que ya retiramos del catálogo. Puede que tengamos algo muy parecido: búscalo o escríbenos y te ayudamos.'}
        </p>
        <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="https://wa.me/${TC_CONFIG.whatsappNumber}?text=${encodeURIComponent(ask)}" target="_blank" rel="noopener noreferrer" class="tc-btn-whatsapp w-full sm:w-auto">
            ${ICON_WA} ${gone ? 'Avísame cuando vuelva' : 'Preguntar por WhatsApp'}
          </a>
          <a href="${gone?.category ? storeHref({ dep: gone.category }) : '#/tienda'}" class="tc-btn-secondary w-full sm:w-auto">
            ${gone?.category ? `Ver más de ${escapeHtml(gone.category)}` : 'Ir a la Tienda'}
          </a>
        </div>
        <p class="mt-5 text-[11px] text-neutral-600">Código: <span class="font-mono">${escapeHtml(code || '—')}</span></p>
      </div>
    </div>`;

  wireBack(view, gone?.category);
  if (gone?.category) relatedSection(view, related(cat, gone), 'Te puede interesar');
  else {
    const hot = (cat.home?.hot || []).map(c => getProduct(c)).filter(Boolean);
    relatedSection(view, hot, 'Lo más Hot');
  }
}

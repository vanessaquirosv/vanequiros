// ═══════════════════════════════════════════════════════════════
// Tech & Chic — vista Carrito
// Lista de productos, costo operativo cotizado por el servidor,
// y orden por WhatsApp / Instagram con mensaje autogenerado.
// ═══════════════════════════════════════════════════════════════
import { loadCatalog, getProduct } from '../catalog.js';
import { getCart, setQty, removeFromCart, clearCart } from '../cart-state.js';
import { api, getSession } from '../api.js';
import { fmtCRC, TC_CONFIG } from '../tc-config.js';
import { discountedPrice } from '../pricing.js';
import { toast, openModal, openProductModal, productImg, imgOrPlaceholder, escapeHtml } from '../modals.js';

export async function renderCart(view) {
  await loadCatalog();
  if (!view.isConnected) return;
  drawCart(view);
}

function drawCart(view) {
  const items = getCart();
  const session = getSession();

  if (!items.length) {
    view.innerHTML = `
      <div class="tc-fade-in text-center py-20">
        <p class="text-5xl mb-4">🛒</p>
        <h1 class="font-serif text-2xl font-semibold text-white">Tu carrito está vacío</h1>
        <p class="mt-2 text-neutral-400 text-sm">Explora la tienda y agrega lo que te guste.</p>
        <a href="#/tienda" class="tc-btn-primary mt-6 inline-flex">Ir a la Tienda</a>
      </div>`;
    return;
  }

  const rows = items.map(it => {
    const prod = getProduct(it.code);
    if (!prod) return '';
    const unit = discountedPrice(prod.price, prod.discountPct);
    return `
      <div class="tc-panel p-3.5 flex gap-3.5 items-center" data-row data-code="${prod.code}" data-color="${escapeHtml(it.color)}">
        <button type="button" data-open class="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-violet-500/15">
          ${imgOrPlaceholder(productImg(prod, it.color), 'w-full h-full !aspect-auto object-cover', prod.name)}
        </button>
        <div class="flex-1 min-w-0">
          <button type="button" data-open class="text-left text-sm font-semibold text-neutral-100 hover:text-fuchsia-300 transition-colors leading-snug line-clamp-2">${escapeHtml(prod.name)}</button>
          <p class="text-xs text-neutral-500 mt-0.5">
            ${escapeHtml(prod.brand || '')}${it.color ? ` · Color: <span class="text-neutral-300">${escapeHtml(it.color)}</span>` : ''}
          </p>
          <p class="text-sm mt-1">
            <span class="font-bold text-white">${fmtCRC(unit)}</span>
            ${prod.discountPct > 0 ? `<span class="tc-price-old ml-1">${fmtCRC(prod.price)}</span>` : ''}
            <span class="text-neutral-500 text-xs"> c/u</span>
          </p>
        </div>
        <div class="flex flex-col items-end gap-2 shrink-0">
          <div class="tc-qty scale-90 origin-right">
            <button type="button" data-dec aria-label="Menos">−</button>
            <input type="number" min="1" max="99" value="${it.qty}" data-qty-input aria-label="Cantidad">
            <button type="button" data-inc aria-label="Más">+</button>
          </div>
          <p class="text-sm font-bold text-fuchsia-300">${fmtCRC(unit * it.qty)}</p>
          <button type="button" data-remove class="text-xs text-neutral-600 hover:text-red-400 transition-colors">Quitar</button>
        </div>
      </div>`;
  }).join('');

  view.innerHTML = `
    <div class="tc-fade-in">
      <div class="flex flex-col items-start gap-1 mb-6">
        <h1 class="tc-section-title">Carrito</h1>
        <div class="tc-title-rule"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6 items-start">
        <div class="space-y-3" id="cartRows">${rows}</div>

        <aside class="tc-panel p-5 lg:sticky lg:top-20">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-violet-300/90">Resumen</h2>

          <div class="mt-4 space-y-2 text-sm">
            <div class="flex justify-between text-neutral-300"><span>Subtotal</span><span id="sumSubtotal">—</span></div>
            <div class="flex justify-between text-neutral-300">
              <span class="flex items-center gap-1.5">Costo operativo
                <span class="group relative cursor-help text-violet-400/70">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 8h.01M11 12h1v4h1"/></svg>
                  <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 text-[11px] text-neutral-300 bg-neutral-900 border border-violet-500/25 rounded-lg p-2.5 shadow-xl z-10">
                    Cubre la logística de tu pedido. Se calcula según los productos del carrito.
                  </span>
                </span>
              </span>
              <span id="sumOpCost"><span class="tc-spinner"></span></span>
            </div>
            <div class="tc-divider !my-3"></div>
            <div class="flex justify-between text-base font-bold text-white"><span>Total</span><span id="sumTotal">—</span></div>
          </div>

          <div class="mt-5">
            ${session?.user ? `
              <p class="text-xs text-neutral-500">Ordenando como <span class="text-neutral-200 font-medium">${escapeHtml(session.user.nombre)}</span></p>
              ${session.user.direccion
                ? `<p class="text-xs text-neutral-500 mt-1">Envío a: <span class="text-neutral-300">${escapeHtml(session.user.direccion)}</span></p>`
                : `<p class="text-xs text-amber-400/90 mt-1">No tienes dirección guardada — te la pediremos en el mensaje.</p>`}
            ` : `
              <label class="tc-label" for="buyerName">Tu nombre <span class="text-fuchsia-400">*</span></label>
              <input id="buyerName" class="tc-input" placeholder="¿Cómo te llamamos?" value="${escapeHtml(localStorage.getItem('tc_buyer_name') || '')}">
              <label class="tc-label mt-3" for="buyerAddr">Dirección de entrega <span class="text-neutral-600">(opcional)</span></label>
              <textarea id="buyerAddr" rows="2" class="tc-input" placeholder="Puedes indicarla luego por WhatsApp">${escapeHtml(localStorage.getItem('tc_buyer_addr') || '')}</textarea>
            `}
          </div>

          <div class="mt-5 space-y-2.5">
            <button type="button" id="orderWa" class="tc-btn-whatsapp w-full">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Ordena por WhatsApp
            </button>
            <button type="button" id="orderIg" class="tc-btn-instagram w-full">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              Ordena por Instagram
            </button>
            <button type="button" id="cartClear" class="tc-btn-ghost w-full justify-center text-xs">Vaciar carrito</button>
          </div>
          <p class="mt-3 text-[11px] text-neutral-600 leading-relaxed">
            Al ordenar se genera un código único de compra. Te contactaremos para confirmar
            disponibilidad y enviarte las instrucciones de pago por SINPE.
          </p>
        </aside>
      </div>
    </div>`;

  // ── Interacción de filas ──
  view.querySelector('#cartRows').addEventListener('click', (e) => {
    const row = e.target.closest('[data-row]');
    if (!row) return;
    const { code, color } = row.dataset;
    const it = getCart().find(i => i.code === code && (i.color || '') === color);
    if (!it) return;

    if (e.target.closest('[data-inc]')) { setQty(code, color, it.qty + 1); drawCart(view); }
    else if (e.target.closest('[data-dec]')) { setQty(code, color, it.qty - 1); drawCart(view); }
    else if (e.target.closest('[data-remove]')) { removeFromCart(code, color); drawCart(view); }
    else if (e.target.closest('[data-open]')) { const p = getProduct(code); if (p) openProductModal(p); }
  });
  view.querySelector('#cartRows').addEventListener('change', (e) => {
    const input = e.target.closest('[data-qty-input]');
    if (!input) return;
    const row = e.target.closest('[data-row]');
    setQty(row.dataset.code, row.dataset.color, parseInt(input.value) || 1);
    drawCart(view);
  });

  view.querySelector('#cartClear').addEventListener('click', () => {
    clearCart();
    drawCart(view);
  });

  // ── Cotización (subtotal + costo operativo del servidor) ──
  quote(view, items);

  // ── Botones de orden ──
  view.querySelector('#orderWa').addEventListener('click', () => placeOrder(view, 'WhatsApp'));
  view.querySelector('#orderIg').addEventListener('click', () => placeOrder(view, 'Instagram'));

  // recordar nombre/dirección de invitado
  view.querySelector('#buyerName')?.addEventListener('input', e => localStorage.setItem('tc_buyer_name', e.target.value));
  view.querySelector('#buyerAddr')?.addEventListener('input', e => localStorage.setItem('tc_buyer_addr', e.target.value));
}

let lastQuote = null;

async function quote(view, items) {
  lastQuote = null;
  try {
    const q = await api('quoteCart', { items });
    lastQuote = q;
    if (!view.isConnected) return;
    view.querySelector('#sumSubtotal').textContent = fmtCRC(q.subtotal);
    view.querySelector('#sumOpCost').textContent = q.opCost == null ? 'Se confirma al ordenar' : fmtCRC(q.opCost);
    view.querySelector('#sumTotal').textContent = q.opCost == null ? `${fmtCRC(q.subtotal)} +` : fmtCRC(q.total);
  } catch (err) {
    if (!view.isConnected) return;
    // sin conexión al backend: mostrar subtotal local
    const subtotal = items.reduce((s, it) => {
      const p = getProduct(it.code);
      return p ? s + discountedPrice(p.price, p.discountPct) * it.qty : s;
    }, 0);
    view.querySelector('#sumSubtotal').textContent = fmtCRC(subtotal);
    view.querySelector('#sumOpCost').textContent = 'Se confirma al ordenar';
    view.querySelector('#sumTotal').textContent = `${fmtCRC(subtotal)} +`;
  }
}

async function placeOrder(view, canal) {
  const session = getSession();
  let nombre, direccion;
  if (session?.user) {
    nombre = session.user.nombre;
    direccion = session.user.direccion || '';
  } else {
    nombre = view.querySelector('#buyerName')?.value.trim() || '';
    direccion = view.querySelector('#buyerAddr')?.value.trim() || '';
    if (!nombre) {
      toast('Escribe tu nombre para poder ordenar.', 'error');
      view.querySelector('#buyerName')?.focus();
      return;
    }
  }

  const btn = view.querySelector(canal === 'WhatsApp' ? '#orderWa' : '#orderIg');
  const prevHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="tc-spinner"></span> Generando orden…';

  try {
    const out = await api('createOrder', {
      items: getCart(),
      buyer: { nombre, direccion },
      canal,
    });
    const order = out.order;
    const message = buildMessage(order);

    clearCart();

    if (canal === 'WhatsApp') {
      const url = `https://wa.me/${TC_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener');
    } else {
      // Instagram no permite pre-cargar el texto: lo copiamos al portapapeles
      try { await navigator.clipboard.writeText(message); } catch { /* sin permiso */ }
      window.open(`https://ig.me/m/${TC_CONFIG.instagramUser}`, '_blank', 'noopener');
    }

    successModal(order, message, canal);
  } catch (err) {
    toast(err.message || 'No se pudo crear la orden.', 'error');
    btn.disabled = false;
    btn.innerHTML = prevHtml;
    return;
  }
  drawCart(view);
}

function buildMessage(order) {
  const lines = [];
  lines.push(`🛍️ *Nueva orden — Tech & Chic*`);
  lines.push(`Código de orden: *${order.code}*`);
  lines.push('');
  for (const it of order.items) {
    lines.push(`• ${it.qty}× ${it.name}${it.color ? ` (${it.color})` : ''} — ${fmtCRC(it.unitPrice)} c/u  [${it.code}]`);
  }
  lines.push('');
  lines.push(`Subtotal: ${fmtCRC(order.subtotal)}`);
  if (order.opCost != null) lines.push(`Costo operativo: ${fmtCRC(order.opCost)}`);
  lines.push(`*Total: ${order.opCost != null ? fmtCRC(order.total) : fmtCRC(order.subtotal) + ' + costo operativo'}*`);
  lines.push('');
  lines.push(`Nombre: ${order.buyer.nombre}`);
  lines.push(order.buyer.direccion
    ? `Dirección: ${order.buyer.direccion}`
    : `Dirección: (pendiente — la coordinamos por este chat 😊)`);
  lines.push('');
  lines.push('¡Hola! Quiero confirmar esta orden. Quedo al pendiente de la disponibilidad y las instrucciones de SINPE. 💜');
  return lines.join('\n');
}

function successModal(order, message, canal) {
  const { overlay } = openModal(`
    <div class="text-center pt-2">
      <div class="mx-auto w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500/25 to-emerald-400/10 border border-emerald-400/30">
        <svg class="h-7 w-7 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 class="mt-4 font-serif text-2xl font-semibold text-white">¡Orden generada!</h2>
      <p class="mt-2 text-sm text-neutral-400">Tu código de compra es:</p>
      <p class="mt-2 inline-block font-mono text-xl font-bold tracking-wider text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/25 rounded-xl px-5 py-2.5">${order.code}</p>
      <p class="mt-3 text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
        Guárdalo: con este código puedes consultar el estado de tu compra en la pestaña
        <a href="#/compras" class="text-violet-300 underline" data-close>Compras</a> en cualquier momento.
        ${canal === 'Instagram' ? '<br><br>📋 El mensaje quedó copiado — pégalo en el chat de Instagram que se abrió.' : ''}
      </p>
      <div class="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
        <button type="button" id="copyMsg" class="tc-btn-secondary">Copiar mensaje</button>
        <a href="#/compras" class="tc-btn-primary" data-close>Ver mi compra</a>
      </div>
    </div>`);
  overlay.querySelector('#copyMsg').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast('Mensaje copiado', 'success');
    } catch { toast('No se pudo copiar', 'error'); }
  });
}

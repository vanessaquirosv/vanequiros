// ═══════════════════════════════════════════════════════════════
// Tech & Chic — vista Compras
// Consulta por código (con o sin cuenta) + historial con sesión.
// ═══════════════════════════════════════════════════════════════
import { api, getSession, ORDER_STATUSES, STATUS_NOTES } from '../api.js';
import { fmtCRC } from '../tc-config.js';
import { escapeHtml, toast } from '../modals.js';

export async function renderOrders(view) {
  const session = getSession();

  view.innerHTML = `
    <div class="tc-fade-in max-w-3xl mx-auto">
      <div class="flex flex-col items-start gap-1 mb-6">
        <h1 class="tc-section-title">Compras</h1>
        <div class="tc-title-rule"></div>
      </div>

      <!-- Consulta por código -->
      <section class="tc-panel p-5 sm:p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-violet-300/90">Consultar una compra</h2>
        <p class="mt-1.5 text-sm text-neutral-400">
          Ingresa el código que recibiste al ordenar (por ejemplo <span class="font-mono text-neutral-300">TC-A1B2C3</span>) para ver el estado de tu pedido.
        </p>
        <form id="lookupForm" class="mt-4 flex flex-col sm:flex-row gap-2.5">
          <input id="lookupCode" class="tc-input flex-1 font-mono uppercase tracking-wider" placeholder="TC-______" maxlength="12" autocomplete="off">
          <button type="submit" class="tc-btn-primary shrink-0" id="lookupBtn">Consultar</button>
        </form>
        <div id="lookupResult" class="mt-5"></div>
      </section>

      <!-- Historial (con sesión) -->
      <section class="mt-8">
        ${session?.user ? `
          <div class="flex items-end justify-between gap-3">
            <div>
              <h2 class="tc-section-title !text-xl">Mis compras</h2>
              <div class="tc-title-rule mt-2 !w-14"></div>
            </div>
          </div>
          <div id="myOrders" class="mt-5">
            <div class="flex justify-center py-8"><span class="tc-spinner tc-spinner-lg"></span></div>
          </div>
        ` : `
          <div class="tc-panel p-5 text-center">
            <p class="text-sm text-neutral-400">
              💡 Con una cuenta puedes ver aquí <span class="text-neutral-200">todas tus compras</span> sin necesidad de guardar códigos.
            </p>
            <button type="button" id="ordersLoginBtn" class="tc-btn-secondary mt-3">Iniciar sesión</button>
          </div>
        `}
      </section>
    </div>`;

  // Consulta por código
  const form = view.querySelector('#lookupForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codeInput = view.querySelector('#lookupCode');
    let code = codeInput.value.trim().toUpperCase();
    if (!code) return;
    if (!code.startsWith('TC-') && /^[A-Z0-9]{6}$/.test(code)) code = 'TC-' + code;

    const btn = view.querySelector('#lookupBtn');
    const result = view.querySelector('#lookupResult');
    btn.disabled = true;
    result.innerHTML = '<div class="flex justify-center py-4"><span class="tc-spinner tc-spinner-lg"></span></div>';
    try {
      const out = await api('getOrder', { code });
      result.innerHTML = '';
      result.appendChild(orderCard(out.order, { expanded: true }));
    } catch (err) {
      result.innerHTML = `<p class="text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">${escapeHtml(err.message)}</p>`;
    }
    btn.disabled = false;
  });

  view.querySelector('#ordersLoginBtn')?.addEventListener('click', async () => {
    const { openLoginModal } = await import('../auth.js');
    openLoginModal();
  });

  // Historial
  if (session?.user) {
    const wrap = view.querySelector('#myOrders');
    try {
      const out = await api('getMyOrders');
      if (!wrap.isConnected) return;
      if (!out.orders.length) {
        wrap.innerHTML = '<p class="text-sm text-neutral-500 text-center py-6">Todavía no tienes compras registradas con tu cuenta.</p>';
      } else {
        wrap.innerHTML = '';
        out.orders.forEach(o => wrap.appendChild(orderCard(o)));
      }
    } catch (err) {
      if (wrap.isConnected) wrap.innerHTML = `<p class="text-sm text-red-400/90">${escapeHtml(err.message)}</p>`;
    }
  }
}

/** Tarjeta de orden con línea de tiempo de estados. */
export function orderCard(order, { expanded = false } = {}) {
  const el = document.createElement('div');
  el.className = 'tc-panel overflow-hidden mb-3 tc-fade-in';

  const stIdx = ORDER_STATUSES.indexOf(order.status);
  const done = order.status === 'Entrega Completada';
  const statusColor = done ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10'
    : 'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10';

  const itemsHtml = order.items.map(it => `
    <div class="flex items-center justify-between gap-3 py-2 border-b border-violet-500/10 last:border-0">
      <div class="min-w-0">
        <p class="text-sm text-neutral-200 leading-snug">${it.qty}× ${escapeHtml(it.name)}${it.color ? ` <span class="text-neutral-500">(${escapeHtml(it.color)})</span>` : ''}</p>
        <p class="text-[11px] text-neutral-600 font-mono">${it.code}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-sm font-semibold text-neutral-100">${fmtCRC(it.unitPrice * it.qty)}</p>
        ${it.subEstado ? `
          <span class="inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full
            ${it.subEstado === 'Producto agotado' ? 'text-red-300 bg-red-500/15 border border-red-500/25' : 'text-sky-300 bg-sky-500/15 border border-sky-500/25'}">
            ${escapeHtml(it.subEstado)}
          </span>` : ''}
      </div>
    </div>`).join('');

  const timelineHtml = ORDER_STATUSES.map((st, i) => {
    const cls = i < stIdx ? 'done' : i === stIdx ? (done ? 'done' : 'current') : '';
    const at = order.history?.find(h => h.status === st)?.at;
    return `
      <div class="tc-timeline-step ${cls}">
        <div class="tc-timeline-dot">${i < stIdx || (i === stIdx && done) ? '✓' : ''}</div>
        <p class="text-sm font-medium ${i <= stIdx ? 'text-neutral-100' : 'text-neutral-600'}">${st}</p>
        ${i === stIdx ? `<p class="text-xs text-neutral-500 mt-0.5">${STATUS_NOTES[st] || ''}</p>` : ''}
        ${at ? `<p class="text-[10px] text-neutral-600 mt-0.5">${new Date(at).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })}</p>` : ''}
      </div>`;
  }).join('');

  el.innerHTML = `
    <button type="button" data-toggle class="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-violet-500/5 transition-colors">
      <div class="min-w-0">
        <p class="font-mono font-bold text-neutral-100 tracking-wider">${order.code}</p>
        <p class="text-xs text-neutral-500 mt-0.5">
          ${new Date(order.createdAt).toLocaleDateString('es-CR', { dateStyle: 'long' })}
          · ${order.items.reduce((n, i) => n + i.qty, 0)} artículo(s) · ${fmtCRC(order.total ?? order.subtotal)}
        </p>
      </div>
      <span class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusColor}">${escapeHtml(order.status)}</span>
    </button>
    <div data-body class="${expanded ? '' : 'hidden'} px-4 pb-5">
      <div class="tc-divider mb-4"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-violet-300/80 mb-2">Productos</h3>
          ${itemsHtml}
          <div class="mt-3 space-y-1 text-sm">
            <div class="flex justify-between text-neutral-400"><span>Subtotal</span><span>${fmtCRC(order.subtotal)}</span></div>
            ${order.opCost != null ? `<div class="flex justify-between text-neutral-400"><span>Costo operativo</span><span>${fmtCRC(order.opCost)}</span></div>` : ''}
            <div class="flex justify-between font-bold text-white"><span>Total</span><span>${fmtCRC(order.total ?? order.subtotal)}</span></div>
          </div>
        </div>
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-violet-300/80 mb-3">Estado del pedido</h3>
          <div class="tc-timeline">${timelineHtml}</div>
        </div>
      </div>
    </div>`;

  el.querySelector('[data-toggle]').addEventListener('click', () => {
    el.querySelector('[data-body]').classList.toggle('hidden');
  });

  return el;
}

// ═══════════════════════════════════════════════════════════════
// Tech & Chic — vista Tienda
// Paginación 5-50 por página (arriba y abajo, con número editable),
// filtros en barra superior (escritorio) o panel deslizante (móvil)
// y búsqueda difusa que llega desde el buscador del header.
// ═══════════════════════════════════════════════════════════════
import { loadCatalog, catalogCategories, catalogBrands } from '../catalog.js';
import { fuzzySearch } from '../search.js';
import { productCard } from '../product-card.js';
import { discountedPrice } from '../pricing.js';
import { escapeHtml } from '../modals.js';

const PAGE_SIZES = [5, 10, 15, 20, 30, 40, 50];

// Estado persistente de la vista (sobrevive a la navegación interna)
const state = {
  query: '',
  cats: new Set(),      // "Categoría" o "Categoría/Sub"
  brands: new Set(),
  priceMin: '',
  priceMax: '',
  sort: 'relevance',
  page: 1,
  pageSize: Number(localStorage.getItem('tc_page_size')) || 15,
};

/** El término buscado vive en la URL (#/tienda?q=…): así se puede compartir y volver atrás. */
function queryFromHash() {
  const qs = location.hash.split('?')[1] || '';
  return new URLSearchParams(qs).get('q') || '';
}

const ICON_FILTER = '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M7 12h10m-7 6h4"/></svg>';
const ICON_CHEV = '<svg class="tc-chev h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 9 6 6 6-6"/></svg>';
const ICON_X = '<svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>';

export async function renderStore(view) {
  view.innerHTML = `
    <div class="tc-fade-in">
      <div class="flex flex-col items-start gap-1 mb-6">
        <h1 class="tc-section-title">Tienda</h1>
        <div class="tc-title-rule"></div>
      </div>
      <div class="flex justify-center py-14"><span class="tc-spinner tc-spinner-lg"></span></div>
    </div>`;

  const cat = await loadCatalog();
  if (!view.isConnected) return;

  const cats = catalogCategories(cat);
  const brands = catalogBrands(cat);

  // la búsqueda entra por el header; la URL manda
  state.query = queryFromHash();
  state.page = 1;

  const grupoPrecio = () => `
    <div class="flex items-center gap-2">
      <input data-price-min type="number" min="0" placeholder="Mín" class="tc-input !py-1.5 !text-sm" value="${state.priceMin}" aria-label="Precio mínimo">
      <span class="text-neutral-600">—</span>
      <input data-price-max type="number" min="0" placeholder="Máx" class="tc-input !py-1.5 !text-sm" value="${state.priceMax}" aria-label="Precio máximo">
    </div>`;

  view.innerHTML = `
    <div class="tc-fade-in">
      <div class="flex flex-col items-start gap-1 mb-4">
        <h1 class="tc-section-title">Tienda</h1>
        <div class="tc-title-rule"></div>
      </div>

      <!-- ══ Barra de filtros ══ -->
      <div class="tc-filterbar">
        <div class="flex items-center gap-2">

          <!-- Móvil: abre el panel -->
          <button type="button" id="stOpenDrawer" class="tc-filter-trigger lg:hidden">
            ${ICON_FILTER}<span>Filtros</span>
            <span class="tc-filter-badge hidden" data-count>0</span>
          </button>

          <!-- Escritorio: desplegables en línea -->
          <div class="hidden lg:flex items-center gap-2">
            <div class="relative">
              <button type="button" class="tc-filter-trigger" data-pop-btn="cats" aria-expanded="false">
                <span>Departamentos</span>${ICON_CHEV}
              </button>
              <div class="tc-popover hidden" data-pop-panel="cats">
                <div data-cats class="tc-pop-scroll"></div>
              </div>
            </div>

            ${brands.length ? `
            <div class="relative">
              <button type="button" class="tc-filter-trigger" data-pop-btn="brands" aria-expanded="false">
                <span>Marca</span>${ICON_CHEV}
              </button>
              <div class="tc-popover hidden" data-pop-panel="brands">
                <div data-brands class="tc-pop-scroll"></div>
              </div>
            </div>` : ''}

            <div class="relative">
              <button type="button" class="tc-filter-trigger" data-pop-btn="price" aria-expanded="false">
                <span>Precio</span>${ICON_CHEV}
              </button>
              <div class="tc-popover tc-popover-narrow hidden" data-pop-panel="price">
                <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Precio (₡)</p>
                ${grupoPrecio()}
              </div>
            </div>
          </div>

          <select id="stSort" class="tc-input tc-select tc-sort-select">
            <option value="relevance">Orden: relevancia</option>
            <option value="priceAsc">Precio: menor a mayor</option>
            <option value="priceDesc">Precio: mayor a menor</option>
            <option value="name">Nombre A–Z</option>
          </select>
        </div>

        <!-- Filtros activos -->
        <div data-chips class="tc-chips hidden"></div>
      </div>

      <!-- ══ Resultados ══ -->
      <div id="stTopBar"></div>
      <div id="stGrid" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 my-4"></div>
      <div id="stEmpty" class="hidden text-center py-16">
        <p class="text-4xl mb-3">🔍</p>
        <p class="text-neutral-400 font-medium">No encontramos productos con esos criterios.</p>
        <p class="text-sm text-neutral-600 mt-1">Prueba con otra palabra o limpia los filtros.</p>
      </div>
      <div id="stBottomBar"></div>
    </div>

    <!-- ══ Panel de filtros en móvil (fuera del contenido animado) ══ -->
    <div id="stDrawer" class="tc-drawer hidden" role="dialog" aria-modal="true" aria-label="Filtros">
      <div class="tc-drawer-backdrop" data-drawer-close></div>
      <div class="tc-drawer-panel">
        <div class="tc-drawer-head">
          <h2 class="text-base font-semibold text-neutral-100">Filtros</h2>
          <button type="button" class="tc-drawer-x" data-drawer-close aria-label="Cerrar filtros">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <div class="tc-drawer-body">
          <section class="tc-filter-group">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Departamentos</h3>
            <div data-cats></div>
          </section>
          ${brands.length ? `
          <section class="tc-filter-group">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Marca</h3>
            <div data-brands></div>
          </section>` : ''}
          <section>
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Precio (₡)</h3>
            ${grupoPrecio()}
          </section>
        </div>
        <div class="tc-drawer-foot">
          <button type="button" class="tc-btn-ghost" data-clear>Limpiar</button>
          <button type="button" class="tc-btn-primary flex-1 justify-center" data-drawer-close>
            Ver <span data-results>0</span> productos
          </button>
        </div>
      </div>
    </div>`;

  const $ = (s) => view.querySelector(s);
  const $$ = (s) => [...view.querySelectorAll(s)];
  $('#stSort').value = state.sort;

  // ── Pintado de los filtros (escritorio y móvil comparten estado) ──
  function paintCats() {
    const html = cats.map(c => `
      <div class="mb-1">
        <div class="tc-filter-option ${state.cats.has(c.name) ? 'selected' : ''}" data-cat="${escapeHtml(c.name)}">
          <span class="flex-1">${escapeHtml(c.name)}</span>
          <span class="tc-filter-count">${cat.products.filter(p => p.category === c.name).length}</span>
        </div>
        ${c.subs.map(s => {
          const key = `${c.name}/${s}`;
          return `<div class="tc-filter-option ml-4 ${state.cats.has(key) ? 'selected' : ''}" data-cat="${escapeHtml(key)}">
            <span class="flex-1 text-[0.8rem]">${escapeHtml(s)}</span>
            <span class="tc-filter-count">${cat.products.filter(p => p.category === c.name && p.subcategory === s).length}</span>
          </div>`;
        }).join('')}
      </div>`).join('');
    $$('[data-cats]').forEach(el => { el.innerHTML = html; });
  }

  function paintBrands() {
    if (!brands.length) return;
    const html = brands.map(b => `
      <label class="tc-filter-option">
        <input type="checkbox" class="tc-check" data-brand value="${escapeHtml(b)}" ${state.brands.has(b) ? 'checked' : ''}>
        <span class="flex-1">${escapeHtml(b)}</span>
        <span class="tc-filter-count">${cat.products.filter(p => p.brand === b).length}</span>
      </label>`).join('');
    $$('[data-brands]').forEach(el => { el.innerHTML = html; });
  }

  function activeCount() {
    return state.cats.size + state.brands.size
      + (state.priceMin !== '' ? 1 : 0) + (state.priceMax !== '' ? 1 : 0);
  }

  function paintChips() {
    const chips = [
      ...[...state.cats].map(c => ({ tipo: 'cat', valor: c, texto: c.replace('/', ' › ') })),
      ...[...state.brands].map(b => ({ tipo: 'brand', valor: b, texto: b })),
    ];
    if (state.priceMin !== '') chips.push({ tipo: 'pmin', valor: '', texto: `Desde ₡${state.priceMin}` });
    if (state.priceMax !== '') chips.push({ tipo: 'pmax', valor: '', texto: `Hasta ₡${state.priceMax}` });

    $$('[data-chips]').forEach(w => {
      w.classList.toggle('hidden', !chips.length);
      w.innerHTML = chips.length ? `
        ${chips.map(c => `
          <button type="button" class="tc-chip" data-chip-tipo="${c.tipo}" data-chip-valor="${escapeHtml(c.valor)}">
            ${escapeHtml(c.texto)}${ICON_X}
          </button>`).join('')}
        <button type="button" class="tc-chip-clear" data-clear>Limpiar todo</button>` : '';
    });

    const n = activeCount();
    $$('[data-count]').forEach(el => {
      el.textContent = String(n);
      el.classList.toggle('hidden', n === 0);
    });
  }

  paintCats();
  paintBrands();

  // ── Interacción de filtros (delegada: sirve para las dos copias) ──
  view.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-cat]');
    if (opt) {
      const key = opt.dataset.cat;
      if (state.cats.has(key)) state.cats.delete(key);
      else state.cats.add(key);
      state.page = 1;
      paintCats();
      update();
      return;
    }

    const chip = e.target.closest('[data-chip-tipo]');
    if (chip) {
      const { chipTipo: tipo, chipValor: valor } = chip.dataset;
      if (tipo === 'cat') state.cats.delete(valor);
      else if (tipo === 'brand') state.brands.delete(valor);
      else if (tipo === 'pmin') state.priceMin = '';
      else if (tipo === 'pmax') state.priceMax = '';
      state.page = 1;
      $$('[data-price-min]').forEach(i => { i.value = state.priceMin; });
      $$('[data-price-max]').forEach(i => { i.value = state.priceMax; });
      paintCats(); paintBrands();
      update();
      return;
    }

    if (e.target.closest('[data-clear]')) clearAll();
  });

  view.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-brand]');
    if (!cb) return;
    if (cb.checked) state.brands.add(cb.value);
    else state.brands.delete(cb.value);
    state.page = 1;
    paintBrands();
    update();
  });

  let priceTimer;
  view.addEventListener('input', (e) => {
    const esMin = e.target.matches('[data-price-min]');
    const esMax = e.target.matches('[data-price-max]');
    if (!esMin && !esMax) return;
    const valor = e.target.value;
    // replicar en la otra copia del filtro sin quitarle el foco al usuario
    $$(esMin ? '[data-price-min]' : '[data-price-max]').forEach(i => { if (i !== e.target) i.value = valor; });
    clearTimeout(priceTimer);
    priceTimer = setTimeout(() => {
      if (esMin) state.priceMin = valor; else state.priceMax = valor;
      state.page = 1;
      update();
    }, 350);
  });

  $('#stSort').addEventListener('change', (e) => { state.sort = e.target.value; update(); });

  function clearAll() {
    state.cats.clear(); state.brands.clear();
    state.priceMin = ''; state.priceMax = ''; state.page = 1;
    closeDrawer();
    // si hay búsqueda en la URL, limpiarla también (eso dispara un render nuevo)
    if (queryFromHash()) { location.hash = '#/tienda'; return; }
    $$('[data-price-min]').forEach(i => { i.value = ''; });
    $$('[data-price-max]').forEach(i => { i.value = ''; });
    paintCats(); paintBrands();
    update();
  }

  // ── Desplegables de escritorio ──
  function closePops(excepto) {
    $$('[data-pop-panel]').forEach(p => {
      if (p === excepto) return;
      p.classList.add('hidden');
      view.querySelector(`[data-pop-btn="${p.dataset.popPanel}"]`)?.setAttribute('aria-expanded', 'false');
    });
  }

  $$('[data-pop-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = view.querySelector(`[data-pop-panel="${btn.dataset.popBtn}"]`);
      const abierto = !panel.classList.contains('hidden');
      closePops();
      panel.classList.toggle('hidden', abierto);
      btn.setAttribute('aria-expanded', String(!abierto));
    });
  });

  // un clic fuera cierra los desplegables (no bloquea el scroll en ningún momento)
  const onDocClick = (e) => { if (!e.target.closest('[data-pop-panel]')) closePops(); };
  const onKey = (e) => { if (e.key === 'Escape') { closePops(); closeDrawer(); } };
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);

  // ── Panel móvil ──
  const drawer = $('#stDrawer');
  function openDrawer() {
    drawer.classList.remove('hidden');
    // se congela el fondo para que no se desplace por debajo del panel
    document.body.classList.add('tc-no-scroll');
    requestAnimationFrame(() => drawer.classList.add('open'));
  }
  function closeDrawer() {
    if (drawer.classList.contains('hidden')) return;
    drawer.classList.remove('open');
    document.body.classList.remove('tc-no-scroll');
    setTimeout(() => drawer.classList.add('hidden'), 220);
  }
  $('#stOpenDrawer').addEventListener('click', openDrawer);
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-drawer-close]')) closeDrawer(); });

  // al abandonar la vista: soltar listeners globales y devolver el scroll
  const observer = new MutationObserver(() => {
    if (!view.contains(drawer)) {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('tc-no-scroll');
      observer.disconnect();
    }
  });
  observer.observe(view, { childList: true });

  // ── Filtrado + render ──
  function filtered() {
    // los combos son exclusivos de la portada (Inicio), no salen en Tienda
    let list = cat.products.filter(p => !p.combo);

    if (state.cats.size) {
      list = list.filter(p => {
        if (state.cats.has(p.category)) return true;
        return p.subcategory && state.cats.has(`${p.category}/${p.subcategory}`);
      });
    }
    if (state.brands.size) list = list.filter(p => state.brands.has(p.brand));

    const min = Number(state.priceMin);
    const max = Number(state.priceMax);
    if (state.priceMin !== '' && !Number.isNaN(min)) list = list.filter(p => discountedPrice(p.price, p.discountPct) >= min);
    if (state.priceMax !== '' && !Number.isNaN(max) && max > 0) list = list.filter(p => discountedPrice(p.price, p.discountPct) <= max);

    list = fuzzySearch(list, state.query); // ya ordena por relevancia

    if (state.sort === 'priceAsc') list.sort((a, b) => discountedPrice(a.price, a.discountPct) - discountedPrice(b.price, b.discountPct));
    else if (state.sort === 'priceDesc') list.sort((a, b) => discountedPrice(b.price, b.discountPct) - discountedPrice(a.price, a.discountPct));
    else if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return list;
  }

  function paginationBar(list, totalPages) {
    const start = list.length ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = Math.min(list.length, state.page * state.pageSize);

    // números: 1 … (p-1) p (p+1) … total
    const nums = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
    const pages = [...nums].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    let numsHtml = '';
    let prev = 0;
    for (const n of pages) {
      if (n - prev > 1) numsHtml += `<span class="text-neutral-600 px-1">…</span>`;
      numsHtml += `<button type="button" class="tc-page-btn ${n === state.page ? 'current' : ''}" data-page="${n}">${n}</button>`;
      prev = n;
    }

    const bar = document.createElement('div');
    bar.className = 'flex flex-wrap items-center justify-between gap-3 py-1';
    bar.innerHTML = `
      <div class="flex items-center gap-2 text-sm text-neutral-500">
        <span class="hidden sm:inline">Mostrar</span>
        <select data-size class="tc-input tc-select !w-auto !py-1.5 !text-sm">
          ${PAGE_SIZES.map(n => `<option value="${n}" ${n === state.pageSize ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <span class="hidden sm:inline">por página</span>
        <span class="ml-2 text-neutral-600">${start}–${end} de ${list.length}</span>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" class="tc-page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>
        ${numsHtml}
        <button type="button" class="tc-page-btn" data-page="${state.page + 1}" ${state.page >= totalPages ? 'disabled' : ''} aria-label="Siguiente">›</button>
        <span class="ml-2 text-xs text-neutral-600 hidden sm:inline">Ir a</span>
        <input data-goto type="number" min="1" max="${totalPages}" value="${state.page}"
          class="tc-input !w-16 !py-1.5 !text-sm text-center" aria-label="Número de página">
      </div>`;

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      const p = Number(btn.dataset.page);
      if (p >= 1 && p <= totalPages && p !== state.page) { state.page = p; update(true); }
    });
    bar.querySelector('[data-size]').addEventListener('change', (e) => {
      state.pageSize = Number(e.target.value);
      localStorage.setItem('tc_page_size', String(state.pageSize));
      state.page = 1;
      update(true);
    });
    bar.querySelector('[data-goto]').addEventListener('change', (e) => {
      const p = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1));
      if (p !== state.page) { state.page = p; update(true); }
    });
    return bar;
  }

  function update(scrollTop = false) {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const grid = $('#stGrid');
    const empty = $('#stEmpty');
    grid.innerHTML = '';
    const pageItems = list.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    pageItems.forEach(p => grid.appendChild(productCard(p)));
    empty.classList.toggle('hidden', list.length > 0);

    const top = $('#stTopBar'); const bottom = $('#stBottomBar');
    top.innerHTML = ''; bottom.innerHTML = '';
    if (list.length) {
      top.appendChild(paginationBar(list, totalPages));
      bottom.appendChild(paginationBar(list, totalPages));
    }

    paintChips();
    $$('[data-results]').forEach(el => { el.textContent = String(list.length); });
    if (scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  update();
}

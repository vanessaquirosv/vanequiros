// ═══════════════════════════════════════════════════════════════
// Tech & Chic — vista Tienda
// Paginación 5-50 por página (arriba y abajo, con número editable),
// filtros por categoría/subcategoría/marca/precio y búsqueda difusa.
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

  view.innerHTML = `
    <div class="tc-fade-in">
      <div class="flex flex-col items-start gap-1 mb-5">
        <h1 class="tc-section-title">Tienda</h1>
        <div class="tc-title-rule"></div>
      </div>

      <!-- Buscador -->
      <div class="flex flex-col sm:flex-row gap-3 mb-5">
        <div class="relative flex-1">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 h-5 w-5 text-violet-400/60 pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m21 21-4.34-4.34M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>
          <input id="stSearch" type="search" class="tc-input !pl-11" placeholder="Buscar productos… (no importa si se escapa una letra 😉)" value="${escapeHtml(state.query)}">
        </div>
        <select id="stSort" class="tc-input tc-select sm:w-52">
          <option value="relevance">Orden: relevancia</option>
          <option value="priceAsc">Precio: menor a mayor</option>
          <option value="priceDesc">Precio: mayor a menor</option>
          <option value="name">Nombre A–Z</option>
        </select>
        <button id="stFiltersBtn" type="button" class="tc-btn-secondary lg:hidden">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M7 12h10m-7 6h4"/></svg>
          Filtros
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[15.5rem_1fr] gap-6 items-start">
        <!-- Filtros -->
        <aside id="stSidebar" class="tc-panel p-4 hidden lg:block lg:sticky lg:top-20">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold uppercase tracking-wider text-violet-300/90">Filtros</h2>
            <button id="stClear" type="button" class="text-xs text-neutral-500 hover:text-fuchsia-300 transition-colors">Limpiar</button>
          </div>

          <div class="tc-filter-group">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Departamentos</h3>
            <div id="stCats"></div>
          </div>

          ${brands.length ? `
          <div class="tc-filter-group">
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Marca</h3>
            <div id="stBrands" class="max-h-52 overflow-y-auto pr-1"></div>
          </div>` : ''}

          <div>
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Precio (₡)</h3>
            <div class="flex items-center gap-2">
              <input id="stPriceMin" type="number" min="0" placeholder="Mín" class="tc-input !py-1.5 !text-sm" value="${state.priceMin}">
              <span class="text-neutral-600">—</span>
              <input id="stPriceMax" type="number" min="0" placeholder="Máx" class="tc-input !py-1.5 !text-sm" value="${state.priceMax}">
            </div>
          </div>
        </aside>

        <!-- Resultados -->
        <div>
          <div id="stTopBar"></div>
          <div id="stGrid" class="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4 my-4"></div>
          <div id="stEmpty" class="hidden text-center py-16">
            <p class="text-4xl mb-3">🔍</p>
            <p class="text-neutral-400 font-medium">No encontramos productos con esos criterios.</p>
            <p class="text-sm text-neutral-600 mt-1">Prueba con otra palabra o limpia los filtros.</p>
          </div>
          <div id="stBottomBar"></div>
        </div>
      </div>
    </div>`;

  const $ = (s) => view.querySelector(s);
  $('#stSort').value = state.sort;

  // ── Filtros: categorías ──
  const catsWrap = $('#stCats');
  catsWrap.innerHTML = cats.map(c => {
    const catSel = state.cats.has(c.name);
    return `
      <div class="mb-1">
        <div class="tc-filter-option ${catSel ? 'selected' : ''}" data-cat="${escapeHtml(c.name)}">
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
      </div>`;
  }).join('');

  catsWrap.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-cat]');
    if (!opt) return;
    const key = opt.dataset.cat;
    if (state.cats.has(key)) state.cats.delete(key);
    else state.cats.add(key);
    opt.classList.toggle('selected');
    state.page = 1;
    update();
  });

  // ── Filtros: marcas ──
  const brandsWrap = $('#stBrands');
  if (brandsWrap) {
    brandsWrap.innerHTML = brands.map(b => `
      <label class="tc-filter-option">
        <input type="checkbox" class="tc-check" value="${escapeHtml(b)}" ${state.brands.has(b) ? 'checked' : ''}>
        <span class="flex-1">${escapeHtml(b)}</span>
        <span class="tc-filter-count">${cat.products.filter(p => p.brand === b).length}</span>
      </label>`).join('');
    brandsWrap.addEventListener('change', (e) => {
      const cb = e.target.closest('input[type=checkbox]');
      if (!cb) return;
      if (cb.checked) state.brands.add(cb.value);
      else state.brands.delete(cb.value);
      state.page = 1;
      update();
    });
  }

  // ── Precio ──
  let priceTimer;
  const onPrice = () => {
    clearTimeout(priceTimer);
    priceTimer = setTimeout(() => {
      state.priceMin = $('#stPriceMin').value;
      state.priceMax = $('#stPriceMax').value;
      state.page = 1;
      update();
    }, 350);
  };
  $('#stPriceMin').addEventListener('input', onPrice);
  $('#stPriceMax').addEventListener('input', onPrice);

  // ── Búsqueda ──
  let searchTimer;
  $('#stSearch').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = e.target.value;
      state.page = 1;
      update();
    }, 250);
  });

  $('#stSort').addEventListener('change', (e) => { state.sort = e.target.value; update(); });

  $('#stClear').addEventListener('click', () => {
    state.query = ''; state.cats.clear(); state.brands.clear();
    state.priceMin = ''; state.priceMax = ''; state.page = 1;
    renderStore(view); // re-render limpio
  });

  $('#stFiltersBtn').addEventListener('click', () => {
    $('#stSidebar').classList.toggle('hidden');
  });

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
    if (scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  update();
}

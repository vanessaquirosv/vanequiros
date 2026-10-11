// ═══════════════════════════════════════════════════════════════
// Tech & Chic — vista Tienda
// Se recorre por departamentos (barra del header) y subdepartamentos
// (fichas bajo el título). Marca, precio y orden son filtros extra.
// Todo vive en la URL (#/tienda?dep=…&sub=…&q=…&marca=…&p=…), así
// cualquier vista se comparte, se recarga o se vuelve con "atrás".
// Paginación 5-50 por página arriba y abajo (requisito del cliente).
// ═══════════════════════════════════════════════════════════════
import { loadCatalog, catalogCategories, deptIcon } from '../catalog.js';
import { fuzzySearch } from '../search.js';
import { productCard } from '../product-card.js';
import { discountedPrice } from '../pricing.js';
import { escapeHtml } from '../modals.js';
import { parseHash, storeHref } from '../route.js';

const PAGE_SIZES = [5, 10, 15, 20, 30, 40, 50];
const SORTS = {
  relevance: 'Relevancia',
  priceAsc: 'Precio: menor a mayor',
  priceDesc: 'Precio: mayor a menor',
  name: 'Nombre A–Z',
};

function storedPageSize() {
  const n = Number(localStorage.getItem('tc_page_size'));
  return PAGE_SIZES.includes(n) ? n : 20;
}

/** Estado completo de la vista leído de la URL. */
function stateFromHash() {
  const p = parseHash().params;
  return {
    q: p.get('q') || '',
    dep: p.get('dep') || '',
    sub: p.get('sub') || '',
    brands: new Set((p.get('marca') || '').split('|').filter(Boolean)),
    priceMin: p.get('min') || '',
    priceMax: p.get('max') || '',
    sort: SORTS[p.get('orden')] ? p.get('orden') : 'relevance',
    page: Math.max(1, parseInt(p.get('p')) || 1),
    pageSize: storedPageSize(),
  };
}

function hrefFor(state, overrides = {}) {
  const s = { ...state, ...overrides };
  return storeHref({
    q: s.q, dep: s.dep, sub: s.sub,
    marca: [...s.brands],
    min: s.priceMin, max: s.priceMax,
    orden: s.sort === 'relevance' ? '' : s.sort,
    p: s.page > 1 ? s.page : '',
  });
}

const ICON_FILTER = '<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 6h16M7 12h10m-7 6h4"/></svg>';
const ICON_CHEV = '<svg class="tc-chev h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 9 6 6 6-6"/></svg>';
const ICON_X = '<svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>';

export async function renderStore(view) {
  const cat = await loadCatalog();
  if (!view.isConnected) return;

  const state = stateFromHash();
  const depts = catalogCategories(cat);
  const dept = depts.find(d => d.name === state.dep) || null;
  if (!dept) { state.dep = ''; state.sub = ''; }
  else if (!dept.subs.includes(state.sub)) state.sub = '';

  // ── Conjuntos base (se calculan una vez por visita a la vista) ──
  // 1) catálogo de Tienda (los combos son exclusivos de Inicio)
  // 2) búsqueda aplicada (si la hay) — ya viene ordenada por relevancia
  // 3) departamento / subdepartamento
  const all = cat.products.filter(p => !p.combo);
  const searched = state.q ? fuzzySearch(all, state.q) : all;
  const inDept = state.dep ? searched.filter(p => p.category === state.dep) : searched;
  const scoped = state.sub ? inDept.filter(p => p.subcategory === state.sub) : inDept;

  // marcas disponibles en lo que se está viendo
  const brandCounts = new Map();
  scoped.forEach(p => { if (p.brand) brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1); });
  const brands = [...brandCounts.keys()].sort((a, b) => a.localeCompare(b, 'es'));
  for (const b of [...state.brands]) if (!brandCounts.has(b)) state.brands.delete(b);

  // ── Encabezado ──
  const title = dept ? (state.sub || dept.name) : (state.q ? 'Resultados' : 'Tienda');
  const crumbs = [];
  if (dept) crumbs.push(`<a href="${storeHref({ q: state.q })}" class="hover:text-fuchsia-300">${state.q ? 'Todos los resultados' : 'Tienda'}</a>`);
  if (dept && state.sub) crumbs.push(`<a href="${storeHref({ q: state.q, dep: dept.name })}" class="hover:text-fuchsia-300">${escapeHtml(dept.name)}</a>`);

  // fichas de subdepartamentos (con conteo dentro de la búsqueda actual)
  const subCount = (s) => inDept.filter(p => p.subcategory === s).length;
  const subsHtml = dept && dept.subs.length ? `
    <div class="tc-subbar" role="list">
      <a href="${storeHref({ q: state.q, dep: dept.name })}" role="listitem" class="tc-sub ${!state.sub ? 'active' : ''}">
        Todo ${escapeHtml(dept.name)} <span class="tc-sub-n">${inDept.length}</span>
      </a>
      ${dept.subs.map(s => {
        const n = subCount(s);
        if (!n && state.q) return '';          // en una búsqueda, ocultar los vacíos
        return `<a href="${storeHref({ q: state.q, dep: dept.name, sub: s })}" role="listitem"
                   class="tc-sub ${state.sub === s ? 'active' : ''} ${!n ? 'empty' : ''}">
          ${escapeHtml(s)} <span class="tc-sub-n">${n}</span></a>`;
      }).join('')}
    </div>` : '';

  const grupoPrecio = () => `
    <div class="flex items-center gap-2">
      <input data-price-min type="number" inputmode="numeric" min="0" placeholder="Mín" class="tc-input !py-1.5" value="${escapeHtml(state.priceMin)}" aria-label="Precio mínimo">
      <span class="text-neutral-600">—</span>
      <input data-price-max type="number" inputmode="numeric" min="0" placeholder="Máx" class="tc-input !py-1.5" value="${escapeHtml(state.priceMax)}" aria-label="Precio máximo">
    </div>`;

  view.innerHTML = `
    <div class="tc-fade-in">
      <div class="mb-3">
        ${crumbs.length ? `<nav class="text-xs text-neutral-500 mb-1 truncate" aria-label="Ruta">${crumbs.join(' <span class="text-neutral-700">›</span> ')}</nav>` : ''}
        <h1 class="flex items-center gap-2">
          ${dept ? `<span class="text-2xl" aria-hidden="true">${deptIcon(dept.name)}</span>` : ''}
          <span class="tc-section-title">${escapeHtml(title)}</span>
        </h1>
        ${state.q ? `<p class="mt-1 text-sm text-neutral-400">Buscando <span class="text-white font-medium">“${escapeHtml(state.q)}”</span>${dept ? ` en ${escapeHtml(dept.name)}` : ''}</p>` : ''}
        <div class="tc-title-rule mt-2"></div>
      </div>

      ${subsHtml}

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
            ${brands.length > 1 ? `
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

          <select id="stSort" class="tc-input tc-select tc-sort-select" aria-label="Ordenar">
            ${Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>

        <!-- Filtros activos -->
        <div data-chips class="tc-chips hidden"></div>
      </div>

      <!-- ══ Resultados ══ -->
      <div id="stTopBar"></div>
      <div id="stGrid" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 my-4"></div>
      <div id="stEmpty" class="hidden text-center py-16">
        <p class="text-4xl mb-3">🔍</p>
        <p class="text-neutral-300 font-medium">No encontramos productos con esos criterios.</p>
        <p class="text-sm text-neutral-500 mt-1" data-empty-hint></p>
        <div class="mt-5 flex flex-wrap justify-center gap-2" data-empty-actions></div>
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
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Precio (₡)</h3>
            ${grupoPrecio()}
          </section>
          ${brands.length > 1 ? `
          <section>
            <h3 class="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Marca</h3>
            <div data-brands></div>
          </section>` : ''}
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

  // la barra de departamentos del header muestra cuántos resultados hay en cada uno
  if (state.q) {
    const counts = new Map();
    searched.forEach(p => counts.set(p.category, (counts.get(p.category) || 0) + 1));
    window.dispatchEvent(new CustomEvent('tc:dept-counts', { detail: counts }));
  }

  /** Refleja el estado en la URL sin crear otra entrada del historial. */
  function syncUrl() {
    const href = hrefFor(state);
    if (location.hash !== href) history.replaceState(history.state, '', href);
  }

  // ── Pintado de filtros (escritorio y móvil comparten estado) ──
  function paintBrands() {
    const html = brands.map(b => `
      <label class="tc-filter-option">
        <input type="checkbox" class="tc-check" data-brand value="${escapeHtml(b)}" ${state.brands.has(b) ? 'checked' : ''}>
        <span class="flex-1">${escapeHtml(b)}</span>
        <span class="tc-filter-count">${brandCounts.get(b)}</span>
      </label>`).join('');
    $$('[data-brands]').forEach(el => { el.innerHTML = html; });
  }

  function activeCount() {
    return state.brands.size + (state.priceMin !== '' ? 1 : 0) + (state.priceMax !== '' ? 1 : 0);
  }

  function paintChips() {
    const chips = [...state.brands].map(b => ({ tipo: 'brand', valor: b, texto: b }));
    if (state.priceMin !== '') chips.push({ tipo: 'pmin', valor: '', texto: `Desde ₡${state.priceMin}` });
    if (state.priceMax !== '') chips.push({ tipo: 'pmax', valor: '', texto: `Hasta ₡${state.priceMax}` });

    $$('[data-chips]').forEach(w => {
      w.classList.toggle('hidden', !chips.length);
      w.innerHTML = chips.length ? `
        ${chips.map(c => `
          <button type="button" class="tc-chip" data-chip-tipo="${c.tipo}" data-chip-valor="${escapeHtml(c.valor)}">
            ${escapeHtml(c.texto)}${ICON_X}
          </button>`).join('')}
        <button type="button" class="tc-chip-clear" data-clear>Quitar filtros</button>` : '';
    });

    const n = activeCount();
    $$('[data-count]').forEach(el => {
      el.textContent = String(n);
      el.classList.toggle('hidden', n === 0);
    });
  }

  paintBrands();

  // ── Interacción de filtros (delegada: sirve para las dos copias) ──
  view.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip-tipo]');
    if (chip) {
      const { chipTipo: tipo, chipValor: valor } = chip.dataset;
      if (tipo === 'brand') state.brands.delete(valor);
      else if (tipo === 'pmin') state.priceMin = '';
      else if (tipo === 'pmax') state.priceMax = '';
      state.page = 1;
      $$('[data-price-min]').forEach(i => { i.value = state.priceMin; });
      $$('[data-price-max]').forEach(i => { i.value = state.priceMax; });
      paintBrands();
      update();
      return;
    }
    if (e.target.closest('[data-clear]')) clearFilters();
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

  $('#stSort').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; update(); });

  function clearFilters() {
    state.brands.clear();
    state.priceMin = ''; state.priceMax = ''; state.page = 1;
    $$('[data-price-min], [data-price-max]').forEach(i => { i.value = ''; });
    paintBrands();
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
    let list = scoped;
    if (state.brands.size) list = list.filter(p => state.brands.has(p.brand));

    const min = Number(state.priceMin);
    const max = Number(state.priceMax);
    if (state.priceMin !== '' && !Number.isNaN(min)) list = list.filter(p => discountedPrice(p.price, p.discountPct) >= min);
    if (state.priceMax !== '' && !Number.isNaN(max) && max > 0) list = list.filter(p => discountedPrice(p.price, p.discountPct) <= max);

    list = list.slice();
    if (state.sort === 'priceAsc') list.sort((a, b) => discountedPrice(a.price, a.discountPct) - discountedPrice(b.price, b.discountPct));
    else if (state.sort === 'priceDesc') list.sort((a, b) => discountedPrice(b.price, b.discountPct) - discountedPrice(a.price, a.discountPct));
    else if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return list;
  }

  /** Arriba (compacta en el celular) y abajo (completa). */
  function paginationBar(list, totalPages, { top }) {
    const start = list.length ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = Math.min(list.length, state.page * state.pageSize);

    // números: 1 … (p-1) p (p+1) … total
    const nums = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
    const pages = [...nums].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    let numsHtml = '';
    let prev = 0;
    for (const n of pages) {
      if (n - prev > 1) numsHtml += `<span class="text-neutral-600 px-0.5">…</span>`;
      numsHtml += `<button type="button" class="tc-page-btn ${n === state.page ? 'current' : ''}" data-page="${n}">${n}</button>`;
      prev = n;
    }

    const bar = document.createElement('div');
    bar.className = 'tc-pagebar';
    bar.innerHTML = `
      <div class="flex items-center gap-2 text-sm text-neutral-500">
        <select data-size class="tc-input tc-select !w-auto !py-1.5" aria-label="Productos por página">
          ${PAGE_SIZES.map(n => `<option value="${n}" ${n === state.pageSize ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <span class="hidden sm:inline">por página</span>
        <span class="ml-1 text-neutral-500 whitespace-nowrap">${start}–${end} de ${list.length}</span>
      </div>
      ${totalPages > 1 ? `
      <div class="${top ? 'hidden sm:flex' : 'flex'} items-center gap-1">
        <button type="button" class="tc-page-btn" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''} aria-label="Anterior">‹</button>
        ${numsHtml}
        <button type="button" class="tc-page-btn" data-page="${state.page + 1}" ${state.page >= totalPages ? 'disabled' : ''} aria-label="Siguiente">›</button>
        <span class="ml-2 text-xs text-neutral-600 hidden md:inline">Ir a</span>
        <input data-goto type="number" inputmode="numeric" min="1" max="${totalPages}" value="${state.page}"
          class="tc-input !w-14 !py-1.5 text-center hidden md:block" aria-label="Número de página">
      </div>` : ''}`;

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
    bar.querySelector('[data-goto]')?.addEventListener('change', (e) => {
      const p = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1));
      if (p !== state.page) { state.page = p; update(true); }
    });
    return bar;
  }

  function paintEmpty() {
    const actions = [];
    if (activeCount()) actions.push(`<button type="button" class="tc-btn-secondary !py-2 !text-sm" data-clear>Quitar filtros</button>`);
    if (state.q && state.dep) actions.push(`<a href="${storeHref({ q: state.q })}" class="tc-btn-secondary !py-2 !text-sm">Buscar en todos los departamentos</a>`);
    if (state.q) actions.push(`<a href="${state.dep ? storeHref({ dep: state.dep }) : '#/tienda'}" class="tc-btn-ghost !text-sm">Ver ${state.dep ? `todo ${escapeHtml(state.dep)}` : 'toda la tienda'}</a>`);
    $('[data-empty-actions]').innerHTML = actions.join('');
    $('[data-empty-hint]').textContent = state.q
      ? 'Prueba con otra palabra, revisa la ortografía o busca en todos los departamentos.'
      : 'Prueba quitando algún filtro.';
  }

  function update(scrollTop = false) {
    const list = filtered();
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const grid = $('#stGrid');
    const empty = $('#stEmpty');
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.slice((state.page - 1) * state.pageSize, state.page * state.pageSize)
      .forEach(p => frag.appendChild(productCard(p)));
    grid.appendChild(frag);
    empty.classList.toggle('hidden', list.length > 0);
    if (!list.length) paintEmpty();

    const top = $('#stTopBar'); const bottom = $('#stBottomBar');
    top.innerHTML = ''; bottom.innerHTML = '';
    if (list.length) {
      top.appendChild(paginationBar(list, totalPages, { top: true }));
      if (totalPages > 1) bottom.appendChild(paginationBar(list, totalPages, { top: false }));
    }

    paintChips();
    $$('[data-results]').forEach(el => { el.textContent = String(list.length); });
    syncUrl();
    if (scrollTop) {
      // al cambiar de página se vuelve al inicio de los resultados, no al tope de la página
      const y = $('#stTopBar').getBoundingClientRect().top + window.scrollY
        - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tc-header-h')) || 0) - 70;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }

  update();
}

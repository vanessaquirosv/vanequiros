// ═══════════════════════════════════════════════════════════════
// Tech & Chic — rutas y enlaces
// La URL es la fuente de verdad: departamento, subdepartamento,
// búsqueda, filtros y producto viven en el hash, así cualquier
// pantalla se puede compartir, recargar o volver con "atrás".
//   #/tienda?dep=Hogar&sub=Cocina&q=taza&marca=X&min=0&max=9&orden=priceAsc&p=2
//   #/producto/A3F91C02
// ═══════════════════════════════════════════════════════════════

/** { route, args, params } de la URL actual. */
export function parseHash(hash = location.hash) {
  const [path, qs = ''] = hash.replace(/^#\/?/, '').split('?');
  const [route = '', ...args] = path.split('/').map(s => decodeURIComponent(s));
  return { route, args, params: new URLSearchParams(qs) };
}

/** Enlace a la tienda con los parámetros dados (los vacíos se omiten). */
export function storeHref(params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) { if (v.length) qs.set(k, v.join('|')); }
    else if (v !== '' && v != null) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `#/tienda?${s}` : '#/tienda';
}

export function productHref(code) {
  return `#/producto/${encodeURIComponent(String(code).toUpperCase())}`;
}

/** URL absoluta de un producto, para compartir fuera de la página. */
export function productShareUrl(code) {
  const base = location.href.split('#')[0].replace(/index\.html$/, '');
  return base + productHref(code);
}

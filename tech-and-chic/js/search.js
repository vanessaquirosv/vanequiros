// ═══════════════════════════════════════════════════════════════
// Tech & Chic — búsqueda difusa
// Requisito: coincidencias "al 90%" ⇒ se tolera ~10% de errores de
// escritura por palabra (mínimo 1 letra), más coincidencia por
// prefijo/substring. Sin dependencias externas.
// ═══════════════════════════════════════════════════════════════

/** Normaliza: minúsculas, sin tildes/diacríticos, sin símbolos raros. */
export function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Distancia Damerau-Levenshtein acotada (corta cuando supera maxDist).
 * Cubre inserciones, borrados, sustituciones y transposiciones.
 */
export function editDistance(a, b, maxDist) {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (!la) return lb;
  if (!lb) return la;

  let prevPrev = null;
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);

  for (let i = 1; i <= la; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(
        prev[j] + 1,        // borrado
        cur[j - 1] + 1,     // inserción
        prev[j - 1] + cost, // sustitución
      );
      // transposición
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prevPrev[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > maxDist) return maxDist + 1; // poda temprana
    prevPrev = prev;
    prev = cur;
  }
  return prev[lb];
}

/** Ediciones permitidas para una palabra: 10% de su largo, mínimo 1. */
function allowedEdits(word) {
  return Math.max(1, Math.floor(word.length * 0.1));
}

/**
 * ¿La palabra de búsqueda `q` coincide con el token `t`?
 * 1) substring directo, 2) distancia de edición dentro del margen,
 * 3) prefijo difuso (para búsquedas parciales tipo "audif").
 */
function tokenMatches(q, t) {
  if (!q) return true;
  if (t.includes(q)) return true;
  const maxD = allowedEdits(q);
  if (editDistance(q, t, maxD) <= maxD) return true;
  if (t.length > q.length + 1) {
    // comparar contra el prefijo del token (misma longitud + margen)
    const pref = t.slice(0, q.length);
    if (editDistance(q, pref, maxD) <= maxD) return true;
  }
  return false;
}

/**
 * Filtra y ordena productos por relevancia frente a `query`.
 * Un producto coincide si TODAS las palabras de la búsqueda
 * encuentran match en nombre/marca/categoría/subcategoría.
 * @returns {Array} productos ordenados por score descendente
 */
export function fuzzySearch(products, query) {
  const nq = normalize(query);
  if (!nq) return products.slice();

  const qTokens = nq.split(' ');
  const results = [];

  for (const prod of products) {
    const haystack = normalize(
      `${prod.name} ${prod.brand || ''} ${prod.category || ''} ${prod.subcategory || ''}`
    );
    const hTokens = haystack.split(' ');

    let score = 0;
    let allMatch = true;

    for (const q of qTokens) {
      let best = 0;
      for (const t of hTokens) {
        if (t === q) { best = Math.max(best, 3); break; }
        if (t.startsWith(q)) { best = Math.max(best, 2.5); continue; }
        if (tokenMatches(q, t)) { best = Math.max(best, 2); }
      }
      if (!best && haystack.includes(q)) best = 1.5;
      if (!best) { allMatch = false; break; }
      score += best;
    }

    if (allMatch) {
      // bonus si el nombre empieza igual que la búsqueda
      if (normalize(prod.name).startsWith(nq)) score += 2;
      results.push({ prod, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.map(r => r.prod);
}

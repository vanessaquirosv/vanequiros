// ═══════════════════════════════════════════════════════════════
// Tech & Chic — carga del catálogo
// Fuente: Firestore (docs catalog/meta + catalog/chunk-N) con caché
// en localStorage por versión (si la versión no cambió: 1 sola
// lectura de Firestore por visita). Fallback: catálogo demo local.
// ═══════════════════════════════════════════════════════════════
import { TC_CONFIG } from './tc-config.js';

let _catalog = null;
let _loading = null;

/** Devuelve el catálogo (cachea en memoria durante la sesión). */
export function loadCatalog() {
  if (_catalog) return Promise.resolve(_catalog);
  if (_loading) return _loading;
  _loading = doLoad().then(cat => { _catalog = cat; _loading = null; return cat; });
  return _loading;
}

export function getCatalog() { return _catalog; }

export function getProduct(code) {
  return _catalog?.products.find(p => p.code === code) || null;
}

async function doLoad() {
  try {
    const cat = await loadFromFirestore();
    if (cat) return cat;
  } catch (err) {
    console.warn('[catalog] Firebase no disponible, usando catálogo demo:', err?.message || err);
  }
  const { SEED_CATALOG } = await import('./seed-catalog.js');
  return SEED_CATALOG;
}

async function loadFromFirestore() {
  // firebase-config.js lo genera el workflow de despliegue (secrets TC_FIREBASE_*)
  let cfg;
  try {
    const mod = await import('./firebase-config.js');
    cfg = mod.firebaseConfig;
  } catch {
    return null; // sin config → modo demo
  }
  if (!cfg?.apiKey || !cfg?.projectId) return null;

  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
  const { getFirestore, doc, getDoc, getDocFromServer } =
    await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');

  const app = initializeApp(cfg);
  const db = getFirestore(app);

  // 1. Leer solo la versión
  const metaSnap = await getDoc(doc(db, 'catalog', 'meta'));
  if (!metaSnap.exists()) return null;
  const meta = metaSnap.data();

  // 2. ¿Ya la tenemos en caché local? → cero lecturas extra
  try {
    const cached = JSON.parse(localStorage.getItem(TC_CONFIG.catalogCacheKey) || 'null');
    if (cached && cached.version === meta.version && cached.data?.products) {
      return cached.data;
    }
  } catch { /* caché corrupta: se ignora */ }

  // 3. Descargar chunks y reconstruir
  const chunkCount = Number(meta.chunkCount) || 1;
  let jsonStr = '';
  for (let i = 0; i < chunkCount; i++) {
    const snap = await getDoc(doc(db, 'catalog', `chunk-${i}`));
    if (!snap.exists()) throw new Error(`Falta catalog/chunk-${i}`);
    jsonStr += snap.data().json || '';
  }
  const data = JSON.parse(jsonStr);
  data.version = meta.version;
  data.updatedAt = meta.updatedAt || null;

  try {
    localStorage.setItem(TC_CONFIG.catalogCacheKey, JSON.stringify({ version: meta.version, data }));
  } catch { /* almacenamiento lleno: seguimos sin caché */ }

  return data;
}

/** Categorías presentes (usa la lista publicada; completa con las de productos). */
export function catalogCategories(cat) {
  const list = (cat.categories || []).map(c => ({ name: c.name, subs: [...(c.subs || [])] }));
  const byName = new Map(list.map(c => [c.name, c]));
  for (const prod of cat.products) {
    if (!prod.category) continue;
    let entry = byName.get(prod.category);
    if (!entry) { entry = { name: prod.category, subs: [] }; byName.set(prod.category, entry); list.push(entry); }
    if (prod.subcategory && !entry.subs.includes(prod.subcategory)) entry.subs.push(prod.subcategory);
  }
  return list;
}

/** Marcas presentes en el catálogo (sin contar combos). */
export function catalogBrands(cat) {
  return [...new Set(cat.products.filter(p => !p.combo).map(p => p.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
}

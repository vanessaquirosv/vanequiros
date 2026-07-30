// ═══════════════════════════════════════════════════════════════
// Tech & Chic — motor de precios (CRC)
// Estas MISMAS reglas viven editables en el panel admin / Apps Script;
// aquí se incluyen los valores por defecto y las funciones de cálculo.
// ═══════════════════════════════════════════════════════════════

// Margen degresivo: precioVenta = precioAlmacen × (1 + markup)
export const DEFAULT_MARKUP_TIERS = [
  { min: 0,        max: 1000,      markup: 5.00 },
  { min: 1001,     max: 3000,      markup: 3.50 },
  { min: 3001,     max: 7000,      markup: 2.50 },
  { min: 7001,     max: 15000,     markup: 1.50 },
  { min: 15001,    max: 30000,     markup: 1.00 },
  { min: 30001,    max: 60000,     markup: 0.70 },
  { min: 60001,    max: 120000,    markup: 0.45 },
  { min: 120001,   max: 250000,    markup: 0.30 },
  { min: 250001,   max: 500000,    markup: 0.18 },
  { min: 500001,   max: 800000,    markup: 0.10 },
  { min: 800001,   max: 999999999, markup: 0.05 },
];

// Los precios de venta se redondean SIEMPRE hacia arriba a este múltiplo
// (0 = desactivado). El valor real lo fija el panel admin al publicar.
export const DEFAULT_ROUND_STEP = 500;

// Costo operativo según la Diferencia (venta − almacén) del carrito
export const DEFAULT_OPCOST_TIERS = [
  { difMin: 0,     difMax: 1000,      costo: 3000 },
  { difMin: 1001,  difMax: 1500,      costo: 2800 },
  { difMin: 1501,  difMax: 2000,      costo: 2600 },
  { difMin: 2001,  difMax: 2500,      costo: 2400 },
  { difMin: 2501,  difMax: 3000,      costo: 2200 },
  { difMin: 3001,  difMax: 3500,      costo: 2000 },
  { difMin: 3501,  difMax: 4000,      costo: 1800 },
  { difMin: 4001,  difMax: 4500,      costo: 1600 },
  { difMin: 4501,  difMax: 5000,      costo: 1400 },
  { difMin: 5001,  difMax: 5500,      costo: 1200 },
  { difMin: 5501,  difMax: 6000,      costo: 1000 },
  { difMin: 6001,  difMax: 7000,      costo: 500  },
  { difMin: 7001,  difMax: 999999999, costo: 0    },
];

/** Redondea hacia arriba al múltiplo indicado (step ≤ 0 ⇒ sin redondeo). */
export function roundUpTo(value, step = DEFAULT_ROUND_STEP) {
  const n = Number(value) || 0;
  const s = Number(step) || 0;
  if (s <= 0) return Math.round(n);
  return Math.ceil(n / s) * s;
}

/**
 * Calcula el precio de venta a partir del precio de almacén.
 * @param {number} precioAlmacen  costo de adquisición en CRC
 * @param {Array}  tiers          tabla de rangos (por defecto la oficial)
 * @param {number} roundStep      múltiplo al que se redondea hacia arriba
 * @returns {number} precio de venta en colones enteros
 */
export function computeSalePrice(precioAlmacen, tiers = DEFAULT_MARKUP_TIERS, roundStep = DEFAULT_ROUND_STEP) {
  const cost = Math.max(0, Number(precioAlmacen) || 0);
  const tier = tiers.find(t => cost >= t.min && cost <= t.max) || tiers[tiers.length - 1];
  return roundUpTo(cost + cost * tier.markup, roundStep);
}

/**
 * Calcula el costo operativo del carrito según la diferencia total
 * (suma de precioVenta − precioAlmacen de todos los ítems).
 * @param {number} diferencia  diferencia total del carrito en CRC
 * @param {Array}  tiers       tabla de rangos (por defecto la oficial)
 * @returns {number} costo operativo en CRC
 */
export function computeOperationalCost(diferencia, tiers = DEFAULT_OPCOST_TIERS) {
  const dif = Math.max(0, Math.round(Number(diferencia) || 0));
  const tier = tiers.find(t => dif >= t.difMin && dif <= t.difMax);
  return tier ? tier.costo : 0;
}

/** Precio final con descuento aplicado (promos). */
export function discountedPrice(price, discountPct) {
  const pct = Math.min(95, Math.max(0, Number(discountPct) || 0));
  if (!pct) return Math.round(price);
  return Math.round(price * (1 - pct / 100));
}

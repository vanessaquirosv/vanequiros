// ═══════════════════════════════════════════════════════════════
// Tech & Chic — configuración general de la tienda
// ═══════════════════════════════════════════════════════════════

export const TC_CONFIG = {
  // URL del Web App de Google Apps Script (ventas, usuarios, reseñas).
  // Vacío ⇒ modo demostración local (todo se guarda en este navegador).
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwCslc_tkUkdbotEM0kMbnCZVNsgsEZ6GKyoyrti52eFtkp0hcEq5QFOn2CAiHSpIU0QA/exec',

  // Contacto para órdenes
  whatsappNumber: '50685836477',       // Costa Rica: +506 8583 6477
  instagramUser: 'techchic.cr',

  // Nombre visible de la tienda
  storeName: 'Tech & Chic',

  // Versión de caché local del catálogo (subir si cambia el formato)
  catalogCacheKey: 'tc_catalog_v1',
};

// Convierte un ID (o link) de Google Drive en URL de imagen embebible.
export function driveImageUrl(idOrUrl, width = 800) {
  if (!idOrUrl) return '';
  const s = String(idOrUrl).trim();
  if (/^https?:\/\//i.test(s)) {
    // Extraer FILE_ID de links de Drive conocidos
    const m = s.match(/(?:\/d\/|[?&]id=)([\w-]{20,})/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w${width}`;
    return s; // URL normal (http) — se usa tal cual
  }
  return `https://lh3.googleusercontent.com/d/${s}=w${width}`;
}

// Formato de moneda — Colones Costarricenses
const crcFmt = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });
export function fmtCRC(n) {
  return '₡' + crcFmt.format(Math.round(Number(n) || 0));
}

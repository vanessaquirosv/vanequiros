/**
 * Carga firebase-config.js con mensajes claros si falta el archivo.
 */
export async function loadFirebaseConfig() {
  let mod;
  try {
    mod = await import("./firebase-config.js");
  } catch (err) {
    throw new Error(
      "No se pudo cargar js/web-rifa/firebase-config.js. " +
        "En tu PC: copia firebase-config.example.js → firebase-config.js. " +
        "En GitHub Pages: Settings → Pages → Source debe ser «GitHub Actions» (no «Deploy from branch») " +
        "y los 6 secrets FIREBASE_* deben estar configurados."
    );
  }

  const cfg = mod.firebaseConfig;
  if (!cfg?.apiKey || cfg.apiKey === "YOUR_API_KEY") {
    throw new Error(
      "firebase-config.js existe pero tiene valores placeholder. Completa la configuración real de Firebase."
    );
  }

  return cfg;
}

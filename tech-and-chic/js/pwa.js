// ═══════════════════════════════════════════════════════════════
// Tech & Chic — instalar como app
// Android/Chrome: se captura `beforeinstallprompt` y se ofrece un
// botón propio (Chrome ya no siempre muestra la opción solo).
// iPhone: Safari no tiene ese evento → se muestran los pasos.
// Los botones con [data-install] aparecen solo cuando aplica.
// ═══════════════════════════════════════════════════════════════
import { openModal, toast } from './modals.js';

let deferredPrompt = null;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** ¿Tiene sentido ofrecer "Instalar"? */
export function canOfferInstall() {
  if (isStandalone()) return false;
  return !!deferredPrompt || isIOS();
}

/** Muestra u oculta todos los botones [data-install] de la página. */
export function syncInstallButtons(root = document) {
  const show = canOfferInstall();
  root.querySelectorAll('[data-install]').forEach(el => el.classList.toggle('hidden', !show));
}

export async function promptInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    syncInstallButtons();
    if (outcome === 'accepted') toast('¡Listo! Tech & Chic quedó instalada 💜', 'success');
    return;
  }
  if (isIOS()) {
    openModal(`
      <div class="pt-2">
        <h2 class="font-serif text-2xl font-semibold text-white">Instalar en tu iPhone</h2>
        <ol class="mt-4 space-y-3 text-sm text-neutral-300 leading-relaxed list-decimal pl-5">
          <li>Abre esta página en <span class="text-white font-medium">Safari</span>.</li>
          <li>Toca el botón <span class="text-white font-medium">Compartir</span>
            <svg class="inline h-4 w-4 -mt-1 text-violet-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0-12L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>.</li>
          <li>Elige <span class="text-white font-medium">“Agregar a pantalla de inicio”</span>.</li>
        </ol>
      </div>`);
  }
}

export function initPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('[pwa] SW no registrado:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // se ofrece con nuestro propio botón
    deferredPrompt = e;
    syncInstallButtons();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; syncInstallButtons(); });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-install]')) promptInstall();
  });
  syncInstallButtons();
}

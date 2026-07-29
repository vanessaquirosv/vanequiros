// ═══════════════════════════════════════════════════════════════
// Tech & Chic — sesión de usuario en el header + modales de
// login / registro / editar perfil. Comprar NUNCA requiere cuenta.
// ═══════════════════════════════════════════════════════════════
import { api, getSession, clearSession } from './api.js';
import { openModal, toast, escapeHtml } from './modals.js';
import { getCart, mergeCart } from './cart-state.js';
import { driveImageUrl } from './tc-config.js';

// ── Render del área de sesión en el header ──────────────────────
export function initAuth() {
  renderAuthArea();
  window.addEventListener('tc:auth-changed', renderAuthArea);

  // sincronizar carrito al servidor cuando cambia (solo con sesión)
  let syncTimer;
  window.addEventListener('tc:cart-changed', () => {
    if (!getSession()?.user) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      api('saveCart', { items: getCart() }).catch(() => {});
    }, 800);
  });
}

function initials(nombre) {
  return String(nombre || '?')
    .trim().split(/\s+/).slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

function avatarHtml(user, sizeCls = '') {
  const foto = user.fotoUrl ? driveImageUrl(user.fotoUrl, 96) : '';
  return `<span class="tc-avatar ${sizeCls}">${foto
    ? `<img src="${foto}" alt="" onerror="this.replaceWith('${initials(user.nombre)}')">`
    : initials(user.nombre)}</span>`;
}

function renderAuthArea() {
  const area = document.getElementById('authArea');
  if (!area) return;
  const session = getSession();

  if (!session?.user) {
    area.innerHTML = `
      <button type="button" id="btnLogin" class="tc-btn-ghost !text-[0.83rem]">Iniciar sesión</button>
      <button type="button" id="btnRegister" class="tc-btn-secondary !px-3.5 !py-1.5 !text-[0.83rem]">Regístrate</button>`;
    area.querySelector('#btnLogin').addEventListener('click', openLoginModal);
    area.querySelector('#btnRegister').addEventListener('click', openRegisterModal);
    return;
  }

  const user = session.user;
  area.innerHTML = `
    <div class="relative">
      <button type="button" id="userBtn" class="flex items-center gap-2.5 rounded-full pl-1 pr-2 py-1 hover:bg-violet-500/10 transition-colors" aria-haspopup="menu">
        ${avatarHtml(user)}
        <span class="hidden sm:flex flex-col items-start leading-tight">
          <span class="text-sm font-semibold text-neutral-100 max-w-[9rem] truncate">${escapeHtml(user.usuario)}</span>
          <span id="miniLogout" class="text-[10px] text-neutral-500 hover:text-red-400 transition-colors">Cerrar sesión</span>
        </span>
        <svg class="h-3.5 w-3.5 text-neutral-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 9 6 6 6-6"/></svg>
      </button>
      <div id="userMenu" class="tc-dropdown hidden" role="menu">
        <div class="px-3 py-2.5 border-b border-violet-500/10 mb-1">
          <p class="text-sm font-semibold text-neutral-100 truncate">${escapeHtml(user.nombre)}</p>
          <p class="text-xs text-neutral-500 truncate">${escapeHtml(user.email)}</p>
        </div>
        <button type="button" class="tc-dropdown-item" data-menu="perfil">
          <svg class="h-4 w-4 text-violet-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0A17 17 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.65Z"/></svg>
          Editar Perfil
        </button>
        <button type="button" class="tc-dropdown-item" data-menu="historial">
          <svg class="h-4 w-4 text-violet-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7.5v9l-8 4.5-8-4.5v-9L12 3l8 4.5ZM12 12l8-4.5M12 12v9m0-9L4 7.5"/></svg>
          Historial de compras
        </button>
        <div class="tc-divider my-1"></div>
        <button type="button" class="tc-dropdown-item danger" data-menu="logout">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-7.5A2.25 2.25 0 0 0 3.75 5.25v13.5A2.25 2.25 0 0 0 6 21h7.5a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"/></svg>
          Cerrar sesión
        </button>
      </div>
    </div>`;

  const menu = area.querySelector('#userMenu');
  const userBtn = area.querySelector('#userBtn');

  userBtn.addEventListener('click', (e) => {
    if (e.target.closest('#miniLogout')) { doLogout(); return; }
    menu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!area.contains(e.target)) menu.classList.add('hidden');
  });
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-menu]');
    if (!item) return;
    menu.classList.add('hidden');
    if (item.dataset.menu === 'perfil') openEditProfileModal();
    else if (item.dataset.menu === 'historial') { location.hash = '#/compras'; }
    else if (item.dataset.menu === 'logout') doLogout();
  });
}

async function doLogout() {
  try { await api('logout'); } catch { clearSession(); }
  toast('Sesión cerrada. ¡Vuelve pronto! 💜');
}

// ── Modal: iniciar sesión ───────────────────────────────────────
export function openLoginModal() {
  const { overlay, close } = openModal(`
    <div class="pt-2">
      <h2 class="font-serif text-2xl font-semibold text-white text-center">Iniciar sesión</h2>
      <form id="loginForm" class="mt-6 space-y-4">
        <div>
          <label class="tc-label" for="liId">Email o nombre de usuario</label>
          <input id="liId" class="tc-input" autocomplete="username" required>
        </div>
        <div>
          <label class="tc-label" for="liPass">Contraseña</label>
          <input id="liPass" type="password" class="tc-input" autocomplete="current-password" required>
        </div>
        <p id="liError" class="hidden text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <button type="submit" class="tc-btn-primary w-full" id="liBtn">Entrar</button>
      </form>
      <p class="mt-4 text-center text-sm text-neutral-500">
        ¿No tienes cuenta? <button type="button" id="liToRegister" class="text-fuchsia-300 hover:underline font-medium">Regístrate</button>
      </p>
    </div>`);

  overlay.querySelector('#liToRegister').addEventListener('click', () => { close(); openRegisterModal(); });
  overlay.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#liBtn');
    const errEl = overlay.querySelector('#liError');
    btn.disabled = true;
    btn.innerHTML = '<span class="tc-spinner"></span>';
    errEl.classList.add('hidden');
    try {
      await api('login', {
        id: overlay.querySelector('#liId').value,
        password: overlay.querySelector('#liPass').value,
      });
      await syncCartAfterLogin();
      close();
      toast('¡Bienvenido de vuelta! 💜', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

// ── Modal: registro ─────────────────────────────────────────────
export function openRegisterModal() {
  const { overlay, close } = openModal(`
    <div class="pt-2">
      <h2 class="font-serif text-2xl font-semibold text-white text-center">Crear cuenta</h2>
      <p class="mt-1.5 text-center text-xs text-neutral-500">Opcional — siempre puedes comprar sin cuenta.</p>
      <form id="regForm" class="mt-6 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="tc-label" for="rgNombre">Nombre completo</label>
            <input id="rgNombre" class="tc-input" autocomplete="name" required>
          </div>
          <div>
            <label class="tc-label" for="rgUsuario">Nombre de usuario</label>
            <input id="rgUsuario" class="tc-input" autocomplete="nickname" required maxlength="24">
          </div>
        </div>
        <div>
          <label class="tc-label" for="rgEmail">Email</label>
          <input id="rgEmail" type="email" class="tc-input" autocomplete="email" required>
        </div>
        <div>
          <label class="tc-label" for="rgPass">Contraseña <span class="text-neutral-600">(mínimo 6 caracteres)</span></label>
          <input id="rgPass" type="password" class="tc-input" autocomplete="new-password" minlength="6" required>
        </div>
        <div>
          <label class="tc-label" for="rgDir">Dirección de entrega <span class="text-neutral-600">(opcional)</span></label>
          <textarea id="rgDir" rows="2" class="tc-input" placeholder="Nos ayuda a coordinar tus envíos más rápido"></textarea>
        </div>
        <p id="rgError" class="hidden text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></p>
        <button type="submit" class="tc-btn-primary w-full" id="rgBtn">Crear mi cuenta</button>
      </form>
      <p class="mt-4 text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta? <button type="button" id="rgToLogin" class="text-fuchsia-300 hover:underline font-medium">Inicia sesión</button>
      </p>
    </div>`);

  overlay.querySelector('#rgToLogin').addEventListener('click', () => { close(); openLoginModal(); });
  overlay.querySelector('#regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = overlay.querySelector('#rgBtn');
    const errEl = overlay.querySelector('#rgError');
    btn.disabled = true;
    btn.innerHTML = '<span class="tc-spinner"></span>';
    errEl.classList.add('hidden');
    try {
      await api('register', {
        nombre: overlay.querySelector('#rgNombre').value,
        usuario: overlay.querySelector('#rgUsuario').value,
        email: overlay.querySelector('#rgEmail').value,
        password: overlay.querySelector('#rgPass').value,
        direccion: overlay.querySelector('#rgDir').value,
      });
      await syncCartAfterLogin();
      close();
      toast('¡Cuenta creada! Bienvenido a Tech & Chic ✨', 'success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Crear mi cuenta';
    }
  });
}

async function syncCartAfterLogin() {
  try {
    const out = await api('getCart');
    const merged = mergeCart(out.items || []);
    await api('saveCart', { items: merged });
  } catch { /* carrito del servidor no disponible */ }
}

// ── Modal: editar perfil ────────────────────────────────────────
export function openEditProfileModal() {
  const session = getSession();
  if (!session?.user) return;
  const user = session.user;

  const fieldRow = (id, label, currentValue, inputHtml) => `
    <div class="tc-panel !rounded-xl p-4" data-field="${id}">
      <button type="button" data-expand class="w-full flex items-center justify-between gap-3 text-left">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-neutral-100">${label}</p>
          <p class="text-xs text-neutral-500 truncate mt-0.5" data-current>${escapeHtml(currentValue || '—')}</p>
        </div>
        <svg class="h-4 w-4 text-violet-400 shrink-0 transition-transform" data-chev fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="hidden mt-3 space-y-3" data-form>
        ${inputHtml}
        <div class="flex justify-end gap-2">
          <button type="button" data-cancel class="tc-btn-ghost !text-xs">Cancelar</button>
          <button type="button" data-save class="tc-btn-secondary !px-4 !py-1.5 !text-xs">Guardar</button>
        </div>
      </div>
    </div>`;

  const { overlay, close } = openModal(`
    <div class="pt-2">
      <div class="text-center">
        ${avatarHtml(user, '!w-16 !h-16 !text-xl mx-auto')}
        <h2 class="mt-3 font-serif text-2xl font-semibold text-white">Editar Perfil</h2>
        <p class="text-xs text-neutral-500 mt-1">Toca una opción para modificarla.</p>
      </div>
      <div class="mt-6 space-y-2.5">
        ${fieldRow('nombre', 'Cambiar nombre', user.nombre,
          `<input data-input class="tc-input" value="${escapeHtml(user.nombre)}" autocomplete="name">`)}
        ${fieldRow('usuario', 'Cambiar nombre de usuario', user.usuario,
          `<input data-input class="tc-input" value="${escapeHtml(user.usuario)}" maxlength="24" autocomplete="nickname">`)}
        ${fieldRow('email', 'Cambiar email', user.email,
          `<input data-input type="email" class="tc-input" value="${escapeHtml(user.email)}" autocomplete="email">`)}
        ${fieldRow('direccion', 'Cambiar dirección', user.direccion,
          `<textarea data-input rows="2" class="tc-input" placeholder="Tu dirección de entrega">${escapeHtml(user.direccion || '')}</textarea>`)}
        ${fieldRow('password', 'Cambiar contraseña', '••••••••', `
          <input data-current-pass type="password" class="tc-input" placeholder="Contraseña actual" autocomplete="current-password">
          <input data-input type="password" class="tc-input" placeholder="Nueva contraseña (mínimo 6)" autocomplete="new-password">`)}
      </div>
    </div>`);

  overlay.querySelectorAll('[data-field]').forEach(row => {
    const form = row.querySelector('[data-form]');
    row.querySelector('[data-expand]').addEventListener('click', () => {
      form.classList.toggle('hidden');
      row.querySelector('[data-chev]').style.transform = form.classList.contains('hidden') ? '' : 'rotate(180deg)';
    });
    row.querySelector('[data-cancel]').addEventListener('click', () => form.classList.add('hidden'));
    row.querySelector('[data-save]').addEventListener('click', async () => {
      const btn = row.querySelector('[data-save]');
      const field = row.dataset.field;
      const value = row.querySelector('[data-input]').value;
      btn.disabled = true;
      btn.innerHTML = '<span class="tc-spinner"></span>';
      try {
        if (field === 'password') {
          await api('changePassword', {
            current: row.querySelector('[data-current-pass]').value,
            next: value,
          });
        } else {
          const out = await api('updateProfile', { field, value });
          row.querySelector('[data-current]').textContent = out.user[field] || '—';
        }
        toast('Cambios guardados ✓', 'success');
        form.classList.add('hidden');
      } catch (err) {
        toast(err.message, 'error');
      }
      btn.disabled = false;
      btn.textContent = 'Guardar';
    });
  });
}

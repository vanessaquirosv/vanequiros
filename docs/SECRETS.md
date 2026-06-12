# Secretos y configuración privada — VaneQuiros / web-rifa

Guía para mantener **claves Firebase fuera del repositorio público** en [github.com/vanessaquirosv/vanequiros](https://github.com/vanessaquirosv/vanequiros), mientras el sitio en producción puede leer Firestore con normalidad.

---

## Qué va en GitHub (público) y qué no

| Archivo | ¿Se sube a GitHub? | Contenido |
|---------|-------------------|-----------|
| `js/web-rifa/firebase-config.example.js` | Sí | Plantilla con placeholders |
| `js/web-rifa/firebase-init.js` | Sí | Código de inicialización (sin claves) |
| `js/web-rifa/firebase-config.js` | **No** | Claves reales del proyecto |
| `docs/WEB-RIFA.md` | Sí | Documentación sin claves |
| `*.json` service account Firebase | **Nunca** | Admin SDK (acceso total) |
| `.env`, `.env.*` | **No** | Variables locales |

---

## Configuración local (desarrollo)

1. Copia la plantilla:

```powershell
cd "D:\Users\Chino\Documents\$$$ Clientes\VaneQuiros\WebSite"
Copy-Item js\web-rifa\firebase-config.example.js js\web-rifa\firebase-config.js
```

2. Edita `js/web-rifa/firebase-config.js` con los valores de  
   [Firebase Console → vanessaquiros-co → Configuración del proyecto → Tus apps](https://console.firebase.google.com/project/vanessaquiros-co/settings/general).

3. Verifica que Git lo ignore:

```powershell
git check-ignore -v js/web-rifa/firebase-config.js
```

Debe mostrar una línea de `.gitignore`. Si no, **no hagas commit** hasta corregirlo.

---

## GitHub Secrets (producción / GitHub Pages)

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**

| Nombre del secret | Valor |
|-------------------|--------|
| `FIREBASE_API_KEY` | apiKey de la app web |
| `FIREBASE_AUTH_DOMAIN` | `vanessaquiros-co.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `vanessaquiros-co` |
| `FIREBASE_STORAGE_BUCKET` | `vanessaquiros-co.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `FIREBASE_APP_ID` | appId |

El workflow `.github/workflows/deploy-pages.yml` genera `firebase-config.js` en el momento del deploy. **Ese archivo generado no vive en el historial de Git.**

### Activar GitHub Pages con Actions

1. Repo → **Settings → Pages**
2. **Build and deployment → Source:** `GitHub Actions` (no “Deploy from branch”)
3. Tras un push a `main`, el workflow publica el sitio con la config inyectada.

---

## Seguridad real (más allá de ocultar claves en Git)

Ocultar la `apiKey` en GitHub **no** impide que alguien la vea en el navegador (todo sitio Firebase la expone en el cliente). La protección efectiva es:

1. **Firestore Security Rules** — lectura/escritura limitada (ver `docs/WEB-RIFA.md` §4).
2. **Cloud Functions** — reservas de boletos con transacciones en servidor.
3. **Firebase App Check** — reduce abuso de la API desde clientes no autorizados.
4. **Restricción de API key** en [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → restringir por dominio (`vanessaquirosv.github.io`, tu dominio custom).

### Claves que NUNCA deben estar en el frontend ni en GitHub

- Service account JSON (`*-firebase-adminsdk-*.json`)
- Private keys de Functions
- Tokens de admin personal

---

## Checklist antes de cada `git push`

- [ ] `git status` no lista `firebase-config.js` ni `.env`
- [ ] No hay claves en `docs/`, `README`, comentarios HTML o commits
- [ ] Secrets configurados en GitHub si usas Pages con Actions
- [ ] Firestore Rules publicadas en Firebase Console

---

## Si una clave se filtró al repo público

1. Rotar / regenerar en Firebase Console si aplica.
2. Restringir la API key por dominio en Google Cloud.
3. Eliminar del historial con `git filter-repo` o soporte de GitHub (si ya se hizo push).

---

*Ver también: [WEB-RIFA.md](WEB-RIFA.md) · [PUSH.md](../PUSH.md)*

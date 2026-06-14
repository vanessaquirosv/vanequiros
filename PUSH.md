# Guía de Push — VaneQuiros Web

Documento oficial para publicar y actualizar el sitio en GitHub **sin filtrar claves ni secretos**.

| Dato | Valor |
|------|--------|
| **Repositorio** | [github.com/vanessaquirosv/vanequiros](https://github.com/vanessaquirosv/vanequiros) |
| **Remoto HTTPS** | `https://github.com/vanessaquirosv/vanequiros.git` |
| **Rama** | `main` |
| **Sitio en línea** | [vanessaquirosv.github.io/vanequiros](https://vanessaquirosv.github.io/vanequiros/) |

---

## Push rápido (recomendado)

Desde PowerShell, en la carpeta del proyecto:

```powershell
cd "D:\Users\Chino\Documents\$$$ Clientes\VaneQuiros\WebSite"
.\scripts\push-seguro.ps1 -Mensaje "Describe tu cambio aquí"
```

El script **bloquea el push** si detecta archivos sensibles en el staging area.

---

## 1. Requisitos previos

| Requisito | Verificación |
|-----------|--------------|
| Git instalado | `git --version` |
| Acceso al repo | Colaborador en `vanessaquirosv/vanequiros` |
| Autenticación GitHub | Token PAT, `gh auth login`, o SSH |
| Config Firebase local | `js/web-rifa/firebase-config.js` (copia de `.example.js`) — **solo en tu PC** |
| Secrets en GitHub | 6 variables `FIREBASE_*` en Settings → Secrets → Actions |
| GitHub Pages | Source: **GitHub Actions** (no «Deploy from branch») |

Documentación relacionada:

- [docs/SECRETS.md](docs/SECRETS.md) — claves y GitHub Secrets  
- [docs/FIREBASE-SETUP.md](docs/FIREBASE-SETUP.md) — Firestore, reglas, seed  
- [docs/WEB-RIFA.md](docs/WEB-RIFA.md) — modelo de datos rifa  

---

## 2. Qué SÍ sube a GitHub (público)

```
vanequiros/
├── index.html
├── vanessa-quiros/index.html
├── tech-and-chic/index.html
├── frances-sin-estres/index.html
├── img/
├── js/web-rifa/
│   ├── firebase-config.example.js   ← plantilla (placeholders)
│   ├── firebase-config.loader.js
│   ├── firebase-init.js
│   ├── tickets.js, orders.js, rifa-app.js, seed-tickets.js
├── firebase/firestore.rules
├── tools/seed-tickets.html
├── .github/workflows/deploy-pages.yml
├── docs/
├── scripts/push-seguro.ps1
├── .gitignore
├── PUSH.md
└── README.md
```

---

## 3. Qué NUNCA debe subirse

| Archivo / patrón | Motivo |
|------------------|--------|
| `js/web-rifa/firebase-config.js` | Claves reales del proyecto Firebase |
| `.env`, `.env.*` | Variables de entorno |
| `*-firebase-adminsdk-*.json` | Service account (acceso total) |
| `serviceAccount*.json` | Credenciales admin |
| `.firebase/` | Cache local Firebase CLI |
| `.cursor/` | Reglas locales del IDE |

Verificación manual antes de cada push:

```powershell
git check-ignore -v js/web-rifa/firebase-config.js
git status
```

`firebase-config.js` debe aparecer como **ignored** o **untracked**, nunca en «Changes to be committed».

---

## 4. Push manual paso a paso

```powershell
cd "D:\Users\Chino\Documents\$$$ Clientes\VaneQuiros\WebSite"

# 1. Revisar cambios
git status

# 2. Confirmar que NO se incluye config privada
git diff --cached --name-only
git check-ignore js/web-rifa/firebase-config.js

# 3. Agregar solo lo deseado (evita git add . si tienes dudas)
git add .

# 4. Verificar staging una vez más
git diff --cached --name-only

# 5. Commit
git commit -m "Tu mensaje descriptivo"

# 6. Push
git push origin main
```

---

## 5. Después del push

### A. Verificar en GitHub

1. [github.com/vanessaquirosv/vanequiros/commits/main](https://github.com/vanessaquirosv/vanequiros/commits/main)  
2. Confirmar que **no** aparece `firebase-config.js` en el commit.

### B. Verificar deploy (GitHub Actions)

1. Repo → **Actions** → workflow **Deploy GitHub Pages** → estado verde  
2. Comprobar config generada en producción (debe existir, no 404):  
   `https://vanessaquirosv.github.io/vanequiros/js/web-rifa/firebase-config.js`

### C. Verificar rifa

1. Abrir [vanessa-quiros](https://vanessaquirosv.github.io/vanequiros/vanessa-quiros/)  
2. Debe mostrar cuadrícula de números o mensaje «Base de datos sin boletos» (ejecutar seed si aplica)

---

## 6. GitHub Secrets requeridos

Configurar en **Settings → Secrets and variables → Actions**:

| Secret | Ejemplo / valor |
|--------|-----------------|
| `FIREBASE_API_KEY` | apiKey de Firebase Console |
| `FIREBASE_AUTH_DOMAIN` | `vanessaquiros-co.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `vanessaquiros-co` |
| `FIREBASE_STORAGE_BUCKET` | `vanessaquiros-co.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `FIREBASE_APP_ID` | appId |

El workflow `.github/workflows/deploy-pages.yml` genera `firebase-config.js` **solo en el artefacto de deploy**, no en el historial de Git.

---

## 7. Checklist de seguridad (cada push)

- [ ] `git status` no lista `firebase-config.js` ni `.env`
- [ ] No hay claves pegadas en HTML, JS público, docs ni mensajes de commit
- [ ] `git diff --cached` revisado antes de commit
- [ ] Push exitoso a `main`
- [ ] Workflow Deploy GitHub Pages en verde
- [ ] Rifa carga en producción (sin «Cargando…» infinito)

---

## 8. Problemas frecuentes

| Problema | Solución |
|----------|----------|
| `Permission denied` al push | Aceptar invitación al repo o autenticarse con cuenta con acceso |
| `non-fast-forward` | `git pull origin main` → resolver → `git push` |
| Rifa en «Cargando…» | Pages → Source = **GitHub Actions**; verificar secrets y workflow |
| `firebase-config.js` 404 en Pages | Re-ejecutar workflow; confirmar secrets `FIREBASE_*` |
| Clave filtrada por error | Rotar en Firebase/Google Cloud; no commitear; ver [docs/SECRETS.md](docs/SECRETS.md) |

---

## 9. Comandos de referencia

```powershell
git remote -v
git pull origin main
git push origin main
git log --oneline -5
```

**Remoto SSH (alternativa):** `git@github.com:vanessaquirosv/vanequiros.git`

---

*VaneQuiros — repositorio [vanessaquirosv/vanequiros](https://github.com/vanessaquirosv/vanequiros)*

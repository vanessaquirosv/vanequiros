# Guía de Push — VaneQuiros Web

Documento para publicar y actualizar el sitio web en el repositorio oficial de GitHub.

| Dato | Valor |
|------|--------|
| **Repositorio** | [https://github.com/vanessaquirosv/vanequiros](https://github.com/vanessaquirosv/vanequiros) |
| **URL remota (HTTPS)** | `https://github.com/vanessaquirosv/vanequiros.git` |
| **Rama principal** | `main` |
| **Tipo de proyecto** | Sitio estático (HTML + Tailwind CDN + JavaScript) |

---

## 1. Requisitos previos

1. **Git** instalado en tu equipo.  
   - Verificar: `git --version`
2. **Cuenta de GitHub** con acceso al repositorio `vanessaquirosv/vanequiros`.
3. **Autenticación** configurada (una de estas opciones):
   - [GitHub CLI](https://cli.github.com/) (`gh auth login`)
   - [Personal Access Token](https://github.com/settings/tokens) (permiso `repo`) al hacer `git push`
   - SSH: `git@github.com:vanessaquirosv/vanequiros.git` (si tienes llave SSH en GitHub)

---

## 2. Estructura que debe subirse

Asegúrate de que la raíz del repositorio en GitHub contenga exactamente esta estructura:

```
vanequiros/                    ← raíz del repo (no una carpeta extra “WebSite”)
├── index.html                 ← portal unificador
├── vanessa-quiros/
│   └── index.html
├── tech-and-chic/
│   └── index.html
├── frances-sin-estres/
│   └── index.html
├── img/
│   ├── VQ background t.png    ← logotipo Vanessa (transparente)
│   └── VQ background.png      ← opcional
├── .gitignore
├── PUSH.md                    ← este documento
└── README.md                  ← descripción del proyecto (opcional)
```

> **Importante:** Los archivos HTML deben quedar en la **raíz del repositorio**, no dentro de una subcarpeta `WebSite/`, para que GitHub Pages sirva correctamente `index.html` como página principal.

---

## 3. Primera publicación (proyecto local → GitHub)

El repositorio remoto ya existe con `README.md` y `LICENSE`. Sigue **una** de estas dos rutas.

### Opción A — Recomendada: clonar el repo y copiar archivos

```powershell
# 1. Ir a la carpeta donde guardas proyectos
cd "D:\Users\Chino\Documents\$$$ Clientes\VaneQuiros"

# 2. Clonar el repositorio vacío (solo README/LICENSE)
git clone https://github.com/vanessaquirosv/vanequiros.git
cd vanequiros

# 3. Copiar TODO el contenido de WebSite a esta carpeta (excepto .git si existiera)
#    Desde el Explorador de archivos, copia:
#    WebSite\*  →  vanequiros\
#    (index.html, carpetas vanessa-quiros, tech-and-chic, frances-sin-estres, img, etc.)

# 4. Revisar qué se va a subir
git status

# 5. Agregar archivos
git add .

# 6. Primer commit del sitio
git commit -m "Publicar sitio multipágina VaneQuiros (landing, Vanessa Quirós, placeholders)"

# 7. Subir a GitHub
git push -u origin main
```

### Opción B: inicializar Git dentro de la carpeta `WebSite`

```powershell
cd "D:\Users\Chino\Documents\$$$ Clientes\VaneQuiros\WebSite"

git init
git branch -M main
git remote add origin https://github.com/vanessaquirosv/vanequiros.git

# Traer README/LICENSE del remoto y fusionar historiales
git fetch origin
git pull origin main --allow-unrelated-histories

# Resolver conflictos si README local y remoto chocan (conservar ambos o unificar texto)
git add .
git commit -m "Publicar sitio multipágina VaneQuiros"

git push -u origin main
```

Si `git pull` muestra conflictos en `README.md`, edita el archivo, deja una sola versión, luego:

```powershell
git add README.md
git commit -m "Resolver conflicto README"
git push -u origin main
```

---

## 4. Actualizaciones posteriores (cada cambio en el sitio)

Desde la carpeta que tenga `.git` y el remoto configurado (`vanequiros` o `WebSite`):

```powershell
git status
git add .
git commit -m "Descripción breve del cambio (ej: rifa en USD, logo Vanessa)"
git push origin main
```

### Buenas prácticas de mensajes de commit

| Cambio | Ejemplo de mensaje |
|--------|-------------------|
| Textos / diseño | `Actualizar copy y estilos sección Historia` |
| Rifa | `Conectar rifa con backend / ajustar grid` |
| Donaciones | `Donaciones en USD` |
| Imágenes | `Agregar logotipo VQ transparente` |

---

## 5. Comprobar que el push fue correcto

1. Abre [https://github.com/vanessaquirosv/vanequiros](https://github.com/vanessaquirosv/vanequiros).
2. Confirma que aparecen `index.html`, las carpetas de marcas y `img/`.
3. En la pestaña **Commits**, verifica tu último commit.

---

## 6. Publicar el sitio en línea (GitHub Pages — gratuito)

### Opción recomendada: GitHub Actions + secretos Firebase

El repo incluye `.github/workflows/deploy-pages.yml`. Las claves Firebase **no** van en el código; se configuran como **GitHub Secrets** (ver [docs/SECRETS.md](docs/SECRETS.md)).

1. Repo → **Settings → Secrets and variables → Actions** → crear los 6 secrets `FIREBASE_*`.
2. **Settings → Pages** → Source: **GitHub Actions**.
3. Push a `main` → el workflow genera `firebase-config.js` en el deploy y publica el sitio.

URL esperada: `https://vanessaquirosv.github.io/vanequiros/`

### Opción alternativa: Deploy from branch (sin Firebase en producción)

Si aún no configuras secrets, puedes usar **Deploy from a branch** → `main` → `/ (root)`.  
La rifa seguirá en modo local hasta integrar Firebase; **no** subas `firebase-config.js` al repo.

### Rutas importantes

| Página | URL (con Pages activo) |
|--------|-------------------------|
| Portal | `https://vanessaquirosv.github.io/vanequiros/` |
| Vanessa Quirós | `https://vanessaquirosv.github.io/vanequiros/vanessa-quiros/` |
| Tech & Chic | `https://vanessaquirosv.github.io/vanequiros/tech-and-chic/` |
| Français Sans Stress | `https://vanessaquirosv.github.io/vanequiros/frances-sin-estres/` |

> Si más adelante usas dominio propio, se configura en **Pages → Custom domain**.

---

## 7. Problemas frecuentes

### `rejected - non-fast-forward`

Alguien subió cambios antes que tú. Actualiza y vuelve a subir:

```powershell
git pull origin main
git push origin main
```

### `Authentication failed`

- Usa token personal en lugar de contraseña de GitHub, o
- Ejecuta `gh auth login` y repite el push.

### `remote origin already exists`

```powershell
git remote set-url origin https://github.com/vanessaquirosv/vanequiros.git
```

### Archivos muy grandes (imágenes)

GitHub advierte archivos **> 50 MB**. Los PNG del logo suelen estar bien; si un asset falla, comprime la imagen antes del push.

### No se ve el logo en producción

Comprueba que la carpeta `img/` esté en el repo y que la ruta en HTML sea `../img/VQ background t.png` desde `vanessa-quiros/index.html`.

---

## 8. Checklist antes de cada push

- [ ] El sitio abre bien en local (doble clic en `index.html` o Live Server).
- [ ] `vanessa-quiros/index.html` carga el logo desde `img/`.
- [ ] **`js/web-rifa/firebase-config.js` NO aparece en `git status`** (ver [docs/SECRETS.md](docs/SECRETS.md)).
- [ ] No se suben contraseñas, tokens, `.env` ni archivos `*-firebase-adminsdk-*.json`.
- [ ] `git status` muestra solo los archivos que quieres publicar.
- [ ] Mensaje de commit claro.
- [ ] `git push origin main` sin errores.
- [ ] Verificación en github.com/vanessaquirosv/vanequiros.

---

## 9. Resumen de comandos (referencia rápida)

```powershell
git remote add origin https://github.com/vanessaquirosv/vanequiros.git
git add .
git commit -m "Tu mensaje"
git push -u origin main
```

**Remoto SSH (alternativa):**

```text
git@github.com:vanessaquirosv/vanequiros.git
```

---

## 10. Próximo paso (backend rifa)

Cuando integres Firebase o Supabase, evita subir claves secretas. Usa variables en el panel del proveedor y un archivo de ejemplo `config.example.js` en el repo. El flujo de **push** sigue siendo el mismo: commit → `git push origin main`.

---

*Documento generado para el proyecto VaneQuiros — repositorio [vanessaquirosv/vanequiros](https://github.com/vanessaquirosv/vanequiros).*

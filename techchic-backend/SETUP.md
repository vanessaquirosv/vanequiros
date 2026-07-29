# Tech & Chic — Guía de infraestructura (Fase 0)

Todo se crea con la cuenta **parisetmoi1981@gmail.com**. Son 4 bloques:
Spreadsheet + Apps Script, Firebase, carpeta de imágenes en Drive, y secrets de GitHub.

---

## 1. Google Spreadsheet + Apps Script (ventas, usuarios, reseñas)

1. Con la sesión de `parisetmoi1981@gmail.com`, crea una hoja de cálculo nueva en
   [sheets.new](https://sheets.new) y nómbrala **`TechChic - Datos`**.
2. En la hoja: menú **Extensiones → Apps Script**.
3. Borra el contenido del editor y pega TODO el archivo [`Code.gs`](Code.gs) de esta carpeta.
4. Guarda (Ctrl+S). Nombra el proyecto **`techchic-backend`**.
5. **Implementar → Nueva implementación → ⚙️ Aplicación web**:
   - Descripción: `techchic v1`
   - Ejecutar como: **Yo (parisetmoi1981@gmail.com)**
   - Quién tiene acceso: **Cualquier persona**
6. Autoriza los permisos cuando lo pida (es tu propio script — es normal que
   Google muestre la advertencia de "app no verificada": clic en *Configuración avanzada → Ir a techchic-backend*).
7. Copia la **URL de la aplicación web** (termina en `/exec`).
8. Pega esa URL en [`tech-and-chic/js/tc-config.js`](../tech-and-chic/js/tc-config.js),
   campo `appsScriptUrl`, y me avisas para verificar la conexión.

> Las pestañas del Spreadsheet (Ordenes, Usuarios, etc.) se crean solas con la
> primera llamada. No las renombres ni borres sus encabezados.
>
> **Actualizaciones futuras del script**: pegar el nuevo código y usar
> *Implementar → Administrar implementaciones → ✏️ → Nueva versión* (así la URL no cambia).

## 2. Proyecto Firebase (solo catálogo)

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) con `parisetmoi1981@gmail.com`.
2. **Agregar proyecto** → nombre: `techchic-cr` (o similar). Google Analytics: desactivado (no se necesita).
3. En el proyecto: **Compilación → Firestore Database → Crear base de datos** →
   modo **producción** → ubicación `nam5 (us-central)`.
4. En **Reglas**, pega el contenido de [`firestore.rules`](firestore.rules) y publica.
5. Registra una app web: ⚙️ **Configuración del proyecto → Tus apps → `</>` (Web)** →
   apodo `techchic-web` (sin hosting). Copia el objeto `firebaseConfig` que aparece.
6. Genera la credencial para la app de administración:
   ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**.
   Guarda el archivo como `serviceAccountKey.json` — lo usará la app de escritorio
   (NUNCA se sube a GitHub; el `.gitignore` ya lo bloquea).
7. **Importante:** comparte el Spreadsheet `TechChic - Datos` como **Editor** con el
   email de esa cuenta de servicio (aparece como `client_email` dentro del JSON,
   algo como `firebase-adminsdk-xxxxx@techchic-cr.iam.gserviceaccount.com`).
   Así la app de escritorio puede leer las órdenes y publicar el catálogo privado.

## 3. Carpeta de imágenes en Google Drive

1. En [drive.google.com](https://drive.google.com) crea la carpeta **`TechChic Productos`**.
2. Clic derecho → **Compartir** → General: **Cualquier persona con el enlace — Lector**.
   (Al estar la carpeta compartida, todo lo que subas dentro hereda el permiso.)
3. Sube ahí las fotos de productos. La app de administración acepta el enlace de
   cada imagen (clic derecho → Compartir → Copiar enlace) y lo convierte solo al
   formato embebible.

## 4. Secrets en GitHub (para que la web use tu Firebase)

En el repositorio de GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
Crea estos 6 secrets con los valores del `firebaseConfig` del paso 2.5:

| Secret | Valor del firebaseConfig |
|---|---|
| `TC_FIREBASE_API_KEY` | `apiKey` |
| `TC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `TC_FIREBASE_PROJECT_ID` | `projectId` |
| `TC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `TC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `TC_FIREBASE_APP_ID` | `appId` |

El workflow de deploy ya está preparado: si los secrets existen, la página usa tu
Firebase; si no, se publica en modo demo con el catálogo local de prueba.

---

## Cómo fluye todo (resumen)

```
Página web (GitHub Pages)
 ├── lee el catálogo desde Firestore (1 lectura por visita si no hay cambios)
 ├── imágenes desde Google Drive (lh3.googleusercontent.com)
 └── órdenes/cuentas/reseñas → Apps Script → Spreadsheet "TechChic - Datos"

App de administración (Electron, privada)
 ├── botón "Publicar catálogo" → escribe catalog/* en Firestore (serviceAccountKey.json)
 ├── espejo con precios de almacén → pestaña CatalogoPrivado del Spreadsheet
 └── órdenes/estados/dashboard → lee y escribe el Spreadsheet directo (API de Sheets)
```

## Notas de seguridad

- Las contraseñas de los clientes se guardan con hash + salt (2000 iteraciones de
  SHA-256), nunca en texto plano.
- El `precioAlmacen` (tu costo) solo vive en la pestaña `CatalogoPrivado` del
  Spreadsheet privado — jamás se publica en Firebase ni en la web.
- Los precios de las órdenes los calcula SIEMPRE el servidor con el catálogo
  privado: aunque alguien altere el mensaje de WhatsApp, la orden registrada en
  el sistema no cambia (esa es la que ves en el panel de Ventas con el código TC-XXXXXX).

# Poner Firebase en marcha — web-rifa

Guía paso a paso para conectar la rifa de `vanessa-quiros` con Firestore después de haber configurado los **GitHub Secrets**.

---

## Resumen del flujo

```text
1. Crear Firestore en Firebase Console
2. Publicar reglas de seguridad (firebase/firestore.rules)
3. Seed: crear 1000 boletos (tools/seed-tickets.html)
4. GitHub Pages con Actions (secrets ya configurados)
5. Probar compra en la rifa
6. Confirmar pagos manualmente en Firebase Console
```

---

## Paso 1 — Firestore en Firebase Console

1. Abre [Firebase Console — vanessaquiros-co](https://console.firebase.google.com/project/vanessaquiros-co)
2. Menú **Build → Firestore Database**
3. **Create database**
4. Modo: **Production mode** (luego pegamos nuestras reglas)
5. Ubicación: elige la más cercana (ej. `us-central1` o `southamerica-east1` si está disponible)

---

## Paso 2 — Publicar reglas de seguridad (OBLIGATORIO)

Si ves **«Missing or insufficient permissions»**, Firestore aún tiene las reglas por defecto que **bloquean todo**. Debes publicar las reglas del proyecto:

1. Abre [Firestore Rules — vanessaquiros-co](https://console.firebase.google.com/project/vanessaquiros-co/firestore/rules)
2. **Borra** el contenido actual del editor
3. Copia **todo** el archivo [`firebase/firestore.rules`](../firebase/firestore.rules) de este repositorio
4. Pega en el editor de Firebase
5. Clic en **Publish** (Publicar)
6. Espera unos segundos y recarga la rifa

Estas reglas permiten:
- **Leer** todos los boletos (público)
- **Reservar** boletos solo vía transacción de compra (`disponible` → `reservado`)
- **Crear** pedidos con datos del comprador
- **Seed inicial** de boletos (solo si `meta/config` no existe aún)

---

## Paso 3 — Crear los 1000 boletos (seed, una vez)

### Opción A — Local (recomendada)

1. Asegúrate de tener `js/web-rifa/firebase-config.js` con tus claves (copia desde `.example.js`)
2. Sirve el sitio con un servidor local (Live Server en VS Code/Cursor, o):

```powershell
cd "D:\Users\Chino\Documents\$$$ Clientes\VaneQuiros\WebSite"
npx --yes serve .
```

3. Abre en el navegador: `http://localhost:3000/tools/seed-tickets.html`
4. Clic en **Crear boletos 000–999**
5. Verifica en Firebase Console → Firestore → colección `tickets` (debe haber 1000 documentos)

### Opción B — GitHub Pages

Tras el deploy con secrets, visita:  
`https://vanessaquirosv.github.io/vanequiros/tools/seed-tickets.html`

---

## Paso 4 — GitHub Pages + Secrets

Si ya agregaste los 6 secrets `FIREBASE_*`:

1. Repo → **Settings → Pages**
2. **Build and deployment → Source:** elige **GitHub Actions** (no uses «Deploy from a branch»)
3. Push a `main` o re-ejecuta el workflow **Deploy GitHub Pages** en la pestaña Actions
4. Cuando el workflow termine en verde, abre:  
   `https://vanessaquirosv.github.io/vanequiros/vanessa-quiros/`

> **Si ves «Cargando boletos…» sin fin:** casi siempre es porque Pages está en «Deploy from branch» y falta `firebase-config.js` (404). Cambia a **GitHub Actions** como source.

Verifica que exista el archivo en producción:  
`https://vanessaquirosv.github.io/vanequiros/js/web-rifa/firebase-config.js`  
(debe responder con JavaScript, no 404)

---

## Paso 4.5 — Firebase Auth anónimo + Storage (OBLIGATORIO para comprobantes)

El flujo de checkout ahora **sube el comprobante SINPE a Firebase Storage**. Para que funcione de forma segura:

### A) Habilitar Auth anónimo

1. Firebase Console → **Build → Authentication**
2. **Get started** (si aplica)
3. Pestaña **Sign-in method**
4. Habilita **Anonymous**

### B) Reglas de Firebase Storage (recomendadas)

Firebase Console → **Build → Storage → Rules**. Reemplaza reglas por algo como:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /comprobantes_sinpe/{allPaths=**} {
      allow read: if false;
      allow write: if request.auth != null
        && request.resource.size < 8 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

Notas:
- `request.auth != null` exige sesión (el frontend usa **Auth anónimo**).
- `read: false` mantiene los comprobantes privados (solo accesibles por `downloadURL`).

---

## Paso 5 — Probar la rifa

1. Abre la página de Vanessa Quirós → sección **Rifa Benéfica**
2. Debe aparecer la cuadrícula (estado **Cargando…** breve, luego números)
3. Selecciona boletos → **Proceder al Pago** → completa el formulario → **Confirmar**
4. En Firebase Console:
   - Colección **`orders`**: nuevo documento `pendiente_pago`
   - Colección **`tickets`**: esos IDs pasan a `reservado`
   - Storage: archivo en `comprobantes_sinpe/`

Si ves **“Base de datos vacía”**, ejecuta el seed (Paso 3).

Si ves error de conexión:
- Revisa que Firestore esté creado
- Revisa reglas publicadas
- En local: existe `firebase-config.js`
- En producción: secrets correctos y workflow exitoso

---

## Paso 6 — Confirmar pagos (admin manual, por ahora)

Cuando el comprador paga por SINPE:

1. Firebase Console → **`orders`** → abre el pedido
2. Cambia `status` a **`pagado`** y agrega `paidAt` (timestamp)
3. En **`tickets`**, para cada boleto del pedido, cambia `status` a **`vendido`**

*(Panel admin web: fase siguiente.)*

---

## Restringir la API key (recomendado)

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Selecciona la API key del proyecto `vanessaquiros-co`
3. **Application restrictions → HTTP referrers:**
   - `https://vanessaquirosv.github.io/*`
   - `http://localhost:*` (desarrollo)
4. **API restrictions:** limitar a Firebase / Firestore APIs

---

## Archivos del proyecto

| Archivo | Función |
|---------|---------|
| `js/web-rifa/firebase-init.js` | Inicializa app + Firestore |
| `js/web-rifa/tickets.js` | Lectura en tiempo real |
| `js/web-rifa/orders.js` | Reserva atómica al comprar |
| `js/web-rifa/rifa-app.js` | UI de la rifa |
| `js/web-rifa/seed-tickets.js` | Crear 1000 boletos |
| `tools/seed-tickets.html` | Herramienta seed |
| `firebase/firestore.rules` | Reglas de seguridad |

---

## Solución de problemas

| Error | Causa probable |
|-------|----------------|
| **`Missing or insufficient permissions`** | Reglas de Firestore **no publicadas**. Sigue el Paso 2 de esta guía |
| `Failed to fetch firebase-config.js` | Falta config local o deploy sin secrets |
| `El boleto #XXX ya no está disponible` | Otro usuario lo reservó (comportamiento correcto) |
| Colección vacía | Ejecutar seed |

---

*Ver también: [WEB-RIFA.md](WEB-RIFA.md) · [SECRETS.md](SECRETS.md)*

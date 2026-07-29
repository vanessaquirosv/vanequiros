/**
 * ═══════════════════════════════════════════════════════════════
 * Tech & Chic — Backend en Google Apps Script
 * ═══════════════════════════════════════════════════════════════
 * Este script debe estar VINCULADO (bound) al Google Spreadsheet
 * de Tech & Chic (ver SETUP.md). Gestiona: órdenes, cotización de
 * costo operativo, cuentas de usuario, carritos y reseñas.
 *
 * Despliegue: Implementar → Nueva implementación → Aplicación web
 *   · Ejecutar como: Yo (parisetmoi1981@gmail.com)
 *   · Acceso: Cualquier persona
 * La URL resultante se coloca en tech-and-chic/js/tc-config.js
 * (campo appsScriptUrl).
 *
 * La app de administración (Electron) NO usa este script: escribe
 * y lee el Spreadsheet directamente con la API de Sheets.
 * ═══════════════════════════════════════════════════════════════
 */

// ── Constantes ──────────────────────────────────────────────────
var SHEETS = {
  ORDENES: 'Ordenes',
  ITEMS: 'OrdenItems',
  USUARIOS: 'Usuarios',
  SESIONES: 'Sesiones',
  RESENAS: 'Resenas',
  CATALOGO: 'CatalogoPrivado',
  CONFIG: 'Config',
};

var HEADERS = {
  Ordenes: ['code', 'createdAt', 'status', 'canal', 'nombre', 'direccion', 'userId', 'subtotal', 'opCost', 'total', 'historyJson', 'notas'],
  OrdenItems: ['orderCode', 'productCode', 'name', 'color', 'qty', 'unitPrice', 'subEstado'],
  Usuarios: ['id', 'usuario', 'nombre', 'email', 'direccion', 'salt', 'hash', 'fotoUrl', 'carritoJson', 'createdAt'],
  Sesiones: ['token', 'userId', 'expiresAt'],
  Resenas: ['productCode', 'userId', 'usuario', 'stars', 'text', 'at'],
  CatalogoPrivado: ['code', 'name', 'price', 'discountPct', 'almacen'],
  Config: ['key', 'valueJson'],
};

var ORDER_STATUSES = [
  'Pendiente de confirmación',
  'Solicitando al almacén',
  'Recibiendo Productos',
  'Coordinando Envío o Retirada',
  'Entrega Completada',
];

var DEFAULT_OPCOST_TIERS = [
  { difMin: 0, difMax: 1000, costo: 3000 },
  { difMin: 1001, difMax: 1500, costo: 2800 },
  { difMin: 1501, difMax: 2000, costo: 2600 },
  { difMin: 2001, difMax: 2500, costo: 2400 },
  { difMin: 2501, difMax: 3000, costo: 2200 },
  { difMin: 3001, difMax: 3500, costo: 2000 },
  { difMin: 3501, difMax: 4000, costo: 1800 },
  { difMin: 4001, difMax: 4500, costo: 1600 },
  { difMin: 4501, difMax: 5000, costo: 1400 },
  { difMin: 5001, difMax: 5500, costo: 1200 },
  { difMin: 5501, difMax: 6000, costo: 1000 },
  { difMin: 6001, difMax: 7000, costo: 500 },
  { difMin: 7001, difMax: 999999999, costo: 0 },
];

var TOKEN_DAYS = 30;      // duración de sesión
var HASH_ITERATIONS = 2000;

// ── Entradas HTTP ───────────────────────────────────────────────
function doGet(e) {
  return jsonOut_({ ok: true, service: 'techchic-backend', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = String(body.action || '');
    var token = String(body.token || '');
    var data = body.data || {};
    ensureSheets_();

    var out;
    switch (action) {
      case 'quoteCart':      out = quoteCart_(data); break;
      case 'createOrder':    out = withLock_(function () { return createOrder_(data, token); }); break;
      case 'getOrder':       out = getOrder_(data); break;
      case 'getMyOrders':    out = getMyOrders_(token); break;
      case 'register':       out = withLock_(function () { return register_(data); }); break;
      case 'login':          out = withLock_(function () { return login_(data); }); break;
      case 'logout':         out = withLock_(function () { return logout_(token); }); break;
      case 'updateProfile':  out = withLock_(function () { return updateProfile_(data, token); }); break;
      case 'changePassword': out = withLock_(function () { return changePassword_(data, token); }); break;
      case 'saveCart':       out = withLock_(function () { return saveCart_(data, token); }); break;
      case 'getCart':        out = getCart_(token); break;
      case 'addReview':      out = withLock_(function () { return addReview_(data, token); }); break;
      case 'getReviews':     out = getReviews_(data); break;
      default: throw new Error('Acción desconocida: ' + action);
    }
    out.ok = true;
    return jsonOut_(out);
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); }
  finally { lock.releaseLock(); }
}

// ── Infraestructura de hojas ────────────────────────────────────
function ss_() { return SpreadsheetApp.getActive(); }

function ensureSheets_() {
  var ss = ss_();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
}

function sheet_(name) { return ss_().getSheetByName(name); }

/** Lee toda la hoja como arreglo de objetos {header: valor}. */
function readAll_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1).map(function (row, i) {
    var obj = { _row: i + 2 };
    headers.forEach(function (h, j) { obj[h] = row[j]; });
    return obj;
  });
}

function appendRow_(name, obj) {
  var headers = HEADERS[name];
  sheet_(name).appendRow(headers.map(function (h) {
    return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
  }));
}

function updateCell_(name, row, header, value) {
  var col = HEADERS[name].indexOf(header) + 1;
  if (col < 1) throw new Error('Columna desconocida: ' + header);
  sheet_(name).getRange(row, col).setValue(value);
}

// ── Config (tablas de costos editables desde el admin) ──────────
function getConfig_(key, fallback) {
  var rows = readAll_(SHEETS.CONFIG);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key && rows[i].valueJson) {
      try { return JSON.parse(rows[i].valueJson); } catch (e) { break; }
    }
  }
  return fallback;
}

// ── Catálogo privado y cotización ───────────────────────────────
function catalogMap_() {
  var map = {};
  readAll_(SHEETS.CATALOGO).forEach(function (r) {
    if (r.code) map[String(r.code)] = r;
  });
  return map;
}

function discounted_(price, pct) {
  pct = Math.min(95, Math.max(0, Number(pct) || 0));
  return Math.round(Number(price) * (1 - pct / 100));
}

function resolveItems_(items) {
  var cat = catalogMap_();
  var out = [];
  (items || []).forEach(function (it) {
    var p = cat[String(it.code || '')];
    if (!p) return; // producto inexistente: se ignora (el precio manda el servidor)
    var unit = discounted_(p.price, p.discountPct);
    var almacen = Number(p.almacen) || 0;
    out.push({
      code: String(p.code),
      name: String(p.name),
      color: String(it.color || ''),
      qty: Math.max(1, Math.min(99, Number(it.qty) || 1)),
      unitPrice: unit,
      dif: Math.max(0, unit - almacen),
    });
  });
  return out;
}

function computeQuote_(items) {
  var subtotal = 0, difTotal = 0;
  items.forEach(function (i) {
    subtotal += i.unitPrice * i.qty;
    difTotal += i.dif * i.qty;
  });
  var tiers = getConfig_('opCostTiers', DEFAULT_OPCOST_TIERS);
  var opCost = 0;
  for (var i = 0; i < tiers.length; i++) {
    if (difTotal >= tiers[i].difMin && difTotal <= tiers[i].difMax) { opCost = Number(tiers[i].costo) || 0; break; }
  }
  return { subtotal: subtotal, opCost: opCost, total: subtotal + opCost };
}

function quoteCart_(data) {
  var items = resolveItems_(data.items);
  if (!items.length) throw new Error('El carrito está vacío o los productos ya no existen.');
  var q = computeQuote_(items);
  return {
    items: items.map(function (i) { return { code: i.code, name: i.name, color: i.color, qty: i.qty, unitPrice: i.unitPrice }; }),
    subtotal: q.subtotal, opCost: q.opCost, total: q.total,
  };
}

// ── Órdenes ─────────────────────────────────────────────────────
function randCode_(len) {
  var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

function createOrder_(data, token) {
  var items = resolveItems_(data.items);
  if (!items.length) throw new Error('El carrito está vacío o los productos ya no existen.');
  var q = computeQuote_(items);

  var existing = {};
  readAll_(SHEETS.ORDENES).forEach(function (o) { existing[o.code] = true; });
  var code;
  do { code = 'TC-' + randCode_(6); } while (existing[code]);

  var user = userFromToken_(token);
  var now = new Date().toISOString();
  var history = [{ status: ORDER_STATUSES[0], at: now }];

  var order = {
    code: code,
    createdAt: now,
    status: ORDER_STATUSES[0],
    canal: String(data.canal || 'WhatsApp'),
    nombre: String((data.buyer && data.buyer.nombre) || (user && user.nombre) || '').slice(0, 120),
    direccion: String((data.buyer && data.buyer.direccion) || (user && user.direccion) || '').slice(0, 400),
    userId: user ? user.id : '',
    subtotal: q.subtotal,
    opCost: q.opCost,
    total: q.total,
    historyJson: JSON.stringify(history),
    notas: '',
  };
  appendRow_(SHEETS.ORDENES, order);
  items.forEach(function (i) {
    appendRow_(SHEETS.ITEMS, {
      orderCode: code, productCode: i.code, name: i.name, color: i.color,
      qty: i.qty, unitPrice: i.unitPrice, subEstado: '',
    });
  });

  return { code: code, order: orderToClient_(order, items.map(function (i) {
    return { code: i.code, name: i.name, color: i.color, qty: i.qty, unitPrice: i.unitPrice, subEstado: '' };
  })) };
}

function orderToClient_(o, items) {
  var history = [];
  try { history = JSON.parse(o.historyJson || '[]'); } catch (e) {}
  return {
    code: o.code,
    createdAt: o.createdAt,
    status: o.status,
    canal: o.canal,
    buyer: { nombre: o.nombre, direccion: o.direccion, userId: o.userId },
    items: items,
    subtotal: Number(o.subtotal) || 0,
    opCost: o.opCost === '' ? null : Number(o.opCost) || 0,
    total: Number(o.total) || 0,
    history: history,
  };
}

function findOrder_(code) {
  code = String(code || '').trim().toUpperCase();
  var rows = readAll_(SHEETS.ORDENES);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].code).toUpperCase() === code) return rows[i];
  }
  return null;
}

function orderItems_(code) {
  return readAll_(SHEETS.ITEMS)
    .filter(function (r) { return String(r.orderCode) === String(code); })
    .map(function (r) {
      return {
        code: String(r.productCode), name: String(r.name), color: String(r.color),
        qty: Number(r.qty) || 0, unitPrice: Number(r.unitPrice) || 0,
        subEstado: String(r.subEstado || ''),
      };
    });
}

function getOrder_(data) {
  var o = findOrder_(data.code);
  if (!o) throw new Error('No encontramos ninguna compra con ese código.');
  return { order: orderToClient_(o, orderItems_(o.code)) };
}

function getMyOrders_(token) {
  var user = requireUser_(token);
  var mine = readAll_(SHEETS.ORDENES)
    .filter(function (o) { return String(o.userId) === String(user.id); })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })
    .map(function (o) { return orderToClient_(o, orderItems_(o.code)); });
  return { orders: mine };
}

// ── Cuentas de usuario ──────────────────────────────────────────
function toHex_(bytes) {
  return bytes.map(function (b) {
    var v = (b + 256) % 256;
    var h = v.toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function hashPassword_(salt, password) {
  var value = salt + password;
  for (var i = 0; i < HASH_ITERATIONS; i++) {
    value = toHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8));
  }
  return value;
}

function publicUser_(u) {
  return {
    id: String(u.id), usuario: String(u.usuario), nombre: String(u.nombre),
    email: String(u.email), direccion: String(u.direccion || ''), fotoUrl: String(u.fotoUrl || ''),
  };
}

function issueToken_(userId) {
  var token = 'tok_' + Utilities.getUuid().replace(/-/g, '');
  var expires = new Date(Date.now() + TOKEN_DAYS * 24 * 3600 * 1000).toISOString();
  appendRow_(SHEETS.SESIONES, { token: token, userId: userId, expiresAt: expires });
  return token;
}

function userFromToken_(token) {
  if (!token) return null;
  var ses = readAll_(SHEETS.SESIONES).filter(function (s) { return s.token === token; })[0];
  if (!ses) return null;
  if (new Date(ses.expiresAt) < new Date()) return null;
  var user = readAll_(SHEETS.USUARIOS).filter(function (u) { return String(u.id) === String(ses.userId); })[0];
  return user || null;
}

function requireUser_(token) {
  var user = userFromToken_(token);
  if (!user) throw new Error('Sesión expirada. Inicia sesión de nuevo.');
  return user;
}

function register_(data) {
  var usuario = String(data.usuario || '').trim();
  var nombre = String(data.nombre || '').trim();
  var email = String(data.email || '').trim();
  var password = String(data.password || '');
  if (!usuario || !nombre || !email || !password) throw new Error('Completa todos los campos.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  if (!/.+@.+\..+/.test(email)) throw new Error('Email inválido.');

  var users = readAll_(SHEETS.USUARIOS);
  if (users.some(function (u) { return String(u.usuario).toLowerCase() === usuario.toLowerCase(); }))
    throw new Error('Ese nombre de usuario ya existe.');
  if (users.some(function (u) { return String(u.email).toLowerCase() === email.toLowerCase(); }))
    throw new Error('Ya existe una cuenta con ese email.');

  var id = 'U' + Date.now().toString(36) + randCode_(4);
  var salt = Utilities.getUuid().slice(0, 8);
  appendRow_(SHEETS.USUARIOS, {
    id: id, usuario: usuario, nombre: nombre, email: email,
    direccion: String(data.direccion || '').slice(0, 400),
    salt: salt, hash: hashPassword_(salt, password),
    fotoUrl: '', carritoJson: '[]', createdAt: new Date().toISOString(),
  });
  var token = issueToken_(id);
  return { token: token, user: publicUser_({ id: id, usuario: usuario, nombre: nombre, email: email, direccion: data.direccion || '', fotoUrl: '' }) };
}

function login_(data) {
  var idNorm = String(data.id || '').trim().toLowerCase();
  var user = readAll_(SHEETS.USUARIOS).filter(function (u) {
    return String(u.email).toLowerCase() === idNorm || String(u.usuario).toLowerCase() === idNorm;
  })[0];
  if (!user) throw new Error('Usuario o contraseña incorrectos.');
  if (hashPassword_(String(user.salt), String(data.password || '')) !== String(user.hash))
    throw new Error('Usuario o contraseña incorrectos.');
  var token = issueToken_(user.id);
  return { token: token, user: publicUser_(user) };
}

function logout_(token) {
  var rows = readAll_(SHEETS.SESIONES);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].token === token) { sheet_(SHEETS.SESIONES).deleteRow(rows[i]._row); break; }
  }
  return {};
}

function updateProfile_(data, token) {
  var user = requireUser_(token);
  var field = String(data.field || '');
  var value = String(data.value || '').trim();
  var allowed = ['usuario', 'nombre', 'email', 'direccion', 'fotoUrl'];
  if (allowed.indexOf(field) < 0) throw new Error('Campo desconocido.');

  if (field === 'usuario') {
    if (!value) throw new Error('El nombre de usuario no puede estar vacío.');
    if (readAll_(SHEETS.USUARIOS).some(function (u) {
      return String(u.id) !== String(user.id) && String(u.usuario).toLowerCase() === value.toLowerCase();
    })) throw new Error('Ese nombre de usuario ya existe.');
  }
  if (field === 'nombre' && !value) throw new Error('El nombre no puede estar vacío.');
  if (field === 'email') {
    if (!/.+@.+\..+/.test(value)) throw new Error('Email inválido.');
    if (readAll_(SHEETS.USUARIOS).some(function (u) {
      return String(u.id) !== String(user.id) && String(u.email).toLowerCase() === value.toLowerCase();
    })) throw new Error('Ya existe una cuenta con ese email.');
  }

  updateCell_(SHEETS.USUARIOS, user._row, field, value);
  user[field] = value;
  return { user: publicUser_(user) };
}

function changePassword_(data, token) {
  var user = requireUser_(token);
  if (hashPassword_(String(user.salt), String(data.current || '')) !== String(user.hash))
    throw new Error('La contraseña actual no es correcta.');
  var next = String(data.next || '');
  if (next.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  var salt = Utilities.getUuid().slice(0, 8);
  updateCell_(SHEETS.USUARIOS, user._row, 'salt', salt);
  updateCell_(SHEETS.USUARIOS, user._row, 'hash', hashPassword_(salt, next));
  return {};
}

// ── Carrito en servidor ─────────────────────────────────────────
function saveCart_(data, token) {
  var user = userFromToken_(token);
  if (!user) return {}; // invitado: no aplica
  var items = (data.items || []).filter(function (i) { return i && i.code && Number(i.qty) > 0; })
    .map(function (i) { return { code: String(i.code), color: String(i.color || ''), qty: Math.min(99, Number(i.qty)) }; });
  updateCell_(SHEETS.USUARIOS, user._row, 'carritoJson', JSON.stringify(items).slice(0, 40000));
  return {};
}

function getCart_(token) {
  var user = requireUser_(token);
  var items = [];
  try { items = JSON.parse(user.carritoJson || '[]'); } catch (e) {}
  return { items: items };
}

// ── Reseñas ─────────────────────────────────────────────────────
function addReview_(data, token) {
  var user = requireUser_(token);
  var stars = Math.max(1, Math.min(5, Number(data.stars) || 0));
  var text = String(data.text || '').slice(0, 600);
  var productCode = String(data.productCode || '');
  if (!productCode) throw new Error('Producto inválido.');

  var rows = readAll_(SHEETS.RESENAS);
  var existing = rows.filter(function (r) {
    return String(r.productCode) === productCode && String(r.userId) === String(user.id);
  })[0];
  if (existing) {
    updateCell_(SHEETS.RESENAS, existing._row, 'stars', stars);
    updateCell_(SHEETS.RESENAS, existing._row, 'text', text);
    updateCell_(SHEETS.RESENAS, existing._row, 'at', new Date().toISOString());
  } else {
    appendRow_(SHEETS.RESENAS, {
      productCode: productCode, userId: user.id, usuario: user.usuario,
      stars: stars, text: text, at: new Date().toISOString(),
    });
  }
  return getReviews_({ productCode: productCode });
}

function getReviews_(data) {
  var productCode = String(data.productCode || '');
  var reviews = readAll_(SHEETS.RESENAS)
    .filter(function (r) { return String(r.productCode) === productCode; })
    .map(function (r) {
      return {
        userId: String(r.userId), usuario: String(r.usuario),
        stars: Number(r.stars) || 0, text: String(r.text || ''), at: String(r.at),
      };
    });
  return { reviews: reviews };
}

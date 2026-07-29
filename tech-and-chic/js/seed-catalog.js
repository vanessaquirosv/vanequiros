// ═══════════════════════════════════════════════════════════════
// Tech & Chic — catálogo de DEMOSTRACIÓN
// Se usa solo cuando aún no hay catálogo publicado en Firebase.
// El campo `almacen` (costo) existe aquí ÚNICAMENTE para el modo
// demo local; el catálogo real publicado NUNCA lo incluye.
// ═══════════════════════════════════════════════════════════════
import { computeSalePrice } from './pricing.js';

const demoImg = (code) => `https://picsum.photos/seed/tc-${code}/640/640`;

function p(code, name, brand, category, subcategory, almacen, extra = {}) {
  return {
    code,
    name,
    brand,
    category,
    subcategory,
    almacen,                      // solo demo
    price: computeSalePrice(almacen),
    discountPct: 0,
    hot: false,
    desc: '',
    specs: [],
    img: demoImg(code),
    colors: [],
    ...extra,
  };
}

const products = [
  p('A3F91C02', 'Audífonos Inalámbricos Pro ANC', 'SoundCore', 'Tecnología', 'Audio', 18500, {
    hot: true,
    desc: 'Audífonos over-ear con cancelación activa de ruido, 40 horas de batería y sonido de alta fidelidad. Perfectos para trabajar, estudiar o viajar.',
    specs: ['Bluetooth 5.3', 'Cancelación activa de ruido (ANC)', '40 h de batería', 'Carga rápida USB-C', 'Micrófono con reducción de ruido'],
    colors: [
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Violeta', hex: '#7c3aed' },
      { name: 'Crema', hex: '#f5f0e6' },
    ],
  }),
  p('B7D204E8', 'Mini Proyector Portátil HD', 'LumiCast', 'Tecnología', 'Smart Home', 42000, {
    hot: true,
    desc: 'Proyector compacto 1080p con WiFi y Bluetooth. Convierte cualquier pared en tu cine personal.',
    specs: ['Resolución nativa 1080p', 'WiFi 5 + Bluetooth', 'Hasta 120" de proyección', 'Altavoz integrado', 'Compatible con HDMI/USB'],
  }),
  p('C15A88F0', 'Banda LED RGB Inteligente 5m', 'GlowTech', 'Tecnología', 'Smart Home', 6500, {
    discountPct: 20,
    desc: 'Tira LED de 5 metros con control por app y sincronización con música. Dale ambiente a cualquier espacio.',
    specs: ['5 metros recortables', 'App iOS/Android', 'Sincronización con música', '16 millones de colores', 'Adhesivo 3M incluido'],
  }),
  p('D9E3B617', 'Cargador Inalámbrico 3 en 1', 'VoltEdge', 'Tecnología', 'Accesorios', 9800, {
    desc: 'Estación de carga para teléfono, audífonos y smartwatch al mismo tiempo. Diseño plegable de viaje.',
    specs: ['Carga rápida 15W', 'Compatible iPhone/Android', 'Plegable', 'Protección contra sobrecarga'],
    colors: [
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Blanco', hex: '#fafafa' },
    ],
  }),
  p('E2C7A934', 'Smartwatch Fit Elegance', 'Pulse', 'Tecnología', 'Wearables', 24500, {
    hot: true,
    discountPct: 15,
    desc: 'Reloj inteligente con pantalla AMOLED, monitoreo de salud 24/7 y hasta 10 días de batería.',
    specs: ['Pantalla AMOLED 1.43"', 'Oxímetro y ritmo cardíaco', 'Resistente al agua IP68', '10 días de batería', '+100 modos deportivos'],
    colors: [
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Rosa dorado', hex: '#e8b4b8' },
    ],
  }),
  p('F04B6D21', 'Bolso Tote Minimalista', 'Marlé', 'Moda', 'Bolsos', 12500, {
    desc: 'Bolso amplio de cuero vegano con compartimento para laptop de 14". Elegancia para el día a día.',
    specs: ['Cuero vegano premium', 'Compartimento laptop 14"', 'Cierre magnético', 'Bolsillo interno con zipper'],
    colors: [
      { name: 'Beige', hex: '#d9c7b2' },
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Vino', hex: '#722f37' },
    ],
  }),
  p('0A9C43D5', 'Set de Joyería Acero Dorado', 'Aurea', 'Moda', 'Joyería', 7200, {
    discountPct: 10,
    desc: 'Collar y aretes de acero inoxidable con baño dorado 18k. Hipoalergénico y resistente al agua.',
    specs: ['Acero inoxidable 316L', 'Baño dorado 18k', 'Hipoalergénico', 'Incluye estuche de regalo'],
  }),
  p('1B8E57A9', 'Difusor Aromático Ultrasónico', 'Zenva', 'Hogar', 'Decoración', 8900, {
    desc: 'Difusor de aceites esenciales con luz LED cálida y apagado automático. Crea tu espacio de calma.',
    specs: ['Tanque 300 ml', 'Hasta 8 h continuas', 'Luz LED 7 colores', 'Apagado automático', 'Ultra silencioso'],
  }),
  p('2C6F19BE', 'Licuadora Portátil USB', 'FreshGo', 'Hogar', 'Cocina', 5400, {
    hot: true,
    desc: 'Licuadora personal recargable por USB. Batidos frescos en la oficina, el gym o donde sea.',
    specs: ['380 ml', 'Recargable USB-C', '6 cuchillas de acero', 'Fácil de limpiar'],
    colors: [
      { name: 'Lila', hex: '#c4b5fd' },
      { name: 'Menta', hex: '#a7f3d0' },
      { name: 'Blanco', hex: '#fafafa' },
    ],
  }),
  p('3D2A84C7', 'Lámpara de Escritorio Táctil', 'Lumina', 'Hogar', 'Decoración', 4300, {
    desc: 'Lámpara LED plegable con 3 temperaturas de luz y puerto de carga USB integrado.',
    specs: ['3 temperaturas de color', 'Brillo regulable táctil', 'Puerto USB de carga', 'Brazo plegable'],
  }),
  p('4E7D62F8', 'Plancha de Cabello Cerámica Pro', 'SilkStyle', 'Belleza', 'Cuidado personal', 13800, {
    discountPct: 25,
    desc: 'Plancha profesional con placas de cerámica y turmalina, calentamiento en 15 segundos.',
    specs: ['Placas cerámica + turmalina', 'Hasta 230 °C regulable', 'Calienta en 15 s', 'Apagado automático', 'Voltaje universal'],
  }),
  p('5F1C97A3', 'Mini Aspiradora Inalámbrica', 'TurboClean', 'Hogar', 'Limpieza', 11200, {
    desc: 'Aspiradora de mano potente y recargable. Ideal para el carro, escritorio y rincones difíciles.',
    specs: ['Succión 9000 Pa', 'Recargable USB-C', 'Filtro HEPA lavable', 'Incluye 3 boquillas'],
  }),
  p('6A5B30D1', 'Teclado Mecánico Compacto RGB', 'KeyForge', 'Tecnología', 'Accesorios', 16700, {
    desc: 'Teclado mecánico 65% con switches red, retroiluminación RGB y modo inalámbrico triple.',
    specs: ['Formato 65%', 'Switches red hot-swap', 'BT 5.0 / 2.4G / USB-C', 'RGB por tecla', 'Keycaps PBT'],
    colors: [
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Blanco/Lila', hex: '#ddd6fe' },
    ],
  }),
  p('7C8D45E2', 'Botella Térmica Inteligente', 'Hydra', 'Hogar', 'Cocina', 6800, {
    desc: 'Botella de acero con pantalla táctil de temperatura. Mantiene frío 24 h y caliente 12 h.',
    specs: ['500 ml', 'Pantalla LED de temperatura', 'Frío 24 h / calor 12 h', 'Libre de BPA'],
  }),
];

const categories = [
  { name: 'Tecnología', subs: ['Audio', 'Smart Home', 'Accesorios', 'Wearables'] },
  { name: 'Moda', subs: ['Bolsos', 'Joyería'] },
  { name: 'Hogar', subs: ['Cocina', 'Decoración', 'Limpieza'] },
  { name: 'Belleza', subs: ['Cuidado personal'] },
];

export const SEED_CATALOG = {
  version: 'seed-demo',
  updatedAt: new Date().toISOString(),
  demo: true,
  products,
  categories,
  home: {
    hot: products.filter(x => x.hot).map(x => x.code),
    promos: products.filter(x => x.discountPct > 0).map(x => x.code),
    combos: [],
  },
};

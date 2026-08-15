// Datos del panel de administracion en MODO DEMO. Todo ficticio y etiquetado
// como tal. Los tickets enviados desde /ayuda mientras la app esta en demo se
// guardan en localStorage y se muestran junto a los de ejemplo.

const LOCAL_KEY = 'presufact-demo-tickets';        // tickets creados por el visitante
const OVERRIDE_KEY = 'presufact-demo-tickets-ov';  // cambios sobre los de ejemplo (estado/borrado)

const iso = (diasAtras, hora = 10) => {
  const d = new Date(Date.now() - diasAtras * 86400000);
  d.setHours(hora, 12, 0, 0);
  return d.toISOString();
};

export const TICKETS_EJEMPLO = [
  { id: 'demo-t1', fecha: iso(0, 9), estado: 'abierto', tipo: 'duda', email: 'laura.m@gmail.com', asunto: '¿Puedo poner dos firmas en el presupuesto?', mensaje: 'Trabajo con mi socio y nos gustaría que firmáramos los dos en la zona de "La empresa". ¿Se puede o solo admite una?' },
  { id: 'demo-t2', fecha: iso(0, 8), estado: 'abierto', tipo: 'bug', email: 'pedro.instalaciones@outlook.es', asunto: 'El logo sale pixelado en el PDF', mensaje: 'Subí un logo en JPG de 300x120 y en el PDF se ve borroso. En pantalla se ve bien. Uso Chrome en Windows 11.' },
  { id: 'demo-t3', fecha: iso(1, 17), estado: 'abierto', tipo: 'sugerencia', email: '', asunto: 'Plantilla de presupuesto para pintores', mensaje: 'Sería genial tener partidas predefinidas para pintura (m² de pared, techo, esmalte de puertas...). Ahora las escribo cada vez.' },
  { id: 'demo-t4', fecha: iso(2, 11), estado: 'resuelto', actualizado: iso(2, 15), tipo: 'duda', email: 'reformas.aguilar@gmail.com', asunto: 'No encuentro dónde cambiar el IVA al 10 %', mensaje: 'Hago obras en viviendas y muchas van al 10 %. ¿Dónde se cambia?' },
  { id: 'demo-t5', fecha: iso(3, 10), estado: 'resuelto', actualizado: iso(3, 12), tipo: 'bug', email: 'a.costales@hotmail.com', asunto: 'Importar PDF de Billin no lee la fecha', mensaje: 'Al importar una factura antigua de Billin, todo se lee bien menos la fecha, que queda vacía. Adjuntaría un ejemplo si hiciera falta.' },
  { id: 'demo-t6', fecha: iso(4, 19), estado: 'resuelto', actualizado: iso(3, 9), tipo: 'duda', email: '', asunto: '¿Dónde están mis datos si cambio de ordenador?', mensaje: 'He abierto la web en el portátil y no está nada. ¿Se ha perdido todo?' },
  { id: 'demo-t7', fecha: iso(6, 12), estado: 'resuelto', actualizado: iso(6, 14), tipo: 'sugerencia', email: 'electricidad.norte@gmail.com', asunto: 'Botón para duplicar presupuesto', mensaje: 'Hago muchos presupuestos casi iguales; un botón de duplicar me ahorraría un montón. (Edito: ya lo he encontrado en los tres puntos, ¡gracias!)' },
  { id: 'demo-t8', fecha: iso(9, 16), estado: 'resuelto', actualizado: iso(8, 10), tipo: 'bug', email: 'clara.dg@icloud.com', asunto: 'En el iPhone no puedo firmar con el dedo', mensaje: 'En Safari del móvil, al intentar firmar, la página se desplaza en vez de dibujar la firma.' },
  { id: 'demo-t9', fecha: iso(13, 9), estado: 'resuelto', actualizado: iso(12, 18), tipo: 'duda', email: 'gestoria.pilar@gestpilar.es', asunto: 'Formato del CSV para importarlo en A3', mensaje: 'Soy la gestora de un cliente vuestro. ¿El CSV del ZIP gestoría lleva el desglose de IVA por tipo? Lo necesito para A3.' },
];

// ---- tickets del visitante (localStorage) ----
export function getLocalDemoTickets() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function setLocalDemoTickets(list) { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); }
export function addLocalDemoTicket({ asunto, mensaje, email }) {
  const t = { id: 'local-' + Date.now().toString(36), fecha: new Date().toISOString(), estado: 'abierto', tipo: 'duda', asunto, mensaje, email: email || '', local: true };
  setLocalDemoTickets([t, ...getLocalDemoTickets()]);
  return t;
}

function getOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}'); } catch { return {}; }
}
function setOverrides(o) { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o)); }

// Lista completa del panel demo: ejemplo (con cambios aplicados) + locales
export function getDemoTickets() {
  const ov = getOverrides();
  const ejemplo = TICKETS_EJEMPLO
    .filter(t => !ov[t.id]?.deleted)
    .map(t => ov[t.id] ? { ...t, ...ov[t.id] } : t);
  return [...getLocalDemoTickets(), ...ejemplo].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function updateDemoTicket(id, patch) {
  const p = { ...patch, actualizado: new Date().toISOString() };
  if (id.startsWith('local-')) {
    setLocalDemoTickets(getLocalDemoTickets().map(t => t.id === id ? { ...t, ...p } : t));
  } else {
    const ov = getOverrides(); ov[id] = { ...(ov[id] || {}), ...p }; setOverrides(ov);
  }
}

export function deleteDemoTicket(id) {
  if (id.startsWith('local-')) {
    setLocalDemoTickets(getLocalDemoTickets().filter(t => t.id !== id));
  } else {
    const ov = getOverrides(); ov[id] = { ...(ov[id] || {}), deleted: true }; setOverrides(ov);
  }
}

export function resetDemoTickets() {
  localStorage.removeItem(LOCAL_KEY);
  localStorage.removeItem(OVERRIDE_KEY);
}

// ---- Trafico agregado del hosting (ficticio, determinista) ----
// Curva creible: crecimiento suave + patron semanal (menos los fines de semana) + un pico (post en redes)
export function getTraficoDemo() {
  const dias = 30;
  const hoy = new Date();
  const serie = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 86400000);
    const dow = d.getDay(); // 0 domingo
    const finde = dow === 0 || dow === 6 ? 0.55 : 1;
    const base = 140 + (dias - 1 - i) * 6.5;               // tendencia
    const onda = 1 + 0.12 * Math.sin((dias - i) * 1.3);    // ruido suave y determinista
    const pico = i === 6 ? 2.6 : i === 5 ? 1.7 : 1;        // pico hace 6 dias
    serie.push({ fecha: d.toISOString().split('T')[0], visitas: Math.round(base * finde * onda * pico) });
  }
  const visitas30 = serie.reduce((s, x) => s + x.visitas, 0);
  const prev7 = serie.slice(-14, -7).reduce((s, x) => s + x.visitas, 0);
  const last7 = serie.slice(-7).reduce((s, x) => s + x.visitas, 0);
  return {
    serie,
    visitas30,
    variacion7d: prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : 0,
    demosIniciadas: Math.round(visitas30 * 0.19),
    pdfsPorSesionMedia: 1.8, // solo ilustrativo
    paginas: [
      { label: '/ (landing)', value: Math.round(visitas30 * 0.41) },
      { label: '/demo', value: Math.round(visitas30 * 0.19) },
      { label: '/generador-de-presupuestos', value: Math.round(visitas30 * 0.14) },
      { label: '/presupuesto-reforma', value: Math.round(visitas30 * 0.09) },
      { label: '/verifactu', value: Math.round(visitas30 * 0.08) },
      { label: '/comparativa', value: Math.round(visitas30 * 0.05) },
      { label: '/ayuda', value: Math.round(visitas30 * 0.04) },
    ],
    dispositivos: [
      { label: 'Móvil', value: 58, color: '#2563eb' },
      { label: 'Escritorio', value: 37, color: '#93c5fd' },
      { label: 'Tablet', value: 5, color: '#dbeafe' },
    ],
    fuentes: [
      { label: 'Búsqueda orgánica', value: 46 },
      { label: 'LinkedIn', value: 27 },
      { label: 'Directo', value: 19 },
      { label: 'Otros', value: 8 },
    ],
  };
}

// ---- Salud del servicio (ficticio salvo tests/audit, que son reales en el repo) ----
export function getSaludDemo() {
  return {
    uptime30d: '99,98 %',
    p95ms: 210,
    errores5xx: 0,
    ultimoDeploy: new Date().toISOString(),
    tests: '15 / 15',
    vulnerabilidades: 0,
    lighthouse: [
      { label: 'Rendimiento', value: 97 },
      { label: 'Accesibilidad', value: 100 },
      { label: 'Buenas prácticas', value: 100 },
      { label: 'SEO', value: 100 },
    ],
  };
}

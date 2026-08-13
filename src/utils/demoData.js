import { db, saveDocument } from '../db';

// Datos de ejemplo realistas para ensenar Presufact (modo demo).
// Cubren todos los rincones: estados variados, IRPF, multi-IVA, deduccion,
// proforma, vencida, presupuestos en todos los estados y varios trimestres.

const EMISOR_DEMO = {
  nombre: 'REFORMAS EL NORTE S.L.',
  subtitulo: 'Reformas integrales y mantenimiento',
  nif: 'B33445566',
  direccion: 'Polígono de Somonte, Nave 12',
  cp: '33393', ciudad: 'Gijón', provincia: 'Asturias',
  telefono: '985 123 456', email: 'hola@reformaselnorte.es', web: 'www.reformaselnorte.es',
  iban: 'ES02 0049 3586 1921 1403 5991',
  logo: null, colorMarca: '#0f766e'
};

const CLIENTES = [
  { nombre: 'COMUNIDAD DE PROPIETARIOS AVDA. DEL LLANO 23', nif: 'H33112233', direccion: 'Avda. del Llano 23', cp: '33209', ciudad: 'Gijón', provincia: 'Asturias', email: 'presidente@cpllano23.es' },
  { nombre: 'CONSTRUCCIONES COVADONGA S.L.', nif: 'B33998877', direccion: 'C/ Marqués de San Esteban 10', cp: '33206', ciudad: 'Gijón', provincia: 'Asturias', email: 'obras@covadonga.es', telefono: '985 333 444' },
  { nombre: 'CAFETERÍA EL MUELLE', nif: 'B74556677', direccion: 'Puerto Deportivo, Local 4', cp: '33201', ciudad: 'Gijón', provincia: 'Asturias', email: 'info@elmuelle.es' },
  { nombre: 'MARÍA FERNÁNDEZ GARCÍA', nif: '10887766Z', direccion: 'C/ Uría 45, 3.º D', cp: '33202', ciudad: 'Gijón', provincia: 'Asturias' },
  { nombre: 'INMOBILIARIA PRINCIPADO S.A.', nif: 'A33667788', direccion: 'Plaza del Ayuntamiento 2', cp: '33001', ciudad: 'Oviedo', provincia: 'Asturias', email: 'admin@inmoprincipado.es' },
];

const hoy = () => new Date().toISOString().split('T')[0];
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];

export async function seedDemoData() {
  const year = new Date().getFullYear();
  const f = (n) => `${year}-${String(n).padStart(4, '0')}`;
  const base = (cliIdx) => ({
    documentType: 'Factura', emisor: { ...EMISOR_DEMO }, cliente: { ...CLIENTES[cliIdx] },
    formaPago: 'TRANSFERENCIA BANCARIA A LA RECEPCION DE LA FACTURA',
    deducciones: [], observaciones: `Número de cuenta: ${EMISOR_DEMO.iban}`, vencimientos: []
  });

  // ---- FACTURAS ----
  await saveDocument('factura', { ...base(0), invoiceNumber: f(1), date: `${year}-01-20`, estado: 'cobrada',
    descripcionTrabajo: 'Reparación de humedades en portal y garaje.',
    lineas: [
      { articulo: 'Impermeabilización', descripcion: 'Tratamiento antihumedad de muros de garaje', cantidad: '48', precioUd: '32.50', unidad: 'm2' },
      { articulo: 'Pintura', descripcion: 'Pintura plástica en paredes de portal, dos manos', cantidad: '85', precioUd: '9.80', unidad: 'm2' }
    ], iva: { tipo: 21 } });

  await saveDocument('factura', { ...base(1), invoiceNumber: f(2), date: `${year}-02-14`, estado: 'cobrada',
    descripcionTrabajo: 'Subcontrata: tabiquería en obra C/ Ezcurdia.',
    lineas: [{ articulo: 'Tabiquería', descripcion: 'Tabique de cartón-yeso 15+70+15 con aislamiento', cantidad: '120', precioUd: '28.90', unidad: 'm2' }],
    iva: { tipo: 21, inversionSujetoPasivo: true } });

  await saveDocument('factura', { ...base(2), invoiceNumber: f(3), date: `${year}-03-28`, estado: 'cobrada',
    descripcionTrabajo: 'Reforma de barra y zona de camareros.',
    lineas: [
      { articulo: 'Carpintería', descripcion: 'Mueble de barra a medida en roble', cantidad: '1', precioUd: '2400', unidad: 'ud' },
      { articulo: 'Fontanería', descripcion: 'Instalación de fregadero doble y lavavasos', cantidad: '6', precioUd: '65', unidad: 'h' }
    ], iva: { tipo: 21 } });

  await saveDocument('factura', { ...base(4), invoiceNumber: f(4), date: `${year}-04-15`, estado: 'cobrada',
    descripcionTrabajo: 'Mantenimiento trimestral de cartera de pisos (T1).',
    lineas: [{ articulo: 'Mantenimiento', descripcion: 'Bolsa de horas de mantenimiento y pequeñas reparaciones', cantidad: '32', precioUd: '38', unidad: 'h' }],
    iva: { tipo: 21, irpf: 15 } });

  await saveDocument('factura', { ...base(3), invoiceNumber: f(5), date: `${year}-05-22`, estado: 'pendiente',
    descripcionTrabajo: 'Reforma de baño principal.',
    lineas: [
      { articulo: 'Demolición', descripcion: 'Retirada de sanitarios y alicatado antiguo', cantidad: '1', precioUd: '480', unidad: 'ud' },
      { articulo: 'Alicatado', descripcion: 'Alicatado porcelánico 30x60', cantidad: '24', precioUd: '42', unidad: 'm2' },
      { articulo: 'Sanitarios', descripcion: 'Suministro y montaje de plato de ducha, inodoro y lavabo', cantidad: '1', precioUd: '1150', unidad: 'ud', iva: 10 }
    ], iva: { tipo: 21 },
    vencimientos: [{ fecha: diasAtras(-20), importe: '', domiciliacion: 'BANCO SANTANDER', oficina: 'GIJÓN', numeroCuenta: EMISOR_DEMO.iban }] });

  await saveDocument('factura', { ...base(0), invoiceNumber: f(6), date: diasAtras(75), estado: 'pendiente',
    descripcionTrabajo: 'Sustitución de bajante comunitaria.',
    lineas: [{ articulo: 'Fontanería', descripcion: 'Sustitución de bajante de fibrocemento por PVC, 3 plantas', cantidad: '18', precioUd: '95', unidad: 'ml' }],
    iva: { tipo: 21 },
    vencimientos: [{ fecha: diasAtras(30), importe: '', domiciliacion: 'BANCO SANTANDER', oficina: 'GIJÓN', numeroCuenta: EMISOR_DEMO.iban }] });

  await saveDocument('factura', { ...base(1), invoiceNumber: f(7), date: diasAtras(12), estado: 'enviada',
    descripcionTrabajo: 'Certificación n.º 2 — obra Avda. de la Costa.',
    lineas: [
      { articulo: 'Albañilería', descripcion: 'Levante de fábrica de ladrillo en cerramientos', cantidad: '210', precioUd: '31', unidad: 'm2' },
      { articulo: 'Anticipo', descripcion: '', cantidad: '', precioUd: '', unidad: 'ud' }
    ].slice(0, 1),
    deducciones: [{ manual: true, descripcion: `Anticipo recibido (factura ${f(2)})`, importe: '1.200,00' }],
    iva: { tipo: 21, inversionSujetoPasivo: true } });

  await saveDocument('factura', { ...base(2), invoiceNumber: f(8), date: diasAtras(5), estado: 'pendiente', esProforma: true,
    descripcionTrabajo: 'PROFORMA — ampliación de terraza cubierta.',
    lineas: [{ articulo: 'Estructura', descripcion: 'Pérgola bioclimática 4x3 con cerramiento cortavientos', cantidad: '1', precioUd: '6800', unidad: 'ud' }],
    iva: { tipo: 21 } });

  // ---- PRESUPUESTOS ----
  const basePresu = (cliIdx) => ({
    documentType: 'Presupuesto', emisor: { ...EMISOR_DEMO }, cliente: { ...CLIENTES[cliIdx] },
    deducciones: [], observaciones: '', vencimientos: [], validez: '30 dias',
    condicionesComerciales: '- Validez: Este presupuesto tiene una validez de 30 dias desde su fecha de emision.\n\n- Forma de pago: 40% a la aceptacion, 60% a la finalizacion de los trabajos.\n\n- Los precios indicados no incluyen IVA salvo que se especifique lo contrario.\n\n- Aceptacion: La firma o aceptacion de este documento supone la conformidad con todas las condiciones aqui descritas.'
  });
  const p = (n) => `P-${year}-${String(n).padStart(3, '0')}`;

  await saveDocument('presupuesto', { ...basePresu(3), invoiceNumber: p(1), date: diasAtras(40), estado: 'aceptado',
    descripcionObra: 'Reforma de baño principal (aceptado y facturado).',
    plazoEjecucion: '2 semanas',
    lineas: [
      { articulo: 'Demolición', descripcion: 'Retirada de sanitarios y alicatado antiguo', cantidad: '1', precioUd: '480', unidad: 'ud' },
      { articulo: 'Alicatado', descripcion: 'Alicatado porcelánico 30x60', cantidad: '24', precioUd: '42', unidad: 'm2' }
    ], iva: { tipo: 21 } });

  await saveDocument('presupuesto', { ...basePresu(4), invoiceNumber: p(2), date: diasAtras(15), estado: 'pendiente',
    descripcionObra: 'Adecuación de local comercial para oficina inmobiliaria.',
    plazoEjecucion: '6 semanas',
    lineas: [
      { articulo: 'Distribución', descripcion: 'Tabiquería y falso techo desmontable', cantidad: '95', precioUd: '34', unidad: 'm2' },
      { articulo: 'Electricidad', descripcion: 'Instalación eléctrica completa con 24 puntos', cantidad: '1', precioUd: '3900', unidad: 'ud' },
      { articulo: 'Climatización', descripcion: 'Conductos y 2 splits de pared', cantidad: '1', precioUd: '2850', unidad: 'ud' }
    ], iva: { tipo: 21 } });

  await saveDocument('presupuesto', { ...basePresu(0), invoiceNumber: p(3), date: diasAtras(8), estado: 'pendiente',
    descripcionObra: 'Pintura de fachada posterior y patios.',
    plazoEjecucion: '3 semanas',
    lineas: [{ articulo: 'Pintura', descripcion: 'Pintura de fachada con revestimiento elástico antifisuras', cantidad: '320', precioUd: '18.50', unidad: 'm2' }],
    iva: { tipo: 21 } });

  await saveDocument('presupuesto', { ...basePresu(2), invoiceNumber: p(4), date: diasAtras(60), estado: 'rechazado',
    descripcionObra: 'Cerramiento de terraza (rechazado por licencia).',
    lineas: [{ articulo: 'Cerramiento', descripcion: 'Cerramiento de aluminio con rotura de puente térmico', cantidad: '12', precioUd: '385', unidad: 'm2' }],
    iva: { tipo: 21 } });

  // ---- EMISOR + FLAG DEMO ----
  await db.settings.put({ key: 'emisores', value: { list: [EMISOR_DEMO], active: 0 } });
  await db.settings.put({ key: 'emisor', value: EMISOR_DEMO });
  await db.settings.put({ key: 'demoMode', value: true });
}

export async function isDemoMode() {
  const s = await db.settings.get('demoMode');
  return !!s?.value;
}

// Borra TODO (documentos, clientes, empresas) y sale del modo demo
export async function clearDemoData() {
  await db.invoices.clear();
  await db.presupuestos.clear();
  await db.clientes.clear();
  await db.settings.delete('emisor');
  await db.settings.delete('emisores');
  await db.settings.delete('demoMode');
  Object.keys(localStorage).filter(k => k.startsWith('presufact-backup')).forEach(k => localStorage.removeItem(k));
}

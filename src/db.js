import Dexie from 'dexie';

export const db = new Dexie('FacturasDB');

db.version(1).stores({
  invoices: '++id, invoiceNumber, date, clientName, createdAt, updatedAt',
  settings: 'key'
});

db.version(2).stores({
  invoices: '++id, invoiceNumber, date, clientName, createdAt, updatedAt',
  settings: 'key'
}).upgrade(tx => {
  return tx.table('invoices').toCollection().modify(inv => {
    if (inv.lineas) inv.lineas = inv.lineas.map(l => ({ ...l, unidad: l.unidad || 'ud' }));
    if (inv.tiposIVA && !inv.iva) {
      const activeType = inv.tiposIVA.find(t => t.base || t.iva);
      const tipo = activeType ? parseFloat(String(activeType.tipo).replace(',', '.')) : 21;
      const isISP = (inv.observaciones || '').toLowerCase().includes('sujeto pasivo');
      inv.iva = { tipo, recargoEquivalencia: false, inversionSujetoPasivo: isISP };
      delete inv.tiposIVA;
    }
  });
});

db.version(3).stores({
  invoices: '++id, invoiceNumber, date, clientName, createdAt, updatedAt',
  presupuestos: '++id, invoiceNumber, date, clientName, createdAt, updatedAt',
  settings: 'key'
});

// ============ CONSTANTS ============

export const DOC_TYPES = {
  factura: {
    key: 'factura',
    table: 'invoices',
    label: 'Factura',
    labelPlural: 'Facturas',
    defaultNumber: '260030',
    numberPrefix: '',
    route: '/facturas',
    icon: 'FileText'
  },
  presupuesto: {
    key: 'presupuesto',
    table: 'presupuestos',
    label: 'Presupuesto',
    labelPlural: 'Presupuestos',
    defaultNumber: 'P-0001',
    numberPrefix: 'P-',
    route: '/presupuestos',
    icon: 'ClipboardList'
  }
};

export const DEFAULT_EMISOR = {
  nombre: '',
  subtitulo: '',
  nif: '',
  direccion: '',
  cp: '',
  ciudad: '',
  provincia: '',
  web: '',
  codigoBarras: '',
  iban: '',
  logo: null
};

export function getDefaultDocument(docType = 'factura', emisor) {
  const config = DOC_TYPES[docType] || DOC_TYPES.factura;
  const em = emisor || DEFAULT_EMISOR;
  const iban = em.iban || '';

  if (docType === 'presupuesto') {
    return {
      documentType: 'Presupuesto',
      invoiceNumber: '',
      page: '1',
      date: new Date().toISOString().split('T')[0],
      emisor: { ...em },
      cliente: { nombre: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', agente: '' },
      descripcionObra: '',
      lineas: [{ articulo: '', descripcion: '', cantidad: '', precioUd: '', dto: '', unidad: 'ud' }],
      iva: { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false },
      validez: '30 dias',
      plazoEjecucion: '',
      condiciones: '',
      condicionesComerciales: em.condicionesComerciales || `- Validez: Este presupuesto tiene una validez de 30 dias desde su fecha de emision.

- Forma de pago: A convenir entre las partes.

- Los precios indicados no incluyen IVA salvo que se especifique lo contrario.

- Aceptacion: La firma o aceptacion de este documento supone la conformidad con todas las condiciones aqui descritas.`,
      observaciones: iban ? `Numero de cuenta: ${iban}` : ''
    };
  }

  // Factura
  return {
    documentType: 'Factura',
    invoiceNumber: '',
    page: '1',
    date: new Date().toISOString().split('T')[0],
    emisor: { ...em },
    cliente: { nombre: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', agente: '' },
    formaPago: 'TRANSFERENCIA BANCARIA A LA RECEPCION DE LA FACTURA',
    descripcionTrabajo: '',
    lineas: [{ articulo: '', descripcion: '', cantidad: '', precioUd: '', dto: '', unidad: 'ud' }],
    iva: { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false },
    deducciones: [],
    observaciones: iban ? `TRANSFERENCIA BANCARIA A FECHA DE FACTURA\n${iban}` : '',
    vencimientos: [{ fecha: '', importe: '', domiciliacion: '', oficina: '', numeroCuenta: iban }]
  };
}

// Keep for backward compat
export const DEFAULT_INVOICE = getDefaultDocument('factura');

// ============ GENERIC CRUD ============

function getTable(docType) {
  const config = DOC_TYPES[docType];
  if (!config) throw new Error('Invalid docType: ' + docType);
  return db.table(config.table);
}

export async function getNextNumber(docType = 'factura') {
  const config = DOC_TYPES[docType];
  const table = getTable(docType);
  const last = await table.orderBy('invoiceNumber').reverse().first();
  if (!last) return config.defaultNumber;
  const numStr = (last.invoiceNumber || '').replace(config.numberPrefix, '');
  const next = parseInt(numStr) + 1;
  if (docType === 'presupuesto') {
    return config.numberPrefix + String(next).padStart(4, '0');
  }
  return next.toString();
}

// Fire auto-backup after any mutation (dynamic import avoids circular dependency)
function triggerAutoBackup() {
  import('./utils/backup').then(m => m.autoBackup()).catch(() => {});
}

export async function saveDocument(docType, doc) {
  const table = getTable(docType);
  const now = new Date().toISOString();
  let result;
  if (doc.id) {
    await table.update(doc.id, { ...doc, updatedAt: now });
    result = doc.id;
  } else {
    result = await table.add({ ...doc, clientName: doc.cliente?.nombre || '', createdAt: now, updatedAt: now });
  }
  triggerAutoBackup();
  return result;
}

export async function getDocument(docType, id) {
  return await getTable(docType).get(id);
}

export async function getAllDocuments(docType) {
  return await getTable(docType).orderBy('createdAt').reverse().toArray();
}

export async function deleteDocument(docType, id) {
  // Backup BEFORE deleting, so the deleted doc is recoverable from history
  try {
    const { autoBackup } = await import('./utils/backup');
    await autoBackup();
  } catch { /* ignore */ }
  const result = await getTable(docType).delete(id);
  triggerAutoBackup();
  return result;
}

export async function duplicateDocument(docType, id) {
  const table = getTable(docType);
  const original = await table.get(id);
  if (!original) return null;
  const { id: _, createdAt, updatedAt, ...data } = original;
  const nextNum = await getNextNumber(docType);
  const now = new Date().toISOString();
  const result = await table.add({
    ...data,
    invoiceNumber: nextNum,
    date: new Date().toISOString().split('T')[0],
    createdAt: now,
    updatedAt: now
  });
  triggerAutoBackup();
  return result;
}

export async function getDocumentCount(docType) {
  return await getTable(docType).count();
}

// Estados disponibles por tipo de documento
export const ESTADOS = {
  factura: [
    { key: 'pendiente', label: 'Pendiente', classes: 'bg-amber-100 text-amber-700' },
    { key: 'cobrada', label: 'Cobrada', classes: 'bg-green-100 text-green-700' }
  ],
  presupuesto: [
    { key: 'pendiente', label: 'Pendiente', classes: 'bg-amber-100 text-amber-700' },
    { key: 'aceptado', label: 'Aceptado', classes: 'bg-green-100 text-green-700' },
    { key: 'rechazado', label: 'Rechazado', classes: 'bg-red-100 text-red-600' }
  ]
};

// Cycle to the next estado for a document
export async function cycleEstado(docType, id) {
  const table = getTable(docType);
  const doc = await table.get(id);
  if (!doc) return null;
  const estados = ESTADOS[docType].map(e => e.key);
  const current = estados.indexOf(doc.estado || 'pendiente');
  const next = estados[(current + 1) % estados.length];
  await table.update(id, { estado: next, updatedAt: new Date().toISOString() });
  triggerAutoBackup();
  return next;
}

// ============ BACKWARD COMPAT ALIASES ============

export const getNextInvoiceNumber = () => getNextNumber('factura');
export const saveInvoice = (inv) => saveDocument('factura', inv);
export const getInvoice = (id) => getDocument('factura', id);
export const getAllInvoices = () => getAllDocuments('factura');
export const deleteInvoice = (id) => deleteDocument('factura', id);
export const duplicateInvoice = (id) => duplicateDocument('factura', id);

// ============ SETTINGS ============

export async function getEmisorSettings() {
  const s = await db.settings.get('emisor');
  return s ? { ...DEFAULT_EMISOR, ...s.value } : { ...DEFAULT_EMISOR };
}

export async function saveEmisorSettings(emisor) {
  await db.settings.put({ key: 'emisor', value: emisor });
}

// True once the user has configured their company name (first-run onboarding done)
export async function isOnboarded() {
  const s = await db.settings.get('emisor');
  return !!(s && s.value && s.value.nombre && s.value.nombre.trim());
}

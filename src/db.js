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

db.version(4).stores({
  invoices: '++id, invoiceNumber, date, clientName, createdAt, updatedAt',
  presupuestos: '++id, invoiceNumber, date, clientName, createdAt, updatedAt',
  clientes: '++id, nombre, nif',
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
  telefono: '',
  email: '',
  web: '',
  codigoBarras: '',
  iban: '',
  logo: null,
  colorMarca: '#1a365d' // color de acento de los PDF
};

export function getDefaultDocument(docType = 'factura', emisor) {
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
  const all = await table.toArray();
  if (all.length === 0) return config.defaultNumber;

  // Maximo NUMERICO del sufijo de cada numero (el orden lexicografico falla con
  // longitudes distintas, y numeros libres como "FA-2026-01" o "R-0001" no deben
  // producir jamas un "NaN"). Las rectificativas (serie R-) llevan contador propio.
  let max = 0;
  let maxRaw = null;
  for (const doc of all) {
    const raw = String(doc.invoiceNumber || '');
    if (/^R-/.test(raw)) continue; // serie de rectificativas: no avanza la serie normal
    const m = raw.match(/(\d+)\s*$/);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n > max) { max = n; maxRaw = { raw, digits: m[1] }; }
  }
  if (!maxRaw) return config.defaultNumber;

  const next = max + 1;
  // Conservar el formato del numero mas alto: prefijo + padding de ceros
  const prefix = maxRaw.raw.slice(0, maxRaw.raw.length - maxRaw.digits.length);
  const padded = String(next).padStart(maxRaw.digits.length, '0');
  return prefix + padded;
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
  // La libreta de clientes se alimenta sola de los documentos guardados
  try { await upsertClienteFromDoc(doc.cliente); } catch { /* nunca bloquear el guardado */ }
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

// ============ CLIENTES ============

export async function getClientes() {
  return await db.clientes.orderBy('nombre').toArray();
}

export async function saveCliente(cliente) {
  const now = new Date().toISOString();
  let result;
  if (cliente.id) {
    await db.clientes.update(cliente.id, { ...cliente, updatedAt: now });
    result = cliente.id;
  } else {
    result = await db.clientes.add({ ...cliente, createdAt: now, updatedAt: now });
  }
  triggerAutoBackup();
  return result;
}

export async function deleteCliente(id) {
  const result = await db.clientes.delete(id);
  triggerAutoBackup();
  return result;
}

// Alta/actualizacion silenciosa al guardar un documento: la libreta se
// mantiene sola. Solo completa campos vacios, nunca pisa datos editados.
export async function upsertClienteFromDoc(cliente) {
  const nombre = (cliente?.nombre || '').trim();
  if (!nombre) return;
  const existing = await db.clientes.where('nombre').equals(nombre).first();
  const CAMPOS = ['nif', 'direccion', 'cp', 'ciudad', 'provincia', 'email', 'telefono'];
  if (existing) {
    const patch = {};
    for (const k of CAMPOS) {
      if (cliente[k] && !existing[k]) patch[k] = cliente[k];
    }
    if (Object.keys(patch).length) await db.clientes.update(existing.id, patch);
  } else {
    const nuevo = { nombre, createdAt: new Date().toISOString() };
    for (const k of CAMPOS) nuevo[k] = cliente[k] || '';
    await db.clientes.add(nuevo);
  }
}

// Siembra inicial: construye la libreta desde los documentos ya guardados
export async function seedClientesFromDocs() {
  const [facturas, presupuestos] = await Promise.all([
    db.invoices.toArray(), db.presupuestos.toArray()
  ]);
  for (const doc of [...facturas, ...presupuestos]) {
    await upsertClienteFromDoc(doc.cliente);
  }
}

// Actualiza campos sueltos de un documento sin tocar el resto
export async function updateDocumentFields(docType, id, fields) {
  const result = await getTable(docType).update(id, { ...fields, updatedAt: new Date().toISOString() });
  triggerAutoBackup();
  return result;
}

// Estados disponibles por tipo de documento
// Estados alineados con el flujo del RD 238/2026 (aceptacion/rechazo y pago):
// el historial fechado queda registrado en cada documento (estadoHistorial).
export const ESTADOS = {
  factura: [
    { key: 'pendiente', label: 'Pendiente', classes: 'bg-amber-100 text-amber-700' },
    { key: 'enviada', label: 'Enviada', classes: 'bg-sky-100 text-sky-700' },
    { key: 'aceptada', label: 'Aceptada', classes: 'bg-blue-100 text-blue-700' },
    { key: 'cobrada', label: 'Cobrada', classes: 'bg-green-100 text-green-700' },
    { key: 'rechazada', label: 'Rechazada', classes: 'bg-red-100 text-red-600' }
  ],
  presupuesto: [
    { key: 'pendiente', label: 'Pendiente', classes: 'bg-amber-100 text-amber-700' },
    { key: 'aceptado', label: 'Aceptado', classes: 'bg-green-100 text-green-700' },
    { key: 'rechazado', label: 'Rechazado', classes: 'bg-red-100 text-red-600' }
  ]
};

// Una factura esta pendiente de cobro salvo que este cobrada o rechazada
export function isPendienteCobro(doc) {
  return !['cobrada', 'rechazada'].includes(doc?.estado || 'pendiente');
}

// Cycle to the next estado for a document (con historial fechado)
export async function cycleEstado(docType, id) {
  const table = getTable(docType);
  const doc = await table.get(id);
  if (!doc) return null;
  const estados = ESTADOS[docType].map(e => e.key);
  const current = estados.indexOf(doc.estado || 'pendiente');
  const next = estados[(current + 1) % estados.length];
  const now = new Date().toISOString();
  const historial = [...(doc.estadoHistorial || []), { estado: next, fecha: now }];
  await table.update(id, { estado: next, estadoHistorial: historial, updatedAt: now });
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

// Una sola empresa por instalacion (decision de producto: individualizar).
export async function getEmisorSettings() {
  const s = await db.settings.get('emisor');
  if (s?.value) return { ...DEFAULT_EMISOR, ...s.value };
  // migracion de vuelta desde el multi-empresa retirado: tomar la activa
  const multi = await db.settings.get('emisores');
  const activo = multi?.value?.list?.[multi.value.active || 0];
  if (activo) {
    await db.settings.put({ key: 'emisor', value: activo });
    return { ...DEFAULT_EMISOR, ...activo };
  }
  return { ...DEFAULT_EMISOR };
}

export async function saveEmisorSettings(emisor) {
  await db.settings.put({ key: 'emisor', value: emisor });
}

// True once the user has configured their company name (first-run onboarding done)
export async function isOnboarded() {
  const s = await db.settings.get('emisor');
  return !!(s && s.value && s.value.nombre && s.value.nombre.trim());
}

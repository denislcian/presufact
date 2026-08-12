export function formatNumber(num, decimals = 2) {
  if (num === '' || num === null || num === undefined || isNaN(num)) return '';
  return Number(num).toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function parseSpanishNumber(str) {
  if (str === null || str === undefined || str === '') return 0;
  const s = String(str).trim();
  if (!s) return 0;
  // If has comma: spanish format (dots are thousands separator)
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // No comma: could be plain number "16179.58" or thousand-formatted "16.179"
  // If single dot with 1-2 decimals: treat as decimal point (JS native)
  if (/^-?\d+\.\d{1,2}$/.test(s)) {
    return parseFloat(s) || 0;
  }
  // Otherwise: treat dots as thousand separators
  return parseFloat(s.replace(/\./g, '')) || 0;
}

export function calcLineTotal(linea) {
  const cantidad = parseFloat(linea.cantidad) || 0;
  const precio = parseFloat(linea.precioUd) || 0;
  const dto = parseFloat(linea.dto) || 0;
  const subtotal = cantidad * precio;
  const descuento = subtotal * (dto / 100);
  return subtotal - descuento;
}

export function calcLineSubtotal(linea) {
  const cantidad = parseFloat(linea.cantidad) || 0;
  const precio = parseFloat(linea.precioUd) || 0;
  return cantidad * precio;
}

export function calcInvoiceTotals(lineas) {
  let totalImporte = 0;
  let totalBase = 0;
  for (const linea of lineas) {
    totalImporte += calcLineTotal(linea);
    totalBase += calcLineTotal(linea);
  }
  return { totalImporte, totalBase };
}

export function formatDateES(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function parseDateES(dateStr) {
  if (!dateStr) return '';
  const [d, m, y] = dateStr.split('/');
  return `${y}-${m}-${d}`;
}

// Unit types for line items
export const UNIT_LABELS = { m2: 'm\u00B2', ml: 'ml', ud: 'ud', h: 'h', pack: 'pack' };
export const UNIT_OPTIONS = [
  { value: 'm2', label: 'm\u00B2' },
  { value: 'ml', label: 'ml' },
  { value: 'ud', label: 'ud' },
  { value: 'h', label: 'h' },
  { value: 'pack', label: 'pack' }
];

export function getUnitLabel(unidad) {
  return UNIT_LABELS[unidad] || 'ud';
}

// IVA and Recargo de Equivalencia rates
export const IVA_OPTIONS = [0, 4, 10, 21];
export const RE_RATES = { 21: 5.2, 10: 1.4, 4: 0.5, 0: 0 };
// IRPF (retencion) habitual en España: 15% general, 7% nuevos autonomos, 19% alquileres
export const IRPF_OPTIONS = [0, 1, 2, 7, 15, 19];

export function calcIVA(base, tipoIVA) {
  return base * (tipoIVA / 100);
}

export function calcRE(base, tipoIVA) {
  const reRate = RE_RATES[tipoIVA] || 0;
  return base * (reRate / 100);
}

export function calcInvoiceGrandTotal(lineas, iva) {
  const base = lineas.reduce((sum, l) => sum + calcLineTotal(l), 0);
  if (!iva || iva.inversionSujetoPasivo) return base;
  const ivaAmount = calcIVA(base, iva.tipo);
  const reAmount = iva.recargoEquivalencia ? calcRE(base, iva.tipo) : 0;
  return base + ivaAmount + reAmount;
}

export function calcDeduccionesTotal(deducciones) {
  if (!deducciones || !Array.isArray(deducciones)) return 0;
  return deducciones.reduce((sum, d) => {
    // New format: deduction has lineas with cantidad * precioUd
    if (d.lineas && Array.isArray(d.lineas)) {
      return sum + d.lineas.filter(l => l.incluir !== false).reduce((s, l) => s + ((parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUd) || 0)), 0);
    }
    // Manual / legacy format: flat importe (accept Spanish format "13.556,47")
    return sum + parseSpanishNumber(d.importe);
  }, 0);
}

// Tipo de IVA efectivo de una linea: el suyo propio si lo tiene, si no el global.
// Compatibilidad total: los documentos existentes no tienen l.iva y heredan el global.
export function lineIvaRate(linea, ivaConfig) {
  const own = linea?.iva;
  if (own !== undefined && own !== null && own !== '') {
    const n = parseFloat(own);
    if (Number.isFinite(n)) return n;
  }
  // Number.isFinite tambien descarta NaN (typeof NaN === 'number')
  return (ivaConfig && Number.isFinite(ivaConfig.tipo)) ? ivaConfig.tipo : 21;
}

export function calcInvoiceTaxBreakdown(lineas, iva, deducciones) {
  const ivaConfig = iva || { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
  const isISP = ivaConfig.inversionSujetoPasivo;
  const baseLineas = lineas.reduce((sum, l) => sum + calcLineTotal(l), 0);
  const totalDeducciones = calcDeduccionesTotal(deducciones);
  const base = baseLineas - totalDeducciones;

  // Desglose por tipo de IVA (obligatorio en factura cuando se mezclan tipos).
  // Las deducciones se aplican a la base del tipo global (el tipo "por defecto").
  const grupos = new Map(); // tipo -> base
  for (const l of lineas) {
    const rate = lineIvaRate(l, ivaConfig);
    grupos.set(rate, (grupos.get(rate) || 0) + calcLineTotal(l));
  }
  const defaultRate = Number.isFinite(ivaConfig.tipo) ? ivaConfig.tipo : 21;
  if (totalDeducciones !== 0) {
    grupos.set(defaultRate, (grupos.get(defaultRate) || 0) - totalDeducciones);
  }

  const porTipo = [...grupos.entries()]
    .filter(([, b]) => b !== 0)
    .sort((a, b) => b[0] - a[0])
    .map(([tipo, tipoBase]) => ({
      tipo,
      base: tipoBase,
      cuota: isISP ? 0 : calcIVA(tipoBase, tipo),
      reRate: RE_RATES[tipo] || 0,
      re: (!isISP && ivaConfig.recargoEquivalencia) ? calcRE(tipoBase, tipo) : 0
    }));

  const ivaAmount = porTipo.reduce((s, g) => s + g.cuota, 0);
  const reAmount = porTipo.reduce((s, g) => s + g.re, 0);
  // IRPF (retencion): se resta del total, sobre la base completa. Con base
  // negativa (rectificativas) la retencion tambien se invierte.
  const irpfRate = parseFloat(ivaConfig.irpf) || 0;
  const irpfAmount = base !== 0 ? base * (irpfRate / 100) : 0;
  const total = base + ivaAmount + reAmount - irpfAmount;

  // El tipo de recargo mostrado debe ser el REALMENTE aplicado: con un solo
  // grupo es el de ese grupo (que puede diferir del global si la linea fija
  // su propio IVA); con varios, los consumidores desglosan por grupo.
  const effectiveReRate = porTipo.length === 1 ? porTipo[0].reRate : (RE_RATES[defaultRate] || 0);

  return {
    baseLineas, totalDeducciones, base,
    porTipo, esMultiTipo: porTipo.length > 1,
    ivaRate: defaultRate, ivaAmount,
    reRate: effectiveReRate, reAmount,
    irpfRate, irpfAmount, hasIRPF: irpfRate > 0,
    isISP, hasRE: ivaConfig.recargoEquivalencia, total
  };
}

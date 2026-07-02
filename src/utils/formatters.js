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

export function calcInvoiceTaxBreakdown(lineas, iva, deducciones) {
  const baseLineas = lineas.reduce((sum, l) => sum + calcLineTotal(l), 0);
  const totalDeducciones = calcDeduccionesTotal(deducciones);
  const base = baseLineas - totalDeducciones;
  const ivaConfig = iva || { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
  const isISP = ivaConfig.inversionSujetoPasivo;
  const ivaAmount = isISP ? 0 : calcIVA(base, ivaConfig.tipo);
  const reAmount = (!isISP && ivaConfig.recargoEquivalencia) ? calcRE(base, ivaConfig.tipo) : 0;
  // IRPF (retencion): se resta del total. Habitual en autonomos que facturan a empresas.
  const irpfRate = parseFloat(ivaConfig.irpf) || 0;
  const irpfAmount = base > 0 ? base * (irpfRate / 100) : 0;
  const total = base + ivaAmount + reAmount - irpfAmount;
  return {
    baseLineas, totalDeducciones, base,
    ivaRate: ivaConfig.tipo, ivaAmount,
    reRate: RE_RATES[ivaConfig.tipo] || 0, reAmount,
    irpfRate, irpfAmount, hasIRPF: irpfRate > 0,
    isISP, hasRE: ivaConfig.recargoEquivalencia, total
  };
}

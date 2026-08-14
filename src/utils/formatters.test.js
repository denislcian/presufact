import { describe, it, expect } from 'vitest';
import { calcInvoiceTaxBreakdown, calcLineTotal, lineIvaRate, parseSpanishNumber } from './formatters';

// Bateria adversarial del motor fiscal: los casos que rompieron (o intentaron
// romper) el calculo durante el desarrollo, fijados como regresion.

describe('calcInvoiceTaxBreakdown', () => {
  it('factura simple al 21 %', () => {
    const t = calcInvoiceTaxBreakdown([{ cantidad: 1, precioUd: 1000 }], { tipo: 21 }, []);
    expect(t.base).toBeCloseTo(1000);
    expect(t.ivaAmount).toBeCloseTo(210);
    expect(t.total).toBeCloseTo(1210);
    expect(t.esMultiTipo).toBe(false);
  });

  it('la linea con IVA propio no hereda el tipo global', () => {
    const t = calcInvoiceTaxBreakdown([{ cantidad: 1, precioUd: 1000, iva: 10 }], { tipo: 21 }, []);
    expect(t.porTipo).toHaveLength(1);
    expect(t.porTipo[0].tipo).toBe(10);
    expect(t.ivaAmount).toBeCloseTo(100);
    expect(t.total).toBeCloseTo(1100);
  });

  it('multi-tipo: desglose por grupo ordenado de mayor a menor', () => {
    const t = calcInvoiceTaxBreakdown(
      [{ cantidad: 1, precioUd: 1000 }, { cantidad: 1, precioUd: 1000, iva: 10 }],
      { tipo: 21 }, []);
    expect(t.esMultiTipo).toBe(true);
    expect(t.porTipo.map(g => g.tipo)).toEqual([21, 10]);
    expect(t.ivaAmount).toBeCloseTo(310);
    expect(t.total).toBeCloseTo(2310);
  });

  it('recargo de equivalencia usa el tipo EFECTIVO del grupo, no el global', () => {
    // Global al 21 pero la unica linea va al 10: el RE correcto es 1,4 %, no 5,2 %
    const t = calcInvoiceTaxBreakdown(
      [{ cantidad: 1, precioUd: 1000, iva: 10 }],
      { tipo: 21, recargoEquivalencia: true }, []);
    expect(t.reRate).toBeCloseTo(1.4);
    expect(t.reAmount).toBeCloseTo(14);
    expect(t.total).toBeCloseTo(1114);
  });

  it('recargo de equivalencia multi-tipo: RE por cada grupo', () => {
    const t = calcInvoiceTaxBreakdown(
      [{ cantidad: 1, precioUd: 1000 }, { cantidad: 1, precioUd: 1000, iva: 10 }],
      { tipo: 21, recargoEquivalencia: true }, []);
    expect(t.reAmount).toBeCloseTo(52 + 14);
    expect(t.total).toBeCloseTo(2310 + 66);
  });

  it('las deducciones restan al grupo del tipo global y el IRPF va sobre la base completa', () => {
    const t = calcInvoiceTaxBreakdown(
      [{ cantidad: 1, precioUd: 500 }, { cantidad: 1, precioUd: 1000, iva: 10 }],
      { tipo: 21, irpf: 15 }, [{ manual: true, importe: '800' }]);
    expect(t.base).toBeCloseTo(700);
    const g21 = t.porTipo.find(g => g.tipo === 21);
    expect(g21.base).toBeCloseTo(-300);
    expect(t.ivaAmount).toBeCloseTo(100 - 63);
    expect(t.irpfAmount).toBeCloseTo(105);
    expect(t.total).toBeCloseTo(700 + 37 - 105);
  });

  it('rectificativa (base negativa): la retencion de IRPF se invierte con la base', () => {
    const t = calcInvoiceTaxBreakdown(
      [{ cantidad: 1, precioUd: 100 }],
      { tipo: 21, irpf: 15 }, [{ manual: true, importe: '500' }]);
    expect(t.base).toBeCloseTo(-400);
    expect(t.irpfAmount).toBeCloseTo(-60);
    expect(t.total).toBeCloseTo(-400 - 84 + 60);
  });

  it('inversion del sujeto pasivo: cuotas a cero tambien en multi-tipo', () => {
    const t = calcInvoiceTaxBreakdown(
      [{ cantidad: 1, precioUd: 1000 }, { cantidad: 1, precioUd: 500, iva: 4 }],
      { tipo: 21, inversionSujetoPasivo: true }, []);
    expect(t.isISP).toBe(true);
    expect(t.ivaAmount).toBe(0);
    expect(t.total).toBeCloseTo(1500);
  });

  it('linea exenta (0 %) mezclada con lineas al 21 %', () => {
    const t = calcInvoiceTaxBreakdown(
      [{ cantidad: 1, precioUd: 1000 }, { cantidad: 1, precioUd: 300, iva: 0 }],
      { tipo: 21 }, []);
    expect(t.porTipo.map(g => g.tipo)).toEqual([21, 0]);
    expect(t.ivaAmount).toBeCloseTo(210);
    expect(t.total).toBeCloseTo(1510);
  });

  it('IVA de linea como string "10" (dato de formulario) se interpreta bien', () => {
    const t = calcInvoiceTaxBreakdown([{ cantidad: 1, precioUd: 1000, iva: '10' }], { tipo: 21 }, []);
    expect(t.ivaAmount).toBeCloseTo(100);
  });

  it('IVA de linea invalido (NaN) cae al tipo global sin romper el total', () => {
    const t = calcInvoiceTaxBreakdown([{ cantidad: 1, precioUd: 1000, iva: 'abc' }], { tipo: 21 }, []);
    expect(Number.isFinite(t.total)).toBe(true);
    expect(t.ivaAmount).toBeCloseTo(210);
  });

  it('descuento por linea antes de impuestos', () => {
    const t = calcInvoiceTaxBreakdown([{ cantidad: 2, precioUd: 100, dto: 10 }], { tipo: 21 }, []);
    expect(t.base).toBeCloseTo(180);
    expect(t.total).toBeCloseTo(217.8);
  });
});

describe('utilidades', () => {
  it('calcLineTotal aplica cantidad, precio y descuento', () => {
    expect(calcLineTotal({ cantidad: 3, precioUd: 50, dto: 20 })).toBeCloseTo(120);
    expect(calcLineTotal({ cantidad: '', precioUd: '' })).toBe(0);
  });

  it('lineIvaRate: propio > global > 21 por defecto', () => {
    expect(lineIvaRate({ iva: 4 }, { tipo: 21 })).toBe(4);
    expect(lineIvaRate({}, { tipo: 10 })).toBe(10);
    expect(lineIvaRate({}, undefined)).toBe(21);
  });

  it('parseSpanishNumber entiende formato espanol e ingles', () => {
    expect(parseSpanishNumber('1.234,56')).toBeCloseTo(1234.56);
    expect(parseSpanishNumber('16179.58')).toBeCloseTo(16179.58);
    expect(parseSpanishNumber('16.179')).toBe(16179);
    expect(parseSpanishNumber('')).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { nextNumberFrom } from './numbering';

const Y = new Date().getFullYear();
const P = Y - 1;

describe('nextNumberFrom', () => {
  it('sin documentos devuelve el numero por defecto', () => {
    expect(nextNumberFrom([], '260030')).toBe('260030');
  });

  it('avanza la serie del ano en curso aunque el ano anterior tenga numeros mas altos', () => {
    // La semilla demo: 2025-0041/0042 y 2026-0001..0009 -> 2026-0010
    const docs = [
      { invoiceNumber: `${P}-0041`, date: `${P}-11-18` },
      { invoiceNumber: `${P}-0042`, date: `${P}-12-09` },
      ...Array.from({ length: 9 }, (_, i) => ({ invoiceNumber: `${Y}-${String(i + 1).padStart(4, '0')}`, date: `${Y}-0${Math.min(9, i + 1)}-10` })),
    ];
    expect(nextNumberFrom(docs, '260030')).toBe(`${Y}-0010`);
  });

  it('presupuestos: P-2026-006 -> P-2026-007', () => {
    const docs = Array.from({ length: 6 }, (_, i) => ({ invoiceNumber: `P-${Y}-${String(i + 1).padStart(3, '0')}`, date: `${Y}-08-0${i + 1}` }));
    expect(nextNumberFrom(docs, 'P-0001')).toBe(`P-${Y}-007`);
  });

  it('cada enero abre serie nueva con el ano en curso', () => {
    const docs = [{ invoiceNumber: `${P}-0120`, date: `${P}-12-30` }];
    expect(nextNumberFrom(docs, '260030')).toBe(`${Y}-0001`);
  });

  it('las rectificativas (R-) no avanzan la serie normal', () => {
    const docs = [{ invoiceNumber: '0007', date: `${Y}-03-01` }, { invoiceNumber: 'R-0009', date: `${Y}-03-02` }];
    expect(nextNumberFrom(docs, '0001')).toBe('0008');
  });

  it('conserva prefijo y padding libres y compara numericamente', () => {
    const docs = [{ invoiceNumber: 'FA-9', date: `${Y}-01-01` }, { invoiceNumber: 'FA-10', date: `${Y}-01-02` }];
    expect(nextNumberFrom(docs, 'FA-1')).toBe('FA-11');
  });

  it('numeros sin digitos no rompen', () => {
    expect(nextNumberFrom([{ invoiceNumber: 'BORRADOR', date: `${Y}-01-01` }], '0001')).toBe('0001');
  });
});

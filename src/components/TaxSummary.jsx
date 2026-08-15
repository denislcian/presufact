import { useState, useEffect } from 'react';
import { Download, Calculator, Info } from 'lucide-react';
import { getAllDocuments, isPendienteCobro } from '../db';
import { formatNumber, calcInvoiceTaxBreakdown } from '../utils/formatters';

// Resumen fiscal por trimestres (borrador orientativo para los modelos 303 / 130).
// Criterio de devengo: se agrupa por fecha de emisión de la factura.
export default function TaxSummary() {
  const [invoices, setInvoices] = useState([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllDocuments('factura').then(all => {
      setInvoices(all);
      // Si el año actual no tiene facturas pero otro si, seleccionarlo
      const years = [...new Set(all.map(i => (i.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
      if (years.length && !years.includes(String(new Date().getFullYear()))) setYear(years[0]);
      setLoading(false);
    });
  }, []);

  const years = [...new Set(invoices.map(i => (i.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  if (!years.includes(year) && years.length === 0) years.push(year);

  const ofYear = invoices.filter(i => (i.date || '').slice(0, 4) === year);

  const quarterOf = (inv) => Math.floor((parseInt((inv.date || '').slice(5, 7), 10) - 1) / 3); // 0..3

  const emptyRow = () => ({ count: 0, base: 0, iva: 0, re: 0, irpf: 0, total: 0, cobrado: 0, pendiente: 0 });
  const quarters = [emptyRow(), emptyRow(), emptyRow(), emptyRow()];

  for (const inv of ofYear) {
    const q = quarterOf(inv);
    if (q < 0 || q > 3 || isNaN(q)) continue;
    const tax = calcInvoiceTaxBreakdown(inv.lineas || [], inv.iva, inv.deducciones);
    const row = quarters[q];
    row.count += 1;
    row.base += tax.base;
    row.iva += tax.ivaAmount;
    row.re += tax.reAmount;
    row.irpf += tax.irpfAmount;
    row.total += tax.total;
    if ((inv.estado || 'pendiente') === 'cobrada') row.cobrado += tax.total;
    else if (isPendienteCobro(inv)) row.pendiente += tax.total;
  }

  const yearRow = quarters.reduce((acc, r) => ({
    count: acc.count + r.count, base: acc.base + r.base, iva: acc.iva + r.iva,
    re: acc.re + r.re, irpf: acc.irpf + r.irpf, total: acc.total + r.total,
    cobrado: acc.cobrado + r.cobrado, pendiente: acc.pendiente + r.pendiente
  }), emptyRow());

  const QUARTER_LABELS = ['1T (ene–mar)', '2T (abr–jun)', '3T (jul–sep)', '4T (oct–dic)'];
  const QUARTER_DEADLINES = ['1–20 abril', '1–20 julio', '1–20 octubre', '1–30 enero'];

  const handleExportCSV = () => {
    const sep = ';';
    const n = (v) => formatNumber(v); // formato es-ES para Excel espanol
    const rows = [
      ['Trimestre', 'Facturas', 'Base imponible', 'IVA repercutido', 'Recargo equivalencia', 'IRPF retenido', 'Total facturado', 'Cobrado', 'Pendiente'].join(sep),
      ...quarters.map((r, i) => [QUARTER_LABELS[i], r.count, n(r.base), n(r.iva), n(r.re), n(r.irpf), n(r.total), n(r.cobrado), n(r.pendiente)].join(sep)),
      ['TOTAL ' + year, yearRow.count, n(yearRow.base), n(yearRow.iva), n(yearRow.re), n(yearRow.irpf), n(yearRow.total), n(yearRow.cobrado), n(yearRow.pendiente)].join(sep)
    ];
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-fiscal-${year}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  const cell = 'px-4 py-3 text-right font-mono text-sm';

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Calculator size={22} className="text-accent" /> Resumen fiscal</h1>
          <p className="text-sm text-gray-500">Borrador orientativo por trimestres para tus modelos 303 (IVA) y 130 (IRPF)</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-white">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg transition text-sm font-medium">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      {ofYear.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No hay facturas emitidas en {year}. El resumen se calcula con la fecha de emisión de tus facturas.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Trimestre</th>
                  <th className="px-4 py-3 text-right">Facturas</th>
                  <th className="px-4 py-3 text-right">Base imponible</th>
                  <th className="px-4 py-3 text-right">IVA repercutido</th>
                  <th className="px-4 py-3 text-right">IRPF retenido</th>
                  <th className="px-4 py-3 text-right">Total facturado</th>
                  <th className="px-4 py-3 text-right">Pendiente de cobro</th>
                </tr>
              </thead>
              <tbody>
                {quarters.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{QUARTER_LABELS[i]}</div>
                      <div className="text-xs text-gray-400">se presenta: {QUARTER_DEADLINES[i]}</div>
                    </td>
                    <td className={cell}>{r.count || '—'}</td>
                    <td className={cell}>{r.count ? formatNumber(r.base) : '—'}</td>
                    <td className={cell + ' text-accent font-semibold'}>{r.count ? formatNumber(r.iva) : '—'}</td>
                    <td className={cell}>{r.count ? (r.irpf !== 0 ? formatNumber(-r.irpf) : '0,00') : '—'}</td>
                    <td className={cell + ' font-semibold'}>{r.count ? formatNumber(r.total) : '—'}</td>
                    <td className={cell + ' text-amber-600'}>{r.count && r.pendiente > 0 ? formatNumber(r.pendiente) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <td className="px-4 py-3 text-gray-800">TOTAL {year}</td>
                  <td className={cell}>{yearRow.count}</td>
                  <td className={cell}>{formatNumber(yearRow.base)}</td>
                  <td className={cell + ' text-accent'}>{formatNumber(yearRow.iva)}</td>
                  <td className={cell}>{yearRow.irpf !== 0 ? formatNumber(-yearRow.irpf) : '0,00'}</td>
                  <td className={cell}>{formatNumber(yearRow.total)}</td>
                  <td className={cell + ' text-amber-600'}>{yearRow.pendiente > 0 ? formatNumber(yearRow.pendiente) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {quarters.some(r => r.re > 0) && (
            <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
              Recargo de equivalencia del año: {formatNumber(yearRow.re)} € (incluido en el total facturado).
            </div>
          )}
        </div>
      )}

      <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-900">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium mb-1">Cómo usar este resumen</p>
          <p className="text-blue-800/90 leading-relaxed">
            <strong>Modelo 303 (IVA):</strong> la columna "IVA repercutido" es el IVA que has cobrado en tus facturas; a ese importe
            tu gestor le restará el IVA soportado de tus gastos. <strong>Modelo 130 (IRPF):</strong> la "Base imponible" son tus
            ingresos del trimestre y el "IRPF retenido" es lo que tus clientes ya han ingresado por ti a Hacienda.
            Se calcula por fecha de emisión (devengo). Es un borrador orientativo con los datos que has metido en Presufact:
            no sustituye a tu contabilidad ni a tu gestor.
          </p>
        </div>
      </div>
    </div>
  );
}

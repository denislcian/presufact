import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, Copy, Edit3, FileText, Download, Calendar, Euro, Upload, ArrowRightCircle, FileSpreadsheet, Clock } from 'lucide-react';
import ImportInvoice from './ImportInvoice';
import { getAllDocuments, deleteDocument, duplicateDocument, DOC_TYPES, getNextNumber, saveDocument, ESTADOS, cycleEstado } from '../db';
import { formatNumber, formatDateES, calcInvoiceTaxBreakdown } from '../utils/formatters';
import { generatePDF } from '../utils/pdfGenerator';

// Total real del documento: lineas - deducciones + IVA
function docTotal(inv) {
  const iva = inv.iva || { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
  return calcInvoiceTaxBreakdown(inv.lineas || [], iva, inv.deducciones).total;
}

function getEstado(docType, inv) {
  const list = ESTADOS[docType];
  return list.find(e => e.key === (inv.estado || 'pendiente')) || list[0];
}

export default function InvoiceList({ docType = 'factura' }) {
  const navigate = useNavigate();
  const config = DOC_TYPES[docType];
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const load = async () => {
    setLoading(true);
    const all = await getAllDocuments(docType);
    setInvoices(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Years present in the data
  const years = [...new Set(invoices.map(inv => (inv.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();

  const filtered = invoices.filter(inv => {
    if (yearFilter !== 'todos' && (inv.date || '').slice(0, 4) !== yearFilter) return false;
    const q = search.toLowerCase();
    return (
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.clientName || '').toLowerCase().includes(q) ||
      (inv.cliente?.nombre || '').toLowerCase().includes(q) ||
      (inv.date || '').includes(q)
    );
  });

  const handleDelete = async (id) => {
    await deleteDocument(docType, id);
    setConfirmDelete(null);
    load();
  };

  const handleDuplicate = async (id) => {
    await duplicateDocument(docType, id);
    load();
  };

  const handleDownloadPDF = (inv) => {
    generatePDF(inv);
  };

  const handleCycleEstado = async (id) => {
    await cycleEstado(docType, id);
    load();
  };

  const handleConvertToFactura = async (inv) => {
    const nextNum = await getNextNumber('factura');
    const { id: _, createdAt, updatedAt, ...data } = inv;
    const factura = {
      ...data,
      documentType: 'Factura',
      invoiceNumber: nextNum,
      date: new Date().toISOString().split('T')[0],
      formaPago: 'TRANSFERENCIA BANCARIA A LA RECEPCION DE LA FACTURA',
      descripcionTrabajo: data.descripcionObra || '',
      vencimientos: [{ fecha: '', importe: '', domiciliacion: '', oficina: '', numeroCuenta: '' }],
      deducciones: [],
      estado: 'pendiente'
    };
    delete factura.descripcionObra;
    delete factura.validez;
    delete factura.plazoEjecucion;
    delete factura.condiciones;
    delete factura.condicionesComerciales;
    const savedId = await saveDocument('factura', factura);
    navigate(`/facturas/editar/${savedId}`);
  };

  // CSV export of the filtered view (for the gestoria)
  const handleExportCSV = () => {
    const sep = ';'; // Excel-ES uses semicolon
    const esNum = (n) => formatNumber(n); // "1.234,56"
    const header = ['Numero', 'Fecha', 'Cliente', 'NIF', 'Base imponible', 'IVA %', 'Cuota IVA', 'Total', 'Estado'].join(sep);
    const rows = filtered.map(inv => {
      const iva = inv.iva || { tipo: 21 };
      const tax = calcInvoiceTaxBreakdown(inv.lineas || [], iva, inv.deducciones);
      return [
        inv.invoiceNumber || '',
        formatDateES(inv.date),
        `"${(inv.cliente?.nombre || inv.clientName || '').replace(/"/g, '""')}"`,
        inv.cliente?.nif || '',
        esNum(tax.base),
        tax.isISP ? 'ISP' : iva.tipo,
        esNum(tax.ivaAmount),
        esNum(tax.total),
        getEstado(docType, inv).label
      ].join(sep);
    });
    const csv = '﻿' + [header, ...rows].join('\r\n'); // BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.labelPlural.toLowerCase()}-${yearFilter === 'todos' ? 'todas' : yearFilter}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Stats over the filtered year
  const statsBase = yearFilter === 'todos' ? invoices : invoices.filter(inv => (inv.date || '').slice(0, 4) === yearFilter);
  const totalFacturado = statsBase.reduce((sum, inv) => sum + docTotal(inv), 0);
  const totalPendiente = docType === 'factura'
    ? statsBase.filter(inv => (inv.estado || 'pendiente') === 'pendiente').reduce((sum, inv) => sum + docTotal(inv), 0)
    : statsBase.filter(inv => (inv.estado || 'pendiente') === 'pendiente').reduce((sum, inv) => sum + docTotal(inv), 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{config.labelPlural}</h1>
          <p className="text-gray-500 mt-1">Gestiona y genera tus {config.labelPlural.toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm disabled:opacity-40"
            title="Exportar listado a CSV (Excel)">
            <FileSpreadsheet size={18} /> CSV
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm">
            <Upload size={18} /> Importar PDF
          </button>
          <button onClick={() => navigate(config.route + (docType === 'factura' ? '/nueva' : '/nuevo'))}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg transition font-medium shadow-sm">
            <Plus size={18} /> {docType === 'factura' ? 'Nueva Factura' : 'Nuevo Presupuesto'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText size={20} className="text-accent" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{statsBase.length}</div>
              <div className="text-sm text-gray-500">Total {config.labelPlural.toLowerCase()}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Euro size={20} className="text-green-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{formatNumber(totalFacturado)}</div>
              <div className="text-sm text-gray-500">{docType === 'factura' ? 'Total facturado' : 'Total presupuestado'}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Clock size={20} className="text-amber-600" /></div>
            <div>
              <div className="text-2xl font-bold text-amber-700">{formatNumber(totalPendiente)}</div>
              <div className="text-sm text-gray-500">{docType === 'factura' ? 'Pendiente de cobro' : 'Pendiente de respuesta'}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Calendar size={20} className="text-purple-600" /></div>
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {invoices.length > 0 ? formatDateES(invoices[0]?.date) : '-'}
              </div>
              <div className="text-sm text-gray-500">{docType === 'factura' ? 'Ultima factura' : 'Ultimo presupuesto'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Year filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none shadow-sm"
            placeholder="Buscar por numero, cliente o fecha..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        {years.length > 1 && (
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none shadow-sm">
            <option value="todos">Todos los años</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-lg">
              {search ? `No se encontraron ${config.labelPlural.toLowerCase()}` : `No hay ${config.labelPlural.toLowerCase()} todavia`}
            </p>
            {!search && (
              <button onClick={() => navigate(config.route + (docType === 'factura' ? '/nueva' : '/nuevo'))} className="mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition">
                Crear {config.label.toLowerCase()}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">N.o</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total (IVA inc.)</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const total = docTotal(inv);
                const estado = getEstado(docType, inv);
                return (
                  <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => navigate(`${config.route}/editar/${inv.id}`)}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-accent">#{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDateES(inv.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{inv.cliente?.nombre || inv.clientName || '-'}</div>
                      <div className="text-xs text-gray-400">{inv.cliente?.nif}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{formatNumber(total)} &euro;</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleCycleEstado(inv.id)}
                        className={`px-2.5 py-1 text-xs rounded-full font-medium transition hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 ${estado.classes}`}
                        title="Clic para cambiar estado">
                        {estado.label}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`${config.route}/editar/${inv.id}`)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition cursor-pointer" title="Editar">
                          <Edit3 size={16} className="text-gray-400 hover:text-accent" />
                        </button>
                        <button onClick={() => handleDownloadPDF(inv)}
                          className="p-2 hover:bg-green-50 rounded-lg transition cursor-pointer" title="Descargar PDF">
                          <Download size={16} className="text-gray-400 hover:text-green-600" />
                        </button>
                        <button onClick={() => handleDuplicate(inv.id)}
                          className="p-2 hover:bg-purple-50 rounded-lg transition cursor-pointer" title="Duplicar">
                          <Copy size={16} className="text-gray-400 hover:text-purple-600" />
                        </button>
                        {docType === 'presupuesto' && (
                          <button onClick={() => handleConvertToFactura(inv)}
                            className="p-2 hover:bg-green-50 rounded-lg transition cursor-pointer" title="Convertir a factura">
                            <ArrowRightCircle size={16} className="text-gray-400 hover:text-green-600" />
                          </button>
                        )}
                        <button onClick={() => setConfirmDelete(inv.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Eliminar">
                          <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Import modal */}
      {showImport && <ImportInvoice defaultDocType={docType} onClose={() => { setShowImport(false); load(); }} />}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Eliminar {config.label.toLowerCase()}</h3>
            <p className="text-sm text-gray-600 mb-4">Se hara un backup automatico antes de eliminar, pero la accion no se puede deshacer desde la interfaz.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

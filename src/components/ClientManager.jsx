import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Users, X, Save, FileText, Receipt, Upload } from 'lucide-react';
import { useRef } from 'react';
import { getClientes, saveCliente, deleteCliente, seedClientesFromDocs, getAllDocuments, upsertClienteFromDoc, isPendienteCobro } from '../db';
import { formatNumber, formatDateES, calcInvoiceTaxBreakdown } from '../utils/formatters';
import { parseClientesCSV } from '../utils/csvClientes';
import { toast } from './Toaster';

const EMPTY = { nombre: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', email: '', telefono: '' };

function docTotal(inv) {
  return calcInvoiceTaxBreakdown(inv.lineas || [], inv.iva, inv.deducciones).total;
}

// Libreta de clientes con estadisticas: facturado, cobrado, pendiente y
// todos los documentos de cada cliente. Se alimenta sola al facturar.
export default function ClientManager() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [stats, setStats] = useState({});
  const [docsByClient, setDocsByClient] = useState({});
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null); // cliente en ficha de detalle
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importPreview, setImportPreview] = useState(null); // { clientes, columnasDetectadas }
  const csvRef = useRef(null);

  // Migracion-refugio: CSV exportado de Billin, Contasimple, Holded, Excel...
  const handleCSVFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseClientesCSV(text);
      if (result.total === 0) { toast('No se han reconocido clientes en ese CSV', 'error'); return; }
      setImportPreview(result);
    } catch (err) {
      toast('No se pudo leer el archivo: ' + err.message, 'error');
    }
  };

  const confirmImport = async () => {
    let n = 0;
    for (const c of importPreview.clientes) {
      await upsertClienteFromDoc(c); // dedup por nombre, solo completa vacios
      n++;
    }
    setImportPreview(null);
    toast(`${n} cliente(s) importados a la libreta`);
    load();
  };

  const load = async () => {
    let list = await getClientes();
    if (list.length === 0) {
      await seedClientesFromDocs();
      list = await getClientes();
    }
    setClientes(list);

    const [facturas, presupuestos] = await Promise.all([
      getAllDocuments('factura'), getAllDocuments('presupuesto')
    ]);
    const s = {}, byClient = {};
    const touch = (n) => (s[n] = s[n] || { facturado: 0, cobrado: 0, pendiente: 0, nFact: 0, nPres: 0, ultima: '' });
    for (const d of facturas) {
      const n = (d.cliente?.nombre || d.clientName || '').trim();
      if (!n) continue;
      const st = touch(n);
      const total = docTotal(d);
      st.facturado += total;
      st.nFact += 1;
      if ((d.estado || 'pendiente') === 'cobrada') st.cobrado += total;
      else if (isPendienteCobro(d)) st.pendiente += total;
      if ((d.date || '') > st.ultima) st.ultima = d.date;
      (byClient[n] = byClient[n] || []).push({ ...d, _tipo: 'factura' });
    }
    for (const d of presupuestos) {
      const n = (d.cliente?.nombre || d.clientName || '').trim();
      if (!n) continue;
      touch(n).nPres += 1;
      (byClient[n] = byClient[n] || []).push({ ...d, _tipo: 'presupuesto' });
    }
    for (const arr of Object.values(byClient)) arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    setStats(s);
    setDocsByClient(byClient);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    return (c.nombre || '').toLowerCase().includes(q) || (c.nif || '').toLowerCase().includes(q) ||
      (c.ciudad || '').toLowerCase().includes(q) || (c.provincia || '').toLowerCase().includes(q);
  });

  const handleSave = async () => {
    if (!editing.nombre?.trim()) { toast('El nombre es obligatorio', 'error'); return; }
    await saveCliente(editing);
    toast(editing.id ? 'Cliente actualizado' : 'Cliente añadido');
    setEditing(null);
    load();
  };

  const handleDelete = async (c) => {
    await deleteCliente(c.id);
    toast('Cliente eliminado de la libreta');
    setConfirmDelete(null);
    setDetail(null);
    load();
  };

  // Nueva factura con el cliente ya puesto (InvoiceForm lee este prefill)
  const nuevaFacturaPara = (c) => {
    // con marca de tiempo: caduca solo (asi el doble montaje de React no lo pierde)
    sessionStorage.setItem('presufact-prefill-cliente', JSON.stringify({ c, t: Date.now() }));
    navigate('/facturas/nueva');
  };

  const st = (c) => stats[(c.nombre || '').trim()] || { facturado: 0, cobrado: 0, pendiente: 0, nFact: 0, nPres: 0, ultima: '' };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app')} className="p-2 hover:bg-gray-200 rounded-lg transition"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users size={22} className="text-accent" /> Clientes</h1>
            <p className="text-sm text-gray-500">Tu libreta con la actividad de cada cliente — clic en una fila para ver su ficha</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => csvRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm"
            title="Importa el CSV de clientes exportado de Billin, Contasimple, Holded o Excel">
            <Upload size={16} /> Importar CSV
          </button>
          <input ref={csvRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVFile} />
          <button onClick={() => setEditing({ ...EMPTY })}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg transition font-medium text-sm">
            <Plus size={16} /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input className={inputClass + ' pl-9'} placeholder="Buscar por nombre, NIF, ciudad o provincia..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          {clientes.length === 0
            ? 'Aún no hay clientes. Se añadirán solos al guardar facturas o presupuestos, o créalos a mano.'
            : 'Ningún cliente coincide con la búsqueda.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Ubicación</th>
                <th className="px-4 py-3 text-right">Facturado</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Pendiente</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Última factura</th>
                <th className="px-4 py-3 text-right">Docs</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const s = st(c);
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => setDetail(c)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{c.nombre}</div>
                      <div className="text-xs text-gray-400">{c.nif}{c.email ? ' · ' + c.email : ''}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                      {[c.ciudad, c.provincia].filter(Boolean).join(' · ')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{s.facturado ? formatNumber(s.facturado) + ' €' : '—'}</td>
                    <td className={`px-4 py-3 text-right font-mono hidden sm:table-cell ${s.pendiente > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                      {s.pendiente > 0 ? formatNumber(s.pendiente) + ' €' : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">{s.ultima ? formatDateES(s.ultima) : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{s.nFact + s.nPres || 0}</td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => nuevaFacturaPara(c)}
                          className="p-2 hover:bg-green-50 rounded-lg transition" title="Nueva factura para este cliente">
                          <Receipt size={15} className="text-gray-400 hover:text-green-600" />
                        </button>
                        <button onClick={() => setEditing({ ...EMPTY, ...c })}
                          className="p-2 hover:bg-blue-50 rounded-lg transition" title="Editar">
                          <Edit3 size={15} className="text-gray-400 hover:text-accent" />
                        </button>
                        <button onClick={() => setConfirmDelete(c)}
                          className="p-2 hover:bg-red-50 rounded-lg transition" title="Eliminar de la libreta">
                          <Trash2 size={15} className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ficha de detalle del cliente */}
      {detail && (() => {
        const s = st(detail);
        const docs = docsByClient[(detail.nombre || '').trim()] || [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{detail.nombre}</h2>
                  <p className="text-sm text-gray-500">
                    {[detail.nif, detail.email, detail.telefono].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {[detail.direccion, [detail.cp, detail.ciudad].filter(Boolean).join(' '), detail.provincia].filter(Boolean).join(', ')}
                  </p>
                </div>
                <button onClick={() => setDetail(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-gray-800 font-mono">{formatNumber(s.facturado)} €</div>
                  <div className="text-xs text-gray-500">Facturado</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-green-700 font-mono">{formatNumber(s.cobrado)} €</div>
                  <div className="text-xs text-gray-500">Cobrado</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-amber-700 font-mono">{formatNumber(s.pendiente)} €</div>
                  <div className="text-xs text-gray-500">Pendiente</div>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => nuevaFacturaPara(detail)}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-medium transition">
                  <Receipt size={14} /> Nueva factura
                </button>
                <button onClick={() => { setDetail(null); setEditing({ ...EMPTY, ...detail }); }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">
                  <Edit3 size={14} /> Editar datos
                </button>
              </div>

              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Documentos ({s.nFact} factura{s.nFact !== 1 ? 's' : ''}, {s.nPres} presupuesto{s.nPres !== 1 ? 's' : ''})
              </h3>
              {docs.length === 0 ? (
                <p className="text-sm text-gray-400">Sin documentos todavía.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {docs.map(d => (
                    <button key={d._tipo + d.id}
                      onClick={() => navigate(`/${d._tipo === 'factura' ? 'facturas' : 'presupuestos'}/editar/${d.id}`)}
                      className="w-full flex items-center gap-3 py-2.5 hover:bg-gray-50 transition text-left rounded-lg px-2">
                      <FileText size={15} className={d._tipo === 'factura' ? 'text-accent' : 'text-purple-500'} />
                      <span className="font-mono text-sm text-gray-700">#{d.invoiceNumber}</span>
                      <span className="text-xs text-gray-400">{formatDateES(d.date)}</span>
                      <span className="text-xs text-gray-400 capitalize">{d._tipo}</span>
                      <span className="ml-auto font-mono text-sm font-semibold">{formatNumber(docTotal(d))} €</span>
                      <span className="text-xs text-gray-400">{d.estado || 'pendiente'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal de alta / edicion */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{editing.id ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Nombre / Razón social *</label>
                <input className={inputClass} value={editing.nombre} onChange={e => setEditing(p => ({ ...p, nombre: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className={labelClass}>NIF</label>
                <input className={inputClass} value={editing.nif} onChange={e => setEditing(p => ({ ...p, nif: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input className={inputClass} value={editing.telefono} onChange={e => setEditing(p => ({ ...p, telefono: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Email</label>
                <input className={inputClass} type="email" value={editing.email} onChange={e => setEditing(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Dirección</label>
                <input className={inputClass} value={editing.direccion} onChange={e => setEditing(p => ({ ...p, direccion: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>CP</label>
                <input className={inputClass} value={editing.cp} onChange={e => setEditing(p => ({ ...p, cp: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input className={inputClass} value={editing.ciudad} onChange={e => setEditing(p => ({ ...p, ciudad: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Provincia</label>
                <input className={inputClass} value={editing.provincia} onChange={e => setEditing(p => ({ ...p, provincia: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">Cancelar</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-medium transition">
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista previa de importacion CSV */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setImportPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Importar {importPreview.total} cliente(s)</h2>
            <p className="text-sm text-gray-500 mb-3">
              Columnas reconocidas: <span className="font-mono text-xs">{importPreview.columnasDetectadas.join(', ')}</span>.
              Los que ya existan por nombre solo completarán sus campos vacíos.
            </p>
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64 overflow-y-auto mb-4">
              {importPreview.clientes.slice(0, 50).map((c, i) => (
                <div key={i} className="px-3 py-2 text-sm">
                  <span className="font-medium text-gray-800">{c.nombre}</span>
                  <span className="text-xs text-gray-400 ml-2">{[c.nif, c.email, c.ciudad].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
              {importPreview.total > 50 && (
                <div className="px-3 py-2 text-xs text-gray-400">... y {importPreview.total - 50} más</div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setImportPreview(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">Cancelar</button>
              <button onClick={confirmImport} className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-medium transition">
                Importar {importPreview.total} cliente(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmacion de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Eliminar cliente</h3>
            <p className="text-sm text-gray-600 mb-4">
              Se elimina <strong>{confirmDelete.nombre}</strong> de la libreta.
              {(st(confirmDelete).nFact + st(confirmDelete).nPres) > 0 && (
                <> Sus {st(confirmDelete).nFact + st(confirmDelete).nPres} documento(s) NO se tocan: siguen guardados con sus datos.</>
              )}
            </p>
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

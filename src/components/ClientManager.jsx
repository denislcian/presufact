import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit3, Trash2, Users, X, Save } from 'lucide-react';
import { getClientes, saveCliente, deleteCliente, seedClientesFromDocs, getAllDocuments } from '../db';
import { toast } from './Toaster';

const EMPTY = { nombre: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', email: '', telefono: '' };

// Libreta de clientes: alta, edicion y borrado. Se alimenta sola de los
// documentos guardados y alimenta el autocompletado del formulario.
export default function ClientManager() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [docCounts, setDocCounts] = useState({});
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | objeto cliente (EMPTY para alta)
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    // primera visita: sembrar la libreta desde los documentos existentes
    let list = await getClientes();
    if (list.length === 0) {
      await seedClientesFromDocs();
      list = await getClientes();
    }
    setClientes(list);
    // documentos por cliente (para mostrar actividad y avisar antes de borrar)
    const [facturas, presupuestos] = await Promise.all([
      getAllDocuments('factura'), getAllDocuments('presupuesto')
    ]);
    const counts = {};
    for (const d of [...facturas, ...presupuestos]) {
      const n = (d.cliente?.nombre || d.clientName || '').trim();
      if (n) counts[n] = (counts[n] || 0) + 1;
    }
    setDocCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    return (c.nombre || '').toLowerCase().includes(q) || (c.nif || '').toLowerCase().includes(q) || (c.ciudad || '').toLowerCase().includes(q);
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
    load();
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app')} className="p-2 hover:bg-gray-200 rounded-lg transition"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users size={22} className="text-accent" /> Clientes</h1>
            <p className="text-sm text-gray-500">Tu libreta: se rellena sola al facturar y alimenta el autocompletado</p>
          </div>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg transition font-medium text-sm">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input className={inputClass + ' pl-9'} placeholder="Buscar por nombre, NIF o ciudad..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          {clientes.length === 0
            ? 'Aún no hay clientes. Se añadirán solos al guardar facturas o presupuestos, o créalos a mano.'
            : 'Ningún cliente coincide con la búsqueda.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Contacto</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Ciudad</th>
                <th className="px-4 py-3 text-right">Docs</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{c.nombre}</div>
                    <div className="text-xs text-gray-400">{c.nif}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-600">
                    <div>{c.email}</div>
                    <div className="text-xs text-gray-400">{c.telefono}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">{c.ciudad}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{docCounts[(c.nombre || '').trim()] || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
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
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      {/* Confirmacion de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Eliminar cliente</h3>
            <p className="text-sm text-gray-600 mb-4">
              Se elimina <strong>{confirmDelete.nombre}</strong> de la libreta.
              {(docCounts[(confirmDelete.nombre || '').trim()] || 0) > 0 && (
                <> Sus {docCounts[(confirmDelete.nombre || '').trim()]} documento(s) NO se tocan: siguen guardados con sus datos.</>
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

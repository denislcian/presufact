import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ClipboardList, Settings, ArrowRight } from 'lucide-react';
import { getDocumentCount, getEmisorSettings } from '../db';

export default function HomePage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ facturas: 0, presupuestos: 0 });
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    Promise.all([
      getDocumentCount('factura'),
      getDocumentCount('presupuesto')
    ]).then(([f, p]) => setCounts({ facturas: f, presupuestos: p }));
    getEmisorSettings().then(em => setCompanyName(em?.nombre || ''));
  }, []);

  return (
    <div className="max-w-5xl mx-auto mt-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">{companyName || 'Presufact'}</h1>
        <p className="text-gray-500 text-lg">Presupuestos y facturas profesionales</p>
        <p className="text-xs text-gray-400 mt-2">Todos los datos se guardan en tu navegador. No se envia nada a ningun servidor.</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {/* Presupuestos */}
        <button onClick={() => navigate('/presupuestos')}
          className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-purple-300 transition-all duration-200 p-8 text-left">
          <div className="flex items-start justify-between mb-6">
            <div className="p-3 bg-purple-50 group-hover:bg-purple-100 rounded-xl transition">
              <ClipboardList size={28} className="text-purple-600" />
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Presupuestos</h2>
          <p className="text-gray-500 text-sm mb-4">Genera presupuestos detallados para tus clientes</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-purple-600">{counts.presupuestos}</span>
            <span className="text-sm text-gray-400">{counts.presupuestos === 1 ? 'presupuesto' : 'presupuestos'}</span>
          </div>
        </button>

        {/* Facturas */}
        <button onClick={() => navigate('/facturas')}
          className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-accent/30 transition-all duration-200 p-8 text-left">
          <div className="flex items-start justify-between mb-6">
            <div className="p-3 bg-blue-50 group-hover:bg-blue-100 rounded-xl transition">
              <FileText size={28} className="text-accent" />
            </div>
            <ArrowRight size={20} className="text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Facturas</h2>
          <p className="text-gray-500 text-sm mb-4">Crea, edita y gestiona tus facturas profesionales</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-accent">{counts.facturas}</span>
            <span className="text-sm text-gray-400">{counts.facturas === 1 ? 'factura' : 'facturas'}</span>
          </div>
        </button>
      </div>

      {/* Settings */}
      <div className="flex justify-center">
        <button onClick={() => navigate('/ajustes')}
          className="flex items-center gap-2 px-5 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition text-sm">
          <Settings size={16} /> Ajustes de empresa y copias de seguridad
        </button>
      </div>
    </div>
  );
}

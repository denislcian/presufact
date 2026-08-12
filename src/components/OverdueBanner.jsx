import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { getAllDocuments } from '../db';
import { formatNumber, calcInvoiceTaxBreakdown } from '../utils/formatters';

// Aviso al abrir la app: facturas pendientes con el primer vencimiento pasado.
// Se descarta por sesion de navegador (vuelve manana, no en cada click).
export default function OverdueBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (sessionStorage.getItem('presufact-overdue-dismissed')) return;
    getAllDocuments('factura').then(all => {
      const hoy = new Date().toISOString().split('T')[0];
      const vencidas = all.filter(inv =>
        (inv.estado || 'pendiente') === 'pendiente' &&
        inv.vencimientos?.[0]?.fecha && inv.vencimientos[0].fecha < hoy
      );
      if (vencidas.length === 0) return;
      const total = vencidas.reduce((s, inv) =>
        s + calcInvoiceTaxBreakdown(inv.lineas || [], inv.iva, inv.deducciones).total, 0);
      setInfo({ count: vencidas.length, total });
    }).catch(() => {});
  }, []);

  if (!info || location.pathname === '/facturas') return null;

  const dismiss = () => {
    sessionStorage.setItem('presufact-overdue-dismissed', '1');
    setInfo(null);
  };

  return (
    <div className="bg-red-50 border-b border-red-200">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
        <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
        <p className="text-red-800 flex-1">
          Tienes <strong>{info.count} factura{info.count > 1 ? 's' : ''} vencida{info.count > 1 ? 's' : ''}</strong> por
          un total de <strong>{formatNumber(info.total)} €</strong> pendiente de cobro.
        </p>
        <button onClick={() => { dismiss(); navigate('/facturas'); }}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition whitespace-nowrap">
          Ver facturas
        </button>
        <button onClick={dismiss} className="p-1 text-red-400 hover:text-red-600 transition" title="Ocultar por hoy">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

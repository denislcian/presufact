import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, X, CheckCircle } from 'lucide-react';
import { getDocumentCount } from '../db';
import { listRecoverySources, restoreFromLocalBackup } from '../utils/backup';

export default function RecoveryBanner() {
  const [sources, setSources] = useState([]);
  const [visible, setVisible] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    async function check() {
      if (sessionStorage.getItem('recovery-dismissed')) return;
      const [f, p] = await Promise.all([getDocumentCount('factura'), getDocumentCount('presupuesto')]);
      if (f + p > 0) return; // DB has data, nothing to recover
      const found = listRecoverySources();
      if (found.length > 0) {
        setSources(found);
        setVisible(true);
      }
    }
    check();
  }, []);

  if (!visible) return null;

  const handleRestore = async (key) => {
    setRestoring(true);
    try {
      const result = await restoreFromLocalBackup(key);
      setDone(`Recuperados ${result.imported} documentos`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setDone('Error: ' + e.message);
      setRestoring(false);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem('recovery-dismissed', '1');
    setVisible(false);
  };

  const best = sources[0];

  return (
    <div className="bg-amber-50 border-b-2 border-amber-300">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {done ? (
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle size={18} /> {done}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-amber-800">La base de datos esta vacia, pero hay un backup disponible</span>
                <span className="text-amber-700 ml-2">
                  ({best.count} documentos del {best.date ? new Date(best.date).toLocaleString('es-ES') : 'desconocido'})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleRestore(best.key)} disabled={restoring}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition disabled:opacity-50">
                <RotateCcw size={14} /> {restoring ? 'Recuperando...' : 'Recuperar ahora'}
              </button>
              <button onClick={dismiss} className="p-1.5 text-amber-500 hover:text-amber-700 transition">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

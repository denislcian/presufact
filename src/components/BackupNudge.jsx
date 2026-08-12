import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HardDrive, X } from 'lucide-react';
import { getDocumentCount } from '../db';
import { getBackupFolderName } from '../utils/backup';

const DISMISS_KEY = 'presufact-backup-nudge-dismissed';
const DISMISS_DAYS = 7;
const MIN_DOCS = 3;

// Aviso no intrusivo: si el usuario ya tiene varios documentos pero no ha
// configurado la carpeta de backup en disco, se le recuerda una vez por semana.
export default function BackupNudge() {
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const dismissed = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
        if (Date.now() - dismissed < DISMISS_DAYS * 24 * 3600 * 1000) return;
        const folder = await getBackupFolderName().catch(() => null);
        if (folder) return; // ya tiene backup en disco
        const count = (await getDocumentCount('factura')) + (await getDocumentCount('presupuesto'));
        if (count >= MIN_DOCS) setShow(true);
      } catch { /* nunca romper la app por el aviso */ }
    })();
  }, [location.pathname]);

  if (!show || location.pathname === '/ajustes') return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
        <HardDrive size={16} className="text-amber-600 flex-shrink-0" />
        <p className="text-amber-800 flex-1">
          Tus documentos solo están en este navegador. <strong>Configura una carpeta de backup</strong> para que
          se guarden también en tu disco y sobrevivan a limpiezas del navegador.
        </p>
        <button onClick={() => { dismiss(); navigate('/ajustes'); }}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition whitespace-nowrap">
          Configurar ahora
        </button>
        <button onClick={dismiss} className="p-1 text-amber-500 hover:text-amber-700 transition" title="Recordar en una semana">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

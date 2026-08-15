import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Inbox } from 'lucide-react';
import { isDemoMode, clearDemoData } from '../utils/demoData';

// Barra fija mientras la app muestra datos de ejemplo: deja claro que es una
// demo y ofrece empezar de cero con un clic.
export default function DemoBanner() {
  const [demo, setDemo] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    isDemoMode().then(setDemo).catch(() => {});
  }, []);

  if (!demo) return null;

  const handleClear = async () => {
    if (!window.confirm('¿Borrar todos los datos de ejemplo y empezar con tus datos reales?')) return;
    setClearing(true);
    await clearDemoData();
    window.location.href = '/app';
  };

  return (
    <div className="bg-violet-600 text-white">
      <div className="px-4 py-2 flex items-center gap-3 text-sm">
        <Sparkles size={15} className="flex-shrink-0" />
        <p className="flex-1">
          Estás viendo <strong>datos de ejemplo</strong> — explora la app libremente: nada de esto es real.
        </p>
        <Link to="/admin?demo=1" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition whitespace-nowrap">
          <Inbox size={13} /> Panel admin (demo)
        </Link>
        <button onClick={handleClear} disabled={clearing}
          className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition whitespace-nowrap disabled:opacity-50">
          {clearing ? 'Borrando...' : 'Borrar demo y empezar de cero'}
        </button>
      </div>
    </div>
  );
}

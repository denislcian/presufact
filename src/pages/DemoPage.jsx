import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, AlertTriangle, FileText } from 'lucide-react';
import { isOnboarded, getDocumentCount } from '../db';
import { isDemoMode, seedDemoData, clearDemoData } from '../utils/demoData';

// /demo: entra en la app con datos de ejemplo en un clic (para ensenarla desde
// la landing, LinkedIn, etc.). Si este navegador ya tiene datos reales, NUNCA
// los pisa sin preguntar.
export default function DemoPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando'); // cargando | conflicto | sembrando | error
  const [docs, setDocs] = useState(0);

  useEffect(() => {
    document.title = 'Demo · Presufact';
    let cancelado = false;
    (async () => {
      try {
        if (await isDemoMode()) { navigate('/app', { replace: true }); return; }
        const [onboarded, nF, nP] = await Promise.all([isOnboarded(), getDocumentCount('factura'), getDocumentCount('presupuesto')]);
        if (cancelado) return;
        if (onboarded || nF + nP > 0) { setDocs(nF + nP); setEstado('conflicto'); return; }
        setEstado('sembrando');
        await seedDemoData();
        navigate('/app', { replace: true });
      } catch (e) {
        console.error(e);
        if (!cancelado) setEstado('error');
      }
    })();
    return () => { cancelado = true; document.title = 'Presufact — Presupuestos y facturas en PDF gratis, sin registro'; };
  }, [navigate]);

  const reemplazar = async () => {
    if (!window.confirm('Se borrarán los datos guardados en este navegador (documentos, clientes, empresa y el historial de copias local; la carpeta de copias quedará desvinculada) y se cargará la demo. ¿Continuar?')) return;
    setEstado('sembrando');
    try {
      await clearDemoData();
      await seedDemoData();
      navigate('/app', { replace: true });
    } catch (e) {
      console.error(e);
      setEstado('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Presufact</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {(estado === 'cargando' || estado === 'sembrando') && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto mb-4" />
            <p className="text-gray-700 font-semibold flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-violet-600" /> Preparando la demo con datos de ejemplo…
            </p>
            <p className="text-sm text-gray-500 mt-1">Un segundo: estamos creando una empresa ficticia con sus presupuestos y facturas.</p>
          </div>
        )}

        {estado === 'conflicto' && (
          <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 shadow-sm p-7">
            <div className="flex items-start gap-3">
              <AlertTriangle size={22} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h1 className="text-lg font-bold text-gray-800">Este navegador ya tiene datos</h1>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  {docs === 0
                    ? 'Ya hay una empresa configurada en este dispositivo. La demo la sustituiría por una ficticia, así que mejor no tocarla sin tu permiso.'
                    : `Hay ${docs === 1 ? '1 documento guardado' : `${docs} documentos guardados`} en este dispositivo. La demo los sustituiría por datos ficticios, así que mejor no tocarlos sin tu permiso.`}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={() => navigate('/app')}
                className="w-full px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                Ir a mi app con mis datos <ArrowRight size={16} />
              </button>
              <button onClick={reemplazar}
                className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                Borrar mis datos y cargar la demo
              </button>
              <p className="text-xs text-gray-400 text-center mt-1">
                Si quieres conservarlos, descarga antes un backup en Ajustes.
              </p>
            </div>
          </div>
        )}

        {estado === 'error' && (
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-sm p-7 text-center">
            <h1 className="text-lg font-bold text-gray-800">No se pudo preparar la demo</h1>
            <p className="text-sm text-gray-600 mt-2">Puede que el navegador esté en modo privado o bloquee el almacenamiento local.</p>
            <button onClick={() => navigate('/')} className="mt-5 px-5 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
              Volver al inicio
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

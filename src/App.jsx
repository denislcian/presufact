import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import HomePage from './components/HomePage';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import EmisorSettings from './components/EmisorSettings';
import RecoveryBanner from './components/RecoveryBanner';
import Onboarding from './components/Onboarding';
import { isOnboarded, getEmisorSettings } from './db';

export default function App() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(true);
  const [emisor, setEmisor] = useState(null);

  const loadEmisor = async () => {
    const done = await isOnboarded();
    setOnboarded(done);
    if (done) setEmisor(await getEmisorSettings());
    setReady(true);
  };

  useEffect(() => { loadEmisor(); }, []);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
    </div>;
  }

  if (!onboarded) {
    return <Onboarding onDone={loadEmisor} />;
  }

  const companyName = emisor?.nombre || 'Facturalia';

  return (
    <div className="min-h-screen bg-gray-100">
      <RecoveryBanner />
      {/* Top nav bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition">
            {emisor?.logo ? (
              <img src={emisor.logo} alt="Logo" className="h-8 max-w-[140px] object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-800">{companyName}</span>
              </>
            )}
          </button>
          <span className="text-xs text-gray-400 ml-2 hidden sm:inline">Facturalia · gestor de facturas y presupuestos</span>
        </div>
      </nav>

      <main className="px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Facturas */}
          <Route path="/facturas" element={<InvoiceList docType="factura" />} />
          <Route path="/facturas/nueva" element={<InvoiceForm docType="factura" />} />
          <Route path="/facturas/editar/:id" element={<InvoiceForm docType="factura" />} />
          {/* Presupuestos */}
          <Route path="/presupuestos" element={<InvoiceList docType="presupuesto" />} />
          <Route path="/presupuestos/nuevo" element={<InvoiceForm docType="presupuesto" />} />
          <Route path="/presupuestos/editar/:id" element={<InvoiceForm docType="presupuesto" />} />
          {/* Ajustes */}
          <Route path="/ajustes" element={<EmisorSettings />} />
        </Routes>
      </main>

      {/* Footer legal */}
      <footer className="max-w-6xl mx-auto px-4 py-6 mt-4 text-center">
        <p className="text-xs text-gray-400">
          Facturalia genera documentos en formato borrador/proforma. Para facturación oficial verifica los
          requisitos vigentes (Verifactu / factura electrónica). Tus datos se guardan localmente en tu navegador.
        </p>
      </footer>
    </div>
  );
}

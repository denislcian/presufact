import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { FileText, Receipt, ClipboardList, Settings, Home } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import HomePage from './components/HomePage';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import EmisorSettings from './components/EmisorSettings';
import RecoveryBanner from './components/RecoveryBanner';
import InstallPrompt from './components/InstallPrompt';
import Onboarding from './components/Onboarding';
import { isOnboarded, getEmisorSettings } from './db';

// Layout for the application area (everything under /app, /facturas, etc.)
// Handles first-run onboarding and renders the app nav + footer around the routes.
function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [emisor, setEmisor] = useState(null);

  const loadEmisor = async () => {
    const done = await isOnboarded();
    setOnboarded(done);
    if (done) setEmisor(await getEmisorSettings());
    setReady(true);
  };

  // Recargar al cambiar de ruta para reflejar cambios hechos en Ajustes (nombre, logo)
  useEffect(() => { loadEmisor(); }, [location.pathname]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
    </div>;
  }

  if (!onboarded) {
    return <Onboarding onDone={loadEmisor} />;
  }

  const companyName = emisor?.nombre || 'Presufact';

  return (
    <div className="min-h-screen bg-gray-100">
      <RecoveryBanner />
      <InstallPrompt />
      {/* Top nav bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <button onClick={() => navigate('/app')} className="flex items-center gap-2 hover:opacity-80 transition mr-3">
            {emisor?.logo ? (
              <img src={emisor.logo} alt="Logo" className="h-8 max-w-[140px] object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-800 hidden sm:inline">{companyName}</span>
              </>
            )}
          </button>

          {[
            { to: '/app', label: 'Inicio', icon: Home, end: true },
            { to: '/facturas', label: 'Facturas', icon: Receipt },
            { to: '/presupuestos', label: 'Presupuestos', icon: ClipboardList },
          ].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-accent/10 text-accent font-semibold' : 'text-gray-600 hover:bg-gray-100'
                }`}>
              <Icon size={16} />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}

          <div className="ml-auto">
            <NavLink to="/ajustes"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-accent/10 text-accent font-semibold' : 'text-gray-600 hover:bg-gray-100'
                }`}
              title="Datos de tu empresa, logo y copias de seguridad">
              <Settings size={16} />
              <span className="hidden md:inline">Mi empresa</span>
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="px-4 py-6">
        <Outlet />
      </main>

      {/* Footer legal */}
      <footer className="max-w-6xl mx-auto px-4 py-6 mt-4 text-center">
        <p className="text-xs text-gray-400">
          Presufact genera presupuestos, proformas y borradores de factura en PDF (documentos no sujetos a Verifactu).
          Para tu facturación oficial, la obligación de software certificado Verifactu entra en vigor el 1/1/2027 (sociedades)
          y el 1/7/2027 (autónomos) — consulta con tu gestor. Tus datos se guardan localmente en tu dispositivo.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Application area (onboarding-gated) */}
      <Route element={<AppLayout />}>
        <Route path="/app" element={<HomePage />} />
        <Route path="/facturas" element={<InvoiceList docType="factura" />} />
        <Route path="/facturas/nueva" element={<InvoiceForm docType="factura" />} />
        <Route path="/facturas/editar/:id" element={<InvoiceForm docType="factura" />} />
        <Route path="/presupuestos" element={<InvoiceList docType="presupuesto" />} />
        <Route path="/presupuestos/nuevo" element={<InvoiceForm docType="presupuesto" />} />
        <Route path="/presupuestos/editar/:id" element={<InvoiceForm docType="presupuesto" />} />
        <Route path="/ajustes" element={<EmisorSettings />} />
      </Route>

      {/* Cualquier otra ruta vuelve a la landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

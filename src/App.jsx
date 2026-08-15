import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Outlet, Navigate, NavLink, useLocation, Link, useParams } from 'react-router-dom';
import { FileText, Receipt, ClipboardList, Settings, Home, Calculator, Users, PanelLeftClose, PanelLeftOpen, Menu, X, LifeBuoy } from 'lucide-react';
import ClientManager from './components/ClientManager';
import Toaster from './components/Toaster';
import DemoBanner from './components/DemoBanner';
import LandingPage from './pages/LandingPage';
import VerifactuPage from './pages/VerifactuPage';
import SeoLanding from './pages/SeoLanding';
import ComparativaPage from './pages/ComparativaPage';
import PrivacidadPage from './pages/PrivacidadPage';
import AyudaPage from './pages/AyudaPage';
import AdminPage from './pages/AdminPage';
import DemoPage from './pages/DemoPage';
import HomePage from './components/HomePage';
import InvoiceList from './components/InvoiceList';
import InvoiceForm from './components/InvoiceForm';
import EmisorSettings from './components/EmisorSettings';
import TaxSummary from './components/TaxSummary';
import RecoveryBanner from './components/RecoveryBanner';
import InstallPrompt from './components/InstallPrompt';
import BackupNudge from './components/BackupNudge';
import OverdueBanner from './components/OverdueBanner';
import Onboarding from './components/Onboarding';
import { isOnboarded, getEmisorSettings } from './db';

// El editor se monta de cero por cada (tipo, id): si React reutilizara la
// misma instancia al pasar de /facturas/nueva a /presupuestos/nuevo (o de un
// id a otro) arrastraria el borrador, la pestana y el estado del anterior.
function DocForm({ docType }) {
  const { id } = useParams();
  return <InvoiceForm key={`${docType}-${id || 'nuevo'}`} docType={docType} />;
}

// Layout for the application area (everything under /app, /facturas, etc.)
// Handles first-run onboarding and renders the app nav + footer around the routes.
function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [emisor, setEmisor] = useState(null);
  // Sidebar: colapsado (solo iconos) con preferencia recordada; cajon en movil
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('presufact-sidebar-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('presufact-sidebar-collapsed', prev ? '0' : '1');
      return !prev;
    });
  };

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

  const NAV = [
    { to: '/app', label: 'Inicio', icon: Home, end: true },
    { to: '/presupuestos', label: 'Presupuestos', icon: ClipboardList },
    { to: '/facturas', label: 'Facturas', icon: Receipt },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/impuestos', label: 'Impuestos', icon: Calculator },
  ];

  const navItem = ({ to, label, icon: Icon, end }, opts = {}) => (
    <NavLink key={to} to={to} end={end}
      onClick={opts.onClick}
      title={collapsed && !opts.forceLabel ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg text-sm transition ${
          collapsed && !opts.forceLabel ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
        } ${isActive ? 'bg-accent/10 text-accent font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Icon size={18} className="flex-shrink-0" />
      {(!collapsed || opts.forceLabel) && <span>{label}</span>}
    </NavLink>
  );

  const brand = (
    <button onClick={() => { navigate('/app'); setMobileOpen(false); }}
      className={`flex hover:opacity-80 transition w-full min-w-0 overflow-hidden ${
        collapsed ? 'items-center justify-center' : 'flex-col items-center gap-2 text-center'
      }`}
      title={companyName}>
      {emisor?.logo ? (
        <img src={emisor.logo} alt="Logo" className={`object-contain flex-shrink-0 ${collapsed ? 'h-8 w-8' : 'h-12 max-w-[180px]'}`} />
      ) : (
        <div className={`bg-accent rounded-lg flex items-center justify-center flex-shrink-0 ${collapsed ? 'w-8 h-8' : 'w-11 h-11'}`}>
          <FileText className={`text-white ${collapsed ? 'w-5 h-5' : 'w-6 h-6'}`} />
        </div>
      )}
      {!collapsed && (
        <span className={`font-bold text-gray-800 block min-w-0 leading-tight break-words w-full ${
          companyName.length <= 12 ? 'text-base' : companyName.length <= 22 ? 'text-[13px]' : 'text-xs'
        }`}
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {companyName}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* ===== Sidebar (escritorio): colapsable a solo iconos ===== */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 sticky top-0 h-screen transition-all duration-200 flex-shrink-0 ${collapsed ? 'w-[68px]' : 'w-60'}`}>
        <div className={`py-4 border-b border-gray-100 ${collapsed ? 'px-2 flex justify-center' : 'px-4'}`}>
          {brand}
        </div>
        <nav className={`flex-1 flex flex-col gap-1 py-4 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          {NAV.map(item => navItem(item))}
        </nav>
        <div className={`py-3 border-t border-gray-100 flex flex-col gap-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItem({ to: '/ajustes', label: 'Mi empresa', icon: Settings })}
          {navItem({ to: '/ayuda', label: 'Ayuda', icon: LifeBuoy })}
          <button onClick={toggleCollapsed}
            title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
            className={`flex items-center gap-3 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}`}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} className="flex-shrink-0" />}
            {!collapsed && <span>Ocultar menú</span>}
          </button>
        </div>
      </aside>

      {/* ===== Zona de contenido ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior solo en móvil: hamburguesa + marca */}
        <div className="md:hidden bg-white border-b border-gray-200 px-3 py-2.5 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setMobileOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg transition" title="Abrir menú">
            <Menu size={20} className="text-gray-700" />
          </button>
          {brand}
        </div>

        {/* Menú móvil: cajón lateral con fondo oscuro */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="relative bg-white w-64 h-full shadow-2xl flex flex-col">
              <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                {brand}
                <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <nav className="flex-1 flex flex-col gap-1 py-4 px-3 overflow-y-auto">
                {NAV.map(item => navItem(item, { onClick: () => setMobileOpen(false), forceLabel: true }))}
              </nav>
              <div className="py-3 px-3 border-t border-gray-100">
                {navItem({ to: '/ajustes', label: 'Mi empresa', icon: Settings }, { onClick: () => setMobileOpen(false), forceLabel: true })}
                {navItem({ to: '/ayuda', label: 'Ayuda', icon: LifeBuoy }, { onClick: () => setMobileOpen(false), forceLabel: true })}
              </div>
            </div>
          </div>
        )}

        <DemoBanner />
        <RecoveryBanner />
        <OverdueBanner />
        <BackupNudge />
        <InstallPrompt />
        <Toaster />

        <main className="px-4 py-6 flex-1">
          <Outlet />
        </main>

        {/* Footer legal */}
        <footer className="max-w-6xl mx-auto px-4 py-6 mt-4 text-center">
          <p className="text-xs text-gray-400">
            Presufact genera presupuestos, facturas proforma y borradores de factura en PDF (documentos no sujetos a Verifactu).
            La obligación de software certificado Verifactu para la facturación oficial entra en vigor el 1/1/2027 (sociedades)
            y el 1/7/2027 (autónomos) — <Link to="/verifactu" className="underline hover:text-gray-600">lee nuestra guía</Link> y
            consulta con tu gestor. Tus datos se guardan localmente en tu dispositivo.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/verifactu" element={<VerifactuPage />} />
      <Route path="/generador-de-facturas" element={<SeoLanding variant="facturas" />} />
      <Route path="/generador-de-presupuestos" element={<SeoLanding variant="presupuestos" />} />
      <Route path="/presupuesto-de-obra" element={<SeoLanding variant="obra" />} />
      <Route path="/presupuesto-reforma" element={<SeoLanding variant="reforma" />} />
      <Route path="/presupuesto-fontaneria" element={<SeoLanding variant="fontaneria" />} />
      <Route path="/presupuesto-electricista" element={<SeoLanding variant="electricista" />} />
      <Route path="/presupuesto-pintura" element={<SeoLanding variant="pintura" />} />
      <Route path="/comparativa" element={<ComparativaPage />} />
      <Route path="/privacidad" element={<PrivacidadPage />} />
      <Route path="/ayuda" element={<AyudaPage />} />
      {/* Demo con datos de ejemplo en un clic */}
      <Route path="/demo" element={<DemoPage />} />
      {/* Panel de administracion: sin enlaces publicos, noindex, protegido por token en el servidor */}
      <Route path="/admin" element={<AdminPage />} />

      {/* Application area (onboarding-gated) */}
      <Route element={<AppLayout />}>
        <Route path="/app" element={<HomePage />} />
        {/* key por tipo: la lista de facturas y la de presupuestos son instancias distintas */}
        <Route path="/facturas" element={<InvoiceList key="factura" docType="factura" />} />
        <Route path="/facturas/nueva" element={<DocForm docType="factura" />} />
        <Route path="/facturas/editar/:id" element={<DocForm docType="factura" />} />
        <Route path="/presupuestos" element={<InvoiceList key="presupuesto" docType="presupuesto" />} />
        <Route path="/presupuestos/nuevo" element={<DocForm docType="presupuesto" />} />
        <Route path="/presupuestos/editar/:id" element={<DocForm docType="presupuesto" />} />
        <Route path="/clientes" element={<ClientManager />} />
        <Route path="/impuestos" element={<TaxSummary />} />
        <Route path="/ajustes" element={<EmisorSettings />} />
      </Route>

      {/* Cualquier otra ruta vuelve a la landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

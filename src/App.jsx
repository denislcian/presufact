import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import VerifactuPage from './pages/VerifactuPage';
import SeoLanding from './pages/SeoLanding';
import ComparativaPage from './pages/ComparativaPage';
import PrivacidadPage from './pages/PrivacidadPage';
import AyudaPage from './pages/AyudaPage';

// Todo lo que no es la landing (la app con Dexie/jsPDF/pdf.js, el panel de
// admin y la demo) se carga en chunks diferidos: la landing solo trae lo suyo.
const AppLayout = lazy(() => import('./AppLayout'));
const HomePage = lazy(() => import('./components/HomePage'));
const InvoiceList = lazy(() => import('./components/InvoiceList'));
const InvoiceForm = lazy(() => import('./components/InvoiceForm'));
const ClientManager = lazy(() => import('./components/ClientManager'));
const TaxSummary = lazy(() => import('./components/TaxSummary'));
const EmisorSettings = lazy(() => import('./components/EmisorSettings'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const DemoPage = lazy(() => import('./pages/DemoPage'));

const Cargando = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
  </div>
);

// El editor se monta de cero por cada (tipo, id): si React reutilizara la
// misma instancia al pasar de /facturas/nueva a /presupuestos/nuevo (o de un
// id a otro) arrastraria el borrador, la pestana y el estado del anterior.
// (Solo por tipo: al guardar un documento nuevo la ruta pasa a /editar/:id y el
// editor debe conservar pestana y avisos; su efecto [id, docType] ya recarga.)
function DocForm({ docType }) {
  useParams(); // fuerza re-render al cambiar :id
  return <InvoiceForm key={docType} docType={docType} />;
}

export default function App() {
  return (
    <Suspense fallback={<Cargando />}>
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
    </Suspense>
  );
}

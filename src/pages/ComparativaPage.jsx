import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowRight, ArrowLeft, Check, X as XIcon } from 'lucide-react';

// Pagina SEO: alternativa gratuita a los programas de facturacion de pago.
// Ataca las busquedas "alternativa a Billin/Contasimple/FacturaDirecta gratis".
const FILAS = [
  ['Presupuestos', 'Ilimitados', 'De pago', 'Sí', 'Sí', 'No'],
  ['Firma del cliente en pantalla', 'Sí', 'No', 'No', 'No', 'No'],
  ['Facturas', 'Ilimitadas', '~12/año gratis', '3/mes gratis', 'Desde 6,6 €/mes', 'Sin límite'],
  ['Clientes', 'Ilimitados', 'Limitados', '10', 'Según plan', 'Sin libreta'],
  ['Tu logo y color', 'Sí', 'De pago', 'Limitado', 'Sí', 'No'],
  ['IVA multi-tipo + IRPF + R.E.', 'Sí', 'Sí', 'Sí', 'Sí', 'Parcial'],
  ['Resumen fiscal 303/130', 'Gratis', 'De pago', 'No', 'De pago', 'No'],
  ['Registro obligatorio', 'No', 'Sí', 'Sí', 'Sí', 'Cl@ve/certificado'],
  ['Funciona sin internet', 'Sí', 'No', 'No', 'No', 'No'],
  ['Tus datos', 'En tu dispositivo', 'En su nube', 'En su nube', 'En su nube', 'En la AEAT'],
  ['Exportarlo todo al irte', 'Siempre (archivos)', 'Con cuenta', 'Con cuenta', 'Con cuenta', 'No'],
  ['Precio', '0 € siempre', '0-11,95 €/mes', '0-19,90 €/mes', '6,6-20 €/mes', '0 €'],
];

export default function ComparativaPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Alternativa gratis a Billin, Contasimple y FacturaDirecta sin límites · Presufact';
    window.scrollTo(0, 0);
    return () => { document.title = 'Presufact — Presupuestos y facturas en PDF gratis, sin registro'; };
  }, []);

  const goApp = () => navigate('/app');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Presufact</span>
          </Link>
          <button onClick={goApp} className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
            Empezar gratis
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6">
          <ArrowLeft size={14} /> Volver a Presufact
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
          Alternativa gratuita a Billin, Contasimple y FacturaDirecta — sin límites ni letra pequeña
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Los planes "gratis" de los programas de facturación limitan facturas, clientes o funciones para empujarte
          al plan de pago. Presufact no puede ponerte límites aunque quisiera: no tiene servidores que pagar,
          porque funciona entero en tu dispositivo.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="px-3 py-3 text-left"></th>
                <th className="px-3 py-3 text-center text-accent">Presufact</th>
                <th className="px-3 py-3 text-center">Contasimple</th>
                <th className="px-3 py-3 text-center">FacturaDirecta</th>
                <th className="px-3 py-3 text-center">Billin</th>
                <th className="px-3 py-3 text-center">App AEAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FILAS.map((r, i) => (
                <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}>
                  <td className="px-3 py-2.5 font-medium text-gray-700">{r[0]}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-accent">{r[1]}</td>
                  {r.slice(2).map((c, j) => <td key={j} className="px-3 py-2.5 text-center text-gray-500">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Datos de los planes publicados por cada servicio (agosto 2026). Si algo ha cambiado, dínoslo y lo corregimos.
          Presufact genera las facturas en PDF como borrador/proforma (documentos no sujetos a
          Verifactu) — <Link to="/verifactu" className="text-accent underline hover:no-underline">lee la guía</Link>.
        </p>

        <div className="mt-12 space-y-6">
          <div>
            <h2 className="text-xl font-bold">¿Cómo puede ser gratis de verdad?</h2>
            <p className="mt-2 text-gray-600 leading-relaxed">
              Un programa de facturación en la nube paga servidores, soporte y marketing por cada usuario — por eso
              su plan gratis es un anzuelo con límites. Presufact funciona completo en tu navegador: tus datos se
              guardan en tu dispositivo (y en la carpeta o nube que tú elijas como copia), así que un usuario más
              no nos cuesta nada. No hay nada que cobrar ni datos que monetizar.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Compruébalo tú mismo</h2>
            <p className="mt-2 text-gray-600 leading-relaxed">
              Activa el modo avión y sigue facturando: todo funciona, porque nada viaja a ningún servidor.
              Esa es también la garantía de privacidad — los datos de tus clientes no pueden filtrarse de un
              servidor que no existe.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold">¿Y si algún día quiero irme?</h2>
            <p className="mt-2 text-gray-600 leading-relaxed">
              Te llevas todo, siempre: tus documentos viven en archivos tuyos (backup JSON completo, CSV para Excel,
              ZIP con todos los PDFs). Sin retenciones, sin pedir permiso, sin cuenta que cancelar. Cuando un
              servicio en la nube cierra — como le pasó a Moloni en diciembre de 2025 — sus usuarios tienen semanas
              para huir; aquí tus archivos ya están en tu disco.
            </p>
          </div>
        </div>

        <div className="mt-10 text-sm text-gray-500">
          <Link to="/generador-de-facturas" className="text-accent underline hover:no-underline">Generador de facturas gratis</Link>
          {' · '}
          <Link to="/generador-de-presupuestos" className="text-accent underline hover:no-underline">Generador de presupuestos</Link>
          {' · '}
          <Link to="/verifactu" className="text-accent underline hover:no-underline">Guía Verifactu 2027</Link>
        </div>

        <div className="mt-12 bg-primary rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-extrabold text-white">Pruébalo sin registrarte: tarda menos que leer esta página</h2>
          <button onClick={goApp}
            className="mt-5 px-7 py-3.5 bg-white text-primary rounded-xl font-bold hover:bg-blue-50 transition inline-flex items-center gap-2">
            Empezar gratis <ArrowRight size={18} />
          </button>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 mt-8">
        <p className="text-center text-xs text-gray-400 max-w-2xl mx-auto px-4">
          Presufact · generador gratuito de presupuestos y borradores de factura · tus datos se guardan localmente en tu dispositivo
        </p>
      </footer>
    </div>
  );
}

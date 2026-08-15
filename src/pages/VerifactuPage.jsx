import { setPageMeta, resetPageMeta } from '../utils/seo';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowRight, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

// Pagina informativa sobre Verifactu: responde la duda legal n.º 1 del publico
// objetivo y posiciona Presufact honestamente (presupuestos y borradores).
export default function VerifactuPage() {
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({ title: 'Verifactu para autónomos: fechas, obligaciones y cómo te afecta (2026-2027) · Presufact', description: 'Guía clara de Verifactu: qué es, desde cuándo es obligatorio (1/1/2027 sociedades, 1/7/2027 autónomos), qué documentos quedan fuera (presupuestos y proformas) y qué hacer.', path: '/verifactu' });
    window.scrollTo(0, 0);
    return () => { resetPageMeta(); };
  }, []);

  const goApp = () => navigate('/demo');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Presufact</span>
          </Link>
          <button onClick={goApp} className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
            Probar la demo
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6">
          <ArrowLeft size={14} /> Volver a Presufact
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
          Verifactu para autónomos: qué es, cuándo entra en vigor y cómo te afecta
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Guía en claro (actualizada a 2026) sobre el nuevo reglamento de software de facturación,
          las fechas reales tras la prórroga, y qué puedes seguir haciendo mientras tanto.
        </p>

        <div className="prose-sm mt-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¿Qué es Verifactu?</h2>
            <p>
              Verifactu es el nombre popular del <strong>Reglamento de Requisitos de los Sistemas Informáticos de
              Facturación</strong> (Real Decreto 1007/2023). Obliga a que los programas con los que se emiten facturas
              generen un registro por cada factura con huella digital encadenada, un código QR tributario y, opcionalmente,
              el envío automático de esos registros a la AEAT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Las fechas reales (tras la segunda prórroga)</h2>
            <div className="not-prose grid sm:grid-cols-2 gap-3 my-4">
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-2xl font-extrabold text-accent">1 · 1 · 2027</div>
                <div className="text-sm text-gray-600 mt-1">Empresas (sociedades) que usen software de facturación</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="text-2xl font-extrabold text-accent">1 · 7 · 2027</div>
                <div className="text-sm text-gray-600 mt-1">Autónomos y resto de obligados</div>
              </div>
            </div>
            <p>
              Estas fechas provienen del Real Decreto-ley 15/2025, que amplió los plazos originales (2026).
              Si lees por ahí "obligatorio en 2026", está desactualizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¿Puedo seguir facturando con Word o Excel?</h2>
            <p>
              La norma contempla una excepción para quien rellena una plantilla "a mano" sin automatismos (sin numeración
              automática ni base de datos de facturas). En la práctica es un terreno incómodo: sin numeración automática es
              fácil equivocarse, y un error de numeración sí puede traerte problemas. La recomendación general de las
              gestorías es tener el tema resuelto antes de tu fecha, no apurar la excepción.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¿Qué NO está sujeto a Verifactu?</h2>
            <div className="not-prose space-y-2 my-4">
              {[
                'Presupuestos: no son facturas, no generan obligación fiscal',
                'Facturas proforma y borradores: tampoco son facturas a efectos del reglamento',
                'Documentos internos de trabajo (mediciones, albaranes, hojas de encargo)'
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{t}</span>
                </div>
              ))}
            </div>
            <p>
              La propia AEAT lo ha confirmado en sus preguntas frecuentes: los documentos que no son factura
              (presupuestos, proformas, borradores) quedan fuera del reglamento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¿Dónde encaja Presufact?</h2>
            <p>
              Presufact es un generador de <strong>presupuestos, proformas y borradores de factura</strong> — documentos
              no sujetos a Verifactu — pensado para autónomos y pequeños negocios que necesitan documentos profesionales
              sin pagar una cuota mensual. Tus datos nunca salen de tu dispositivo.
            </p>
            <p className="mt-2">
              Para tu facturación oficial a partir de tu fecha de obligación, necesitarás un software certificado
              (o el facturador gratuito que la AEAT publicará). Mientras tanto, y para todo lo que no es factura,
              Presufact te cubre gratis y sin registro.
            </p>
            <div className="not-prose bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mt-4 text-sm">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800">
                Esta página es divulgativa, no es asesoramiento fiscal. Para tu caso concreto, consulta con tu gestor.
              </p>
            </div>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-primary rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-extrabold text-white">Haz tu primer presupuesto en 2 minutos</h2>
          <p className="text-blue-100 mt-2">Gratis, sin registro y sin subir tus datos a ninguna nube.</p>
          <button onClick={goApp}
            className="mt-5 px-7 py-3.5 bg-white text-primary rounded-xl font-bold hover:bg-blue-50 transition inline-flex items-center gap-2">
            Probar la demo <ArrowRight size={18} />
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

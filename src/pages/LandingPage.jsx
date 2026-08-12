import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, ClipboardList, ShieldCheck, Download, Zap, FolderSync,
  ArrowRight, Check, Lock, FileDown, CircleDollarSign, MonitorSmartphone
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const goApp = () => navigate('/app');

  const features = [
    { icon: FileText, title: 'Facturas en PDF', desc: 'Crea facturas con tu logo, IVA, retención de IRPF y descuentos. Descarga el PDF profesional al instante.' },
    { icon: ClipboardList, title: 'Presupuestos', desc: 'Genera presupuestos con condiciones, validez y firma. Conviértelos en factura con un clic.' },
    { icon: Lock, title: '100% privado', desc: 'Tus datos se guardan en tu dispositivo, nunca en la nube. Sin registro, sin email, sin rastreo.' },
    { icon: MonitorSmartphone, title: 'Instálala como app', desc: 'Tenla en tu escritorio o móvil como un programa. Funciona incluso sin conexión a internet.' },
    { icon: FileDown, title: 'Importa PDF', desc: 'Sube una factura antigua en PDF y la app extrae los datos para reutilizarlos automáticamente.' },
    { icon: CircleDollarSign, title: 'Control de cobros', desc: 'Marca facturas como cobradas o pendientes y mira de un vistazo cuánto dinero te deben.' },
  ];

  const steps = [
    { n: '1', title: 'Configura tu empresa', desc: 'Una sola vez: nombre, NIF, logo y cuenta. Tarda menos de un minuto.' },
    { n: '2', title: 'Crea factura o presupuesto', desc: 'Rellena el cliente y las líneas. La app calcula IVA, descuentos y totales por ti.' },
    { n: '3', title: 'Descarga el PDF', desc: 'Listo para enviar a tu cliente. Todo queda guardado en tu dispositivo.' },
  ];

  const faqs = [
    { q: '¿Es gratis?', a: 'Sí, completamente gratis y sin límites. No necesitas tarjeta ni registro.' },
    { q: '¿Dónde se guardan mis facturas?', a: 'En tu propio navegador/dispositivo. No subimos nada a ningún servidor. Puedes elegir además una carpeta de tu disco para copias de seguridad automáticas.' },
    { q: '¿Calcula IVA e IRPF?', a: 'Sí. IVA (0/4/10/21%), retención de IRPF (7%, 15%, 19%...), recargo de equivalencia e inversión del sujeto pasivo. Todo se calcula automáticamente.' },
    { q: '¿Y lo de Verifactu? ¿Puedo usar Presufact?', a: 'Presufact genera presupuestos, proformas y borradores de factura en PDF, documentos que NO están sujetos a Verifactu. La obligación de usar software certificado Verifactu para facturas oficiales entra en vigor el 1/1/2027 para sociedades y el 1/7/2027 para autónomos. Para tu facturación oficial consulta con tu gestor.' },
    { q: '¿Funciona sin internet?', a: 'Sí. Una vez abierta (o instalada como app), funciona sin conexión.' },
    { q: '¿Puedo poner mi logo?', a: 'Claro. Súbelo en la configuración y aparecerá en la cabecera de todas tus facturas y presupuestos.' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-800">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">Presufact</span>
          </div>
          <button onClick={goApp} className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
            Empezar gratis
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold mb-5">
          <ShieldCheck size={14} /> Gratis · Sin registro · 100% privado
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
          Haz facturas y presupuestos en PDF <span className="text-accent">gratis y sin registro</span>
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">
          Con IVA, IRPF y tu logo. Sin límites de documentos y sin subir tus datos a la nube: todo se guarda en tu dispositivo. Gratis para siempre.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={goApp} className="w-full sm:w-auto px-7 py-3.5 bg-accent hover:bg-accent-light text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-sm">
            Empezar gratis <ArrowRight size={18} />
          </button>
          <a href="#como-funciona" className="w-full sm:w-auto px-7 py-3.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition text-center">
            Ver cómo funciona
          </a>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Sin tarjeta</span>
          <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Sin email</span>
          <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Sin instalar nada (opcional)</span>
        </div>

        {/* Document mockup */}
        <div className="mt-14 max-w-3xl mx-auto">
          <div className="rounded-2xl border border-gray-200 shadow-xl overflow-hidden bg-white">
            <div className="h-9 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 px-4">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            </div>
            <div className="p-6 sm:p-8 text-left">
              {/* Espejo del PDF real: estilo "suizo editorial" */}
              <div className="h-1 bg-accent mb-5" />
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-extrabold text-gray-900">TU EMPRESA, S.L.</div>
                  <div className="text-[11px] text-gray-400 mt-1 leading-relaxed">NIF B12345678 · 600 000 000<br />Calle Mayor 1, 33001 Oviedo</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Factura</div>
                  <div className="text-2xl font-extrabold text-gray-900 leading-tight">2026-0042</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1.5">Fecha</div>
                  <div className="text-xs text-gray-800">02/07/2026</div>
                </div>
              </div>
              <div className="border-t-2 border-accent mt-4" />
              <div className="border-t border-gray-200 mt-[2px] mb-5" />

              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Facturar a</div>
              <div className="font-bold text-sm text-gray-900 mt-0.5">CLIENTE EJEMPLO S.L.</div>
              <div className="text-[11px] text-gray-500">NIF: B87654321</div>

              <div className="mt-6">
                <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-widest text-gray-400 pb-1.5">
                  <span className="col-span-2">Concepto</span><span className="text-right">Cantidad</span><span className="text-right">Precio</span><span className="text-right">Importe</span>
                </div>
                <div className="border-t-2 border-gray-900" />
                {[['Diseño de marca', '1,00 ud', '800,00', '800,00'], ['Desarrollo web', '1,00 ud', '1.500,00', '1.500,00'], ['Mantenimiento', '12,00 h', '50,00', '600,00']].map((r, i) => (
                  <div key={i} className="grid grid-cols-5 text-xs py-2.5 border-b border-gray-100">
                    <span className="col-span-2 font-semibold text-gray-800">{r[0]}</span>
                    <span className="text-right text-gray-600">{r[1]}</span>
                    <span className="text-right text-gray-600">{r[2]}</span>
                    <span className="text-right font-bold text-gray-900">{r[3]}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-5">
                <div className="w-64">
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>Base imponible</span><span className="text-gray-800">2.900,00</span></div>
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>IVA (21 %)</span><span className="text-gray-800">609,00</span></div>
                  <div className="border-t-2 border-accent mt-1.5 pt-2 flex justify-between items-baseline">
                    <span className="text-xs font-bold tracking-widest text-gray-900">TOTAL</span>
                    <span className="text-xl font-extrabold text-accent">3.509,00 €</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 mt-6 pt-2 flex justify-between text-[9px] text-gray-400">
                <span>TU EMPRESA, S.L. · NIF B12345678 · Calle Mayor 1, 33001 Oviedo</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Todo lo que necesitas para facturar</h2>
          <p className="text-center text-gray-500 mt-2">Simple, rápido y sin complicaciones.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition">
                <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-accent" />
                </div>
                <h3 className="font-bold text-lg">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Cómo funciona</h2>
          <p className="text-center text-gray-500 mt-2">De cero a tu primera factura en 3 pasos.</p>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{s.n}</div>
                <h3 className="font-bold text-lg">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldCheck size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-extrabold">Tus datos son solo tuyos</h2>
          <p className="mt-4 text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A diferencia de otras herramientas, Presufact <strong className="text-white">no guarda nada en la nube</strong>. Tus facturas, clientes y cuentas se quedan en tu dispositivo. Nosotros no los vemos, no los vendemos y no los perdemos.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-8 text-left">
            {[
              { icon: Lock, t: 'Sin servidor', d: 'Nada sale de tu navegador.' },
              { icon: FolderSync, t: 'Copias en tu disco o tu nube', d: 'Backup automático en la carpeta que elijas — también dentro de tu OneDrive, Drive o Dropbox.' },
              { icon: Zap, t: 'Sin registro', d: 'Empiezas a usarlo al instante.' },
            ].map((x, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <x.icon size={20} className="text-emerald-400 mb-2" />
                <div className="font-semibold">{x.t}</div>
                <div className="text-sm text-slate-400">{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Preguntas frecuentes</h2>
          <div className="mt-8 divide-y divide-gray-100">
            {faqs.map((f, i) => (
              <details key={i} className="group py-4">
                <summary className="flex items-center justify-between cursor-pointer font-semibold list-none">
                  {f.q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {f.a}
                  {/Verifactu/i.test(f.q) && (
                    <> <Link to="/verifactu" className="text-accent underline hover:no-underline">Lee nuestra guía completa sobre Verifactu</Link>.</>
                  )}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-accent py-16">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-extrabold">Empieza a facturar gratis hoy</h2>
          <p className="mt-3 text-blue-100">Sin registro. Sin tarjeta. Sin que tus datos salgan de tu dispositivo.</p>
          <button onClick={goApp} className="mt-7 px-8 py-3.5 bg-white text-accent rounded-xl font-bold hover:bg-blue-50 transition inline-flex items-center gap-2">
            Crear mi primera factura <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">Presufact</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs mb-3">
            <Link to="/generador-de-facturas" className="text-gray-500 hover:text-accent transition">Generador de facturas</Link>
            <Link to="/generador-de-presupuestos" className="text-gray-500 hover:text-accent transition">Generador de presupuestos</Link>
            <Link to="/verifactu" className="text-gray-500 hover:text-accent transition">Guía Verifactu</Link>
          </div>
          <p className="text-xs text-gray-400 max-w-2xl mx-auto">
            Presufact genera documentos en formato borrador/proforma. Para facturación oficial verifica los requisitos
            vigentes (Verifactu / factura electrónica). Tus datos se guardan localmente en tu dispositivo.
          </p>
        </div>
      </footer>
    </div>
  );
}

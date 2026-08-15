import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, ClipboardList, ShieldCheck, Zap, FolderSync,
  ArrowRight, Check, Lock, FileDown, CircleDollarSign, MonitorSmartphone, Sparkles
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const goApp = () => navigate('/app');

  const features = [
    { icon: ClipboardList, title: 'Presupuestos con firma', desc: 'Genera presupuestos con condiciones, validez y firma de aceptación del cliente en pantalla. Conviértelos en factura con un clic.' },
    { icon: FileText, title: 'Facturas en PDF', desc: 'Crea facturas con tu logo, IVA, retención de IRPF y descuentos. Descarga el PDF profesional al instante.' },
    { icon: Lock, title: '100% privado', desc: 'Tus datos se guardan en tu dispositivo, nunca en la nube. Sin registro, sin email, sin rastreo.' },
    { icon: MonitorSmartphone, title: 'Instálala como app', desc: 'Tenla en tu escritorio o móvil como un programa. Funciona incluso sin conexión a internet.' },
    { icon: FileDown, title: 'Importa PDF', desc: 'Sube una factura antigua en PDF y la app extrae los datos para reutilizarlos automáticamente.' },
    { icon: CircleDollarSign, title: 'Control de cobros', desc: 'Marca facturas como cobradas o pendientes y mira de un vistazo cuánto dinero te deben.' },
  ];

  const steps = [
    { n: '1', title: 'Configura tu empresa', desc: 'Una sola vez: nombre, NIF, logo y cuenta. Tarda menos de un minuto.' },
    { n: '2', title: 'Crea presupuesto o factura', desc: 'Rellena el cliente y las líneas. La app calcula IVA, descuentos y totales por ti.' },
    { n: '3', title: 'Descarga el PDF', desc: 'Listo para enviar a tu cliente. Todo queda guardado en tu dispositivo.' },
  ];

  const faqs = [
    { q: '¿Es gratis?', a: 'Sí, completamente gratis y sin límites. No necesitas tarjeta ni registro.' },
    { q: '¿Dónde se guardan mis facturas?', a: 'En tu propio navegador/dispositivo. No subimos nada a ningún servidor. Puedes elegir además una carpeta de tu disco para copias de seguridad automáticas.' },
    { q: '¿Calcula IVA e IRPF?', a: 'Sí. IVA (0/4/10/21%), retención de IRPF (7%, 15%, 19%...), recargo de equivalencia e inversión del sujeto pasivo. Todo se calcula automáticamente.' },
    { q: '¿Y lo de Verifactu? ¿Puedo usar Presufact?', a: 'Presufact genera presupuestos, proformas y borradores de factura en PDF, documentos que NO están sujetos a Verifactu. La obligación de usar software certificado Verifactu para facturas oficiales entra en vigor el 1/1/2027 para sociedades y el 1/7/2027 para autónomos. Para tu facturación oficial consulta con tu gestor.' },
    { q: '¿Funciona sin internet?', a: 'Sí. Una vez abierta (o instalada como app), funciona sin conexión.' },
    { q: '¿Puedo poner mi logo?', a: 'Claro. Súbelo en la configuración y aparecerá en la cabecera de todos tus presupuestos y facturas.' },
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
          Haz presupuestos y facturas en PDF <span className="text-accent">gratis y sin registro</span>
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">
          Presupuestos con firma de aceptación del cliente y facturas con IVA, IRPF y tu logo. Sin límites y sin subir tus datos a la nube: todo se guarda en tu dispositivo. Gratis para siempre.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={goApp} className="w-full sm:w-auto px-7 py-3.5 bg-accent hover:bg-accent-light text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-sm">
            Empezar gratis <ArrowRight size={18} />
          </button>
          <Link to="/demo" className="w-full sm:w-auto px-7 py-3.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-xl font-semibold transition flex items-center justify-center gap-2">
            <Sparkles size={17} /> Ver la demo con datos de ejemplo
          </Link>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          La demo carga una empresa ficticia con sus presupuestos y facturas para que explores todo sin rellenar nada.
          {' '}<a href="#como-funciona" className="underline hover:text-gray-700">Ver cómo funciona</a>.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Sin tarjeta</span>
          <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Sin email</span>
          <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Sin instalar nada (opcional)</span>
          <span className="flex items-center gap-1.5"><Check size={15} className="text-emerald-500" /> Funciona sin internet</span>
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
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Presupuesto</div>
                  <div className="text-2xl font-extrabold text-gray-900 leading-tight">P-2026-0018</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mt-1.5">Válido hasta</div>
                  <div className="text-xs text-gray-800">13/09/2026</div>
                </div>
              </div>
              <div className="border-t-2 border-accent mt-4" />
              <div className="border-t border-gray-200 mt-[2px] mb-5" />

              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Presupuesto para</div>
              <div className="font-bold text-sm text-gray-900 mt-0.5">CLIENTE EJEMPLO S.L.</div>
              <div className="text-[11px] text-gray-500">NIF: B87654321</div>

              <div className="mt-6">
                <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-widest text-gray-400 pb-1.5">
                  <span className="col-span-2">Concepto</span><span className="text-right">Cantidad</span><span className="text-right">Precio</span><span className="text-right">Importe</span>
                </div>
                <div className="border-t-2 border-gray-900" />
                {[['Reforma de baño completo', '1,00 ud', '2.400,00', '2.400,00'], ['Alicatado de paredes', '18,00 m²', '35,00', '630,00'], ['Instalación de grifería', '3,00 ud', '90,00', '270,00']].map((r, i) => (
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
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>Base imponible</span><span className="text-gray-800">3.300,00</span></div>
                  <div className="flex justify-between text-xs text-gray-500 py-1"><span>IVA (10 %)</span><span className="text-gray-800">330,00</span></div>
                  <div className="border-t-2 border-accent mt-1.5 pt-2 flex justify-between items-baseline">
                    <span className="text-xs font-bold tracking-widest text-gray-900">TOTAL</span>
                    <span className="text-xl font-extrabold text-accent">3.630,00 €</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 flex items-end justify-between gap-6">
                <div className="text-[9px] text-gray-400 leading-relaxed text-left">
                  Presupuesto válido 30 días.<br />Forma de pago: 50 % a la aceptación.
                </div>
                <div className="text-center flex-shrink-0">
                  <svg width="110" height="30" viewBox="0 0 110 30" className="mx-auto" aria-hidden="true">
                    <path d="M6 24 C 18 4, 28 28, 40 12 S 60 2, 68 18 S 88 28, 104 8" fill="none" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <div className="border-t border-gray-300 pt-1 px-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Conformidad · El cliente</div>
                </div>
              </div>
              <div className="border-t border-gray-200 mt-4 pt-2 flex justify-between text-[9px] text-gray-400">
                <span>TU EMPRESA, S.L. · NIF B12345678 · Calle Mayor 1, 33001 Oviedo</span>
                <span className="whitespace-nowrap flex-shrink-0 ml-3">Página 1 de 1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Todo lo que necesitas para presupuestar y facturar</h2>
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
          <p className="text-center text-gray-500 mt-2">De cero a tu primer presupuesto en 3 pasos.</p>
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
            A diferencia de otras herramientas, Presufact <strong className="text-white">no guarda nada en la nube</strong>. Tus facturas, clientes y cuentas se quedan en tu dispositivo. Nosotros no los vemos, no los vendemos y no los perdemos —
            <strong className="text-white"> no pueden filtrarse de un servidor que no existe</strong>.
          </p>
          <p className="mt-3 text-sm text-emerald-300">
            Compruébalo tú mismo: activa el modo avión y sigue facturando. Todo funciona.
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

      {/* COMPARATIVA: gratis sin trampa */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">"Gratis" sin letra pequeña</h2>
          <p className="text-center text-gray-500 mt-2">Los límites reales de los planes gratuitos, comparados.</p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <th className="px-4 py-3 text-left"></th>
                  <th className="px-4 py-3 text-center text-accent">Presufact</th>
                  <th className="px-4 py-3 text-center">Contasimple</th>
                  <th className="px-4 py-3 text-center">FacturaDirecta</th>
                  <th className="px-4 py-3 text-center">App AEAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Presupuestos y proformas', 'Sí', 'De pago', 'Sí', 'No'],
                  ['Firma del cliente en pantalla', 'Sí', 'No', 'No', 'No'],
                  ['Facturas al mes', 'Ilimitadas', '~12 al año', '3 al mes', 'Sin límite'],
                  ['Clientes guardados', 'Ilimitados', 'Limitados', '10', 'No tiene libreta'],
                  ['Tu logo y color en el PDF', 'Sí', 'De pago', 'Limitado', 'No'],
                  ['Exportar tus datos', 'Siempre, en tus archivos', 'Con cuenta', 'Con cuenta', 'No se pueden sacar'],
                  ['Registro / email', 'No hace falta', 'Obligatorio', 'Obligatorio', 'Cl@ve / certificado'],
                  ['Funciona sin internet', 'Sí, al 100%', 'No', 'No', 'No'],
                ].map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-gray-700">{r[0]}</td>
                    <td className="px-4 py-3 text-center font-semibold text-accent">{r[1]}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r[2]}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r[3]}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Datos de los planes gratuitos publicados por cada servicio (agosto 2026). Presufact puede ser ilimitado
            porque no tiene servidores que mantener: la app entera funciona en tu dispositivo — por eso también
            funciona en modo avión y nadie (ni nosotros) puede ver tus datos.{' '}
            <Link to="/comparativa" className="text-accent underline hover:no-underline">Ver la comparativa completa (incluye Billin)</Link>
          </p>
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
          <h2 className="text-3xl font-extrabold">Crea tu primer presupuesto gratis hoy</h2>
          <p className="mt-3 text-blue-100">Sin registro. Sin tarjeta. Sin que tus datos salgan de tu dispositivo.</p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={goApp} className="px-8 py-3.5 bg-white text-accent rounded-xl font-bold hover:bg-blue-50 transition inline-flex items-center gap-2">
              Crear mi primer presupuesto <ArrowRight size={18} />
            </button>
            <Link to="/demo" className="px-8 py-3.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl font-semibold transition inline-flex items-center gap-2">
              <Sparkles size={17} /> Probar la demo
            </Link>
          </div>
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
          <div className="flex items-center justify-center gap-4 text-xs mb-3 flex-wrap">
            <Link to="/generador-de-presupuestos" className="text-gray-500 hover:text-accent transition">Generador de presupuestos</Link>
            <Link to="/generador-de-facturas" className="text-gray-500 hover:text-accent transition">Generador de facturas</Link>
            <Link to="/comparativa" className="text-gray-500 hover:text-accent transition">Comparativa de precios</Link>
            <Link to="/verifactu" className="text-gray-500 hover:text-accent transition">Guía Verifactu</Link>
            <Link to="/ayuda" className="text-gray-500 hover:text-accent transition">Ayuda</Link>
            <Link to="/privacidad" className="text-gray-500 hover:text-accent transition">Privacidad</Link>
          </div>
          <p className="text-xs text-gray-500 max-w-2xl mx-auto">
            Presufact genera documentos en formato borrador/proforma. Para facturación oficial verifica los requisitos
            vigentes (Verifactu / factura electrónica). Tus datos se guardan localmente en tu dispositivo.
          </p>
        </div>
      </footer>
    </div>
  );
}

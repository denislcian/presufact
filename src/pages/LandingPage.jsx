import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { resetPageMeta } from '../utils/seo';
import { formatNumber } from '../utils/formatters';
import {
  FileText, ClipboardList, ShieldCheck, Zap, FolderSync,
  ArrowRight, Check, Lock, FileDown, CircleDollarSign, MonitorSmartphone, Sparkles,
  LifeBuoy, LayoutDashboard, Inbox, Activity, Globe
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  useEffect(() => { resetPageMeta(); window.scrollTo(0, 0); }, []);
  // La web es landing + demo: todas las llamadas a la accion entran en la demo
  const goApp = () => navigate('/demo');

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
          <button onClick={goApp} className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5">
            <Sparkles size={15} /> Probar la demo
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
          <Link to="/demo" className="w-full sm:w-auto px-7 py-3.5 bg-accent hover:bg-accent-light text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-sm">
            <Sparkles size={17} /> Ver la demo con datos de ejemplo <ArrowRight size={18} />
          </Link>
          <a href="#como-funciona" className="w-full sm:w-auto px-7 py-3.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition text-center">
            Ver cómo funciona
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          La demo carga una empresa ficticia con sus presupuestos, facturas y clientes: explora el cuadro de mando, firma un
          presupuesto, genera un PDF… sin rellenar nada y sin registro.
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
              {/* Espejo fiel del PDF real de presupuesto (pdfGenerator.js): misma
                  estructura, mismas etiquetas y mismo formato de numeros. */}
              <div className="h-[3px] bg-accent mb-4" />
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">TE</div>
                    <div className="leading-tight">
                      <div className="text-sm font-extrabold text-gray-900 tracking-tight">TU EMPRESA</div>
                      <div className="text-[9px] font-semibold text-accent">REFORMAS Y MANTENIMIENTO</div>
                    </div>
                  </div>
                  <div className="text-[13px] font-bold text-gray-900">TU EMPRESA, S.L.</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                    NIF B12345678 · 600 000 000<br />Calle Mayor 1<br />33001 Oviedo (Asturias)<br />hola@tuempresa.es · www.tuempresa.es
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Presupuesto</div>
                  <div className="text-2xl font-extrabold text-gray-900 leading-tight">P-2026-018</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400 mt-2">Fecha</div>
                  <div className="text-xs text-gray-800">14/08/2026</div>
                </div>
              </div>
              <div className="border-t-2 border-accent mt-4" />
              <div className="border-t border-gray-200 mt-[2px] mb-5" />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400">Presupuesto para</div>
                  <div className="font-bold text-[13px] text-gray-900 mt-0.5">MARÍA FERNÁNDEZ GARCÍA</div>
                  <div className="text-[11px] text-gray-800 leading-relaxed">C/ Uría 45, 3.º D<br />33202 Gijón<br />Asturias</div>
                  <div className="text-[11px] text-gray-500">NIF: 10887766Z</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400">Validez</div>
                  <div className="text-[11px] text-gray-800 mb-1.5">30 días</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400">Plazo de ejecución</div>
                  <div className="text-[11px] text-gray-800">2 semanas</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-400">Objeto del presupuesto</div>
                <div className="text-[11px] text-gray-800 mt-0.5">Reforma completa de baño principal.</div>
              </div>

              <div className="mt-6">
                <div className="grid grid-cols-12 text-[9px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.25em] text-gray-400 pb-1.5">
                  <span className="col-span-5">Concepto</span>
                  <span className="col-span-2 text-right"><span className="sm:hidden">Cant.</span><span className="hidden sm:inline">Cantidad</span></span>
                  <span className="col-span-2 text-right">Precio</span>
                  <span className="col-span-1 text-right">Dto.</span>
                  <span className="col-span-2 text-right">Importe</span>
                </div>
                <div className="border-t-2 border-gray-900" />
                {[
                  { a: 'Demolición', d: 'Retirada de sanitarios y alicatado antiguo', c: 1, u: 'ud', p: 480 },
                  { a: 'Alicatado', d: 'Alicatado porcelánico 30x60', c: 24, u: 'm²', p: 42 },
                  { a: 'Sanitarios', d: 'Plato de ducha, inodoro y lavabo, suministro y montaje', c: 1, u: 'ud', p: 1150 },
                ].map((r, i) => (
                  <div key={i} className="grid grid-cols-12 text-xs py-2.5 border-b border-gray-100 items-start">
                    <span className="col-span-5 pr-2">
                      <span className="block font-bold text-gray-900">{r.a}</span>
                      <span className="block text-[10px] text-gray-500 leading-snug">{r.d}</span>
                    </span>
                    <span className="col-span-2 text-right text-gray-800">{formatNumber(r.c)} <span className="text-[9px] text-gray-500">{r.u}</span></span>
                    <span className="col-span-2 text-right text-gray-800">{formatNumber(r.p)}</span>
                    <span className="col-span-1 text-right text-gray-400"></span>
                    <span className="col-span-2 text-right font-bold text-gray-900">{formatNumber(r.c * r.p)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <div className="w-64">
                  <div className="flex justify-between text-[11px] text-gray-500 py-1"><span>Base imponible</span><span className="text-gray-800">{formatNumber(2638)}</span></div>
                  <div className="flex justify-between text-[11px] text-gray-500 py-1"><span>IVA (10 %)</span><span className="text-gray-800">{formatNumber(263.8)}</span></div>
                  <div className="border-t-2 border-accent mt-1.5 pt-2 flex justify-between items-baseline">
                    <span className="text-[11px] font-bold tracking-[0.25em] text-gray-900">TOTAL</span>
                    <span className="text-xl font-extrabold text-accent">{formatNumber(2901.8)} €</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-900 border-b border-gray-200 pb-1 mb-2">Condiciones comerciales</div>
                <div className="text-[9px] text-gray-600 leading-relaxed space-y-0.5">
                  <p>- Validez: este presupuesto tiene una validez de 30 días desde su fecha de emisión.</p>
                  <p>- Forma de pago: 40 % a la aceptación, 60 % a la finalización de los trabajos.</p>
                  <p>- Los precios indicados no incluyen IVA salvo que se especifique lo contrario.</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-gray-900 border-b border-gray-200 pb-1">Conformidad</div>
                <div className="grid grid-cols-2 gap-10 mt-8">
                  <div className="text-center">
                    <div className="h-7" />
                    <div className="border-t border-gray-800 pt-1 text-[9px] text-gray-500">La empresa</div>
                  </div>
                  <div className="text-center">
                    <svg width="110" height="28" viewBox="0 0 110 30" className="mx-auto" aria-hidden="true">
                      <path d="M6 24 C 18 4, 28 28, 40 12 S 60 2, 68 18 S 88 28, 104 8" fill="none" stroke="#1e3a8a" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <div className="border-t border-gray-800 pt-1 text-[9px] text-gray-500">El cliente</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 mt-6 pt-2 flex justify-between text-[9px] text-gray-400">
                <span>TU EMPRESA, S.L. · NIF B12345678 · Calle Mayor 1, 33001 Oviedo · www.tuempresa.es</span>
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

      {/* POR DENTRO: dashboard, soporte y panel de admin */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Por dentro: cuadro de mando, soporte y administración</h2>
          <p className="text-center text-gray-500 mt-2 max-w-2xl mx-auto">
            No es solo un generador de PDF. La demo incluye todo lo que hace falta para operar el producto de verdad.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            <div className="rounded-2xl border border-gray-200 p-6 flex flex-col">
              <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center mb-4"><LayoutDashboard size={22} className="text-accent" /></div>
              <h3 className="font-bold text-lg">Cuadro de mando</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed flex-1">
                Facturación por mes, pendiente de cobro con vencidas, presupuestos abiertos, tasa de aceptación y los clientes que más facturan — calculado al instante sobre tus documentos, en tu dispositivo.
              </p>
              <Link to="/demo" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">Verlo en la demo <ArrowRight size={14} /></Link>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 flex flex-col">
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center mb-4"><LifeBuoy size={22} className="text-emerald-600" /></div>
              <h3 className="font-bold text-lg">Soporte integrado</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed flex-1">
                Ayuda con las dudas frecuentes y un formulario de tickets con buzón propio (serverless, con límite de envíos por IP). Es el único dato que sale de tu dispositivo, y solo si tú lo envías.
              </p>
              <Link to="/ayuda" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">Ver la ayuda y enviar un ticket <ArrowRight size={14} /></Link>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-6 flex flex-col">
              <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center mb-4"><Inbox size={22} className="text-violet-600" /></div>
              <h3 className="font-bold text-lg">Panel de administración</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed flex-1">
                Bandeja de tickets con tiempos de resolución, tráfico agregado del hosting y salud del servicio (disponibilidad, tests, vulnerabilidades). Protegido por token en el servidor; en la demo, abierto con cifras ficticias.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1"><Inbox size={12} /> Soporte</span>
                <span className="inline-flex items-center gap-1"><Globe size={12} /> Tráfico</span>
                <span className="inline-flex items-center gap-1"><Activity size={12} /> Salud</span>
              </div>
              <Link to="/admin?demo=1" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline">Abrir el panel (demo) <ArrowRight size={14} /></Link>
            </div>
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
            <Link to="/demo" className="px-8 py-3.5 bg-white text-accent rounded-xl font-bold hover:bg-blue-50 transition inline-flex items-center gap-2">
              <Sparkles size={17} /> Probar la demo <ArrowRight size={18} />
            </Link>
            <Link to="/admin?demo=1" className="px-8 py-3.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl font-semibold transition inline-flex items-center gap-2">
              <Inbox size={17} /> Ver el panel de admin
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
            <Link to="/admin?demo=1" className="text-gray-500 hover:text-accent transition">Panel admin (demo)</Link>
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

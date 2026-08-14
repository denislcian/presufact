import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowRight, Check, ArrowLeft } from 'lucide-react';

// Landing pilar SEO reutilizable: /generador-de-facturas y /generador-de-presupuestos.
// Mismo lenguaje visual que la landing principal, contenido orientado a la keyword.
const CONTENT = {
  facturas: {
    title: 'Generador de facturas gratis y sin registro (España) · Presufact',
    h1: 'Generador de facturas gratis, sin registro y sin límites',
    intro: 'Crea facturas profesionales en PDF con IVA, retención de IRPF y tu logo. Sin crear cuenta, sin límite de facturas al mes y sin subir tus datos a ninguna nube: todo se guarda en tu dispositivo.',
    bullets: [
      'Facturas ilimitadas — sin el límite de 3 al mes de otros "gratis"',
      'IVA 21/10/4/0 % (mezclables en la misma factura), IRPF y recargo de equivalencia',
      'Numeración automática, duplicar en un clic y facturas rectificativas',
      'Estados de cobro: pendiente, cobrada, vencida — sabes cuánto te deben',
      'Resumen fiscal por trimestres para los modelos 303 y 130',
      'Envío por email o WhatsApp con el PDF listo',
    ],
    faq: [
      { q: '¿De verdad es gratis sin límite de facturas?', a: 'Sí. Presufact no tiene planes de pago, ni límite mensual, ni funciones bloqueadas. Otros generadores "gratis" limitan a 3-5 facturas al mes; aquí no hay contador porque no hay servidor que pague nadie: la app funciona entera en tu navegador.' },
      { q: '¿Necesito registrarme o dar mi email?', a: 'No. Entras y facturas. Tus datos se guardan en tu propio dispositivo (y en la carpeta o nube que tú elijas como copia de seguridad), no en nuestros servidores.' },
      { q: '¿Sirve para autónomos en España?', a: 'Está pensado para eso: IVA español, retención de IRPF (7 %/15 %), recargo de equivalencia, inversión del sujeto pasivo, formato de números español y resumen trimestral para el 303/130.' },
      { q: '¿Y Verifactu? ¿Estas facturas valen?', a: 'Presufact genera las facturas en PDF como borrador/proforma, documentos no sujetos a Verifactu. Para la facturación oficial, la obligación de software certificado entra en vigor el 1/1/2027 (sociedades) y el 1/7/2027 (autónomos): consúltalo con tu gestor.' },
    ],
    cta: 'Crear mi primera factura',
    related: { to: '/generador-de-presupuestos', label: 'También: generador de presupuestos gratis' },
  },
  presupuestos: {
    title: 'Programa para hacer presupuestos gratis en PDF · Presufact',
    h1: 'Haz presupuestos profesionales gratis, en minutos',
    intro: 'Crea presupuestos en PDF con tu logo, condiciones comerciales y firma de aceptación. Cuando el cliente diga que sí, conviértelo en factura con un clic. Gratis, sin registro y con tus datos siempre en tu dispositivo.',
    bullets: [
      'Presupuestos ilimitados con validez, plazo de ejecución y condiciones',
      'Zona de firmas (empresa y cliente) para la aceptación',
      'Convertir presupuesto en factura con un clic — sin recopiar nada',
      'Estados: pendiente, aceptado, rechazado — controla tu embudo',
      'Con tu logo y tu color de marca en el PDF',
      'Los presupuestos no están sujetos a Verifactu: úsalo sin dudas legales',
    ],
    faq: [
      { q: '¿Puedo convertir el presupuesto en factura?', a: 'Sí, con un botón: se crea la factura con las mismas líneas y cliente, número de la serie de facturas y fecha del día, y el presupuesto queda marcado como aceptado y vinculado.' },
      { q: '¿Los presupuestos están sujetos a Verifactu?', a: 'No. Los presupuestos, proformas y borradores no son facturas y quedan fuera del reglamento Verifactu. Puedes leer nuestra guía completa sobre Verifactu para el detalle.' },
      { q: '¿Qué unidades puedo usar en las partidas?', a: 'm², metros lineales, unidades, horas y packs — pensado para obra, reformas, servicios y trabajos por horas.' },
    ],
    cta: 'Crear mi primer presupuesto',
    related: { to: '/generador-de-facturas', label: 'También: generador de facturas gratis' },
  },
};

// Landings long-tail por oficio: mismo esqueleto, contenido por gremio.
const OFICIOS = {
  obra: { kw: 'presupuesto de obra', nombre: 'obra y construcción', unidades: 'm², metros lineales y partidas de obra', ejemplo: 'demolición, albañilería, estructura, cerramientos y acabados' },
  reforma: { kw: 'presupuesto de reforma', nombre: 'reformas', unidades: 'm², unidades y horas', ejemplo: 'reforma de baño, cocina, pintura y suelos' },
  fontaneria: { kw: 'presupuesto de fontanería', nombre: 'fontanería', unidades: 'unidades, metros lineales y horas', ejemplo: 'sustitución de tuberías, sanitarios, calderas y grifería' },
  electricista: { kw: 'presupuesto de electricista', nombre: 'instalaciones eléctricas', unidades: 'puntos de luz, unidades y horas', ejemplo: 'cuadros eléctricos, puntos de luz, enchufes y boletines' },
  pintura: { kw: 'presupuesto de pintura', nombre: 'pintura', unidades: 'm² y horas', ejemplo: 'pintura lisa, gotelé, alisado de paredes y esmaltado' },
};

for (const [key, o] of Object.entries(OFICIOS)) {
  CONTENT[key] = {
    title: `${o.kw.charAt(0).toUpperCase() + o.kw.slice(1)} gratis en PDF: plantilla y generador · Presufact`,
    h1: `Haz tu ${o.kw} en PDF, gratis y en minutos`,
    intro: `Crea presupuestos profesionales de ${o.nombre} con tu logo, partidas en ${o.unidades}, condiciones comerciales y zona de firmas. Sin registro, sin límites y con tus datos siempre en tu dispositivo. Cuando te lo acepten, conviértelo en factura con un clic.`,
    bullets: [
      `Partidas con las unidades reales de tu oficio: ${o.unidades}`,
      `Pensado para trabajos de ${o.ejemplo}`,
      'Condiciones comerciales y validez del presupuesto incluidas en el PDF',
      'Zona de firmas para la aceptación del cliente',
      'Convertir a factura en un clic cuando te lo acepten',
      'Con tu logo y tu color de marca — sin marca de agua de terceros',
    ],
    faq: [
      { q: '¿Es de verdad gratis?', a: 'Sí: sin límite de presupuestos, sin registro y sin funciones de pago. La app funciona entera en tu navegador, por eso no hay cuota que cobrar.' },
      { q: `¿Puedo desglosar el ${o.kw} por partidas?`, a: `Sí: cada partida lleva concepto, cantidad (${o.unidades}), precio unitario, descuento opcional y su importe. Los totales, el IVA y la retención de IRPF se calculan solos.` },
      { q: '¿Los presupuestos están sujetos a Verifactu?', a: 'No. Los presupuestos no son facturas y quedan fuera del reglamento Verifactu.' },
    ],
    cta: 'Crear mi presupuesto gratis',
    related: { to: '/generador-de-presupuestos', label: 'Generador de presupuestos gratis' },
  };
}

export default function SeoLanding({ variant = 'facturas' }) {
  const navigate = useNavigate();
  const c = CONTENT[variant];

  useEffect(() => {
    document.title = c.title;
    window.scrollTo(0, 0);
    return () => { document.title = 'Presufact — Presupuestos y facturas en PDF gratis, sin registro'; };
  }, [variant]);

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

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6">
          <ArrowLeft size={14} /> Volver a Presufact
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">{c.h1}</h1>
        <p className="mt-4 text-lg text-gray-500">{c.intro}</p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button onClick={goApp} className="px-7 py-3.5 bg-accent hover:bg-accent-light text-white rounded-xl font-semibold transition flex items-center justify-center gap-2">
            {c.cta} <ArrowRight size={18} />
          </button>
        </div>

        <div className="mt-10 space-y-3">
          {c.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-3">
              <Check size={19} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{b}</span>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-extrabold">Preguntas frecuentes</h2>
          <div className="mt-4 divide-y divide-gray-100">
            {c.faq.map((f, i) => (
              <details key={i} className="group py-4">
                <summary className="flex items-center justify-between cursor-pointer font-semibold list-none">
                  {f.q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {f.a}
                  {/Verifactu/i.test(f.q) && <> <Link to="/verifactu" className="text-accent underline hover:no-underline">Guía Verifactu</Link>.</>}
                </p>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-10 text-sm space-y-2">
          <div>
            <Link to={c.related.to} className="text-accent underline hover:no-underline">{c.related.label}</Link>
            {' · '}
            <Link to="/verifactu" className="text-accent underline hover:no-underline">Guía Verifactu 2027</Link>
          </div>
          <div className="text-gray-500">
            Presupuestos por oficio:{' '}
            {[['/presupuesto-de-obra', 'obra'], ['/presupuesto-reforma', 'reforma'], ['/presupuesto-fontaneria', 'fontanería'], ['/presupuesto-electricista', 'electricista'], ['/presupuesto-pintura', 'pintura']].map(([to, label], i) => (
              <span key={to}>{i > 0 && ' · '}<Link to={to} className="hover:text-accent underline">{label}</Link></span>
            ))}
          </div>
        </div>

        <div className="mt-12 bg-primary rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-extrabold text-white">Gratis, sin registro, sin sorpresas</h2>
          <p className="text-blue-100 mt-2">Tus datos nunca salen de tu dispositivo.</p>
          <button onClick={goApp}
            className="mt-5 px-7 py-3.5 bg-white text-primary rounded-xl font-bold hover:bg-blue-50 transition inline-flex items-center gap-2">
            {c.cta} <ArrowRight size={18} />
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

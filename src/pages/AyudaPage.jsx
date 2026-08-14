import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowLeft, LifeBuoy, Bug, ExternalLink, Send, CheckCircle } from 'lucide-react';

// Formulario de ticket: envia al buzon propio (/api/tickets). Si el buzon no
// esta configurado o falla, se muestra el canal alternativo (GitHub).
function TicketForm() {
  const [form, setForm] = useState({ asunto: '', email: '', mensaje: '' });
  const [estado, setEstado] = useState('idle'); // idle | enviando | ok | error | sinBuzon
  const [errorMsg, setErrorMsg] = useState('');

  const enviar = async () => {
    if (form.asunto.trim().length < 3 || form.mensaje.trim().length < 10) {
      setErrorMsg('Escribe un asunto y cuéntanos el problema con algo de detalle.');
      setEstado('error');
      return;
    }
    setEstado('enviando');
    setErrorMsg('');
    try {
      const r = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (r.status === 503) { setEstado('sinBuzon'); return; }
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setErrorMsg(data.error || 'No se pudo enviar.'); setEstado('error'); return; }
      setEstado('ok');
      setForm({ asunto: '', email: '', mensaje: '' });
    } catch {
      setEstado('sinBuzon');
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition";

  if (estado === 'ok') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
        <p className="font-semibold text-emerald-800">Ticket enviado — ¡gracias!</p>
        <p className="text-sm text-emerald-700 mt-1">Si dejaste tu email, te responderemos ahí.</p>
        <button onClick={() => setEstado('idle')} className="mt-3 text-sm text-emerald-700 underline hover:no-underline">Enviar otro</button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <h2 className="text-lg font-bold flex items-center gap-2"><Send size={18} className="text-accent" /> Envíanos un ticket</h2>
      <p className="mt-1 text-sm text-gray-500">
        Cuéntanos el problema o tu sugerencia. El email es opcional — solo para poder responderte.
      </p>
      <div className="mt-4 grid gap-3">
        <input className={inputClass} aria-label="Asunto" placeholder="Asunto (ej: la importación de un PDF falla)" maxLength={120}
          value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))} />
        <input className={inputClass} aria-label="Tu email (opcional)" type="email" placeholder="Tu email (opcional)" maxLength={120}
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <textarea className={inputClass + ' h-28'} aria-label="Mensaje" placeholder="Qué hacías, qué esperabas y qué pasó. Sin datos reales de clientes, por favor." maxLength={4000}
          value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))} />
      </div>
      {estado === 'error' && <p className="mt-2 text-sm text-red-500">{errorMsg}</p>}
      {estado === 'sinBuzon' && (
        <p className="mt-2 text-sm text-amber-600">
          El buzón no está disponible ahora mismo — usa el canal de GitHub de aquí abajo, que funciona siempre.
        </p>
      )}
      <button onClick={enviar} disabled={estado === 'enviando'}
        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
        <Send size={14} /> {estado === 'enviando' ? 'Enviando...' : 'Enviar ticket'}
      </button>
      <p className="mt-3 text-xs text-gray-400">
        Al enviar, el contenido del ticket (y tu email si lo escribes) se guarda en nuestro buzón para poder atenderte.
        Es el único caso en que algo sale de tu dispositivo — detalles en la <Link to="/privacidad" className="underline hover:text-accent">política de privacidad</Link>.
      </p>
    </div>
  );
}

const FAQS = [
  { q: '¿Dónde están guardados mis datos?', a: 'En tu propio dispositivo (en el almacenamiento del navegador) y en las copias de seguridad que configures. No hay ninguna cuenta ni servidor: si abres la app en otro ordenador o navegador, empezará vacía. Para llevarte los datos usa Ajustes → Descargar backup, e impórtalo en el otro dispositivo.' },
  { q: 'He perdido mis facturas, ¿puedo recuperarlas?', a: 'Sí, casi siempre. La app guarda copias automáticas: si detecta la base vacía con un backup disponible te ofrecerá restaurarlo al entrar. También puedes ir a Ajustes → Historial de backups y restaurar cualquiera, o importar el archivo JSON de tu carpeta de backup (busca "presufact-backup" en la carpeta que elegiste).' },
  { q: '¿Cómo hago que las copias se suban a mi nube?', a: 'En Ajustes → Backup automático, elige como carpeta una que esté dentro de OneDrive, Google Drive o Dropbox. Tu programa de sincronización subirá cada copia a tu nube automáticamente. En el móvil, usa "Enviar backup a tu nube" (abre el menú de compartir).' },
  { q: 'La importación de un PDF no lee bien los datos', a: 'Los PDFs generados por Presufact se reimportan con exactitud. Con PDFs de otros programas la lectura es aproximada: revisa siempre la vista previa antes de importar y corrige lo que falte en el editor. Si un formato concreto se lee mal, repórtalo (abajo) adjuntando un PDF de ejemplo sin datos sensibles.' },
  { q: '¿Puedo facturar legalmente con Presufact? ¿Y Verifactu?', a: 'Presufact genera presupuestos, proformas y borradores de factura en PDF — documentos no sujetos a Verifactu. La obligación de software certificado Verifactu para la facturación oficial entra en vigor el 1/1/2027 (sociedades) y el 1/7/2027 (autónomos): para esa facturación usa un software certificado y consúltalo con tu gestor.' },
  { q: '¿Cómo firmo un presupuesto con el cliente delante?', a: 'Abre el presupuesto → pestaña Condiciones → recuadro de firma: el cliente firma con el dedo (o subes una imagen de la firma). Al generar el PDF, la firma aparece sobre la línea de conformidad "El cliente".' },
  { q: '¿Cómo mando la factura a mi gestoría?', a: 'En Facturas, filtra el año y pulsa "ZIP gestoría": descarga todos los PDFs más un CSV con el desglose (base, IVA, IRPF) listo para Excel. También tienes el resumen por trimestres en la pestaña Impuestos.' },
  { q: 'La app va lenta o se comporta raro', a: 'Descarga un backup primero (Ajustes → Descargar backup). Después prueba a recargar con Ctrl+Mayús+R. Si persiste, borra los datos del sitio en tu navegador y restaura el backup: quedará como nueva.' },
];

// Pagina de ayuda y soporte: FAQ practica + canal de reporte real (GitHub).
export default function AyudaPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Ayuda y soporte · Presufact';
    window.scrollTo(0, 0);
    return () => { document.title = 'Presufact — Presupuestos y facturas en PDF gratis, sin registro'; };
  }, []);

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
          <button onClick={() => navigate('/app')} className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
            Ir a la app
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6">
          <ArrowLeft size={14} /> Volver a Presufact
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight flex items-center gap-3">
          <LifeBuoy size={32} className="text-accent" /> Ayuda y soporte
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Las respuestas a lo que más se pregunta. Si no encuentras la tuya, repórtala abajo y la añadimos.
        </p>

        <div className="mt-8 divide-y divide-gray-100">
          {FAQS.map((f, i) => (
            <details key={i} className="group py-4">
              <summary className="flex items-center justify-between cursor-pointer font-semibold list-none">
                {f.q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl leading-none ml-3 flex-shrink-0">+</span>
              </summary>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                {f.a}
                {/Verifactu/i.test(f.q) && <> <Link to="/verifactu" className="text-accent underline hover:no-underline">Guía Verifactu</Link>.</>}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-10">
          <TicketForm />
        </div>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold flex items-center gap-2"><Bug size={20} /> También en GitHub</h2>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Presufact se desarrolla en abierto. Si prefieres GitHub (o el buzón no está disponible), abre una
            incidencia contando qué hacías y qué esperabas que pasara. Lo leemos todo.
          </p>
          <a href="https://github.com/denislcian/presufact/issues" target="_blank" rel="noopener"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-lg text-sm font-semibold transition">
            <ExternalLink size={16} /> Abrir una incidencia en GitHub
          </a>
          <p className="mt-3 text-xs text-gray-400">
            Importante: no incluyas datos reales de clientes ni facturas en el reporte — con una descripción o una
            captura con datos de ejemplo es suficiente.
          </p>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <Link to="/privacidad" className="text-accent underline hover:no-underline">Privacidad y seguridad</Link>
          {' · '}
          <Link to="/verifactu" className="text-accent underline hover:no-underline">Guía Verifactu</Link>
          {' · '}
          <Link to="/comparativa" className="text-accent underline hover:no-underline">Comparativa</Link>
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

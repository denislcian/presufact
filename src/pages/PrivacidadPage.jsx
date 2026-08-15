import { setPageMeta, resetPageMeta } from '../utils/seo';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowLeft, ShieldCheck } from 'lucide-react';

// Politica de privacidad honesta y verificable: no hay servidor, no hay
// tratamiento de datos por nuestra parte. Lo que promete el marketing,
// aqui en version legal-llana.
export default function PrivacidadPage() {
  const navigate = useNavigate();

  useEffect(() => {
    setPageMeta({ title: 'Privacidad y seguridad · Presufact', description: 'Presufact no recoge tus datos: presupuestos, facturas y clientes se guardan solo en tu dispositivo. Sin cuentas, sin cookies de rastreo, sin analítica. CSP estricta y HTTPS.', path: '/privacidad' });
    window.scrollTo(0, 0);
    return () => { resetPageMeta(); };
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
          <button onClick={() => navigate('/demo')} className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-semibold transition">
            Probar la demo
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition mb-6">
          <ArrowLeft size={14} /> Volver a Presufact
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight flex items-center gap-3">
          <ShieldCheck size={32} className="text-emerald-500" /> Privacidad y seguridad
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          La versión corta: no recogemos tus datos porque no tenemos dónde ponerlos. La versión larga, debajo.
        </p>

        <div className="mt-10 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Qué datos tratamos: ninguno</h2>
            <p>
              Presufact funciona íntegramente en tu navegador. Tus facturas, presupuestos, clientes y ajustes se
              guardan en el almacenamiento local de tu dispositivo (IndexedDB) y en las copias de seguridad que tú
              decidas hacer (una carpeta de tu disco o tu propia nube). <strong>Nada de eso se envía a servidores
              de Presufact, porque Presufact no tiene servidores de datos.</strong> No hay cuentas, no hay registro,
              no pedimos tu email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sin cookies de rastreo ni analítica</h2>
            <p>
              No usamos cookies de seguimiento, ni píxeles, ni herramientas de analítica de terceros. El
              almacenamiento local del navegador se usa exclusivamente para que la app funcione (tus documentos,
              tus preferencias de interfaz y tus copias de seguridad automáticas).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">El hosting</h2>
            <p>
              Los archivos de la aplicación (el código, no tus datos) se sirven desde Vercel, que como cualquier
              proveedor de hosting registra datos técnicos de acceso (dirección IP, fecha, recurso solicitado) en
              sus registros de servidor para operar y proteger el servicio. Esos registros los gestiona Vercel
              conforme a su propia política de privacidad. Tus facturas y clientes nunca viajan en esas peticiones.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Seguridad</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Toda la web se sirve exclusivamente por HTTPS (con HSTS).</li>
              <li>Política de seguridad de contenido (CSP) estricta: la app no puede cargar ni ejecutar código de dominios ajenos.</li>
              <li>Sin dependencias de terceros en tiempo de ejecución: ni CDNs, ni fuentes externas, ni rastreadores.</li>
              <li>Dependencias auditadas (npm audit: cero vulnerabilidades conocidas a fecha de esta versión).</li>
              <li>Puedes comprobarlo todo: activa el modo avión y la app sigue funcionando al completo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tu responsabilidad (y tu control)</h2>
            <p>
              Como los datos viven en tu dispositivo, la copia de seguridad es tuya: configúrala en
              Ajustes (carpeta del disco o tu nube) y descarga backups cuando quieras. Si borras los datos de
              navegación sin backup, nadie —tampoco nosotros— puede recuperarlos. Ese es el precio de que nadie
              más los tenga.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">La única excepción: si nos envías un ticket de soporte</h2>
            <p>
              Si usas el formulario de soporte de la <Link to="/ayuda" className="text-accent underline hover:no-underline">página de ayuda</Link>,
              lo que escribas (asunto, mensaje y tu email si decides darlo) se envía cifrado a nuestro buzón de
              soporte para poder atenderte. Es información que tú nos das voluntariamente, se usa solo para
              responderte y no se comparte con nadie: tu email se borra en cuanto el ticket se marca como resuelto y
              el texto del ticket se elimina al cerrarlo definitivamente. Por eso el formulario te pide no incluir
              datos reales de tus clientes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Derechos RGPD</h2>
            <p>
              Al no tratar datos personales tuyos ni de tus clientes en ningún servidor propio, no hay ficheros
              sobre los que ejercer acceso, rectificación o supresión ante Presufact: el acceso, la rectificación
              y la supresión los haces tú directamente en la app, porque los datos son tuyos y están contigo.
              Para cualquier duda, usa la <Link to="/ayuda" className="text-accent underline hover:no-underline">página de ayuda</Link>.
            </p>
          </section>
        </div>

        <div className="mt-10 text-sm text-gray-500">
          <Link to="/ayuda" className="text-accent underline hover:no-underline">Ayuda y soporte</Link>
          {' · '}
          <Link to="/comparativa" className="text-accent underline hover:no-underline">Comparativa</Link>
          {' · '}
          <Link to="/verifactu" className="text-accent underline hover:no-underline">Guía Verifactu</Link>
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

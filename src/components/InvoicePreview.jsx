import { useEffect, useRef, useState } from 'react';
import { generatePDFFile } from '../utils/pdfGenerator';

// Vista previa = el PDF REAL. Se genera con jsPDF (el mismo codigo que la
// descarga) y se renderiza con pdf.js pagina a pagina. Asi lo que se ve es,
// por construccion, identico a lo que se descarga.
export default function InvoicePreview({ invoice }) {
  const [paginas, setPaginas] = useState([]); // dataURLs de cada pagina
  const [estado, setEstado] = useState('cargando'); // cargando | ok | error
  const timerRef = useRef(null);

  useEffect(() => {
    if (!invoice) return;
    let cancelado = false;
    // Pequeno debounce: el usuario puede seguir escribiendo con la vista abierta
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setEstado(prev => (prev === 'ok' ? 'ok' : 'cargando'));
      let task = null;
      try {
        const [file, pdfjsLib] = await Promise.all([
          generatePDFFile(invoice),
          import('pdfjs-dist'),
        ]);
        if (cancelado) return;
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
        }
        const data = new Uint8Array(await file.arrayBuffer());
        task = pdfjsLib.getDocument({ data });
        const pdf = await task.promise;
        if (cancelado) return;
        // Nitido en pantallas densas sin pasarse de memoria
        const scale = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)) * 1.1;
        const urls = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (cancelado) return;
          urls.push(canvas.toDataURL('image/png'));
        }
        setPaginas(urls);
        setEstado('ok');
      } catch (e) {
        console.error('No se pudo renderizar la vista previa:', e);
        if (!cancelado) setEstado('error');
      } finally {
        // En pdf.js 6 la liberacion es de la tarea de carga (termina el worker)
        try { await task?.destroy(); } catch { /* ya liberada */ }
      }
    }, 250);
    return () => { cancelado = true; clearTimeout(timerRef.current); };
  }, [invoice]);

  if (!invoice) return null;

  if (estado === 'error') {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        No se pudo generar la vista previa. Prueba a descargar el PDF directamente.
      </div>
    );
  }

  return (
    <div className="relative">
      {estado === 'cargando' && paginas.length === 0 && (
        <div className="aspect-[210/297] w-full flex flex-col items-center justify-center text-sm text-gray-400 bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-3" />
          Generando el PDF…
        </div>
      )}
      {estado === 'cargando' && paginas.length > 0 && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-white/90 border border-gray-200 rounded-md text-[11px] text-gray-500 shadow-sm">Actualizando…</div>
      )}
      <div className="space-y-4">
        {paginas.map((src, i) => (
          <img key={i} src={src} alt={`Página ${i + 1} de ${paginas.length}`}
            className="block w-full h-auto bg-white shadow-lg ring-1 ring-gray-200" />
        ))}
      </div>
    </div>
  );
}

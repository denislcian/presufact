import { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import InvoicePreview from './InvoicePreview';
import { generatePDF } from '../utils/pdfGenerator';

// Modal de vista previa: muestra el PDF real (InvoicePreview) y permite
// descargarlo. Lo que se ve es exactamente lo que se descarga.
export default function InvoicePreviewModal({ invoice, onClose }) {
  const handleDownload = () => { generatePDF(invoice); };

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titulo = invoice.esProforma ? 'Factura proforma' : (invoice.documentType || 'Documento');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-2 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="preview-title" className="bg-gray-100 rounded-xl shadow-2xl my-2 sm:my-8 w-full max-w-[236mm]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="min-w-0">
            <h2 id="preview-title" className="text-base sm:text-lg font-bold text-gray-800 truncate">Vista previa · {titulo}</h2>
            <p className="text-[11px] text-gray-400 hidden sm:block">Es el PDF real: lo que ves es lo que se descarga.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleDownload} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition">
              <Download size={16} /> <span className="hidden sm:inline">Descargar PDF</span><span className="sm:hidden">PDF</span>
            </button>
            <button onClick={onClose} aria-label="Cerrar vista previa" className="p-2 hover:bg-gray-200 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-6 overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="mx-auto w-full max-w-[210mm]">
            <InvoicePreview invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
}

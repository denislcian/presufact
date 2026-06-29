import { X, Download } from 'lucide-react';
import InvoicePreview from './InvoicePreview';
import { generatePDF } from '../utils/pdfGenerator';

export default function InvoicePreviewModal({ invoice, onClose }) {
  const handleDownload = () => {
    generatePDF(invoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl my-8 max-w-[230mm]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg font-bold text-gray-800">Vista Previa - {invoice.documentType || 'Documento'}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition">
              <Download size={16} /> Descargar PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="shadow-lg mx-auto" style={{ width: '210mm' }}>
            <InvoicePreview invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
}

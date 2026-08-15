import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, ClipboardList, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { importInvoiceFromPDF } from '../utils/pdfImporter';
import { saveDocument, getEmisorSettings, DOC_TYPES } from '../db';

export default function ImportInvoice({ onClose, defaultDocType = 'factura' }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleFiles = async (fileList) => {
    const pdfFiles = Array.from(fileList).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFiles.length === 0) { setError('Selecciona archivos PDF'); return; }
    setStatus('loading');
    setError('');

    const emisor = await getEmisorSettings();
    const parsed = [];

    for (const file of pdfFiles) {
      try {
        const { invoice, rawText: text } = await importInvoiceFromPDF(file, emisor);
        invoice.emisor = { ...emisor };
        // Use detected type, falling back to default
        const detectedType = invoice._detectedType || defaultDocType;
        delete invoice._detectedType;
        parsed.push({ file: file.name, invoice, rawText: text, status: 'ready', docType: detectedType });
      } catch (e) {
        parsed.push({ file: file.name, invoice: null, rawText: '', status: 'error', error: e.message });
      }
    }
    setResults(parsed);
    setStatus('preview');
  };

  const handleDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };

  const changeDocType = (idx, newType) => {
    setResults(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const inv = { ...r.invoice, documentType: newType === 'factura' ? 'Factura' : 'Presupuesto' };
      // If switching to presupuesto, move descripcionTrabajo to descripcionObra
      if (newType === 'presupuesto' && inv.descripcionTrabajo && !inv.descripcionObra) {
        inv.descripcionObra = inv.descripcionTrabajo;
        inv.descripcionTrabajo = '';
        delete inv.formaPago;
        delete inv.vencimientos;
      }
      // If switching to factura, move back
      if (newType === 'factura' && inv.descripcionObra && !inv.descripcionTrabajo) {
        inv.descripcionTrabajo = inv.descripcionObra;
        inv.descripcionObra = '';
      }
      return { ...r, docType: newType, invoice: inv };
    }));
  };

  const handleImportOne = async (idx) => {
    const result = results[idx];
    if (!result?.invoice) return;
    try {
      const id = await saveDocument(result.docType, result.invoice);
      onClose();
      const config = DOC_TYPES[result.docType];
      navigate(`${config.route}/editar/${id}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleImportAll = async () => {
    setStatus('loading');
    const updated = [...results];
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      if (r.invoice && r.status === 'ready') {
        try {
          await saveDocument(r.docType, r.invoice);
          updated[i] = { ...r, status: 'saved' };
        } catch (e) {
          updated[i] = { ...r, status: 'error', error: e.message };
        }
      }
    }
    setResults(updated);
    setStatus('done');
    setTimeout(() => {
      onClose();
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Importar PDF</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-gray-100 rounded-lg transition"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 70px)' }}>
          {status === 'idle' && (
            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-accent hover:bg-blue-50/50 transition cursor-pointer"
                onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-1">Arrastra PDFs aquí o haz clic para seleccionar</p>
                <p className="text-sm text-gray-500">Se detectará automáticamente si es factura o presupuesto</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" multiple className="sr-only" onChange={e => handleFiles(e.target.files)} />
              {error && <div className="mt-4 flex items-center gap-2 text-red-600 text-sm"><AlertCircle size={16} /> {error}</div>}
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center py-12">
              <Loader2 size={40} className="mx-auto text-accent animate-spin mb-4" />
              <p className="text-gray-600">Leyendo PDFs...</p>
            </div>
          )}

          {status === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">
                Se han leído {results.length} archivo(s). Revisa que el tipo de documento sea correcto antes de importar.
              </p>

              {results.map((result, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText size={18} className="text-accent flex-shrink-0" />
                      <span className="font-medium text-gray-800 truncate" title={result.file}>{result.file}</span>
                      {result.status === 'error' && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Error</span>}
                      {result.status === 'saved' && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Guardado</span>}
                    </div>
                    {result.invoice && result.status === 'ready' && (
                      <button onClick={() => handleImportOne(idx)}
                        className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs hover:bg-accent-light transition whitespace-nowrap">
                        Importar y editar
                      </button>
                    )}
                  </div>

                  {result.status === 'error' && <p className="text-sm text-red-600">{result.error}</p>}

                  {result.invoice && (
                    <div className="space-y-3 text-sm">
                      {/* Doc type selector */}
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Tipo:</span>
                        <button onClick={() => changeDocType(idx, 'factura')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${result.docType === 'factura' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>
                          <FileText size={12} /> Factura
                        </button>
                        <button onClick={() => changeDocType(idx, 'presupuesto')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${result.docType === 'presupuesto' ? 'bg-purple-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'}`}>
                          <ClipboardList size={12} /> Presupuesto
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div><span className="text-gray-500">Número:</span><span className="ml-2 font-mono">{result.invoice.invoiceNumber || '(no detectado)'}</span></div>
                        <div><span className="text-gray-500">Fecha:</span><span className="ml-2">{result.invoice.date}</span></div>
                        <div className="col-span-2"><span className="text-gray-500">Cliente:</span><span className="ml-2 font-medium">{result.invoice.cliente.nombre || '(no detectado)'}</span></div>
                        <div className="col-span-2"><span className="text-gray-500">Líneas:</span><span className="ml-2">{result.invoice.lineas.filter(l => l.descripcion).length} concepto(s) detectados</span></div>
                      </div>

                      {result.invoice.lineas.filter(l => l.descripcion).length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                          {result.invoice.lineas.filter(l => l.descripcion).map((l, li) => (
                            <div key={li} className="text-xs text-gray-600 font-mono">
                              · {l.descripcion} — {l.cantidad} {l.unidad} × {l.precioUd}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        IVA: {result.invoice.iva.inversionSujetoPasivo ? 'Inv. Sujeto Pasivo' : result.invoice.iva.tipo + '%'}
                      </div>

                      {result.rawText && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-400 hover:text-gray-600">Ver texto extraído del PDF</summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-[10px] max-h-40 overflow-auto whitespace-pre-wrap">{result.rawText}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">Cancelar</button>
                {results.filter(r => r.invoice && r.status === 'ready').length > 1 && (
                  <button onClick={handleImportAll} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition">
                    Importar todos ({results.filter(r => r.invoice && r.status === 'ready').length})
                  </button>
                )}
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-12">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium text-gray-800">Documentos importados</p>
              <p className="text-sm text-gray-500 mt-1">Recargando...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Eye, ArrowLeft, Copy } from 'lucide-react';
import { getDefaultDocument, getNextNumber, saveDocument, getDocument, getEmisorSettings, getAllDocuments, DOC_TYPES } from '../db';
import { calcLineSubtotal, calcLineTotal, formatNumber, formatDateES, getUnitLabel, UNIT_OPTIONS, IVA_OPTIONS, RE_RATES, calcInvoiceTaxBreakdown, calcDeduccionesTotal } from '../utils/formatters';
import InvoicePreviewModal from './InvoicePreviewModal';
import { generatePDF } from '../utils/pdfGenerator';
import { autoBackup } from '../utils/backup';

export default function InvoiceForm({ docType = 'factura' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = DOC_TYPES[docType];
  const [invoice, setInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [validationError, setValidationError] = useState('');
  const [allInvoices, setAllInvoices] = useState([]); // solo documentos del MISMO tipo (deducciones)
  const [clientDocs, setClientDocs] = useState([]);   // ambos tipos (autocompletado de clientes)
  const [savedJson, setSavedJson] = useState('');
  const saveRef = useRef(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    async function load() {
      if (id) {
        const inv = await getDocument(docType, parseInt(id));
        if (inv) {
          if (!inv.deducciones) inv.deducciones = [];
          if (!inv.iva) inv.iva = { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
          if (inv.lineas) inv.lineas = inv.lineas.map(l => ({ ...l, unidad: l.unidad || 'ud' }));
          setInvoice(inv);
          setSavedJson(JSON.stringify(inv));
          return;
        }
        navigate(config.route, { replace: true });
        return;
      }
      const emisor = await getEmisorSettings();
      const nextNum = await getNextNumber(docType);
      const fresh = { ...getDefaultDocument(docType, emisor), emisor, invoiceNumber: nextNum };
      setInvoice(fresh);
      setSavedJson(JSON.stringify(fresh));
    }
    load();
    // Cargar los dos tipos a la vez (sin race): mismo tipo -> deducciones;
    // ambos tipos -> autocompletado de clientes. Nunca mezclar en un solo
    // estado: las tablas comparten ids autoincrementales y colisionarian.
    const otherType = docType === 'factura' ? 'presupuesto' : 'factura';
    Promise.all([getAllDocuments(docType), getAllDocuments(otherType)]).then(([own, others]) => {
      setAllInvoices(own);
      setClientDocs([...own, ...others]);
    });
  }, [id]);

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Ctrl+S / Cmd+S saves
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!invoice) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;

  const dirty = JSON.stringify(invoice) !== savedJson;
  dirtyRef.current = dirty;

  const handleBack = () => {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir igualmente?')) return;
    navigate(config.route);
  };

  const updateField = (path, value) => {
    setInvoice(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (obj[key] === undefined || obj[key] === null) {
          // Auto-create missing intermediate objects/arrays
          obj[key] = !isNaN(keys[i + 1]) ? [] : {};
        }
        obj = obj[key];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const addLinea = () => {
    setInvoice(prev => ({
      ...prev,
      lineas: [...prev.lineas, { articulo: '', descripcion: '', cantidad: '', precioUd: '', dto: '', unidad: 'ud' }]
    }));
  };

  const removeLinea = (idx) => {
    setInvoice(prev => ({
      ...prev,
      lineas: prev.lineas.filter((_, i) => i !== idx)
    }));
  };

  const addVencimiento = () => {
    setInvoice(prev => ({
      ...prev,
      vencimientos: [...prev.vencimientos, { fecha: '', importe: '', domiciliacion: '', oficina: '', numeroCuenta: '' }]
    }));
  };

  const removeVencimiento = (idx) => {
    setInvoice(prev => ({
      ...prev,
      vencimientos: prev.vencimientos.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!invoice.cliente?.nombre?.trim()) {
      setValidationError('Falta el nombre del cliente');
      setActiveTab('cliente');
      return;
    }
    const hasLines = invoice.lineas.some(l => l.descripcion?.trim() && (l.cantidad || l.precioUd));
    if (!hasLines) {
      setValidationError('Añade al menos una linea con descripcion y precio');
      setActiveTab('lineas');
      return;
    }
    setValidationError('');
    setSaving(true);
    let savedInvoice = null;
    try {
      const savedId = await saveDocument(docType, invoice);
      savedInvoice = { ...invoice, id: savedId };
      setSavedJson(JSON.stringify(savedInvoice));
      if (!id) navigate(`${config.route}/editar/${savedId}`, { replace: true });
      else setInvoice(savedInvoice);
      autoBackup();
    } catch (e) {
      console.error(e);
      setValidationError('No se pudo guardar el documento: ' + (e?.message || 'error desconocido') + '. Tus cambios siguen en pantalla; prueba de nuevo o descarga un backup desde Ajustes.');
      setSaving(false);
      return;
    }
    // El PDF es secundario: si falla, el documento YA esta guardado
    try {
      await generatePDF(savedInvoice);
    } catch (e) {
      console.error(e);
      setValidationError('Documento guardado, pero no se pudo generar el PDF: ' + (e?.message || 'error desconocido'));
    }
    setSaving(false);
  };
  saveRef.current = handleSave;

  const totalLineas = invoice.lineas.reduce((sum, l) => sum + calcLineTotal(l), 0);

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  const tabs = docType === 'presupuesto' ? [
    { key: 'general', label: 'General' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'lineas', label: 'Líneas' },
    { key: 'impuestos', label: 'Impuestos' },
    { key: 'condiciones', label: 'Condiciones' },
  ] : [
    { key: 'general', label: 'General' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'lineas', label: 'Líneas' },
    { key: 'deducciones', label: 'Deducciones' },
    { key: 'impuestos', label: 'Impuestos' },
    { key: 'vencimientos', label: 'Vencimientos' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-gray-200 rounded-lg transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {id ? `Editar ${config.label} #${invoice.invoiceNumber}` : `${docType === 'factura' ? 'Nueva' : 'Nuevo'} ${config.label}`}
          </h1>
          {dirty && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium" title="Hay cambios sin guardar (Ctrl+S para guardar)">
              Sin guardar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm font-medium">
            <Eye size={16} /> Vista previa
          </button>
          <button onClick={handleSave} disabled={saving} title="Ctrl+S"
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition text-sm font-medium disabled:opacity-50 ${dirty ? 'bg-amber-500 hover:bg-amber-600' : 'bg-accent hover:bg-accent-light'}`}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{validationError}</span>
          <button onClick={() => setValidationError('')} className="text-red-400 hover:text-red-600 text-xs">Cerrar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.key ? 'bg-white shadow text-accent' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Datos del Documento</h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Tipo Documento</label>
                <input className={inputClass} value={invoice.documentType} onChange={e => updateField('documentType', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Número</label>
                <input className={inputClass} value={invoice.invoiceNumber} onChange={e => updateField('invoiceNumber', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Página</label>
                <input className={inputClass} value={invoice.page} onChange={e => updateField('page', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" className={inputClass} value={invoice.date} onChange={e => updateField('date', e.target.value)} />
              </div>
            </div>

            {docType === 'factura' && (
              <label className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5 cursor-pointer">
                <input type="checkbox" className="mt-0.5 accent-blue-600 w-4 h-4"
                  checked={!!invoice.esProforma}
                  onChange={e => updateField('esProforma', e.target.checked)} />
                <span className="text-sm">
                  <span className="font-semibold text-gray-800">Marcar como factura proforma</span>
                  <span className="block text-gray-500 mt-0.5">
                    El PDF se titulará "FACTURA PROFORMA". Las proformas no son facturas a efectos fiscales
                    (no están sujetas a Verifactu) — útil para enviar antes de emitir la factura definitiva.
                  </span>
                </span>
              </label>
            )}

            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mt-6">Datos del Emisor</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre / Razón Social</label>
                <input className={inputClass} value={invoice.emisor.nombre} onChange={e => updateField('emisor.nombre', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>NIF</label>
                <input className={inputClass} value={invoice.emisor.nif} onChange={e => updateField('emisor.nif', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Subtítulo</label>
                <input className={inputClass} value={invoice.emisor.subtitulo} onChange={e => updateField('emisor.subtitulo', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Web</label>
                <input className={inputClass} value={invoice.emisor.web} onChange={e => updateField('emisor.web', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Dirección</label>
                <input className={inputClass} value={invoice.emisor.direccion} onChange={e => updateField('emisor.direccion', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>CP</label>
                <input className={inputClass} value={invoice.emisor.cp} onChange={e => updateField('emisor.cp', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input className={inputClass} value={invoice.emisor.ciudad} onChange={e => updateField('emisor.ciudad', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Provincia</label>
                <input className={inputClass} value={invoice.emisor.provincia} onChange={e => updateField('emisor.provincia', e.target.value)} />
              </div>
            </div>

            {docType === 'factura' && (
              <div>
                <label className={labelClass}>Forma de Pago</label>
                <input className={inputClass} value={invoice.formaPago || ''} onChange={e => updateField('formaPago', e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelClass}>{docType === 'presupuesto' ? 'Descripcion de la Obra' : 'Descripcion del Trabajo (cabecera)'}</label>
              <textarea className={inputClass + ' h-20'}
                value={docType === 'presupuesto' ? (invoice.descripcionObra || '') : (invoice.descripcionTrabajo || '')}
                onChange={e => updateField(docType === 'presupuesto' ? 'descripcionObra' : 'descripcionTrabajo', e.target.value)}
                placeholder={docType === 'presupuesto' ? 'Ej: PRESUPUESTO PARA OBRA CHALET CABUEÑES' : 'Ej: TRABAJOS REALIZADOS EN SU OBRA CHALET CABUEÑES'} />
            </div>
            <div>
              <label className={labelClass}>Observaciones</label>
              <textarea className={inputClass + ' h-20'} value={invoice.observaciones || ''} onChange={e => updateField('observaciones', e.target.value)}
                placeholder={docType === 'presupuesto' ? 'Notas adicionales sobre el presupuesto' : 'Ej: TRANSFERENCIA BANCARIA A FECHA DE FACTURA&#10;ES02 0049 3586 1921 1403 5991'} />
            </div>
          </div>
        )}

        {/* Cliente Tab */}
        {activeTab === 'cliente' && (() => {
          // Build unique clients from every saved document (facturas + presupuestos)
          const knownClients = clientDocs
            .filter(inv => inv.cliente?.nombre?.trim())
            .reduce((acc, inv) => {
              const name = inv.cliente.nombre.trim();
              if (!acc.find(c => c.nombre === name)) acc.push(inv.cliente);
              return acc;
            }, []);

          const handleClientSelect = (nombre) => {
            updateField('cliente.nombre', nombre);
            const found = knownClients.find(c => c.nombre === nombre);
            if (found) {
              if (found.nif) updateField('cliente.nif', found.nif);
              if (found.direccion) updateField('cliente.direccion', found.direccion);
              if (found.cp) updateField('cliente.cp', found.cp);
              if (found.ciudad) updateField('cliente.ciudad', found.ciudad);
              if (found.provincia) updateField('cliente.provincia', found.provincia);
            }
          };

          return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Datos del Cliente</h2>
            {knownClients.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <label className={labelClass}>Clientes anteriores</label>
                <select className={inputClass + ' mt-1'} value=""
                  onChange={e => { if (e.target.value) handleClientSelect(e.target.value); }}>
                  <option value="">Seleccionar cliente guardado...</option>
                  {knownClients.map((c, i) => (
                    <option key={i} value={c.nombre}>{c.nombre} {c.nif ? `(${c.nif})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Nombre / Razon Social</label>
                <input className={inputClass} value={invoice.cliente.nombre} onChange={e => updateField('cliente.nombre', e.target.value)}
                  placeholder="Ej: CONSTRUCCIONES COVAFRE, S.L." list="clientes-list" />
                <datalist id="clientes-list">
                  {knownClients.map((c, i) => <option key={i} value={c.nombre} />)}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>NIF</label>
                <input className={inputClass} value={invoice.cliente.nif} onChange={e => updateField('cliente.nif', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Dirección</label>
                <input className={inputClass} value={invoice.cliente.direccion} onChange={e => updateField('cliente.direccion', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>CP</label>
                <input className={inputClass} value={invoice.cliente.cp} onChange={e => updateField('cliente.cp', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input className={inputClass} value={invoice.cliente.ciudad} onChange={e => updateField('cliente.ciudad', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Provincia</label>
                <input className={inputClass} value={invoice.cliente.provincia} onChange={e => updateField('cliente.provincia', e.target.value)} />
              </div>
            </div>
          </div>
          );
        })()}

        {/* Líneas Tab */}
        {activeTab === 'lineas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-700">Líneas de Factura</h2>
              <button onClick={addLinea} className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition">
                <Plus size={14} /> Añadir línea
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-left w-16">Art.</th>
                    <th className="px-2 py-2 text-left">Descripcion</th>
                    <th className="px-2 py-2 text-center w-16">Ud.</th>
                    <th className="px-2 py-2 text-right w-24">Cantidad</th>
                    <th className="px-2 py-2 text-right w-24">Precio</th>
                    <th className="px-2 py-2 text-right w-20">Subtotal</th>
                    <th className="px-2 py-2 text-right w-16">Dto.%</th>
                    <th className="px-2 py-2 text-center w-20" title="Tipo de IVA de esta linea. 'Global' usa el tipo de la pestana Impuestos.">IVA</th>
                    <th className="px-2 py-2 text-right w-24">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineas.map((linea, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-1 py-1">
                        <input className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" value={linea.articulo}
                          onChange={e => updateField(`lineas.${idx}.articulo`, e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <input className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" value={linea.descripcion}
                          onChange={e => updateField(`lineas.${idx}.descripcion`, e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <select className="w-full px-1 py-1.5 border border-gray-200 rounded text-sm text-center bg-white"
                          value={linea.unidad || 'ud'} onChange={e => updateField(`lineas.${idx}.unidad`, e.target.value)}>
                          {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" step="0.01" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right" value={linea.cantidad}
                          onChange={e => updateField(`lineas.${idx}.cantidad`, e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" step="0.01" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right" value={linea.precioUd}
                          onChange={e => updateField(`lineas.${idx}.precioUd`, e.target.value)} />
                      </td>
                      <td className="px-1 py-1 text-right font-mono text-gray-600">
                        {(linea.cantidad && linea.precioUd) ? formatNumber(calcLineSubtotal(linea)) : ''}
                      </td>
                      <td className="px-1 py-1">
                        <input type="number" step="0.01" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right" value={linea.dto}
                          onChange={e => updateField(`lineas.${idx}.dto`, e.target.value)} />
                      </td>
                      <td className="px-1 py-1">
                        <select className="w-full px-1 py-1.5 border border-gray-200 rounded text-sm text-center bg-white"
                          value={linea.iva ?? ''}
                          onChange={e => updateField(`lineas.${idx}.iva`, e.target.value === '' ? undefined : parseFloat(e.target.value))}>
                          <option value="">Global</option>
                          {IVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1 text-right font-mono font-semibold">
                        {(linea.cantidad && linea.precioUd) ? formatNumber(calcLineTotal(linea)) : ''}
                      </td>
                      <td className="px-1 py-1">
                        {invoice.lineas.length > 1 && (
                          <button onClick={() => removeLinea(idx)} className="p-1 text-red-400 hover:text-red-600 transition">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <div className="bg-gray-50 px-6 py-3 rounded-lg">
                <span className="text-sm text-gray-600">Total líneas: </span>
                <span className="text-lg font-bold text-gray-800">{formatNumber(totalLineas)} &euro;</span>
              </div>
            </div>
          </div>
        )}

        {/* Deducciones Tab */}
        {activeTab === 'deducciones' && (() => {
          const availableInvoices = allInvoices.filter(inv => inv.id !== invoice.id);
          // Mismo calculo que el tab Impuestos y el PDF (respeta el formato espanol "13.556,47")
          const totalDeducciones = calcDeduccionesTotal(invoice.deducciones);

          const handleSelectInvoice = (facturaId) => {
            const selInv = allInvoices.find(i => String(i.id) === facturaId);
            if (!selInv) return;
            const dedLineas = (selInv.lineas || []).filter(l => l.descripcion && (l.cantidad || l.precioUd)).map(l => ({
              descripcion: l.descripcion,
              unidad: l.unidad || 'ud',
              cantidad: l.cantidad,
              precioUd: l.precioUd,
              incluir: true
            }));
            setInvoice(prev => ({
              ...prev,
              deducciones: [...(prev.deducciones || []), {
                facturaId: selInv.id,
                facturaNum: selInv.invoiceNumber,
                facturaFecha: selInv.date,
                lineas: dedLineas
              }]
            }));
          };

          const handleAddManual = () => {
            setInvoice(prev => ({
              ...prev,
              deducciones: [...(prev.deducciones || []), {
                manual: true,
                descripcion: '',
                importe: ''
              }]
            }));
          };

          const addLineToDeduccion = (dIdx) => {
            setInvoice(prev => {
              const next = JSON.parse(JSON.stringify(prev));
              next.deducciones[dIdx].lineas.push({ descripcion: '', unidad: 'ud', cantidad: '', precioUd: '', incluir: true });
              return next;
            });
          };

          const removeLineFromDeduccion = (dIdx, lIdx) => {
            setInvoice(prev => {
              const next = JSON.parse(JSON.stringify(prev));
              next.deducciones[dIdx].lineas = next.deducciones[dIdx].lineas.filter((_, i) => i !== lIdx);
              return next;
            });
          };

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-700">Deducciones</h2>
                  <p className="text-sm text-gray-500 mt-1">Descuenta importes desde una factura anterior o añadelos a mano</p>
                </div>
                <button onClick={handleAddManual} className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition">
                  <Plus size={14} /> Añadir manual
                </button>
              </div>

              {/* Selector de factura */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <label className={labelClass}>O importar desde factura anterior</label>
                <select className={inputClass + ' mt-1'} value=""
                  onChange={e => { if (e.target.value) handleSelectInvoice(e.target.value); }}>
                  <option value="">Seleccionar factura guardada...</option>
                  {availableInvoices.map(inv => {
                    const total = (inv.lineas || []).reduce((s, l) => s + calcLineTotal(l), 0);
                    return (
                      <option key={inv.id} value={inv.id}>
                        #{inv.invoiceNumber} - {inv.cliente?.nombre || inv.clientName || 'Sin cliente'} - {formatNumber(total)} EUR ({formatDateES(inv.date)})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Deducciones añadidas */}
              {(!invoice.deducciones || invoice.deducciones.length === 0) ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No hay deducciones. Añade una manual o selecciona una factura anterior.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoice.deducciones.map((ded, dIdx) => {
                    // Simple manual deduction (descripcion + importe directo)
                    if (ded.manual && !ded.lineas) {
                      return (
                        <div key={dIdx} className="border border-orange-200 rounded-xl bg-orange-50 p-4">
                          <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-8">
                              <label className={labelClass}>Mencion / Descripcion</label>
                              <input className={inputClass}
                                placeholder="Ej: FACTURA 1 - 260013 DEL 24 DE FEBRERO DE 2026"
                                value={ded.descripcion || ''}
                                onChange={e => updateField(`deducciones.${dIdx}.descripcion`, e.target.value)} />
                            </div>
                            <div className="col-span-3">
                              <label className={labelClass}>Importe a deducir</label>
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-red-500 font-bold">-</span>
                                <input type="text" inputMode="decimal"
                                  className={inputClass + ' pl-6 text-right font-mono font-semibold'}
                                  placeholder="13.556,47"
                                  value={ded.importe || ''}
                                  onChange={e => updateField(`deducciones.${dIdx}.importe`, e.target.value)} />
                              </div>
                              <p className="text-xs text-gray-400 mt-1">Usa coma para decimales: 13.556,47</p>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <button onClick={() => {
                                setInvoice(prev => ({ ...prev, deducciones: prev.deducciones.filter((_, i) => i !== dIdx) }));
                              }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const dedTotal = (ded.lineas || []).filter(l => l.incluir !== false).reduce((s, l) => s + ((parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUd) || 0)), 0);
                    return (
                      <div key={dIdx} className="border border-orange-200 rounded-xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-orange-50 px-4 py-3 flex items-center justify-between gap-3">
                          {ded.manual ? (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs font-semibold text-orange-700 uppercase">Manual</span>
                              <input className="flex-1 px-2 py-1 border border-orange-200 rounded text-sm bg-white"
                                placeholder="Descripcion / Referencia (ej: Ajuste, Anticipo factura 260010)"
                                value={ded.facturaNum || ''}
                                onChange={e => updateField(`deducciones.${dIdx}.facturaNum`, e.target.value)} />
                            </div>
                          ) : (
                            <div>
                              <span className="font-semibold text-orange-800">Factura #{ded.facturaNum}</span>
                              <span className="text-orange-600 text-sm ml-2">({formatDateES(ded.facturaFecha)})</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-bold text-orange-700">-{formatNumber(dedTotal)} &euro;</span>
                            <button onClick={() => {
                              setInvoice(prev => ({ ...prev, deducciones: prev.deducciones.filter((_, i) => i !== dIdx) }));
                            }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Lineas de la deduccion */}
                        <div className="p-3">
                          <table className="w-full text-sm table-fixed">
                            <thead>
                              <tr className="text-xs text-gray-500 uppercase">
                                <th className="w-8 px-1 py-1"></th>
                                <th className="px-2 py-1 text-left">Concepto</th>
                                <th className="w-16 px-1 py-1 text-center">Ud.</th>
                                <th className="w-24 px-2 py-1 text-right">Cantidad</th>
                                <th className="w-24 px-2 py-1 text-right">Precio</th>
                                <th className="w-28 px-2 py-1 text-right">Subtotal</th>
                                {ded.manual && <th className="w-8 px-1 py-1"></th>}
                              </tr>
                            </thead>
                            <tbody>
                              {(ded.lineas || []).map((linea, lIdx) => {
                                const sub = (parseFloat(linea.cantidad) || 0) * (parseFloat(linea.precioUd) || 0);
                                const included = linea.incluir !== false;
                                return (
                                  <tr key={lIdx} className={`border-t border-gray-100 ${!included ? 'opacity-40' : ''}`}>
                                    <td className="px-1 py-1.5 text-center">
                                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                                        checked={included}
                                        onChange={e => updateField(`deducciones.${dIdx}.lineas.${lIdx}.incluir`, e.target.checked)} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {ded.manual ? (
                                        <input className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                          placeholder="Ej: TRASDOSADO, anticipo, mano de obra..."
                                          value={linea.descripcion || ''}
                                          onChange={e => updateField(`deducciones.${dIdx}.lineas.${lIdx}.descripcion`, e.target.value)} />
                                      ) : (
                                        <span className="text-gray-700 truncate block" title={linea.descripcion}>{linea.descripcion}</span>
                                      )}
                                    </td>
                                    <td className="px-1 py-1.5 text-center">
                                      {ded.manual ? (
                                        <select className="w-full px-1 py-1 border border-gray-200 rounded text-xs bg-white"
                                          value={linea.unidad || 'ud'}
                                          onChange={e => updateField(`deducciones.${dIdx}.lineas.${lIdx}.unidad`, e.target.value)}>
                                          {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                        </select>
                                      ) : (
                                        <span className="text-gray-500 text-xs">{getUnitLabel(linea.unidad)}</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <input type="number" step="0.01"
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right font-mono"
                                        value={linea.cantidad}
                                        onChange={e => updateField(`deducciones.${dIdx}.lineas.${lIdx}.cantidad`, e.target.value)} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {ded.manual ? (
                                        <input type="number" step="0.01"
                                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right font-mono"
                                          value={linea.precioUd}
                                          onChange={e => updateField(`deducciones.${dIdx}.lineas.${lIdx}.precioUd`, e.target.value)} />
                                      ) : (
                                        <span className="block text-right font-mono text-gray-600 text-xs">{formatNumber(parseFloat(linea.precioUd) || 0)}</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-orange-700">{included ? '-' + formatNumber(sub) : '-'}</td>
                                    {ded.manual && (
                                      <td className="px-1 py-1.5 text-center">
                                        {ded.lineas.length > 1 && (
                                          <button onClick={() => removeLineFromDeduccion(dIdx, lIdx)}
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {ded.manual && (
                            <button onClick={() => addLineToDeduccion(dIdx)}
                              className="mt-2 w-full py-1.5 border border-dashed border-orange-300 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-50 transition flex items-center justify-center gap-1">
                              <Plus size={12} /> Añadir linea
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end">
                    <div className="bg-orange-50 px-6 py-3 rounded-lg border border-orange-200">
                      <span className="text-sm text-orange-700">Total deducciones: </span>
                      <span className="text-lg font-bold text-orange-800 font-mono">-{formatNumber(totalDeducciones)} &euro;</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Impuestos Tab */}
        {activeTab === 'impuestos' && (() => {
          const ivaConfig = invoice.iva || { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
          const tax = calcInvoiceTaxBreakdown(invoice.lineas, ivaConfig, invoice.deducciones);
          return (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Configuracion de Impuestos</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* IVA selector */}
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Tipo de IVA (por defecto)</label>
                    <select className={inputClass} value={ivaConfig.tipo}
                      onChange={e => updateField('iva.tipo', parseInt(e.target.value))}>
                      {IVA_OPTIONS.map(rate => (
                        <option key={rate} value={rate}>{rate}%{rate === 0 ? ' (Exento)' : ''}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Puedes fijar un IVA distinto en líneas concretas desde la pestaña Líneas (columna IVA).</p>
                  </div>
                  <div>
                    <label className={labelClass}>Retencion IRPF</label>
                    <select className={inputClass} value={ivaConfig.irpf || 0}
                      onChange={e => updateField('iva.irpf', parseInt(e.target.value))}>
                      <option value={0}>Sin retencion</option>
                      <option value={7}>7% (nuevos autonomos)</option>
                      <option value={15}>15% (general autonomos)</option>
                      <option value={19}>19% (alquileres)</option>
                      <option value={1}>1%</option>
                      <option value={2}>2%</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Se resta del total. Aplica si eres autonomo facturando a empresas o profesionales.</p>
                  </div>
                </div>
                <div className="space-y-3 pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                      checked={ivaConfig.recargoEquivalencia || false}
                      onChange={e => updateField('iva.recargoEquivalencia', e.target.checked)} />
                    <span className="text-sm">Recargo de Equivalencia ({RE_RATES[ivaConfig.tipo] || 0}%)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
                      checked={ivaConfig.inversionSujetoPasivo || false}
                      onChange={e => updateField('iva.inversionSujetoPasivo', e.target.checked)} />
                    <span className="text-sm">Inversion del Sujeto Pasivo (Art.84 Ley IVA)</span>
                  </label>
                </div>
              </div>

              {/* Auto-calculated summary */}
              <div className="bg-gray-50 rounded-xl p-6 max-w-sm ml-auto">
                <div className="space-y-3 text-sm">
                  {tax.totalDeducciones > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal lineas</span>
                        <span className="font-mono font-medium">{formatNumber(tax.baseLineas)} &euro;</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Deducciones</span>
                        <span className="font-mono">-{formatNumber(tax.totalDeducciones)} &euro;</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Imponible</span>
                    <span className="font-mono font-medium">{formatNumber(tax.base)} &euro;</span>
                  </div>
                  {tax.isISP ? (
                    <div className="flex justify-between text-amber-600">
                      <span>IVA (Inv. Sujeto Pasivo)</span>
                      <span className="font-mono">0,00 &euro;</span>
                    </div>
                  ) : tax.esMultiTipo ? (
                    // Desglose legal por tipo cuando la factura mezcla tipos de IVA
                    tax.porTipo.map(g => (
                      <div key={g.tipo} className="flex justify-between">
                        <span className="text-gray-600">IVA {g.tipo}% (base {formatNumber(g.base)})</span>
                        <span className="font-mono font-medium">{formatNumber(g.cuota)} &euro;</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA ({tax.porTipo[0]?.tipo ?? ivaConfig.tipo}%)</span>
                      <span className="font-mono font-medium">{formatNumber(tax.ivaAmount)} &euro;</span>
                    </div>
                  )}
                  {tax.hasRE && !tax.isISP && (
                    tax.esMultiTipo ? (
                      tax.porTipo.filter(g => g.re !== 0).map(g => (
                        <div key={'re' + g.tipo} className="flex justify-between">
                          <span className="text-gray-600">R.E. {g.reRate}% (base {formatNumber(g.base)})</span>
                          <span className="font-mono font-medium">{formatNumber(g.re)} &euro;</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-600">R.E. ({tax.reRate}%)</span>
                        <span className="font-mono font-medium">{formatNumber(tax.reAmount)} &euro;</span>
                      </div>
                    )
                  )}
                  {tax.hasIRPF && (
                    <div className="flex justify-between text-red-600">
                      <span>IRPF ({tax.irpfRate}%)</span>
                      <span className="font-mono">{formatNumber(-tax.irpfAmount)} &euro;</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-3 flex justify-between">
                    <span className="font-bold text-gray-800 text-base">TOTAL</span>
                    <span className="font-mono font-bold text-lg text-gray-800">{formatNumber(tax.total)} &euro;</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Condiciones Tab (solo presupuestos) */}
        {activeTab === 'condiciones' && docType === 'presupuesto' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Condiciones del Presupuesto</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Validez del Presupuesto</label>
                <select className={inputClass} value={invoice.validez || '30 dias'}
                  onChange={e => updateField('validez', e.target.value)}>
                  <option value="15 dias">15 dias</option>
                  <option value="30 dias">30 dias</option>
                  <option value="60 dias">60 dias</option>
                  <option value="90 dias">90 dias</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Plazo de Ejecucion</label>
                <input className={inputClass} value={invoice.plazoEjecucion || ''} onChange={e => updateField('plazoEjecucion', e.target.value)}
                  placeholder="Ej: 2 semanas, 1 mes..." />
              </div>
            </div>
            <div>
              <label className={labelClass}>Condiciones del Presupuesto</label>
              <textarea className={inputClass + ' h-24'} value={invoice.condiciones || ''} onChange={e => updateField('condiciones', e.target.value)}
                placeholder="Condiciones especificas de este presupuesto..." />
            </div>

            <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mt-4">Condiciones Comerciales</h2>
            <p className="text-xs text-gray-500">Estas condiciones aparecen en todos los presupuestos. Puedes editarlas para este presupuesto en particular.</p>
            <div>
              <textarea className={inputClass + ' h-64 text-xs leading-relaxed'} value={invoice.condicionesComerciales || ''} onChange={e => updateField('condicionesComerciales', e.target.value)} />
            </div>
          </div>
        )}

        {/* Vencimientos Tab */}
        {activeTab === 'vencimientos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-700">Vencimientos</h2>
              <button onClick={addVencimiento} className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition">
                <Plus size={14} /> Añadir vencimiento
              </button>
            </div>

            {invoice.vencimientos.map((v, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-3 items-end p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input type="date" className={inputClass} value={v.fecha} onChange={e => updateField(`vencimientos.${idx}.fecha`, e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Importe</label>
                  <input type="number" step="0.01" className={inputClass} value={v.importe} onChange={e => updateField(`vencimientos.${idx}.importe`, e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Domiciliación</label>
                  <input className={inputClass} value={v.domiciliacion} onChange={e => updateField(`vencimientos.${idx}.domiciliacion`, e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Nº Cuenta</label>
                  <input className={inputClass} value={v.numeroCuenta} onChange={e => updateField(`vencimientos.${idx}.numeroCuenta`, e.target.value)} />
                </div>
                <div>
                  {invoice.vencimientos.length > 1 && (
                    <button onClick={() => removeVencimiento(idx)} className="p-2 text-red-400 hover:text-red-600 transition">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPreview && (
        <InvoicePreviewModal invoice={invoice} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

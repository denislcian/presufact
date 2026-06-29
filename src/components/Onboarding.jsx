import { useState } from 'react';
import { FileText, Upload, Check, ArrowRight, Shield } from 'lucide-react';
import { DEFAULT_EMISOR, saveEmisorSettings } from '../db';
import { invalidateLogoCache } from '../utils/logoSvg';

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(1);
  const [emisor, setEmisor] = useState({ ...DEFAULT_EMISOR });
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setEmisor(prev => ({ ...prev, [k]: v }));

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { alert('El logo es muy grande (máx. 1,5 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => update('logo', reader.result);
    reader.readAsDataURL(file);
  };

  const canContinue = emisor.nombre.trim().length > 1;

  const finish = async () => {
    setSaving(true);
    await saveEmisorSettings(emisor);
    invalidateLogoCache();
    onDone();
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-gray-800">Presufact</span>
          </div>
          <p className="text-gray-500 text-sm">Facturas y presupuestos profesionales en tu navegador</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(n => (
              <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? 'bg-accent' : 'bg-gray-200'}`} />
            ))}
          </div>

          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Bienvenido 👋</h2>
              <p className="text-sm text-gray-500 mb-5">Configura los datos de tu empresa. Apareceran en tus facturas y presupuestos.</p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Nombre o razon social *</label>
                  <input className={inputClass} autoFocus value={emisor.nombre} onChange={e => update('nombre', e.target.value)} placeholder="Mi Empresa, S.L." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>NIF / CIF</label>
                    <input className={inputClass} value={emisor.nif} onChange={e => update('nif', e.target.value)} placeholder="B12345678" />
                  </div>
                  <div>
                    <label className={labelClass}>Actividad (opcional)</label>
                    <input className={inputClass} value={emisor.subtitulo} onChange={e => update('subtitulo', e.target.value)} placeholder="Reformas, consultoria..." />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Direccion</label>
                  <input className={inputClass} value={emisor.direccion} onChange={e => update('direccion', e.target.value)} placeholder="Calle Mayor 1" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>CP</label>
                    <input className={inputClass} value={emisor.cp} onChange={e => update('cp', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Ciudad</label>
                    <input className={inputClass} value={emisor.ciudad} onChange={e => update('ciudad', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Provincia</label>
                    <input className={inputClass} value={emisor.provincia} onChange={e => update('provincia', e.target.value)} />
                  </div>
                </div>
              </div>

              <button onClick={() => setStep(2)} disabled={!canContinue}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg font-medium transition disabled:opacity-40">
                Continuar <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Logo y cuenta bancaria</h2>
              <p className="text-sm text-gray-500 mb-5">Opcional, pero recomendado para un aspecto profesional. Puedes cambiarlo luego en Ajustes.</p>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Logo de la empresa</label>
                  <div className="flex items-center gap-4">
                    <div className="w-28 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                      {emisor.logo
                        ? <img src={emisor.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                        : <Upload size={20} className="text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm cursor-pointer transition">
                        <Upload size={14} /> Subir imagen
                        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogo} />
                      </label>
                      {emisor.logo && (
                        <button onClick={() => update('logo', null)} className="ml-2 text-xs text-red-500 hover:text-red-700">Quitar</button>
                      )}
                      <p className="text-xs text-gray-400 mt-1">PNG o JPG, máx. 1,5 MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>IBAN / Cuenta bancaria (opcional)</label>
                  <input className={inputClass + ' font-mono'} value={emisor.iban} onChange={e => update('iban', e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" />
                  <p className="text-xs text-gray-400 mt-1">Se añade automaticamente a tus facturas nuevas.</p>
                </div>

                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <Shield size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">Tus datos se guardan solo en este navegador. No se envia nada a ningun servidor.</p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition">
                  Atras
                </button>
                <button onClick={finish} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-lg font-medium transition disabled:opacity-50">
                  <Check size={16} /> {saving ? 'Guardando...' : 'Empezar a facturar'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Documentos generados como borrador/proforma · 100% local y privado
        </p>
      </div>
    </div>
  );
}

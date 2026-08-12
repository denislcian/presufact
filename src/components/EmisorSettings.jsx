import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Download, Upload, Shield, Clock, FolderOpen, History, HardDrive } from 'lucide-react';
import { getEmisorSettings, saveEmisorSettings, DEFAULT_EMISOR } from '../db';
import { invalidateLogoCache } from '../utils/logoSvg';
import { downloadBackup, importBackup, getLastBackupDate, hasLocalBackup, restoreFromLocalBackup, pickBackupFolder, getBackupFolderName, clearBackupFolder, listRecoverySources, autoBackup } from '../utils/backup';

export default function EmisorSettings() {
  const navigate = useNavigate();
  const [emisor, setEmisor] = useState(null);
  const [saved, setSaved] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [backupFolder, setBackupFolder] = useState(null);
  const [recoverySources, setRecoverySources] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    getEmisorSettings().then(setEmisor);
    getBackupFolderName().then(setBackupFolder).catch(() => {});
    setRecoverySources(listRecoverySources());
  }, []);

  if (!emisor) return null;

  const update = (key, value) => setEmisor(prev => ({ ...prev, [key]: value }));

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { alert('El logo es muy grande (máx. 1,5 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => update('logo', reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    await saveEmisorSettings(emisor);
    invalidateLogoCache();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => setEmisor({ ...DEFAULT_EMISOR });

  const handleExport = async () => {
    await downloadBackup();
    setBackupMsg('Backup descargado correctamente');
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importBackup(file);
      setBackupMsg(`Importadas ${result.imported} facturas (${result.skipped} duplicadas omitidas)`);
    } catch (err) {
      setBackupMsg('Error: ' + err.message);
    }
    setTimeout(() => setBackupMsg(''), 5000);
    e.target.value = '';
  };

  const handleRestoreLocal = async (slotKey) => {
    try {
      const result = await restoreFromLocalBackup(slotKey);
      setBackupMsg(`Restauradas ${result.imported} facturas (${result.skipped} ya existian)`);
    } catch (err) {
      setBackupMsg('Error: ' + err.message);
    }
    setTimeout(() => setBackupMsg(''), 5000);
  };

  const handlePickFolder = async () => {
    try {
      const name = await pickBackupFolder();
      setBackupFolder(name);
      await autoBackup(); // write first backup immediately
      setBackupMsg(`Carpeta "${name}" configurada. Backup guardado.`);
    } catch (err) {
      if (err.name !== 'AbortError') setBackupMsg('Error: ' + err.message);
    }
    setTimeout(() => setBackupMsg(''), 5000);
  };

  const handleClearFolder = async () => {
    await clearBackupFolder();
    setBackupFolder(null);
    setBackupMsg('Carpeta de backup desvinculada');
    setTimeout(() => setBackupMsg(''), 3000);
  };

  const lastBackup = getLastBackupDate();
  const lastBackupFormatted = lastBackup ? new Date(lastBackup).toLocaleString('es-ES') : null;

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none transition";
  const labelClass = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/app')} className="p-2 hover:bg-gray-200 rounded-lg transition"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-gray-800">Ajustes</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition text-sm">
            <RotateCcw size={14} /> Restaurar
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg transition text-sm font-medium">
            <Save size={14} /> {saved ? 'Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Datos del emisor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 border-b pb-2">Datos del Emisor</h2>
        <p className="text-sm text-gray-500">Estos datos se usaran por defecto al crear nuevas facturas.</p>

        {/* Logo */}
        <div className="flex items-center gap-4 pb-2">
          <div className="w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
            {emisor.logo
              ? <img src={emisor.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
              : <span className="text-xs text-gray-400">Sin logo</span>}
          </div>
          <div>
            <label className={labelClass}>Logo de la empresa</label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm cursor-pointer transition">
                <Upload size={14} /> Subir
                <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogo} />
              </label>
              {emisor.logo && (
                <button onClick={() => update('logo', null)} className="text-xs text-red-500 hover:text-red-700">Quitar</button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">PNG o JPG, máx. 1,5 MB. Aparece en el encabezado de tus documentos.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nombre / Razon Social</label>
            <input className={inputClass} value={emisor.nombre} onChange={e => update('nombre', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>NIF</label>
            <input className={inputClass} value={emisor.nif} onChange={e => update('nif', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Subtitulo</label>
            <input className={inputClass} value={emisor.subtitulo} onChange={e => update('subtitulo', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Direccion</label>
            <input className={inputClass} value={emisor.direccion} onChange={e => update('direccion', e.target.value)} />
          </div>
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
          <div>
            <label className={labelClass}>Web</label>
            <input className={inputClass} value={emisor.web} onChange={e => update('web', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Telefono</label>
            <input className={inputClass} value={emisor.telefono || ''} onChange={e => update('telefono', e.target.value)} placeholder="600 000 000" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" value={emisor.email || ''} onChange={e => update('email', e.target.value)} placeholder="hola@tuempresa.es" />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>IBAN / Cuenta bancaria</label>
            <input className={inputClass + ' font-mono'} value={emisor.iban || ''} onChange={e => update('iban', e.target.value)}
              placeholder="ES02 0049 3586 1921 1403 5991" />
            <p className="text-xs text-gray-400 mt-1">Se rellena automaticamente en las observaciones y vencimientos de cada nueva factura</p>
          </div>

          {/* Color de marca para los PDF */}
          <div className="col-span-2 border-t pt-4">
            <label className={labelClass}>Color de marca (PDF)</label>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="color" value={emisor.colorMarca || '#1a365d'}
                onChange={e => update('colorMarca', e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white" />
              {['#1a365d', '#0f766e', '#7c2d12', '#581c87', '#166534', '#b91c1c', '#334155', '#000000'].map(c => (
                <button key={c} onClick={() => update('colorMarca', c)}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    (emisor.colorMarca || '#1a365d').toLowerCase() === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Es el color de los titulos, lineas y el bloque del total en tus facturas y presupuestos en PDF.</p>
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-2 border-b pb-2">
          <Shield size={20} className="text-accent" />
          <h2 className="text-lg font-semibold text-gray-700">Copias de Seguridad</h2>
        </div>

        {lastBackupFormatted && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
            <Clock size={14} />
            <span>Ultimo backup: {lastBackupFormatted}</span>
          </div>
        )}

        {backupMsg && (
          <div className={`px-4 py-2 rounded-lg text-sm ${backupMsg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {backupMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {/* Export */}
          <button onClick={handleExport}
            className="flex items-center gap-3 w-full px-4 py-3 bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-xl transition text-left">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Download size={18} className="text-accent" />
            </div>
            <div>
              <div className="font-medium text-gray-800 text-sm">Descargar backup</div>
              <div className="text-xs text-gray-500">Exporta todas las facturas y ajustes como archivo JSON</div>
            </div>
          </button>

          {/* Import */}
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-3 w-full px-4 py-3 bg-purple-50/50 hover:bg-purple-50 border border-purple-200/50 rounded-xl transition text-left">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Upload size={18} className="text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-800 text-sm">Importar backup</div>
              <div className="text-xs text-gray-500">Restaura facturas desde un archivo JSON de backup</div>
            </div>
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

          {/* Restore from local */}
          {hasLocalBackup() && (
            <button onClick={() => handleRestoreLocal()}
              className="flex items-center gap-3 w-full px-4 py-3 bg-amber-50/50 hover:bg-amber-50 border border-amber-200/50 rounded-xl transition text-left">
              <div className="p-2 bg-amber-100 rounded-lg">
                <RotateCcw size={18} className="text-amber-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800 text-sm">Restaurar ultimo backup local</div>
                <div className="text-xs text-gray-500">Recupera datos del ultimo backup automatico ({lastBackupFormatted || 'disponible'})</div>
              </div>
            </button>
          )}
        </div>

        {/* Backup folder on disk */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-green-600" />
            <h3 className="text-sm font-semibold text-gray-700">Backup automatico en carpeta del disco</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Recomendado</span>
          </div>
          {backupFolder ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <FolderOpen size={16} />
                <span>Guardando en carpeta: <strong>{backupFolder}</strong></span>
              </div>
              <button onClick={handleClearFolder} className="text-xs text-red-500 hover:text-red-700 transition">Desvincular</button>
            </div>
          ) : (
            <button onClick={handlePickFolder}
              className="flex items-center gap-3 w-full px-4 py-3 bg-green-50/50 hover:bg-green-50 border border-green-200/50 rounded-xl transition text-left">
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderOpen size={18} className="text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-800 text-sm">Elegir carpeta de backup</div>
                <div className="text-xs text-gray-500">Cada cambio se guarda como archivo JSON real en tu disco. Sobrevive a limpiezas del navegador.</div>
              </div>
            </button>
          )}
          <div className="mt-3 flex items-start gap-2 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2.5">
            <span className="text-base leading-none mt-0.5">☁️</span>
            <p className="text-xs text-sky-800">
              <strong>Copia en tu nube, sin renunciar a la privacidad:</strong> elige una carpeta dentro de
              <strong> OneDrive</strong>, <strong>Google Drive</strong> o <strong>Dropbox</strong> y tu propio programa de
              sincronización subirá cada backup a tu nube automáticamente. Tus datos siguen sin pasar por ningún servidor
              de Presufact (no tenemos ninguno).
            </p>
          </div>
        </div>

        {/* Backup history */}
        {recoverySources.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Historial de backups (navegador)</h3>
            </div>
            <div className="space-y-2">
              {recoverySources.map(src => (
                <div key={src.key} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{src.label}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {src.count} docs · {src.date ? new Date(src.date).toLocaleString('es-ES') : 'sin fecha'}
                    </span>
                  </div>
                  <button onClick={() => handleRestoreLocal(src.key)}
                    className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          Se crea un backup automatico tras cada cambio (guardar, borrar, duplicar o importar). El sistema nunca sobrescribe un backup con datos por uno vacio.
        </p>
      </div>
    </div>
  );
}

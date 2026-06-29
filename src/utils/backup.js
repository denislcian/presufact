import { db } from '../db';

const LS_KEY = 'facturas-backup';
const LS_DATE_KEY = 'facturas-backup-date';
const LS_HISTORY_PREFIX = 'facturas-backup-h'; // h1..h5 rotating history
const HISTORY_SLOTS = 5;

export async function exportAllData() {
  const invoices = await db.invoices.toArray();
  const presupuestos = await db.presupuestos.toArray();
  const settings = await db.settings.toArray();
  return {
    version: 3,
    exportDate: new Date().toISOString(),
    invoices,
    presupuestos,
    settings
  };
}

function countDocs(data) {
  return (data?.invoices?.length || 0) + (data?.presupuestos?.length || 0);
}

function readBackupSlot(key) {
  try {
    const json = localStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Rotate history: h1 is newest. Called before overwriting the main backup.
function rotateHistory(currentJson) {
  try {
    for (let i = HISTORY_SLOTS - 1; i >= 1; i--) {
      const prev = localStorage.getItem(`${LS_HISTORY_PREFIX}${i}`);
      if (prev) localStorage.setItem(`${LS_HISTORY_PREFIX}${i + 1}`, prev);
    }
    localStorage.setItem(`${LS_HISTORY_PREFIX}1`, currentJson);
  } catch (e) {
    console.warn('History rotation failed:', e);
  }
}

// Core write with anti-data-loss guard:
// NEVER overwrite a backup that has documents with one that has fewer than 1
// (an empty DB state must not destroy the only good copy).
async function writeLocalBackup(data) {
  const json = JSON.stringify(data);
  const newCount = countDocs(data);
  const existing = readBackupSlot(LS_KEY);
  const existingCount = countDocs(existing);

  if (newCount === 0 && existingCount > 0) {
    console.warn('Backup skipped: refusing to overwrite non-empty backup with empty data');
    return false;
  }

  try {
    // Keep previous version in rotating history before overwriting
    const prevJson = localStorage.getItem(LS_KEY);
    if (prevJson && prevJson !== json) rotateHistory(prevJson);

    localStorage.setItem(LS_KEY, json);
    localStorage.setItem(LS_DATE_KEY, new Date().toISOString());
    return true;
  } catch (e) {
    console.warn('Could not save backup to localStorage:', e);
    return false;
  }
}

// ============ FILE SYSTEM BACKUP (real files on disk) ============

let dirHandleCache = null;

export async function pickBackupFolder() {
  if (!window.showDirectoryPicker) {
    throw new Error('Tu navegador no soporta guardado en carpeta. Usa Chrome, Edge u Opera.');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'facturalia-backup' });
  await db.settings.put({ key: 'backupDirHandle', value: handle });
  dirHandleCache = handle;
  return handle.name;
}

export async function getBackupFolderName() {
  const handle = await getDirHandle();
  return handle ? handle.name : null;
}

export async function clearBackupFolder() {
  await db.settings.delete('backupDirHandle');
  dirHandleCache = null;
}

async function getDirHandle() {
  if (dirHandleCache) return dirHandleCache;
  try {
    const s = await db.settings.get('backupDirHandle');
    if (s?.value) {
      dirHandleCache = s.value;
      return dirHandleCache;
    }
  } catch { /* ignore */ }
  return null;
}

async function ensurePermission(handle) {
  if (!handle?.queryPermission) return false;
  const opts = { mode: 'readwrite' };
  let perm = await handle.queryPermission(opts);
  if (perm === 'granted') return true;
  if (perm === 'prompt') {
    perm = await handle.requestPermission(opts);
    return perm === 'granted';
  }
  return false;
}

// Write backup to the chosen folder: a "latest" file + a daily file
async function writeFileBackup(data) {
  const handle = await getDirHandle();
  if (!handle) return false;
  try {
    if (!(await ensurePermission(handle))) return false;
    const json = JSON.stringify(data, null, 2);

    // Anti-data-loss guard for file too
    if (countDocs(data) === 0) {
      try {
        const existing = await handle.getFileHandle('facturalia-backup-latest.json');
        const file = await existing.getFile();
        const old = JSON.parse(await file.text());
        if (countDocs(old) > 0) {
          console.warn('File backup skipped: refusing to overwrite non-empty file backup with empty data');
          return false;
        }
      } catch { /* no existing file - ok to write */ }
    }

    const latest = await handle.getFileHandle('facturalia-backup-latest.json', { create: true });
    let w = await latest.createWritable();
    await w.write(json);
    await w.close();

    const dateStr = new Date().toISOString().split('T')[0];
    const daily = await handle.getFileHandle(`facturalia-backup-${dateStr}.json`, { create: true });
    w = await daily.createWritable();
    await w.write(json);
    await w.close();
    return true;
  } catch (e) {
    console.warn('File backup failed:', e);
    return false;
  }
}

// ============ PUBLIC API ============

// Called after EVERY data mutation (save/delete/duplicate/import)
export async function autoBackup() {
  try {
    const data = await exportAllData();
    await writeLocalBackup(data);
    await writeFileBackup(data); // no-op if no folder configured
  } catch (e) {
    console.warn('Auto-backup failed:', e);
  }
}

export async function downloadBackup() {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `facturalia-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  await writeLocalBackup(data);
}

export async function importBackup(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  let imported = 0;
  let skipped = 0;

  if (data.invoices && Array.isArray(data.invoices)) {
    for (const inv of data.invoices) {
      const { id, ...invoiceData } = inv;
      const existing = await db.invoices.where('invoiceNumber').equals(inv.invoiceNumber || '').first();
      if (existing) { skipped++; continue; }
      await db.invoices.add(invoiceData);
      imported++;
    }
  }

  if (data.presupuestos && Array.isArray(data.presupuestos)) {
    for (const pres of data.presupuestos) {
      const { id, ...presData } = pres;
      const existing = await db.presupuestos.where('invoiceNumber').equals(pres.invoiceNumber || '').first();
      if (existing) { skipped++; continue; }
      await db.presupuestos.add(presData);
      imported++;
    }
  }

  if (data.settings && Array.isArray(data.settings)) {
    for (const setting of data.settings) {
      // Never restore a stale dir handle over the current one
      if (setting.key === 'backupDirHandle') continue;
      await db.settings.put(setting);
    }
  }

  const totalDocs = countDocs(data);
  if (imported > 0) await autoBackup();
  return { imported, skipped, total: totalDocs };
}

export function getLastBackupDate() {
  return localStorage.getItem(LS_DATE_KEY);
}

export function hasLocalBackup() {
  const data = readBackupSlot(LS_KEY);
  return countDocs(data) > 0;
}

// List all available recovery sources (main + history) with doc counts
export function listRecoverySources() {
  const sources = [];
  const main = readBackupSlot(LS_KEY);
  if (countDocs(main) > 0) {
    sources.push({ key: LS_KEY, label: 'Backup principal', date: main.exportDate, count: countDocs(main) });
  }
  for (let i = 1; i <= HISTORY_SLOTS; i++) {
    const h = readBackupSlot(`${LS_HISTORY_PREFIX}${i}`);
    if (countDocs(h) > 0) {
      sources.push({ key: `${LS_HISTORY_PREFIX}${i}`, label: `Historial ${i}`, date: h.exportDate, count: countDocs(h) });
    }
  }
  return sources;
}

export async function restoreFromLocalBackup(slotKey = LS_KEY) {
  const json = localStorage.getItem(slotKey);
  if (!json) throw new Error('No hay backup local disponible');
  const blob = new Blob([json], { type: 'application/json' });
  const file = new File([blob], 'local-backup.json');
  return importBackup(file);
}

// Restore from a file in the configured backup folder
export async function restoreFromBackupFolder() {
  const handle = await getDirHandle();
  if (!handle) throw new Error('No hay carpeta de backup configurada');
  if (!(await ensurePermission(handle))) throw new Error('Sin permiso para leer la carpeta');
  const fileHandle = await handle.getFileHandle('facturalia-backup-latest.json');
  const file = await fileHandle.getFile();
  return importBackup(file);
}

// Logo helpers. The company logo is stored as a base64 data URL inside the
// emisor settings (configured by each company in Ajustes / onboarding).
// We read it lazily from IndexedDB so the preview and PDF can render it
// without threading it through every component.

import { db } from '../db';

let cachedLogo = undefined; // undefined = not loaded yet, null = no logo

async function loadEmisorLogo() {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const s = await db.settings.get('emisor');
    cachedLogo = (s && s.value && s.value.logo) ? s.value.logo : null;
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}

// Invalidate cache when the logo changes (called from Ajustes after saving)
export function invalidateLogoCache() {
  cachedLogo = undefined;
}

// Returns a data URL for the logo, or null if none configured.
// Prefer passing the emisor directly so the logo travels with the document.
export function getLogoDataUrl(emisor) {
  if (emisor && 'logo' in emisor) return emisor.logo || null;
  return cachedLogo || null;
}

// Async variant for the PDF generator (returns base64 PNG/JPEG data URL or null)
export async function getLogoBase64(emisor) {
  if (emisor && 'logo' in emisor) return emisor.logo || null;
  return await loadEmisorLogo();
}

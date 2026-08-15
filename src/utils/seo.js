// Metadatos por pagina en una SPA: titulo, descripcion, canonical y Open Graph.
// index.html trae los de la home; cada pagina publica los ajusta al montar y
// los restaura al salir (si no, todas las rutas declaran la home como canonica).
const ORIGIN = 'https://presufactu.vercel.app';
export const DEFAULT_TITLE = 'Presufact — Presupuestos y facturas en PDF gratis, sin registro';
const DEFAULT_DESC = 'Generador de presupuestos y facturas online gratis y sin registro. Presupuestos con firma del cliente, PDF con IVA e IRPF y tu logo. 100% local: tus datos nunca salen de tu navegador.';

function setMeta(selector, attr, value) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

export function setPageMeta({ title, description, path = '/' } = {}) {
  const t = title || DEFAULT_TITLE;
  const d = description || DEFAULT_DESC;
  const url = ORIGIN + (path === '/' ? '/' : path);
  document.title = t;
  setMeta('meta[name="description"]', 'content', d);
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:title"]', 'content', t);
  setMeta('meta[property="og:description"]', 'content', d);
  setMeta('meta[name="twitter:title"]', 'content', t);
  setMeta('meta[name="twitter:description"]', 'content', d);
}

export function resetPageMeta() {
  setPageMeta({});
}

// Siguiente numero de una serie. Reglas:
// - Se toma el sufijo NUMERICO (el orden lexicografico falla con longitudes
//   distintas; numeros libres como "FA-2026-01" nunca deben dar "NaN").
// - Las rectificativas (serie R-) llevan contador propio y no cuentan.
// - La serie "activa" es la del PREFIJO del documento mas reciente (por fecha):
//   con facturas 2025-0041 y 2026-0009, el siguiente es 2026-0010, no 2025-0043.
// - Si el prefijo lleva un ano y no es el actual, se abre serie nueva con el
//   ano en curso (cada enero: 2027-0001).
export function nextNumberFrom(docs, defaultNumber) {
  const parsed = [];
  for (const doc of docs) {
    const raw = String(doc.invoiceNumber || '');
    if (/^R-/.test(raw)) continue;
    const m = raw.match(/(\d+)\s*$/);
    if (!m) continue;
    parsed.push({
      raw, digits: m[1], n: parseInt(m[1], 10),
      prefix: raw.slice(0, raw.length - m[1].length),
      when: doc.date || (doc.createdAt || '').slice(0, 10) || '',
    });
  }
  if (!parsed.length) return defaultNumber;

  // Serie activa = prefijo del documento mas reciente (empate: numero mayor)
  const latest = parsed.reduce((a, b) => (b.when > a.when || (b.when === a.when && b.n > a.n)) ? b : a);
  let prefix = latest.prefix;
  let digits = latest.digits.length;

  // Prefijo con ano (2025-, P-2025-, FA2025/...): al cambiar de ano, serie nueva
  const yearNow = String(new Date().getFullYear());
  const yearInPrefix = prefix.match(/(?:^|\D)(20\d{2})(?!\d)/);
  if (yearInPrefix && yearInPrefix[1] !== yearNow) {
    prefix = prefix.replace(yearInPrefix[1], yearNow);
    const yaHay = parsed.filter(p => p.prefix === prefix);
    if (!yaHay.length) return prefix + String(1).padStart(digits, '0');
  }

  const serie = parsed.filter(p => p.prefix === prefix);
  const max = Math.max(...serie.map(p => p.n));
  digits = serie.find(p => p.n === max).digits.length;
  return prefix + String(max + 1).padStart(digits, '0');
}

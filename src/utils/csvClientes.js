// Importador de clientes desde CSV (el export tipico de Billin, Contasimple,
// Holded, FacturaDirecta o un Excel guardado como CSV). Detecta separador,
// codificacion y columnas por sus cabeceras en espanol.

function detectSeparator(firstLine) {
  const counts = [[';', 0], [',', 0], ['\t', 0]].map(([s]) => [s, firstLine.split(s).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ';';
}

// Parser CSV con soporte de comillas (campos con separadores o saltos dentro)
export function parseCSV(text, sep) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(f => f.trim() !== '')) rows.push(row);
  return rows;
}

// Mapeo de cabeceras -> campos de cliente (cubre los nombres de columna
// habituales de los programas espanoles)
const HEADER_MAP = [
  ['nombre', /^(nombre|razon\s*social|razón\s*social|cliente|name|nombre\s*fiscal|nombre\s*comercial|denominaci)/i],
  ['nif', /^(nif|cif|dni|nif\/cif|cif\/nif|vat|tax\s*id|documento)/i],
  ['email', /^(e-?mail|correo)/i],
  ['telefono', /^(tel|phone|movil|móvil)/i],
  ['direccion', /^(direccion|dirección|domicilio|address|calle)/i],
  ['cp', /^(cp|c\.p|codigo\s*postal|código\s*postal|zip|postal)/i],
  ['ciudad', /^(ciudad|poblacion|población|localidad|municipio|city)/i],
  ['provincia', /^(provincia|region|región|state)/i],
];

export function mapHeaders(headerRow) {
  const mapping = {}; // indice de columna -> campo
  headerRow.forEach((h, idx) => {
    const clean = String(h || '').trim();
    if (!clean) return;
    for (const [field, re] of HEADER_MAP) {
      if (re.test(clean) && !Object.values(mapping).includes(field)) {
        mapping[idx] = field;
        break;
      }
    }
  });
  return mapping;
}

// Devuelve { clientes, columnasDetectadas, total } listos para revisar
export function parseClientesCSV(text) {
  // BOM de Excel
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const firstLine = text.split(/\r?\n/)[0] || '';
  const sep = detectSeparator(firstLine);
  const rows = parseCSV(text, sep);
  if (rows.length < 2) return { clientes: [], columnasDetectadas: [], total: 0 };

  const mapping = mapHeaders(rows[0]);
  const campos = Object.values(mapping);
  if (!campos.includes('nombre')) {
    // sin cabecera reconocible: asumir primera columna = nombre
    mapping[0] = 'nombre';
  }

  const clientes = [];
  for (const row of rows.slice(1)) {
    const c = {};
    for (const [idx, field] of Object.entries(mapping)) {
      const v = String(row[idx] || '').trim();
      if (v) c[field] = v;
    }
    if (c.nombre && c.nombre.length > 1) clientes.push(c);
  }
  return { clientes, columnasDetectadas: Object.values(mapping), total: clientes.length };
}

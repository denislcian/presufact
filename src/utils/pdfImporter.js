import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items by Y position (same row in a table)
    const rows = {};
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const yKey = Math.round(item.transform[5] * 0.5) * 2;
      if (!rows[yKey]) rows[yKey] = [];
      rows[yKey].push({ x: item.transform[4], text: item.str.trim() });
    }

    const sortedYs = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const yKey of sortedYs) {
      const items = rows[yKey].sort((a, b) => a.x - b.x);
      const lineText = items.map(it => it.text).join(' ');
      if (lineText.trim()) allLines.push(lineText.trim());
    }
  }

  return allLines.join('\n');
}

function parseSpNum(str) {
  if (!str) return 0;
  // Handle: "1.234,56" (es), "1,234.56" (en), "1234.56", "1234,56"
  const s = String(str).trim();
  // Spanish format with thousands dot and decimal comma
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  // Spanish without thousands
  if (/^\d+,\d{2}$/.test(s)) {
    return parseFloat(s.replace(',', '.'));
  }
  // Plain number with dot decimal
  return parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
}

// Convert a JS number to Spanish format string (e.g., 16179.58 -> "16179,58")
function numberToSpanishStr(num) {
  if (typeof num !== 'number' || isNaN(num)) return '';
  return num.toString().replace('.', ',');
}

function normalizeUnit(u) {
  if (!u) return null;
  const x = u.toLowerCase();
  if (x === 'm²' || x === 'm2') return 'm2';
  if (['ml', 'ud', 'h', 'pack'].includes(x)) return x;
  return null;
}

function guessUnit(descripcion) {
  const desc = (descripcion || '').toLowerCase();
  if (/trasdosado|tabique|falso techo|techo|pared|fachada|aislamiento|panel|placa|suelo|pavimento|solado|alicatado|enfoscado|guarnecido|revestimiento/i.test(desc)) return 'm2';
  if (/canal|tuber[ií]a|cornisa|rodapi[eé]|canal[oó]n|bajante|linear|per[ií]metro|z[oó]calo|junta|conducto/i.test(desc)) return 'ml';
  if (/horas|hora\s|trabajos de|administracion/i.test(desc)) return 'h';
  return 'ud';
}

const SKIP_WORDS = ['DOCUMENTO', 'ARTICULO', 'DESCRIPCION', 'TIPO', 'IMPORTE', 'VENCIMIENTO', 'OBSERVACION', 'TOTAL', 'TRANSFERENCIA', 'NUMERO', 'PAGINA', 'FECHA', 'FORMA', 'AGENTE', 'DESCUENTO', 'PRONTO', 'PORTES', 'FINANCIACION', 'BASE', 'OPERACION', 'CONFORME', 'TRABAJOS REALIZADOS', 'SUBTOTAL', 'IVA', 'NIF:', 'CALLE LENA', 'AISLAMIENTOS Y MONTAJES', 'DUMASTUR'];

function isSkipLine(desc) {
  const upper = desc.toUpperCase().trim();
  if (upper.length < 3) return true;
  return SKIP_WORDS.some(w => upper.startsWith(w));
}

// Detect deduction-style line: "FACTURA X - 26XXX DEL DD DE MONTH DE YEAR ... 1,00 -X,XX -X,XX -X,XX"
function tryParseDeductionLine(line) {
  // Strict pattern: text + "1,00" + first negative + more negatives
  const m = line.match(/^(.+?)\s+1[,.]00\s+-([\d.,]+)\s+-([\d.,]+)/);
  if (!m) return null;
  const desc = m[1].trim();
  // Filter only lines that mention a FACTURA reference or are clearly deductions
  if (!/FACTURA|deduc|abono|anticipo/i.test(desc)) return null;
  const importe = parseSpNum(m[2]);
  if (importe <= 0) return null;
  return { descripcion: desc, importe };
}

// Try combining with next line (for deduction descriptions split across lines)
function tryParseDeductionMultiline(line, nextLine) {
  // If current line is mostly text "FACTURA X - YYY DEL ..." and next has numbers
  if (!/FACTURA|deduc|abono|anticipo/i.test(line)) return null;
  if (!nextLine) return null;
  // Combine and try
  const combined = (line + ' ' + nextLine).replace(/\s+/g, ' ').trim();
  return tryParseDeductionLine(combined);
}

export function parseInvoiceText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Detect document type
  const upperText = text.toUpperCase();
  const isPresupuesto = /^\s*PRESUPUESTO/im.test(upperText) || (/PRESUPUESTO/.test(upperText) && !/^FACTURA/m.test(upperText));
  const docType = isPresupuesto ? 'presupuesto' : 'factura';

  const invoice = {
    documentType: isPresupuesto ? 'Presupuesto' : 'Factura',
    _detectedType: docType,
    invoiceNumber: '',
    page: '1',
    date: new Date().toISOString().split('T')[0],
    emisor: { nombre: '', subtitulo: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', web: '', codigoBarras: '' },
    cliente: { nombre: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', agente: '' },
    formaPago: '',
    descripcionTrabajo: '',
    descripcionObra: '',
    lineas: [],
    iva: { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false },
    deducciones: [],
    observaciones: '',
    vencimientos: [{ fecha: '', importe: '', domiciliacion: '', oficina: '', numeroCuenta: '' }]
  };

  // === HEADER: Document number + page + date ===
  // Try the standard row "Factura 260042 1 20/05/2026"
  const docRowMatch = text.match(/(?:Factura|Presupuesto)\s+([\w-]+)\s+(\d{1,2})\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (docRowMatch) {
    invoice.invoiceNumber = docRowMatch[1];
    invoice.page = docRowMatch[2];
    const [d, m, y] = docRowMatch[3].split('/');
    invoice.date = `${y}-${m}-${d}`;
  } else {
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('/');
      invoice.date = `${y}-${m}-${d}`;
    }
    const numMatch = text.match(/\b(2[56]\d{4}|P-\d{4})\b/);
    if (numMatch) invoice.invoiceNumber = numMatch[1];
  }

  // === NIFs ===
  // "NIF: B12345678" format first, then standalone
  const nifLabeled = text.match(/NIF:\s*([A-Z]\d{7,8}[A-Z0-9]?)/);
  if (nifLabeled) invoice.cliente.nif = nifLabeled[1];
  const allNifs = [...new Set((text.match(/[A-Z]\d{7,8}[A-Z0-9]?/g) || []))];
  // Filter out emisor NIF (B19750967) from client candidates
  const emisorNif = 'B19750967';
  const clientNifCandidates = allNifs.filter(n => n !== emisorNif);
  if (!invoice.cliente.nif && clientNifCandidates.length > 0) {
    invoice.cliente.nif = clientNifCandidates[0];
  }
  invoice.emisor.nif = emisorNif;

  // === Client name ===
  // Search in first 15 lines, looking for company-like name (not the emisor)
  // Accept: "S.L.", "S.A.", "SL", "SA", "SCP", "SLU" etc, OR a clearly-uppercase business name
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i];
    if (/DUMASTUR|AISLAMIENTOS|MONTAJES|TODO TIPO/i.test(line)) continue;
    if (/DOCUMENTO|ARTICULO|TIPO|IMPORTE|NUMERO|PAGINA|FECHA|NIF:/i.test(line)) continue;
    if (line.length < 4 || line.length > 100) continue;
    // Match: "XXXXX SL", "XXX S.L.", "XXX SLU", etc.
    if (/\b(S\.?\s*L\.?\s*U?\.?|S\.?\s*A\.?|S\.?\s*C\.?\s*P\.?|C\.?\s*B\.?)\b/i.test(line)) {
      invoice.cliente.nombre = line.trim();
      break;
    }
    // Match: all-caps company-like name longer than 10 chars
    if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,.\d-]{8,}$/.test(line) && !line.match(/\d{5}/)) {
      invoice.cliente.nombre = line.trim();
      break;
    }
  }

  // === Client address ===
  // Look for CALLE/AVDA/AVENIDA/PLAZA + street name (not the emisor's)
  const addressRegex = /(?:CALLE|C\/|AVDA\.?|AVENIDA|PLAZA|PZA\.?|RONDA|PASEO|TRAVESIA)\s+[^\n]+/i;
  for (const line of lines) {
    if (/LENA/i.test(line)) continue; // emisor's street
    const m = line.match(addressRegex);
    if (m) {
      invoice.cliente.direccion = m[0].trim();
      break;
    }
  }

  // === CP + City ===
  for (const line of lines) {
    if (/33006/.test(line)) continue; // emisor's CP
    const m = line.match(/(\d{5})\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+)/);
    if (m) {
      invoice.cliente.cp = m[1];
      invoice.cliente.ciudad = m[2].trim();
      break;
    }
  }

  // === Provincia ===
  const PROVINCES = ['ASTURIAS', 'MADRID', 'BARCELONA', 'VALENCIA', 'CANTABRIA', 'LEON', 'GALICIA', 'SEVILLA', 'VIZCAYA', 'GUIPUZCOA', 'NAVARRA', 'ARAGON', 'BURGOS', 'VALLADOLID', 'A CORUÑA', 'A CORUNA', 'LA CORUÑA', 'PONTEVEDRA', 'LUGO', 'OURENSE', 'BIZKAIA', 'GIPUZKOA', 'ARABA', 'ALAVA', 'TOLEDO', 'MALAGA', 'CADIZ', 'CORDOBA', 'GRANADA', 'HUELVA', 'JAEN', 'ALMERIA', 'MURCIA', 'ALICANTE', 'CASTELLON', 'TERUEL', 'HUESCA', 'ZARAGOZA', 'TARRAGONA', 'LERIDA', 'LLEIDA', 'GIRONA', 'GERONA', 'BALEARES', 'CACERES', 'BADAJOZ', 'CIUDAD REAL', 'CUENCA', 'GUADALAJARA', 'AVILA', 'SALAMANCA', 'ZAMORA', 'PALENCIA', 'SORIA', 'SEGOVIA', 'LA RIOJA', 'CANARIAS', 'LAS PALMAS', 'TENERIFE'];
  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();
    if (PROVINCES.includes(trimmed)) {
      invoice.cliente.provincia = trimmed;
      break;
    }
  }

  // === Forma de pago ===
  const fpagoMatch = text.match(/TRANSFERENCIA\s+BANCARIA[^\n]*RECEPCION[^\n]*/i);
  if (fpagoMatch) invoice.formaPago = fpagoMatch[0].trim();
  else if (isPresupuesto) invoice.formaPago = '';
  else invoice.formaPago = 'TRANSFERENCIA BANCARIA A LA RECEPCION DE LA FACTURA';

  // === Descripcion del trabajo / obra ===
  const trabajoMatch = text.match(/TRABAJOS\s+REALIZADOS[^\n]*/i);
  if (trabajoMatch) {
    let desc = trabajoMatch[0].trim();
    const idx = lines.findIndex(l => l.includes('TRABAJOS REALIZADOS'));
    if (idx >= 0 && idx + 1 < lines.length) {
      const next = lines[idx + 1];
      // If next line is a continuation (no numbers like quantities/prices)
      if (/^[A-ZÁÉÍÓÚÑ"'°]/.test(next) && !/\d+[,.]\d{2}/.test(next) && !/^[A-Z\s]{3,}\s+m[²2]/i.test(next) && next.length < 80) {
        desc += ' ' + next;
      }
    }
    if (isPresupuesto) invoice.descripcionObra = desc;
    else invoice.descripcionTrabajo = desc;
  }

  // === LINE ITEMS ===
  // Multi-pattern approach. We process lines in order, supporting continuations.
  const cleanLines = lines.map(l => l.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim());

  // Regexes:
  // Pattern A: "DESC unit N N [N [N [N N]]]" - line with unit label (allows digits in description)
  const reWithUnit = /^(.{3,}?)\s+(m[²2]|ml|ud|h|pack)\s+(\d[\d.,]*)\s+(\d[\d.,]*)(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?$/i;
  // Pattern B: "DESC N N N N" - line without unit but with numbers
  const reNoUnit = /^([^\d]{3,}?)\s+(\d[\d.,]*)\s+(\d[\d.,]*)\s+(\d[\d.,]*)(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?$/;
  // Pattern C: "DESC" - text-only line (potential start of multi-line description)
  const reTextOnly = /^[A-ZÁÉÍÓÚÑa-záéíóúñ"'(][\w\sÁÉÍÓÚÑáéíóúñ"',.()\-:]{2,}$/;

  function isSpNumStr(s) {
    return /^-?\d[\d.,]*\d$/.test(String(s).trim()) && /[,.]/.test(s);
  }

  const seenLineKeys = new Set();

  // Helper to add a line item with dedup
  function pushLine(desc, cant, precio, unidad, dto) {
    const key = `${desc.trim()}|${cant}|${precio}`;
    if (seenLineKeys.has(key)) return false;
    seenLineKeys.add(key);
    invoice.lineas.push({
      articulo: '', descripcion: desc.trim(),
      cantidad: String(cant), precioUd: String(precio),
      dto: dto || '', unidad: unidad || guessUnit(desc)
    });
    return true;
  }

  // Helper: try to parse a line as a line item, returns parsed info or null
  function parseLineItem(line) {
    if (!line) return null;
    // Try Pattern A (with unit)
    let m = line.match(reWithUnit);
    if (m && !isSkipLine(m[1])) {
      const cant = parseSpNum(m[3]);
      const precio = parseSpNum(m[4]);
      const nums = [m[5], m[6], m[7], m[8]].filter(Boolean).map(parseSpNum);
      let dto = '';
      if (nums.length === 3 && nums[1] > 0 && nums[1] < 100) dto = String(nums[1]);
      if (cant > 0 && precio > 0) {
        return { desc: m[1].trim(), unidad: normalizeUnit(m[2]), cant, precio, dto };
      }
    }
    // Try Pattern B (no unit)
    m = line.match(reNoUnit);
    if (m && !isSkipLine(m[1])) {
      const cant = parseSpNum(m[2]);
      const precio = parseSpNum(m[3]);
      if (cant > 0 && cant < 100000 && precio > 0 && precio < 1000000 && m[1].trim().length >= 3) {
        return { desc: m[1].trim(), unidad: null, cant, precio, dto: '' };
      }
    }
    return null;
  }

  // First pass: identify which lines have numbers and which are text-only
  // Then: text-only lines that come AFTER a numbered line are continuations of the previous
  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

    // Deductions (single-line and multi-line)
    let ded = tryParseDeductionLine(line);
    if (ded) {
      invoice.deducciones.push({ manual: true, descripcion: ded.descripcion, importe: numberToSpanishStr(ded.importe) });
      continue;
    }
    if (/FACTURA|deduc|abono|anticipo/i.test(line) && i + 1 < cleanLines.length) {
      const combinedDed = tryParseDeductionMultiline(line, cleanLines[i + 1]);
      if (combinedDed) {
        invoice.deducciones.push({ manual: true, descripcion: combinedDed.descripcion, importe: numberToSpanishStr(combinedDed.importe) });
        i++;
        continue;
      }
    }

    // Try to parse as line item
    const parsed = parseLineItem(line);
    if (parsed) {
      pushLine(parsed.desc, parsed.cant, parsed.precio, parsed.unidad, parsed.dto);
      // Look ahead: if next line is text-only (no numbers, not a new line item, not a section header),
      // it's a continuation of the description (but only short continuations - not standalone concepts)
      while (i + 1 < cleanLines.length) {
        const nextLine = cleanLines[i + 1];
        // Stop conditions
        if (!nextLine) break;
        if (parseLineItem(nextLine)) break; // next is a real line item
        if (tryParseDeductionLine(nextLine)) break; // next is a deduction
        if (/^(OBSERVACION|TOTAL|VENCIMIENTO|SUBTOTAL|BASE|IVA|FACTURA|DEDUC|TRANSFERENCIA|ES\d{2}|TIPO\s|N\.I\.F\.|DOCUMENTO|ARTICULO|TRABAJOS REALIZADOS)/i.test(nextLine)) break;
        if (/\d+[,.]\d{2}/.test(nextLine)) break; // contains numbers - not a continuation
        if (!/^[A-ZÁÉÍÓÚÑa-záéíóúñ"'(]/.test(nextLine)) break;
        // Continuation heuristic: must be short (typically partial sentence)
        // If line is long (>30 chars) AND looks like an independent concept (starts with common construction noun), skip
        if (nextLine.length > 20 && /^(FALSO\s+TECHO|TRASDOSADO|TABIQUE|AISLAMIENTO|PARED|FACHADA|SUELO|PAVIMENTO|REVESTIMIENTO|HORAS|TRABAJOS|PINTURA|CUBIERTA|CHAPADO|ENFOSCADO|GUARNECIDO)/i.test(nextLine)) break;
        if (nextLine.length > 60) break;
        // Looks like a continuation - append to last line's description
        const lastLine = invoice.lineas[invoice.lineas.length - 1];
        if (lastLine) {
          lastLine.descripcion = (lastLine.descripcion + ' ' + nextLine).trim();
        }
        i++;
      }
      continue;
    }
  }

  if (invoice.lineas.length === 0) {
    invoice.lineas.push({ articulo: '', descripcion: '', cantidad: '', precioUd: '', dto: '', unidad: 'ud' });
  }

  // === Inversion sujeto pasivo ===
  if (/sujeto\s+pasivo/i.test(text) || /inversion del sujeto/i.test(text)) {
    invoice.iva.inversionSujetoPasivo = true;
  }

  // === Observaciones ===
  const obsIdx = lines.findIndex(l => /^OBSERVACIONES?$/i.test(l.trim()));
  if (obsIdx >= 0 && obsIdx + 1 < lines.length) {
    const obsLines = [];
    for (let j = obsIdx + 1; j < lines.length && j < obsIdx + 4; j++) {
      const l = lines[j];
      if (/^(Subtotal|Base|IVA|TOTAL|VENCIMIENTOS|DEDUCCIONES)/i.test(l)) break;
      if (!/^ES\d{2}/.test(l) || obsLines.length === 0) obsLines.push(l);
      else obsLines.push(l);
    }
    invoice.observaciones = obsLines.join('\n').trim();
  }

  // === IBAN ===
  const ibanMatch = text.match(/ES\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/);
  if (ibanMatch) {
    if (!invoice.observaciones.includes(ibanMatch[0])) {
      invoice.observaciones = (invoice.observaciones ? invoice.observaciones + '\n' : '') + ibanMatch[0];
    }
    invoice.vencimientos[0].numeroCuenta = ibanMatch[0];
  }

  // === IVA percentage ===
  const ivaPctMatch = text.match(/IVA\s*\((\d{1,2})%\)/);
  if (ivaPctMatch) {
    invoice.iva.tipo = parseInt(ivaPctMatch[1]);
  }

  // === Vencimientos ===
  // Pattern: "DD/MM/YYYY  amount" near "VENCIMIENTOS" section
  const vencSectionIdx = lines.findIndex(l => /^VENCIMIENTOS\b/i.test(l));
  if (vencSectionIdx >= 0) {
    for (let j = vencSectionIdx + 1; j < lines.length; j++) {
      const l = lines[j];
      const m = l.match(/^(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)/);
      if (m) {
        const [d, mo, y] = m[1].split('/');
        invoice.vencimientos[0].fecha = `${y}-${mo}-${d}`;
        invoice.vencimientos[0].importe = String(parseSpNum(m[2]));
        // Try to find IBAN on same line
        const ibanInLine = l.match(/ES\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/);
        if (ibanInLine) invoice.vencimientos[0].numeroCuenta = ibanInLine[0];
        break;
      }
    }
  } else if (invoice.date) {
    invoice.vencimientos[0].fecha = invoice.date;
  }

  // === Web ===
  const webMatch = text.match(/www\.\S+/i);
  if (webMatch) invoice.emisor.web = webMatch[0].trim();

  return invoice;
}

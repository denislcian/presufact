import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

// ============================================================
// Extraccion: items posicionados (x, y, right, scale) por pagina
// ============================================================

// Los textos con tracking (charSpace) llegan de pdfjs partidos por palabra:
// "FORMA DE PAGO" -> "F O R M A" + "D E" + "P A G O". Este paso re-une los
// trozos contiguos de la misma banda Y cuyos tokens son todos de 1 caracter.
function mergeSpacedLabels(items) {
  const isSpaced = (s) => s.split(/\s+/).every(t => t.length === 1);
  const sorted = [...items].sort((a, b) => (Math.abs(b.y - a.y) > 1.5 ? b.y - a.y : a.x - b.x));
  const out = [];
  for (const it of sorted) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.y - it.y) <= 1.5 && isSpaced(prev.str) && isSpaced(it.str) &&
        (it.x - prev.right) < 20 && (it.x - prev.right) > -2) {
      prev.str = prev.str + ' ' + it.str;
      prev.right = it.right;
      prev.scale = Math.max(prev.scale, it.scale);
      continue;
    }
    out.push({ ...it });
  }
  return out;
}

async function extractPositionedItems(file) {
  const arrayBuffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: arrayBuffer });
  const pages = [];
  try {
    const pdf = await task.promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = [];
      for (const item of content.items) {
        const str = item.str.trim();
        if (!str) continue;
        items.push({
          str,
          x: item.transform[4],
          y: item.transform[5],
          right: item.transform[4] + (item.width || 0),
          scale: Math.abs(item.transform[0]) || 0
        });
      }
      pages.push(mergeSpacedLabels(items));
    }
  } finally {
    // pdf.js 6 crea un worker por documento: liberarlo (importaciones multiples)
    try { await task.destroy(); } catch { /* ya liberado */ }
  }
  return pages;
}

// Reconstruye texto plano agrupando por Y (para el parser generico y el "ver texto extraido")
function pagesToText(pages) {
  const allLines = [];
  for (const items of pages) {
    const rows = {};
    for (const it of items) {
      const yKey = Math.round(it.y * 0.5) * 2;
      if (!rows[yKey]) rows[yKey] = [];
      rows[yKey].push(it);
    }
    const sortedYs = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const yKey of sortedYs) {
      const line = rows[yKey].sort((a, b) => a.x - b.x).map(it => it.str).join(' ');
      if (line.trim()) allLines.push(line.trim());
    }
  }
  return allLines.join('\n');
}

export async function extractTextFromPDF(file) {
  const pages = await extractPositionedItems(file);
  return pagesToText(pages);
}

// ============================================================
// Utilidades numericas / texto
// ============================================================

function parseSpNum(str) {
  if (!str) return 0;
  const s = String(str).trim();
  if (/^-?\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  if (/^-?\d+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(',', '.'));
  }
  return parseFloat(s.replace(/[^\d.-]/g, '')) || 0;
}

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

function spanishDateToISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}

function emptyInvoice(isPresupuesto) {
  return {
    documentType: isPresupuesto ? 'Presupuesto' : 'Factura',
    _detectedType: isPresupuesto ? 'presupuesto' : 'factura',
    invoiceNumber: '',
    page: '1',
    date: new Date().toISOString().split('T')[0],
    emisor: { nombre: '', subtitulo: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', web: '', codigoBarras: '' },
    cliente: { nombre: '', nif: '', direccion: '', cp: '', ciudad: '', provincia: '', agente: '' },
    formaPago: '',
    descripcionTrabajo: '',
    descripcionObra: '',
    lineas: [],
    iva: { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false, irpf: 0 },
    deducciones: [],
    observaciones: '',
    vencimientos: [{ fecha: '', importe: '', domiciliacion: '', oficina: '', numeroCuenta: '' }]
  };
}

// ============================================================
// Parser posicional para PDFs generados por Presufact
// (layout "suizo editorial": anclajes de columna fijos en mm)
// ============================================================

const PT = 2.83465; // mm -> pt
const V2 = {
  X_LEFT: 18 * PT,        // 51.02
  QTY_R: 116 * PT,        // 328.82  (tambien x de la columna derecha de cabecera y del resumen)
  PRICE_R: 140 * PT,      // 396.85
  DTO_R: 156 * PT,        // 442.20
  TOTAL_R: 192 * PT,      // 544.25
  VENC_IMP_R: 70 * PT,    // 198.43
  VENC_DOM_X: 80 * PT,    // 226.77
  VENC_OFI_X: 122 * PT,   // 345.83
  VENC_CTA_X: 148 * PT,   // 419.53
  FOOTER_Y: 60            // por debajo de esta y (pt) esta el pie: se ignora
};
const TOL = 3.5;

const near = (a, b) => Math.abs(a - b) <= TOL;
const isNumStr = (s) => /^-?[\d.,]+$/.test(s) && /\d/.test(s);
// Las etiquetas del PDF llevan charSpace (tracking): pdfjs las devuelve como
// "F A C T U R A R A". Se comparan siempre sin espacios.
const norm = (s) => String(s).replace(/\s+/g, '').toUpperCase();
const isLabel = (it, ...labels) => labels.some(l => norm(it.str) === norm(l));

export function looksLikePresufactPDF(pages) {
  const first = pages[0] || [];
  const hasParty = first.some(it => isLabel(it, 'FACTURAR A', 'PRESUPUESTO PARA'));
  const hasHead = first.some(it => isLabel(it, 'CONCEPTO') && near(it.x, V2.X_LEFT));
  const hasImporte = first.some(it => isLabel(it, 'IMPORTE'));
  return hasParty && hasHead && hasImporte;
}

export function parsePresufactPDF(pages) {
  const first = pages[0].filter(it => it.y > V2.FOOTER_Y);
  const kicker = first.find(it => isLabel(it, 'FACTURA', 'PRESUPUESTO') && it.x > 250);
  const isPresupuesto = kicker ? norm(kicker.str) === 'PRESUPUESTO' : first.some(it => isLabel(it, 'PRESUPUESTO PARA'));
  const invoice = emptyInvoice(isPresupuesto);

  const below = (items, label, xFilter) =>
    items.filter(it => it.y < label.y - 1 && (!xFilter || xFilter(it))).sort((a, b) => b.y - a.y);

  // --- Numero: el item de mayor tamano bajo el kicker (hero 14-20pt) ---
  if (kicker) {
    const hero = below(first, kicker, it => it.x > 250 && it.scale >= 12)[0];
    if (hero) invoice.invoiceNumber = hero.str;
  }

  // --- Fecha ---
  const fechaLabel = first.find(it => isLabel(it, 'FECHA') && it.x > 250);
  if (fechaLabel) {
    const val = below(first, fechaLabel, it => it.x > 250 && /^\d{2}\/\d{2}\/\d{4}$/.test(it.str))[0];
    if (val) invoice.date = spanishDateToISO(val.str);
  }

  // --- Cliente (bloque bajo FACTURAR A / PRESUPUESTO PARA) ---
  const partyLabel = first.find(it => isLabel(it, 'FACTURAR A', 'PRESUPUESTO PARA'));
  if (partyLabel) {
    // limite inferior: siguiente etiqueta de zona en la columna izquierda
    const nextLabel = first.filter(it =>
      near(it.x, V2.X_LEFT) && it.y < partyLabel.y - 1 &&
      isLabel(it, 'TRABAJO REALIZADO', 'OBJETO DEL PRESUPUESTO', 'CONCEPTO', 'OBSERVACIONES')
    ).sort((a, b) => b.y - a.y)[0];
    const floor = nextLabel ? nextLabel.y + 2 : 0;
    const block = first.filter(it => near(it.x, V2.X_LEFT) && it.y < partyLabel.y - 1 && it.y > floor)
      .sort((a, b) => b.y - a.y);

    const rest = [];
    for (let i = 0; i < block.length; i++) {
      const s = block[i].str;
      if (i === 0) { invoice.cliente.nombre = s; continue; }
      const nifM = s.match(/^NIF:?\s*(.+)$/i);
      if (nifM) { invoice.cliente.nif = nifM[1].trim(); continue; }
      const cpM = s.match(/^(\d{5})\s+(.+)$/);
      if (cpM) { invoice.cliente.cp = cpM[1]; invoice.cliente.ciudad = cpM[2]; continue; }
      rest.push(s);
    }
    if (rest.length) {
      // la ultima linea suelta corta sin numeros suele ser la provincia
      const last = rest[rest.length - 1];
      if (rest.length > 1 && last.length < 30 && !/\d/.test(last)) {
        invoice.cliente.provincia = last;
        invoice.cliente.direccion = rest.slice(0, -1).join(', ');
      } else if (rest.length === 1 && last.length < 25 && !/\d/.test(last) && invoice.cliente.cp) {
        invoice.cliente.provincia = last;
      } else {
        invoice.cliente.direccion = rest.join(', ');
      }
    }
  }

  // --- Columna derecha de la zona de partes ---
  const col2 = (labelText) => {
    const label = first.find(it => isLabel(it, labelText) && near(it.x, V2.QTY_R));
    if (!label) return '';
    const vals = below(first, label, it => near(it.x, V2.QTY_R) && it.y > label.y - 40);
    const out = [];
    for (const v of vals) {
      // las etiquetas de zona van en 6,5 pt; los valores en 8,5 pt
      if (v.scale < 7.5 || isLabel(v, 'FORMA DE PAGO', 'VALIDEZ', 'PLAZO DE EJECUCIÓN', 'PLAZO DE EJECUCION')) break;
      out.push(v.str);
      if (out.length >= 3) break;
    }
    return out.join(' ');
  };
  if (!isPresupuesto) invoice.formaPago = col2('FORMA DE PAGO');
  if (isPresupuesto) {
    invoice.validez = col2('VALIDEZ');
    invoice.plazoEjecucion = col2('PLAZO DE EJECUCIÓN');
  }

  // --- Trabajo realizado / objeto del presupuesto ---
  const trabajoLabel = first.find(it => isLabel(it, 'TRABAJO REALIZADO', 'OBJETO DEL PRESUPUESTO'));
  if (trabajoLabel) {
    const headRow = first.find(it => isLabel(it, 'CONCEPTO') && near(it.x, V2.X_LEFT));
    const floor = headRow ? headRow.y + 2 : trabajoLabel.y - 60;
    const txt = first.filter(it => near(it.x, V2.X_LEFT) && it.y < trabajoLabel.y - 1 && it.y > floor)
      .sort((a, b) => b.y - a.y).map(it => it.str).join(' ');
    if (isPresupuesto) invoice.descripcionObra = txt;
    else invoice.descripcionTrabajo = txt;
  }

  // --- Tabla de lineas (todas las paginas) ---
  for (const pageItems of pages) {
    const items = pageItems.filter(it => it.y > V2.FOOTER_Y);
    const headConcepto = items.find(it => isLabel(it, 'CONCEPTO') && near(it.x, V2.X_LEFT));
    if (!headConcepto) continue;

    // limite inferior de la tabla en esta pagina: resumen / observaciones / vencimientos
    const stopItem = items.filter(it =>
      it.y < headConcepto.y &&
      ((near(it.x, V2.QTY_R) && /^(Subtotal l[ií]neas|Base imponible|IVA \(|IVA —)/.test(it.str)) ||
        (near(it.x, V2.X_LEFT) && (isLabel(it, 'OBSERVACIONES', 'VENCIMIENTOS', 'CONFORMIDAD') || norm(it.str).startsWith('CONDICIONES'))))
    ).sort((a, b) => b.y - a.y)[0];
    const tableFloor = stopItem ? stopItem.y + 2 : V2.FOOTER_Y;

    // filas: un importe numerico anclado al borde derecho + un precio en la misma banda
    const importes = items.filter(it =>
      near(it.right, V2.TOTAL_R) && isNumStr(it.str) &&
      it.y < headConcepto.y - 2 && it.y > tableFloor
    ).sort((a, b) => b.y - a.y);

    const rows = [];
    for (const imp of importes) {
      const sameRow = (it) => Math.abs(it.y - imp.y) <= 1.5;
      const precio = items.find(it => sameRow(it) && near(it.right, V2.PRICE_R) && isNumStr(it.str));
      if (!precio) continue; // el TOTAL del resumen no tiene precio al lado
      rows.push({ y: imp.y, importe: imp.str, precio: precio.str });
    }

    rows.forEach((row, ri) => {
      const sameRow = (it) => Math.abs(it.y - row.y) <= 1.5;
      const nextY = ri + 1 < rows.length ? rows[ri + 1].y : tableFloor;

      // cantidad + unidad (dos items pegados al anclaje 116mm)
      const qtyItems = items.filter(it => sameRow(it) && it.right <= V2.QTY_R + TOL && it.right > V2.QTY_R - 30);
      let cantidad = '', unidad = null;
      for (const q of qtyItems) {
        if (isNumStr(q.str)) cantidad = q.str;
        else if (normalizeUnit(q.str)) unidad = normalizeUnit(q.str);
      }
      const dtoItem = items.find(it => sameRow(it) && near(it.right, V2.DTO_R) && /%/.test(it.str));

      // concepto: titulo en la misma banda, descripcion debajo hasta la siguiente fila.
      // La micro-etiqueta "IVA X %" bajo el concepto marca el tipo propio de la linea.
      const isIvaTag = (it) => /^IVA\d{1,2}([.,]\d)?%$/.test(norm(it.str));
      const title = items.find(it => sameRow(it) && near(it.x, V2.X_LEFT));
      const belowItems = items.filter(it =>
        near(it.x, V2.X_LEFT) && it.y < row.y - 1.5 && it.y > nextY + 3
      ).sort((a, b) => b.y - a.y);
      const descItems = belowItems.filter(it => !isLabel(it, 'DEDUCCIÓN', 'DEDUCCION') && !isIvaTag(it));
      const ivaTagItem = belowItems.find(isIvaTag);
      const lineIva = ivaTagItem ? parseFloat(norm(ivaTagItem.str).match(/^IVA(\d{1,2}(?:[.,]\d)?)%$/)[1].replace(',', '.')) : undefined;
      const isDeduction = belowItems.some(it => isLabel(it, 'DEDUCCIÓN', 'DEDUCCION')) || parseSpNum(row.importe) < 0;

      const titulo = title ? title.str : '';
      const desc = descItems.map(it => it.str).join(' ');

      if (isDeduction) {
        invoice.deducciones.push({
          manual: true,
          descripcion: [titulo, desc].filter(Boolean).join(' — '),
          importe: numberToSpanishStr(Math.abs(parseSpNum(row.importe)))
        });
        return;
      }

      invoice.lineas.push({
        articulo: desc ? titulo : '',
        descripcion: desc || titulo,
        cantidad: String(parseSpNum(cantidad) || ''),
        precioUd: String(parseSpNum(row.precio) || ''),
        dto: dtoItem ? String(parseSpNum(dtoItem.str.replace(/[%\s]/g, ''))) : '',
        unidad: unidad || guessUnit(desc || titulo),
        ...(lineIva !== undefined ? { iva: lineIva } : {})
      });
    });
  }

  // --- Resumen fiscal ---
  // Con varios tipos de IVA en el PDF, el tipo GLOBAL es el del grupo de mayor
  // base ("Base al X %"); las lineas ya traen su tipo propio via micro-etiqueta.
  const allItems = pages.flat().filter(it => it.y > V2.FOOTER_Y);
  const ivaMatches = []; // { tipo, base }
  for (const it of allItems) {
    let m = it.str.match(/^IVA \((\d{1,2}(?:[.,]\d)?) ?%\)$/);
    if (m) ivaMatches.push({ tipo: parseFloat(m[1].replace(',', '.')), base: null });
    m = it.str.match(/^Base al (\d{1,2}(?:[.,]\d)?) ?%$/);
    if (m) {
      const tipo = parseFloat(m[1].replace(',', '.'));
      const val = allItems.find(v => Math.abs(v.y - it.y) <= 1.5 && near(v.right, V2.TOTAL_R) && isNumStr(v.str));
      const entry = ivaMatches.find(e => e.tipo === tipo) || (ivaMatches.push({ tipo, base: null }), ivaMatches[ivaMatches.length - 1]);
      entry.base = val ? Math.abs(parseSpNum(val.str)) : null;
    }
    m = it.str.match(/^IRPF \(-?(\d{1,2}) ?%\)$/);
    if (m) invoice.iva.irpf = parseInt(m[1]);
    if (/^(R\.E\.|Recargo de equivalencia)/.test(it.str)) invoice.iva.recargoEquivalencia = true;
    if (/Inv\.? sujeto pasivo|inversi[oó]n del sujeto pasivo/i.test(it.str)) invoice.iva.inversionSujetoPasivo = true;
  }
  if (ivaMatches.length === 1) {
    invoice.iva.tipo = ivaMatches[0].tipo;
  } else if (ivaMatches.length > 1) {
    const best = [...ivaMatches].sort((a, b) => (b.base ?? -1) - (a.base ?? -1))[0];
    invoice.iva.tipo = best.tipo;
  }

  // --- Observaciones ---
  for (const pageItems of pages) {
    const items = pageItems.filter(it => it.y > V2.FOOTER_Y);
    const obsLabel = items.find(it => isLabel(it, 'OBSERVACIONES') && near(it.x, V2.X_LEFT));
    if (!obsLabel) continue;
    const stop = items.filter(it =>
      near(it.x, V2.X_LEFT) && it.y < obsLabel.y - 1 &&
      isLabel(it, 'VENCIMIENTOS', 'CONDICIONES', 'CONDICIONES COMERCIALES', 'CONFORMIDAD')
    ).sort((a, b) => b.y - a.y)[0];
    const floor = stop ? stop.y + 2 : V2.FOOTER_Y;
    const txt = items.filter(it =>
      near(it.x, V2.X_LEFT) && it.y < obsLabel.y - 1 && it.y > floor && it.x < V2.QTY_R - 20
    ).sort((a, b) => b.y - a.y).map(it => it.str).join(' ');
    if (txt) invoice.observaciones = txt;
    break;
  }

  // --- Vencimientos ---
  const vencs = [];
  for (const pageItems of pages) {
    const items = pageItems.filter(it => it.y > V2.FOOTER_Y);
    const vLabel = items.find(it => isLabel(it, 'VENCIMIENTOS') && near(it.x, V2.X_LEFT));
    if (!vLabel) continue;
    const fechas = items.filter(it =>
      near(it.x, V2.X_LEFT) && it.y < vLabel.y - 1 && /^\d{2}\/\d{2}\/\d{4}$/.test(it.str)
    ).sort((a, b) => b.y - a.y);
    for (const f of fechas) {
      const sameRow = (it) => Math.abs(it.y - f.y) <= 2;
      const imp = items.find(it => sameRow(it) && near(it.right, V2.VENC_IMP_R) && isNumStr(it.str));
      const dom = items.find(it => sameRow(it) && near(it.x, V2.VENC_DOM_X));
      const ofi = items.find(it => sameRow(it) && near(it.x, V2.VENC_OFI_X));
      // el numero de cuenta (courier) puede llegar partido en varios items
      const cta = items.filter(it => sameRow(it) && it.x >= V2.VENC_CTA_X - TOL)
        .sort((a, b) => a.x - b.x).map(it => it.str).join(' ');
      vencs.push({
        fecha: spanishDateToISO(f.str),
        importe: imp ? String(parseSpNum(imp.str)) : '',
        domiciliacion: dom ? dom.str : '',
        oficina: ofi ? ofi.str : '',
        numeroCuenta: cta
      });
    }
  }
  if (vencs.length) invoice.vencimientos = vencs;

  // --- Condiciones (presupuestos) ---
  if (isPresupuesto) {
    for (const pageItems of pages) {
      const items = pageItems.filter(it => it.y > V2.FOOTER_Y);
      const cLabel = items.find(it => isLabel(it, 'CONDICIONES') && near(it.x, V2.X_LEFT));
      if (cLabel) {
        const stop = items.filter(it =>
          near(it.x, V2.X_LEFT) && it.y < cLabel.y - 1 &&
          isLabel(it, 'CONDICIONES COMERCIALES', 'CONFORMIDAD', 'VENCIMIENTOS')
        ).sort((a, b) => b.y - a.y)[0];
        const floor = stop ? stop.y + 2 : V2.FOOTER_Y;
        const txt = items.filter(it => near(it.x, V2.X_LEFT) && it.y < cLabel.y - 1 && it.y > floor)
          .sort((a, b) => b.y - a.y).map(it => it.str).join(' ');
        if (txt) invoice.condiciones = txt;
      }
      const ccLabel = items.find(it => isLabel(it, 'CONDICIONES COMERCIALES') && near(it.x, V2.X_LEFT));
      if (ccLabel) {
        const stop = items.filter(it =>
          near(it.x, V2.X_LEFT) && it.y < ccLabel.y - 1 && isLabel(it, 'CONFORMIDAD')
        ).sort((a, b) => b.y - a.y)[0];
        const floor = stop ? stop.y + 2 : V2.FOOTER_Y;
        const ccLines = items.filter(it => near(it.x, V2.X_LEFT) && it.y < ccLabel.y - 1 && it.y > floor)
          .sort((a, b) => b.y - a.y).map(it => it.str);
        if (ccLines.length) invoice.condicionesComerciales = ccLines.join('\n');
      }
    }
  }

  if (invoice.lineas.length === 0) {
    invoice.lineas.push({ articulo: '', descripcion: '', cantidad: '', precioUd: '', dto: '', unidad: 'ud' });
  }

  return invoice;
}

// ============================================================
// Parser heuristico generico (PDFs de otros programas)
// ============================================================

const SKIP_WORDS = ['DOCUMENTO', 'ARTICULO', 'DESCRIPCION', 'CONCEPTO', 'TIPO', 'IMPORTE', 'VENCIMIENTO', 'OBSERVACION', 'TOTAL', 'TRANSFERENCIA', 'NUMERO', 'PAGINA', 'FECHA', 'FORMA', 'AGENTE', 'DESCUENTO', 'PRONTO', 'PORTES', 'FINANCIACION', 'BASE', 'OPERACION', 'CONFORME', 'TRABAJOS REALIZADOS', 'SUBTOTAL', 'IVA', 'IRPF', 'NIF:', 'CANTIDAD', 'PRECIO'];

function isSkipLine(desc) {
  const upper = desc.toUpperCase().trim();
  if (upper.length < 3) return true;
  return SKIP_WORDS.some(w => upper.startsWith(w));
}

function tryParseDeductionLine(line) {
  const m = line.match(/^(.+?)\s+1[,.]00\s+-([\d.,]+)\s+-([\d.,]+)/);
  if (!m) return null;
  const desc = m[1].trim();
  if (!/FACTURA|deduc|abono|anticipo/i.test(desc)) return null;
  const importe = parseSpNum(m[2]);
  if (importe <= 0) return null;
  return { descripcion: desc, importe };
}

function tryParseDeductionMultiline(line, nextLine) {
  if (!/FACTURA|deduc|abono|anticipo/i.test(line)) return null;
  if (!nextLine) return null;
  const combined = (line + ' ' + nextLine).replace(/\s+/g, ' ').trim();
  return tryParseDeductionLine(combined);
}

// emisorHints: datos del emisor configurado en la app (para no confundirlo con el cliente)
export function parseInvoiceText(text, emisorHints = null) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const upperText = text.toUpperCase();
  const isPresupuesto = /^\s*PRESUPUESTO/im.test(upperText) || (/PRESUPUESTO/.test(upperText) && !/^FACTURA/m.test(upperText));
  const invoice = emptyInvoice(isPresupuesto);

  const hintNombre = (emisorHints?.nombre || '').toUpperCase().trim();
  const hintNif = (emisorHints?.nif || '').toUpperCase().replace(/[\s-]/g, '');
  const hintCp = emisorHints?.cp || '';
  const hintDireccion = (emisorHints?.direccion || '').toUpperCase().trim();
  const isEmisorLine = (line) => {
    const u = line.toUpperCase();
    if (hintNombre && hintNombre.length > 3 && u.includes(hintNombre)) return true;
    if (hintNif && u.replace(/[\s-]/g, '').includes(hintNif)) return true;
    if (hintDireccion && hintDireccion.length > 6 && u.includes(hintDireccion)) return true;
    return false;
  };

  // === Numero de documento + fecha ===
  // 1) Fila estilo tabla clasica: "Factura 260042 1 20/05/2026"
  let m = text.match(/(?:Factura|Presupuesto)\s+([\w\/-]+)\s+(\d{1,2})\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (m) {
    invoice.invoiceNumber = m[1];
    invoice.page = m[2];
    invoice.date = spanishDateToISO(m[3]);
  } else {
    // 2) Etiquetas habituales: "Factura Nº: F-2026-001", "Nº de factura 2026/042", "FACTURA 2026-0042"
    m = text.match(/(?:FACTURA|PRESUPUESTO)(?:\s+SIMPLIFICADA)?\s*(?:N[ºo°.]?\s*:?\s*|NUM\.?\s*:?\s*|#\s*)?([A-Z]{0,3}[-\/]?\d[\d\/.-]{2,14}\d)/i);
    if (m) invoice.invoiceNumber = m[1];
    else {
      m = text.match(/N[ºo°]\.?\s*(?:DE\s+)?(?:FACTURA|PRESUPUESTO|DOCUMENTO)?\s*:?\s*([A-Z]{0,3}[-\/]?\d[\d\/.-]{2,14}\d)/i);
      if (m) invoice.invoiceNumber = m[1];
      else {
        m = text.match(/\b(2\d{5}|P-\d{3,6}|\d{4}-\d{3,5})\b/);
        if (m) invoice.invoiceNumber = m[1];
      }
    }
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) invoice.date = spanishDateToISO(dateMatch[1]);
  }

  // === NIFs === (el NIF del emisor configurado nunca es el del cliente)
  const allNifs = [...new Set((text.match(/\b[A-Z]\d{7,8}[A-Z0-9]?\b|\b\d{8}[A-Z]\b/g) || []))];
  const clientNifCandidates = allNifs.filter(n => n.replace(/[\s-]/g, '') !== hintNif);
  const nifLabeled = [...text.matchAll(/NIF:?\s*([A-Z]?\d{7,8}[A-Z0-9]?)/gi)].map(x => x[1].toUpperCase());
  const labeledClient = nifLabeled.find(n => n.replace(/[\s-]/g, '') !== hintNif);
  if (labeledClient) invoice.cliente.nif = labeledClient;
  else if (clientNifCandidates.length > 0) invoice.cliente.nif = clientNifCandidates[0];
  invoice.emisor.nif = emisorHints?.nif || '';

  // === Nombre del cliente ===
  for (let i = 0; i < Math.min(25, lines.length); i++) {
    const line = lines[i];
    if (isEmisorLine(line)) continue;
    if (/DOCUMENTO|ARTICULO|CONCEPTO|TIPO|IMPORTE|NUMERO|PAGINA|FECHA|NIF:|FACTURA|PRESUPUESTO|CANTIDAD|PRECIO/i.test(line)) continue;
    if (line.length < 4 || line.length > 100) continue;
    if (/\b(S\.?\s*L\.?\s*U?\.?|S\.?\s*A\.?\s*U?\.?|S\.?\s*C\.?\s*P\.?|C\.?\s*B\.?|S\.?\s*COOP\.?)\b/i.test(line)) {
      invoice.cliente.nombre = line.trim();
      break;
    }
    if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,.\d-]{8,}$/.test(line) && !line.match(/\d{5}/)) {
      invoice.cliente.nombre = line.trim();
      break;
    }
  }

  // === Direccion del cliente ===
  const addressRegex = /(?:CALLE|C\/|AVDA\.?|AVENIDA|PLAZA|PZA\.?|RONDA|PASEO|TRAVESIA|CAMINO|CTRA\.?|CARRETERA|POLIGONO|POL\.?)\s+[^\n]+/i;
  for (const line of lines) {
    if (isEmisorLine(line)) continue;
    const am = line.match(addressRegex);
    if (am) { invoice.cliente.direccion = am[0].trim(); break; }
  }

  // === CP + ciudad ===
  for (const line of lines) {
    if (isEmisorLine(line)) continue;
    if (hintCp && line.includes(hintCp)) continue;
    const cm = line.match(/(\d{5})\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\s]+)/);
    if (cm) { invoice.cliente.cp = cm[1]; invoice.cliente.ciudad = cm[2].trim(); break; }
  }

  // === Provincia ===
  const PROVINCES = ['ASTURIAS', 'MADRID', 'BARCELONA', 'VALENCIA', 'CANTABRIA', 'LEON', 'GALICIA', 'SEVILLA', 'VIZCAYA', 'GUIPUZCOA', 'NAVARRA', 'ARAGON', 'BURGOS', 'VALLADOLID', 'A CORUÑA', 'A CORUNA', 'LA CORUÑA', 'PONTEVEDRA', 'LUGO', 'OURENSE', 'BIZKAIA', 'GIPUZKOA', 'ARABA', 'ALAVA', 'TOLEDO', 'MALAGA', 'CADIZ', 'CORDOBA', 'GRANADA', 'HUELVA', 'JAEN', 'ALMERIA', 'MURCIA', 'ALICANTE', 'CASTELLON', 'TERUEL', 'HUESCA', 'ZARAGOZA', 'TARRAGONA', 'LERIDA', 'LLEIDA', 'GIRONA', 'GERONA', 'BALEARES', 'CACERES', 'BADAJOZ', 'CIUDAD REAL', 'CUENCA', 'GUADALAJARA', 'AVILA', 'SALAMANCA', 'ZAMORA', 'PALENCIA', 'SORIA', 'SEGOVIA', 'LA RIOJA', 'CANARIAS', 'LAS PALMAS', 'TENERIFE'];
  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();
    if (PROVINCES.includes(trimmed)) { invoice.cliente.provincia = trimmed; break; }
  }

  // === Forma de pago ===
  const fpagoMatch = text.match(/(?:FORMA DE PAGO:?\s*)?(TRANSFERENCIA\s+BANCARIA[^\n]*|DOMICILIACION[^\n]*|CONTADO[^\n]*|EFECTIVO[^\n]*|PAGARE[^\n]*|CONFIRMING[^\n]*)/i);
  if (!isPresupuesto) {
    invoice.formaPago = fpagoMatch ? fpagoMatch[1].trim() : '';
  }

  // === Descripcion del trabajo ===
  const trabajoMatch = text.match(/(?:TRABAJOS?\s+REALIZADOS?|TRABAJO REALIZADO|OBJETO DEL PRESUPUESTO)[:\s]*([^\n]*)/i);
  if (trabajoMatch) {
    let desc = (trabajoMatch[1] || '').trim();
    const idx = lines.findIndex(l => /TRABAJOS?\s+REALIZADOS?|TRABAJO REALIZADO|OBJETO DEL PRESUPUESTO/i.test(l));
    if (idx >= 0 && idx + 1 < lines.length && !desc) {
      const next = lines[idx + 1];
      if (/^[A-ZÁÉÍÓÚÑ"'°]/.test(next) && !/\d+[,.]\d{2}/.test(next) && next.length < 100) desc = next;
    }
    if (isPresupuesto) invoice.descripcionObra = desc;
    else invoice.descripcionTrabajo = desc;
  }

  // === Lineas ===
  const cleanLines = lines.map(l => l.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim());
  const reWithUnit = /^(.{3,}?)\s+(m[²2]|ml|ud|h|pack|uds?\.?|horas?)\s+(\d[\d.,]*)\s+(\d[\d.,]*)(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?$/i;
  const reNoUnit = /^([^\d]{3,}?)\s+(\d[\d.,]*)\s+(\d[\d.,]*)\s+(\d[\d.,]*)(?:\s+(\d[\d.,]*))?(?:\s+(\d[\d.,]*))?$/;

  const seenLineKeys = new Set();
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

  function parseLineItem(line) {
    if (!line) return null;
    let lm = line.match(reWithUnit);
    if (lm && !isSkipLine(lm[1])) {
      const cant = parseSpNum(lm[3]);
      const precio = parseSpNum(lm[4]);
      const nums = [lm[5], lm[6], lm[7], lm[8]].filter(Boolean).map(parseSpNum);
      let dto = '';
      if (nums.length === 3 && nums[1] > 0 && nums[1] < 100) dto = String(nums[1]);
      if (cant > 0 && precio > 0) {
        return { desc: lm[1].trim(), unidad: normalizeUnit(lm[2]), cant, precio, dto };
      }
    }
    lm = line.match(reNoUnit);
    if (lm && !isSkipLine(lm[1])) {
      const cant = parseSpNum(lm[2]);
      const precio = parseSpNum(lm[3]);
      if (cant > 0 && cant < 100000 && precio > 0 && precio < 1000000 && lm[1].trim().length >= 3) {
        return { desc: lm[1].trim(), unidad: null, cant, precio, dto: '' };
      }
    }
    return null;
  }

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

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

    const parsed = parseLineItem(line);
    if (parsed) {
      pushLine(parsed.desc, parsed.cant, parsed.precio, parsed.unidad, parsed.dto);
      while (i + 1 < cleanLines.length) {
        const nextLine = cleanLines[i + 1];
        if (!nextLine) break;
        if (parseLineItem(nextLine)) break;
        if (tryParseDeductionLine(nextLine)) break;
        if (/^(OBSERVACION|TOTAL|VENCIMIENTO|SUBTOTAL|BASE|IVA|IRPF|FACTURA|DEDUC|TRANSFERENCIA|ES\d{2}|TIPO\s|N\.I\.F\.|DOCUMENTO|ARTICULO|CONCEPTO|TRABAJOS REALIZADOS|CONDICIONES)/i.test(nextLine)) break;
        if (/\d+[,.]\d{2}/.test(nextLine)) break;
        if (!/^[A-ZÁÉÍÓÚÑa-záéíóúñ"'(]/.test(nextLine)) break;
        if (nextLine.length > 20 && /^(FALSO\s+TECHO|TRASDOSADO|TABIQUE|AISLAMIENTO|PARED|FACHADA|SUELO|PAVIMENTO|REVESTIMIENTO|HORAS|TRABAJOS|PINTURA|CUBIERTA|CHAPADO|ENFOSCADO|GUARNECIDO)/i.test(nextLine)) break;
        if (nextLine.length > 60) break;
        const lastLine = invoice.lineas[invoice.lineas.length - 1];
        if (lastLine) lastLine.descripcion = (lastLine.descripcion + ' ' + nextLine).trim();
        i++;
      }
      continue;
    }
  }

  if (invoice.lineas.length === 0) {
    invoice.lineas.push({ articulo: '', descripcion: '', cantidad: '', precioUd: '', dto: '', unidad: 'ud' });
  }

  // === Impuestos ===
  if (/sujeto\s+pasivo/i.test(text)) invoice.iva.inversionSujetoPasivo = true;
  const ivaPctMatch = text.match(/IVA\s*\(?(\d{1,2})\s?%\)?/i);
  if (ivaPctMatch) invoice.iva.tipo = parseInt(ivaPctMatch[1]);
  const irpfMatch = text.match(/IRPF\s*\(?-?(\d{1,2})\s?%\)?/i);
  if (irpfMatch) invoice.iva.irpf = parseInt(irpfMatch[1]);

  // === Observaciones ===
  const obsIdx = lines.findIndex(l => /^OBSERVACIONES?$/i.test(l.trim()));
  if (obsIdx >= 0 && obsIdx + 1 < lines.length) {
    const obsLines = [];
    for (let j = obsIdx + 1; j < lines.length && j < obsIdx + 4; j++) {
      const l = lines[j];
      if (/^(Subtotal|Base|IVA|IRPF|TOTAL|VENCIMIENTOS|DEDUCCIONES|CONDICIONES)/i.test(l)) break;
      obsLines.push(l);
    }
    invoice.observaciones = obsLines.join('\n').trim();
  }

  // === IBAN ===
  const ibanMatch = text.match(/ES\d{2}\s*\d{4}\s*\d{4}\s*\d{2}\s*\d{10}|ES\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/);
  if (ibanMatch) {
    if (!invoice.observaciones.includes(ibanMatch[0])) {
      invoice.observaciones = (invoice.observaciones ? invoice.observaciones + '\n' : '') + ibanMatch[0];
    }
    invoice.vencimientos[0].numeroCuenta = ibanMatch[0];
  }

  // === Vencimientos ===
  const vencSectionIdx = lines.findIndex(l => /^VENCIMIENTOS?\b/i.test(l));
  if (vencSectionIdx >= 0) {
    for (let j = vencSectionIdx + 1; j < lines.length; j++) {
      const l = lines[j];
      const vm = l.match(/^(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)/);
      if (vm) {
        invoice.vencimientos[0].fecha = spanishDateToISO(vm[1]);
        invoice.vencimientos[0].importe = String(parseSpNum(vm[2]));
        const ibanInLine = l.match(/ES\d{2}[\s\d]{20,28}/);
        if (ibanInLine) invoice.vencimientos[0].numeroCuenta = ibanInLine[0].trim();
        break;
      }
    }
  } else if (invoice.date) {
    invoice.vencimientos[0].fecha = invoice.date;
  }

  const webMatch = text.match(/www\.\S+/i);
  if (webMatch) invoice.emisor.web = webMatch[0].trim();

  return invoice;
}

// ============================================================
// Punto de entrada: detecta el formato y elige el parser
// ============================================================

export async function importInvoiceFromPDF(file, emisorHints = null) {
  const pages = await extractPositionedItems(file);
  const rawText = pagesToText(pages);
  const invoice = looksLikePresufactPDF(pages)
    ? parsePresufactPDF(pages)
    : parseInvoiceText(rawText, emisorHints);
  return { invoice, rawText };
}

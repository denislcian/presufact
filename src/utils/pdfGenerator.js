import jsPDF from 'jspdf';
import { formatNumber, calcLineTotal, formatDateES, getUnitLabel, calcInvoiceTaxBreakdown, parseSpanishNumber, lineIvaRate } from './formatters';
import { getLogoBase64 } from './logoSvg';
import { getEmisorSettings } from '../db';

// ==== Sistema de layout "Suizo Editorial" (mm) ====
const X_LEFT = 18;
const X_RIGHT = 192;
const CONTENT_W = X_RIGHT - X_LEFT; // 174
const PAGE_BOTTOM = 268;   // limite de contenido
const FOOT_RULE_Y = 278;   // pie fijo 278-290
const PAGE_W = 210;

// Anclajes de columnas de la tabla (bordes derechos para cifras)
const COL_CONCEPT_W = 80;
const COL_QTY_R = 116;
const COL_PRICE_R = 140;
const COL_DTO_R = 156;
const COL_TOTAL_R = X_RIGHT;

// Escala de grises neutra
const INK = [17, 17, 17];
const GREY_DARK = [60, 60, 60];
const GREY_MID = [128, 128, 128];
const RULE_GREY = [210, 210, 210];
const ROW_RULE = [225, 225, 225];

const EURO = '€'; // € es WinAnsi 0x80: helvetica lo cubre

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [26, 54, 93];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Guarda de luminancia: si el color es demasiado claro para texto sobre blanco,
// se oscurece SOLO para texto; las reglas usan siempre el color original.
function effectiveTextAccent(rgb) {
  const L = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  if (L > 0.6) return rgb.map(c => Math.round(c * 0.55));
  return rgb;
}

// Las fuentes estandar del PDF solo cubren WinAnsi: los caracteres fuera de ese
// rango (emojis, comillas curvas, guiones largos...) saldrian como basura.
// Se mapean los tipograficos habituales y se elimina el resto irrepresentable.
function sanitizePdfString(s) {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[•■●▪◦⁃]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/[^\x00-\xFF€ŒœŠšŽžƒ™]/g, '');
}

function sanitizeForPdf(value, key) {
  if (key === 'logo' || key === 'firmaCliente') return value; // dataURLs: no tocar
  if (typeof value === 'string') return sanitizePdfString(value);
  if (Array.isArray(value)) return value.map(v => sanitizeForPdf(v));
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = sanitizeForPdf(value[k], k);
    return out;
  }
  return value;
}

// Builds the jsPDF document and returns { doc, filename }.
// Use generatePDF() to download it or generatePDFFile() to get a File (for sharing).
async function buildPDF(rawInvoice) {
  const invoice = sanitizeForPdf(rawInvoice);
  const em = invoice.emisor || {};
  const logoData = await getLogoBase64(em);

  // Color de marca: del snapshot del documento o, si falta, de los ajustes actuales
  let colorHex = em.colorMarca;
  if (!colorHex) {
    try { colorHex = (await getEmisorSettings())?.colorMarca; } catch { /* sin ajustes */ }
  }
  const ACCENT = hexToRgb(colorHex);
  const ACCENT_TEXT = effectiveTextAccent(ACCENT);

  const doc = new jsPDF('p', 'mm', 'a4');
  const dateFormatted = formatDateES(invoice.date);
  const isPresupuesto = invoice.documentType === 'Presupuesto';
  const cliente = invoice.cliente || {};
  // Etiqueta del documento: las facturas marcadas como proforma lo indican
  // de forma visible (documento no sujeto a Verifactu)
  const docLabelText = (!isPresupuesto && invoice.esProforma) ? 'FACTURA PROFORMA' : invoice.documentType;
  const ivaConfigForLines = invoice.iva || { tipo: 21 };

  const setColor = (c) => doc.setTextColor(c[0], c[1], c[2]);

  // Etiqueta de zona: 6,5 pt bold MAYUSCULAS gris medio con tracking.
  // Para align right medimos a mano: jsPDF no incluye charSpace al alinear.
  const zoneLabel = (text, x, y, { align = 'left', charSpace = 0.6, size = 6.5, color = GREY_MID } = {}) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    setColor(color);
    const t = String(text).toUpperCase();
    if (align === 'right') {
      const w = doc.getTextWidth(t) + charSpace * Math.max(0, t.length - 1);
      doc.text(t, x - w, y, { charSpace });
    } else {
      doc.text(t, x, y, { charSpace });
    }
  };

  const hairline = (y, x1 = X_LEFT, x2 = X_RIGHT, color = RULE_GREY, width = 0.15) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(x1, y, x2, y);
  };

  // Trunca con elipsis al ancho dado (usa la fuente/tamano activos)
  const truncate = (text, maxW) => {
    let t = String(text || '');
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && doc.getTextWidth(t + '...') > maxW) t = t.slice(0, -1);
    return t.trimEnd() + '...';
  };

  // ---- Cabecera de tabla (labels + regla negra). Devuelve y de la primera fila ----
  const drawTableHead = (yLabels) => {
    zoneLabel('Concepto', X_LEFT, yLabels);
    zoneLabel('Cantidad', COL_QTY_R, yLabels, { align: 'right' });
    zoneLabel('Precio', COL_PRICE_R, yLabels, { align: 'right' });
    zoneLabel('Dto.', COL_DTO_R, yLabels, { align: 'right' });
    zoneLabel('Importe', COL_TOTAL_R, yLabels, { align: 'right' });
    hairline(yLabels + 2.5, X_LEFT, X_RIGHT, INK, 0.35); // la unica linea fuerte de la tabla
    return yLabels + 2.5 + 3.5;
  };

  // ---- Mini-cabecera de paginas 2+ y arranque de tabla continuada ----
  const drawPageChrome = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setColor(INK);
    doc.text(truncate(em.nombre, 88), X_LEFT, 18);
    doc.setFont('helvetica', 'normal');
    setColor(GREY_MID);
    doc.text(`${docLabelText} N.º ${invoice.invoiceNumber || ''} · ${dateFormatted}`, X_RIGHT, 18, { align: 'right' });
    hairline(21);
  };

  const newPageForTable = () => {
    doc.addPage();
    drawPageChrome();
    return drawTableHead(28); // labels y=28, regla 30,5, primera fila 34
  };

  const newPagePlain = () => {
    doc.addPage();
    drawPageChrome();
    return 30;
  };

  // ============ PAGINA 1: CABECERA ============
  // (1) Regla de acento: firma visual
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(0.9);
  doc.line(X_LEFT, 12, X_RIGHT, 12);

  // (3) Bloque emisor izquierdo
  const emisorDataLines = [];
  {
    const l1 = [em.nif ? 'NIF ' + em.nif : '', em.telefono || ''].filter(Boolean).join(' · ');
    if (l1) emisorDataLines.push(l1);
    if (em.direccion) emisorDataLines.push(em.direccion);
    const l3 = [em.cp, em.ciudad, em.provincia ? `(${em.provincia})` : ''].filter(Boolean).join(' ');
    if (l3) emisorDataLines.push(l3);
    const l4 = [em.email || '', em.web || ''].filter(Boolean).join(' · ');
    if (l4) emisorDataLines.push(l4);
  }

  if (logoData) {
    try {
      const fmt = /^data:image\/jpe?g/i.test(logoData) ? 'JPEG' : 'PNG';
      const props = doc.getImageProperties(logoData);
      const maxW = 42, maxH = 16;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const h = props.height * ratio;
      doc.addImage(logoData, fmt, X_LEFT, 16, props.width * ratio, h);
      const nameY = 16 + h + 5;
      doc.setFont('helvetica', 'bold');
      setColor(INK);
      // encoger hasta que quepa sin invadir el bloque del numero (max 92 mm)
      let nSize = 10;
      doc.setFontSize(nSize);
      while (doc.getTextWidth(em.nombre || '') > 92 && nSize > 7.5) { nSize -= 0.5; doc.setFontSize(nSize); }
      doc.text(em.nombre || '', X_LEFT, nameY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setColor(GREY_MID);
      let ly = nameY + 4;
      for (const line of emisorDataLines) {
        if (ly > 50) break; // no invadir el doble filete
        doc.text(line, X_LEFT, ly);
        ly += 3.6;
      }
    } catch (e) {
      console.warn('Could not add logo:', e);
    }
  } else {
    // Bloque de flujo dinamico: nombre (1-2 lineas), subtitulo y datos avanzan
    // segun lo que ocupe lo anterior — nada se solapa con nombres largos.
    doc.setFont('helvetica', 'bold');
    setColor(INK);
    let nSize = 16;
    doc.setFontSize(nSize);
    while (doc.getTextWidth(em.nombre || '') > 92 && nSize > 10) { nSize -= 0.5; doc.setFontSize(nSize); }
    const nameLines = doc.splitTextToSize(em.nombre || '', 92).slice(0, 2);
    doc.text(nameLines, X_LEFT, 22);
    let ly = 22 + (nameLines.length - 1) * (nSize * 0.42) + 5.5;
    if (em.subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(GREY_MID);
      const subLines = doc.splitTextToSize(em.subtitulo, 92).slice(0, 2);
      doc.text(subLines, X_LEFT, ly);
      ly += subLines.length * 3.8 + 1.2;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(GREY_MID);
    for (const line of emisorDataLines) {
      if (ly > 50) break;
      const wrapped = doc.splitTextToSize(line, 92).slice(0, 2);
      doc.text(wrapped, X_LEFT, ly);
      ly += wrapped.length * 3.6;
    }
  }

  // (4) Bloque documento derecho: kicker + numero hero + fecha
  zoneLabel(docLabelText, X_RIGHT, 22, { align: 'right', size: 9, color: ACCENT_TEXT, charSpace: 1 });

  {
    const num = String(invoice.invoiceNumber || '');
    doc.setFont('helvetica', 'bold');
    setColor(INK);
    let numSize = 20;
    doc.setFontSize(numSize);
    while (doc.getTextWidth(num) > 74 && numSize > 14) {
      numSize -= 0.5;
      doc.setFontSize(numSize);
    }
    doc.text(num, X_RIGHT, 30, { align: 'right' });
  }

  zoneLabel('Fecha', X_RIGHT, 37, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(INK);
  doc.text(dateFormatted, X_RIGHT, 41.5, { align: 'right' });

  // (2) Doble filete contable de cierre de cabecera
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(0.45);
  doc.line(X_LEFT, 52, X_RIGHT, 52);
  hairline(52.9, X_LEFT, X_RIGHT, RULE_GREY, 0.12);

  // (5) Zona de partes (columna izquierda: max 92 mm para no invadir la derecha)
  zoneLabel(isPresupuesto ? 'Presupuesto para' : 'Facturar a', X_LEFT, 60);
  doc.setFont('helvetica', 'bold');
  setColor(INK);
  let clientNameBottom = 65.5;
  {
    let cSize = 10;
    doc.setFontSize(cSize);
    while (doc.getTextWidth(cliente.nombre || '') > 92 && cSize > 8) { cSize -= 0.5; doc.setFontSize(cSize); }
    const cNameLines = doc.splitTextToSize(cliente.nombre || '', 92).slice(0, 2);
    doc.text(cNameLines, X_LEFT, 65.5);
    clientNameBottom = 65.5 + (cNameLines.length - 1) * (cSize * 0.42);
  }
  {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(GREY_DARK);
    let cy = clientNameBottom + 4.5;
    const clientLines = [
      cliente.direccion,
      [cliente.cp, cliente.ciudad].filter(Boolean).join(' '),
      cliente.provincia
    ].filter(Boolean);
    for (const line of clientLines) {
      if (cy > 82) break; // la zona de partes termina antes de la tabla
      // direcciones largas: envolver a 92 mm (max 2 lineas por campo)
      const wrapped = doc.splitTextToSize(String(line), 92).slice(0, 2);
      doc.text(wrapped, X_LEFT, cy);
      cy += wrapped.length * 4;
    }
    if (cliente.nif) {
      setColor(GREY_MID);
      doc.text('NIF: ' + cliente.nif, X_LEFT, Math.min(cy, 86));
    }
  }

  // Columna derecha de la zona de partes
  if (!isPresupuesto && invoice.formaPago) {
    zoneLabel('Forma de pago', COL_QTY_R, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(INK);
    const fpLines = doc.splitTextToSize(invoice.formaPago, 76).slice(0, 3);
    doc.text(fpLines, COL_QTY_R, 64.5);
  }
  if (isPresupuesto) {
    let py = 60;
    if (invoice.validez) {
      zoneLabel('Validez', COL_QTY_R, py);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(INK);
      doc.text(String(invoice.validez), COL_QTY_R, py + 4.5);
      py += 9;
    }
    if (invoice.plazoEjecucion) {
      zoneLabel('Plazo de ejecución', COL_QTY_R, py);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(INK);
      doc.text(String(invoice.plazoEjecucion), COL_QTY_R, py + 4.5);
    }
  }

  // (6) Concepto / descripcion del trabajo
  let tableZoneY = 92;
  const descTrabajo = invoice.descripcionTrabajo || invoice.descripcionObra;
  if (descTrabajo) {
    zoneLabel(isPresupuesto ? 'Objeto del presupuesto' : 'Trabajo realizado', X_LEFT, 92);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(INK);
    // cap a 6 lineas: el concepto es un titular, el detalle va en las lineas
    let dLines = doc.splitTextToSize(descTrabajo, CONTENT_W);
    if (dLines.length > 6) {
      dLines = dLines.slice(0, 6);
      dLines[5] = dLines[5].replace(/\s+\S*$/, '') + ' ...';
    }
    doc.text(dLines, X_LEFT, 96.5);
    tableZoneY = 96.5 + (dLines.length - 1) * 4 + 8;
  }

  // ============ TABLA DE LINEAS ============
  let y = drawTableHead(tableZoneY + 6);

  // Fila abierta: concepto en dos niveles + cifras ancladas a bordes derechos.
  // rows: { title, titleBold, desc, tag, qty, unit, price, dto, total, negative }
  const drawRow = (row) => {
    // La altura de fila cuenta TODAS las lineas reales: titulo envuelto,
    // descripcion envuelta y micro-etiqueta. Asi nada pisa la fila siguiente.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const titleLines = row.title ? doc.splitTextToSize(String(row.title), COL_CONCEPT_W) : [];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const descLines = row.desc ? doc.splitTextToSize(String(row.desc), COL_CONCEPT_W) : [];
    let conceptLines = titleLines.length + descLines.length + (row.tag ? 1 : 0);
    if (conceptLines === 0) conceptLines = 1;
    const rowH = Math.max(9, conceptLines * 3.6 + 6);

    if (y + rowH > PAGE_BOTTOM) {
      y = newPageForTable();
    }

    const baseline = y + 4.5;

    // Concepto
    let cy = baseline;
    if (titleLines.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setColor(INK);
      doc.text(titleLines, X_LEFT, cy);
      cy += titleLines.length * 3.6;
    }
    if (descLines.length) {
      doc.setFont('helvetica', row.title ? 'normal' : 'normal');
      doc.setFontSize(row.title ? 8 : 8.5);
      setColor(row.title ? GREY_DARK : INK);
      doc.text(descLines, X_LEFT, cy);
      cy += descLines.length * 3.6;
    }
    if (row.tag) {
      zoneLabel(row.tag, X_LEFT, cy, { size: 6, charSpace: 0.5 });
    }

    // Cifras
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    setColor(INK);
    if (row.qty !== undefined && row.qty !== '') {
      const qtyStr = String(row.qty);
      if (row.unit) {
        doc.setFontSize(7);
        setColor(GREY_MID);
        const unitW = doc.getTextWidth(row.unit);
        doc.text(row.unit, COL_QTY_R, baseline, { align: 'right' });
        doc.setFontSize(8.5);
        setColor(INK);
        doc.text(qtyStr, COL_QTY_R - unitW - 1.2, baseline, { align: 'right' });
      } else {
        doc.text(qtyStr, COL_QTY_R, baseline, { align: 'right' });
      }
    }
    if (row.price !== undefined && row.price !== '') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setColor(INK);
      doc.text(String(row.price), COL_PRICE_R, baseline, { align: 'right' });
    }
    if (row.dto) {
      setColor(GREY_MID);
      doc.text(String(row.dto), COL_DTO_R, baseline, { align: 'right' });
    }
    if (row.total !== undefined && row.total !== '') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setColor(INK);
      doc.text(String(row.total), COL_TOTAL_R, baseline, { align: 'right' });
    }

    y += rowH;
    hairline(y, X_LEFT, X_RIGHT, ROW_RULE, 0.15);
  };

  // Lineas reales (filtrando filas fantasma). Si una linea lleva un tipo de IVA
  // distinto del global, se indica bajo el concepto (mencion legal y round-trip
  // del importador).
  const defaultIvaRate = Number.isFinite(ivaConfigForLines.tipo) ? ivaConfigForLines.tipo : 21;
  (invoice.lineas || [])
    .filter(l => l.cantidad || l.precioUd || (l.descripcion || '').trim())
    .forEach(linea => {
      const hasData = linea.cantidad || linea.precioUd;
      const rate = lineIvaRate(linea, ivaConfigForLines);
      drawRow({
        title: (linea.articulo || '').trim(),
        desc: (linea.descripcion || '').trim(),
        tag: rate !== defaultIvaRate ? `IVA ${rate} %` : null,
        qty: hasData ? formatNumber(parseFloat(linea.cantidad) || 0) : '',
        unit: hasData ? getUnitLabel(linea.unidad) : '',
        price: hasData ? formatNumber(parseFloat(linea.precioUd) || 0) : '',
        dto: linea.dto ? formatNumber(parseFloat(linea.dto)) + ' %' : '',
        total: hasData ? formatNumber(calcLineTotal(linea)) : ''
      });
    });

  // Deducciones como filas (sin rojo: signo '-' + micro-etiqueta)
  (invoice.deducciones || []).forEach(ded => {
    if (ded.manual && !ded.lineas) {
      const importe = parseSpanishNumber(ded.importe);
      const desc = ded.descripcion || '';
      if (!desc && !importe) return;
      drawRow({
        title: desc,
        tag: 'Deducción',
        qty: '1,00',
        price: '-' + formatNumber(importe),
        total: '-' + formatNumber(importe)
      });
      return;
    }
    (ded.lineas || []).filter(l => l.incluir !== false).forEach(linea => {
      const cant = parseFloat(linea.cantidad) || 0;
      const precio = parseFloat(linea.precioUd) || 0;
      const sub = cant * precio;
      drawRow({
        title: `Factura ${ded.facturaNum || ''}${ded.facturaFecha ? ' de ' + formatDateES(ded.facturaFecha) : ''}`,
        desc: (linea.descripcion || '').trim(),
        tag: 'Deducción',
        qty: formatNumber(cant),
        unit: getUnitLabel(linea.unidad),
        price: '-' + formatNumber(precio),
        total: '-' + formatNumber(sub)
      });
    });
  });

  // ============ RESUMEN FISCAL + TOTAL ============
  const ivaConfig = invoice.iva || { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
  const tax = calcInvoiceTaxBreakdown(invoice.lineas || [], ivaConfig, invoice.deducciones);

  let numRows = 2; // Base imponible + IVA
  if (tax.esMultiTipo && !tax.isISP) numRows += tax.porTipo.length * 2 - 1; // desglose base+cuota por tipo
  if (tax.totalDeducciones > 0) numRows += 2;
  if (tax.hasRE && !tax.isISP) {
    // en multi-tipo el recargo se desglosa: una fila por grupo con recargo
    numRows += tax.esMultiTipo ? tax.porTipo.filter(g => g.re !== 0).length : 1;
  }
  if (tax.hasIRPF) numRows += 1;
  const summaryBlockH = numRows * 5.5 + 32;

  // Las observaciones comparten banda con el resumen: la antiparticion debe
  // contar el mas alto de los dos bloques.
  doc.setFontSize(7.5);
  const obsText = (invoice.observaciones || '').trim();
  const obsLinesAll = obsText ? doc.splitTextToSize(obsText, 88) : [];
  const obsBlockH = obsLinesAll.length ? obsLinesAll.length * 3.4 + 8 : 0;

  y += 6;
  // Antiparticion: resumen y TOTAL jamas se separan de pagina
  if (y + Math.max(summaryBlockH, Math.min(obsBlockH, 120)) > PAGE_BOTTOM) {
    y = newPagePlain();
  }
  const summaryTop = y;

  let sy = summaryTop;
  const summaryRow = (labelText, valueText, muted) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(GREY_MID);
    doc.text(labelText, COL_QTY_R, sy);
    doc.setFontSize(8.5);
    setColor(muted ? GREY_DARK : INK);
    doc.text(valueText, X_RIGHT, sy, { align: 'right' });
    sy += 5.5;
  };

  if (tax.totalDeducciones > 0) {
    summaryRow('Subtotal líneas', formatNumber(tax.baseLineas));
    summaryRow('Deducciones', '-' + formatNumber(tax.totalDeducciones), true);
  }
  if (tax.esMultiTipo && !tax.isISP) {
    // Desglose legal por tipo de IVA (obligatorio al mezclar tipos en una factura)
    for (const g of tax.porTipo) {
      summaryRow(`Base al ${g.tipo} %`, formatNumber(g.base));
      summaryRow(`IVA (${g.tipo} %)`, formatNumber(g.cuota));
    }
    summaryRow('Base imponible total', formatNumber(tax.base));
  } else {
    summaryRow('Base imponible', formatNumber(tax.base));
    if (tax.isISP) {
      summaryRow('IVA — Inv. sujeto pasivo', formatNumber(0));
    } else {
      summaryRow(`IVA (${tax.porTipo[0]?.tipo ?? ivaConfig.tipo} %)`, formatNumber(tax.ivaAmount));
    }
  }
  if (tax.hasRE && !tax.isISP) {
    if (tax.esMultiTipo) {
      // Desglose del recargo con su tipo real por cada grupo (mencion obligatoria)
      for (const g of tax.porTipo.filter(x => x.re !== 0)) {
        summaryRow(`R.E. ${g.reRate} % (base ${formatNumber(g.base)})`, formatNumber(g.re));
      }
    } else {
      summaryRow(`R.E. (${tax.reRate} %)`, formatNumber(tax.reAmount));
    }
  }
  if (tax.hasIRPF) {
    // formatNumber(-x) mantiene el signo correcto tambien en rectificativas (base negativa)
    summaryRow(`IRPF (-${tax.irpfRate} %)`, formatNumber(-tax.irpfAmount), true);
  }

  // Regla de acento pre-total + TOTAL hero
  const ruleY = sy - 5.5 + 3;
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(0.5);
  doc.line(COL_QTY_R, ruleY, X_RIGHT, ruleY);

  const totalBaseline = ruleY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(INK);
  doc.text('TOTAL', COL_QTY_R, totalBaseline, { charSpace: 0.5 });

  {
    let totalText = formatNumber(tax.total) + ' ' + EURO;
    doc.setFont('helvetica', 'bold');
    let ts = 16;
    doc.setFontSize(ts);
    if (!doc.getTextWidth(totalText)) totalText = formatNumber(tax.total) + ' EUR';
    while (doc.getTextWidth(totalText) > 70 && ts > 11) {
      ts -= 0.5;
      doc.setFontSize(ts);
    }
    setColor(ACCENT_TEXT);
    doc.text(totalText, X_RIGHT, totalBaseline, { align: 'right' });
  }

  let summaryBottom = totalBaseline + 2;
  if (tax.isISP) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    setColor(GREY_MID);
    doc.text('Operación con inversión del sujeto pasivo conforme al Art. 84 de la Ley 37/1992 del IVA.',
      X_RIGHT, totalBaseline + 5, { align: 'right', maxWidth: 76 });
    summaryBottom = totalBaseline + 10;
  }

  // Observaciones a la izquierda del resumen. Cap duro: nunca pisar el pie —
  // si no caben todas las lineas, se corta con elipsis.
  let obsBottom = summaryTop;
  if (obsLinesAll.length) {
    zoneLabel('Observaciones', X_LEFT, summaryTop);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(GREY_DARK);
    const maxObsLines = Math.max(1, Math.floor((PAGE_BOTTOM - summaryTop - 4.5) / 3.4));
    let obsLines = obsLinesAll;
    if (obsLines.length > maxObsLines) {
      obsLines = obsLines.slice(0, maxObsLines);
      obsLines[obsLines.length - 1] = obsLines[obsLines.length - 1].replace(/\s+\S*$/, '') + ' ...';
    }
    doc.text(obsLines, X_LEFT, summaryTop + 4.5);
    obsBottom = summaryTop + 4.5 + obsLines.length * 3.4;
  }

  y = Math.max(summaryBottom, obsBottom);

  // ============ VENCIMIENTOS (facturas) ============
  const vencimientos = (invoice.vencimientos || []).filter(v => v.fecha || v.importe);
  if (!isPresupuesto && vencimientos.length > 0) {
    y += 10;
    const blockH = 10 + vencimientos.length * 7;
    if (y + blockH > PAGE_BOTTOM) y = newPagePlain();

    zoneLabel('Vencimientos', X_LEFT, y);
    hairline(y + 2, X_LEFT, X_RIGHT);
    y += 7;

    zoneLabel('Fecha', X_LEFT, y);
    zoneLabel('Importe', 70, y, { align: 'right' });
    zoneLabel('Domiciliación', 80, y);
    zoneLabel('Oficina', 122, y);
    zoneLabel('N.º cuenta', 148, y);
    hairline(y + 2, X_LEFT, X_RIGHT, INK, 0.35);
    y += 6;

    vencimientos.forEach(v => {
      if (y + 7 > PAGE_BOTTOM) y = newPagePlain();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(INK);
      if (v.fecha) doc.text(formatDateES(v.fecha), X_LEFT, y);
      if (v.importe) {
        doc.setFont('helvetica', 'bold');
        doc.text(formatNumber(parseFloat(v.importe)), 70, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
      }
      if (v.domiciliacion) doc.text(truncate(v.domiciliacion, 40), 80, y);
      if (v.oficina) doc.text(truncate(v.oficina, 24), 122, y);
      if (v.numeroCuenta) {
        doc.setFont('courier', 'normal'); // courier: reservado a datos bancarios
        doc.setFontSize(7); // 7 pt para que un IBAN completo quepa en una linea
        doc.text(String(v.numeroCuenta), 148, y);
      }
      hairline(y + 2.5, X_LEFT, X_RIGHT, ROW_RULE, 0.15);
      y += 7;
    });
  }

  // ============ CONDICIONES (presupuestos) ============
  if (isPresupuesto && (invoice.condiciones || '').trim()) {
    y += 8;
    doc.setFontSize(7.5);
    const cLines = doc.splitTextToSize(invoice.condiciones, CONTENT_W);
    if (y + 8 + Math.min(cLines.length, 6) * 3.6 > PAGE_BOTTOM) y = newPagePlain();
    zoneLabel('Condiciones', X_LEFT, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(GREY_DARK);
    y += 4.5;
    // Linea a linea con salto de pagina: un texto largo nunca se sale del papel
    for (const line of cLines) {
      if (y > PAGE_BOTTOM) {
        y = newPagePlain();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        setColor(GREY_DARK);
      }
      doc.text(line, X_LEFT, y);
      y += 3.6;
    }
  }

  // ============ CONDICIONES COMERCIALES (texto largo) ============
  if ((invoice.condicionesComerciales || '').trim()) {
    if (y > 200) y = newPagePlain();
    y += 8;
    // Regla corta de acento: eco de la regla de portada
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setLineWidth(0.9);
    doc.line(X_LEFT, y, X_LEFT + 12, y);
    y += 4;
    zoneLabel('Condiciones comerciales', X_LEFT, y, { size: 8, color: INK, charSpace: 0.8 });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(GREY_DARK);
    const ccText = invoice.condicionesComerciales.replace(/[•■●▪]/g, '-');
    const ccLines = doc.splitTextToSize(ccText, CONTENT_W);
    for (const line of ccLines) {
      if (y > PAGE_BOTTOM) {
        y = newPagePlain();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        setColor(GREY_DARK);
      }
      doc.text(line, X_LEFT, y);
      y += 3.8;
    }
  }

  // ============ FIRMAS (presupuestos) ============
  if (isPresupuesto) {
    if (y + 48 > PAGE_BOTTOM) y = newPagePlain();
    y += 8;
    zoneLabel('Conformidad', X_LEFT, y);
    hairline(y + 2, X_LEFT, X_RIGHT);
    y += 24;

    // Firma del cliente capturada en pantalla: se coloca sobre su linea
    if (invoice.firmaCliente && /^data:image\/png/.test(invoice.firmaCliente)) {
      try {
        // caja 50x18 mm centrada sobre la linea del cliente, apoyada en ella
        doc.addImage(invoice.firmaCliente, 'PNG', 127, y - 19, 50, 18);
      } catch (e) { console.warn('No se pudo incrustar la firma:', e); }
    }

    doc.setDrawColor(INK[0], INK[1], INK[2]);
    doc.setLineWidth(0.3);
    doc.line(X_LEFT, y, 78, y);
    doc.line(122, y, 182, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setColor(GREY_MID);
    doc.text('La empresa', (X_LEFT + 78) / 2, y + 4.5, { align: 'center' });
    doc.text('El cliente', (122 + 182) / 2, y + 4.5, { align: 'center' });
    y += 10;
  }

  // ============ PIE EN TODAS LAS PAGINAS (pasada final) ============
  const totalPages = doc.internal.getNumberOfPages();
  const fiscalParts = [
    em.nombre,
    em.nif ? 'NIF ' + em.nif : '',
    [em.direccion, [em.cp, em.ciudad].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    em.web || ''
  ].filter(Boolean);
  // Acortar hasta caber en 145 mm: primero web, luego direccion
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  let fiscalLine = fiscalParts.join(' · ');
  while (doc.getTextWidth(fiscalLine) > 145 && fiscalParts.length > 2) {
    fiscalParts.pop();
    fiscalLine = fiscalParts.join(' · ');
  }

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    hairline(FOOT_RULE_Y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setColor(GREY_MID);
    doc.text(fiscalLine, X_LEFT, 282.5);
    if (!isPresupuesto && em.iban) {
      doc.setFont('courier', 'normal');
      doc.text('IBAN ' + em.iban, X_LEFT, 286);
    }
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${totalPages}`, X_RIGHT, 282.5, { align: 'right' });
  }

  const docLabel = isPresupuesto ? 'Presupuesto' : 'Factura';
  const filename = `${docLabel}_${invoice.invoiceNumber || 'nuevo'}.pdf`;
  return { doc, filename };
}

// Download the PDF
export async function generatePDF(invoice) {
  const { doc, filename } = await buildPDF(invoice);
  doc.save(filename);
}

// Get the PDF as a File object (for Web Share API / attachments)
export async function generatePDFFile(invoice) {
  const { doc, filename } = await buildPDF(invoice);
  const blob = doc.output('blob');
  return new File([blob], filename, { type: 'application/pdf' });
}

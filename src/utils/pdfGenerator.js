import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatNumber, calcLineSubtotal, calcLineTotal, formatDateES, getUnitLabel, calcInvoiceTaxBreakdown, parseSpanishNumber } from './formatters';
import { getLogoBase64 } from './logoSvg';

export async function generatePDF(invoice) {
  const logoData = await getLogoBase64(invoice.emisor);
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 8;

  const dateFormatted = formatDateES(invoice.date);

  // Modern color palette
  const primary = [26, 54, 93];
  const white = [255, 255, 255];
  const textDark = [30, 41, 59];
  const textMuted = [100, 116, 139];
  const borderColor = [203, 213, 225];
  const altRowBg = [248, 250, 252];

  // Helper: draw a cell with modern styling
  const drawCell = (x, yPos, w, h, text, opts = {}) => {
    const { bold, fontSize = 7, align = 'left', fill, border = true, textColor, borderSides, mono } = opts;
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(x, yPos, w, h, 'F');
    }
    if (border) {
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.15);
      if (borderSides === 'bottom') {
        doc.line(x, yPos + h, x + w, yPos + h);
      } else {
        doc.rect(x, yPos, w, h);
      }
    }
    doc.setFontSize(fontSize);
    doc.setFont(mono ? 'courier' : 'helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...(textColor || textDark));

    let tx = x + 1.5;
    if (align === 'right') tx = x + w - 1.5;
    if (align === 'center') tx = x + w / 2;

    const str = String(text || '');
    // For cells taller than standard (multi-line text), start near top
    if (h > 8) {
      doc.text(str, tx, yPos + 3.5, { align, maxWidth: w - 3 });
    } else {
      doc.text(str, tx, yPos + h / 2 + fontSize * 0.12, { align, maxWidth: w - 3 });
    }
  };

  // Header cell style for dark blue headers
  const drawHeaderCell = (x, yPos, w, h, text, align = 'left') => {
    drawCell(x, yPos, w, h, text, { bold: true, fill: primary, textColor: white, fontSize: 6.5, align, border: false });
  };

  // === HEADER: Logo (or company name) + Client ===
  const logoY = y;
  const em = invoice.emisor || {};

  if (logoData) {
    try {
      const fmt = /^data:image\/jpe?g/i.test(logoData) ? 'JPEG' : 'PNG';
      // Fit within a 65x30 box preserving aspect ratio
      const props = doc.getImageProperties(logoData);
      const maxW = 65, maxH = 30;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      doc.addImage(logoData, fmt, margin, logoY, props.width * ratio, props.height * ratio);
    } catch (e) {
      console.warn('Could not add logo:', e);
    }
  } else {
    // No logo: render company name + details as text block
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text(em.nombre || '', margin, logoY + 6);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    let ly = logoY + 11;
    if (em.subtitulo) { doc.text(em.subtitulo, margin, ly); ly += 4; }
    if (em.nif) { doc.text('NIF: ' + em.nif, margin, ly); ly += 4; }
    if (em.direccion) { doc.text(`${em.direccion}${em.cp ? ', ' + em.cp : ''} ${em.ciudad || ''}`, margin, ly); ly += 4; }
    if (em.web) { doc.text(em.web, margin, ly); }
  }

  // Client box
  const clientX = margin + contentWidth * 0.52;
  const clientW = contentWidth * 0.48;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.7);
  doc.roundedRect(clientX, logoY, clientW, 28, 1, 1);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(invoice.cliente.nombre, clientX + 3, logoY + 6);

  let clientLineY = logoY + 10;
  if (invoice.cliente.nif) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text('NIF: ' + invoice.cliente.nif, clientX + 3, clientLineY);
    clientLineY += 4;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(invoice.cliente.direccion, clientX + 3, clientLineY);
  doc.text(`${invoice.cliente.cp} ${invoice.cliente.ciudad}`, clientX + 3, clientLineY + 5);
  doc.text(invoice.cliente.provincia, clientX + 3, clientLineY + 10);

  y = logoY + 32;

  // === DOCUMENT INFO TABLE ===
  const docW = contentWidth * 0.55;
  const colW = docW / 4;
  const rowH = 6;

  let x = margin;
  ['DOCUMENTO', 'NUMERO', 'PAGINA', 'FECHA'].forEach(h => {
    drawHeaderCell(x, y, colW, rowH, h);
    x += colW;
  });
  y += rowH;
  x = margin;
  [invoice.documentType, invoice.invoiceNumber, invoice.page, dateFormatted].forEach(v => {
    drawCell(x, y, colW, rowH, v, { fontSize: 8, bold: true });
    x += colW;
  });
  y += rowH + 3;

  // === NIF / AGENTE / FORMA DE PAGO (solo facturas) ===
  if (invoice.formaPago) {
    const nifW = contentWidth * 0.25;
    const fpW = contentWidth - nifW;

    x = margin;
    drawHeaderCell(x, y, nifW, rowH, 'N.I.F.'); x += nifW;
    drawHeaderCell(x, y, fpW, rowH, 'FORMA DE PAGO');
    y += rowH;
    x = margin;
    drawCell(x, y, nifW, rowH, invoice.cliente.nif); x += nifW;
    drawCell(x, y, fpW, rowH, invoice.formaPago, { fontSize: 6 });
    y += rowH + 3;
  }

  // === LINES TABLE ===
  const colWidths = [
    contentWidth * 0.07,  // ART
    contentWidth * 0.28,  // DESCRIPCION
    contentWidth * 0.07,  // UD
    contentWidth * 0.11,  // CANTIDAD
    contentWidth * 0.11,  // PRECIO
    contentWidth * 0.13,  // SUBTOTAL
    contentWidth * 0.08,  // DTO
    contentWidth * 0.15   // TOTAL
  ];
  const headers = ['ART.', 'DESCRIPCION', 'UD.', 'CANTIDAD', 'PRECIO', 'SUBTOTAL', 'DTO.', 'TOTAL'];
  const aligns = ['left', 'left', 'center', 'right', 'right', 'right', 'right', 'right'];

  x = margin;
  headers.forEach((h, i) => {
    drawHeaderCell(x, y, colWidths[i], rowH, h, aligns[i]);
    x += colWidths[i];
  });
  y += rowH;

  // Work description (solo facturas, dentro de tabla)
  const descTrabajo = invoice.descripcionTrabajo || invoice.descripcionObra;
  if (descTrabajo) {
    const descH = rowH * 1.5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    const descLines = doc.splitTextToSize(descTrabajo, contentWidth - colWidths[0] - 6);
    x = margin;
    drawCell(x, y, colWidths[0], descH, '', { border: false });
    drawCell(x + colWidths[0], y, contentWidth - colWidths[0], descH, '', { border: false });
    doc.text(descLines, margin + colWidths[0] + 2, y + 4);
    y += descH;
  }

  const pageBottom = 280; // max Y before needing new page

  // Function to draw table headers on new page
  const drawTableHeaders = () => {
    x = margin;
    headers.forEach((h, i) => {
      drawHeaderCell(x, y, colWidths[i], rowH, h, aligns[i]);
      x += colWidths[i];
    });
    y += rowH;
  };

  // Line items
  invoice.lineas.forEach((linea, idx) => {
    const hasData = linea.cantidad || linea.precioUd;
    const subtotal = calcLineSubtotal(linea);
    const total = calcLineTotal(linea);
    const bg = idx % 2 !== 0 ? altRowBg : null;

    // Calculate dynamic row height based on description length
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const descW = colWidths[1] - 3;
    const descTextLines = doc.splitTextToSize(String(linea.descripcion || ''), descW);
    const lineRowH = Math.max(rowH, descTextLines.length * 3.5 + 2);

    // Check if row fits on current page
    if (y + lineRowH > pageBottom) {
      doc.addPage();
      y = 15;
      drawTableHeaders();
    }

    x = margin;
    drawCell(x, y, colWidths[0], lineRowH, linea.articulo, { fill: bg, borderSides: 'bottom' }); x += colWidths[0];
    drawCell(x, y, colWidths[1], lineRowH, linea.descripcion, { fill: bg, borderSides: 'bottom' }); x += colWidths[1];
    drawCell(x, y, colWidths[2], lineRowH, getUnitLabel(linea.unidad), { fill: bg, borderSides: 'bottom', align: 'center', textColor: textMuted, fontSize: 6.5 }); x += colWidths[2];
    drawCell(x, y, colWidths[3], lineRowH, hasData ? formatNumber(parseFloat(linea.cantidad) || 0) : '', { fill: bg, borderSides: 'bottom', align: 'right', mono: true }); x += colWidths[3];
    drawCell(x, y, colWidths[4], lineRowH, hasData ? formatNumber(parseFloat(linea.precioUd) || 0) : '', { fill: bg, borderSides: 'bottom', align: 'right', mono: true }); x += colWidths[4];
    drawCell(x, y, colWidths[5], lineRowH, hasData ? formatNumber(subtotal) : '', { fill: bg, borderSides: 'bottom', align: 'right', mono: true }); x += colWidths[5];
    drawCell(x, y, colWidths[6], lineRowH, linea.dto ? formatNumber(parseFloat(linea.dto)) : '', { fill: bg, borderSides: 'bottom', align: 'right' }); x += colWidths[6];
    drawCell(x, y, colWidths[7], lineRowH, hasData ? formatNumber(total) : '', { fill: bg, borderSides: 'bottom', align: 'right', bold: true, mono: true });
    y += lineRowH;
  });

  // === DEDUCCIONES como filas en la tabla de lineas ===
  const dedColor = [220, 38, 38]; // red-600
  (invoice.deducciones || []).forEach((ded, dIdx) => {
    // Simple manual deduction (descripcion + importe directo)
    if (ded.manual && !ded.lineas) {
      const importe = parseSpanishNumber(ded.importe);
      const desc = ded.descripcion || '';
      if (!desc && !importe) return;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(String(desc || ''), colWidths[1] - 3);
      const lineRowH = Math.max(rowH, descLines.length * 3.5 + 2);

      if (y + lineRowH > pageBottom) {
        doc.addPage();
        y = 15;
        drawTableHeaders();
      }

      x = margin;
      drawCell(x, y, colWidths[0], lineRowH, '', { borderSides: 'bottom' }); x += colWidths[0];
      drawCell(x, y, colWidths[1], lineRowH, desc, { borderSides: 'bottom' }); x += colWidths[1];
      drawCell(x, y, colWidths[2], lineRowH, '', { borderSides: 'bottom' }); x += colWidths[2];
      drawCell(x, y, colWidths[3], lineRowH, '1,00', { borderSides: 'bottom', align: 'right', mono: true }); x += colWidths[3];
      drawCell(x, y, colWidths[4], lineRowH, '-' + formatNumber(importe), { borderSides: 'bottom', align: 'right', mono: true, textColor: dedColor }); x += colWidths[4];
      drawCell(x, y, colWidths[5], lineRowH, '-' + formatNumber(importe), { borderSides: 'bottom', align: 'right', mono: true, textColor: dedColor }); x += colWidths[5];
      drawCell(x, y, colWidths[6], lineRowH, '', { borderSides: 'bottom' }); x += colWidths[6];
      drawCell(x, y, colWidths[7], lineRowH, '-' + formatNumber(importe), { borderSides: 'bottom', align: 'right', bold: true, mono: true, textColor: dedColor });
      y += lineRowH;
      return;
    }

    // Deduction with lineas (from imported invoice)
    const activeLineas = (ded.lineas || []).filter(l => l.incluir !== false);
    activeLineas.forEach((linea, lIdx) => {
      const cant = parseFloat(linea.cantidad) || 0;
      const precio = parseFloat(linea.precioUd) || 0;
      const sub = cant * precio;
      const desc = `FACTURA ${ded.facturaNum || ''}${ded.facturaFecha ? ' DEL ' + formatDateES(ded.facturaFecha) : ''}${linea.descripcion ? ' - ' + linea.descripcion : ''}`;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(String(desc || ''), colWidths[1] - 3);
      const lineRowH = Math.max(rowH, descLines.length * 3.5 + 2);

      if (y + lineRowH > pageBottom) {
        doc.addPage();
        y = 15;
        drawTableHeaders();
      }

      x = margin;
      drawCell(x, y, colWidths[0], lineRowH, '', { borderSides: 'bottom' }); x += colWidths[0];
      drawCell(x, y, colWidths[1], lineRowH, desc, { borderSides: 'bottom' }); x += colWidths[1];
      drawCell(x, y, colWidths[2], lineRowH, getUnitLabel(linea.unidad), { borderSides: 'bottom', align: 'center', textColor: textMuted, fontSize: 6.5 }); x += colWidths[2];
      drawCell(x, y, colWidths[3], lineRowH, formatNumber(cant), { borderSides: 'bottom', align: 'right', mono: true }); x += colWidths[3];
      drawCell(x, y, colWidths[4], lineRowH, '-' + formatNumber(precio), { borderSides: 'bottom', align: 'right', mono: true, textColor: dedColor }); x += colWidths[4];
      drawCell(x, y, colWidths[5], lineRowH, '-' + formatNumber(sub), { borderSides: 'bottom', align: 'right', mono: true, textColor: dedColor }); x += colWidths[5];
      drawCell(x, y, colWidths[6], lineRowH, '', { borderSides: 'bottom' }); x += colWidths[6];
      drawCell(x, y, colWidths[7], lineRowH, '-' + formatNumber(sub), { borderSides: 'bottom', align: 'right', bold: true, mono: true, textColor: dedColor });
      y += lineRowH;
    });
  });
  y += 3;

  // OLD: separate deductions table - disabled
  if (false && invoice.deducciones && invoice.deducciones.length > 0) {
    const dedBg = [255, 247, 237];
    const dedHeaderBg = [194, 65, 12];
    const dedColW = [contentWidth * 0.40, contentWidth * 0.10, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.20];
    for (const ded of invoice.deducciones) {
      const activeLineas = (ded.lineas || []).filter(l => l.incluir !== false);
      if (activeLineas.length === 0) continue;
      y += 2;
    }
    y += 1;
  }

  // Page check before summary
  if (y + 30 > pageBottom) { doc.addPage(); y = 15; }

  // === TAX SUMMARY + OBSERVATIONS + TOTAL ===
  const ivaConfig = invoice.iva || { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
  const tax = calcInvoiceTaxBreakdown(invoice.lineas, ivaConfig, invoice.deducciones);

  const obsW = contentWidth * 0.45;
  const summaryW = contentWidth * 0.55;
  const summaryX = margin + obsW + 2;

  // Observations box
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.15);
  doc.roundedRect(margin, y, obsW - 2, 22, 1, 1);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text('OBSERVACIONES', margin + 2, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textDark);
  const obsLines = doc.splitTextToSize(invoice.observaciones || '', obsW - 8);
  doc.text(obsLines, margin + 2, y + 7);

  if (tax.isISP) {
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text('Operacion con inversion del sujeto pasivo conforme al Art.84 de la Ley del IVA 37/1992', margin + 2, y + 18, { maxWidth: obsW - 8 });
  }

  // Tax summary - calculate height first
  let summaryY = y;
  const ROW_H = 4.5;
  let numRows = 2; // Base Imponible + IVA
  if (tax.totalDeducciones > 0) numRows += 2; // Subtotal + Deducciones
  if (tax.hasRE && !tax.isISP) numRows += 1; // RE
  const summaryBoxH = numRows * ROW_H + 3; // padding top/bottom

  doc.setDrawColor(...borderColor);
  doc.roundedRect(summaryX, summaryY, summaryW - 2, summaryBoxH, 1, 1);

  const drawSummaryRow = (label, value, yOff, color) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...(color || textMuted));
    doc.text(label, summaryX + 3, summaryY + yOff);
    doc.setFont('courier', 'normal');
    doc.setTextColor(...textDark);
    doc.text(formatNumber(value), summaryX + summaryW - 5, summaryY + yOff, { align: 'right' });
  };

  let rowOffset = ROW_H;
  if (tax.totalDeducciones > 0) {
    drawSummaryRow('Subtotal lineas', tax.baseLineas, rowOffset);
    rowOffset += ROW_H;
    drawSummaryRow('Deducciones', -tax.totalDeducciones, rowOffset, [194, 65, 12]);
    rowOffset += ROW_H;
  }
  drawSummaryRow('Base Imponible', tax.base, rowOffset);
  rowOffset += ROW_H;
  if (tax.isISP) {
    drawSummaryRow('IVA (Inv. Sujeto Pasivo)', 0, rowOffset, [180, 83, 9]);
  } else {
    drawSummaryRow(`IVA (${ivaConfig.tipo}%)`, tax.ivaAmount, rowOffset);
  }
  rowOffset += ROW_H;
  if (tax.hasRE && !tax.isISP) {
    drawSummaryRow(`R.E. (${tax.reRate}%)`, tax.reAmount, rowOffset);
    rowOffset += ROW_H;
  }

  // Total box (dark blue) - positioned right after the summary box
  const totalBoxH = 9;
  const totalBoxY = summaryY + summaryBoxH + 2;
  doc.setFillColor(...primary);
  doc.roundedRect(summaryX, totalBoxY, summaryW - 2, totalBoxH, 1, 1, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...white);
  doc.text('TOTAL', summaryX + 3, totalBoxY + 6);

  // Adaptive font size for total
  const totalText = formatNumber(tax.total) + ' EUR';
  doc.setFont('courier', 'bold');
  const availableWidth = summaryW - 18;
  let totalFontSize = 13;
  doc.setFontSize(totalFontSize);
  while (doc.getTextWidth(totalText) > availableWidth && totalFontSize > 6) {
    totalFontSize -= 0.5;
    doc.setFontSize(totalFontSize);
  }
  doc.text(totalText, summaryX + summaryW - 3, totalBoxY + 6, { align: 'right' });

  // Advance y to the bottom of whichever block is taller (obs box vs summary+total)
  const summaryBlockBottom = totalBoxY + totalBoxH;
  const obsBlockBottom = y + 22;
  y = Math.max(summaryBlockBottom, obsBlockBottom) + 4;

  // === CONDICIONES (presupuestos) ===
  if (invoice.validez || invoice.plazoEjecucion || invoice.condiciones) {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.15);
    const condH = invoice.condiciones ? 18 : 8;
    doc.roundedRect(margin, y, contentWidth, condH, 1, 1);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text('CONDICIONES', margin + 2, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textDark);
    let condY = y + 3.5;
    if (invoice.validez) {
      doc.setTextColor(...textMuted);
      doc.text('Validez: ', margin + 2, condY + 4);
      doc.setTextColor(...textDark);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.validez, margin + 16, condY + 4);
      doc.setFont('helvetica', 'normal');
    }
    if (invoice.plazoEjecucion) {
      doc.setTextColor(...textMuted);
      doc.text('Plazo: ', margin + 45, condY + 4);
      doc.setTextColor(...textDark);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.plazoEjecucion, margin + 55, condY + 4);
      doc.setFont('helvetica', 'normal');
    }
    if (invoice.condiciones) {
      doc.setTextColor(...textDark);
      const condLines = doc.splitTextToSize(invoice.condiciones, contentWidth - 6);
      doc.text(condLines, margin + 2, condY + 8);
    }
    y += condH + 3;
  }

  // === CONDICIONES COMERCIALES (presupuestos) ===
  if (invoice.condicionesComerciales) {
    // Check if we need a new page
    if (y > 200) {
      doc.addPage();
      y = 15;
    }
    // Header line
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text('CONDICIONES COMERCIALES', margin, y);
    y += 5;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    // Replace any remaining unicode chars that jsPDF can't handle
    const ccText = (invoice.condicionesComerciales || '').replace(/[\u2022\u25A0\u25CF\u25AA]/g, '-');
    const ccLines = doc.splitTextToSize(ccText, contentWidth - 2);
    const lineH = 3.5;
    for (const line of ccLines) {
      if (y > 275) { doc.addPage(); y = 15; }
      doc.text(line, margin, y);
      y += lineH;
    }
    y += 5;
  }

  // === FIRMAS (presupuestos) ===
  if (invoice.documentType === 'Presupuesto') {
    if (y > 240) { doc.addPage(); y = 15; }
    y += 5;
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.15);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    const firma1X = margin + contentWidth * 0.1;
    const firma2X = margin + contentWidth * 0.6;
    const firmaW = contentWidth * 0.3;

    // Signature lines
    doc.setDrawColor(...borderColor);
    doc.line(firma1X, y + 20, firma1X + firmaW, y + 20);
    doc.line(firma2X, y + 20, firma2X + firmaW, y + 20);

    // Labels
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text('FDO: LA EMPRESA', firma1X + firmaW / 2, y + 25, { align: 'center' });
    doc.text('FDO: EL CLIENTE', firma2X + firmaW / 2, y + 25, { align: 'center' });
    y += 30;
  }

  // === VENCIMIENTOS ===
  const hasVencimientos = invoice.vencimientos && invoice.vencimientos.some(v => v.fecha || v.importe);
  if (hasVencimientos) {
    const vHeaders = ['VENCIMIENTOS', 'IMPORTE', 'DOMICILIACION', 'OFICINA', 'NUMERO DE CUENTA'];
    const vColW = [contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.25, contentWidth * 0.15, contentWidth * 0.30];
    const vAligns = ['left', 'right', 'left', 'left', 'left'];

    x = margin;
    vHeaders.forEach((h, i) => {
      drawHeaderCell(x, y, vColW[i], rowH, h, vAligns[i]);
      x += vColW[i];
    });
    y += rowH;

    invoice.vencimientos.forEach(v => {
      x = margin;
      drawCell(x, y, vColW[0], rowH, v.fecha ? formatDateES(v.fecha) : ''); x += vColW[0];
      drawCell(x, y, vColW[1], rowH, v.importe ? formatNumber(parseFloat(v.importe)) : '', { align: 'right', mono: true }); x += vColW[1];
      drawCell(x, y, vColW[2], rowH, v.domiciliacion || ''); x += vColW[2];
      drawCell(x, y, vColW[3], rowH, v.oficina || ''); x += vColW[3];
      drawCell(x, y, vColW[4], rowH, v.numeroCuenta || '', { mono: true });
      y += rowH;
    });
  }

  // === PAGE NUMBERS ===
  const totalPages = doc.internal.getNumberOfPages();
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textMuted);
      doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
    }
  }

  const docLabel = invoice.documentType === 'Presupuesto' ? 'Presupuesto' : 'Factura';
  doc.save(`${docLabel}_${invoice.invoiceNumber || 'nuevo'}.pdf`);
}

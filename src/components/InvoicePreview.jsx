import { formatNumber, calcLineSubtotal, calcLineTotal, formatDateES, getUnitLabel, calcInvoiceTaxBreakdown, parseSpanishNumber } from '../utils/formatters';
import { getLogoDataUrl } from '../utils/logoSvg';

export default function InvoicePreview({ invoice }) {
  if (!invoice) return null;

  const ivaConfig = invoice.iva || { tipo: 21, recargoEquivalencia: false, inversionSujetoPasivo: false };
  const tax = calcInvoiceTaxBreakdown(invoice.lineas, ivaConfig, invoice.deducciones);
  const dateFormatted = formatDateES(invoice.date);

  const primary = '#1a365d';
  const borderLight = '#cbd5e1';
  const textDark = '#1e293b';
  const textMuted = '#64748b';
  const altRow = '#f8fafc';

  const thStyle = { backgroundColor: primary, color: 'white', padding: '2.5mm 2mm', fontSize: '7.5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', border: 'none', textAlign: 'center' };
  const tdStyle = { padding: '2mm 2mm', fontSize: '9px', borderBottom: `0.5px solid ${borderLight}`, color: textDark, textAlign: 'center' };

  return (
    <div className="invoice-preview" style={{ width: '210mm', minHeight: '297mm', padding: '8mm 12mm', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", fontSize: '9px', color: textDark, backgroundColor: 'white' }}>

      {/* Header: Logo + Client */}
      <div style={{ display: 'flex', gap: '6mm', marginBottom: '5mm', marginTop: '2mm' }}>
        <div style={{ flex: '1' }}>
          {getLogoDataUrl(invoice.emisor) ? (
            <img src={getLogoDataUrl(invoice.emisor)} alt="Logo" style={{ maxWidth: '70mm', maxHeight: '30mm', height: 'auto', marginBottom: '1mm' }} />
          ) : (
            <div style={{ paddingTop: '2mm' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: primary }}>{invoice.emisor?.nombre || ''}</div>
              {invoice.emisor?.subtitulo && <div style={{ fontSize: '8px', color: textMuted, marginTop: '1mm' }}>{invoice.emisor.subtitulo}</div>}
            </div>
          )}
          <div style={{ fontSize: '7.5px', color: textMuted, marginTop: '2mm', lineHeight: '1.5' }}>
            {invoice.emisor?.nif && <div>NIF: {invoice.emisor.nif}</div>}
            {invoice.emisor?.direccion && <div>{invoice.emisor.direccion}{invoice.emisor.cp ? `, ${invoice.emisor.cp}` : ''} {invoice.emisor.ciudad}</div>}
            {invoice.emisor?.web && <div>{invoice.emisor.web}</div>}
          </div>
        </div>
        <div style={{ flex: '1', border: `2.5px solid ${primary}`, borderRadius: '3px', padding: '4mm' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: primary, marginBottom: '2mm' }}>
            {invoice.cliente.nombre}
          </div>
          {invoice.cliente.nif && (
            <div style={{ fontSize: '8px', color: textMuted, marginBottom: '1mm' }}>NIF: {invoice.cliente.nif}</div>
          )}
          <div style={{ fontSize: '9px', color: textDark, lineHeight: '1.5' }}>
            {invoice.cliente.direccion}<br />
            {invoice.cliente.cp} {invoice.cliente.ciudad}<br />
            {invoice.cliente.provincia}
          </div>
        </div>
      </div>

      {/* Document info */}
      <table style={{ width: '55%', borderCollapse: 'collapse', marginBottom: '3mm', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {['DOCUMENTO', 'NUMERO', 'PAGINA', 'FECHA'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {[invoice.documentType, invoice.invoiceNumber, invoice.page, dateFormatted].map((v, i) => (
              <td key={i} style={{ ...tdStyle, fontWeight: '500' }}>{v}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* NIF / Forma de pago (solo facturas) */}
      {invoice.formaPago && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '20%' }}>N.I.F.</th>
              <th style={{ ...thStyle, width: '80%' }}>FORMA DE PAGO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, fontWeight: '500' }}>{invoice.cliente.nif}</td>
              <td style={{ ...tdStyle, fontSize: '8.5px' }}>{invoice.formaPago}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Lines table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '7%' }}>ART.</th>
            <th style={{ ...thStyle, width: '30%', textAlign: 'left' }}>DESCRIPCION</th>
            <th style={{ ...thStyle, width: '7%', textAlign: 'center' }}>UD.</th>
            <th style={{ ...thStyle, width: '11%', textAlign: 'right' }}>CANTIDAD</th>
            <th style={{ ...thStyle, width: '11%', textAlign: 'right' }}>PRECIO</th>
            <th style={{ ...thStyle, width: '13%', textAlign: 'right' }}>SUBTOTAL</th>
            <th style={{ ...thStyle, width: '7%', textAlign: 'right' }}>DTO.</th>
            <th style={{ ...thStyle, width: '14%', textAlign: 'right' }}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {/* Descripcion trabajo dentro de tabla (solo facturas) */}
          {(invoice.descripcionTrabajo || invoice.descripcionObra) && (
            <tr>
              <td style={{ ...tdStyle, borderBottom: 'none' }}></td>
              <td colSpan="7" style={{ ...tdStyle, paddingTop: '3mm', paddingBottom: '2mm', borderBottom: 'none', textAlign: 'left' }}>
                <div style={{ fontWeight: '600', whiteSpace: 'pre-line', color: primary }}>{invoice.descripcionTrabajo || invoice.descripcionObra}</div>
              </td>
            </tr>
          )}
          {invoice.lineas.map((linea, idx) => {
            const hasData = linea.cantidad || linea.precioUd;
            const subtotal = calcLineSubtotal(linea);
            const total = calcLineTotal(linea);
            const bg = idx % 2 === 0 ? 'white' : altRow;
            return (
              <tr key={idx} style={{ backgroundColor: bg }}>
                <td style={tdStyle}>{linea.articulo}</td>
                <td style={{ ...tdStyle, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{linea.descripcion}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: textMuted, fontSize: '8px' }}>{getUnitLabel(linea.unidad)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{hasData ? formatNumber(parseFloat(linea.cantidad) || 0) : ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{hasData ? formatNumber(parseFloat(linea.precioUd) || 0) : ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{hasData ? formatNumber(subtotal) : ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{linea.dto ? formatNumber(parseFloat(linea.dto)) : ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: "'Courier New', monospace" }}>{hasData ? formatNumber(total) : ''}</td>
              </tr>
            );
          })}
          {/* Deducciones como lineas con valores negativos */}
          {(invoice.deducciones || []).flatMap((ded, dIdx) => {
            // Simple manual deduction (descripcion + importe directo)
            if (ded.manual && !ded.lineas) {
              const importe = parseSpanishNumber(ded.importe);
              if (!ded.descripcion && !importe) return [];
              return [(
                <tr key={`ded-${dIdx}`} style={{ backgroundColor: 'white' }}>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, wordBreak: 'break-word', overflowWrap: 'break-word', textAlign: 'left' }}>{ded.descripcion}</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>1,00</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace", color: '#dc2626' }}>-{formatNumber(importe)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace", color: '#dc2626' }}>-{formatNumber(importe)}</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: "'Courier New', monospace", color: '#dc2626' }}>-{formatNumber(importe)}</td>
                </tr>
              )];
            }
            // Deduction with lineas (imported from invoice or old format)
            const activeLineas = (ded.lineas || []).filter(l => l.incluir !== false);
            return activeLineas.map((linea, lIdx) => {
              const sub = (parseFloat(linea.cantidad) || 0) * (parseFloat(linea.precioUd) || 0);
              const cant = parseFloat(linea.cantidad) || 0;
              const precio = parseFloat(linea.precioUd) || 0;
              const desc = `FACTURA ${ded.facturaNum || ''}${ded.facturaFecha ? ' DEL ' + formatDateES(ded.facturaFecha) : ''}${linea.descripcion ? ' - ' + linea.descripcion : ''}`;
              return (
                <tr key={`ded-${dIdx}-${lIdx}`} style={{ backgroundColor: 'white' }}>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, wordBreak: 'break-word', overflowWrap: 'break-word', textAlign: 'left' }}>{desc}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: textMuted, fontSize: '8px' }}>{getUnitLabel(linea.unidad)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{formatNumber(cant)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace", color: '#dc2626' }}>-{formatNumber(precio)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace", color: '#dc2626' }}>-{formatNumber(sub)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', fontFamily: "'Courier New', monospace", color: '#dc2626' }}>-{formatNumber(sub)}</td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>

      {/* Tax summary + Observations + Total */}
      <div style={{ display: 'flex', gap: '4mm', marginBottom: '4mm' }}>
        {/* Observations */}
        <div style={{ flex: '1', border: `1px solid ${borderLight}`, borderRadius: '3px', padding: '3mm', fontSize: '8px' }}>
          <div style={{ fontWeight: '700', color: primary, marginBottom: '1.5mm', textTransform: 'uppercase', fontSize: '7px', letterSpacing: '0.5px' }}>Observaciones</div>
          <div style={{ whiteSpace: 'pre-line', color: textDark, lineHeight: '1.5' }}>{invoice.observaciones}</div>
          {tax.isISP && (
            <div style={{ marginTop: '2mm', padding: '1.5mm', backgroundColor: '#fef3c7', borderRadius: '2px', fontSize: '7.5px', color: '#92400e' }}>
              Operacion con inversion del sujeto pasivo conforme al Art.84 de la Ley del IVA 37/1992
            </div>
          )}
        </div>

        {/* Tax breakdown + Total */}
        <div style={{ width: '55%' }}>
          <div style={{ border: `1px solid ${borderLight}`, borderRadius: '3px', padding: '3mm', marginBottom: '2mm' }}>
            {tax.totalDeducciones > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px' }}>
                  <span style={{ color: textMuted }}>Subtotal lineas</span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '500' }}>{formatNumber(tax.baseLineas)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px', color: '#c2410c' }}>
                  <span>Deducciones</span>
                  <span style={{ fontFamily: "'Courier New', monospace" }}>-{formatNumber(tax.totalDeducciones)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px' }}>
              <span style={{ color: textMuted }}>Base Imponible</span>
              <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '500' }}>{formatNumber(tax.base)}</span>
            </div>
            {tax.isISP ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px', color: '#b45309' }}>
                <span>IVA (Inv. Sujeto Pasivo)</span>
                <span style={{ fontFamily: "'Courier New', monospace" }}>0,00</span>
              </div>
            ) : tax.esMultiTipo ? (
              tax.porTipo.map(g => (
                <div key={g.tipo} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px' }}>
                  <span style={{ color: textMuted }}>IVA {g.tipo}% (base {formatNumber(g.base)})</span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '500' }}>{formatNumber(g.cuota)}</span>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px' }}>
                <span style={{ color: textMuted }}>IVA ({tax.porTipo[0]?.tipo ?? ivaConfig.tipo}%)</span>
                <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '500' }}>{formatNumber(tax.ivaAmount)}</span>
              </div>
            )}
            {tax.hasRE && !tax.isISP && (
              tax.esMultiTipo ? (
                tax.porTipo.filter(g => g.re !== 0).map(g => (
                  <div key={'re' + g.tipo} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px' }}>
                    <span style={{ color: textMuted }}>R.E. {g.reRate}% (base {formatNumber(g.base)})</span>
                    <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '500' }}>{formatNumber(g.re)}</span>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px' }}>
                  <span style={{ color: textMuted }}>R.E. ({tax.reRate}%)</span>
                  <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '500' }}>{formatNumber(tax.reAmount)}</span>
                </div>
              )
            )}
            {tax.hasIRPF && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm', fontSize: '8.5px', color: '#dc2626' }}>
                <span>IRPF ({tax.irpfRate}%)</span>
                <span style={{ fontFamily: "'Courier New', monospace", fontWeight: '500' }}>{formatNumber(-tax.irpfAmount)}</span>
              </div>
            )}
          </div>
          {/* Total box */}
          {(() => {
            const totalStr = formatNumber(tax.total);
            // Adaptive font size: smaller if number is long
            const len = totalStr.length;
            const totalFontSize = len > 13 ? '10px' : len > 11 ? '12px' : len > 9 ? '14px' : '16px';
            return (
              <div style={{ backgroundColor: primary, color: 'white', borderRadius: '3px', padding: '3mm 3mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2mm' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>TOTAL</span>
                <span style={{ fontSize: totalFontSize, fontWeight: '700', fontFamily: "'Courier New', monospace", whiteSpace: 'nowrap' }}>{totalStr} &euro;</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Condiciones del presupuesto */}
      {(invoice.validez || invoice.plazoEjecucion || invoice.condiciones) && (
        <div style={{ border: `1px solid ${borderLight}`, borderRadius: '3px', padding: '3mm', marginBottom: '3mm', fontSize: '8px' }}>
          <div style={{ display: 'flex', gap: '6mm', marginBottom: '2mm' }}>
            {invoice.validez && (
              <div><span style={{ color: textMuted }}>Validez del presupuesto:</span> <span style={{ fontWeight: '600' }}>{invoice.validez}</span></div>
            )}
            {invoice.plazoEjecucion && (
              <div><span style={{ color: textMuted }}>Plazo de ejecucion:</span> <span style={{ fontWeight: '600' }}>{invoice.plazoEjecucion}</span></div>
            )}
          </div>
          {invoice.condiciones && (
            <div style={{ whiteSpace: 'pre-line', color: textDark, lineHeight: '1.6' }}>{invoice.condiciones}</div>
          )}
        </div>
      )}

      {/* Condiciones comerciales (presupuestos) */}
      {invoice.condicionesComerciales && (
        <div style={{ borderTop: `2px solid ${primary}`, paddingTop: '4mm', marginBottom: '4mm' }}>
          <div style={{ fontWeight: '700', color: primary, fontSize: '12px', marginBottom: '4mm' }}>CONDICIONES COMERCIALES</div>
          <div style={{ whiteSpace: 'pre-line', color: textDark, fontSize: '8.5px', lineHeight: '1.7' }}>
            {invoice.condicionesComerciales}
          </div>
        </div>
      )}

      {/* Firmas (presupuestos) */}
      {invoice.documentType === 'Presupuesto' && (
        <div style={{ marginTop: '10mm', borderTop: `1px solid ${borderLight}`, paddingTop: '6mm' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center', width: '40%' }}>
              <div style={{ height: '20mm', borderBottom: `1px solid ${borderLight}`, marginBottom: '2mm' }}></div>
              <div style={{ fontWeight: '700', fontSize: '10px', color: primary }}>FDO: LA EMPRESA</div>
            </div>
            <div style={{ textAlign: 'center', width: '40%' }}>
              <div style={{ height: '20mm', borderBottom: `1px solid ${borderLight}`, marginBottom: '2mm' }}></div>
              <div style={{ fontWeight: '700', fontSize: '10px', color: primary }}>FDO: EL CLIENTE</div>
            </div>
          </div>
        </div>
      )}

      {/* Vencimientos */}
      {invoice.vencimientos && invoice.vencimientos.some(v => v.fecha || v.importe) && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['VENCIMIENTOS', 'IMPORTE', 'DOMICILIACION', 'OFICINA', 'NUMERO DE CUENTA'].map(h => (
                <th key={h} style={{ ...thStyle, textAlign: h === 'IMPORTE' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.vencimientos.map((v, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{v.fecha ? formatDateES(v.fecha) : ''}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Courier New', monospace" }}>{v.importe ? formatNumber(parseFloat(v.importe)) : ''}</td>
                <td style={tdStyle}>{v.domiciliacion}</td>
                <td style={tdStyle}>{v.oficina}</td>
                <td style={{ ...tdStyle, fontFamily: "'Courier New', monospace" }}>{v.numeroCuenta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

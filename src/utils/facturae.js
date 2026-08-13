import { calcInvoiceTaxBreakdown, calcLineTotal, lineIvaRate } from './formatters';

// Generador de Facturae 3.2.2 (el formato XML que exige FACe y que valdra
// para la factura electronica B2B). Genera el XML SIN FIRMAR: el usuario lo
// firma con AutoFirma (la herramienta oficial gratuita) antes de presentarlo.
// Todo se genera en el navegador: los datos no salen del dispositivo.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (x) => (Math.round((Number(x) || 0) * 100) / 100).toFixed(2);
const n6 = (x) => (Number(x) || 0).toFixed(6);

// NIF sin espacios ni guiones; una persona fisica se detecta por empezar en digito
const cleanNif = (nif) => String(nif || '').replace(/[\s.-]/g, '').toUpperCase();
const isPersonaFisica = (nif) => /^\d/.test(cleanNif(nif));

function partyXML(tag, p) {
  const nif = cleanNif(p.nif);
  const persona = isPersonaFisica(nif);
  // Persona fisica: separar nombre y apellidos lo mejor posible
  const partes = String(p.nombre || '').trim().split(/\s+/);
  const nombrePila = partes[0] || '';
  const apellido1 = partes.slice(1, 2).join(' ') || nombrePila;
  const apellido2 = partes.slice(2).join(' ');
  const address = `
      <AddressInSpain>
        <Address>${esc(p.direccion || 'Sin direccion')}</Address>
        <PostCode>${esc(p.cp || '00000')}</PostCode>
        <Town>${esc(p.ciudad || 'Sin poblacion')}</Town>
        <Province>${esc(p.provincia || p.ciudad || 'Sin provincia')}</Province>
        <CountryCode>ESP</CountryCode>
      </AddressInSpain>`;
  return `
    <${tag}>
      <TaxIdentification>
        <PersonTypeCode>${persona ? 'F' : 'J'}</PersonTypeCode>
        <ResidenceTypeCode>R</ResidenceTypeCode>
        <TaxIdentificationNumber>${esc(nif || 'B00000000')}</TaxIdentificationNumber>
      </TaxIdentification>
      ${persona ? `<Individual>
        <Name>${esc(nombrePila)}</Name>
        <FirstSurname>${esc(apellido1)}</FirstSurname>
        ${apellido2 ? `<SecondSurname>${esc(apellido2)}</SecondSurname>` : ''}${address}
      </Individual>` : `<LegalEntity>
        <CorporateName>${esc(p.nombre || 'Sin nombre')}</CorporateName>${address}
      </LegalEntity>`}
    </${tag}>`;
}

export function generateFacturaeXML(invoice) {
  const em = invoice.emisor || {};
  const cli = invoice.cliente || {};
  const ivaConfig = invoice.iva || { tipo: 21 };
  const tax = calcInvoiceTaxBreakdown(invoice.lineas || [], ivaConfig, invoice.deducciones);

  const lineas = (invoice.lineas || []).filter(l => l.cantidad || l.precioUd || (l.descripcion || '').trim());

  // Numero: Facturae separa serie y numero; usamos el numero completo como numero
  const numero = String(invoice.invoiceNumber || 'SN');
  const fecha = invoice.date || new Date().toISOString().split('T')[0];

  const taxesOutputs = tax.porTipo.filter(g => !tax.isISP).map(g => `
        <Tax>
          <TaxTypeCode>01</TaxTypeCode>
          <TaxRate>${n2(g.tipo)}</TaxRate>
          <TaxableBase><TotalAmount>${n2(g.base)}</TotalAmount></TaxableBase>
          <TaxAmount><TotalAmount>${n2(g.cuota)}</TotalAmount></TaxAmount>${g.re ? `
          <EquivalenceSurcharge>${n2(g.reRate)}</EquivalenceSurcharge>
          <EquivalenceSurchargeAmount><TotalAmount>${n2(g.re)}</TotalAmount></EquivalenceSurchargeAmount>` : ''}
        </Tax>`).join('');

  const taxesWithheld = tax.hasIRPF ? `
      <TaxesWithheld>
        <Tax>
          <TaxTypeCode>04</TaxTypeCode>
          <TaxRate>${n2(tax.irpfRate)}</TaxRate>
          <TaxableBase><TotalAmount>${n2(tax.base)}</TotalAmount></TaxableBase>
          <TaxAmount><TotalAmount>${n2(tax.irpfAmount)}</TotalAmount></TaxAmount>
        </Tax>
      </TaxesWithheld>` : '';

  const itemsXML = lineas.map(l => {
    const rate = tax.isISP ? 0 : lineIvaRate(l, ivaConfig);
    const totalLinea = calcLineTotal(l);
    const cant = parseFloat(l.cantidad) || 0;
    const precio = parseFloat(l.precioUd) || 0;
    const cuotaLinea = totalLinea * rate / 100;
    return `
        <InvoiceLine>
          <ItemDescription>${esc([l.articulo, l.descripcion].filter(Boolean).join(' — ') || 'Concepto')}</ItemDescription>
          <Quantity>${n6(cant || 1)}</Quantity>
          <UnitOfMeasure>01</UnitOfMeasure>
          <UnitPriceWithoutTax>${n6(cant ? totalLinea / cant : precio || totalLinea)}</UnitPriceWithoutTax>
          <TotalCost>${n2(totalLinea)}</TotalCost>
          <GrossAmount>${n2(totalLinea)}</GrossAmount>
          <TaxesOutputs>
            <Tax>
              <TaxTypeCode>01</TaxTypeCode>
              <TaxRate>${n2(rate)}</TaxRate>
              <TaxableBase><TotalAmount>${n2(totalLinea)}</TotalAmount></TaxableBase>
              <TaxAmount><TotalAmount>${n2(cuotaLinea)}</TotalAmount></TaxAmount>
            </Tax>
          </TaxesOutputs>
        </InvoiceLine>`;
  }).join('');

  const totalFactura = tax.base + tax.ivaAmount + tax.reAmount; // antes de retencion

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.es/Facturae/2014/v3.2.1/Facturae" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <FileHeader>
    <SchemaVersion>3.2.1</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
    <Batch>
      <BatchIdentifier>${esc(cleanNif(em.nif) + numero)}</BatchIdentifier>
      <InvoicesCount>1</InvoicesCount>
      <TotalInvoicesAmount><TotalAmount>${n2(tax.total)}</TotalAmount></TotalInvoicesAmount>
      <TotalOutstandingAmount><TotalAmount>${n2(tax.total)}</TotalAmount></TotalOutstandingAmount>
      <TotalExecutableAmount><TotalAmount>${n2(tax.total)}</TotalAmount></TotalExecutableAmount>
      <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
    </Batch>
  </FileHeader>
  <Parties>
    ${partyXML('SellerParty', em)}
    ${partyXML('BuyerParty', cli)}
  </Parties>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>${esc(numero)}</InvoiceNumber>
        <InvoiceDocumentType>FC</InvoiceDocumentType>
        <InvoiceClass>OO</InvoiceClass>
      </InvoiceHeader>
      <InvoiceIssueData>
        <IssueDate>${esc(fecha)}</IssueDate>
        <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
        <TaxCurrencyCode>EUR</TaxCurrencyCode>
        <LanguageName>es</LanguageName>
      </InvoiceIssueData>
      <TaxesOutputs>${taxesOutputs}
      </TaxesOutputs>${taxesWithheld}
      <InvoiceTotals>
        <TotalGrossAmount>${n2(tax.base)}</TotalGrossAmount>
        <TotalGrossAmountBeforeTaxes>${n2(tax.base)}</TotalGrossAmountBeforeTaxes>
        <TotalTaxOutputs>${n2(tax.ivaAmount + tax.reAmount)}</TotalTaxOutputs>
        <TotalTaxesWithheld>${n2(tax.hasIRPF ? tax.irpfAmount : 0)}</TotalTaxesWithheld>
        <InvoiceTotal>${n2(totalFactura)}</InvoiceTotal>
        <TotalOutstandingAmount>${n2(tax.total)}</TotalOutstandingAmount>
        <TotalExecutableAmount>${n2(tax.total)}</TotalExecutableAmount>
      </InvoiceTotals>
      <Items>${itemsXML}
      </Items>
      <AdditionalData>
        <InvoiceAdditionalInformation>Generado con Presufact (presufactu.vercel.app). XML sin firmar: firmelo con AutoFirma (XAdES) antes de presentarlo en FACe.</InvoiceAdditionalInformation>
      </AdditionalData>
    </Invoice>
  </Invoices>
</fe:Facturae>`;

  return xml;
}

// Descarga el XML y devuelve true si el documento esta bien formado
export function downloadFacturae(invoice) {
  const xml = generateFacturaeXML(invoice);
  // validacion de forma: el XML debe parsear sin errores
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('El XML generado no es valido');
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Facturae_${(invoice.invoiceNumber || 'factura').replace(/[^\w-]/g, '_')}.xml`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

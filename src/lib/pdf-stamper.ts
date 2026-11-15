// ==============================================================================
// OOS Procurement PDF Stamper Engine (pdf-lib)
// ==============================================================================

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { QuoteCase, QuoteLineItem, SystemSettings } from './db';
import { formatPKR, INCOTERM_DICTIONARY } from './commercial-math';

export interface PDFStampOptions {
  type: 'FINAL_CLIENT_QUOTE' | 'OUTBOUND_SUPPLIER_RFQ';
  quoteCase: QuoteCase;
  lineItems: QuoteLineItem[];
  settings: SystemSettings;
  blankLetterheadPdf?: Uint8Array | null;
  supplierName?: string;
  rfqCategory?: string;
}

export async function stampQuotationPdf(options: PDFStampOptions): Promise<Uint8Array> {
  const {
    type,
    quoteCase,
    lineItems,
    settings,
    blankLetterheadPdf,
    supplierName,
    rfqCategory,
  } = options;

  let pdfDoc: PDFDocument;

  if (blankLetterheadPdf && blankLetterheadPdf.byteLength > 0) {
    try {
      pdfDoc = await PDFDocument.load(blankLetterheadPdf);
    } catch (e) {
      console.warn('Failed to parse uploaded letterhead PDF, falling back to clean template:', e);
      pdfDoc = await PDFDocument.create();
    }
  } else {
    pdfDoc = await PDFDocument.create();
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // A4 dimensions: 595.28 x 841.89
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const LEFT_MARGIN = 40;
  const RIGHT_MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN; // 515.28 pt

  const topMargin = settings.pdf_top_margin_pt || 140;
  const bottomMargin = settings.pdf_bottom_margin_pt || 90;

  // If no pages exist in letterhead document, add first page
  if (pdfDoc.getPageCount() === 0) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawFallbackLetterheadGuides(page, fontRegular, fontBold, topMargin, bottomMargin);
  }

  // Create a template page copy function for multi-page letterhead cloning
  const createNewPage = async (): Promise<PDFPage> => {
    if (blankLetterheadPdf && blankLetterheadPdf.byteLength > 0) {
      try {
        const templateDoc = await PDFDocument.load(blankLetterheadPdf);
        const [copiedPage] = await pdfDoc.copyPages(templateDoc, [0]);
        pdfDoc.addPage(copiedPage);
        return copiedPage;
      } catch (err) {
        // Fall back
      }
    }
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawFallbackLetterheadGuides(page, fontRegular, fontBold, topMargin, bottomMargin);
    return page;
  };

  let currentPage = pdfDoc.getPage(0);
  let currentY = PAGE_HEIGHT - topMargin;

  // 1. Draw Document Header (Reference No, Date, Customer / Supplier Info)
  const isRFQ = type === 'OUTBOUND_SUPPLIER_RFQ';
  const docTitle = isRFQ ? 'REQUEST FOR QUOTATION (RFQ)' : 'FORMAL COMMERCIAL PROPOSAL';

  // Title Box
  currentPage.drawRectangle({
    x: LEFT_MARGIN,
    y: currentY - 26,
    width: CONTENT_WIDTH,
    height: 26,
    color: rgb(0.06, 0.11, 0.22), // deep navy
  });

  currentPage.drawText(docTitle, {
    x: LEFT_MARGIN + 12,
    y: currentY - 18,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const refBadge = isRFQ
    ? `RFQ-${quoteCase.case_ref_number}${rfqCategory ? ` [${rfqCategory}]` : ''}`
    : quoteCase.case_ref_number;

  currentPage.drawText(refBadge, {
    x: PAGE_WIDTH - RIGHT_MARGIN - fontBold.widthOfTextAtSize(refBadge, 11) - 12,
    y: currentY - 18,
    size: 11,
    font: fontBold,
    color: rgb(0.9, 0.75, 0.3), // gold/amber
  });

  currentY -= 36;

  // Metadata Grid (2 Columns: Customer / Commercial details)
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const col1X = LEFT_MARGIN + 6;
  const col2X = LEFT_MARGIN + CONTENT_WIDTH / 2 + 10;

  if (isRFQ) {
    currentPage.drawText(`Supplier: ${supplierName || 'Verified Industrial Supplier'}`, {
      x: col1X,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    currentPage.drawText(`Category Scope: ${rfqCategory || 'Industrial Electrical / Automation'}`, {
      x: col1X,
      y: currentY - 14,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
  } else {
    currentPage.drawText(`Client: ${quoteCase.customer_name}`, {
      x: col1X,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    if (quoteCase.customer_contact) {
      currentPage.drawText(`Attn: ${quoteCase.customer_contact}`, {
        x: col1X,
        y: currentY - 13,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    currentPage.drawText(`Country: ${quoteCase.target_country || 'Pakistan'}`, {
      x: col1X,
      y: currentY - (quoteCase.customer_contact ? 25 : 13),
      size: 8.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Right column: Date, Terms, Validity
  currentPage.drawText(`Date: ${dateStr}`, {
    x: col2X,
    y: currentY,
    size: 8.5,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  currentPage.drawText(`Payment Terms: ${quoteCase.payment_terms}`, {
    x: col2X,
    y: currentY - 13,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });
  currentPage.drawText(`Delivery: ${quoteCase.delivery_terms} | Validity: ${quoteCase.validity_days} Days`, {
    x: col2X,
    y: currentY - 25,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  currentY -= 38;

  // 2. Table Column Dimensions
  // Table widths must sum to CONTENT_WIDTH (515.28)
  const cols = isRFQ
    ? [
        { key: 'num', label: '#', width: 25, align: 'center' },
        { key: 'desc', label: 'Item Description & Technical Specifications', width: 250, align: 'left' },
        { key: 'brand', label: 'Brand / Model', width: 100, align: 'left' },
        { key: 'qty', label: 'Qty', width: 40, align: 'center' },
        { key: 'uom', label: 'UoM', width: 35, align: 'center' },
        { key: 'offered', label: 'Offered Price & Lead Time', width: 65.28, align: 'center' },
      ]
    : [
        { key: 'num', label: '#', width: 25, align: 'center' },
        { key: 'desc', label: 'Item Description & Technical Specifications', width: 220, align: 'left' },
        { key: 'brand', label: 'Brand / SKU', width: 85, align: 'left' },
        { key: 'qty', label: 'Qty', width: 35, align: 'center' },
        { key: 'uom', label: 'UoM', width: 30, align: 'center' },
        { key: 'unit', label: `Unit (${quoteCase.base_currency})`, width: 60, align: 'right' },
        { key: 'total', label: `Total (${quoteCase.base_currency})`, width: 60.28, align: 'right' },
      ];

  const drawTableHeader = (page: PDFPage, y: number) => {
    // Header background
    page.drawRectangle({
      x: LEFT_MARGIN,
      y: y - 18,
      width: CONTENT_WIDTH,
      height: 18,
      color: rgb(0.93, 0.95, 0.98),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 0.5,
    });

    let x = LEFT_MARGIN;
    cols.forEach((col) => {
      let textX = x + 4;
      if (col.align === 'center') {
        textX = x + col.width / 2 - fontBold.widthOfTextAtSize(col.label, 7.5) / 2;
      } else if (col.align === 'right') {
        textX = x + col.width - fontBold.widthOfTextAtSize(col.label, 7.5) - 4;
      }

      page.drawText(col.label, {
        x: textX,
        y: y - 12,
        size: 7.5,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.25),
      });
      x += col.width;
    });

    return y - 18;
  };

  currentY = drawTableHeader(currentPage, currentY);

  // 3. Render Line Items (Multi-line text wrapping + Alternative Option B styling)
  let itemSequence = 1;
  let grandTotal = 0;

  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];
    const isAlt = item.is_alternative;

    // Split text or truncate for description column
    const cleanDesc = (item.custom_description || item.raw_input_text || '').replace(/[\u2190-\u21FF]/g, '>>');
    const descriptionText = isAlt
      ? `>> Option B (Alternative): ${cleanDesc}`
      : `${cleanDesc}`;

    const brandSkuText = item.item ? `${item.item.brand}\n${item.item.official_sku}` : (item.item_id ? 'Standard' : 'Generic');

    // Estimate row height
    const descLines = wrapText(descriptionText, isRFQ ? 240 : 210, 8, isAlt ? fontItalic : fontRegular);
    const rowHeight = Math.max(20, descLines.length * 10 + 8);

    // Page overflow check against bottom safe margin
    if (currentY - rowHeight < bottomMargin + 60) {
      currentPage = await createNewPage();
      currentY = PAGE_HEIGHT - topMargin;
      currentY = drawTableHeader(currentPage, currentY);
    }

    // Row Background (Alternating or light yellow highlight for Option B)
    if (isAlt) {
      currentPage.drawRectangle({
        x: LEFT_MARGIN,
        y: currentY - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.99, 0.98, 0.92), // subtle warm highlight for alternatives
        borderColor: rgb(0.9, 0.85, 0.7),
        borderWidth: 0.5,
      });
    } else if (itemSequence % 2 === 0) {
      currentPage.drawRectangle({
        x: LEFT_MARGIN,
        y: currentY - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.98, 0.99, 1.0),
      });
    }

    // Draw row bottom border line
    currentPage.drawLine({
      start: { x: LEFT_MARGIN, y: currentY - rowHeight },
      end: { x: LEFT_MARGIN + CONTENT_WIDTH, y: currentY - rowHeight },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.94),
    });

    // Draw columns
    let colX = LEFT_MARGIN;

    // Col 1: Num
    const seqStr = isAlt ? '-' : `${itemSequence++}`;
    currentPage.drawText(seqStr, {
      x: colX + cols[0].width / 2 - fontRegular.widthOfTextAtSize(seqStr, 8) / 2,
      y: currentY - 13,
      size: 8,
      font: fontRegular,
      color: isAlt ? rgb(0.6, 0.6, 0.6) : rgb(0.2, 0.2, 0.2),
    });
    colX += cols[0].width;

    // Col 2: Description (Wrapped)
    let textY = currentY - 11;
    for (const line of descLines) {
      currentPage.drawText(line, {
        x: isAlt ? colX + 10 : colX + 4,
        y: textY,
        size: 8,
        font: isAlt ? fontItalic : fontRegular,
        color: isAlt ? rgb(0.2, 0.35, 0.6) : rgb(0.1, 0.1, 0.1),
      });
      textY -= 10;
    }
    colX += cols[1].width;

    // Col 3: Brand / SKU
    currentPage.drawText(item.item?.brand || 'Industrial', {
      x: colX + 4,
      y: currentY - 11,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    if (item.item?.official_sku) {
      currentPage.drawText(item.item.official_sku, {
        x: colX + 4,
        y: currentY - 20,
        size: 7,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    colX += cols[2].width;

    // Col 4: Qty
    const qtyStr = item.qty.toString();
    currentPage.drawText(qtyStr, {
      x: colX + cols[3].width / 2 - fontRegular.widthOfTextAtSize(qtyStr, 8) / 2,
      y: currentY - 13,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    colX += cols[3].width;

    // Col 5: UoM
    const uomStr = item.unit_of_measure || 'PCS';
    currentPage.drawText(uomStr, {
      x: colX + cols[4].width / 2 - fontRegular.widthOfTextAtSize(uomStr, 7.5) / 2,
      y: currentY - 13,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    colX += cols[4].width;

    if (isRFQ) {
      // Outbound RFQ Blank boxes for supplier to fill in
      currentPage.drawRectangle({
        x: colX + 4,
        y: currentY - rowHeight + 4,
        width: cols[5].width - 8,
        height: rowHeight - 8,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
    } else {
      // Unit Price
      const unitStr = formatPKR(item.final_unit_price);
      currentPage.drawText(unitStr, {
        x: colX + cols[5].width - fontRegular.widthOfTextAtSize(unitStr, 8) - 4,
        y: currentY - 13,
        size: 8,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      colX += cols[5].width;

      // Line Total
      const lineTotal = isAlt ? 0 : item.final_unit_price * item.qty;
      if (!isAlt) grandTotal += lineTotal;

      const totalStr = isAlt ? 'Optional' : formatPKR(lineTotal);
      currentPage.drawText(totalStr, {
        x: colX + cols[6].width - fontBold.widthOfTextAtSize(totalStr, 8) - 4,
        y: currentY - 13,
        size: 8,
        font: fontBold,
        color: isAlt ? rgb(0.5, 0.5, 0.5) : rgb(0.06, 0.11, 0.22),
      });
    }

    currentY -= rowHeight;
  }

  // 4. Commercial Summary Section (Client Quote Only)
  if (!isRFQ) {
    if (currentY - 100 < bottomMargin) {
      currentPage = await createNewPage();
      currentY = PAGE_HEIGHT - topMargin;
    }

    currentY -= 15;

    // Summary Box on Right
    const summaryWidth = 220;
    const summaryX = PAGE_WIDTH - RIGHT_MARGIN - summaryWidth;

    currentPage.drawRectangle({
      x: summaryX,
      y: currentY - 60,
      width: summaryWidth,
      height: 60,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 0.5,
    });

    const taxLabel =
      quoteCase.tax_mode === 'GST_18'
        ? 'GST (18% Included)'
        : quoteCase.tax_mode === 'CUSTOM'
        ? `Sales Tax (${quoteCase.custom_tax_pct}% Included)`
        : 'Tax: Without GST';

    currentPage.drawText('Commercial Terms Summary:', {
      x: summaryX + 8,
      y: currentY - 14,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });

    currentPage.drawText(`Tax Regime: ${taxLabel}`, {
      x: summaryX + 8,
      y: currentY - 26,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    if (quoteCase.wht_pct > 0) {
      currentPage.drawText(`* Prices reverse grossed-up for ${quoteCase.wht_pct}% WHT`, {
        x: summaryX + 8,
        y: currentY - 37,
        size: 7,
        font: fontItalic,
        color: rgb(0.2, 0.4, 0.7),
      });
    }

    // Grand Total Bar
    currentPage.drawRectangle({
      x: summaryX,
      y: currentY - 60,
      width: summaryWidth,
      height: 20,
      color: rgb(0.06, 0.11, 0.22),
    });

    currentPage.drawText(`GRAND TOTAL (${quoteCase.base_currency}):`, {
      x: summaryX + 8,
      y: currentY - 54,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    const grandStr = formatPKR(grandTotal);
    currentPage.drawText(grandStr, {
      x: PAGE_WIDTH - RIGHT_MARGIN - fontBold.widthOfTextAtSize(grandStr, 9) - 8,
      y: currentY - 54,
      size: 9,
      font: fontBold,
      color: rgb(0.9, 0.75, 0.3),
    });

    currentY -= 75;

    // Commercial Terms & Notes Box
    currentPage.drawText('STANDARD TERMS & CONDITIONS:', {
      x: LEFT_MARGIN,
      y: currentY,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    const notes = [
      `1. Delivery: ${quoteCase.delivery_terms} from confirmation of order.`,
      `2. Payment: ${quoteCase.payment_terms}.`,
      `3. Validity: Quotation remains valid for ${quoteCase.validity_days} days due to import rate volatility.`,
      `4. Taxes: Invoiced per declared tax mode (${quoteCase.tax_mode}). Client withholding tax certificates required upon settlement.`,
    ];

    let noteY = currentY - 11;
    for (const note of notes) {
      currentPage.drawText(note, {
        x: LEFT_MARGIN,
        y: noteY,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
      });
      noteY -= 10;
    }
  } else {
    // RFQ Specific instructions
    currentY -= 20;
    currentPage.drawText('SUPPLIER INSTRUCTIONS:', {
      x: LEFT_MARGIN,
      y: currentY,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    currentPage.drawText('Please furnish your best ex-stock / lead-time pricing, warranty terms, and stock availability.', {
      x: LEFT_MARGIN,
      y: currentY - 11,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentPage.drawText('Return stamped quotation to procurement@oosprocurement.com or via WhatsApp.', {
      x: LEFT_MARGIN,
      y: currentY - 21,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // 5. Pagination: Stamp "Page X of Y" on all pages within bottom safe margin
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const pageStr = `Page ${i + 1} of ${totalPages}`;
    const textWidth = fontRegular.widthOfTextAtSize(pageStr, 7.5);

    page.drawText(pageStr, {
      x: PAGE_WIDTH / 2 - textWidth / 2,
      y: 40,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  return await pdfDoc.save();
}

/**
 * Clean fallback letterhead guide when no pre-printed PDF letterhead is uploaded
 */
function drawFallbackLetterheadGuides(
  page: PDFPage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  topMargin: number,
  bottomMargin: number
) {
  const width = page.getWidth();
  const height = page.getHeight();

  // Top header company banner
  page.drawRectangle({
    x: 40,
    y: height - 100,
    width: width - 80,
    height: 60,
    color: rgb(0.97, 0.98, 1.0),
    borderColor: rgb(0.85, 0.88, 0.95),
    borderWidth: 1,
  });

  page.drawText('OOS INDUSTRIAL PROCUREMENT & ENGINEERING', {
    x: 55,
    y: height - 62,
    size: 13,
    font: fontBold,
    color: rgb(0.06, 0.11, 0.22),
  });

  page.drawText('Specialized Industrial Automation, Switchgear & MRO Supply Solutions', {
    x: 55,
    y: height - 76,
    size: 8,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.5),
  });

  page.drawText('Brandreth Road / Lahore | Tel: +92 42 3722 1199 | quotes@oosprocurement.com', {
    x: 55,
    y: height - 88,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.6),
  });

  // Safe margin indicator line (very subtle)
  page.drawLine({
    start: { x: 40, y: height - topMargin + 10 },
    end: { x: width - 40, y: height - topMargin + 10 },
    thickness: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Bottom footer company bank / registration details
  page.drawLine({
    start: { x: 40, y: bottomMargin },
    end: { x: width - 40, y: bottomMargin },
    thickness: 0.5,
    color: rgb(0.85, 0.88, 0.92),
  });

  page.drawText('OOS Procurement Engine | NTN: 8492019-3 | Official Bank: Meezan Bank Ltd | All disputes subject to Lahore Jurisdiction', {
    x: 45,
    y: bottomMargin - 16,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.6),
  });
}

/**
 * Text wrapper utility to wrap long product descriptions within cell widths
 */
function wrapText(text: string, maxWidth: number, fontSize: number, font: PDFFont): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

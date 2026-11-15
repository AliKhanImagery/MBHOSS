// ==============================================================================
// POST /api/pdf/stamp - PDF Generation and Stamping Route
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stampQuotationPdf } from '@/lib/pdf-stamper';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = 'FINAL_CLIENT_QUOTE',
      quoteCase,
      lineItems = [],
      rfqCategory,
      supplierName,
      letterheadBase64,
    } = body;

    if (!quoteCase) {
      return NextResponse.json({ error: 'Missing quoteCase in request body' }, { status: 400 });
    }

    const settings = await db.getSettings();

    let blankLetterheadPdf: Uint8Array | null = null;
    if (letterheadBase64) {
      try {
        blankLetterheadPdf = Buffer.from(letterheadBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');
      } catch (e) {
        console.warn('Failed to decode letterheadBase64:', e);
      }
    }

    // Filter line items if rfqCategory is supplied
    let targetLines = lineItems;
    if (type === 'OUTBOUND_SUPPLIER_RFQ' && rfqCategory && rfqCategory !== 'ALL') {
      targetLines = lineItems.filter((line: any) => line.item?.category === rfqCategory);
      if (targetLines.length === 0) {
        targetLines = lineItems; // fallback if no specific category matched
      }
    }

    const pdfBytes = await stampQuotationPdf({
      type,
      quoteCase,
      lineItems: targetLines,
      settings,
      blankLetterheadPdf,
      supplierName,
      rfqCategory,
    });

    const filename =
      type === 'OUTBOUND_SUPPLIER_RFQ'
        ? `RFQ-${quoteCase.case_ref_number || 'DRAFT'}${rfqCategory ? `-${rfqCategory.replace(/\s+/g, '_')}` : ''}.pdf`
        : `Quote-${quoteCase.case_ref_number || 'DRAFT'}-${quoteCase.customer_name?.replace(/\s+/g, '_') || 'Client'}.pdf`;

    return new Response(pdfBytes as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('PDF stamp error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal PDF Stamping Error' },
      { status: 500 }
    );
  }
}

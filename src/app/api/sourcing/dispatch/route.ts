// ==============================================================================
// POST /api/sourcing/dispatch - Smart RFQ Candidate Matcher & Email Dispatcher
// Automated vendor matching, item segregation, and letterhead-ready RFQ drafts
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SourcingSupplier, SourcingRfqItem, SourcingDispatchPackage } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      suppliers = [],
      rfq_items = [],
      rfq_ref = `RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      deadline_days = 3,
      company_name = 'Qri Industrial Procurement',
    }: {
      suppliers: SourcingSupplier[];
      rfq_items: SourcingRfqItem[];
      rfq_ref?: string;
      deadline_days?: number;
      company_name?: string;
    } = body;

    if (!suppliers.length || !rfq_items.length) {
      return NextResponse.json(
        { error: 'At least one supplier candidate and one RFQ item are required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. If Gemini API is configured, execute via Gemini 1.5 Flash
    if (apiKey) {
      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });

        const prompt = `You are an industrial procurement sourcing automation engine in Pakistan.
You are given a list of candidate suppliers and a master RFQ bill of materials.

### CANDIDATE SUPPLIERS DIRECTORY:
${JSON.stringify(suppliers, null, 2)}

### MASTER RFQ ITEMS NEEDED:
${JSON.stringify(rfq_items, null, 2)}

### INSTRUCTIONS:
1. Match which RFQ items suit each candidate supplier based on supplier categories, company name, and product domains. (E.g. send electrical relays/contactors to switchgear suppliers; pipes and valves to piping/steel vendors; motors/VFDs to drive/automation vendors).
2. If a supplier has NO matching items, do NOT generate a package for them.
3. For each matched supplier candidate, compose a formal B2B request for quotation:
   - "subject": E.g. "[${rfq_ref}] Commercial Inquiry: {Category} - ${company_name}"
   - "body": Professional, formal email body. Include salutation, clear numbered item table with specs/quantities, requested response deadline (${deadline_days} business days), delivery to Lahore/Karachi central warehouse, and formal closing.
   - "fit_reason": Brief sentence on why this candidate was selected.
4. Respond ONLY with a valid JSON array of packages matching this schema (no markdown formatting):
[
  {
    "supplierId": "id-of-supplier",
    "supplierName": "Company Name",
    "supplierEmail": "email@example.com",
    "supplierContact": "Person Name",
    "matchedItemIds": ["id1", "id2"],
    "subject": "Email Subject",
    "body": "Formatted email body",
    "fitReason": "Why matched"
  }
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const packages: SourcingDispatchPackage[] = parsed.map((pkg: any, idx: number) => {
            const matchedItems = rfq_items.filter((i) =>
              pkg.matchedItemIds ? pkg.matchedItemIds.includes(i.id) : true
            );
            return {
              id: `pkg-${Date.now()}-${idx}`,
              supplierId: pkg.supplierId,
              supplierName: pkg.supplierName,
              supplierEmail: pkg.supplierEmail,
              supplierContact: pkg.supplierContact || '',
              matchedItems: matchedItems.length > 0 ? matchedItems : rfq_items,
              subject: pkg.subject,
              body: pkg.body,
              fitReason: pkg.fitReason || 'Supplier matched based on product domain catalog.',
              status: 'draft',
            };
          });

          return NextResponse.json({
            packages,
            engine: 'Gemini 1.5 Flash (Live LLM Routing)',
          });
        }
      } catch (geminiError: any) {
        console.warn('[Sourcing Dispatch] Gemini matching failed, using heuristic:', geminiError.message);
      }
    }

    // 2. Deterministic Heuristic Matcher & Email Composer
    const packages: SourcingDispatchPackage[] = [];
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + deadline_days);
    const deadlineStr = deadlineDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    for (let sIdx = 0; sIdx < suppliers.length; sIdx++) {
      const supplier = suppliers[sIdx];
      const supCatLower = (supplier.categories.join(' ') + ' ' + supplier.companyName).toLowerCase();

      // Filter RFQ items relevant to this candidate
      const matchedItems = rfq_items.filter((item) => {
        const itemText = (item.description + ' ' + (item.brand || '') + ' ' + (item.specs || '')).toLowerCase();

        // Electrical / Switchgear match
        if (
          (supCatLower.includes('switchgear') || supCatLower.includes('relay') || supCatLower.includes('electric')) &&
          (itemText.includes('relay') || itemText.includes('contactor') || itemText.includes('breaker') || itemText.includes('siemens') || itemText.includes('schneider') || itemText.includes('abb'))
        ) {
          return true;
        }

        // Automation / Drives match
        if (
          (supCatLower.includes('automation') || supCatLower.includes('drive') || supCatLower.includes('vfd') || supCatLower.includes('plc')) &&
          (itemText.includes('plc') || itemText.includes('vfd') || itemText.includes('inverter') || itemText.includes('drive') || itemText.includes('sensor'))
        ) {
          return true;
        }

        // Piping / Valves / Sanitary match
        if (
          (supCatLower.includes('pipe') || supCatLower.includes('valve') || supCatLower.includes('steel') || supCatLower.includes('sanitary')) &&
          (itemText.includes('pipe') || itemText.includes('valve') || itemText.includes('flange') || itemText.includes('gasket') || itemText.includes('ss 316') || itemText.includes('tank'))
        ) {
          return true;
        }

        // If generic supplier with all categories
        if (supplier.categories.includes('All') || supplier.categories.includes('General Industrial')) {
          return true;
        }

        return false;
      });

      // If no specific match was isolated, match items that aren't claimed yet or provide all if only 1 supplier
      const finalItems = matchedItems.length > 0 ? matchedItems : (suppliers.length === 1 ? rfq_items : []);

      if (finalItems.length > 0) {
        const itemRows = finalItems
          .map(
            (it, i) =>
              `${i + 1}. ${it.description} | Brand: ${it.brand || 'Standard'} | Part #: ${it.partNumber || 'N/A'} | Qty: ${it.qty} ${it.uom || 'PCS'}`
          )
          .join('\n');

        const contactName = supplier.contactPerson || 'Sales & Quotation Team';
        const primaryCat = supplier.categories[0] || 'Industrial Supplies';

        const subject = `[${rfq_ref}] Request for Quotation: ${primaryCat} - ${company_name}`;
        const body = `Dear ${contactName},

We are pleased to invite ${supplier.companyName} to provide your best competitive commercial quotation and ex-stock availability for the following items under Reference ${rfq_ref}:

----------------------------------------------------------------------
BILL OF QUANTITIES (BOQ):
----------------------------------------------------------------------
${itemRows}

COMMERCIAL & SUBMISSION REQUIREMENTS:
1. Price Basis: Delivered to Central Warehouse (inclusive of local transport).
2. Sales Tax: Clearly specify prices with/without 18% GST and your STRN/NTN.
3. Delivery Timeline: Indicate Ex-Stock availability or earliest lead-time.
4. Submission Deadline: Please provide your proforma quotation by ${deadlineStr}.
5. Payment Terms: Standard 100% Advance or 30-Day Verified Credit Terms.

Please reply directly to this email with your formal stamped quotation sheet.

Best regards,

Procurement Operations Desk
${company_name}
Tel: +92 (42) 3578-9000
Email: procurement@qriprocurement.com`;

        packages.push({
          id: `pkg-${Date.now()}-${sIdx}`,
          supplierId: supplier.id,
          supplierName: supplier.companyName,
          supplierEmail: supplier.email,
          supplierContact: supplier.contactPerson,
          matchedItems: finalItems,
          subject,
          body,
          fitReason: `Matched ${finalItems.length} line item(s) corresponding to candidate's ${primaryCat} domain.`,
          status: 'draft',
        });
      }
    }

    return NextResponse.json({
      packages,
      engine: 'Deterministic Heuristic Procurement Matcher',
    });
  } catch (err: any) {
    console.error('Sourcing Dispatch API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ==============================================================================
// POST /api/qri-agent - Qri AI Procurement Router & Quotation Builder
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { QuotationTemplate, DataBankItem } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      current_template,
      databank_items = [],
    }: {
      prompt: string;
      current_template: QuotationTemplate;
      databank_items: DataBankItem[];
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt in request' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. If Gemini API key is present, execute via Gemini 1.5 Flash
    if (apiKey) {
      try {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const systemPrompt = `You are "Qri AI", a high-speed industrial procurement router and quotation builder in Pakistan.
You assist procurement engineers in generating and modifying formal commercial quotations.
You have access to the company's local Data Bank benchmarks (pricing in PKR from Brandreth Road, Lahore, Karachi):
${JSON.stringify(databank_items, null, 2)}

CURRENT LIVE QUOTATION TEMPLATE STATE:
${JSON.stringify(current_template, null, 2)}

USER INSTRUCTION:
"${prompt}"

CRITICAL INSTRUCTIONS:
1. You MUST respond ONLY with a single valid JSON object containing EXACTLY TWO keys:
   - "chat_response": A concise, friendly, professional procurement message explaining what changes you made.
   - "template_state": The complete, updated QuotationTemplate object containing all fields:
     quoteRef, date, validityDays, clientName, clientContact, deliveryTerms, paymentTerms, currency ("PKR"),
     taxMode ("WITHOUT_GST" | "GST_18" | "CUSTOM"), customTaxPct,
     lineItems: [
       { id, description, brand, partNumber, qty, uom, unitCost, marginPct, unitPrice, total }
     ],
     subtotal, taxAmount, grandTotal, notes
2. Always calculate:
   - unitPrice = Math.round(unitCost * (1 + marginPct / 100))
   - total = qty * unitPrice
   - subtotal = sum of all line item totals
   - If taxMode is "GST_18", taxAmount = Math.round(subtotal * 0.18); else 0
   - grandTotal = subtotal + taxAmount
3. If user specifies a client name (e.g. "for Engro", "for Packages Ltd"), update clientName.
4. If user asks to add or change an item, search the Data Bank benchmarks for the closest matching machine/part and use its pricePKR as unitCost.
5. Do NOT include markdown code blocks (such as \`\`\`json) in your raw output. Output raw valid JSON.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanJson);

        if (parsed.chat_response && parsed.template_state) {
          return NextResponse.json(parsed);
        }
      } catch (geminiError: any) {
        console.warn('[Qri AI] Gemini execution failed, falling back to local heuristic:', geminiError.message);
      }
    }

    // 2. Intelligent Offline Fallback Engine (Guaranteed 100% Offline Dev Mode)
    const localResult = executeLocalHeuristicAgent(prompt, current_template, databank_items);
    return NextResponse.json(localResult);
  } catch (err: any) {
    console.error('Qri Agent route error:', err);
    return NextResponse.json({ error: err.message || 'Internal Agent Error' }, { status: 500 });
  }
}

/**
 * Intelligent deterministic rule-based procurement engine for offline mode
 */
function executeLocalHeuristicAgent(
  prompt: string,
  current: QuotationTemplate,
  databank: DataBankItem[]
): { chat_response: string; template_state: QuotationTemplate } {
  const nextTemplate: QuotationTemplate = JSON.parse(JSON.stringify(current));
  const lowerPrompt = prompt.toLowerCase();
  const logs: string[] = [];

  // 1. Detect Client Name
  const clientMatch = prompt.match(/(?:for|client)\s+([A-Za-z0-9\s&]+?)(?:\s+(?:with|and|at|having|margin|qty)|\.|$)/i);
  if (clientMatch && clientMatch[1]) {
    const rawClient = clientMatch[1].trim();
    if (!/^(the|a|an|all|my)$/i.test(rawClient) && rawClient.length > 2) {
      nextTemplate.clientName = rawClient.includes('Engro')
        ? 'Engro Fertilizers Ltd'
        : rawClient.includes('Packages')
        ? 'Packages Mall / Packages Ltd'
        : rawClient.includes('Fauji')
        ? 'Fauji Fertilizer Company'
        : rawClient;
      logs.push(`Assigned Client: ${nextTemplate.clientName}`);
    }
  }

  // 2. Detect Delivery Terms
  if (lowerPrompt.includes('ex-stock') || lowerPrompt.includes('ready stock')) {
    nextTemplate.deliveryTerms = 'Ex-Stock (Ready Lahore Warehouse)';
    logs.push('Set Delivery to Ex-Stock');
  } else if (lowerPrompt.includes('2-3 weeks') || lowerPrompt.includes('import')) {
    nextTemplate.deliveryTerms = '2-3 Weeks Air Freight';
    logs.push('Set Delivery to 2-3 Weeks');
  }

  // 3. Detect Margin %
  let marginPct = 15; // default 15%
  const marginMatch = prompt.match(/(\d+(?:\.\d+)?)\s*%\s*(?:margin|profit|markup)/i);
  if (marginMatch && marginMatch[1]) {
    marginPct = parseFloat(marginMatch[1]);
  }

  // 4. Detect Quantity
  let qty = 1;
  const qtyMatch = prompt.match(/(?:add|quantity|qty)?\s*(\d+)\s*(?:pcs|nos|pieces|units|sets|relays|contactors)?/i);
  if (qtyMatch && qtyMatch[1]) {
    const q = parseInt(qtyMatch[1], 10);
    if (!isNaN(q) && q > 0 && q < 50000) {
      qty = q;
    }
  }

  // 5. Detect Tax Mode
  if (lowerPrompt.includes('gst') || lowerPrompt.includes('18%') || lowerPrompt.includes('tax')) {
    if (lowerPrompt.includes('without') || lowerPrompt.includes('0%') || lowerPrompt.includes('remove gst')) {
      nextTemplate.taxMode = 'WITHOUT_GST';
      logs.push('Set Tax Mode to Without GST (0%)');
    } else {
      nextTemplate.taxMode = 'GST_18';
      logs.push('Applied +18% Sales Tax (GST)');
    }
  }

  // 6. Match Item against Data Bank
  let matchedDbItem: DataBankItem | undefined = undefined;

  for (const item of databank) {
    const itemLower = (item.machineName + ' ' + item.company).toLowerCase();
    if (
      (lowerPrompt.includes('relay') && itemLower.includes('relay')) ||
      (lowerPrompt.includes('siemens') && itemLower.includes('siemens')) ||
      (lowerPrompt.includes('schneider') && itemLower.includes('schneider')) ||
      (lowerPrompt.includes('25a') && itemLower.includes('25a')) ||
      (lowerPrompt.includes('9a') && itemLower.includes('9a')) ||
      (lowerPrompt.includes('vfd') && itemLower.includes('vfd')) ||
      (lowerPrompt.includes('plc') && itemLower.includes('plc')) ||
      (lowerPrompt.includes('3rh2122') && itemLower.includes('3rh2122')) ||
      (lowerPrompt.includes('lc1d25') && itemLower.includes('lc1d25'))
    ) {
      matchedDbItem = item;
      break;
    }
  }

  // If item addition requested or matched
  if (matchedDbItem || lowerPrompt.includes('add') || lowerPrompt.includes('insert')) {
    const targetDb = matchedDbItem || databank[0];
    const unitCost = targetDb.pricePKR;
    const unitPrice = Math.round(unitCost * (1 + marginPct / 100));
    const total = qty * unitPrice;

    // Check if brand is known
    const brand = targetDb.machineName.includes('Siemens')
      ? 'Siemens'
      : targetDb.machineName.includes('Schneider')
      ? 'Schneider Electric'
      : 'Industrial';

    const partNum = targetDb.machineName.match(/\(([^)]+)\)/)?.[1] || 'SKU-001';

    const newLine = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: targetDb.machineName,
      brand,
      partNumber: partNum,
      qty,
      uom: 'PCS',
      unitCost,
      marginPct,
      unitPrice,
      total,
    };

    nextTemplate.lineItems.push(newLine);
    logs.push(`Added ${qty}x ${targetDb.machineName} @ Rs. ${new Intl.NumberFormat('en-PK').format(unitPrice)} (Cost: Rs. ${new Intl.NumberFormat('en-PK').format(unitCost)}, Margin: ${marginPct}%)`);
  }

  // Recalculate Subtotal & Totals
  const subtotal = nextTemplate.lineItems.reduce((acc, item) => acc + (item.total || 0), 0);
  let taxAmount = 0;
  if (nextTemplate.taxMode === 'GST_18') {
    taxAmount = Math.round(subtotal * 0.18);
  } else if (nextTemplate.taxMode === 'CUSTOM') {
    taxAmount = Math.round(subtotal * ((nextTemplate.customTaxPct || 0) / 100));
  }
  const grandTotal = subtotal + taxAmount;

  nextTemplate.subtotal = subtotal;
  nextTemplate.taxAmount = taxAmount;
  nextTemplate.grandTotal = grandTotal;

  // Build friendly chat response
  let friendlyResponse = `I have processed your request and updated the live quotation document on the right pane.`;
  if (logs.length > 0) {
    friendlyResponse = `Done! I've updated your quote:\n• ${logs.join('\n• ')}\n\nNew Grand Total is **PKR ${new Intl.NumberFormat('en-PK').format(grandTotal)}** (${nextTemplate.taxMode === 'GST_18' ? 'including 18% GST' : 'without GST'}). You can click any cell on the right to manually override details!`;
  }

  return {
    chat_response: friendlyResponse,
    template_state: nextTemplate,
  };
}

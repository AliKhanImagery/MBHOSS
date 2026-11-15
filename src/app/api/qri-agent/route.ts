// ==============================================================================
// POST /api/qri-agent - Qri AI Procurement Router & Quotation Builder
// Enforces Master Template Rules & Contextual Policy Deviation Warnings
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
      master_template_rules = '',
    }: {
      prompt: string;
      current_template: QuotationTemplate;
      databank_items: DataBankItem[];
      master_template_rules?: string;
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

### MASTER TEMPLATE RULES & MANDATORY COMMERCIAL TERMS:
${master_template_rules || '1. Standard Payment: 100% Advance or Max 30 Days Credit. 2. Standard Delivery: Ex-Stock (1-3 Days) or 2-4 Weeks. 3. Price Validity: 7 Days strictly. 4. Minimum Margin: 12%.'}

### DATA BANK BENCHMARKS (Current local supplier rates in PKR):
${JSON.stringify(databank_items, null, 2)}

### CURRENT LIVE QUOTATION TEMPLATE STATE:
${JSON.stringify(current_template, null, 2)}

### USER INSTRUCTION:
"${prompt}"

### CRITICAL INSTRUCTIONS:
1. You must compare the user's current request against the master_template_rules. If the user asks for a commercial term (like delivery time or payment terms) that violates the standard template rules, you must update the template but ALSO include a specific warning in your chat_response notifying the user of the deviation.
2. You MUST respond ONLY with a single valid JSON object containing EXACTLY TWO keys:
   - "chat_response": The text message to show in the chat pane. If there is a rule violation, prominently format the warning with "⚠️ Policy Warning: [details of deviation]".
   - "template_state": The complete, updated QuotationTemplate object containing all fields:
     quoteRef, date, validityDays, clientName, clientContact, deliveryTerms, paymentTerms, currency ("PKR"),
     taxMode ("WITHOUT_GST" | "GST_18" | "CUSTOM"), customTaxPct,
     lineItems: [
       { id, description, brand, partNumber, qty, uom, unitCost, marginPct, unitPrice, total }
     ],
     subtotal, taxAmount, grandTotal, notes
3. Price & Tax Math:
   - unitPrice = Math.round(unitCost * (1 + marginPct / 100))
   - total = qty * unitPrice
   - subtotal = sum of all line item totals
   - If taxMode is "GST_18", taxAmount = Math.round(subtotal * 0.18); else 0
   - grandTotal = subtotal + taxAmount
4. Search the Data Bank benchmarks for requested parts and assign realistic PKR unit costs.
5. Do NOT wrap output in markdown codeblocks. Output raw valid JSON only.`;

        const result = await model.generateContent(systemPrompt);
        const text = result.response.text().trim();
        const cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(cleanJson);

        if (parsed.chat_response && parsed.template_state) {
          return NextResponse.json({
            ...parsed,
            system_log: 'Executed via Google Gemini 1.5 Flash (Live LLM Engine)',
          });
        }
      } catch (geminiError: any) {
        console.warn('[Qri AI] Gemini execution failed, falling back to local heuristic:', geminiError.message);
      }
    }

    // 2. Intelligent Offline Fallback Engine (with Master Template Rules Checking)
    const localResult = executeLocalHeuristicAgent(
      prompt,
      current_template,
      databank_items,
      master_template_rules
    );
    return NextResponse.json({
      ...localResult,
      system_log: apiKey
        ? 'Fallback: Heuristic Router (Gemini API error)'
        : 'Executed via Deterministic Procurement Engine (Add GEMINI_API_KEY in .env.local for Live AI)',
    });
  } catch (err: any) {
    console.error('Qri Agent route error:', err);
    return NextResponse.json({ error: err.message || 'Internal Agent Error' }, { status: 500 });
  }
}

/**
 * Intelligent deterministic rule-based procurement engine with policy deviation checking
 */
function executeLocalHeuristicAgent(
  prompt: string,
  current: QuotationTemplate,
  databank: DataBankItem[],
  masterRules: string
): { chat_response: string; template_state: QuotationTemplate } {
  const nextTemplate: QuotationTemplate = JSON.parse(JSON.stringify(current || {}));
  if (!Array.isArray(nextTemplate.lineItems)) {
    nextTemplate.lineItems = Array.isArray((nextTemplate as any).line_items)
      ? (nextTemplate as any).line_items
      : [];
  }
  const lowerPrompt = prompt.toLowerCase();
  const updates: string[] = [];
  const complianceWarnings: string[] = [];

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
      updates.push(`Assigned Client: ${nextTemplate.clientName}`);
    }
  }

  // 2. Detect Payment Terms & Compare with Master Template Rules
  const paymentMatch = prompt.match(/(\d+\s*days?\s*credit|advance|credit|50\/50|deferred)/i);
  if (paymentMatch) {
    const term = paymentMatch[1].toLowerCase();
    if (term.includes('90') || term.includes('60') || term.includes('120') || term.includes('credit')) {
      const days = term.match(/(\d+)/)?.[1] || '60';
      nextTemplate.paymentTerms = `${days} Days Credit`;
      updates.push(`Updated Payment Terms: ${nextTemplate.paymentTerms}`);

      // Check Master Template Rules for credit terms
      if (parseInt(days, 10) > 30 || masterRules.toLowerCase().includes('100% advance')) {
        complianceWarnings.push(
          `Payment term '${nextTemplate.paymentTerms}' violates Master Template Rules (Rule: Maximum credit allowed is 30 Days or 100% Advance). CFO/CTO approval is required.`
        );
      }
    } else if (term.includes('advance')) {
      nextTemplate.paymentTerms = '100% Advance Against Proforma';
      updates.push('Set Payment Terms: 100% Advance (Standard Compliant)');
    } else if (term.includes('50')) {
      nextTemplate.paymentTerms = '50% Advance, 50% Balance on Delivery';
      updates.push('Set Payment Terms: 50/50 Split (Standard Compliant)');
    }
  }

  // 3. Detect Delivery Terms & Compare with Master Template Rules
  if (lowerPrompt.includes('ex-stock') || lowerPrompt.includes('ready stock')) {
    nextTemplate.deliveryTerms = 'Ex-Stock (1-2 Days Lahore Warehouse)';
    updates.push('Set Delivery: Ex-Stock (Standard Compliant)');
  } else if (lowerPrompt.includes('week') || lowerPrompt.includes('month') || lowerPrompt.includes('delivery')) {
    const weekMatch = lowerPrompt.match(/(\d+)\s*weeks?/);
    if (weekMatch) {
      const weeks = parseInt(weekMatch[1], 10);
      nextTemplate.deliveryTerms = `${weeks} Weeks Air Freight`;
      updates.push(`Updated Delivery Terms: ${nextTemplate.deliveryTerms}`);

      if (weeks > 6) {
        complianceWarnings.push(
          `Delivery timeframe '${weeks} Weeks' exceeds standard lead-time rules (Rule: Standard delivery is 2-4 weeks). Client cancellation risk high.`
        );
      }
    } else if (lowerPrompt.includes('urgent') || lowerPrompt.includes('same day')) {
      nextTemplate.deliveryTerms = 'Same Day Express Delivery';
      updates.push(`Set Delivery: Same Day Express`);
      complianceWarnings.push(
        `Same-day delivery requires urgent warehouse stock physical verification.`
      );
    }
  }

  // 4. Detect Validity Days & Compare with Master Template Rules
  const validityMatch = lowerPrompt.match(/validity\s*(?:of|is|to)?\s*(\d+)\s*days?/i) || lowerPrompt.match(/(\d+)\s*days?\s*validity/i);
  if (validityMatch && validityMatch[1]) {
    const days = parseInt(validityMatch[1], 10);
    nextTemplate.validityDays = days;
    updates.push(`Set Quote Validity: ${days} Days`);

    if (days > 15) {
      complianceWarnings.push(
        `Quotation validity of ${days} days violates Master Template Rules (Rule: Strictly 7 to 15 days maximum due to PKR/USD exchange rate volatility).`
      );
    }
  }

  // 5. Detect Margin % & Compare with Master Template Rules
  let marginPct = 15; // default 15%
  const marginMatch = prompt.match(/(\d+(?:\.\d+)?)\s*%\s*(?:margin|profit|markup)/i);
  if (marginMatch && marginMatch[1]) {
    marginPct = parseFloat(marginMatch[1]);
    if (marginPct < 12) {
      complianceWarnings.push(
        `Profit margin of ${marginPct}% is below the mandatory baseline threshold of 12% specified in Master Template Rules.`
      );
    }
  }

  // 6. Detect Quantity
  let qty = 1;
  const qtyMatch = prompt.match(/(?:add|quantity|qty)?\s*(\d+)\s*(?:pcs|nos|pieces|units|sets|relays|contactors)?/i);
  if (qtyMatch && qtyMatch[1]) {
    const q = parseInt(qtyMatch[1], 10);
    if (!isNaN(q) && q > 0 && q < 50000) {
      qty = q;
    }
  }

  // 7. Detect Tax Mode
  if (lowerPrompt.includes('gst') || lowerPrompt.includes('18%') || lowerPrompt.includes('tax')) {
    if (lowerPrompt.includes('without') || lowerPrompt.includes('0%') || lowerPrompt.includes('remove gst')) {
      nextTemplate.taxMode = 'WITHOUT_GST';
      updates.push('Set Tax Mode: Without GST (0%)');
    } else {
      nextTemplate.taxMode = 'GST_18';
      updates.push('Applied +18% Sales Tax (GST)');
    }
  }

  // 8. Match Item against Data Bank
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
    const fallbackItem: DataBankItem = {
      id: 'db-fallback',
      company: 'Brandt Industrial Lahore',
      machineName: 'Siemens SIRIUS Contactor Relay 24V DC (3RH2122-1BB40)',
      pricePKR: 14500,
      lastCheckedDate: '2026-11-12',
      category: 'Switchgear & Relays',
    };
    const targetDb = matchedDbItem || databank[0] || fallbackItem;
    const unitCost = targetDb.pricePKR || 14500;
    const unitPrice = Math.round(unitCost * (1 + marginPct / 100));
    const total = qty * unitPrice;

    const brand = targetDb.machineName?.includes('Siemens')
      ? 'Siemens'
      : targetDb.machineName?.includes('Schneider')
      ? 'Schneider Electric'
      : 'Industrial';

    const partNum = targetDb.machineName?.match(/\(([^)]+)\)/)?.[1] || 'SKU-001';

    const newLine = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: targetDb.machineName || 'Industrial Component',
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
    updates.push(`Added ${qty}x ${targetDb.machineName} @ Rs. ${new Intl.NumberFormat('en-PK').format(unitPrice)} (Cost: Rs. ${new Intl.NumberFormat('en-PK').format(unitCost)}, Margin: ${marginPct}%)`);
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

  // Build chat response with compliance warnings
  let chatText = 'I have updated the live quotation template.';
  if (updates.length > 0) {
    chatText = `I have updated your quote:\n• ${updates.join('\n• ')}\n\nNew Grand Total: **PKR ${new Intl.NumberFormat('en-PK').format(grandTotal)}** (${nextTemplate.taxMode === 'GST_18' ? 'including 18% GST' : 'without GST'}).`;
  }

  // If there are compliance warnings, prominently append them as per Step 2 instruction
  if (complianceWarnings.length > 0) {
    chatText += `\n\n⚠️ **COMPLIANCE & POLICY DEVIATION WARNING:**\n${complianceWarnings.map((w) => `• ${w}`).join('\n')}\n*The document has been updated per your request, but please review against Master Template Rules.*`;
  }

  return {
    chat_response: chatText,
    template_state: nextTemplate,
  };
}

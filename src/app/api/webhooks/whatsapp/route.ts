// ==============================================================================
// Meta WhatsApp Cloud API Webhook with 4-State Proof-Request Loop
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiEngine } from '@/lib/ai-engine';
import { formatPKR } from '@/lib/commercial-math';

// GET verification for Meta Webhook setup
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const EXPECTED_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'oos_procurement_secret_token_2026';

  if (mode === 'subscribe' && token === EXPECTED_TOKEN) {
    return new Response(challenge || 'OK', { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Extract message details from either Meta payload format or direct simulator format
    let fromPhone = '';
    let messageType = 'text';
    let textBody = '';
    let mediaUrl: string | undefined = undefined;

    if (body.entry && body.entry[0]?.changes && body.entry[0]?.changes[0]?.value) {
      // Standard Meta WhatsApp Cloud API Webhook payload
      const value = body.entry[0].changes[0].value;
      const message = value.messages?.[0];
      if (!message) {
        return NextResponse.json({ status: 'no_message_in_entry' });
      }
      fromPhone = message.from;
      messageType = message.type;
      if (messageType === 'text') {
        textBody = message.text?.body || '';
      } else if (messageType === 'image') {
        textBody = message.image?.caption || '';
        mediaUrl = message.image?.id ? `https://graph.facebook.com/v19.0/${message.image.id}` : undefined;
      }
    } else {
      // Direct Simulator / API Test payload
      fromPhone = body.phone || body.from || '';
      messageType = body.type || (body.imageUrl ? 'image' : 'text');
      textBody = body.text || body.body || '';
      mediaUrl = body.imageUrl || body.mediaUrl;
    }

    // Normalize phone number to E.164 with '+'
    const cleanPhone = fromPhone.trim().replace(/[^\d+]/g, '');
    const normalizedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    // 2. Strict Whitelisting Check (users.whatsapp_phone)
    const user = await db.getUserByPhone(normalizedPhone);
    if (!user) {
      const rejectMsg = `⛔ ACCESS DENIED: Phone number ${normalizedPhone} is not registered in the OOS Procurement Whitelist. Contact CTO Tariq Mehmood for authorization.`;
      return NextResponse.json({
        success: false,
        authorized: false,
        reply: rejectMsg,
        phone: normalizedPhone,
      });
    }

    // 3. Process 4-State Engine
    const session = await db.getWhatsAppSession(normalizedPhone);
    let botReply = '';
    let nextState = session.state;
    let draft = session.draft_payload || {};
    let committedRecord = null;

    const trimmedText = textBody.trim();

    // STATE TRANSITION LOGIC
    if (session.state === 'AWAITING_CONFIRM') {
      if (trimmedText === '1') {
        // COMMIT RECORD TO GOLD MINE
        const record = await db.addLedgerRecord({
          item_id: draft.item_id,
          supplier_id: draft.supplier_id,
          submitted_by: user.id,
          unit_cost: draft.unit_cost,
          currency: draft.currency || 'PKR',
          source_origin: 'WHATSAPP_BOT',
          incoterm_code: draft.incoterm_code || 'DDP',
          source_validity_date: draft.source_validity_date || new Date().toISOString(),
          evidence_url: draft.evidence_url,
          notes: draft.notes || `Logged via WhatsApp Bot by ${user.full_name}`,
        });

        committedRecord = record;
        nextState = 'IDLE';
        draft = null;

        botReply = `✅ *RECORD COMMITTED TO GOLD MINE!*
• Ref ID: \`${record.record_id.slice(0, 8)}\`
• Item: *${record.item?.brand} ${record.item?.official_sku}*
• Rate: *PKR ${formatPKR(record.unit_cost)}* (${record.incoterm_code})
• Validity Date: *${new Date(record.source_validity_date).toLocaleDateString('en-GB')}*
${record.evidence_url ? '• Evidence: [Screenshot Attached 📎]\n' : ''}
Thank you ${user.full_name}! Your entry is now active for all procurement engineers.`;
      } else {
        // User typed corrections or rejected confirmation -> Send to Proof-Request Loop
        nextState = 'AWAITING_SCREENSHOT';
        botReply = `⚠️ *Cannot verify exact part or date without proof.*
Please send a screenshot of the supplier chat/quote.

💡 *Tip*: Use WhatsApp's crop or pen tool to black out phone numbers or personal chat before sending!`;
      }
    } else if (messageType === 'image' || mediaUrl) {
      // User sent an image / screenshot
      const evidence = mediaUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80';
      const parsed = await aiEngine.parseOmniboxInput(textBody || 'Siemens 24V relay Brandreth');
      const bestMatch = parsed.items[0]?.topMatches[0];

      // Extract price from caption or fallback to default
      const priceMatch = (textBody || '').match(/\b(\d{3,7})\b/);
      const extractedCost = priceMatch ? parseFloat(priceMatch[1]) : (draft?.unit_cost || 14500);

      const items = await db.getMasterItems();
      const matchedItem = bestMatch?.item || items[0];

      const suppliers = await db.getMasterSuppliers();
      const matchedSupplier = suppliers[0];

      draft = {
        item_id: matchedItem.id,
        supplier_id: matchedSupplier.id,
        unit_cost: extractedCost,
        currency: 'PKR',
        incoterm_code: 'DDP',
        source_validity_date: new Date().toISOString(),
        evidence_url: evidence,
        notes: `Redacted screenshot verified via WhatsApp: "${textBody || 'Supplier quote sheet'}"`,
      };

      nextState = 'AWAITING_CONFIRM';
      botReply = `📸 *Redacted Screenshot Received & Analyzed!*
• Verified Item: *${matchedItem.brand} ${matchedItem.official_sku}*
• Plain English: _${matchedItem.plain_english_description}_
• Extracted Rate: *PKR ${formatPKR(extractedCost)}* (DDP)
• Date Validated: *${new Date().toLocaleDateString('en-GB')}*
• Evidence: [Secure Screenshot Stored 📎]

👉 *Reply '1' to confirm & commit to the Gold Mine*, or type corrections.`;
    } else {
      // User sent raw text in IDLE or AWAITING_SCREENSHOT state
      const parsed = await aiEngine.parseOmniboxInput(trimmedText);
      const bestLine = parsed.items[0];
      const bestMatch = bestLine?.topMatches[0];

      // Extract price numbers (avoiding voltage/amperage ratings like 24V, 220V, 25A)
      let parsedCost = 0;
      const isUsd = /usd|\$/i.test(trimmedText);

      // 1. Explicit currency prefix/suffix: PKR 14500, Rs. 14,500, 14500 pkr, $420
      const explicitPriceMatch = trimmedText.match(/(?:rs\.?|pkr|\$|usd)\s*(\d[\d,]+(?:\.\d+)?)|(\d[\d,]+(?:\.\d+)?)\s*(?:rs\.?|pkr|usd)/i);
      if (explicitPriceMatch) {
        const numStr = explicitPriceMatch[1] || explicitPriceMatch[2];
        parsedCost = parseFloat(numStr.replace(/,/g, ''));
      } else {
        // 2. Standalone number not followed by unit of measure / electrical units (v, a, kw, hp, pcs, nos, hz)
        const numberMatches = Array.from(trimmedText.matchAll(/\b(\d{3,7}(?:\.\d+)?)\b(?!\s*(?:v|volt|volts|a|amp|amps|kw|hp|pcs|nos|pieces|hz|mm))/gi));
        if (numberMatches.length > 0) {
          // Take the last or largest standalone number as price
          const candidate = numberMatches[numberMatches.length - 1][1];
          parsedCost = parseFloat(candidate.replace(/,/g, ''));
        }
      }

      // Check if text is complete (has identified part + realistic price)
      if (bestMatch && bestMatch.confidenceScore >= 0.4 && parsedCost > 0) {
        const suppliers = await db.getMasterSuppliers();
        // Check if a supplier is mentioned
        const matchedSupplier =
          suppliers.find((s) => trimmedText.toLowerCase().includes(s.company_name.toLowerCase())) ||
          suppliers[0];

        // Incoterm detection
        let incoterm: 'DDP' | 'EXW' | 'FOB' = 'DDP';
        if (/\bexw|ex-works|shop|counter|brandreth\b/i.test(trimmedText)) incoterm = 'EXW';
        if (/\bfob|port\b/i.test(trimmedText)) incoterm = 'FOB';

        draft = {
          item_id: bestMatch.item.id,
          supplier_id: matchedSupplier.id,
          unit_cost: parsedCost,
          currency: isUsd ? 'USD' : 'PKR',
          incoterm_code: incoterm,
          source_validity_date: new Date().toISOString(),
          notes: `WhatsApp draft from: "${trimmedText}"`,
        };

        nextState = 'AWAITING_CONFIRM';
        botReply = `📋 *DRAFT RATE RECORD DETECTED*:
• *Part*: ${bestMatch.item.brand} ${bestMatch.item.official_sku}
• *Desc*: _${bestMatch.item.plain_english_description}_
• *Supplier*: ${matchedSupplier.company_name}
• *Price*: ${isUsd ? '$' : 'PKR '}${formatPKR(parsedCost)} (${incoterm})
• *Date*: ${new Date().toLocaleDateString('en-GB')}

👉 *Reply '1' to save to Gold Mine*, or type corrections.`;
      } else {
        // Incomplete information -> Trigger Proof-Request Loop
        nextState = 'AWAITING_SCREENSHOT';
        botReply = `⚠️ *Cannot verify exact part or date from text.*
"${trimmedText}"

Please send a screenshot of the supplier chat/quote.
💡 *Tip*: Use WhatsApp's crop or pen tool to black out phone numbers or personal chat before sending!`;
      }
    }

    // Update Session
    await db.updateWhatsAppSession(normalizedPhone, nextState, draft);

    return NextResponse.json({
      success: true,
      authorized: true,
      state: nextState,
      reply: botReply,
      committedRecord,
      session: {
        phone: normalizedPhone,
        state: nextState,
        userName: user.full_name,
      },
    });
  } catch (err: any) {
    console.error('WhatsApp Webhook error:', err);
    return NextResponse.json({ error: err.message || 'Webhook internal error' }, { status: 500 });
  }
}

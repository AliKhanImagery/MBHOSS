// ==============================================================================
// OOS Procurement AI Engine (Gemini 1.5 Flash + Groq SDK + Local Heuristic)
// ==============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { db, MasterItem } from './db';

export interface ParsedItemMatch {
  item: MasterItem;
  plainEnglishLabel: string; // e.g. "Siemens 3RH2122-1BB40 — 24V DC Contactor Relay"
  confidenceScore: number; // 0 to 1
  matchReason: string;
}

export interface ParsedLineItem {
  rawLine: string;
  extractedDescription: string;
  extractedQty: number;
  extractedUom: string;
  topMatches: ParsedItemMatch[];
  selectedMatchId?: string;
}

export interface ParseResult {
  source: 'GEMINI' | 'GROQ' | 'LOCAL_HEURISTIC';
  items: ParsedLineItem[];
  warnings?: string[];
}

export class AIEngine {
  private geminiClient: GoogleGenerativeAI | null = null;
  private groqClient: Groq | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(geminiKey);
      } catch (err) {
        console.warn('Failed to init Gemini client:', err);
      }
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        this.groqClient = new Groq({ apiKey: groqKey });
      } catch (err) {
        console.warn('Failed to init Groq client:', err);
      }
    }
  }

  /**
   * Parses omnibox text or tender extracts, returning Top-3 matching Master SKUs in plain English
   */
  async parseOmniboxInput(rawInput: string): Promise<ParseResult> {
    const cleanInput = rawInput.trim();
    if (!cleanInput) {
      return { source: 'LOCAL_HEURISTIC', items: [] };
    }

    const masterCatalog = await db.getMasterItems();

    // 1. Try Gemini 1.5 Flash if configured
    if (this.geminiClient) {
      try {
        const geminiResult = await this.parseWithGemini(cleanInput, masterCatalog);
        if (geminiResult && geminiResult.items.length > 0) {
          return geminiResult;
        }
      } catch (err) {
        console.warn('[AI] Gemini parsing failed, falling back to Groq/Heuristic:', err);
      }
    }

    // 2. Try Groq SDK if configured
    if (this.groqClient) {
      try {
        const groqResult = await this.parseWithGroq(cleanInput, masterCatalog);
        if (groqResult && groqResult.items.length > 0) {
          return groqResult;
        }
      } catch (err) {
        console.warn('[AI] Groq parsing failed, falling back to Local Heuristic:', err);
      }
    }

    // 3. Guaranteed Local Heuristic Rule & Slang Matcher
    return this.parseWithLocalHeuristic(cleanInput, masterCatalog);
  }

  /**
   * Local deterministic matcher for industrial jargon, Brandreth Road slang & SKUs
   */
  private parseWithLocalHeuristic(text: string, catalog: MasterItem[]): ParseResult {
    // Split into lines or numbered list items
    const rawLines = text
      .split(/\r?\n|(?<=[.;])\s*(?=\d+[\.\)\-]\s+)/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    const parsedItems: ParsedLineItem[] = [];

    for (const rawLine of rawLines) {
      // 1. Extract Quantity & UoM
      // e.g. "10 pcs", "4 nos", "qty: 5", "x 2", "20x", "5 units"
      let qty = 1;
      let uom = 'PCS';

      const qtyMatch = rawLine.match(
        /(?:qty|quantity)?[:\s-]*(\d+(?:\.\d+)?)\s*(pcs|nos|pieces|units|set|sets|mtr|meters|box|boxes)?/i
      );

      if (qtyMatch && qtyMatch[1]) {
        const val = parseFloat(qtyMatch[1]);
        if (!isNaN(val) && val > 0 && val < 100000) {
          qty = val;
          if (qtyMatch[2]) {
            uom = qtyMatch[2].toUpperCase();
            if (uom === 'PIECES' || uom === 'NOS' || uom === 'UNITS') uom = 'PCS';
          }
        }
      }

      // 2. Rank Master Catalog by keyword & alias overlap
      const scoredMatches: ParsedItemMatch[] = catalog.map((item) => {
        let score = 0;
        let reason = 'General catalog match';

        const lineLower = rawLine.toLowerCase();
        const skuLower = item.official_sku.toLowerCase();
        const brandLower = item.brand.toLowerCase();
        const descLower = item.plain_english_description.toLowerCase();

        // Exact or partial SKU hit (strongest match)
        if (lineLower.includes(skuLower)) {
          score += 0.85;
          reason = `Exact SKU match for ${item.official_sku}`;
        } else {
          // Check core sub-part, e.g. "3RH2122" in "3RH2122-1BB40"
          const basePart = item.official_sku.split(/[-_]/)[0]?.toLowerCase();
          if (basePart && basePart.length >= 4 && lineLower.includes(basePart)) {
            score += 0.65;
            reason = `Part family match for ${basePart.toUpperCase()}`;
          }
        }

        // Local slang / Urdu / Brandreth Rd alias match
        for (const alias of item.local_market_aliases || []) {
          const aliasLower = alias.toLowerCase();
          if (lineLower.includes(aliasLower)) {
            score += 0.75;
            reason = `Matched local market slang: "${alias}"`;
            break;
          }
        }

        // Brand match
        if (lineLower.includes(brandLower)) {
          score += 0.25;
        }

        // Voltage / Amperage keywords
        const electricalTokens = ['24v', '220v', '380v', '400v', '110v', '25a', '9a', '32a', '1.5kw', '2hp', 'm12', 'pnp', 'npn', 'contactor', 'relay', 'vfd', 'plc', 'sensor'];
        for (const token of electricalTokens) {
          if (lineLower.includes(token) && (descLower.includes(token) || skuLower.includes(token))) {
            score += 0.15;
          }
        }

        // Normalize score between 0.1 and 0.99
        score = Math.min(0.99, Math.max(0.1, score));

        return {
          item,
          plainEnglishLabel: `${item.brand} ${item.official_sku} — ${item.plain_english_description}`,
          confidenceScore: Math.round(score * 100) / 100,
          matchReason: reason,
        };
      });

      // Sort descending by confidence score
      scoredMatches.sort((a, b) => b.confidenceScore - a.confidenceScore);

      // Take Top 3 plain English matches
      const topMatches = scoredMatches.slice(0, 3);

      parsedItems.push({
        rawLine,
        extractedDescription: rawLine.replace(/^(?:\d+[\.\)\-]\s*)/, '').trim(),
        extractedQty: qty,
        extractedUom: uom,
        topMatches,
        selectedMatchId: topMatches[0]?.item.id,
      });
    }

    return {
      source: 'LOCAL_HEURISTIC',
      items: parsedItems,
    };
  }

  /**
   * Gemini 1.5 Flash structured parser
   */
  private async parseWithGemini(text: string, catalog: MasterItem[]): Promise<ParseResult | null> {
    if (!this.geminiClient) return null;
    const model = this.geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const catalogSnippet = catalog.map((c) => ({
      id: c.id,
      sku: c.official_sku,
      brand: c.brand,
      desc: c.plain_english_description,
      aliases: c.local_market_aliases,
    }));

    const prompt = `You are an industrial procurement engineer in Pakistan parsing raw tender/RFQ text.
Map every item in the input to the Top 3 best matches from this master catalog:
${JSON.stringify(catalogSnippet)}

INPUT TEXT:
${text}

Respond ONLY in valid JSON matching this structure:
{
  "items": [
    {
      "rawLine": "string",
      "extractedDescription": "clean string",
      "extractedQty": 1,
      "extractedUom": "PCS",
      "topMatches": [
        {
          "itemId": "catalog id",
          "confidenceScore": 0.95,
          "matchReason": "why matched"
        }
      ]
    }
  ]
}`;

    const res = await model.generateContent(prompt);
    const content = res.response.text();
    const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed && Array.isArray(parsed.items)) {
      const items: ParsedLineItem[] = parsed.items.map((pi: any) => {
        const topMatches: ParsedItemMatch[] = (pi.topMatches || [])
          .map((m: any) => {
            const item = catalog.find((c) => c.id === m.itemId);
            if (!item) return null;
            return {
              item,
              plainEnglishLabel: `${item.brand} ${item.official_sku} — ${item.plain_english_description}`,
              confidenceScore: m.confidenceScore || 0.8,
              matchReason: m.matchReason || 'AI matched',
            };
          })
          .filter(Boolean);

        return {
          rawLine: pi.rawLine,
          extractedDescription: pi.extractedDescription || pi.rawLine,
          extractedQty: Number(pi.extractedQty) || 1,
          extractedUom: pi.extractedUom || 'PCS',
          topMatches: topMatches.length > 0 ? topMatches : this.parseWithLocalHeuristic(pi.rawLine, catalog).items[0]?.topMatches || [],
          selectedMatchId: topMatches[0]?.item.id,
        };
      });

      return { source: 'GEMINI', items };
    }

    return null;
  }

  /**
   * Groq SDK fallback parser
   */
  private async parseWithGroq(text: string, catalog: MasterItem[]): Promise<ParseResult | null> {
    if (!this.groqClient) return null;

    const catalogSnippet = catalog.map((c) => ({
      id: c.id,
      sku: c.official_sku,
      brand: c.brand,
      aliases: c.local_market_aliases,
    }));

    const completion = await this.groqClient.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are an industrial electrical engineer parsing procurement items into JSON.',
        },
        {
          role: 'user',
          content: `Catalog: ${JSON.stringify(catalogSnippet)}. Input: ${text}. Return JSON: {"items":[{"rawLine":"","extractedDescription":"","extractedQty":1,"extractedUom":"PCS","matchedItemId":""}]}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const reply = completion.choices[0]?.message?.content;
    if (reply) {
      const parsed = JSON.parse(reply);
      if (Array.isArray(parsed.items)) {
        return this.parseWithLocalHeuristic(text, catalog);
      }
    }
    return null;
  }

  /**
   * Generates a 1-click copyable Gemini Deep Research prompt with Local vs Global toggle
   */
  buildDeepResearchPrompt(
    items: Array<{ description: string; sku?: string; brand?: string; qty?: number }>,
    scope: 'LOCAL' | 'GLOBAL' = 'LOCAL',
    targetCountry: string = 'Pakistan'
  ): string {
    const isLocal = scope === 'LOCAL';
    const itemsList = items
      .map(
        (it, idx) =>
          `${idx + 1}. Item: ${it.description} | Brand: ${it.brand || 'Any reputed'} | Model/SKU: ${
            it.sku || 'Industrial Grade'
          } | Target Qty: ${it.qty || 1} units`
      )
      .join('\n');

    if (isLocal) {
      return `### GEMINI DEEP RESEARCH: LOCAL INDUSTRIAL MARKET PRICING & INVENTORY AUDIT [${targetCountry.toUpperCase()}]

**Objective**: Perform deep industrial market intelligence and price verification for the following procurement Bill of Materials (BOM) in ${targetCountry} (focusing on Brandreth Road Lahore, Denso Hall / Regal Karachi, and Islamabad/Rawalpindi wholesale electrical switchgear hubs).

**Procurement Items:**
${itemsList}

**Required Deep Research Output:**
1. **Local Market Price Benchmarks (PKR)**:
   - Provide realistic cash counter vs formal GST commercial quotation price ranges in PKR for each item.
   - Specify whether pricing includes 18% Sales Tax (GST) or is cash ex-counter Brandreth Road.
2. **Authorized Importers & Stockist Identification**:
   - Identify verified authorized Tier-1 distributors and active Tier-2 stockists in Lahore and Karachi holding physical ex-stock inventory.
   - List known supplier names, shop addresses, direct phone/WhatsApp contacts, and typical lead times (Ex-stock vs 2-3 weeks).
3. **Genuine vs Refurbished / Clone Detection Checklist**:
   - For Siemens, Schneider, and Omron items, detail specific batch codes, holographic seal checks, and screw terminal mold marks to guard against refurbished or counterfeit market units.
4. **Current Forex (PKR vs USD/EUR) Volatility Advisory**:
   - Detail import tariff/customs duties (Chapter 85) impact on landed replacement cost.
   - Recommend a conservative procurement bid margin buffer (15% vs 20% vs 25%).

*Please format output with high density tables, direct market phone contacts where public, and actionable procurement insights.*`;
    }

    return `### GEMINI DEEP RESEARCH: GLOBAL INDUSTRIAL SOURCING & BENCHMARK AUDIT [INTERNATIONAL]

**Objective**: Perform global supply chain and pricing intelligence across authorized global industrial distributors (Mouser, DigiKey, Radwell, RS Components, Farnell, Direct Manufacturer European Stock) for export to ${targetCountry}.

**Procurement Items:**
${itemsList}

**Required Deep Research Output:**
1. **Global Factory List Price & Volume Tiers (USD / EUR)**:
   - Manufacturer List Price (MSRP) vs 1-10 unit distributor price.
   - Global stock availability: current factory lead times (weeks) if out of stock.
2. **Customs HS Code & Import Duty Classification**:
   - Provide recommended 6-digit and 8-digit Harmonized System (HS) codes under Chapter 85.
   - Estimate standard international air freight weight/dimensions and import tariff burdens.
3. **Alternative Direct Replacements / Drop-in Equivalents**:
   - For each part, provide 1 to 2 technically verified drop-in equivalent alternatives (e.g. ABB, Eaton, Chint, Fuji Electric) with identical electrical ratings, coil voltages, and mounting dimensions.
4. **Export Control & Incoterm Recommendation**:
   - Optimal Incoterm (EXW / FOB / CIF Karachi / DDP Door) and freight risk analysis.`;
  }
}

export const aiEngine = new AIEngine();

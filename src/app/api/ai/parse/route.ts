// ==============================================================================
// POST /api/ai/parse - Omnibox Intake AI Parser
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { aiEngine } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text = '' } = body;

    const result = await aiEngine.parseOmniboxInput(text);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

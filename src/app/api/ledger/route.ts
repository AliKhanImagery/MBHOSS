// ==============================================================================
// GET & POST /api/ledger - Price Gold Mine Ledger API
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const itemId = url.searchParams.get('itemId') || undefined;

    const records = await db.getLedgerRecords({ search, itemId });
    const items = await db.getMasterItems();
    const suppliers = await db.getMasterSuppliers();
    const users = await db.getUsers();

    return NextResponse.json({
      records,
      items,
      suppliers,
      users,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      item_id,
      supplier_id,
      submitted_by,
      unit_cost,
      currency = 'PKR',
      source_origin = 'LOCAL_MARKET_QUICKADD',
      incoterm_code = 'DDP',
      source_validity_date = new Date().toISOString(),
      evidence_url,
      notes,
    } = body;

    if (!item_id || !unit_cost) {
      return NextResponse.json({ error: 'Missing required item_id or unit_cost' }, { status: 400 });
    }

    const newRecord = await db.addLedgerRecord({
      item_id,
      supplier_id,
      submitted_by,
      unit_cost: Number(unit_cost),
      currency,
      source_origin,
      incoterm_code,
      source_validity_date,
      evidence_url,
      notes,
    });

    return NextResponse.json({ success: true, record: newRecord });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

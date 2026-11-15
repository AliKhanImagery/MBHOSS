// ==============================================================================
// POST /api/ref/claim - Atomic Quote Reference Sequence Claim
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    const users = await db.getUsers();
    const targetUserId = userId || users[1]?.id || users[0]?.id;

    const refNumber = await db.claimNextRefNumber(targetUserId);

    return NextResponse.json({
      success: true,
      refNumber,
      claimedBy: targetUserId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

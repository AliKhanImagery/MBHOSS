// ==============================================================================
// GET & POST /api/admin/settings - CTO God Mode Configuration & Leaderboard
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const settings = await db.getSettings();
    const users = await db.getUsers();
    const leaderboard = await db.getContributorLeaderboard();

    return NextResponse.json({
      settings,
      users,
      leaderboard,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      settingsUpdates,
      userUpdates, // [{ id, ref_range_start, ref_range_end, whatsapp_phone }]
      newUser,
    } = body;

    let updatedSettings = null;
    if (settingsUpdates) {
      updatedSettings = await db.updateSettings(settingsUpdates);
    }

    if (userUpdates && Array.isArray(userUpdates)) {
      for (const u of userUpdates) {
        if (u.id && u.ref_range_start !== undefined && u.ref_range_end !== undefined) {
          await db.updateUserSeqRange(u.id, Number(u.ref_range_start), Number(u.ref_range_end));
        }
        if (u.id && u.whatsapp_phone) {
          const user = (await db.getUsers()).find((usr) => usr.id === u.id);
          if (user) {
            user.whatsapp_phone = u.whatsapp_phone.trim();
          }
        }
      }
    }

    if (newUser) {
      await db.addUser({
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role || 'PROCUREMENT_ENGINEER',
        whatsapp_phone: newUser.whatsapp_phone,
        ref_range_start: Number(newUser.ref_range_start) || 4000,
        ref_range_end: Number(newUser.ref_range_end) || 4999,
        ref_current_seq: Number(newUser.ref_range_start) || 4000,
      });
    }

    const currentUsers = await db.getUsers();
    const leaderboard = await db.getContributorLeaderboard();

    return NextResponse.json({
      success: true,
      settings: updatedSettings || (await db.getSettings()),
      users: currentUsers,
      leaderboard,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

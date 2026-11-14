import { NextResponse } from 'next/server';
import { safeErrorResponse, withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { updateTradeNote } from '@/lib/trading/mock-theses-server';

export const dynamic = 'force-dynamic';

/* PATCH /api/mock-trades/<id>: the trade journal's thesis note, { thesis_note }
   only (an empty note clears it). 404 unless the trade is the caller's. */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    try {
      const payload = await request.json().catch(() => null);
      const { status, body } = await updateTradeNote(
        getAdminClient(),
        user.id,
        context?.params?.id,
        payload,
      );
      return NextResponse.json(body, { status });
    } catch (e) {
      return safeErrorResponse(e, {
        message: 'Could not save the note.',
        context: 'mock-trades:note',
      });
    }
  },
  { requireAuth: true },
);

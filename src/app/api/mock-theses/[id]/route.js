import { NextResponse } from 'next/server';
import { safeErrorResponse, withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { CANONICAL_SECTORS } from '@/lib/fmp/sector-performance';
import { deleteThesis, updateThesis } from '@/lib/trading/mock-theses-server';

export const dynamic = 'force-dynamic';

/* PATCH: edit fields, or { activate: true }. DELETE: remove (the oldest
   remaining thesis becomes active if this one was). Logic and validation in
   src/lib/trading/mock-theses-server.js, scoped to the caller's user id. */

export const PATCH = withApiGuard(
  async (request, user, context) => {
    try {
      const payload = await request.json().catch(() => null);
      const { status, body } = await updateThesis(
        getAdminClient(),
        user.id,
        context?.params?.id,
        payload,
        { sectors: CANONICAL_SECTORS },
      );
      return NextResponse.json(body, { status });
    } catch (e) {
      return safeErrorResponse(e, {
        message: 'Could not update the thesis.',
        context: 'mock-theses:update',
      });
    }
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user, context) => {
    try {
      const { status, body } = await deleteThesis(getAdminClient(), user.id, context?.params?.id);
      return NextResponse.json(body, { status });
    } catch (e) {
      return safeErrorResponse(e, {
        message: 'Could not delete the thesis.',
        context: 'mock-theses:delete',
      });
    }
  },
  { requireAuth: true },
);

/**
 * DELETE /api/ezanaql/saved/:id  removes one of the signed-in user's saved reports.
 * Session required. 404 when no row of theirs has that id (RLS enforces ownership).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAuthContext } from '@/lib/supabase';
import { sanitizeUUID } from '@/lib/sanitize';
import { dbErrorResponse, exceptionResponse, validationResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export const DELETE = withApiGuard(async (request, user, context) => {
  try {
    const id = sanitizeUUID(context?.params?.id);
    if (!id) return validationResponse('Invalid report id.');
    const { supabase } = await getAuthContext(request);
    const { data, error } = await supabase
      .from('ezanaql_saved_reports')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id');
    if (error) {
      return dbErrorResponse('ezanaql saved DELETE', error, {
        fallback: 'Could not delete the report.',
      });
    }
    if (!data || !data.length) {
      return NextResponse.json({ ok: false, error: 'Report not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return exceptionResponse('ezanaql saved DELETE', e);
  }
});

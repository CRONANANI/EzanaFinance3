import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { NO_STORE, UUID_RE } from '@/lib/quants/lab-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const notFound = () => NextResponse.json({ error: 'Validation not found' }, { status: 404 });

/**
 * GET /api/quants/validations/:id
 * One validation report in full. Another user's id answers 404: RLS returns
 * no row.
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!UUID_RE.test(id)) return notFound();
      const { data, error } = await getUserClient()
        .from('quant_validation_runs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) return safeErrorResponse(error, { context: 'quants/validations get' });
      if (!data) return notFound();
      return NextResponse.json({ validation: data }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/validations get' });
    }
  },
  { requireAuth: true },
);

/** DELETE /api/quants/validations/:id */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!UUID_RE.test(id)) return notFound();
      const { data, error } = await getUserClient()
        .from('quant_validation_runs')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) return safeErrorResponse(error, { context: 'quants/validations delete' });
      if (!data?.length) return notFound();
      return NextResponse.json({ ok: true }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/validations delete' });
    }
  },
  { requireAuth: true, strict: true },
);

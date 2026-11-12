import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { NO_STORE, UUID_RE } from '@/lib/quants/lab-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const notFound = () => NextResponse.json({ error: 'Backtest not found' }, { status: 404 });

/**
 * GET /api/quants/backtests/:id
 * One run in full, with the exact strategy version it executed. Another
 * user's run answers 404: RLS returns no row.
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!UUID_RE.test(id)) return notFound();
      const supabase = getUserClient();
      const { data: run, error } = await supabase
        .from('quant_backtest_runs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) return safeErrorResponse(error, { context: 'quants/backtests get' });
      if (!run) return notFound();
      const { data: version } = await supabase
        .from('quant_strategy_versions')
        .select('id, version, spec, created_at')
        .eq('id', run.version_id)
        .maybeSingle();
      return NextResponse.json({ run, version: version || null }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/backtests get' });
    }
  },
  { requireAuth: true },
);

/** DELETE /api/quants/backtests/:id */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!UUID_RE.test(id)) return notFound();
      const { data, error } = await getUserClient()
        .from('quant_backtest_runs')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) return safeErrorResponse(error, { context: 'quants/backtests delete' });
      if (!data?.length) return notFound();
      return NextResponse.json({ ok: true }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/backtests delete' });
    }
  },
  { requireAuth: true, strict: true },
);

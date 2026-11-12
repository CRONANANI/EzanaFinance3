import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { validateSpec } from '@/lib/quants/strategy-spec';
import { NO_STORE, RUN_SUMMARY_COLUMNS, UUID_RE, specHash } from '@/lib/quants/lab-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const notFound = () => NextResponse.json({ error: 'Strategy not found' }, { status: 404 });

/**
 * GET /api/quants/strategies/:id
 * One strategy with its full version history and its runs (summaries only).
 * Another user's id answers 404: RLS returns no row.
 */
export const GET = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!UUID_RE.test(id)) return notFound();
      const supabase = getUserClient();
      const [sRes, vRes, rRes] = await Promise.all([
        supabase
          .from('quant_strategies')
          .select('id, name, description, status, latest_version, created_at, updated_at')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('quant_strategy_versions')
          .select('id, strategy_id, version, spec, backtestable, created_at')
          .eq('strategy_id', id)
          .order('version', { ascending: false }),
        supabase
          .from('quant_backtest_runs')
          .select(RUN_SUMMARY_COLUMNS)
          .eq('strategy_id', id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (sRes.error) return safeErrorResponse(sRes.error, { context: 'quants/strategies get' });
      if (!sRes.data) return notFound();
      return NextResponse.json(
        { strategy: sRes.data, versions: vRes.data || [], runs: rRes.data || [] },
        NO_STORE,
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/strategies get' });
    }
  },
  { requireAuth: true },
);

/**
 * PATCH /api/quants/strategies/:id  { name?, description?, status?, spec? }
 * A new `spec` never edits a stored version: it is saved as the next version,
 * so earlier backtests keep pointing at the rules they ran. An unchanged spec
 * creates no version.
 */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!UUID_RE.test(id)) return notFound();
      const body = await request.json().catch(() => ({}));
      const supabase = getUserClient();
      const { data: strategy, error } = await supabase
        .from('quant_strategies')
        .select('id, latest_version')
        .eq('id', id)
        .maybeSingle();
      if (error) return safeErrorResponse(error, { context: 'quants/strategies patch' });
      if (!strategy) return notFound();

      const patch = { updated_at: new Date().toISOString() };
      if (body?.name !== undefined) {
        const name = String(body.name || '')
          .trim()
          .slice(0, 80);
        if (!name) return NextResponse.json({ error: 'Give the strategy a name' }, { status: 400 });
        patch.name = name;
      }
      if (body?.description !== undefined) {
        patch.description = String(body.description || '').slice(0, 2000) || null;
      }
      if (body?.status !== undefined) {
        if (!['active', 'archived'].includes(body.status)) {
          return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
        }
        patch.status = body.status;
      }

      let version = null;
      let unsupported = [];
      if (body?.spec !== undefined) {
        const checked = validateSpec(body.spec);
        if (!checked.ok) {
          return NextResponse.json(
            { error: 'The strategy definition is not valid', details: checked.errors },
            { status: 400 },
          );
        }
        unsupported = checked.unsupported;
        const hash = specHash(checked.spec);
        const { data: current } = await supabase
          .from('quant_strategy_versions')
          .select('id, strategy_id, version, spec, spec_hash, backtestable, created_at')
          .eq('strategy_id', id)
          .eq('version', strategy.latest_version)
          .maybeSingle();
        if (current && current.spec_hash === hash) {
          version = current;
        } else {
          const next = strategy.latest_version + 1;
          const { data: created, error: vErr } = await supabase
            .from('quant_strategy_versions')
            .insert({
              strategy_id: id,
              user_id: user.id,
              version: next,
              spec: checked.spec,
              spec_hash: hash,
              backtestable: checked.unsupported.length === 0,
            })
            .select('id, strategy_id, version, spec, backtestable, created_at')
            .single();
          /* Two saves at once: the unique (strategy_id, version) lets one win. */
          if (vErr) {
            return NextResponse.json(
              {
                error: 'This strategy was saved elsewhere at the same time. Reload and try again.',
              },
              { status: 409 },
            );
          }
          version = created;
          patch.latest_version = next;
        }
      }

      const { data: updated, error: uErr } = await supabase
        .from('quant_strategies')
        .update(patch)
        .eq('id', id)
        .select('id, name, description, status, latest_version, created_at, updated_at')
        .single();
      if (uErr) return safeErrorResponse(uErr, { context: 'quants/strategies patch' });
      return NextResponse.json({ strategy: updated, version, unsupported }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/strategies patch' });
    }
  },
  { requireAuth: true, strict: true },
);

/** DELETE /api/quants/strategies/:id  Removes the strategy, its versions and its runs. */
export const DELETE = withApiGuard(
  async (request, user, context) => {
    try {
      const id = String(context?.params?.id || '');
      if (!UUID_RE.test(id)) return notFound();
      const { data, error } = await getUserClient()
        .from('quant_strategies')
        .delete()
        .eq('id', id)
        .select('id');
      if (error) return safeErrorResponse(error, { context: 'quants/strategies delete' });
      if (!data?.length) return notFound();
      return NextResponse.json({ ok: true }, NO_STORE);
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/strategies delete' });
    }
  },
  { requireAuth: true, strict: true },
);

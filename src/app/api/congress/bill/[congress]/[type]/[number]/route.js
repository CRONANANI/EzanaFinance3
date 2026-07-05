import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { hasCongressKey, getBill, getBillActions } from '@/lib/congress/client';
import { deriveStage } from '@/lib/congress/stage';

/**
 * GET /api/congress/bill/[congress]/[type]/[number] — single bill detail.
 * Supabase-first (ingested row + actions), live-API fallback, honest 404 when
 * neither source has it. NO mock data.
 */
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const rl = await checkRateLimit(`congress:bill:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const congress = Number(params.congress);
  const type = String(params.type || '').toLowerCase();
  const number = Number(params.number);
  if (!congress || !type || !number) {
    return NextResponse.json({ ok: false, error: 'Invalid bill reference.' }, { status: 400 });
  }
  const id = `${congress}-${type}-${number}`;

  if (supaConfigured()) {
    try {
      const admin = getAdminClient();
      const { data: bill } = await admin.from('congress_bills').select('*').eq('id', id).single();
      if (bill) {
        const { data: actions } = await admin
          .from('congress_bill_actions')
          .select('action_date,text,seq')
          .eq('bill_id', id)
          .order('seq', { ascending: false })
          .limit(30);
        const { data: subjects } = await admin
          .from('congress_bill_subjects')
          .select('subject')
          .eq('bill_id', id);
        return NextResponse.json({
          ok: true,
          source: 'supabase',
          bill,
          actions: actions || [],
          subjects: (subjects || []).map((s) => s.subject),
        });
      }
    } catch {
      /* fall through */
    }
  }

  if (hasCongressKey()) {
    try {
      const [bRes, aRes] = await Promise.all([
        getBill(congress, type, number),
        getBillActions(congress, type, number),
      ]);
      const b = bRes.data?.bill;
      if (b) {
        const actions = Array.isArray(aRes.data?.actions) ? aRes.data.actions : [];
        return NextResponse.json({
          ok: true,
          source: 'live',
          bill: {
            id,
            congress,
            type,
            number,
            title: b.title || null,
            policy_area: b.policyArea?.name || null,
            latest_action_text: b.latestAction?.text || null,
            latest_action_date: b.latestAction?.actionDate || null,
            stage: deriveStage({ latestActionText: b.latestAction?.text, actions }),
          },
          actions: actions.slice(0, 30).map((a) => ({ action_date: a.actionDate, text: a.text })),
          subjects: [],
        });
      }
    } catch {
      /* fall through */
    }
  }

  return NextResponse.json({ ok: false, error: 'Bill not found.' }, { status: 404 });
}

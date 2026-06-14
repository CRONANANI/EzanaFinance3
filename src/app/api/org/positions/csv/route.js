import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { withApiGuard } from '@/lib/api-guard';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import {
  getOrgMemberByUserId,
  canManagePositionsServer,
  resolveTeamForOrg,
} from '@/lib/org-positions-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The file is REJECTED unless every one of these headers is present.
const REQUIRED_HEADERS = ['ticker', 'shares', 'avg_cost'];
const OPTIONAL_HEADERS = ['name', 'sector', 'notes'];
const TICKER_RE = /^[A-Z0-9.\-]{1,12}$/;
const MAX_ROWS = 1000;

/* POST /api/org/positions/csv — bulk import positions from an uploaded CSV.
   The system validates headers AND every row's values; a file with the wrong
   columns, or no usable rows, is rejected (400) and nothing is written. */
export const POST = withApiGuard(
  async (request, user) => {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const admin = createServerSupabaseClient();
    const member = await getOrgMemberByUserId(admin, user.id);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!(await canManagePositionsServer(admin, member))) {
      return NextResponse.json({ error: 'manage_positions required' }, { status: 403 });
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }
    const file = form.get('file');
    const teamIdRaw = form.get('team_id') || null;

    if (!file || typeof file.text !== 'function') {
      return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
    }

    const team = await resolveTeamForOrg(admin, member.org_id, teamIdRaw);
    if (team.invalid) {
      return NextResponse.json({ error: 'team_id does not belong to your org' }, { status: 400 });
    }

    const text = await file.text();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'The uploaded file is empty' }, { status: 400 });
    }

    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    if (parsed.errors?.length) {
      return NextResponse.json(
        { error: 'Could not parse the CSV file', details: parsed.errors.slice(0, 5) },
        { status: 400 },
      );
    }

    // ── Header validation ──────────────────────────────────────────
    const headers = parsed.meta.fields || [];
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missing.join(', ')}`,
          requiredHeaders: REQUIRED_HEADERS,
          optionalHeaders: OPTIONAL_HEADERS,
          foundHeaders: headers,
        },
        { status: 400 },
      );
    }

    if (parsed.data.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Too many rows (max ${MAX_ROWS} per upload)` },
        { status: 400 },
      );
    }

    // ── Row-level value validation ─────────────────────────────────
    const rows = [];
    const errors = [];
    parsed.data.forEach((r, i) => {
      const lineNo = i + 2; // +1 for the header row, +1 for 1-based line numbers
      const sym = String(r.ticker || '').toUpperCase().trim();
      const shares = Number(r.shares);
      const avg_cost = Number(r.avg_cost);

      if (!TICKER_RE.test(sym)) {
        errors.push({ row: lineNo, reason: `Invalid or missing ticker "${r.ticker ?? ''}"` });
        return;
      }
      if (!Number.isFinite(shares) || shares <= 0) {
        errors.push({ row: lineNo, reason: `Shares must be a number > 0 (got "${r.shares ?? ''}")` });
        return;
      }
      if (!Number.isFinite(avg_cost) || avg_cost < 0) {
        errors.push({ row: lineNo, reason: `avg_cost must be a number >= 0 (got "${r.avg_cost ?? ''}")` });
        return;
      }

      rows.push({
        org_id: member.org_id,
        team_id: team.teamId,
        ticker: sym,
        name: r.name ? String(r.name).slice(0, 200) : null,
        shares,
        avg_cost,
        sector: r.sector ? String(r.sector).slice(0, 100) : null,
        notes: r.notes ? String(r.notes).slice(0, 2000) : null,
        source: 'csv',
        added_by_user_id: member.user_id,
      });
    });

    if (!rows.length) {
      return NextResponse.json(
        { error: 'No valid rows to import. Fix the issues below and re-upload.', errors },
        { status: 400 },
      );
    }

    const { data, error: insErr } = await admin.from('org_positions').insert(rows).select('id');
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ inserted: data.length, skipped: errors.length, errors });
  },
  { requireAuth: true },
);

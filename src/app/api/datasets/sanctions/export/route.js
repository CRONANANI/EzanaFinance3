/**
 * GET /api/datasets/sanctions/export?<the listings filters>
 * The current listings filter as a CSV download, up to EXPORT_MAX_ROWS rows.
 * Session required: browsing is open, downloading is an account feature
 * (the same rule as EzanaQL exports). Rate limited per user. Cells that a
 * spreadsheet would run as a formula are neutralised (see toCsv).
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { validationResponse } from '@/lib/api-errors';
import { EXPORT_MAX_ROWS, exportSanctions, parseSearchParams } from '@/lib/sanctions/research';
import { toCsv } from '@/lib/sanctions/insights';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const COLUMNS = [
  ['ofac_entry_number', (r) => r.id],
  ['name', (r) => r.name],
  ['type', (r) => r.type],
  ['programs', (r) => r.programs.join(' ')],
  ['address_countries', (r) => r.countries.join('; ')],
  ['ofac_listing_date', (r) => r.listedOn || ''],
  ['secondary_sanctions_risk_stated', (r) => (r.secondaryRisk ? 'yes' : 'no')],
  ['first_identifier', (r) => (r.ident ? `${r.ident.label} ${r.ident.value}` : '')],
  ['linked_to_notes', (r) => r.linkCount],
];

export async function GET(request) {
  let user = null;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json(
      { ok: false, code: 'auth_required', error: 'Create an account to export listings.' },
      { status: 401 },
    );
  }
  const rl = await checkRateLimit(`sanctions-export:${user.id}`, { limit: 6, window: '60 s' });
  if (!rl.success) return rateLimitResponse(rl);

  const params = parseSearchParams(new URL(request.url).searchParams);
  if (params.error) return validationResponse(params.error);

  const { rows, total, error } = await exportSanctions({ ...params, page: 1 });
  if (error)
    return NextResponse.json(
      { ok: false, error: 'Export failed. Try again shortly.' },
      { status: 503 },
    );

  const header = [
    `# Source: US Treasury OFAC SDN list (public domain), via ezana.world. Exported ${new Date().toISOString()}.`,
    `# ${rows.length} of ${total} matching listings${total > EXPORT_MAX_ROWS ? ` (capped at ${EXPORT_MAX_ROWS})` : ''}. Identifiers are machine-extracted from OFAC remarks.`,
  ].join('\n');
  const csv = `${header}\n${toCsv(rows, COLUMNS)}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ezana-ofac-sdn-listings.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

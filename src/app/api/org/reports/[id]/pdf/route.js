import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const money = (n) => (n == null ? '—' : `$${Math.round(Number(n)).toLocaleString()}`);
const pct = (n) => (n == null ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`);
const sign = (n) => (n == null ? '' : Number(n) >= 0 ? 'pos' : 'neg');

/* GET /api/org/reports/:id/pdf — branded, print-ready stakeholder report.
   Manager/advisor only. Served as a self-contained HTML document that opens the
   browser print dialog (Save as PDF) — no server-side PDF engine dependency. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager / advisor role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    const { data: report } = await supabase
      .from('org_reports')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    const p = report.payload || {};
    const perf = p.performance || {};
    const origin = (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return '';
      }
    })();
    const logo = `${origin}/ezana-logo.png`;
    const genDate = new Date(p.generatedAt || report.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const sectorRows = (p.attribution?.bySector || [])
      .map(
        (s) => `<tr>
          <td>${esc(s.sector)}</td>
          <td class="mono r">${s.weight_pct == null ? '—' : s.weight_pct.toFixed(1) + '%'}</td>
          <td class="mono r ${sign(s.contribution_pct)}">${pct(s.contribution_pct)}</td>
        </tr>`,
      )
      .join('');

    const pitchRows = (p.topPitches || [])
      .map(
        (t) => `<tr>
          <td class="mono">${esc(t.ticker || '—')}</td>
          <td>${esc(t.analyst || '—')}</td>
          <td class="mono r ${sign(t.return_pct)}">${pct(t.return_pct)}</td>
          <td class="mono r ${sign(t.alpha_pct)}">${pct(t.alpha_pct)}</td>
          <td>${esc(t.current_state || '—')}</td>
        </tr>`,
      )
      .join('');

    const rosterRows = (p.roster || [])
      .map(
        (m) =>
          `<tr><td>${esc(m.name)}</td><td>${esc(m.title || (m.role || '').replace('_', ' '))}</td><td>${esc(
            m.sub_role || '',
          )}</td></tr>`,
      )
      .join('');

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(report.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
<style>
  :root { --em:#10b981; --gold:#d4a853; --ink:#0f172a; --muted:#64748b; --line:#e5e7eb; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:'Plus Jakarta Sans',-apple-system,sans-serif; color:var(--ink); background:#fff; }
  .page { max-width:820px; margin:0 auto; padding:40px 48px 64px; }
  .mono { font-family:'JetBrains Mono',monospace; font-variant-numeric:tabular-nums; }
  .r { text-align:right; }
  .pos { color:#059669; } .neg { color:#dc2626; }
  .cover { display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .cover img { height:42px; width:auto; }
  .conf { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--gold); font-weight:700; }
  h1 { font-size:26px; font-weight:800; letter-spacing:-.02em; margin:18px 0 2px; }
  .period { color:var(--muted); font-size:13px; }
  .rule { height:3px; background:linear-gradient(90deg,var(--em),var(--gold)); border-radius:3px; margin:14px 0 26px; }
  h2 { font-size:13px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--em); margin:28px 0 10px; }
  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .stat { border:1px solid var(--line); border-radius:12px; padding:14px; }
  .stat .lbl { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  .stat .val { font-family:'JetBrains Mono',monospace; font-weight:700; font-size:20px; margin-top:4px; }
  table { width:100%; border-collapse:collapse; font-size:12.5px; }
  th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); padding:7px 8px; border-bottom:2px solid var(--line); }
  td { padding:7px 8px; border-bottom:1px solid var(--line); }
  .footer { margin-top:36px; padding-top:12px; border-top:1px solid var(--line); display:flex; justify-content:space-between; font-size:10.5px; color:var(--muted); }
  @media print { .noprint { display:none !important; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .page { padding:24px 32px; } }
  .printbar { position:fixed; top:0; left:0; right:0; background:#0f172a; color:#fff; padding:8px 16px; display:flex; gap:12px; align-items:center; justify-content:center; }
  .printbar button { font:inherit; font-weight:700; padding:6px 14px; border-radius:8px; border:none; background:var(--em); color:#04130d; cursor:pointer; }
</style></head>
<body>
<div class="printbar noprint">
  Stakeholder report ready — <button onclick="window.print()">Download / Print PDF</button>
</div>
<div class="page">
  <div class="cover">
    <div>
      <div class="conf">Confidential</div>
      <h1>${esc(p.universityName || 'Student Investment Fund')}</h1>
      <div class="period">Student-Managed Investment Fund · ${esc(p.periodLabel || 'Current Term')}${p.cohort ? ' · ' + esc(p.cohort) : ''}</div>
    </div>
    <img src="${esc(logo)}" alt="Ezana" onerror="this.style.display='none'" />
  </div>
  <div class="rule"></div>

  <h2>Executive Summary</h2>
  <div class="stats">
    <div class="stat"><div class="lbl">Fund Value</div><div class="val">${money(perf.total_value)}</div></div>
    <div class="stat"><div class="lbl">Return</div><div class="val ${sign(perf.return_pct)}">${pct(perf.return_pct)}</div></div>
    <div class="stat"><div class="lbl">Benchmark</div><div class="val">${pct(perf.benchmark_return_pct)}</div></div>
    <div class="stat"><div class="lbl">Alpha</div><div class="val ${sign(perf.alpha_pct)}">${pct(perf.alpha_pct)}</div></div>
  </div>

  <h2>Performance vs. Benchmark</h2>
  <table>
    <tr><th>Metric</th><th class="r">Value</th></tr>
    <tr><td>Total cost basis</td><td class="mono r">${money(perf.total_cost)}</td></tr>
    <tr><td>Current value</td><td class="mono r">${money(perf.total_value)}</td></tr>
    <tr><td>Fund return</td><td class="mono r ${sign(perf.return_pct)}">${pct(perf.return_pct)}</td></tr>
    <tr><td>Benchmark return</td><td class="mono r">${pct(perf.benchmark_return_pct)}</td></tr>
    <tr><td>Alpha (excess return)</td><td class="mono r ${sign(perf.alpha_pct)}">${pct(perf.alpha_pct)}</td></tr>
    <tr><td>Positions held</td><td class="mono r">${perf.positions ?? 0}</td></tr>
  </table>

  <h2>Attribution by Sector</h2>
  <table>
    <tr><th>Sector</th><th class="r">Weight</th><th class="r">Contribution</th></tr>
    ${sectorRows || '<tr><td colspan="3" style="color:#94a3b8">No sector data.</td></tr>'}
  </table>

  <h2>Top Contributing Pitches</h2>
  <table>
    <tr><th>Ticker</th><th>Analyst</th><th class="r">Return</th><th class="r">Alpha</th><th>State</th></tr>
    ${pitchRows || '<tr><td colspan="5" style="color:#94a3b8">No pitch outcomes recorded yet.</td></tr>'}
  </table>

  <h2>Roster — ${esc(p.cohort || 'Current Cohort')}</h2>
  <table>
    <tr><th>Member</th><th>Title / Role</th><th>Designation</th></tr>
    ${rosterRows || '<tr><td colspan="3" style="color:#94a3b8">No roster recorded.</td></tr>'}
  </table>

  <div class="footer">
    <span>Prepared via Ezana Finance — Confidential</span>
    <span class="mono">Generated ${esc(genDate)}</span>
  </div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},400);});</script>
</body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${(report.title || 'fund-report').replace(/[^a-z0-9]+/gi, '-')}.html"`,
        'Cache-Control': 'no-store',
      },
    });
  },
  { requireAuth: true },
);

/**
 * The printable stakeholder report: a standalone, light HTML document built
 * from a saved report's frozen payload. Served by the printable route and
 * shown, scaled, in the Reports page's preview, so both are one document.
 *
 * It renders outside the app shell, so the app's --font-* and colour tokens
 * do not exist inside it: it declares its own light palette and font stacks
 * (a sanctioned exception in scripts/check-branding.mjs). It loads nothing
 * from third parties: fonts and the logo come from the app's own origin.
 *
 * Pure: no React, no fetch, no server imports.
 */
import {
  DISCLOSURE,
  LEGACY_NOTE,
  NA,
  fmtDay,
  fmtMoney,
  fmtPct,
  fmtPts,
  fmtWeight,
  num as finite,
  stateText,
  summarizeReport,
  tone,
} from './org-reports-model.js';

/* ── The printable document ─────────────────────────────────────────────── */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function rosterLine(roster, role) {
  const names = (roster || []).filter((m) => m.role === role && m.name).map((m) => m.name);
  return names.length ? names.join(', ') : null;
}

/**
 * The printable report: one self-contained, light HTML document, loading
 * nothing from third parties (fonts and the logo from the app's own origin).
 * The print dialog opens only from the button. `screen: false` leaves the
 * on-screen bar out (the page's preview).
 *
 * @param {{ title, period_label, created_at, payload }} report
 * @param {{ origin?: string, nonce?: string, screen?: boolean, sample?: boolean, authorName?: string|null }} opts
 */
export function renderPrintableHtml(report, opts = {}) {
  const { origin = '', nonce = '', screen = true, sample = false, authorName = null } = opts;
  const s = summarizeReport(report, null);
  const p = report?.payload || {};
  const author = s.author || authorName;
  const sectors = p.attribution?.bySector || [];
  const pitches = p.topPitches || [];
  const roster = p.roster || [];
  const c = s.comparison;
  const sym = esc(s.symbol);
  const cls = (v) => {
    const t = tone(v);
    return t ? ` ${t}` : '';
  };
  const title = `${s.council || 'Student investment fund'} fund report, ${s.period}`;
  const nonceAttr = /^[A-Za-z0-9+/=]{8,}$/.test(nonce) ? ` nonce="${nonce}"` : '';

  const sectorTotalW = sectors.reduce((a, x) => a + (finite(x.weight_pct) ?? 0), 0);
  const sectorRows = sectors
    .map(
      (x) =>
        `<tr><td>${esc(x.sector)}</td><td class="m r">${fmtWeight(x.weight_pct)}</td><td class="m r${cls(
          x.contribution_pct,
        )}">${fmtPct(x.contribution_pct)}</td></tr>`,
    )
    .join('');
  const pitchRows = pitches
    .map(
      (t) =>
        `<tr><td class="m b">${esc(t.ticker || NA)}</td>${
          s.includeNames === false ? '' : `<td>${esc(t.analyst || NA)}</td>`
        }<td class="m r${cls(t.return_pct)}">${fmtPct(t.return_pct)}</td><td class="m r${cls(
          t.alpha_pct,
        )}">${fmtPts(t.alpha_pct)}</td><td>${esc(stateText(t.current_state))}</td></tr>`,
    )
    .join('');

  const windowText = c
    ? `${fmtDay(c.start)} to ${fmtDay(c.end)}`
    : s.firstRecorded
      ? `${fmtDay(s.firstRecorded)} (first holding recorded) to ${fmtDay(s.createdAt)}`
      : `to ${fmtDay(s.createdAt)}`;

  const benchmarkCell = c
    ? fmtPct(c.benchmarkPct)
    : s.legacy && s.legacyBenchmarkPct != null
      ? fmtPct(s.legacyBenchmarkPct)
      : NA;

  const perfRows = [
    ['Gain on cost of current holdings, not time-weighted', fmtPct(s.gainPct), s.gainPct],
    [
      c
        ? `Current holdings over the compared dates (${c.matched} of ${c.total} holdings)`
        : 'Current holdings over the compared dates',
      c ? fmtPct(c.fundPct) : NA,
      c ? c.fundPct : null,
    ],
    [
      s.legacy
        ? `${sym} price change, from the first fund record (earlier method)`
        : `${sym} price change over the same dates and weights`,
      benchmarkCell,
      null,
    ],
    ['Difference to benchmark, same dates', c ? fmtPts(c.differencePts) : NA, c?.differencePts],
    ['Compared dates', esc(windowText), null],
  ]
    .map(([k, v, n]) => `<tr><td>${k}</td><td class="m r${n == null ? '' : cls(n)}">${v}</td></tr>`)
    .join('');

  const pmLine = rosterLine(roster, 'portfolio_manager');
  const exLine = rosterLine(roster, 'executive');
  const anLine = rosterLine(roster, 'analyst');
  const rosterHtml =
    s.includeRoster === false
      ? '<p class="mut">Roster left out of this report.</p>'
      : roster.length === 0
        ? '<p class="mut">No roster recorded.</p>'
        : [
            exLine ? `<p><span class="k">Executives</span> ${esc(exLine)}</p>` : '',
            pmLine ? `<p><span class="k">Portfolio managers</span> ${esc(pmLine)}</p>` : '',
            anLine ? `<p><span class="k">Analysts</span> ${esc(anLine)}</p>` : '',
          ].join('');

  const unpricedNote =
    s.unpricedCount == null
      ? ''
      : s.unpricedCount === 0
        ? ' Every holding was priced.'
        : ` ${s.unpricedCount} unpriced ${s.unpricedCount === 1 ? 'holding is' : 'holdings are'} valued at cost.`;

  const font = (file, weight, fmt = 'woff2') =>
    `@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:${weight};font-display:swap;src:url('${origin}/fonts/site/${file}') format('${fmt}')}`;

  /* The document is light only and stands alone, so it carries its own
     palette. These are the light theme's values (theme-variables.css). */
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title>
<style>
${font('plus-jakarta-sans-latin-wght-normal.woff2', '200 800', 'woff2-variations')}
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:500;font-display:swap;src:url('${origin}/fonts/site/jetbrains-mono-latin-500-normal.woff2') format('woff2')}
@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:700;font-display:swap;src:url('${origin}/fonts/site/jetbrains-mono-latin-700-normal.woff2') format('woff2')}
:root{--ink:#0f172a;--ink2:#1e293b;--mut:#64748b;--line:#e2e8f0;--pos:#047857;--neg:#dc2626;--em:#059669}
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:var(--ink);font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:13px;line-height:1.5}
.page{max-width:820px;margin:0 auto;padding:48px 56px 56px}
.m{font-family:'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:0}
.r{text-align:right}.b{font-weight:700}.pos{color:var(--pos)}.neg{color:var(--neg)}.mut{color:var(--mut);margin:0}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px}
.brand img{height:26px;width:auto}
.council{font-weight:600;color:var(--ink2)}
h1{font-size:26px;font-weight:700;letter-spacing:-.015em;line-height:1.2;margin:24px 0 6px}
.meta{color:var(--mut);font-size:12px;display:flex;flex-wrap:wrap;gap:4px 18px}
.sample{color:var(--mut);font-size:12px;margin:8px 0 0}
h2{font-size:15px;font-weight:700;margin:28px 0 10px;color:var(--ink)}
.sum{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.sum div{padding:10px 12px;border-left:1px solid var(--line);min-width:0}
.sum div:first-child{border-left:0;padding-left:0}
.sum .l{display:block;color:var(--mut);font-size:11px}
.sum .v{display:block;font-size:16px;font-weight:700;margin-top:2px;white-space:nowrap}
.cap{color:var(--mut);font-size:11px;margin:8px 0 0}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);padding:6px 8px 6px 0;border-bottom:1px solid var(--line)}
th.r{padding-right:0;padding-left:8px}
td{padding:7px 8px 7px 0;border-bottom:1px solid var(--line);vertical-align:top}
td.r{padding-right:0;padding-left:8px;white-space:nowrap}
th.r+th:not(.r),td.r+td:not(.r){padding-left:16px}
.roster p{margin:0 0 4px}.roster .k{color:var(--mut);margin-right:6px}
.disc{margin:0;color:var(--ink2)}
.foot{margin-top:32px;padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:16px;color:var(--mut);font-size:11px}
.bar{position:sticky;top:0;display:flex;justify-content:center;align-items:center;gap:16px;padding:10px 16px;background:#fff;border-bottom:1px solid var(--line);font-size:13px;color:var(--ink2)}
.bar button{font:inherit;font-weight:600;height:32px;padding:0 14px;border:0;border-radius:8px;background:var(--em);color:#fff;cursor:pointer}
@media print{.bar{display:none!important}.page{padding:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}tr,.sum{break-inside:avoid}}
@media (max-width:640px){.page{padding:28px 20px}.sum{grid-template-columns:repeat(2,minmax(0,1fr))}.sum div:nth-child(odd){border-left:0;padding-left:0}}
</style></head>
<body>
${
  screen
    ? `<div class="bar"><span>${
        sample ? 'Sample content. ' : ''
      }Use your browser's print dialog to print or save this report as a PDF.</span><button type="button" id="print">Print or save as PDF</button></div>`
    : ''
}
<div class="page">
  <div class="top">
    <div class="brand"><img src="${esc(origin)}/logo.png" alt="" />Ezana Finance</div>
    <div class="council">${esc(s.council || 'Student investment fund')}</div>
  </div>
  <h1>${esc(title)}</h1>
  <div class="meta"><span>Period: ${esc(s.period)}</span>${
    s.cohort ? `<span>Cohort: ${esc(s.cohort)}</span>` : ''
  }<span>Generated <span class="m">${fmtDay(s.createdAt)}</span>${
    author ? ` by ${esc(author)}` : ''
  }</span></div>
  ${sample ? '<p class="sample">Sample content. Names, figures and dates are invented.</p>' : ''}

  <h2>Fund summary</h2>
  <div class="sum">
    <div><span class="l">Fund value</span><span class="v m">${fmtMoney(s.fundValue)}</span></div>
    <div><span class="l">Gain on cost</span><span class="v m${cls(s.gainPct)}">${fmtPct(s.gainPct)}</span></div>
    <div><span class="l">${sym}, same dates</span><span class="v m">${benchmarkCell}</span></div>
    <div><span class="l">Difference</span><span class="v m${c ? cls(c.differencePts) : ''}">${
      c ? fmtPts(c.differencePts) : NA
    }</span></div>
    <div><span class="l">Positions</span><span class="v m">${s.positions ?? NA}</span></div>
  </div>
  <p class="cap">Fund value is shares times the latest stored price; no cash is recorded.${unpricedNote} ${
    s.legacy ? esc(LEGACY_NOTE) : `Compared dates: <span class="m">${esc(windowText)}</span>.`
  }</p>

  <h2>Performance versus benchmark</h2>
  <table><thead><tr><th>Measure</th><th class="r">Result</th></tr></thead><tbody>${perfRows}</tbody></table>

  <div>
    <div>
      <h2>Attribution by sector</h2>
      <table><thead><tr><th>Sector</th><th class="r">Weight</th><th class="r">Contribution</th></tr></thead><tbody>${
        sectorRows || '<tr><td colspan="3" class="mut">No sector data.</td></tr>'
      }${
        sectors.length
          ? `<tr><td class="b">Total</td><td class="m r b">${fmtWeight(sectorTotalW)}</td><td class="m r b${cls(
              s.gainPct,
            )}">${fmtPct(s.gainPct)}</td></tr>`
          : ''
      }</tbody></table>
      <p class="cap">Contribution is each sector's gain over the fund's total cost. Rows rounded.</p>
    </div>
    <div>
      <h2>Pitch outcomes</h2>
      <table><thead><tr><th>Ticker</th>${
        s.includeNames === false ? '' : '<th>Analyst</th>'
      }<th class="r">Return</th><th class="r">vs SPY</th><th>State</th></tr></thead><tbody>${
        pitchRows ||
        `<tr><td colspan="${s.includeNames === false ? 4 : 5}" class="mut">No pitch outcomes recorded yet.</td></tr>`
      }</tbody></table>
      <p class="cap">Accepted pitches with a follow-up outcome, sorted by difference to SPY over each pitch's own dates, from decision to last update. Not weighted by position size.</p>
    </div>
  </div>

  <h2>Roster</h2>
  <div class="roster">${rosterHtml}</div>

  <h2>Method and disclosure</h2>
  <p class="disc">${esc(DISCLOSURE)} ${
    s.legacy
      ? esc(LEGACY_NOTE)
      : `The benchmark comparison uses each current holding's closing price on the first trading day on or after it was recorded in Ezana and on the end date, and ${sym} on the same days, weighted by the holding's value on its start day. Gain on cost may include time before a holding was recorded.`
  }</p>

  <div class="foot"><span>Prepared in Ezana Finance by ${esc(
    s.council || 'the council',
  )}.</span><span>Generated <span class="m">${fmtDay(s.createdAt)}</span></span></div>
</div>
${
  screen
    ? `<script${nonceAttr}>document.getElementById('print').addEventListener('click',function(){window.print();});</script>`
    : ''
}
</body></html>`;
}

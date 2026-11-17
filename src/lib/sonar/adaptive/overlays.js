/**
 * Sonar adaptive research: the council overlays (Nov 2026).
 *
 *   D01 fund fit           a company against the fund's mandate and IPS rules
 *   D02 pitch diligence    where a pitch stands and what its file is missing
 *   D03 holdings           the fund's positions: concentration, overlap with a named company
 *                          or sector, and the dated events ahead for the largest positions
 *   D04 research library   council research the member may read on a subject
 *
 * These are not in the public executor table. They run only through runOverlay(), which
 * takes organization readers that were built for one verified member (org-deps.js). Without
 * them it returns null. A personal question never reaches this file: the router marks an
 * overlay runnable only when the question itself is about the reader's own fund, and the
 * route builds the readers only for an active member.
 *
 * What an overlay says about the IPS is a description of the rule as the fund recorded it.
 * Sonar does not place, stop or approve trades, and says so wherever a rule is shown.
 */
import { mandateChecks, fitFromChecks } from '@/lib/org-sonar/fund-fit';
import { earningsRecord } from './series-metrics';
import { selectComponents } from './layout-planner';
import { validateReport, REPORT_VERSION } from './schema';
import { SCENARIO_BY_ID } from './profiles';
import { day, step, sourceBook, num, NA, money, freshQuestions } from './kit';

const companyOf = (plan) => {
  const c = plan.entities.find((e) => e.type === 'company');
  return c?.ticker ? { symbol: c.ticker, name: c.label || c.ticker } : null;
};
const IPS_NOTE =
  'An IPS rule is shown as the fund recorded it. Sonar reports the rule and whether it is marked as blocking; it does not place, stop or approve trades.';
const dark = (plan, what) => ({
  built: {
    lead: {
      headline: `${what} not available right now`,
      text: 'Sonar reads this from your organization’s records. They could not be read, so nothing is shown and nothing is estimated in their place. Try again shortly.',
    },
    followups: { placeholder: 'Ask a follow-up…', related: [] },
  },
  sources: [],
  thread: {},
});
const CHECK_LABEL = {
  pass: 'Passes',
  warn: 'Flagged',
  fail: 'Outside',
  unknown: 'Could not be checked',
  info: 'For information',
};
const FIT_WORD = { fits: 'fits', partial: 'partly fits', outside: 'falls outside' };
const STAGE_LABEL = {
  idea: 'Idea',
  research_approved: 'Research approved',
  research_in_progress: 'Research in progress',
  pm_review: 'Portfolio manager review',
  committee_scheduled: 'Committee scheduled',
  committee_vote: 'Committee vote',
  decision: 'Decision',
};

/* ── D01: fund fit ──────────────────────────────────────────────────────── */

async function runFundFit(plan, org, _deps, now, telemetry) {
  const who = companyOf(plan);
  const fund = await step(telemetry, 'fund_context', 4000, () => org.fund());
  if (!fund) return dark(plan, 'Your fund’s mandate and IPS are');
  const sources = sourceBook();
  const src = sources.add({
    key: 'org:mandate',
    title: `${fund.fundName}: mandate and IPS rules`,
    publisher: 'Your organization’s fund configuration',
    date: now.toISOString().slice(0, 10),
    detail: 'Visible to members of your organization. Not a published source.',
    kind: 'dataset',
  });
  const rules = fund.ips || [];
  const ruleRows = rules.map((r, i) => ({
    id: `${i}-${r.type}`,
    cells: {
      rule: r.label || String(r.type).replace(/_/g, ' '),
      type: String(r.type).replace(/_/g, ' '),
      blocking: (r.value?.severity || 'warning') === 'block' ? 'Marked blocking' : 'Warning',
    },
  }));
  const rulesTable = ruleRows.length
    ? {
        title: 'IPS rules on record',
        note: IPS_NOTE,
        cites: [src],
        columns: [
          { key: 'rule', label: 'Rule' },
          { key: 'type', label: 'Type' },
          { key: 'blocking', label: 'Severity in the IPS' },
        ],
        rows: ruleRows,
      }
    : null;
  if (!who) {
    /* No company named: what the mandate and IPS say. */
    const headline = `${fund.fundName} has ${rules.length} active IPS ${rules.length === 1 ? 'rule' : 'rules'} on record`;
    const parts = [
      fund.style ? `Style: ${fund.style}.` : null,
      fund.horizon ? `Horizon: ${fund.horizon}.` : null,
      fund.benchmark ? `Benchmark: ${fund.benchmark}.` : null,
      fund.excludedSectors?.length ? `Excluded sectors: ${fund.excludedSectors.join(', ')}.` : null,
      'Name a company to check it against these.',
    ].filter(Boolean);
    return {
      built: {
        lead: { headline, text: parts.join(' '), cites: [src], computed: true },
        ...(rulesTable ? { policy_tracker: rulesTable } : {}),
        followups: {
          placeholder: 'Ask whether a company fits the fund…',
          related: freshQuestions(plan, ['Show me our organization positions.']),
        },
        limitations: { items: [IPS_NOTE] },
      },
      sources: sources.list,
      thread: { headline, summary: parts[0] || '' },
    };
  }
  const facts = (await step(telemetry, 'company_facts', 5000, () =>
    org.companyFacts(who.symbol),
  )) || {
    ticker: who.symbol,
    name: who.name,
  };
  const checks = mandateChecks(fund, facts);
  const fit = fitFromChecks(checks);
  const blocking = checks.filter((c) => c.blocking);
  const headline = `${who.name} ${FIT_WORD[fit]} ${fund.fundName}’s mandate on the checks Sonar can run`;
  const parts = [
    `${checks.length} ${checks.length === 1 ? 'check was' : 'checks were'} run against the mandate and the IPS: ${checks.filter((c) => c.status === 'pass').length} pass, ${checks.filter((c) => c.status === 'warn').length} flagged, ${checks.filter((c) => c.status === 'fail').length} outside, ${checks.filter((c) => c.status === 'unknown').length} could not be checked.`,
    blocking.length
      ? `${blocking.length} involve${blocking.length === 1 ? 's' : ''} a rule the IPS marks as blocking.`
      : null,
    'This compares recorded rules with public facts about the company. It is not an investment view, and it does not approve or prevent a trade.',
  ].filter(Boolean);
  const held = (fund.holdings || []).find((h) => h.ticker === who.symbol);
  return {
    built: {
      lead: { headline, text: parts.join(' '), cites: [src], computed: true },
      portfolio_attribution: {
        title: 'Mandate and IPS checks',
        note: `${facts.sector ? `Sector on record: ${facts.sector}. ` : 'The company’s sector could not be read. '}${held ? `The fund already holds ${who.symbol}${held.weightPct != null ? ` at ${held.weightPct.toFixed(1)}% of the book` : ''}.` : `The fund does not hold ${who.symbol}.`}`,
        cites: [src],
        columns: [
          { key: 'check', label: 'Check' },
          { key: 'result', label: 'Result' },
          { key: 'detail', label: 'Detail' },
          { key: 'blocking', label: 'IPS severity' },
        ],
        rows: checks.map((c) => ({
          id: c.id,
          cells: {
            check: c.label,
            result: CHECK_LABEL[c.status] || c.status,
            detail: c.detail,
            blocking: c.blocking ? 'Marked blocking' : 'Not blocking',
          },
        })),
      },
      ...(rulesTable ? { policy_tracker: rulesTable } : {}),
      followups: {
        placeholder: `Ask a follow-up about ${who.symbol} and the fund…`,
        related: freshQuestions(plan, [
          `Is ${who.symbol} expensive compared with its peers?`,
          `What are ${who.symbol}’s biggest risks?`,
          'Show me our organization positions.',
        ]),
      },
      limitations: {
        items: [
          IPS_NOTE,
          'Checks that need a fact Sonar could not read are reported as not checked, never as passed.',
          'This answer is from your organization’s records and is visible to you as a member. It is not saved to your personal research.',
        ],
      },
    },
    sources: sources.list,
    thread: { subject: who.name, ticker: who.symbol, headline, summary: parts[0] },
  };
}

/* ── D03: the fund's holdings ───────────────────────────────────────────── */

async function runHoldings(plan, org, deps, now, telemetry) {
  const fund = await step(telemetry, 'fund_context', 4000, () => org.fund());
  if (!fund) return dark(plan, 'Your fund’s positions are');
  const holdings = (fund.holdings || [])
    .filter((h) => h.ticker)
    .sort((a, b) => (b.weightPct ?? -1) - (a.weightPct ?? -1));
  const sources = sourceBook();
  const src = sources.add({
    key: 'org:positions',
    title: `${fund.fundName}: position book`,
    publisher: 'Your organization’s positions',
    date: now.toISOString().slice(0, 10),
    detail:
      'Active positions, valued at the stored price or at cost where unpriced. Visible to members of your organization.',
    kind: 'dataset',
  });
  if (!holdings.length)
    return {
      built: {
        lead: {
          headline: `${fund.fundName} has no active positions on record`,
          text: 'The position book is empty, so there is nothing to measure.',
          cites: [src],
        },
        followups: { placeholder: 'Ask whether a company fits the fund…', related: [] },
      },
      sources: sources.list,
      thread: {},
    };
  const weights = holdings.map((h) => h.weightPct).filter((w) => num(w) != null);
  const top = holdings[0];
  const top5 = weights.slice(0, 5).reduce((s, w) => s + w, 0);
  const hhi = weights.reduce((s, w) => s + (w / 100) ** 2, 0);
  const effective = hhi > 0 ? 1 / hhi : null;
  const bySector = new Map();
  for (const h of holdings)
    bySector.set(
      h.sector || 'Not recorded',
      (bySector.get(h.sector || 'Not recorded') || 0) + (h.weightPct || 0),
    );
  const sectors = [...bySector.entries()].sort((a, b) => b[1] - a[1]);
  /* A named company or sector: which positions it touches. Same ticker, or same sector. */
  const who = companyOf(plan);
  const facts =
    who && org.companyFacts
      ? await step(telemetry, 'company_facts', 5000, () => org.companyFacts(who.symbol))
      : null;
  const overlap = who
    ? holdings.filter(
        (h) =>
          h.ticker === who.symbol ||
          (facts?.sector && h.sector && h.sector.toLowerCase() === facts.sector.toLowerCase()),
      )
    : [];
  /* Dated events ahead for the five largest positions. */
  const watch = holdings.slice(0, 5);
  const next = deps.earnings
    ? await Promise.all(
        watch.map((h) =>
          step(telemetry, `earnings_${h.ticker}`, 5000, () => deps.earnings(h.ticker)),
        ),
      )
    : [];
  const events = watch
    .map((h, i) => ({ ticker: h.ticker, rec: next[i] ? earningsRecord(next[i], now) : null }))
    .filter((e) => e.rec?.next)
    .sort((a, b) => a.rec.next.date.localeCompare(b.rec.next.date));
  const headline = who
    ? overlap.length
      ? `${overlap.length} of ${fund.fundName}’s ${holdings.length} positions ${overlap.length === 1 ? 'shares' : 'share'} ${who.name}’s ${facts?.sector ? 'sector or ticker' : 'ticker'}`
      : `None of ${fund.fundName}’s ${holdings.length} positions shares ${who.name}’s ${facts?.sector ? 'sector or ticker' : 'ticker'}`
    : `${fund.fundName} holds ${holdings.length} positions; the largest is ${top.ticker}${top.weightPct != null ? ` at ${top.weightPct.toFixed(1)}%` : ''}`;
  const parts = [
    weights.length
      ? `The five largest positions are ${top5.toFixed(1)}% of the book${effective ? `, which is as concentrated as ${effective.toFixed(1)} equally weighted positions` : ''}.`
      : 'Position values are not on record, so no weights are shown.',
    sectors[0] && sectors[0][0] !== 'Not recorded'
      ? `The largest sector is ${sectors[0][0]} at ${sectors[0][1].toFixed(1)}%.`
      : null,
    who && overlap.length
      ? `Together they are ${overlap.reduce((s, h) => s + (h.weightPct || 0), 0).toFixed(1)}% of the book. Sharing a sector is not the same as sharing a risk.`
      : null,
  ].filter(Boolean);
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    portfolio_attribution: {
      title: who ? 'Positions it touches, and the rest' : 'Positions',
      note: 'Weights are of the active book.',
      cites: [src],
      sortable: true,
      columns: [
        { key: 'ticker', label: 'Position' },
        { key: 'sector', label: 'Sector' },
        { key: 'weight', label: 'Weight', num: true },
        ...(who ? [{ key: 'overlap', label: `Overlap with ${who.symbol}` }] : []),
      ],
      rows: holdings.slice(0, 40).map((h) => ({
        id: h.ticker,
        emphasis: overlap.includes(h),
        cells: {
          ticker: h.ticker,
          sector: h.sector || 'Not recorded',
          weight: h.weightPct == null ? NA : `${h.weightPct.toFixed(1)}%`,
          ...(who
            ? {
                overlap:
                  h.ticker === who.symbol
                    ? 'Same security'
                    : overlap.includes(h)
                      ? 'Same sector'
                      : 'None found',
              }
            : {}),
        },
        sort: {
          ticker: h.ticker,
          sector: h.sector || '',
          weight: h.weightPct ?? -1,
          overlap: overlap.includes(h) ? 1 : 0,
        },
      })),
    },
    followups: {
      placeholder: 'Ask a follow-up about the fund’s positions…',
      related: freshQuestions(plan, [
        `Does ${top.ticker} still fit our fund’s mandate?`,
        `What are ${top.ticker}’s biggest risks?`,
        `When does ${top.ticker} report earnings next?`,
      ]),
    },
    limitations: {
      items: [
        'Weights use the stored price for each position, or its cost where no price is stored. They are not live valuations.',
        'This answer is from your organization’s records and is visible to you as a member. It is not saved to your personal research.',
      ],
    },
  };
  if (weights.length >= 2)
    built.series_chart = {
      title: 'Weight of the largest positions',
      note: 'Percent of the active book.',
      kind: 'bar',
      format: 'percent',
      categories: holdings
        .slice(0, 10)
        .filter((h) => h.weightPct != null)
        .map((h) => h.ticker),
      series: [
        {
          name: 'Weight',
          values: holdings
            .slice(0, 10)
            .filter((h) => h.weightPct != null)
            .map((h) => h.weightPct),
        },
      ],
      cites: [src],
    };
  if (events.length) {
    const esrc = sources.add({
      key: 'org:earnings',
      title: 'Earnings calendar for the largest positions',
      publisher: 'Earnings calendar and analyst consensus',
      date: events[0].rec.next.date,
      detail: 'Calendar dates can be estimates until a company confirms them.',
      kind: 'dataset',
    });
    built.catalyst_calendar = {
      title: 'Dated events ahead for the largest positions',
      note: 'Earnings dates from the calendar, not confirmed by the companies.',
      cites: [esrc],
      columns: [
        { key: 'date', label: 'Expected date' },
        { key: 'ticker', label: 'Position' },
        { key: 'event', label: 'Event' },
      ],
      rows: events.map((e) => ({
        id: e.ticker,
        cells: { date: day(e.rec.next.date), ticker: e.ticker, event: 'Earnings report' },
      })),
    };
  }
  return {
    built,
    sources: sources.list,
    thread: {
      headline,
      summary: parts[0],
      ticker: who?.symbol || null,
      subject: who?.name || null,
    },
  };
}

/* ── D02: pitch diligence ───────────────────────────────────────────────── */

async function runPitch(plan, org, _deps, now, telemetry) {
  const who = companyOf(plan);
  const pitches = await step(telemetry, 'org_pitches', 5000, () =>
    org.pitches({ ticker: who?.symbol || null }),
  );
  if (pitches === null) return dark(plan, 'Your organization’s pitches are');
  const sources = sourceBook();
  const src = sources.add({
    key: 'org:pitches',
    title: 'Pitch pipeline',
    publisher: 'Your organization’s pitches',
    date: now.toISOString().slice(0, 10),
    detail: 'Only pitches you have access to are read.',
    kind: 'dataset',
  });
  if (!pitches.length)
    return {
      built: {
        lead: {
          headline: who
            ? `No pitch for ${who.name} is visible to you`
            : 'No pitch is visible to you',
          text: 'Either none has been filed or none is shared with you. Sonar cannot tell which, and does not look past what you are allowed to see.',
          cites: [src],
        },
        followups: {
          placeholder: 'Ask about a company…',
          related: freshQuestions(
            plan,
            who
              ? [
                  `What are ${who.symbol}’s biggest risks?`,
                  `Is ${who.symbol} expensive compared with its peers?`,
                ]
              : [],
          ),
        },
      },
      sources: sources.list,
      thread: {},
    };
  const p = pitches[0];
  /* What the file is missing, read from its own fields. A checklist, not a judgement. */
  const gaps = who
    ? [
        !p.catalysts && {
          kicker: 'Open item',
          title: 'No catalysts are listed',
          text: 'The pitch names no event that would move the thesis. A committee will ask what is expected to change, and when.',
        },
        !p.risks && {
          kicker: 'Open item',
          title: 'No risks are listed',
          text: 'The pitch records no risk. The fundamentals answer lists the risks the company itself reports.',
        },
        p.targetPrice == null && {
          kicker: 'Open item',
          title: 'No target price is recorded',
          text: 'Without one the expected return cannot be checked against the valuation answer.',
        },
        !p.whyNow && {
          kicker: 'Open item',
          title: 'No "why now" is recorded',
          text: 'The pitch does not say what makes this the moment to act.',
        },
        !p.horizon && {
          kicker: 'Open item',
          title: 'No time horizon is recorded',
          text: 'The horizon decides which evidence matters and how the position would be judged.',
        },
      ].filter(Boolean)
    : [];
  const headline = who
    ? `The ${who.name} pitch is at ${STAGE_LABEL[p.stage]?.toLowerCase() || p.stage}${gaps.length ? `, with ${gaps.length} open ${gaps.length === 1 ? 'item' : 'items'} in its file` : ''}`
    : `${pitches.length} ${pitches.length === 1 ? 'pitch is' : 'pitches are'} visible to you`;
  const text = who
    ? `${p.thesis ? `Its thesis: ${String(p.thesis).slice(0, 240)} ` : ''}${p.targetPrice != null && p.priceAtSubmission ? `It records a target of ${money(p.targetPrice)} against ${money(p.priceAtSubmission)} at submission. ` : ''}The open items are read from the pitch’s own fields; they say what is not recorded, not whether the idea is good.`
    : 'Name a company to see where its pitch stands and what its file is missing.';
  const built = {
    lead: { headline, text, cites: [src], computed: true },
    portfolio_attribution: {
      title: who ? 'Pitches on this company' : 'Pitches visible to you',
      note: 'Most recently updated first.',
      cites: [src],
      columns: [
        { key: 'ticker', label: 'Company' },
        { key: 'type', label: 'Type' },
        { key: 'stage', label: 'Stage' },
        { key: 'status', label: 'Status' },
        { key: 'updated', label: 'Updated' },
      ],
      rows: pitches.slice(0, 15).map((x) => ({
        id: x.id,
        cells: {
          ticker: x.company ? `${x.company} (${x.ticker})` : x.ticker,
          type: x.type,
          stage: STAGE_LABEL[x.stage] || x.stage,
          status: x.status,
          updated: x.updatedAt ? day(x.updatedAt) : NA,
        },
      })),
    },
    followups: {
      placeholder: 'Ask a follow-up about this pitch…',
      related: freshQuestions(
        plan,
        who
          ? [
              `Does ${who.symbol} fit our fund’s mandate?`,
              `What are ${who.symbol}’s biggest risks?`,
              `Is ${who.symbol} expensive compared with its peers?`,
            ]
          : ['Show me our organization positions.'],
      ),
    },
    limitations: {
      items: [
        'Only pitches you have access to are read. A pitch that is not shared with you is not counted or described.',
        'This answer is from your organization’s records and is visible to you as a member. It is not saved to your personal research.',
      ],
    },
  };
  if (gaps.length)
    built.key_findings = {
      title: 'What the file does not record',
      label: 'Read from the pitch’s own fields.',
      items: gaps.map((g) => ({ ...g, note: 'Checklist item', cites: [src] })),
    };
  return {
    built,
    sources: sources.list,
    thread: { subject: who?.name || null, ticker: who?.symbol || null, headline, summary: text },
  };
}

/* ── D04: the research library ──────────────────────────────────────────── */

async function runLibrary(plan, org, _deps, now, telemetry) {
  const who = companyOf(plan);
  const subject = who?.name || null;
  const reports = await step(telemetry, 'org_reports', 5000, () =>
    org.reports({ ticker: who?.symbol || null, subject }),
  );
  if (reports === null) return dark(plan, 'Your organization’s research library is');
  const sources = sourceBook();
  const src = sources.add({
    key: 'org:reports',
    title: 'Council research library',
    publisher: 'Your organization’s research reports',
    date: now.toISOString().slice(0, 10),
    detail: 'Only reports you have access to are listed.',
    kind: 'dataset',
  });
  const headline = reports.length
    ? `${reports.length} council research ${reports.length === 1 ? 'report' : 'reports'} you can read ${who ? `cover${reports.length === 1 ? 's' : ''} ${who.name}` : 'are in the library'}`
    : who
      ? `No council research on ${who.name} is visible to you`
      : 'No council research is visible to you';
  const text = `${reports.length ? 'They are listed with their status and who can see them. ' : 'Either none exists or none is shared with you. '}Sonar does not attach research to a pitch, move it or change who can see it: that is done from the report itself, by someone with permission to do it.`;
  const built = {
    lead: { headline, text, cites: [src], computed: true },
    followups: {
      placeholder: 'Ask about a company…',
      related: freshQuestions(
        plan,
        who
          ? [
              `Does ${who.symbol} fit our fund’s mandate?`,
              `What are ${who.symbol}’s biggest risks?`,
            ]
          : ['Show me our organization positions.'],
      ),
    },
    limitations: {
      items: [
        'Only reports you have access to are listed. A report that is private to someone else, or shared with a desk you are not on, is not counted or described.',
        'This answer is from your organization’s records and is visible to you as a member. It is not saved to your personal research.',
      ],
    },
  };
  if (reports.length)
    built.portfolio_attribution = {
      title: 'Reports you can read',
      note: 'Most recently updated first.',
      cites: [src],
      columns: [
        { key: 'title', label: 'Report' },
        { key: 'kind', label: 'Kind' },
        { key: 'status', label: 'Status' },
        { key: 'visibility', label: 'Visible to' },
        { key: 'updated', label: 'Updated' },
      ],
      rows: reports.map((r) => ({
        id: r.id,
        cells: {
          title: r.ticker ? `${r.title} (${r.ticker})` : r.title,
          kind: String(r.kind).replace(/_/g, ' '),
          status: r.status,
          visibility: r.visibility,
          updated: r.updatedAt ? day(r.updatedAt) : NA,
        },
      })),
    };
  return {
    built,
    sources: sources.list,
    thread: { subject, ticker: who?.symbol || null, headline, summary: text },
  };
}

const OVERLAYS = { D01: runFundFit, D02: runPitch, D03: runHoldings, D04: runLibrary };

/** Is this plan an overlay question, runnable for a member? */
export const isOverlayPlan = (plan) =>
  Boolean(plan?.primaryScenario && OVERLAYS[plan.primaryScenario] && !plan.needsDisambiguation);

/**
 * Run a council overlay for one verified member.
 * @param {object} plan  planAdaptive() output whose primary scenario is an overlay
 * @param {{ orgId: string, deps: object } | null} org  resolveOrgContext() output
 * @param {object} deps  the public readers the overlay may also use (earnings)
 * @returns {Promise<null | object>} a validated report flagged `org`, or null
 */
export async function runOverlay(plan, org, deps = {}, { now = new Date(), onStep = null } = {}) {
  const run = isOverlayPlan(plan) ? OVERLAYS[plan.primaryScenario] : null;
  if (!run || !org?.orgId || !org.deps) return null;
  const t0 = Date.now();
  const telemetry = { steps: [], degraded: [], model: [] };
  if (typeof onStep === 'function') Object.defineProperty(telemetry, 'onStep', { value: onStep });
  const out = await run(plan, org.deps, deps, now, telemetry);
  if (!out?.built?.lead) return null;
  const { sections, omitted } = selectComponents(plan, {
    ...out.built,
    sources: { title: 'Evidence and sources' },
  });
  const profile = SCENARIO_BY_ID[plan.primaryScenario];
  const checked = validateReport({
    version: REPORT_VERSION,
    scenario: { id: profile.id, key: profile.key, label: profile.label },
    question: plan.originalQuestion,
    resolvedQuestion: plan.resolvedQuestion,
    asOf: now.toISOString(),
    /* Marks the answer as organization research: the page does not offer to save it to
       personal research, and the snapshot rules strip this key if it ever reaches one. */
    org: true,
    controls: null,
    sections,
    sources: out.sources,
    thread: { question: plan.resolvedQuestion, ...out.thread },
    plan: {
      version: plan.version,
      primaryScenario: plan.primaryScenario,
      supportingScenarios: [],
      specialists: plan.specialistAssignments,
      requiredEvidence: plan.requiredEvidence,
      computations: plan.requiredComputations,
      uncertainty: plan.uncertainty,
      confidence: plan.confidence,
    },
  });
  if (!checked.ok) return null;
  checked.report.telemetry = {
    ms: Date.now() - t0,
    steps: telemetry.steps,
    degraded: [...new Set(telemetry.degraded)],
    omitted,
    removed: checked.removed,
    model: [],
    markets: null,
  };
  return checked.report;
}

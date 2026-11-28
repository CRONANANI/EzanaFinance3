/**
 * Sonar 6.5: research requirements and objective fulfillment (Nov 28 2026).
 *
 * extractRequirements(question)
 *   Reads the question into structured requirements, deterministically: the universe, every
 *   condition, the ranking and what the answer must contain. Each condition is resolved to
 *   the measure Sonar can actually compute (lib/sonar/composer/screen.js SCREEN_MEASURES),
 *   and the resolution says how close that measure is to what was asked:
 *     exact     the measure is what the question names
 *     proxy     a stated stand-in ("traded" read as disclosed purchases; "accumulation" read
 *               as more comparable 13F managers holding)
 *     unsupported / unavailable   kept in the plan with the reason, never dropped
 *   Phrases that sound alike but measure different things are kept apart: "more managers
 *   holding" (breadth), "institutional accumulation" (shares or value, not computed here),
 *   "increasing 13F ownership" (read as breadth, labelled proxy).
 *
 * evaluateObjective(requirements, screen)
 *   After execution, each requirement independently: satisfied, partially_satisfied,
 *   unsupported, unavailable, not_executed or failed, with the reason. The objective is
 *   complete only when every requirement is satisfied; fluent narrative cannot hide an
 *   unexecuted condition.
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */

export const REQUIREMENT_STATUSES = [
  'satisfied',
  'partially_satisfied',
  'unsupported',
  'unavailable',
  'not_executed',
  'failed',
];

const SECTORS = [
  [/\bsemiconductors?\b|\bchip ?makers?\b/i, 'semiconductors'],
  [
    /\bdefen[cs]e (?:companies|contractors|stocks|firms)\b|\bdefen[cs]e\b(?= .*\b(companies|contractors)\b)/i,
    'defense',
  ],
  [/\benergy (?:companies|stocks)\b/i, 'energy'],
  [/\bbanks?\b/i, 'banks'],
];

const pctOf = (m) => (m ? Number(m[1]) : null);

/**
 * Condition rules, most specific first. Each yields { id, metric, op, value?, resolution,
 * note?, source }. `metric: null` marks a condition no executor computes.
 */
const RULES = [
  /* Congressional activity. The data counts disclosed purchases by members. */
  {
    re: /\b(?:bought|purchased|buying|purchases?)\b[^.]{0,40}\b(?:members? of congress|congress(?:ional)?|senators?|lawmakers|politicians)\b|\b(?:members? of congress|congress|senators?|lawmakers|politicians)\b[^.]{0,30}\b(?:bought|purchased|buying|buy)\b|\bcongressional (?:purchases|buying)\b/i,
    make: () => ({
      id: 'congress',
      metric: 'congress_holders',
      op: 'exists',
      resolution: 'exact',
      source: 'congress',
      label: 'Bought by members of Congress',
    }),
  },
  {
    re: /\b(?:traded|trading|trades)\b[^.]{0,40}\b(?:members? of congress|congress(?:ional)?|senators?|lawmakers|politicians)\b|\bcongressional (?:trading|activity|trades)\b|\b(?:members? of congress|congress)\b[^.]{0,30}\btrad(?:ed|ing)\b/i,
    make: () => ({
      id: 'congress',
      metric: 'congress_holders',
      op: 'exists',
      resolution: 'proxy',
      source: 'congress',
      label: 'Traded by members of Congress',
      note: 'Read as disclosed purchases; congressional sales are not part of this screen measure.',
    }),
  },
  /* Federal contracts. Dated awards in the window when the question says new, recent or in
     the same period; otherwise the latest complete fiscal year. An agency (DoD) is stated
     but not filtered by the screen measure: kept as its own requirement. */
  {
    re: /\b(?:new|recent|receiving new|won new|signed)\b[^.]{0,30}\b(?:federal |government |dod |defen[cs]e department |department of defen[cs]e )?(?:contracts?|awards?)\b|\b(?:contracts?|awards?)\b[^.]{0,30}\bsame period\b/i,
    make: () => ({
      id: 'contracts',
      metric: 'gov_contract_value_window',
      op: 'exists',
      resolution: 'exact',
      source: 'contracts_window',
      label: 'New federal awards in the window',
    }),
  },
  {
    re: /\b(?:growing|increasing|rising)\b[^.]{0,20}\b(?:federal )?(?:award|contract)s? exposure\b|\b(?:federal |government )?(?:award|contract) (?:exposure|obligations) (?:grew|rose|increased|growing)\b/i,
    make: () => ({
      id: 'contracts_growth',
      metric: null,
      op: '>',
      value: 0,
      resolution: 'unsupported',
      source: 'contracts',
      label: 'Growing federal award exposure',
      note: 'Year-over-year change in award obligations is not a screen measure yet.',
    }),
  },
  {
    re: /\b(?:significant|large|major|substantial)?\s*(?:federal|government|dod|defen[cs]e department|department of defen[cs]e|pentagon) (?:contracts?|awards?)\b|\bcontract exposure\b|\bfederal (?:contractors?|awards?)\b/i,
    skipIf:
      /\b(?:growing|increasing|rising)\b[^.]{0,20}\b(?:federal )?(?:award|contract)s? exposure\b/i,
    make: (q) => {
      const over = q.match(
        /(?:contracts?|awards?|exposure)[^.]{0,20}(?:above|over|more than|greater than)\s*\$?([\d.]+)\s*(million|billion|m|bn|b)\b/i,
      );
      const value = over ? Number(over[1]) * (/^b/i.test(over[2]) ? 1e9 : 1e6) : null;
      const vague = /\b(?:significant|large|major|substantial)\b/i.test(q) && value == null;
      return {
        id: 'contracts',
        metric: 'gov_contract_value',
        op: value != null ? '>' : 'exists',
        ...(value != null ? { value } : {}),
        resolution: vague ? 'proxy' : 'exact',
        source: 'contracts',
        label:
          value != null
            ? `Federal awards above $${value.toLocaleString('en-US')}`
            : 'Federal contract awards (latest complete fiscal year)',
        note: vague
          ? '"Significant" has no stated amount; read as any award in the latest complete federal fiscal year.'
          : undefined,
      };
    },
  },
  /* Institutional ownership. Breadth change is computed; accumulation is not. */
  {
    re: /\b(?:increased|increasing|rising|rose|more)\b[^.]{0,20}\binstitutional selling\b|\binstitutional selling (?:rose|increased|grew)\b|\b(?:fewer|declining|falling)\b[^.]{0,20}\b(?:13f |institutional )?(?:managers|holders|ownership|participation)\b/i,
    make: () => ({
      id: 'institutional',
      metric: 'institutional_breadth_change',
      op: '<',
      value: 0,
      resolution: 'proxy',
      source: 'holders13f_change',
      label: 'Institutional selling increased',
      note: 'Read as fewer comparable 13F managers holding the security, quarter over quarter; share-level selling is not computed.',
    }),
  },
  {
    re: /\binstitutional accumulation\b|\binstitutions? (?:accumulat|added shares|bought more)\w*/i,
    make: () => ({
      id: 'institutional',
      metric: 'institutional_breadth_change',
      op: '>',
      value: 0,
      resolution: 'proxy',
      source: 'holders13f_change',
      label: 'Institutional accumulation',
      note: 'Accumulation (more shares or value held) is not computed; read as more comparable 13F managers holding, which is a different measure.',
    }),
  },
  {
    re: /\bmore (?:reporting |13f |institutional )?managers (?:holding|own)\w*/i,
    make: () => ({
      id: 'institutional',
      metric: 'institutional_breadth_change',
      op: '>',
      value: 0,
      resolution: 'exact',
      source: 'holders13f_change',
      label: 'More 13F managers holding',
    }),
  },
  {
    re: /\b(?:increas|ris|grow|rose|higher|up)\w*\b[^.]{0,25}\b(?:institutional|13f)\s+(?:ownership|participation|holders|interest|breadth)\b|\b(?:institutional|13f)\s+(?:ownership|participation|holders|interest)\b[^.]{0,15}\b(?:rose|increased|grew|growing|rising|up)\b/i,
    make: () => ({
      id: 'institutional',
      metric: 'institutional_breadth_change',
      op: '>',
      value: 0,
      resolution: 'proxy',
      source: 'holders13f_change',
      label: 'Increasing institutional ownership',
      note: 'Read as more comparable 13F managers holding (breadth), quarter over quarter; ownership share and value are not computed.',
    }),
  },
  /* Fundamentals. */
  {
    re: /\boperating margins? (?:above|over|greater than|of more than|>)\s*([\d.]+)\s*%/i,
    make: (q, m) => ({
      id: 'margin',
      metric: 'margin',
      op: '>',
      value: pctOf(m),
      resolution: 'exact',
      source: 'ratios',
      label: `Operating margin above ${pctOf(m)}%`,
    }),
  },
  {
    re: /\boperating margins? (?:below|under|less than|<)\s*([\d.]+)\s*%/i,
    make: (q, m) => ({
      id: 'margin',
      metric: 'margin',
      op: '<',
      value: pctOf(m),
      resolution: 'exact',
      source: 'ratios',
      label: `Operating margin below ${pctOf(m)}%`,
    }),
  },
  {
    re: /\b(?:declining|falling|lower|shrinking|decreasing|contracting) (?:operating )?margins?\b|\bmargins? (?:declined|fell|shrank|decreased|compressed)\b/i,
    make: () => ({
      id: 'margin_change',
      metric: 'margin_change',
      op: '<',
      value: 0,
      resolution: 'exact',
      source: 'ratios',
      label: 'Declining operating margin',
      note: 'Latest fiscal year against the prior year, each company on its own calendar.',
    }),
  },
  {
    re: /\brevenue growth (?:above|over|greater than|of more than|>)\s*([\d.]+)\s*%/i,
    make: (q, m) => ({
      id: 'revenue_growth',
      metric: 'revenue_growth',
      op: '>',
      value: pctOf(m),
      resolution: 'exact',
      source: 'ratios',
      label: `Revenue growth above ${pctOf(m)}%`,
    }),
  },
  {
    re: /\b(?:improving|growing|rising|increasing) revenue\b|\brevenue (?:grew|rose|increased|improving)\b/i,
    make: () => ({
      id: 'revenue_growth',
      metric: 'revenue_growth',
      op: '>',
      value: 0,
      resolution: 'exact',
      source: 'ratios',
      label: 'Revenue growing',
    }),
  },
  {
    re: /\b(?:high|heavy|elevated) debt\b|\bdebt exposure\b|\bhighly leveraged\b/i,
    make: () => ({
      id: 'debt',
      metric: 'debt',
      op: 'rank',
      resolution: 'exact',
      source: 'ratios',
      label: 'Debt exposure (debt to equity)',
      note: 'Measured as total debt over equity; no threshold was stated, so companies are ranked.',
    }),
  },
  {
    re: /\bsensitive to (?:higher )?(?:interest )?rates\b|\brate[- ]sensitiv\w+\b|\binterest[- ]rate (?:risk|sensitivity)\b/i,
    make: () => ({
      id: 'rate_sensitivity',
      metric: null,
      op: null,
      resolution: 'unsupported',
      source: null,
      label: 'Sensitivity to higher interest rates',
      note: 'A causal rate-sensitivity estimate is not computed; measured debt exposure is reported instead, labelled as exposure, not sensitivity.',
    }),
  },
];

const AGENCY = /\b(?:dod|department of defen[cs]e|defen[cs]e department|pentagon)\b/i;

/** -> { universe, conditions, ranking, outputs, requirements } */
export function extractRequirements(question, { orgContext = null } = {}) {
  const q = String(question || '');
  const conditions = [];
  const seen = new Set();
  for (const r of RULES) {
    const m = q.match(r.re);
    if (!m || (r.skipIf && r.skipIf.test(q))) continue;
    const c = r.make(q, m);
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    conditions.push(c);
  }
  /* "operating margins above 25%" and "declining margins" are both margin conditions. */
  let universe = { kind: 'unspecified' };
  if (
    /\b(?:our|the council'?s?|the fund'?s?) (?:holdings|positions|fund|portfolio)\b|\bpositions in our\b|\bour (?:council|fund|club|org(?:anization)?)(?:'s)? (?:holdings|positions|portfolio|fund)\b/i.test(
      q,
    )
  )
    universe = orgContext?.orgId
      ? { kind: 'org_holdings', orgId: orgContext.orgId }
      : { kind: 'org_holdings', orgId: null };
  else {
    const s = SECTORS.find(([re]) => re.test(q));
    if (s) universe = { kind: 'sector', id: s[1] };
  }
  const agency =
    AGENCY.test(q) && conditions.some((c) => c.source?.startsWith('contracts'))
      ? {
          id: 'agency',
          metric: null,
          op: 'equals',
          value: 'DOD',
          resolution: 'unsupported',
          source: 'contracts',
          label: 'Awards from the Department of Defense',
          note: 'The screen measure counts awards from every agency; an agency filter is not applied.',
        }
      : null;
  if (agency) conditions.push(agency);
  const rankBy = q.match(
    /\brank(?:ed)?\b[^.]*\bby ([a-z0-9 /-]+?)(?:\s+relative to\s+([a-z ]+))?(?:[.?]|$| and )/i,
  );
  let ranking = null;
  if (rankBy) {
    const what = rankBy[1].toLowerCase();
    if (/contract|award/.test(what) && rankBy[2] && /revenue/.test(rankBy[2]))
      ranking = {
        measure: 'contracts_to_revenue',
        resolution: 'proxy',
        label: 'Federal award obligations relative to filed revenue',
        note: 'An exposure proxy: obligations in a federal fiscal year over the company’s filed revenue for the overlapping fiscal year; not the share of revenue from government.',
      };
    else if (/revenue growth/.test(what))
      ranking = { measure: 'revenue_growth', resolution: 'exact', label: 'Revenue growth' };
    else if (/margin/.test(what))
      ranking = { measure: 'margin', resolution: 'exact', label: 'Operating margin' };
    else if (/contract|award/.test(what))
      ranking = { measure: 'gov_contract_value', resolution: 'exact', label: 'Federal awards' };
    else ranking = { measure: null, resolution: 'unsupported', label: what };
  }
  const requirements = [
    {
      id: 'universe',
      kind: 'universe',
      label:
        universe.kind === 'sector'
          ? `Universe: ${universe.id}`
          : universe.kind === 'org_holdings'
            ? 'Universe: the council fund'
            : 'Universe: from the first condition that can list companies',
      universe,
    },
    ...conditions.map((c) => ({ id: `condition:${c.id}`, kind: 'condition', ...c })),
    ...(ranking ? [{ id: 'ranking', kind: 'ranking', ...ranking }] : []),
  ];
  return {
    universe,
    conditions,
    ranking,
    outputs: ['qualified_companies', 'per_condition_status'],
    requirements,
  };
}

/** Screen filters for the computable conditions (the composer attachment's params.filters). */
export function screenFilters(conditions = []) {
  return conditions
    .filter((c) => c.metric && c.op && c.op !== 'rank' && c.resolution !== 'unsupported')
    .map((c) => ({
      metric: c.metric,
      op: c.op,
      ...(c.value != null ? { value: c.value } : {}),
      unit: c.metric === 'margin' || c.metric === 'revenue_growth' ? 'pct' : null,
    }));
}

/**
 * Evaluate requirements against an executed screen (runScreen result with `conditionReport`)
 * or against no execution at all.
 * -> { objectiveStatus, requirements: [{ id, label, status, reason }] }
 */
export function evaluateObjective(reqs, screen = null) {
  const out = [];
  const report = screen?.conditionReport || null;
  const stepFor = (src) =>
    (screen?.steps || []).find((s) => s.source === src || s.stepId === `read:${src}`);
  for (const r of reqs?.requirements || []) {
    if (r.kind === 'universe') {
      if (r.universe.kind === 'org_holdings' && !r.universe.orgId)
        out.push({
          id: r.id,
          label: r.label,
          status: 'unavailable',
          reason: 'permission_denied: council holdings need an authorized organization context',
        });
      else if (!screen)
        out.push({ id: r.id, label: r.label, status: 'not_executed', reason: 'no screen ran' });
      else
        out.push({
          id: r.id,
          label: r.label,
          status: screen.coverage?.status === 'bounded' ? 'partially_satisfied' : 'satisfied',
          reason:
            screen.coverage?.status === 'bounded'
              ? `bounded: ${screen.coverage.unchecked} companies not checked`
              : null,
        });
      continue;
    }
    if (r.kind === 'ranking') {
      if (r.resolution === 'unsupported' || !r.measure)
        out.push({
          id: r.id,
          label: r.label,
          status: 'unsupported',
          reason: `ranking by ${r.label} is not computed`,
        });
      else if (!screen)
        out.push({ id: r.id, label: r.label, status: 'not_executed', reason: 'no screen ran' });
      else
        out.push({
          id: r.id,
          label: r.label,
          status:
            screen.rankBy && screen.rankBy === r.measure
              ? r.resolution === 'proxy'
                ? 'partially_satisfied'
                : 'satisfied'
              : 'not_executed',
          reason:
            screen.rankBy === r.measure
              ? r.note || null
              : `the screen ranked by ${screen.rankBy || 'nothing'}`,
        });
      continue;
    }
    if (r.resolution === 'unsupported' || !r.metric) {
      out.push({
        id: r.id,
        label: r.label,
        status: 'unsupported',
        reason: r.note || 'not computed',
      });
      continue;
    }
    if (!screen) {
      out.push({ id: r.id, label: r.label, status: 'not_executed', reason: 'no screen ran' });
      continue;
    }
    const cond = report?.conditions?.find((c) => c.metric === r.metric);
    if (!cond) {
      out.push({
        id: r.id,
        label: r.label,
        status: 'not_executed',
        reason: 'the plan did not include this condition',
      });
      continue;
    }
    const st = stepFor(cond.source);
    if (
      st &&
      [
        'provider_error',
        'permission_denied',
        'unavailable',
        'cancelled',
        'skipped_dependency',
      ].includes(st.status)
    ) {
      out.push({
        id: r.id,
        label: r.label,
        status:
          st.status === 'skipped_dependency' || st.status === 'cancelled'
            ? 'not_executed'
            : st.status === 'provider_error'
              ? 'failed'
              : 'unavailable',
        reason: `${st.status}: ${st.reason}`,
      });
      continue;
    }
    const unknownN = (report.matrix || []).filter((m) => m.cells?.[cond.id] === 'unknown').length;
    const partial =
      r.resolution === 'proxy' || unknownN > 0 || screen.coverage?.status === 'bounded';
    out.push({
      id: r.id,
      label: r.label,
      status: partial ? 'partially_satisfied' : 'satisfied',
      reason:
        [
          r.resolution === 'proxy' ? r.note : null,
          unknownN ? `${unknownN} companies without the data (unknown, not failed)` : null,
        ]
          .filter(Boolean)
          .join(' ') || null,
    });
  }
  const sts = out.map((x) => x.status);
  const objectiveStatus = !sts.length
    ? 'failed'
    : sts.every((s) => s === 'satisfied')
      ? 'complete'
      : sts.every((s) => s === 'failed' || s === 'not_executed')
        ? 'failed'
        : 'partial';
  return { objectiveStatus, requirements: out };
}

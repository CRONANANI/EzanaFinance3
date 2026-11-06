/**
 * Ezana Sonar analyst router: who leads, who supports, and what each must do.
 *
 * Inputs are the existing pipeline's outputs, not raw keywords:
 *   spec            buildResearchSpec() (domains with scores, objective, subject, format)
 *   classification  classifyResearchMode() (mode, operations)
 *   route           the macro router (themes, countries, currency, commodity)
 *   ctx             { orgId, available: Set<capabilityId> | null }
 *
 * Scoring (0..1): domain fit 0.40, theme fit 0.25, objective fit 0.15, operation fit 0.12,
 * subject fit 0.08. Then evidence: an analyst whose required capabilities are mostly
 * unavailable is dropped with a reason. Supporting analysts must add at least one required
 * capability the lead does not already bring (a distinct evidence requirement), so two
 * analysts never run to re-read the same data.
 *
 * Budgets: quick = lead skill only, no analyst calls; standard = lead + up to 2 supporting;
 * deep = lead + up to 3 supporting + red team. Every supporting analyst after the first needs
 * a score of 0.5 or more. The methodology auditor always runs (deterministic checks; model review in deep).
 *
 * Pure. Unit-tested in scripts/check-sonar-analysts.mjs.
 */
import { ANALYSTS, SPECIALIST_IDS } from './registry.js';

const W = { domain: 0.4, theme: 0.25, objective: 0.15, operation: 0.12, subject: 0.08 };
const SUPPORT_MIN = 0.3;
const PORTFOLIO_RE =
  /\b(our|my)\s+(fund|portfolio|holdings|positions|book)\b|\bportfolio\b.*\b(concentrat|exposure|risk|drawdown|diversif)/i;
/* "capture value", "create value" and "value chain" are strategy, not valuation (Nov 6). */
const VALUATION_RE =
  /\b(valu(ation|ed)|(?<!\b(?:captur(?:e|es|ing)|creat(?:e|es|ing)|add(?:s|ing)?|deliver(?:s|ing)?|unlock(?:s|ing)?|shareholder)\s)value(?!\s+chain)|worth|undervalued|overvalued|dcf|intrinsic|multiples?|p\/e|price target|cheap|expensive)\b/i;

export function scoreAnalyst(a, { spec = {}, classification = {}, route = {} } = {}) {
  const reasons = [];
  /* Domain fit: best weighted match over the spec's domains. */
  let domain = 0;
  for (const d of spec.domains || []) {
    const w = a.domains[d.id];
    if (w && d.score * w > domain) {
      domain = d.score * w;
      reasons.push(`domain ${d.id}`);
    }
  }
  const themes = new Set(route.themes || []);
  const themeHits = a.themes.filter((t) => themes.has(t));
  const secondaryHits = (a.secondaryThemes || []).filter((t) => themes.has(t));
  const theme = themeHits.length
    ? Math.min(1, 0.7 + 0.15 * themeHits.length)
    : secondaryHits.length
      ? 0.4
      : 0;
  if (themeHits.length) reasons.push(`theme ${themeHits.join(', ')}`);
  else if (secondaryHits.length) reasons.push(`related theme ${secondaryHits.join(', ')}`);

  const objectives = new Set(
    [
      spec.objective?.primary,
      ...(spec.objective?.secondary || []),
      ...(route.objectives || []),
    ].filter(Boolean),
  );
  const objective = a.objectives.some((o) => objectives.has(o)) ? 1 : 0;
  if (objective) reasons.push('objective');

  const ops = new Set(classification.operations || []);
  const opHits = a.operations.filter((o) => ops.has(o));
  const operation = opHits.length ? Math.min(1, 0.6 + 0.2 * opHits.length) : 0;
  if (opHits.length) reasons.push(`operations ${opHits.join(', ')}`);

  const kind = spec.subject?.kind || (route.countries?.length ? 'country' : null);
  const subject = kind && a.subjectKinds.includes(kind) ? 1 : 0;

  const score =
    W.domain * domain +
    W.theme * theme +
    W.objective * objective +
    W.operation * operation +
    W.subject * subject;
  return { id: a.id, score: Math.round(score * 1000) / 1000, reasons: [...new Set(reasons)] };
}

function evidenceFit(a, available) {
  if (!available) return { ok: true, missing: [] };
  const missing = a.required.filter((c) => !available.has(c));
  return { ok: missing.length <= Math.floor(a.required.length / 2), missing };
}

/** Objectives the router adds on top of the spec: valuation, and the user's own portfolio. */
export function routeObjectives(spec = {}, ctx = {}) {
  const q = `${spec.rawQuery || ''} ${spec.question || ''}`;
  const out = [];
  if (VALUATION_RE.test(q) && spec.subject?.kind === 'company') out.push('valuation');
  if (ctx.orgId && PORTFOLIO_RE.test(q)) out.push('assess_portfolio');
  return out;
}

/* An added objective names its owner: that analyst leads. */
const OBJECTIVE_OWNERS = { valuation: 'valuation', assess_portfolio: 'portfolio-analyst' };

/**
 * Returns { mode, lead, supporting, controls, skipped, assignments }.
 * assignments: [{ analyst, role: 'lead'|'supporting', task, capabilities }].
 */
export function routeAnalysts({ spec = {}, classification = {}, route = {}, ctx = {} } = {}) {
  const mode = classification.mode || 'standard';
  const routeWithObj = {
    ...route,
    objectives: [...(route.objectives || []), ...routeObjectives(spec, ctx)],
  };
  const skipped = [];
  const scored = [];
  for (const id of SPECIALIST_IDS) {
    const a = ANALYSTS[id];
    if (a.tenantOnly && !ctx.orgId) {
      skipped.push({ id, reason: 'organization context required' });
      continue;
    }
    const fit = evidenceFit(a, ctx.available || null);
    const s = scoreAnalyst(a, { spec, classification, route: routeWithObj });
    if (!fit.ok) {
      skipped.push({ id, reason: `required evidence unavailable: ${fit.missing.join(', ')}` });
      continue;
    }
    if (s.score > 0) scored.push({ ...s, missing: fit.missing });
  }
  scored.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
  /* Owned objectives: the valuation analyst leads "what is it worth"; the portfolio analyst
     leads questions about the organization's own fund. */
  for (const [objective, owner] of Object.entries(OBJECTIVE_OWNERS)) {
    if (!routeWithObj.objectives.includes(objective)) continue;
    const i = scored.findIndex((s) => s.id === owner);
    if (i > 0) scored.unshift(...scored.splice(i, 1));
  }
  /* A lead needs a topic signal (a domain, theme or operation), not only the generic objective
     and subject fit: otherwise the alphabetical tiebreak picked a lead for any question (Nov 6). */
  const owners = Object.entries(OBJECTIVE_OWNERS)
    .filter(([objective]) => routeWithObj.objectives.includes(objective))
    .map(([, owner]) => owner);
  const topical = (x) =>
    owners.includes(x.id) ||
    (x.reasons || []).some((r) => /^(domain|theme|related theme|operations) /.test(r));
  const lead = scored.find(topical) || null;
  if (lead && scored[0] !== lead) scored.unshift(...scored.splice(scored.indexOf(lead), 1));
  if (!lead)
    return {
      mode,
      lead: null,
      supporting: [],
      controls: controlsFor(mode),
      skipped,
      assignments: [],
    };

  const maxSupport = mode === 'deep' ? 3 : mode === 'standard' ? 2 : 0;
  const covered = new Set(ANALYSTS[lead.id].required);
  const supporting = [];
  for (const s of scored.slice(1)) {
    if (supporting.length >= maxSupport) break;
    if (s.score < SUPPORT_MIN) continue;
    const adds = ANALYSTS[s.id].required.filter((c) => !covered.has(c));
    if (!adds.length) {
      skipped.push({ id: s.id, reason: 'adds no distinct evidence beyond the lead' });
      continue;
    }
    /* Beyond the first supporting analyst, only strong fits join (score >= 0.5). */
    if (supporting.length >= 1 && s.score < 0.5) continue;
    supporting.push({ ...s, adds });
    adds.forEach((c) => covered.add(c));
  }

  const assignments = [
    {
      analyst: lead.id,
      role: 'lead',
      task: leadTask(lead.id, spec),
      capabilities: [...ANALYSTS[lead.id].required, ...ANALYSTS[lead.id].preferred],
    },
    ...supporting.map((s) => ({
      analyst: s.id,
      role: 'supporting',
      task: supportTask(s.id, spec),
      capabilities: s.adds.concat(
        ANALYSTS[s.id].preferred.filter((c) => !covered.has(c) || s.adds.includes(c)),
      ),
    })),
  ];
  return { mode, lead, supporting, controls: controlsFor(mode), skipped, assignments };
}

/* The red team runs in deep mode only (cost). Investment-decision questions in standard mode
   get the director's built-in counterevidence section instead. */
function controlsFor(mode) {
  if (mode === 'quick') return ['methodology-auditor'];
  const out = ['research-director', 'methodology-auditor'];
  if (mode === 'deep') out.push('red-team');
  return out;
}

const TASKS = {
  macroeconomist:
    'Diagnose growth, inflation and the policy stance: level, direction and acceleration, against own history.',
  'fx-strategist':
    'Quantify the currency move over 1M/3M/1Y/5Y (both conventions), real effective rate vs history, and the pressure components.',
  'sovereign-risk':
    'Assess external financing: current account, reserves (gross), external debt and debt dynamics; liquidity vs solvency.',
  'rates-strategist':
    'Assess the rate path and real rates, and what Ezana data can and cannot show about curves and spreads.',
  'equity-research':
    'Analyse reported financials, segments, margins, cash conversion and peers; separate demand from company value capture.',
  valuation:
    'Build engine-computed valuation ranges with sensitivities from justified, labelled assumptions.',
  'industry-analyst': 'Map market structure, concentration and value capture across listed peers.',
  'ownership-analyst':
    'Attribute quarter-over-quarter 13F changes among managers filing both quarters; concentration; insider and activist filings.',
  'contracts-analyst':
    'Measure federal contract exposure by fiscal year and agency; distinguish ceilings, obligations and revenue.',
  'lobbying-analyst':
    'Measure disclosed lobbying by client, issue and quarter; map to policy without inferring influence.',
  'congress-analyst':
    'Analyse disclosed trades with ranges, dates and committee context; no inference of motive.',
  'sanctions-analyst':
    'Screen entities and countries across OFAC, EU, UK, UN and export controls; direct vs indirect exposure.',
  'geopolitical-analyst':
    'Assess geopolitical and internal-order risk against history and the economic channels that matter here.',
  'commodities-analyst':
    'Assess prices, supply-demand balances and stocks; exporter vs importer effects.',
  'food-analyst': 'Assess local food prices, import dependency and pass-through to inflation.',
  'quant-analyst':
    'Run the engine statistics the question needs, with bias controls and uncertainty.',
  'portfolio-analyst':
    "Measure the fund's exposures, concentration and stress results against its mandate.",
  'prediction-analyst':
    'Read relevant markets: implied probabilities net of fees, liquidity and settlement terms.',
};
function leadTask(id, spec) {
  return `${TASKS[id] || 'Investigate the question.'} Answer: "${spec.question || spec.rawQuery || ''}".`;
}
function supportTask(id) {
  return `${TASKS[id] || 'Contribute evidence.'} Contribute only what the lead does not cover.`;
}

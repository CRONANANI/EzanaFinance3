/**
 * Per-axis scoring methodology for the head-to-head radar.
 *
 * Two explainer builders, one per mode:
 *  - `empireDimensionExplainer` — the 18 Dalio power dimensions. Steps mirror
 *    `public.country_dimension_scores` (migration 20260419120200) exactly; the
 *    contributing-metric weights are read from the live `metricSpecs` payload,
 *    never authored here, so DB seed changes propagate without a copy edit.
 *  - `oecdIndicatorExplainer` — the 20 curated Economic Outlook indicators,
 *    normalized client-side by `normalizeIndicator` in `@/lib/oecd-scales`.
 *
 * HONESTY RULES enforced here:
 *  - The 7 dimensions with only placeholder rows are labelled "source pending"
 *    and their candidate sources are described as under evaluation, not wired.
 *  - The 8% radial floor (`FLOOR` in OecdRadar) is disclosed — a country at the
 *    bottom of a scale still draws a visible vertex, and users must know that.
 *  - Proxy stacks (Cost Competitiveness, Military Strength) say so.
 */
import { PROJECTION_FROM_YEAR } from '@/lib/oecd-curated';

/** Shared, mode-level framing shown above the per-axis steps. */
export const SCORING_MODEL = {
  empire:
    'Every dimension is a weighted blend of raw World Bank series, normalized against the other countries in the 60-country catalog for the same year. A score is a position relative to peers, not an absolute level.',
  oecd: 'Each axis is one OECD Economic Outlook indicator, normalized against every other country reporting that indicator in the same vintage. The polygon shows relative position; the table beside it shows the actual published numbers.',
};

/** Radial floor disclosure — keep in sync with `FLOOR` in OecdRadar.jsx. */
export const RADIAL_FLOOR_PCT = 8;

/**
 * What each of the 18 power dimensions is trying to capture, plus a caveat line
 * where the current metric stack is a proxy rather than a direct measure.
 *
 * `pending` entries have only placeholder rows in `dimension_metric_map`, are
 * excluded from `country_dimension_scores`, and never become radar axes.
 */
export const DIMENSION_METHODOLOGY = {
  // ── Live (World Bank backbone) ────────────────────────────────────────────
  economic_output: {
    what: 'The absolute scale of what a country produces, plus how much of that reaches each person.',
    caveat:
      'Blends total output with per-capita output, so a large low-income economy and a small high-income one can land close together.',
  },
  expected_growth: {
    what: 'How fast real output is currently expanding.',
    caveat:
      'A single-year growth print, not a forecast — a country recovering from a contraction can score high on a weak base.',
  },
  debt_burden: {
    what: 'How heavily the state and the wider economy are leveraged.',
    caveat: 'Higher debt scores worse, so the underlying series are inverted before blending.',
  },
  trade: {
    what: 'Weight in world goods trade, and how much of the domestic economy is exposed to it.',
    caveat:
      'Combines an absolute export figure with a share-of-GDP ratio, so both large traders and highly open small economies score well.',
  },
  education: {
    what: 'The stock of human capital and the public investment maintaining it.',
    caveat: 'Enrollment and literacy measure participation, not attainment or quality.',
  },
  innovation_technology: {
    what: 'Research intensity, the size of the research workforce, and how technology-weighted exports are.',
    caveat: null,
  },
  infrastructure: {
    what: 'Baseline physical and digital connectivity available to the population.',
    caveat:
      'Universal-access metrics saturate — most advanced economies cluster at the top with little separation.',
  },
  military_strength: {
    what: 'Defence resourcing relative to the economy, plus personnel scale.',
    caveat:
      'A World Bank spending-and-headcount baseline. It does not measure capability, readiness, or force projection; SIPRI enrichment is not yet wired.',
  },
  wealth_gaps: {
    what: 'How unevenly income is distributed within the country.',
    caveat:
      'Built on the Gini index, which is reported irregularly — the observation year can lag the score year by several years.',
  },
  cost_competition: {
    what: 'Whether the country is a cost-competitive place to employ people and operate.',
    caveat:
      'A proxy stack. Labour participation and inflation control stand in for unit labour costs, which are not available on a harmonised basis across the full catalog.',
  },
  resource_efficiency: {
    what: 'How much energy and emissions it takes to generate a unit of output.',
    caveat:
      'Both inputs are inverted — lower energy and emissions intensity per unit of GDP score higher.',
  },

  // ── Source pending (placeholder rows only) ────────────────────────────────
  internal_conflict: {
    pending: true,
    what: 'Domestic political stability, unrest, and institutional strain.',
    caveat:
      'No source is wired yet. Candidate providers are still under evaluation, so this dimension is excluded from the chart rather than estimated.',
  },
  markets_financial_center: {
    pending: true,
    what: 'Depth of domestic capital markets and standing as a financial hub.',
    caveat:
      'No source is wired yet. Candidate providers are still under evaluation, so this dimension is excluded from the chart rather than estimated.',
  },
  reserve_currency: {
    pending: true,
    what: 'Share of the currency in global reserves, invoicing, and settlement.',
    caveat:
      'No source is wired yet. Candidate providers are still under evaluation, so this dimension is excluded from the chart rather than estimated.',
  },
  geology: {
    pending: true,
    what: 'Natural resource endowment and land-based advantages.',
    caveat:
      'No source is wired yet. Candidate providers are still under evaluation, so this dimension is excluded from the chart rather than estimated.',
  },
  character_social_contracts: {
    pending: true,
    what: 'Social trust, civic norms, and the durability of the social contract.',
    caveat:
      'No source is wired yet. Candidate providers are still under evaluation, so this dimension is excluded from the chart rather than estimated.',
  },
  rule_of_law: {
    pending: true,
    what: 'Contract enforcement, judicial independence, and corruption control.',
    caveat:
      'No source is wired yet. Candidate providers are still under evaluation, so this dimension is excluded from the chart rather than estimated.',
  },
  acts_of_nature: {
    pending: true,
    what: 'Exposure to climate, disaster, and other natural shocks.',
    caveat:
      'No source is wired yet. Candidate providers are still under evaluation, so this dimension is excluded from the chart rather than estimated.',
  },
};

function fmtWeight(w) {
  if (w == null) return '—';
  return Number.isInteger(w) ? `×${w}.0` : `×${w}`;
}

/**
 * Build the explainer payload for one EMPIRE dimension.
 *
 * @param {object} dim         live dim from `empireModel.liveDims`
 * @param {object|null} matrix `empireMatrixModel` (carries metricSpecs + metric catalog)
 * @returns {{ title, kind, status, what, caveat, steps, metrics, footnote }}
 */
export function empireDimensionExplainer(dim, matrix) {
  const copy = DIMENSION_METHODOLOGY[dim.id] || {};
  const mDim = matrix?.dimById?.get(dim.id) || null;
  const specs = mDim?.metricSpecs || [];

  const metrics = specs.map((s) => {
    const meta = matrix?.metrics?.[s.metricId] || {};
    // How many countries actually report this metric in the payload — the real
    // denominator of the min–max normalization the user is being shown.
    let reporting = 0;
    if (matrix?.metricValueMap) {
      for (const [, byMetric] of matrix.metricValueMap) {
        if (byMetric.get(s.metricId)?.value != null) reporting += 1;
      }
    }
    return {
      id: s.metricId,
      label: meta.label || s.metricId,
      unit: meta.unit || '',
      weight: fmtWeight(s.weight),
      direction: s.invert ? 'lower is stronger' : 'higher is stronger',
      inverted: !!s.invert,
      reporting,
    };
  });

  const steps = [
    'Pull the latest raw World Bank observation for each contributing metric, per country.',
    'Min–max normalize each metric to 0–100 against every country reporting it in the same year. If every country reports the same value, all receive 50.',
    'Flip the metrics marked "lower is stronger" so a higher normalized value always means better.',
    'Take the weighted mean across the contributing metrics using the weights below — that is the 0–100 dimension score.',
    `Draw the radius at score ÷ 100, with a ${RADIAL_FLOOR_PCT}% floor so a bottom-ranked country still shows a visible vertex.`,
  ];

  return {
    kind: 'empire',
    title: dim.name,
    status: dim.has_data === false || copy.pending ? 'pending' : 'live',
    scale: '0–100 score',
    what: copy.what || null,
    caveat: copy.caveat || null,
    steps: copy.pending ? null : steps,
    metrics: copy.pending ? [] : metrics,
    footnote: copy.pending
      ? 'Dimensions without a wired source are listed as pending and never estimated.'
      : `Source: World Bank Open Data, synced weekly. Score year ${matrix?.year ?? '—'}. Normalization is cross-country within a single year — never across years, which would distort the trend.`,
  };
}

/**
 * Build the explainer payload for one OECD indicator axis.
 *
 * @param {object} series  entry from OECD_CURATED_SERIES
 * @param {number|null} latestYear model.latestYearBySlug[slug]
 * @param {number} reporting count of non-aggregate countries with a value
 */
export function oecdIndicatorExplainer(series, latestYear, reporting) {
  const projected = latestYear != null && latestYear >= PROJECTION_FROM_YEAR;

  const steps = [
    `Take the latest published value per country for this indicator${
      latestYear != null ? ` (${latestYear} vintage)` : ''
    }.`,
    `Min–max normalize to 0–1 across the ${reporting || 0} countries reporting it. OECD-computed aggregates are excluded so a bloc figure can never set the scale.`,
    series.inv
      ? 'Invert, because lower is the better outcome on this indicator — outward on the radar always means stronger.'
      : 'Higher is the better outcome here, so no inversion is applied.',
    `Draw the radius at the normalized value, with a ${RADIAL_FLOOR_PCT}% floor so a bottom-ranked country still shows a visible vertex.`,
  ];

  return {
    kind: 'oecd',
    title: series.label,
    status: projected ? 'projected' : 'actual',
    scale: series.unitLabel,
    what: null,
    caveat: series.inv ? 'Lower raw values score higher on this axis.' : null,
    steps,
    metrics: [],
    footnote: `Source: OECD Economic Outlook (CC BY 4.0), series ${series.slug}.${
      projected
        ? ` Values from ${PROJECTION_FROM_YEAR} onward are OECD projections, not actuals.`
        : ''
    } The #n/N chip in the table is ranked on raw published values, direction-aware — it is not derived from the normalized radius.`,
  };
}

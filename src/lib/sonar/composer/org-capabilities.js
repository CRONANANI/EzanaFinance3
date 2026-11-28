/**
 * Research Composer: council capabilities (Sonar for organizations, Nov 28 2026).
 *
 * The same capability shape as the public registry (registry.js CAPABILITIES), kept in its
 * own map so a council capability can never appear in, or run from, a retail Composer: the
 * retail menu lists ANALYSES from registry.js only, and these run only through
 * /api/org/sonar/intelligence after the server resolves the caller's active membership.
 * An attachment uses the same object as any other ({ key, capability, kind: 'analysis',
 * origin, params }); validateOrgAttachment checks it.
 *
 * Every capability is read-only and deterministic (lib/org-sonar/intelligence/run.js).
 * None of them writes to council records; writes go through the confirmed action route.
 */

export const ORG_CAPABILITIES = {
  'org-portfolio-analysis': {
    key: 'org-portfolio-analysis',
    label: 'Council Portfolio Analysis',
    type: 'Council',
    icon: 'bi-pie-chart',
    summary:
      'Position weights, sector exposure, concentration and open flags from the council book.',
    scope: 'org',
    output: 'calculated',
    example: 'Which holdings drive the most concentration in our fund?',
  },
  'org-policy-observations': {
    key: 'org-policy-observations',
    label: 'Investment Policy Observations',
    type: 'Council',
    icon: 'bi-shield-check',
    summary: 'Recorded IPS rules against the current book or a hypothetical change. Advisory only.',
    scope: 'org',
    output: 'calculated',
    params: ['ticker', 'amountUsd', 'sector'],
    example: 'Would adding $10,000 of MSFT create an IPS concern for us?',
  },
  'org-research-coverage': {
    key: 'org-research-coverage',
    label: 'Research Coverage',
    type: 'Council',
    icon: 'bi-grid-3x3-gap',
    summary:
      'Holdings, recorded coverage owners, latest research age, open assignments and reviews.',
    scope: 'org',
    output: 'calculated',
    params: ['staleDays'],
    example: 'Which of our holdings lack recent coverage?',
  },
  'org-thesis-red-team': {
    key: 'org-thesis-red-team',
    label: 'Investment Committee Red Team',
    type: 'Council',
    icon: 'bi-shield-exclamation',
    summary: 'Committee questions linked to the pitch’s own assumptions, risks and gaps.',
    scope: 'org',
    output: 'derived',
    params: ['pitchId'],
    example: 'Challenge the valuation assumptions in our Microsoft pitch.',
  },
  'org-pitch-research': {
    key: 'org-pitch-research',
    label: 'Pitch Copilot',
    type: 'Council',
    icon: 'bi-easel',
    summary: 'A transparent thesis checklist and the bull, base and bear cases as recorded.',
    scope: 'org',
    output: 'derived',
    params: ['pitchId'],
    example: 'Help me develop our investment thesis for Microsoft.',
  },
  'org-meeting-briefing': {
    key: 'org-meeting-briefing',
    label: 'Meeting Briefing',
    type: 'Council',
    icon: 'bi-calendar-check',
    summary:
      'Agenda, pitches, research since the last meeting, reviews, flags and rule observations.',
    scope: 'org',
    output: 'derived',
    params: ['meetingId'],
    example: 'Prepare a briefing for our next investment committee meeting.',
  },
  'org-research-memory': {
    key: 'org-research-memory',
    label: 'Research Memory',
    type: 'Council',
    icon: 'bi-clock-history',
    summary: 'An approved earlier version, exactly as approved, against current evidence.',
    scope: 'org',
    output: 'derived',
    params: ['reportId'],
    example: 'What did our team believe about NVIDIA last semester?',
  },
};

export const ORG_ANALYSES = Object.values(ORG_CAPABILITIES);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** -> { ok, value?, error? } for a council attachment's params. */
export function validateOrgAttachment(att = {}) {
  const cap = ORG_CAPABILITIES[att.capability];
  if (!cap) return { ok: false, error: 'Unknown council capability.' };
  const p = att.params || {};
  const v = {};
  if (p.ticker != null) {
    const t = String(p.ticker).toUpperCase().trim();
    if (!/^[A-Z]{1,5}(\.[A-Z])?$/.test(t)) return { ok: false, error: 'Ticker is not valid.' };
    v.ticker = t;
  }
  if (p.amountUsd != null) {
    const n = Number(p.amountUsd);
    if (!Number.isFinite(n) || Math.abs(n) > 1e9)
      return { ok: false, error: 'Amount is not valid.' };
    v.amountUsd = n;
  }
  if (p.sector != null) v.sector = String(p.sector).slice(0, 80);
  if (p.staleDays != null) {
    const n = Number(p.staleDays);
    if (!Number.isInteger(n) || n < 7 || n > 730)
      return { ok: false, error: 'Research age must be 7 to 730 days.' };
    v.staleDays = n;
  }
  for (const k of ['pitchId', 'meetingId', 'reportId'])
    if (p[k] != null) {
      if (!UUID.test(String(p[k]))) return { ok: false, error: `${k} is not valid.` };
      v[k] = String(p[k]);
    }
  return {
    ok: true,
    value: {
      key: cap.key,
      capability: cap.key,
      kind: 'analysis',
      origin: att.origin || 'user',
      params: v,
    },
  };
}

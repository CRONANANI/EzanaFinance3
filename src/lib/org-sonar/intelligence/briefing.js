/**
 * Sonar for organizations: meeting briefings, research memory and thesis monitors
 * (Nov 28 2026). Pure and client-safe; unit-tested in scripts/check-org-sonar-intelligence.mjs.
 *
 * meetingBriefing   assembles a briefing for a recorded meeting from records only: the
 *                   meeting's own agenda, pitches scheduled for it, research completed since
 *                   the previous meeting, reports waiting on review, open flags and recorded
 *                   rule observations. Nothing is invented: an empty section says so.
 * versionComparison compares a frozen report version (what the team believed then, with its
 *                   date) with current authorized evidence. The old version is never edited;
 *                   an assumption is confirmed or contradicted only through a monitor with a
 *                   recorded metric and threshold, and is otherwise left untested.
 * validateMonitor   a thesis monitor definition: source metric, baseline, threshold,
 *                   frequency, reporting lag, responsible analyst and report version.
 * evaluateMonitor   reads a monitor against an observed series, honouring the reporting lag.
 * knowableAt        hindsight without look-ahead: keeps only records dated on or before the
 *                   decision date.
 */

const t = (v) => {
  const n = v ? Date.parse(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const iso = (ms) => (ms === null ? null : new Date(ms).toISOString());

/** The meeting before `meeting` (most recent scheduled before it), or null. */
export function previousMeeting(meetings = [], meeting) {
  const at = t(meeting?.scheduled_at);
  if (at === null) return null;
  return (
    meetings
      .filter((m) => m.id !== meeting.id && t(m.scheduled_at) !== null && t(m.scheduled_at) < at)
      .sort((a, b) => t(b.scheduled_at) - t(a.scheduled_at))[0] || null
  );
}

export function meetingBriefing({
  meeting,
  meetings = [],
  pitches = [],
  reports = [],
  flags = [],
  policy = null,
}) {
  if (!meeting) return { ok: false, reason: 'No recorded meeting was found to brief.' };
  const prev = previousMeeting(meetings, meeting);
  const since = prev ? t(prev.scheduled_at) : null;
  const until = t(meeting.scheduled_at);
  const inWindow = (v) => {
    const x = t(v);
    return x !== null && (since === null || x > since) && (until === null || x <= until);
  };
  const agenda = Array.isArray(meeting.agenda)
    ? meeting.agenda.filter(Boolean)
    : meeting.agenda
      ? String(meeting.agenda)
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  return {
    ok: true,
    meeting: {
      id: meeting.id,
      title: meeting.title || 'Meeting',
      scheduledAt: meeting.scheduled_at || null,
      category: meeting.category || null,
    },
    previous: prev
      ? { id: prev.id, title: prev.title || 'Meeting', scheduledAt: prev.scheduled_at }
      : null,
    sections: [
      { key: 'agenda', label: 'Meeting agenda', items: agenda.map((a) => ({ text: a })) },
      {
        key: 'pitches',
        label: 'Pitches on this meeting',
        items: pitches
          .filter((p) => p.ic_meeting_id === meeting.id)
          .map((p) => ({
            text: `${p.ticker}${p.company_name ? ` (${p.company_name})` : ''}`,
            ref: { kind: 'pitch', id: p.id },
            detail: p.stage || null,
          })),
      },
      {
        key: 'research',
        label: prev
          ? 'Research completed since the previous meeting'
          : 'Research completed before this meeting',
        items: reports
          .filter((r) => r.status === 'approved' && inWindow(r.approved_at))
          .map((r) => ({
            text: r.title || r.ticker || 'Report',
            ref: { kind: 'report', id: r.id },
            detail: r.ticker || null,
          })),
      },
      {
        key: 'review',
        label: 'Waiting on review',
        items: reports
          .filter((r) => r.status === 'under_review')
          .map((r) => ({
            text: r.title || r.ticker || 'Report',
            ref: { kind: 'report', id: r.id },
          })),
      },
      {
        key: 'flags',
        label: 'Open position flags',
        items: flags
          .filter((f) => !['resolved', 'closed', 'dismissed'].includes(f.status))
          .map((f) => ({
            text: `${f.ticker}: ${f.subject || 'Flag'}`,
            ref: { kind: 'flag', id: f.id },
            detail: f.flag_color || null,
          })),
      },
      {
        key: 'policy',
        label: 'Recorded rule observations',
        items: (policy?.observations || [])
          .filter((o) => o.concern)
          .map((o) => ({ text: `${o.wording}: ${o.label}`, detail: o.current.detail })),
      },
    ],
    note: 'Built from the meeting, pitch, report, flag and policy records. Agenda items and decisions are never added.',
  };
}

/* ── research memory ─────────────────────────────────────────────────── */

/**
 * @param original  { reportId, version, createdAt, findings: [{id,text}], assumptions: [] }
 * @param current   { asOf, findings: [{id,text}] }
 * @param monitors  evaluated monitors [{ assumption, result: 'confirmed'|'contradicted'|'untested' }]
 */
export function versionComparison({ original, current, monitors = [] }) {
  if (!original) return { ok: false, reason: 'No earlier version of this research is on record.' };
  const byAssumption = new Map(monitors.map((m) => [String(m.assumption), m]));
  const assumptions = (original.assumptions || []).map((a) => {
    const m = byAssumption.get(String(a));
    return {
      assumption: a,
      status: m?.result || 'untested',
      basis: m ? m.detail : 'No recorded monitor tests this assumption.',
    };
  });
  const origText = new Set((original.findings || []).map((f) => f.text));
  return {
    ok: true,
    original: {
      reportId: original.reportId,
      version: original.version,
      date: original.createdAt,
      findings: original.findings || [],
    },
    current: { asOf: current?.asOf || null, findings: current?.findings || [] },
    newFindings: (current?.findings || []).filter((f) => !origText.has(f.text)),
    assumptions,
    confirmed: assumptions.filter((a) => a.status === 'confirmed').length,
    contradicted: assumptions.filter((a) => a.status === 'contradicted').length,
    untested: assumptions.filter((a) => a.status === 'untested').length,
    note: `Version ${original.version} is shown as it was approved; it is never rewritten.`,
  };
}

/* ── thesis monitors ─────────────────────────────────────────────────── */

export const MONITOR_METRICS = [
  'revenue_growth',
  'operating_margin',
  'gross_margin',
  'net_debt',
  'debt_to_equity',
  'free_cash_flow',
  'eps',
  'contract_obligations',
  'institutional_holders',
  'price',
];
export const MONITOR_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly'];
export const MONITOR_OPERATORS = ['above', 'below'];

export function validateMonitor(m = {}) {
  const errors = [];
  if (!MONITOR_METRICS.includes(m.metric)) errors.push('Choose a metric Ezana records.');
  if (!Number.isFinite(Number(m.baseline))) errors.push('Baseline must be a number.');
  if (!Number.isFinite(Number(m.threshold))) errors.push('Threshold must be a number.');
  if (!MONITOR_OPERATORS.includes(m.operator)) errors.push('Operator must be above or below.');
  if (!MONITOR_FREQUENCIES.includes(m.frequency)) errors.push('Choose an evaluation frequency.');
  if (!(Number(m.lagDays) >= 0)) errors.push('Reporting lag must be zero or more days.');
  if (!m.analystMemberId) errors.push('Name the responsible analyst.');
  if (!m.reportId || !Number.isInteger(Number(m.reportVersion)))
    errors.push('Link the report version this monitor tests.');
  return errors.length
    ? { ok: false, errors }
    : {
        ok: true,
        value: {
          ...m,
          baseline: Number(m.baseline),
          threshold: Number(m.threshold),
          lagDays: Number(m.lagDays),
          reportVersion: Number(m.reportVersion),
        },
      };
}

/** series: [{ date, value, reportedAt? }]. Only observations already reported by `asOf`. */
export function evaluateMonitor(monitor, series = [], asOf = Date.now()) {
  const v = validateMonitor(monitor);
  if (!v.ok) return { result: 'untested', detail: v.errors.join(' ') };
  const m = v.value;
  const cutoff = (typeof asOf === 'number' ? asOf : t(asOf)) - m.lagDays * 86_400_000;
  const usable = series
    .filter(
      (p) =>
        Number.isFinite(Number(p.value)) &&
        (t(p.reportedAt) ?? t(p.date)) !== null &&
        (t(p.reportedAt) ?? t(p.date)) <= cutoff,
    )
    .sort((a, b) => t(a.date) - t(b.date));
  const last = usable[usable.length - 1];
  if (!last) return { result: 'untested', detail: 'No reported observation yet.' };
  const hit =
    m.operator === 'above' ? Number(last.value) > m.threshold : Number(last.value) < m.threshold;
  return {
    result: hit ? 'contradicted' : 'confirmed',
    detail: `${m.metric.replace(/_/g, ' ')} ${last.value} on ${String(last.date).slice(0, 10)} against a threshold ${m.operator} ${m.threshold} (baseline ${m.baseline}).`,
    observedAt: iso(t(last.date)),
  };
}

/** Records knowable at the decision date (no look-ahead). key: the record's date field. */
export function knowableAt(records = [], decisionDate, key = 'date') {
  const d = t(decisionDate);
  if (d === null) return [];
  return records.filter((r) => t(r?.[key]) !== null && t(r[key]) <= d);
}

/**
 * The standard sections of a Sonar research answer (Nov 2026), for the
 * contents legend on the left of every deep research report: the same
 * legend as Ezana Echo articles and the Ezana API docs.
 *
 * One fixed vocabulary across every report shape (research report, risk
 * memo, positioning memo, fund fit memo, challenge), so a reader always
 * finds the same words. Each section names the heading ids that can stand
 * for it, best first; the legend shows a section only when one of them is
 * on the page, and lists the sections in the order they appear.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-contents.mjs.
 */
export const REPORT_SECTIONS = [
  {
    key: 'summary',
    label: 'Summary',
    targets: ['sch-h', 'sff-verdict-h', 'srm-concl-h', 'spm-concl-h', 'srr-concl-h'],
  },
  { key: 'fit', label: 'Fund fit', targets: ['sff-checks-h', 'sff-thesis-h'] },
  {
    key: 'findings',
    label: 'Key findings',
    targets: ['sff-cat-h', 'srm-risks-h', 'spm-risks-h', 'srr-find-h'],
  },
  {
    key: 'metrics',
    label: 'Key metrics',
    targets: ['srm-dash-h', 'srr-metrics-h', 'srr-country-h'],
  },
  {
    key: 'data',
    label: 'Charts and data',
    targets: [
      'srr-charts-h',
      'srm-capex-h',
      'srm-own-h',
      'srm-assoc-h',
      'srm-comp-h',
      'srm-peer-h',
      'srm-disc-h',
      'srm-exp-ctl-h',
      'srm-exp-h',
      /* Positioning memo exhibits are spm-<exhibit>-h. */
      { prefix: 'spm-', suffix: '-h', exclude: ['spm-concl-h', 'spm-risks-h', 'spm-gaps-h'] },
    ],
  },
  { key: 'scenarios', label: 'Scenarios', targets: ['srm-scn-h', 'srm-chain-h'] },
  { key: 'questions', label: 'Committee questions', targets: ['sff-q-h'] },
  { key: 'gaps', label: 'Data gaps', targets: ['srm-gaps-h', 'spm-gaps-h'] },
  { key: 'team', label: 'Research team', targets: ['srr-team-h'] },
  { key: 'relationships', label: 'Relationships', targets: ['srr-rel-h'] },
  { key: 'evidence', label: 'Evidence', targets: ['srr-ev-h'] },
  { key: 'method', label: 'Methodology', targets: ['srr-lim-h'] },
];

/** The legend appears once a report has at least this many sections. */
export const MIN_SECTIONS = 3;

/**
 * The first target present in `ids` (an ordered list of the heading ids on
 * the page) for one section, or null.
 */
export function pickTarget(section, ids) {
  for (const t of section.targets) {
    if (typeof t === 'string') {
      if (ids.includes(t)) return t;
    } else {
      const hit = ids.find(
        (id) => id.startsWith(t.prefix) && id.endsWith(t.suffix) && !t.exclude.includes(id),
      );
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * The legend for a page whose headings, in document order, are `ids`:
 * [{ key, label, id }] in document order. A heading claimed by one section
 * is never claimed by another.
 */
export function resolveSections(ids) {
  const order = new Map(ids.map((id, i) => [id, i]));
  const taken = new Set();
  const out = [];
  for (const s of REPORT_SECTIONS) {
    const id = pickTarget(
      s,
      ids.filter((x) => !taken.has(x)),
    );
    if (!id) continue;
    taken.add(id);
    out.push({ key: s.key, label: s.label, id });
  }
  return out.sort((a, b) => order.get(a.id) - order.get(b.id));
}

/**
 * The active section: the last one whose heading top is above the reading
 * line (`tops` in the same order as `sections`). At the end of the page,
 * the last section.
 */
export function activeSection(sections, tops, line, atBottom = false) {
  if (!sections.length) return null;
  if (atBottom) return sections[sections.length - 1].key;
  let current = sections[0].key;
  sections.forEach((s, i) => {
    if (Number.isFinite(tops[i]) && tops[i] <= line) current = s.key;
  });
  return current;
}

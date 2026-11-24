/**
 * Research Composer 4.0: the research context (Nov 23 2026). Pure and client-safe; the
 * server rebuilds the same context from the submitted attachments and never trusts the
 * client's version.
 *
 * Every attachment's suggestions come from the whole composition, not from its own name:
 *
 *   buildContext({ question, primary, items })
 *     primary   the question's resolved subject { text, kind, id, name, eligible, period }
 *     items     every attachment in insertion order (seq), queries carrying a schema
 *     -> { question, primary, subjects, datasets, items }
 *
 * Datasets are typed handles with stable ids, never free text:
 *   subject:holdings        the primary subject's holdings (a member's estimated disclosed
 *                           positions or a manager's 13F book)
 *   out:<attachment key>    a query attachment's output, when its rows are securities
 *   set:<attachment key>    a set the attachment's relationship derives (intersection,
 *                           union, difference) from two security datasets
 *
 * A query's relationship is an analytical operation (SET_OPS) when its output and another
 * security dataset are compatible; the evidence-handling choices stay available, second.
 * An analysis targets a dataset (TARGET precedence below). Visual order is insertion order;
 * execution follows planComposition's dependency graph.
 */

import { portfolioGap } from './schema.js';

/* ── names ──────────────────────────────────────────────────────────── */

const possessive = (name) => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

function subjectDataset(primary) {
  if (!primary?.name || !['politician', 'institution'].includes(primary.kind)) return null;
  const politician = primary.kind === 'politician';
  return {
    id: 'subject:holdings',
    role: 'subject',
    shape: 'securities',
    semantics: politician ? 'estimated_holdings' : 'reported_holdings',
    entity: { name: primary.name, kind: primary.kind, id: primary.id },
    label: politician
      ? `${possessive(primary.name)} estimated disclosed holdings`
      : `${possessive(primary.name)} reported 13F holdings`,
    short: primary.name,
    count: primary.eligible ?? null,
    asOf: politician ? 'latest disclosures' : primary.period || null,
    producer: null,
  };
}

function queryDataset(item) {
  const s = item.schema;
  if (!s?.ok || portfolioGap(s)) return null;
  /* A query Sonar built for a resolved filer carries the filer's name (its WHERE has the
     CIK, not the name). */
  const who = item.entityName || s.entity?.text || null;
  const top =
    s.limit && s.orderBy?.dir === 'desc' && /value|shares/.test(s.orderBy.field || '')
      ? `top ${s.limit} `
      : '';
  const what = s.semantics === 'reported_holdings' ? 'reported 13F holdings' : 'securities';
  return {
    id: `out:${item.key}`,
    role: 'output',
    shape: 'securities',
    semantics: s.semantics,
    entity: who ? { name: who, kind: s.entity.role } : null,
    label: who ? `${possessive(who)} ${top}${what}` : `${item.label} (query output)`,
    short: who ? `${who}${top ? ` top ${s.limit}` : ''}` : item.label,
    count: null,
    limit: s.limit,
    asOf: s.period === 'latest' ? 'latest reported quarter' : s.period || 'every reported period',
    producer: item.key,
  };
}

/* ── set operations ─────────────────────────────────────────────────── */

/**
 * Typed operations between two security datasets. `derives` names the dataset a choice
 * produces for later attachments; `compare` produces a comparison, not a new target.
 */
export const SET_OPS = {
  intersect: {
    key: 'intersect',
    family: 'portfolio_operation',
    derives: true,
    text: (l, r) => `Find the equities appearing in both ${l.label} and ${r.label}.`,
    setLabel: (l, r) => `Matching equities: ${l.short} ∩ ${r.short}`,
    setText: (l, r) => `the equities appearing in both ${l.label} and ${r.label}`,
  },
  compare: {
    key: 'compare',
    family: 'portfolio_operation',
    derives: false,
    text: (l, r) => `Compare ${l.label} with ${r.label}: overlap, and what each holds alone.`,
  },
  difference: {
    key: 'difference',
    family: 'portfolio_operation',
    derives: true,
    text: (l, r) => `Identify ${r.label} that do not appear in ${l.label}.`,
    setLabel: (l, r) => `${r.short} not in ${l.short}`,
    setText: (l, r) => `${r.label} that do not appear in ${l.label}`,
  },
  union: {
    key: 'union',
    family: 'portfolio_operation',
    derives: true,
    text: (l, r) => `Combine ${l.label} and ${r.label} into one list of distinct equities.`,
    setLabel: (l, r) => `All equities: ${l.short} ∪ ${r.short}`,
    setText: (l, r) => `all distinct equities in ${l.label} or ${r.label}`,
  },
};

/** Evidence handling, offered second (and first only when no operation fits). */
export const EVIDENCE_OPS = {
  evidence: { key: 'evidence', family: 'evidence', text: () => 'Use its results as evidence.' },
  'compare-answer': {
    key: 'compare-answer',
    family: 'evidence',
    text: () => 'Compare its results with the answer.',
  },
  limit: { key: 'limit', family: 'evidence', text: () => 'Limit the answer to its results.' },
};

export const MATCH_LEVELS = {
  security: {
    key: 'security',
    label: 'Exact securities (CUSIP)',
    note: 'Matched on the 9-character CUSIP: the same security and share class.',
  },
  issuer: {
    key: 'issuer',
    label: 'Issuing companies',
    note: 'Matched on the CUSIP issuer prefix (its first 6 characters): different share classes of one company count as one.',
  },
};

/** The security dataset a query output is paired with: the subject's, else an earlier one. */
function partnerFor(item, datasets) {
  const own = `out:${item.key}`;
  const subject = datasets.find((d) => d.id === 'subject:holdings');
  if (subject) return subject;
  const earlier = datasets.filter((d) => d.role === 'output' && d.id !== own);
  return earlier[earlier.length - 1] || null;
}

/* ── the context ────────────────────────────────────────────────────── */

export function buildContext({ question = '', primary = null, items = [] } = {}) {
  const ordered = [...items].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const datasets = [];
  const subj = subjectDataset(primary);
  if (subj) datasets.push(subj);
  for (const it of ordered) {
    if (it.kind !== 'query') continue;
    const out = queryDataset(it);
    if (!out) continue;
    const partner = partnerFor(it, datasets);
    datasets.push(out);
    const op = SET_OPS[it.relation];
    if (op?.derives && partner) {
      datasets.push({
        id: `set:${it.key}`,
        role: 'derived',
        shape: 'securities',
        semantics: 'derived_securities',
        op: op.key,
        matchLevel: it.matchLevel === 'issuer' ? 'issuer' : 'security',
        inputs: [partner.id, out.id],
        label: op.setLabel(partner, out),
        text: op.setText(partner, out),
        short: op.setLabel(partner, out),
        count: null,
        producer: it.key,
      });
    }
  }
  const subjects = [
    primary?.name ? { ...primary, role: 'primary' } : null,
    ...ordered
      .filter((it) => it.kind === 'query' && (it.entityName || it.schema?.entity?.text))
      .map((it) => ({
        text: it.entityName || it.schema.entity.text,
        name: it.entityName || it.schema.entity.text,
        kind: it.schema?.entity?.role || 'institution',
        role: 'secondary',
        via: it.key,
      })),
  ].filter(Boolean);
  return { question, primary, subjects, datasets, items: ordered };
}

/**
 * A query attachment's relationship choices, ranked: portfolio operations first when its
 * output and a partner dataset are compatible security sets, then evidence handling.
 * A disabled choice carries the reason.
 */
export function queryRelationOptions(item, ctx) {
  const out = ctx.datasets.find((d) => d.id === `out:${item.key}`);
  const gap = item.schema ? portfolioGap(item.schema) : 'Reading the query.';
  const partner = out
    ? partnerFor(
        item,
        ctx.datasets.filter((d) => d.role !== 'derived'),
      )
    : null;
  const evidence = Object.values(EVIDENCE_OPS).map((o) => ({
    key: o.key,
    family: o.family,
    text: o.text(),
  }));
  if (!out || !partner) {
    const why = gap
      ? gap
      : ctx.primary?.kind && !['politician', 'institution'].includes(ctx.primary.kind)
        ? `${ctx.primary.name || 'The subject'} has no holdings to compare with.`
        : ctx.primary?.text && !ctx.primary.kind
          ? `Sonar is resolving "${ctx.primary.text}".`
          : 'Add a subject with holdings (a member of Congress or a 13F filer) to compare with.';
    return { options: evidence, recommended: 'evidence', unavailable: why };
  }
  const ops = ['intersect', 'compare', 'difference', 'union'].map((k) => ({
    key: k,
    family: SET_OPS[k].family,
    text: SET_OPS[k].text(partner, out),
    recommended: k === 'intersect',
  }));
  return { options: [...ops, ...evidence], recommended: 'intersect', partner, output: out };
}

/* ── analysis targets ───────────────────────────────────────────────── */

/** Capabilities that analyse companies and so can target a security dataset. */
export const COMPANY_TARGETING = new Set(['fundamental-analysis', 'dcf-valuation']);

/**
 * The targets an analysis can take, and the recommended one. Precedence (a recommendation,
 * never a silent override of an explicit choice):
 *   1 the reader's explicit target, while it exists
 *   2 the question's own analytical target (an analysis Sonar inferred from it)
 *   3 a set derived by an earlier attachment
 *   4 another attachment's security output
 *   5 the subject (its holdings, or the company itself)
 */
export function analysisTargets(a, ctx) {
  const subj = ctx.datasets.find((d) => d.id === 'subject:holdings');
  const options = [];
  if (COMPANY_TARGETING.has(a.capability)) {
    const earlier = ctx.datasets.filter(
      (d) =>
        d.producer &&
        (ctx.items.find((i) => i.key === d.producer)?.seq ?? 0) <= (a.seq ?? Infinity),
    );
    const later = ctx.datasets.filter((d) => d.producer && !earlier.includes(d));
    for (const d of [...earlier, ...later].filter((x) => x.role === 'derived').reverse())
      options.push({ id: d.id, label: d.label, kind: 'set', dataset: d });
    for (const d of [...earlier, ...later].filter((x) => x.role === 'output').reverse())
      options.push({ id: d.id, label: d.label, kind: 'set', dataset: d });
  }
  if (subj && a.capability !== 'backtesting')
    options.push({ id: 'subject', label: subj.label, kind: 'subject', dataset: subj });
  else if (ctx.primary?.name || a.subject?.name || a.subject?.text)
    options.push({
      id: 'subject',
      label: a.subject?.name || a.subject?.text || ctx.primary?.name,
      kind: 'subject',
    });
  /* Sonar 5.0: an analysis inferred from a two-holder question ("the shares both X and Y
     hold") analyses the overlap whatever order the pieces were added in; any other
     inferred analysis keeps the question's own subject. */
  const anyDerived = options.find((o) => o.dataset?.role === 'derived')?.id || null;
  const recommended =
    a.origin === 'auto' && a.wantsSet && anyDerived
      ? anyDerived
      : a.origin === 'auto'
        ? 'subject'
        : options.find((o) => o.dataset?.role === 'derived' && earlierThan(o.dataset, a, ctx))
            ?.id ||
          options.find((o) => o.dataset?.role === 'output' && earlierThan(o.dataset, a, ctx))?.id ||
          options.find((o) => o.id === 'subject')?.id ||
          options[0]?.id ||
          null;
  return { options, recommended };
}

function earlierThan(dataset, a, ctx) {
  const p = ctx.items.find((i) => i.key === dataset.producer);
  return (p?.seq ?? 0) < (a.seq ?? Infinity);
}

/**
 * Bring analyses in line with the context. A default target follows the recommendation; an
 * explicit target is kept, and when its dataset left the composition (its query was removed
 * or its relationship changed) the analysis is marked stale with a suggested replacement.
 * Returns only the fields that changed per key, so the caller can merge without clobbering
 * the reader's edits.
 */
export function reconcileTargets(items, ctx) {
  const patches = {};
  for (const a of items) {
    if (a.kind !== 'analysis') continue;
    const { options, recommended } = analysisTargets(a, ctx);
    const cur = a.target || null;
    const exists = cur && options.some((o) => o.id === cur.id);
    let next;
    /* A target that depended on another attachment and lost it (the query was removed or
       its relationship changed) needs the reader, explicit or not: the analysis is never
       moved silently to a different subject. */
    const lostDependency = Boolean(cur?.dataset) && !exists;
    if (cur?.explicit && exists) next = { id: cur.id, explicit: true };
    else if (cur?.explicit || lostDependency)
      next = {
        id: cur.id,
        explicit: Boolean(cur.explicit),
        stale: true,
        suggest: recommended,
        label: cur.label,
        dataset: cur.dataset,
      };
    else next = { id: recommended, explicit: false };
    const opt = options.find((o) => o.id === next.id);
    const ds = opt?.dataset || null;
    if (next.stale) {
      next.kind = cur.kind || 'set';
      next.dependsOn = [];
      next.suggestLabel = options.find((o) => o.id === next.suggest)?.label || null;
      if (JSON.stringify(next) !== JSON.stringify(cur)) patches[a.key] = next;
      continue;
    }
    next.label = opt?.label || cur?.label || null;
    next.kind = opt?.kind || cur?.kind || 'subject';
    next.dependsOn = ds?.producer ? [ds.producer] : [];
    if (ds && ds.role !== 'subject') {
      next.dataset = {
        id: ds.id,
        role: ds.role,
        op: ds.op || null,
        label: ds.label,
        text: ds.text || ds.label,
      };
    }
    if (JSON.stringify(next) !== JSON.stringify(cur)) patches[a.key] = next;
  }
  return patches;
}

/* ── execution plan ─────────────────────────────────────────────────── */

/**
 * The dependency graph, executed in topological order (visual order is unaffected). Tasks:
 *   subject:resolve, subject:holdings, query:<key>, set:<key>, analysis:<key>
 * Throws on a cycle. Repeated retrieval is one task (the subject's holdings are read once).
 */
export function planComposition(ctx) {
  const tasks = new Map();
  const add = (id, label, deps = []) => {
    if (!tasks.has(id)) tasks.set(id, { id, label, deps: [...new Set(deps)] });
  };
  const needsSubject = (dsId) => dsId === 'subject:holdings';
  for (const it of ctx.items) {
    if (it.kind === 'query' && it.query) {
      add(`query:${it.key}`, `Run the query "${it.label}"`);
      const set = ctx.datasets.find((d) => d.id === `set:${it.key}`);
      const op = SET_OPS[it.relation];
      if (set || (op && !op.derives && op.key === 'compare')) {
        const left = set ? set.inputs[0] : partnerFor(it, ctx.datasets)?.id;
        if (needsSubject(left)) {
          add('subject:resolve', `Resolve ${ctx.primary?.name || 'the subject'}`);
          add('subject:holdings', `Read ${ctx.datasets[0]?.label || 'the subject holdings'}`, [
            'subject:resolve',
          ]);
        }
        const leftTask = needsSubject(left)
          ? 'subject:holdings'
          : left?.startsWith('out:')
            ? `query:${left.slice(4)}`
            : null;
        add(
          `set:${it.key}`,
          set ? `Compute ${set.label}` : 'Compare the two holdings sets',
          [leftTask, `query:${it.key}`].filter(Boolean),
        );
      }
    }
  }
  for (const it of ctx.items) {
    if (it.kind !== 'analysis') continue;
    const dep = it.target?.dependsOn?.[0];
    const ds = it.target?.dataset;
    const deps = [];
    if (ds?.role === 'derived') deps.push(`set:${dep}`);
    else if (ds?.role === 'output') deps.push(`query:${dep}`);
    add(`analysis:${it.key}`, `Run ${it.capability}`, deps);
  }
  /* Kahn's algorithm; a dependency on a task not in the plan is reported, not ignored. */
  const order = [];
  const missing = [];
  const indeg = new Map([...tasks.keys()].map((k) => [k, 0]));
  for (const t of tasks.values())
    for (const d of t.deps) {
      if (!tasks.has(d)) missing.push({ task: t.id, missing: d });
      else indeg.set(t.id, indeg.get(t.id) + 1);
    }
  const queue = [...tasks.keys()].filter((k) => indeg.get(k) === 0);
  while (queue.length) {
    const k = queue.shift();
    order.push(tasks.get(k));
    for (const t of tasks.values())
      if (t.deps.includes(k)) {
        indeg.set(t.id, indeg.get(t.id) - 1);
        if (indeg.get(t.id) === 0) queue.push(t.id);
      }
  }
  if (order.length < tasks.size) throw new Error('The composition has a circular dependency.');
  return { order, missing };
}

/* ── security matching ──────────────────────────────────────────────── */

const cusipKey = (cusip, level) => {
  const c = String(cusip || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (c.length < 6) return null;
  return level === 'issuer' ? c.slice(0, 6) : c.length >= 9 ? c.slice(0, 9) : null;
};

/**
 * Match two security lists. Rows: { cusip, ticker, issuer, ...data }. Rows without a CUSIP
 * never match (a ticker alone can be a different class or a reused symbol); they are
 * counted as unmatched-for-lack-of-identifier instead. Duplicate rows of one security merge.
 */
export function matchSecurities(
  left = [],
  right = [],
  { op = 'intersect', level = 'security' } = {},
) {
  const index = (rows) => {
    const m = new Map();
    let noId = 0;
    for (const r of rows) {
      const k = cusipKey(r.cusip, level);
      if (!k) {
        noId += 1;
        continue;
      }
      const cur = m.get(k);
      if (cur) cur.rows.push(r);
      else m.set(k, { key: k, rows: [r] });
    }
    return { m, noId };
  };
  const L = index(left);
  const R = index(right);
  const both = [...L.m.keys()].filter((k) => R.m.has(k));
  const pick = (keys, from) =>
    keys.map((k) => ({ key: k, left: L.m.get(k)?.rows || [], right: R.m.get(k)?.rows || [] }));
  let keys;
  if (op === 'intersect') keys = both;
  else if (op === 'difference') keys = [...R.m.keys()].filter((k) => !L.m.has(k));
  else if (op === 'union') keys = [...new Set([...L.m.keys(), ...R.m.keys()])];
  else keys = both;
  return {
    rows: pick(keys),
    overlap: both.length,
    leftOnly: L.m.size - both.length,
    rightOnly: R.m.size - both.length,
    leftCount: L.m.size,
    rightCount: R.m.size,
    leftNoId: L.noId,
    rightNoId: R.noId,
    level,
  };
}

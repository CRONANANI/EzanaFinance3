/**
 * Sonar research engine: relationship discovery and the evidence graph
 * (engine v3, Section 5).
 *
 * Relationships are derived only from evidence records, never asserted by the
 * model. Two kinds:
 *
 *   observed  stated by a record: a member disclosed a trade in a company, a
 *             client filed lobbying on an issue area, a company received
 *             federal obligations, a filer holds a company, a company
 *             reports revenue in a region, a member sits on a committee
 *   inferred  an analytical association: the same company appears in two
 *             datasets (traded by members AND receiving contracts). Always
 *             labelled co-occurrence, never causation or conduct.
 *
 * Each relationship keeps its evidence ids, period, confidence and status.
 * `paths()` walks the graph for the relationship explorer (multi-hop).
 *
 * Pure. Unit-tested in scripts/check-sonar-engine.mjs.
 */

const node = (type, id, label = id) => ({ type, id: `${type}:${String(id).toLowerCase()}`, label });

function rel(
  source,
  target,
  type,
  evidenceIds,
  { period = null, confidence = 0.95, status = 'observed', note = null, weight = null } = {},
) {
  return {
    id: `${source.id}>${type}>${target.id}`,
    source,
    target,
    type,
    evidenceIds,
    period,
    confidence,
    status,
    note,
    weight,
  };
}

/**
 * @param {Array} evidence normalised evidence
 * @param {object} layout  merged layout payloads from the sources
 */
export function discoverRelationships(evidence, layout = {}) {
  const out = new Map();
  const add = (r) => {
    const prev = out.get(r.id);
    if (prev) prev.evidenceIds = [...new Set([...prev.evidenceIds, ...r.evidenceIds])];
    else out.set(r.id, r);
  };
  const presence = new Map(); /* company id -> Set(dataset) */
  const mark = (company, dataset, evId) => {
    const p = presence.get(company.id) || { company, datasets: new Map() };
    p.datasets.set(dataset, evId);
    presence.set(company.id, p);
  };

  for (const e of evidence) {
    const d = e.data;
    if (!d?.metric) continue;
    if (d.metric === 'lobbying_spend') {
      for (const r of d.rows || (d.row ? [d.row] : [])) {
        const client = r.ticker
          ? node('company', r.ticker, r.client || r.ticker)
          : node('organization', r.client, r.client);
        add(
          rel(
            client,
            node('issue_area', d.scope || 'lobbying', d.scope || 'lobbying'),
            'lobbies_on',
            [e.id],
            { period: e.period, weight: r.total },
          ),
        );
        if (r.ticker) mark(client, 'lobbying', e.id);
      }
    }
    if (d.metric === 'trade_count' && d.summary) {
      for (const m of d.summary.byMember || []) {
        for (const t of m.tickers || []) {
          const company = node('company', t, t);
          add(
            rel(node('politician', m.bioguideId, m.name), company, 'disclosed_trades_in', [e.id], {
              period: e.period,
            }),
          );
          mark(company, 'congress', e.id);
        }
      }
    }
    if (d.metric === 'trade_count' && d.members) {
      for (const m of d.members) {
        for (const t of m.tickers || []) {
          add(
            rel(
              node('politician', m.bioguideId, m.name),
              node('company', t, t),
              'disclosed_trades_in',
              [e.id],
              { period: e.period },
            ),
          );
        }
      }
    }
    if (d.metric === 'contract_obligations' && d.contracts?.rows) {
      for (const r of d.contracts.rows) {
        const company = node('company', r.ticker, r.name || r.ticker);
        add(
          rel(
            company,
            node('agency', 'us-federal-government', 'U.S. federal government'),
            'receives_contracts_from',
            [e.id],
            { period: e.period, weight: r.prior || r.latest },
          ),
        );
        mark(company, 'contracts', e.id);
      }
    }
    if (d.metric === 'holdings_value' && d.leaders) {
      for (const l of d.leaders) {
        for (const t of l.tickers) {
          const company = node('company', t, t);
          add(
            rel(node('institution', l.filer, l.filer), company, 'holds', [e.id], {
              period: e.period,
            }),
          );
          mark(company, '13f', e.id);
        }
      }
    }
    if (d.metric === 'revenue_by_region' && d.exposure) {
      for (const r of d.exposure) {
        for (const region of r.chinaTaiwanRegions || []) {
          add(
            rel(
              node('company', r.ticker, r.ticker),
              node('region', region, region),
              'reports_revenue_in',
              [e.id],
              { weight: r.chinaTaiwanShare },
            ),
          );
        }
      }
    }
  }

  /* Committee seats from the politician layout. */
  const pol = layout.politician;
  for (const c of pol?.committees || []) {
    add(
      rel(
        node('politician', pol.bioguideId, pol.name),
        node('committee', c.thomasId, c.name),
        'sits_on',
        [],
        { confidence: 0.9, note: "Ezana's committee roster" },
      ),
    );
    for (const s of c.sectors || []) {
      add(
        rel(node('committee', c.thomasId, c.name), node('sector', s, s), 'oversees', [], {
          confidence: 0.8,
          note: "Ezana's committee-to-sector map",
        }),
      );
    }
  }

  /* Inferred co-occurrence: a company present in two or more datasets. */
  for (const { company, datasets } of presence.values()) {
    if (datasets.size < 2) continue;
    const names = [...datasets.keys()];
    add(
      rel(
        company,
        node('dataset_overlap', names.join('+'), names.join(' + ')),
        'appears_in',
        [...new Set(datasets.values())],
        {
          status: 'inferred',
          confidence: 0.6,
          note: 'Co-occurrence across datasets. Not evidence of causation, coordination or conduct.',
        },
      ),
    );
  }
  return [...out.values()];
}

/**
 * Paths from a root node, up to `maxHops`, for the relationship explorer.
 * @returns {Array<Array<object>>} each path is a list of relationships
 */
export function paths(relationships, rootId, { maxHops = 3, limit = 12 } = {}) {
  const adj = new Map();
  for (const r of relationships) {
    for (const [a, b] of [
      [r.source.id, r],
      [r.target.id, r],
    ]) {
      if (!adj.has(a)) adj.set(a, []);
      adj.get(a).push(b);
    }
  }
  const out = [];
  const walk = (at, trail, seen) => {
    if (out.length >= limit) return;
    if (trail.length) out.push(trail);
    if (trail.length >= maxHops) return;
    for (const r of adj.get(at) || []) {
      if (trail.includes(r)) continue;
      const next = r.source.id === at ? r.target.id : r.source.id;
      if (seen.has(next)) continue;
      walk(next, [...trail, r], new Set([...seen, next]));
    }
  };
  walk(rootId, [], new Set([rootId]));
  return out;
}

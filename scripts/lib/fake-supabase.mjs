/**
 * A frozen, in-memory stand-in for the Supabase query builder (Sonar 6.2 execution evals).
 * Supports the chain the composer executors use: select (with count/head), eq, neq, in,
 * gte, lte, gt, lt, not(col, 'is', null), ilike, order, limit, range, and await.
 * Every call is recorded in `calls`, so a test can assert what an executor read.
 * Options (Nov 28 2026): `rpc` maps a function name to a handler (args => rows); `fail`
 * maps a table to an error message, to test explicit failed states.
 */
export function fakeSupabase(tables, { rpc = {}, fail = {} } = {}) {
  const calls = [];
  const from = (table) => {
    const rows = tables[table] || [];
    const st = {
      table,
      filters: [],
      orders: [],
      limit: null,
      range: null,
      head: false,
      count: false,
    };
    calls.push(st);
    const b = {
      select(cols, opts = {}) {
        st.count = opts.count === 'exact';
        st.head = Boolean(opts.head);
        /* JSON paths with aliases (key:metrics->>stepKey) are projected onto each row; plain
           column lists keep the whole row, as before. */
        const items = String(cols || '')
          .split(',')
          .map((x) => x.trim())
          .filter((x) => x.includes('->'));
        if (items.length)
          st.project = items.map((it) => {
            const [alias, expr] = it.includes(':') ? it.split(/:(.+)/) : [null, it];
            const path = expr.split(/->>?/);
            return { name: alias || path[path.length - 1], path };
          });
        return b;
      },
      eq: (c, v) => (st.filters.push((r) => r[c] === v), b),
      neq: (c, v) => (st.filters.push((r) => r[c] !== v), b),
      in: (c, vs) => (st.filters.push((r) => vs.includes(r[c])), b),
      gte: (c, v) => (st.filters.push((r) => r[c] != null && r[c] >= v), b),
      lte: (c, v) => (st.filters.push((r) => r[c] != null && r[c] <= v), b),
      gt: (c, v) => (st.filters.push((r) => r[c] != null && r[c] > v), b),
      lt: (c, v) => (st.filters.push((r) => r[c] != null && r[c] < v), b),
      not: (c, op, v) => {
        if (op === 'is' && v === null) st.filters.push((r) => r[c] != null);
        return b;
      },
      like: (c, pat) => {
        const re = new RegExp(
          `^${String(pat)
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/%/g, '.*')
            .replace(/_/g, '.')}$`,
        );
        st.filters.push((r) => re.test(String(r[c] ?? '')));
        return b;
      },
      /* Nov 28 2026: writes, so a test can assert what a worker recorded. */
      insert(row) {
        const rowsIn = (Array.isArray(row) ? row : [row]).map((r, k) => ({
          id: `row_${(tables[table] || []).length + k + 1}`,
          created_at: new Date().toISOString(),
          ...r,
        }));
        tables[table] = [...(tables[table] || []), ...rowsIn];
        st.inserted = rowsIn;
        const done = { data: rowsIn.length === 1 ? { id: rowsIn[0].id } : rowsIn, error: null };
        const chain = {
          select: () => chain,
          single: () => Promise.resolve(done),
          then: (res, rej) => Promise.resolve(done).then(res, rej),
        };
        return chain;
      },
      ilike: (c, pat) => {
        const re = new RegExp(
          `^${String(pat)
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .replace(/%/g, '.*')
            .replace(/_/g, '.')}$`,
          'i',
        );
        st.filters.push((r) => re.test(String(r[c] ?? '')));
        return b;
      },
      order: (c, { ascending = true } = {}) => (st.orders.push([c, ascending]), b),
      limit: (n) => ((st.limit = n), b),
      range: (a, z) => ((st.range = [a, z]), b),
      then(res, rej) {
        try {
          if (fail[table])
            return Promise.resolve({
              data: null,
              count: null,
              error: { message: fail[table] },
            }).then(res, rej);
          let out = rows.filter((r) => st.filters.every((f) => f(r)));
          for (const [c, asc] of [...st.orders].reverse())
            out = [...out].sort((x, y) =>
              x[c] === y[c] ? 0 : (x[c] > y[c] ? 1 : -1) * (asc ? 1 : -1),
            );
          if (st.project)
            out = out.map((r) => {
              const extra = {};
              for (const p of st.project) {
                let v = r;
                for (const k of p.path) v = v == null ? undefined : v[k];
                extra[p.name] = v ?? null;
              }
              return { ...r, ...extra };
            });
          const count = out.length;
          if (st.range) out = out.slice(st.range[0], st.range[1] + 1);
          if (st.limit != null) out = out.slice(0, st.limit);
          return Promise.resolve({
            data: st.head ? null : out,
            count: st.count ? count : null,
            error: null,
          }).then(res, rej);
        } catch (e) {
          return Promise.reject(e).then(res, rej);
        }
      },
    };
    return b;
  };
  return {
    from,
    calls,
    rpc: async (name, args) => {
      calls.push({ rpc: name, args });
      if (!rpc[name])
        return {
          data: null,
          error: { code: 'PGRST202', message: `function ${name} does not exist` },
        };
      return { data: await rpc[name](args), error: null };
    },
  };
}

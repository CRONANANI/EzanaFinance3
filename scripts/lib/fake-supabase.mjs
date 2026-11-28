/**
 * A frozen, in-memory stand-in for the Supabase query builder (Sonar 6.2 execution evals).
 * Supports the chain the composer executors use: select (with count/head), eq, neq, in,
 * gte, lte, gt, lt, not(col, 'is', null), ilike, order, limit, range, and await.
 * Every call is recorded in `calls`, so a test can assert what an executor read.
 */
export function fakeSupabase(tables) {
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
      select(_cols, opts = {}) {
        st.count = opts.count === 'exact';
        st.head = Boolean(opts.head);
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
          let out = rows.filter((r) => st.filters.every((f) => f(r)));
          for (const [c, asc] of [...st.orders].reverse())
            out = [...out].sort((x, y) =>
              x[c] === y[c] ? 0 : (x[c] > y[c] ? 1 : -1) * (asc ? 1 : -1),
            );
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
    rpc: async () => ({ data: null, error: { message: 'no rpc in fixtures' } }),
  };
}

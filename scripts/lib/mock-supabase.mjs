/**
 * A small in-memory stand-in for the supabase-js query builder, for the
 * reliability check scripts. Supports from(t).insert/update/delete/select
 * with eq/neq/lt/gt/in/not(col,'is',null)/order/limit and single/maybeSingle,
 * unique constraints per table (error code 23505, like Postgres), and rpc()
 * through caller-supplied functions. Every call yields to the event loop so
 * parallel requests interleave like real HTTP calls.
 */
const tick = () => new Promise((r) => setTimeout(r, Math.random() * 3));

export function createMockSupabase({ unique = {}, rpc = {}, seed = {} } = {}) {
  const tables = new Map(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const rows = (t) => {
    if (!tables.has(t)) tables.set(t, []);
    return tables.get(t);
  };
  let seq = 0;
  const calls = [];

  function violates(t, row, ignore) {
    for (const cols of unique[t] || []) {
      const key = (r) => cols.map((c) => r[c]);
      if (cols.some((c) => row[c] == null)) continue;
      const k = JSON.stringify(key(row));
      if (rows(t).some((r) => r !== ignore && JSON.stringify(key(r)) === k)) return true;
    }
    return false;
  }

  function builder(t) {
    const st = { op: 'select', filters: [], limit: null, single: null, payload: null, ret: false };
    const api = {
      insert(p) {
        st.op = 'insert';
        st.payload = p;
        return api;
      },
      update(p) {
        st.op = 'update';
        st.payload = p;
        return api;
      },
      upsert(p) {
        st.op = 'upsert';
        st.payload = p;
        return api;
      },
      delete() {
        st.op = 'delete';
        return api;
      },
      select(_cols, opts) {
        st.ret = true;
        if (opts?.head) st.head = true;
        return api;
      },
      eq(c, v) {
        st.filters.push((r) => r[c] === v);
        return api;
      },
      neq(c, v) {
        st.filters.push((r) => r[c] !== v);
        return api;
      },
      lt(c, v) {
        st.filters.push((r) => r[c] < v);
        return api;
      },
      gt(c, v) {
        st.filters.push((r) => r[c] > v);
        return api;
      },
      gte(c, v) {
        st.filters.push((r) => r[c] >= v);
        return api;
      },
      lte(c, v) {
        st.filters.push((r) => r[c] <= v);
        return api;
      },
      in(c, vs) {
        st.filters.push((r) => vs.includes(r[c]));
        return api;
      },
      not(c, op, v) {
        if (op === 'is' && v === null) st.filters.push((r) => r[c] != null);
        return api;
      },
      order() {
        return api;
      },
      limit(n) {
        st.limit = n;
        return api;
      },
      single() {
        st.single = 'single';
        return api;
      },
      maybeSingle() {
        st.single = 'maybe';
        return api;
      },
      then(res, rej) {
        return run().then(res, rej);
      },
    };
    async function run() {
      await tick();
      calls.push({ table: t, op: st.op });
      const match = (r) => st.filters.every((f) => f(r));
      let out = [];
      if (st.op === 'insert' || st.op === 'upsert') {
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        for (const p of list) {
          const row = { id: p.id ?? `id-${++seq}`, created_at: new Date().toISOString(), ...p };
          if (violates(t, row)) {
            return { data: null, error: { code: '23505', message: 'duplicate key value' } };
          }
          rows(t).push(row);
          out.push(row);
        }
      } else if (st.op === 'update') {
        for (const r of rows(t).filter(match)) {
          const next = { ...r, ...st.payload };
          if (violates(t, next, r))
            return { data: null, error: { code: '23505', message: 'duplicate key value' } };
          Object.assign(r, st.payload);
          out.push(r);
        }
      } else if (st.op === 'delete') {
        const keep = rows(t).filter((r) => !match(r));
        out = rows(t).filter(match);
        tables.set(t, keep);
      } else {
        out = rows(t).filter(match);
      }
      if (st.head) return { data: null, count: out.length, error: null };
      if (st.limit != null) out = out.slice(0, st.limit);
      if (st.single === 'single') {
        if (out.length !== 1)
          return { data: null, error: { code: 'PGRST116', message: 'not one row' } };
        return { data: { ...out[0] }, error: null };
      }
      if (st.single === 'maybe') return { data: out[0] ? { ...out[0] } : null, error: null };
      return { data: out.map((r) => ({ ...r })), error: null };
    }
    return api;
  }

  return {
    from: (t) => builder(t),
    async rpc(name, args) {
      await tick();
      if (!rpc[name]) return { data: null, error: { code: 'PGRST202', message: `no ${name}` } };
      try {
        return { data: await rpc[name](args, { rows }), error: null };
      } catch (e) {
        return { data: null, error: { message: e.message, code: e.code } };
      }
    },
    rows,
    calls,
  };
}

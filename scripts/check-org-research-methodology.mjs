/**
 * Organization research methodology (Sonar analysts, phase 3, Nov 2026).
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-org-research-methodology.mjs
 *
 * Validation and normalization of the methodology, and tenant isolation:
 * one org's methodology never reaches another org's run (the loader is
 * scoped by org id), a non-executive cannot write (403, nothing written),
 * guests and users outside any org get the defaults. The database is an
 * in-memory fake that honours the org_id filter the code applies, and
 * records every query so the tests can assert the scoping itself.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const RM = await import('@/lib/org-sonar/research-methodology');
const S = await import('@/lib/org-sonar/research-methodology-server');

const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const EXEC_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PM_A = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ANALYST_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const EXEC_B = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const member = (user_id, role, org_id, extra = {}) => ({
  id: `m-${user_id.slice(0, 4)}`,
  user_id,
  org_id,
  role,
  is_active: true,
  ...extra,
});

const ROW_A = {
  org_id: ORG_A,
  valuation_methods: ['dcf', 'sum_of_parts'],
  required_sections: ['thesis', 'valuation', 'risks'],
  horizon_months: 60,
  scenarios_required: true,
  red_team_required: true,
  review_rules: { min_reviewers: 2, require_citations: true },
  assumption_overrides: { equity_risk_premium: 0.055, terminal_growth_cap: 0.025 },
  output_format: 'research_note',
  notes: 'Org A house view',
  updated_by: EXEC_A,
  updated_at: '2026-11-01T00:00:00.000Z',
};
const ROW_B = {
  ...ROW_A,
  org_id: ORG_B,
  valuation_methods: ['dividend_discount'],
  horizon_months: 12,
  red_team_required: false,
  assumption_overrides: { equity_risk_premium: 0.08 },
  output_format: 'one_pager',
  notes: 'Org B house view',
};

/** A tiny supabase-js stand-in that honours eq filters and logs queries. */
function fakeDb(seed = {}, { failTables = {}, throwOn = null } = {}) {
  const tables = new Map(Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const log = [];
  const rows = (t) => tables.get(t) || (tables.set(t, []), tables.get(t));
  const from = (t) => {
    if (throwOn === t) throw new Error('connection reset');
    const q = { t, op: 'select', filters: [], payload: null, single: null };
    log.push(q);
    const api = {
      select() {
        return api;
      },
      eq(c, v) {
        q.filters.push([c, v]);
        return api;
      },
      upsert(p) {
        q.op = 'upsert';
        q.payload = p;
        return api;
      },
      insert(p) {
        q.op = 'insert';
        q.payload = p;
        return api;
      },
      maybeSingle() {
        q.single = 'maybe';
        return api;
      },
      single() {
        q.single = 'single';
        return api;
      },
      then(res, rej) {
        return Promise.resolve(run()).then(res, rej);
      },
    };
    function run() {
      if (failTables[t]) return { data: null, error: failTables[t] };
      const match = (r) => q.filters.every(([c, v]) => r[c] === v);
      if (q.op === 'upsert') {
        const list = rows(t);
        const i = list.findIndex((r) => r.org_id === q.payload.org_id);
        if (i >= 0) list[i] = { ...list[i], ...q.payload };
        else list.push({ ...q.payload });
        return { data: { ...q.payload }, error: null };
      }
      if (q.op === 'insert') {
        rows(t).push({ ...q.payload });
        return { data: null, error: null };
      }
      const out = rows(t).filter(match);
      if (q.single) return { data: out[0] ? { ...out[0] } : null, error: null };
      return { data: out.map((r) => ({ ...r })), error: null };
    }
    return api;
  };
  return { from, log, rows };
}

/* ---------------------------------------------------------------- pure */

test('the defaults match the production column defaults', () => {
  const d = RM.DEFAULT_METHODOLOGY;
  assert.deepEqual([...d.valuationMethods], ['dcf', 'comparables']);
  assert.deepEqual([...d.requiredSections], ['financials', 'risks', 'industry']);
  assert.equal(d.horizonMonths, 36);
  assert.equal(d.scenariosRequired, true);
  assert.equal(d.redTeamRequired, false);
  assert.equal(d.outputFormat, 'ic_memo');
  assert.equal(d.isDefault, true);
  assert.ok(Object.isFrozen(d));
  /* A fresh copy is mutable and never shares arrays with the frozen default. */
  const c = RM.defaultMethodology(ORG_A);
  c.valuationMethods.push('lbo');
  assert.equal(RM.DEFAULT_METHODOLOGY.valuationMethods.length, 2);
  assert.equal(c.orgId, ORG_A);
});

test('validateMethodology accepts a full, valid body', () => {
  const v = RM.validateMethodology({
    valuation_methods: ['dcf', 'multiples', 'residual_income', 'dcf'],
    required_sections: ['thesis', 'financials', 'scenarios'],
    horizon_months: 24,
    scenarios_required: false,
    red_team_required: true,
    review_rules: {
      min_reviewers: 1,
      require_executive_approval: true,
      min_confidence: 'moderate',
    },
    assumption_overrides: {
      equity_risk_premium: 0.05,
      terminal_growth_cap: 0.03,
      risk_free_rate: '0.042',
      beta_floor: 0.6,
      beta_cap: 2,
      tax_rate: '',
    },
    output_format: 'one_pager',
    notes: '  Prefer conservative terminal values. ',
  });
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  /* 'multiples' is an alias of 'comparables'; duplicates collapse. */
  assert.deepEqual(v.value.valuation_methods, ['dcf', 'comparables', 'residual_income']);
  assert.equal(v.value.horizon_months, 24);
  assert.equal(v.value.assumption_overrides.risk_free_rate, 0.042);
  assert.equal('tax_rate' in v.value.assumption_overrides, false);
  assert.equal(v.value.notes, 'Prefer conservative terminal values.');
  assert.equal('org_id' in v.value, false);
});

test('validateMethodology rejects out-of-range and unknown values', () => {
  const bad = (body, field) => {
    const v = RM.validateMethodology(body);
    assert.equal(v.ok, false, `${JSON.stringify(body)} should fail`);
    assert.ok(
      v.errors.some((e) => e.field === field),
      `${field} not in ${JSON.stringify(v.errors)}`,
    );
  };
  bad(null, 'body');
  bad([], 'body');
  bad({ valuation_methods: ['dcf', 'astrology'] }, 'valuation_methods');
  bad({ valuation_methods: [] }, 'valuation_methods');
  bad({ valuation_methods: 'dcf' }, 'valuation_methods');
  bad({ required_sections: ['horoscope'] }, 'required_sections');
  for (const h of [0, 2, 121, 1.5, '', 'ten']) bad({ horizon_months: h }, 'horizon_months');
  bad({ scenarios_required: 'yes' }, 'scenarios_required');
  bad({ red_team_required: 1 }, 'red_team_required');
  bad({ review_rules: [] }, 'review_rules');
  bad({ review_rules: { min_reviewers: 9 } }, 'review_rules.min_reviewers');
  bad({ review_rules: { min_confidence: 'certain' } }, 'review_rules.min_confidence');
  bad({ review_rules: { sneaky: true } }, 'review_rules.sneaky');
  bad(
    { assumption_overrides: { equity_risk_premium: 0.11 } },
    'assumption_overrides.equity_risk_premium',
  );
  bad(
    { assumption_overrides: { equity_risk_premium: 0.01 } },
    'assumption_overrides.equity_risk_premium',
  );
  bad(
    { assumption_overrides: { terminal_growth_cap: 0.06 } },
    'assumption_overrides.terminal_growth_cap',
  );
  bad({ assumption_overrides: { risk_free_rate: -0.01 } }, 'assumption_overrides.risk_free_rate');
  bad({ assumption_overrides: { beta_floor: 3.5 } }, 'assumption_overrides.beta_floor');
  bad({ assumption_overrides: { beta_floor: 1.5, beta_cap: 1 } }, 'assumption_overrides.beta_cap');
  bad(
    { assumption_overrides: { equity_risk_premium: true } },
    'assumption_overrides.equity_risk_premium',
  );
  bad({ assumption_overrides: { wacc: 0.08 } }, 'assumption_overrides.wacc');
  bad({ output_format: 'pdf' }, 'output_format');
  bad({ notes: 'x'.repeat(RM.NOTES_MAX + 1) }, 'notes');
  /* The horizon bounds follow the database check (3 to 120). */
  assert.equal(RM.validateMethodology({ horizon_months: 3 }).ok, true);
  assert.equal(RM.validateMethodology({ horizon_months: 120 }).ok, true);
});

test('normalizeMethodology never passes an out-of-range value to the engine', () => {
  const m = RM.normalizeMethodology({
    org_id: ORG_A,
    valuation_methods: ['vibes'],
    required_sections: ['risks', 'nope'],
    horizon_months: 500,
    scenarios_required: null,
    review_rules: { min_reviewers: 50, require_citations: true },
    assumption_overrides: {
      equity_risk_premium: 0.5,
      terminal_growth_cap: 0.02,
      beta_floor: 2,
      beta_cap: 1,
    },
    output_format: 'scroll',
  });
  assert.deepEqual(m.valuationMethods, ['dcf', 'comparables']);
  assert.deepEqual(m.requiredSections, ['risks']);
  assert.equal(m.horizonMonths, 36);
  assert.equal(m.scenariosRequired, true);
  assert.deepEqual(m.reviewRules, { require_citations: true });
  assert.deepEqual(m.assumptionOverrides, { terminal_growth_cap: 0.02, beta_floor: 2 });
  assert.equal(m.outputFormat, 'ic_memo');
  assert.equal(m.isDefault, false);
  assert.equal(RM.normalizeMethodology(null).isDefault, true);
});

test('methodologyBrief labels the fund methodology and is empty for defaults', () => {
  assert.deepEqual(RM.methodologyBrief(RM.defaultMethodology()), []);
  const lines = RM.methodologyBrief(RM.normalizeMethodology(ROW_A)).join(' ');
  assert.match(lines, /Discounted cash flow, Sum of the parts/);
  assert.match(lines, /not available in Ezana data/);
  assert.match(lines, /60 months/);
  assert.match(lines, /Equity risk premium 5\.5%/);
  assert.doesNotMatch(lines, /—/);
});

/* ------------------------------------------------- loader: tenant isolation */

test("loadOrgMethodology: one org's methodology never reaches another org's run", async () => {
  const db = fakeDb({ org_research_methodology: [ROW_A, ROW_B] });
  const a = await RM.loadOrgMethodology(db, ORG_A);
  const b = await RM.loadOrgMethodology(db, ORG_B);
  assert.equal(a.orgId, ORG_A);
  assert.equal(a.notes, 'Org A house view');
  assert.deepEqual(a.valuationMethods, ['dcf', 'sum_of_parts']);
  assert.equal(a.assumptionOverrides.equity_risk_premium, 0.055);
  assert.equal(b.orgId, ORG_B);
  assert.equal(b.notes, 'Org B house view');
  assert.deepEqual(b.valuationMethods, ['dividend_discount']);
  assert.equal(b.assumptionOverrides.equity_risk_premium, 0.08);
  /* Every read was filtered by exactly the requested org. */
  const reads = db.log.filter((q) => q.t === 'org_research_methodology');
  assert.equal(reads.length, 2);
  assert.deepEqual(reads[0].filters, [['org_id', ORG_A]]);
  assert.deepEqual(reads[1].filters, [['org_id', ORG_B]]);
});

test('loadOrgMethodology ignores a row for another org even if the client returns one', async () => {
  /* A client that ignores filters (e.g. a misconfigured stub or a future
     refactor) must still never hand org B's methodology to org A. */
  const leaky = {
    from: () => {
      const api = {
        select: () => api,
        eq: () => api,
        maybeSingle: async () => ({ data: { ...ROW_B }, error: null }),
      };
      return api;
    },
  };
  const m = await RM.loadOrgMethodology(leaky, ORG_A);
  assert.equal(m.isDefault, true);
  assert.equal(m.orgId, ORG_A);
  assert.notEqual(m.notes, 'Org B house view');
});

test('guests and users outside any org get the defaults, without a query', async () => {
  const db = fakeDb({ org_research_methodology: [ROW_A, ROW_B] });
  for (const orgId of [null, undefined, '', 0]) {
    // eslint-disable-next-line no-await-in-loop
    const m = await RM.loadOrgMethodology(db, orgId);
    assert.equal(m.isDefault, true);
    assert.equal(m.orgId, null);
    assert.deepEqual(m.valuationMethods, ['dcf', 'comparables']);
  }
  assert.equal(db.log.length, 0);
  assert.equal((await RM.loadOrgMethodology(null, ORG_A)).isDefault, true);
});

test('an org without a row, a missing table or a failing client gets the defaults; never throws', async () => {
  const empty = fakeDb({ org_research_methodology: [ROW_B] });
  const none = await RM.loadOrgMethodology(empty, ORG_A);
  assert.equal(none.isDefault, true);
  assert.equal(none.orgId, ORG_A);
  const missing = fakeDb(
    {},
    { failTables: { org_research_methodology: { code: 'PGRST205', message: 'not found' } } },
  );
  assert.equal((await RM.loadOrgMethodology(missing, ORG_A)).isDefault, true);
  const broken = fakeDb({}, { throwOn: 'org_research_methodology' });
  assert.equal((await RM.loadOrgMethodology(broken, ORG_A)).isDefault, true);
});

/* ----------------------------------------------------- read / write rules */

const putBody = { valuation_methods: ['dcf'], horizon_months: 18, org_id: ORG_B };

async function put(m, body = putBody, seed = [ROW_A, ROW_B]) {
  const user = fakeDb({ org_member_permissions: [] });
  const service = fakeDb({ org_research_methodology: seed });
  let serviceAsked = false;
  const res = await S.writeMethodologyForMember({
    supabase: user,
    member: m,
    readBody: async () => body,
    getService: () => {
      serviceAsked = true;
      return service;
    },
  });
  return { res, service, serviceAsked };
}

test('a non-executive cannot write the methodology (403, nothing written)', async () => {
  for (const m of [
    member(ANALYST_A, 'analyst', ORG_A, { sub_role: 'Senior Analyst' }),
    member(PM_A, 'portfolio_manager', ORG_A, { sub_role: 'Senior PM' }),
  ]) {
    // eslint-disable-next-line no-await-in-loop
    const { res, service, serviceAsked } = await put(m);
    assert.equal(res.status, 403, m.role);
    assert.equal(res.body.error, 'Executive role required');
    assert.equal(serviceAsked, false);
    assert.equal(service.log.length, 0);
    assert.deepEqual(service.rows('org_research_methodology')[0], ROW_A);
  }
});

test('a PM granted every assignable permission still cannot write', async () => {
  const user = fakeDb({
    org_member_permissions: [
      { org_member_id: 'm-bbbb', permission_key: 'approve_deliverables' },
      { org_member_id: 'm-bbbb', permission_key: 'manage_org_settings' },
    ],
  });
  const res = await S.writeMethodologyForMember({
    supabase: user,
    member: member(PM_A, 'portfolio_manager', ORG_A),
    readBody: async () => putBody,
    getService: () => {
      throw new Error('service must not be reached');
    },
  });
  assert.equal(res.status, 403);
});

test('non-members and inactive members cannot read or write', async () => {
  for (const m of [
    null,
    undefined,
    member(EXEC_A, 'executive', ORG_A, { is_active: false }),
    { role: 'executive' },
  ]) {
    // eslint-disable-next-line no-await-in-loop
    const w = await put(m);
    assert.equal(w.res.status, 403);
    assert.equal(w.serviceAsked, false);
    // eslint-disable-next-line no-await-in-loop
    const r = await S.readMethodologyForMember(fakeDb({ org_research_methodology: [ROW_A] }), m);
    assert.equal(r.status, 403);
  }
});

test("an executive writes only their own org's row, whatever the body says", async () => {
  const { res, service } = await put(member(EXEC_A, 'executive', ORG_A));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const [up] = service.log.filter((q) => q.op === 'upsert');
  assert.equal(up.payload.org_id, ORG_A);
  assert.equal(up.payload.updated_by, EXEC_A);
  const rows = service.rows('org_research_methodology');
  assert.equal(rows.find((r) => r.org_id === ORG_A).horizon_months, 18);
  /* Org B is untouched. */
  assert.deepEqual(
    rows.find((r) => r.org_id === ORG_B),
    ROW_B,
  );
  assert.equal(res.body.methodology.orgId, ORG_A);
  /* The change is audited against the same org. */
  const audit = service.log.find((q) => q.t === 'org_audit_log');
  assert.equal(audit.payload.org_id, ORG_A);
  assert.equal(audit.payload.action, 'research_methodology_updated');
});

test('an executive with an invalid body gets the field errors; nothing is written', async () => {
  const { res, service } = await put(member(EXEC_B, 'executive', ORG_B), {
    horizon_months: 1,
    assumption_overrides: { equity_risk_premium: 0.2 },
  });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.fields.map((f) => f.field).sort(), [
    'assumption_overrides.equity_risk_premium',
    'horizon_months',
  ]);
  assert.equal(service.log.length, 0);
});

test("a member reads only their own org's methodology and learns whether they can edit", async () => {
  const db = fakeDb({ org_research_methodology: [ROW_A, ROW_B], org_member_permissions: [] });
  const asB = await S.readMethodologyForMember(db, member(EXEC_B, 'executive', ORG_B));
  assert.equal(asB.status, 200);
  assert.equal(asB.body.methodology.notes, 'Org B house view');
  assert.equal(asB.body.viewer.canManage, true);
  const asA = await S.readMethodologyForMember(db, member(ANALYST_A, 'analyst', ORG_A));
  assert.equal(asA.body.methodology.notes, 'Org A house view');
  assert.equal(asA.body.viewer.canManage, false);
  /* An org without a row reads the defaults, labelled as such. */
  const fresh = await S.readMethodologyForMember(
    fakeDb({ org_research_methodology: [ROW_B] }),
    member(PM_A, 'portfolio_manager', ORG_A),
  );
  assert.equal(fresh.body.methodology.isDefault, true);
  assert.equal(fresh.body.methodology.orgId, ORG_A);
});

/* ------------------------------------------------------ wiring (source) */

test('the route resolves the member from the session and delegates to the rules', () => {
  const src = fs.readFileSync('src/app/api/org/research-methodology/route.js', 'utf8');
  assert.match(src, /from '@\/lib\/supabase'/);
  assert.match(src, /getCurrentOrgMember\(supabase\)/);
  assert.match(src, /readMethodologyForMember\(supabase, member\)/);
  assert.match(src, /writeMethodologyForMember\(/);
  assert.equal((src.match(/requireAuth: true/g) || []).length, 2);
  assert.doesNotMatch(src, /body\.org_id|createClient/);
  const lib = fs.readFileSync('src/lib/org-sonar/research-methodology-server.js', 'utf8');
  assert.match(lib, /assertOrgRole\(member, \['executive'\]\)/);
  assert.match(lib, /memberHasPermission\(supabase, member, 'manage_org_settings'\)/);
});

test('the migration mirrors production and is a no-op where the table exists', () => {
  const sql = fs.readFileSync(
    'supabase/migrations/20261109120000_org_research_methodology.sql',
    'utf8',
  );
  assert.match(sql, /to_regclass\('public\.org_research_methodology'\) is null/);
  assert.match(sql, /horizon_months >= 3 and horizon_months <= 120/);
  assert.match(sql, /'ic_memo', 'research_note', 'one_pager'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /org_id in \(select public\.auth_org_ids\(\)\)/);
  assert.match(
    sql,
    /revoke insert, update, delete on public\.org_research_methodology from anon, authenticated/,
  );
});

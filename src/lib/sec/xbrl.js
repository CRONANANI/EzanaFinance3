/**
 * SEC XBRL: fundamentals from the frames API and pay versus performance from
 * either companyfacts (taxonomy `ecd`) or a proxy's inline XBRL.
 *
 * Network calls go through @/lib/sec-edgar (declared User-Agent, throttled).
 * The extraction helpers are pure and unit tested by scripts/check-titans-2.mjs.
 * Nothing is derived here: values are stored exactly as tagged (after the
 * inline XBRL scale and sign), and a fact a filer did not tag stays null.
 */
import { secFetchJson } from '../sec-edgar.js';

/* ── Frames ────────────────────────────────────────────────────────────── */

export function getFrame(taxonomy, concept, unit, period) {
  return secFetchJson(
    `https://data.sec.gov/api/xbrl/frames/${taxonomy}/${concept}/${encodeURIComponent(unit).replace('%2F', '/')}/${period}.json`,
  );
}

export function getCompanyFacts(cik) {
  const padded = String(cik).replace(/\D/g, '').padStart(10, '0');
  return secFetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`);
}

/**
 * Ezana metric -> ordered us-gaap (or dei) concepts; the first concept a
 * company reports for a period wins. `instant` metrics are balance-sheet
 * values at period end.
 */
export const METRICS = [
  {
    key: 'revenue',
    unit: 'USD',
    instant: false,
    concepts: [
      'us-gaap:Revenues',
      'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax',
      'us-gaap:SalesRevenueNet',
    ],
  },
  { key: 'gross_profit', unit: 'USD', instant: false, concepts: ['us-gaap:GrossProfit'] },
  {
    key: 'operating_income',
    unit: 'USD',
    instant: false,
    concepts: ['us-gaap:OperatingIncomeLoss'],
  },
  { key: 'net_income', unit: 'USD', instant: false, concepts: ['us-gaap:NetIncomeLoss'] },
  {
    key: 'eps_diluted',
    unit: 'USD/shares',
    instant: false,
    concepts: ['us-gaap:EarningsPerShareDiluted'],
  },
  {
    key: 'operating_cash_flow',
    unit: 'USD',
    instant: false,
    concepts: ['us-gaap:NetCashProvidedByUsedInOperatingActivities'],
  },
  {
    key: 'capex',
    unit: 'USD',
    instant: false,
    concepts: ['us-gaap:PaymentsToAcquirePropertyPlantAndEquipment'],
  },
  { key: 'assets', unit: 'USD', instant: true, concepts: ['us-gaap:Assets'] },
  { key: 'liabilities', unit: 'USD', instant: true, concepts: ['us-gaap:Liabilities'] },
  { key: 'equity', unit: 'USD', instant: true, concepts: ['us-gaap:StockholdersEquity'] },
  {
    key: 'cash',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:CashAndCashEquivalentsAtCarryingValue'],
  },
  {
    key: 'long_term_debt',
    unit: 'USD',
    instant: true,
    concepts: ['us-gaap:LongTermDebtNoncurrent', 'us-gaap:LongTermDebt'],
  },
  {
    key: 'shares_outstanding',
    unit: 'shares',
    instant: true,
    concepts: ['dei:EntityCommonStockSharesOutstanding'],
  },
];

/**
 * Frame periods to load at `now`: the last three calendar years and the last
 * four complete quarters for durations; the matching instant frames for
 * balance-sheet metrics (year ends as CY####Q4I).
 */
export function framePeriods(now = new Date()) {
  const y = now.getUTCFullYear();
  const q = Math.floor(now.getUTCMonth() / 3); // complete quarters this year
  const quarters = [];
  let yy = y;
  let qq = q;
  for (let i = 0; i < 4; i += 1) {
    if (qq === 0) {
      yy -= 1;
      qq = 4;
    }
    quarters.unshift(`CY${yy}Q${qq}`);
    qq -= 1;
  }
  const years = [y - 3, y - 2, y - 1].map((n) => `CY${n}`);
  const durations = [...years, ...quarters];
  const instants = [...new Set([...years.map((c) => `${c}Q4I`), ...quarters.map((c) => `${c}I`)])];
  return { durations, instants };
}

export function periodTypeOf(frame) {
  if (/I$/.test(frame)) return 'instant';
  return /Q\d$/.test(frame) ? 'quarter' : 'annual';
}

/**
 * Merge frames for one metric and period in concept order: the first concept
 * that gives a company a value wins. `frames` is [{ concept, data: frame JSON }].
 * @returns Map cik -> { cik, entityName, val, end, accn, concept }
 */
export function pickFirstConcept(frames) {
  const out = new Map();
  for (const { concept, data } of frames) {
    for (const p of data?.data || []) {
      const cik = p?.cik != null ? String(p.cik) : null;
      const v = Number(p?.val);
      if (!cik || !Number.isFinite(v) || out.has(cik)) continue;
      out.set(cik, {
        cik,
        entityName: p.entityName || null,
        val: v,
        end: p.end || null,
        accn: p.accn || null,
        concept,
      });
    }
  }
  return out;
}

/* ── Pay versus performance ────────────────────────────────────────────── */

const PVP = {
  PeoTotalCompAmt: 'peo_total_comp',
  PeoActuallyPaidCompAmt: 'peo_comp_actually_paid',
  NonPeoNeoAvgTotalCompAmt: 'non_peo_neo_avg_total_comp',
  NonPeoNeoAvgCompActuallyPaidAmt: 'non_peo_neo_avg_comp_actually_paid',
  TotalShareholderRtnAmt: 'company_tsr',
  PeerGroupTotalShareholderRtnAmt: 'peer_group_tsr',
  CoSelectedMeasureAmt: 'company_selected_measure_value',
};
export const PVP_CONCEPTS = Object.keys(PVP);

const fyOf = (end) => {
  const m = /^(\d{4})-/.exec(String(end || ''));
  return m ? Number(m[1]) : null;
};

function emptyRow(fy, peoKey) {
  return {
    fiscal_year: fy,
    peo_key: peoKey,
    peo_name: null,
    peo_total_comp: null,
    peo_comp_actually_paid: null,
    non_peo_neo_avg_total_comp: null,
    non_peo_neo_avg_comp_actually_paid: null,
    company_tsr: null,
    peer_group_tsr: null,
    net_income: null,
    company_selected_measure_name: null,
    company_selected_measure_value: null,
    accession_no: null,
  };
}

/**
 * companyfacts JSON -> PvP rows (path C2a). companyfacts carries no
 * dimensions, so there is one row per fiscal year (peo_key ''). When a fact
 * was filed more than once for the same period, the latest filing wins.
 * Returns [] when the `ecd` taxonomy is absent.
 */
export function pvpFromCompanyFacts(facts) {
  const ecd = facts?.facts?.ecd;
  if (!ecd) return [];
  const rows = new Map();
  const latest = new Map(); // `${concept}|${fy}` -> filed
  for (const [concept, col] of Object.entries(PVP)) {
    const units = ecd[concept]?.units || {};
    for (const list of Object.values(units)) {
      for (const f of list || []) {
        const fy = fyOf(f.end);
        if (!fy || !Number.isFinite(Number(f.val))) continue;
        const k = `${concept}|${fy}`;
        if (latest.has(k) && String(latest.get(k)) >= String(f.filed || '')) continue;
        latest.set(k, f.filed || '');
        if (!rows.has(fy)) rows.set(fy, emptyRow(fy, ''));
        const r = rows.get(fy);
        r[col] = Number(f.val);
        if (f.accn) r.accession_no = f.accn;
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.fiscal_year - a.fiscal_year);
}

/** ixt number formats -> Number (num-dot-decimal, num-comma-decimal, fixed-zero). */
function ixNumber(text, attrs) {
  const fmt = /format="([^"]+)"/.exec(attrs)?.[1] || '';
  let t = String(text || '')
    .replace(/<[^>]+>/g, '')
    .trim();
  if (/fixed-zero|zerodash|fixedzero/i.test(fmt) || t === '-' || t === '\u2014') return 0;
  if (/comma-decimal|numcommadecimal/i.test(fmt)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  t = t.replace(/[^0-9.]/g, '');
  if (!t) return null;
  let n = Number(t);
  if (!Number.isFinite(n)) return null;
  const scale = Number(/scale="(-?\d+)"/.exec(attrs)?.[1] || 0);
  if (scale) n *= 10 ** scale;
  if (/sign="-"/.test(attrs)) n = -n;
  return n;
}

const decode = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || null;

/** Inline XBRL contexts -> Map id -> { end, dims: { axis: member } }. */
function ixContexts(html) {
  const out = new Map();
  const re = /<xbrli:context\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/xbrli:context>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const body = m[2];
    const end =
      /<xbrli:endDate>([^<]+)</.exec(body)?.[1] ||
      /<xbrli:instant>([^<]+)</.exec(body)?.[1] ||
      null;
    const dims = {};
    const dre = /<xbrldi:explicitMember[^>]*dimension="([^"]+)"[^>]*>([^<]+)</g;
    let d;
    while ((d = dre.exec(body)) !== null) dims[d[1]] = d[2].trim();
    out.set(m[1], { end: end && end.trim(), dims });
  }
  return out;
}

/* 'cbt:SeanKeohaneMember' -> 'Sean Keohane' (used only when the filing tags no PeoName). */
const memberLabel = (member) =>
  String(member || '')
    .replace(/^[^:]*:/, '')
    .replace(/Member$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim() || null;

/**
 * Proxy inline XBRL -> PvP rows (path C2b). Facts whose context carries any
 * dimension other than ecd:IndividualAxis (adjustment breakdowns, executive
 * categories) are not table cells and are skipped. A PEO distinguished by
 * IndividualAxis gets its own row (peo_key = the member).
 */
export function pvpFromInlineXbrl(html, { accessionNo = null } = {}) {
  const doc = String(html || '');
  const ctx = ixContexts(doc);
  const rows = new Map();
  const rowFor = (fy, peoKey) => {
    const k = `${fy}|${peoKey}`;
    if (!rows.has(k)) rows.set(k, { ...emptyRow(fy, peoKey), accession_no: accessionNo });
    return rows.get(k);
  };
  const where = (ref) => {
    const c = ctx.get(ref);
    if (!c) return null;
    const axes = Object.keys(c.dims);
    if (axes.some((a) => a !== 'ecd:IndividualAxis')) return null;
    const fy = fyOf(c.end);
    return fy ? { fy, peoKey: c.dims['ecd:IndividualAxis'] || '' } : null;
  };

  const nf = /<ix:nonFraction\b([^>]*)>([\s\S]*?)<\/ix:nonFraction>/g;
  let m;
  while ((m = nf.exec(doc)) !== null) {
    const attrs = m[1];
    const name = /name="([^"]+)"/.exec(attrs)?.[1] || '';
    const ref = /contextRef="([^"]+)"/.exec(attrs)?.[1];
    const w = where(ref);
    if (!w) continue;
    const v = ixNumber(m[2], attrs);
    if (v == null) continue;
    if (name === 'us-gaap:NetIncomeLoss') rowFor(w.fy, w.peoKey).net_income = v;
    else if (name.startsWith('ecd:') && PVP[name.slice(4)])
      rowFor(w.fy, w.peoKey)[PVP[name.slice(4)]] = v;
  }

  const nn = /<ix:nonNumeric\b([^>]*)>([\s\S]*?)<\/ix:nonNumeric>/g;
  const names = [];
  let measureName = null;
  while ((m = nn.exec(doc)) !== null) {
    const attrs = m[1];
    const name = /name="([^"]+)"/.exec(attrs)?.[1] || '';
    if (name !== 'ecd:PeoName' && name !== 'ecd:CoSelectedMeasureName') continue;
    const ref = /contextRef="([^"]+)"/.exec(attrs)?.[1];
    const c = ctx.get(ref);
    const text = decode(m[2]);
    if (!text) continue;
    if (name === 'ecd:CoSelectedMeasureName') measureName = text;
    else names.push({ text, member: c?.dims['ecd:IndividualAxis'] || '', fy: fyOf(c?.end) });
  }

  // Net income and TSR are company-wide: copy them onto PEO-specific rows.
  const base = new Map([...rows.values()].filter((r) => !r.peo_key).map((r) => [r.fiscal_year, r]));
  const list = [...rows.values()];
  for (const r of list) {
    if (r.peo_key) {
      const b = base.get(r.fiscal_year);
      for (const col of [
        'company_tsr',
        'peer_group_tsr',
        'net_income',
        'company_selected_measure_value',
      ]) {
        if (r[col] == null && b?.[col] != null) r[col] = b[col];
      }
      r.peo_name = names.find((n) => n.member === r.peo_key)?.text || memberLabel(r.peo_key);
    } else {
      const own = names.filter((n) => !n.member);
      r.peo_name = own.length === 1 ? own[0].text : null;
    }
    // The selected measure is named once per proxy, for its latest year.
    r.company_selected_measure_name = r.company_selected_measure_value != null ? measureName : null;
  }
  // A company-level row whose pay sits entirely on PEO rows adds nothing.
  return list
    .filter(
      (r) =>
        r.peo_key ||
        !list.some((o) => o.peo_key && o.fiscal_year === r.fiscal_year) ||
        r.peo_total_comp != null,
    )
    .sort((a, b) => b.fiscal_year - a.fiscal_year || a.peo_key.localeCompare(b.peo_key));
}

/** dei facts from a proxy's inline XBRL. */
export function ixDei(html) {
  const get = (n) => {
    const m = new RegExp(
      `<ix:nonNumeric\\b[^>]*name="dei:${n}"[^>]*>([\\s\\S]*?)</ix:nonNumeric>`,
    ).exec(String(html || ''));
    return m ? decode(m[1]) : null;
  };
  return { entityName: get('EntityRegistrantName'), cik: get('EntityCentralIndexKey') };
}

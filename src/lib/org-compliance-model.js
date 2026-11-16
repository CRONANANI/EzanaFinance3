/**
 * Compliance (/org-team-hub/compliance): the pure model.
 *
 * One place for what the investment policy rules mean and how they are read:
 * the nine rule types, how each is actually checked today, the rule engine the
 * check route runs (a proposed idea, or current holdings), sector headroom,
 * plain names for the activity log, and the sample-content actions. No React,
 * no fetch, no server imports, so the route, the page and the tests share it.
 *
 * Honesty rule for every string here: say what the code does. Nothing on the
 * page stops a trade, nothing runs on a schedule, and the cash floor is never
 * read. A rule is only described as checked when a code path checks it.
 */

export const NA = 'N/A';

export const RULE_TYPES = [
  'max_position_pct',
  'max_sector_pct',
  'min_positions',
  'max_positions',
  'prohibited_ticker',
  'prohibited_sector',
  'min_market_cap',
  'max_single_trade_pct',
  'cash_floor_pct',
];

/*
 * How each rule is checked in the code today.
 *   pitch:    checked when a pitch is submitted (the pitch form sends the
 *             ticker and, when given, the proposed size; nothing else)
 *   pitchSize: checked at pitch submission only when a size is given
 *   idea:     only when someone runs the idea check with that field filled in
 *   holdings: only read against holdings when this page loads
 *   recorded: never checked anywhere
 * `field` is the key the rule value is stored under; `needs` lists the idea
 * check inputs the rule needs before it can be tested.
 */
export const RULE_META = {
  max_position_pct: {
    label: 'Max single position',
    field: 'pct',
    unit: '%',
    placeholder: '10',
    checked: 'pitchSize',
    needs: ['sizePct'],
  },
  max_sector_pct: {
    label: 'Max sector exposure',
    field: 'pct',
    unit: '%',
    placeholder: '35',
    checked: 'idea',
    needs: ['sector'],
  },
  max_single_trade_pct: {
    label: 'Max single trade',
    field: 'pct',
    unit: '%',
    placeholder: '5',
    checked: 'pitchSize',
    needs: ['sizePct'],
  },
  cash_floor_pct: {
    label: 'Cash floor',
    field: 'pct',
    unit: '%',
    placeholder: '2',
    checked: 'recorded',
    needs: null,
  },
  min_positions: {
    label: 'Min positions',
    field: 'min',
    unit: '',
    placeholder: '8',
    checked: 'holdings',
    needs: null,
  },
  max_positions: {
    label: 'Max positions',
    field: 'max',
    unit: '',
    placeholder: '20',
    checked: 'pitch',
    needs: ['ticker'],
  },
  min_market_cap: {
    label: 'Min market cap',
    field: 'value',
    unit: '$',
    placeholder: '5000000000',
    checked: 'idea',
    needs: ['marketCap'],
  },
  prohibited_ticker: {
    label: 'Prohibited ticker',
    field: 'ticker',
    unit: '',
    placeholder: 'MO',
    checked: 'pitch',
    needs: ['ticker'],
  },
  prohibited_sector: {
    label: 'Prohibited sector',
    field: 'sector',
    unit: '',
    placeholder: 'Tobacco',
    checked: 'idea',
    needs: ['sector'],
  },
};

export const CHECKED_TEXT = {
  pitch: 'Checked when a pitch is submitted',
  pitchSize: 'Checked when a pitch with a size is submitted',
  idea: 'Checked only in the idea check',
  holdings: 'Read from holdings on this page only',
  recorded: 'Recorded only, not checked',
};

const NEEDS_TEXT = {
  ticker: 'a ticker',
  sector: 'a sector',
  sizePct: 'a proposed size',
  marketCap: 'a market cap',
};

export const isHardRule = (rule) => (rule?.rule_value?.severity || 'warning') === 'block';
export const isHardBreach = (v) => v?.severity === 'block';
export const severityWord = (hard) => (hard ? 'hard' : 'soft');

const num = (v) => (v == null || v === '' ? null : Number(v));

/** "$5B", "$750M", "$1,200" for a dollar amount. */
export function fmtDollars(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return NA;
  const abs = Math.abs(n);
  const trim = (x) => String(Number(x.toFixed(2)));
  if (abs >= 1e12) return `$${trim(n / 1e12)}T`;
  if (abs >= 1e9) return `$${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `$${trim(n / 1e6)}M`;
  return `$${n.toLocaleString('en-US')}`;
}

export const fmtPct = (v, digits = 1) =>
  v == null || !Number.isFinite(Number(v)) ? NA : `${Number(v).toFixed(digits)}%`;

/** The stored value of a rule, written for people: "35%", "20", "$5B", "MO". */
export function ruleValueText(rule) {
  const meta = RULE_META[rule?.rule_type];
  const v = rule?.rule_value || {};
  if (!meta) return NA;
  const raw = v[meta.field];
  if (raw == null || raw === '') return NA;
  if (meta.unit === '%') return `${Number(raw)}%`;
  if (meta.unit === '$') return fmtDollars(raw);
  return String(raw);
}

/** A rule's name: the stored label, else the type plus its value. */
export function ruleLabel(rule) {
  if (rule?.label) return rule.label;
  const meta = RULE_META[rule?.rule_type];
  if (!meta) return rule?.rule_type || 'Rule';
  const value = ruleValueText(rule);
  return value === NA ? meta.label : `${meta.label} ${value}`;
}

export const checkedText = (rule) =>
  CHECKED_TEXT[RULE_META[rule?.rule_type]?.checked] || CHECKED_TEXT.recorded;

/* ── Rule form (add rule dialog) ─────────────────────────────────────────── */

export const blankRuleForm = () => ({
  rule_type: 'max_position_pct',
  value: '',
  severity: 'warning',
});

/** Problems with a rule form, keyed by field. Empty object when it is fine. */
export function validateRuleForm(form) {
  const errors = {};
  const meta = RULE_META[form?.rule_type];
  if (!meta) {
    errors.rule_type = 'Choose a rule type.';
    return errors;
  }
  const raw = String(form.value ?? '').trim();
  if (!raw) {
    errors.value = 'Enter a value.';
  } else if (['pct', 'min', 'max', 'value'].includes(meta.field)) {
    const n = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) errors.value = 'Enter a number of zero or more.';
    else if (meta.unit === '%' && n > 100) errors.value = 'Enter a percentage up to 100.';
    else if ((meta.field === 'min' || meta.field === 'max') && !Number.isInteger(n))
      errors.value = 'Enter a whole number.';
  } else if (raw.length > 60) {
    errors.value = 'Keep it to 60 characters.';
  }
  if (!['warning', 'block'].includes(form.severity)) errors.severity = 'Choose a severity.';
  return errors;
}

/** The body POST /api/org/ips/rules expects, built the way the old editor built it. */
export function ruleBody(form) {
  const meta = RULE_META[form.rule_type];
  const raw = String(form.value).trim();
  const isNumeric = ['pct', 'min', 'max', 'value'].includes(meta.field);
  const stored = isNumeric
    ? Number(raw.replace(/,/g, ''))
    : meta.field === 'ticker'
      ? raw.toUpperCase()
      : raw;
  const rule_value = { [meta.field]: stored, severity: form.severity };
  const label = ruleLabel({ rule_type: form.rule_type, rule_value });
  return { rule_type: form.rule_type, rule_value, label };
}

/* ── The rule engine (shared with POST /api/org/ips/check) ───────────────── */

/**
 * Holdings summary from the council's position book. Market value
 * (current_value) throughout, the same figure the engine has always used.
 */
export function holdingsSummary(positions = []) {
  const list = positions || [];
  const totalValue = list.reduce((s, p) => s + (Number(p.current_value) || 0), 0);
  const sectorValue = {};
  for (const p of list) {
    if (p.sector)
      sectorValue[p.sector] = (sectorValue[p.sector] || 0) + (Number(p.current_value) || 0);
  }
  const unclassified = list
    .filter((p) => !p.sector)
    .reduce((s, p) => s + (Number(p.current_value) || 0), 0);
  const sectors = Object.entries(sectorValue)
    .map(([sector, value]) => ({ sector, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);
  if (unclassified > 0 && totalValue > 0)
    sectors.push({
      sector: 'Unclassified',
      pct: (unclassified / totalValue) * 100,
      unclassified: true,
    });
  let largest = null;
  if (totalValue > 0) {
    for (const p of list) {
      const pct = ((Number(p.current_value) || 0) / totalValue) * 100;
      if (!largest || pct > largest.pct)
        largest = { ticker: (p.ticker_symbol || p.ticker || '').toUpperCase() || null, pct };
    }
  }
  return { totalValue, sectorValue, sectors, largest, positionCount: list.length };
}

/**
 * Evaluate a proposed idea against active rules. Identical to the engine the
 * check route has always run: same hits, same sentences, same severities.
 * Returns { passed, blocked, violations: [{ rule_id, rule_type, severity, detail }] }.
 */
export function evaluateProposal({
  rules = [],
  positions = [],
  ticker: rawTicker,
  sector: rawSector,
  sizePct: rawSize,
  marketCap: rawCap,
}) {
  const ticker = (rawTicker || '').toUpperCase().trim();
  const sector = rawSector || null;
  const sizePct = num(rawSize);
  const marketCap = num(rawCap);
  const { totalValue, sectorValue } = holdingsSummary(positions);
  const alreadyHeld = (positions || []).some(
    (p) => (p.ticker_symbol || '').toUpperCase() === ticker,
  );
  const positionCount = (positions || []).length;
  const violations = [];
  const sev = (rule) => (rule.rule_value?.severity === 'block' ? 'block' : 'warning');

  for (const rule of rules || []) {
    if (rule.is_active === false) continue;
    const v = rule.rule_value || {};
    const pct = num(v.pct);
    let hit = null;
    switch (rule.rule_type) {
      case 'prohibited_ticker':
        if (v.ticker && ticker && String(v.ticker).toUpperCase() === ticker) {
          hit = `${ticker} is on the prohibited-securities list.`;
        }
        break;
      case 'prohibited_sector':
        if (v.sector && sector && v.sector === sector) {
          hit = `${sector} is a prohibited sector.`;
        }
        break;
      case 'max_position_pct':
        if (pct != null && sizePct != null && sizePct > pct) {
          hit = `Proposed ${sizePct}% exceeds the ${pct}% single-position limit.`;
        }
        break;
      case 'max_single_trade_pct':
        if (pct != null && sizePct != null && sizePct > pct) {
          hit = `Trade size ${sizePct}% exceeds the ${pct}% single-trade limit.`;
        }
        break;
      case 'max_sector_pct': {
        if (pct != null && sector && totalValue > 0) {
          const curPct = ((sectorValue[sector] || 0) / totalValue) * 100;
          const projected = curPct + (sizePct || 0);
          if (projected > pct) {
            hit = `${sector} would reach ${projected.toFixed(1)}%, over the ${pct}% sector cap.`;
          }
        }
        break;
      }
      case 'max_positions':
        if (v.max != null && !alreadyHeld && positionCount + 1 > Number(v.max)) {
          hit = `Adding ${ticker} would exceed the ${v.max}-position maximum.`;
        }
        break;
      case 'min_market_cap':
        if (v.value != null && marketCap != null && marketCap < Number(v.value)) {
          hit = `${ticker} market cap is below the minimum of ${v.value}.`;
        }
        break;
      default:
        /* min_positions and cash_floor_pct are not tested against one idea. */
        break;
    }
    if (hit) {
      violations.push({
        rule_id: rule.id,
        rule_type: rule.rule_type,
        severity: sev(rule),
        detail: rule.label ? `${rule.label}: ${hit}` : hit,
      });
    }
  }
  const blocked = violations.some((x) => x.severity === 'block');
  return { passed: !blocked, blocked, violations };
}

/**
 * Read current holdings against each active rule (portfolio mode of the
 * check route). Logs nothing. status: 'ok' | 'warn' | 'bad' | 'none', where
 * 'none' means the rule is not read from holdings at all.
 */
export function evaluateHoldings({ rules = [], positions = [] }) {
  const h = holdingsSummary(positions);
  const { totalValue, sectorValue, positionCount } = h;
  const list = positions || [];
  const maxOf = (arr) => (arr.length ? Math.max(...arr) : 0);
  const ruleStatus = (rules || [])
    .filter((r) => r.is_active !== false)
    .map((rule) => {
      const v = rule.rule_value || {};
      const p = num(v.pct);
      let status = 'ok';
      let detail = 'Within policy.';
      switch (rule.rule_type) {
        case 'max_position_pct':
          if (p != null && totalValue > 0) {
            const top = maxOf(list.map((x) => ((Number(x.current_value) || 0) / totalValue) * 100));
            detail = `Largest position ${top.toFixed(1)}% of ${p}% limit.`;
            if (top > p) {
              status = 'bad';
              detail = `Largest position ${top.toFixed(1)}% exceeds ${p}% limit.`;
            } else if (top > p * 0.9) status = 'warn';
          } else {
            status = 'none';
            detail = 'No holdings to read.';
          }
          break;
        case 'max_sector_pct':
          if (p != null && totalValue > 0) {
            const top = maxOf(Object.values(sectorValue).map((val) => (val / totalValue) * 100));
            detail = `Largest sector ${top.toFixed(1)}% of ${p}% cap.`;
            if (top > p) {
              status = 'bad';
              detail = `A sector is ${top.toFixed(1)}%, over the ${p}% cap.`;
            } else if (top > p * 0.9) status = 'warn';
          } else {
            status = 'none';
            detail = 'No holdings to read.';
          }
          break;
        case 'max_positions':
          if (v.max != null && positionCount > Number(v.max)) {
            status = 'bad';
            detail = `${positionCount} positions exceed the ${v.max} max.`;
          } else detail = `${positionCount} of ${v.max ?? NA} positions.`;
          break;
        case 'min_positions':
          if (v.min != null && positionCount < Number(v.min)) {
            status = 'bad';
            detail = `${positionCount} positions below the ${v.min} minimum.`;
          } else detail = `${positionCount} positions (min ${v.min ?? NA}).`;
          break;
        case 'prohibited_ticker':
          if (
            v.ticker &&
            list.some(
              (x) => (x.ticker_symbol || '').toUpperCase() === String(v.ticker).toUpperCase(),
            )
          ) {
            status = 'bad';
            detail = `Currently holding prohibited ${v.ticker}.`;
          } else detail = `${v.ticker || NA} not held.`;
          break;
        case 'prohibited_sector':
          if (v.sector && list.some((x) => x.sector === v.sector)) {
            status = 'bad';
            detail = `Holding in prohibited ${v.sector}.`;
          } else detail = `No ${v.sector || NA} exposure.`;
          break;
        default:
          status = 'none';
          detail = 'Not read from holdings.';
      }
      return { rule_id: rule.id, rule_type: rule.rule_type, label: rule.label, status, detail };
    });
  return {
    mode: 'portfolio',
    ruleStatus,
    totalValue,
    positionCount,
    sectors: h.sectors,
    largest: h.largest,
  };
}

/* ── Readings for the rules table ────────────────────────────────────────── */

/** The lowest active sector cap, or null. */
export function sectorCap(rules = []) {
  const caps = (rules || [])
    .filter((r) => r.is_active !== false && r.rule_type === 'max_sector_pct')
    .map((r) => Number(r.rule_value?.pct))
    .filter((n) => Number.isFinite(n));
  return caps.length ? Math.min(...caps) : null;
}

/**
 * One rule's current reading against holdings, for the table.
 * { reading: string, mono: boolean, status: 'within'|'near'|'over'|'below'|'held'|'na'|'recorded' }
 */
export function ruleReading(rule, holdings) {
  const meta = RULE_META[rule.rule_type];
  if (!meta) return { reading: NA, status: 'na' };
  if (meta.checked === 'recorded')
    return { reading: 'Recorded only, not checked', status: 'recorded' };
  if (rule.rule_type === 'min_market_cap' || rule.rule_type === 'max_single_trade_pct')
    return { reading: 'Applies to new ideas only', status: 'na' };
  if (!holdings) return { reading: NA, status: 'na', mono: true };
  const st = (holdings.ruleStatus || []).find((s) => s.rule_id === rule.id);
  if (!st || st.status === 'none') return { reading: 'No holdings to read', status: 'na' };
  const v = rule.rule_value || {};
  const word =
    st.status === 'ok'
      ? 'within'
      : st.status === 'warn'
        ? 'near'
        : rule.rule_type === 'min_positions'
          ? 'below'
          : rule.rule_type.startsWith('prohibited')
            ? 'held'
            : 'over';
  switch (rule.rule_type) {
    case 'max_position_pct': {
      const l = holdings.largest;
      return {
        reading: l ? `${l.ticker || 'Largest'} ${fmtPct(l.pct)} / ${Number(v.pct)}%` : NA,
        mono: true,
        status: word,
      };
    }
    case 'max_sector_pct': {
      const top = (holdings.sectors || []).find((s) => !s.unclassified);
      return {
        reading: top ? `${top.sector} ${fmtPct(top.pct)} / ${Number(v.pct)}%` : NA,
        mono: true,
        status: word,
      };
    }
    case 'max_positions':
      return { reading: `${holdings.positionCount} / ${v.max ?? NA}`, mono: true, status: word };
    case 'min_positions':
      return { reading: `${holdings.positionCount} / ${v.min ?? NA}`, mono: true, status: word };
    case 'prohibited_ticker':
      return {
        reading: word === 'held' ? `${v.ticker} is held` : `${v.ticker || NA} not held`,
        status: word,
      };
    case 'prohibited_sector':
      return {
        reading: word === 'held' ? `${v.sector} is held` : `No ${v.sector || NA} holdings`,
        status: word,
      };
    default:
      return { reading: NA, status: 'na' };
  }
}

export const STATUS_TEXT = {
  within: 'within',
  near: 'near limit',
  over: 'over',
  below: 'below',
  held: 'held',
  na: NA,
  recorded: 'recorded only',
};

/** Sector headroom rows against the lowest active cap. */
export function headroomRows(holdings, cap) {
  return (holdings?.sectors || []).map((s) => {
    const over = cap != null && s.pct > cap;
    return {
      ...s,
      cap,
      over,
      gap: cap == null ? null : Math.abs(cap - s.pct),
    };
  });
}

export const sectorsOverCap = (holdings, cap) =>
  cap == null || !holdings
    ? null
    : (holdings.sectors || []).filter((s) => !s.unclassified && s.pct > cap).length;

/* ── Idea check results ──────────────────────────────────────────────────── */

/**
 * Turn an engine result into per-rule rows for the page: every active rule,
 * grouped hard, soft and not tested. A rule whose inputs were left blank reads
 * "not tested", never "no breach".
 */
export function ideaRows(rules = [], inputs = {}, result = null) {
  const active = (rules || []).filter((r) => r.is_active !== false);
  const hit = new Map((result?.violations || []).map((v) => [v.rule_id, v]));
  const filled = {
    ticker: Boolean(String(inputs.ticker || '').trim()),
    sector: Boolean(String(inputs.sector || '').trim()),
    sizePct: String(inputs.sizePct ?? '').trim() !== '',
    marketCap: String(inputs.marketCap ?? '').trim() !== '',
  };
  const rows = active.map((rule) => {
    const meta = RULE_META[rule.rule_type] || {};
    const hard = isHardRule(rule);
    if (!meta.needs) {
      return {
        rule,
        hard,
        group: 'portfolio',
        state: 'untested',
        detail:
          meta.checked === 'recorded'
            ? 'Recorded only, not checked.'
            : 'Not tested against one idea.',
      };
    }
    const missing = meta.needs.filter((k) => !filled[k]);
    if (hit.has(rule.id)) {
      return {
        rule,
        hard,
        group: hard ? 'hard' : 'soft',
        state: 'breach',
        detail: hit.get(rule.id).detail,
      };
    }
    if (missing.length) {
      return {
        rule,
        hard,
        group: hard ? 'hard' : 'soft',
        state: 'untested',
        detail: `Not tested: needs ${missing.map((k) => NEEDS_TEXT[k]).join(' and ')}.`,
      };
    }
    return {
      rule,
      hard,
      group: hard ? 'hard' : 'soft',
      state: 'clear',
      detail: 'No breach for these inputs.',
    };
  });
  const counts = {
    hard: rows.filter((r) => r.state === 'breach' && r.hard).length,
    soft: rows.filter((r) => r.state === 'breach' && !r.hard).length,
    untested: rows.filter((r) => r.state === 'untested').length,
  };
  return { rows, counts };
}

export function ideaSummary(counts) {
  const parts = [];
  if (counts.hard) parts.push(`${counts.hard} hard`);
  if (counts.soft) parts.push(`${counts.soft} soft`);
  const head = parts.length
    ? `Rules these inputs would breach: ${parts.join(', ')}.`
    : 'No rule is breached by these inputs.';
  return `${head} This check saves nothing.`;
}

/* ── Dates ───────────────────────────────────────────────────────────────── */

export function fmtDay(ts) {
  if (!ts) return NA;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtStamp(ts) {
  if (!ts) return NA;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return NA;
  const day = fmtDay(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${hh}:${mm}`;
}

export const SOURCE_TEXT = { pitch: 'Pitch', trade: 'Trade', portfolio: 'Portfolio' };

/* ── Activity log ────────────────────────────────────────────────────────── */

const ACTION_NAMES = {
  ips_rule_added: 'Rule added',
  ips_rule_enabled: 'Rule enabled',
  ips_rule_disabled: 'Rule disabled',
  ips_rule_deleted: 'Rule deleted',
  ips_breach_resolved: 'Breach resolved',
  ips_breach_reopened: 'Breach reopened',
  role_changed: 'Role changed',
  member_updated: 'Member updated',
  member_invited: 'Member invited',
  invite_accepted: 'Invitation accepted',
  applicant_provisioned: 'Applicant added as member',
  branding_updated: 'Branding updated',
  cohort_archived: 'Cohort archived',
  fund_config_updated: 'Fund settings updated',
  governance_updated: 'Governance updated',
  sonar_budget_updated: 'Sonar budget updated',
  sonar_report_saved: 'Sonar report saved',
  student_data_exported: 'Student records exported',
  permission_grant: 'Permission granted',
  permission_granted: 'Permission granted',
  permission_revoke: 'Permission removed',
  permission_revoked: 'Permission removed',
};

const sentence = (s) => {
  const t = String(s || '')
    .replace(/_/g, ' ')
    .trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : NA;
};

/** A plain name for a stored action code. */
export function actionName(code) {
  if (!code) return NA;
  if (ACTION_NAMES[code]) return ACTION_NAMES[code];
  if (code.startsWith('sonar_report_')) return `Sonar report ${code.slice(13).replace(/_/g, ' ')}`;
  if (code.startsWith('permission_')) return `Permission ${code.slice(11).replace(/_/g, ' ')}`;
  return sentence(code);
}

const TARGET_NAMES = {
  member: 'Member',
  org: 'Council',
  ips_rule: 'Rule',
  ips_violation: 'Breach',
  cohort: 'Cohort',
  applicant: 'Applicant',
  invite: 'Invitation',
  sonar_report: 'Sonar report',
};

const asObject = (detail) => {
  if (!detail) return null;
  if (typeof detail === 'object') return detail;
  if (typeof detail === 'string') {
    try {
      const o = JSON.parse(detail);
      return o && typeof o === 'object' ? o : null;
    } catch {
      return null;
    }
  }
  return null;
};

/** A plain target: "Rule: Max sector exposure 35%", "Breach: MO", "Member". */
export function targetText(entry) {
  const type = entry?.target_type;
  const d = asObject(entry?.detail);
  const name = d?.label || d?.ticker || null;
  const base = type ? TARGET_NAMES[type] || sentence(type) : null;
  if (base && name) return `${base}: ${name}`;
  return base || name || NA;
}

const KEY_NAMES = {
  severity: 'Severity',
  reason: 'Reason',
  fields: 'Fields',
  permissionKey: 'Permission',
  role: 'Role',
  rule: 'Rule',
  active: 'Active',
  status: 'Status',
};

const valueText = (k, v) => {
  if (v == null || v === '') return null;
  if (k === 'severity') return v === 'block' ? 'hard' : v === 'warning' ? 'soft' : String(v);
  if (Array.isArray(v)) return v.map((x) => sentence(x).toLowerCase()).join(', ') || null;
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'object') return null;
  const t = String(v);
  return /^[a-z]+(_[a-z]+)+$/.test(t) ? t.replace(/_/g, ' ') : t;
};

/** Structured audit detail drawn as one short line of text, never an object. */
export function detailText(detail) {
  if (detail == null || detail === '') return NA;
  const d = asObject(detail);
  if (!d) return typeof detail === 'string' ? detail : NA;
  const parts = [];
  for (const [k, v] of Object.entries(d)) {
    if (k === 'label' || k === 'ticker') continue;
    const val = valueText(k, v);
    if (val == null) continue;
    parts.push(`${KEY_NAMES[k] || sentence(k)}: ${val}`);
    if (parts.length === 3) break;
  }
  return parts.length ? parts.join('. ') : NA;
}

/* ── Sample content actions (applied on the page, never sent) ────────────── */

const clone = (b) => ({
  ...b,
  rules: [...(b.rules || [])],
  violations: [...(b.violations || [])],
  resolved: [...(b.resolved || [])],
  activity: [...(b.activity || [])],
});

/**
 * Apply an action to the sample bundle with the same checks the routes make.
 * Returns { ok, bundle, error }.
 */
export function applySampleAction(
  bundle,
  action,
  { role, actorName = 'You', now = Date.now() } = {},
) {
  const b = clone(bundle);
  const isExec = role === 'executive';
  const isManager = isExec || role === 'portfolio_manager';
  const stamp = new Date(now).toISOString();
  const log = (code, targetType, detail) =>
    b.activity.unshift({
      id: `sample-activity-${b.activity.length + 1}-${now}`,
      actor_name: actorName,
      action: code,
      target_type: targetType,
      detail,
      created_at: stamp,
      is_demo: true,
    });
  switch (action.type) {
    case 'add': {
      if (!isExec) return { ok: false, error: 'Executive role required' };
      const errors = validateRuleForm(action.form);
      if (Object.keys(errors).length) return { ok: false, error: Object.values(errors)[0] };
      const body = ruleBody(action.form);
      const rule = {
        id: `sample-rule-new-${b.rules.length + 1}-${now}`,
        ...body,
        is_active: true,
        created_at: stamp,
        is_demo: true,
      };
      b.rules.push(rule);
      log('ips_rule_added', 'ips_rule', { label: rule.label, severity: body.rule_value.severity });
      return { ok: true, bundle: b };
    }
    case 'toggle': {
      if (!isExec) return { ok: false, error: 'Executive role required' };
      const i = b.rules.findIndex((r) => r.id === action.id);
      if (i < 0) return { ok: false, error: 'Rule not found' };
      const next = { ...b.rules[i], is_active: !b.rules[i].is_active };
      b.rules[i] = next;
      log(next.is_active ? 'ips_rule_enabled' : 'ips_rule_disabled', 'ips_rule', {
        label: ruleLabel(next),
      });
      return { ok: true, bundle: b };
    }
    case 'delete': {
      if (!isExec) return { ok: false, error: 'Executive role required' };
      const rule = b.rules.find((r) => r.id === action.id);
      if (!rule) return { ok: false, error: 'Rule not found' };
      b.rules = b.rules.filter((r) => r.id !== action.id);
      log('ips_rule_deleted', 'ips_rule', { label: ruleLabel(rule) });
      return { ok: true, bundle: b };
    }
    case 'resolve': {
      if (!isManager) return { ok: false, error: 'Manager role required' };
      const v = b.violations.find((x) => x.id === action.id);
      if (!v) return { ok: false, error: 'Breach not found' };
      const reason = String(action.reason || '').trim();
      b.violations = b.violations.filter((x) => x.id !== action.id);
      b.resolved.unshift({
        ...v,
        resolved: true,
        resolved_at: stamp,
        resolved_by_name: actorName,
        resolution_reason: reason || null,
      });
      log('ips_breach_resolved', 'ips_violation', {
        ticker: v.ticker || null,
        ...(reason ? { reason } : {}),
      });
      return { ok: true, bundle: b };
    }
    default:
      return { ok: false, error: 'Unknown action' };
  }
}

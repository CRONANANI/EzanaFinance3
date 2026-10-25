#!/usr/bin/env node
/* QA RET-8: every key written to (or column read from) the legacy Plaid tables
   must be a real live column. The Plaid connect flow used to upsert `name`,
   `type`, `ticker`, `price`, `value` ... which do not exist, ignored the
   errors and returned success.

   LIVE_COLUMNS is the oracle: it was copied from information_schema on the
   production project (read-only) and must only change together with a
   migration that changes the table.

   Checks:
   1. Static: every object literal written to these tables in src/ (directly
      via .from('plaid_x').insert/upsert/update({...}) or tagged with a
      `// plaid-row: <table>` comment) uses only live keys.
   2. Static: explicit .select('a, b') / .order('c') column names in a
      .from('plaid_x') chain are live (embedded relations are checked too).
   3. Static: a non-literal write payload must come from @/lib/plaid-rows.
   4. Dynamic: the row builders in src/lib/plaid-rows.js produce only live
      keys and use the real unique keys as onConflict targets.

   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-plaid-columns.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  toPlaidAccountRow,
  toPlaidHoldingRows,
  normalizePlaidHolding,
  PLAID_ACCOUNTS_CONFLICT,
  PLAID_HOLDINGS_CONFLICT,
} from '../src/lib/plaid-rows.js';

export const LIVE_COLUMNS = {
  plaid_accounts: [
    'id',
    'user_id',
    'plaid_item_id',
    'account_id',
    'account_name',
    'official_name',
    'account_type',
    'account_subtype',
    'account_mask',
    'balance_current',
    'balance_available',
    'balance_limit',
    'currency',
    'created_at',
    'updated_at',
  ],
  plaid_holdings: [
    'id',
    'user_id',
    'account_id',
    'security_id',
    'ticker_symbol',
    'security_name',
    'security_type',
    'quantity',
    'price_per_share',
    'total_value',
    'cost_basis',
    'currency',
    'synced_at',
  ],
  // Only used to validate embedded selects such as plaid_items (institution_name).
  plaid_items: [
    'id',
    'user_id',
    'item_id',
    'access_token',
    'institution_id',
    'institution_name',
    'institution_logo',
    'status',
    'error_code',
    'consent_expiration',
    'created_at',
    'updated_at',
    'last_webhook_code',
  ],
};
// Live unique constraints (pg_constraint): plaid_accounts_account_id_key,
// plaid_holdings_user_ticker_unique.
const UNIQUE_KEYS = {
  plaid_accounts: ['account_id'],
  plaid_holdings: ['user_id', 'ticker_symbol'],
};
const CHECKED = ['plaid_accounts', 'plaid_holdings'];

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(m?js|jsx|ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** Index just past the bracket matching the one at `open`, skipping strings and comments. */
function matchBracket(s, open) {
  const pairs = { '{': '}', '(': ')', '[': ']' };
  const stack = [pairs[s[open]]];
  let i = open + 1;
  while (i < s.length && stack.length) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') {
      i = s.indexOf('\n', i);
      if (i < 0) return s.length;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      i = s.indexOf('*/', i) + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      i += 1;
      while (i < s.length && s[i] !== c) {
        if (s[i] === '\\') i += 1;
        else if (c === '`' && s[i] === '$' && s[i + 1] === '{') {
          i = matchBracket(s, i + 1) - 1;
        }
        i += 1;
      }
      i += 1;
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === stack[stack.length - 1]) stack.pop();
    i += 1;
  }
  return i;
}

/** Top-level keys of the object literal starting at `open` (a `{`). */
export function objectKeys(s, open) {
  const end = matchBracket(s, open) - 1;
  const keys = [];
  let i = open + 1;
  let atEntryStart = true;
  while (i < end) {
    const c = s[i];
    if (c === '/' && (s[i + 1] === '/' || s[i + 1] === '*')) {
      i = s[i + 1] === '/' ? s.indexOf('\n', i) : s.indexOf('*/', i) + 2;
      continue;
    }
    if ('{([`\'"'.includes(c)) {
      i = nextAfter(s, i);
      atEntryStart = false;
      continue;
    }
    if (c === ',') {
      atEntryStart = true;
      i += 1;
      continue;
    }
    if (atEntryStart && /[A-Za-z_$]/.test(c)) {
      const m = /^([A-Za-z_$][\w$]*)\s*(:|,|\}|$)/.exec(s.slice(i, end + 1));
      if (m) keys.push(m[1]);
      else {
        const spread = /^\.\.\./.test(s.slice(i));
        if (!spread) keys.push(`<unparsed:${s.slice(i, i + 20)}>`);
      }
      atEntryStart = false;
    } else if (atEntryStart && s.startsWith('...', i)) {
      keys.push('<spread>');
      atEntryStart = false;
    }
    i += 1;
  }
  return keys;
}

function nextAfter(s, i) {
  const c = s[i];
  if ('\'"`'.includes(c)) {
    let j = i + 1;
    while (j < s.length && s[j] !== c) {
      if (s[j] === '\\') j += 1;
      j += 1;
    }
    return j + 1;
  }
  return matchBracket(s, i);
}

/** Column names in a PostgREST select string, with embedded relations recursed. */
export function selectColumns(sel, table, out = []) {
  let depth = 0;
  let cur = '';
  const parts = [];
  for (const ch of sel) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  for (const raw of parts) {
    const p = raw.trim();
    if (!p || p === '*') continue;
    const emb = /^([\w]+)(?:!\w+)?\s*\(([\s\S]*)\)$/.exec(p);
    if (emb) {
      if (LIVE_COLUMNS[emb[1]]) selectColumns(emb[2], emb[1], out);
      continue;
    }
    const col = p.split(':').pop().split('::')[0].trim();
    out.push({ table, col });
  }
  return out;
}

function scanFile(file) {
  const s = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  const problems = [];
  const seen = { writes: 0, reads: 0 };

  // Tagged literals: `// plaid-row: <table>` followed by an object literal.
  for (const m of s.matchAll(/\/\/\s*plaid-row:\s*(\w+)/g)) {
    const table = m[1];
    const open = s.indexOf('{', m.index);
    seen.writes += 1;
    for (const k of objectKeys(s, open)) {
      if (!LIVE_COLUMNS[table]?.includes(k)) problems.push(`${rel}: ${table} row key "${k}"`);
    }
  }

  for (const m of s.matchAll(/\.from\(\s*['"`](plaid_accounts|plaid_holdings)['"`]\s*\)/g)) {
    const table = m[1];
    // The chain ends at the first `;` at depth 0 after .from(...).
    let i = m.index + m[0].length;
    const chainStart = i;
    while (i < s.length && s[i] !== ';') {
      if ('({['.includes(s[i])) i = matchBracket(s, i);
      else if ('\'"`'.includes(s[i])) i = nextAfter(s, i);
      else i += 1;
    }
    const chain = s.slice(chainStart, i);

    for (const w of chain.matchAll(/\.(insert|upsert|update)\(\s*/g)) {
      seen.writes += 1;
      const argAt = chainStart + w.index + w[0].length;
      const first = s[argAt];
      const literalAt = first === '[' ? s.indexOf('{', argAt) : first === '{' ? argAt : -1;
      if (literalAt >= 0) {
        for (const k of objectKeys(s, literalAt)) {
          if (!LIVE_COLUMNS[table].includes(k)) problems.push(`${rel}: ${table} write key "${k}"`);
        }
      } else if (!/from\s+['"]@\/lib\/plaid-rows['"]/.test(s)) {
        problems.push(
          `${rel}: ${table} ${w[1]} payload is not a literal and the file does not build it with @/lib/plaid-rows`,
        );
      }
      const oc = /onConflict:\s*['"`]([^'"`]+)['"`]/.exec(chain.slice(w.index));
      if (oc) {
        const cols = oc[1].split(',').map((c) => c.trim());
        if (cols.join(',') !== UNIQUE_KEYS[table].join(',')) {
          problems.push(`${rel}: ${table} onConflict "${oc[1]}" is not a live unique key`);
        }
      }
    }
    for (const r of chain.matchAll(/\.select\(\s*(['"`])([\s\S]*?)\1/g)) {
      seen.reads += 1;
      for (const { table: t, col } of selectColumns(r[2], table)) {
        if (!LIVE_COLUMNS[t].includes(col)) problems.push(`${rel}: ${t} select column "${col}"`);
      }
    }
    for (const o of chain.matchAll(/\.(order|eq|neq|gt|gte|lt|lte|in|is)\(\s*['"`](\w+)['"`]/g)) {
      if (!LIVE_COLUMNS[table].includes(o[2]))
        problems.push(`${rel}: ${table} .${o[1]}() column "${o[2]}"`);
    }
  }
  return { problems, seen };
}

test('every write/read of plaid_accounts and plaid_holdings in src/ uses live columns', () => {
  const problems = [];
  let writes = 0;
  let reads = 0;
  for (const f of walk(SRC)) {
    const r = scanFile(f);
    problems.push(...r.problems);
    writes += r.seen.writes;
    reads += r.seen.reads;
  }
  assert.ok(writes >= 4, `expected to find the Plaid writes (found ${writes})`);
  assert.ok(reads >= 4, `expected to find the Plaid reads (found ${reads})`);
  assert.deepEqual(problems, [], `unknown Plaid columns:\n  ${problems.join('\n  ')}`);
});

test('the scanner catches a non-existent key (self-test)', () => {
  const src = `x.from('plaid_holdings').upsert({ user_id: 1, ticker: 'A', value: 2 }, { onConflict: 'user_id,ticker_symbol' });`;
  const open = src.indexOf('{');
  assert.deepEqual(objectKeys(src, open), ['user_id', 'ticker', 'value']);
  const cols = selectColumns(
    '*, plaid_accounts (name, account_type, plaid_items (institution_name))',
    'plaid_holdings',
  );
  assert.deepEqual(
    cols.map((c) => `${c.table}.${c.col}`),
    ['plaid_accounts.name', 'plaid_accounts.account_type', 'plaid_items.institution_name'],
  );
});

const PLAID_ACCOUNT = {
  account_id: 'acc_1',
  name: 'Plaid IRA',
  official_name: 'Plaid Gold IRA',
  type: 'investment',
  subtype: 'ira',
  mask: '0000',
  balances: { current: 320.76, available: null, limit: null, iso_currency_code: 'USD' },
};

test('toPlaidAccountRow emits only live columns and fills the NOT NULL ones', () => {
  const row = toPlaidAccountRow({
    userId: 'u',
    plaidItemRowId: 'item-row',
    account: PLAID_ACCOUNT,
  });
  for (const k of Object.keys(row)) assert.ok(LIVE_COLUMNS.plaid_accounts.includes(k), k);
  assert.equal(row.account_name, 'Plaid IRA');
  assert.equal(row.account_type, 'investment');
  assert.equal(row.balance_current, 320.76);
  const bare = toPlaidAccountRow({
    userId: 'u',
    plaidItemRowId: 'i',
    account: { account_id: 'x' },
  });
  assert.equal(bare.account_name, 'Account');
  assert.equal(bare.account_type, 'other');
  assert.equal(PLAID_ACCOUNTS_CONFLICT, UNIQUE_KEYS.plaid_accounts.join(','));
});

test('toPlaidHoldingRows emits live columns, one row per ticker, skips tickerless', () => {
  const securitiesByID = {
    s1: { security_id: 's1', ticker_symbol: 'AAPL', name: 'Apple', type: 'equity' },
    s2: { security_id: 's2', ticker_symbol: null, name: 'Mystery bond', type: 'fixed income' },
  };
  const holdings = [
    {
      account_id: 'a1',
      security_id: 's1',
      quantity: 2,
      institution_price: 100,
      institution_value: 200,
      cost_basis: 150,
    },
    {
      account_id: 'a2',
      security_id: 's1',
      quantity: 5,
      institution_price: 100,
      institution_value: 500,
      cost_basis: 400,
    },
    {
      account_id: 'a1',
      security_id: 's2',
      quantity: 1,
      institution_price: 90,
      institution_value: 90,
    },
    { account_id: 'a1', security_id: 'missing', quantity: 1 },
  ];
  const { rows, skipped } = toPlaidHoldingRows({ userId: 'u', holdings, securitiesByID });
  assert.equal(skipped, 2);
  assert.equal(rows.length, 1);
  const [r] = rows;
  for (const k of Object.keys(r)) assert.ok(LIVE_COLUMNS.plaid_holdings.includes(k), k);
  assert.equal(r.ticker_symbol, 'AAPL');
  assert.equal(r.quantity, 7);
  assert.equal(r.total_value, 700);
  assert.equal(r.cost_basis, 550);
  assert.equal(r.account_id, 'a2', 'the largest position owns the row');
  assert.equal(PLAID_HOLDINGS_CONFLICT, UNIQUE_KEYS.plaid_holdings.join(','));
});

test('normalizePlaidHolding maps live columns to the dashboard aliases', () => {
  const n = normalizePlaidHolding({
    ticker_symbol: 'MSFT',
    security_name: 'Microsoft',
    security_type: 'equity',
    quantity: '3',
    price_per_share: '400',
    total_value: '1200',
    cost_basis: null,
  });
  assert.equal(n.ticker, 'MSFT');
  assert.equal(n.name, 'Microsoft');
  assert.equal(n.price, 400);
  assert.equal(n.value, 1200);
  assert.equal(n.cost_basis, 0);
  assert.equal(normalizePlaidHolding({ quantity: 2, price_per_share: 10 }).value, 20);
});

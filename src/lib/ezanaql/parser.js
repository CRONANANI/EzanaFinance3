/**
 * EzanaQL lexer + parser → AST. Query-only grammar (no INSERT/UPDATE/DELETE
 * tokens exist at all). See EzanaQL_Language_Spec.md §2–§6.
 *
 * Shape:
 *   FROM dataset [JOIN dataset ON key] [WHERE cond] [SELECT proj]
 *   [GROUP BY fields] [HAVING cond] [ORDER BY sort] [LIMIT n [OFFSET m]] [AS fmt];
 */

export class EzanaQLError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EzanaQLError';
    this.userFacing = true;
  }
}

// NOTE: QUARTER and DAYS are deliberately NOT keywords — QUARTER is also a
// function name (QUARTER(d)) and both appear as words in relative dates
// (LAST QUARTER, LAST 30 DAYS), handled explicitly in parseValue().
const KEYWORDS = new Set([
  'FROM',
  'JOIN',
  'ON',
  'WHERE',
  'SELECT',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'LIMIT',
  'OFFSET',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'BETWEEN',
  'LIKE',
  'CONTAINS',
  'STARTS',
  'ENDS',
  'WITH',
  'IS',
  'NULL',
  'TRUE',
  'FALSE',
  'ASC',
  'DESC',
  'DISTINCT',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'LAST',
  'YTD',
]);

// Multipliers for money shorthand suffixes.
const MONEY_SUFFIX = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/* ────────────────────────────── Lexer ────────────────────────────── */

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const n = input.length;

  const push = (type, value) => tokens.push({ type, value });

  while (i < n) {
    const c = input[i];

    // whitespace
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // line comment
    if (c === '-' && input[i + 1] === '-') {
      while (i < n && input[i] !== '\n') i++;
      continue;
    }

    // string literal (double-quoted)
    if (c === '"') {
      let j = i + 1;
      let str = '';
      while (j < n && input[j] !== '"') {
        if (input[j] === '\\' && j + 1 < n) {
          str += input[j + 1];
          j += 2;
          continue;
        }
        str += input[j];
        j++;
      }
      if (j >= n) throw new EzanaQLError('Unterminated string literal.');
      push('string', str);
      i = j + 1;
      continue;
    }

    // number (with _ separators, optional decimal, optional K/M/B/T or %)
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(input[i + 1] || ''))) {
      let j = i;
      let raw = '';
      while (j < n && /[0-9_.]/.test(input[j])) {
        raw += input[j];
        j++;
      }
      let value = parseFloat(raw.replace(/_/g, ''));
      if (Number.isNaN(value)) throw new EzanaQLError(`Invalid number: "${raw}".`);
      const suffix = (input[j] || '').toUpperCase();
      if (MONEY_SUFFIX[suffix]) {
        value *= MONEY_SUFFIX[suffix];
        j++;
      } else if (input[j] === '%') {
        value = value / 100;
        j++;
      }
      push('number', value);
      i = j;
      continue;
    }

    // identifiers / keywords
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      let word = '';
      while (j < n && /[A-Za-z0-9_.]/.test(input[j])) {
        word += input[j];
        j++;
      }
      const upper = word.toUpperCase();
      // dotted words that aren't keywords are dataset names (namespace.name)
      if (KEYWORDS.has(upper) && !word.includes('.')) push('keyword', upper);
      else push('ident', word);
      i = j;
      continue;
    }

    // multi-char operators
    const two = input.slice(i, i + 2);
    if (['>=', '<=', '!='].includes(two)) {
      push('op', two);
      i += 2;
      continue;
    }

    // single-char tokens
    if ('=<>+-*/(),[];'.includes(c)) {
      push(
        c === '(' || c === ')' || c === ',' || c === '[' || c === ']' || c === ';' ? 'punct' : 'op',
        c,
      );
      i++;
      continue;
    }

    throw new EzanaQLError(`Unexpected character "${c}" at position ${i}.`);
  }

  push('eof', null);
  return tokens;
}

/* ────────────────────────────── Parser ───────────────────────────── */

class Parser {
  constructor(tokens) {
    this.toks = tokens;
    this.pos = 0;
  }
  peek(o = 0) {
    return this.toks[this.pos + o];
  }
  next() {
    return this.toks[this.pos++];
  }
  isKw(w) {
    const t = this.peek();
    return t.type === 'keyword' && t.value === w;
  }
  eatKw(w) {
    if (!this.isKw(w)) throw new EzanaQLError(`Expected "${w}".`);
    return this.next();
  }
  eatPunct(p) {
    const t = this.peek();
    if (t.type !== 'punct' || t.value !== p) throw new EzanaQLError(`Expected "${p}".`);
    return this.next();
  }

  parse() {
    const q = { type: 'query' };
    this.eatKw('FROM');
    q.from = this.parseDatasetRef();

    if (this.isKw('JOIN')) {
      this.next();
      const joinDataset = this.parseDatasetRef();
      this.eatKw('ON');
      const key = this.parseIdent();
      q.join = { dataset: joinDataset, on: key };
    }

    if (this.isKw('WHERE')) {
      this.next();
      q.where = this.parseExpr();
    }
    if (this.isKw('SELECT')) {
      this.next();
      q.select = this.parseProjectionList();
    }
    if (this.isKw('GROUP')) {
      this.next();
      this.eatKw('BY');
      q.groupBy = this.parseFieldList();
    }
    if (this.isKw('HAVING')) {
      this.next();
      q.having = this.parseExpr();
    }
    if (this.isKw('ORDER')) {
      this.next();
      this.eatKw('BY');
      q.orderBy = this.parseSortList();
    }
    if (this.isKw('LIMIT')) {
      this.next();
      q.limit = this.expectNumberInt('LIMIT');
      if (this.isKw('OFFSET')) {
        this.next();
        q.offset = this.expectNumberInt('OFFSET');
      }
    }
    if (this.isKw('AS')) {
      this.next();
      const fmt = this.parseIdent().toLowerCase();
      if (!['table', 'csv', 'json'].includes(fmt)) {
        throw new EzanaQLError(`AS format must be table, csv, or json (got "${fmt}").`);
      }
      q.as = fmt;
    }

    // optional trailing semicolon
    if (this.peek().type === 'punct' && this.peek().value === ';') this.next();
    if (this.peek().type !== 'eof') {
      throw new EzanaQLError(`Unexpected token near "${this.peek().value}".`);
    }
    return q;
  }

  parseDatasetRef() {
    const t = this.peek();
    if (t.type !== 'ident' || !t.value.includes('.')) {
      throw new EzanaQLError('FROM must name a dataset like namespace.name (e.g. gov.contracts).');
    }
    return this.next().value;
  }

  parseIdent() {
    const t = this.peek();
    if (t.type !== 'ident')
      throw new EzanaQLError(`Expected an identifier near "${t.value ?? 'end'}".`);
    return this.next().value;
  }

  expectNumberInt(clause) {
    const t = this.peek();
    if (t.type !== 'number' || !Number.isInteger(t.value)) {
      throw new EzanaQLError(`${clause} requires an integer.`);
    }
    return this.next().value;
  }

  parseFieldList() {
    const fields = [this.parseIdent()];
    while (this.peek().type === 'punct' && this.peek().value === ',') {
      this.next();
      fields.push(this.parseIdent());
    }
    return fields;
  }

  parseSortList() {
    const parseOne = () => {
      const field = this.parseIdent();
      let dir = 'asc';
      if (this.isKw('ASC')) {
        this.next();
        dir = 'asc';
      } else if (this.isKw('DESC')) {
        this.next();
        dir = 'desc';
      }
      return { field, dir };
    };
    const list = [parseOne()];
    while (this.peek().type === 'punct' && this.peek().value === ',') {
      this.next();
      list.push(parseOne());
    }
    return list;
  }

  parseProjectionList() {
    const parseOne = () => {
      const expr = this.parseValue();
      let alias = null;
      if (this.isKw('AS')) {
        this.next();
        alias = this.parseIdent();
      }
      return { expr, alias };
    };
    const list = [parseOne()];
    while (this.peek().type === 'punct' && this.peek().value === ',') {
      this.next();
      list.push(parseOne());
    }
    return list;
  }

  /* ---- expressions (boolean predicate tree for WHERE/HAVING) ---- */
  parseExpr() {
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.isKw('OR')) {
      this.next();
      const right = this.parseAnd();
      left = { type: 'or', left, right };
    }
    return left;
  }
  parseAnd() {
    let left = this.parseNot();
    while (this.isKw('AND')) {
      this.next();
      const right = this.parseNot();
      left = { type: 'and', left, right };
    }
    return left;
  }
  parseNot() {
    if (this.isKw('NOT')) {
      this.next();
      return { type: 'not', expr: this.parseNot() };
    }
    return this.parseComparison();
  }

  parseComparison() {
    // parenthesised boolean group
    if (this.peek().type === 'punct' && this.peek().value === '(') {
      // Could be a grouped predicate. Peek: try predicate group.
      this.next();
      const inner = this.parseExpr();
      this.eatPunct(')');
      return inner;
    }
    const left = this.parseValue();

    const t = this.peek();
    // IS NULL / IS NOT NULL
    if (this.isKw('IS')) {
      this.next();
      let negate = false;
      if (this.isKw('NOT')) {
        this.next();
        negate = true;
      }
      this.eatKw('NULL');
      return { type: 'isnull', expr: left, negate };
    }
    // IN / NOT IN
    if (this.isKw('IN') || this.isKw('NOT')) {
      let negate = false;
      if (this.isKw('NOT')) {
        this.next();
        negate = true;
      }
      this.eatKw('IN');
      const list = this.parseList();
      return { type: 'in', expr: left, list, negate };
    }
    // BETWEEN a AND b
    if (this.isKw('BETWEEN')) {
      this.next();
      const lo = this.parseValue();
      this.eatKw('AND');
      const hi = this.parseValue();
      return { type: 'between', expr: left, lo, hi };
    }
    // text ops
    if (this.isKw('LIKE') || this.isKw('CONTAINS')) {
      const op = this.next().value; // LIKE | CONTAINS
      const val = this.parseValue();
      return { type: 'text', op: op.toLowerCase(), expr: left, value: val };
    }
    if (this.isKw('STARTS') || this.isKw('ENDS')) {
      const which = this.next().value; // STARTS | ENDS
      this.eatKw('WITH');
      const val = this.parseValue();
      return { type: 'text', op: which === 'STARTS' ? 'starts' : 'ends', expr: left, value: val };
    }
    // comparison operators
    if (t.type === 'op' && ['=', '!=', '<', '<=', '>', '>='].includes(t.value)) {
      this.next();
      const right = this.parseValue();
      return { type: 'compare', op: t.value, left, right };
    }

    throw new EzanaQLError(`Expected a comparison operator near "${t.value ?? 'end'}".`);
  }

  parseList() {
    this.eatPunct('[');
    const items = [];
    if (!(this.peek().type === 'punct' && this.peek().value === ']')) {
      items.push(this.parseValue());
      while (this.peek().type === 'punct' && this.peek().value === ',') {
        this.next();
        items.push(this.parseValue());
      }
    }
    this.eatPunct(']');
    return items;
  }

  /* ---- value expressions (literals, fields, function calls, relative dates) ---- */
  parseValue() {
    const t = this.peek();

    if (t.type === 'string') {
      this.next();
      return { type: 'lit', value: t.value, valueType: 'string' };
    }
    if (t.type === 'number') {
      this.next();
      return { type: 'lit', value: t.value, valueType: 'number' };
    }
    if (this.isKw('TRUE')) {
      this.next();
      return { type: 'lit', value: true, valueType: 'bool' };
    }
    if (this.isKw('FALSE')) {
      this.next();
      return { type: 'lit', value: false, valueType: 'bool' };
    }
    if (this.isKw('NULL')) {
      this.next();
      return { type: 'lit', value: null, valueType: 'null' };
    }

    // relative date keywords: LAST 30 DAYS | LAST QUARTER | YTD | FY2026
    if (this.isKw('YTD')) {
      this.next();
      return { type: 'reldate', kind: 'ytd' };
    }
    if (this.isKw('LAST')) {
      this.next();
      const isWord = (w) => this.peek().type === 'ident' && this.peek().value.toUpperCase() === w;
      if (this.peek().type === 'number') {
        const nTok = this.next();
        if (!isWord('DAYS')) throw new EzanaQLError('Expected "DAYS" after LAST <n>.');
        this.next();
        return { type: 'reldate', kind: 'last_days', n: nTok.value };
      }
      if (isWord('QUARTER')) {
        this.next();
        return { type: 'reldate', kind: 'last_quarter' };
      }
      throw new EzanaQLError('Expected "N DAYS" or "QUARTER" after LAST.');
    }

    if (t.type === 'ident') {
      // FYxxxx relative fiscal year sugar (e.g. FY2026)
      if (/^FY\d{4}$/i.test(t.value)) {
        this.next();
        return { type: 'reldate', kind: 'fiscal_year', year: parseInt(t.value.slice(2), 10) };
      }
      // function call: IDENT( ... )
      if (this.peek(1) && this.peek(1).type === 'punct' && this.peek(1).value === '(') {
        return this.parseFunctionCall();
      }
      // bare field reference
      this.next();
      return { type: 'field', name: t.value };
    }

    throw new EzanaQLError(`Unexpected token "${t.value ?? 'end'}" where a value was expected.`);
  }

  parseFunctionCall() {
    const name = this.next().value.toUpperCase();
    this.eatPunct('(');
    const args = [];
    let distinct = false;
    if (this.isKw('DISTINCT')) {
      this.next();
      distinct = true;
    }
    if (!(this.peek().type === 'punct' && this.peek().value === ')')) {
      args.push(this.parseValue());
      while (this.peek().type === 'punct' && this.peek().value === ',') {
        this.next();
        args.push(this.parseValue());
      }
    }
    this.eatPunct(')');
    return { type: 'func', name, args, distinct };
  }
}

/** Parse EzanaQL text → AST. Throws EzanaQLError with a user-facing message. */
export function parse(text) {
  if (!text || !text.trim()) throw new EzanaQLError('Empty query.');
  const tokens = tokenize(text);
  const ast = new Parser(tokens).parse();
  return ast;
}

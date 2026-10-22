/**
 * Schedule 13D / 13G metadata: pure helpers and the code lists the SEC
 * schedules use. No network, no side effects, unit-tested in
 * scripts/check-titans.mjs against real filings in scripts/fixtures.
 *
 *   PERSON_TYPE_LABEL   Row 14 (13D) / Row 12 (13G) "Type of reporting person"
 *   FUND_SOURCE_LABEL   Row 4 (13D) "Source of funds"
 *   G_RULE_BASIS        13G cover "Rule pursuant to which this schedule is filed"
 *   cleanText()         decodes a free-text item into plain paragraphs
 *   tagPurpose()        keyword tags for a 13D Item 4, boilerplate removed
 *   parseSecHeader()    SUBJECT COMPANY / FILED BY from a legacy .txt submission
 *
 * Bump SCHEDULE13_PARSER_VERSION whenever the parsed output changes; the
 * hourly ingest re-reads every stored filing below the current version.
 */

export const SCHEDULE13_PARSER_VERSION = 2;

/** Type of reporting person (both schedules share the list). */
export const PERSON_TYPE_LABEL = {
  BD: 'Broker-dealer',
  BK: 'Bank',
  IC: 'Insurance company',
  IV: 'Investment company',
  IA: 'Investment adviser',
  EP: 'Employee benefit plan or endowment',
  HC: 'Parent holding company or control person',
  SA: 'Savings association',
  CP: 'Church plan',
  CO: 'Corporation',
  PN: 'Partnership',
  IN: 'Individual',
  FI: 'Non-US institution',
  OO: 'Other',
};

/** 13D Row 4, source of funds. */
export const FUND_SOURCE_LABEL = {
  SC: 'Subject company',
  BK: 'Bank borrowing',
  AF: 'Affiliate funds',
  WC: 'Working capital',
  PF: 'Personal funds',
  OO: 'Other',
};

/** 13G filing basis, keyed by the rule as written on the cover. */
export const G_RULE_BASIS = {
  '13d-1(b)': { key: 'qualified_institution', label: 'Qualified institutional investor' },
  '13d-1(c)': { key: 'passive', label: 'Passive investor' },
  '13d-1(d)': { key: 'exempt', label: 'Exempt investor' },
};

/** Normalised rule text: 'Rule 13d-1(b)' -> '13d-1(b)'; null when unknown. */
export function normaliseGRule(raw) {
  const m = /13d\s*-\s*1\s*\(\s*([bcd])\s*\)/i.exec(String(raw || ''));
  return m ? `13d-1(${m[1].toLowerCase()})` : null;
}

/** Upper-case two-letter codes from a list, known ones only, de-duplicated. */
export function knownCodes(list, table) {
  const out = [];
  for (const v of list || []) {
    for (const part of String(v || '').split(/[\s,;/]+/)) {
      const c = part.trim().toUpperCase();
      if (c && table[c] && !out.includes(c)) out.push(c);
    }
  }
  return out;
}

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * Plain text from an XML text node: CDATA unwrapped, named and numeric
 * entities decoded (twice, because some filers double-encode: '&amp;#167;'),
 * CR removed, runs of spaces collapsed, paragraphs kept, capped at `max`.
 */
export function cleanText(raw, max = 20000) {
  if (raw == null) return null;
  let s = String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  for (let i = 0; i < 2; i += 1) {
    s = s
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => NAMED[n]);
  }
  s = s
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!s || /^(n\/?a|none|not applicable)\.?$/i.test(s)) return null;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/*
 * Purpose tags. Item 4 is mostly standard reservation language: nearly every
 * 13D says the filer "reserves the right" to do each of the Item 4 (a) to (j)
 * things, and "has no present plans" to. Matching keywords on that text would
 * tag every filing with every tag. So sentences that are reservation or
 * negation boilerplate are removed first, and tags come only from what is
 * left. Tags are an index into the verbatim text, never a summary of intent:
 * the UI always shows the excerpt beside them. The filter is deliberately
 * conservative: a real plan phrased as "may seek" is missed rather than every
 * reservation clause being tagged.
 */
const BOILERPLATE = [
  /reserves? the right/i,
  /may,? (?:from time to time|at any time|in the future)/i,
  /(?:no|not have any) (?:present )?(?:plans or proposals|plans|proposals)/i,
  /except as (?:set forth|described|otherwise)/i,
  /(?:clauses|subparagraphs|items?) \(?a\)? (?:through|to|-) \(?j\)?/i,
  /(?:enumerated|described|specified|listed) in (?:item 4|subparagraphs)/i,
  /depending (?:on|upon) (?:market|various|the factors|overall)/i,
  /(?:could|would) (?:relate to|result in) any of the/i,
  /may (?:engage|seek|propose|consider|take|formulate|change)/i,
];

const PURPOSE_TAGS = [
  [
    'board',
    /\b(?:board (?:seat|representation|nominee|composition|refresh)|nominat\w* (?:of )?(?:\w+ ){0,3}(?:directors?|candidates?|nominees?)|director nominees?|appoint\w* (?:\w+ ){0,3}(?:to the board|as (?:a )?directors?)|cooperation agreement)/i,
  ],
  [
    'proxy',
    /\b(?:proxy contest|solicit\w* (?:of )?proxies|consent solicitation|special meeting|withhold (?:votes|support))/i,
  ],
  [
    'sale',
    /\b(?:sale of the (?:company|issuer|business)|strategic alternatives|merger|acquisition proposal|acquire the (?:company|issuer|remaining)|take[- ]private|going[- ]private|tender offer|business combination|indication of interest|non[- ]binding proposal|proposed transactions?)/i,
  ],
  [
    'capital',
    /\b(?:share repurchase|stock repurchase|buy ?back|special dividend|return(?:ing)? (?:of )?capital|capital allocation|dividend policy)/i,
  ],
  [
    'management',
    /\b(?:chief executive officer|ceo|management (?:changes?|team)|replace\w* (?:the )?management|executive compensation)/i,
  ],
  [
    'governance',
    /\b(?:corporate governance|bylaws?|declassif\w*|poison pill|rights plan|shareholder rights)/i,
  ],
  [
    'operations',
    /\b(?:spin[- ]?off|divest\w*|separation of|cost (?:reductions?|structure)|operational improvements?)/i,
  ],
  ['letter', /\b(?:sent|delivered|issued|wrote) (?:a |an open )?letter|\bopen letter\b/i],
  [
    'agreement',
    /\b(?:entered into (?:a|an) (?:\w+ ){0,3}agreement|standstill|voting agreement|support agreement|lock-?up agreement|merger agreement)/i,
  ],
];

export const PURPOSE_TAG_LABEL = {
  board: 'Board seats',
  proxy: 'Proxy fight',
  sale: 'Deal or sale',
  capital: 'Capital return',
  management: 'Management',
  governance: 'Governance',
  operations: 'Operations',
  letter: 'Letter to the company',
  agreement: 'Agreement signed',
  investment: 'Investment only',
};

function sentences(text) {
  return String(text || '')
    .split(/(?<=[.;:])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Keyword tags for a 13D Item 4 text; ['investment'] when nothing specific remains. */
export function tagPurpose(text) {
  if (!text) return [];
  const kept = sentences(text).filter((s) => !BOILERPLATE.some((re) => re.test(s)));
  const body = kept.join(' ');
  const tags = PURPOSE_TAGS.filter(([, re]) => re.test(body)).map(([t]) => t);
  if (!tags.length && /investment purposes?|ordinary course/i.test(text)) return ['investment'];
  return tags;
}

/**
 * A short excerpt of Item 4 for cards: the non-boilerplate sentences first
 * (what the filer actually reports doing), else the opening of the text.
 * Verbatim words only, cut on a word boundary.
 */
export function purposeExcerpt(text, max = 600) {
  if (!text) return null;
  const kept = sentences(text).filter((s) => !BOILERPLATE.some((re) => re.test(s)));
  const src = (kept.length ? kept.join(' ') : String(text)).replace(/\s+/g, ' ').trim();
  if (src.length <= max) return src;
  const cut = src.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:]$/, '')}…`;
}

/** Codes to { code, label } pairs for display. */
export function labelled(codes, table) {
  return (codes || []).filter((c) => table[c]).map((c) => ({ code: c, label: table[c] }));
}

/** 13G basis for display: one known rule -> its label, several -> each. */
export function gBasis(rules) {
  return (rules || []).map((r) => ({ rule: r, ...(G_RULE_BASIS[r] || { key: null, label: r }) }));
}

/**
 * Legacy (pre-December 2024) submissions carry an SGML header at the top of
 * the full .txt, with one block per role:
 *
 *   SUBJECT COMPANY:
 *     COMPANY DATA:
 *       COMPANY CONFORMED NAME:   ACME CORP
 *       CENTRAL INDEX KEY:        0000012345
 *   FILED BY:
 *     COMPANY DATA:
 *       COMPANY CONFORMED NAME:   SOME CAPITAL LP
 *       CENTRAL INDEX KEY:        0000067890
 *
 * Returns the two roles, or nulls when the header is absent. This is what
 * tells the investor apart from the target when the cover has no
 * reporting-person list.
 */
export function parseSecHeader(text) {
  const head = String(text || '').slice(0, 20000);
  const block = (label) => {
    const re = new RegExp(
      `${label}:\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:SUBJECT COMPANY|FILED BY|</SEC-HEADER>|<DOCUMENT>)|$)`,
      'i',
    );
    const m = re.exec(head);
    if (!m) return null;
    const name = /COMPANY CONFORMED NAME:\s*(.+)/i.exec(m[1])?.[1]?.trim() || null;
    const cikRaw = /CENTRAL INDEX KEY:\s*(\d+)/i.exec(m[1])?.[1] || null;
    if (!name && !cikRaw) return null;
    return { name, cik: cikRaw ? String(parseInt(cikRaw, 10)) : null };
  };
  return { subject: block('SUBJECT COMPANY'), filedBy: block('FILED BY') };
}

const arr = (v) => (Array.isArray(v) ? v : []);

/**
 * The sec_activist_positions row for one parsed filing. Pure, so the mapping
 * from parser output to stored columns is unit-tested.
 *
 * Investor identity, in order of trust:
 *   cover_cik    the reporting person whose CIK is the submission's filer
 *   cover_first  the first reporting person on a structured cover
 *   sec_header   the FILED BY block of a legacy submission's SEC header
 *   null         not confirmed: readers must not fall back to the EDGAR
 *                index name, which for a 13D/13G can be the target company
 */
export function buildActivistRow({ accessionNo, filingFormType, cover, subjectTicker = null }) {
  const formType = cover.form_type || filingFormType || null;
  const headerFiler = cover.header?.filedBy || null;
  /* A FILED BY block naming the subject itself is not an investor. */
  const headerOk =
    headerFiler &&
    !(cover.subject_cik && headerFiler.cik && headerFiler.cik === String(cover.subject_cik));
  const filerName = cover.filer_name || (headerOk ? headerFiler.name : null);
  const filerCik = cover.filer_cik || (headerOk ? headerFiler.cik : null);
  const filerSource = cover.filer_name
    ? cover.filer_source
    : headerOk && headerFiler.name
      ? 'sec_header'
      : null;
  return {
    accession_no: accessionNo,
    subject_name: cover.subject_name ?? null,
    subject_cik: cover.subject_cik ?? null,
    subject_cusip: cover.subject_cusip ?? null,
    subject_ticker: subjectTicker,
    percent_of_class: cover.percent_of_class ?? null,
    shares: cover.shares ?? null,
    form_type: formType,
    event_date: cover.event_date ?? null,
    reporting_persons: arr(cover.reporting_persons),
    is_amendment: /\/A\s*$/i.test(String(formType || '').trim()),
    filer_name: filerName,
    filer_cik: filerCik ? String(filerCik).padStart(10, '0') : null,
    filer_source: filerSource,
    amendment_no: cover.amendment_no ?? null,
    person_types: arr(cover.person_types),
    fund_sources: arr(cover.fund_sources),
    funds_source_text: cover.funds_source_text ?? null,
    transaction_purpose: cover.transaction_purpose ?? null,
    purpose_tags: arr(cover.purpose_tags),
    g_rules: arr(cover.g_rules),
    member_of_group: cover.member_of_group ?? null,
    sole_voting: cover.sole_voting ?? null,
    shared_voting: cover.shared_voting ?? null,
    sole_dispositive: cover.sole_dispositive ?? null,
    shared_dispositive: cover.shared_dispositive ?? null,
    parser_version: SCHEDULE13_PARSER_VERSION,
  };
}

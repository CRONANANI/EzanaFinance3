/**
 * Pure parsers for SEC filing exhibits — no network, no side effects, so they
 * unit-test in isolation. Namespace-tolerant (SEC XML sometimes prefixes tags,
 * e.g. <ns1:infoTable>).
 */

/** Read the text of the first <name>…</name> (any/no namespace prefix) in a block. */
function tag(block, name) {
  const m = new RegExp(`<(?:\\w+:)?${name}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i').exec(block);
  return m ? m[1].trim() : null;
}

function toNum(s) {
  const n = Number(String(s ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a 13F INFORMATION TABLE XML into position rows. `value` is returned in
 * the filing's own units; the caller applies the pre/post-2023 scaling.
 * @returns {Array<{name_of_issuer, cusip, title_of_class, value, shares, share_type, put_call}>}
 */
export function parseInfoTable(xml) {
  const out = [];
  if (!xml) return out;
  const re = /<(?:\w+:)?infoTable\b[^>]*>([\s\S]*?)<\/(?:\w+:)?infoTable>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const name = tag(b, 'nameOfIssuer');
    if (!name) continue;
    out.push({
      name_of_issuer: name,
      cusip: tag(b, 'cusip'),
      title_of_class: tag(b, 'titleOfClass'),
      value: toNum(tag(b, 'value')) || 0,
      shares: toNum(tag(b, 'sshPrnamt')),
      share_type: tag(b, 'sshPrnamtType'), // 'SH' | 'PRN'
      put_call: tag(b, 'putCall'),
    });
  }
  return out;
}

/**
 * Pre-2023 13F filings report `value` in THOUSANDS of dollars; from Q4-2022
 * reports (filed 2023+) it is whole dollars. Normalize to whole USD. Detect by
 * period_of_report (falls back to filed_at). Off by 1000x if you skip this.
 */
export function normalize13FValue(value, { periodOfReport, filedAt } = {}) {
  const ref = periodOfReport || filedAt || '';
  const isWholeDollars = String(ref) >= '2022-12-31';
  const n = Number(value) || 0;
  return isWholeDollars ? n : n * 1000;
}

/**
 * Best-effort parse of a 13D/13G cover page. These are far less regular than
 * 13F XML, so extract only what matches cleanly and leave the rest null — NEVER
 * fabricate a percentage.
 * @returns {{ percent_of_class: number|null, shares: number|null, subject_name: string|null }}
 */
export function parseActivistCover(text) {
  const t = String(text || '').replace(/&nbsp;/gi, ' ');
  let percent = null;
  const pm = /PERCENT\s+OF\s+CLASS[^%]{0,120}?(\d{1,3}(?:\.\d+)?)\s*%/i.exec(t);
  if (pm) {
    const v = Number(pm[1]);
    if (Number.isFinite(v) && v >= 0 && v <= 100) percent = v;
  }
  let shares = null;
  const sm = /AGGREGATE\s+AMOUNT\s+BENEFICIALLY\s+OWNED[^0-9]{0,120}?([0-9][0-9,]{2,})/i.exec(t);
  if (sm) shares = Number(sm[1].replace(/,/g, '')) || null;

  let subject = null;
  const nm =
    /(?:NAME\s+OF\s+ISSUER|SUBJECT\s+COMPANY)[\s:>]*([A-Z0-9][A-Za-z0-9 .,&'\-]{2,80})/i.exec(t);
  if (nm) subject = nm[1].replace(/\s+/g, ' ').trim() || null;

  return { percent_of_class: percent, shares, subject_name: subject };
}

/* ── Schedule 13D / 13G structured XML (filed since the SEC's Dec 2024
   modernization; form types SCHEDULE 13D, SCHEDULE 13G and their /A) ────── */

const decodeXml = (s) =>
  s == null
    ? null
    : String(s)
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .trim() || null;

/** Every <name>…</name> block (any/no namespace prefix). */
function blocks(xml, name) {
  const out = [];
  const re = new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'gi');
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

/** 'MM/DD/YYYY' (the schema's date format) or ISO -> 'YYYY-MM-DD'. */
function xmlDate(s) {
  const t = String(s || '').trim();
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[1]}-${m[2]}`;
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function pct(s) {
  const n = toNum(s);
  return n != null && s != null && String(s).trim() !== '' && n >= 0 && n <= 100 ? n : null;
}
function qty(s) {
  if (s == null || String(s).trim() === '') return null;
  const n = toNum(s);
  return n != null && n >= 0 ? n : null;
}

/**
 * Parse a Schedule 13D or 13G primary XML document. Element names follow the
 * SEC schemas (verified against real filings saved in scripts/fixtures):
 *   13D: coverPageHeader/dateOfEvent, issuerInfo/{issuerCIK, issuerCUSIP or
 *        issuerCusips/issuerCusipNumber, issuerName};
 *        reportingPersons/reportingPersonInfo/{reportingPersonName,
 *        aggregateAmountOwned, percentOfClass}
 *   13G: coverPageHeader/eventDateRequiresFilingThisStatement,
 *        issuerInfo/{issuerCik, issuerCusip or issuerCusips/issuerCusipNumber,
 *        issuerName}; coverPageHeaderReportingPersonDetails/
 *        {reportingPersonName,
 *         reportingPersonBeneficiallyOwnedAggregateNumberOfShares, classPercent}
 * The stake reported for the filing is the largest reporting person's (group
 * members usually repeat the same aggregate). Nothing is invented: a field the
 * document lacks stays null.
 * @returns {{ form_type, subject_name, subject_cik, subject_cusip, event_date,
 *             percent_of_class, shares, reporting_persons: Array<{name, shares, percent}> } | null}
 */
export function parseSchedule13Xml(xml) {
  const doc = String(xml || '');
  if (!/<(?:\w+:)?edgarSubmission\b/i.test(doc)) return null;
  const cover = blocks(doc, 'coverPageHeader')[0] || '';
  const issuer = blocks(cover, 'issuerInfo')[0] || '';

  const cikRaw = tag(issuer, 'issuerCIK') || tag(issuer, 'issuerCik');
  const cusipRaw =
    tag(issuer, 'issuerCUSIP') || tag(issuer, 'issuerCusip') || tag(issuer, 'issuerCusipNumber');
  const cusip = cusipRaw ? cusipRaw.replace(/\s+/g, '').toUpperCase() : null;

  const persons = [];
  for (const b of blocks(doc, 'reportingPersonInfo')) {
    persons.push({
      name: decodeXml(tag(b, 'reportingPersonName')),
      shares: qty(tag(b, 'aggregateAmountOwned')),
      percent: pct(tag(b, 'percentOfClass')),
    });
  }
  for (const b of blocks(doc, 'coverPageHeaderReportingPersonDetails')) {
    persons.push({
      name: decodeXml(tag(b, 'reportingPersonName')),
      shares: qty(tag(b, 'reportingPersonBeneficiallyOwnedAggregateNumberOfShares')),
      percent: pct(tag(b, 'classPercent')),
    });
  }
  const top = persons.reduce(
    (best, p) => ((p.percent ?? -1) > (best?.percent ?? -1) ? p : best),
    null,
  );

  return {
    form_type: decodeXml(tag(doc, 'submissionType')),
    subject_name: decodeXml(tag(issuer, 'issuerName')),
    subject_cik: cikRaw ? String(parseInt(cikRaw, 10) || '') || null : null,
    subject_cusip: cusip && /^[0-9A-Z]{9}$/.test(cusip) ? cusip : null,
    event_date: xmlDate(
      tag(cover, 'dateOfEvent') || tag(cover, 'eventDateRequiresFilingThisStatement'),
    ),
    percent_of_class: top?.percent ?? null,
    shares: top?.shares ?? null,
    reporting_persons: persons,
  };
}

/**
 * Normalise any Schedule 13D/13G spelling ('SC 13D', 'SCHEDULE 13D/A',
 * 'SC 13G/A' …) to '13D' or '13G'; null when it is neither.
 */
export function schedule13Kind(formType) {
  const m = /13\s*([DG])\b/i.exec(String(formType || ''));
  return m ? `13${m[1].toUpperCase()}` : null;
}

/** True for an amendment form type (trailing '/A'). */
export function isAmendmentForm(formType) {
  return /\/A\s*$/i.test(String(formType || '').trim());
}

/**
 * Pure parsers for SEC filing exhibits — no network, no side effects, so they
 * unit-test in isolation. Namespace-tolerant (SEC XML sometimes prefixes tags,
 * e.g. <ns1:infoTable>).
 */
import {
  PERSON_TYPE_LABEL,
  FUND_SOURCE_LABEL,
  knownCodes,
  normaliseGRule,
  cleanText,
  tagPurpose,
} from './sec/schedule13-meta.js';

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

/** Every <name> text in a block, decoded (repeatable elements). */
function tags(block, name) {
  return blocks(block, name)
    .map((v) => decodeXml(v))
    .filter(Boolean);
}

/* One reporting person, 13D layout (reportingPersonInfo) or 13G layout
   (coverPageHeaderReportingPersonDetails, powers nested one level down).
   Unknown codes are dropped, never guessed. */
function readPerson(b, layout) {
  const is13D = layout === '13D';
  const powers = is13D ? b : blocks(b, 'reportingPersonBeneficiallyOwnedNumberOfShares')[0] || b;
  const cikRaw = tag(b, 'reportingPersonCIK');
  const group = String(tag(b, is13D ? 'memberOfGroup' : 'memberGroup') || '')
    .trim()
    .toLowerCase();
  return {
    name: decodeXml(tag(b, 'reportingPersonName')),
    cik: cikRaw && /^\d+$/.test(cikRaw.trim()) ? String(parseInt(cikRaw, 10)) : null,
    shares: qty(
      tag(
        b,
        is13D ? 'aggregateAmountOwned' : 'reportingPersonBeneficiallyOwnedAggregateNumberOfShares',
      ),
    ),
    percent: pct(tag(b, is13D ? 'percentOfClass' : 'classPercent')),
    types: knownCodes(tags(b, 'typeOfReportingPerson'), PERSON_TYPE_LABEL),
    fund_sources: is13D ? knownCodes(tags(b, 'fundType'), FUND_SOURCE_LABEL) : [],
    citizenship: decodeXml(tag(b, 'citizenshipOrOrganization')),
    sole_voting: qty(tag(powers, 'soleVotingPower')),
    shared_voting: qty(tag(powers, 'sharedVotingPower')),
    sole_dispositive: qty(tag(powers, 'soleDispositivePower')),
    shared_dispositive: qty(tag(powers, 'sharedDispositivePower')),
    group: group === 'a' ? true : group === 'b' ? false : null,
  };
}

/**
 * Parse a Schedule 13D or 13G primary XML document. Element names follow the
 * SEC schemas (verified against real filings saved in scripts/fixtures):
 *   13D: coverPageHeader/{dateOfEvent, amendmentNo}, issuerInfo/{issuerCIK,
 *        issuerCUSIP or issuerCusips/issuerCusipNumber, issuerName};
 *        reportingPersons/reportingPersonInfo/{reportingPersonCIK,
 *        reportingPersonName, fundType, citizenshipOrOrganization,
 *        sole|shared Voting|Dispositive Power, aggregateAmountOwned,
 *        percentOfClass, typeOfReportingPerson, memberOfGroup};
 *        items1To7/item3/fundsSource, item4/transactionPurpose
 *   13G: coverPageHeader/{eventDateRequiresFilingThisStatement, amendmentNo,
 *        designateRulesPursuantThisScheduleFiled}, issuerInfo/{issuerCik,
 *        issuerCusip or issuerCusips/issuerCusipNumber, issuerName};
 *        coverPageHeaderReportingPersonDetails/{reportingPersonName,
 *        citizenshipOrOrganization, reportingPersonBeneficiallyOwnedNumberOfShares/
 *        sole|shared Voting|Dispositive Power,
 *        reportingPersonBeneficiallyOwnedAggregateNumberOfShares, classPercent,
 *        memberGroup, typeOfReportingPerson (repeatable)};
 *        items/item3/typeOfPersonFiling (repeatable)
 *   Both: headerData/filerInfo/filer/filerCredentials/cik (the filer's CIK).
 *
 * The stake reported for the filing is the largest reporting person's (group
 * members usually repeat the same aggregate), and that person's voting and
 * dispositive powers are the filing's. The filer is the reporting person
 * whose CIK matches the submission's filer CIK, else the first reporting
 * person. Nothing is invented: a field the document lacks stays null or [].
 */
export function parseSchedule13Xml(xml) {
  const doc = String(xml || '');
  if (!/<(?:\w+:)?edgarSubmission\b/i.test(doc)) return null;
  const formType = decodeXml(tag(doc, 'submissionType'));
  const layout =
    /13\s*G/i.test(formType || '') || /schedule13g/i.test(doc.slice(0, 400)) ? '13G' : '13D';
  const cover = blocks(doc, 'coverPageHeader')[0] || '';
  const issuer = blocks(cover, 'issuerInfo')[0] || '';
  const header = blocks(doc, 'headerData')[0] || '';

  const cikRaw = tag(issuer, 'issuerCIK') || tag(issuer, 'issuerCik');
  const subjectCik = cikRaw ? String(parseInt(cikRaw, 10) || '') || null : null;
  const cusipRaw =
    tag(issuer, 'issuerCUSIP') || tag(issuer, 'issuerCusip') || tag(issuer, 'issuerCusipNumber');
  const cusip = cusipRaw ? cusipRaw.replace(/\s+/g, '').toUpperCase() : null;

  const persons = [
    ...blocks(doc, 'reportingPersonInfo').map((b) => readPerson(b, '13D')),
    ...blocks(doc, 'coverPageHeaderReportingPersonDetails').map((b) => readPerson(b, '13G')),
  ].filter((p) => p.name || p.shares != null || p.percent != null);

  const top = persons.reduce(
    (best, p) => ((p.percent ?? -1) > (best?.percent ?? -1) ? p : best),
    null,
  );

  /* The submission's filer. Guard against a header CIK that is the issuer. */
  const headerCikRaw = tag(blocks(header, 'filerCredentials')[0] || '', 'cik');
  let filerCik = headerCikRaw ? String(parseInt(headerCikRaw, 10) || '') || null : null;
  if (filerCik && filerCik === subjectCik) filerCik = null;
  const byCik = (filerCik && persons.find((p) => p.cik === filerCik)) || null;
  const filerPerson = byCik || persons[0] || null;

  const items = blocks(doc, layout === '13D' ? 'items1To7' : 'items')[0] || '';
  const item3 = blocks(items, 'item3')[0] || '';
  const item4 = blocks(items, 'item4')[0] || '';
  const purpose = layout === '13D' ? cleanText(tag(item4, 'transactionPurpose')) : null;

  const personTypes = knownCodes(
    [
      ...persons.flatMap((p) => p.types),
      ...(layout === '13G' ? tags(item3, 'typeOfPersonFiling') : []),
    ],
    PERSON_TYPE_LABEL,
  );
  const gRules =
    layout === '13G'
      ? [
          ...new Set(
            tags(cover, 'designateRulePursuantThisScheduleFiled')
              .map(normaliseGRule)
              .filter(Boolean),
          ),
        ]
      : [];
  const amendmentRaw = tag(cover, 'amendmentNo');
  const amendmentNo =
    amendmentRaw && /^\d+$/.test(amendmentRaw.trim()) ? Number(amendmentRaw) : null;
  const groupFlags = persons.map((p) => p.group).filter((g) => g != null);

  return {
    form_type: formType,
    subject_name: decodeXml(tag(issuer, 'issuerName')),
    subject_cik: subjectCik,
    subject_cusip: cusip && /^[0-9A-Z]{9}$/.test(cusip) ? cusip : null,
    event_date: xmlDate(
      tag(cover, 'dateOfEvent') || tag(cover, 'eventDateRequiresFilingThisStatement'),
    ),
    percent_of_class: top?.percent ?? null,
    shares: top?.shares ?? null,
    reporting_persons: persons,
    /* Parser v2 */
    /* 'cover_cik': the reporting person whose CIK is the submission's filer.
       'cover_first': the first reporting person on the cover (13G persons
       carry no CIK, so the match cannot be made). Both come from the filing
       itself, so the investor is confirmed either way. */
    filer_cik: filerCik || filerPerson?.cik || null,
    filer_name: filerPerson?.name || null,
    filer_source: byCik ? 'cover_cik' : filerPerson?.name ? 'cover_first' : null,
    amendment_no: amendmentNo,
    person_types: personTypes,
    fund_sources: knownCodes(
      persons.flatMap((p) => p.fund_sources),
      FUND_SOURCE_LABEL,
    ),
    funds_source_text: layout === '13D' ? cleanText(tag(item3, 'fundsSource'), 8000) : null,
    transaction_purpose: purpose,
    purpose_tags: tagPurpose(purpose),
    g_rules: gRules,
    member_of_group: groupFlags.length ? groupFlags.some(Boolean) : null,
    sole_voting: top?.sole_voting ?? null,
    shared_voting: top?.shared_voting ?? null,
    sole_dispositive: top?.sole_dispositive ?? null,
    shared_dispositive: top?.shared_dispositive ?? null,
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

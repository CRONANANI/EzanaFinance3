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

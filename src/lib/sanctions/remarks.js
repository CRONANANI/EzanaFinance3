/**
 * OFAC SDN remarks -> structured fields. Pure, no imports, safe anywhere.
 *
 * The SDN.CSV remarks column is semicolon-separated text, for example:
 *   "DOB 12 Jul 1979; POB Iran; nationality Iran; Gender Male;
 *    Secondary sanctions risk: section 1(b) of Executive Order 13224, as
 *    amended by Executive Order 13886; Passport RA003752 (Dominica);
 *    a.k.a. 'HASHEM, Siavash'; Linked To: AL-QA'IDA IN THE INDIAN SUBCONTINENT."
 *
 * Rules this parser keeps:
 *   - Every segment lands somewhere. A segment no rule recognises goes to
 *     `unparsed`, verbatim, so nothing OFAC wrote is silently dropped.
 *   - Values are copied, never inferred. Issuer is only the trailing
 *     "(Country)" OFAC printed; dates stay in OFAC's own wording.
 *   - "alt." segments keep their meaning: they are marked isAlt.
 *   - Secondary sanctions risk is kept as OFAC's verbatim clause, with its
 *     legal citation, never reduced to a yes/no.
 *   - "Linked To:" is OFAC's relationship note, copied as a name. It does not
 *     establish identity, ownership or wrongdoing, and callers must say so.
 *   - Everything here is machine-extracted from text, not verified.
 *
 * Bump PARSER_VERSION whenever a rule changes, so stored rows can be told
 * apart and re-parsed.
 */
export const PARSER_VERSION = 1;

/* Identifier rules, tried in order on the segment with any "alt." removed.
   kind is the stable key stored in sanctions_identifiers; label is OFAC's
   own wording, shown on the page. Each `re` captures the value as group 1. */
const ID_RULES = [
  { kind: 'imo', label: 'IMO', re: /^Vessel Registration Identification IMO\s+(\d{7})\b/i },
  { kind: 'imo', label: 'IMO', re: /^Identification Number IMO\s+(\d{7})\b/i },
  { kind: 'mmsi', label: 'MMSI', re: /^MMSI\s+(\d{9})\b/i },
  {
    kind: 'msn',
    label: 'Aircraft serial (MSN)',
    re: /^Aircraft Manufacturer'?s Serial Number \(MSN\)\s+(.+)$/i,
  },
  { kind: 'tail', label: 'Aircraft tail number', re: /^Aircraft Tail Number\s+(.+)$/i },
  { kind: 'passport', label: 'Passport', re: /^Passport\s+(.+)$/i },
  { kind: 'national_id', label: 'National ID', re: /^National ID No\.\s+(.+)$/i },
  { kind: 'tax_id', label: 'Tax ID', re: /^Tax ID No\.\s+(.+)$/i },
  { kind: 'registration', label: 'Registration number', re: /^Registration Number\s+(.+)$/i },
  { kind: 'registration', label: 'Registration ID', re: /^Registration ID\s+(.+)$/i },
  {
    kind: 'registration',
    label: 'Business registration number',
    re: /^Business Registration Number\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Commercial registry number',
    re: /^Commercial Registry Number\s+(.+)$/i,
  },
  { kind: 'registration', label: 'Company number', re: /^Company Number\s+(.+)$/i },
  { kind: 'registration', label: 'Folio Mercantil', re: /^Folio Mercantil No\.\s+(.+)$/i },
  {
    kind: 'registration',
    label: 'Chamber of Commerce number',
    re: /^Chamber of Commerce Number\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Government Gazette number',
    re: /^Government Gazette Number\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Economic Register Number (CBLS)',
    re: /^Economic Register Number \(CBLS\)\s+(.+)$/i,
  },
  { kind: 'registration', label: 'C.R. No.', re: /^C\.R\. No\.\s+(.+)$/i },
  {
    kind: 'registration',
    label: 'Unified Social Credit Code',
    re: /^Unified Social Credit Code \(USCC\)\s+(.+)$/i,
  },
  { kind: 'registration', label: 'Identification number', re: /^Identification Number\s+(.+)$/i },
  { kind: 'registration', label: 'License', re: /^License\s+(.+)$/i },
  { kind: 'national_id', label: 'Cedula', re: /^Cedula No\.\s+(.+)$/i },
  { kind: 'tax_id', label: 'NIT', re: /^NIT #\s*(.+)$/i },
  { kind: 'tax_id', label: 'RUC', re: /^RUC #\s*(.+)$/i },
  { kind: 'tax_id', label: 'RFC', re: /^R\.F\.C\.\s+(.+)$/i },
  { kind: 'national_id', label: 'CURP', re: /^C\.U\.R\.P\.\s+(.+)$/i },
  { kind: 'lei', label: 'Legal Entity Number', re: /^Legal Entity Number\s+(\S+)$/i },
  { kind: 'swift', label: 'SWIFT/BIC', re: /^SWIFT\/BIC\s+(\S+)$/i },
  { kind: 'bik', label: 'BIK (RU)', re: /^BIK \(RU\)\s+(\S+)$/i },
  { kind: 'registration', label: 'Trade license', re: /^Trade License No\.\s+(.+)$/i },
  { kind: 'registration', label: 'Matricula Mercantil', re: /^Matricula Mercantil No\.?\s+(.+)$/i },
  {
    kind: 'registration',
    label: 'Central Registration System number',
    re: /^Central Registration System Number\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Business registration document',
    re: /^Business Registration Document #\s*(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Istanbul Chamber of Commerce number',
    re: /^Istanbul Chamber of Comm\. No\.\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Dubai Chamber of Commerce membership',
    re: /^Dubai Chamber of Commerce Membership No\.\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Public registration number',
    re: /^Public Registration Number\s+(.+)$/i,
  },
  { kind: 'registration', label: 'UK company number', re: /^UK Company Number\s+(.+)$/i },
  {
    kind: 'registration',
    label: 'Registered charity number',
    re: /^Registered Charity No\.\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Certificate of incorporation',
    re: /^Certificate of Incorporation Number\s+(.+)$/i,
  },
  { kind: 'registration', label: 'Branch unit number', re: /^Branch Unit Number\s+(.+)$/i },
  {
    kind: 'registration',
    label: 'Unified Social Credit Code',
    re: /^United Social Credit Code Certificate \(USCCC\)\s+(.+)$/i,
  },
  {
    kind: 'registration',
    label: 'Global Intermediary Identification Number',
    re: /^Global Intermediary Identification Number\s+(\S+)$/i,
  },
  { kind: 'tax_id', label: 'VAT number', re: /^V\.A\.T\. Number\s+(.+)$/i },
  { kind: 'tax_id', label: 'Italian fiscal code', re: /^Italian Fiscal Code\s+(.+)$/i },
  { kind: 'national_id', label: 'Birth certificate', re: /^Birth Certificate Number\s+(.+)$/i },
  { kind: 'national_id', label: "Driver's license", re: /^Driver'?s License No\.\s+(.+)$/i },
  { kind: 'national_id', label: 'Electoral registry', re: /^Electoral Registry No\.\s+(.+)$/i },
  { kind: 'national_id', label: 'Personal ID card', re: /^Personal ID Card\s+(.+)$/i },
  { kind: 'national_id', label: 'National foreign ID', re: /^National Foreign ID Number\s+(.+)$/i },
  { kind: 'national_id', label: "Citizen's card", re: /^Citizen'?s Card Number\s+(.+)$/i },
  {
    kind: 'national_id',
    label: 'Turkish identification number',
    re: /^Turkish Identification Number\s+(.+)$/i,
  },
  { kind: 'national_id', label: 'Numero de Identidad', re: /^Numero de Identidad\s+(.+)$/i },
  { kind: 'national_id', label: 'Kenyan ID', re: /^Kenyan ID No\.\s+(.+)$/i },
  {
    kind: 'national_id',
    label: 'Military service card (Mexico)',
    re: /^Cartilla de Servicio Militar Nacional\s+(.+)$/i,
  },
  {
    kind: 'tail',
    label: 'Previous aircraft tail number',
    re: /^Previous Aircraft Tail Number\s+(.+)$/i,
  },
  {
    kind: 'mode_s',
    label: 'Aircraft Mode S transponder code',
    re: /^Aircraft Mode S Transponder Code\s+(\S+)$/i,
  },
  {
    kind: 'msn',
    label: 'Aircraft construction number',
    re: /^Aircraft Construction Number \(also called L\/N or S\/N or F\/N\)\s+(.+)$/i,
  },
  {
    kind: 'crypto',
    label: 'Digital currency address',
    re: /^Digital Currency Address - ([A-Z0-9]{2,6}\s+\S+)$/i,
  },
];

/* Facts that are not identifiers: copied as label + value. */
const FACT_RULES = [
  { key: 'dob', label: 'Date of birth', re: /^DOB\s+(.+)$/i },
  { key: 'pob', label: 'Place of birth', re: /^POB\s+(.+)$/i },
  { key: 'nationality', label: 'Nationality', re: /^nationality\s+(.+)$/i },
  { key: 'citizen', label: 'Citizenship', re: /^citizen\s+(.+)$/i },
  { key: 'gender', label: 'Gender', re: /^Gender\s+(Male|Female)$/i },
  {
    key: 'established',
    label: 'Organization established',
    re: /^Organization Established Date\s+(.+)$/i,
  },
  { key: 'org_type', label: 'Organization type', re: /^Organization Type:\s*(.+)$/i },
  { key: 'target_type', label: 'Target type', re: /^Target Type\s+(.+)$/i },
  {
    key: 'vessel_build_year',
    label: 'Vessel year of build',
    re: /^Vessel Year of Build\s+(\d{4})$/i,
  },
  { key: 'vessel_flag', label: 'Vessel flag', re: /^Vessel Flag\s+(.+)$/i },
  { key: 'vessel_type', label: 'Vessel type', re: /^Vessel Type\s+(.+)$/i },
  { key: 'vessel_flag_former', label: 'Former vessel flag', re: /^Former Vessel Flag\s+(.+)$/i },
  { key: 'vessel_flag_other', label: 'Other vessel flag', re: /^Other Vessel Flag\s+(.+)$/i },
  { key: 'vessel_type_other', label: 'Other vessel type', re: /^Other Vessel Type\s+(.+)$/i },
  { key: 'aircraft_model', label: 'Aircraft model', re: /^Aircraft Model\s+(.+)$/i },
  {
    key: 'aircraft_built',
    label: 'Aircraft manufacture date',
    re: /^Aircraft Manufacture Date\s+(.+)$/i,
  },
  { key: 'aircraft_operator', label: 'Aircraft operator', re: /^Aircraft Operator\s+(.+)$/i },
  { key: 'website', label: 'Website', re: /^Website\s+(\S+)$/i },
  { key: 'email', label: 'Email', re: /^Email Address\s+(\S+)$/i },
  { key: 'phone', label: 'Phone', re: /^(?:Phone Number|Telephone)\s+(.+)$/i },
  { key: 'fax', label: 'Fax', re: /^Fax\s+(.+)$/i },
  { key: 'title', label: 'Title', re: /^Title\s+(.+)$/i },
  {
    key: 'sanctions_info',
    label: 'Additional sanctions information',
    re: /^Additional Sanctions Information -\s*(.+)$/i,
  },
  {
    key: 'directive',
    label: 'Directive determination',
    re: /^(Executive Order \d+ Directive Determination - .+)$/i,
  },
  {
    key: 'prohibition',
    label: 'Transactions prohibited',
    re: /^(Transactions Prohibited For Persons .+)$/i,
  },
  {
    key: 'statutory_info',
    label: 'Statutory sanctions information',
    re: /^((?:Executive Order \d+|CAATSA Section \d+|PAIPA Section \d+) (?:information|Information):?\s*.+)$/,
  },
  {
    key: 'directive',
    label: 'Directive information',
    re: /^(Executive Order \d+ Directive Information -\s*.+)$/i,
  },
  {
    key: 'directive_listing_date',
    label: 'Directive listing date',
    re: /^(Listing Date \(EO \d+ Directive \d+\):?\s*.+)$/i,
  },
  {
    key: 'directive_effective_date',
    label: 'Directive effective date',
    re: /^(Effective Date \(EO \d+ Directive \d+\):?\s*.+)$/i,
  },
];

/* Dates OFAC writes on identifiers: "issued 06 Nov 1990", "expires 13 Sep 1995". */
const ISSUED = /\bissued\s+(\d{1,2} [A-Z][a-z]{2} \d{4}|[A-Z][a-z]{2} \d{4}|\d{4})/;
const EXPIRES = /\bexpires\s+(\d{1,2} [A-Z][a-z]{2} \d{4}|[A-Z][a-z]{2} \d{4}|\d{4})/;

/** Upper case, letters and digits only: the stored comparison form. */
export function normIdentifier(v) {
  return String(v || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Lower case, letters and digits, single spaces: matches SQL sanctions_norm(). */
export function normName(v) {
  const s = String(v || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return s || null;
}

/** Split remarks into segments on ";" (OFAC's separator), dropping the final full stop. */
export function splitRemarks(text) {
  const s = String(text || '').trim();
  if (!s || s === '-0-') return [];
  return s
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x, i, all) => (i === all.length - 1 ? x.replace(/\.$/, '') : x).trim())
    .filter(Boolean);
}

/* "RA003752 (Dominica) issued 03 Jan 2004 expires 08 Nov 2008"
   -> { value: 'RA003752', issuer: 'Dominica', issued, expires } */
function splitIdValue(rest) {
  let s = rest.trim();
  const issued = (ISSUED.exec(s) || [])[1] || null;
  const expires = (EXPIRES.exec(s) || [])[1] || null;
  s = s.replace(/\s+(issued|expires)\s+.*$/i, '').trim();
  let issuer = null;
  const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(s);
  if (m && m[1]) {
    s = m[1].trim();
    issuer = m[2].trim();
  }
  return { value: s, issuer, issued, expires };
}

/**
 * Parse one remarks string.
 * @returns {{
 *   version: number,
 *   secondaryRisk: string[], linkedTo: string[], aliases: string[],
 *   identifiers: {kind,label,value,valueNorm,issuer,issued,expires,isAlt,raw}[],
 *   facts: {key,label,value,isAlt,raw}[],
 *   unparsed: string[]
 * }}
 */
export function parseRemarks(text) {
  const out = {
    version: PARSER_VERSION,
    secondaryRisk: [],
    linkedTo: [],
    aliases: [],
    identifiers: [],
    facts: [],
    unparsed: [],
  };
  for (const raw of splitRemarks(text)) {
    const isAlt = /^alt\.\s+/i.test(raw);
    const seg = raw.replace(/^alt\.\s+/i, '').trim();

    let m = /^Secondary sanctions risk:\s*(.+)$/i.exec(seg);
    if (m) {
      out.secondaryRisk.push(m[1].trim());
      continue;
    }
    m = /^Linked To:\s*(.+)$/i.exec(seg);
    if (m) {
      const name = m[1].trim().replace(/\.$/, '');
      if (name && !out.linkedTo.includes(name)) out.linkedTo.push(name);
      continue;
    }
    m = /^[af]\.k\.a\.,?\s+(.+)$/i.exec(seg);
    if (m) {
      const name = m[1]
        .trim()
        .replace(/^['"‘’]+|['"‘’]+$/g, '')
        .trim();
      if (name && !out.aliases.includes(name)) out.aliases.push(name);
      continue;
    }

    let hit = false;
    for (const rule of ID_RULES) {
      m = rule.re.exec(seg);
      if (!m) continue;
      const parts = splitIdValue(m[1]);
      const valueNorm = normIdentifier(parts.value);
      /* An identifier needs at least two letters or digits to be usable. */
      if (valueNorm.length < 2) break;
      out.identifiers.push({
        kind: rule.kind,
        label: rule.label,
        value: parts.value,
        valueNorm,
        issuer: parts.issuer,
        issued: parts.issued,
        expires: parts.expires,
        isAlt,
        raw,
      });
      hit = true;
      break;
    }
    if (hit) continue;

    for (const rule of FACT_RULES) {
      m = rule.re.exec(seg);
      if (!m) continue;
      out.facts.push({ key: rule.key, label: rule.label, value: m[1].trim(), isAlt, raw });
      hit = true;
      break;
    }
    if (hit) continue;

    out.unparsed.push(raw);
  }
  return out;
}

/** "DOB" and "Organization established" become identifiers too, for disambiguation and search. */
export function disambiguators(parsed) {
  const out = [];
  for (const f of parsed.facts) {
    if (f.key !== 'dob' && f.key !== 'established') continue;
    out.push({
      kind: f.key,
      label: f.key === 'dob' ? 'DOB' : 'Established',
      value: f.value,
      valueNorm: normIdentifier(f.value),
      issuer: null,
      issued: null,
      expires: null,
      isAlt: f.isAlt,
      raw: f.raw,
    });
  }
  return out;
}

/**
 * Rebuild full remarks: SDN.CSV caps remarks at 1000 characters and puts the
 * rest in SDN_COMMENTS.CSV. Returns null when the overflow adds nothing.
 */
export function joinOverflow(remarks, overflow) {
  const a = String(remarks || '');
  const b = String(overflow || '').trim();
  if (!b || b === '-0-') return null;
  return `${a}${b}`;
}

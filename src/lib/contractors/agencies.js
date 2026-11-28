/**
 * Canonical federal agency resolution (Sonar 6.5.1, Nov 28 2026).
 *
 * What the data holds (inspected, not assumed):
 *   usaspending_contract_awards / contract_awards_resolved carry `awarding_agency`,
 *   `awarding_sub_agency` and `funding_agency` as USAspending TOPTIER agency names, written
 *   from the spending_by_award fields "Awarding Agency", "Awarding Sub Agency" and
 *   "Funding Agency" (src/app/api/cron/ingest-usaspending/route.js). No agency code column
 *   is stored. The toptier name is USAspending's canonical label for a toptier agency
 *   (one string per CGAC code), so it is matched EXACTLY against this table, never by
 *   fuzzy text. The CGAC code is kept so a future `awarding_toptier_code` column
 *   (docs/sql/SONAR_6_5_1_contract_agency_codes.md, not applied) can switch the filter to
 *   codes without changing callers.
 *
 * Awarding agency (the agency that signed the award) and funding agency (the agency whose
 * money obligates it) are different questions. The default basis is AWARDING, and every
 * result names the basis it used.
 *
 * Pure. Unit-tested in scripts/check-sonar-6-5-1.mjs.
 */

export const AGENCY_BASES = Object.freeze(['awarding', 'funding']);

/** Toptier agencies: id, CGAC code, USAspending toptier name, question patterns. */
export const AGENCIES = Object.freeze([
  {
    id: 'DOD',
    cgac: '097',
    name: 'Department of Defense',
    short: 'the Department of Defense',
    re: /\b(?:DoD|DOD|department of defen[cs]e|defen[cs]e department|pentagon)\b/i,
  },
  {
    id: 'DOE',
    cgac: '089',
    name: 'Department of Energy',
    short: 'the Department of Energy',
    re: /\bDOE\b|\b(?:department of energy|energy department)\b/i,
  },
  {
    id: 'DHS',
    cgac: '070',
    name: 'Department of Homeland Security',
    short: 'the Department of Homeland Security',
    re: /\b(?:DHS|department of homeland security|homeland security department)\b/i,
  },
  {
    id: 'NASA',
    cgac: '080',
    name: 'National Aeronautics and Space Administration',
    short: 'NASA',
    re: /\bNASA\b/i,
  },
  {
    id: 'HHS',
    cgac: '075',
    name: 'Department of Health and Human Services',
    short: 'the Department of Health and Human Services',
    re: /\b(?:HHS|department of health and human services)\b/i,
  },
  {
    id: 'VA',
    cgac: '036',
    name: 'Department of Veterans Affairs',
    short: 'the Department of Veterans Affairs',
    re: /\b(?:department of veterans affairs|veterans affairs)\b/i,
  },
  {
    id: 'GSA',
    cgac: '047',
    name: 'General Services Administration',
    short: 'the General Services Administration',
    re: /\bGSA\b|\bgeneral services administration\b/i,
  },
  {
    id: 'DOJ',
    cgac: '015',
    name: 'Department of Justice',
    short: 'the Department of Justice',
    re: /\bDOJ\b|\b(?:department of justice|justice department)\b/i,
  },
  {
    id: 'DOS',
    cgac: '019',
    name: 'Department of State',
    short: 'the Department of State',
    re: /\b(?:department of state|state department)\b/i,
  },
  {
    id: 'TREAS',
    cgac: '020',
    name: 'Department of the Treasury',
    short: 'the Treasury',
    re: /\b(?:department of the treasury|treasury department)\b/i,
  },
  {
    id: 'DOT',
    cgac: '069',
    name: 'Department of Transportation',
    short: 'the Department of Transportation',
    re: /\b(?:department of transportation|transportation department)\b/i,
  },
]);

const byId = new Map(AGENCIES.map((a) => [a.id, a]));
const byName = new Map(AGENCIES.map((a) => [a.name.toLowerCase(), a]));

export const agencyById = (id) => byId.get(String(id || '').toUpperCase()) || null;

/** The agency a stored toptier name denotes (exact, case-insensitive), or null. */
export function agencyFromSourceName(name) {
  return (
    byName.get(
      String(name || '')
        .trim()
        .toLowerCase(),
    ) || null
  );
}

/** Agencies a question names, with the basis it implies. */
export function agenciesInQuestion(question) {
  const q = String(question || '');
  const found = AGENCIES.filter((a) => a.re.test(q));
  const basis = /\bfund(?:ed|ing)\s+(?:by|from|agency)\b|\bfunding agenc/i.test(q)
    ? 'funding'
    : 'awarding';
  const explicitBasis = basis === 'funding' || /\bawarded by|awarding agenc/i.test(q);
  return { agencies: found, basis, explicitBasis };
}

/** Whether one award row matches an agency filter on a basis. */
export function awardMatchesAgency(row, agency, basis = 'awarding') {
  if (!agency) return true;
  const a = typeof agency === 'string' ? agencyById(agency) : agency;
  if (!a) return false;
  if (row?.[`${basis}_toptier_code`]) return String(row[`${basis}_toptier_code`]) === a.cgac;
  return agencyFromSourceName(row?.[`${basis}_agency`])?.id === a.id;
}

/** A label for results: which agency, on which basis. */
export function agencyLabel(agency, basis = 'awarding') {
  const a = typeof agency === 'string' ? agencyById(agency) : agency;
  if (!a) return null;
  return `${basis === 'funding' ? 'funded' : 'awarded'} by ${a.short} (USAspending ${basis} agency "${a.name}", CGAC ${a.cgac})`;
}

/**
 * Canonical registry for Inside the Capitol politician profile pages.
 * Slugs must match slugify(`${firstName} ${lastName}`) from links across the app.
 */

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const US_STATE_FULL = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

/** Core list — matches performance route TRACKED + featured / chart names */
export const CAPITOL_POLITICIAN_REGISTRY = [
  { firstName: 'Nancy', lastName: 'Pelosi', party: 'Democrat', chamber: 'House', state: 'CA', initials: 'NP', role: 'Representative', district: 'District 11', yearsInOffice: '1987 – Present', age: 85, committees: 'Appropriations Committee', committeeUrl: 'https://clerk.house.gov/members/P000197' },
  { firstName: 'Tommy', lastName: 'Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', initials: 'TT', role: 'Senator', district: null, yearsInOffice: '2021 – Present', age: 70, committees: 'Armed Services, Agriculture', committeeUrl: 'https://www.senate.gov/senators/tuberville' },
  { firstName: 'Josh', lastName: 'Gottheimer', party: 'Democrat', chamber: 'House', state: 'NJ', initials: 'JG', role: 'Representative', district: 'District 5', yearsInOffice: '2017 – Present', age: 49, committees: 'Financial Services', committeeUrl: 'https://clerk.house.gov/members/G000583' },
  { firstName: 'Dan', lastName: 'Crenshaw', party: 'Republican', chamber: 'House', state: 'TX', initials: 'DC', role: 'Representative', district: 'District 2', yearsInOffice: '2019 – Present', age: 40, committees: 'Energy and Commerce', committeeUrl: 'https://clerk.house.gov/members/C001120' },
  { firstName: 'Mark', lastName: 'Warner', party: 'Democrat', chamber: 'Senate', state: 'VA', initials: 'MW', role: 'Senator', district: null, yearsInOffice: '2009 – Present', age: 71, committees: 'Intelligence, Banking', committeeUrl: 'https://www.senate.gov/senators/warner' },
  { firstName: 'Ro', lastName: 'Khanna', party: 'Democrat', chamber: 'House', state: 'CA', initials: 'RK', role: 'Representative', district: 'District 17', yearsInOffice: '2017 – Present', age: 48, committees: 'Armed Services, Oversight', committeeUrl: 'https://clerk.house.gov/members/K000389' },
  { firstName: 'Vern', lastName: 'Buchanan', party: 'Republican', chamber: 'House', state: 'FL', initials: 'VB', role: 'Representative', district: 'District 16', yearsInOffice: '2007 – Present', age: 73, committees: 'Ways and Means', committeeUrl: 'https://clerk.house.gov/members/B001260' },
  { firstName: 'Shelley', lastName: 'Capito', party: 'Republican', chamber: 'Senate', state: 'WV', initials: 'SC', role: 'Senator', district: null, yearsInOffice: '2015 – Present', age: 71, committees: 'Appropriations, EPW', committeeUrl: 'https://www.senate.gov/senators/capito' },
  { firstName: 'Michael', lastName: 'McCaul', party: 'Republican', chamber: 'House', state: 'TX', initials: 'MC', role: 'Representative', district: 'District 10', yearsInOffice: '2005 – Present', age: 63, committees: 'Foreign Affairs', committeeUrl: 'https://clerk.house.gov/members/M001157' },
  { firstName: 'Patrick', lastName: 'Fallon', party: 'Republican', chamber: 'House', state: 'TX', initials: 'PF', role: 'Representative', district: 'District 4', yearsInOffice: '2021 – Present', age: 50, committees: 'Armed Services', committeeUrl: 'https://clerk.house.gov/members/F000246' },
  { firstName: 'Brad', lastName: 'Schneider', party: 'Democrat', chamber: 'House', state: 'IL', initials: 'BS', role: 'Representative', district: 'District 10', yearsInOffice: '2017 – Present', age: 64, committees: 'Financial Services', committeeUrl: 'https://clerk.house.gov/members/S001190' },
  { firstName: 'Markwayne', lastName: 'Mullin', party: 'Republican', chamber: 'Senate', state: 'OK', initials: 'Mk', role: 'Senator', district: null, yearsInOffice: '2023 – Present', age: 47, committees: 'Indian Affairs, HELP', committeeUrl: 'https://www.senate.gov/senators/mullin' },
  { firstName: 'Darin', lastName: 'LaHood', party: 'Republican', chamber: 'House', state: 'IL', initials: 'DL', role: 'Representative', district: 'District 16', yearsInOffice: '2015 – Present', age: 57, committees: 'Ways and Means', committeeUrl: 'https://clerk.house.gov/members/L000585' },
  // Featured / seed chart names not in TRACKED above
  { firstName: 'Debbie', lastName: 'Wasserman Schultz', party: 'Democrat', chamber: 'House', state: 'FL', initials: 'DW', role: 'Representative', district: 'District 25', yearsInOffice: '2005 – Present', age: 58, committees: 'Appropriations', committeeUrl: 'https://clerk.house.gov/members/W000797' },
  { firstName: 'Virginia', lastName: 'Foxx', party: 'Republican', chamber: 'House', state: 'NC', initials: 'VF', role: 'Representative', district: 'District 5', yearsInOffice: '2005 – Present', age: 81, committees: 'Education and Workforce', committeeUrl: 'https://clerk.house.gov/members/F000450' },
  { firstName: 'David', lastName: 'Rouzer', party: 'Republican', chamber: 'House', state: 'NC', initials: 'DR', role: 'Representative', district: 'District 7', yearsInOffice: '2015 – Present', age: 51, committees: 'Transportation', committeeUrl: 'https://clerk.house.gov/members/R000603' },
];

function withSlug(entry) {
  const name = `${entry.firstName} ${entry.lastName}`;
  return {
    ...entry,
    name,
    slug: slugify(name),
    stateFull: US_STATE_FULL[entry.state] || entry.state,
  };
}

const _withSlugs = CAPITOL_POLITICIAN_REGISTRY.map(withSlug);

export function getPoliticianBySlug(slug) {
  if (!slug) return null;
  const s = String(slug).toLowerCase().trim();
  return _withSlugs.find((p) => p.slug === s) || null;
}

/** Fallback: parse hyphen slug into likely first/last for FMP lookup */
export function parseSlugToName(slug) {
  const parts = String(slug || '')
    .toLowerCase()
    .split('-')
    .filter(Boolean);
  if (parts.length < 2) return null;
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const firstName = cap(parts[0]);
  const lastName = parts.slice(1).map(cap).join(' ');
  return {
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    slug: slug,
  };
}

export function getSimilarTraders(excludeSlug, party, limit = 3) {
  const ex = excludeSlug?.toLowerCase();
  let pool = _withSlugs.filter((p) => p.slug !== ex);
  if (party && party !== 'Unknown') {
    const same = pool.filter((p) => p.party === party);
    const other = pool.filter((p) => p.party !== party);
    pool = [...same, ...other];
  }
  const seen = new Set();
  const uniq = [];
  for (const p of pool) {
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    uniq.push(p);
    if (uniq.length >= limit) break;
  }
  return uniq.map((p, i) => ({
    slug: p.slug,
    name: p.name,
    party: p.party,
    chamber: p.chamber,
    state: p.state,
    initials: p.initials,
    overlap: 45 + ((i * 7) % 30),
  }));
}

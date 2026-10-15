/**
 * OFAC sanctions program tags -> plain-English metadata for the Sanctions &
 * Trade Policy page. Pure data, safe on server and client.
 *
 * Every tag the SDN list carries (the `programs` array on sanctions_entries)
 * maps to:
 *   label   what the program is, in words
 *   theme   one of THEMES, which drives the treemap colour and grouping
 *   target  the jurisdiction the program is aimed at, or null for global
 *           (thematic) programs such as counter-terrorism or Global Magnitsky
 *
 * A tag not listed here is shown by its code under the Other theme, never
 * guessed. The target is the program's own scope as OFAC names it, which is
 * distinct from where a listed party is located (the `countries` array, from
 * the addresses OFAC publishes).
 */

export const THEMES = {
  russia: { label: 'Russia & Ukraine', color: 'var(--info)' },
  iran: { label: 'Iran', color: 'var(--warning)' },
  terror: { label: 'Counter-terrorism', color: 'var(--purple)' },
  narcotics: { label: 'Narcotics & organized crime', color: 'var(--orange)' },
  wmd: { label: 'Non-proliferation', color: 'var(--cyan)' },
  rights: { label: 'Human rights & corruption', color: 'var(--pink)' },
  cyber: { label: 'Cyber & election interference', color: 'var(--indigo)' },
  country: { label: 'Other country programs', color: 'var(--positive)' },
  other: { label: 'Other', color: 'var(--text-faint)' },
};

const P = (label, theme, target = null) => ({ label, theme, target });

const PROGRAMS = {
  // Russia & Ukraine
  'RUSSIA-EO14024': P('Russia harmful foreign activities (EO 14024)', 'russia', 'Russia'),
  'RUSSIA-EO14065': P('Occupied regions of Ukraine (EO 14065)', 'russia', 'Ukraine'),
  'UKRAINE-EO13660': P('Ukraine-related (EO 13660)', 'russia', 'Russia'),
  'UKRAINE-EO13661': P('Ukraine-related (EO 13661)', 'russia', 'Russia'),
  'UKRAINE-EO13662': P('Russia sectoral sanctions (EO 13662)', 'russia', 'Russia'),
  'UKRAINE-EO13685': P('Crimea region (EO 13685)', 'russia', 'Ukraine'),
  'CAATSA - RUSSIA': P('CAATSA, Russia', 'russia', 'Russia'),
  'PEESA-EO14039': P("Europe's energy security, Nord Stream 2 (PEESA)", 'russia', 'Russia'),
  MAGNIT: P('Sergei Magnitsky Act', 'rights', 'Russia'),
  /* OFAC program tag definitions (ofac.treasury.gov, "Program Tag
     Definitions for OFAC Sanctions Lists"): "Support for the Sovereignty,
     Integrity, Democracy, and Economic Stability of Ukraine Act of 2014",
     program "Ukraine-/Russia-related Sanctions". OFAC names no single
     target jurisdiction for the act, so none is set (not guessed). */
  SSIDES: P('Ukraine sovereignty and stability act (SSIDES, 2014)', 'russia'),
  BELARUS: P('Belarus', 'country', 'Belarus'),
  'BELARUS-EO14038': P('Belarus (EO 14038)', 'country', 'Belarus'),

  // Iran
  IRAN: P('Iranian Transactions and Sanctions Regulations', 'iran', 'Iran'),
  IFSR: P('Iranian Financial Sanctions Regulations', 'iran', 'Iran'),
  IRGC: P('Islamic Revolutionary Guard Corps', 'iran', 'Iran'),
  'IRAN-EO13902': P('Iran economic sectors (EO 13902)', 'iran', 'Iran'),
  'IRAN-EO13846': P('Reimposed Iran sanctions (EO 13846)', 'iran', 'Iran'),
  'IRAN-EO13876': P("Iran Supreme Leader's office (EO 13876)", 'iran', 'Iran'),
  'IRAN-EO13871': P('Iran metals sectors (EO 13871)', 'iran', 'Iran'),
  'IRAN-HR': P('Iran human rights abuses', 'iran', 'Iran'),
  'IRAN-TRA': P('Iran Threat Reduction Act', 'iran', 'Iran'),
  'IRAN-CON-ARMS-EO': P('Iran conventional arms', 'iran', 'Iran'),
  IFCA: P('Iran Freedom and Counter-Proliferation Act', 'iran', 'Iran'),
  'CAATSA - IRAN': P('CAATSA, Iran', 'iran', 'Iran'),
  'HRIT-IR': P('Iran rights abuses via information technology', 'iran', 'Iran'),

  // Thematic (global)
  SDGT: P('Specially Designated Global Terrorists', 'terror'),
  FTO: P('Foreign Terrorist Organizations', 'terror'),
  NPWMD: P('Weapons of mass destruction proliferators', 'wmd'),
  SDNTK: P('Foreign Narcotics Kingpin Act', 'narcotics'),
  SDNT: P('Narcotics traffickers (EO 12978)', 'narcotics'),
  'ILLICIT-DRUGS-EO14059': P('Illicit drug trade (EO 14059)', 'narcotics'),
  TCO: P('Transnational criminal organizations', 'narcotics'),
  GLOMAG: P('Global Magnitsky (human rights and corruption)', 'rights'),
  'HOSTAGES-EO14078': P('Hostage-taking and wrongful detention', 'rights'),
  UHRPA: P('Uyghur Human Rights Policy Act', 'rights', 'China'),
  CYBER2: P('Malicious cyber activity (EO 13694)', 'cyber'),
  CYBER3: P('Malicious cyber activity', 'cyber'),
  CYBER4: P('Malicious cyber activity', 'cyber'),
  'ELECTION-EO13848': P('Foreign interference in US elections', 'cyber'),
  /* OFAC: "Protecting American Intellectual Property Act of 2022 (PAIPA),
     Public Law 117-336", program "Cyber-Related Sanctions". Global. */
  PAIPA: P('Protecting American Intellectual Property Act (PAIPA)', 'cyber'),
  /* OFAC: "Non-SDN, Palestinian Legislative Council List, General License 4,
     issued pursuant to the Global Terrorism Sanctions Regulations (31 C.F.R.
     Part 594)", program "Counter Terrorism Sanctions". A non-SDN list tag:
     OFAC names no target jurisdiction, so none is set. */
  'NS-PLC': P('Palestinian Legislative Council list, non-SDN (GL 4)', 'terror'),
  'ICC-EO14203': P('International Criminal Court (EO 14203)', 'other'),

  // Country programs
  DPRK: P('North Korea', 'country', 'North Korea'),
  DPRK2: P('North Korea', 'country', 'North Korea'),
  DPRK3: P('North Korea', 'country', 'North Korea'),
  DPRK4: P('North Korea', 'country', 'North Korea'),
  'DPRK-NKSPEA': P('North Korea Sanctions and Policy Enhancement Act', 'country', 'North Korea'),
  VENEZUELA: P('Venezuela', 'country', 'Venezuela'),
  'VENEZUELA-EO13850': P('Venezuela (EO 13850)', 'country', 'Venezuela'),
  'VENEZUELA-EO13884': P('Government of Venezuela (EO 13884)', 'country', 'Venezuela'),
  CUBA: P('Cuban Assets Control Regulations', 'country', 'Cuba'),
  'CUBA-EO14404': P('Cuba (EO 14404)', 'country', 'Cuba'),
  'BURMA-EO14014': P('Burma (EO 14014)', 'country', 'Burma'),
  'PAARSSR-EO13894': P(
    'Assad accountability and Syria stabilization (EO 13894)',
    'country',
    'Syria',
  ),
  'HRIT-SY': P('Syria rights abuses via information technology', 'country', 'Syria'),
  BALKANS: P('Western Balkans', 'country', 'Western Balkans'),
  'BALKANS-EO14033': P('Western Balkans (EO 14033)', 'country', 'Western Balkans'),
  IRAQ2: P('Iraq', 'country', 'Iraq'),
  IRAQ3: P('Iraq', 'country', 'Iraq'),
  DRCONGO: P('Democratic Republic of the Congo', 'country', 'DR Congo'),
  NICARAGUA: P('Nicaragua', 'country', 'Nicaragua'),
  'NICARAGUA-NHRAA': P('Nicaragua Human Rights and Anticorruption Act', 'country', 'Nicaragua'),
  'SUDAN-EO14098': P('Sudan (EO 14098)', 'country', 'Sudan'),
  DARFUR: P('Darfur', 'country', 'Sudan'),
  'SOUTH SUDAN': P('South Sudan', 'country', 'South Sudan'),
  LIBYA2: P('Libya', 'country', 'Libya'),
  LIBYA3: P('Libya', 'country', 'Libya'),
  SOMALIA: P('Somalia', 'country', 'Somalia'),
  CAR: P('Central African Republic', 'country', 'Central African Republic'),
  LEBANON: P('Lebanon', 'country', 'Lebanon'),
  YEMEN: P('Yemen', 'country', 'Yemen'),
  'MALI-EO13882': P('Mali (EO 13882)', 'country', 'Mali'),
};

/** True when the tag has curated metadata (for the coverage meter). */
export function hasProgramMeta(code) {
  return Object.prototype.hasOwnProperty.call(PROGRAMS, code);
}

/** Metadata for one tag; unknown tags keep their code and fall under Other. */
export function programMeta(code) {
  return PROGRAMS[code] || { label: code, theme: 'other', target: null };
}

export function themeOf(code) {
  return THEMES[programMeta(code).theme] || THEMES.other;
}

/* ── map names ────────────────────────────────────────────────────────────
   OFAC address countries -> world-atlas countries-110m names. Names that
   already match are not listed. Regions fold into the country that contains
   them; disputed regions (Kashmir, Kafia Kingi) and the CIS stay off the map
   and are counted in the "not mapped" note instead. */
const ATLAS_NAME = {
  'Korea, North': 'North Korea',
  'Korea, South': 'South Korea',
  Burma: 'Myanmar',
  'Congo, Democratic Republic of the': 'Dem. Rep. Congo',
  'Congo, Republic of the': 'Congo',
  'United States': 'United States of America',
  'South Sudan': 'S. Sudan',
  'Central African Republic': 'Central African Rep.',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'Dominican Republic': 'Dominican Rep.',
  'Equatorial Guinea': 'Eq. Guinea',
  'Czech Republic': 'Czechia',
  'Cote d Ivoire': "Côte d'Ivoire",
  'North Macedonia, The Republic of': 'Macedonia',
  'The Gambia': 'Gambia',
  'Bahamas, The': 'Bahamas',
  Palestinian: 'Palestine',
  'West Bank': 'Palestine',
  'Region: West Bank': 'Palestine',
  'Region: Gaza': 'Palestine',
  'Region: North Gaza': 'Palestine',
  'Region: Northern Gaza': 'Palestine',
  'Region: Iran': 'Iran',
  'Region: Russia': 'Russia',
  'Region: Crimea': 'Ukraine',
  'Region: Northern Mali': 'Mali',
};

/* Jurisdictions too small for the 110m outlines, drawn as dots at their
   approximate centre (longitude, latitude). */
export const SMALL_JURISDICTIONS = {
  Singapore: [103.82, 1.35],
  'Hong Kong': [114.17, 22.32],
  Macau: [113.55, 22.2],
  Malta: [14.4, 35.9],
  'Marshall Islands': [171.2, 7.1],
  Palau: [134.6, 7.5],
  Samoa: [-172.1, -13.76],
  Maldives: [73.2, 3.2],
  Seychelles: [55.49, -4.68],
  Mauritius: [57.55, -20.35],
  Comoros: [43.33, -11.65],
  Bahrain: [50.55, 26.07],
  Liechtenstein: [9.55, 47.16],
  Monaco: [7.42, 43.74],
  'San Marino': [12.46, 43.94],
  Gibraltar: [-5.35, 36.14],
  Jersey: [-2.13, 49.21],
  Guernsey: [-2.58, 49.45],
  'Man, Isle of': [-4.55, 54.24],
  Bermuda: [-64.78, 32.3],
  'Cayman Islands': [-81.25, 19.31],
  'Virgin Islands, British': [-64.62, 18.42],
  'Saint Kitts and Nevis': [-62.7, 17.3],
  'Antigua and Barbuda': [-61.8, 17.06],
  Dominica: [-61.37, 15.41],
  'Saint Vincent and the Grenadines': [-61.2, 13.25],
  Barbados: [-59.54, 13.19],
  Curacao: [-68.98, 12.17],
  Aruba: [-69.97, 12.52],
};

/** OFAC country string -> the name it is drawn under (or null: not mapped). */
export function atlasName(country, atlasNames) {
  const n = ATLAS_NAME[country] || country;
  if (atlasNames.has(n)) return n;
  if (SMALL_JURISDICTIONS[country]) return country;
  return null;
}

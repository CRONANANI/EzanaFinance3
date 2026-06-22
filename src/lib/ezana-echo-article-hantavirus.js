/* ════════════════════════════════════════════════════════════════════════════
   Ezana Echo — Hantavirus: From The Four Corners To The Open Sea
   Data + content blocks for the interactive long-form piece.
   ════════════════════════════════════════════════════════════════════════════ */

/* ── US Hantavirus Cases by Year (CDC 1993-2023) ──────────────────────────
   Source: CDC NNDSS — "Chart of U.S. Hantavirus Cases by Year"
   Each year has: died, lived, unknown outcome counts.
   ──────────────────────────────────────────────────────────── */
export const HANTAVIRUS_YEARLY_DATA = [
  { year: 1993, died: 27, lived: 21, unknown: 0 },
  { year: 1994, died: 12, lived: 20, unknown: 0 },
  { year: 1995, died: 10, lived: 14, unknown: 1 },
  { year: 1996, died: 7, lived: 15, unknown: 0 },
  { year: 1997, died: 4, lived: 19, unknown: 0 },
  { year: 1998, died: 9, lived: 24, unknown: 0 },
  { year: 1999, died: 14, lived: 29, unknown: 1 },
  { year: 2000, died: 11, lived: 36, unknown: 0 },
  { year: 2001, died: 3, lived: 8, unknown: 0 },
  { year: 2002, died: 10, lived: 21, unknown: 0 },
  { year: 2003, died: 9, lived: 22, unknown: 0 },
  { year: 2004, died: 9, lived: 18, unknown: 0 },
  { year: 2005, died: 10, lived: 25, unknown: 0 },
  { year: 2006, died: 17, lived: 23, unknown: 1 },
  { year: 2007, died: 12, lived: 17, unknown: 0 },
  { year: 2008, died: 12, lived: 17, unknown: 1 },
  { year: 2009, died: 6, lived: 14, unknown: 0 },
  { year: 2010, died: 6, lived: 16, unknown: 0 },
  { year: 2011, died: 6, lived: 8, unknown: 7 },
  { year: 2012, died: 14, lived: 16, unknown: 0 },
  { year: 2013, died: 9, lived: 12, unknown: 14 },
  { year: 2014, died: 9, lived: 25, unknown: 0 },
  { year: 2015, died: 14, lived: 24, unknown: 0 },
  { year: 2016, died: 14, lived: 24, unknown: 0 },
  { year: 2017, died: 9, lived: 23, unknown: 4 },
  { year: 2018, died: 5, lived: 13, unknown: 2 },
  { year: 2019, died: 5, lived: 15, unknown: 0 },
  { year: 2020, died: 4, lived: 12, unknown: 0 },
  { year: 2021, died: 4, lived: 9, unknown: 0 },
  { year: 2022, died: 6, lived: 7, unknown: 0 },
  { year: 2023, died: 7, lived: 20, unknown: 0 },
];

/* ── US Hantavirus Cases by State (CDC 1993-2023) ──────────────────────────
   Source: CDC — "Map of U.S. Cumulative Cases of Hantavirus by State through 2023"
   ──────────────────────────────────────────────────────────── */
export const HANTAVIRUS_STATE_DATA = [
  { state: 'NM', name: 'New Mexico', cases: 129, lat: 34.5, lng: -106.0 },
  { state: 'CO', name: 'Colorado', cases: 121, lat: 38.9, lng: -105.8 },
  { state: 'AZ', name: 'Arizona', cases: 92, lat: 34.3, lng: -111.7 },
  { state: 'CA', name: 'California', cases: 79, lat: 37.3, lng: -119.5 },
  { state: 'WA', name: 'Washington', cases: 61, lat: 47.5, lng: -120.5 },
  { state: 'TX', name: 'Texas', cases: 49, lat: 31.5, lng: -99.5 },
  { state: 'UT', name: 'Utah', cases: 48, lat: 39.3, lng: -111.7 },
  { state: 'MT', name: 'Montana', cases: 46, lat: 47.0, lng: -110.0 },
  { state: 'NV', name: 'Nevada', cases: 39, lat: 39.5, lng: -117.0 },
  { state: 'OR', name: 'Oregon', cases: 27, lat: 44.0, lng: -120.5 },
  { state: 'ID', name: 'Idaho', cases: 25, lat: 44.0, lng: -114.7 },
  { state: 'SD', name: 'South Dakota', cases: 21, lat: 44.5, lng: -100.2 },
  { state: 'ND', name: 'North Dakota', cases: 20, lat: 47.5, lng: -100.5 },
  { state: 'KS', name: 'Kansas', cases: 20, lat: 38.5, lng: -98.8 },
  { state: 'WY', name: 'Wyoming', cases: 19, lat: 43.0, lng: -107.5 },
  { state: 'IA', name: 'Iowa', cases: 12, lat: 42.0, lng: -93.5 },
  { state: 'PA', name: 'Pennsylvania', cases: 9, lat: 40.9, lng: -77.8 },
  { state: 'OK', name: 'Oklahoma', cases: 9, lat: 35.5, lng: -97.5 },
  { state: 'NE', name: 'Nebraska', cases: 9, lat: 41.5, lng: -100.0 },
  { state: 'LA', name: 'Louisiana', cases: 8, lat: 31.2, lng: -92.5 },
  { state: 'NY', name: 'New York', cases: 6, lat: 43.0, lng: -75.5 },
  { state: 'IL', name: 'Illinois', cases: 6, lat: 40.0, lng: -89.4 },
  { state: 'WI', name: 'Wisconsin', cases: 5, lat: 44.5, lng: -89.8 },
  { state: 'IN', name: 'Indiana', cases: 4, lat: 39.8, lng: -86.2 },
  { state: 'FL', name: 'Florida', cases: 3, lat: 28.5, lng: -82.5 },
  { state: 'WV', name: 'West Virginia', cases: 2, lat: 38.6, lng: -80.6 },
  { state: 'MN', name: 'Minnesota', cases: 2, lat: 46.3, lng: -94.2 },
  { state: 'MI', name: 'Michigan', cases: 2, lat: 44.3, lng: -84.5 },
  { state: 'MD', name: 'Maryland', cases: 2, lat: 39.0, lng: -76.7 },
  { state: 'DC', name: 'D.C.', cases: 2, lat: 38.9, lng: -77.0 },
  { state: 'VT', name: 'Vermont', cases: 2, lat: 44.1, lng: -72.6 },
  { state: 'NC', name: 'North Carolina', cases: 1, lat: 35.6, lng: -79.8 },
  { state: 'TN', name: 'Tennessee', cases: 2, lat: 35.9, lng: -86.4 },
  { state: 'VA', name: 'Virginia', cases: 1, lat: 37.5, lng: -79.0 },
  { state: 'AR', name: 'Arkansas', cases: 1, lat: 34.8, lng: -92.2 },
  { state: 'ME', name: 'Maine', cases: 1, lat: 45.3, lng: -69.0 },
  { state: 'MA', name: 'Massachusetts', cases: 1, lat: 42.4, lng: -71.4 },
  { state: 'NH', name: 'New Hampshire', cases: 1, lat: 43.7, lng: -71.6 },
  { state: 'CT', name: 'Connecticut', cases: 1, lat: 41.6, lng: -72.7 },
  { state: 'RI', name: 'Rhode Island', cases: 1, lat: 41.7, lng: -71.5 },
  { state: 'DE', name: 'Delaware', cases: 1, lat: 39.0, lng: -75.5 },
];

/* ── Article export ────────────────────────────────────────── */
export const hantavirusArticle = {
  id: 'hantavirus-from-four-corners-to-open-sea',
  entities: {
    people: [],
    terms: [
      { id: 'who-notification', label: 'WHO Notification' },
      { id: 'hantavirus-definition', label: 'Hantavirus' },
      { id: 'andes-virus', label: 'Andes Virus' },
      { id: 'nndss', label: 'NNDSS Surveillance System' },
      { id: 'rodent-population-dynamics', label: 'Rodent Population Dynamics' },
      { id: 'four-corners-region', label: 'Four Corners Region' },
      { id: 'prodromal-phase', label: 'Incubation Period' },
      { id: 'maritime-epidemiological-investigation', label: 'Contact Tracing' },
      { id: 'ecmo', label: 'Extracorporeal Membrane Oxygenation (ECMO)' },
      { id: 'pandemic-preparedness', label: 'Pandemic Preparedness' },
      { id: 'ihr-notifications', label: 'IHR Notifications' },
      { id: 'pcr-diagnostics', label: 'PCR Diagnostics' },
    ],
  },
  title: 'Hantavirus: From The Four Corners To The Open Sea',
  subtitle:
    'A 30-year-old virus reemerges on a cruise ship. The investment implications span biodefense, diagnostics, and travel.',
  excerpt:
    "In May 2026, a hantavirus outbreak aboard the MV Hondius expedition cruise ship killed three passengers and sickened at least four others — the most high-profile cluster in the virus's modern history. With a 38% fatality rate, no approved vaccine, and no antiviral treatment, hantavirus is one of the deadliest pathogens without a pharmaceutical countermeasure. Here's what investors need to know.",
  heroImage: null,
  contentBlocks: [
    {
      type: 'chart',
      variant: 'hantavirus-yearly',
      title: 'U.S. Hantavirus Cases by Year (1993–2023)',
      caption: 'CDC / NNDSS Surveillance Data',
    },
    {
      type: 'chart',
      variant: 'hantavirus-state-map',
      title: 'Cumulative Hantavirus Cases by State (1993–2023)',
      caption: 'CDC Surveillance',
    },

    { type: 'heading', text: 'A Cruise Ship, A Virus, And A 38% Kill Rate', level: 2 },
    {
      type: 'paragraph',
      text: 'On April 1, 2026, the MV Hondius — a Dutch-flagged expedition cruise ship operated by Oceanwide Expeditions — departed Ushuaia, Argentina, carrying 147 passengers and crew from 23 countries. By April 11, a passenger was dead. By April 26, his spouse had died in a Johannesburg emergency room after being evacuated from Saint Helena. By May 4, the [[kw:who-notification]]World Health Organization[[/kw]] had confirmed a cluster of seven cases, including three deaths, aboard a ship now anchored off Cabo Verde with no country willing to let it dock.',
    },
    {
      type: 'paragraph',
      text: 'The pathogen: [[kw:hantavirus-definition]]hantavirus[[/kw]], a rodent-borne virus that causes hantavirus pulmonary syndrome (HPS) — a disease with no approved vaccine, no antiviral treatment, and a case fatality rate of roughly 38%. The specific strain under investigation is the [[kw:andes-virus]]Andes virus[[/kw]], the only hantavirus documented to spread between humans. Every other known hantavirus is a dead-end infection: you catch it from a rodent, but you cannot pass it to another person.',
    },
    {
      type: 'paragraph',
      text: 'If human-to-human transmission is confirmed in this closed, high-density cruise ship environment, it fundamentally changes the risk calculus for this pathogen class.',
    },

    { type: 'heading', text: 'Thirty Years Of Data: What The CDC Numbers Show', level: 2 },
    {
      type: 'paragraph',
      text: 'The United States has tracked hantavirus cases through the [[kw:nndss]]National Notifiable Diseases Surveillance System (NNDSS)[[/kw]] since 1993, when the "Four Corners disease" was first identified in the desert Southwest. Between 1993 and 2023, 864 confirmed cases were reported — a small number by infectious disease standards, but notable for the severity: roughly one-third of patients died.',
    },
    {
      type: 'paragraph',
      text: 'The yearly chart reveals three patterns. First, the 1993 spike — 48 cases in the discovery year, driven by a surge in deer mouse populations after heavy El Niño rains. Second, a cyclical rhythm tied to [[kw:rodent-population-dynamics]]rodent population dynamics[[/kw]] — wet years produce more food, which produces more mice, which produces more hantavirus exposure. Third, a post-2017 decline to 12-27 cases per year, likely driven by increased awareness and prevention measures rather than any pharmaceutical intervention.',
    },
    {
      type: 'paragraph',
      text: 'The geographic concentration is extreme. Over 94% of cases occurred west of the Mississippi River. New Mexico (129 cases), Colorado (121), Arizona (92), and California (79) account for nearly half of all US cases. These are the [[kw:four-corners-region]]Four Corners[[/kw]] states — the arid, rural West where deer mice thrive in proximity to human structures.',
    },

    { type: 'heading', text: 'The MV Hondius Timeline: How An Outbreak Unfolds At Sea', level: 2 },
    {
      type: 'paragraph',
      text: 'The cruise ship outbreak is unprecedented for hantavirus. The MV Hondius departed from Ushuaia — deep in Andes virus territory — and visited Antarctica, South Georgia, and remote Atlantic islands before the first passenger fell ill. The [[kw:prodromal-phase]]incubation period[[/kw]] for hantavirus ranges from 1 to 8 weeks, which means passengers could have been infected before boarding, at any port of call, or onboard from contaminated surfaces.',
    },
    {
      type: 'paragraph',
      text: "Two hypotheses are being investigated. First, onboard rodent contamination — passengers inhaling aerosolized virus particles from infected rodent urine, droppings, or saliva that were present in the ship's infrastructure. Second, and more consequential: person-to-person spread of the Andes strain in a confined, recirculated-air environment. Several of the ill passengers were avid birdwatchers who had traveled extensively in South America before boarding, creating multiple potential exposure windows.",
    },
    {
      type: 'paragraph',
      text: 'The WHO assessed global risk as low but initiated [[kw:maritime-epidemiological-investigation]]contact tracing[[/kw]] for passengers who had disembarked at various ports and for fellow travelers on the medical evacuation flight to Johannesburg. PCR testing confirmed hantavirus in two patients; serology and full genome sequencing are ongoing.',
    },

    { type: 'heading', text: 'No Vaccine. No Treatment. A Market Gap.', level: 2 },
    {
      type: 'paragraph',
      text: 'There is currently no FDA-approved vaccine or antiviral drug for any hantavirus disease. Treatment is entirely supportive — oxygen therapy, mechanical ventilation, and in severe cases, [[kw:ecmo]]extracorporeal membrane oxygenation (ECMO)[[/kw]]. Patients who are diagnosed early and receive intensive care have better outcomes, but the disease progresses rapidly from initial flu-like symptoms to acute respiratory distress syndrome (ARDS) and shock, often within 48-72 hours.',
    },
    {
      type: 'paragraph',
      text: 'For investors, the pharmaceutical void is both a risk and an opportunity. In February 2026, researchers at the University of Texas at Austin published new structural insights into hantavirus surface proteins — the first high-resolution blueprint of how the virus attaches to human cells. The NIH has funded the Provident consortium through its ReVAMPP program specifically to develop countermeasures for hantaviruses and other [[kw:pandemic-preparedness]]pandemic-preparedness[[/kw]] pathogens.',
    },
    {
      type: 'paragraph',
      text: 'The biodefense sector — companies like Emergent BioSolutions (EBS), SIGA Technologies (SIGA), and Vir Biotechnology (VIR) — has historically traded on government contract announcements and outbreak news cycles. The question for this outbreak is whether it generates enough sustained attention to drive funding into hantavirus-specific R&D, or whether it fades like previous clusters.',
    },

    { type: 'heading', text: 'The FIFA World Cup Problem', level: 2 },
    {
      type: 'paragraph',
      text: 'The timing of this outbreak is uniquely dangerous. The FIFA World Cup 2026 opens in six weeks across 11 American cities — one of the largest mass gathering events ever staged on US soil. The United States withdrew from the WHO in January 2025, which means it no longer receives [[kw:ihr-notifications]]IHR (International Health Regulations) notifications[[/kw]] through the formal cascade that compresses the timeline between detecting a signal and responding to it.',
    },
    {
      type: 'paragraph',
      text: 'For the travel and hospitality sector, the cruise industry faces the most immediate reputational risk. Royal Caribbean (RCL), Carnival (CCL), and Norwegian Cruise Line (NCLH) stocks have historically dipped 2-5% on infectious disease news cycles, even when the underlying risk to their operations is minimal. The MV Hondius incident — a ship stranded at sea with no port willing to accept it — is the exact narrative that erodes consumer confidence in cruise bookings.',
    },
    {
      type: 'paragraph',
      text: 'The diagnostic implications are also worth monitoring. If the Andes strain can spread person-to-person in enclosed environments, rapid point-of-care testing becomes critical for early intervention. Companies with [[kw:pcr-diagnostics]]PCR diagnostic platforms[[/kw]] capable of testing for hantavirus — including Cepheid (part of Danaher, DHR), BioMérieux, and Hologic (HOLX) — could see incremental demand.',
    },

    { type: 'heading', text: 'What To Watch', level: 2 },
    {
      type: 'paragraph',
      text: 'Three things will determine whether this outbreak remains a contained incident or becomes a structural catalyst. First, the genome sequencing results: if the Andes strain shows new mutations that enhance transmissibility, the risk assessment changes entirely. Second, NIH and BARDA funding announcements: any acceleration of the ReVAMPP program or emergency countermeasure contracts would directly benefit biodefense names. Third, the World Cup: 11 cities, millions of international visitors, and a country operating outside the WHO information network — the epidemiological monitoring gap is real, and the market will price it if hantavirus cases surface domestically during the tournament.',
    },
  ],
  author: 'Ezana Finance Editorial',
  category: 'markets',
  tags: ['markets', 'public-health', 'biotech', 'healthcare'],
  featured: false,
  readTime: 8,
  publishedAt: '2026-05-06',
  tags: ['hantavirus', 'biodefense', 'public-health', 'cruise-lines', 'diagnostics'],
  relatedTickers: ['EBS', 'SIGA', 'VIR', 'RCL', 'CCL', 'NCLH', 'DHR', 'HOLX'],
};

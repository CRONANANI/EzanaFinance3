// src/lib/thiel-network-data.js
// Data for the interactive Thiel-network pie chart in the Peter Thiel Echo article.
// Each person card is built from sourced public reporting (see article header for
// citations). "headlines" are dated and may go stale — refresh periodically; never
// fabricate. Avatars use a LOCAL path so the team can supply properly-licensed or
// initials-based images; the component falls back to initials if the file is absent.
//
// Spheres mirror the attached network diagram: 'sv' (Silicon Valley), 'dc'
// (Washington DC), 'uk' (United Kingdom). Several figures span spheres; each is
// assigned to its primary sphere for the pie, noted in `alsoIn` where relevant.

export const THIEL_NETWORK_SPHERES = [
  { id: 'uk', label: 'United Kingdom', color: 'var(--echo-chart-red)' },
  { id: 'sv', label: 'Silicon Valley', color: 'var(--echo-chart-blue)' },
  { id: 'dc', label: 'Washington DC', color: 'var(--echo-chart-purple)' },
];

// relationship: how the person connects to Thiel. tie: 'business' | 'political' |
// 'intellectual' | 'association' (used only for a small color-coded chip).
export const THIEL_NETWORK_PEOPLE = [
  // ---------- Silicon Valley ----------
  {
    id: 'musk',
    name: 'Elon Musk',
    sphere: 'sv',
    role: 'CEO, Tesla & SpaceX; owner of X',
    tie: 'business',
    avatar: '/images/echo/thiel-network/musk.jpg',
    relationship:
      "Thiel's oldest major tie. Musk's X.com merged with Thiel's Confinity in 2000 to form PayPal; both became the nucleus of the 'PayPal Mafia.'",
    markets:
      'Runs Tesla (EVs/energy) and SpaceX (launch/Starlink); owns X. Tesla is a mega-cap equity whose moves ripple across EV and battery supply chains; SpaceX and xAI are high-valuation private names.',
    companies: ['Tesla (TSLA)', 'SpaceX (private)', 'xAI', 'X (private)', 'Neuralink'],
    headlines: [
      {
        date: 'Jun 2026',
        text: 'Continued scrutiny of SpaceX/xAI valuations and capital-raising claims.',
      },
    ],
  },
  {
    id: 'zuckerberg',
    name: 'Mark Zuckerberg',
    sphere: 'sv',
    role: 'CEO, Meta Platforms',
    tie: 'business',
    avatar: '/images/echo/thiel-network/zuckerberg.jpg',
    relationship:
      "Thiel was Facebook's first outside investor in 2004 ($500K) and sat on the board for years as it became Meta.",
    markets:
      'Leads Meta, a mega-cap whose ad-driven cash flows fund heavy AI and reality-labs capex. A bellwether for digital advertising and AI infrastructure spend.',
    companies: ['Meta Platforms (META)'],
    headlines: [
      { date: '2026', text: 'Ongoing AI capex expansion and platform-governance debates.' },
    ],
  },
  {
    id: 'karp',
    name: 'Alex Karp',
    sphere: 'sv',
    role: 'CEO, Palantir Technologies',
    tie: 'business',
    avatar: '/images/echo/thiel-network/karp.jpg',
    relationship:
      "Thiel's Stanford-era associate; installed as Palantir CEO at its 2003 founding. Runs the company that operationalizes Thiel's data thesis.",
    markets:
      'CEO of Palantir, a data-analytics firm whose growth is tied to government/defense contracts and, increasingly, commercial AI deployments. A closely watched AI/defense equity.',
    companies: ['Palantir Technologies (PLTR)'],
    headlines: [
      {
        date: '2026',
        text: 'Palantir defense/government contract momentum; high-multiple AI-name scrutiny.',
      },
    ],
  },
  {
    id: 'altman',
    name: 'Sam Altman',
    sphere: 'sv',
    role: 'CEO, OpenAI',
    tie: 'business',
    avatar: '/images/echo/thiel-network/altman.jpg',
    relationship:
      'Thiel was an early OpenAI investor and the two co-invested in ventures such as the nuclear startup Oklo, though they later diverged on AI commercialization.',
    markets:
      'Leads OpenAI, the most influential AI lab; its model releases move the entire AI-infrastructure complex (compute, chips, energy). Also tied to nuclear (Oklo).',
    companies: ['OpenAI (private)', 'Oklo (OKLO)', 'Helion (private)'],
    headlines: [
      {
        date: '2026',
        text: 'OpenAI corporate restructuring and capital-raising remain market-moving.',
      },
    ],
  },
  {
    id: 'ellison',
    name: 'Larry Ellison',
    sphere: 'sv',
    role: 'Co-founder & CTO, Oracle',
    tie: 'association',
    avatar: '/images/echo/thiel-network/ellison.jpg',
    relationship:
      "An older-generation tech billionaire aligned with the same political moment; a strategic fellow-traveler whose database/government ambitions rhyme with Palantir's.",
    markets:
      'Oracle is a mega-cap enterprise-software and cloud player; its government-cloud and AI-infrastructure deals make it a key beneficiary of the AI capex cycle.',
    companies: ['Oracle (ORCL)'],
    headlines: [
      {
        date: '2026',
        text: 'Oracle cloud/AI-infrastructure backlog drives renewed investor attention.',
      },
    ],
  },
  // ---------- Washington DC ----------
  {
    id: 'trump',
    name: 'Donald Trump',
    sphere: 'dc',
    role: 'President of the United States',
    tie: 'political',
    avatar: '/images/echo/thiel-network/trump.jpg',
    relationship:
      "Thiel was Silicon Valley's most prominent Trump backer at the 2016 RNC and served as tech liaison to the transition; sat beside Trump at the Dec 14, 2016 tech summit.",
    markets:
      'As president, sets trade, tax, and regulatory policy that moves entire sectors; personal disclosures (OGE filings) are themselves market-watched.',
    companies: ['Trump Media & Technology Group (DJT)'],
    headlines: [
      {
        date: 'May 2026',
        text: 'OGE disclosure logged thousands of securities transactions in Q1 2026.',
      },
    ],
  },
  {
    id: 'vance',
    name: 'JD Vance',
    sphere: 'dc',
    role: 'Vice President of the United States',
    tie: 'political',
    avatar: '/images/echo/thiel-network/vance.jpg',
    relationship:
      "Thiel's signature political protégé: met at a 2011 Yale talk, worked in Thiel's orbit, and received $15M+ from Thiel for his 2022 Senate run before the 2024 VP nomination.",
    markets:
      "As VP, influences tech, antitrust, and industrial policy; closely linked to the venture-capital and 'little tech' policy agenda.",
    companies: ['(public office)'],
    headlines: [
      {
        date: '2026',
        text: 'Central figure in tech-and-AI policy direction of the administration.',
      },
    ],
  },
  {
    id: 'bannon',
    name: 'Steve Bannon',
    sphere: 'dc',
    role: 'Political strategist; former WH chief strategist',
    tie: 'association',
    avatar: '/images/echo/thiel-network/bannon.jpg',
    relationship:
      "The 2016 campaign's chief strategist, representing the populist-nationalist wing that Thiel's money and ideas helped underwrite during the transition.",
    markets:
      'Not a market operator; an ideological force on trade-protectionism and anti-globalist policy that shapes the political backdrop for markets.',
    companies: ['(media / political)'],
    headlines: [
      { date: '2026', text: 'Continues to shape populist-right policy discourse via media.' },
    ],
  },
  {
    id: 'trumpjr',
    name: 'Donald Trump Jr.',
    sphere: 'dc',
    role: 'Executive, Trump Organization; venture investor',
    tie: 'association',
    avatar: '/images/echo/thiel-network/trumpjr.jpg',
    relationship:
      'A connective figure in the MAGA-aligned venture and political world that Thiel helped finance; bridges family business and the donor/VC network.',
    markets:
      'Active in the MAGA-aligned venture scene (e.g., positions tied to politically-branded funds and platforms); influence is network-based rather than operational.',
    companies: ['Trump Organization', '1789 Capital (reported)'],
    headlines: [
      { date: '2026', text: 'Increasingly visible in right-aligned venture and crypto circles.' },
    ],
  },
  // ---------- United Kingdom ----------
  {
    id: 'orr',
    name: 'James Orr',
    sphere: 'uk',
    role: 'Cambridge theologian; Reform UK policy adviser',
    tie: 'intellectual',
    avatar: '/images/echo/thiel-network/orr.jpg',
    relationship:
      "The key transatlantic broker: hosted Thiel's 'Antichrist' lectures at Cambridge, helped bring National Conservatism to the UK, and advises Nigel Farage's Reform UK. Vance's 'British sherpa.'",
    markets:
      'Not a market operator; an intellectual organizer linking US national-conservatism, Thiel, and the UK political right.',
    companies: ['Edmund Burke Foundation', 'Centre for a Better Britain'],
    headlines: [
      {
        date: '2025-26',
        text: 'Named senior policy figure for Reform UK; credited with elite defections.',
      },
    ],
  },
  {
    id: 'farage',
    name: 'Nigel Farage',
    sphere: 'uk',
    role: 'Leader, Reform UK',
    tie: 'political',
    avatar: '/images/echo/thiel-network/farage.jpg',
    relationship:
      'Anchors the populist end of the British network; his Reform UK is the vehicle into which the Thiel-adjacent intellectual project (via Orr) has been channeled.',
    markets:
      "Political; Reform's rise affects UK political-risk pricing (sterling, gilts, sector exposure to potential policy shifts).",
    companies: ['(political party)'],
    headlines: [{ date: '2026', text: 'Reform UK polling strongly; attracting senior defectors.' }],
  },
  {
    id: 'mosley',
    name: 'Louis Mosley',
    sphere: 'uk',
    role: 'Head of Palantir UK & Europe',
    tie: 'business',
    avatar: '/images/echo/thiel-network/mosley.jpg',
    relationship:
      "Joined Palantir in 2016; leads its UK/Europe operations and drove the firm's expansion into the British state. (Grandson of Oswald Mosley — noted as fact, not as evidence of his own views.)",
    markets:
      "Runs Palantir's UK government business — NHS data platforms, MoD contracts worth hundreds of millions, policing and financial-regulation systems.",
    companies: ['Palantir Technologies (PLTR)'],
    headlines: [
      { date: 'Dec 2025', text: 'Palantir signed a multi-hundred-million-pound UK MoD data deal.' },
    ],
  },
  {
    id: 'mandelson',
    name: 'Peter Mandelson',
    sphere: 'uk',
    role: 'Labour peer; former UK ambassador to the US',
    tie: 'association',
    avatar: '/images/echo/thiel-network/mandelson.jpg',
    relationship:
      'His lobbying firm Global Counsel counted Palantir as a client (hired 2018); as US ambassador he emailed Downing St in July 2025 asking whether Starmer would meet Thiel.',
    markets:
      "A lobbying/political-access figure rather than a market operator; relevant to Palantir's UK government-contract footprint.",
    companies: ['Global Counsel (founder)'],
    headlines: [
      {
        date: 'Jun 2026',
        text: 'Released documents detailed his role facilitating UK-Palantir-Thiel ties.',
      },
    ],
  },
  {
    id: 'starmer',
    name: 'Keir Starmer',
    sphere: 'uk',
    role: 'Prime Minister of the United Kingdom',
    tie: 'association',
    avatar: '/images/echo/thiel-network/starmer.jpg',
    relationship:
      "Labour PM whose government has continued awarding Palantir public contracts; subject of Mandelson's July 2025 invitation to meet Thiel — illustrating Thiel's bipartisan UK reach.",
    markets:
      "Sets UK fiscal, industrial, and tech-procurement policy; decisions on data/health/defense contracts directly affect Palantir's UK revenue.",
    companies: ['(public office)'],
    headlines: [
      {
        date: '2026',
        text: 'Government faced Commons questions over Palantir contracts and Mandelson ties.',
      },
    ],
  },
  {
    id: 'johnson',
    name: 'Boris Johnson',
    sphere: 'uk',
    role: 'Former UK Prime Minister',
    tie: 'association',
    avatar: '/images/echo/thiel-network/johnson.jpg',
    relationship:
      "Delivered Brexit, the realignment Thiel's circle admired; included for strategic/ideological association rather than any direct Thiel business tie.",
    markets:
      'Former head of government; legacy influence on UK political-risk and the Brexit settlement that reshaped trade and regulatory exposure.',
    companies: ['(former public office)'],
    headlines: [
      {
        date: '2026',
        text: 'Active on the speaking/commentary circuit; periodic political interventions.',
      },
    ],
  },
  {
    id: 'cummings',
    name: 'Dominic Cummings',
    sphere: 'uk',
    role: 'Political strategist; ex-No.10 chief adviser',
    tie: 'association',
    avatar: '/images/echo/thiel-network/cummings.jpg',
    relationship:
      "Masterminded the 2016 Leave campaign and ran Johnson's Downing Street; shares the network's conviction that the civil-service state is broken and must be 'remodeled.'",
    markets:
      "Not a market operator; an advocate of state/tech 'disruption' whose ideas echo Thiel's anti-bureaucratic thesis.",
    companies: ['(political / commentary)'],
    headlines: [
      { date: '2026', text: 'Continues advocating radical Whitehall reform via his writing.' },
    ],
  },
];

// Compute pie shares from the assigned spheres (so the chart and data never drift).
export function computeSphereShares(
  people = THIEL_NETWORK_PEOPLE,
  spheres = THIEL_NETWORK_SPHERES,
) {
  const counts = {};
  people.forEach((p) => {
    counts[p.sphere] = (counts[p.sphere] || 0) + 1;
  });
  const total = people.length || 1;
  return spheres.map((s) => ({
    ...s,
    count: counts[s.id] || 0,
    pct: ((counts[s.id] || 0) / total) * 100,
    people: people.filter((p) => p.sphere === s.id),
  }));
}

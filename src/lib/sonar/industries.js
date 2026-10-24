/**
 * The industry registry behind the Industry Layout briefing (Part C).
 *
 * public.industries / industry_stages / industry_stage_links /
 * industry_companies / industry_metrics / industry_facilities /
 * industry_risks (migration 20261024120000, applied by hand) are the source
 * of truth. Until they hold rows, the structural seed below (industries,
 * stages, stage links and a short list of companies whose business model is
 * stated in their own annual reports, each linked to its EDGAR filing list)
 * renders the layout. Metrics, facilities and risks have NO seed: they are
 * entered from primary sources with source_url and as_of, and every
 * component shows its empty state until then. No figure is ever invented.
 */

const AS_OF = '2026-10-24';
const edgar = (ticker, form = '10-K') =>
  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=${form}&dateb=&owner=include&count=10`;

export const BUSINESS_MODELS = {
  fabless: 'Fabless',
  idm: 'IDM',
  foundry: 'Foundry',
  equipment: 'Equipment',
  materials: 'Materials',
  eda_ip: 'EDA & IP',
  osat: 'OSAT',
  prime: 'Prime contractor',
  supplier: 'Supplier',
};

const SEED = {
  industries: [
    {
      id: 'semiconductors',
      label: 'Semiconductors',
      synonyms: ['chips', 'chipmakers', 'semis', 'semiconductor'],
      gics_codes: ['453010'],
      naics_codes: ['334413', '333242'],
    },
    {
      id: 'aerospace_defense',
      label: 'Aerospace & Defense',
      synonyms: ['aerospace', 'defense', 'defence'],
      gics_codes: ['201010'],
      naics_codes: ['336411', '336414'],
    },
  ],
  stages: [
    {
      id: 'semis.design',
      industry_id: 'semiconductors',
      ord: 1,
      label: 'Chip design, EDA and IP',
      description: 'Fabless designers, EDA software and licensable IP.',
      is_upstream_input: false,
    },
    {
      id: 'semis.equipment',
      industry_id: 'semiconductors',
      ord: 2,
      label: 'Manufacturing equipment',
      description: 'Lithography, deposition, etch, inspection and test tools.',
      is_upstream_input: true,
    },
    {
      id: 'semis.materials',
      industry_id: 'semiconductors',
      ord: 3,
      label: 'Materials and chemicals',
      description: 'Wafers, gases, specialty chemicals and consumables.',
      is_upstream_input: true,
    },
    {
      id: 'semis.fabrication',
      industry_id: 'semiconductors',
      ord: 4,
      label: 'Wafer fabrication',
      description: 'Integrated device manufacturers and foundries.',
      is_upstream_input: false,
    },
    {
      id: 'semis.packaging',
      industry_id: 'semiconductors',
      ord: 5,
      label: 'Assembly, packaging and test',
      description: 'Outsourced and in-house back-end assembly, packaging and test.',
      is_upstream_input: false,
    },
    {
      id: 'semis.distribution',
      industry_id: 'semiconductors',
      ord: 6,
      label: 'Systems and end markets',
      description:
        'Distribution into data center, consumer, communications, auto, industrial and government systems.',
      is_upstream_input: false,
    },
    {
      id: 'ad.primes',
      industry_id: 'aerospace_defense',
      ord: 1,
      label: 'Prime contractors and integration',
      description: 'System design and final integration.',
      is_upstream_input: false,
    },
    {
      id: 'ad.propulsion',
      industry_id: 'aerospace_defense',
      ord: 2,
      label: 'Propulsion',
      description: 'Engines and propulsion systems.',
      is_upstream_input: true,
    },
    {
      id: 'ad.electronics',
      industry_id: 'aerospace_defense',
      ord: 3,
      label: 'Avionics and electronics',
      description: 'Sensors, avionics, communications and mission systems.',
      is_upstream_input: true,
    },
    {
      id: 'ad.structures',
      industry_id: 'aerospace_defense',
      ord: 4,
      label: 'Structures and components',
      description: 'Airframe structures, components and materials.',
      is_upstream_input: false,
    },
    {
      id: 'ad.services',
      industry_id: 'aerospace_defense',
      ord: 5,
      label: 'Sustainment and services',
      description: 'Maintenance, repair, overhaul and services.',
      is_upstream_input: false,
    },
  ],
  links: [
    ['semis.design', 'semis.fabrication'],
    ['semis.equipment', 'semis.fabrication'],
    ['semis.equipment', 'semis.packaging'],
    ['semis.materials', 'semis.fabrication'],
    ['semis.materials', 'semis.packaging'],
    ['semis.fabrication', 'semis.packaging'],
    ['semis.packaging', 'semis.distribution'],
    ['ad.propulsion', 'ad.primes'],
    ['ad.electronics', 'ad.primes'],
    ['ad.structures', 'ad.primes'],
    ['ad.primes', 'ad.services'],
  ].map(([from_stage, to_stage]) => ({ from_stage, to_stage })),
  /* Business model as each company describes itself in its annual report. */
  companies: [
    ['semis.design', 'NVIDIA', 'NVDA', 'fabless', 'US'],
    ['semis.design', 'Advanced Micro Devices', 'AMD', 'fabless', 'US'],
    ['semis.design', 'Qualcomm', 'QCOM', 'fabless', 'US'],
    ['semis.design', 'Broadcom', 'AVGO', 'fabless', 'US'],
    ['semis.design', 'Marvell Technology', 'MRVL', 'fabless', 'US'],
    ['semis.design', 'Synopsys', 'SNPS', 'eda_ip', 'US'],
    ['semis.design', 'Cadence Design Systems', 'CDNS', 'eda_ip', 'US'],
    ['semis.equipment', 'Applied Materials', 'AMAT', 'equipment', 'US'],
    ['semis.equipment', 'Lam Research', 'LRCX', 'equipment', 'US'],
    ['semis.equipment', 'KLA', 'KLAC', 'equipment', 'US'],
    ['semis.equipment', 'Teradyne', 'TER', 'equipment', 'US'],
    ['semis.materials', 'Entegris', 'ENTG', 'materials', 'US'],
    ['semis.fabrication', 'Intel', 'INTC', 'idm', 'US'],
    ['semis.fabrication', 'Texas Instruments', 'TXN', 'idm', 'US'],
    ['semis.fabrication', 'Micron Technology', 'MU', 'idm', 'US'],
    ['semis.fabrication', 'Analog Devices', 'ADI', 'idm', 'US'],
    ['semis.fabrication', 'Microchip Technology', 'MCHP', 'idm', 'US'],
    ['semis.fabrication', 'Taiwan Semiconductor Manufacturing', 'TSM', 'foundry', 'TW', '20-F'],
    ['semis.packaging', 'Amkor Technology', 'AMKR', 'osat', 'US'],
  ].map(([stage_id, company_name, ticker, business_model, hq_country, form]) => ({
    industry_id: 'semiconductors',
    stage_id,
    company_name,
    ticker,
    business_model,
    hq_country,
    is_public: true,
    source_url: edgar(ticker, form || '10-K'),
    as_of: AS_OF,
  })),
};

/** The seed, exported for the migration-parity test. */
export const INDUSTRY_SEED = SEED;

function seedFor(id) {
  const industry = SEED.industries.find((i) => i.id === id);
  if (!industry) return null;
  const stages = SEED.stages.filter((s) => s.industry_id === id).sort((a, b) => a.ord - b.ord);
  const stageIds = new Set(stages.map((s) => s.id));
  return {
    industry,
    stages,
    links: SEED.links.filter((l) => stageIds.has(l.from_stage)),
    companies: SEED.companies.filter((c) => c.industry_id === id),
    metrics: [],
    facilities: [],
    risks: [],
    source: 'seed',
  };
}

/**
 * The registry for one industry. Tables first; any missing table or an
 * industry with no stages there falls back to the structural seed. Metrics,
 * facilities and risks come from the tables only, approved rows only (the
 * service role bypasses RLS, so the filter is applied here too).
 */
export async function getIndustryRegistry(admin, id) {
  const seed = seedFor(id);
  if (!admin) return seed;
  try {
    const [ind, stages, companies, metrics, facilities, risks] = await Promise.all([
      admin.from('industries').select('*').eq('id', id).maybeSingle(),
      admin.from('industry_stages').select('*').eq('industry_id', id).order('ord'),
      admin.from('industry_companies').select('*').eq('industry_id', id),
      admin
        .from('industry_metrics')
        .select('*')
        .eq('industry_id', id)
        .eq('review_status', 'approved'),
      admin
        .from('industry_facilities')
        .select('*')
        .eq('industry_id', id)
        .eq('review_status', 'approved'),
      admin
        .from('industry_risks')
        .select('*')
        .eq('industry_id', id)
        .eq('review_status', 'approved'),
    ]);
    if (ind.error || stages.error || !ind.data || !stages.data?.length) return seed;
    const stageIds = stages.data.map((s) => s.id);
    const { data: links } = await admin
      .from('industry_stage_links')
      .select('from_stage, to_stage')
      .in('from_stage', stageIds);
    return {
      industry: ind.data,
      stages: stages.data,
      links: links || [],
      companies: companies.data?.length ? companies.data : seed?.companies || [],
      metrics: metrics.data || [],
      facilities: facilities.data || [],
      risks: risks.data || [],
      source: 'tables',
    };
  } catch {
    return seed;
  }
}

/** Tickers of the industry (or one stage), public companies only. */
export function industryBasket(registry, stageId = null) {
  return [
    ...new Set(
      (registry?.companies || [])
        .filter((c) => c.ticker && c.is_public !== false && (!stageId || c.stage_id === stageId))
        .map((c) => String(c.ticker).toUpperCase()),
    ),
  ];
}

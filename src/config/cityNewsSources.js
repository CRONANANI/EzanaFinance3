/**
 * Regional financial news sources per city (keys snake_case).
 * Map panelIds from `world-map` → keys via PANEL_ID_TO_CITY_KEY.
 */

export const CITY_NEWS_SOURCES = {
  auckland: {
    city: 'Auckland',
    region: 'Oceania',
    sources: [
      { name: 'NZ Herald (Business)', url: 'https://www.nzherald.co.nz/business/', focus: 'The NZX, dairy exports (Fonterra), and property market fluctuations' },
      { name: 'Interest.co.nz', url: 'https://www.interest.co.nz', focus: 'Mortgage rates, term deposits, and RBNZ policy' },
    ],
  },
  sydney: {
    city: 'Sydney',
    region: 'Oceania',
    sources: [
      { name: 'The Australian Financial Review', url: 'https://www.afr.com', focus: 'The ASX 200, investment banking, and the RBA' },
      { name: 'Business Insider Australia', url: 'https://www.businessinsider.com.au', focus: 'Tech-focused, retail-investor friendly' },
    ],
  },
  melbourne: {
    city: 'Melbourne',
    region: 'Oceania',
    sources: [
      { name: 'The Age (Business)', url: 'https://www.theage.com.au/business', focus: 'The Big Four banks and the superannuation fund industry' },
      { name: 'ABC News (Business)', url: 'https://www.abc.net.au/news/business', focus: 'Inflation, employment data, and cost-of-living metrics' },
    ],
  },
  mumbai: {
    city: 'Mumbai',
    region: 'South Asia',
    sources: [
      { name: 'The Economic Times / Business Standard', url: 'https://economictimes.indiatimes.com', focus: 'The Nifty 50, India Stack (UPI/Fintech), and the retail investor boom' },
    ],
  },
  singapore: {
    city: 'Singapore',
    region: 'East & Southeast Asia',
    sources: [
      { name: 'The Business Times (BT) / CNA Luxury', url: 'https://www.businesstimes.com.sg', focus: 'Regional wealth management, REITs, and Gateway to ASEAN trade flows' },
    ],
  },
  hong_kong: {
    city: 'Hong Kong',
    region: 'East & Southeast Asia',
    sources: [
      { name: 'South China Morning Post (SCMP)', url: 'https://www.scmp.com/business', focus: 'Cross-border listings, Family Offices, and crypto regulation' },
    ],
  },
  shanghai: {
    city: 'Shanghai',
    region: 'East & Southeast Asia',
    sources: [
      { name: 'Yicai Global / Shanghai Securities', url: 'https://www.yicaiglobal.com', focus: 'The A-share market, STAR Market (tech), and PBoC policy' },
    ],
  },
  tokyo: {
    city: 'Tokyo',
    region: 'East & Southeast Asia',
    sources: [
      { name: 'Nikkei (Nikkei Shimbun) / Bloomberg', url: 'https://asia.nikkei.com', focus: 'Corporate governance reforms, the Yen carry trade, and the Nikkei 225' },
    ],
  },
  seoul: {
    city: 'Seoul',
    region: 'East & Southeast Asia',
    sources: [
      { name: 'Maeil Business Newspaper / Korea Economic Daily', url: 'https://pulsenews.co.kr', focus: 'Chaebol performance (Samsung/Hyundai), the KOSPI, and AI-chip exports' },
    ],
  },
  dubai: {
    city: 'Dubai',
    region: 'Middle East',
    sources: [
      { name: 'Arabian Business', url: 'https://www.arabianbusiness.com', focus: 'Real estate, SME growth, and billionaire wealth management' },
      { name: 'Gulf News (Markets)', url: 'https://gulfnews.com/business/markets', focus: 'DFM (Dubai Financial Market) and ADX (Abu Dhabi) updates' },
      { name: 'Fintech News Middle East', url: 'https://fintechnews.ae', focus: 'Digital banking regulations and Neobank launches' },
      { name: 'The National (Economy)', url: 'https://www.thenationalnews.com/business/economy', focus: 'UAE diversification and oil-to-tech shifts' },
    ],
  },
  tel_aviv: {
    city: 'Tel Aviv',
    region: 'Middle East',
    sources: [
      { name: 'Globes', url: 'https://en.globes.co.il', focus: 'Corporate, legal, and high-tech financial news' },
      { name: 'TheMarker', url: 'https://www.themarker.com', focus: 'Tech ecosystem and social economics' },
      { name: 'Calcalist', url: 'https://www.calcalistech.com', focus: 'TASE (Tel Aviv Stock Exchange), real estate, and consumer finance' },
      { name: 'The Media Line', url: 'https://themedialine.org', focus: 'How regional conflicts impact local stock indices' },
    ],
  },
  lagos: {
    city: 'Lagos',
    region: 'Africa',
    sources: [
      { name: 'Nairametrics / BusinessDay', url: 'https://nairametrics.com', focus: 'Fintech (Silicon Lagoon), FX rates (Naira volatility), and the NGX' },
    ],
  },
  johannesburg: {
    city: 'Johannesburg',
    region: 'Africa',
    sources: [
      { name: 'BusinessTech / Moneyweb / CNBC Africa', url: 'https://businesstech.co.za', focus: 'The JSE, mining exports, and SARB policy' },
    ],
  },
  addis_ababa: {
    city: 'Addis Ababa',
    region: 'Africa',
    sources: [
      { name: 'The Reporter / Ethiopian Business Review', url: 'https://www.thereporterethiopia.com', focus: 'The new ESX, privatization of state assets, and FDI inflows' },
    ],
  },
  nairobi: {
    city: 'Nairobi',
    region: 'Africa',
    sources: [
      { name: 'TechCabal / The Kenyan Wallstreet', url: 'https://techcabal.com', focus: 'Pan-African tech investment, M&A activity, and cross-border payment integration' },
    ],
  },
  london: {
    city: 'London',
    region: 'Europe',
    sources: [
      { name: 'Financial Times (FT) / City A.M.', url: 'https://www.ft.com', focus: 'Global FX, commodities, and London as a Global Hub outside the EU' },
    ],
  },
  geneva: {
    city: 'Geneva',
    region: 'Europe',
    sources: [
      { name: 'Le Temps / Agefi', url: 'https://www.letemps.ch', focus: 'Wealth management, private banking, and Swiss Franc ($CHF) insights' },
    ],
  },
  moscow: {
    city: 'Moscow',
    region: 'Europe',
    sources: [
      { name: 'Kommersant / Vedomosti', url: 'https://www.kommersant.ru', focus: 'Energy exports, sanctioned market navigation, and domestic payment alternatives (Mir/SPFS)' },
    ],
  },
  frankfurt: {
    city: 'Frankfurt',
    region: 'Europe',
    sources: [
      { name: 'Börsen-Zeitung / FAZ (Finance)', url: 'https://www.boersen-zeitung.de', focus: 'The ECB hub, DAX performance, and Eurozone monetary policy' },
    ],
  },
  paris: {
    city: 'Paris',
    region: 'Europe',
    sources: [
      { name: 'Les Echos / La Tribune', url: 'https://www.lesechos.fr', focus: 'CAC 40, luxury conglomerates (LVMH), and EU fiscal integration' },
    ],
  },
  dublin: {
    city: 'Dublin',
    region: 'Europe',
    sources: [
      { name: 'The Irish Times (Business) / Sunday Business Post', url: 'https://www.irishtimes.com/business', focus: 'Tech MNC taxes, aircraft leasing, and the Post-Brexit bridge to the EU' },
    ],
  },
  stockholm: {
    city: 'Stockholm',
    region: 'Europe',
    sources: [
      { name: 'Dagens Industri (Di)', url: 'https://www.di.se', focus: 'Nordic Fintech Unicorn culture, Klarna-style banking, and the SEK economy' },
    ],
  },
  santiago: {
    city: 'Santiago',
    region: 'South America',
    sources: [
      { name: 'Diario Financiero (DF)', url: 'https://www.df.cl', focus: 'Copper prices, pension fund (AFP) news' },
    ],
  },
  lima: {
    city: 'Lima',
    region: 'South America',
    sources: [
      { name: 'Gestión / El Comercio', url: 'https://gestion.pe', focus: 'Mining exports (Gold/Copper), central bank (BCRP), and political risk' },
    ],
  },
  bogota: {
    city: 'Bogotá',
    region: 'South America',
    sources: [
      { name: 'Portafolio / La República', url: 'https://www.portafolio.co', focus: 'Oil & gas volatility, fiscal policy, and the BVC (Colombian Stock Exchange)' },
    ],
  },
  medellin: {
    city: 'Medellín',
    region: 'South America',
    sources: [
      { name: 'El Colombiano (Economía)', url: 'https://www.elcolombiano.com/negocios', focus: 'Grupo Empresarial Antioqueño and the Innovation District tech scene' },
    ],
  },
  buenos_aires: {
    city: 'Buenos Aires',
    region: 'South America',
    sources: [
      { name: 'Ámbito Financiero / El Cronista', url: 'https://www.ambito.com', focus: "The Blue Dollar, Milei's austerity reforms, and sovereign debt" },
      { name: 'Buenos Aires Herald', url: 'https://buenosairesherald.com', focus: 'English-language analysis of Argentine macroeconomics and lithium mining' },
    ],
  },
  sao_paulo: {
    city: 'São Paulo',
    region: 'South America',
    sources: [
      { name: 'Valor Econômico / Infomoney', url: 'https://www.infomoney.com.br', focus: 'The B3 (Stock Exchange), Selic rate decisions, and Fintech/Agribusiness' },
      { name: 'Exame', url: 'https://exame.com', focus: 'Corporate strategy and M&A within the Paulista business district' },
    ],
  },
  toronto: {
    city: 'Toronto',
    region: 'North America',
    sources: [
      { name: 'The Globe and Mail (Report on Business)', url: 'https://www.theglobeandmail.com/business', focus: 'Bay Street banking, the TSX, and national fiscal policy' },
    ],
  },
  montreal: {
    city: 'Montreal',
    region: 'North America',
    sources: [
      { name: 'Les Affaires / Montreal Gazette (Business)', url: 'https://www.lesaffaires.com', focus: 'Quebec aerospace, AI, and pension fund (CDPQ) activity' },
    ],
  },
  new_york: {
    city: 'New York',
    region: 'North America',
    sources: [
      { name: 'Bloomberg / WSJ', url: 'https://www.bloomberg.com', focus: 'Global markets, Wall Street, and the NYSE/Nasdaq' },
    ],
  },
  san_francisco: {
    city: 'San Francisco',
    region: 'North America',
    sources: [
      { name: 'SF Business Times / TechCrunch', url: 'https://www.bizjournals.com/sanfrancisco', focus: 'Venture capital, AI investment, and the Bay Area economy' },
    ],
  },
  miami: {
    city: 'Miami',
    region: 'North America',
    sources: [
      { name: 'Miami Herald (Business) / Refresh Miami', url: 'https://www.miamiherald.com/news/business', focus: 'Hedge fund migration (Wall Street South) and crypto-tech' },
    ],
  },
  boston: {
    city: 'Boston',
    region: 'North America',
    sources: [
      { name: 'Boston Business Journal', url: 'https://www.bizjournals.com/boston', focus: 'Biotech, Higher-Ed endowments, and Fidelity-style asset management' },
    ],
  },
  /** Map-only hubs (green dots) not in the original regional list */
  chicago: {
    city: 'Chicago',
    region: 'North America',
    sources: [
      { name: 'Crain\'s Chicago Business', url: 'https://www.chicagobusiness.com', focus: 'CME/CBOE derivatives, regional corporate news, and Midwest economy' },
    ],
  },
  hamilton: {
    city: 'Hamilton',
    region: 'North America',
    sources: [
      { name: 'The Royal Gazette (Business)', url: 'https://www.royalgazette.com', focus: 'Reinsurance, offshore finance, and BSX-listed companies' },
    ],
  },
};

/** world-map.tsx `panelId` → CITY_NEWS_SOURCES key */
export const PANEL_ID_TO_CITY_KEY = {
  toronto: 'toronto',
  newyork: 'new_york',
  saopaulo: 'sao_paulo',
  london: 'london',
  frankfurt: 'frankfurt',
  dubai: 'dubai',
  mumbai: 'mumbai',
  singapore: 'singapore',
  hongkong: 'hong_kong',
  shanghai: 'shanghai',
  tokyo: 'tokyo',
  sydney: 'sydney',
  johannesburg: 'johannesburg',
  addisababa: 'addis_ababa',
  lagos: 'lagos',
  moscow: 'moscow',
  paris: 'paris',
  telaviv: 'tel_aviv',
  miami: 'miami',
  sanfrancisco: 'san_francisco',
  chicago: 'chicago',
  seoul: 'seoul',
  geneva: 'geneva',
  dublin: 'dublin',
  stockholm: 'stockholm',
  montreal: 'montreal',
  hamilton: 'hamilton',
};

/**
 * panelId → id used by `/api/market-data/city-news` (hyphenated, matches FINANCIAL_CITIES in page).
 */
export const PANEL_ID_TO_FINHUB_CITY_ID = {
  toronto: 'toronto',
  newyork: 'new-york',
  saopaulo: 'sao-paulo',
  london: 'london',
  frankfurt: 'frankfurt',
  dubai: 'dubai',
  mumbai: 'mumbai',
  singapore: 'singapore',
  hongkong: 'hong-kong',
  shanghai: 'shanghai',
  tokyo: 'tokyo',
  sydney: 'sydney',
  johannesburg: 'johannesburg',
  addisababa: 'addis-ababa',
  lagos: 'lagos',
  moscow: 'moscow',
  paris: 'paris',
  telaviv: 'tel-aviv',
  miami: 'miami',
  sanfrancisco: 'san-francisco',
  chicago: 'chicago',
  seoul: 'seoul',
  geneva: 'geneva',
  dublin: 'dublin',
  stockholm: 'stockholm',
  montreal: 'montreal',
  hamilton: 'hamilton',
};

export function getSourcesForCity(cityKey) {
  return CITY_NEWS_SOURCES[cityKey]?.sources || [];
}

export function getCitiesByRegion() {
  const grouped = {};
  Object.entries(CITY_NEWS_SOURCES).forEach(([key, data]) => {
    if (!grouped[data.region]) grouped[data.region] = [];
    grouped[data.region].push({ key, ...data });
  });
  return grouped;
}

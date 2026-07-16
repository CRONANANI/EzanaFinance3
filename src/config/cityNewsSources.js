/**
 * Canonical city schema for the market-analysis city news feed.
 *
 * ONE id per city (hyphenated — matches FINANCIAL_CITIES and the
 * /api/market-data/city-news query ids). This map is the SINGLE SOURCE OF
 * TRUTH, merged (by scripts) from what used to be four parallel structures:
 *   - CITY_NEWS_SOURCES (this file, was snake_case)   → sources, region, name
 *   - CITY_KEYWORDS  (city-news/route.js)             → keywords
 *   - CITY_TICKERS   (city-news/route.js)             → tickers
 *   - CITY_TO_COUNTRY(city-news/route.js)             → countryCode
 *   - FINANCIAL_CITIES (market-analysis/page.js)      → country, exchange
 *
 * Each entry: { id, name, country, countryCode, region, exchange, keywords,
 * tickers, sources, rss }. `rss` is intentionally empty here — Phase 2
 * populates it with VERIFIED real feed URLs (never fabricated).
 *
 * NOTE (Phase 1): the legacy exports below (CITY_NEWS_SOURCES snake-keyed, the
 * two PANEL_ID_TO_* maps) are now DERIVED from CITIES — no longer hand-
 * maintained parallel data, so they can't drift. Phase 2 migrates the
 * consumers (city-news + news/city routes, page.js) to CITIES /
 * PANEL_ID_TO_CITY_ID directly and then removes these shims.
 */

export const CITIES = {
  "addis-ababa": {
    id: "addis-ababa",
    name: "Addis Ababa",
    country: "Ethiopia",
    countryCode: "ET",
    region: "Africa",
    exchange: "ESX",
    keywords: [
      "ethiopia",
      "addis ababa",
      "african union",
      "east africa",
      "birr",
      "national bank of ethiopia",
      "ethiopian birr",
      "esx"
    ],
    tickers: [],
    sources: [
      {
        name: "The Reporter / Ethiopian Business Review",
        url: "https://www.thereporterethiopia.com",
        focus: "The new ESX, privatization of state assets, and FDI inflows"
      }
    ],
    rss: []
  },
  auckland: {
    id: "auckland",
    name: "Auckland",
    country: "New Zealand",
    countryCode: "NZ",
    region: "Oceania",
    exchange: "NZX",
    keywords: [
      "auckland",
      "new zealand",
      "nzx",
      "fonterra",
      "kiwi",
      "australasia"
    ],
    tickers: [
      "AIR.NZ",
      "FPH.NZ"
    ],
    sources: [
      {
        name: "NZ Herald (Business)",
        url: "https://www.nzherald.co.nz/business/",
        focus: "The NZX, dairy exports (Fonterra), and property market fluctuations"
      },
      {
        name: "Interest.co.nz",
        url: "https://www.interest.co.nz",
        focus: "Mortgage rates, term deposits, and RBNZ policy"
      }
    ],
    rss: []
  },
  bogota: {
    id: "bogota",
    name: "Bogotá",
    country: "Colombia",
    countryCode: "CO",
    region: "South America",
    exchange: "BVC",
    keywords: [
      "bogota",
      "bogotá",
      "colombia",
      "colombian",
      "peso",
      "bvc",
      "oil"
    ],
    tickers: [
      "CIB",
      "EC"
    ],
    sources: [
      {
        name: "Portafolio / La República",
        url: "https://www.portafolio.co",
        focus: "Oil & gas volatility, fiscal policy, and the BVC (Colombian Stock Exchange)"
      }
    ],
    rss: []
  },
  boston: {
    id: "boston",
    name: "Boston",
    country: "United States",
    countryCode: "US",
    region: "North America",
    exchange: "Biotech / Education",
    keywords: [
      "boston",
      "massachusetts",
      "biotech",
      "pharma",
      "harvard",
      "mit ",
      "endowment",
      "fidelity"
    ],
    tickers: [
      "MRNA",
      "BIIB",
      "AMGN",
      "LLY"
    ],
    sources: [
      {
        name: "Boston Business Journal",
        url: "https://www.bizjournals.com/boston",
        focus: "Biotech, Higher-Ed endowments, and Fidelity-style asset management"
      }
    ],
    rss: []
  },
  "buenos-aires": {
    id: "buenos-aires",
    name: "Buenos Aires",
    country: "Argentina",
    countryCode: "AR",
    region: "South America",
    exchange: "BYMA",
    keywords: [
      "buenos aires",
      "argentina",
      "argentine",
      "peso",
      "milei",
      "mercosur",
      "byma"
    ],
    tickers: [
      "MELI",
      "YPF",
      "GGAL"
    ],
    sources: [
      {
        name: "Ámbito Financiero / El Cronista",
        url: "https://www.ambito.com",
        focus: "The Blue Dollar, Milei's austerity reforms, and sovereign debt"
      },
      {
        name: "Buenos Aires Herald",
        url: "https://buenosairesherald.com",
        focus: "English-language analysis of Argentine macroeconomics and lithium mining"
      }
    ],
    rss: []
  },
  chicago: {
    id: "chicago",
    name: "Chicago",
    country: "United States",
    countryCode: "US",
    region: "North America",
    exchange: "CME / CBOE",
    keywords: [
      "chicago",
      "cme",
      "cboe",
      "futures",
      "options",
      "derivatives",
      "midwest"
    ],
    tickers: [
      "CME",
      "CBOE",
      "NDAQ"
    ],
    sources: [
      {
        name: "Crain's Chicago Business",
        url: "https://www.chicagobusiness.com",
        focus: "CME/CBOE derivatives, regional corporate news, and Midwest economy"
      }
    ],
    rss: []
  },
  dubai: {
    id: "dubai",
    name: "Dubai",
    country: "UAE",
    countryCode: "AE",
    region: "Middle East",
    exchange: "DFM",
    keywords: [
      "dubai",
      "uae",
      "emirates",
      "abu dhabi",
      "opec",
      "middle east",
      "gulf",
      "saudi"
    ],
    tickers: [
      "XOM",
      "CVX",
      "COP"
    ],
    sources: [
      {
        name: "Arabian Business",
        url: "https://www.arabianbusiness.com",
        focus: "Real estate, SME growth, and billionaire wealth management"
      },
      {
        name: "Gulf News (Markets)",
        url: "https://gulfnews.com/business/markets",
        focus: "DFM (Dubai Financial Market) and ADX (Abu Dhabi) updates"
      },
      {
        name: "Fintech News Middle East",
        url: "https://fintechnews.ae",
        focus: "Digital banking regulations and Neobank launches"
      },
      {
        name: "The National (Economy)",
        url: "https://www.thenationalnews.com/business/economy",
        focus: "UAE diversification and oil-to-tech shifts"
      }
    ],
    rss: []
  },
  dublin: {
    id: "dublin",
    name: "Dublin",
    country: "Ireland",
    countryCode: "IE",
    region: "Europe",
    exchange: "Euronext Dublin",
    keywords: [
      "dublin",
      "ireland",
      "irish",
      "euronext dublin",
      "iseq",
      "euro ",
      "central bank of ireland"
    ],
    tickers: [
      "CRH",
      "LSEG",
      "AIB.IR"
    ],
    sources: [
      {
        name: "The Irish Times (Business) / Sunday Business Post",
        url: "https://www.irishtimes.com/business",
        focus: "Tech MNC taxes, aircraft leasing, and the Post-Brexit bridge to the EU"
      }
    ],
    rss: []
  },
  frankfurt: {
    id: "frankfurt",
    name: "Frankfurt",
    country: "Germany",
    countryCode: "DE",
    region: "Europe",
    exchange: "Deutsche Börse",
    keywords: [
      "frankfurt",
      "german",
      "germany",
      "ecb",
      "european central bank",
      "dax",
      "eurozone",
      "euro "
    ],
    tickers: [
      "SAP",
      "SIE.DE",
      "ALV.DE"
    ],
    sources: [
      {
        name: "Börsen-Zeitung / FAZ (Finance)",
        url: "https://www.boersen-zeitung.de",
        focus: "The ECB hub, DAX performance, and Eurozone monetary policy"
      }
    ],
    rss: []
  },
  geneva: {
    id: "geneva",
    name: "Geneva",
    country: "Switzerland",
    countryCode: "CH",
    region: "Europe",
    exchange: "SIX",
    keywords: [
      "geneva",
      "switzerland",
      "swiss",
      "zurich",
      "six exchange",
      "snb",
      "swiss franc",
      "chf",
      "ubs"
    ],
    tickers: [
      "NESN.SW",
      "ROG.SW",
      "NOVN.SW"
    ],
    sources: [
      {
        name: "Le Temps / Agefi",
        url: "https://www.letemps.ch",
        focus: "Wealth management, private banking, and Swiss Franc ($CHF) insights"
      }
    ],
    rss: []
  },
  hamilton: {
    id: "hamilton",
    name: "Hamilton",
    country: "Bermuda",
    countryCode: "BM",
    region: "North America",
    exchange: "BSX",
    keywords: [
      "bermuda",
      "hamilton",
      "reinsurance",
      "offshore",
      "bsx",
      "bermuda dollar",
      "reinsurers"
    ],
    tickers: [
      "RNR",
      "ACGL",
      "AXS"
    ],
    sources: [
      {
        name: "The Royal Gazette (Business)",
        url: "https://www.royalgazette.com",
        focus: "Reinsurance, offshore finance, and BSX-listed companies"
      }
    ],
    rss: []
  },
  "hong-kong": {
    id: "hong-kong",
    name: "Hong Kong",
    country: "China",
    countryCode: "HK",
    region: "East & Southeast Asia",
    exchange: "HKEX",
    keywords: [
      "hong kong",
      "hongkong",
      "hkex",
      "hang seng",
      "hsi"
    ],
    tickers: [
      "BABA",
      "BIDU",
      "JD",
      "TCEHY"
    ],
    sources: [
      {
        name: "South China Morning Post (SCMP)",
        url: "https://www.scmp.com/business",
        focus: "Cross-border listings, Family Offices, and crypto regulation"
      }
    ],
    rss: []
  },
  johannesburg: {
    id: "johannesburg",
    name: "Johannesburg",
    country: "South Africa",
    countryCode: "ZA",
    region: "Africa",
    exchange: "JSE",
    keywords: [
      "johannesburg",
      "south africa",
      "jse",
      "rand",
      "african"
    ],
    tickers: [
      "AGL.JO",
      "SOL.JO",
      "NPN.JO"
    ],
    sources: [
      {
        name: "BusinessTech / Moneyweb / CNBC Africa",
        url: "https://businesstech.co.za",
        focus: "The JSE, mining exports, and SARB policy"
      }
    ],
    rss: []
  },
  lagos: {
    id: "lagos",
    name: "Lagos",
    country: "Nigeria",
    countryCode: "NG",
    region: "Africa",
    exchange: "NGX",
    keywords: [
      "lagos",
      "nigeria",
      "nigerian",
      "ngx",
      "naira",
      "west africa"
    ],
    tickers: [
      "DANGCEM.LG",
      "GTCO.LG"
    ],
    sources: [
      {
        name: "Nairametrics / BusinessDay",
        url: "https://nairametrics.com",
        focus: "Fintech (Silicon Lagoon), FX rates (Naira volatility), and the NGX"
      }
    ],
    rss: []
  },
  lima: {
    id: "lima",
    name: "Lima",
    country: "Peru",
    countryCode: "PE",
    region: "South America",
    exchange: "BVL",
    keywords: [
      "lima",
      "peru",
      "peruvian",
      "sol ",
      "bvl",
      "mining",
      "copper"
    ],
    tickers: [
      "BAP",
      "SCCO"
    ],
    sources: [
      {
        name: "Gestión / El Comercio",
        url: "https://gestion.pe",
        focus: "Mining exports (Gold/Copper), central bank (BCRP), and political risk"
      }
    ],
    rss: []
  },
  london: {
    id: "london",
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    region: "Europe",
    exchange: "LSE",
    keywords: [
      "london",
      "uk ",
      "united kingdom",
      "britain",
      "british",
      "ftse",
      "bank of england",
      "boe",
      "sterling",
      "pound"
    ],
    tickers: [
      "SHEL",
      "HSBC",
      "BP",
      "AZN"
    ],
    sources: [
      {
        name: "Financial Times (FT) / City A.M.",
        url: "https://www.ft.com",
        focus: "Global FX, commodities, and London as a Global Hub outside the EU"
      }
    ],
    rss: []
  },
  medellin: {
    id: "medellin",
    name: "Medellín",
    country: "Colombia",
    countryCode: "CO",
    region: "South America",
    exchange: "BVC",
    keywords: [
      "medellin",
      "medellín",
      "antioquia",
      "colombia",
      "colombian",
      "innovation",
      "bvc",
      "peso",
      "bancolombia"
    ],
    tickers: [
      "CIB",
      "EC"
    ],
    sources: [
      {
        name: "El Colombiano (Economía)",
        url: "https://www.elcolombiano.com/negocios",
        focus: "Grupo Empresarial Antioqueño and the Innovation District tech scene"
      }
    ],
    rss: []
  },
  melbourne: {
    id: "melbourne",
    name: "Melbourne",
    country: "Australia",
    countryCode: "AU",
    region: "Oceania",
    exchange: "ASX",
    keywords: [
      "melbourne",
      "victoria",
      "australia",
      "australian",
      "asx",
      "superannuation"
    ],
    tickers: [
      "BHP",
      "CBA.AX",
      "RIO"
    ],
    sources: [
      {
        name: "The Age (Business)",
        url: "https://www.theage.com.au/business",
        focus: "The Big Four banks and the superannuation fund industry"
      },
      {
        name: "ABC News (Business)",
        url: "https://www.abc.net.au/news/business",
        focus: "Inflation, employment data, and cost-of-living metrics"
      }
    ],
    rss: []
  },
  miami: {
    id: "miami",
    name: "Miami",
    country: "United States",
    countryCode: "US",
    region: "North America",
    exchange: "Fintech Hub",
    keywords: [
      "miami",
      "florida",
      "south florida",
      "fintech",
      "crypto"
    ],
    tickers: [
      "HOOD",
      "COIN",
      "SQ"
    ],
    sources: [
      {
        name: "Miami Herald (Business) / Refresh Miami",
        url: "https://www.miamiherald.com/news/business",
        focus: "Hedge fund migration (Wall Street South) and crypto-tech"
      }
    ],
    rss: []
  },
  montreal: {
    id: "montreal",
    name: "Montreal",
    country: "Canada",
    countryCode: "CA",
    region: "North America",
    exchange: "TMX / MX",
    keywords: [
      "montreal",
      "quebec",
      "canada",
      "canadian",
      "tmx"
    ],
    tickers: [
      "BMO",
      "BN",
      "NTR"
    ],
    sources: [
      {
        name: "Les Affaires / Montreal Gazette (Business)",
        url: "https://www.lesaffaires.com",
        focus: "Quebec aerospace, AI, and pension fund (CDPQ) activity"
      }
    ],
    rss: []
  },
  moscow: {
    id: "moscow",
    name: "Moscow",
    country: "Russia",
    countryCode: "RU",
    region: "Europe",
    exchange: "MOEX",
    keywords: [
      "moscow",
      "russia",
      "russian",
      "moex",
      "ruble",
      "kremlin"
    ],
    tickers: [
      "SBER.ME",
      "GAZP.ME",
      "LKOH.ME"
    ],
    sources: [
      {
        name: "Kommersant / Vedomosti",
        url: "https://www.kommersant.ru",
        focus: "Energy exports, sanctioned market navigation, and domestic payment alternatives (Mir/SPFS)"
      }
    ],
    rss: []
  },
  mumbai: {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    countryCode: "IN",
    region: "South Asia",
    exchange: "BSE / NSE",
    keywords: [
      "mumbai",
      "india",
      "indian",
      "sensex",
      "nifty",
      "rbi",
      "rupee"
    ],
    tickers: [
      "INFY",
      "WIT",
      "HDB",
      "IBN"
    ],
    sources: [
      {
        name: "The Economic Times / Business Standard",
        url: "https://economictimes.indiatimes.com",
        focus: "The Nifty 50, India Stack (UPI/Fintech), and the retail investor boom"
      }
    ],
    rss: []
  },
  nairobi: {
    id: "nairobi",
    name: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    region: "Africa",
    exchange: "NSE",
    keywords: [
      "nairobi",
      "kenya",
      "kenyan",
      "east africa",
      "nse",
      "m-pesa",
      "safaricom"
    ],
    tickers: [
      "SCOM.NR",
      "EQTY.NR"
    ],
    sources: [
      {
        name: "TechCabal / The Kenyan Wallstreet",
        url: "https://techcabal.com",
        focus: "Pan-African tech investment, M&A activity, and cross-border payment integration"
      }
    ],
    rss: []
  },
  "new-york": {
    id: "new-york",
    name: "New York",
    country: "United States",
    countryCode: "US",
    region: "North America",
    exchange: "NYSE / NASDAQ",
    keywords: [
      "new york",
      "nyc",
      "wall street",
      "nasdaq",
      "nyse",
      "fed ",
      "federal reserve",
      "us economy",
      "us market",
      "american",
      "united states"
    ],
    tickers: [
      "AAPL",
      "MSFT",
      "JPM",
      "GS"
    ],
    sources: [
      {
        name: "Bloomberg / WSJ",
        url: "https://www.bloomberg.com",
        focus: "Global markets, Wall Street, and the NYSE/Nasdaq"
      }
    ],
    rss: []
  },
  paris: {
    id: "paris",
    name: "Paris",
    country: "France",
    countryCode: "FR",
    region: "Europe",
    exchange: "Euronext",
    keywords: [
      "paris",
      "france",
      "french",
      "cac 40",
      "euronext",
      "macron"
    ],
    tickers: [
      "MC.PA",
      "OR.PA",
      "SAN.PA",
      "TTE.PA"
    ],
    sources: [
      {
        name: "Les Echos / La Tribune",
        url: "https://www.lesechos.fr",
        focus: "CAC 40, luxury conglomerates (LVMH), and EU fiscal integration"
      }
    ],
    rss: []
  },
  "san-francisco": {
    id: "san-francisco",
    name: "San Francisco",
    country: "United States",
    countryCode: "US",
    region: "North America",
    exchange: "VC / Tech",
    keywords: [
      "san francisco",
      "silicon valley",
      "bay area",
      "tech",
      "startup",
      "venture"
    ],
    tickers: [
      "CRM",
      "UBER",
      "ABNB",
      "PLTR"
    ],
    sources: [
      {
        name: "SF Business Times / TechCrunch",
        url: "https://www.bizjournals.com/sanfrancisco",
        focus: "Venture capital, AI investment, and the Bay Area economy"
      }
    ],
    rss: []
  },
  santiago: {
    id: "santiago",
    name: "Santiago",
    country: "Chile",
    countryCode: "CL",
    region: "South America",
    exchange: "SSE",
    keywords: [
      "santiago",
      "chile",
      "chilean",
      "copper",
      "ipsa",
      "latam"
    ],
    tickers: [
      "SQM",
      "CMPC",
      "ENELAM.SN"
    ],
    sources: [
      {
        name: "Diario Financiero (DF)",
        url: "https://www.df.cl",
        focus: "Copper prices, pension fund (AFP) news"
      }
    ],
    rss: []
  },
  "sao-paulo": {
    id: "sao-paulo",
    name: "São Paulo",
    country: "Brazil",
    countryCode: "BR",
    region: "South America",
    exchange: "B3",
    keywords: [
      "brazil",
      "brazilian",
      "bovespa",
      "sao paulo",
      "são paulo",
      "real ",
      "bcb"
    ],
    tickers: [
      "VALE",
      "PBR",
      "ITUB"
    ],
    sources: [
      {
        name: "Valor Econômico / Infomoney",
        url: "https://www.infomoney.com.br",
        focus: "The B3 (Stock Exchange), Selic rate decisions, and Fintech/Agribusiness"
      },
      {
        name: "Exame",
        url: "https://exame.com",
        focus: "Corporate strategy and M&A within the Paulista business district"
      }
    ],
    rss: []
  },
  seoul: {
    id: "seoul",
    name: "Seoul",
    country: "South Korea",
    countryCode: "KR",
    region: "East & Southeast Asia",
    exchange: "KRX",
    keywords: [
      "seoul",
      "korea",
      "korean",
      "kospi",
      "samsung",
      "sk hynix"
    ],
    tickers: [
      "005930.KS",
      "000660.KS"
    ],
    sources: [
      {
        name: "Maeil Business Newspaper / Korea Economic Daily",
        url: "https://pulsenews.co.kr",
        focus: "Chaebol performance (Samsung/Hyundai), the KOSPI, and AI-chip exports"
      }
    ],
    rss: []
  },
  shanghai: {
    id: "shanghai",
    name: "Shanghai",
    country: "China",
    countryCode: "CN",
    region: "East & Southeast Asia",
    exchange: "SSE",
    keywords: [
      "shanghai",
      "china",
      "chinese",
      "pboc",
      "beijing",
      "csi",
      "sse"
    ],
    tickers: [
      "BABA",
      "NIO",
      "PDD",
      "LI"
    ],
    sources: [
      {
        name: "Yicai Global / Shanghai Securities",
        url: "https://www.yicaiglobal.com",
        focus: "The A-share market, STAR Market (tech), and PBoC policy"
      }
    ],
    rss: []
  },
  singapore: {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    region: "East & Southeast Asia",
    exchange: "SGX",
    keywords: [
      "singapore",
      "sgx",
      "mas ",
      "asean",
      "straits times index",
      "sti",
      "temasek",
      "dbs"
    ],
    tickers: [
      "SE",
      "DBSDY"
    ],
    sources: [
      {
        name: "The Business Times (BT) / CNA Luxury",
        url: "https://www.businesstimes.com.sg",
        focus: "Regional wealth management, REITs, and Gateway to ASEAN trade flows"
      }
    ],
    rss: []
  },
  stockholm: {
    id: "stockholm",
    name: "Stockholm",
    country: "Sweden",
    countryCode: "SE",
    region: "Europe",
    exchange: "Nasdaq Nordic",
    keywords: [
      "stockholm",
      "sweden",
      "swedish",
      "nordic",
      "nasdaq nordic",
      "riksbank",
      "krona",
      "sek",
      "omx"
    ],
    tickers: [
      "ERIC-B.ST",
      "VOLV-B.ST",
      "ABB.ST"
    ],
    sources: [
      {
        name: "Dagens Industri (Di)",
        url: "https://www.di.se",
        focus: "Nordic Fintech Unicorn culture, Klarna-style banking, and the SEK economy"
      }
    ],
    rss: []
  },
  sydney: {
    id: "sydney",
    name: "Sydney",
    country: "Australia",
    countryCode: "AU",
    region: "Oceania",
    exchange: "ASX",
    keywords: [
      "sydney",
      "australia",
      "australian",
      "asx",
      "rba",
      "aussie"
    ],
    tickers: [
      "BHP",
      "RIO",
      "WBK"
    ],
    sources: [
      {
        name: "The Australian Financial Review",
        url: "https://www.afr.com",
        focus: "The ASX 200, investment banking, and the RBA"
      },
      {
        name: "Business Insider Australia",
        url: "https://www.businessinsider.com.au",
        focus: "Tech-focused, retail-investor friendly"
      }
    ],
    rss: []
  },
  "tel-aviv": {
    id: "tel-aviv",
    name: "Tel Aviv",
    country: "Israel",
    countryCode: "IL",
    region: "Middle East",
    exchange: "TASE",
    keywords: [
      "tel aviv",
      "israel",
      "israeli",
      "tase",
      "shekel",
      "teva"
    ],
    tickers: [
      "TEVA",
      "CHKP",
      "NICE",
      "CYBR"
    ],
    sources: [
      {
        name: "Globes",
        url: "https://en.globes.co.il",
        focus: "Corporate, legal, and high-tech financial news"
      },
      {
        name: "TheMarker",
        url: "https://www.themarker.com",
        focus: "Tech ecosystem and social economics"
      },
      {
        name: "Calcalist",
        url: "https://www.calcalistech.com",
        focus: "TASE (Tel Aviv Stock Exchange), real estate, and consumer finance"
      },
      {
        name: "The Media Line",
        url: "https://themedialine.org",
        focus: "How regional conflicts impact local stock indices"
      }
    ],
    rss: []
  },
  tokyo: {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    region: "East & Southeast Asia",
    exchange: "TSE",
    keywords: [
      "tokyo",
      "japan",
      "japanese",
      "nikkei",
      "boj",
      "bank of japan",
      "yen",
      "yen "
    ],
    tickers: [
      "TM",
      "SONY",
      "MUFG",
      "NMR"
    ],
    sources: [
      {
        name: "Nikkei (Nikkei Shimbun) / Bloomberg",
        url: "https://asia.nikkei.com",
        focus: "Corporate governance reforms, the Yen carry trade, and the Nikkei 225"
      }
    ],
    rss: []
  },
  toronto: {
    id: "toronto",
    name: "Toronto",
    country: "Canada",
    countryCode: "CA",
    region: "North America",
    exchange: "TSX",
    keywords: [
      "toronto",
      "canada",
      "canadian",
      "tsx",
      "bank of canada",
      "loonie"
    ],
    tickers: [
      "RY",
      "TD",
      "ENB",
      "CNQ"
    ],
    sources: [
      {
        name: "The Globe and Mail (Report on Business)",
        url: "https://www.theglobeandmail.com/business",
        focus: "Bay Street banking, the TSX, and national fiscal policy"
      }
    ],
    rss: []
  }
};

/** world-map.tsx `panelId` → canonical (hyphenated) city id. */
export const PANEL_ID_TO_CITY_ID = {
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
  auckland: 'auckland',
  melbourne: 'melbourne',
  nairobi: 'nairobi',
  santiago: 'santiago',
  lima: 'lima',
  bogota: 'bogota',
  medellin: 'medellin',
  buenosaires: 'buenos-aires',
  boston: 'boston'
};

export const REGIONS = [...new Set(Object.values(CITIES).map((c) => c.region))];

export function getCityById(id) {
  return CITIES[id] || null;
}
export function getCitiesInRegion(region) {
  return Object.values(CITIES).filter((c) => c.region === region);
}

// ── Derived views of CITIES for the Phase-1 keyword/country lookups ──────────
export const CITY_KEYWORDS = Object.fromEntries(
  Object.values(CITIES).map((c) => [c.id, c.keywords]),
);
export const CITY_TICKERS = Object.fromEntries(
  Object.values(CITIES).map((c) => [c.id, c.tickers]),
);
export const CITY_TO_COUNTRY = Object.fromEntries(
  Object.values(CITIES).map((c) => [c.id, c.countryCode.toLowerCase()]),
);

// ── Backward-compat shims (DERIVED — removed in Phase 2 with the consumer
//    migration). Keep the running app working during the id normalization. ──
const toSnake = (id) => id.replace(/-/g, '_');

/** Legacy snake_case-keyed sources map (consumed by /api/news/city). */
export const CITY_NEWS_SOURCES = Object.fromEntries(
  Object.values(CITIES).map((c) => [
    toSnake(c.id),
    { city: c.name, region: c.region, sources: c.sources },
  ]),
);

/** Legacy panelId → snake_case key (consumed by market-analysis/page.js). */
export const PANEL_ID_TO_CITY_KEY = Object.fromEntries(
  Object.entries(PANEL_ID_TO_CITY_ID).map(([pid, id]) => [pid, toSnake(id)]),
);

/** Legacy panelId → hyphenated id (identical to PANEL_ID_TO_CITY_ID). */
export const PANEL_ID_TO_FINHUB_CITY_ID = { ...PANEL_ID_TO_CITY_ID };

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

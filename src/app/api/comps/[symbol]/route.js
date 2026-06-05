import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FMP_BASE = 'https://financialmodelingprep.com/stable';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

function getFmpKey() {
  return process.env.FMP_API_KEY || process.env.NEXT_PUBLIC_FMP_API_KEY || '';
}
function getFinnhubKey() {
  return process.env.FINNHUB_API_KEY || '';
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtMcap(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ══════════════════════════════════════════════════════════════════
   SECTOR / INDUSTRY PEER MAP
   ══════════════════════════════════════════════════════════════════ */

const INDUSTRY_PEERS = {
  Semiconductors: [
    'NVDA',
    'AMD',
    'INTC',
    'AVGO',
    'QCOM',
    'TXN',
    'MU',
    'MRVL',
    'LRCX',
    'KLAC',
    'AMAT',
    'ON',
    'ADI',
    'NXPI',
    'MCHP',
  ],
  'Semiconductor Equipment': ['ASML', 'LRCX', 'KLAC', 'AMAT', 'TER', 'ENTG', 'MKSI', 'ONTO'],
  'Software—Infrastructure': [
    'MSFT',
    'ORCL',
    'CRM',
    'NOW',
    'INTU',
    'ADBE',
    'PANW',
    'SNPS',
    'CDNS',
    'WDAY',
    'TEAM',
    'PLTR',
    'DDOG',
    'NET',
    'CRWD',
  ],
  'Software—Application': [
    'ADBE',
    'CRM',
    'INTU',
    'NOW',
    'WDAY',
    'TEAM',
    'ZS',
    'DDOG',
    'MDB',
    'SNOW',
    'HUBS',
    'TTD',
    'BILL',
    'PCOR',
  ],
  Software: [
    'MSFT',
    'ORCL',
    'CRM',
    'NOW',
    'ADBE',
    'INTU',
    'PANW',
    'SNPS',
    'CDNS',
    'WDAY',
    'PLTR',
    'DDOG',
    'CRWD',
    'NET',
    'ZS',
  ],
  'Consumer Electronics': ['AAPL', 'SONY', 'DELL', 'HPQ', 'LOGI', 'ROKU', 'SONO'],
  'Internet Content & Information': ['GOOG', 'GOOGL', 'META', 'SNAP', 'PINS', 'RDDT', 'TTD', 'ZG'],
  'Internet Retail': ['AMZN', 'SHOP', 'MELI', 'BABA', 'JD', 'PDD', 'ETSY', 'W', 'CHWY', 'EBAY'],
  Entertainment: ['NFLX', 'DIS', 'WBD', 'PARA', 'SPOT', 'RBLX', 'EA', 'TTWO', 'ATVI'],
  Telecom: ['T', 'VZ', 'TMUS', 'LUMN', 'FTR', 'CHTR', 'CMCSA'],
  Banks: [
    'JPM',
    'BAC',
    'WFC',
    'C',
    'GS',
    'MS',
    'USB',
    'PNC',
    'TFC',
    'SCHW',
    'BK',
    'STT',
    'FITB',
    'KEY',
    'HBAN',
  ],
  Insurance: ['BRK.B', 'PGR', 'MET', 'AIG', 'ALL', 'TRV', 'AFL', 'PRU', 'HIG', 'CINF'],
  'Capital Markets': [
    'GS',
    'MS',
    'SCHW',
    'BLK',
    'ICE',
    'CME',
    'SPGI',
    'MCO',
    'NDAQ',
    'MKTX',
    'COIN',
  ],
  'Financial Services': ['V', 'MA', 'PYPL', 'SQ', 'FIS', 'FISV', 'GPN', 'ADP', 'AFRM', 'SOFI'],
  Biotechnology: ['AMGN', 'GILD', 'VRTX', 'REGN', 'BIIB', 'MRNA', 'SGEN', 'ALNY', 'BMRN', 'INCY'],
  Pharmaceuticals: ['LLY', 'JNJ', 'PFE', 'MRK', 'ABBV', 'BMY', 'AZN', 'NVO', 'NVS', 'GSK', 'ZTS'],
  'Medical Devices': ['MDT', 'ABT', 'SYK', 'BSX', 'ISRG', 'EW', 'ZBH', 'BAX', 'BDX', 'HOLX'],
  'Health Care Equipment & Supplies': [
    'MDT',
    'ABT',
    'SYK',
    'BSX',
    'ISRG',
    'EW',
    'BDX',
    'HOLX',
    'ALGN',
    'DXCM',
  ],
  'Auto Manufacturers': [
    'TSLA',
    'TM',
    'F',
    'GM',
    'RIVN',
    'LCID',
    'HMC',
    'STLA',
    'NIO',
    'XPEV',
    'LI',
  ],
  Restaurants: ['MCD', 'SBUX', 'CMG', 'YUM', 'DPZ', 'WING', 'DINE', 'QSR', 'TXRH', 'DRI'],
  'Specialty Retail': ['HD', 'LOW', 'TJX', 'ROST', 'BBY', 'ORLY', 'AZO', 'ULTA', 'FIVE', 'TSCO'],
  Apparel: ['NKE', 'LULU', 'TJX', 'ROST', 'GPS', 'RL', 'PVH', 'TPR', 'CPRI', 'VFC'],
  Beverages: ['KO', 'PEP', 'MNST', 'STZ', 'BF.B', 'SAM', 'CELH', 'TAP', 'DEO'],
  'Packaged Foods': ['COST', 'KR', 'GIS', 'K', 'CPB', 'SJM', 'HSY', 'MKC', 'CAG', 'CLX'],
  'Household Products': ['PG', 'CL', 'KMB', 'CLX', 'CHD', 'SPB', 'EPC', 'HELE'],
  'Oil & Gas': [
    'XOM',
    'CVX',
    'COP',
    'EOG',
    'SLB',
    'OXY',
    'PSX',
    'MPC',
    'VLO',
    'HAL',
    'PXD',
    'DVN',
    'HES',
    'FANG',
    'BKR',
  ],
  'Renewable Energy': ['ENPH', 'SEDG', 'FSLR', 'RUN', 'NEE', 'BEP', 'PLUG', 'BE', 'NOVA'],
  'Aerospace & Defense': ['BA', 'LMT', 'RTX', 'NOC', 'GD', 'HII', 'LHX', 'TDG', 'HWM', 'AXON'],
  Airlines: ['DAL', 'UAL', 'LUV', 'AAL', 'ALK', 'JBLU', 'SAVE', 'HA'],
  'Industrial Conglomerates': ['HON', 'GE', 'MMM', 'CAT', 'DE', 'EMR', 'ROK', 'PH', 'ITW', 'ETN'],
  Railroads: ['UNP', 'CSX', 'NSC', 'CP', 'CNI', 'WAB'],
  Chemicals: ['LIN', 'APD', 'SHW', 'ECL', 'DD', 'PPG', 'DOW', 'CE', 'EMN', 'ALB'],
  Mining: ['NEM', 'FCX', 'AA', 'RIO', 'BHP', 'VALE', 'TECK', 'SCCO'],
  REITs: ['AMT', 'PLD', 'CCI', 'EQIX', 'SPG', 'O', 'PSA', 'DLR', 'WELL', 'AVB', 'EQR', 'VTR'],
  Utilities: ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'WEC', 'ES', 'ED', 'PEG'],
};

const SECTOR_PEERS = {
  Technology: [
    'AAPL',
    'MSFT',
    'NVDA',
    'GOOG',
    'META',
    'AVGO',
    'ORCL',
    'CRM',
    'AMD',
    'ADBE',
    'INTC',
    'QCOM',
    'NOW',
    'INTU',
    'TXN',
    'MU',
    'PANW',
    'SNPS',
    'CDNS',
    'PLTR',
  ],
  'Information Technology': [
    'AAPL',
    'MSFT',
    'NVDA',
    'AVGO',
    'ORCL',
    'CRM',
    'AMD',
    'ADBE',
    'INTC',
    'QCOM',
    'NOW',
    'INTU',
    'TXN',
    'MU',
    'PANW',
    'SNPS',
    'CDNS',
    'PLTR',
    'AMAT',
    'KLAC',
  ],
  'Communication Services': [
    'GOOG',
    'GOOGL',
    'META',
    'NFLX',
    'DIS',
    'TMUS',
    'T',
    'VZ',
    'CMCSA',
    'CHTR',
    'SPOT',
    'SNAP',
    'PINS',
    'RBLX',
    'EA',
    'TTWO',
    'WBD',
  ],
  'Consumer Cyclical': [
    'AMZN',
    'TSLA',
    'HD',
    'MCD',
    'NKE',
    'SBUX',
    'LOW',
    'TJX',
    'CMG',
    'BKNG',
    'ORLY',
    'ROST',
    'LULU',
    'GM',
    'F',
    'MAR',
    'YUM',
    'EBAY',
  ],
  'Consumer Discretionary': [
    'AMZN',
    'TSLA',
    'HD',
    'MCD',
    'NKE',
    'SBUX',
    'LOW',
    'TJX',
    'CMG',
    'BKNG',
    'ORLY',
    'ROST',
    'LULU',
    'GM',
    'F',
    'MAR',
    'YUM',
    'EBAY',
  ],
  'Consumer Defensive': [
    'WMT',
    'PG',
    'COST',
    'KO',
    'PEP',
    'PM',
    'MO',
    'CL',
    'KMB',
    'GIS',
    'KR',
    'MNST',
    'CLX',
    'HSY',
    'SJM',
    'K',
    'STZ',
  ],
  'Consumer Staples': [
    'WMT',
    'PG',
    'COST',
    'KO',
    'PEP',
    'PM',
    'MO',
    'CL',
    'KMB',
    'GIS',
    'KR',
    'MNST',
    'CLX',
    'HSY',
    'SJM',
    'K',
    'STZ',
  ],
  'Financial Services': [
    'V',
    'MA',
    'JPM',
    'BAC',
    'WFC',
    'GS',
    'MS',
    'SCHW',
    'BLK',
    'SPGI',
    'ICE',
    'CME',
    'PYPL',
    'AXP',
    'C',
    'MCO',
    'COIN',
  ],
  Financials: [
    'V',
    'MA',
    'JPM',
    'BAC',
    'WFC',
    'GS',
    'MS',
    'SCHW',
    'BLK',
    'SPGI',
    'ICE',
    'CME',
    'PYPL',
    'AXP',
    'C',
    'PGR',
    'MET',
  ],
  Healthcare: [
    'LLY',
    'UNH',
    'JNJ',
    'MRK',
    'ABBV',
    'PFE',
    'TMO',
    'ABT',
    'DHR',
    'AMGN',
    'MDT',
    'ISRG',
    'GILD',
    'VRTX',
    'REGN',
    'BMY',
    'SYK',
    'BSX',
    'CI',
    'ELV',
  ],
  'Health Care': [
    'LLY',
    'UNH',
    'JNJ',
    'MRK',
    'ABBV',
    'PFE',
    'TMO',
    'ABT',
    'DHR',
    'AMGN',
    'MDT',
    'ISRG',
    'GILD',
    'VRTX',
    'REGN',
    'BMY',
    'SYK',
    'BSX',
    'CI',
    'ELV',
  ],
  Energy: [
    'XOM',
    'CVX',
    'COP',
    'EOG',
    'SLB',
    'OXY',
    'PSX',
    'MPC',
    'VLO',
    'HAL',
    'DVN',
    'HES',
    'FANG',
    'BKR',
    'WMB',
    'KMI',
  ],
  Industrials: [
    'HON',
    'GE',
    'CAT',
    'DE',
    'BA',
    'RTX',
    'LMT',
    'UNP',
    'UPS',
    'MMM',
    'NOC',
    'GD',
    'EMR',
    'ETN',
    'ITW',
    'PH',
    'ROK',
  ],
  'Basic Materials': [
    'LIN',
    'APD',
    'SHW',
    'ECL',
    'NEM',
    'FCX',
    'DD',
    'DOW',
    'PPG',
    'CE',
    'ALB',
    'AA',
    'EMN',
    'CTVA',
  ],
  Materials: [
    'LIN',
    'APD',
    'SHW',
    'ECL',
    'NEM',
    'FCX',
    'DD',
    'DOW',
    'PPG',
    'CE',
    'ALB',
    'AA',
    'EMN',
    'CTVA',
  ],
  'Real Estate': [
    'AMT',
    'PLD',
    'CCI',
    'EQIX',
    'SPG',
    'O',
    'PSA',
    'DLR',
    'WELL',
    'AVB',
    'EQR',
    'VTR',
    'ARE',
    'MAA',
  ],
  Utilities: [
    'NEE',
    'DUK',
    'SO',
    'D',
    'AEP',
    'EXC',
    'SRE',
    'XEL',
    'WEC',
    'ES',
    'ED',
    'PEG',
    'AWK',
    'ETR',
  ],
};

/** Layer 1: FMP stock-peers */
async function fetchFmpPeers(symbol, fmpKey) {
  if (!fmpKey) return [];
  try {
    const url = `${FMP_BASE}/stock-peers?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(fmpKey)}`;
    const data = await safeFetch(url);
    if (!data) return [];
    const list = data.peersList || data.peers || (Array.isArray(data) ? data : []);
    return (Array.isArray(list) ? list : [])
      .map((p) =>
        typeof p === 'string' ? p.trim().toUpperCase() : (p?.symbol || '').toUpperCase(),
      )
      .filter((s) => s && s !== symbol && /^[A-Z.]{1,10}$/.test(s));
  } catch {
    return [];
  }
}

/** Layer 2: Finnhub peers */
async function fetchFinnhubPeers(symbol) {
  const key = getFinnhubKey();
  if (!key) return [];
  try {
    const url = `${FINNHUB_BASE}/stock/peers?symbol=${encodeURIComponent(symbol)}&token=${key}`;
    const data = await safeFetch(url);
    if (!Array.isArray(data)) return [];
    return data
      .map((s) => String(s).trim().toUpperCase())
      .filter((s) => s && s !== symbol && /^[A-Z.]{1,10}$/.test(s));
  } catch {
    return [];
  }
}

/** Layer 3: AV OVERVIEW → sector/industry → hardcoded map */
async function fetchSectorPeers(symbol) {
  const avKey = getAlphaVantageApiKey();
  if (!avKey) return { sector: null, industry: null, peers: [] };

  try {
    const data = await fetchAV({ function: 'OVERVIEW', symbol }, 86400);
    const sector = data?.Sector || null;
    const industry = data?.Industry || null;

    console.log(`[comps] ${symbol}: AV OVERVIEW sector="${sector}", industry="${industry}"`);

    if (!sector && !industry) return { sector, industry, peers: [] };

    let peers = [];
    if (industry) {
      peers = INDUSTRY_PEERS[industry] || [];
      if (peers.length === 0) {
        const industryLower = industry.toLowerCase();
        for (const [key, tickers] of Object.entries(INDUSTRY_PEERS)) {
          if (
            key.toLowerCase().includes(industryLower) ||
            industryLower.includes(key.toLowerCase())
          ) {
            peers = tickers;
            break;
          }
        }
      }
    }

    if (peers.length < 5 && sector) {
      const sectorPeers = SECTOR_PEERS[sector] || [];
      peers = [...new Set([...peers, ...sectorPeers])];
    }

    peers = peers.filter((s) => s !== symbol);

    return { sector, industry, peers };
  } catch (err) {
    console.warn(`[comps] ${symbol}: AV OVERVIEW failed:`, err?.message);
    return { sector: null, industry: null, peers: [] };
  }
}

async function findPeers(symbol, fmpKey) {
  const collected = new Set();

  const fmpPeers = await fetchFmpPeers(symbol, fmpKey);
  console.log(`[comps] ${symbol}: FMP returned ${fmpPeers.length} peers`);
  for (const p of fmpPeers) collected.add(p);

  if (collected.size < 10) {
    const finnhubPeers = await fetchFinnhubPeers(symbol);
    console.log(`[comps] ${symbol}: Finnhub returned ${finnhubPeers.length} peers`);
    for (const p of finnhubPeers) collected.add(p);
  }

  if (collected.size < 10) {
    const { sector, industry, peers: sectorPeers } = await fetchSectorPeers(symbol);
    console.log(
      `[comps] ${symbol}: sector map returned ${sectorPeers.length} peers (sector="${sector}", industry="${industry}")`,
    );
    for (const p of sectorPeers) {
      if (p !== symbol) collected.add(p);
    }
  }

  collected.delete(symbol);

  const result = [...collected].slice(0, 10);
  console.log(`[comps] ${symbol}: final peer set (${result.length}): ${result.join(', ')}`);
  return result;
}

/**
 * Fetch financial data for one ticker.
 * Uses FMP quote + profile + ratios-ttm as primary source.
 * Falls back to Alpha Vantage OVERVIEW for any fields that come back null.
 */
async function fetchTickerData(symbol, key) {
  const sym = encodeURIComponent(symbol);
  const k = encodeURIComponent(key);

  const [quote, profile, ratios] = await Promise.all([
    safeFetch(`${FMP_BASE}/quote?symbol=${sym}&apikey=${k}`),
    safeFetch(`${FMP_BASE}/profile?symbol=${sym}&apikey=${k}`),
    safeFetch(`${FMP_BASE}/ratios-ttm?symbol=${sym}&apikey=${k}`),
  ]);

  const q = Array.isArray(quote) ? quote[0] : quote;
  const prof = Array.isArray(profile) ? profile[0] : profile;
  const rat = Array.isArray(ratios) ? ratios[0] : ratios;

  let price = num(q?.price ?? prof?.price);
  let marketCap = num(q?.marketCap ?? prof?.mktCap);
  const name = prof?.companyName || q?.name || symbol;
  const sector = prof?.sector || null;
  const industry = prof?.industry || null;
  let eps = num(q?.eps ?? rat?.netIncomePerShareTTM);

  let pe = num(rat?.peRatioTTM ?? q?.pe);
  let pb = num(rat?.priceToBookRatioTTM);
  let ps = num(rat?.priceToSalesRatioTTM);
  let evRevenue = num(rat?.enterpriseValueOverRevenueTTM ?? rat?.evToSalesTTM);
  let evEbitda = num(rat?.enterpriseValueOverEBITDATTM ?? rat?.evToEbitdaTTM);
  let divYield = num(rat?.dividendYieldTTM ?? prof?.lastDivYield);

  let grossMargin = num(rat?.grossProfitMarginTTM);
  let operatingMargin = num(rat?.operatingProfitMarginTTM);
  let netMargin = num(rat?.netProfitMarginTTM);
  let revenueGrowth = num(rat?.revenueGrowthTTM);

  const needsAv = pe === null || evRevenue === null || evEbitda === null || revenueGrowth === null;
  if (needsAv && getAlphaVantageApiKey()) {
    try {
      const av = await fetchAV({ function: 'OVERVIEW', symbol }, 3600);
      if (av && !av['Error Message'] && !av.Note) {
        if (pe === null) pe = num(av.PERatio);
        if (eps === null) eps = num(av.EPS);
        if (pb === null) pb = num(av.PriceToBookRatio);
        if (evRevenue === null) evRevenue = num(av.EVToRevenue);
        if (evEbitda === null) evEbitda = num(av.EVToEBITDA);
        if (divYield === null) {
          const avDiv = num(av.DividendYield);
          if (avDiv !== null) divYield = parseFloat((avDiv * 100).toFixed(2));
        }
        if (grossMargin === null) {
          const gp = num(av.GrossProfitTTM);
          const rev = num(av.RevenueTTM);
          if (gp !== null && rev !== null && rev > 0) grossMargin = gp / rev;
        }
        if (operatingMargin === null) {
          const om = num(av.OperatingMarginTTM);
          if (om !== null) operatingMargin = om;
        }
        if (netMargin === null) {
          const pm = num(av.ProfitMargin);
          if (pm !== null) netMargin = pm;
        }
        if (revenueGrowth === null) {
          const qrg = num(av.QuarterlyRevenueGrowthYOY);
          if (qrg !== null) revenueGrowth = qrg;
        }
        if (price === null) price = num(av.AnalystTargetPrice) || num(av['50DayMovingAverage']);
        if (marketCap === null) marketCap = num(av.MarketCapitalization);

        console.log(
          `[comps] ${symbol}: AV OVERVIEW filled — pe=${pe}, evRev=${evRevenue}, evEbitda=${evEbitda}, revGrowth=${revenueGrowth}`,
        );
      }
    } catch (err) {
      console.warn(`[comps] ${symbol}: AV OVERVIEW fallback failed:`, err?.message);
    }
  }

  const toPct = (v) => {
    if (v === null) return null;
    const pct = Math.abs(v) <= 1 ? v * 100 : v;
    return parseFloat(pct.toFixed(1));
  };

  return {
    symbol,
    name,
    sector,
    industry,
    price,
    marketCap,
    marketCapFormatted: fmtMcap(marketCap),
    pe: pe != null ? parseFloat(Number(pe).toFixed(2)) : null,
    pb: pb != null ? parseFloat(Number(pb).toFixed(2)) : null,
    ps: ps != null ? parseFloat(Number(ps).toFixed(2)) : null,
    evRevenue: evRevenue != null ? parseFloat(Number(evRevenue).toFixed(2)) : null,
    evEbitda: evEbitda != null ? parseFloat(Number(evEbitda).toFixed(2)) : null,
    divYield:
      divYield != null ? parseFloat((divYield > 1 ? divYield : divYield * 100).toFixed(2)) : null,
    eps,
    grossMargin: toPct(grossMargin),
    operatingMargin: toPct(operatingMargin),
    netMargin: toPct(netMargin),
    revenueGrowth: toPct(revenueGrowth),
  };
}

function computeStats(peerData, field) {
  const values = peerData
    .map((p) => p[field])
    .filter((v) => v !== null && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (values.length === 0)
    return { median: null, p25: null, p75: null, min: null, max: null, count: 0 };
  return {
    median: parseFloat(values[Math.floor(values.length / 2)].toFixed(2)),
    p25: parseFloat(values[Math.floor(values.length * 0.25)].toFixed(2)),
    p75: parseFloat(values[Math.floor(values.length * 0.75)].toFixed(2)),
    min: parseFloat(values[0].toFixed(2)),
    max: parseFloat(values[values.length - 1].toFixed(2)),
    count: values.length,
  };
}

function classifyPosition(targetValue, stats) {
  if (targetValue === null || !stats || stats.median === null)
    return { position: 'unknown', percentile: null };
  if (stats.p25 !== null && targetValue < stats.p25)
    return { position: 'discount', percentile: 'below 25th' };
  if (stats.p75 !== null && targetValue > stats.p75)
    return { position: 'premium', percentile: 'above 75th' };
  return { position: 'inline', percentile: '25th–75th' };
}

function computeImpliedValuation(target, peerStats) {
  const implied = [];
  if (peerStats.pe?.median && target.eps && target.eps > 0) {
    implied.push({
      method: 'P/E × EPS',
      multiple: peerStats.pe.median,
      impliedPrice: parseFloat((peerStats.pe.median * target.eps).toFixed(2)),
    });
  }
  if (peerStats.evRevenue?.median && target.evRevenue && target.evRevenue > 0 && target.price) {
    implied.push({
      method: 'EV/Revenue',
      multiple: peerStats.evRevenue.median,
      impliedPrice: parseFloat(
        ((target.price * peerStats.evRevenue.median) / target.evRevenue).toFixed(2),
      ),
    });
  }
  if (peerStats.evEbitda?.median && target.evEbitda && target.evEbitda > 0 && target.price) {
    implied.push({
      method: 'EV/EBITDA',
      multiple: peerStats.evEbitda.median,
      impliedPrice: parseFloat(
        ((target.price * peerStats.evEbitda.median) / target.evEbitda).toFixed(2),
      ),
    });
  }
  if (peerStats.pb?.median && target.pb && target.pb > 0 && target.price) {
    implied.push({
      method: 'P/B',
      multiple: peerStats.pb.median,
      impliedPrice: parseFloat(((target.price * peerStats.pb.median) / target.pb).toFixed(2)),
    });
  }
  if (implied.length === 0) return { methods: [], avgImpliedPrice: null, premiumDiscount: null };
  const avg = implied.reduce((s, m) => s + m.impliedPrice, 0) / implied.length;
  const pd = target.price > 0 ? ((target.price - avg) / avg) * 100 : null;
  return {
    methods: implied,
    avgImpliedPrice: parseFloat(avg.toFixed(2)),
    premiumDiscount: pd != null ? parseFloat(pd.toFixed(1)) : null,
  };
}

function deriveVerdict(pd) {
  if (pd === null) return { verdict: 'insufficient_data', label: 'Insufficient Data' };
  if (pd < -15) return { verdict: 'undervalued', label: 'Undervalued vs. Peers' };
  if (pd > 15) return { verdict: 'overvalued', label: 'Overvalued vs. Peers' };
  return { verdict: 'fairly_valued', label: 'Fairly Valued' };
}

export const GET = withApiGuard(
  async (request, user, context) => {
    const symbol = String(context?.params?.symbol ?? '')
      .trim()
      .toUpperCase();
    if (!symbol || !/^[A-Z0-9.-]{1,15}$/.test(symbol)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }

    const fmpKey = getFmpKey();
    if (!fmpKey) {
      return NextResponse.json({ error: 'FMP_API_KEY not configured.' }, { status: 503 });
    }

    try {
      console.log(`[comps] ${symbol}: starting`);

      const peerSymbols = await findPeers(symbol, fmpKey);

      if (peerSymbols.length === 0) {
        return NextResponse.json(
          { error: `Could not find any comparable companies for ${symbol}.` },
          { status: 404 },
        );
      }

      const target = await fetchTickerData(symbol, fmpKey);
      if (target.price === null) {
        return NextResponse.json(
          { error: `Could not fetch market data for ${symbol}.` },
          { status: 404 },
        );
      }

      const peers = [];
      for (const peerSym of peerSymbols) {
        if (peers.length >= 10) break;
        await sleep(250);
        try {
          const peerData = await fetchTickerData(peerSym, fmpKey);
          if (peerData.price !== null) peers.push(peerData);
        } catch (err) {
          console.warn(`[comps] ${peerSym}: failed:`, err?.message);
        }
      }

      if (peers.length === 0) {
        return NextResponse.json(
          { error: `Could not fetch financial data for peers of ${symbol}.` },
          { status: 404 },
        );
      }

      const metricKeys = [
        'pe',
        'pb',
        'ps',
        'evRevenue',
        'evEbitda',
        'divYield',
        'grossMargin',
        'operatingMargin',
        'netMargin',
        'revenueGrowth',
      ];
      const peerStats = {};
      for (const m of metricKeys) peerStats[m] = computeStats(peers, m);

      const positions = {};
      for (const m of metricKeys) positions[m] = classifyPosition(target[m], peerStats[m]);

      const valuation = computeImpliedValuation(target, peerStats);
      const verdict = deriveVerdict(valuation.premiumDiscount);

      console.log(`[comps] ${symbol}: ${peers.length} peers, verdict=${verdict.verdict}`);

      return NextResponse.json(
        {
          symbol,
          target,
          peers,
          peerStats,
          positions,
          valuation,
          verdict,
          generatedAt: new Date().toISOString(),
        },
        { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
      );
    } catch (err) {
      console.error(`[comps] ${symbol} failed:`, err);
      return NextResponse.json({ error: `Analysis failed: ${err?.message}` }, { status: 500 });
    }
  },
  { requireAuth: false },
);

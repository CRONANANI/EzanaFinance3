import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// Forbes Real-Time Billionaires via RapidAPI
const RAPIDAPI_HOST = 'forbes-worlds-billionaires1.p.rapidapi.com';

// Forbes API uses full country names — map to ISO 3166-1 alpha-2
const COUNTRY_NAME_TO_ISO = {
  'United States': 'US',
  China: 'CN',
  India: 'IN',
  Germany: 'DE',
  Russia: 'RU',
  'Hong Kong': 'HK',
  Brazil: 'BR',
  Canada: 'CA',
  'United Kingdom': 'GB',
  France: 'FR',
  Italy: 'IT',
  Switzerland: 'CH',
  Japan: 'JP',
  'South Korea': 'KR',
  Australia: 'AU',
  Taiwan: 'TW',
  Mexico: 'MX',
  Thailand: 'TH',
  Sweden: 'SE',
  Spain: 'ES',
  Indonesia: 'ID',
  Turkey: 'TR',
  Israel: 'IL',
  Norway: 'NO',
  Singapore: 'SG',
  Philippines: 'PH',
  Malaysia: 'MY',
  Nigeria: 'NG',
  'South Africa': 'ZA',
  Netherlands: 'NL',
  Chile: 'CL',
  Colombia: 'CO',
  Poland: 'PL',
  Austria: 'AT',
  Denmark: 'DK',
  Belgium: 'BE',
  Ireland: 'IE',
  'Czech Republic': 'CZ',
  Argentina: 'AR',
  Egypt: 'EG',
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  Peru: 'PE',
  'New Zealand': 'NZ',
  Portugal: 'PT',
  Finland: 'FI',
  Vietnam: 'VN',
  Kazakhstan: 'KZ',
  Ukraine: 'UA',
  Romania: 'RO',
  Greece: 'GR',
  Pakistan: 'PK',
  Bangladesh: 'BD',
  Morocco: 'MA',
  Kenya: 'KE',
  Qatar: 'QA',
  Kuwait: 'KW',
  Lebanon: 'LB',
  Nepal: 'NP',
  Georgia: 'GE',
  Venezuela: 'VE',
  Eswatini: 'SZ',
  Tanzania: 'TZ',
  Algeria: 'DZ',
  Oman: 'OM',
  Monaco: 'MC',
  Cyprus: 'CY',
  Bahrain: 'BH',
  Zimbabwe: 'ZW',
  Uganda: 'UG',
  Macau: 'MO',
  Liechtenstein: 'LI',
};

function getRapidApiKey() {
  return process.env.RAPIDAPI_FORBES_KEY || process.env.FORBES_BILLIONAIRE_API_KEY || '';
}

export const GET = withApiGuard(
  async (request, user) => {
    const apiKey = getRapidApiKey();

    if (!apiKey) {
      console.error('[billionaires] RAPIDAPI_FORBES_KEY / FORBES_BILLIONAIRE_API_KEY not set');
      return NextResponse.json({ error: 'Forbes API key not configured' }, { status: 503 });
    }

    try {
      const res = await fetch(`https://${RAPIDAPI_HOST}/api/Forbes/Billionaires`, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        console.error(`[billionaires] Forbes API returned ${res.status}`);
        return NextResponse.json({ error: `Forbes API error: ${res.status}` }, { status: 502 });
      }

      const data = await res.json();
      const billionaires = data.ranking || data || [];

      const countryMap = {};
      for (const b of billionaires) {
        const country = b.country;
        if (!country) continue;
        if (!countryMap[country]) {
          countryMap[country] = { count: 0, totalWealth: 0 };
        }
        countryMap[country].count += 1;
        const worth = b.current_worth ?? b.netWorth ?? b.net_worth ?? 0;
        countryMap[country].totalWealth += Number(worth) || 0;
      }

      const mapped = Object.entries(countryMap)
        .map(([country, stats]) => ({
          country,
          iso: COUNTRY_NAME_TO_ISO[country] || null,
          count: stats.count,
          totalWealth: Math.round(stats.totalWealth * 10) / 10,
        }))
        .filter((e) => e.iso);

      return NextResponse.json({
        total: Array.isArray(billionaires) ? billionaires.length : 0,
        byCountry: mapped,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[billionaires] fetch failed:', err);
      return NextResponse.json({ error: 'Failed to fetch billionaire data' }, { status: 500 });
    }
  },
  { requireAuth: false },
);

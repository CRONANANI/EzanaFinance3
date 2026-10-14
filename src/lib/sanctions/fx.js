/**
 * OFAC address country -> the currency its economy trades in, for the
 * Sanctions page's sanctions-versus-currency card. Pure data.
 *
 *   ccy     ISO 4217 code, priced against USD as the FMP pair USD{ccy}
 *   regime  'float'  market rate, the card charts it
 *           'peg'    held to the dollar by policy, so the chart is flat by
 *                    design; the card says "pegged" instead of drawing a line
 *           'none'   no usable market rate (official rates that do not trade,
 *                    or no quote at all); the card says so
 *
 * Countries using the dollar itself (Ecuador, Panama, El Salvador) map to
 * 'USD' with regime 'peg'. Anything missing here shows "no FX data".
 */
const F = (ccy) => ({ ccy, regime: 'float' });
const PEG = (ccy) => ({ ccy, regime: 'peg' });
const NONE = (ccy) => ({ ccy, regime: 'none' });

export const COUNTRY_CURRENCY = {
  Russia: F('RUB'),
  Iran: NONE('IRR'),
  China: F('CNY'),
  'Hong Kong': PEG('HKD'),
  'United Arab Emirates': PEG('AED'),
  Turkey: F('TRY'),
  Turkiye: F('TRY'),
  Venezuela: NONE('VES'),
  Syria: NONE('SYP'),
  'Korea, North': NONE('KPW'),
  Cuba: NONE('CUP'),
  Belarus: F('BYN'),
  Lebanon: NONE('LBP'),
  Iraq: F('IQD'),
  Mexico: F('MXN'),
  Colombia: F('COP'),
  Burma: NONE('MMK'),
  Nicaragua: F('NIO'),
  Sudan: NONE('SDG'),
  Pakistan: F('PKR'),
  India: F('INR'),
  Afghanistan: F('AFN'),
  Yemen: NONE('YER'),
  Ukraine: F('UAH'),
  Kazakhstan: F('KZT'),
  Kyrgyzstan: F('KGS'),
  Armenia: F('AMD'),
  Georgia: F('GEL'),
  Uzbekistan: F('UZS'),
  Tajikistan: F('TJS'),
  Azerbaijan: F('AZN'),
  Moldova: F('MDL'),
  Serbia: F('RSD'),
  Brazil: F('BRL'),
  Paraguay: F('PYG'),
  Argentina: F('ARS'),
  Peru: F('PEN'),
  Chile: F('CLP'),
  Guatemala: F('GTQ'),
  Honduras: F('HNL'),
  Panama: PEG('USD'),
  Ecuador: PEG('USD'),
  'El Salvador': PEG('USD'),
  Zimbabwe: NONE('ZWG'),
  'South Africa': F('ZAR'),
  Nigeria: F('NGN'),
  Libya: NONE('LYD'),
  Somalia: NONE('SOS'),
  Ethiopia: F('ETB'),
  Kenya: F('KES'),
  Uganda: F('UGX'),
  'Congo, Democratic Republic of the': F('CDF'),
  'South Sudan': NONE('SSP'),
  Mali: PEG('XOF'),
  'Central African Republic': PEG('XAF'),
  Thailand: F('THB'),
  Malaysia: F('MYR'),
  Singapore: F('SGD'),
  Indonesia: F('IDR'),
  Philippines: F('PHP'),
  Vietnam: F('VND'),
  Cambodia: F('KHR'),
  Laos: F('LAK'),
  Israel: F('ILS'),
  Egypt: F('EGP'),
  'Saudi Arabia': PEG('SAR'),
  Oman: PEG('OMR'),
  Qatar: PEG('QAR'),
  Bahrain: PEG('BHD'),
  Jordan: PEG('JOD'),
  Kuwait: F('KWD'),
  'United Kingdom': F('GBP'),
  Switzerland: F('CHF'),
  Japan: F('JPY'),
  'Korea, South': F('KRW'),
  Germany: F('EUR'),
  Cyprus: F('EUR'),
  Greece: F('EUR'),
  Latvia: F('EUR'),
  Estonia: F('EUR'),
  Bulgaria: F('BGN'),
  Canada: F('CAD'),
};

export function currencyFor(country) {
  return COUNTRY_CURRENCY[country] || null;
}

/** The distinct floating currencies, for the FX cron. */
export function floatingCurrencies() {
  return [
    ...new Set(
      Object.values(COUNTRY_CURRENCY)
        .filter((c) => c.regime === 'float')
        .map((c) => c.ccy),
    ),
  ].sort();
}

/* OFAC country names as news headlines write them, for attributing a story
   to the countries it names. Each alias is matched on word boundaries. */
export const NEWS_COUNTRY_ALIASES = {
  Russia: ['Russia', 'Russian', 'Moscow', 'Kremlin'],
  Iran: ['Iran', 'Iranian', 'Tehran'],
  China: ['China', 'Chinese', 'Beijing'],
  'Hong Kong': ['Hong Kong'],
  'Korea, North': ['North Korea', 'North Korean', 'Pyongyang', 'DPRK'],
  Venezuela: ['Venezuela', 'Venezuelan', 'Caracas', 'PDVSA'],
  Syria: ['Syria', 'Syrian', 'Damascus'],
  Cuba: ['Cuba', 'Cuban', 'Havana'],
  Belarus: ['Belarus', 'Belarusian', 'Minsk'],
  Burma: ['Myanmar', 'Burma', 'Burmese'],
  Afghanistan: ['Afghanistan', 'Taliban'],
  Yemen: ['Yemen', 'Houthi', 'Houthis'],
  Lebanon: ['Lebanon', 'Hezbollah'],
  Iraq: ['Iraq', 'Iraqi'],
  Sudan: ['Sudan', 'Sudanese', 'RSF'],
  'South Sudan': ['South Sudan'],
  Libya: ['Libya', 'Libyan'],
  Somalia: ['Somalia', 'al-Shabaab'],
  Nicaragua: ['Nicaragua', 'Nicaraguan'],
  Mexico: ['Mexico', 'Mexican', 'cartel', 'Sinaloa', 'CJNG'],
  Colombia: ['Colombia', 'Colombian'],
  Turkey: ['Turkey', 'Turkish', 'Turkiye'],
  'United Arab Emirates': ['UAE', 'Emirati', 'Dubai', 'Abu Dhabi'],
  India: ['India', 'Indian'],
  Ukraine: ['Ukraine', 'Ukrainian', 'Crimea'],
  'Congo, Democratic Republic of the': ['Congo', 'DRC'],
  Mali: ['Mali'],
  Serbia: ['Serbia', 'Serbian'],
  Georgia: ['Georgian Dream', 'Tbilisi'],
  Kyrgyzstan: ['Kyrgyzstan', 'Kyrgyz'],
  Kazakhstan: ['Kazakhstan'],
  Israel: ['Israel', 'Israeli'],
  Pakistan: ['Pakistan', 'Pakistani'],
  Brazil: ['Brazil', 'Brazilian'],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ALIAS_RES = Object.entries(NEWS_COUNTRY_ALIASES).map(([country, words]) => ({
  country,
  re: new RegExp(`\\b(${words.map(escapeRe).join('|')})\\b`),
}));

/** The OFAC countries a headline (plus summary) names. */
export function countriesInText(text) {
  const s = String(text || '');
  return ALIAS_RES.filter((a) => a.re.test(s)).map((a) => a.country);
}

/** Daily rows -> [{ month: 'YYYY-MM-01', rate }] at each month's last close. */
export function monthEnds(rows) {
  const byMonth = new Map();
  for (const r of rows || []) {
    const date = String(r?.date || '').slice(0, 10);
    const rate = Number(r?.price ?? r?.close);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(rate > 0)) continue;
    const m = `${date.slice(0, 7)}-01`;
    const prev = byMonth.get(m);
    if (!prev || date > prev.date) byMonth.set(m, { date, rate });
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, rate: v.rate }));
}

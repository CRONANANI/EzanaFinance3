'use client';

/**
 * Country flag indicator for brokerage tiles. Inline SVG flags for the ~6
 * countries SnapTrade-supported and Plaid-major institutions are based in.
 */

const FLAGS = {
  US: (
    <svg viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-label="USA">
      <rect width="16" height="12" fill="#B22234" />
      <g fill="#fff">
        <rect y="1" width="16" height="1" />
        <rect y="3" width="16" height="1" />
        <rect y="5" width="16" height="1" />
        <rect y="7" width="16" height="1" />
        <rect y="9" width="16" height="1" />
        <rect y="11" width="16" height="1" />
      </g>
      <rect width="7" height="6" fill="#3C3B6E" />
    </svg>
  ),
  CA: (
    <svg viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-label="Canada">
      <rect width="16" height="12" fill="#fff" />
      <rect width="4" height="12" fill="#FF0000" />
      <rect x="12" width="4" height="12" fill="#FF0000" />
      <path d="M8 3 L9 5 L11 5 L9.5 6 L10 8 L8 7 L6 8 L6.5 6 L5 5 L7 5 Z" fill="#FF0000" />
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-label="UK">
      <rect width="16" height="12" fill="#012169" />
      <path d="M0 0 L16 12 M16 0 L0 12" stroke="#fff" strokeWidth="2" />
      <path d="M0 0 L16 12 M16 0 L0 12" stroke="#C8102E" strokeWidth="1" />
      <path d="M8 0 V12 M0 6 H16" stroke="#fff" strokeWidth="3" />
      <path d="M8 0 V12 M0 6 H16" stroke="#C8102E" strokeWidth="1.5" />
    </svg>
  ),
  AU: (
    <svg viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-label="Australia">
      <rect width="16" height="12" fill="#012169" />
      <rect width="8" height="6" fill="#012169" />
      <path d="M0 0 L8 6 M8 0 L0 6" stroke="#fff" strokeWidth="1" />
      <path d="M4 0 V6 M0 3 H8" stroke="#fff" strokeWidth="1.5" />
      <path d="M4 0 V6 M0 3 H8" stroke="#C8102E" strokeWidth="0.8" />
      <circle cx="12" cy="4" r="0.6" fill="#fff" />
      <circle cx="13.5" cy="6" r="0.6" fill="#fff" />
      <circle cx="11.5" cy="7.5" r="0.6" fill="#fff" />
      <circle cx="13" cy="9" r="0.6" fill="#fff" />
      <circle cx="2" cy="9" r="0.5" fill="#fff" />
    </svg>
  ),
  DE: (
    <svg viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-label="Germany">
      <rect width="16" height="4" y="0" fill="#000" />
      <rect width="16" height="4" y="4" fill="#DD0000" />
      <rect width="16" height="4" y="8" fill="#FFCE00" />
    </svg>
  ),
  SG: (
    <svg viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" aria-label="Singapore">
      <rect width="16" height="6" fill="#EF3340" />
      <rect width="16" height="6" y="6" fill="#fff" />
      <circle cx="4" cy="3" r="2" fill="#fff" />
      <circle cx="4.6" cy="3" r="1.7" fill="#EF3340" />
    </svg>
  ),
};

const COUNTRY_NAMES = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  DE: 'Germany',
  SG: 'Singapore',
};

export function inferCountry(inst) {
  if (!inst) return null;
  const slug = String(inst.snaptradeSlug || inst.snaptrade_slug || '').toUpperCase();
  const name = String(inst.displayName || inst.display_name || inst.name || '').toLowerCase();

  if (
    /_CA$|_CANADA$/.test(slug) ||
    slug === 'QUESTRADE' ||
    slug === 'WEALTHSIMPLE' ||
    slug === 'WEBULL_CA'
  )
    return 'CA';
  if (/_USA$|_US$/.test(slug)) return 'US';
  if (/_AU$|_AUSTRALIA$/.test(slug) || slug === 'STAKE_AU') return 'AU';
  if (/_UK$|_GB$/.test(slug)) return 'GB';
  if (/_DE$/.test(slug)) return 'DE';
  if (/_SG$/.test(slug)) return 'SG';

  if (slug.includes('SCHWAB')) return 'US';
  if (slug.includes('FIDELITY')) return 'US';
  if (slug.includes('ROBINHOOD')) return 'US';
  if (slug.includes('ETRADE')) return 'US';
  if (slug.includes('TD_AMERITRADE')) return 'US';
  if (slug.includes('MERRILL')) return 'US';
  if (slug.includes('VANGUARD')) return 'US';
  if (slug.includes('IBKR') || slug.includes('INTERACTIVE_BROKERS')) return 'US';
  if (slug.includes('TASTYTRADE') || slug.includes('TRADESTATION')) return 'US';
  if (slug.includes('TRADIER')) return 'US';
  if (slug.includes('PUBLIC')) return 'US';
  if (slug.includes('ALPACA')) return 'US';
  if (slug.includes('MOOMOO')) return 'US';
  if (slug.includes('COINBASE')) return 'US';
  if (slug.includes('KRAKEN')) return 'US';
  if (slug.includes('TRADING212')) return 'GB';

  if (name.includes('wealthsimple') || name.includes('questrade') || name.includes('rbc'))
    return 'CA';
  if (name.includes('webull') && (name.includes('canada') || name.includes(' ca'))) return 'CA';
  if (name.includes('webull')) return 'US';
  if (
    name.includes('schwab') ||
    name.includes('fidelity') ||
    name.includes('vanguard') ||
    name.includes('merrill')
  )
    return 'US';
  if (name.includes('robinhood') || name.includes('etrade') || name.includes('e*trade'))
    return 'US';
  if (name.includes('interactive brokers') || name.includes('ibkr')) return 'US';
  if (
    name.includes('us bank') ||
    name.includes('u.s. bank') ||
    name.includes('chase') ||
    name.includes('wells fargo')
  )
    return 'US';
  if (
    name.includes('wealthfront') ||
    name.includes('betterment') ||
    name.includes('sofi') ||
    name.includes('acorns') ||
    name.includes('m1')
  )
    return 'US';
  if (
    name.includes('empower') ||
    name.includes('voya') ||
    name.includes('principal') ||
    name.includes('tiaa') ||
    name.includes('john hancock') ||
    name.includes('transamerica')
  )
    return 'US';
  if (name.includes('trading 212') || name.includes('trading212')) return 'GB';
  if (name.includes('stake')) return 'AU';

  return null;
}

export function CountryFlag({ code, size = 16 }) {
  if (!code || !FLAGS[code]) return null;
  return (
    <span
      className="apm-broker-flag"
      style={{
        display: 'inline-flex',
        width: size,
        height: size * 0.75,
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.12)',
        flexShrink: 0,
        lineHeight: 0,
      }}
      title={`Based in ${COUNTRY_NAMES[code] || code}`}
    >
      {FLAGS[code]}
    </span>
  );
}

'use client';

/**
 * Inline SVG brand marks for brokerages and Plaid institutions surfaced in
 * the Add Portfolio modal. Rendering inline (vs. loading PNGs) guarantees
 * zero broken-image states, crisp scaling at any tile size, and works offline.
 *
 * Resolution path: an institution → resolveBrandKey(inst) → switch case →
 * SVG. If no case matches, the default branch renders a first-letter mark
 * inside a colored square — still recognizable, no gray void.
 */

const COLORS = {
  // Crypto exchanges
  COINBASE: '#0052FF',
  BINANCE: '#F0B90B',
  KRAKEN: '#5741D9',
  // Canadian
  WEALTHSIMPLE: '#000000',
  QUESTRADE: '#005DAA',
  WEBULL_CA: '#1E5BFF',
  // US brokers
  SCHWAB: '#00A0DF',
  ETRADE: '#6633CC',
  ETRADE_PAPER: '#6633CC',
  PUBLIC: '#000000',
  TASTYTRADE: '#00C805',
  TRADESTATION: '#00B050',
  TRADESTATION_PAPER: '#00B050',
  TRADIER: '#13294B',
  MOOMOO: '#FF6F2C',
  ALPACA: '#FFD43B',
  ALPACA_PAPER: '#FFD43B',
  TRADING212: '#00AA5B',
  TRADING212_PRACTICE: '#00AA5B',
  WEBULL_US: '#1E5BFF',
  FIDELITY: '#368727',
  ROBINHOOD: '#16C98C',
  TD_AMERITRADE: '#5C9F44',
  ETORO: '#35B82E',
  IBKR: '#D81C2F',
  MERRILL: '#012169',
  US_BANK: '#0F2F7A',
  VANGUARD: '#C8102E',
  WEALTHFRONT: '#0E5CFF',
  BETTERMENT: '#F8C026',
  SOFI: '#0066FF',
  M1: '#000000',
  ACORNS: '#00A862',
  // Retirement / 401k (Plaid-only)
  EMPOWER: '#005EB8',
  EMPOWER_FCU: '#1B7E36',
  VOYA: '#FF671F',
  PRINCIPAL: '#0033A0',
  TIAA: '#003C71',
  // Australian / international
  STAKE_AU: '#00C19F',
};

export function brandColor(input) {
  const key = typeof input === 'string' ? input : resolveBrandKey(input);
  return COLORS[key] || '#6b7280';
}

/**
 * Canonical brand-key resolver. Accepts a full institution object or any
 * string-ish input. Returns the key used by the switch below. Normalizes
 * casing, strips punctuation, handles common SnapTrade slug variants and
 * Plaid display-name aliases.
 *
 * The matching is intentionally generous: 'Charles Schwab & Co.', 'Schwab',
 * 'CHARLES-SCHWAB', and the SnapTrade slug 'SCHWAB' all resolve to 'SCHWAB'.
 */
export function resolveBrandKey(input) {
  if (!input) return '';

  // String input (legacy callers)
  const raw = typeof input === 'string' ? input : null;
  const slug = raw || input.snaptradeSlug || input.snaptrade_slug || input.slug || '';
  const name = raw || input.displayName || input.display_name || input.name || '';

  // Try SnapTrade slug first — already uppercase
  const slugNorm = String(slug)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_');
  if (slugNorm && COLORS[slugNorm]) return slugNorm;

  // SnapTrade variants of WEBULL — handle WEBULL_USA, WEBULL_CA, WEBULL
  if (/^WEBULL/.test(slugNorm)) {
    if (slugNorm.includes('CA')) return 'WEBULL_CA';
    return 'WEBULL_US';
  }

  // Normalize name for alias lookup
  const lower = String(name).toLowerCase();

  // Order matters — most specific match first
  // (Empower Federal Credit Union is a different company from Empower Retirement
  // — we resolve to different keys for them.)
  if (lower.includes('empower') && (lower.includes('credit union') || lower.includes('fcu')))
    return 'EMPOWER_FCU';
  if (lower.includes('empower')) return 'EMPOWER';
  if (lower.includes('schwab')) return 'SCHWAB';
  if (lower.includes('merrill')) return 'MERRILL';
  if (lower.includes('interactive brokers') || lower.includes('ibkr')) return 'IBKR';
  if (lower.includes('vanguard')) return 'VANGUARD';
  if (lower.includes('wealthfront')) return 'WEALTHFRONT';
  if (lower.includes('betterment')) return 'BETTERMENT';
  if (lower.includes('us bank') || lower.includes('u.s. bank')) return 'US_BANK';
  if (lower.includes('fidelity netbenefits')) return 'FIDELITY';
  if (lower.includes('fidelity')) return 'FIDELITY';
  if (lower.includes('robinhood')) return 'ROBINHOOD';
  if (lower.includes('td ameritrade') || lower.includes('td direct')) return 'TD_AMERITRADE';
  if (lower.includes('etrade') || lower.includes('e*trade') || lower.includes('e trade'))
    return 'ETRADE';
  if (lower.includes('etoro')) return 'ETORO';
  if (lower.includes('coinbase')) return 'COINBASE';
  if (lower.includes('binance')) return 'BINANCE';
  if (lower.includes('kraken')) return 'KRAKEN';
  if (lower.includes('wealthsimple')) return 'WEALTHSIMPLE';
  if (lower.includes('questrade')) return 'QUESTRADE';
  if (lower.includes('webull') && (lower.includes('canada') || lower.includes(' ca')))
    return 'WEBULL_CA';
  if (lower.includes('webull')) return 'WEBULL_US';
  if (lower.includes('public.com') || /\bpublic\b/.test(lower)) return 'PUBLIC';
  if (lower.includes('tastytrade') || lower.includes('tasty trade')) return 'TASTYTRADE';
  if (lower.includes('tradestation')) return 'TRADESTATION';
  if (lower.includes('tradier')) return 'TRADIER';
  if (lower.includes('moomoo')) return 'MOOMOO';
  if (lower.includes('alpaca')) return 'ALPACA';
  if (lower.includes('trading 212') || lower.includes('trading212')) return 'TRADING212';
  if (lower.includes('voya')) return 'VOYA';
  if (lower.includes('principal')) return 'PRINCIPAL';
  if (lower.includes('tiaa')) return 'TIAA';
  if (lower.includes('sofi')) return 'SOFI';
  if (lower.includes('m1 ')) return 'M1';
  if (lower.includes('acorns')) return 'ACORNS';
  if (lower.includes('stake')) return 'STAKE_AU';

  return slugNorm || '';
}

/**
 * Default letter-mark fallback for institutions that don't match any
 * brand. Generates a deterministic color from the name so the same
 * institution always gets the same color (no flicker on re-render).
 */
function LetterMark({ name, size }) {
  const initial =
    String(name || '?')
      .trim()
      .charAt(0)
      .toUpperCase() || '?';
  // Hash the name to one of 8 muted brand-safe colors
  const palette = [
    '#3b5b8b',
    '#5b7a9a',
    '#4a6b54',
    '#8a6a3e',
    '#7a4e60',
    '#4f5d6f',
    '#6a5c8e',
    '#5e7868',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++)
    hash = (hash * 31 + (name || '').charCodeAt(i)) >>> 0;
  const color = palette[hash % palette.length];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="56" height="56" rx="10" fill={color} />
      <text
        x="28"
        y="38"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="#ffffff"
      >
        {initial}
      </text>
    </svg>
  );
}

/**
 * Inline SVG brand mark. Pass either the canonical key as `id` or a full
 * institution as `inst`. If both are present, `id` wins (legacy callers).
 */
export function BrandMark({ id, inst, size = 56, name }) {
  const key = id || resolveBrandKey(inst);
  const color = brandColor(key);
  const displayName = name || inst?.displayName || inst?.display_name || inst?.name || key;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 56 56',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  switch (key) {
    case 'COINBASE':
      return (
        <svg {...common}>
          <circle cx="28" cy="28" r="22" fill={color} />
          <rect x="22" y="22" width="12" height="12" rx="2" fill="#fff" />
        </svg>
      );

    case 'BINANCE':
      return (
        <svg {...common}>
          <g fill={color}>
            <rect x="24" y="8" width="8" height="8" transform="rotate(45 28 12)" />
            <rect x="8" y="24" width="8" height="8" transform="rotate(45 12 28)" />
            <rect x="40" y="24" width="8" height="8" transform="rotate(45 44 28)" />
            <rect x="24" y="40" width="8" height="8" transform="rotate(45 28 44)" />
            <rect x="24" y="24" width="8" height="8" transform="rotate(45 28 28)" />
          </g>
        </svg>
      );

    case 'KRAKEN':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M18 16 L18 40 M18 28 L34 16 M18 28 L34 40"
            stroke="#fff"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'SCHWAB':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <text
            x="28"
            y="38"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="28"
            fill="#fff"
          >
            cs
          </text>
        </svg>
      );

    case 'MERRILL':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          {/* Stylized bull silhouette */}
          <path
            d="M14 36 Q14 28 22 28 L22 24 Q22 20 26 20 L30 20 Q34 20 34 24 L34 28 Q42 28 42 36 L42 40 L36 40 L36 36 L32 36 L32 40 L24 40 L24 36 L20 36 L20 40 L14 40 Z M24 18 Q26 16 28 16 Q30 16 32 18 L30 20 L26 20 Z"
            fill="#fff"
          />
        </svg>
      );

    case 'IBKR':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path d="M16 14 L40 14 L28 30 Z" fill="#fff" />
          <circle cx="28" cy="38" r="5" fill="#fff" />
        </svg>
      );

    case 'US_BANK':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path d="M14 16 L42 16 L42 32 Q42 40 28 44 Q14 40 14 32 Z" fill="#C8102E" />
          <text
            x="28"
            y="32"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="14"
            fill="#fff"
          >
            us
          </text>
        </svg>
      );

    case 'VANGUARD':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M14 18 L28 42 L42 18"
            stroke="#fff"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'WEALTHFRONT':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M12 18 L20 38 L28 22 L36 38 L44 18"
            stroke="#fff"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'BETTERMENT':
      // Golden sunrise emblem: a near-full disc with a small upward notch cut
      // into the base. Mark only (transparent), matching Betterment's logo.
      return (
        <svg {...common}>
          <path d="M20.8 46 A21 21 0 1 1 35.2 46 L28 39 Z" fill={color} />
        </svg>
      );

    case 'EMPOWER':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M16 16 L40 16 L40 22 L22 22 L22 26 L36 26 L36 32 L22 32 L22 36 L40 36 L40 42 L16 42 Z"
            fill="#fff"
          />
        </svg>
      );

    case 'EMPOWER_FCU':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M16 16 L40 16 L40 22 L22 22 L22 26 L36 26 L36 32 L22 32 L22 36 L40 36 L40 42 L16 42 Z"
            fill="#fff"
          />
          <circle cx="44" cy="14" r="6" fill="#fff" />
          <text
            x="44"
            y="17"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="700"
            fontSize="8"
            fill={color}
          >
            FCU
          </text>
        </svg>
      );

    case 'FIDELITY':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path d="M14 22 L28 14 L42 22 L42 30 Q42 38 28 44 Q14 38 14 30 Z" fill="#fff" />
          <text
            x="28"
            y="34"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="16"
            fill={color}
          >
            F
          </text>
        </svg>
      );

    case 'ROBINHOOD':
      // Green feather angled bottom-left → top-right with a white shaft that
      // resolves into an upward arrow. Mark only (transparent).
      return (
        <svg {...common}>
          <path
            d="M15 47 C16 35 21 24 31 15 C36 11 45 7 47 12 C49 17 44 27 35 35 C26 43 19 47 15 47 Z"
            fill={color}
          />
          <path
            d="M20 43 L40 16 M40 16 L31 17 M40 16 L40 25"
            stroke="#fff"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'TD_AMERITRADE':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <text
            x="28"
            y="38"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="22"
            fill="#fff"
          >
            TD
          </text>
        </svg>
      );

    case 'ETORO':
      // Bull mark: a lowercase "e" flanked by two upward horns. Mark only
      // (transparent), matching eToro's green bull logo.
      return (
        <svg {...common}>
          <path d="M20 27 C13 21 9 14 8.5 7 C12 12 17 18 23.5 24 Z" fill={color} />
          <path d="M36 27 C43 21 47 14 47.5 7 C44 12 39 18 32.5 24 Z" fill={color} />
          <text
            x="28"
            y="45"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="40"
            fill={color}
          >
            e
          </text>
        </svg>
      );

    case 'SOFI':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <text
            x="28"
            y="38"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="20"
            fill="#fff"
          >
            SoFi
          </text>
        </svg>
      );

    case 'M1':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <text
            x="28"
            y="38"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="24"
            fill="#fff"
          >
            M1
          </text>
        </svg>
      );

    case 'ACORNS':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <ellipse cx="28" cy="32" rx="10" ry="13" fill="#fff" />
          <path d="M22 18 Q28 16 34 18 L34 22 Q28 20 22 22 Z" fill="#fff" />
        </svg>
      );

    case 'VOYA':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <text
            x="28"
            y="38"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="24"
            fill="#fff"
          >
            v
          </text>
        </svg>
      );

    case 'PRINCIPAL':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path d="M16 14 L28 14 L36 22 L36 28 L28 36 L16 36 Z" fill="#fff" />
          <rect x="16" y="36" width="6" height="8" fill="#fff" />
        </svg>
      );

    case 'TIAA':
      // Blue gradient square "frame" (transparent center via even-odd fill) with
      // a folded bottom-left corner — the TIAA icon. The "TIAA" wordmark itself
      // is shown by the tile's text label.
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="tiaaBlue" x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" stopColor="#55ACE0" />
              <stop offset="1" stopColor="#004A92" />
            </linearGradient>
          </defs>
          <path
            fillRule="evenodd"
            fill="url(#tiaaBlue)"
            d="M12 18 a6 6 0 0 1 6 -6 h20 a6 6 0 0 1 6 6 v20 a6 6 0 0 1 -6 6 h-20 a6 6 0 0 1 -6 -6 z M22 22 h12 v12 h-12 z"
          />
          <path d="M12 33 L19 40 L12 40 Z" fill="#00366B" />
        </svg>
      );

    case 'WEALTHSIMPLE':
      // Flat take on Wealthsimple's gold "W" coin: gradient disc, beaded rim,
      // inner ring, serif W. (The source is a 3D render; this is a vector
      // approximation that reads correctly at tile size on light or dark.)
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="wsGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#EACE72" />
              <stop offset="1" stopColor="#B07F33" />
            </linearGradient>
          </defs>
          <circle cx="28" cy="28" r="23" fill="url(#wsGold)" />
          <circle
            cx="28"
            cy="28"
            r="20"
            fill="none"
            stroke="#9a6f2c"
            strokeWidth="1"
            strokeDasharray="0.6 2.3"
          />
          <circle cx="28" cy="28" r="16.5" fill="none" stroke="#9a6f2c" strokeWidth="1" />
          <text
            x="28"
            y="36"
            textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontWeight="700"
            fontSize="20"
            fill="#8a5e22"
          >
            W
          </text>
        </svg>
      );

    case 'QUESTRADE':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M28 14 L40 36 L34 36 L28 26 L22 36 L16 36 Z M30 36 L38 44 L44 40"
            stroke="#fff"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'WEBULL_CA':
    case 'WEBULL_US':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M10 22 L18 38 L24 26 L30 38 L36 26 L42 38 L50 22"
            stroke="#fff"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'ETRADE':
    case 'ETRADE_PAPER':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M18 16 L38 16 M18 28 L34 28 M18 40 L38 40 M18 16 L18 40"
            stroke="#fff"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'PUBLIC':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <circle cx="28" cy="20" r="6" stroke="#fff" strokeWidth="3" fill="none" />
          <path
            d="M14 44 Q14 32 28 32 Q42 32 42 44"
            stroke="#fff"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'TASTYTRADE':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path d="M14 26 L28 14 L42 26 L42 42 L14 42 Z" fill="#fff" />
        </svg>
      );

    case 'TRADESTATION':
    case 'TRADESTATION_PAPER':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M14 30 L22 22 L30 32 L42 18"
            stroke="#fff"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'TRADIER':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M16 18 L28 30 L40 18 M16 38 L28 30 L40 38"
            stroke="#fff"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'MOOMOO':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <circle cx="20" cy="28" r="4" fill="#fff" />
          <circle cx="36" cy="28" r="4" fill="#fff" />
          <path
            d="M20 36 Q28 42 36 36"
            stroke="#fff"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'ALPACA':
    case 'ALPACA_PAPER':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M22 14 L24 18 L28 16 L32 18 L34 14 L36 22 L36 36 Q36 42 28 42 Q20 42 20 36 L20 22 Z"
            fill="#000"
          />
          <ellipse cx="24" cy="28" rx="1.5" ry="2" fill="#fff" />
          <ellipse cx="32" cy="28" rx="1.5" ry="2" fill="#fff" />
        </svg>
      );

    case 'TRADING212':
    case 'TRADING212_PRACTICE':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <text
            x="28"
            y="40"
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="800"
            fontSize="28"
            fill="#fff"
          >
            2
          </text>
        </svg>
      );

    case 'STAKE_AU':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M16 14 Q14 22 22 24 Q28 26 28 30 Q28 34 22 34 Q14 34 14 42 M40 14 L40 42"
            stroke="#fff"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return <LetterMark name={displayName} size={size} />;
  }
}

'use client';

/**
 * Inline SVG brand marks for each SnapTrade-supported brokerage. We render
 * these directly instead of loading PNG files so the modal never shows a
 * broken-image state and the marks scale crisply at any tile size.
 *
 * Each entry returns a React node. The accentColor is the brokerage's primary
 * brand color (used as a thin rail along the top of each tile).
 *
 * Logos are simplified single-color marks — recognizable brand cues without
 * pixel-perfect logo cloning. If a brokerage objects, swap to an empty mark
 * (their wordmark below covers identification).
 */

const COLORS = {
  WEALTHSIMPLE: '#2D5BFF',
  QUESTRADE: '#005DAA',
  WEBULL_CA: '#1E5BFF',
  WEBULL_US: '#1E5BFF',
  SCHWAB: '#00A0DF',
  ETRADE: '#6633CC',
  PUBLIC: '#000000',
  TASTYTRADE: '#00C805',
  TRADESTATION: '#00B050',
  TRADIER: '#13294B',
  MOOMOO: '#FF6F2C',
  ALPACA: '#FFD43B',
  ALPACA_PAPER: '#FFD43B',
  TRADESTATION_PAPER: '#00B050',
  TRADING212: '#00AA5B',
  TRADING212_PRACTICE: '#00AA5B',
  STAKE_AU: '#00C19F',
  KRAKEN: '#5741D9',
  COINBASE: '#0052FF',
  BINANCE: '#F0B90B',
};

export function brandColor(id) {
  return COLORS[id] || '#6b7280';
}

/** Tiny abstract mark, sized to fit a 56px square. The wordmark below it
 *  carries identification; this is the visual hook. */
export function BrandMark({ id, size = 56 }) {
  const color = brandColor(id);
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 56 56',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  switch (id) {
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

    case 'WEALTHSIMPLE':
      return (
        <svg {...common}>
          <path d="M6 32 Q14 16 28 28 T50 22 L50 38 Q42 50 28 38 T6 44 Z" fill={color} />
        </svg>
      );

    case 'QUESTRADE':
      return (
        <svg {...common}>
          <circle cx="28" cy="26" r="18" fill="none" stroke={color} strokeWidth="6" />
          <rect
            x="34"
            y="34"
            width="14"
            height="6"
            rx="2"
            transform="rotate(45 41 37)"
            fill={color}
          />
        </svg>
      );

    case 'WEBULL_CA':
    case 'WEBULL_US':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path d="M16 22 L22 16 L34 16 L40 22 L40 36 L34 42 L22 42 L16 36 Z" fill="#fff" />
          <circle cx="24" cy="28" r="2" fill={color} />
          <circle cx="32" cy="28" r="2" fill={color} />
        </svg>
      );

    case 'SCHWAB':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M38 18 Q28 14 22 20 Q18 26 28 28 Q38 30 34 36 Q28 42 18 38"
            stroke="#fff"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'ETRADE':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M18 16 L38 16 M18 28 L34 28 M18 40 L38 40 M18 16 L18 40"
            stroke="#fff"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'PUBLIC':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="28" fill={color} />
          <path
            d="M20 14 L20 42 M20 14 L32 14 Q40 14 40 22 Q40 30 32 30 L20 30"
            stroke="#fff"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'TASTYTRADE':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M14 18 L42 18 M28 18 L28 44"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'TRADESTATION':
    case 'TRADESTATION_PAPER':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M14 40 L22 32 L30 36 L42 18 M36 18 L42 18 L42 24"
            stroke="#fff"
            strokeWidth="3.5"
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
            d="M14 18 L42 18 M28 18 L28 42"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="28" cy="42" r="3" fill="#fff" />
        </svg>
      );

    case 'MOOMOO':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <ellipse cx="28" cy="34" rx="14" ry="10" fill="#fff" />
          <circle cx="22" cy="32" r="2" fill={color} />
          <circle cx="34" cy="32" r="2" fill={color} />
          <ellipse cx="28" cy="38" rx="3" ry="2" fill={color} />
        </svg>
      );

    case 'ALPACA':
    case 'ALPACA_PAPER':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M22 14 Q26 10 28 14 L28 22 L36 22 Q42 24 42 32 L42 42 L34 42 L34 32 L22 32 L22 42 L14 42 L14 28 Q14 22 22 22 Z"
            fill="#000"
          />
        </svg>
      );

    case 'TRADING212':
    case 'TRADING212_PRACTICE':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <text
            x="28"
            y="36"
            textAnchor="middle"
            fontSize="20"
            fontWeight="800"
            fill="#fff"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            212
          </text>
        </svg>
      );

    case 'STAKE_AU':
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <path
            d="M40 18 L24 18 Q18 18 18 24 Q18 28 24 28 L32 28 Q38 28 38 34 Q38 40 32 40 L16 40"
            stroke="#fff"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="10" fill={color} />
          <circle cx="28" cy="28" r="10" fill="#fff" />
        </svg>
      );
  }
}

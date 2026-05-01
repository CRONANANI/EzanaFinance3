'use client';

import React from 'react';
import './asset-icons.css';

/* ════════════════════════════════════════════════════════════════════════════
   Asset-icon library
   ────────────────────────────────────────────────────────────────────────────
   Each icon is a small React component returning a 24x24 inline SVG.
   Designed for 28x28 badge slots with 2px padding around the SVG.
   ════════════════════════════════════════════════════════════════════════════ */

const SIZE = 24;

function svgIdSafe(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

/* ─── COMMODITY ICONS ─── */

/** Stacked metallic bars used for Gold, Silver, Platinum, Palladium, Copper. */
function MetalBars({ tone = 'gold' }) {
  const uid = svgIdSafe(React.useId());
  const stops = {
    gold: ['#FBE38E', '#D4A853', '#A37516'],
    silver: ['#F0F0F0', '#C0C0C0', '#808080'],
    platinum: ['#E5E4E2', '#C9C8C6', '#9E9D9B'],
    palladium: ['#E8E5DA', '#CECDC1', '#A8A695'],
    copper: ['#E8B07F', '#B87333', '#7A4A21'],
  }[tone] || ['#FBE38E', '#D4A853', '#A37516'];

  const gid = `mb-${tone}-${uid}`;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg" width={SIZE} height={SIZE} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="50%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </linearGradient>
      </defs>
      <rect x="3" y="13" width="18" height="6" rx="1" fill={`url(#${gid})`} />
      <rect x="5" y="7" width="14" height="6" rx="1" fill={`url(#${gid})`} />
      <rect x="7" y="2" width="10" height="5" rx="1" fill={`url(#${gid})`} />
    </svg>
  );
}

/** Oil drum silhouette */
function OilDrum() {
  const gid = `oil-grad-${svgIdSafe(React.useId())}`;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg" width={SIZE} height={SIZE} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#0a0e13" />
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="3.5" rx="6.5" ry="1.5" fill="#374151" />
      <path
        d="M5.5,3.5 L5.5,20.5 Q5.5,22 12,22 Q18.5,22 18.5,20.5 L18.5,3.5 Q18.5,5 12,5 Q5.5,5 5.5,3.5 Z"
        fill={`url(#${gid})`}
      />
      <line x1="5.5" y1="9" x2="18.5" y2="9" stroke="#10b981" strokeWidth="0.8" opacity="0.5" />
      <line x1="5.5" y1="15" x2="18.5" y2="15" stroke="#10b981" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

/** Flame for natural gas */
function Flame() {
  const gid = `flame-grad-${svgIdSafe(React.useId())}`;
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg" width={SIZE} height={SIZE} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      <path
        d="M12,2 C13,5 16,7 16,11 C16,13 15,14 13,14 C13.5,12 12.5,11 12,9 C11.5,11 10,12 9,13 C8,14 7,16 7,18 C7,20.5 9,22 12,22 C15,22 17,20.5 17,18 C17,15 15,13 14,11 C13.5,9 13,7 12,2 Z"
        fill={`url(#${gid})`}
      />
    </svg>
  );
}

/** Wheat sheaf */
function Wheat() {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg" width={SIZE} height={SIZE} aria-hidden>
      <g stroke="#a16207" strokeWidth="1" fill="#eab308">
        <path d="M12,3 L12,21" stroke="#a16207" strokeWidth="1.2" fill="none" />
        {[5, 8, 11, 14, 17].map((y, i) => (
          <g key={i}>
            <ellipse cx="9.5" cy={y} rx="2" ry="1.2" transform={`rotate(-30 9.5 ${y})`} />
            <ellipse cx="14.5" cy={y} rx="2" ry="1.2" transform={`rotate(30 14.5 ${y})`} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Corn cob */
function Corn() {
  const rows = [6, 9, 12, 15, 18];
  const cols = [10, 12, 14];
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg" width={SIZE} height={SIZE} aria-hidden>
      <ellipse cx="12" cy="13" rx="4" ry="9" fill="#fbbf24" stroke="#92400e" strokeWidth="0.6" />
      <path d="M8,8 Q5,5 6,2 Q9,3 10,7 Z" fill="#84cc16" />
      <path d="M16,8 Q19,5 18,2 Q15,3 14,7 Z" fill="#84cc16" />
      {rows.flatMap((y) =>
        cols.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" fill="#92400e" opacity="0.5" />)
      )}
    </svg>
  );
}

/* ─── CRYPTO ICONS ─── */

function BitcoinIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#f7931a" />
      <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff" fontFamily="Arial, sans-serif">
        ₿
      </text>
    </svg>
  );
}

function EthereumIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#627eea" />
      <g fill="#fff">
        <path d="M12,4 L12,10.2 L17,12.5 Z" opacity="0.7" />
        <path d="M12,4 L7,12.5 L12,10.2 Z" opacity="1" />
        <path d="M12,16.6 L12,20 L17,13.5 Z" opacity="0.7" />
        <path d="M12,20 L12,16.6 L7,13.5 Z" opacity="1" />
        <path d="M12,15.6 L17,12.7 L12,10.4 Z" opacity="0.4" />
        <path d="M7,12.7 L12,15.6 L12,10.4 Z" opacity="0.7" />
      </g>
    </svg>
  );
}

function SolanaIcon() {
  const gid = `sol-grad-${svgIdSafe(React.useId())}`;
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9945ff" />
          <stop offset="100%" stopColor="#14f195" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#000" />
      <path d="M6,8 L17,8 L19,6 L8,6 Z" fill={`url(#${gid})`} />
      <path d="M6,12 L17,12 L19,10 L8,10 Z" fill={`url(#${gid})`} />
      <path d="M6,16 L17,16 L19,14 L8,14 Z" fill={`url(#${gid})`} />
    </svg>
  );
}

function BnbIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#f3ba2f" />
      <g fill="#fff">
        <path d="M12,7 L14.5,9.5 L12,12 L9.5,9.5 Z" />
        <path d="M9.5,12 L7,14.5 L9.5,17 L12,14.5 Z" />
        <path d="M12,12 L14.5,14.5 L17,12 L14.5,9.5 Z" />
        <path d="M12,17 L14.5,14.5 L12,12 L9.5,14.5 Z" />
      </g>
    </svg>
  );
}

function XrpIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#23292f" />
      <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff" fontFamily="Arial, sans-serif">
        XRP
      </text>
    </svg>
  );
}

function CardanoIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#0033ad" />
      <g fill="#fff">
        <circle cx="12" cy="12" r="2" />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r = 5;
          const rad = (deg * Math.PI) / 180;
          const x = 12 + r * Math.cos(rad);
          const y = 12 + r * Math.sin(rad);
          return <circle key={deg} cx={x} cy={y} r="1.4" />;
        })}
      </g>
    </svg>
  );
}

function PolkadotIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#e6007a" />
      <g fill="#fff">
        <ellipse cx="12" cy="6" rx="2" ry="1.3" />
        <ellipse cx="12" cy="18" rx="2" ry="1.3" />
        <ellipse cx="6.5" cy="9" rx="1.3" ry="2" transform="rotate(-30 6.5 9)" />
        <ellipse cx="17.5" cy="9" rx="1.3" ry="2" transform="rotate(30 17.5 9)" />
        <ellipse cx="6.5" cy="15" rx="1.3" ry="2" transform="rotate(30 6.5 15)" />
        <ellipse cx="17.5" cy="15" rx="1.3" ry="2" transform="rotate(-30 17.5 15)" />
      </g>
    </svg>
  );
}

function ChainlinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#2a5ada" />
      <path d="M12,5 L17,9 L17,15 L12,19 L7,15 L7,9 Z" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="5" r="1.4" fill="#fff" />
    </svg>
  );
}

/** Generic crypto fallback (coin with currency-bitcoin-like glyph) */
function GenericCryptoIcon({ ticker }) {
  const initial = ticker?.split('-')[0]?.charAt(0) || '?';
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#475569" />
      <text x="12" y="17" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff" fontFamily="Arial, sans-serif">
        {initial}
      </text>
    </svg>
  );
}

/* ─── STOCK ICONS ─── */

/** Stylized monogram: ticker first 1-2 chars on a colored tile. */
function StockMonogram({ ticker }) {
  const uid = svgIdSafe(React.useId());
  const t = (ticker || '').toUpperCase();
  const colorMap = {
    AAPL: ['#a8a29e', '#57534e'],
    MSFT: ['#0078d4', '#005a9e'],
    NVDA: ['#76b900', '#558700'],
    GOOGL: ['#4285f4', '#1a73e8'],
    AMZN: ['#ff9900', '#cc7a00'],
    META: ['#0866ff', '#0844cc'],
    TSLA: ['#cc0000', '#990000'],
    JPM: ['#0033a0', '#001f6b'],
    XOM: ['#1e3a8a', '#172554'],
    'BRK.B': ['#000000', '#1f2937'],
  };
  const [c1, c2] = colorMap[t] || ['#475569', '#1e293b'];
  const display = t.includes('.') ? t.split('.').slice(0, 2).join('').slice(0, 2) : t.slice(0, 2);
  const gid = `sm-${t}-${uid}`;

  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill={`url(#${gid})`} />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="9"
        fontWeight="900"
        fill="#fff"
        fontFamily="Arial, sans-serif"
        letterSpacing="-0.3"
      >
        {display}
      </text>
    </svg>
  );
}

/* ─── BOND ICONS ─── */

/** Treasury bond icon — horizontal bars representing duration */
function BondIcon({ ticker }) {
  const t = (ticker || '').toUpperCase();
  const config = {
    SHY: { bars: 1, color: '#10b981', name: 'Short' },
    IEF: { bars: 2, color: '#3b82f6', name: 'Med' },
    TLT: { bars: 3, color: '#a78bfa', name: 'Long' },
    AGG: { bars: 2, color: '#0ea5e9', name: 'Agg' },
    LQD: { bars: 2, color: '#06b6d4', name: 'IG' },
    HYG: { bars: 2, color: '#f59e0b', name: 'HY' },
    TIP: { bars: 2, color: '#84cc16', name: 'TIPS' },
    EMB: { bars: 2, color: '#ec4899', name: 'EM' },
  }[t] || { bars: 2, color: '#94a3b8', name: 'BD' };

  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <rect width="24" height="24" rx="5" fill="#1e293b" />
      <rect x="4" y="6" width="16" height="2" rx="1" fill={config.color} opacity={config.bars >= 1 ? 1 : 0.25} />
      <rect x="4" y="11" width="16" height="2" rx="1" fill={config.color} opacity={config.bars >= 2 ? 1 : 0.25} />
      <rect x="4" y="16" width="16" height="2" rx="1" fill={config.color} opacity={config.bars >= 3 ? 1 : 0.25} />
    </svg>
  );
}

/* ─── POLITICIAN ICON ─── */

function PoliticianIcon({ name, party }) {
  const uid = svgIdSafe(React.useId());
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const isDem = (party || '').toLowerCase() === 'democrat';
  const isRep = (party || '').toLowerCase() === 'republican';
  const c1 = isDem ? '#3b82f6' : isRep ? '#ef4444' : '#64748b';
  const c2 = isDem ? '#2563eb' : isRep ? '#dc2626' : '#475569';
  const gid = `pol-${initials}-${uid}`;

  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${gid})`} />
      <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff" fontFamily="Arial, sans-serif">
        {initials}
      </text>
    </svg>
  );
}

/* ─── INDEX FALLBACK ─── */

function IndexIcon() {
  return (
    <svg viewBox="0 0 24 24" width={SIZE} height={SIZE} aria-hidden>
      <rect width="24" height="24" rx="5" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.4)" strokeWidth="0.5" />
      <rect x="5" y="14" width="3" height="6" fill="#10b981" />
      <rect x="10" y="9" width="3" height="11" fill="#10b981" />
      <rect x="15" y="6" width="3" height="14" fill="#10b981" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   ICON RESOLVER
   ════════════════════════════════════════════════════════════════════════════ */

const COMMODITY_MAP = {
  'GC=F': () => <MetalBars tone="gold" />,
  'SI=F': () => <MetalBars tone="silver" />,
  'PL=F': () => <MetalBars tone="platinum" />,
  'PA=F': () => <MetalBars tone="palladium" />,
  'HG=F': () => <MetalBars tone="copper" />,
  'CL=F': () => <OilDrum />,
  'NG=F': () => <Flame />,
  'ZW=F': () => <Wheat />,
  'ZC=F': () => <Corn />,
};

const CRYPTO_MAP = {
  'BTC-USD': () => <BitcoinIcon />,
  'ETH-USD': () => <EthereumIcon />,
  'SOL-USD': () => <SolanaIcon />,
  'BNB-USD': () => <BnbIcon />,
  'XRP-USD': () => <XrpIcon />,
  'ADA-USD': () => <CardanoIcon />,
  'DOT-USD': () => <PolkadotIcon />,
  'LINK-USD': () => <ChainlinkIcon />,
};

/**
 * Resolve the right icon component for a given watchlist item.
 *
 * @param {{ type?: string; ticker?: string; quoteSymbol?: string; name?: string; party?: string }} item
 * @returns {React.ReactNode}
 */
export function getAssetIcon(item) {
  if (!item) return <IndexIcon />;
  const ticker = (item.ticker || item.quoteSymbol || '').trim();

  if (item.type === 'commodity') {
    const render = COMMODITY_MAP[ticker];
    return render ? render() : <MetalBars tone="gold" />;
  }

  if (item.type === 'crypto') {
    const render = CRYPTO_MAP[ticker];
    return render ? render() : <GenericCryptoIcon ticker={ticker} />;
  }

  if (item.type === 'stock') {
    return <StockMonogram ticker={ticker} />;
  }

  if (item.type === 'bond') {
    return <BondIcon ticker={ticker} />;
  }

  if (item.type === 'politician') {
    return <PoliticianIcon name={item.name} party={item.party} />;
  }

  if (item.type === 'institution') {
    return <IndexIcon />;
  }

  if (item.type === 'index') {
    return <IndexIcon />;
  }

  return <IndexIcon />;
}

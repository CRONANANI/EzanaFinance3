'use client';

/**
 * Inline SVG brand marks for the data-provider services we route brokerage
 * connections through. Used on the provider-choice step of the Add Portfolio
 * modal so users can visually distinguish SnapTrade vs Plaid at a glance.
 */

export function SnapTradeMark({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="56" height="56" rx="12" fill="#0F1830" />
      <path d="M34 14 L20 30 L28 30 L22 42 L36 26 L28 26 Z" fill="#FF6B2B" />
    </svg>
  );
}

export function PlaidMark({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="56" height="56" rx="12" fill="#000000" />
      <g fill="#FFFFFF">
        <rect x="14" y="14" width="10" height="10" rx="1.5" />
        <rect x="26" y="14" width="10" height="10" rx="1.5" />
        <rect x="14" y="26" width="10" height="10" rx="1.5" />
        <rect x="26" y="26" width="10" height="10" rx="1.5" />
        <rect x="32" y="32" width="10" height="10" rx="1.5" />
      </g>
    </svg>
  );
}

export function ProviderMark({ provider, size = 40 }) {
  if (provider === 'snaptrade') return <SnapTradeMark size={size} />;
  if (provider === 'plaid') return <PlaidMark size={size} />;
  return null;
}

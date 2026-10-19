'use client';

/**
 * Sign-up band for signed-out visitors. The return path keeps the filters.
 * Copy names only what a free account unlocks on this page today (the Edge
 * Board math and trader positions); the brief's watchlist and price-alert
 * line is held back until those features exist for prediction markets.
 */
import { useSearchParams } from 'next/navigation';

export function SignupBand({ className }) {
  const params = useSearchParams();
  const qs = params?.toString();
  const next = `/datasets/prediction-markets${qs ? `?${qs}` : ''}`;
  return (
    <section
      className={['pmk-signup', className].filter(Boolean).join(' ')}
      aria-labelledby="pmk-signup-title"
    >
      <div className="pmk-signup-copy">
        <p className="pmk-eyebrow pmk-accent">Free account</p>
        <h2 id="pmk-signup-title" className="pmk-signup-title">
          Open the math behind every price
        </h2>
        <p className="pmk-signup-line">
          See the implied price, reference, spread and liquidity behind every gap on the Edge Board,
          and the open positions of the top traders on Polymarket.
        </p>
      </div>
      <div className="pmk-signup-actions">
        <a
          className="pmk-btn"
          href={`/auth/continue?intent=signup&next=${encodeURIComponent(next)}`}
        >
          Sign up free
        </a>
        <a
          className="pmk-btn pmk-btn--ghost"
          href={`/auth/continue?next=${encodeURIComponent(next)}`}
        >
          Log in
        </a>
      </div>
    </section>
  );
}

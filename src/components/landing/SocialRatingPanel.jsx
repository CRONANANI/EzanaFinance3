/**
 * Social investing, the left panel of the record zone: the rating on a gauge,
 * the fastest ways up, and the tier ladder (design: rating-panel handoff, the
 * B + D hybrid).
 *
 * Presentational only. The section's clock owns the rating and the latest
 * delta and passes them in; the tier, progress, gauge range and "to go" are
 * all derived from the rating (social-rating.js), so nothing here can drift
 * from the number shown. The ways-up points come from the ledger fixture's own
 * events, so the panel and the ledger never disagree.
 *
 * Static by design: nothing is clickable and nothing has a hover state. The
 * gauge and progress fills ease when the rating ticks, and stop easing under
 * prefers-reduced-motion.
 */
import { deriveTierState, tierRowState, LADDER_TIERS } from './social-rating';

const MINUS = '−';

export default function SocialRatingPanel({ rating, delta, waysUp = [], tiers = LADDER_TIERS }) {
  const { sorted, current, next, pct, toGo, currentIndex } = deriveTierState(rating, tiers);
  const ladder = sorted.map((t, i) => ({ t, i })).reverse(); // highest first
  const neg = delta < 0;

  return (
    <div className="sled-rp">
      {/* left: gauge, then the fastest ways up */}
      <div className="sled-rp-left">
        <div className="sled-rp-gaugeblock">
          <div className="sled-rp-gauge">
            <svg
              width="200"
              height="112"
              viewBox="0 0 200 112"
              role="img"
              aria-label={`${pct}% of the way through ${current.name}`}
            >
              <path className="sled-rp-arc-track" d="M20 104 A80 80 0 0 1 180 104" />
              <path
                className="sled-rp-arc-fill"
                d="M20 104 A80 80 0 0 1 180 104"
                pathLength="100"
                strokeDasharray={`${pct} 100`}
              />
            </svg>
            <span className="sled-rp-figure" aria-label={`Rating ${rating}`}>
              {rating}
            </span>
          </div>
          <div className="sled-rp-range" aria-hidden="true">
            <span>{current.min}</span>
            <span>{next ? next.min : 'MAX'}</span>
          </div>
          <div className="sled-rp-meta">
            <span className={`sled-rp-delta${neg ? ' sled-rp-delta--neg' : ''}`}>
              {neg ? MINUS : '+'}
              {Math.abs(delta)} latest
            </span>
            <span className="sled-rp-eyebrow sled-rp-tiername">{current.name}</span>
          </div>
        </div>

        {waysUp.length ? (
          <div className="sled-rp-ways">
            <span className="sled-rp-eyebrow">Fastest ways up</span>
            <ul className="sled-rp-waylist">
              {waysUp.slice(0, 3).map((w) => (
                <li key={w.id} className="sled-rp-way">
                  <i className={`bi ${w.icon} sled-rp-wayicon`} aria-hidden="true" />
                  <span className="sled-rp-waylabel">{w.label}</span>
                  <span className="sled-rp-waypts">+{w.points}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* right: the tier ladder, highest first */}
      <div className="sled-rp-right">
        <div className="sled-rp-eyebrow sled-rp-ladderhead" aria-hidden="true">
          <span>Tier ladder</span>
          <span>From</span>
        </div>
        <ol className="sled-rp-ladder" aria-label="Tier ladder">
          {ladder.map(({ t, i }) => {
            const state = tierRowState(i, currentIndex);
            return (
              <li
                key={t.id}
                className={`sled-rp-tier sled-rp-tier--${state}`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className="sled-rp-tierrow">
                  <span className="sled-rp-dot" aria-hidden="true" />
                  <span className="sled-rp-tiername-l">{t.name}</span>
                  {state === 'current' ? <span className="sled-rp-tag">You</span> : null}
                  {state === 'next' ? <span className="sled-rp-tag">{toGo} to go</span> : null}
                  <span className="sled-rp-min">{t.min}</span>
                </span>
                {state === 'current' && next ? (
                  <span className="sled-rp-progress" aria-hidden="true">
                    <span className="sled-rp-progress-fill" style={{ width: `${pct}%` }} />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

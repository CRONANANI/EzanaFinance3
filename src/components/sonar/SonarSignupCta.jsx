'use client';

import { useAuth } from '@/components/AuthProvider';
import './sonar-signup-cta.css';

/**
 * Sign-up prompt on the Datasets results. Guests only: hidden while auth is
 * resolving (no flash for members) and for anyone signed in. The return path
 * brings the visitor back to the same search on /datasets.
 *
 * Oct 19: a compact one-row card, sticky at the bottom of the first screen
 * (layout lives in app/datasets/sonar/sonar.css), so the visitor sees it
 * without scrolling. Copy stays inside what a free account actually unlocks
 * (the guest gate in SonarSection: 5 free pings, then a free account keeps
 * pinging across every dataset and opens charts, filings and trackers).
 *
 * Oct 25: variant 'rail' is the same card as a tall, narrow column beside the
 * research brief (the results band places it, see SonarSection leftRail).
 * The default 'bar' stays as the sticky bottom bar, which /datasets now
 * shows only below the rail's breakpoint.
 */
export function SonarSignupCta({ query, variant = 'bar' }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading || isAuthenticated) return null;

  const q = String(query || '').trim();
  const next = `/datasets${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const signupHref = `/auth/continue?intent=signup&next=${encodeURIComponent(next)}`;
  const loginHref = `/auth/continue?next=${encodeURIComponent(next)}`;

  const rail = variant === 'rail';
  const titleId = rail ? 'ssc-rail-title' : 'ssc-title';

  return (
    <section className={`ssc${rail ? ' ssc--rail' : ''}`} aria-labelledby={titleId}>
      <div className="ssc-copy">
        <span className="ssc-kicker">Free Ezana account</span>
        <h2 id={titleId} className="ssc-title">
          {q ? (
            <>
              There is more on <span className="ssc-query">{q}</span> than one brief.
            </>
          ) : (
            'There is more behind this brief.'
          )}
        </h2>
        <p className="ssc-sub">
          This ping searched every Ezana dataset. A free account opens what sits behind each match.
        </p>
      </div>

      <ul className="ssc-list">
        <li className="ssc-item">
          <i className="bi bi-broadcast" aria-hidden="true" />
          <span>Keep pinging past the 5 guest pings</span>
        </li>
        <li className="ssc-item">
          <i className="bi bi-bar-chart-line" aria-hidden="true" />
          <span>Open the charts, filings and trackers behind each match</span>
        </li>
        <li className="ssc-item">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>Pick up your recent pings in Sonar</span>
        </li>
      </ul>

      <div className="ssc-actions">
        <div className="ssc-btns">
          <a className="ssc-btn ssc-btn--primary" href={signupHref}>
            Sign up free
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </a>
          <a className="ssc-btn ssc-btn--ghost" href={loginHref}>
            Log in
          </a>
        </div>
        <span className="ssc-note">Findings only, never financial advice.</span>
      </div>
    </section>
  );
}

export default SonarSignupCta;

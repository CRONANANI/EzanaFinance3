'use client';

import { useAuth } from '@/components/AuthProvider';
import './sonar-signup-cta.css';

/**
 * Sign-up prompt under the Datasets results band. Guests only: hidden while
 * auth is resolving (no flash for members) and for anyone signed in. The
 * return path brings the visitor back to the same search on /datasets.
 * Copy stays inside what a free account actually unlocks (see the guest gate
 * in SonarSection: 5 free pings, then a free account keeps pinging across
 * every dataset and opens charts, filings and trackers).
 */
export function SonarSignupCta({ query }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading || isAuthenticated) return null;

  const q = String(query || '').trim();
  const next = `/datasets${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const signupHref = `/auth/continue?intent=signup&next=${encodeURIComponent(next)}`;
  const loginHref = `/auth/continue?next=${encodeURIComponent(next)}`;

  return (
    <section className="ssc" aria-labelledby="ssc-title">
      <div className="ssc-copy">
        <span className="ssc-kicker">Free Ezana account</span>
        <h2 id="ssc-title" className="ssc-title">
          {q ? (
            <>
              There is more on <span className="ssc-query">{q}</span> than one brief.
            </>
          ) : (
            'There is more behind this brief.'
          )}
        </h2>
        <p className="ssc-sub">
          This ping searched every Ezana dataset. Create a free account to open the charts, filings
          and trackers behind each match, and keep pinging once your guest pings run out.
        </p>
      </div>

      <ul className="ssc-list">
        <li className="ssc-item">
          <i className="bi bi-broadcast" aria-hidden="true" />
          <span>Keep pinging across every Ezana dataset, past the 5 guest pings.</span>
        </li>
        <li className="ssc-item">
          <i className="bi bi-bar-chart-line" aria-hidden="true" />
          <span>Open the charts, filings and trackers each sourced match points to.</span>
        </li>
        <li className="ssc-item">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>Pick up where you left off with your recent pings in Sonar.</span>
        </li>
      </ul>

      <div className="ssc-actions">
        <a className="ssc-btn ssc-btn--primary" href={signupHref}>
          Sign up free
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </a>
        <a className="ssc-btn ssc-btn--ghost" href={loginHref}>
          Log in
        </a>
        <span className="ssc-note">Findings only, never financial advice.</span>
      </div>
    </section>
  );
}

export default SonarSignupCta;

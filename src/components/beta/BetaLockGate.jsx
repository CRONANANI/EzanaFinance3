'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  isBetaLockedRoute,
  getBetaLockedRouteDescription,
  hasBetaFullAccess,
} from '@/lib/beta-locked-routes';
import { useAuth } from '@/components/AuthProvider';
import './beta-lock-gate.css';

/**
 * Wraps dashboard children. When the current route is in BETA_LOCKED_ROUTES,
 * renders an overlay modal explaining that the feature is coming in v1.0.
 * Full-access allowlist users bypass the lock for testing v1.0 features.
 */
export function BetaLockGate({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const locked = isBetaLockedRoute(pathname);
  const fullAccess = hasBetaFullAccess(user);

  // Full-access users bypass the gate entirely
  if (!locked || fullAccess) {
    return children;
  }

  const description =
    getBetaLockedRouteDescription(pathname) ||
    'This feature is being polished and will be available with the v1.0 launch.';

  return (
    <>
      <div aria-hidden className="beta-lock-page-underlay">
        {children}
      </div>

      <div
        className="beta-lock-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-lock-title"
      >
        <div className="beta-lock-modal">
          <div className="beta-lock-badge">
            <i className="bi bi-lock-fill" aria-hidden />
            <span>Beta v0</span>
          </div>

          <h2 id="beta-lock-title" className="beta-lock-title">
            Coming Soon in <span className="beta-lock-version">v1.0</span>
          </h2>

          <p className="beta-lock-subtitle">{description}</p>

          <div className="beta-lock-meta">
            <p>
              You&apos;re currently using <strong>Ezana Finance Beta v0</strong>. We&apos;ve
              launched with our core features — portfolio tracking, community, learning, and our
              most-loved research tools. The remaining advanced features are being polished for our
              v1.0 release.
            </p>
          </div>

          <div className="beta-lock-actions">
            <button
              type="button"
              className="beta-lock-btn beta-lock-btn--primary"
              onClick={() => router.push('/home')}
            >
              <i className="bi bi-house-fill" aria-hidden /> Back to Home
            </button>
            <button
              type="button"
              className="beta-lock-btn beta-lock-btn--secondary"
              onClick={() => router.back()}
            >
              Go back
            </button>
          </div>

          <p className="beta-lock-footnote">
            Want early access? Reach out to the team via the support widget or email.
          </p>
        </div>
      </div>
    </>
  );
}

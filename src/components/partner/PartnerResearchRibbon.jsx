'use client';

import Link from 'next/link';

/**
 * Partner-only strip on research pages: quick links back to hub + content tools.
 */
export function PartnerResearchRibbon() {
  return (
    <div className="partner-research-ribbon" role="region" aria-label="Partner tools">
      <div className="partner-research-ribbon-inner">
        <span className="partner-research-ribbon-badge">
          <i className="bi bi-patch-check-fill" aria-hidden />
          Partner
        </span>
        <span className="partner-research-ribbon-text">
          Turn research into audience content — clip insights and publish from Content Studio.
        </span>
        <div className="partner-research-ribbon-actions">
          <Link href="/partner-dashboard" className="partner-research-ribbon-link">
            <i className="bi bi-speedometer2" aria-hidden />
            Partner dashboard
          </Link>
          <Link href="/partner-learning" className="partner-research-ribbon-link">
            <i className="bi bi-mortarboard" aria-hidden />
            Content Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

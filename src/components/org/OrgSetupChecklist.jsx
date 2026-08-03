'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';

/**
 * Org onboarding checklist — five real completion checks with deep links.
 * Renders only while the org is not fully set up (the parent gates on
 * `complete === false`). Manager-only steps show as status (not a CTA) for
 * analysts. `onComplete` lets the parent hide the card once everything's done.
 */
export function OrgSetupChecklist({ onComplete }) {
  const { orgRole } = useOrg();
  const canAct = orgRole === 'executive' || orgRole === 'portfolio_manager';
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/org/setup-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setData(d);
        if (d.complete && typeof onComplete === 'function') onComplete();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [onComplete]);

  if (!data || data.complete) return null;

  return (
    <section className="thw-card thw-setup" aria-label="Fund setup checklist">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <i className="bi bi-rocket-takeoff" aria-hidden="true" /> Get your fund set up
        </span>
        <span className="thw-setup-progress thw-mono">
          {data.done_count} of {data.steps.length} complete
        </span>
      </div>
      <div className="thw-card-body">
        <ul className="thw-setup-list">
          {data.steps.map((s) => {
            const actionable = !s.done && (!s.manager_only || canAct);
            return (
              <li key={s.key} className={`thw-setup-item ${s.done ? 'is-done' : ''}`}>
                <i
                  className={`bi ${s.done ? 'bi-check-circle-fill' : 'bi-circle'} thw-setup-icon`}
                  aria-hidden="true"
                />
                <span className="thw-setup-label">{s.label}</span>
                <span className="thw-setup-count thw-mono">{s.count}</span>
                {actionable ? (
                  <Link href={s.href} className="thw-setup-cta">
                    Set up <i className="bi bi-arrow-right" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="thw-setup-status">{s.done ? 'Done' : ''}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

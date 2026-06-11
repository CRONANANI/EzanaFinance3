'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './academic.css';

/** Compact strip for the Team Hub home: current cohort + role-appropriate counts. */
export function AcademicSummaryStrip() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cohRes, asgRes, vioRes] = await Promise.all([
          fetch('/api/org/cohorts', { cache: 'no-store' }),
          fetch('/api/org/assignments', { cache: 'no-store' }),
          fetch('/api/org/ips/violations', { cache: 'no-store' }),
        ]);
        if (!cohRes.ok) return;
        const coh = await cohRes.json().catch(() => ({}));
        const asg = asgRes.ok ? await asgRes.json().catch(() => ({})) : {};
        const vio = vioRes.ok ? await vioRes.json().catch(() => ({})) : {};
        if (cancelled) return;
        const current = (coh.cohorts || []).find((c) => c.is_current && !c.archived);
        const myOpen = (asg.assignments || []).filter((a) => a.mine && a.status !== 'graded').length;
        const openViolations = (vio.violations || []).length;
        setData({
          current,
          myOpen,
          openViolations,
          canResolve: !!vio.viewer?.canResolve,
        });
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  return (
    <div className="ac3-root" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem' }}>
      <Link href="/org-team-hub/cohorts" className="ac3-card" style={{ textDecoration: 'none', flex: '1 1 180px' }}>
        <div className="ac3-meta">Current cohort</div>
        <div className="ac3-strong" style={{ fontSize: '0.95rem' }}>
          {data.current ? data.current.name : 'None set'}
        </div>
      </Link>
      <Link href="/org-team-hub/assignments" className="ac3-card" style={{ textDecoration: 'none', flex: '1 1 180px' }}>
        <div className="ac3-meta">My open assignments</div>
        <div className="ac3-num ac3-strong" style={{ fontSize: '1.05rem' }}>
          {data.myOpen}
        </div>
      </Link>
      {data.canResolve && (
        <Link href="/org-team-hub/compliance" className="ac3-card" style={{ textDecoration: 'none', flex: '1 1 180px' }}>
          <div className="ac3-meta">Open IPS violations</div>
          <div
            className="ac3-num ac3-strong"
            style={{ fontSize: '1.05rem', color: data.openViolations ? 'var(--negative, #ef4444)' : undefined }}
          >
            {data.openViolations}
          </div>
        </Link>
      )}
    </div>
  );
}

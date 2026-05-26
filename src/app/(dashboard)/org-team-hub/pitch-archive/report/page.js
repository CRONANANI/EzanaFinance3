'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';

export default function PitchReportPage() {
  const { isOrgUser, isLoading } = useOrg();
  const [period, setPeriod] = useState('semester');
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (!isOrgUser) return;
    fetch(`/api/org/archive/report/${period}`)
      .then((r) => r.json())
      .then(setReport);
  }, [isOrgUser, period]);

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading…</div>;
  if (!isOrgUser) return <div style={{ padding: '2rem', color: '#888' }}>Org members only.</div>;

  const printReport = () => window.print();

  return (
    <div className="dashboard-page-inset th-page op-page op-report-page">
      <div className="op-no-print">
        <Link href="/org-team-hub/pitch-archive" className="op-back">
          <i className="bi bi-arrow-left" /> Archive
        </Link>
        <div className="op-hero">
          <h1>Council Pitch Report</h1>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="semester">This semester</option>
            <option value="year">This year</option>
            <option value="inception">Inception to date</option>
          </select>
          <button type="button" className="op-btn" onClick={printReport}>
            Export / Print PDF
          </button>
        </div>
      </div>

      {report && (
        <div className="op-report-body">
          <h2>
            {report.period} report · {new Date(report.generated_at).toLocaleDateString()}
          </h2>
          <p>
            Decided in period: {report.summary?.decided_in_period} · Accepted:{' '}
            {report.summary?.accepted} · Rejected: {report.summary?.rejected}
          </p>
          <p>
            Hit rate (accepted alpha &gt; 0): {report.analytics?.hit_rate_pct}% · Miss rate
            (rejected would-have-won): {report.analytics?.miss_rate_pct}%
          </p>
          <h3>Pitches</h3>
          <ul>
            {report.pitches?.map((p) => (
              <li key={p.id}>
                {p.ticker} — {p.decision} — {p.analyst_name} — {p.thesis_short?.slice(0, 60)}…
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

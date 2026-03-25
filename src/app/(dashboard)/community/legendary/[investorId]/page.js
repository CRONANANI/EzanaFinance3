'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LEGENDARY_INVESTORS } from '@/config/legendaryInvestors';
import '../../../home-dashboard/home-dashboard.css';
import '../../community.css';

export default function LegendaryInvestorPage() {
  const { investorId } = useParams();
  const inv = LEGENDARY_INVESTORS[investorId];

  if (!inv) {
    return (
      <div className="dashboard-page-inset db-page" style={{ paddingTop: '1rem' }}>
        <Link href="/community" className="comm-card-link">
          <i className="bi bi-arrow-left" /> Back to Community
        </Link>
        <p style={{ color: '#f87171', marginTop: '1rem' }}>Investor profile not found.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset db-page" style={{ paddingBottom: '2rem' }}>
      <Link href="/community" className="comm-card-link" style={{ marginBottom: '1.25rem' }}>
        <i className="bi bi-arrow-left" /> Back to Community
      </Link>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
            {inv.style}
          </p>
          <h1 className="db-greeting" style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>
            {inv.name}
          </h1>
          <p style={{ color: '#8b949e', fontSize: '0.8125rem', margin: '0 0 0.75rem' }}>{inv.title}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem' }}>
            <span style={{ color: '#f0f6fc' }}>
              Net worth: <strong>{inv.netWorth}</strong>
            </span>
            <span style={{ color: '#6b7280' }}>
              Career: <strong style={{ color: '#e2e8f0' }}>{inv.careerYears}</strong>
            </span>
            <span style={{ color: '#6b7280' }}>
              Annual return (indicative): <strong style={{ color: '#10b981' }}>{inv.annualReturn}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>Strategy</h3>
        </div>
        <p style={{ padding: '0 1.25rem 1.25rem', color: '#e2e8f0', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
          {inv.description}
        </p>
        <p style={{ padding: '0 1.25rem 1.25rem', color: '#8b949e', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
          {inv.strategy}
        </p>
      </div>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>Famous trades</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {inv.famousTrades.map((t, i) => (
            <div
              key={i}
              style={{
                padding: '0.65rem 0',
                borderBottom: i < inv.famousTrades.length - 1 ? '1px solid rgba(16, 185, 129, 0.05)' : 'none',
              }}
            >
              <span style={{ color: '#f0f6fc', fontWeight: 700, fontSize: '0.8125rem' }}>{t.company}</span>
              <span style={{ color: '#6b7280', fontSize: '0.5625rem', marginLeft: '0.5rem' }}>{t.year}</span>
              <p style={{ color: '#8b949e', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{t.result}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>Top holdings / themes</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {inv.topHoldings.map((tk) => (
            <Link
              key={tk}
              href={`/company-research?ticker=${tk}`}
              style={{
                textDecoration: 'none',
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '0.3rem 0.7rem',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.12)',
                color: '#f0f6fc',
              }}
            >
              {tk}
            </Link>
          ))}
        </div>
      </div>

      <div className="db-card">
        <div className="db-card-header">
          <h3>Key quotes</h3>
        </div>
        <ul style={{ padding: '0 1.25rem 1.25rem 2rem', margin: 0, color: '#e2e8f0', fontSize: '0.8125rem', lineHeight: 1.55 }}>
          {inv.keyQuotes.map((q, i) => (
            <li key={i} style={{ marginBottom: '0.5rem' }}>
              {q}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

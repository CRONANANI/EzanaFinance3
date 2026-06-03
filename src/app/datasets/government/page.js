'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Megaphone, Lightbulb } from 'lucide-react';

const DATASETS = [
  {
    icon: FileText,
    title: 'Contracts',
    desc: 'Federal contract awards by agency and recipient — amounts, award dates, and contracting context.',
    source: 'Public federal procurement and contract award datasets.',
    metric: '5,000+ awards / yr',
  },
  {
    icon: Megaphone,
    title: 'Lobbying',
    desc: 'Disclosed lobbying spend by organization and issue area, tied to registrants and clients.',
    source: 'Public lobbying disclosure filings (LD-1 / LD-2 and related registers).',
    metric: '$3.7B+ tracked',
  },
  {
    icon: Lightbulb,
    title: 'Patents',
    desc: 'Patent filings and grants by assignee, linked to public companies where possible.',
    source: 'Public patent office publication and grant data.',
    metric: '100K+ filings',
  },
];

export default function GovernmentDatasetPage() {
  return (
    <>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Datasets</p>
        <h1 className="mkt-h1">Government &amp; market intelligence data</h1>
        <p className="mkt-lead">
          The data institutions act on — federal contract awards, lobbying spend, and patent filings
          — connected to tickers.
        </p>
      </div>

      <div className="mkt-grid-3">
        {DATASETS.map((ds) => {
          const Icon = ds.icon;
          return (
            <article key={ds.title} className="mkt-card">
              <div className="mkt-card-header">
                <Icon size={20} aria-hidden />
                {ds.title}
              </div>
              <p>{ds.desc}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <strong>How we source it:</strong> {ds.source}
              </p>
              <p className="mkt-mono-metric">{ds.metric}</p>
            </article>
          );
        })}
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="mkt-section-title">How we source it</h2>
        <div className="mkt-card">
          <p>
            Aggregated from public government datasets, normalized, entity-resolved to companies,
            and connected to tickers so signals surface in Ezana before they reach mainstream
            coverage.
          </p>
        </div>
      </section>

      <div className="mkt-cta-block">
        <Link href="/auth/login" className="mkt-cta-btn">
          Explore in the app
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </>
  );
}

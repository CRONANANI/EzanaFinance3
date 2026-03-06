'use client';

import DatabaseWithRestApi from '@/components/ui/database-with-rest-api';

export function ResourcesSection() {
  return (
    <section className="resources-section" id="resources">
      <div className="resources-container">
        <div className="resources-header">
          <h2>Data Sources & Resources</h2>
          <p>
            Institutional-grade market intelligence powered by verified data feeds.
            Congressional trades, hedge fund 13F filings, legendary investor portfolios,
            and advanced analytics—all aggregated through our secure REST API.
          </p>
        </div>
        <div className="flex justify-center p-4 w-full max-w-[640px] mx-auto">
          <DatabaseWithRestApi
            badgeTexts={{
              first: 'Congress',
              second: '13F',
              third: 'Institutional portfolios',
              fourth: 'Alternative analytics',
            }}
            buttonTexts={{
              first: 'Alpha Vantage',
              second: 'SEC EDGAR',
            }}
            title="Institutional-grade data from verified sources"
            circleText="Ezana"
            lightColor="#10b981"
          />
        </div>
      </div>
    </section>
  );
}

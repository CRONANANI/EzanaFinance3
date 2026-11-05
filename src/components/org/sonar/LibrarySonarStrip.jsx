'use client';

/**
 * LibrarySonarStrip: the Research Library's link to the fund's Sonar research
 * reports. Reports are their own objects (versioned snapshots of research
 * runs), so the library shows the latest ones here and files them in
 * collections from the report page; they are never copied into notes.
 */
import Link from 'next/link';
import SonarReportsList from './SonarReportsList';
import './org-sonar.css';

export default function LibrarySonarStrip() {
  return (
    <section className="osr-strip" aria-label="Sonar research reports">
      <div className="osr-pitch-head">
        <p className="osr-h3">
          <i className="bi bi-broadcast" aria-hidden="true" /> Sonar research reports
        </p>
        <Link className="osr-link" href="/org-team-hub/sonar">
          All reports <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
      <SonarReportsList compact limit={4} />
    </section>
  );
}

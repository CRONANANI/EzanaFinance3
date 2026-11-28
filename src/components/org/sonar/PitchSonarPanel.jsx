'use client';

/**
 * PitchSonarPanel: the Sonar research reports attached to a pitch (Supporting
 * data tab). The approved ones are what an investment committee should read;
 * every report links to its full, versioned view.
 */
import Link from 'next/link';
import SonarReportsList from './SonarReportsList';
import { useSonarPageContext } from '@/components/sonar/companion/SonarCompanionContext';
import './org-sonar.css';

export default function PitchSonarPanel({ pitchId }) {
  /* Nov 28: tell Sonar Companion which pitch is open (a hint; the server checks it again). */
  useSonarPageContext(pitchId ? { pageType: 'org_pitch', objectId: pitchId } : null);
  if (!pitchId) return null;
  return (
    <section className="osr-pitch" aria-label="Sonar research">
      <div className="osr-pitch-head">
        <p className="osr-h3">
          <i className="bi bi-broadcast" aria-hidden="true" /> Sonar research
        </p>
        <Link
          className="osr-link"
          href={`/org-team-hub/sonar?tab=research&pitch=${encodeURIComponent(pitchId)}`}
        >
          Run research <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
      <SonarReportsList pitchId={pitchId} compact />
    </section>
  );
}

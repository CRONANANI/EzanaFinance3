import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/meetings/meetings.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Meetings, in the page's final layout: the figures,
 * then the filters, the meeting and the side column. It renders inside the
 * shared Team Hub shell, whose sidebar stays painted beside it.
 * Presentation only: no data, no org context, no import of the page.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function MeetingsLoading() {
  return (
    <SkeletonRegion
      label="Loading meetings"
      className="dashboard-page-inset ez-canvas tcc-page omt-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip omt-kpistrip">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(72, 10)}
                {bar(48, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="omt-body">
        <div className="omt-rail">
          <div className="omt-skel">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i}>{bar(`${90 - i * 6}%`, 12)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule omt-vrule omt-vrule--rail" aria-hidden="true" />
        <div className="omt-main">
          <div className="omt-skel">
            {bar('100%', 32)}
            {bar('55%', 22)}
            {bar('35%', 12)}
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{bar('100%', 14)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule omt-vrule omt-vrule--side" aria-hidden="true" />
        <div className="omt-side">
          <div className="omt-skel">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{bar(`${92 - i * 9}%`, 12)}</span>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

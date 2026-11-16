import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/pitches/pitch-pipeline.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for the Pitch Pipeline, in the page's final layout:
 * the four figures, the stage strip, then the two tables beside the side
 * column. It renders inside the shared Team Hub shell, whose sidebar stays
 * painted beside it. Presentation only: no data, no org context.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function PitchesLoading() {
  return (
    <SkeletonRegion
      label="Loading the pitch pipeline"
      className="dashboard-page-inset ez-canvas tcc-page opp-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpistrip">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tcc-kpi">
              <span className="tcc-kpi__icon">{bar(20, 20)}</span>
              {bar(72, 10)}
              {bar(48, 16)}
            </div>
          ))}
        </div>
      </div>
      <div className="opp-stages">{bar('70%', 14)}</div>
      <div className="opp-body">
        <div className="opp-main">
          <div className="tcc-head">{bar(140, 18)}</div>
          <div className="opp-skel">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i}>{bar('100%', 16)}</span>
            ))}
          </div>
          <div className="tcc-head opp-gap">{bar(170, 18)}</div>
          <div className="opp-skel">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i}>{bar('100%', 16)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule" aria-hidden="true" />
        <div className="opp-side">
          <div className="tcc-head">{bar(100, 18)}</div>
          <div className="opp-skel">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{bar(`${92 - i * 9}%`, 12)}</span>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

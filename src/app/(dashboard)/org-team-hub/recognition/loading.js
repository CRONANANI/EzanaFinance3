import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/recognition/recognition.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Recognition, in the page's final layout: the
 * figures, then awards and rankings, the scorecard and the side column. It
 * renders inside the shared Team Hub shell, whose sidebar stays painted
 * beside it. Presentation only: no data, no org context, no page import.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);
const rows = (n, widths) => (
  <div className="orc-skelrows">
    {Array.from({ length: n }).map((_, i) => (
      <span key={i}>{bar(widths ? widths(i) : '100%', 12)}</span>
    ))}
  </div>
);

export default function RecognitionLoading() {
  return (
    <SkeletonRegion
      label="Loading recognition"
      className="dashboard-page-inset ez-canvas tcc-page orc-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip orc-kpistrip">
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
      <div className="orc-body">
        <div className="orc-left">
          <div className="orc-sec">
            {bar(160, 18)}
            {rows(6)}
          </div>
          <div className="orc-sec">
            {bar(110, 18)}
            {rows(5)}
          </div>
        </div>
        <span className="tcc-vrule orc-vrule orc-vrule--left" aria-hidden="true" />
        <div className="orc-main">
          <div className="orc-card">
            <div className="orc-hero">
              {bar(220, 40)}
              {bar(110, 36)}
            </div>
            {bar('100%', 200)}
            {rows(6)}
          </div>
        </div>
        <span className="tcc-vrule orc-vrule orc-vrule--side" aria-hidden="true" />
        <div className="orc-side">
          <div className="orc-sec">
            {bar(150, 18)}
            {rows(5, (i) => `${92 - i * 9}%`)}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

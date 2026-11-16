import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/grades/grades.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Grades, in the page's final layout: the figures,
 * then the filters, the grade book and the member record. It renders inside
 * the shared Team Hub shell, whose sidebar stays painted beside it.
 * Presentation only: no data, no org context, no import of the page.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function GradesLoading() {
  return (
    <SkeletonRegion
      label="Loading grades"
      className="dashboard-page-inset ez-canvas tcc-page ogr-page"
    >
      <div className="tcc-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip ogr-kpistrip">
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
      <div className="ogr-body">
        <div className="ogr-rail">
          <div className="ogr-skel">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i}>{bar(`${90 - (i % 4) * 8}%`, 12)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule ogr-vrule ogr-vrule--rail" aria-hidden="true" />
        <div className="ogr-main">
          <div className="ogr-skel">
            {bar('40%', 22)}
            {bar('60%', 12)}
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i}>{bar('100%', 14)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule ogr-vrule ogr-vrule--side" aria-hidden="true" />
        <div className="ogr-side">
          <div className="ogr-skel">
            {bar('70%', 24)}
            {bar('50%', 12)}
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i}>{bar(`${92 - i * 7}%`, 12)}</span>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

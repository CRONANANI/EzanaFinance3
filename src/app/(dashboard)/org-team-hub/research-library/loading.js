import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/research-library/research-library.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for the Research Library, in the page's final layout:
 * the five figures, the view tabs, the search and filter lines, then the
 * lists beside the side column. It renders inside the shared Team Hub shell,
 * whose sidebar stays painted beside it. Presentation only: no data, no org
 * context, no import of the page.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function ResearchLibraryLoading() {
  return (
    <SkeletonRegion
      label="Loading the Research Library"
      className="dashboard-page-inset ez-canvas tcc-page orl-page"
    >
      <div className="tcc-top orl-top">
        <div className="tcc-kpis">
          <div className="tcc-kpistrip orl-kpis">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="tcc-kpi">
                <span className="tcc-kpi__icon">{bar(20, 20)}</span>
                {bar(72, 10)}
                {bar(40, 16)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="orl-tabsrow">{bar(220, 14)}</div>
      <div className="orl-search">{bar('40%', 14)}</div>
      <div className="orl-filters">{bar('60%', 12)}</div>
      <div className="orl-body">
        <div className="orl-main">
          <div className="tcc-head">{bar(140, 18)}</div>
          <div className="orl-skelcol">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i}>{bar('100%', 16)}</span>
            ))}
          </div>
        </div>
        <span className="tcc-vrule orl-vrule" aria-hidden="true" />
        <div className="orl-side">
          <div className="tcc-head">{bar(180, 18)}</div>
          <div className="orl-skelcol">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i}>{bar(`${92 - i * 9}%`, 12)}</span>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}

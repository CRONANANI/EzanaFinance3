import { SkeletonRegion } from '@/components/ds';
import '@/components/org/command-center/command-center.css';
import '@/components/org/cohorts/cohorts.css';
import '@/styles/home-canvas.css';

/**
 * Route loading state for Cohorts, in the page's final layout: the cohort
 * row, the figures, the tabs, then the roster table beside the selected
 * member. It renders inside the shared Team Hub shell, whose sidebar stays
 * painted beside it. Presentation only: no data, no org context.
 */
const bar = (w, h = 12) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function CohortsLoading() {
  return (
    <SkeletonRegion
      label="Loading cohorts"
      className="dashboard-page-inset ez-canvas tcc-page coh-page"
    >
      <div className="coh-control">
        <div className="coh-control__left">{bar(220, 16)}</div>
        <div className="coh-control__right">{bar(130, 34)}</div>
      </div>
      <div className="coh-kpis coh-kpis--top">
        <div className="tcc-kpistrip coh-kpistrip--5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="tcc-kpi">
              <span className="tcc-kpi__icon">{bar(20, 20)}</span>
              {bar(72, 10)}
              {bar(48, 16)}
            </div>
          ))}
        </div>
      </div>
      <div className="coh-tabsrow">
        <div className="coh-tabs">
          {[64, 96, 92, 60].map((w, i) => (
            <span key={i}>{bar(w, 16)}</span>
          ))}
        </div>
      </div>
      <section className="coh-section">
        <div className="coh-head">{bar(260, 22)}</div>
        <div className="coh-split">
          <div className="coh-split__main">
            <div className="coh-skel">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="coh-skel__row"
                  style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
                >
                  {Array.from({ length: 7 }).map((__, c) => (
                    <span key={c}>
                      {bar(`${i === 0 ? 50 : 60 + ((i * 7 + c * 13) % 35)}%`, i === 0 ? 9 : 12)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="coh-vrule" aria-hidden="true" />
          <div className="coh-split__side">
            <div className="coh-skel">
              {bar('60%', 18)}
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i}>{bar(`${92 - i * 7}%`, 12)}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SkeletonRegion>
  );
}

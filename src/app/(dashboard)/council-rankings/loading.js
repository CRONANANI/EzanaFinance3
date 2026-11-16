import '@/components/org/command-center/command-center.css';
import '@/styles/home-canvas.css';
import './council-rankings.css';

/**
 * Route loading UI for Council Rankings, in the page's final layout: the
 * actions line, the KPI strip, the note and the table. No fetch.
 */
const bar = (w, h) => (
  <span className="tcc-skel" style={{ width: w, height: h }} aria-hidden="true" />
);

export default function CouncilRankingsLoading() {
  return (
    <div
      className="dashboard-page-inset ez-canvas tcc-page crx-page"
      aria-busy="true"
      aria-label="Loading council rankings"
    >
      <div className="crx-container">
        <div className="crx-actions">
          <div className="crx-actions__context">{bar(120, 12)}</div>
          <div className="crx-actions__links">{bar(220, 14)}</div>
        </div>
        <div className="crx-kpis">
          <div className="tcc-kpistrip crx-kpistrip" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="tcc-kpi crx-kpi">
                <span className="tcc-kpi__icon" />
                <span className="tcc-kpi__label">{bar(80, 10)}</span>
                <span className="tcc-kpi__value">{bar(48, 16)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="crx-method">{bar('60%', 12)}</p>
        <div className="crx-toolbar">{bar(220, 14)}</div>
        <div className="crx-skel" aria-hidden="true">
          {bar('100%', 12)}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i}>{bar(`${100 - (i % 3) * 5}%`, 16)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

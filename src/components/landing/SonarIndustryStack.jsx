'use client';

/**
 * The industry ping's right-hand stack in the landing band: the value chain
 * as a compact list in the price chart's slot, and the news slot (or the
 * dossier's Echo matches, at most two, "From Ezana Echo"). Same .snr-fund /
 * .snr-news shells as the company and country stacks.
 */
import './sonar-understood.css';

export function IndustryStack({ dossier, newsSlot = null }) {
  const stages = dossier?.registry?.stages || [];
  const companies = dossier?.registry?.companies || [];
  const echo = (dossier?.echo || []).slice(0, 2);
  if (!stages.length && !newsSlot && !echo.length) return null;
  return (
    <div className="snr-stack">
      {stages.length ? (
        <div className="snr-fund snr-fund--wide">
          <div className="snr-card-head">
            <span className="snr-panel-title">Value chain</span>
            <span className="snr-rule-soft" aria-hidden="true" />
          </div>
          <ol className="snr-ind-chain">
            {stages.map((s) => {
              const here = companies.filter((c) => c.stage_id === s.id);
              return (
                <li
                  key={s.id}
                  className={`snr-ind-stage${s.is_upstream_input ? ' is-upstream' : ''}`}
                >
                  <span>
                    {s.label}
                    {s.is_upstream_input ? ' (upstream input)' : ''}
                  </span>
                  <span className="snr-ind-n">{here.length}</span>
                  {here.length ? (
                    <span className="snr-ind-names">
                      {here
                        .slice(0, 5)
                        .map((c) => c.ticker || c.company_name)
                        .join(' · ')}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
      {newsSlot ? (
        newsSlot
      ) : echo.length ? (
        <div className="snr-news">
          <div className="snr-card-head">
            <span className="snr-panel-title">From Ezana Echo</span>
            <span className="snr-rule-soft" aria-hidden="true" />
          </div>
          <div className="snr-news-list">
            {echo.map((e) => (
              <a key={e.slug} className="snr-news-item" href={`/ezana-echo/${e.slug}`}>
                <span className="snr-news-title">{e.title}</span>
                <span className="snr-news-meta">Ezana Echo</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default IndustryStack;

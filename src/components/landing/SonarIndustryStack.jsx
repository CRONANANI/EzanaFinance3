'use client';

/**
 * The industry ping's right-hand stack in the landing band (Nov 2026: "the
 * industry at a glance"). What a visitor needs from the Industry Layout sits
 * here, on the first screen, so nothing important waits below the fold:
 *
 *   - for a country ping, which registry companies are actually based there
 *     ("Headquartered in Taiwan: 1 of 19"), since the registry maps the
 *     whole global chain and is not the country's industry by itself;
 *   - the chain, stage by stage, with the counts and the leading names (the
 *     pinged country's companies first and marked);
 *   - a link to the full layout below. Choosing a stage opens the layout
 *     filtered to that stage (an `ezana:industry-filter` event the layout
 *     listens for).
 *
 * Then the news slot (or the dossier's Echo matches, at most two). Same
 * .snr-fund / .snr-news shells as the company and country stacks.
 */
import { chainLayout, geoScope, orderForGeo } from '@/lib/sonar/industry-layout-model';
import './sonar-understood.css';

/** Ask the Industry Layout below to filter and come into view. */
export function openIndustryLayout(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('ezana:industry-filter', { detail }));
}

export function IndustryStack({ dossier, newsSlot = null, topSlot = null }) {
  const registry = dossier?.registry || null;
  const stages = registry?.stages || [];
  const companies = registry?.companies || [];
  const echo = (dossier?.echo || []).slice(0, 2);
  if (!stages.length && !newsSlot && !echo.length && !topSlot) return null;

  const scope = geoScope(registry, dossier?.geo);
  const homeCode = scope?.code || null;
  const isHome = (c) => homeCode && String(c.hq_country || '').toUpperCase() === homeCode;
  const { upstream, flow } = chainLayout(stages, companies);
  const ordered = [...flow, ...upstream];
  const stageLabel = (id) => stages.find((s) => s.id === id)?.label || '';

  return (
    <div className="snr-stack">
      {topSlot}
      {stages.length ? (
        <div className="snr-fund snr-fund--wide snr-ind-glance">
          <div className="snr-card-head">
            <span className="snr-panel-title">Value chain</span>
            <span className="snr-rule-soft" aria-hidden="true" />
            <span className="snr-ind-total">
              <span className="snr-ind-n">{companies.length}</span> companies
            </span>
          </div>

          {scope ? (
            <div className="snr-ind-scope">
              <button
                type="button"
                className="snr-ind-scope-head"
                onClick={() => openIndustryLayout({ hq: scope.code })}
                disabled={!scope.here.length}
              >
                <span>Headquartered in {scope.label}</span>
                <span className="snr-ind-n">
                  {scope.here.length} of {scope.total}
                </span>
              </button>
              {scope.here.length ? (
                <ul className="snr-ind-home">
                  {scope.here.slice(0, 4).map((c) => (
                    <li key={`${c.stage_id}:${c.ticker || c.company_name}`}>
                      <span className="snr-ind-home-name">
                        {c.company_name}
                        {c.ticker ? <span className="snr-ind-tick"> {c.ticker}</span> : null}
                      </span>
                      <span className="snr-ind-home-stage">{stageLabel(c.stage_id)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="snr-ind-note">
                  None of the registry&rsquo;s listed companies is based here yet. The chain below
                  is the global one.
                </p>
              )}
            </div>
          ) : null}

          <ol className="snr-ind-chain">
            {ordered.map((s) => {
              const here = orderForGeo(
                companies.filter((c) => c.stage_id === s.id),
                homeCode,
              );
              return (
                <li
                  key={s.id}
                  className={`snr-ind-stage${s.is_upstream_input ? ' is-upstream' : ''}`}
                >
                  <button
                    type="button"
                    className="snr-ind-stage-btn"
                    onClick={() => openIndustryLayout({ stage: s.id })}
                    aria-label={`${s.label}: ${here.length} ${
                      here.length === 1 ? 'company' : 'companies'
                    }. Open in the full layout`}
                  >
                    <span>
                      {s.label}
                      {s.is_upstream_input ? ' (upstream input)' : ''}
                    </span>
                    <span className="snr-ind-n">{here.length}</span>
                    {here.length ? (
                      <span className="snr-ind-names">
                        {here.slice(0, 5).map((c, i) => (
                          <span key={c.ticker || c.company_name}>
                            {i ? ' · ' : ''}
                            <span className={isHome(c) ? 'is-home' : undefined}>
                              {c.ticker || c.company_name}
                            </span>
                          </span>
                        ))}
                        {here.length > 5 ? ` +${here.length - 5}` : ''}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>

          <button type="button" className="snr-ind-more" onClick={() => openIndustryLayout({})}>
            See the full industry layout
            <i className="bi bi-arrow-down" aria-hidden="true" />
          </button>
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

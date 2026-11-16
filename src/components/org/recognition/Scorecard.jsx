'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { stripDemoLabel } from '@/lib/org-display';
import {
  NA,
  PERIODS,
  WEIGHT_ROLE_LABELS,
  badgeOf,
  categoryLabel,
  fmtDate,
  fmtInt,
  historyWindow,
  initials,
  signed,
  signedPct,
} from '@/lib/org-recognition-model';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import { CalibrationChart, HistoryChart } from './Charts';

const HISTORY_PERIODS = [...PERIODS, { key: 'all', label: 'ALL' }];

function Sub({ id, title, aside, children }) {
  return (
    <section className="orc-sub" aria-labelledby={id}>
      <div className="orc-sub__head">
        <h3 className="orc-sub__title" id={id}>
          {title}
        </h3>
        {aside ? <div className="orc-sub__aside">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ScorecardSkeleton() {
  return (
    <div className="orc-card" aria-busy="true">
      <div className="orc-hero">
        <div className="orc-hero__who">
          <Skel w={48} h={48} />
          <div className="orc-skelcol">
            <Skel w={180} h={22} />
            <Skel w={140} h={12} />
          </div>
        </div>
        <Skel w={110} h={36} />
      </div>
      <Skel w="100%" h={200} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skel key={i} w="100%" h={14} />
      ))}
    </div>
  );
}

function History({ history, dated }) {
  const [period, setPeriod] = useState('ytd');
  const view = useMemo(() => {
    if (!dated || period === 'all') {
      return {
        points: [{ rating: 1250, opening: true, t: history[0]?.t }, ...history],
        change: history.reduce((s, p) => s + p.delta, 0),
      };
    }
    return historyWindow(history, period);
  }, [history, dated, period]);

  if (history.length === 0) {
    return (
      <Sub id="orc-history" title="Rating history">
        <p className="tcc-state">No rating history yet. It starts with the first scored pitch.</p>
      </Sub>
    );
  }
  return (
    <Sub
      id="orc-history"
      title="Rating history"
      aside={
        dated ? (
          <div className="tcc-toggles orc-periods" role="group" aria-label="History period">
            {HISTORY_PERIODS.map((p) => (
              <TextToggle
                key={p.key}
                mono
                pressed={period === p.key}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </TextToggle>
            ))}
          </div>
        ) : null
      }
    >
      <p className="orc-note">
        <span
          className={`tcc-mono ${view.change > 0 ? 'tcc-pos' : view.change < 0 ? 'tcc-neg' : ''}`}
        >
          {signed(view.change)}
        </span>{' '}
        {dated
          ? period === 'all'
            ? 'since the start at 1,250'
            : 'in this period'
          : 'since the start at 1,250. Dates are not shown: these changes were written before rating changes were dated. The next recompute dates them.'}
      </p>
      {view.points.length < 2 ? (
        <p className="tcc-state">No rating change in this period.</p>
      ) : (
        <HistoryChart points={view.points} dated={dated} />
      )}
    </Sub>
  );
}

/** One member's scorecard. Visibility is unchanged: any council member may open it. */
export function Scorecard({ state, isViewer, onRetry, sample }) {
  const [copied, setCopied] = useState(false);
  if (state.status === 'idle' || (state.status === 'loading' && !state.data)) {
    return <ScorecardSkeleton />;
  }
  if (state.status === 'missing') {
    return (
      <p className="tcc-state">
        <span>This member was not found in the council. They may have left.</span>
      </p>
    );
  }
  if (state.status === 'error' || !state.data) {
    return <SectionError message="The scorecard could not be loaded." onRetry={onRetry} />;
  }

  const d = state.data;
  const m = d.member;
  const r = d.rating;
  const provisional = !m.is_advisor && r.is_provisional;
  const pctOrNA = (v) => (v == null ? NA : `${v}%`);
  const roleLine = [
    m.is_advisor ? 'Faculty advisor' : WEIGHT_ROLE_LABELS[m.weight_role] || 'Member',
    m.team_name ? `${m.team_name} team` : null,
    m.is_advisor
      ? null
      : `${r.rated_thesis_count} scored ${r.rated_thesis_count === 1 ? 'pitch' : 'pitches'}`,
  ]
    .filter(Boolean)
    .join(', ');
  const recognitions = d.recognitions || [];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="orc-card" aria-busy={state.status === 'loading' || undefined}>
      <div className="orc-hero">
        <div className="orc-hero__who">
          <span className="orc-avatar tcc-mono" aria-hidden="true">
            {initials(m.name)}
          </span>
          <div className="orc-hero__text">
            <h2 className="orc-hero__name" id="orc-scorecard-title">
              {stripDemoLabel(m.name)}
              {isViewer && <span className="orc-you">You</span>}
              {provisional && (
                <span
                  className="orc-provisional"
                  title="Fewer than 10 scored pitches: the rating is provisional"
                >
                  <i className="bi bi-star" aria-hidden="true" />
                  Provisional
                </span>
              )}
            </h2>
            <p className="orc-hero__role">{roleLine}</p>
          </div>
        </div>
        <div className="orc-hero__rating">
          <span className="orc-hero__label">Ezana rating</span>
          <span className={`orc-hero__value tcc-mono${provisional ? ' is-dim' : ''}`}>
            {m.is_advisor ? NA : fmtInt(r.value)}
          </span>
        </div>
      </div>

      {m.is_advisor ? (
        <p className="tcc-state">
          Faculty advisors are not rated or ranked. They can give badges and awards.
        </p>
      ) : (
        <dl className="orc-facts">
          <div>
            <dt>Tier</dt>
            <dd className={r.tier === 'unranked' ? 'tcc-na' : 'orc-emerald'}>{r.tier_label}</dd>
          </div>
          <div>
            <dt>Council percentile</dt>
            <dd className="tcc-mono">{pctOrNA(d.percentiles?.org)}</dd>
          </div>
          <div>
            <dt>All funds percentile</dt>
            <dd className="tcc-mono">{pctOrNA(d.percentiles?.all_funds)}</dd>
          </div>
        </dl>
      )}

      <div className="orc-hero__tools">
        <button type="button" className="tcc-textbtn" onClick={copyLink}>
          <i className={`bi ${copied ? 'bi-check2' : 'bi-link-45deg'}`} aria-hidden="true" />
          {copied ? 'Link copied' : 'Copy link'}
        </button>
        <button type="button" className="tcc-textbtn" onClick={() => window.print()}>
          <i className="bi bi-printer" aria-hidden="true" />
          Export
        </button>
      </div>

      {!m.is_advisor && <History history={d.history || []} dated={d.history_dated !== false} />}

      {!m.is_advisor && (
        <Sub
          id="orc-breakdown"
          title="Rating breakdown"
          aside={
            <span className="tcc-meta">
              Evaluated as {(WEIGHT_ROLE_LABELS[m.weight_role] || 'member').toLowerCase()}
            </span>
          }
        >
          <p className="orc-note">
            Display weights change only this breakdown. The rating itself moves with scored pitches
            and decay.
          </p>
          <table className="orc-table orc-breakdown">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" className="orc-num">
                  Display weight
                </th>
                <th scope="col">Score (0 to 100)</th>
                <th scope="col" className="orc-num">
                  <span className="tcc-sr">Score value</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(d.categories || []).map((c) => (
                <tr key={c.category}>
                  <td>{categoryLabel(c.category)}</td>
                  <td className="orc-num tcc-mono">{`${fmtInt(c.weight)}%`}</td>
                  <td>
                    {c.score == null ? (
                      <span className="tcc-na">pending</span>
                    ) : (
                      <span className="orc-bar" aria-hidden="true">
                        <span style={{ width: `${Math.max(2, Math.min(100, c.score))}%` }} />
                      </span>
                    )}
                  </td>
                  <td className="orc-num tcc-mono">{c.score == null ? '' : Math.round(c.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sub>
      )}

      {!m.is_advisor && (
        <Sub id="orc-pitches" title="Scored pitches">
          <p className="orc-note">
            Excess return is measured against the broad market, not the sector. Change is what each
            pitch added to the rating.
          </p>
          {(d.receipts || []).length === 0 ? (
            <p className="tcc-state">
              <span>No scored pitches yet. A pitch is scored 30 days after it is accepted.</span>
              <Link href="/org-team-hub/pitches" className="tcc-link">
                Pitch Pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </p>
          ) : (
            <div className="orc-scroll">
              <table className="orc-table orc-receipts">
                <thead>
                  <tr>
                    <th scope="col">Ticker</th>
                    <th scope="col" className="orc-col-company">
                      Company
                    </th>
                    <th scope="col" className="orc-num">
                      Days held
                    </th>
                    <th scope="col" className="orc-num">
                      Excess vs market
                    </th>
                    <th scope="col" className="orc-num">
                      Market return
                    </th>
                    <th scope="col" className="orc-num">
                      Conviction
                    </th>
                    <th scope="col" className="orc-num">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.receipts.map((t) => (
                    <tr key={t.pitch_id}>
                      <td>
                        <Link
                          href={`/org-team-hub/pitches?pitch=${encodeURIComponent(t.pitch_id)}`}
                          className="tcc-rowlink tcc-mono tcc-ticker"
                        >
                          {t.ticker || NA}
                        </Link>
                      </td>
                      <td className="orc-ellipsis orc-col-company" title={t.company_name || ''}>
                        {t.company_name || NA}
                      </td>
                      <td className="orc-num tcc-mono">
                        {t.hold_days == null ? NA : fmtInt(t.hold_days)}
                      </td>
                      <td
                        className={`orc-num tcc-mono ${t.excess_return_pct > 0 ? 'tcc-pos' : t.excess_return_pct < 0 ? 'tcc-neg' : ''}`}
                      >
                        {signedPct(t.excess_return_pct)}
                      </td>
                      <td className="orc-num tcc-mono">{signedPct(t.benchmark_return_pct)}</td>
                      <td className="orc-num tcc-mono">
                        {t.conviction_level == null ? (
                          <span className="tcc-na">N/A</span>
                        ) : (
                          `${t.conviction_level} of 5`
                        )}
                      </td>
                      <td
                        className={`orc-num tcc-mono ${t.delta_rating > 0 ? 'tcc-pos' : t.delta_rating < 0 ? 'tcc-neg' : ''}`}
                      >
                        {signed(t.delta_rating)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Sub>
      )}

      {!m.is_advisor && (
        <Sub id="orc-calibration" title="Calibration">
          <p className="orc-note">
            Declared conviction against the share of those pitches that beat the market. The number
            by each dot is how many pitches it holds. The dotted line is the even calibration the
            rating rewards.
          </p>
          {d.calibration_series && d.calibration_series.length ? (
            <CalibrationChart series={d.calibration_series} />
          ) : (
            <p className="tcc-state">
              Calibration pending. It needs scored pitches with a declared conviction.
            </p>
          )}
        </Sub>
      )}

      <Sub id="orc-badges" title="Badges and awards">
        {recognitions.length === 0 ? (
          <p className="tcc-state">No badges or awards yet.</p>
        ) : (
          <ul className="orc-feed orc-feed--card">
            {recognitions.map((x) => (
              <AwardRow key={x.id} r={x} />
            ))}
          </ul>
        )}
      </Sub>
      {sample && <p className="orc-note orc-print-hide">Sample content.</p>}
    </div>
  );
}

/** One badge or award: icon and title, reason, giver, period, date, pitch. */
export function AwardRow({ r, onOpenMember }) {
  const b = badgeOf(r.badge_type);
  const kind = r.auto_generated ? 'Auto' : r.is_award ? 'Gold award' : 'Badge';
  return (
    <li className="orc-award">
      <i
        className={`bi ${b.icon} orc-award__icon${r.is_award ? ' is-gold' : ''}`}
        aria-hidden="true"
      />
      <div className="orc-award__main">
        <div className="orc-award__top">
          <span className={`orc-award__title${r.is_award ? ' is-gold' : ''}`}>
            {stripDemoLabel(r.title)}
          </span>
          <span className="tcc-mono orc-award__date">{fmtDate(r.created_at)}</span>
        </div>
        {r.reason ? <p className="orc-award__reason">{r.reason}</p> : null}
        <p className="orc-award__meta">
          {onOpenMember ? (
            r.recipient_member_id ? (
              <button
                type="button"
                className="orc-namebtn"
                onClick={() => onOpenMember(r.recipient_member_id)}
              >
                {stripDemoLabel(r.recipient_name)}
              </button>
            ) : (
              <span>{stripDemoLabel(r.recipient_name)}</span>
            )
          ) : null}
          <span>
            {r.auto_generated ? 'From pitch outcomes' : `From ${r.awarded_by_name || NA}`}
          </span>
          <span className="tcc-mono">{r.period || NA}</span>
          <span className={r.is_award ? 'orc-gold' : ''}>{kind}</span>
          {r.pitch_id && r.pitch_ticker ? (
            <Link
              href={`/org-team-hub/pitches?pitch=${encodeURIComponent(r.pitch_id)}`}
              className="tcc-link tcc-mono"
            >
              {r.pitch_ticker}
            </Link>
          ) : null}
        </p>
      </div>
    </li>
  );
}

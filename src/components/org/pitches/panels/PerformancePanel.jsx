'use client';

import { useMemo } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  ShieldQuestion,
  CalendarClock,
  Flag,
  CircleCheck,
  CircleAlert,
  Zap,
  AlertTriangle,
} from 'lucide-react';

/**
 * PerformancePanel (spec §5.2 / §5.3) — read-only monitoring surface for a live
 * (`in_portfolio`) or `exited` position.
 *
 * All data comes from the pitch detail object — no new endpoints:
 *   - entry:      pitch.current_price_at_submission || pitch.pitch_price
 *   - current vs benchmark + return + alpha: pitch.hindsight (org_pitch_hindsight)
 *   - benchmark:  pitch.benchmark_symbol || pitch.benchmark_ticker
 *   - falsification condition: pitch.falsification (§5.3, surfaced prominently)
 *   - review clock: pitch.last_reaffirmed_at (+90d)
 *   - catalysts / risks: pitch.catalysts[] / pitch.risks[]
 *
 * When hindsight / benchmark data is absent it renders honest-empty
 * ("Not yet computed") — it never fabricates a price or a return.
 *
 * @param {object} props
 * @param {object} props.pitch   pitch detail incl. hindsight
 * @param {object} props.viewer  current member (unused for writes — read-only)
 * @param {Function} [props.onRefresh]
 */

const REVIEW_CYCLE_MS = 90 * 86400000;

function fmtPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return `$${Number(n).toFixed(2)}`;
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  const v = Number(n);
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function toArray(v) {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

export function PerformancePanel({ pitch }) {
  const hindsight = pitch?.hindsight || null;

  const entry =
    pitch?.current_price_at_submission != null
      ? Number(pitch.current_price_at_submission)
      : pitch?.pitch_price != null
        ? Number(pitch.pitch_price)
        : null;

  const current = hindsight?.current_price != null ? Number(hindsight.current_price) : null;
  const benchmark = pitch?.benchmark_symbol || pitch?.benchmark_ticker || null;
  const returnPct = hindsight?.return_pct;
  const benchReturnPct = hindsight?.benchmark_return_pct;
  const alphaPct = hindsight?.alpha_pct;
  const maxDrawdown = hindsight?.max_drawdown_pct;

  const catalysts = toArray(pitch?.catalysts);
  const risks = toArray(pitch?.risks);
  const falsification = (pitch?.falsification || '').trim();

  // Thesis-review clock: 90d from last reaffirmation (fall back to portfolio entry).
  const review = useMemo(() => {
    const anchorIso = pitch?.last_reaffirmed_at || pitch?.stage_entered_at || null;
    if (!anchorIso) return { known: false };
    const dueAt = new Date(anchorIso).getTime() + REVIEW_CYCLE_MS;
    const days = Math.round((dueAt - Date.now()) / 86400000);
    return {
      known: true,
      overdue: days < 0,
      days: Math.abs(days),
      reaffirmed: !!pitch?.last_reaffirmed_at,
    };
  }, [pitch?.last_reaffirmed_at, pitch?.stage_entered_at]);

  // No structured trip signal exists — the condition is analyst-attested at each
  // review. Treat overdue as "awaiting check", never fabricate a "tripped".
  const tripped =
    pitch?.falsification_tripped === true || hindsight?.current_state === 'stopped_out';

  const flags = [];
  if (tripped) flags.push({ tone: 'bad', label: 'Falsification condition tripped' });
  if (review.known && review.overdue)
    flags.push({ tone: 'warn', label: `Thesis review overdue by ${review.days}d` });
  if (maxDrawdown != null && Number(maxDrawdown) <= -20)
    flags.push({ tone: 'warn', label: `Max drawdown ${fmtPct(maxDrawdown)}` });

  const hasHindsight = current != null || returnPct != null || alphaPct != null;

  return (
    <section className="pperf" aria-label="Position performance">
      {/* Flags strip */}
      {flags.length > 0 && (
        <div className="pperf-flags">
          {flags.map((f) => (
            <span key={f.label} className={`pperf-flag ${f.tone}`}>
              <Flag size={12} aria-hidden />
              {f.label}
            </span>
          ))}
        </div>
      )}

      {/* Entry vs current vs benchmark */}
      <div className="pperf-block">
        <h4 className="pperf-subhead">Entry vs current vs benchmark</h4>
        <div className="pperf-prices">
          <div className="pperf-price">
            <span className="pperf-price-label">Entry</span>
            <span className="pperf-num pperf-price-val">{fmtPrice(entry) || 'Not recorded'}</span>
          </div>
          <div className="pperf-price">
            <span className="pperf-price-label">Current</span>
            <span className="pperf-num pperf-price-val">
              {fmtPrice(current) || <span className="pperf-muted">Not yet computed</span>}
            </span>
          </div>
          <div className="pperf-price">
            <span className="pperf-price-label">Benchmark{benchmark ? ` · ${benchmark}` : ''}</span>
            <span className="pperf-num pperf-price-val">
              {benchReturnPct != null ? (
                fmtPct(benchReturnPct)
              ) : (
                <span className="pperf-muted">{benchmark ? 'Not yet computed' : 'None set'}</span>
              )}
            </span>
          </div>
        </div>

        {hasHindsight ? (
          <div className="pperf-returns">
            {returnPct != null && (
              <span className={`pperf-stat ${Number(returnPct) >= 0 ? 'pos' : 'neg'}`}>
                {Number(returnPct) >= 0 ? (
                  <TrendingUp size={13} aria-hidden />
                ) : (
                  <TrendingDown size={13} aria-hidden />
                )}
                <span className="pperf-stat-label">Return</span>
                <span className="pperf-num">{fmtPct(returnPct)}</span>
              </span>
            )}
            {alphaPct != null && (
              <span className={`pperf-stat ${Number(alphaPct) >= 0 ? 'pos' : 'neg'}`}>
                <Target size={13} aria-hidden />
                <span className="pperf-stat-label">Alpha{benchmark ? ` vs ${benchmark}` : ''}</span>
                <span className="pperf-num">{fmtPct(alphaPct)}</span>
              </span>
            )}
            {maxDrawdown != null && (
              <span className="pperf-stat neg">
                <TrendingDown size={13} aria-hidden />
                <span className="pperf-stat-label">Max DD</span>
                <span className="pperf-num">{fmtPct(maxDrawdown)}</span>
              </span>
            )}
          </div>
        ) : (
          <p className="pperf-empty-line">Return &amp; alpha not yet computed.</p>
        )}
      </div>

      {/* §5.3 Falsification check — surfaced prominently */}
      <div className={`pperf-fals ${tripped ? 'is-tripped' : 'is-intact'}`}>
        <div className="pperf-fals-head">
          <ShieldQuestion size={15} aria-hidden />
          <span className="pperf-fals-title">Falsification check</span>
          <span className={`pperf-fals-state ${tripped ? 'tripped' : 'intact'}`}>
            {tripped ? (
              <>
                <CircleAlert size={13} aria-hidden /> Tripped
              </>
            ) : (
              <>
                <CircleCheck size={13} aria-hidden /> Intact
              </>
            )}
          </span>
        </div>
        {falsification ? (
          <blockquote className="pperf-fals-text">{falsification}</blockquote>
        ) : (
          <p className="pperf-muted pperf-fals-text">
            No falsification condition was recorded for this pitch.
          </p>
        )}
        <div className="pperf-fals-clock">
          <CalendarClock size={13} aria-hidden />
          {review.known ? (
            review.overdue ? (
              <span className="pperf-review overdue">
                Review overdue by <span className="pperf-num">{review.days}</span>d — the analyst
                must re-check this condition.
              </span>
            ) : (
              <span className="pperf-review">
                {review.reaffirmed ? 'Reaffirmed' : 'Entered'} · next review due in{' '}
                <span className="pperf-num">{review.days}</span>d
              </span>
            )
          ) : (
            <span className="pperf-muted">Review clock not started.</span>
          )}
        </div>
      </div>

      {/* Catalyst tracker */}
      <div className="pperf-block">
        <h4 className="pperf-subhead">
          <Zap size={13} aria-hidden /> Catalyst tracker
        </h4>
        {catalysts.length > 0 ? (
          <ul className="pperf-track">
            {catalysts.map((c, i) => (
              <li key={i} className="pperf-track-row">
                <span className="pperf-dot catalyst" aria-hidden />
                <span>{typeof c === 'string' ? c : c?.label || c?.text || JSON.stringify(c)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pperf-empty-line">No catalysts recorded.</p>
        )}
      </div>

      {/* Risk register */}
      <div className="pperf-block">
        <h4 className="pperf-subhead">
          <AlertTriangle size={13} aria-hidden /> Risk register
        </h4>
        {risks.length > 0 ? (
          <ul className="pperf-track">
            {risks.map((r, i) => (
              <li key={i} className="pperf-track-row">
                <span className="pperf-dot risk" aria-hidden />
                <span>{typeof r === 'string' ? r : r?.label || r?.text || JSON.stringify(r)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pperf-empty-line">No risks recorded.</p>
        )}
      </div>
    </section>
  );
}

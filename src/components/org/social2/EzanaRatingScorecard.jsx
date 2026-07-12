'use client';

import { useCallback, useEffect, useState } from 'react';
import { Award, Sparkles, Target, TrendingUp, ClipboardList } from 'lucide-react';
import { badgeIcon } from './AwardModal';
import './recognition2.css';

const CATEGORY_LABELS = {
  calibration: 'Calibration',
  alpha_vs_sector: 'Alpha vs. Sector',
  research_output: 'Research Output',
  learning: 'Learning',
  task_efficiency: 'Task Efficiency',
  engagement: 'Engagement',
  strategy_pnl: 'Strategy PnL',
  execution_quality: 'Execution Quality',
  backtest_research: 'Backtest Research',
  portfolio_alpha: 'Portfolio Alpha',
  risk_management: 'Risk Management',
  allocation_discipline: 'Allocation Discipline',
  leadership: 'Leadership',
  team_uplift: 'Team Uplift',
  research_oversight: 'Research Oversight',
};

const ROLE_LABELS = {
  analyst: 'Analyst',
  quant_trader: 'Quant Trader',
  portfolio_manager: 'Portfolio Manager',
  vp: 'Vice President',
};

const TIER_TOKEN = {
  legend: 'var(--gold-text)',
  cio: 'var(--purple)',
  portfolio_mgr: 'var(--info)',
  senior_analyst: 'var(--cyan)',
  analyst: 'var(--emerald-text)',
  junior_analyst: 'var(--emerald-text)',
  trainee: 'var(--text-muted)',
  unranked: 'var(--text-muted)',
};

const initials = (name) =>
  (name || 'M')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function barColor(score) {
  if (score >= 78) return 'var(--emerald)';
  if (score >= 62) return 'var(--info)';
  return 'var(--warning)';
}

function Sparkline({ points }) {
  const vals = (points || []).map((p) => p.rating);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const W = 100;
  const H = 40;
  const step = W / (vals.length - 1);
  const coords = vals.map((v, i) => [i * step, H - ((v - min) / span) * (H - 6) - 3]);
  const line = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg className="rec2-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <path className="rec2-spark-area" d={area} />
      <path className="rec2-spark-line" d={line} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CalibrationChart({ series }) {
  if (!series || series.length === 0) return null;
  const S = 200;
  const pad = 22;
  const inner = S - pad * 2;
  const x = (conviction) => pad + ((conviction - 1) / 4) * inner;
  const y = (rate) => S - pad - rate * inner;
  return (
    <svg
      className="rec2-calib"
      viewBox={`0 0 ${S} ${S}`}
      role="img"
      aria-label="Calibration: declared conviction vs realized hit rate"
    >
      <line className="rec2-calib-axis" x1={pad} y1={pad} x2={pad} y2={S - pad} />
      <line className="rec2-calib-axis" x1={pad} y1={S - pad} x2={S - pad} y2={S - pad} />
      {/* diagonal ideal-calibration line */}
      <line className="rec2-calib-ideal" x1={x(1)} y1={y(0.2)} x2={x(5)} y2={y(1)} />
      {series.map((p) => (
        <circle
          key={p.conviction}
          className="rec2-calib-point"
          cx={x(p.conviction)}
          cy={y(p.hitRate)}
          r={4}
        />
      ))}
    </svg>
  );
}

export function EzanaRatingScorecard({ memberId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/org/recognition/scorecard/${memberId}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load scorecard.');
        setData(null);
      } else {
        setData(json);
        setError('');
      }
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!memberId) {
    return (
      <div className="rec2-card">
        <div className="rec2-empty">Select a member to view their Ezana Rating scorecard.</div>
      </div>
    );
  }
  if (loading)
    return (
      <div className="rec2-card">
        <div className="rec2-empty">Loading scorecard…</div>
      </div>
    );
  if (error)
    return (
      <div className="rec2-card">
        <div className="rec2-empty">{error}</div>
      </div>
    );
  if (!data) return null;

  const {
    member,
    rating,
    sparkline,
    percentiles,
    categories,
    receipts,
    calibration_series,
    badges,
    awards,
  } = data;
  const roleLabel = ROLE_LABELS[member.weight_role] || member.role;
  const provisional = rating.is_provisional;

  return (
    <div className="rec2-card">
      {/* ── Hero ── */}
      <div className="rec2-hero">
        <div className="rec2-hero-avatar" aria-hidden>
          {initials(member.name)}
        </div>
        <div className="rec2-hero-main">
          <h2 className="rec2-hero-name">
            {member.name}
            {provisional && (
              <span className="rec2-provisional-chip">
                <Sparkles size={11} aria-hidden /> Provisional
              </span>
            )}
          </h2>
          <p className="rec2-hero-meta">
            {roleLabel} · {rating.rated_thesis_count} rated{' '}
            {rating.rated_thesis_count === 1 ? 'thesis' : 'theses'}
          </p>
          <span
            className="rec2-tier"
            style={{ color: TIER_TOKEN[rating.tier] || 'var(--text-muted)' }}
          >
            <Award size={12} aria-hidden /> {rating.tier_label}
          </span>
          <div className="rec2-hero-stats">
            <div>
              <div className="rec2-stat-label">Org percentile</div>
              <div className="rec2-stat-value">
                {percentiles.org != null ? `${percentiles.org}th` : '—'}
              </div>
            </div>
            <div>
              <div className="rec2-stat-label">All funds</div>
              <div className="rec2-stat-value">
                {percentiles.all_funds != null ? `${percentiles.all_funds}th` : '—'}
              </div>
            </div>
          </div>
        </div>
        <div className="rec2-hero-rating" style={{ opacity: provisional ? 0.6 : 1 }}>
          <div className="rec2-hero-rating-value">{Math.round(rating.value)}</div>
          <div className="rec2-hero-rating-label">Ezana Rating</div>
        </div>
      </div>
      {sparkline?.length >= 2 ? (
        <Sparkline points={sparkline} />
      ) : (
        <p className="rec2-caveat">
          No rating history yet — resolve theses to build a track record.
        </p>
      )}

      {/* ── Rating breakdown ── */}
      <div className="rec2-section">
        <div className="rec2-section-title">
          <TrendingUp size={13} aria-hidden /> Rating breakdown
          <span className="rec2-evalpill" style={{ marginLeft: 'auto' }}>
            Evaluated as {roleLabel}
          </span>
        </div>
        {categories.map((c) => {
          const pending = c.score == null;
          return (
            <div className="rec2-cat" key={c.category}>
              <div className="rec2-cat-head">
                <span className="rec2-cat-label">
                  {CATEGORY_LABELS[c.category] || c.category}{' '}
                  <span className="rec2-cat-weight">· {c.weight}%</span>
                </span>
                {pending ? (
                  <span className="rec2-cat-pending">pending</span>
                ) : (
                  <span className="rec2-cat-score">{Math.round(c.score)}</span>
                )}
              </div>
              <div className={`rec2-bar${pending ? ' rec2-bar--pending' : ''}`}>
                {!pending && (
                  <div
                    className="rec2-bar-fill"
                    style={{ width: `${Math.min(100, c.score)}%`, background: barColor(c.score) }}
                  />
                )}
              </div>
            </div>
          );
        })}
        <p className="rec2-caveat">
          Calibration (declared conviction vs. realized hit rate) is weighted into every role.
          Pending categories have no resolved inputs yet and are never scored as zero.
        </p>
      </div>

      {/* ── Resolved theses receipts ── */}
      <div className="rec2-section">
        <div className="rec2-section-title">
          <Target size={13} aria-hidden /> Resolved theses
        </div>
        {receipts?.length ? (
          <div className="rec2-tablewrap">
            <table className="rec2-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Hold</th>
                  <th className="rec2-td-num">Excess vs sector</th>
                  <th className="rec2-td-num">Conviction</th>
                  <th className="rec2-td-num">ΔRating</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.pitch_id}>
                    <td>
                      <span className="rec2-ticker">{r.ticker}</span>
                    </td>
                    <td className="rec2-td-num">{r.hold_days != null ? `${r.hold_days}d` : '—'}</td>
                    <td
                      className="rec2-td-num"
                      style={{
                        color: r.excess_vs_sector >= 0 ? 'var(--emerald-text)' : 'var(--danger)',
                      }}
                    >
                      {r.excess_vs_sector != null
                        ? `${r.excess_vs_sector > 0 ? '+' : ''}${r.excess_vs_sector.toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="rec2-td-num">
                      {r.conviction_level != null ? `${r.conviction_level}/5` : '—'}
                    </td>
                    <td
                      className="rec2-td-num"
                      style={{
                        color: r.delta_rating >= 0 ? 'var(--emerald-text)' : 'var(--danger)',
                        fontWeight: 700,
                      }}
                    >
                      {r.delta_rating > 0 ? '+' : ''}
                      {r.delta_rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rec2-empty">
            No rated theses yet.
            <div className="rec2-empty-sub">
              Ratings appear once this member has resolved theses with hindsight outcomes.
            </div>
          </div>
        )}
      </div>

      {/* ── Calibration chart ── */}
      <div className="rec2-section">
        <div className="rec2-section-title">
          <Sparkles size={13} aria-hidden /> Calibration
        </div>
        {calibration_series ? (
          <>
            <CalibrationChart series={calibration_series} />
            <p className="rec2-caveat">
              Points on the dashed line = perfectly calibrated (higher conviction ⇒ higher hit
              rate).
            </p>
          </>
        ) : (
          <div className="rec2-empty">
            Calibration pending.
            <div className="rec2-empty-sub">
              Needs resolved theses that carry a declared conviction (1–5). Not fabricated.
            </div>
          </div>
        )}
      </div>

      {/* ── Badges & awards ── */}
      <div className="rec2-section">
        <div className="rec2-section-title">
          <ClipboardList size={13} aria-hidden /> Badges & awards
        </div>
        {badges?.length || awards?.length ? (
          <div className="rec2-chips">
            {(awards || []).map((a) => (
              <span key={a.id} className="rec2-chip rec2-chip--award" title={a.reason || ''}>
                <span aria-hidden>{badgeIcon(a.badge_type)}</span> {a.title}
              </span>
            ))}
            {(badges || []).map((b) => (
              <span key={b.id} className="rec2-chip" title={b.reason || ''}>
                <span aria-hidden>{badgeIcon(b.badge_type)}</span> {b.title}
                {b.auto_generated && <span className="rec2-cat-weight"> · auto</span>}
              </span>
            ))}
          </div>
        ) : (
          <div className="rec2-empty">No badges or awards yet.</div>
        )}
      </div>
    </div>
  );
}

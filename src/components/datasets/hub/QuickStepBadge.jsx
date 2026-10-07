'use client';

/**
 * The Quick Step badge: earned by traders whose moves around federal contract
 * awards pay off, and by companies whose stock tends to rise after their
 * awards. Hover, focus or tap shows what it means and how a reader earns it,
 * with their own progress when they are signed in.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

const RULE = {
  actor:
    'Earned by traders with at least 3 trades within 30 days of a federal contract award to the same company, 60% or more of them ahead 30 days later, averaging +5% or better.',
  company:
    'Earned by companies whose stock rose in the 30 days after at least 60% of their contract awards (3 or more), by +3% or better on average.',
};

export default function QuickStepBadge({ kind = 'actor', earned = true, compact = false }) {
  const { isAuthenticated, loading } = useAuth() || {};
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(null); // null | 'busy' | 'error' | progress object
  const wrap = useRef(null);
  const tipId = useId();

  useEffect(() => {
    if (!open || loading || !isAuthenticated || mine) return;
    setMine('busy');
    fetch('/api/badges/quick-step')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setMine(d?.progress || 'error'))
      .catch(() => setMine('error'));
  }, [open, loading, isAuthenticated, mine]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const [here, setHere] = useState('/datasets');
  useEffect(() => setHere(`${window.location.pathname}${window.location.search}`), []);

  const p = mine && typeof mine === 'object' ? mine : null;

  return (
    <span
      className={`hub-badge${earned ? '' : ' is-locked'}${compact ? ' is-compact' : ''}`}
      ref={wrap}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="hub-badge-btn"
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => !wrap.current?.contains(e.relatedTarget) && setOpen(false)}
      >
        <i className={`bi ${earned ? 'bi-lightning-charge-fill' : 'bi-lock'}`} aria-hidden="true" />
        <span>Quick Step</span>
      </button>
      {open ? (
        <span className="hub-badge-tip" role="tooltip" id={tipId}>
          <strong className="hub-badge-tip-title">
            <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> Quick Step
          </strong>
          <span className="hub-badge-tip-p">{RULE[kind] || RULE.actor}</span>
          <span className="hub-badge-tip-h">How to earn it</span>
          <span className="hub-badge-tip-p">
            Link a brokerage and make 3 or more trades in companies within 30 days of one of their
            federal contract awards. When at least 60% are ahead 30 days later and they average +5%
            or better, you earn the badge.
          </span>
          {loading ? null : !isAuthenticated ? (
            <a
              className="hub-badge-tip-link"
              href={`/auth/signin?redirect=${encodeURIComponent(here)}`}
            >
              Sign in to see your progress
            </a>
          ) : mine === 'busy' ? (
            <span className="hub-badge-tip-me">Checking your trades</span>
          ) : mine === 'error' ? (
            <span className="hub-badge-tip-me">Your progress could not be loaded just now.</span>
          ) : p ? (
            <span className="hub-badge-tip-me">
              {p.earned ? (
                <>
                  <i className="bi bi-check2-circle" aria-hidden="true" /> You have earned Quick
                  Step.
                </>
              ) : (
                <>
                  Your progress: <span className="hub-mono">{Math.min(p.measured, 3)} of 3</span>{' '}
                  measured trades near awards
                  {p.measured ? (
                    <>
                      {', '}
                      <span className="hub-mono">
                        {p.avg_ret_pct > 0 ? '+' : ''}
                        {Number(p.avg_ret_pct).toFixed(1)}%
                      </span>{' '}
                      average,{' '}
                      <span className="hub-mono">{Math.round(Number(p.hit_rate) * 100)}%</span>{' '}
                      ahead
                    </>
                  ) : null}
                  .
                </>
              )}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

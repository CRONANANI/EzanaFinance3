'use client';

/**
 * The deep research option card (Nov 2026, estimates). Beside an answer in
 * progress (placement 'progress') and under the brief once it lands
 * (placement 'after'), where it replaces the old Go deeper bar and keeps its
 * telemetry (go_deeper_shown once per question and placement,
 * go_deeper_clicked on the button).
 *
 * Everything it says comes from POST /api/sonar/estimate: the time, and a
 * usage line read from the same ledger and entitlements the reservation
 * uses (deepState in lib/sonar/estimate-copy.js), so it never disagrees with
 * what the run is charged. At the cap the button is disabled and the line
 * says when the runs reset. Its own light file: the landing band loads it
 * without the research report.
 *
 * Branding guide: tokens only, Bootstrap Icons, prefix `sdr-dcard`. No em
 * dashes in copy.
 */
import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ds';
import { deepState } from '@/lib/sonar/estimate-copy';
import { sendModeEvent } from '@/lib/sonar/mode-events-client';
import './deep-research.css';

/** The sign-up link that brings a guest back to this question (run deep
    when `deep`). */
export function deepSignupHref(query, { deep = true } = {}) {
  let next = `/datasets?q=${encodeURIComponent(query || '')}${deep ? '&deep=1' : ''}`;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('q', query || '');
    if (deep) url.searchParams.set('deep', '1');
    else url.searchParams.delete('deep');
    next = `${url.pathname}${url.search}`;
  } catch {
    /* default above */
  }
  return `/auth/continue?intent=signup&next=${encodeURIComponent(next)}`;
}

/**
 * @param {object} props
 * @param {string} props.query
 * @param {object|null} props.estimate  the /api/sonar/estimate response (null while it loads)
 * @param {'progress'|'after'|'inline'} [props.placement]  'inline' (Nov 6): the button and
 *   one line of status only, for the country answer board's executive answer card
 * @param {number} [props.pingsSpent]  pings spent since the estimate was read
 * @param {(state: object) => void} [props.onRun]  the host cancels any answer
 *   in flight and starts deep research (or sign-up, state.blocked 'signup')
 * @param {2|3} [props.headingLevel]
 */
export function DeepResearchCard({
  query,
  estimate,
  placement = 'after',
  pingsSpent = 0,
  onRun,
  headingLevel = 3,
}) {
  const titleId = useId();
  const lineId = useId();
  const deep = estimate?.deep || null;
  const state = deepState(estimate, { pingsSpent });
  const meta = deep?.meta || null;

  const shown = useRef(null);
  useEffect(() => {
    if (!deep || !query) return;
    const key = `${query}|${placement}`;
    if (shown.current === key) return;
    shown.current = key;
    sendModeEvent('go_deeper_shown', {
      query,
      meta,
      details: { to: 'deep', placement, card: true, recommended: Boolean(deep.recommended) },
    });
  }, [query, placement, deep, meta]);

  if (state?.blocked === 'disabled') return null;
  const pending = !deep;
  const off = pending || !state?.available;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const why = !pending && deep.recommended ? deep.reasons?.[0] || '' : '';

  const run = () => {
    if (off) return;
    const signup = state.blocked === 'signup';
    sendModeEvent('go_deeper_clicked', {
      query,
      meta,
      ranMode: signup ? null : 'deep',
      details: { placement, card: true, guest: signup },
    });
    if (onRun) onRun(state);
    else if (signup) window.location.assign(deepSignupHref(query));
  };

  if (placement === 'inline') {
    return (
      <span className="sdr-dinline">
        <Button
          variant="primary"
          size="sm"
          className="sdr-dinline-btn"
          onClick={run}
          disabled={off}
          aria-describedby={lineId}
        >
          Run deep research
          <i className="bi bi-arrow-right" aria-hidden="true" />
        </Button>
        <span id={lineId} className="sdr-dinline-line">
          {pending ? 'Estimating the time' : [deep.label, state.line].filter(Boolean).join('. ')}
        </span>
      </span>
    );
  }

  return (
    <section
      className={`sdr-dcard sdr-dcard--${placement} force-dark-theme`}
      aria-labelledby={titleId}
      aria-busy={pending ? 'true' : undefined}
    >
      <Heading id={titleId} className="sdr-dcard-title">
        <i className="bi bi-layers" aria-hidden="true" /> Deep research
      </Heading>
      <p className="sdr-dcard-time">
        <i className="bi bi-clock" aria-hidden="true" />
        <span>{pending ? 'Estimating the time' : deep.label}</span>
      </p>
      <p id={lineId} className="sdr-dcard-line">
        {pending ? 'Checking your deep research runs.' : state.line}
      </p>
      <Button
        variant="primary"
        className="sdr-dcard-btn"
        onClick={run}
        disabled={off}
        aria-describedby={lineId}
      >
        Run deep research
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </Button>
      {why ? <p className="sdr-dcard-why">{why}</p> : null}
    </section>
  );
}

export default DeepResearchCard;

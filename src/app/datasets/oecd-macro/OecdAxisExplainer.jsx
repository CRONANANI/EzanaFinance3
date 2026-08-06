'use client';

/**
 * Persistent per-axis scoring explainer, docked under the head-to-head radar.
 *
 * Opened by clicking (or Enter/Space on) a radar axis — in OECD mode that click
 * ALSO keeps its existing behaviour of setting the active indicator, so the
 * history chart below still follows the selection. Dismissed with the × or Esc.
 *
 * Content comes from `oecd-dimension-methodology.js`; every number rendered here
 * (weights, reporting counts, years) is read from the live payload, so nothing
 * in this component can drift from `dimension_metric_map`.
 */
import { useEffect, useRef } from 'react';

export default function OecdAxisExplainer({ data, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!data) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [data, onClose]);

  if (!data) return null;

  const statusLabel =
    data.status === 'pending'
      ? 'SOURCE PENDING'
      : data.status === 'projected'
        ? 'PROJECTION'
        : data.status === 'live'
          ? 'LIVE DATA'
          : 'ACTUALS';

  return (
    <section
      className="oecd-axexp"
      ref={ref}
      role="region"
      aria-label={`How the ${data.title} score is calculated`}
    >
      <header className="oecd-axexp-head">
        <div className="oecd-axexp-head-l">
          <span className="oecd-axexp-eyebrow">HOW THIS IS SCORED</span>
          <h3 className="oecd-axexp-title">{data.title}</h3>
          {data.scale ? <span className="oecd-axexp-scale oecd-num">{data.scale}</span> : null}
          <span className={`oecd-axexp-status is-${data.status}`}>{statusLabel}</span>
        </div>
        <button
          type="button"
          className="oecd-axexp-close"
          onClick={onClose}
          aria-label="Close explanation"
        >
          ✕
        </button>
      </header>

      {data.what ? <p className="oecd-axexp-what">{data.what}</p> : null}

      {data.steps ? (
        <ol className="oecd-axexp-steps">
          {data.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : null}

      {data.metrics?.length ? (
        <div className="oecd-axexp-metrics">
          <div className="oecd-axexp-metrics-head">
            <span>Contributing metric</span>
            <span className="oecd-axexp-mh-w">Weight</span>
            <span className="oecd-axexp-mh-d">Direction</span>
          </div>
          {data.metrics.map((m) => (
            <div className="oecd-axexp-metric" key={m.id}>
              <span className="oecd-axexp-m-label">
                {m.label}
                {m.unit ? <em className="oecd-axexp-m-unit"> {m.unit}</em> : null}
                {m.reporting ? (
                  <em className="oecd-axexp-m-n oecd-num"> · {m.reporting} reporting</em>
                ) : null}
              </span>
              <span className="oecd-axexp-m-w oecd-num">{m.weight}</span>
              <span className={`oecd-axexp-m-d ${m.inverted ? 'is-inv' : ''}`}>{m.direction}</span>
            </div>
          ))}
        </div>
      ) : null}

      {data.caveat ? <p className="oecd-axexp-caveat">{data.caveat}</p> : null}
      {data.footnote ? <p className="oecd-axexp-foot">{data.footnote}</p> : null}
    </section>
  );
}

'use client';

/**
 * Composite empire ranking (phase 4, empire mode only — swaps in for the OECD
 * ranking; the two never stack). Per country: the mean of its normalized,
 * stronger-oriented scores across the LIVE dimensions in the current Focus group.
 * Countries qualify only with coverage ≥ 70% of those dimensions (disclosed in
 * the footer). This is deliberately NOT presented as "the" empire rank — it is a
 * composite of whatever live dimensions exist today.
 *
 * Same row grid + hover grammar as the OECD ranking; the tooltip lists a
 * country's three strongest and weakest live dimensions. Clicking a row sets A.
 */
import { useMemo, useRef, useState } from 'react';
import { empireAxesForFocus, empireComposite } from './oecd-empire-model';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

export default function OecdEmpireRanking({ model, focus, selectedA, onPickCountry }) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);

  const { ranked, dimCount } = useMemo(() => {
    const dims = empireAxesForFocus(model, focus);
    const rows = empireComposite(model, dims);
    return { ranked: rows, dimCount: dims.length };
  }, [model, focus]);

  const visible = ranked.slice(0, 10);
  const maxComposite = 100; // normalized mean scaled to 0–100

  const payloadFor = (r) => ({
    title: r.name,
    lines: [
      { label: 'Composite', value: r.composite.toFixed(1), tone: 'pos' },
      { label: 'Coverage', value: `${r.present}/${dimCount}` },
      { label: 'Strongest', value: r.strongest.join(', ') || '—' },
      { label: 'Weakest', value: r.weakest.join(', ') || '—' },
    ],
  });

  return (
    <section className="oecd-card oecd-ranking-card" ref={cardRef}>
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">EMPIRE COMPOSITE</span>
          <h2 className="oecd-section-title">
            Composite of {dimCount} live dimension{dimCount === 1 ? '' : 's'} — not a full
            18-dimension score
          </h2>
          <span
            className="oecd-cov-badge oecd-num"
            title="Mean of a country's normalized scores across the live dimensions in this focus group. Countries with <70% coverage are excluded. Not a full 18-dimension empire score."
          >
            LIVE DATA · {model.liveDims.length}/{model.totalDims} DIMENSIONS · {model.year}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="oecd-empire-empty">
          No country meets the 70% coverage threshold across this focus group&apos;s live dimensions
          yet.
        </p>
      ) : (
        <div className="oecd-rank-rows">
          {visible.map((r, i) => {
            const isSel = r.iso === selectedA;
            return (
              <button
                type="button"
                key={r.iso}
                className={`oecd-rank-row ${isSel ? 'is-selected' : ''}`}
                onClick={() => onPickCountry(r.iso)}
                onMouseEnter={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(r)))}
                onMouseMove={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(r)))}
                onMouseLeave={() => setTip(null)}
                onFocus={(e) =>
                  setTip(tipFromElement(e.currentTarget, cardRef.current, payloadFor(r)))
                }
                onBlur={() => setTip(null)}
                aria-pressed={isSel}
              >
                <span className="oecd-rank-num oecd-num">{i + 1}</span>
                <span className="oecd-rank-name oecd-num">{r.name}</span>
                <span className="oecd-rank-track">
                  <span
                    className="oecd-rank-bar is-empire"
                    style={{ left: '0%', width: `${(r.composite / maxComposite) * 100}%` }}
                  />
                </span>
                <span className="oecd-rank-val oecd-num">{r.composite.toFixed(1)}</span>
                <span className="oecd-rank-flag oecd-num">{Math.round(r.coverage * 100)}%</span>
              </button>
            );
          })}
        </div>
      )}

      <p className="oecd-rank-foot">
        <span className="oecd-rank-note">
          Composite = mean of normalized live-dimension scores (0–100), outward-oriented. Qualifying
          countries have ≥70% coverage of this focus group&apos;s live dimensions; the % column
          shows each country&apos;s actual coverage.
        </span>
      </p>
      <OecdTip tip={tip} />
    </section>
  );
}

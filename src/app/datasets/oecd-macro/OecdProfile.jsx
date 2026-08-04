'use client';

/**
 * Country profile — country A across all 20 indicators, grouped under the six
 * lens headers. Each row shows the indicator, its value, and a rank chip `#n/N`.
 * Ranks are computed client-side from the same `latest` payload already in
 * memory (no extra query); for `inv` indicators #1 is the BEST outcome (lowest
 * unemployment, lowest debt). N varies by indicator because countries missing a
 * value are excluded from the denominator. Clicking a row retargets the ranking
 * and history sections; hovering (or focusing) one raises a tooltip with the
 * value's year and the rank convention.
 */
import { useMemo, useRef, useState } from 'react';
import { OECD_LENSES, OECD_CURATED_SERIES } from '@/lib/oecd-curated';
import { formatValue, isProjected, toNum } from '@/lib/oecd-scales';
import { rankWithin } from './oecd-explorer-model';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

export default function OecdProfile({ model, a, ind, onPickIndicator }) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);

  const groups = useMemo(
    () =>
      OECD_LENSES.map((lens) => ({
        lens,
        series: OECD_CURATED_SERIES.filter((s) => s.lens === lens.id),
      })),
    [],
  );

  const name = model.countries.find((c) => c.iso === a)?.name || a;

  const payloadFor = (s) => {
    const cell = model.bySlug[s.slug]?.[a];
    const value = toNum(cell?.value);
    const rk = rankWithin(model, s.slug, a, { inv: s.inv });
    const lines = [
      { label: s.unitLabel, value: formatValue(value, s) },
      {
        label: 'Year',
        value: cell ? `${cell.year}${isProjected(cell.year) ? ' · PROJ' : ''}` : '—',
      },
      { label: 'Rank', value: rk ? `#${rk.rank}/${rk.n}` : '—' },
    ];
    if (s.inv) lines.push({ label: 'Note', value: '#1 = lowest (best)' });
    return { title: s.label, lines };
  };

  return (
    <section className="oecd-card oecd-profile-card" ref={cardRef}>
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">PROFILE</span>
          <h2 className="oecd-section-title oecd-num">{name}</h2>
        </div>
      </div>

      <div className="oecd-profile-groups">
        {groups.map(({ lens, series }) => (
          <div className="oecd-profile-group" key={lens.id}>
            <div className="oecd-profile-group-head">{lens.label}</div>
            {series.map((s) => {
              const cell = model.bySlug[s.slug]?.[a];
              const value = toNum(cell?.value);
              const rk = rankWithin(model, s.slug, a, { inv: s.inv });
              const isSel = s.slug === ind;
              return (
                <button
                  type="button"
                  key={s.slug}
                  className={`oecd-profile-row ${isSel ? 'is-selected' : ''}`}
                  onClick={() => onPickIndicator(s.slug)}
                  onMouseEnter={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(s)))}
                  onMouseMove={(e) => setTip(tipFromEvent(e, cardRef.current, payloadFor(s)))}
                  onMouseLeave={() => setTip(null)}
                  onFocus={(e) =>
                    setTip(tipFromElement(e.currentTarget, cardRef.current, payloadFor(s)))
                  }
                  onBlur={() => setTip(null)}
                  aria-pressed={isSel}
                >
                  <span className="oecd-profile-name">{s.label}</span>
                  <span
                    className={`oecd-profile-val oecd-num ${
                      s.signed && value != null && value < 0 ? 'is-neg' : ''
                    }`}
                  >
                    {formatValue(value, s)}
                  </span>
                  <span className="oecd-profile-rank oecd-num">
                    {rk ? `#${rk.rank}/${rk.n}` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="oecd-profile-foot">
        Rank chips read <span className="oecd-num">#n/N</span> where #1 is the best outcome — lowest
        for unemployment, inflation, rates and debt. N is the number of countries reporting that
        indicator.
      </p>
      <OecdTip tip={tip} />
    </section>
  );
}

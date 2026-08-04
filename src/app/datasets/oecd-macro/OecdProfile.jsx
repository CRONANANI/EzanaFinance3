'use client';

/**
 * Country profile — two modes (phase 4):
 *  - OECD: country A across all 20 indicators, grouped under the six lens headers,
 *    value + rank chip `#n/N`; #1 is the best outcome (inv indicators inverted).
 *  - EMPIRE: country A across the live power dimensions, grouped by category
 *    (Economic / Military & Resources / Social — whatever the backbone tags),
 *    score + rank chip `#n/N` across countries with data. Live-only.
 *
 * Ranks are computed client-side from data already in memory. Clicking an OECD
 * row retargets the ranking/history sections; empire rows are informational (no
 * indicator to retarget). Hover/focus raises a tooltip.
 */
import { useMemo, useRef, useState } from 'react';
import { OECD_LENSES, OECD_CURATED_SERIES } from '@/lib/oecd-curated';
import { formatValue, isProjected, toNum } from '@/lib/oecd-scales';
import { rankWithin } from './oecd-explorer-model';
import { empireRankWithin } from './oecd-empire-model';
import OecdTip, { tipFromEvent, tipFromElement } from './OecdTip';

export default function OecdProfile({
  model,
  a,
  ind,
  onPickIndicator,
  mode = 'oecd',
  empireModel = null,
}) {
  const cardRef = useRef(null);
  const [tip, setTip] = useState(null);
  const isEmpire = mode === 'empire' && empireModel;

  const oecdGroups = useMemo(
    () =>
      OECD_LENSES.map((lens) => ({
        key: lens.id,
        label: lens.label,
        series: OECD_CURATED_SERIES.filter((s) => s.lens === lens.id),
      })),
    [],
  );

  // Empire: group live dimensions by their category, preserving display order.
  const empireGroups = useMemo(() => {
    if (!isEmpire) return [];
    const byCat = new Map();
    for (const d of empireModel.liveDims) {
      const cat = d.category || 'Other';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(d);
    }
    return [...byCat.entries()].map(([label, dims]) => ({ key: label, label, dims }));
  }, [isEmpire, empireModel]);

  const name = isEmpire
    ? empireModel.nameByCode.get(a) || a
    : model.countries.find((c) => c.iso === a)?.name || a;

  // ── OECD tooltip / rows ────────────────────────────────────────────────────
  const oecdPayload = (s) => {
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

  const empirePayload = (dim) => {
    const raw = empireModel.scoreMap.get(a)?.get(dim.id);
    const rk = empireRankWithin(empireModel, dim, a);
    return {
      title: dim.name,
      lines: [
        { label: 'Score', value: raw == null ? '—' : raw.toFixed(0) },
        { label: 'Rank', value: rk ? `#${rk.rank}/${rk.n}` : '—' },
        {
          label: 'Direction',
          value: dim.higher_is_better === false ? 'lower = stronger' : 'higher = stronger',
        },
      ],
    };
  };

  return (
    <section className="oecd-card oecd-profile-card" ref={cardRef}>
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">PROFILE</span>
          <h2 className="oecd-section-title oecd-num">{name}</h2>
        </div>
      </div>

      {isEmpire ? (
        <div className="oecd-profile-groups">
          {empireGroups.map(({ key, label, dims }) => (
            <div className="oecd-profile-group" key={key}>
              <div className="oecd-profile-group-head">{label}</div>
              {dims.map((dim) => {
                const raw = empireModel.scoreMap.get(a)?.get(dim.id);
                const rk = empireRankWithin(empireModel, dim, a);
                return (
                  <button
                    type="button"
                    key={dim.id}
                    className="oecd-profile-row is-static"
                    onMouseEnter={(e) =>
                      setTip(tipFromEvent(e, cardRef.current, empirePayload(dim)))
                    }
                    onMouseMove={(e) =>
                      setTip(tipFromEvent(e, cardRef.current, empirePayload(dim)))
                    }
                    onMouseLeave={() => setTip(null)}
                    onFocus={(e) =>
                      setTip(tipFromElement(e.currentTarget, cardRef.current, empirePayload(dim)))
                    }
                    onBlur={() => setTip(null)}
                  >
                    <span className="oecd-profile-name">{dim.name}</span>
                    <span className="oecd-profile-val oecd-num">
                      {raw == null ? '—' : raw.toFixed(0)}
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
      ) : (
        <div className="oecd-profile-groups">
          {oecdGroups.map(({ key, label, series }) => (
            <div className="oecd-profile-group" key={key}>
              <div className="oecd-profile-group-head">{label}</div>
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
                    onMouseEnter={(e) => setTip(tipFromEvent(e, cardRef.current, oecdPayload(s)))}
                    onMouseMove={(e) => setTip(tipFromEvent(e, cardRef.current, oecdPayload(s)))}
                    onMouseLeave={() => setTip(null)}
                    onFocus={(e) =>
                      setTip(tipFromElement(e.currentTarget, cardRef.current, oecdPayload(s)))
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
      )}

      <p className="oecd-profile-foot">
        {isEmpire ? (
          <>
            Scores are the live Empire-Rankings backbone (0–100). Rank chips read #n/N; #1 is
            strongest across countries with data for that dimension.
          </>
        ) : (
          <>
            Rank chips read <span className="oecd-num">#n/N</span> where #1 is the best outcome —
            lowest for unemployment, inflation, rates and debt. N is the number of countries
            reporting that indicator.
          </>
        )}
      </p>
      <OecdTip tip={tip} />
    </section>
  );
}

'use client';

/**
 * Most held companies: the ten companies the most members still hold, as a
 * ranked column chart.
 *
 * One series, so one ink and no legend; the heading names it. Each column's
 * count sits on its cap in place of a y-axis, the ticker under it, and the
 * company, buys and last buy open in a tooltip on hover or focus. The list is
 * an ordered list of focusable items with full aria-labels, so a screen
 * reader gets the same ranking as a sighted reader without the chart.
 *
 * Holding is INFERRED (POSITION_BASIS_NOTE): disclosures report amount
 * ranges, not shares, so the count is members whose latest disclosed action
 * on the company is a purchase or partial sale.
 *
 * Plain HTML columns rather than a chart library: the labels stay crisp at
 * any width, the server and client render the same markup, and the column
 * heights are percentages, so nothing is measured.
 */
import { useState } from 'react';
import { companyLabel } from '@/lib/politicians/tracker-model';

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
};

export default function MostHeldChart({ items, loading = false }) {
  const [active, setActive] = useState(null);
  const top = (items || []).slice(0, 10);
  const max = top.length ? Math.max(...top.map((t) => t.holders || 0), 1) : 1;

  if (loading) {
    return (
      <div className="ptk-held-cols ptk-held-cols--skel" aria-busy="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="ptk-held-skel" style={{ height: `${92 - i * 7}%` }} />
        ))}
      </div>
    );
  }
  if (!top.length) {
    return <p className="dsc-note">No open positions inferred from the disclosures on file.</p>;
  }

  const tip = active != null ? top[active] : null;

  return (
    <div className="ptk-held-plot" onMouseLeave={() => setActive(null)}>
      <ol className="ptk-held-cols" aria-label="Most held companies, by members holding">
        {top.map((t, i) => {
          const name = companyLabel(t.company) || t.ticker;
          return (
            <li
              key={t.ticker}
              className={`ptk-held-col${active === i ? ' is-active' : ''}`}
              tabIndex={0}
              aria-label={`${i + 1}. ${name} (${t.ticker}): ${t.holders} member${
                t.holders === 1 ? '' : 's'
              } holding`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span className="ptk-held-n dsc-mn" aria-hidden="true">
                {t.holders}
              </span>
              <span className="ptk-held-slot" aria-hidden="true">
                <i style={{ height: `${Math.max(4, (t.holders / max) * 100)}%` }} />
              </span>
              <span className="ptk-held-tk dsc-mn" aria-hidden="true">
                {t.ticker}
              </span>
            </li>
          );
        })}
      </ol>

      {tip ? (
        /* Anchored over the active column, clamped to the plot's edges. */
        <div
          className="ptk-held-tip"
          role="presentation"
          style={{
            left: `${((active + 0.5) / top.length) * 100}%`,
            '--ptk-tip-shift': active < 2 ? '0%' : active > top.length - 3 ? '-100%' : '-50%',
          }}
        >
          <span className="ptk-held-tip-name">{companyLabel(tip.company) || tip.ticker}</span>
          <span className="ptk-held-tip-row dsc-mn">
            {tip.ticker} · {tip.holders} holding
          </span>
          {tip.buys ? (
            <span className="ptk-held-tip-row dsc-mn">{tip.buys} disclosed buys</span>
          ) : null}
          {fmtDate(tip.lastBuy) ? (
            <span className="ptk-held-tip-row dsc-mn">last buy {fmtDate(tip.lastBuy)}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

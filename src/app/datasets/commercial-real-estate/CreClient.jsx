'use client';

/**
 * Commercial Real Estate Activity: one card per FRED series loaded for the
 * `cre` dataset, grouped into prices, credit and construction. Selecting a
 * card opens its 10-year chart. Market-wide indicators, not property data.
 */
import { useMemo, useState } from 'react';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import {
  DASH,
  SeriesChart,
  Sparkline,
  fmtCompact,
  fmtDate,
  fmtNum,
  fmtSigned,
  pctChange,
  tone,
} from '@/components/datasets/eyes/eyes-bits';
import './commercial-real-estate.css';

const GROUPS = [
  { id: 'prices', title: 'Prices', ids: ['COMREPUSQ159N', 'BOGZ1FL075035503Q'] },
  { id: 'credit', title: 'Credit', ids: ['CREACBW027SBOG', 'DRCRELEXFACBS'] },
  {
    id: 'construction',
    title: 'Construction',
    ids: ['TLNRESCONS', 'TLCOMCONS', 'PRMFGCONS', 'TLOFCONS'],
  },
];

/* A rate (% or percent) changes in percentage points, a level in percent. */
const isRate = (units) => /%|percent/i.test(String(units || ''));

function stats(s) {
  const pts = s.points;
  const last = pts[pts.length - 1];
  if (!last) return null;
  const prev = pts[pts.length - 2];
  const yearAgoCut = new Date(Date.parse(last.date) - 360 * 86400000).toISOString().slice(0, 10);
  const yearAgo = [...pts].reverse().find((p) => p.date <= yearAgoCut);
  const rate = isRate(s.units);
  const diff = (a, b) => (a == null || b == null ? null : rate ? a - b : pctChange(a, b));
  return {
    last,
    rate,
    vsPrior: diff(last.value, prev?.value),
    vsYear: diff(last.value, yearAgo?.value),
  };
}

const fmtChange = (v, rate) => (v == null ? null : rate ? fmtSigned(v, 2, ' pts') : fmtSigned(v));

function fmtValue(v, units) {
  if (v == null) return DASH;
  if (isRate(units)) return `${fmtNum(v, 2)}%`;
  return fmtCompact(v, 2);
}

function Delta({ v, rate, label }) {
  return (
    <span>
      {label}{' '}
      {v == null ? (
        <span className="cre-muted">{DASH}</span>
      ) : (
        <span className={`cre-mono cre-${tone(v)}`}>{fmtChange(v, rate)}</span>
      )}
    </span>
  );
}

export default function CreClient({ data, error }) {
  const series = useMemo(() => data?.series || [], [data]);
  const byId = useMemo(() => new Map(series.map((s) => [s.id, s])), [series]);
  const grouped = GROUPS.map((g) => ({
    ...g,
    list: g.ids.map((id) => byId.get(id)).filter((s) => s?.points?.length),
  }));
  const known = new Set(GROUPS.flatMap((g) => g.ids));
  const other = series.filter((s) => !known.has(s.id) && s.points?.length);
  if (other.length) grouped.push({ id: 'other', title: 'Other indicators', list: other });

  const [openId, setOpenId] = useState(null);
  const open = openId ? byId.get(openId) : null;

  const tickerItems = useMemo(
    () =>
      series
        .filter((s) => s.points?.length)
        .map((s) => {
          const st = stats(s);
          return {
            id: s.id,
            lead: s.frequency || 'FRED',
            main: s.title,
            value: fmtValue(st?.last?.value, s.units),
          };
        }),
    [series],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Commercial real estate indicators' });

  return (
    <div className="cre-page">
      <header className="cre-header">
        <p className="cre-eyebrow">DATASETS · EYES ABOVE</p>
        <h1 className="cre-title">Commercial Real Estate Activity</h1>
        <p className="cre-sub">
          Prices, bank credit, loan delinquency and construction spending for U.S. commercial real
          estate as a whole.
        </p>
        {data?.through ? (
          <p className="cre-through">
            Data through <strong>{fmtDate(data.through)}</strong>
          </p>
        ) : null}
      </header>

      <HubQueryLink dimension="eyes" />

      {error ? (
        <p className="cre-empty" role="alert">
          Commercial real estate data could not be loaded right now. Please try again shortly.
        </p>
      ) : !series.length ? (
        <p className="cre-empty">
          No commercial real estate series are loaded yet. They load daily from FRED.
        </p>
      ) : (
        <>
          {open ? (
            <section
              className="cre-section cre-card"
              aria-labelledby="cre-open-h"
              aria-live="polite"
            >
              <div
                className="cre-controls"
                style={{ marginTop: 0, justifyContent: 'space-between' }}
              >
                <h2 id="cre-open-h" className="cre-section-title">
                  {open.title}
                </h2>
                <button type="button" className="cre-btn" onClick={() => setOpenId(null)}>
                  <i className="bi bi-x-lg" aria-hidden="true" /> Close
                </button>
              </div>
              <p className="cre-note">
                <span className="cre-mono">{open.id}</span> · {open.frequency || DASH} ·{' '}
                {open.units || DASH} · last 10 years
              </p>
              <SeriesChart
                data={open.points}
                lines={[{ key: 'value', label: open.units || 'Value', stroke: 'var(--cyan)' }]}
                yFmt={(v) => (isRate(open.units) ? `${fmtNum(v, 1)}%` : fmtCompact(v, 1))}
                xFmt={(d) => String(d).slice(0, 4)}
                zeroLine={isRate(open.units)}
                height={300}
                label={`${open.title}, ${open.frequency || ''}, last 10 years`}
              />
            </section>
          ) : null}

          {grouped
            .filter((g) => g.list.length)
            .map((g) => (
              <section key={g.id} className="cre-section" aria-labelledby={`cre-g-${g.id}`}>
                <h2 id={`cre-g-${g.id}`} className="cre-section-title">
                  {g.title}
                </h2>
                <div className="cre-cards" style={{ marginTop: 10 }}>
                  {g.list.map((s) => {
                    const st = stats(s);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`cre-scard${openId === s.id ? ' is-active' : ''}`}
                        onClick={() => setOpenId(openId === s.id ? null : s.id)}
                        aria-pressed={openId === s.id}
                        aria-label={`${s.title}: open the 10-year chart`}
                      >
                        <span className="cre-scard-title">{s.title}</span>
                        <span className="cre-scard-value">
                          {fmtValue(st?.last?.value, s.units)}
                          {!isRate(s.units) && s.units ? (
                            <span className="cre-muted"> {s.units}</span>
                          ) : null}
                        </span>
                        <span className="cre-scard-meta">
                          <span className="cre-mono">{fmtDate(st?.last?.date) || DASH}</span>
                          <span>{s.frequency || ''}</span>
                        </span>
                        <span className="cre-scard-meta">
                          <Delta v={st?.vsPrior} rate={st?.rate} label="vs prior" />
                          <Delta v={st?.vsYear} rate={st?.rate} label="vs year ago" />
                        </span>
                        <Sparkline
                          className="cre-spark"
                          values={s.points.slice(-40).map((p) => p.value)}
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
        </>
      )}

      <footer className="cre-foot">
        <p>
          Market-wide indicators from the Federal Reserve, BIS and Census via FRED; not
          property-level data.
        </p>
        <p>
          Sources: Federal Reserve Board (H.8 bank credit, Z.1 financial accounts, charge-off and
          delinquency rates); Bank for International Settlements, commercial property prices; U.S.
          Census Bureau, construction spending; all via FRED, Federal Reserve Bank of St. Louis.
        </p>
      </footer>
    </div>
  );
}

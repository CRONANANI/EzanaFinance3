'use client';

/**
 * The full-width technical chart of an adaptive report: price (candles when
 * the range is short enough to read them, the close line otherwise) with the
 * 20, 50 and 200-session averages, a volume pane, and a 14-session RSI pane
 * with the 30 and 70 lines.
 *
 * It draws only what the report carries: real daily bars and indicator
 * values computed on the server (src/lib/sonar/adaptive/technical.js). A
 * value the lookback could not support arrives as null and is simply not
 * drawn. There is no client-side arithmetic beyond scaling to pixels.
 *
 * Inline SVG, no chart library; axis labels are HTML so they stay crisp at
 * full canvas width. Styles: sonar-adaptive.css (sar-).
 */
import { useMemo, useState } from 'react';
import { dayLabel } from '../exemplary/SonarExemplaryChart';

const W = 1000;
const RANGES = [
  ['1M', 22],
  ['3M', 64],
  ['6M', 127],
  ['1Y', 260],
];
const OVERLAYS = [
  ['sma20', '20'],
  ['sma50', '50'],
  ['sma200', '200'],
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function niceTicks(lo, hi, count = 4) {
  const raw = (hi - lo) / count || 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step)
    out.push(Number(v.toFixed(6)));
  return out;
}
const money = (v) =>
  v == null
    ? 'N/A'
    : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compact = (v) =>
  v == null
    ? 'N/A'
    : v >= 1e9
      ? `${(v / 1e9).toFixed(2)}B`
      : v >= 1e6
        ? `${(v / 1e6).toFixed(1)}M`
        : v >= 1e3
          ? `${(v / 1e3).toFixed(0)}K`
          : String(v);

export default function SonarTechnicalChart({ section }) {
  const { series, capabilities, symbol, label, asOf, rsi } = section;
  const available = RANGES.filter(
    ([, n], i) => series.length >= n || i === 0 || series.length > RANGES[i - 1][1],
  );
  const [range, setRange] = useState(
    available.some(([k]) => k === '6M') ? '6M' : available[available.length - 1][0],
  );
  const [shown, setShown] = useState({ sma20: false, sma50: true, sma200: true });
  const [at, setAt] = useState(null);

  const pts = useMemo(() => {
    const n = RANGES.find(([k]) => k === range)?.[1] || series.length;
    return series.slice(-n);
  }, [series, range]);
  const n = pts.length;
  const candles = capabilities.ohlc && n <= 130;
  const slot = W / n;
  const x = (i) => (i + 0.5) * slot;

  const price = useMemo(() => {
    const H = 300;
    const vals = pts
      .flatMap((p) => [
        candles ? p.high : p.close,
        candles ? p.low : p.close,
        ...OVERLAYS.filter(([k]) => shown[k]).map(([k]) => p[k]),
      ])
      .filter((v) => v != null);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const pad = (hi - lo) * 0.06 || 1;
    lo -= pad;
    hi += pad;
    const y = (v) => (1 - (v - lo) / (hi - lo)) * H;
    const line = (key) => {
      let d = '';
      let pen = false;
      pts.forEach((p, i) => {
        if (p[key] == null) {
          pen = false;
          return;
        }
        d += `${pen ? 'L' : 'M'}${x(i)},${y(p[key])}`;
        pen = true;
      });
      return d;
    };
    return { H, y, line, ticks: niceTicks(lo, hi).map((v) => ({ v, top: (y(v) / H) * 100 })) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts, shown, candles]);

  const volume = useMemo(() => {
    if (!capabilities.volume) return null;
    const H = 64;
    const max = Math.max(...pts.map((p) => p.volume || 0)) || 1;
    return { H, max, h: (v) => ((v || 0) / max) * H };
  }, [pts, capabilities.volume]);

  const R = { H: 96, y: (v) => (1 - v / 100) * 96 };
  const rsiPath = useMemo(() => {
    let d = '';
    let pen = false;
    pts.forEach((p, i) => {
      if (p.rsi14 == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i)},${R.y(p.rsi14)}`;
      pen = true;
    });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts]);

  const xTicks = useMemo(() => {
    const out = [];
    if (n > 45) {
      pts.forEach((p, i) => {
        if (i && p.date.slice(0, 7) !== pts[i - 1].date.slice(0, 7))
          out.push({ left: (x(i) / W) * 100, label: MONTHS[Number(p.date.slice(5, 7)) - 1] });
      });
      const every = Math.max(1, Math.ceil(out.length / 8));
      return out.filter((_, k) => k % every === 0);
    }
    for (let k = 0; k < 5; k += 1) {
      const i = Math.round((k / 4) * (n - 1));
      out.push({ left: (x(i) / W) * 100, label: dayLabel(pts[i].date, { year: false }) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pts]);

  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - box.left) / box.width) * n);
    setAt(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setAt((cur) => Math.max(0, Math.min(n - 1, (cur ?? (step > 0 ? -1 : n)) + step)));
    } else if (e.key === 'Home') setAt(0);
    else if (e.key === 'End') setAt(n - 1);
    else if (e.key === 'Escape') setAt(null);
  };
  const p = at == null ? null : pts[at];
  const last = pts[n - 1];
  const first = pts[0];
  const summary = `${label} daily prices from ${dayLabel(first.date)} to ${dayLabel(last.date)}. Latest close ${money(last.close)}${
    rsi?.value != null ? `, 14-session RSI ${rsi.value}` : ''
  }.`;
  const crossLeft = at == null ? null : (x(at) / W) * 100;

  return (
    <div className="sar-tech">
      <div className="sxb-section-top">
        <div>
          <p className="sxb-kicker">Price and indicators</p>
          <h2 className="sxb-section-title">{label}</h2>
        </div>
        <div className="sar-tech-controls">
          <div className="sxb-ranges" role="group" aria-label="Moving averages">
            <span className="sar-tech-controls-label">Averages</span>
            {OVERLAYS.map(([key, text]) =>
              key === 'sma200' && !capabilities.sma200 ? null : (
                <button
                  key={key}
                  type="button"
                  className={`sxb-range sar-ov sar-ov--${key}`}
                  aria-pressed={shown[key]}
                  onClick={() => setShown((s) => ({ ...s, [key]: !s[key] }))}
                >
                  {text}
                </button>
              ),
            )}
          </div>
          <div className="sxb-ranges" role="group" aria-label="Chart range">
            {available.map(([key]) => (
              <button
                key={key}
                type="button"
                className="sxb-range"
                aria-pressed={key === range}
                onClick={() => {
                  setRange(key);
                  setAt(null);
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="sar-tech-grid"
        role="img"
        tabIndex={0}
        aria-label={summary}
        onPointerMove={pick}
        onPointerLeave={() => setAt(null)}
        onKeyDown={onKey}
        onBlur={() => setAt(null)}
      >
        <div className="sar-tech-y" aria-hidden="true">
          {price.ticks.map((t) => (
            <span key={t.v} style={{ top: `${t.top}%` }}>
              {t.v >= 1000 ? Math.round(t.v).toLocaleString('en-US') : t.v}
            </span>
          ))}
        </div>
        <div className="sar-tech-pane sar-tech-pane--price">
          <svg viewBox={`0 0 ${W} ${price.H}`} preserveAspectRatio="none" aria-hidden="true">
            {price.ticks.map((t) => (
              <line
                key={t.v}
                className="sxb-chart-grid"
                x1="0"
                x2={W}
                y1={(t.top / 100) * price.H}
                y2={(t.top / 100) * price.H}
              />
            ))}
            {candles ? (
              pts.map((b, i) => {
                const up = b.close >= b.open;
                const top = price.y(Math.max(b.open, b.close));
                const bot = price.y(Math.min(b.open, b.close));
                return (
                  <g
                    key={b.date}
                    className={up ? 'sar-candle sar-candle--up' : 'sar-candle sar-candle--down'}
                  >
                    <line x1={x(i)} x2={x(i)} y1={price.y(b.high)} y2={price.y(b.low)} />
                    <rect
                      x={x(i) - slot * 0.32}
                      width={slot * 0.64}
                      y={top}
                      height={Math.max(bot - top, 0.6)}
                    />
                  </g>
                );
              })
            ) : (
              <path className="sxb-chart-subject" d={price.line('close')} />
            )}
            {OVERLAYS.map(([key]) =>
              shown[key] ? (
                <path key={key} className={`sar-line sar-line--${key}`} d={price.line(key)} />
              ) : null,
            )}
          </svg>
          {crossLeft != null ? (
            <span className="sar-cross" style={{ left: `${crossLeft}%` }} aria-hidden="true" />
          ) : null}
          {p ? (
            <div
              className={`sxb-chart-tip${crossLeft > 68 ? ' is-right' : ''}`}
              style={{ left: `${crossLeft}%` }}
              aria-hidden="true"
            >
              <span className="sxb-chart-tipdate">{dayLabel(p.date)}</span>
              {capabilities.ohlc ? (
                <span>
                  O {money(p.open)} H {money(p.high)} L {money(p.low)}
                </span>
              ) : null}
              <span>Close {money(p.close)}</span>
              {capabilities.volume ? <span>Volume {compact(p.volume)}</span> : null}
              {p.rsi14 != null ? <span>RSI {p.rsi14}</span> : null}
              {OVERLAYS.map(([key, text]) =>
                shown[key] && p[key] != null ? (
                  <span key={key}>
                    Avg {text} {money(p[key])}
                  </span>
                ) : null,
              )}
            </div>
          ) : null}
        </div>

        {volume ? (
          <>
            <div className="sar-tech-y sar-tech-y--label" aria-hidden="true">
              <span>Vol</span>
            </div>
            <div className="sar-tech-pane sar-tech-pane--volume">
              <svg viewBox={`0 0 ${W} ${volume.H}`} preserveAspectRatio="none" aria-hidden="true">
                {pts.map((b, i) => (
                  <rect
                    key={b.date}
                    className={
                      b.close >= (b.open ?? b.close)
                        ? 'sar-vol sar-vol--up'
                        : 'sar-vol sar-vol--down'
                    }
                    x={x(i) - slot * 0.32}
                    width={slot * 0.64}
                    y={volume.H - volume.h(b.volume)}
                    height={volume.h(b.volume)}
                  />
                ))}
              </svg>
              {crossLeft != null ? (
                <span className="sar-cross" style={{ left: `${crossLeft}%` }} aria-hidden="true" />
              ) : null}
            </div>
          </>
        ) : null}

        <div className="sar-tech-y sar-tech-y--rsi" aria-hidden="true">
          <span style={{ top: `${(R.y(70) / R.H) * 100}%` }}>70</span>
          <span style={{ top: `${(R.y(30) / R.H) * 100}%` }}>30</span>
        </div>
        <div className="sar-tech-pane sar-tech-pane--rsi">
          <svg viewBox={`0 0 ${W} ${R.H}`} preserveAspectRatio="none" aria-hidden="true">
            <rect className="sar-rsi-band" x="0" width={W} y={R.y(70)} height={R.y(30) - R.y(70)} />
            <line className="sar-rsi-rule" x1="0" x2={W} y1={R.y(70)} y2={R.y(70)} />
            <line className="sar-rsi-rule" x1="0" x2={W} y1={R.y(30)} y2={R.y(30)} />
            <path className="sar-rsi-line" d={rsiPath} />
          </svg>
          <span className="sar-pane-label">
            RSI (14){rsi?.value != null ? ` ${rsi.value}` : ''}
          </span>
          {crossLeft != null ? (
            <span className="sar-cross" style={{ left: `${crossLeft}%` }} aria-hidden="true" />
          ) : null}
        </div>

        <div />
        <div className="sxb-chart-x" aria-hidden="true">
          {xTicks.map((t) => (
            <span key={`${t.left}-${t.label}`} style={{ left: `${t.left}%` }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="sxb-legend">
        <span>
          <i className="sxb-swatch" aria-hidden="true" />
          {symbol} {candles ? 'daily candles' : 'close'}
        </span>
        {OVERLAYS.map(([key, text]) =>
          shown[key] ? (
            <span key={key}>
              <i className={`sxb-swatch sar-swatch--${key}`} aria-hidden="true" />
              {text}-session average
            </span>
          ) : null,
        )}
        <span className="sxb-legend-note">Computed from daily bars</span>
      </div>
      <div className="sxb-chart-note">
        <span>
          Daily bars through {dayLabel(asOf)}. {section.adjustment}
        </span>
        <span>RSI shaded band: 30 to 70</span>
      </div>
      <p className="sxb-sr" aria-live="polite">
        {p
          ? `${dayLabel(p.date)}: close ${money(p.close)}${p.rsi14 != null ? `, RSI ${p.rsi14}` : ''}`
          : ''}
      </p>
    </div>
  );
}

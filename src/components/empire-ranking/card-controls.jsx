'use client';

/**
 * Shared toggle primitives for Empire Rankings cards.
 *
 * The prompt asked for a Tailwind/shadcn-flavored surface-token system
 * (`EmpireCard`, `CardPrimary`, `CardMuted`, Radix dropdowns, etc.).
 * The actual page uses a single CSS shell (`.er-card`) with hand-tuned
 * gold-on-dark tokens + a `body.light-mode` override system, so the
 * design philosophy is the same but the implementation rides on CSS
 * classes and variables instead of Tailwind utilities.
 *
 * What you get from this module:
 *   <CardControls>     — the header-adjacent toggle row (wraps on narrow)
 *   <ToggleChips>      — 2–4 discrete options (timeframe, scale, sort)
 *   <ToggleSelect>     — dropdown for longer lists (countries, metrics)
 *   <ToggleMultiSelect>— checkbox dropdown for N-of-M choices
 *   <YearSlider>       — year-scrubbing slider
 *   <DeltaText>        — ± colored number that adapts to the surface
 *   useEmpireChartTokens() — theme-aware hex colors for Recharts props
 *                           (Recharts can't consume CSS vars, so we observe
 *                            body.light-mode and hand it real hex strings)
 */

import { useEffect, useMemo, useRef, useState } from 'react';

const DARK_TOKENS = Object.freeze({
  axisTick: '#9ca3af',
  axisTickMuted: '#9ca3af',
  axisTickEmphasis: '#e2e8f0',
  grid: 'rgba(255,255,255,0.06)',
  gridStrong: 'rgba(255,255,255,0.1)',
  legend: '#cbd5e1',
  tooltipBg: '#161b22',
  tooltipBorder: 'rgba(212, 175, 55, 0.25)',
  tooltipText: '#e2e8f0',
  referenceAccent: '#d4af37',
});

const LIGHT_TOKENS = Object.freeze({
  axisTick: '#4b5563',
  axisTickMuted: '#6b7280',
  axisTickEmphasis: '#111827',
  grid: 'rgba(17,24,39,0.08)',
  gridStrong: 'rgba(17,24,39,0.14)',
  legend: '#374151',
  tooltipBg: '#ffffff',
  tooltipBorder: 'rgba(212, 175, 55, 0.4)',
  tooltipText: '#111827',
  referenceAccent: '#b3902f',
});

/**
 * Hook that returns chart token hex strings that flip with the global
 * `body.light-mode` class. Recharts props (`tick`, `stroke`, `contentStyle`)
 * can't reference CSS variables, so we resolve them in JS.
 */
export function useEmpireChartTokens() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const check = () => setIsLight(document.body.classList.contains('light-mode'));
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  const tokens = isLight ? LIGHT_TOKENS : DARK_TOKENS;
  return useMemo(
    () => ({
      ...tokens,
      tooltipStyle: {
        background: tokens.tooltipBg,
        border: `1px solid ${tokens.tooltipBorder}`,
        borderRadius: 8,
        fontSize: '0.72rem',
        color: tokens.tooltipText,
      },
    }),
    [tokens],
  );
}

/**
 * Normalizes `options` to `[{ value, label }]` regardless of whether the
 * caller passed a bare list (`['1Y', '5Y', '10Y']`) or objects.
 */
function normalizeOptions(options) {
  if (!options?.length) return [];
  if (typeof options[0] === 'object' && options[0] !== null && 'value' in options[0]) {
    return options;
  }
  return options.map((v) => ({ value: v, label: String(v) }));
}

/** Header-adjacent control row. Always wraps; never horizontally scrolls. */
export function CardControls({ children, className = '' }) {
  return <div className={`er-controls ${className}`.trim()}>{children}</div>;
}

/**
 * Row of chips. Use for ≤ ~5 discrete options. When `label` is set it's
 * rendered inline to the left so the chip row reads as "Timeframe: [1Y][5Y]…".
 */
export function ToggleChips({ options, value, onChange, label, ariaLabel }) {
  const opts = normalizeOptions(options);
  return (
    <div className="er-control-group" role="group" aria-label={ariaLabel || label}>
      {label && <span className="er-control-label">{label}</span>}
      <div className="er-chip-group" role="tablist">
        {opts.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="tab"
              aria-selected={active}
              className={`er-chip ${active ? 'er-chip--active' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Native <select> styled to match .er-select. Best for long option lists. */
export function ToggleSelect({ options, value, onChange, label, ariaLabel }) {
  const opts = normalizeOptions(options);
  return (
    <div className="er-control-group">
      {label && <span className="er-control-label">{label}</span>}
      <select
        className="er-select er-select--chip"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel || label}
      >
        {opts.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Checkbox dropdown for multi-select (e.g. "which countries to overlay").
 * Rolled by hand — the project doesn't use Radix DropdownMenu on this page
 * and pulling it in just for this control would be disproportionate.
 */
export function ToggleMultiSelect({ options, values, onChange, label, placeholder = 'None' }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const opts = normalizeOptions(options);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (ev) => {
      if (popRef.current?.contains(ev.target)) return;
      if (triggerRef.current?.contains(ev.target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('touchstart', handler);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const summary =
    values.length === 0
      ? placeholder
      : values.length === opts.length
        ? 'All'
        : `${values.length} selected`;

  const toggle = (val) => {
    if (values.includes(val)) onChange(values.filter((v) => v !== val));
    else onChange([...values, val]);
  };

  return (
    <div className="er-control-group er-control-group--menu">
      {label && <span className="er-control-label">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        className="er-select er-select--chip er-multiselect-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{summary}</span>
        <i className="bi bi-chevron-down" aria-hidden />
      </button>
      {open && (
        <div ref={popRef} className="er-multiselect-menu" role="listbox">
          {opts.map((opt) => {
            const checked = values.includes(opt.value);
            return (
              <label key={String(opt.value)} className="er-multiselect-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Year scrubber. Bounds are inclusive. */
export function YearSlider({ min, max, value, onChange, label = 'Year' }) {
  const clamped = Math.max(min, Math.min(max, Number.isFinite(value) ? value : max));
  return (
    <div className="er-control-group er-control-group--slider">
      {label && <span className="er-control-label">{label}</span>}
      <span className="er-slider-end">{min}</span>
      <input
        type="range"
        className="er-slider"
        min={min}
        max={max}
        step={1}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <span className="er-slider-value">{clamped}</span>
    </div>
  );
}

/**
 * Value-coloured text (gain/loss). The callsite decides what "positive"
 * means — pass `value` as a signed number. Children render inside so
 * callers control formatting (e.g. "+3.1%" vs "▲ 3.1").
 */
export function DeltaText({ value, children, className = '' }) {
  const dir = value >= 0 ? 'up' : 'down';
  return (
    <span className={`er-delta er-delta--${dir} ${className}`.trim()}>{children}</span>
  );
}

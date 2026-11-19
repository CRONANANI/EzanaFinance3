'use client';

/**
 * CalculatorWidget: sliders and exact number fields on one side, live
 * results on the other, with an optional proportion bar for the parts of
 * the headline number. Ported from the chatcn calculator widget (21st.dev)
 * to the Ezana stack: plain JS, scoped CSS on house tokens, Bootstrap Icons.
 *
 * Formulas are plain arithmetic over input names and earlier outputs,
 * evaluated by a tiny recursive descent parser (no eval, no globals):
 *   + - * / % ^, parentheses, and min max round floor ceil abs sqrt pow log exp.
 *
 * Props
 *   title, description
 *   inputs:    [{ name, label, min, max, step?, defaultValue?, format?, unit?, hint? }]
 *   outputs:   [{ name, label, formula?, format?, unit?, primary?, hint?, hidden? }]
 *   breakdown: [{ label, formula }]  parts of the primary, drawn as a bar
 *   compute(values): optional, returns { [outputName]: number }, wins over formula
 *   values / defaultValues / onValuesChange: controlled or uncontrolled
 *   onSubmit(values, results), submitLabel, submitIcon
 *   currency ('USD'), locale ('en-US'), loading
 *   format: 'number' | 'currency' | 'percent' | 'integer'
 */

import { useEffect, useId, useMemo, useState } from 'react';
import './calculator-widget.css';

/* ── Formula evaluation ─────────────────────────────────────────────────── */

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) i += 1;
    else if (/[0-9.]/.test(c)) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new Error(`Unexpected "${c}"`);
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
    } else if ('+-*/%^(),'.includes(c)) {
      out.push({ t: 'op', v: c });
      i += 1;
    } else throw new Error(`Unexpected "${c}"`);
  }
  return out;
}

const FUNCTIONS = {
  min: Math.min,
  max: Math.max,
  round: (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d,
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,
  log: Math.log,
  exp: Math.exp,
};

export function evaluateFormula(formula, scope) {
  const tokens = tokenize(formula);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek()?.t === 'op' && peek()?.v === v;
  const take = (v) => {
    const tok = tokens[pos];
    if (!tok || (v !== undefined && tok.v !== v)) throw new Error(`Expected "${v ?? 'value'}"`);
    pos += 1;
    return tok;
  };
  const expr = () => {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = take().v;
      const right = term();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };
  const term = () => {
    let left = unary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = take().v;
      const right = unary();
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  };
  const unary = () => {
    if (isOp('-')) {
      take();
      return -unary();
    }
    if (isOp('+')) {
      take();
      return unary();
    }
    return power();
  };
  const power = () => {
    const base = atom();
    if (isOp('^')) {
      take();
      return base ** unary();
    }
    return base;
  };
  const atom = () => {
    const tok = take();
    if (tok.t === 'num') return tok.v;
    if (tok.t === 'id') {
      if (isOp('(')) {
        const fn = FUNCTIONS[tok.v];
        if (!fn) throw new Error(`Unknown function "${tok.v}"`);
        take('(');
        const args = [];
        if (peek()?.v !== ')') {
          args.push(expr());
          while (peek()?.v === ',') {
            take(',');
            args.push(expr());
          }
        }
        take(')');
        return fn(...args);
      }
      if (tok.v === 'PI') return Math.PI;
      if (!(tok.v in scope)) throw new Error(`Unknown name "${tok.v}"`);
      return scope[tok.v];
    }
    if (tok.v === '(') {
      const v = expr();
      take(')');
      return v;
    }
    throw new Error(`Unexpected "${tok.v}"`);
  };
  const value = expr();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos]?.v}"`);
  return value;
}

/* ── Results ────────────────────────────────────────────────────────────── */

function useResults(inputs, outputs, breakdown, values, compute) {
  return useMemo(() => {
    const scope = {};
    inputs.forEach((input) => {
      scope[input.name] = values[input.name] ?? input.defaultValue ?? input.min;
    });
    const computed = compute ? compute({ ...scope }) : {};
    const results = {};
    const errors = {};
    /* Outputs may reference each other in any order, so evaluate in passes
       until nothing new resolves. */
    let pending = outputs;
    for (let pass = 0; pass <= outputs.length && pending.length > 0; pass += 1) {
      const next = [];
      pending.forEach((out) => {
        if (out.name in computed) results[out.name] = computed[out.name];
        else if (out.formula) {
          try {
            results[out.name] = evaluateFormula(out.formula, scope);
            delete errors[out.name];
          } catch (err) {
            errors[out.name] = err instanceof Error ? err.message : 'Invalid formula';
            next.push(out);
          }
        }
        if (out.name in results) scope[out.name] = results[out.name];
      });
      if (next.length === pending.length) break;
      pending = next;
    }
    const parts = breakdown.flatMap((b) => {
      try {
        return [{ label: b.label, value: evaluateFormula(b.formula, scope) }];
      } catch {
        return [];
      }
    });
    return { results, errors, parts };
  }, [inputs, outputs, breakdown, values, compute]);
}

const NBSP = ' ';

export function formatNumber(value, format = 'number', { currency = 'USD', locale = 'en-US', unit } = {}) {
  if (!Number.isFinite(value)) return '-';
  let text;
  if (format === 'currency') {
    text = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    }).format(value);
  } else if (format === 'percent') {
    text = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`;
  } else if (format === 'integer') {
    text = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
  } else {
    text = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  }
  return unit ? `${text}${NBSP}${unit}` : text;
}

function clamp(v, input) {
  const step = input.step ?? 1;
  const snapped = Math.round((v - input.min) / step) * step + input.min;
  return Math.min(input.max, Math.max(input.min, Number(snapped.toFixed(10))));
}

/* ── Exact entry next to the slider ─────────────────────────────────────── */

function NumberField({ input, value, onCommit, label, currency = 'USD', locale = 'en-US' }) {
  const [draft, setDraft] = useState(null);
  const prefix =
    input.format === 'currency'
      ? (new Intl.NumberFormat(locale, { style: 'currency', currency })
          .formatToParts(0)
          .find((p) => p.type === 'currency')?.value ?? '')
      : '';
  const suffix = input.format === 'percent' ? '%' : input.unit || '';
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(/[^0-9.-]/g, ''));
    if (draft.trim() !== '' && Number.isFinite(n)) onCommit(n);
    setDraft(null);
  };
  return (
    <span className="calc-field">
      {prefix ? <span className="calc-field-affix">{prefix}</span> : null}
      <input
        aria-label={label}
        inputMode="decimal"
        value={draft ?? new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(value)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) commit();
          if (e.key === 'Escape') setDraft(null);
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            onCommit(clamp(value + (e.key === 'ArrowUp' ? 1 : -1) * (input.step ?? 1), input));
          }
        }}
        className="calc-field-input"
      />
      {suffix ? <span className="calc-field-affix">{suffix}</span> : null}
    </span>
  );
}

/* ── Slider: a native range over a drawn track (keyboard and touch stay native) */

function Slider({ input, value, id, onChange, valueText }) {
  const pct = ((value - input.min) / (input.max - input.min || 1)) * 100;
  return (
    <span className="calc-slider" style={{ '--calc-pct': `${pct}%` }}>
      <span aria-hidden="true" className="calc-slider-track" />
      <span aria-hidden="true" className="calc-slider-fill" />
      <span aria-hidden="true" className="calc-slider-thumb" />
      <input
        id={id}
        type="range"
        min={input.min}
        max={input.max}
        step={input.step ?? 1}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calc-slider-input"
      />
    </span>
  );
}

/* ── Proportion bar: one 100% bar, small gaps, labelled rows underneath ── */

const SWATCH = ['calc-sw-1', 'calc-sw-2', 'calc-sw-3', 'calc-sw-4', 'calc-sw-5'];

function ProportionBar({ items, format }) {
  const positive = items.filter((it) => it.value > 0);
  const total = positive.reduce((n, it) => n + it.value, 0);
  const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });
  return (
    <div className="calc-prop">
      <div className="calc-prop-bar">
        {total === 0 ? (
          <span className="calc-prop-empty" />
        ) : (
          positive.map((it) => (
            <span
              key={it.label}
              className={`calc-prop-seg ${SWATCH[items.indexOf(it) % SWATCH.length]}`}
              style={{ flexBasis: `calc(${(it.value / total) * 100}% - 2px)` }}
            />
          ))
        )}
      </div>
      <ul className="calc-prop-list">
        {items.map((it, i) => (
          <li key={it.label}>
            <span className={`calc-prop-key ${SWATCH[i % SWATCH.length]}`} aria-hidden="true" />
            <span className="calc-prop-label">{it.label}</span>
            <span className="calc-prop-pct">
              {total > 0 ? pct.format(Math.max(0, it.value) / total) : '-'}
            </span>
            <span className="calc-prop-val">{format(it.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── CalculatorWidget ───────────────────────────────────────────────────── */

export function CalculatorWidget({
  title,
  description,
  inputs: inputsProp,
  outputs: outputsProp,
  breakdown: breakdownProp,
  compute,
  values: valuesProp,
  defaultValues,
  onValuesChange,
  onSubmit,
  submitLabel = 'Use these numbers',
  submitIcon = 'bi-send',
  footnote,
  currency,
  locale,
  loading = false,
  className = '',
}) {
  const inputs = useMemo(
    () =>
      (inputsProp ?? []).filter(
        (i) => i && typeof i.name === 'string' && typeof i.min === 'number' && typeof i.max === 'number',
      ),
    [inputsProp],
  );
  const outputs = useMemo(
    () => (outputsProp ?? []).filter((o) => o && typeof o.name === 'string' && o.label),
    [outputsProp],
  );
  const breakdown = useMemo(
    () => (breakdownProp ?? []).filter((b) => b?.label && typeof b.formula === 'string'),
    [breakdownProp],
  );
  const [state, setState] = useState(() => ({ ...defaultValues }));
  const values = valuesProp ?? state;
  const inputValue = (input) => values[input.name] ?? input.defaultValue ?? input.min;
  const set = (name, v) => {
    const next = { ...values, [name]: v };
    if (valuesProp === undefined) setState(next);
    onValuesChange?.(next);
  };
  const { results, errors, parts } = useResults(inputs, outputs, breakdown, values, compute);
  const primary = outputs.find((o) => o.primary) ?? outputs[0];
  const rest = outputs.filter((o) => o !== primary && !o.hidden);
  const id = useId();
  const fmt = (v, f, unit) => formatNumber(v, f, { currency, locale, unit });
  const changed = inputs.some(
    (i) => values[i.name] !== undefined && values[i.name] !== (defaultValues?.[i.name] ?? i.defaultValue),
  );

  /* Announce the headline once the reader stops adjusting, not on every step. */
  const [announced, setAnnounced] = useState('');
  const primaryText =
    primary && primary.name in results ? fmt(results[primary.name], primary.format, primary.unit) : '';
  useEffect(() => {
    if (!primary || !primaryText) return undefined;
    const t = window.setTimeout(() => setAnnounced(`${primary.label}: ${primaryText}`), 700);
    return () => window.clearTimeout(t);
  }, [primary, primaryText]);

  return (
    <div className={`calc ${className}`.trim()} aria-busy={loading || undefined}>
      {title || description ? (
        <div className="calc-head">
          <div className="calc-head-text">
            {title ? <h3 className="calc-title">{title}</h3> : null}
            {description ? <p className="calc-desc">{description}</p> : null}
          </div>
          {changed ? (
            <button
              type="button"
              className="calc-reset"
              onClick={() => {
                const next = { ...defaultValues };
                if (valuesProp === undefined) setState(next);
                onValuesChange?.(next);
              }}
            >
              <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="calc-body">
        <div className="calc-inputs">
          {loading
            ? [0, 1, 2].map((i) => (
                <div key={i} aria-hidden="true" className="calc-skel-row">
                  <span className="calc-skel calc-skel--label" />
                  <span className="calc-skel calc-skel--track" />
                </div>
              ))
            : inputs.map((input) => {
                const value = inputValue(input);
                const text = fmt(value, input.format, input.unit);
                return (
                  <div key={input.name} className="calc-input">
                    <div className="calc-input-row">
                      <label htmlFor={`${id}-${input.name}`} className="calc-input-label">
                        {input.label}
                      </label>
                      <NumberField
                        input={input}
                        value={value}
                        onCommit={(v) => set(input.name, clamp(v, input))}
                        label={input.label}
                        currency={currency}
                        locale={locale}
                      />
                    </div>
                    <Slider
                      id={`${id}-${input.name}`}
                      input={input}
                      value={value}
                      valueText={text}
                      onChange={(v) => set(input.name, v)}
                    />
                    <div className="calc-input-range" aria-hidden="true">
                      <span>{fmt(input.min, input.format, input.unit)}</span>
                      {input.hint ? <span className="calc-input-hint">{input.hint}</span> : null}
                      <span>{fmt(input.max, input.format, input.unit)}</span>
                    </div>
                  </div>
                );
              })}
        </div>

        <div className="calc-results">
          {primary ? (
            <div className="calc-primary">
              <span className="calc-primary-label">{primary.label}</span>
              {primary.name in results ? (
                <span key={primaryText} className="calc-primary-value">
                  {primaryText}
                </span>
              ) : (
                <span aria-hidden="true" className="calc-skel calc-skel--value" />
              )}
              {errors[primary.name] ? (
                <span className="calc-error">Formula error: {errors[primary.name]}</span>
              ) : primary.hint ? (
                <span className="calc-primary-hint">{primary.hint}</span>
              ) : null}
            </div>
          ) : null}

          {rest.length > 0 ? (
            <dl className="calc-rest">
              {rest.map((o) => (
                <div key={o.name} className="calc-rest-row">
                  <dt>{o.label}</dt>
                  <dd>
                    {o.name in results ? (
                      fmt(results[o.name], o.format, o.unit)
                    ) : errors[o.name] ? (
                      <span className="calc-error">Formula error</span>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {parts.length > 1 ? (
            <ProportionBar
              items={parts}
              format={(v) => fmt(v, primary?.format === 'currency' ? 'currency' : 'number')}
            />
          ) : null}
        </div>
      </div>

      {onSubmit || footnote ? (
        <div className="calc-foot">
          {footnote ? <p className="calc-footnote">{footnote}</p> : <span />}
          {onSubmit ? (
            <button
              type="button"
              className="calc-submit"
              disabled={loading}
              onClick={() =>
                onSubmit(Object.fromEntries(inputs.map((i) => [i.name, inputValue(i)])), results)
              }
            >
              <i className={`bi ${submitIcon}`} aria-hidden="true" />
              {submitLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      <span aria-live="polite" aria-atomic="true" className="calc-sr">
        {announced}
      </span>
    </div>
  );
}

export default CalculatorWidget;

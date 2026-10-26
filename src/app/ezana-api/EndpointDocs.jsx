'use client';

/* ============================================================================
 *  EZANA API docs: per-endpoint reference (Oct 26)
 *  ----------------------------------------------------------------------------
 *  Shopify-dev-docs style, built only from src/lib/ezana-api/registry.js (the
 *  same source the /v1 router and the OpenAPI spec read), so nothing here can
 *  drift from what the API accepts and returns:
 *
 *    EndpointArgs     green "Show input fields" toggle that expands into the
 *                     endpoint's arguments: type, required, limits and every
 *                     accepted value; plus a "Show response fields" toggle.
 *    ExampleButton    sits beside each endpoint signature and selects it.
 *    ExamplePanel     the green code panel the button populates: request in
 *                     curl / JavaScript / Python, the input variables, and the
 *                     response. A response is real production data only where
 *                     api-examples.js or prediction-examples.js captured one;
 *                     otherwise it is the typed response shape, labelled as a
 *                     shape. No data is invented.
 *
 *  Scoped class prefix: ea-ref-. Colours come from tokens: the panel ground is
 *  --brand-band-green with --brand-band-mint accents (both constant across
 *  themes, so the contrast holds in light and dark). Expand motion is off
 *  under prefers-reduced-motion.
 * ==========================================================================*/

import { useId, useState } from 'react';
import { PARAMS } from '@/lib/ezana-api/registry';
import { API_EXAMPLES } from './api-examples';
import { PM_EXAMPLES } from './prediction-examples';

const ORIGIN = 'https://ezana.world';

const TYPE_LABEL = {
  string: 'String',
  date: 'Date',
  int: 'Int',
  number: 'Number',
};

/* Sample INPUTS for the request snippet (never response data). Only params
   that have an obvious, valid sample are filled in. */
const SAMPLE_INPUT = {
  ticker: 'NVDA',
  from: '2026-01-01',
  to: '2026-06-30',
  limit: 5,
  year: 2026,
};

/** Path placeholders, in order: /v1/x/{id} -> ['id']. */
export function pathParams(path) {
  return [...String(path).matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]);
}

/* The same list rule the OpenAPI spec uses for `data`. */
function isList(route) {
  return (
    (route.params || []).includes('cursor') ||
    Boolean(route.list) ||
    route.id === 'lobbying.top_spenders' ||
    route.id === 'fec.candidate_funding'
  );
}

function templateRe(path) {
  const src = String(path)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{[a-z_]+\\\}/g, '[^/]+');
  return new RegExp(`^${src}$`);
}

const CAPTURED = [...API_EXAMPLES, ...PM_EXAMPLES];

/** A captured production example for this route, or null. */
export function capturedExample(route) {
  const re = templateRe(route.path);
  return CAPTURED.find((ex) => re.test(String(ex.path).split('?')[0])) || null;
}

/** Accepted values for one of this route's params, or null. */
function valuesFor(name, route) {
  if (route.paramEnums?.[name]) return route.paramEnums[name];
  if (name === 'sort' && route.sortValues?.length) return route.sortValues;
  return PARAMS[name]?.enum || null;
}

/** One argument row's model. Path placeholders are required strings. */
export function argumentsFor(route) {
  const path = pathParams(route.path).map((name) => ({
    name,
    in: 'path',
    type: 'String',
    required: true,
    desc: `Path segment. Replace {${name}} in the URL.`,
    values: null,
    limits: [],
  }));
  const query = (route.params || []).map((name) => {
    const spec = PARAMS[name] || {};
    const base = TYPE_LABEL[spec.type] || 'String';
    const limits = [];
    if (spec.type === 'int' || spec.type === 'number') {
      if (spec.min != null && spec.max != null) limits.push(`${spec.min} to ${spec.max}`);
      else if (spec.min != null) limits.push(`min ${spec.min}`);
      else if (spec.max != null) limits.push(`max ${spec.max}`);
    } else if (spec.max != null) {
      /* On strings, max is a character limit (query.js); the repeat cap is
         separate and the param's own description states it. */
      limits.push(`up to ${spec.max} characters`);
    }
    if (spec.repeatable) limits.push(`repeatable: ?${name}=A&${name}=B`);
    if (spec.type === 'date') limits.push('ISO 8601');
    return {
      name,
      in: 'query',
      type: spec.repeatable ? `[${base}]` : base,
      required: false,
      desc: spec.desc || '',
      values: valuesFor(name, route),
      limits,
    };
  });
  return [...path, ...query];
}

/** The request the panel shows: a captured one when it exists. */
export function sampleRequest(route) {
  const ex = capturedExample(route);
  if (ex) {
    const [p, qs = ''] = String(ex.path).split('?');
    const vars = Object.fromEntries(new URLSearchParams(qs));
    const names = pathParams(route.path);
    const segs = p.split('/');
    const tpl = route.path.split('/');
    tpl.forEach((seg, i) => {
      const m = /^\{([a-z_]+)\}$/.exec(seg);
      if (m && names.includes(m[1])) vars[m[1]] = segs[i];
    });
    return { path: ex.path, vars, captured: true };
  }
  const vars = {};
  let path = route.path;
  for (const name of pathParams(route.path)) {
    vars[name] = `<${name}>`;
    path = path.replace(`{${name}}`, `<${name}>`);
  }
  const qs = new URLSearchParams();
  for (const name of route.params || []) {
    if (SAMPLE_INPUT[name] != null) {
      qs.set(name, String(SAMPLE_INPUT[name]));
      vars[name] = SAMPLE_INPUT[name];
    }
  }
  const q = qs.toString();
  return { path: q ? `${path}?${q}` : path, vars, captured: false };
}

/** The typed response shape (types, not values) for routes with no capture. */
export function responseShape(route) {
  const row = Object.fromEntries(Object.entries(route.fields || {}).map(([k, t]) => [k, `<${t}>`]));
  const list = isList(route);
  const body = {
    data: list ? [row] : row,
    ...(list ? { page: { limit: '<integer>', has_more: '<boolean>', next: '<string|null>' } } : {}),
    meta: {
      request_id: '<string>',
      source: '<string|null>',
      delayed_days: '<integer>',
      as_of: '<string|null>',
      ...(route.kind === 'insight' ? { method: '<string>' } : {}),
    },
  };
  return JSON.stringify(body, null, 2);
}

const LANGS = [
  { id: 'curl', label: 'curl' },
  { id: 'js', label: 'JavaScript' },
  { id: 'python', label: 'Python' },
];

function snippet(lang, path) {
  const url = `${ORIGIN}${path}`;
  if (lang === 'js') {
    return `const res = await fetch(\n  "${url}",\n  { headers: { Authorization: \`Bearer \${process.env.EZANA_API_KEY}\` } }\n);\nconst { data, meta } = await res.json();`;
  }
  if (lang === 'python') {
    return `import os, requests\n\nres = requests.get(\n    "${url}",\n    headers={"Authorization": f"Bearer {os.environ['EZANA_API_KEY']}"},\n    timeout=10,\n)\nbody = res.json()`;
  }
  return `curl -H "Authorization: Bearer $EZANA_API_KEY" \\\n  "${url}"`;
}

/* ── Arguments + response fields (green toggles) ──────────────────────── */

function Toggle({ open, onClick, controls, icon, children }) {
  return (
    <button
      type="button"
      className={`ea-ref-toggle${open ? ' is-open' : ''}`}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onClick}
    >
      <i className={`bi ${icon}`} aria-hidden="true" />
      {children}
      <i className="bi bi-chevron-down ea-ref-chev" aria-hidden="true" />
    </button>
  );
}

export function EndpointArgs({ route }) {
  const args = argumentsFor(route);
  const fields = Object.entries(route.fields || {});
  const [argsOpen, setArgsOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const uid = useId();
  const argsId = `${uid}-args`;
  const fieldsId = `${uid}-fields`;

  return (
    <div className="ea-ref">
      <div className="ea-ref-toggles">
        {args.length ? (
          <Toggle
            open={argsOpen}
            onClick={() => setArgsOpen((v) => !v)}
            controls={argsId}
            icon="bi-input-cursor-text"
          >
            {argsOpen ? 'Hide input fields' : 'Show input fields'}
            <span className="ea-ref-count">{args.length}</span>
          </Toggle>
        ) : null}
        {fields.length ? (
          <Toggle
            open={fieldsOpen}
            onClick={() => setFieldsOpen((v) => !v)}
            controls={fieldsId}
            icon="bi-box-arrow-in-down-right"
          >
            {fieldsOpen ? 'Hide response fields' : 'Show response fields'}
            <span className="ea-ref-count">{fields.length}</span>
          </Toggle>
        ) : null}
      </div>

      {args.length ? (
        <div id={argsId} className={`ea-ref-panel${argsOpen ? ' is-open' : ''}`} hidden={!argsOpen}>
          <h4 className="ea-ref-h">Arguments</h4>
          <ul className="ea-ref-list">
            {args.map((a) => (
              <li key={`${a.in}-${a.name}`} className="ea-ref-arg">
                <div className="ea-ref-sig">
                  <code className="ea-ref-name">{a.name}</code>
                  <span className="ea-ref-type">{a.type}</span>
                  {a.required ? (
                    <span className="ea-ref-req">required</span>
                  ) : (
                    <span className="ea-ref-opt">optional</span>
                  )}
                  <span className="ea-ref-in">{a.in}</span>
                </div>
                {a.desc ? <p className="ea-ref-desc">{a.desc}</p> : null}
                {a.limits.length ? <p className="ea-ref-limits">{a.limits.join(' · ')}</p> : null}
                {a.values?.length ? (
                  <div className="ea-ref-values">
                    <span className="ea-ref-values-label">Accepted values</span>
                    <ul>
                      {a.values.map((v) => (
                        <li key={v}>
                          <code>{v}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {fields.length ? (
        <div
          id={fieldsId}
          className={`ea-ref-panel${fieldsOpen ? ' is-open' : ''}`}
          hidden={!fieldsOpen}
        >
          <h4 className="ea-ref-h">
            Returns{' '}
            <span className="ea-ref-h-sub">
              {isList(route) ? 'data: [object], page, meta' : 'data: object, meta'}
            </span>
          </h4>
          <ul className="ea-ref-fields">
            {fields.map(([name, type]) => (
              <li key={name}>
                <code className="ea-ref-name">{name}</code>
                <span className="ea-ref-type">{type}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ── Example button + green panel ─────────────────────────────────────── */

export function ExampleButton({ route, active, onSelect }) {
  return (
    <button
      type="button"
      className={`ea-ref-ex-btn${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(route)}
      aria-label={`Show example request and response for ${route.path}`}
    >
      <i className="bi bi-code-slash" aria-hidden="true" />
      Example
    </button>
  );
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* Clipboard can be blocked; the text is selectable either way. */
    }
  };
  return (
    <button type="button" className="ea-ref-copy" onClick={copy} aria-label="Copy to clipboard">
      <i className={`bi ${done ? 'bi-check2' : 'bi-clipboard'}`} aria-hidden="true" />
      <span>{done ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function Block({ title, text, numbered = true }) {
  const lines = String(text).split('\n');
  return (
    <div className="ea-ref-block">
      <div className="ea-ref-block-head">
        <span>{title}</span>
        <CopyButton text={text} />
      </div>
      <pre className="ea-ref-pre" tabIndex={0}>
        <code>
          {lines.map((ln, i) => (
            <span key={i} className="ea-ref-line">
              {numbered ? (
                <span className="ea-ref-ln" aria-hidden="true">
                  {i + 1}
                </span>
              ) : null}
              <span>{ln || ' '}</span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export function ExamplePanel({ route }) {
  const [lang, setLang] = useState('curl');
  if (!route) return null;
  const req = sampleRequest(route);
  const ex = capturedExample(route);
  const vars = Object.keys(req.vars).length ? JSON.stringify(req.vars, null, 2) : null;

  return (
    <div className="ea-ref-panelx" aria-live="polite">
      <div className="ea-ref-panelx-head">
        <span className="ea-ref-panelx-sig">
          <span className="ea-ref-panelx-method">GET</span>
          <code>{route.path}</code>
        </span>
        <span className="ea-ref-langs" role="group" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={lang === l.id}
              className={`ea-ref-lang${lang === l.id ? ' is-active' : ''}`}
              onClick={() => setLang(l.id)}
            >
              {l.label}
            </button>
          ))}
        </span>
      </div>
      <Block title="Request" text={snippet(lang, req.path)} />
      {vars ? <Block title="Input variables" text={vars} /> : null}
      {ex ? (
        <Block title="200 OK · production data, 26 Oct 2026, first rows" text={ex.response} />
      ) : (
        <Block title="200 OK · response shape (types, not values)" text={responseShape(route)} />
      )}
    </div>
  );
}

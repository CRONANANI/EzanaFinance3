'use client';

/**
 * SonarComposerRows (Nov 22 2026): one line in the search pill per Research Composer
 * resource. Every added item (an analysis, a saved query, a model, a chart, an Echo
 * article, a photo) gets a row: its name and type, where it came from ("Auto-configured"
 * when Sonar read it from the question, "Added" when the reader chose it), how Sonar will
 * use it, its status, and a remove action. An analysis row expands to its typed
 * parameters, its relationship choices (with "Other" for the reader's own instruction) and
 * its subject. Every control maps to a typed parameter in the registry.
 */

import { useState } from 'react';
import { CAPABILITIES, paramsFor, relationText, relationsFor } from '@/lib/sonar/composer/registry';

export const KIND_LABEL = {
  analysis: 'Analysis',
  query: 'EzanaQL query',
  model: 'Model',
  chart: 'Chart',
  echo: 'Echo article',
  photo: 'Photo',
};
export const KIND_ICON = {
  photo: 'bi-image',
  chart: 'bi-bar-chart-line',
  model: 'bi-box',
  query: 'bi-terminal',
  echo: 'bi-journal-text',
};

/** How a non-analysis resource can be used. The first is the default. */
export const CONTEXT_RELATIONS = {
  query: [
    'Use its results as evidence',
    'Compare its results with the answer',
    'Limit the answer to its results',
  ],
  model: [
    "Apply the model's method to this question",
    "Check the answer against the model's assumptions",
    'Explain how the model would apply',
  ],
  chart: ['Use its series as evidence', 'Compare it with the latest data'],
  echo: [
    "Investigate the article's claims",
    'Compare its conclusions with current evidence',
    'Explore the companies and industries it covers',
  ],
  photo: ['Read it as evidence'],
};

const STATUS = {
  supported: { label: 'Ready', tone: 'ok' },
  conditional: { label: 'Needs input', tone: 'warn' },
  validation_error: { label: 'Check values', tone: 'bad' },
  unsupported: { label: 'Not available', tone: 'bad' },
  unrelated: { label: 'No match', tone: 'bad' },
};

function ParamControl({ a, p, onParam }) {
  const v = a.params?.[p.id];
  const id = `scr-${a.key}-${p.id}`;
  const max = typeof p.max === 'function' ? p.max(a) : p.max;
  if (p.type === 'multi') {
    const on = Array.isArray(v) ? v : [];
    return (
      <fieldset className="scr-param scr-param--multi">
        <legend>{p.label}</legend>
        <div className="scr-checks">
          {p.options.map((o) => (
            <label key={o.value} className={`scr-check${on.includes(o.value) ? ' is-on' : ''}`}>
              <input
                type="checkbox"
                checked={on.includes(o.value)}
                onChange={(e) =>
                  onParam(
                    a.key,
                    p.id,
                    e.target.checked ? [...on, o.value] : on.filter((x) => x !== o.value),
                  )
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (p.type === 'enum') {
    return (
      <label className="scr-param" htmlFor={id}>
        <span>{p.label}</span>
        <select id={id} value={v ?? ''} onChange={(e) => onParam(a.key, p.id, e.target.value)}>
          {p.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="scr-param" htmlFor={id} title={p.effect}>
      <span>
        {p.label}
        {p.id === 'top_n' && a.subject?.eligible != null ? (
          <em className="scr-param-max">
            {max < a.subject.eligible ? ` (max ${max})` : ` of ${a.subject.eligible}`}
          </em>
        ) : null}
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={p.min}
        max={max}
        step={p.step || 1}
        value={v ?? ''}
        placeholder={p.placeholder || ''}
        onChange={(e) =>
          onParam(a.key, p.id, e.target.value === '' ? null : Number(e.target.value))
        }
      />
    </label>
  );
}

function AnalysisRow({ a, api }) {
  /* Collapsed by default; a row that needs the reader (a value to fix, a filer to choose)
     opens on its own. */
  const [userOpen, setOpen] = useState(null);
  const needs = a.status === 'validation_error' || a.subject?.candidates?.length > 1 || !a.subject;
  const open = userOpen ?? needs;
  const cap = CAPABILITIES[a.capability];
  const st = STATUS[a.status] || STATUS.conditional;
  const rels = relationsFor(a);
  return (
    <li className={`scr-row is-${st.tone}`}>
      <div className="scr-head">
        <i className={`bi ${cap.icon} scr-icon`} aria-hidden="true" />
        <span className="scr-name">{cap.label}</span>
        <span className="scr-type">{cap.type}</span>
        <span className={`scr-origin${a.origin === 'auto' ? ' is-auto' : ''}`}>
          {a.origin === 'auto' ? 'Auto-configured' : 'Added'}
        </span>
        <span className={`scr-status scr-status--${st.tone}`}>{st.label}</span>
        <button
          type="button"
          className="scr-btn"
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Edit'} ${cap.label}`}
          onClick={() => setOpen(!open)}
        >
          <i className={`bi ${open ? 'bi-chevron-up' : 'bi-sliders'}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="scr-btn"
          aria-label={`Remove ${cap.label}`}
          onClick={() => api.remove(a.key)}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
      <p className="scr-rel">{relationText(a) || cap.summary}</p>
      {a.issues?.length ? (
        <ul className="scr-issues">
          {a.issues.map((i, n) => (
            <li key={n}>
              {i.message}
              {i.fix != null && i.param ? (
                <button
                  type="button"
                  className="scr-fix"
                  onClick={() => api.setParam(a.key, i.param, i.fix)}
                >
                  Use {i.fix}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <div className="scr-body">
          {a.subject?.candidates?.length > 1 ? (
            <label className="scr-param scr-param--wide">
              <span>Filer</span>
              <select
                value=""
                onChange={(e) => {
                  const c = a.subject.candidates.find((x) => x.id === e.target.value);
                  if (c) api.chooseCandidate(a.key, c);
                }}
              >
                <option value="" disabled>
                  Choose which filer
                </option>
                {a.subject.candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.period})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="scr-param scr-param--wide">
            <span>Subject</span>
            <input
              type="text"
              defaultValue={a.subject?.name || a.subject?.text || ''}
              placeholder="Company, fund manager or member of Congress"
              onBlur={(e) => {
                const t = e.target.value.trim();
                if (t !== (a.subject?.name || a.subject?.text || '')) api.setSubject(a.key, t);
              }}
            />
          </label>
          {rels.length ? (
            <label className="scr-param scr-param--wide">
              <span>How should Sonar use this?</span>
              <select
                value={a.relation === 'other' ? 'other' : a.relation}
                onChange={(e) => api.setRelation(a.key, e.target.value)}
              >
                {rels.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.text(a)}
                  </option>
                ))}
                <option value="other">Other: describe your own analysis</option>
              </select>
            </label>
          ) : null}
          {a.relation === 'other' ? (
            <label className="scr-param scr-param--wide">
              <span>Your instruction</span>
              <input
                type="text"
                defaultValue={a.custom || ''}
                maxLength={240}
                placeholder="For example: only the energy companies"
                onBlur={(e) => api.setRelation(a.key, 'other', e.target.value.trim())}
              />
            </label>
          ) : null}
          <div className="scr-params">
            {paramsFor(a).map((p) => (
              <ParamControl key={p.id} a={a} p={p} onParam={api.setParam} />
            ))}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function ContextRow({ c, onRemove, onRelation }) {
  const rels = CONTEXT_RELATIONS[c.kind] || [];
  return (
    <li className={`scr-row is-ctx${c.status === 'reading' ? ' is-reading' : ''}`}>
      <div className="scr-head">
        <i className={`bi ${KIND_ICON[c.kind] || 'bi-paperclip'} scr-icon`} aria-hidden="true" />
        <span className="scr-name">{c.label}</span>
        <span className="scr-type">{KIND_LABEL[c.kind] || 'Context'}</span>
        <span className="scr-origin">Added</span>
        {c.status === 'reading' ? (
          <span className="scr-status scr-status--warn">Reading</span>
        ) : null}
        {rels.length > 1 ? (
          <select
            className="scr-rel-select"
            aria-label={`How Sonar should use ${c.label}`}
            value={c.relation || rels[0]}
            onChange={(e) => onRelation(c.key, e.target.value)}
          >
            {rels.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          className="scr-btn"
          aria-label={`Remove ${c.label}`}
          onClick={() => onRemove(c.key)}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function SonarComposerRows({
  analyses = [],
  context = [],
  api,
  onRemoveContext,
  onContextRelation,
  autoCount = 0,
  dismissedCount = 0,
  deep = null,
  running = false,
}) {
  if (!analyses.length && !context.length && !dismissedCount) return null;
  return (
    <div className="scr" aria-label="Research Composer resources">
      {autoCount || dismissedCount ? (
        <p className="scr-summary" role="status">
          {autoCount ? (
            <>
              <i className="bi bi-stars" aria-hidden="true" /> Sonar configured {autoCount} research{' '}
              {autoCount === 1 ? 'capability' : 'capabilities'} from your question.
            </>
          ) : (
            <>Automatic configuration is off for this question.</>
          )}
          <button type="button" className="scr-link" onClick={api.reset}>
            Reset to recommended
          </button>
        </p>
      ) : null}
      <ul className="scr-list">
        {analyses.map((a) => (
          <AnalysisRow key={a.key} a={a} api={api} />
        ))}
        {context.map((c) => (
          <ContextRow key={c.key} c={c} onRemove={onRemoveContext} onRelation={onContextRelation} />
        ))}
      </ul>
      {deep?.qualifies ? (
        <p className="scr-deep">
          <i className="bi bi-layers" aria-hidden="true" /> {deep.count} research resources: this
          qualifies for Deep research. Ping asks before it runs.
        </p>
      ) : null}
      {running ? (
        <p className="scr-running" role="status">
          <i className="bi bi-arrow-repeat sqb-spin" aria-hidden="true" /> Running the attached
          analyses
        </p>
      ) : null}
    </div>
  );
}

export default SonarComposerRows;

'use client';

/**
 * SonarBuildMenu, shown as "Research Composer" (Nov 22 2026). The Compose dropdown of the
 * Sonar query composer. The file keeps its name; only the visible label changed.
 *
 * Five categories, every row real:
 *   Queries     saved EzanaQL queries (/api/ezanaql/saved), plus "Create new query": the
 *               panel slides to a natural-language builder (generate with /api/ezanaql/
 *               generate, validate, preview with /api/ezanaql/run, include, save)
 *   Models      the executable analyses (Fundamental Analysis, DCF Valuation, Backtesting:
 *               lib/sonar/composer/registry, run by /api/sonar/composer) and the Quant Lab
 *               model library (added as context: its method and limits, not run)
 *   Data packs  the research engine's dataset families (Research controls `sources`)
 *   Tools       analysis lenses (Research controls `focus`) and the charts on this answer
 *   Echo        published Ezana Echo articles (/api/echo/articles), attached as editorial
 *               material with its date, never as primary evidence
 *
 * Every added item becomes a row in the search pill (SonarComposerRows).
 *
 * Brand guide: an overlay keeps a solid ground, a hairline border and a shadow; selection is
 * emerald text, never a filled chip; text buttons; no glow.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useResearchControls } from './research-controls-store';
import { FOCUS_OPTIONS, SOURCE_OPTIONS, CONTROL_DEFAULTS } from '@/lib/sonar/research-controls';
import { ANALYSES } from '@/lib/sonar/composer/registry';

const PACK_INFO = {
  market: {
    icon: 'bi-graph-up',
    desc: 'Prices, analyst estimates, commodities and prediction-market odds.',
  },
  filings: {
    icon: 'bi-file-earmark-text',
    desc: 'SEC filings, fundamentals, segments, 13F holders and IPO filings.',
  },
  government: {
    icon: 'bi-bank',
    desc: 'Congressional trades, lobbying, federal contracts, sanctions and export controls.',
  },
  macro: {
    icon: 'bi-globe2',
    desc: 'Country macro series: inflation, rates, FX, reserves and growth.',
  },
};
const LENS_ICON = {
  market: 'bi-activity',
  fundamentals: 'bi-clipboard-data',
  risk: 'bi-shield-exclamation',
  competitive: 'bi-diagram-3',
  macro: 'bi-globe-americas',
};
const PACKS = SOURCE_OPTIONS.filter((o) => o.key !== 'all').map((o) => ({
  key: o.key,
  label: o.label,
  ...(PACK_INFO[o.key] || { icon: 'bi-database', desc: '' }),
}));
const LENSES = FOCUS_OPTIONS.filter((o) => o.key !== 'general');

const TABS = [
  { key: 'queries', label: 'Queries', icon: 'bi-terminal' },
  { key: 'models', label: 'Models', icon: 'bi-box' },
  { key: 'packs', label: 'Data packs', icon: 'bi-database' },
  { key: 'tools', label: 'Tools', icon: 'bi-wrench-adjustable' },
  { key: 'echo', label: 'Echo', icon: 'bi-journal-text' },
];

/* EzanaQL dimensions that have live data today. */
const DIMENSIONS = [
  { key: 'titans', label: 'Titans Shadow (13F, insiders, fundamentals)' },
  { key: 'capitol', label: 'Capitol Watch (Congress, lobbying, contracts)' },
];

function Row({ icon, title, desc, tag, on, onClick, disabled, label }) {
  return (
    <li>
      <button
        type="button"
        className={`sbm-row${on ? ' is-on' : ''}`}
        aria-pressed={on}
        aria-label={label || `${on ? 'Remove' : 'Add'} ${title}`}
        onClick={onClick}
        disabled={disabled}
      >
        <i className={`bi ${icon} sbm-row-icon`} aria-hidden="true" />
        <span className="sbm-row-text">
          <span className="sbm-row-title">{title}</span>
          {desc ? <span className="sbm-row-desc">{desc}</span> : null}
        </span>
        {tag ? <span className="sbm-tag">{tag}</span> : null}
        <i className={`bi ${on ? 'bi-check-lg' : 'bi-plus-lg'} sbm-row-add`} aria-hidden="true" />
      </button>
    </li>
  );
}

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

/** The slide-in natural-language EzanaQL builder. */
function QueryBuilder({ onBack, onInclude, guest }) {
  const [prompt, setPrompt] = useState('');
  const [dimension, setDimension] = useState('titans');
  const [gen, setGen] = useState({ status: 'idle' });
  const [preview, setPreview] = useState({ status: 'idle' });
  const [saveState, setSaveState] = useState('idle');

  const generate = async () => {
    const p = prompt.trim();
    if (p.length < 6) return;
    setGen({ status: 'loading' });
    setPreview({ status: 'idle' });
    setSaveState('idle');
    try {
      const res = await fetch('/api/ezanaql/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: p, dimension }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || 'The query could not be generated.');
      setGen({ status: 'ready', query: j.query, valid: j.valid, error: j.validationError });
    } catch (e) {
      setGen({ status: 'error', error: e.message });
    }
  };

  const runPreview = async () => {
    if (!gen.query) return;
    setPreview({ status: 'loading' });
    try {
      const res = await fetch('/api/ezanaql/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: gen.query, dimension }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || 'The query could not run.');
      setPreview({ status: 'ready', result: j.result });
    } catch (e) {
      setPreview({ status: 'error', error: e.message });
    }
  };

  const save = async () => {
    setSaveState('saving');
    try {
      const res = await fetch('/api/ezanaql/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: gen.query,
          title: prompt.trim().slice(0, 120),
          prompt: prompt.trim(),
          dimension,
          rowCount: preview.result?.rowCount ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || 'Could not save.');
      setSaveState('saved');
    } catch (e) {
      setSaveState(e.message);
    }
  };

  const include = () => {
    const r = preview.result;
    const sample =
      r?.rows?.length && r.keys
        ? [
            `Preview (${r.rowCount} rows, first ${Math.min(10, r.rows.length)}):`,
            r.columns.join(' | '),
            ...r.rows.slice(0, 10).map((row) => r.keys.map((k) => row[k] ?? '').join(' | ')),
          ].join('\n')
        : '';
    onInclude({
      key: `query:new:${hash(gen.query)}`,
      kind: 'query',
      label: prompt.trim().slice(0, 60) || 'New EzanaQL query',
      text: [`EzanaQL (${dimension}):`, gen.query, sample].filter(Boolean).join('\n'),
    });
  };

  const r = preview.result;
  return (
    <div className="sbm-builder">
      <button type="button" className="sbm-back" onClick={onBack}>
        <i className="bi bi-arrow-left" aria-hidden="true" /> Back to Research Composer
      </button>
      <p className="sbm-title">Create a new EzanaQL query</p>
      <p className="sbm-sub">
        Describe the data in plain English. Sonar writes the EzanaQL and checks it against the
        grammar before anything runs.
      </p>
      <label className="sbm-field">
        <span>Your request</span>
        <textarea
          rows={3}
          value={prompt}
          maxLength={500}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="For example: the 10 largest holdings in BlackRock's latest 13F"
        />
      </label>
      <label className="sbm-field">
        <span>Dataset hub</span>
        <select value={dimension} onChange={(e) => setDimension(e.target.value)}>
          {DIMENSIONS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="sbm-text-btn is-primary"
        onClick={generate}
        disabled={prompt.trim().length < 6 || gen.status === 'loading'}
      >
        <i className="bi bi-magic" aria-hidden="true" />
        {gen.status === 'loading' ? 'Generating' : 'Generate EzanaQL'}
      </button>
      {gen.status === 'error' ? <p className="sbm-err">{gen.error}</p> : null}
      {gen.status === 'ready' ? (
        <>
          <pre className="sbm-code" aria-label="Generated EzanaQL">
            {gen.query}
          </pre>
          <p className={gen.valid ? 'sbm-ok' : 'sbm-err'}>
            <i
              className={`bi ${gen.valid ? 'bi-check2-circle' : 'bi-exclamation-circle'}`}
              aria-hidden="true"
            />{' '}
            {gen.valid ? 'Valid EzanaQL, read-only.' : gen.error || 'Not valid EzanaQL yet.'}
          </p>
          {gen.valid ? (
            <div className="sbm-builder-actions">
              <button
                type="button"
                className="sbm-text-btn"
                onClick={runPreview}
                disabled={preview.status === 'loading'}
              >
                <i className="bi bi-table" aria-hidden="true" />
                {preview.status === 'loading' ? 'Running' : 'Preview results'}
              </button>
              <button type="button" className="sbm-text-btn is-primary" onClick={include}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> Include in research
              </button>
              {guest ? null : (
                <button
                  type="button"
                  className="sbm-text-btn"
                  onClick={save}
                  disabled={saveState === 'saving' || saveState === 'saved'}
                >
                  <i className="bi bi-bookmark" aria-hidden="true" />
                  {saveState === 'saved'
                    ? 'Saved to library'
                    : saveState === 'saving'
                      ? 'Saving'
                      : 'Save to library'}
                </button>
              )}
            </div>
          ) : null}
          {!['idle', 'saving', 'saved'].includes(saveState) ? (
            <p className="sbm-err">{saveState}</p>
          ) : null}
          {preview.status === 'error' ? <p className="sbm-err">{preview.error}</p> : null}
          {preview.status === 'ready' && r ? (
            <div className="sbm-preview">
              <p className="sbm-note">
                {r.rowCount
                  ? `${r.rowCount} rows. First ${Math.min(5, r.rows.length)}:`
                  : 'No rows match.'}
              </p>
              {r.rows?.length ? (
                <div className="sbm-preview-scroll">
                  <table>
                    <thead>
                      <tr>
                        {r.columns.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {r.keys.map((k) => (
                            <td key={k}>{row[k] == null ? '' : String(row[k])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function EchoTab({ items, onToggle, guest }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState({ status: 'idle', list: [] });
  const has = (key) => items.some((c) => c.key === key);
  useEffect(() => {
    if (guest) return undefined;
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, status: 'loading' }));
      try {
        const res = await fetch(`/api/echo/articles?search=${encodeURIComponent(q.trim())}`, {
          credentials: 'include',
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error('failed');
        setState({ status: 'ready', list: (j.articles || []).slice(0, 12) });
      } catch {
        setState({ status: 'error', list: [] });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, guest]);

  const attach = async (a) => {
    const key = `echo:${a.article_slug}`;
    if (has(key)) {
      onToggle({ key });
      return;
    }
    let body = a.article_excerpt || '';
    try {
      const res = await fetch(`/api/echo/articles?slug=${encodeURIComponent(a.article_slug)}`, {
        credentials: 'include',
      });
      const j = await res.json();
      body = String(j?.article?.article_body || body).slice(0, 5000);
    } catch {
      /* keep the excerpt */
    }
    onToggle({
      key,
      kind: 'echo',
      label: a.article_title,
      text: [
        `Published ${String(a.published_at || '').slice(0, 10)} on Ezana Echo (ezana.world/ezana-echo/${a.article_slug}).`,
        body,
      ].join('\n'),
    });
  };

  if (guest) return <p className="sbm-note">Sign in to attach Ezana Echo articles.</p>;
  return (
    <>
      <label className="sbm-search">
        <i className="bi bi-search" aria-hidden="true" />
        <span className="sbm-sr">Search Ezana Echo</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search published articles"
          autoComplete="off"
        />
      </label>
      {state.status === 'error' ? (
        <p className="sbm-note">Echo articles could not be loaded.</p>
      ) : state.list.length ? (
        <ul className="sbm-list">
          {state.list.map((a) => (
            <Row
              key={a.article_slug}
              icon="bi-journal-text"
              title={a.article_title}
              desc={`${String(a.published_at || '').slice(0, 10)}${a.author_name ? ` · ${a.author_name}` : ''}${a.article_excerpt ? ` · ${a.article_excerpt}` : ''}`}
              on={has(`echo:${a.article_slug}`)}
              onClick={() => attach(a)}
            />
          ))}
        </ul>
      ) : state.status === 'ready' ? (
        <p className="sbm-note">No published article matches.</p>
      ) : (
        <p className="sbm-note">Loading articles</p>
      )}
      <p className="sbm-foot-note">
        An article is attached as editorial interpretation with its publication date. Sonar checks
        its claims against current evidence; it is never treated as a primary source.
      </p>
    </>
  );
}

export function SonarBuildMenu({
  id,
  menuRef,
  items = [],
  onToggle,
  onClearContext,
  saved = { status: 'idle', items: [] },
  guest = false,
  charts = [],
  models = [],
  analyses = [],
  onAddAnalysis,
  onRemoveAnalysis,
}) {
  const [tab, setTab] = useState('queries');
  const [view, setView] = useState('menu');
  const [filter, setFilter] = useState('');
  const [controls, setControls] = useResearchControls();
  const has = (key) => items.some((c) => c.key === key);

  const packOn = controls.sources !== 'all' ? controls.sources : null;
  const lensOn = controls.focus !== 'general' ? controls.focus : null;
  const counts = {
    queries: items.filter((c) => c.kind === 'query').length,
    models: items.filter((c) => c.kind === 'model').length + analyses.length,
    packs: packOn ? 1 : 0,
    tools: items.filter((c) => c.kind === 'chart').length + (lensOn ? 1 : 0),
    echo: items.filter((c) => c.kind === 'echo').length,
  };
  const added = Object.values(counts).reduce((a, b) => a + b, 0);

  const families = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const map = new Map();
    for (const m of models) {
      if (q && !`${m.label} ${m.family} ${m.summary}`.toLowerCase().includes(q)) continue;
      if (!map.has(m.family)) map.set(m.family, []);
      map.get(m.family).push(m);
    }
    return [...map.entries()];
  }, [models, filter]);

  const clearAll = () => {
    onClearContext?.();
    analyses.forEach((a) => onRemoveAnalysis?.(a.key));
    setControls({ ...controls, sources: CONTROL_DEFAULTS.sources, focus: CONTROL_DEFAULTS.focus });
  };

  const more = [
    {
      tab: 'models',
      icon: 'bi-box',
      title: 'Models',
      desc: 'Fundamental analysis, DCF, backtesting and the Quant Lab library.',
      tag: `${models.length + ANALYSES.length}`,
    },
    {
      tab: 'packs',
      icon: 'bi-database',
      title: 'Data packs',
      desc: 'Narrow the run to market, filings, government or macro data.',
      tag: `${PACKS.length}`,
    },
    {
      tab: 'tools',
      icon: 'bi-wrench-adjustable',
      title: 'Tools',
      desc: 'Analysis lenses and the charts on this answer.',
      tag: `${LENSES.length + charts.length}`,
    },
    {
      tab: 'echo',
      icon: 'bi-journal-text',
      title: 'Echo articles',
      desc: 'Attach a published Ezana Echo article to investigate.',
      tag: null,
    },
  ];

  const builder = view === 'builder';
  return (
    <div
      id={id}
      ref={menuRef}
      className={`sbm${builder ? ' is-builder' : ''}`}
      role="dialog"
      aria-label="Research Composer"
    >
      <div className="sbm-track">
        <div
          className="sbm-pane"
          aria-hidden={builder || undefined}
          inert={builder ? '' : undefined}
        >
          <header className="sbm-head">
            <i className="bi bi-stack sbm-head-icon" aria-hidden="true" />
            <div className="sbm-head-text">
              <p className="sbm-title">Research Composer</p>
              <p className="sbm-sub">
                Add queries, models, data packs, tools and Echo articles to this search.
              </p>
            </div>
            {added ? (
              <div className="sbm-head-meta">
                <span className="sbm-added">{added} added</span>
                <button type="button" className="sbm-clear" onClick={clearAll}>
                  Clear all
                </button>
              </div>
            ) : null}
          </header>

          <div className="sbm-tabs" role="tablist" aria-label="Research Composer categories">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`sbm-tab${tab === t.key ? ' is-on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <i className={`bi ${t.icon}`} aria-hidden="true" />
                {t.label}
                {counts[t.key] ? <span className="sbm-tab-n">{counts[t.key]}</span> : null}
              </button>
            ))}
          </div>

          <div className="sbm-body" role="tabpanel">
            {tab === 'queries' ? (
              <>
                <p className="sbm-group">Saved queries</p>
                {guest ? (
                  <p className="sbm-note">Sign in to add your saved EzanaQL queries.</p>
                ) : saved.status === 'loading' || saved.status === 'idle' ? (
                  <p className="sbm-note">Loading your saved queries</p>
                ) : saved.status === 'error' ? (
                  <p className="sbm-note">Your saved queries could not be loaded.</p>
                ) : saved.items.length ? (
                  <ul className="sbm-list">
                    {saved.items.map((q) => {
                      const item = {
                        key: `query:${q.id}`,
                        kind: 'query',
                        label: q.label,
                        text: q.text,
                      };
                      return (
                        <Row
                          key={q.id}
                          icon="bi-terminal"
                          title={q.label}
                          desc={q.desc}
                          tag="Saved"
                          on={has(item.key)}
                          onClick={() => onToggle(item)}
                        />
                      );
                    })}
                  </ul>
                ) : (
                  <p className="sbm-note">No saved queries yet. Create one below.</p>
                )}
                <p className="sbm-group">More to add</p>
                <ul className="sbm-list">
                  {more.map((m) => (
                    <li key={m.tab}>
                      <button type="button" className="sbm-row" onClick={() => setTab(m.tab)}>
                        <i className={`bi ${m.icon} sbm-row-icon`} aria-hidden="true" />
                        <span className="sbm-row-text">
                          <span className="sbm-row-title">{m.title}</span>
                          <span className="sbm-row-desc">{m.desc}</span>
                        </span>
                        {m.tag ? <span className="sbm-tag sbm-tag--muted">{m.tag}</span> : null}
                        <i className="bi bi-chevron-right sbm-row-go" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {tab === 'models' ? (
              <>
                <p className="sbm-group">Analyses Sonar runs</p>
                <ul className="sbm-list">
                  {ANALYSES.map((c) => {
                    const cur = analyses.find((a) => a.capability === c.key);
                    return (
                      <Row
                        key={c.key}
                        icon={c.icon}
                        title={c.label}
                        desc={c.summary}
                        tag={cur?.origin === 'auto' ? 'Auto' : null}
                        on={Boolean(cur)}
                        onClick={() => (cur ? onRemoveAnalysis?.(cur.key) : onAddAnalysis?.(c.key))}
                      />
                    );
                  })}
                </ul>
                <label className="sbm-search">
                  <i className="bi bi-search" aria-hidden="true" />
                  <span className="sbm-sr">Search the model library</span>
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Search the model library"
                    autoComplete="off"
                  />
                </label>
                {families.map(([family, list]) => (
                  <div key={family}>
                    <p className="sbm-group">{family}</p>
                    <ul className="sbm-list">
                      {list.map((m) => (
                        <Row
                          key={m.key}
                          icon="bi-box"
                          title={m.label}
                          desc={m.summary}
                          on={has(m.key)}
                          onClick={() => onToggle(m)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="sbm-foot-note">
                  Analyses run on Ezana&apos;s data with deterministic code before Sonar writes the
                  answer. A library model is added as context: Sonar reads its method and limits; it
                  does not run it on your data.
                </p>
              </>
            ) : null}

            {tab === 'packs' ? (
              <>
                <p className="sbm-group">Research data packs</p>
                <ul className="sbm-list">
                  {PACKS.map((p) => (
                    <Row
                      key={p.key}
                      icon={p.icon}
                      title={p.label}
                      desc={p.desc}
                      on={packOn === p.key}
                      onClick={() =>
                        setControls({ ...controls, sources: packOn === p.key ? 'all' : p.key })
                      }
                    />
                  ))}
                </ul>
                <p className="sbm-foot-note">
                  One pack at a time. It narrows the next research run to that data, within what
                  your plan includes. The same choice shows under Research controls.
                </p>
              </>
            ) : null}

            {tab === 'tools' ? (
              <>
                <p className="sbm-group">Analysis lenses</p>
                <ul className="sbm-list">
                  {LENSES.map((l) => (
                    <Row
                      key={l.key}
                      icon={LENS_ICON[l.key] || 'bi-sliders'}
                      title={l.label}
                      desc={l.directive}
                      on={lensOn === l.key}
                      onClick={() =>
                        setControls({ ...controls, focus: lensOn === l.key ? 'general' : l.key })
                      }
                    />
                  ))}
                </ul>
                {charts.length ? (
                  <>
                    <p className="sbm-group">Charts on this answer</p>
                    <ul className="sbm-list">
                      {charts.map((c) => (
                        <Row
                          key={c.key}
                          icon="bi-bar-chart-line"
                          title={c.label}
                          desc="Its series travel with the question."
                          on={has(c.key)}
                          onClick={() => onToggle(c)}
                        />
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : null}

            {tab === 'echo' ? <EchoTab items={items} onToggle={onToggle} guest={guest} /> : null}
          </div>

          <footer className="sbm-foot">
            <Link href="/sonar/library" className="sbm-text-btn">
              <i className="bi bi-bookmark" aria-hidden="true" />
              Open saved library
            </Link>
            <button
              type="button"
              className="sbm-text-btn is-primary"
              onClick={() => setView('builder')}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Create new query
            </button>
          </footer>
        </div>

        <div
          className="sbm-pane"
          aria-hidden={!builder || undefined}
          inert={!builder ? '' : undefined}
        >
          {builder ? (
            <QueryBuilder
              guest={guest}
              onBack={() => setView('menu')}
              onInclude={(item) => {
                if (!has(item.key)) onToggle(item);
                setView('menu');
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SonarBuildMenu;

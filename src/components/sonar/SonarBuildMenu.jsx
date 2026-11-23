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
 * Layout (Nov 23 2026): the nested action-dropdown pattern on Ezana dark tokens. The root
 * lists the categories; a category drills in place with a breadcrumb (it never opens a
 * second floating panel, so the menu stays inside the viewport). One highlight slides to the
 * hovered or focused row; added rows carry an emerald check; a footer shows what is added and
 * the keyboard keys (arrows move, right or Enter opens, left or Escape goes back).
 *
 * Brand guide: an overlay keeps a solid ground, a hairline border and a shadow; selection is
 * emerald text and a check, never a filled chip; no glow; motion stops under reduced motion.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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

const CATEGORIES = {
  queries: { label: 'Queries', icon: 'bi-terminal' },
  models: { label: 'Models', icon: 'bi-box' },
  packs: { label: 'Data packs', icon: 'bi-database' },
  tools: { label: 'Tools', icon: 'bi-wrench-adjustable' },
  echo: { label: 'Echo', icon: 'bi-journal-text' },
};

/* EzanaQL dimensions that have live data today. */
const DIMENSIONS = [
  { key: 'titans', label: 'Titans Shadow (13F, insiders, fundamentals)' },
  { key: 'capitol', label: 'Capitol Watch (Congress, lobbying, contracts)' },
];

function Row({ icon, title, desc, tag, on, onClick, disabled, label, parent, dot, i = 0 }) {
  return (
    <li>
      <button
        type="button"
        data-sbm-row=""
        data-parent={parent ? '' : undefined}
        className={`sbm-row${on ? ' is-on' : ''}`}
        style={{ '--i': i }}
        aria-pressed={parent ? undefined : on}
        aria-haspopup={parent ? 'menu' : undefined}
        aria-label={label || (parent ? `Open ${title}` : `${on ? 'Remove' : 'Add'} ${title}`)}
        onClick={onClick}
        disabled={disabled}
      >
        {icon ? <i className={`bi ${icon} sbm-row-icon`} aria-hidden="true" /> : null}
        <span className="sbm-row-text">
          <span className="sbm-row-line">
            <span className="sbm-row-title">{title}</span>
            {tag ? <span className="sbm-pill">{tag}</span> : null}
          </span>
          {desc ? <span className="sbm-row-desc">{desc}</span> : null}
        </span>
        <span className="sbm-row-end" aria-hidden="true">
          {parent ? (
            <>
              {dot ? <span className="sbm-dot" /> : null}
              <i className="bi bi-chevron-right sbm-row-go" />
            </>
          ) : on ? (
            <i className="bi bi-check-lg sbm-row-check" />
          ) : (
            <i className="bi bi-plus-lg sbm-row-add" />
          )}
        </span>
      </button>
    </li>
  );
}

/* One highlight per scrolling body that slides to the hovered or focused row. */
function useSlidingHighlight(resetKey) {
  const bodyRef = useRef(null);
  const [hl, setHl] = useState(null);
  useEffect(() => setHl(null), [resetKey]);
  const track = (e) => {
    const row = e.target.closest?.('[data-sbm-row]');
    const body = bodyRef.current;
    if (!row || row.disabled || !body?.contains(row)) return;
    /* Measured against the scrolling body itself (not offsetTop, whose parent is the
       animated level), so the highlight lands exactly on the row. */
    const r = row.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    setHl({
      top: r.top - b.top - body.clientTop + body.scrollTop,
      left: r.left - b.left - body.clientLeft,
      width: r.width,
      height: r.height,
    });
  };
  const leave = () => {
    if (!bodyRef.current?.contains(document.activeElement)) setHl(null);
  };
  const bodyProps = { ref: bodyRef, onMouseOver: track, onFocus: track, onMouseLeave: leave };
  const highlight = hl ? (
    <span
      className="sbm-hl"
      aria-hidden="true"
      style={{
        transform: `translate(${hl.left}px, ${hl.top}px)`,
        width: hl.width,
        height: hl.height,
      }}
    />
  ) : null;
  return { bodyProps, highlight };
}

/* Arrow keys move between rows; right or Enter opens a parent; left goes back. */
function rowKeys(e, { onBack }) {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (e.key === 'Escape' && onBack) {
      e.stopPropagation();
      onBack();
    }
    return;
  }
  const rows = [...e.currentTarget.querySelectorAll('[data-sbm-row]:not(:disabled)')];
  const at = rows.indexOf(document.activeElement);
  const go = (n) => {
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, n))]?.focus();
  };
  switch (e.key) {
    case 'ArrowDown':
      go(at < 0 ? 0 : at + 1);
      break;
    case 'ArrowUp':
      go(at < 0 ? rows.length - 1 : at - 1);
      break;
    case 'Home':
      go(0);
      break;
    case 'End':
      go(rows.length - 1);
      break;
    case 'ArrowRight':
      if (document.activeElement?.hasAttribute('data-parent')) {
        e.preventDefault();
        document.activeElement.click();
      }
      break;
    case 'ArrowLeft':
    case 'Escape':
      if (onBack) {
        e.preventDefault();
        e.stopPropagation();
        onBack();
      }
      break;
    default:
      break;
  }
}

function Keys() {
  return (
    <span className="sbm-keys" aria-hidden="true">
      {['\u2191\u2193', '\u2190', '\u2192', '\u21b5'].map((k) => (
        <kbd key={k}>{k}</kbd>
      ))}
    </span>
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
      query: gen.query,
      dimension,
      label: prompt.trim().slice(0, 60) || 'New EzanaQL query',
      text: [`EzanaQL (${dimension}):`, gen.query, sample].filter(Boolean).join('\n'),
    });
  };

  const r = preview.result;
  return (
    <>
      <div className="sbm-builder" onKeyDown={(e) => rowKeys(e, { onBack })}>
        <header className="sbm-builder-head">
          <button
            type="button"
            className="sbm-back"
            onClick={onBack}
            aria-label="Back to Research Composer"
            title="Back to Research Composer"
          >
            <i className="bi bi-arrow-left" aria-hidden="true" />
          </button>
          <p className="sbm-title">Create a new EzanaQL query</p>
          <p className="sbm-sub">
            Describe the data in plain English. Sonar writes the EzanaQL and checks it against the
            grammar before anything runs.
          </p>
        </header>
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
      <footer className="sbm-foot">
        <span className="sbm-current">
          Dataset: <b>{DIMENSIONS.find((d) => d.key === dimension)?.label.split(' (')[0]}</b>
        </span>
        <span className="sbm-keys" aria-hidden="true">
          <kbd>esc</kbd>
        </span>
      </footer>
    </>
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
          {state.list.map((a, i) => (
            <Row
              key={a.article_slug}
              i={i}
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
  const [path, setPath] = useState(null);
  const [view, setView] = useState('menu');
  const [filter, setFilter] = useState('');
  const [controls, setControls] = useResearchControls();
  const paneRef = useRef(null);
  const viaKeys = useRef(false);
  const has = (key) => items.some((c) => c.key === key);
  const { bodyProps, highlight } = useSlidingHighlight(`${path}:${view}`);

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

  /* After a keyboard drill, focus lands on the first row of the new level. */
  useEffect(() => {
    if (!viaKeys.current) return;
    viaKeys.current = false;
    paneRef.current?.querySelector('[data-sbm-row]:not(:disabled)')?.focus();
  }, [path]);

  const open = (key) => setPath(key);
  const back = () => {
    viaKeys.current = true;
    setPath(null);
  };

  const clearAll = () => {
    onClearContext?.();
    analyses.forEach((a) => onRemoveAnalysis?.(a.key));
    setControls({ ...controls, sources: CONTROL_DEFAULTS.sources, focus: CONTROL_DEFAULTS.focus });
  };

  const savedCount = saved.status === 'ready' ? saved.items.length : null;
  const root = [
    {
      key: 'queries',
      desc: 'Your saved EzanaQL queries.',
      tag: savedCount != null ? `${savedCount} saved` : null,
    },
    {
      key: 'models',
      desc: 'Fundamental analysis, DCF, backtesting and the Quant Lab library.',
      tag: `${models.length + ANALYSES.length}`,
    },
    {
      key: 'packs',
      desc: 'Narrow the run to market, filings, government or macro data.',
      tag: `${PACKS.length}`,
    },
    {
      key: 'tools',
      desc: 'Analysis lenses and the charts on this answer.',
      tag: `${LENSES.length + charts.length}`,
    },
    {
      key: 'echo',
      desc: 'Attach a published Ezana Echo article to investigate.',
      tag: null,
    },
  ];

  const builder = view === 'builder';
  const cat = path ? CATEGORIES[path] : null;
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
          ref={paneRef}
          className="sbm-pane"
          aria-hidden={builder || undefined}
          inert={builder ? '' : undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter') viaKeys.current = true;
            rowKeys(e, { onBack: path ? back : null });
          }}
        >
          <header className="sbm-head">
            <div className="sbm-head-text">
              <p className="sbm-title">
                <i className="bi bi-stack sbm-head-icon" aria-hidden="true" />
                Research Composer
              </p>
              <p className="sbm-sub">
                Add queries, models, data packs, tools and Echo articles to this search.
              </p>
            </div>
          </header>

          {cat ? (
            <nav className="sbm-crumbs" aria-label="Research Composer location">
              <button
                type="button"
                className="sbm-crumb-back"
                onClick={back}
                aria-label="Back to all categories"
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>
              <button type="button" className="sbm-crumb" onClick={back}>
                Research Composer
              </button>
              <i className="bi bi-chevron-right sbm-crumb-sep" aria-hidden="true" />
              <span className="sbm-crumb is-here" aria-current="page">
                {cat.label}
              </span>
            </nav>
          ) : null}

          <div
            className="sbm-body"
            role="menu"
            aria-label={cat ? cat.label : 'Categories'}
            {...bodyProps}
          >
            {highlight}
            <div className="sbm-level" key={path || 'root'}>
              {!path ? (
                <>
                  <p className="sbm-group">Add to this search</p>
                  <ul className="sbm-list">
                    {root.map((r, i) => (
                      <Row
                        key={r.key}
                        i={i}
                        parent
                        icon={CATEGORIES[r.key].icon}
                        title={r.key === 'echo' ? 'Echo articles' : CATEGORIES[r.key].label}
                        desc={r.desc}
                        tag={counts[r.key] ? `${counts[r.key]} added` : r.tag}
                        dot={counts[r.key] > 0}
                        onClick={() => open(r.key)}
                      />
                    ))}
                  </ul>
                  <p className="sbm-group">Create</p>
                  <ul className="sbm-list">
                    <Row
                      i={root.length}
                      parent
                      icon="bi-magic"
                      title="Create new query"
                      desc="Describe the data in plain English. Sonar writes the EzanaQL."
                      label="Create new query"
                      onClick={() => setView('builder')}
                    />
                    <li>
                      <Link
                        href="/sonar/library"
                        data-sbm-row=""
                        className="sbm-row"
                        style={{ '--i': root.length + 1 }}
                      >
                        <i className="bi bi-bookmark sbm-row-icon" aria-hidden="true" />
                        <span className="sbm-row-text">
                          <span className="sbm-row-line">
                            <span className="sbm-row-title">Open saved library</span>
                          </span>
                          <span className="sbm-row-desc">
                            Every query and model you have saved.
                          </span>
                        </span>
                        <span className="sbm-row-end" aria-hidden="true">
                          <i className="bi bi-arrow-up-right sbm-row-go" />
                        </span>
                      </Link>
                    </li>
                  </ul>
                </>
              ) : null}

              {path === 'queries' ? (
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
                      {saved.items.map((q, i) => {
                        const item = {
                          key: `query:${q.id}`,
                          kind: 'query',
                          label: q.label,
                          text: q.text,
                          query: q.query,
                          dimension: q.dimension,
                        };
                        return (
                          <Row
                            key={q.id}
                            i={i}
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
                    <p className="sbm-note">No saved queries yet.</p>
                  )}
                  <ul className="sbm-list sbm-list--gap">
                    <Row
                      i={saved.items?.length || 0}
                      parent
                      icon="bi-magic"
                      title="Create new query"
                      desc="Describe the data in plain English. Sonar writes the EzanaQL."
                      label="Create new query"
                      onClick={() => setView('builder')}
                    />
                  </ul>
                </>
              ) : null}

              {path === 'models' ? (
                <>
                  <p className="sbm-group">Analyses Sonar runs</p>
                  <ul className="sbm-list">
                    {ANALYSES.map((c, i) => {
                      const cur = analyses.find((a) => a.capability === c.key);
                      return (
                        <Row
                          key={c.key}
                          i={i}
                          title={c.label}
                          desc={c.summary}
                          tag={cur?.origin === 'auto' ? 'Auto' : 'Runs on data'}
                          on={Boolean(cur)}
                          onClick={() =>
                            cur ? onRemoveAnalysis?.(cur.key) : onAddAnalysis?.(c.key)
                          }
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
                        {list.map((m, i) => (
                          <Row
                            key={m.key}
                            i={i}
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
                    Analyses run on Ezana&apos;s data with deterministic code before Sonar writes
                    the answer. A library model is added as context: Sonar reads its method and
                    limits; it does not run it on your data.
                  </p>
                </>
              ) : null}

              {path === 'packs' ? (
                <>
                  <p className="sbm-group">Research data packs</p>
                  <ul className="sbm-list">
                    {PACKS.map((p, i) => (
                      <Row
                        key={p.key}
                        i={i}
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

              {path === 'tools' ? (
                <>
                  <p className="sbm-group">Analysis lenses</p>
                  <ul className="sbm-list">
                    {LENSES.map((l, i) => (
                      <Row
                        key={l.key}
                        i={i}
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
                        {charts.map((c, i) => (
                          <Row
                            key={c.key}
                            i={i}
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

              {path === 'echo' ? <EchoTab items={items} onToggle={onToggle} guest={guest} /> : null}
            </div>
          </div>

          <footer className="sbm-foot">
            <span className="sbm-current">
              Current: <b>{added ? `${added} added` : 'Nothing added yet'}</b>
              {added ? (
                <button type="button" className="sbm-clear" onClick={clearAll}>
                  Clear all
                </button>
              ) : null}
            </span>
            <Keys />
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

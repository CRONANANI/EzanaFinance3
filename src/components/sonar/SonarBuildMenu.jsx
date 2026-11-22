'use client';

/**
 * SonarBuildMenu (Nov 22 2026): "Build your research", the Build dropdown of the Sonar query
 * composer, laid out from the owner's ChatGPT reference (header, four category tabs, the
 * active category's rows, "More to add", and two footer actions) and kept to the Ezana
 * brand guide (an overlay keeps a solid surface, a border and a shadow; emerald accents;
 * Bootstrap Icons; text-only states, no glow on hover).
 *
 * Every row does something real today; nothing is shown that cannot run:
 *   Queries     the reader's saved EzanaQL queries (/api/ezanaql/saved), added as context
 *   Models      the Quant Lab model library (QUANT_MODELS), added as context, by family
 *   Data packs  the research engine's dataset families (SOURCE_OPTIONS): choosing one narrows
 *               the next run to that family, through the same Research controls store
 *   Tools       analysis lenses (FOCUS_OPTIONS, the run's focus directive) and the charts on
 *               this answer (added as context)
 * Context items travel with the question (the host runs it as research). Packs and lenses are
 * the Research controls themselves, so the card beside the composer shows the same choice.
 *
 * Props: items (context list), onToggle(item), saved {status, items}, guest, charts,
 * models, onClearContext, max.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useResearchControls } from './research-controls-store';
import { FOCUS_OPTIONS, SOURCE_OPTIONS, CONTROL_DEFAULTS } from '@/lib/sonar/research-controls';

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
];

function Row({ icon, title, desc, tag, tagTone, on, onClick, disabled, label }) {
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
        <span className="sbm-row-icon" aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
        <span className="sbm-row-text">
          <span className="sbm-row-title">{title}</span>
          {desc ? <span className="sbm-row-desc">{desc}</span> : null}
        </span>
        {tag ? (
          <span className={`sbm-tag${tagTone ? ` sbm-tag--${tagTone}` : ''}`}>{tag}</span>
        ) : null}
        <span className="sbm-row-add" aria-hidden="true">
          <i className={`bi ${on ? 'bi-check-lg' : 'bi-plus-lg'}`} />
        </span>
      </button>
    </li>
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
}) {
  const [tab, setTab] = useState('queries');
  const [filter, setFilter] = useState('');
  const [controls, setControls] = useResearchControls();
  const has = (key) => items.some((c) => c.key === key);

  const packOn = controls.sources !== 'all' ? controls.sources : null;
  const lensOn = controls.focus !== 'general' ? controls.focus : null;
  const counts = {
    queries: items.filter((c) => c.kind === 'query').length,
    models: items.filter((c) => c.kind === 'model').length,
    packs: packOn ? 1 : 0,
    tools: items.filter((c) => c.kind === 'chart').length + (lensOn ? 1 : 0),
  };
  const added = counts.queries + counts.models + counts.packs + counts.tools;

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
    setControls({ ...controls, sources: CONTROL_DEFAULTS.sources, focus: CONTROL_DEFAULTS.focus });
  };

  const more = [
    {
      tab: 'models',
      icon: 'bi-box',
      title: 'Models',
      desc: 'Pricing, regimes, volatility, factors and forecasting.',
      tag: `${models.length} models`,
    },
    {
      tab: 'packs',
      icon: 'bi-database',
      title: 'Data packs',
      desc: 'Narrow the run to market, filings, government or macro data.',
      tag: `${PACKS.length} packs`,
    },
    {
      tab: 'tools',
      icon: 'bi-wrench-adjustable',
      title: 'Tools',
      desc: 'Analysis lenses and the charts on this answer.',
      tag: `${LENSES.length + charts.length} tools`,
    },
  ];

  return (
    <div id={id} ref={menuRef} className="sbm" role="dialog" aria-label="Build your research">
      <header className="sbm-head">
        <span className="sbm-head-icon" aria-hidden="true">
          <i className="bi bi-stack" />
        </span>
        <div className="sbm-head-text">
          <p className="sbm-title">Build your research</p>
          <p className="sbm-sub">Add models, queries, data packs and tools to this search.</p>
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

      <div className="sbm-tabs" role="tablist" aria-label="Build categories">
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
              <p className="sbm-note">
                No saved queries yet. Create one below and it will appear here.
              </p>
            )}
            <p className="sbm-group">More to add</p>
            <ul className="sbm-list">
              {more.map((m) => (
                <li key={m.tab}>
                  <button type="button" className="sbm-row" onClick={() => setTab(m.tab)}>
                    <span className="sbm-row-icon" aria-hidden="true">
                      <i className={`bi ${m.icon}`} />
                    </span>
                    <span className="sbm-row-text">
                      <span className="sbm-row-title">{m.title}</span>
                      <span className="sbm-row-desc">{m.desc}</span>
                    </span>
                    <span className="sbm-tag sbm-tag--muted">{m.tag}</span>
                    <span className="sbm-row-go" aria-hidden="true">
                      <i className="bi bi-chevron-right" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === 'models' ? (
          <>
            <label className="sbm-search">
              <i className="bi bi-search" aria-hidden="true" />
              <span className="sbm-sr">Search models</span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search models"
                autoComplete="off"
              />
            </label>
            {families.length ? (
              families.map(([family, list]) => (
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
              ))
            ) : (
              <p className="sbm-note">No model matches that search.</p>
            )}
            <p className="sbm-foot-note">
              A model is added as context: Sonar reads its method and limits alongside the evidence.
              It does not run the model on your data.
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
                  tag={packOn === p.key ? 'Selected' : null}
                  on={packOn === p.key}
                  onClick={() =>
                    setControls({ ...controls, sources: packOn === p.key ? 'all' : p.key })
                  }
                />
              ))}
            </ul>
            <p className="sbm-foot-note">
              One pack at a time. It narrows the next research run to that data, within what your
              plan includes. The same choice shows under Research controls.
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
                  tag={lensOn === l.key ? 'Selected' : null}
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
      </div>

      <footer className="sbm-foot">
        <Link href="/sonar/library" className="sbm-btn" target="_blank" rel="noopener">
          <i className="bi bi-bookmark" aria-hidden="true" />
          Open saved library
        </Link>
        <Link
          href="/datasets/capitol"
          className="sbm-btn sbm-btn--primary"
          target="_blank"
          rel="noopener"
        >
          <i className="bi bi-plus-lg" aria-hidden="true" />
          Create new query
        </Link>
      </footer>
    </div>
  );
}

export default SonarBuildMenu;

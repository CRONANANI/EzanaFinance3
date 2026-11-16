'use client';

/**
 * Reports (/org-team-hub/reports). The council's saved stakeholder reports:
 * frozen, printable summaries of the fund for deans, donors and advisory
 * boards. Generate one (with a check before saving), open its printable
 * copy, compare two saved reports, delete one.
 *
 * Who sees what (the server checks every action again):
 *   executive (faculty advisors are executives)   everything
 *   portfolio manager   everything, unless the advisor's "Who can export
 *                       stakeholder reports" setting is executives and
 *                       advisors only; then a one-line explanation
 *   analyst             a one-line "managers only" explanation
 *
 * Reports leave Ezana only as a printed or saved PDF. There are no share
 * links, no email and no schedule.
 *
 * The page renders inside TeamHubShell (the shared sidebar), which the layout
 * provides. It never draws the sidebar itself.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { VisuallyHidden } from '@/components/ds';
import { Skel, SectionError, TextToggle } from '@/components/org/command-center/parts';
import {
  DEFAULT_PERIOD,
  DISCLOSURE,
  EXPORT_SCOPES,
  LEGACY_NOTE,
  NA,
  fmtDay,
  fmtMoney,
  fmtPct,
  fmtPts,
  rowDisclosure,
  tone,
} from '@/lib/org-reports-model';
import { renderPrintableHtml } from '@/lib/org-reports-document';
import { useReportsData } from './useReportsData';
import { DeleteDialog, GenerateDialog, YesNo } from './ReportDialogs';
import '@/components/org/command-center/command-center.css';
import './reports.css';
import '@/styles/home-canvas.css';

const pdfHref = (id) => `/api/org/reports/${encodeURIComponent(id)}/pdf`;
const toneClass = (v) => {
  const t = tone(v);
  return t === 'pos' ? ' tcc-pos' : t === 'neg' ? ' tcc-neg' : t === 'na' ? ' tcc-na' : '';
};
const COMPARE_MAX = 6;

function Kpi({ icon, label, loading, na, toneCls = '', title, children }) {
  return (
    <div className="tcc-kpi" role="listitem" title={title}>
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${na ? ' tcc-na' : toneCls}`}>
        {loading ? <Skel w={56} h={16} /> : children}
      </span>
    </div>
  );
}

function Head({ id, title, count, aside }) {
  return (
    <div className="tcc-head">
      <h2 className="tcc-title" id={id}>
        {title}
        {count != null && <span className="tcc-mono rpt-count"> {count}</span>}
      </h2>
      {aside ? <div className="tcc-head__aside">{aside}</div> : null}
    </div>
  );
}

function SkelLines({ rows = 4 }) {
  return (
    <div className="rpt-skel" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skel key={i} w={`${100 - (i % 3) * 9}%`} h={i === 0 ? 10 : 14} />
      ))}
    </div>
  );
}

/** Benchmark cell text for a summary row. */
function benchText(r) {
  if (r.comparison) return fmtPct(r.comparison.benchmarkPct);
  if (r.legacy && r.legacyBenchmarkPct != null) return fmtPct(r.legacyBenchmarkPct);
  return NA;
}

/* ── The printable preview ──────────────────────────────────────────────── */
function Preview({ latest, sample }) {
  const box = useRef(null);
  const frame = useRef(null);
  const [scale, setScale] = useState(0.6);
  const [docH, setDocH] = useState(1400);
  const html = useMemo(() => {
    if (!latest || typeof window === 'undefined') return '';
    return renderPrintableHtml(latest, {
      origin: window.location.origin,
      screen: false,
      sample,
      authorName: latest.authorName || null,
    });
  }, [latest, sample]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / 820)));
    ro.observe(el);
    setScale(Math.min(1, el.clientWidth / 820));
    return () => ro.disconnect();
  }, []);

  const onLoad = () => {
    try {
      const h = frame.current?.contentDocument?.documentElement?.scrollHeight;
      if (h) setDocH(h);
    } catch {
      /* not readable: keep the default height */
    }
  };

  return (
    <div className="rpt-preview" ref={box} style={{ height: Math.ceil(docH * scale) }}>
      {html && (
        <iframe
          ref={frame}
          title={`Printable preview of ${latest.title}`}
          className="rpt-preview__frame"
          sandbox="allow-same-origin"
          srcDoc={html}
          onLoad={onLoad}
          tabIndex={-1}
          style={{ height: docH, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}

/* ── Saved reports ──────────────────────────────────────────────────────── */
function SavedTable({ reports, canDelete, onDelete }) {
  return (
    <div className="rpt-table" role="table" aria-label="Saved reports">
      <div className="rpt-table__head" role="row">
        <span role="columnheader">Report</span>
        <span role="columnheader">Generated</span>
        <span role="columnheader">Cohort</span>
        <span role="columnheader" className="rpt-num">
          Fund value
        </span>
        <span role="columnheader" className="rpt-num">
          Gain on cost
          <span className="rpt-head__sub">not time-weighted</span>
        </span>
        <span role="columnheader" className="rpt-num">
          Benchmark
          <span className="rpt-head__sub">same dates</span>
        </span>
        <span role="columnheader" className="rpt-num">
          Difference
        </span>
        <span role="columnheader" className="rpt-num">
          Positions
        </span>
        <span role="columnheader" className="rpt-num">
          <span className="tcc-sr">Actions</span>
        </span>
      </div>
      {reports.map((r) => {
        const c = r.comparison;
        return (
          <div className="rpt-table__row" role="row" key={r.id}>
            <span role="cell" className="rpt-cell rpt-cell--report">
              <span className="rpt-strong">{r.title}</span>
              <span className="rpt-sub">{r.period}</span>
            </span>
            <span role="cell" className="rpt-cell rpt-cell--gen">
              <span className="tcc-mono">{fmtDay(r.createdAt)}</span>
              <span className={`rpt-sub${r.author ? '' : ' tcc-na'}`}>{r.author || NA}</span>
            </span>
            <span role="cell" className={`rpt-cell rpt-cell--cohort${r.cohort ? '' : ' tcc-na'}`}>
              <span className="rpt-label" aria-hidden="true">
                Cohort
              </span>
              {r.cohort || NA}
            </span>
            <span role="cell" className="rpt-num tcc-mono rpt-cell--value">
              <span className="rpt-label" aria-hidden="true">
                Fund value
              </span>
              {fmtMoney(r.fundValue)}
            </span>
            <span role="cell" className={`rpt-num tcc-mono rpt-cell--gain${toneClass(r.gainPct)}`}>
              <span className="rpt-label" aria-hidden="true">
                Gain on cost
              </span>
              {fmtPct(r.gainPct)}
            </span>
            <span role="cell" className="rpt-num tcc-mono rpt-cell--bench">
              <span className="rpt-label" aria-hidden="true">
                Benchmark
              </span>
              {r.symbol} {benchText(r)}
              {r.legacy && r.legacyBenchmarkPct != null && (
                <span className="rpt-sub rpt-sub--sans">earlier method, other dates</span>
              )}
            </span>
            <span
              role="cell"
              className={`rpt-num tcc-mono rpt-cell--diff${c ? toneClass(c.differencePts) : ' tcc-na'}`}
            >
              <span className="rpt-label" aria-hidden="true">
                Difference
              </span>
              {c ? fmtPts(c.differencePts) : NA}
            </span>
            <span role="cell" className="rpt-num tcc-mono rpt-cell--pos">
              <span className="rpt-label" aria-hidden="true">
                Positions
              </span>
              {r.positions ?? NA}
            </span>
            <span role="cell" className="rpt-num rpt-cell--act">
              {r.local ? (
                <span className="tcc-na rpt-sub">Not saved</span>
              ) : (
                <a
                  className="tcc-link"
                  href={pdfHref(r.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open printable report
                  <span className="tcc-sr"> for {r.title} (opens in a new tab)</span>
                </a>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="tcc-textbtn rpt-danger"
                  onClick={() => onDelete(r)}
                >
                  Delete<span className="tcc-sr"> {r.title}</span>
                </button>
              )}
            </span>
            <span role="cell" className="rpt-cell rpt-cell--note">
              {rowDisclosure(r)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Compare two saved reports ─────────────────────────────────────────── */
function compareRows(r) {
  const c = r.comparison;
  return [
    ['Generated', fmtDay(r.createdAt), '', true],
    ['Generated by', r.author || NA, r.author ? '' : ' tcc-na', false],
    ['Fund value', fmtMoney(r.fundValue), '', true],
    [
      'Gain on cost of current holdings, not time-weighted',
      fmtPct(r.gainPct),
      toneClass(r.gainPct),
      true,
    ],
    ['Compared dates', c ? `${fmtDay(c.start)} to ${fmtDay(c.end)}` : NA, c ? '' : ' tcc-na', true],
    [`${r.symbol}, same dates`, c ? fmtPct(c.benchmarkPct) : NA, c ? '' : ' tcc-na', true],
    [
      'Difference to benchmark, same dates',
      c ? fmtPts(c.differencePts) : NA,
      c ? toneClass(c.differencePts) : ' tcc-na',
      true,
    ],
    ['Positions', r.positions ?? NA, '', true],
    [
      'Unpriced holdings',
      r.unpricedCount == null
        ? NA
        : `${r.unpricedCount}${r.unpricedCount ? ' (valued at cost)' : ''}`,
      r.unpricedCount == null ? ' tcc-na' : '',
      true,
    ],
    [
      'Roster included',
      r.includeRoster == null ? NA : r.includeRoster ? 'Yes' : 'No',
      r.includeRoster == null ? ' tcc-na' : '',
      false,
    ],
    [
      'Analyst names included',
      r.includeNames == null ? NA : r.includeNames ? 'Yes' : 'No',
      r.includeNames == null ? ' tcc-na' : '',
      false,
    ],
  ];
}

function Compare({ reports }) {
  const pool = reports.slice(0, COMPARE_MAX);
  const [left, setLeft] = useState(pool[0]?.id);
  const [right, setRight] = useState(pool[1]?.id);
  useEffect(() => {
    if (!pool.some((r) => r.id === left)) setLeft(pool[0]?.id);
    if (!pool.some((r) => r.id === right)) setRight(pool[1]?.id || pool[0]?.id);
  }, [pool, left, right]);
  const a = pool.find((r) => r.id === left) || pool[0];
  const b = pool.find((r) => r.id === right) || pool[1] || pool[0];
  if (!a || !b) return null;
  const ra = compareRows(a);
  const rb = compareRows(b);
  const picker = (side, value, set) => (
    <div className="rpt-picker" role="group" aria-label={`${side} report`}>
      <span className="rpt-picker__label">{side}</span>
      <span className="tcc-toggles">
        {pool.map((r) => (
          <TextToggle key={r.id} pressed={value === r.id} onClick={() => set(r.id)}>
            {r.period}
          </TextToggle>
        ))}
      </span>
    </div>
  );
  return (
    <section className="tcc-section" aria-labelledby="rpt-compare">
      <Head id="rpt-compare" title="Compare saved reports" />
      <p className="rpt-lede">
        Two saved reports side by side, each with its own frozen figures.
        {reports.length > COMPARE_MAX ? ` The ${COMPARE_MAX} most recent can be picked.` : ''}
      </p>
      <div className="rpt-compare" role="table" aria-label="Compare saved reports">
        <div className="rpt-compare__row rpt-compare__row--pick" role="row">
          <span role="columnheader" className="rpt-compare__k">
            <span className="tcc-sr">Measure</span>
          </span>
          <span role="columnheader">
            {picker('Left', a.id, setLeft)}
            <span className="rpt-compare__name">{a.title}</span>
          </span>
          <span role="columnheader">
            {picker('Right', b.id, setRight)}
            <span className="rpt-compare__name">{b.title}</span>
          </span>
        </div>
        {ra.map(([k, va, ta, mono], i) => (
          <div className="rpt-compare__row" role="row" key={k}>
            <span role="rowheader" className="rpt-compare__k">
              {k}
            </span>
            <span role="cell" className={`${mono ? 'tcc-mono ' : ''}rpt-compare__v${ta}`}>
              {va}
            </span>
            <span role="cell" className={`${rb[i][3] ? 'tcc-mono ' : ''}rpt-compare__v${rb[i][2]}`}>
              {rb[i][1]}
            </span>
          </div>
        ))}
        <div className="rpt-compare__row rpt-compare__row--note" role="row">
          <span role="cell" className="rpt-compare__k" />
          <span role="cell" className="rpt-note">
            {a.legacy ? LEGACY_NOTE : DISCLOSURE}
          </span>
          <span role="cell" className="rpt-note">
            {b.legacy ? LEGACY_NOTE : DISCLOSURE}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── The page ───────────────────────────────────────────────────────────── */
export function ReportsPage({ sampleViewer = false }) {
  const data = useReportsData({ sampleViewer });
  const { view, sampleActive } = data;
  const [period, setPeriod] = useState('');
  const [includeRoster, setIncludeRoster] = useState(true);
  const [includeNames, setIncludeNames] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState(null);

  const loading = view.status === 'loading';
  const failed = view.status === 'error';
  const ready = view.status === 'ready';
  const access = view.viewer?.access || (ready ? 'ok' : null);
  const reports = useMemo(() => (ready ? view.reports || [] : []), [ready, view.reports]);
  const latestRow = reports[0] || null;
  const latestDoc =
    view.latest && latestRow && view.latest.id === latestRow.id ? view.latest : null;
  const canGenerate = ready && Boolean(view.viewer?.canGenerate);
  const canDelete = ready && Boolean(view.viewer?.canDelete);
  const council = view.council || latestRow?.council || null;
  const scopeText = EXPORT_SCOPES[view.viewer?.exportScope] || EXPORT_SCOPES.exec_pm_advisor;

  /* Switching between sample content and council data starts fresh. */
  const lastSample = useRef(sampleActive);
  useEffect(() => {
    if (lastSample.current === sampleActive) return;
    lastSample.current = sampleActive;
    setDialog(null);
    setNotice(null);
  }, [sampleActive]);

  const openGenerate = () => setDialog({ kind: 'generate' });

  const afterGenerate = (res) => {
    setDialog(null);
    if (!res) return;
    if (res.sample) {
      setNotice({ text: 'Report added to the sample. Nothing was saved.' });
      return;
    }
    setPeriod('');
    const href = res.id ? pdfHref(res.id) : null;
    if (href && typeof window !== 'undefined') window.open(href, '_blank', 'noopener');
    setNotice({
      text: 'Report saved. Its printable copy opened in a new tab.',
      href,
    });
  };

  if (view.status === 'forbidden') {
    return (
      <div className="dashboard-page-inset ez-canvas tcc-page rpt-page">
        <VisuallyHidden>
          <h1>Reports</h1>
        </VisuallyHidden>
        <p className="tcc-state" role="status">
          This page is for council members only.
        </p>
      </div>
    );
  }

  if (ready && access !== 'ok') {
    return (
      <div className="dashboard-page-inset ez-canvas tcc-page rpt-page">
        <VisuallyHidden>
          <h1>Reports</h1>
        </VisuallyHidden>
        <div className="rpt-access" role="status">
          <i className="bi bi-lock" aria-hidden="true" />
          <div>
            <p className="rpt-access__title">
              {access === 'export_restricted'
                ? 'Your council limits stakeholder reports to executives and faculty advisors.'
                : 'Stakeholder reports are for managers only.'}
            </p>
            <p className="rpt-access__text">
              {access === 'export_restricted'
                ? 'A faculty advisor set this in the council settings. Ask an executive or your faculty advisor for a printed copy.'
                : 'Executives, portfolio managers and faculty advisors can generate and open stakeholder reports. Ask a portfolio manager for a printed copy.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const L = latestRow;
  const lc = L?.comparison || null;
  const empty = ready && reports.length === 0;

  /* ── Row 1: figures from the latest report, and page actions ── */
  const top = (
    <div className="tcc-top rpt-top">
      <div className="tcc-kpis" aria-busy={loading || undefined}>
        <div
          className="tcc-kpistrip rpt-kpistrip"
          role="list"
          aria-label="Figures from the latest report"
        >
          <Kpi icon="bi-file-earmark-text" label="Reports saved" loading={loading} na={failed}>
            {failed ? NA : reports.length}
          </Kpi>
          <Kpi icon="bi-stack" label="Latest fund value" loading={loading} na={!L}>
            {L ? fmtMoney(L.fundValue) : NA}
          </Kpi>
          <Kpi
            icon="bi-graph-up-arrow"
            label="Gain on cost"
            loading={loading}
            na={!L || L.gainPct == null}
            toneCls={toneClass(L?.gainPct)}
            title="Gain on cost of current holdings, not time-weighted"
          >
            {L ? fmtPct(L.gainPct) : NA}
          </Kpi>
          <Kpi
            icon="bi-bar-chart"
            label={`${L?.symbol || 'SPY'}, same dates`}
            loading={loading}
            na={!lc}
            title="The benchmark over the same dates and weights as the fund"
          >
            {lc ? fmtPct(lc.benchmarkPct) : NA}
          </Kpi>
          <Kpi icon="bi-box" label="Positions" loading={loading} na={!L || L.positions == null}>
            {L?.positions ?? NA}
          </Kpi>
        </div>
      </div>
      <div className="tcc-actions">
        {(sampleActive || data.sampleAvailable) && (
          <div className="tcc-actions__context">
            {sampleActive && <span className="tcc-sample">Sample content</span>}
            {data.sampleAvailable && (
              <button
                type="button"
                className="tcc-textbtn"
                onClick={() => data.setShowSample(!sampleActive)}
              >
                {sampleActive ? 'Show council data' : 'Show sample content'}
              </button>
            )}
          </div>
        )}
        <button type="button" className="tcc-textbtn" onClick={data.refresh} disabled={loading}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          Refresh
        </button>
        {canGenerate && (
          <button type="button" className="tcc-btn" onClick={openGenerate}>
            <i className="bi bi-file-earmark-plus" aria-hidden="true" />
            Generate report
          </button>
        )}
      </div>
    </div>
  );

  const caption = L ? (
    <p className="rpt-caption">
      From the latest report, {fmtDay(L.createdAt)}. Gain on cost of current holdings, not
      time-weighted.{' '}
      {lc ? (
        <>
          Current holdings{' '}
          <span className={`tcc-mono${toneClass(lc.fundPct)}`}>{fmtPct(lc.fundPct)}</span> against{' '}
          {L.symbol} over the same dates, {fmtDay(lc.start)} to {fmtDay(lc.end)}: difference{' '}
          <span className={`tcc-mono${toneClass(lc.differencePts)}`}>
            {fmtPts(lc.differencePts)}
          </span>
          .
        </>
      ) : L.legacy ? (
        LEGACY_NOTE
      ) : (
        'No benchmark price history was available for this report.'
      )}
    </p>
  ) : null;

  /* ── Generate column ── */
  const generate = (
    <section className="tcc-section" aria-labelledby="rpt-generate">
      <Head id="rpt-generate" title="Generate report" />
      {loading ? (
        <SkelLines rows={6} />
      ) : (
        <div className="rpt-gen">
          <label className="rpt-field">
            <span className="rpt-field__label">Period label</span>
            <span className="rpt-field__input">
              <i className="bi bi-pencil" aria-hidden="true" />
              <input
                value={period}
                maxLength={120}
                placeholder="Period label, e.g. Fall 2026"
                onChange={(e) => setPeriod(e.target.value)}
              />
            </span>
            <span className="rpt-field__hint">
              A name only. It does not change the dates or figures. Empty saves &ldquo;
              {DEFAULT_PERIOD}&rdquo;.
            </span>
          </label>
          <div className="rpt-gen__choices">
            <YesNo
              id="rpt-roster"
              label="Include roster"
              value={includeRoster}
              onChange={setIncludeRoster}
            />
            <YesNo
              id="rpt-names"
              label="Include analyst names"
              value={includeNames}
              onChange={setIncludeNames}
            />
          </div>
          <div>
            <h3 className="rpt-h3">What will be saved</h3>
            <dl className="rpt-kv">
              <dt>Council</dt>
              <dd>{council || NA}</dd>
              <dt>Period label</dt>
              <dd>{period.trim() || DEFAULT_PERIOD}</dd>
              <dt>Fund figures</dt>
              <dd>
                Fund value, gain on cost of current holdings (not time-weighted), positions and
                unpriced holdings, as they stand when you save
              </dd>
              <dt>Benchmark</dt>
              <dd>
                {L?.symbol || 'The council benchmark'} and current holdings over the same dates,
                with the difference in points
              </dd>
              <dt>Sector attribution</dt>
              <dd>Weight and contribution to gain on cost, by sector</dd>
              <dt>Pitch outcomes</dt>
              <dd>
                Up to 10 accepted pitches with an outcome, against SPY over each pitch&rsquo;s own
                dates{includeNames ? ', with analyst names' : ', without analyst names'}
              </dd>
              <dt>Roster</dt>
              <dd>{includeRoster ? 'Included' : 'Not included, no names saved'}</dd>
              <dt>Disclosure</dt>
              <dd>Printed on the report and shown with every saved row</dd>
            </dl>
          </div>
          {canGenerate && (
            <div className="rpt-gen__action">
              <button type="button" className="tcc-btn" onClick={openGenerate}>
                Check and save report
              </button>
              <span className="rpt-sub">
                The figures and pre-save checks show before anything is saved.
              </span>
            </div>
          )}
          <p className="rpt-access-line">
            <i className="bi bi-shield-lock" aria-hidden="true" />
            <span>
              {scopeText} can generate, open and delete reports. Analysts cannot. A report leaves
              Ezana only as a printed or saved PDF.
            </span>
          </p>
        </div>
      )}
    </section>
  );

  /* ── Preview column ── */
  const preview = (
    <section className="tcc-section" aria-labelledby="rpt-preview">
      <Head
        id="rpt-preview"
        title="Latest printable report"
        aside={
          L && !L.local ? (
            <a className="tcc-link" href={pdfHref(L.id)} target="_blank" rel="noopener noreferrer">
              Open printable report <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              <span className="tcc-sr"> (opens in a new tab)</span>
            </a>
          ) : null
        }
      />
      {loading ? (
        <Skel w="100%" h={420} className="rpt-preview__skel" />
      ) : latestDoc ? (
        <Preview latest={latestDoc} sample={sampleActive} />
      ) : L ? (
        <p className="tcc-state">
          {L.local
            ? 'The newest row is on this page only, so it has no printable copy.'
            : 'Refresh to preview the newest report.'}
        </p>
      ) : (
        <p className="tcc-state">The first saved report will be previewed here.</p>
      )}
    </section>
  );

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page rpt-page">
      <VisuallyHidden>
        <h1>Stakeholder reports</h1>
      </VisuallyHidden>
      {top}
      {failed ? (
        <SectionError
          message="Saved reports could not be loaded. Check your connection, then try again."
          onRetry={data.retry}
        />
      ) : (
        <>
          {caption}
          {notice && (
            <p className="rpt-notice" role="status">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <span>{notice.text}</span>
              {notice.href && (
                <a
                  className="tcc-link"
                  href={notice.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open printable report
                </a>
              )}
              <button type="button" className="tcc-textbtn" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </p>
          )}
          <div className="tcc-row rpt-row">
            {generate}
            <span className="tcc-vrule" aria-hidden="true" />
            {preview}
          </div>
          <div className="tcc-row tcc-row--single">
            <section
              className="tcc-section"
              aria-labelledby="rpt-saved"
              aria-busy={loading || undefined}
            >
              <Head id="rpt-saved" title="Saved reports" count={ready ? reports.length : null} />
              {loading ? (
                <SkelLines rows={5} />
              ) : empty ? (
                <p className="tcc-state">
                  <span>No reports saved yet. The first saved report will appear here.</span>
                  {canGenerate && (
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent"
                      onClick={openGenerate}
                    >
                      Generate report
                    </button>
                  )}
                </p>
              ) : (
                <SavedTable
                  reports={reports}
                  canDelete={canDelete}
                  onDelete={(r) => setDialog({ kind: 'delete', report: r })}
                />
              )}
            </section>
          </div>
          {ready && reports.length >= 2 && (
            <div className="tcc-row tcc-row--single">
              <Compare reports={reports} />
            </div>
          )}
          {sampleActive && (
            <p className="rpt-footnote">
              Sample content only. Names, figures and dates shown here are invented, and nothing
              done to them is saved.
            </p>
          )}
        </>
      )}

      {dialog?.kind === 'generate' && canGenerate && (
        <GenerateDialog
          initial={{ period, includeRoster, includeNames }}
          sample={sampleActive}
          onCheck={data.check}
          onSave={data.save}
          onClose={afterGenerate}
        />
      )}
      {dialog?.kind === 'delete' && canDelete && (
        <DeleteDialog
          report={dialog.report}
          council={council}
          sample={sampleActive}
          onConfirm={data.remove}
          onClose={(msg) => {
            setDialog(null);
            if (msg) setNotice({ text: msg });
          }}
        />
      )}
    </div>
  );
}

export default ReportsPage;

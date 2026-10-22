'use client';

/**
 * The three activist side panels: Investor Dossier (?filer= / ?campaign=),
 * Target File (?target=) and Filing Reader (?filing=). Spec:
 * activist-handoff/04-SPEC.md. Shell behaviour (scrim, Escape, focus trap)
 * comes from the shared titans Panel with prefix="act".
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Panel,
  PanelClose,
  PanelSection,
  ScoreChip,
  Skel,
  useJson,
} from '@/components/datasets/titans/ui';
import { PURPOSE_TAG_LABEL, FUND_SOURCE_LABEL, G_RULE_BASIS } from '@/lib/sec/schedule13-meta';
import { int, pct, shortDate, signedInt, signedPct, MISSING as M } from '@/lib/titans/format';
import { FilerName, FormMark, StateChip, StatusChip, TagPill, WatchChip } from './ActCards';

const ERROR_COPY = 'This view could not load. The rest of the page still works.';
const SAMPLE_COPY =
  'Sample mode shows the page from a fixture; per-filing detail is not loaded here.';

function PanelState({ status, retry, sampled, children }) {
  if (sampled) return <p className="act-empty">{SAMPLE_COPY}</p>;
  if (status === 'loading') {
    return (
      <div className="act-psec">
        <Skel prefix="act" w="60%" h={20} />
        <Skel prefix="act" w="90%" />
        <Skel prefix="act" w="80%" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <p className="act-empty" role="status">
        {ERROR_COPY}{' '}
        <button type="button" className="act-link" onClick={retry}>
          Retry
        </button>
      </p>
    );
  }
  return children;
}

const edgarFilerUrl = (cik) =>
  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(cik)}&type=SC+13&dateb=&owner=include&count=40`;

/* ── Investor Dossier ────────────────────────────────────────────────── */

export function InvestorDossier({ cik, campaignKey, sampled, onClose, onCampaign, onFiling }) {
  const { status, data, retry } = useJson(
    !sampled && cik ? `/api/titans/activist/investor?cik=${encodeURIComponent(cik)}` : null,
  );
  return (
    <Panel prefix="act" label="Investor dossier" onClose={onClose}>
      <PanelClose prefix="act" onClose={onClose} />
      <PanelState status={status} retry={retry} sampled={sampled}>
        {data ? (
          <>
            <header className="act-phead">
              <p className="act-eyebrow">Investor dossier</p>
              <h2 className="act-ptitle" tabIndex={-1} data-panel-title>
                {data.name || 'Filer not confirmed'}
              </h2>
              <p className="act-pmeta act-mono">
                CIK {data.cik} · {(data.types || []).map((t) => t.label).join(' · ') || M}
              </p>
              <p className="act-pmeta">
                <span className="act-mono">{int(data.filings)}</span> filings on file, from{' '}
                <span className="act-mono">{shortDate(data.firstFiled)}</span> to{' '}
                <span className="act-mono">{shortDate(data.lastFiled)}</span>
                {data.confirmedFrom ? (
                  <span className="act-muted"> · confirmed from the {data.confirmedFrom}</span>
                ) : null}
              </p>
              <p className="act-plinks">
                <a
                  className="act-link"
                  href={edgarFilerUrl(data.cik)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  All filings on EDGAR <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
                {data.has13F ? (
                  <Link
                    className="act-link"
                    href={`/datasets/institutional?manager=${encodeURIComponent(data.cik)}`}
                  >
                    Manager fingerprint (13F)
                  </Link>
                ) : null}
              </p>
            </header>
            <PanelSection prefix="act" title={`Campaigns · ${int((data.campaigns || []).length)}`}>
              {(data.campaigns || []).map((c) => (
                <DossierCampaign
                  key={c.key}
                  campaign={c}
                  expanded={campaignKey === c.key}
                  onCampaign={onCampaign}
                  onFiling={onFiling}
                />
              ))}
            </PanelSection>
            <PanelSection prefix="act" title="How this investor files">
              <MixBars label="Forms" rows={data.mixes?.forms} map={{}} />
              <MixBars label="Stated purposes" rows={data.mixes?.tags} map={PURPOSE_TAG_LABEL} />
              <MixBars label="Source of funds" rows={data.mixes?.funds} map={FUND_SOURCE_LABEL} />
            </PanelSection>
            {data.graph?.edges?.length ? (
              <PanelSection prefix="act" title="Files alongside">
                <CoFilingGraph graph={data.graph} />
                <p className="act-note">
                  Reporting persons that appear on the same cover pages. Each node is one person or
                  entity; a line means they filed together.
                </p>
              </PanelSection>
            ) : null}
          </>
        ) : null}
      </PanelState>
    </Panel>
  );
}

function DossierCampaign({ campaign: c, expanded, onCampaign, onFiling }) {
  const ref = useRef(null);
  useEffect(() => {
    if (expanded) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [expanded]);
  const pcts = (c.filings || []).map((f) => f.percentOfClass).filter((v) => v != null);
  return (
    <div className={`act-dcampaign${expanded ? ' is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="act-dcampaign-head"
        aria-expanded={expanded}
        onClick={() => onCampaign(expanded ? null : c.key)}
      >
        <span className="act-mono">{c.ticker || M}</span>
        <span className="act-muted act-ellipsis">{c.subject}</span>
        <Sparkline values={pcts} />
        <span className="act-mono act-strong">{c.latestPct != null ? pct(c.latestPct, 1) : M}</span>
        <StatusChip status={c.status} />
      </button>
      {expanded ? (
        <ol className="act-dfilings">
          {(c.filings || []).map((f) => (
            <li key={f.accessionNo}>
              <button type="button" className="act-dfiling" onClick={() => onFiling(f.accessionNo)}>
                <span className="act-mono act-muted">{shortDate(f.filedAt)}</span>
                <FormMark form={f.form} switched={f.switch} />
                <span className="act-mono">
                  {f.form}
                  {f.isAmendment ? `/A${f.amendmentNo ?? ''}` : ''}
                </span>
                <span className="act-mono act-strong">
                  {f.percentOfClass != null ? pct(f.percentOfClass, 1) : M}
                </span>
                <span className="act-dfiling-chips">
                  {f.switch ? <WatchChip>SWITCHED</WatchChip> : null}
                  {f.raise ? <span className="act-pos act-mono">raised</span> : null}
                  {f.exit ? <span className="act-neg act-mono">exit</span> : null}
                  {!f.detailParsed ? <StateChip>Detail arriving</StateChip> : null}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function Sparkline({ values }) {
  if (!values || values.length < 2) return <span className="act-spark" aria-hidden="true" />;
  const max = Math.max(...values, 10);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`)
    .join(' ');
  return (
    <svg className="act-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={pts}
        style={{ stroke: 'var(--act-titans-ink)', strokeWidth: 2, fill: 'none' }}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MixBars({ label, rows, map }) {
  const list = (rows || []).slice(0, 5);
  if (!list.length) return null;
  const max = Math.max(1, ...list.map((r) => r.n));
  return (
    <div className="act-mix">
      <p className="act-eyebrow">{label}</p>
      {list.map((r) => (
        <div key={r.key} className="act-fundbar">
          <span>{map[r.key] || r.key}</span>
          <span className="act-fundbar-track" aria-hidden="true">
            <span className="act-fundbar-fill" style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="act-mono">{int(r.n)}</span>
        </div>
      ))}
    </div>
  );
}

function CoFilingGraph({ graph }) {
  const nodes = (graph.nodes || []).slice(0, 10);
  const byId = new Map(
    nodes.map((n, i) => {
      const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
      return [n.id, { ...n, x: 50 + 36 * Math.cos(a), y: 50 + 36 * Math.sin(a) }];
    }),
  );
  const maxShares = Math.max(1, ...nodes.map((n) => n.maxShares || 0));
  const edges = (graph.edges || []).filter((e) => byId.has(e.a) && byId.has(e.b));
  return (
    <svg className="act-graph" viewBox="0 0 100 100" role="img" aria-label="Co-filing graph">
      {edges.map((e) => {
        const a = byId.get(e.a);
        const b = byId.get(e.b);
        return (
          <line
            key={`${e.a}-${e.b}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            style={{
              stroke: 'var(--act-faint-line)',
              strokeWidth: Math.min(3, 0.75 + (e.weight || 1) * 0.5),
            }}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {[...byId.values()].map((n) => (
        <g key={n.id}>
          <circle
            cx={n.x}
            cy={n.y}
            r={2.5 + ((n.maxShares || 0) / maxShares) * 3}
            style={{ fill: 'var(--act-titans-ink)' }}
          >
            <title>{n.name}</title>
          </circle>
          <text
            x={n.x}
            y={n.y + (n.y > 50 ? 9 : -6)}
            textAnchor="middle"
            className="act-graph-label"
            style={{ fill: 'var(--act-ink-soft)' }}
          >
            {String(n.name || '').slice(0, 16)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Target File ─────────────────────────────────────────────────────── */

export function TargetFile({ keyParam, sampled, onClose, onFiler, onFiling }) {
  const { status, data, retry } = useJson(
    !sampled && keyParam ? `/api/titans/activist/target?key=${encodeURIComponent(keyParam)}` : null,
  );
  const holders = data?.holders || [];
  const maxPct = Math.max(10, ...holders.map((h) => h.pct || 0));
  return (
    <Panel prefix="act" label="Target file" onClose={onClose}>
      <PanelClose prefix="act" onClose={onClose} />
      <PanelState status={status} retry={retry} sampled={sampled}>
        {data ? (
          <>
            <header className="act-phead">
              <p className="act-eyebrow">Target file</p>
              <h2 className="act-ptitle" tabIndex={-1} data-panel-title>
                {data.ticker ? <span className="act-mono">{data.ticker}</span> : null}{' '}
                {data.subject}
              </h2>
              <p className="act-pmeta act-mono">
                CUSIP {data.cusip || M} · {data.sector || M}
              </p>
              <p className="act-pmeta">
                <span className="act-mono">{int(data.filingsOnFile)}</span> filings on file since{' '}
                <span className="act-mono">{shortDate(data.firstFiled)}</span>
                {data.priceSinceFirst != null ? (
                  <>
                    {' '}
                    · price since first filing{' '}
                    <span
                      className={`act-mono ${data.priceSinceFirst >= 0 ? 'act-pos' : 'act-neg'}`}
                    >
                      {signedPct(data.priceSinceFirst * 100, 1)}
                    </span>
                  </>
                ) : null}
              </p>
              {!data.ticker ? (
                <p className="act-note">No ticker mapped, so other datasets cannot be joined.</p>
              ) : null}
            </header>
            <PanelSection prefix="act" title={`Current 5% holders · ${int(holders.length)}`}>
              {holders.map((h) => {
                const vt = (h.voting?.sole || 0) + (h.voting?.shared || 0);
                return (
                  <div key={h.filerCik || h.filer} className="act-holder">
                    <p className="act-holder-head">
                      <FormMark form={h.form} />
                      <FilerName filer={h.filer} cik={h.filerCik} onFiler={onFiler} />
                      <span className="act-mono act-strong">
                        {h.pct != null ? pct(h.pct, 1) : M}
                      </span>
                      <span className="act-mono act-muted">{shortDate(h.filed)}</span>
                    </p>
                    <span
                      className="act-holder-bar"
                      style={{ width: `${((h.pct || 0) / maxPct) * 100}%` }}
                      aria-hidden="true"
                    >
                      {vt > 0 ? (
                        <>
                          <span
                            className="act-holder-sole"
                            style={{ width: `${((h.voting?.sole || 0) / vt) * 100}%` }}
                          />
                          <span
                            className="act-holder-shared"
                            style={{ width: `${((h.voting?.shared || 0) / vt) * 100}%` }}
                          />
                        </>
                      ) : null}
                    </span>
                    {(h.tags || []).length ? (
                      <p className="act-tags">
                        {h.tags.slice(0, 3).map((t) => (
                          <TagPill key={t.tag} tag={t.tag} label={t.label} />
                        ))}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              <p className="act-legend">
                <span>
                  <i className="act-dot act-holder-sole" aria-hidden="true" /> Sole voting power
                </span>
                <span>
                  <i className="act-dot act-holder-shared" aria-hidden="true" /> Shared
                </span>
              </p>
              <p className="act-note">
                Each bar is one investor&apos;s own reported stake. They are never added together.
              </p>
            </PanelSection>
            <PanelSection prefix="act" title="Timeline">
              <ol className="act-dfilings">
                {(data.timeline || []).slice(0, 30).map((f) => (
                  <li key={f.accessionNo}>
                    <button
                      type="button"
                      className="act-dfiling"
                      onClick={() => onFiling(f.accessionNo)}
                    >
                      <span className="act-mono act-muted">{shortDate(f.filedAt)}</span>
                      <FormMark form={f.form} />
                      <span className="act-mono">
                        {f.form}
                        {f.isAmendment ? `/A${f.amendmentNo ?? ''}` : ''}
                      </span>
                      <span className="act-ellipsis">
                        <FilerName filer={f.filerConfirmed ? f.filer : null} />
                      </span>
                      <span className="act-mono act-strong">
                        {f.percentOfClass != null ? pct(f.percentOfClass, 1) : M}
                      </span>
                      {!f.detailParsed ? <StateChip>Detail arriving</StateChip> : null}
                    </button>
                  </li>
                ))}
              </ol>
            </PanelSection>
            {data.response ? (
              <PanelSection prefix="act" title="After the latest 13D">
                <div className="act-ptiles">
                  <div className="act-ptile">
                    <p className="act-eyebrow">Insiders · 30 days</p>
                    <p className="act-kpi act-kpi--sm">
                      {data.response.insider
                        ? `${int(data.response.insider.buys)} buys · ${int(data.response.insider.sells)} sells`
                        : 'None reported'}
                    </p>
                  </div>
                  <div className="act-ptile">
                    <p className="act-eyebrow">13F holders</p>
                    <p className="act-kpi act-kpi--sm act-mono">
                      {data.response.f13
                        ? `${int(data.response.f13.holdersNow)} (${signedInt(
                            (data.response.f13.holdersNow || 0) -
                              (data.response.f13.holdersPrior || 0),
                          )})`
                        : M}
                    </p>
                  </div>
                </div>
                {data.ticker ? (
                  <p className="act-plinks">
                    <Link
                      className="act-link"
                      href={`/datasets/institutional?security=${encodeURIComponent(data.ticker)}`}
                    >
                      Security X-ray (13F)
                    </Link>
                    <Link className="act-link" href="/datasets/executive-compensation">
                      Executive compensation
                    </Link>
                    <Link
                      className="act-link"
                      href={`/company-research?ticker=${encodeURIComponent(data.ticker)}`}
                    >
                      Fundamentals
                    </Link>
                  </p>
                ) : null}
              </PanelSection>
            ) : null}
          </>
        ) : null}
      </PanelState>
    </Panel>
  );
}

/* ── Filing Reader ───────────────────────────────────────────────────── */

export function FilingReader({ accession, sampled, onClose, onFiler }) {
  const { status, data, retry } = useJson(
    !sampled && accession
      ? `/api/titans/activist?accession=${encodeURIComponent(accession)}`
      : null,
  );
  const f = data?.filing;
  return (
    <Panel prefix="act" label="Filing reader" onClose={onClose}>
      <PanelClose prefix="act" onClose={onClose} />
      <PanelState status={status} retry={retry} sampled={sampled}>
        {f ? (
          <>
            <header className="act-phead">
              <p className="act-eyebrow">
                Filing reader · Schedule {f.form}
                {f.isAmendment ? ` · Amendment ${f.amendmentNo ?? ''}` : ''}
              </p>
              <h2 className="act-ptitle" tabIndex={-1} data-panel-title>
                <FormMark form={f.form} />{' '}
                <FilerName filer={f.filer} cik={f.filerCik} onFiler={onFiler} />{' '}
                <span className="act-muted">on</span>{' '}
                {f.ticker ? <span className="act-mono">{f.ticker}</span> : null} {f.subject}
              </h2>
              <p className="act-pmeta act-mono">
                Filed {shortDate(f.filedAt)} · Event {f.eventDate ? shortDate(f.eventDate) : M} ·
                CUSIP {f.cusip || M}
              </p>
              <p className="act-pmeta act-reader-figures">
                <span className="act-kpi act-kpi--sm act-mono">
                  {f.percentOfClass != null ? pct(f.percentOfClass, 1) : M}
                </span>
                <span className="act-muted">of class</span>
                <span className="act-mono">{f.shares != null ? int(f.shares) : M}</span>
                <span className="act-muted">shares</span>
                <ScoreChip prefix="act" score={f.score} factors={f.scoreFactors} />
              </p>
              {f.raisedFrom ? (
                <p className="act-pmeta">
                  <i className="bi bi-arrow-up-right act-raise-ink" aria-hidden="true" /> From{' '}
                  <span className="act-mono">
                    {f.raisedFrom.pct != null ? pct(f.raisedFrom.pct, 1) : M}
                  </span>{' '}
                  on the previous {f.raisedFrom.form} ({shortDate(f.raisedFrom.filedAt)}).
                </p>
              ) : null}
              {f.href ? (
                <a className="act-link" href={f.href} target="_blank" rel="noopener noreferrer">
                  Open on EDGAR <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
              ) : null}
            </header>

            {!f.detailParsed ? (
              <PanelSection prefix="act">
                <p className="act-empty">
                  <StateChip>Detail arriving</StateChip> The cover-page detail for this filing has
                  not been structured yet. The figures above come from the filing index.
                </p>
              </PanelSection>
            ) : null}

            {f.form === '13G' ? (
              <PanelSection prefix="act" title="Filing basis">
                {(f.gBasis || []).length ? (
                  (f.gBasis || []).map((b) => (
                    <div key={b.rule} className="act-basisblock">
                      <p className="act-basis-head">
                        <i className={`act-dot act-basisseg--${b.key}`} aria-hidden="true" />
                        {b.label}
                        <span className="act-mono act-muted">{b.rule}</span>
                      </p>
                      <p className="act-note">{BASIS_EXPLAIN[b.key] || ''}</p>
                    </div>
                  ))
                ) : (
                  <p className="act-note">No filing basis is structured for this 13G.</p>
                )}
                <p className="act-note">
                  A Schedule 13G carries no purpose or source-of-funds items, so none are shown.
                </p>
              </PanelSection>
            ) : null}

            {f.form === '13D' && f.detailParsed ? (
              <>
                <ItemFour filing={f} />
                <PanelSection prefix="act" title="Item 3 · Source of funds, verbatim">
                  {(f.fundSources || []).length ? (
                    <p className="act-tags">
                      {f.fundSources.map((s) => (
                        <span key={s.code} className="act-basispill act-mono">
                          {s.code} · {s.label}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  {f.fundsSourceText ? (
                    <blockquote className="act-reader-text">{f.fundsSourceText}</blockquote>
                  ) : (
                    <p className="act-note">The Item 3 text is not structured for this filing.</p>
                  )}
                  <p className="act-note">
                    Codes as filed on the cover page; no figure is read out of the text.
                  </p>
                </PanelSection>
              </>
            ) : null}

            {(f.reportingPersons || []).length ? (
              <PanelSection
                prefix="act"
                title={`Reporting persons${f.memberOfGroup ? ' · filed as a group' : ''}`}
              >
                {f.reportingPersons.map((r, i) => (
                  <div key={r.cik || r.name || i} className="act-person">
                    <p className="act-person-head">
                      <span className="act-strong">{r.name || M}</span>
                      <span className="act-muted">
                        {(r.types || []).map((t) => t.label).join(' · ')}
                      </span>
                      {r.citizenship ? (
                        <span className="act-mono act-muted">{r.citizenship}</span>
                      ) : null}
                      {r.cik ? <span className="act-mono act-muted">CIK {r.cik}</span> : null}
                      {r.percent != null ? (
                        <span className="act-mono act-strong">{pct(r.percent, 1)}</span>
                      ) : null}
                    </p>
                    <dl className="act-person-grid act-mono">
                      <div>
                        <dt>Shares</dt>
                        <dd>{r.shares != null ? int(r.shares) : M}</dd>
                      </div>
                      <div>
                        <dt>Sole vote</dt>
                        <dd>{r.voting?.sole != null ? int(r.voting.sole) : M}</dd>
                      </div>
                      <div>
                        <dt>Shared vote</dt>
                        <dd>{r.voting?.shared != null ? int(r.voting.shared) : M}</dd>
                      </div>
                      <div>
                        <dt>Sole sell</dt>
                        <dd>
                          {r.voting?.soleDispositive != null ? int(r.voting.soleDispositive) : M}
                        </dd>
                      </div>
                      <div>
                        <dt>Shared sell</dt>
                        <dd>
                          {r.voting?.sharedDispositive != null
                            ? int(r.voting.sharedDispositive)
                            : M}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
                <p className="act-note">
                  Each percent of class is one reporting person&apos;s own figure against its own
                  denominator. They are never added together.
                </p>
              </PanelSection>
            ) : null}
          </>
        ) : null}
      </PanelState>
    </Panel>
  );
}

/** Item 4 verbatim with the interactive tag highlight: hovering, focusing or
 *  clicking a tag chip highlights exactly the sentences purposeSentences tags
 *  with it; reservation sentences stay muted and are never highlighted. */
function ItemFour({ filing: f }) {
  const [pinned, setPinned] = useState(null);
  const [hover, setHover] = useState(null);
  const active = hover || pinned;
  return (
    <PanelSection prefix="act" title="Item 4 · Purpose of transaction, verbatim">
      {(f.purposeTags || []).length ? (
        <p className="act-tags">
          {f.purposeTags.map((t) => (
            <button
              key={t.tag}
              type="button"
              className={`act-tagbtn${active === t.tag ? ' is-on' : ''}`}
              aria-pressed={pinned === t.tag}
              onMouseEnter={() => setHover(t.tag)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(t.tag)}
              onBlur={() => setHover(null)}
              onClick={() => setPinned(pinned === t.tag ? null : t.tag)}
            >
              <TagPill tag={t.tag} label={t.label} state={active === t.tag ? 'active' : null} />
            </button>
          ))}
        </p>
      ) : null}
      {(f.purposeSentences || []).length ? (
        <blockquote className="act-reader-text">
          {f.purposeSentences.map((s, i) => (
            <span
              key={i}
              className={`act-sentence${s.reservation ? ' is-reservation' : ''}${
                !s.reservation && active && s.tags?.includes(active) ? ' is-tagged' : ''
              }`}
            >
              {s.text}{' '}
            </span>
          ))}
        </blockquote>
      ) : (
        <p className="act-note">
          <StateChip>Text filing, cover details not structured</StateChip> The purpose text for this
          filing is not structured.
        </p>
      )}
      <p className="act-note act-mono-note">
        Hover, focus or click a tag to light the sentences it indexes; muted sentences are standard
        reservation language. Tags index the text as filed, and nothing is extracted from it.
      </p>
    </PanelSection>
  );
}

const BASIS_EXPLAIN = {
  b: 'Rule 13d-1(b): a qualified institution holding in the ordinary course of business, with no intent to influence control.',
  c: 'Rule 13d-1(c): a passive investor below 20% certifying no intent to influence control.',
  d: 'Rule 13d-1(d): an exempt holder, typically a stake acquired before the company registered the class.',
};

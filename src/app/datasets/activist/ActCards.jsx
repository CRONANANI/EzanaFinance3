'use client';

/**
 * Activist cards 1 to 7: Threshold Ledger, Campaign Tape, Stated Intent,
 * Intent Shift, Switch Watch, Stake Ladder, Crowded Targets. Spec:
 * activist-handoff/04-SPEC.md. Components render; campaign maths comes from
 * src/lib/titans/activist-model.js and the snapshot.
 */
import { useMemo, useState } from 'react';
import { intentShifts, ladderSteps, switches } from '@/lib/titans/activist-model';
import { PURPOSE_TAG_LABEL, G_RULE_BASIS } from '@/lib/sec/schedule13-meta';
import { int, pct, shortDate, signedInt, MISSING as M } from '@/lib/titans/format';

export const SOURCE_LINE =
  'SEC EDGAR Schedules 13D and 13G. Reported beneficial ownership above 5%.';

/* ── shared atoms ────────────────────────────────────────────────────── */

export function ActCard({
  id,
  className = '',
  icon,
  eyebrow,
  title,
  chip,
  sourceExtra,
  empty,
  children,
}) {
  return (
    <section id={id} className={`act-card ${className}`.trim()} aria-labelledby={`${id}-h`}>
      <header className="act-card-head">
        {icon ? (
          <span className="act-icon" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </span>
        ) : null}
        <div className="act-card-head-text">
          {eyebrow ? <p className="act-eyebrow">{eyebrow}</p> : null}
          <h2 id={`${id}-h`} className="act-h2">
            {title}
          </h2>
        </div>
        {chip ? <span className="act-qchip">{chip}</span> : null}
      </header>
      <div className="act-card-body">{empty ? <p className="act-empty">{empty}</p> : children}</div>
      <footer className="act-source">
        <span>{SOURCE_LINE}</span>
        {sourceExtra ? <span>{sourceExtra}</span> : null}
      </footer>
    </section>
  );
}

/** The form grammar: 13D diamond, 13G ring, switched filled-with-orange-ring. */
export function FormMark({ form, switched = false, size }) {
  const cls = switched ? 'act-mark--switched' : form === '13D' ? 'act-mark--d' : 'act-mark--g';
  return (
    <span
      className={`act-mark ${cls}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    />
  );
}

export function TagPill({ tag, label, state = null }) {
  return (
    <span
      className={`act-tag${state === 'active' ? ' is-active' : ''}${state === 'added' ? ' is-added' : ''}${state === 'dropped' ? ' is-dropped' : ''}`}
    >
      {label || PURPOSE_TAG_LABEL[tag] || tag}
    </span>
  );
}

export function WatchChip({ children }) {
  return <span className="act-watch act-mono">{children}</span>;
}

export function StateChip({ children }) {
  return <span className="act-state-chip">{children}</span>;
}

export function StatusChip({ status }) {
  if (!status) return null;
  const word = {
    new: 'New',
    building: 'Building',
    holding: 'Holding',
    unwinding: 'Unwinding',
    exited: 'Exited',
  }[status];
  return <span className={`act-status act-mono act-status--${status}`}>{word || status}</span>;
}

export function FilerName({ filer, cik, onFiler }) {
  if (!filer) return <em className="act-unconfirmed">Filer not confirmed</em>;
  if (!onFiler || !cik) return <span className="act-ellipsis">{filer}</span>;
  return (
    <button type="button" className="act-link act-ellipsis" onClick={() => onFiler(cik)}>
      {filer}
    </button>
  );
}

const basisLabel = (rule) =>
  G_RULE_BASIS[`13d-1(${rule})`]?.label || (rule ? `13d-1(${rule})` : null);

/** Snapshot campaign row -> the model's filing shape. */
export function mapCampaign(c) {
  return {
    key: c.key,
    filerCik: c.filer_cik,
    filer: c.filer || null,
    ticker: c.ticker || null,
    cusip: c.cusip || null,
    subject: c.subject || null,
    status: c.status || null,
    firstFiled: c.first_filed,
    lastFiled: c.last_filed,
    latestPct: c.latest_pct ?? null,
    filings: (c.filings || []).map((f) => ({
      accessionNo: f.accession,
      filedAt: f.filed,
      eventDate: f.event || null,
      form: f.form,
      isAmendment: f.amendment_no != null,
      amendmentNo: f.amendment_no ?? null,
      percentOfClass: f.pct ?? null,
      tags: f.tags || [],
      gRule: f.g_rule || null,
      raise: Boolean(f.raise),
      exit: Boolean(f.exit),
      switch: Boolean(f.switch),
      detailParsed: Boolean(f.detail),
      filerConfirmed: true,
      filerCik: c.filer_cik,
      cusip: c.cusip || null,
      subject: c.subject || null,
      ticker: c.ticker || null,
    })),
  };
}

const inRange = (date, [start, end]) => {
  const d = String(date || '').slice(0, 10);
  return (!start || d >= start) && (!end || d <= end);
};

const campaignMatches = (c, { form, tag, type, basis }) =>
  c.filings.some((f) => {
    if (form && f.form.toLowerCase() !== form) return false;
    if (tag && !f.tags.includes(tag)) return false;
    if (basis && f.gRule !== basis) return false;
    return true;
  }) &&
  (!type || true);

/* ── Card 1: Threshold Ledger ────────────────────────────────────────── */

export function LedgerRow({ win, windowKey, chip }) {
  const l = win?.ledger;
  const prior = l?.prior;
  const tiles = [
    { label: 'New stakes', v: l?.new, p: prior?.new },
    { label: 'Amendments', v: l?.amendments, p: prior?.amendments },
    {
      label: '13D share of new',
      v: l?.new ? `${int(l.new_13d)} of ${int(l.new)}` : null,
      p: null,
      note: l?.new ? pct((l.new_13d / l.new) * 100, 1) : null,
    },
    { label: 'Exits below 5%', v: l?.exits, p: prior?.exits },
    { label: 'Stakes with a stated plan', v: l?.stated_plan, p: prior?.stated_plan },
  ];
  return (
    <div className="act-ledger">
      {tiles.map((t) => {
        const delta = t.p != null && typeof t.v === 'number' ? t.v - t.p : null;
        return (
          <div key={t.label} className="act-card act-tile">
            <p className="act-tile-top">
              <span className="act-eyebrow">{t.label}</span>
              <span className="act-mono act-muted">{chip}</span>
            </p>
            <p className="act-kpi">{t.v == null ? M : typeof t.v === 'number' ? int(t.v) : t.v}</p>
            <p className="act-tile-delta act-mono">
              {windowKey === 'all' ? (
                <span className="act-muted">everything on file</span>
              ) : delta != null ? (
                <>
                  <span className={delta >= 0 ? 'act-pos' : 'act-neg'}>{signedInt(delta)}</span>{' '}
                  <span className="act-muted">vs the previous {chipless(windowKey)}</span>
                </>
              ) : (
                <span className="act-muted">{t.note || M}</span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const chipless = (w) => ({ '30d': '30 days', '90d': '90 days', '12m': '12 months' })[w] || 'window';

/* ── Card 2: Campaign Tape ───────────────────────────────────────────── */

const TAPE_LIMIT = 20;

export function CampaignTapeCard({
  campaigns,
  unconfirmed,
  range,
  windowKey,
  filters,
  chip,
  onCampaign,
  onFiling,
}) {
  const [showAll, setShowAll] = useState(false);
  const lanes = useMemo(() => {
    const matched = campaigns.filter((c) => campaignMatches(c, filters));
    return matched.sort((a, b) => String(b.lastFiled).localeCompare(String(a.lastFiled)));
  }, [campaigns, filters]);
  const shown = showAll ? lanes : lanes.slice(0, TAPE_LIMIT);

  /* Time axis: last 12 months for bounded windows; full span for "all". */
  const axisEnd = range[1];
  const axisStart =
    windowKey === 'all' && lanes.length
      ? lanes.reduce((min, c) => (c.firstFiled < min ? c.firstFiled : min), axisEnd)
      : new Date(Date.parse(`${axisEnd}T00:00:00Z`) - 365 * 86400000).toISOString().slice(0, 10);
  const span = Math.max(1, Date.parse(axisEnd) - Date.parse(axisStart));
  const x = (d) =>
    Math.max(
      0,
      Math.min(100, ((Date.parse(String(d).slice(0, 10)) - Date.parse(axisStart)) / span) * 100),
    );
  const months = useMemo(() => {
    const out = [];
    const d = new Date(`${axisStart.slice(0, 7)}-01T00:00:00Z`);
    const end = Date.parse(axisEnd);
    const step = Math.ceil((end - d.getTime()) / (30.5 * 86400000) / 12) || 1;
    let i = 0;
    while (d.getTime() <= end) {
      if (i % step === 0) {
        out.push({
          x: x(d.toISOString()),
          label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
        });
      }
      d.setUTCMonth(d.getUTCMonth() + 1);
      i += 1;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axisStart, axisEnd]);
  const winStart = range[0];

  return (
    <ActCard
      id="act-tape"
      icon="bi-activity"
      eyebrow="Campaign tape"
      title="Which positions are live campaigns, and how are they developing?"
      chip={chip}
      empty={
        !lanes.length && !unconfirmed.length
          ? 'No campaign matches these filters in this window. Widen the window to see earlier filings.'
          : null
      }
      sourceExtra="A campaign is one confirmed investor on one company; percentages are each investor's own, never added."
    >
      <p className="act-legend">
        <span>
          <FormMark form="13D" /> 13D
        </span>
        <span>
          <FormMark form="13G" /> 13G
        </span>
        <span>
          <i className="bi bi-arrow-up-right act-raise-ink" aria-hidden="true" /> Stake raised
        </span>
        <span>
          <i className="bi bi-box-arrow-right act-exit-ink" aria-hidden="true" /> Exit below 5%
        </span>
        <span>
          <WatchChip>SWITCHED</WatchChip>
        </span>
        <span>
          <i className="act-dot act-dot--window" aria-hidden="true" /> Filing in window
        </span>
      </p>
      <div className="act-tape-scroll">
        <div className="act-tape">
          <div className="act-tape-axis" aria-hidden="true">
            <span className="act-tape-axislabel" />
            <span className="act-tape-axistrack">
              {months.map((m, i) => (
                <span key={i} className="act-mono" style={{ left: `${m.x}%` }}>
                  {m.label}
                </span>
              ))}
            </span>
          </div>
          {shown.map((c) => {
            const filings = c.filings;
            const inWin = filings.some((f) => inRange(f.filedAt, range));
            const exited = c.status === 'exited';
            return (
              <div key={c.key} className={`act-lane${inWin ? ' in-window' : ''}`}>
                <button
                  type="button"
                  className="act-lane-label"
                  onClick={() => onCampaign(c.key)}
                  aria-label={`${c.filer} on ${c.ticker || c.subject}: ${filings.length} filings, latest ${c.latestPct != null ? pct(c.latestPct, 1) : 'unknown'}. Open the campaign.`}
                >
                  <span className="act-lane-filer act-ellipsis">{c.filer}</span>
                  <span className="act-lane-meta">
                    {c.ticker ? <span className="act-mono">{c.ticker}</span> : null}
                    <span className="act-muted act-ellipsis">{c.subject}</span>
                    <span className="act-mono act-lane-pct">
                      {c.latestPct != null ? pct(c.latestPct, 1) : M}
                    </span>
                    <StatusChip status={c.status} />
                  </span>
                </button>
                <div className="act-lane-track" aria-hidden="true">
                  {winStart ? (
                    <span
                      className="act-lane-window"
                      style={{ left: `${x(winStart)}%`, width: `${100 - x(winStart)}%` }}
                    />
                  ) : null}
                  <span
                    className={`act-lane-span${exited ? ' is-exited' : ''}`}
                    style={{
                      left: `${x(c.firstFiled)}%`,
                      width: `${Math.max(0.5, x(c.lastFiled) - x(c.firstFiled))}%`,
                    }}
                  />
                  {filings.map((f) => (
                    <button
                      key={f.accessionNo}
                      type="button"
                      className="act-lane-mark"
                      style={{ left: `${x(f.filedAt)}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFiling(f.accessionNo);
                      }}
                      title={`${shortDate(f.filedAt)} · ${f.form}${f.isAmendment ? `/A${f.amendmentNo ?? ''}` : ''} · ${f.percentOfClass != null ? pct(f.percentOfClass, 1) : M}${f.tags.length ? ` · ${f.tags.map((t) => PURPOSE_TAG_LABEL[t] || t).join(', ')}` : ''}`}
                      aria-label={`Open the ${f.form} filed ${shortDate(f.filedAt)}`}
                    >
                      <FormMark form={f.form} switched={f.switch} size={11} />
                      {f.raise ? (
                        <i className="bi bi-arrow-up-right act-raise-ink" aria-hidden="true" />
                      ) : null}
                      {f.exit ? (
                        <i className="bi bi-box-arrow-right act-exit-ink" aria-hidden="true" />
                      ) : null}
                      {f.switch ? <WatchChip>SWITCHED</WatchChip> : null}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {unconfirmed.length ? (
            <>
              <p className="act-eyebrow act-tape-group">Investor not confirmed</p>
              {unconfirmed.slice(0, 5).map((f) => (
                <div key={f.accession} className="act-lane">
                  <button
                    type="button"
                    className="act-lane-label"
                    onClick={() => onFiling(f.accession)}
                  >
                    <span className="act-lane-filer act-unconfirmed">Filer not confirmed</span>
                    <span className="act-lane-meta">
                      {f.ticker ? <span className="act-mono">{f.ticker}</span> : null}
                      <span className="act-muted act-ellipsis">{f.subject}</span>
                      <span className="act-mono act-lane-pct">
                        {f.pct != null ? pct(f.pct, 1) : M}
                      </span>
                    </span>
                  </button>
                  <div className="act-lane-track" aria-hidden="true">
                    <button
                      type="button"
                      className="act-lane-mark"
                      style={{ left: `${x(f.filed)}%` }}
                      onClick={() => onFiling(f.accession)}
                      aria-label={`Open the ${f.form} filed ${shortDate(f.filed)}`}
                    >
                      <FormMark form={f.form} size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </div>
      </div>
      {!showAll && lanes.length > TAPE_LIMIT ? (
        <button type="button" className="act-link" onClick={() => setShowAll(true)}>
          Show all {int(lanes.length)} campaigns
        </button>
      ) : null}
      <p className="act-note act-mono-note">
        Marks sit on the filing date. The shaded band is the selected window; the span bar runs from
        a campaign&apos;s first filing to its latest.
      </p>
    </ActCard>
  );
}

/* ── Card 3: Stated Intent ───────────────────────────────────────────── */

export function StatedIntentCard({ win, tag, setTag, table, chip, onFiler, onFiling }) {
  const [showInvestment, setShowInvestment] = useState(false);
  const [limit, setLimit] = useState(8);
  const tags = win?.tags_13d || [];
  const maxN = Math.max(1, ...tags.map((t) => t.n));
  const rows = useMemo(() => {
    const all = (table.data?.rows || []).filter(
      (r) => r.form === '13D' && r.detailParsed && r.purposeExcerpt,
    );
    const wanted = tag
      ? all.filter((r) => r.purposeTags.some((t) => t.tag === tag))
      : all.filter((r) => r.purposeTags.some((t) => t.tag !== 'investment'));
    const investmentOnly = tag
      ? []
      : all.filter((r) => r.purposeTags.every((t) => t.tag === 'investment'));
    return { wanted, investmentOnly };
  }, [table.data, tag]);
  const statedTotal = win?.ledger?.stated_plan;

  return (
    <ActCard
      id="act-intent"
      icon="bi-chat-quote"
      eyebrow="Stated intent · Item 4, in their words"
      title="What do these investors say they want?"
      chip={chip}
      empty={
        table.status === 'ready' && !rows.wanted.length && !rows.investmentOnly.length
          ? 'No 13D with parsed Item 4 text in this window. Widen the window to see earlier filings.'
          : null
      }
      sourceExtra="Tags index the verbatim text; the excerpt is always shown beside them."
    >
      <div className="act-intent">
        <div className="act-intent-left">
          <p className="act-eyebrow">13D filings by stated purpose</p>
          {tags.map((t) => (
            <button
              key={t.tag}
              type="button"
              aria-pressed={tag === t.tag}
              className={`act-tagbar${tag === t.tag ? ' is-on' : ''}`}
              onClick={() => setTag(tag === t.tag ? null : t.tag)}
            >
              <span>{PURPOSE_TAG_LABEL[t.tag] || t.tag}</span>
              <span className="act-tagbar-track" aria-hidden="true">
                <span
                  className={`act-tagbar-fill${t.tag === 'investment' ? ' is-quiet' : ''}`}
                  style={{ width: `${(t.n / maxN) * 100}%` }}
                />
              </span>
              <span className="act-mono">{int(t.n)}</span>
            </button>
          ))}
          <p className="act-note">
            A filing can carry several tags.{' '}
            {statedTotal != null && win?.ledger?.new_13d != null
              ? `${int(statedTotal)} of ${int(win.ledger.new_13d)} new 13Ds carry a tag other than Investment only.`
              : ''}
          </p>
        </div>
        <div className="act-intent-feed">
          <p className="act-intent-feedhead">
            <span className="act-eyebrow">
              {tag ? `New 13Ds tagged ${PURPOSE_TAG_LABEL[tag]}` : 'New 13Ds with a stated plan'}
            </span>
            {tag ? (
              <button type="button" className="act-link" onClick={() => setTag(null)}>
                Clear filter
              </button>
            ) : null}
          </p>
          {rows.wanted.slice(0, limit).map((r) => (
            <article key={r.accessionNo} className="act-intent-entry">
              <p className="act-intent-entryhead">
                <FormMark form="13D" />
                <FilerName filer={r.filer} cik={r.filerCik} onFiler={onFiler} />
                <span className="act-muted">on</span>
                {r.ticker ? <span className="act-mono">{r.ticker}</span> : null}
                <span className="act-muted act-ellipsis">{r.subject}</span>
                <span className="act-intent-entryright act-mono">
                  13D{r.isAmendment ? `/A${r.amendmentNo ?? ''}` : ''} ·{' '}
                  <strong>{r.percentOfClass != null ? pct(r.percentOfClass, 1) : M}</strong> ·{' '}
                  {shortDate(r.filedAt)}
                </span>
              </p>
              <p className="act-tags">
                {r.purposeTags.map((t) => (
                  <TagPill
                    key={t.tag}
                    tag={t.tag}
                    label={t.label}
                    state={tag === t.tag ? 'active' : null}
                  />
                ))}
              </p>
              <blockquote className="act-quote">&ldquo;{r.purposeExcerpt}&rdquo;</blockquote>
              <p className="act-quote-links">
                <button type="button" className="act-link" onClick={() => onFiling(r.accessionNo)}>
                  Read full purpose
                </button>
                {r.href ? (
                  <a className="act-link" href={r.href} target="_blank" rel="noopener noreferrer">
                    Open the filing <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  </a>
                ) : null}
              </p>
            </article>
          ))}
          {rows.wanted.length > limit ? (
            <button type="button" className="act-link" onClick={() => setLimit(limit + 8)}>
              Show more
            </button>
          ) : null}
          {!tag && rows.investmentOnly.length ? (
            <>
              <button
                type="button"
                className="act-investment-toggle"
                aria-expanded={showInvestment}
                onClick={() => setShowInvestment(!showInvestment)}
              >
                Show {int(rows.investmentOnly.length)} filings tagged Investment only
                <i
                  className={`bi ${showInvestment ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                  aria-hidden="true"
                />
              </button>
              {showInvestment
                ? rows.investmentOnly.slice(0, 8).map((r) => (
                    <p key={r.accessionNo} className="act-intent-entryhead act-intent-quietrow">
                      <FormMark form="13D" />
                      <FilerName filer={r.filer} cik={r.filerCik} onFiler={onFiler} />
                      <span className="act-muted">on</span>
                      <span className="act-mono">{r.ticker || M}</span>
                      <span className="act-intent-entryright act-mono">
                        {r.percentOfClass != null ? pct(r.percentOfClass, 1) : M} ·{' '}
                        {shortDate(r.filedAt)}
                      </span>
                    </p>
                  ))
                : null}
            </>
          ) : null}
        </div>
      </div>
      <p className="act-note act-note--method">
        <i className="bi bi-info-circle" aria-hidden="true" /> Item 4 is mostly standard reservation
        language, so tags come only from what remains after it is set aside. A filer that writes
        &ldquo;may seek&rdquo; has stated a possibility, never a commitment.
      </p>
    </ActCard>
  );
}

/* ── Card 4: Intent Shift ────────────────────────────────────────────── */

export function IntentShiftCard({ campaigns, range, chip, onFiler, onTarget, onFiling }) {
  const shifts = useMemo(() => {
    const out = [];
    for (const c of campaigns) {
      for (const s of intentShifts(c)) {
        if (inRange(s.to.filedAt, range)) out.push({ c, ...s });
      }
    }
    return out.sort((a, b) => String(b.to.filedAt).localeCompare(String(a.to.filedAt))).slice(0, 5);
  }, [campaigns, range]);
  return (
    <ActCard
      id="act-shift"
      icon="bi-arrow-repeat"
      eyebrow="Intent shift"
      title="When did a filer change what it says it wants?"
      chip={chip}
      empty={
        !shifts.length
          ? 'No 13D changed its stated purpose in this window. Widen the window to see earlier filings.'
          : null
      }
    >
      {shifts.map((s) => (
        <div key={`${s.c.key}-${s.to.accessionNo}`} className="act-shift-row">
          <p className="act-shift-head">
            <FilerName filer={s.c.filer} cik={s.c.filerCik} onFiler={onFiler} />
            <span className="act-muted">on</span>
            <button
              type="button"
              className="act-link act-mono"
              onClick={() => onTarget(s.c.ticker || s.c.cusip)}
            >
              {s.c.ticker || s.c.subject}
            </button>
            <span className="act-mono act-muted act-shift-dates">
              {shortDate(s.from.filedAt)} → {shortDate(s.to.filedAt)}
            </span>
          </p>
          <div className="act-shift-grid">
            <div className="act-shift-box">
              <p className="act-mono act-muted">
                13D{s.from.isAmendment ? '/A' : ''} · {shortDate(s.from.filedAt)}
              </p>
              <p className="act-tags">
                {s.from.tags.map((t) => (
                  <TagPill key={t} tag={t} state={s.dropped.includes(t) ? 'dropped' : null} />
                ))}
              </p>
            </div>
            <i className="bi bi-arrow-right" aria-hidden="true" />
            <div className="act-shift-box">
              <p className="act-mono act-muted">
                13D{s.to.isAmendment ? '/A' : ''} · {shortDate(s.to.filedAt)}
              </p>
              <p className="act-tags">
                {s.to.tags.map((t) => (
                  <TagPill key={t} tag={t} state={s.added.includes(t) ? 'added' : null} />
                ))}
              </p>
            </div>
          </div>
          <button type="button" className="act-link" onClick={() => onFiling(s.to.accessionNo)}>
            Compare the two excerpts
          </button>
        </div>
      ))}
    </ActCard>
  );
}

/* ── Card 5: Switch Watch ────────────────────────────────────────────── */

export function SwitchWatchCard({ campaigns, range, chip, onCampaign }) {
  const rows = useMemo(() => switches(campaigns, range).slice(0, 4), [campaigns, range]);
  return (
    <ActCard
      id="act-switch"
      icon="bi-crosshair"
      eyebrow="Switch watch · 13G to 13D"
      title="Which passive holders turned active?"
      chip={chip}
      empty={!rows.length ? 'No passive holder has switched to a 13D in this window.' : null}
      sourceExtra="A 13G says passive; refiling on 13D says no longer."
    >
      {rows.map((s) => (
        <button
          key={`${s.campaign.key}-${s.firstD.accessionNo}`}
          type="button"
          className="act-switch-block"
          onClick={() => onCampaign(s.campaign.key)}
        >
          <p className="act-switch-head">
            <FormMark form="13G" />
            <i className="bi bi-arrow-right" aria-hidden="true" />
            <FormMark form="13D" switched />
            <span className="act-switch-who act-ellipsis">
              <strong>{s.campaign.filer}</strong>
              <span className="act-mono"> {s.campaign.ticker || ''}</span>{' '}
              <span className="act-muted">{s.campaign.subject}</span>
            </span>
            <WatchChip>SWITCHED</WatchChip>
          </p>
          <span className="act-switch-grid" aria-hidden="true">
            <span className="act-switch-g">
              <span className="act-eyebrow act-13g-ink">
                Last 13G · {shortDate(s.lastG.filedAt)}
              </span>
              <span className="act-mono act-switch-pct">
                {s.lastG.percentOfClass != null ? pct(s.lastG.percentOfClass, 1) : M}
              </span>
              <span className="act-muted">{basisLabel(s.lastG.gRule) || '13G'}</span>
            </span>
            <span className="act-switch-days">
              <span className="act-mono">{int(s.days)}</span>
              <span className="act-muted">days</span>
            </span>
            <span className="act-switch-d">
              <span className="act-eyebrow">First 13D · {shortDate(s.firstD.filedAt)}</span>
              <span className="act-mono act-switch-pct">
                {s.firstD.percentOfClass != null ? pct(s.firstD.percentOfClass, 1) : M}
              </span>
              <span className="act-tags">
                {s.firstD.tags.map((t) => (
                  <TagPill key={t} tag={t} />
                ))}
              </span>
            </span>
          </span>
        </button>
      ))}
    </ActCard>
  );
}

/* ── Card 6: Stake Ladder ────────────────────────────────────────────── */

export function StakeLadderCard({ campaigns, range, filters, chip, onCampaign }) {
  const tiles = useMemo(
    () =>
      campaigns
        .filter((c) => c.filings.length >= 2 && campaignMatches(c, filters))
        .filter((c) => c.filings.some((f) => inRange(f.filedAt, range)))
        .sort((a, b) => String(b.lastFiled).localeCompare(String(a.lastFiled)))
        .slice(0, 8)
        .map((c) => ({ c, ladder: ladderSteps(c) })),
    [campaigns, range, filters],
  );
  return (
    <ActCard
      id="act-ladder"
      icon="bi-bar-chart-steps"
      eyebrow="Stake ladder"
      title="How did multi-filing stakes develop?"
      chip={chip}
      empty={
        !tiles.length
          ? 'No campaign has two or more filings in this window. Widen the window to see earlier filings.'
          : null
      }
    >
      <div className="act-ladder-grid">
        {tiles.map(({ c, ladder }) => {
          const last = ladder.steps[ladder.steps.length - 1];
          return (
            <button
              key={c.key}
              type="button"
              className="act-ladder-tile"
              onClick={() => onCampaign(c.key)}
            >
              <span className="act-ladder-head">
                <span className="act-mono">{c.ticker || M}</span>
                <span className="act-muted act-ellipsis">{c.filer}</span>
                <span
                  className={`act-mono act-ladder-pct${last?.dir === 'down' ? ' act-neg' : ''}`}
                >
                  {c.latestPct != null ? pct(c.latestPct, 1) : M}
                </span>
              </span>
              <svg
                className="act-ladder-plot"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {[5, 10].map((rule) => (
                  <line
                    key={rule}
                    x1="0"
                    x2="100"
                    y1={100 - (rule / ladder.yMax) * 100}
                    y2={100 - (rule / ladder.yMax) * 100}
                    style={{
                      stroke: 'var(--act-annotation)',
                      strokeDasharray: '4 3',
                      strokeWidth: 1,
                    }}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                {ladder.steps.map((s, i) => {
                  const next = ladder.steps[i + 1];
                  const x1 = s.x * 100;
                  const y = 100 - s.y * 100;
                  return (
                    <g key={s.filing.accessionNo}>
                      {next ? (
                        <>
                          <line
                            x1={x1}
                            x2={next.x * 100}
                            y1={y}
                            y2={y}
                            style={{ stroke: 'var(--act-step)', strokeWidth: 2 }}
                            vectorEffect="non-scaling-stroke"
                          />
                          <line
                            x1={next.x * 100}
                            x2={next.x * 100}
                            y1={y}
                            y2={100 - next.y * 100}
                            style={{
                              stroke:
                                next.dir === 'down' ? 'var(--act-decline)' : 'var(--act-raise)',
                              strokeWidth: 2.5,
                            }}
                            vectorEffect="non-scaling-stroke"
                          />
                        </>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
              {ladder.crossed10 ? <WatchChip>CROSSED 10%</WatchChip> : null}
              <span className="act-mono act-muted act-ladder-dates">
                {shortDate(c.firstFiled)?.replace(/, \d{4}$/, '')} → {shortDate(c.lastFiled)}
              </span>
            </button>
          );
        })}
      </div>
    </ActCard>
  );
}

/* ── Card 7: Crowded Targets ─────────────────────────────────────────── */

export function CrowdedTargetsCard({ crowded, onTarget }) {
  return (
    <ActCard
      id="act-crowded"
      icon="bi-people"
      eyebrow="Crowded targets"
      title="Where do several 5% holders sit on one company?"
      chip="Current, latest filing each"
      empty={!crowded.length ? 'No company currently has two or more 5% holders on file.' : null}
      sourceExtra="Each segment is one investor's own reported stake. They are never added together."
    >
      {crowded.slice(0, 6).map((row) => (
        <button
          key={row.target_key}
          type="button"
          className="act-crowded-row"
          onClick={() => onTarget(row.ticker || row.target_key)}
        >
          <span className="act-crowded-head">
            <span className="act-mono">{row.ticker || M}</span>
            <span className="act-muted act-ellipsis">{row.subject}</span>
            <span className="act-mono act-muted">{int(row.holders?.length || 0)} investors</span>
          </span>
          <span className="act-crowded-segments" aria-hidden="true">
            {(row.holders || []).map((h, i) => (
              <span
                key={`${h.filer_cik}-${i}`}
                className={`act-seg${h.form === '13D' ? ' act-seg--d' : ' act-seg--g'}`}
                style={{ flexBasis: `${Math.min(24, ((h.pct || 0) / 15) * 24)}%` }}
                title={`${h.filer} · ${h.form} · ${h.pct != null ? pct(h.pct, 1) : M} · ${shortDate(h.filed)}`}
              >
                <span className="act-mono">{h.pct != null ? pct(h.pct, 1) : M}</span>
              </span>
            ))}
          </span>
          <span className="act-crowded-legend act-mono act-muted">
            {(row.holders || [])
              .slice(0, 3)
              .map((h) => `${h.form} ${h.filer} ${h.pct != null ? pct(h.pct, 1) : M}`)
              .join(' · ')}
          </span>
        </button>
      ))}
      <p className="act-note act-note--inset">
        Each investor reports its own percent of class, on its own cover page. The segments sit side
        by side and are never summed into one figure.
      </p>
    </ActCard>
  );
}

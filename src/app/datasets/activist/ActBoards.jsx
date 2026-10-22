'use client';

/**
 * Activist cards 8 to 16, the caveat card, the filings table and the method
 * section. Spec: activist-handoff/04-SPEC.md.
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useJson, ScoreChip } from '@/components/datasets/titans/ui';
import { controlShare, medianPath } from '@/lib/titans/activist-model';
import { PERSON_TYPE_LABEL, FUND_SOURCE_LABEL, G_RULE_BASIS } from '@/lib/sec/schedule13-meta';
import { int, pct, shortDate, signedInt, signedPct, MISSING as M } from '@/lib/titans/format';
import { ActCard, FilerName, FormMark, StateChip, TagPill, WatchChip } from './ActCards';

const TYPE_HUES = ['ia', 'pn', 'in', 'co', 'hc'];

/* ── Card 8: Who Is Behind It ────────────────────────────────────────── */

export function WhoIsBehindItCard({ win, table, chip, onFiling }) {
  const types = win?.types || {};
  const callouts = useMemo(() => {
    const rows = (table?.data?.rows || []).filter((r) => r.form === '13D');
    const largest = (code) =>
      rows
        .filter((r) => (r.personTypes || []).some((t) => t.code === code))
        .reduce((a, r) => (r.percentOfClass > (a?.percentOfClass ?? -1) ? r : a), null);
    return [
      ['Corporation 13Ds', 'CO', largest('CO')],
      ['Individual 13Ds', 'IN', largest('IN')],
    ].filter(([, , r]) => r);
  }, [table?.data]);
  const bar = (list) => {
    const total = Math.max(
      1,
      (list || []).reduce((s, r) => s + r.n, 0),
    );
    return (list || []).slice(0, 6).map((r) => ({
      ...r,
      pctOf: (r.n / total) * 100,
      hue: TYPE_HUES.includes(String(r.code).toLowerCase())
        ? String(r.code).toLowerCase()
        : 'other',
    }));
  };
  const d = bar(types['13D']);
  const g = bar(types['13G']);
  return (
    <ActCard
      id="act-types"
      icon="bi-person-vcard"
      eyebrow="Who is behind it"
      title="What kind of investor files each form?"
      chip={chip}
      empty={!d.length && !g.length ? 'No cover-page investor types in this window yet.' : null}
      sourceExtra="A filing can carry several type codes, so counts exceed filings."
    >
      {[
        ['13D', d],
        ['13G', g],
      ].map(([label, rows]) => (
        <div key={label} className="act-typebar-row">
          <span className="act-eyebrow">{label}</span>
          <span className="act-typebar" aria-hidden="true">
            {rows.map((r) => (
              <span
                key={r.code}
                className={`act-typeseg act-typeseg--${r.hue}`}
                style={{ flexGrow: r.n }}
                title={`${PERSON_TYPE_LABEL[r.code] || r.code}: ${int(r.n)}`}
              >
                <span className="act-mono">{int(r.n)}</span>
              </span>
            ))}
          </span>
        </div>
      ))}
      <p className="act-legend act-legend--grid">
        {[...new Map([...d, ...g].map((r) => [r.code, r])).values()].map((r) => (
          <span key={r.code}>
            <i className={`act-dot act-typeseg--${r.hue}`} aria-hidden="true" />
            {PERSON_TYPE_LABEL[r.code] || r.code}
          </span>
        ))}
      </p>
      {callouts.length ? (
        <div className="act-callouts">
          {callouts.map(([label, code, r]) => (
            <div key={code} className="act-callout">
              <p className="act-eyebrow">{label}</p>
              <p className="act-callout-row">
                <button type="button" className="act-link" onClick={() => onFiling(r.accessionNo)}>
                  {r.filerConfirmed && r.filer ? r.filer : 'Filer not confirmed'}
                </button>
                <span className="act-muted">on</span>
                <span className="act-mono">{r.ticker || r.subject || M}</span>
                <span className="act-mono act-strong">
                  {r.percentOfClass != null ? pct(r.percentOfClass, 1) : M}
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <p className="act-note">
        Filings whose cover detail has not been structured yet are counted apart:{' '}
        <span className="act-mono">{int(types.no_cover || 0)}</span> in this window.
      </p>
    </ActCard>
  );
}

/* ── Card 9: Whose Money ─────────────────────────────────────────────── */

export function WhoseMoneyCard({ win, table, chip, onFiling }) {
  const funds = win?.funds_13d || [];
  const maxN = Math.max(1, ...funds.map((f) => f.n));
  const borrowed = useMemo(
    () =>
      (table.data?.rows || [])
        .filter(
          (r) =>
            r.form === '13D' &&
            (r.fundSources || []).some((s) => s.code === 'BK' || s.code === 'SC'),
        )
        .slice(0, 4),
    [table.data],
  );
  return (
    <ActCard
      id="act-money"
      icon="bi-cash-stack"
      eyebrow="Whose money"
      title="Where did the money for 13D stakes come from?"
      chip={chip}
      empty={!funds.length ? 'No 13D source-of-funds codes in this window yet.' : null}
      sourceExtra="Codes as filed on Row 4. Nothing is extracted from the Item 3 text."
    >
      {funds.slice(0, 6).map((f) => (
        <div key={f.code} className="act-fundbar">
          <span>
            {FUND_SOURCE_LABEL[f.code] || f.code}{' '}
            <span className="act-mono act-muted">{f.code}</span>
          </span>
          <span className="act-fundbar-track" aria-hidden="true">
            <span
              className={`act-fundbar-fill${f.code === 'BK' || f.code === 'SC' ? ' is-watch' : ''}`}
              style={{ width: `${(f.n / maxN) * 100}%` }}
            />
          </span>
          <span className="act-mono">{int(f.n)}</span>
        </div>
      ))}
      {borrowed.length ? (
        <>
          <p className="act-eyebrow">Bank borrowing and subject-company funds</p>
          {borrowed.map((r, i) => (
            <details key={r.accessionNo} className="act-borrow" open={i === 0}>
              <summary>
                <span className="act-mono act-borrow-code">
                  {(r.fundSources || [])
                    .filter((s) => s.code === 'BK' || s.code === 'SC')
                    .map((s) => s.code)
                    .join(' ')}
                </span>
                <span className="act-ellipsis">{r.filer || 'Filer not confirmed'}</span>
                <span className="act-mono">{r.ticker || M}</span>
                <span className="act-mono">
                  {r.percentOfClass != null ? pct(r.percentOfClass, 1) : M}
                </span>
                <span className="act-mono act-muted">{shortDate(r.filedAt)}</span>
              </summary>
              <blockquote className="act-quote">
                <ItemThree accession={r.accessionNo} onFiling={onFiling} />
              </blockquote>
            </details>
          ))}
        </>
      ) : null}
    </ActCard>
  );
}

function ItemThree({ accession, onFiling }) {
  const { status, data } = useJson(
    `/api/titans/activist?accession=${encodeURIComponent(accession)}`,
  );
  if (status === 'loading') return <span className="act-muted">Loading the verbatim Item 3…</span>;
  const text = data?.filing?.fundsSourceText;
  if (!text)
    return <span className="act-muted">Item 3 text is not structured for this filing.</span>;
  return (
    <>
      &ldquo;{text.length > 700 ? `${text.slice(0, 700)}…` : text}&rdquo;{' '}
      <button type="button" className="act-link" onClick={() => onFiling(accession)}>
        Open in the Filing Reader
      </button>
    </>
  );
}

/* ── Card 10: Control Gap ────────────────────────────────────────────── */

export function ControlGapCard({ table, chip, onFiling }) {
  const dots = useMemo(
    () =>
      (table.data?.rows || [])
        .map((r) => ({ ...r, ctl: controlShare(r.voting || {}) }))
        .filter((r) => r.ctl != null && r.percentOfClass != null),
    [table.data],
  );
  const excluded = (table.data?.rows || []).length - dots.length;
  const x = (p) => Math.min(100, Math.max(0, ((p - 5) / 15) * 100));
  return (
    <ActCard
      id="act-control"
      icon="bi-sliders"
      eyebrow="Control gap"
      title="Who controls the votes behind the stake?"
      chip={chip}
      empty={!dots.length ? 'No filings with voting-power fields in this window yet.' : null}
      sourceExtra="Voting powers are the lead reporting person's, as filed."
    >
      <div
        className="act-gap-plot"
        role="img"
        aria-label="Percent of class against the sole share of voting power"
      >
        <span className="act-gap-band act-gap-band--sole">Sole control</span>
        <span className="act-gap-band act-gap-band--shared">Shared through a fund structure</span>
        <span className="act-gap-mid" aria-hidden="true" />
        {dots.map((r) => (
          <button
            key={r.accessionNo}
            type="button"
            className={`act-gap-dot${r.form === '13D' ? ' is-d' : ' is-g'}`}
            style={{ left: `${x(Math.min(r.percentOfClass, 20))}%`, top: `${(1 - r.ctl) * 100}%` }}
            onClick={() => onFiling(r.accessionNo)}
            title={`${r.filer || 'Filer not confirmed'} · ${r.ticker || r.subject || ''} · ${r.form} · ${pct(r.percentOfClass, 1)} · ${pct(r.ctl * 100, 0)} sole`}
            aria-label={`${r.filer || 'Filer not confirmed'} on ${r.ticker || r.subject}: ${pct(r.percentOfClass, 1)} of class, ${pct(r.ctl * 100, 0)} of voting power held solely. Open the filing.`}
          >
            {r.percentOfClass > 20 ? <span className="act-mono">+</span> : null}
          </button>
        ))}
        <p className="act-axis act-mono" aria-hidden="true">
          <span>5%</span>
          <span>10%</span>
          <span>15%</span>
          <span>20%</span>
        </p>
      </div>
      <p className="act-note">
        High and right is a large stake the filer votes alone. Low means the votes are shared inside
        a fund structure, which is how most managers hold.{' '}
        {excluded > 0 ? `${int(excluded)} filings without voting fields are not drawn.` : ''}
      </p>
    </ActCard>
  );
}

/* ── Card 11: The 13G Spectrum ───────────────────────────────────────── */

const BASIS_MEANING = {
  b: 'A qualified institution (bank, broker, fund) holding in the ordinary course, with no intent to influence control.',
  c: 'A passive investor below 20% certifying no intent to influence control.',
  d: 'An exempt holder, typically a stake acquired before the company registered.',
};

export function GSpectrumCard({ win, chip, basis, setBasis, onFiler }) {
  const rows = win?.basis_13g || [];
  const total = Math.max(
    1,
    rows.reduce((s, r) => s + r.n, 0),
  );
  return (
    <ActCard
      id="act-spectrum"
      icon="bi-eye"
      eyebrow="The 13G spectrum"
      title="How passive is passive?"
      chip={chip}
      empty={!rows.length ? 'No 13G basis codes in this window yet.' : null}
    >
      <div className="act-basisbar" aria-hidden="true">
        {rows.map((r) => (
          <button
            key={r.rule}
            type="button"
            className={`act-basisseg act-basisseg--${r.rule}${basis === r.rule ? ' is-on' : ''}`}
            style={{ flexGrow: r.n }}
            onClick={() => setBasis(basis === r.rule ? null : r.rule)}
          >
            <span className="act-mono">{int(r.n)}</span>
          </button>
        ))}
      </div>
      <div className="act-basis-grid">
        {rows.map((r) => (
          <div key={r.rule}>
            <p className="act-basis-head">
              <i className={`act-dot act-basisseg--${r.rule}`} aria-hidden="true" />
              {G_RULE_BASIS[`13d-1(${r.rule})`]?.label || `13d-1(${r.rule})`}
              <span className="act-mono act-muted">13d-1({r.rule})</span>
            </p>
            <p className="act-note">{BASIS_MEANING[r.rule]}</p>
            {(r.top || []).map((t) => (
              <p key={t.accession} className="act-basis-row">
                <FilerName filer={t.filer} cik={t.filer_cik} onFiler={onFiler} />
                <span className="act-mono">{t.ticker || M}</span>
                <span className="act-mono">{t.pct != null ? pct(t.pct, 1) : M}</span>
                {r.rule === 'c' && t.pct > 10 ? <WatchChip>ABOVE 10%</WatchChip> : null}
              </p>
            ))}
          </div>
        ))}
      </div>
      <p className="act-note act-note--hatch">
        <i className="bi bi-info-circle" aria-hidden="true" /> A passive certification is a
        statement of intent, not of size. A passive investor above 10% is worth reading as filed.
      </p>
    </ActCard>
  );
}

/* ── Card 12: After the Filing ───────────────────────────────────────── */

export function AfterTheFilingCard({ windowKey, tag, chip, onTarget }) {
  const [form, setForm] = useState('13d');
  const qs = new URLSearchParams({ w: windowKey, form });
  if (tag) qs.set('tag', tag);
  const { status, data } = useJson(`/api/titans/activist/after?${qs.toString()}`);
  const paths = data?.paths || [];
  const median = data?.median?.length ? data.median : medianPath(paths.map((p) => p.path));
  const [hot, setHot] = useState(null);
  let [lo, hi] = [-20, 30];
  for (const p of paths)
    for (const [, v] of p.path) {
      if (v < lo) lo = Math.floor(v / 10) * 10;
      if (v > hi) hi = Math.ceil(v / 10) * 10;
    }
  const px = (d) => ((d + 5) / 65) * 100;
  const py = (v) => 100 - ((v - lo) / (hi - lo)) * 100;
  const line = (path) => path.map(([d, v], i) => `${i ? 'L' : 'M'} ${px(d)} ${py(v)}`).join(' ');
  const medianEnd = median[median.length - 1];
  return (
    <ActCard
      id="act-after"
      icon="bi-graph-up"
      eyebrow="After the filing"
      title="What happened to the price around the event date?"
      chip={chip}
      empty={
        status === 'ready' && !paths.length
          ? 'Price history is not available for these targets yet.'
          : null
      }
      sourceExtra="Prices: daily closes. Observed changes only, with no benchmark."
    >
      <div className="act-after-controls">
        <div className="act-qcontrol" role="group" aria-label="Form">
          {['13d', '13g'].map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={form === f}
              className={`act-qbtn${form === f ? ' is-on' : ''}`}
              onClick={() => setForm(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        {tag ? <TagPill tag={tag} state="active" /> : null}
        <span className="act-mono act-muted">{int(paths.length)} targets</span>
      </div>
      <div className="act-after-grid">
        <div className="act-after-plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {[-10, 10, 20]
              .filter((g) => g > lo && g < hi)
              .map((g) => (
                <line
                  key={g}
                  x1="0"
                  x2="100"
                  y1={py(g)}
                  y2={py(g)}
                  style={{ stroke: 'var(--act-grid)', strokeWidth: 1 }}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            <line
              x1="0"
              x2="100"
              y1={py(0)}
              y2={py(0)}
              style={{ stroke: 'var(--act-annotation)', strokeWidth: 1.25 }}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={px(0)}
              x2={px(0)}
              y1="0"
              y2="100"
              style={{ stroke: 'var(--act-annotation)', strokeDasharray: '4 3', strokeWidth: 1.25 }}
              vectorEffect="non-scaling-stroke"
            />
            {paths.map((p) => (
              <path
                key={p.ticker + p.event}
                d={line(p.path)}
                style={{
                  stroke: hot === p.ticker ? 'var(--act-titans-ink)' : 'var(--act-faint-line)',
                  strokeWidth: hot === p.ticker ? 2.5 : 1.25,
                  fill: 'none',
                }}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {median.length ? (
              <path
                d={line(median)}
                style={{ stroke: 'var(--act-titans-ink)', strokeWidth: 3, fill: 'none' }}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {medianEnd ? (
            <span className="act-after-medlabel act-mono" style={{ top: `${py(medianEnd[1])}%` }}>
              Median {signedPct(medianEnd[1], 1)}
            </span>
          ) : null}
          <p className="act-axis act-mono" aria-hidden="true">
            <span>day −5</span>
            <span>event day 0</span>
            <span>+30</span>
            <span>+60</span>
          </p>
        </div>
        <table className="act-table act-after-table">
          <thead>
            <tr>
              <th scope="col">Target</th>
              <th scope="col" className="act-num">
                Event → filed
              </th>
              <th scope="col" className="act-num">
                Filed → today
              </th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).slice(0, 8).map((r) => (
              <tr
                key={r.ticker}
                onMouseEnter={() => setHot(r.ticker)}
                onMouseLeave={() => setHot(null)}
              >
                <td>
                  <button
                    type="button"
                    className="act-link act-mono"
                    onClick={() => onTarget(r.ticker)}
                  >
                    {r.ticker}
                  </button>
                </td>
                <td className={`act-mono act-num ${r.eventToFiled >= 0 ? 'act-pos' : 'act-neg'}`}>
                  {r.eventToFiled != null ? signedPct(r.eventToFiled, 1) : M}
                </td>
                <td className={`act-mono act-num ${r.filedToToday >= 0 ? 'act-pos' : 'act-neg'}`}>
                  {r.filedToToday != null ? signedPct(r.filedToToday, 1) : M}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ActCard>
  );
}

/* ── Card 13: Insiders and Institutions Respond ──────────────────────── */

export function RespondCard({ table, chip, onTarget }) {
  const targets = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of table.data?.rows || []) {
      if (!r.ticker || seen.has(r.ticker)) continue;
      seen.add(r.ticker);
      out.push(r);
      if (out.length >= 4) break;
    }
    return out;
  }, [table.data]);
  return (
    <ActCard
      id="act-respond"
      icon="bi-arrow-left-right"
      eyebrow="Insiders and institutions respond"
      title="What did other informed money do after the stake?"
      chip={chip}
      empty={
        table.status === 'ready' && !targets.length
          ? 'No stake with a mapped ticker in this window.'
          : null
      }
      sourceExtra="Insiders: SEC Form 4, 30 days after the filing. Institutions: Form 13F-HR."
    >
      {targets.map((r) => (
        <RespondRow key={r.ticker} filing={r} onTarget={onTarget} />
      ))}
    </ActCard>
  );
}

function RespondRow({ filing, onTarget }) {
  const { status, data } = useJson(
    `/api/titans/activist/target?key=${encodeURIComponent(filing.ticker)}`,
  );
  const ins = data?.response?.insider;
  const f13 = data?.response?.f13;
  return (
    <div className="act-respond-row">
      <p className="act-respond-head">
        <FormMark form={filing.form} />
        <button type="button" className="act-link act-mono" onClick={() => onTarget(filing.ticker)}>
          {filing.ticker}
        </button>
        <span className="act-muted act-ellipsis">{filing.subject}</span>
        <span className="act-mono act-muted">filed {shortDate(filing.filedAt)}</span>
      </p>
      <div className="act-respond-line">
        <span className="act-eyebrow">Insiders · Form 4</span>
        <span className="act-respond-track" aria-hidden="true">
          {(ins?.marks || []).slice(0, 20).map((m, i) => (
            <span
              key={i}
              className={`act-respond-mark${m.buy ? ' is-buy' : ''}`}
              title={`${shortDate(m.date)} · ${m.title || ''} · ${m.buy ? 'buy' : 'sell'}${m.shares ? ` · ${int(m.shares)} shares` : ''}`}
            />
          ))}
        </span>
        <span className="act-mono">
          {status === 'loading'
            ? M
            : ins
              ? `${int(ins.buys)} buys · ${int(ins.sells)} sells`
              : 'None in 30 days'}
        </span>
      </div>
      <div className="act-respond-line">
        <span className="act-eyebrow">13F holders</span>
        <span className="act-mono">
          {f13
            ? `${int(f13.holdersNow)} (${signedInt((f13.holdersNow || 0) - (f13.holdersPrior || 0))} vs prior quarter)`
            : M}
        </span>
        <Link
          className="act-link"
          href={`/datasets/institutional?security=${encodeURIComponent(filing.ticker)}`}
        >
          Security X-ray
        </Link>
      </div>
    </div>
  );
}

/* ── Card 14: Hunting Grounds ────────────────────────────────────────── */

export function HuntingGroundsCard({ win, chip }) {
  const sectors = useMemo(
    () => [...(win?.sectors || [])].sort((a, b) => b.new - a.new).slice(0, 10),
    [win],
  );
  const [selected, setSelected] = useState(null);
  const active = sectors.find((s) => s.sector === selected) || sectors[0] || null;
  const total = Math.max(
    1,
    sectors.reduce((s, r) => s + r.new, 0),
  );
  return (
    <ActCard
      id="act-grounds"
      icon="bi-grid-3x3-gap"
      eyebrow="Hunting grounds"
      title="Which sectors draw the 5% stakes?"
      chip={chip}
      empty={!sectors.length ? 'No sector rollup in this window yet.' : null}
    >
      <div className="act-grounds-grid">
        <div className="act-treemap" role="group" aria-label="New stakes by sector">
          {sectors.map((s) => (
            <button
              key={s.sector}
              type="button"
              className={`act-treetile${active?.sector === s.sector ? ' is-on' : ''}`}
              style={{ flexBasis: `${Math.max(12, (s.new / total) * 100)}%` }}
              onClick={() => setSelected(s.sector)}
              aria-pressed={active?.sector === s.sector}
            >
              <span
                className="act-treetile-band"
                style={{ height: `${s.new ? (s.new_13d / s.new) * 100 : 0}%` }}
                aria-hidden="true"
              />
              <span className="act-treetile-label">
                {s.sector} <span className="act-mono">{int(s.new)}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="act-grounds-aside">
          <p className="act-eyebrow">{active ? `${active.sector} · purpose mix` : M}</p>
          {active ? (
            <>
              <p className="act-note">
                {int(active.new)} new stakes, {int(active.new_13d)} on 13D.
              </p>
              {(active.tags || []).map((t) => {
                const maxN = Math.max(1, ...(active.tags || []).map((z) => z.n));
                return (
                  <div key={t.tag} className="act-fundbar">
                    <span>{t.tag}</span>
                    <span className="act-fundbar-track" aria-hidden="true">
                      <span
                        className="act-fundbar-fill"
                        style={{ width: `${(t.n / maxN) * 100}%` }}
                      />
                    </span>
                    <span className="act-mono">{int(t.n)}</span>
                  </div>
                );
              })}
            </>
          ) : null}
        </div>
      </div>
      <p className="act-legend">
        <span>
          <i className="act-dot act-dot--d" aria-hidden="true" /> 13D share of the tile
        </span>
        <span>
          <i className="act-dot act-dot--g" aria-hidden="true" /> 13G
        </span>
      </p>
    </ActCard>
  );
}

/* ── Card 15: Activist Leaderboard ───────────────────────────────────── */

export function LeaderboardCard({ win, chip, onFiler, onTarget }) {
  const [tab, setTab] = useState('13d');
  const rows = (tab === '13d' ? win?.leaderboard_13d : win?.leaderboard_13g) || [];
  return (
    <ActCard
      id="act-leaderboard"
      icon="bi-list-ol"
      eyebrow="Activist leaderboard"
      title="Who files the most, and how do they behave?"
      chip={chip}
      empty={!rows.length ? 'No leaderboard rows in this window yet.' : null}
    >
      <div className="act-tabs" role="tablist" aria-label="Leaderboard view">
        {[
          ['13d', '13D investors'],
          ['13g', '13G block holders, by basis'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`act-tab${tab === id ? ' is-on' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="act-table-wrap">
        <table className="act-table act-table--leaderboard">
          <thead>
            <tr>
              <th scope="col">Investor</th>
              <th scope="col" className="act-num">
                {tab === '13d' ? 'Campaigns' : 'Filings'}
              </th>
              <th scope="col" className="act-num">
                New
              </th>
              <th scope="col" className="act-num">
                Median {tab === '13d' ? 'first ' : ''}%
              </th>
              {tab === '13d' ? (
                <th scope="col" className="act-num">
                  Raised
                </th>
              ) : null}
              <th scope="col" className="act-num">
                {tab === '13d' ? 'Exits' : ''}
              </th>
              <th scope="col">{tab === '13d' ? 'Top purpose' : 'Basis'}</th>
              <th scope="col">Targets</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((r) => (
              <tr key={r.cik}>
                <td>
                  <FilerName filer={r.name} cik={r.cik} onFiler={onFiler} />
                  <span className="act-mono act-rowmeta">
                    {(Array.isArray(r.types) ? r.types : [])
                      .map((c) => PERSON_TYPE_LABEL[c] || c)
                      .slice(0, 2)
                      .join(' · ')}
                  </span>
                </td>
                <td className="act-mono act-num">{int(r.campaigns ?? r.filings) ?? M}</td>
                <td className="act-mono act-num">{int(r.new) ?? M}</td>
                <td className="act-mono act-num">
                  {r.median_first_pct != null || r.median_pct != null
                    ? pct(r.median_first_pct ?? r.median_pct, 1)
                    : M}
                </td>
                {tab === '13d' ? (
                  <td className="act-mono act-num act-pos">{r.raises ? signedInt(r.raises) : M}</td>
                ) : null}
                <td className="act-mono act-num">{tab === '13d' ? (int(r.exits) ?? M) : ''}</td>
                <td>
                  {tab === '13d' ? (
                    r.top_tag ? (
                      <TagPill tag={r.top_tag} />
                    ) : (
                      M
                    )
                  ) : r.basis ? (
                    <span className="act-basispill">13d-1({r.basis})</span>
                  ) : (
                    M
                  )}
                </td>
                <td>
                  {(r.tickers || []).slice(0, 4).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="act-tickchip act-mono"
                      onClick={() => onTarget(t)}
                    >
                      {t}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ActCard>
  );
}

/* ── Card 16: Filing Speed ───────────────────────────────────────────── */

export function FilingSpeedCard({ win, chip }) {
  const speed = win?.speed;
  const bins = speed?.bins || [];
  const series = [
    ['d', '13D initial', 'act-speedbar--d'],
    ['da', '13D amendment', 'act-speedbar--da'],
    ['g', '13G', 'act-speedbar--g'],
  ];
  const max = Math.max(1, ...series.flatMap(([k]) => speed?.[k] || []));
  return (
    <ActCard
      id="act-speed"
      icon="bi-stopwatch"
      eyebrow="Filing speed"
      title="How fast do filers report after the event date?"
      chip={chip}
      empty={!bins.length ? 'No event-dated filings in this window yet.' : null}
      sourceExtra={
        speed?.no_event_date
          ? `${int(speed.no_event_date)} filings carry no structured event date (text filings).`
          : null
      }
    >
      <p className="act-legend">
        {series.map(([k, label, cls]) => (
          <span key={k}>
            <i className={`act-dot ${cls}`} aria-hidden="true" /> {label}
          </span>
        ))}
      </p>
      <div
        className="act-speed"
        role="img"
        aria-label="Filings by business days from event to filing"
      >
        {bins.map((bin, i) => (
          <div key={bin} className="act-speed-bin">
            <span className="act-speed-bars" aria-hidden="true">
              {series.map(([k, label, cls]) => (
                <span
                  key={k}
                  className={`act-speedbar ${cls}`}
                  style={{ height: `${((speed?.[k]?.[i] || 0) / max) * 100}%` }}
                  title={`${label}: ${int(speed?.[k]?.[i] || 0)} in ${bin} business days`}
                />
              ))}
            </span>
            <span className="act-mono act-speed-x">{bin}</span>
            {bin === '2' ? <span className="act-speed-rule act-mono">2 bd · 13D/A</span> : null}
            {bin === '5' ? <span className="act-speed-rule act-mono">5 bd · 13D</span> : null}
          </div>
        ))}
      </div>
    </ActCard>
  );
}

/* ── the caveat card ─────────────────────────────────────────────────── */

const CAVEATS = [
  'The percent of class uses the issuer’s own share count, which moves; two filers can honestly report different denominators.',
  'An amendment can arrive months after the change it reports. The event date, where filed, is the date to read.',
  'A 13G says passive today. It says nothing about tomorrow; the switch to 13D is the signal worth watching.',
  'Item 4 is written by lawyers. Reservation language lets a filer do almost anything later without amending.',
  'Exits below 5% end the reporting duty, not necessarily the position. A filer can still hold 4.9% in silence.',
];

export function CaveatCard() {
  return (
    <section id="act-caveats" className="act-card" aria-labelledby="act-caveats-h">
      <header className="act-card-head">
        <span className="act-icon" aria-hidden="true">
          <i className="bi bi-file-text" />
        </span>
        <div className="act-card-head-text">
          <p className="act-eyebrow">Reading these filings</p>
          <h2 id="act-caveats-h" className="act-h2">
            Five things a 5% disclosure does not tell you
          </h2>
        </div>
      </header>
      <ol className="act-caveats">
        {CAVEATS.map((c) => (
          <li key={c.slice(0, 18)}>{c}</li>
        ))}
      </ol>
      <footer className="act-source">
        <span>SEC EDGAR Schedules 13D and 13G. Reported beneficial ownership above 5%.</span>
      </footer>
    </section>
  );
}

/* ── the filings table ───────────────────────────────────────────────── */

export function FilingsTable({ table, windowLabel, chip, onFiler, onTarget, onFiling }) {
  const [shown, setShown] = useState(50);
  const rows = (table.data?.rows || []).slice(0, shown);
  return (
    <ActCard
      id="act-filings"
      icon="bi-table"
      eyebrow="Every filing"
      title="The filings, one row each"
      chip={`${windowLabel} · ${int(table.data?.total ?? 0)} filings`}
      empty={
        table.status === 'ready' && !rows.length
          ? 'No filing matches these filters in this window. Widen the window to see earlier filings.'
          : null
      }
      sourceExtra={
        <Link className="act-link" href="/ezana-api">
          Open in EzanaQL
        </Link>
      }
    >
      <div className="act-table-wrap">
        <table className="act-table act-table--filings">
          <thead>
            <tr>
              <th scope="col">Filed</th>
              <th scope="col">Form</th>
              <th scope="col">Investor</th>
              <th scope="col">Target</th>
              <th scope="col" className="act-num">
                % of class
              </th>
              <th scope="col">Purpose or basis</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.accessionNo}>
                <td className="act-mono">
                  {shortDate(r.filedAt)}
                  <span className="act-rowmeta">
                    Event {r.eventDate ? shortDate(r.eventDate)?.replace(/, \d{4}$/, '') : M}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="act-link"
                    onClick={() => onFiling(r.accessionNo)}
                  >
                    <FormMark form={r.form} /> {r.form}
                    {r.isAmendment ? `/A${r.amendmentNo ?? ''}` : ''}
                  </button>
                  {!r.detailParsed ? (
                    <span className="act-rowmeta">
                      <StateChip>Detail arriving</StateChip>
                    </span>
                  ) : null}
                </td>
                <td>
                  <FilerName
                    filer={r.filerConfirmed ? r.filer : null}
                    cik={r.filerCik}
                    onFiler={onFiler}
                  />
                  <span className="act-rowmeta act-muted">
                    {(r.personTypes || [])
                      .slice(0, 2)
                      .map((t) => t.label)
                      .join(' · ')}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="act-link"
                    onClick={() => onTarget(r.ticker || r.cusip)}
                  >
                    {r.ticker ? <span className="act-mono">{r.ticker}</span> : null} {r.subject}
                  </button>
                </td>
                <td className="act-mono act-num act-strong">
                  {r.percentOfClass != null ? pct(r.percentOfClass, 1) : M}
                </td>
                <td>
                  {r.form === '13G' ? (
                    (r.gBasis || []).length ? (
                      (r.gBasis || []).map((b) => (
                        <span key={b.rule} className="act-basispill">
                          {b.label || b.rule}
                        </span>
                      ))
                    ) : r.detailParsed ? (
                      M
                    ) : (
                      <StateChip>Detail arriving</StateChip>
                    )
                  ) : (r.purposeTags || []).length ? (
                    (r.purposeTags || [])
                      .slice(0, 3)
                      .map((t) => <TagPill key={t.tag} tag={t.tag} label={t.label} />)
                  ) : r.detailParsed ? (
                    <StateChip>Text filing, cover details not structured</StateChip>
                  ) : (
                    <StateChip>Detail arriving</StateChip>
                  )}
                </td>
                <td>
                  <ScoreChip
                    prefix="act"
                    score={r.score}
                    factors="Whale Score factors: 13D 45 or 13G 25 base, stake up to 35, escalation 20."
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(table.data?.total || 0) > shown ? (
        <button type="button" className="act-link" onClick={() => setShown(shown + 50)}>
          Load more
        </button>
      ) : null}
    </ActCard>
  );
}

/* ── method ──────────────────────────────────────────────────────────── */

const METHOD = [
  [
    'Threshold',
    'Crossing 5% of a voting class triggers the duty to file. Below it, stakes are invisible here.',
  ],
  [
    'Two forms',
    'A 13D reports possible intent to influence control and carries Items 3 and 4. A 13G certifies passive or qualified-institution status and carries neither.',
  ],
  [
    'Verbatim text',
    'Item 3 and Item 4 are shown as filed. Tags are an index into that text, never a summary of intent.',
  ],
  [
    'The confirmed investor',
    'The EDGAR listing name can be the target company, so the investor comes from the filing itself: the cover page or the submission header. Where neither confirms it, the page says so.',
  ],
  [
    'Campaigns',
    'Filings are grouped by (confirmed investor, company). Each percent of class belongs to one investor and is never added across investors or reporting persons.',
  ],
  [
    'Amendments',
    'Each amendment is its own row. The latest filing in a campaign is its current state.',
  ],
];

export function MethodSection() {
  return (
    <section id="method" className="act-method" aria-labelledby="act-method-h">
      <h2 id="act-method-h" className="act-h2">
        How we source it
      </h2>
      <div className="act-method-grid">
        {METHOD.map(([title, body]) => (
          <div key={title}>
            <p className="act-eyebrow">{title}</p>
            <p className="act-note">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

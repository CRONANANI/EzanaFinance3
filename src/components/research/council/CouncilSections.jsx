'use client';

/**
 * Council sections of US Equities (/company-research). Shown only to council
 * members, on the same route as the retail page, which stays unchanged:
 *
 *   CouncilBand        under the search pill on every view: fund value, gain
 *                      on cost, benchmark, positions, teams (and the Sample
 *                      content switch for master admin and demo accounts)
 *   CouncilOnThisName  top of the right rail when a ticker is open
 *   CouncilNameSections  under the section tabs when a ticker is open:
 *                      position and sleeve, research history, pitch history,
 *                      policy check with contribution to fund, coverage gaps
 *   CouncilGaps        the Company view before a ticker is chosen
 *   CouncilSleeves     the Industry and Portfolio views
 *
 * Every figure comes from src/lib/org-company-research-model.js over the
 * council's own records (or the labelled sample). Nothing here writes.
 * Flat sections, hairlines, text-only actions, one filled button per group.
 */
import Link from 'next/link';
import { SkeletonRegion, Skeleton } from '@/components/ds';
import {
  LINKS,
  NA,
  STALE_DAYS,
  coverageGaps,
  fmtDate,
  fmtMoney,
  fmtPp,
  fmtShare,
  fmtShares,
  fmtSignedPct,
  fundOverview,
  gapNote,
  onTicker,
  sectionOrder,
  sleevesOf,
  toneOf,
} from '@/lib/org-company-research-model';
import './council-research.css';

const DOCS_SHOWN = 6;

/* ── States ─────────────────────────────────────────────────────────────── */

function Loading({ label, rows = 2 }) {
  return (
    <SkeletonRegion label={label} className="cue-skel">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={i % 2 ? 10 : 12} width={i % 2 ? '50%' : '85%'} />
      ))}
    </SkeletonRegion>
  );
}

function Empty({ children, href, action }) {
  return (
    <p className="cue-state">
      <i className="bi bi-info-circle" aria-hidden="true" />
      <span>{children}</span>
      {href ? (
        <Link href={href} className="cue-link">
          {action} <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      ) : null}
    </p>
  );
}

function Failed({ children, onRetry }) {
  return (
    <p className="cue-state cue-state--error" role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      <span>{children}</span>
      <button type="button" className="cue-link" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function Signed({ value, digits = 2, pp = false }) {
  const tone = toneOf(value);
  return (
    <span className={`cue-num cue-tone--${tone}`}>
      {pp ? fmtPp(value) : fmtSignedPct(value, digits)}
    </span>
  );
}

function Section({ id, title, action, children, busy }) {
  return (
    <section className="cue-sec" aria-labelledby={id} aria-busy={busy || undefined}>
      <header className="cue-sec__head">
        <h2 id={id} className="cue-sec__title">
          {title}
        </h2>
        {action || null}
      </header>
      {children}
    </section>
  );
}

/* ── KPI band ───────────────────────────────────────────────────────────── */

export function CouncilBand({ council }) {
  const { fund, sampleActive, sampleAvailable, setShowSample } = council;
  const o = fund.status === 'ready' ? fundOverview(fund.raw) : null;
  const sampleSwitch =
    sampleActive || sampleAvailable ? (
      <div className="cue-band__sample">
        {sampleActive ? <span className="cue-sample">Sample content</span> : null}
        {sampleAvailable ? (
          <button
            type="button"
            className="cue-tb"
            aria-pressed={!sampleActive}
            onClick={() => setShowSample(!sampleActive)}
          >
            {sampleActive ? 'Show council data' : 'Show sample content'}
          </button>
        ) : null}
      </div>
    ) : null;

  let body;
  if (fund.status === 'loading') body = <Loading label="Loading the council fund" />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Couldn&apos;t load the council fund.</Failed>;
  else if (o.status === 'empty')
    body = (
      <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
        The council book has no holdings yet.
      </Empty>
    );
  else {
    const t = o.totals;
    const kpis = [
      { label: 'Fund value', value: <span className="cue-num">{fmtMoney(t.value)}</span> },
      {
        label: 'Gain on cost',
        value: <Signed value={t.gainPct} />,
        note: 'Not time-weighted',
      },
      {
        label: o.benchmark.label,
        value: <Signed value={o.benchmark.pct} />,
        note: o.benchmark.note,
      },
      {
        label: 'Positions',
        value: <span className="cue-num">{t.positions}</span>,
        note: t.unpriced ? `${t.unpriced} not yet priced` : null,
      },
      { label: 'Teams', value: <span className="cue-num">{o.teams}</span> },
    ];
    body = (
      <dl className="cue-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="cue-kpi">
            <dt className="cue-kpi__label">{k.label}</dt>
            <dd className="cue-kpi__value">{k.value}</dd>
            {k.note ? <dd className="cue-kpi__note">{k.note}</dd> : null}
          </div>
        ))}
      </dl>
    );
  }

  return (
    <section
      className="cue-band"
      aria-label="Council fund"
      aria-busy={fund.status === 'loading' || undefined}
    >
      {sampleSwitch}
      <div className="cue-band__body">{body}</div>
    </section>
  );
}

/* ── Rail: council on this name ─────────────────────────────────────────── */

function nameView(council, ticker, research) {
  const { fund, ticker: part } = council;
  const status =
    fund.status === 'error' || part.status === 'error'
      ? 'error'
      : fund.status === 'ready' && part.status === 'ready'
        ? 'ready'
        : 'loading';
  const retry = () => {
    if (fund.status === 'error') fund.retry();
    if (part.status === 'error') part.retry();
  };
  const view =
    status === 'ready'
      ? onTicker(fund.raw, part.part, {
          ticker,
          sector: research?.profile?.sector || null,
          marketCapText: research?.quote?.display?.marketCap || null,
        })
      : null;
  return { status, retry, view };
}

export function CouncilOnThisName({ council, ticker, research }) {
  const { status, retry, view } = nameView(council, ticker, research);
  let body;
  if (status === 'loading') body = <Loading label="Loading the council's records" rows={4} />;
  else if (status === 'error')
    body = <Failed onRetry={retry}>Couldn&apos;t load the council&apos;s records.</Failed>;
  else if (!view.held && view.docCount === 0 && view.pitches.length === 0)
    body = (
      <Empty href={LINKS.pipeline} action="Open pitch pipeline">
        Your council has no history with {view.ticker}.
      </Empty>
    );
  else {
    const h = view.holding;
    const p = view.latestPitch;
    const rows = [
      ['Held in fund', h ? `Yes (${fmtShares(h.shares)} shares)` : 'No'],
      ['Team sleeve', h ? (h.team ? `${h.team}` : 'Unassigned') : NA],
      ['Weight in fund', h ? <span className="cue-num">{fmtShare(h.weightPct)}</span> : NA],
      ['Coverage analyst', view.analyst || NA],
      [
        'Documents',
        <span className="cue-num" key="d">
          {view.docCount}
        </span>,
      ],
      [
        'Last document',
        <span className="cue-num" key="l">
          {fmtDate(view.lastDocAt)}
        </span>,
      ],
      ['Pitch stage', p ? p.stageLabel : NA],
      [
        'Expected return',
        p && p.expectedReturn != null ? (
          <span key="e">
            <Signed value={p.expectedReturn} />
            {p.horizon ? <span className="cue-muted"> ({p.horizon})</span> : null}
          </span>
        ) : (
          NA
        ),
      ],
    ];
    body = (
      <>
        <dl className="cue-kv">
          {rows.map(([k, v]) => (
            <div key={k} className="cue-kv__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="cue-actions">
          {p ? (
            <Link href={LINKS.pitch(p.id)} className="cue-btn">
              Open pitch
            </Link>
          ) : null}
          <Link href={LINKS.dossier(view.ticker)} className="cue-tb">
            Open dossier
          </Link>
        </div>
      </>
    );
  }
  return (
    <section
      className="cue-rail"
      aria-labelledby="cue-name-title"
      aria-busy={status === 'loading' || undefined}
    >
      <header className="cue-sec__head">
        <h3 id="cue-name-title" className="cue-sec__title">
          Council on this name
        </h3>
        {council.sampleActive ? <span className="cue-sample">Sample content</span> : null}
      </header>
      {body}
    </section>
  );
}

/* ── Main column sections ───────────────────────────────────────────────── */

function PositionSection({ state }) {
  const { status, retry, view } = state;
  let body;
  if (status === 'loading') body = <Loading label="Loading the council position" rows={3} />;
  else if (status === 'error')
    body = <Failed onRetry={retry}>Couldn&apos;t load the position.</Failed>;
  else if (!view.held)
    body = (
      <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
        The fund does not hold {view.ticker}.
      </Empty>
    );
  else {
    const s = view.sleeve;
    body = (
      <div className="cue-scroll">
        <table className="cue-table">
          <thead>
            <tr>
              <th scope="col">Holding</th>
              <th scope="col" className="cue-r">
                Shares
              </th>
              <th scope="col" className="cue-r">
                Cost / share
              </th>
              <th scope="col" className="cue-r">
                Latest price
              </th>
              <th scope="col" className="cue-r">
                Market value
              </th>
              <th scope="col" className="cue-r">
                Return on cost
              </th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.ticker} className={r.isThis ? 'is-this' : undefined}>
                <th scope="row" className="cue-ticker">
                  {r.ticker}
                </th>
                <td className="cue-r cue-num">{fmtShares(r.shares)}</td>
                <td className="cue-r cue-num">{fmtMoney(r.avgCost)}</td>
                <td className="cue-r cue-num">{r.priced ? fmtMoney(r.price) : 'Not priced'}</td>
                <td className="cue-r cue-num">{fmtMoney(r.value)}</td>
                <td className="cue-r">
                  <Signed value={r.returnPct} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4}>
                {s.team} sleeve, {s.count} {s.count === 1 ? 'name' : 'names'},{' '}
                <span className="cue-num">{fmtShare(s.weightPct)}</span> of fund
              </th>
              <td className="cue-r cue-num">{fmtMoney(s.value)}</td>
              <td className="cue-r">
                <Signed value={s.returnPct} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }
  return (
    <Section id="cue-pos-title" title="Council position and sleeve" busy={status === 'loading'}>
      {body}
    </Section>
  );
}

function ResearchSection({ state, ticker }) {
  const { status, retry, view } = state;
  let body;
  if (status === 'loading') body = <Loading label="Loading research on this name" rows={3} />;
  else if (status === 'error')
    body = <Failed onRetry={retry}>Couldn&apos;t load the research history.</Failed>;
  else if (!view.docCount)
    body = (
      <Empty href={LINKS.library} action="Open research library">
        No research on {view.ticker} yet.
      </Empty>
    );
  else {
    const shown = view.docs.slice(0, DOCS_SHOWN);
    body = (
      <>
        <p className="cue-meta">
          <span>
            Coverage analyst <strong>{view.analyst || NA}</strong>
          </span>
          <span>
            Last document <strong className="cue-num">{fmtDate(view.lastDocAt)}</strong>
          </span>
          {view.stale ? (
            <span className="cue-tone--warn">
              <i className="bi bi-clock-history" aria-hidden="true" /> No research in {STALE_DAYS}{' '}
              days
            </span>
          ) : null}
        </p>
        <div className="cue-scroll">
          <table className="cue-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Version</th>
                <th scope="col">Title</th>
                <th scope="col">Author</th>
                <th scope="col">Type</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id}>
                  <td className="cue-num cue-nowrap">{fmtDate(d.date)}</td>
                  <td className="cue-num">{d.version}</td>
                  <td className="cue-wrap">{d.title}</td>
                  <td className="cue-nowrap">{d.author}</td>
                  <td className="cue-nowrap">{d.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {view.docCount > shown.length ? (
          <p className="cue-foot">
            Showing <span className="cue-num">{shown.length}</span> of{' '}
            <span className="cue-num">{view.docCount}</span> documents
          </p>
        ) : null}
      </>
    );
  }
  return (
    <Section
      id="cue-res-title"
      title="Coverage and research history"
      busy={status === 'loading'}
      action={
        <Link href={LINKS.dossier(ticker)} className="cue-link">
          Open dossier <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      }
    >
      {body}
    </Section>
  );
}

function PitchSection({ state }) {
  const { status, retry, view } = state;
  let body;
  if (status === 'loading') body = <Loading label="Loading pitch history" />;
  else if (status === 'error')
    body = <Failed onRetry={retry}>Couldn&apos;t load the pitch history.</Failed>;
  else if (!view.pitches.length)
    body = (
      <Empty href={LINKS.pipeline} action="Open pitch pipeline">
        No pitch on {view.ticker} yet.
      </Empty>
    );
  else
    body = (
      <div className="cue-scroll">
        <table className="cue-table">
          <thead>
            <tr>
              <th scope="col">Pitch</th>
              <th scope="col">Owner</th>
              <th scope="col">Stage</th>
              <th scope="col">Decision</th>
              <th scope="col" className="cue-r">
                Expected return
              </th>
              <th scope="col" className="cue-r">
                Last update
              </th>
            </tr>
          </thead>
          <tbody>
            {view.pitches.map((p) => (
              <tr key={p.id}>
                <th scope="row" className="cue-nowrap">
                  <Link href={LINKS.pitch(p.id)} className="cue-rowlink">
                    {p.title}
                  </Link>
                </th>
                <td className="cue-nowrap">{p.owner}</td>
                <td className={`cue-nowrap cue-tone--${p.tone}`}>{p.stageLabel}</td>
                <td className="cue-nowrap">{p.decision || NA}</td>
                <td className="cue-r">
                  <Signed value={p.expectedReturn} />
                </td>
                <td className="cue-r cue-num cue-nowrap">{fmtDate(p.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <Section id="cue-pitch-title" title="Pitch history" busy={status === 'loading'}>
      {body}
    </Section>
  );
}

function PolicyAndContribution({ state }) {
  const { status, retry, view } = state;
  let policy;
  let contrib;
  if (status === 'loading') {
    policy = <Loading label="Loading policy readings" rows={4} />;
    contrib = <Loading label="Loading contribution" rows={4} />;
  } else if (status === 'error') {
    policy = <Failed onRetry={retry}>Couldn&apos;t load the policy readings.</Failed>;
    contrib = <Failed onRetry={retry}>Couldn&apos;t load the contribution.</Failed>;
  } else {
    policy = !view.policy.length ? (
      <Empty href={LINKS.compliance} action="Open Compliance">
        No policy rules saved for this council.
      </Empty>
    ) : (
      <>
        <dl className="cue-policy">
          {view.policy.map((r) => (
            <div key={r.id} className="cue-policy__row">
              <dt>{r.label}</dt>
              <dd className="cue-num">{r.current}</dd>
              <dd className={`cue-policy__read cue-tone--${r.tone}`}>
                {r.reading}
                {r.limit !== NA && r.type.startsWith('prohibited') ? (
                  <span className="cue-muted">
                    {' '}
                    (listed: <span className="cue-num">{r.limit}</span>)
                  </span>
                ) : r.limit !== NA && !['Not checked', 'At pitch'].includes(r.reading) ? (
                  <span className="cue-muted">
                    {' '}
                    (limit <span className="cue-num">{r.limit}</span>)
                  </span>
                ) : r.limit !== NA ? (
                  <span className="cue-muted">
                    {' '}
                    (<span className="cue-num">{r.limit}</span>)
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        <p className="cue-note">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            Read from the council&apos;s stored rules and its book. Descriptive only: nothing here
            places or blocks a trade, and the cash floor is recorded, not checked.
          </span>
        </p>
      </>
    );
    const c = view.contribution;
    if (!c)
      contrib = (
        <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
          No contribution: the fund does not hold {view.ticker}.
        </Empty>
      );
    else
      contrib = (
        <>
          <dl className="cue-kv">
            <div className="cue-kv__row">
              <dt>Return on cost (holding)</dt>
              <dd>
                <Signed value={c.returnPct} />
              </dd>
            </div>
            <div className="cue-kv__row">
              <dt>Fund gain on cost</dt>
              <dd>
                <Signed value={c.fundGainPct} />
              </dd>
            </div>
            <div className="cue-kv__row">
              <dt>Contribution to fund gain</dt>
              <dd>
                <Signed value={c.contributionPp} pp />
              </dd>
            </div>
            <div className="cue-kv__row">
              <dt>Weight in fund</dt>
              <dd className="cue-num">{fmtShare(c.weightPct)}</dd>
            </div>
            <div className="cue-kv__row">
              <dt>Coverage analyst</dt>
              <dd>{c.analyst || NA}</dd>
            </div>
          </dl>
          {!view.holding.priced ? (
            <p className="cue-note">
              <i className="bi bi-info-circle" aria-hidden="true" />
              <span>Not yet priced, so it is held at cost and adds nothing to the gain.</span>
            </p>
          ) : null}
        </>
      );
  }
  return (
    <div className="cue-pair">
      <Section id="cue-ips-title" title="Policy check" busy={status === 'loading'}>
        {policy}
      </Section>
      <div className="cue-pair__rule" aria-hidden="true" />
      <Section id="cue-contrib-title" title="Contribution to fund" busy={status === 'loading'}>
        {contrib}
      </Section>
    </div>
  );
}

function GapsTable({ gaps }) {
  return (
    <div className="cue-scroll">
      <table className="cue-table">
        <thead>
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Team</th>
            <th scope="col">Status</th>
            <th scope="col" className="cue-r">
              Last research
            </th>
            <th scope="col">Coverage analyst</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((g) => (
            <tr key={g.ticker}>
              <th scope="row" className="cue-ticker">
                {g.ticker}
              </th>
              <td className="cue-nowrap">{g.team || 'Unassigned'}</td>
              <td className="cue-nowrap cue-tone--warn">
                <i
                  className={`bi ${g.status === 'uncovered' ? 'bi-exclamation-triangle' : 'bi-clock-history'}`}
                  aria-hidden="true"
                />{' '}
                {g.status === 'uncovered' ? 'Uncovered' : 'Stale'}
              </td>
              <td className="cue-r cue-num cue-nowrap">{fmtDate(g.lastDocAt)}</td>
              <td className="cue-nowrap">{g.analyst || NA}</td>
              <td className="cue-wrap">{gapNote(g)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CouncilGaps({ council }) {
  const { fund } = council;
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading coverage gaps" rows={3} />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Couldn&apos;t load coverage gaps.</Failed>;
  else if (!(fund.raw?.positions || []).length)
    body = (
      <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
        No holdings yet, so there is no coverage to check.
      </Empty>
    );
  else {
    const gaps = coverageGaps(fund.raw);
    body = gaps.length ? (
      <GapsTable gaps={gaps} />
    ) : (
      <Empty href={LINKS.lineage} action="Open coverage lineage">
        Every holding has research from the last {STALE_DAYS} days.
      </Empty>
    );
  }
  return (
    <Section
      id="cue-gaps-title"
      title="Coverage gaps and stale names"
      busy={fund.status === 'loading'}
    >
      {body}
    </Section>
  );
}

export function CouncilNameSections({ council, ticker, research, role }) {
  const state = nameView(council, ticker, research);
  const parts = {
    position: <PositionSection key="position" state={state} />,
    research: <ResearchSection key="research" state={state} ticker={ticker} />,
    pitches: <PitchSection key="pitches" state={state} />,
    policy: <PolicyAndContribution key="policy" state={state} />,
  };
  const order = sectionOrder(council.fund.raw?.viewer?.role || role);
  return (
    <div className="cue-stack" aria-label={`Your council on ${ticker}`} role="region">
      {order.map((k) => parts[k])}
      <CouncilGaps council={council} />
    </div>
  );
}

/* ── Industry and Portfolio views ───────────────────────────────────────── */

export function CouncilSleeves({ council }) {
  const { fund } = council;
  let body;
  if (fund.status === 'loading') body = <Loading label="Loading team sleeves" rows={3} />;
  else if (fund.status === 'error')
    body = <Failed onRetry={fund.retry}>Couldn&apos;t load the team sleeves.</Failed>;
  else {
    const rows = sleevesOf(fund.raw);
    body = !rows.length ? (
      <Empty href={LINKS.tradingDesk} action="Open Trading Desk">
        No holdings yet, so there are no team sleeves.
      </Empty>
    ) : (
      <div className="cue-scroll">
        <table className="cue-table">
          <thead>
            <tr>
              <th scope="col">Team</th>
              <th scope="col" className="cue-r">
                Names
              </th>
              <th scope="col" className="cue-r">
                Cost
              </th>
              <th scope="col" className="cue-r">
                Market value
              </th>
              <th scope="col" className="cue-r">
                Return on cost
              </th>
              <th scope="col" className="cue-r">
                Weight in fund
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teamId || 'none'}>
                <th scope="row" className="cue-nowrap">
                  {r.name}
                  {r.unpriced ? (
                    <span className="cue-muted"> ({r.unpriced} not yet priced)</span>
                  ) : null}
                </th>
                <td className="cue-r cue-num">{r.count}</td>
                <td className="cue-r cue-num">{fmtMoney(r.cost)}</td>
                <td className="cue-r cue-num">{fmtMoney(r.value)}</td>
                <td className="cue-r">
                  <Signed value={r.returnPct} />
                </td>
                <td className="cue-r cue-num">{fmtShare(r.weightPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <Section id="cue-sleeves-title" title="Council team sleeves" busy={fund.status === 'loading'}>
      {body}
    </Section>
  );
}

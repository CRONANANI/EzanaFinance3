'use client';

/**
 * Signals across datasets: the five Capitol linkages in one tabbed panel.
 * A tablist with arrow keys; ?tab= remembers the tab (omitted for A). Every
 * tab ends with its window, named sources and measurement note.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { RowActions } from '@/components/datasets/hub/HubClient';
import QuickStepBadge from '@/components/datasets/hub/QuickStepBadge';
import { HUB_LINKAGES } from '@/lib/datasets/hub-config';
import { useCwh, setParam } from './CwhProvider';
import EventChart from './EventChart';
import AwardReaders from './AwardReaders';
import LobbyingRatio from './LobbyingRatio';
import { TABS } from './tabs';
import { PartyTag, SourceFoot, TypeTag } from './bits';
import { DASH, count, money, monthDay, pct0, pct1, signed, side } from './cwh-format';

const CONFIG = Object.fromEntries((HUB_LINKAGES.capitol || []).map((c) => [c.id, c]));
const TYPES = [
  { id: 'all', label: 'All traders' },
  { id: 'Politician', label: 'Politicians' },
  { id: 'Insider', label: 'Insiders' },
  { id: 'Institution', label: 'Institutions' },
  { id: 'Whale', label: 'Whales' },
];

const cell = (r, label) => r.cells?.find((c) => c.label === label)?.value ?? null;
const cellLike = (r, re) => r.cells?.find((c) => re.test(c.label)) || null;
const memberFromHref = (href) => {
  const m = /[?&]member=([A-Za-z]\d{6})/.exec(href || '');
  return m ? m[1].toUpperCase() : null;
};

function Who({ r }) {
  const { openMember } = useCwh();
  const id = memberFromHref(r.href);
  return (
    <div className="cwh-who">
      {id ? (
        <button
          type="button"
          className="cwh-who-name"
          data-member={id}
          onClick={() => openMember(id, { name: r.title, party: r.party })}
        >
          {r.title}
        </button>
      ) : r.href ? (
        <a className="cwh-who-name" href={r.href}>
          {r.title}
        </a>
      ) : (
        <span className="cwh-who-name">{r.title}</span>
      )}
      <span className="cwh-who-tags">
        <TypeTag type={r.tag} />
        <PartyTag party={r.party} />
        {r.badge ? <QuickStepBadge kind="actor" compact /> : null}
      </span>
    </div>
  );
}

function Acts({ r, label }) {
  return (
    <RowActions
      ticker={r.ticker || null}
      query={r.query || null}
      label={label || r.title}
      dimension="capitol"
      shareUrl={r.href && !r.external ? r.href : null}
    />
  );
}

function TickerBtn({ ticker, name }) {
  const { openCompany } = useCwh();
  if (!ticker) return <span className="cwh-faint">{DASH}</span>;
  return (
    <button type="button" className="cwh-tk" onClick={() => openCompany({ ticker, name })}>
      {ticker}
    </button>
  );
}

function TabAwards({ rows }) {
  const [type, setType] = useState('all');
  const shown = type === 'all' ? rows : rows.filter((r) => r.tag === type);
  return (
    <>
      <div className="cwh-mod-head">
        <div>
          <h3 className="cwh-h4">
            Best 30-day returns on trades made within 30 days of an award to the same company
          </h3>
          <p className="cwh-caption">
            Politicians, corporate insiders (Form 4), institutions (13F changes) and whales (13D/G
            stakes).
          </p>
        </div>
        <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Trader type">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`cwh-pill${type === t.id ? ' is-active' : ''}`}
              aria-pressed={type === t.id}
              onClick={() => setType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {!shown.length ? (
        <p className="cwh-empty">No trades by this group near an award yet.</p>
      ) : (
        <div className="cwh-scroll">
          <table className="cwh-table cwh-table--awards">
            <thead>
              <tr>
                <th scope="col">TRADER</th>
                <th scope="col">TICKER</th>
                <th scope="col">TRADE</th>
                <th scope="col" className="is-num">
                  30D
                </th>
                <th scope="col" className="is-num">
                  AWARD
                </th>
                <th scope="col">AWARD DATE, AGENCY</th>
                <th scope="col">PRICE AROUND AWARD</th>
                <th scope="col">
                  <span className="cwh-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const tradeCell = cellLike(r, /^(Bought|Sold)$/);
                const ret = cell(r, '30-day return');
                return (
                  <tr key={r.key}>
                    <td data-label="Trader">
                      <Who r={r} />
                    </td>
                    <td data-label="Ticker">
                      <TickerBtn ticker={r.ticker} />
                    </td>
                    <td data-label="Trade" className="cwh-mono">
                      <span
                        className={`cwh-side ${tradeCell?.label === 'Sold' ? 'is-sell' : 'is-buy'}`}
                      >
                        {tradeCell?.label === 'Sold' ? 'SELL' : 'BUY'}
                      </span>{' '}
                      {monthDay(tradeCell?.value)}
                    </td>
                    <td
                      data-label="30D"
                      className={`cwh-mono is-num${ret == null ? '' : ret >= 0 ? ' is-pos' : ' is-neg'}`}
                    >
                      {signed(ret)}
                    </td>
                    <td data-label="Award" className="cwh-mono is-num cwh-strong">
                      {money(cell(r, 'Award'))}
                    </td>
                    <td data-label="Award date">
                      <span className="cwh-mono cwh-mute">{monthDay(cell(r, 'Award date'))}</span>
                      <span className="cwh-mute"> · {cell(r, 'Agency') || DASH}</span>
                    </td>
                    <td data-label="Chart" className="cwh-td-chart">
                      <EventChart
                        size="mini"
                        ticker={r.ticker}
                        points={r.chart?.points}
                        tradeDate={r.chart?.entryDate || r.chart?.tradeDate}
                        awardDate={r.chart?.awardDate}
                        retPct={r.chart?.retPct}
                      />
                    </td>
                    <td className="cwh-td-acts">
                      <Acts r={r} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TabReaders({ readers, extra }) {
  return (
    <>
      <div className="cwh-mod-head">
        <div>
          <h3 className="cwh-h4">Who reads contract awards best</h3>
          <p className="cwh-caption">
            Politicians, insiders, institutions and whales who traded a company within 30 days of a
            federal award to it, how often ahead of the award, and how those trades did. Companies
            shows whose stock moves after their awards.
          </p>
        </div>
      </div>
      <AwardReaders readers={readers} companies={extra?.companies || []} idPrefix="cwh-tab-ar" />
    </>
  );
}

function TabCommittees({ rows }) {
  const { openMember } = useCwh();
  return (
    <>
      <div className="cwh-mod-head">
        <div>
          <h3 className="cwh-h4">Trades in sectors a member&apos;s committees oversee</h3>
          <p className="cwh-caption">
            Ranked by the largest share of any one committee whose members hold the stock.
          </p>
        </div>
      </div>
      {!rows.length ? (
        <p className="cwh-empty">{CONFIG['capitol-committee-sectors']?.empty}</p>
      ) : (
        <div className="cwh-scroll">
          <table className="cwh-table">
            <thead>
              <tr>
                <th scope="col">TICKER</th>
                <th scope="col">LATEST TRADE</th>
                <th scope="col">DATE</th>
                <th scope="col">OVERSIGHT</th>
                <th scope="col">SECTOR</th>
                <th scope="col" className="is-num">
                  HOLDING
                </th>
                <th scope="col">
                  <span className="cwh-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const top = r.committees?.[0];
                return (
                  <tr key={r.key}>
                    <td data-label="Ticker">
                      <TickerBtn ticker={r.ticker} />
                    </td>
                    <td data-label="Latest trade">
                      {r.member?.bioguideId ? (
                        <button
                          type="button"
                          className="cwh-who-name"
                          data-member={r.member.bioguideId}
                          onClick={() =>
                            openMember(r.member.bioguideId, {
                              name: r.member.name,
                              party: r.member.party,
                            })
                          }
                        >
                          {r.member.name}
                        </button>
                      ) : (
                        cell(r, 'Latest trade')
                      )}{' '}
                      <PartyTag party={r.member?.party} />{' '}
                      <span
                        className={`cwh-side ${side(r.side) === 'sell' ? 'is-sell' : 'is-buy'}`}
                      >
                        {side(r.side) === 'sell' ? 'SELL' : 'BUY'}
                      </span>
                    </td>
                    <td data-label="Date" className="cwh-mono cwh-mute">
                      {monthDay(r.date || cell(r, 'Date'))}
                    </td>
                    <td data-label="Oversight">{r.committee || cell(r, 'Oversight')}</td>
                    <td data-label="Sector" className="cwh-mute">
                      {r.sector || cell(r, 'Sector')}
                    </td>
                    <td data-label="Holding" className="cwh-mono is-num">
                      {top ? (
                        <span title={`${top.holders} of ${top.seats} ${top.name} members`}>
                          {pct1(top.share * 100)}{' '}
                          <span className="cwh-faint">
                            {top.holders}/{top.seats}
                          </span>
                        </span>
                      ) : (
                        DASH
                      )}
                    </td>
                    <td className="cwh-td-acts">
                      <Acts r={r} label={r.ticker} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TabRaisers({ rows }) {
  return (
    <>
      <div className="cwh-mod-head">
        <div>
          <h3 className="cwh-h4">Top raisers who also trade</h3>
          <p className="cwh-caption">{CONFIG['capitol-raisers-trade']?.why}</p>
        </div>
      </div>
      {!rows.length ? (
        <p className="cwh-empty">{CONFIG['capitol-raisers-trade']?.empty}</p>
      ) : (
        <div className="cwh-scroll">
          <table className="cwh-table">
            <thead>
              <tr>
                <th scope="col">MEMBER</th>
                <th scope="col" className="is-num">
                  RAISED, CYCLE
                </th>
                <th scope="col" className="is-num">
                  CASH ON HAND
                </th>
                <th scope="col" className="is-num">
                  TRADES, 12M
                </th>
                <th scope="col">
                  <span className="cwh-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td data-label="Member">
                    <Who r={r} />
                  </td>
                  <td data-label="Raised" className="cwh-mono is-num cwh-strong">
                    {money(cellLike(r, /^Raised/)?.value)}
                  </td>
                  <td data-label="Cash" className="cwh-mono is-num">
                    {money(cell(r, 'Cash on hand'))}
                  </td>
                  <td data-label="Trades" className="cwh-mono is-num">
                    {count(cell(r, 'Trades, 12 months'))}
                  </td>
                  <td className="cwh-td-acts">
                    <Acts r={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const BODY = {
  awards: (d) => <TabAwards rows={d.rows} />,
  readers: (d) => <TabReaders readers={d.readers} extra={d.extra} />,
  committees: (d) => <TabCommittees rows={d.rows} />,
  lobbying: (d) => <LobbyingRatio initial={d.ratio} />,
  raisers: (d) => <TabRaisers rows={d.rows} />,
};

export default function SignalsPanel({ data }) {
  const [tab, setTab] = useState('awards');
  const refs = useRef({});
  const ready = useRef(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some((x) => x.key === t)) setTab(t);
    ready.current = true;
  }, []);
  useEffect(() => {
    if (ready.current) setParam('tab', tab === 'awards' ? null : tab);
  }, [tab]);

  const onKey = (e) => {
    const i = TABS.findIndex((t) => t.key === tab);
    let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') j = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = TABS.length - 1;
    if (j == null) return;
    e.preventDefault();
    setTab(TABS[j].key);
    refs.current[TABS[j].key]?.focus();
  };

  const active = TABS.find((t) => t.key === tab);
  const d = data[active.key] || { rows: [] };
  const cfg = CONFIG[active.id] || {};
  const note = useMemo(() => {
    if (active.key === 'awards')
      return 'A sale counts as a gain when the price fell. Institutions and whales are measured from the filing date, since 13F and 13D/G filings carry no trade date.';
    if (active.key === 'readers')
      return 'Insight score = average 30-day return x hit rate, scaled down for small samples, over the trades with 30 days of price history. Ahead counts trades made before the award date. Companies: average stock move in the 30 days after each award date, and how often it rose.';
    if (active.key === 'lobbying')
      return 'Lobbying is what each company reported on its LDA filings for the window; awards are federal contract obligations over the same span. Companies join by verified ticker or by an exact match on the normalised company name (tagged NAME MATCH). Correlation is not causation.';
    if (active.key === 'committees')
      return 'Holdings are inferred from disclosures: a purchase not followed by a full sale. Committee counts cover full committees of 10 or more members. Sector links are Ezana’s reading of each committee’s published jurisdiction.';
    return cfg.coverage || null;
  }, [active.key, cfg.coverage]);

  return (
    <section className="cwh-section" aria-labelledby="cwh-panel-h">
      <div className="cwh-section-head">
        <h2 className="cwh-h2" id="cwh-panel-h">
          Signals across datasets
        </h2>
        <span className="cwh-caption">five linkage views, one panel</span>
      </div>
      <div className="cwh-card cwh-panel">
        <div
          className="cwh-tabs"
          role="tablist"
          aria-label="Signals across datasets"
          onKeyDown={onKey}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`cwh-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`cwh-tabpanel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              className={`cwh-tab${tab === t.key ? ' is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <span className="cwh-tab-letter" aria-hidden="true">
                {t.letter}
              </span>
              {t.label}
            </button>
          ))}
        </div>
        <div
          className="cwh-panel-body"
          role="tabpanel"
          id={`cwh-tabpanel-${active.key}`}
          aria-labelledby={`cwh-tab-${active.key}`}
        >
          {d.error ? (
            <p className="cwh-empty">
              This signal could not be loaded just now. It refreshes on its own; reload in a minute.
            </p>
          ) : (
            BODY[active.key](d)
          )}
          <SourceFoot note={note} window={cfg.window} sources={cfg.sources} />
        </div>
      </div>
    </section>
  );
}

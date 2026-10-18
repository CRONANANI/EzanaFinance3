'use client';

/**
 * 01 FinancialLeaderboard: every member ranked by their campaign's money.
 * Tabs, search, party and chamber filters, sortable money columns, 20 rows
 * per page. A row opens the member research drawer (?member=<bioguide_id>).
 */
import { useEffect, useMemo, useState } from 'react';
import { money, partyOf, pct, seatLabel } from './format';
import { Avatar, CardFoot, CFCardState, Pills } from './ui';

const PAGE = 20;
const TABS = [
  { key: 'raised', label: 'Top fundraisers', sort: 'raised' },
  { key: 'cash', label: 'Most cash', sort: 'cash' },
  { key: 'debt', label: 'Highest debt', sort: 'debt' },
  { key: 'intensity', label: 'Spending intensity', sort: 'intensity' },
];
const COLS = [
  { key: 'raised', label: 'Raised' },
  { key: 'spent', label: 'Spent' },
  { key: 'cash', label: 'Cash' },
  { key: 'debt', label: 'Debt' },
];

const intensity = (m) => (m.raised && m.raised > 0 && m.spent != null ? m.spent / m.raised : null);
const valueOf = (m, k) => (k === 'intensity' ? intensity(m) : m[k]);

export function useLeaderboardRows(members, { tab, sort, dir, q, party, chamber }) {
  return useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = members.filter((m) => {
      if (party !== 'all' && m.party !== party) return false;
      if (chamber !== 'all' && m.chamber !== chamber) return false;
      if (!s) return true;
      return (
        (m.name || '').toLowerCase().includes(s) ||
        (m.state || '').toLowerCase() === s ||
        (seatLabel(m) || '').toLowerCase().includes(s)
      );
    });
    const key = sort || TABS.find((t) => t.key === tab)?.sort || 'raised';
    /* Members without the measure go last, never ranked as zero. */
    list = [...list].sort((a, b) => {
      const va = valueOf(a, key);
      const vb = valueOf(b, key);
      if (va == null && vb == null) return (b.raised || 0) - (a.raised || 0);
      if (va == null) return 1;
      if (vb == null) return -1;
      return dir === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [members, tab, sort, dir, q, party, chamber]);
}

function SplitBar({ m }) {
  const mix = (m.itemized || 0) + (m.pac || 0);
  if (!mix) return <span className="cfi-muted">Not available yet</span>;
  const ind = m.itemized / mix;
  return (
    <span
      className="cfi-split"
      title={`${Math.round(ind * 100)}% itemized individual, ${Math.round((1 - ind) * 100)}% PAC`}
    >
      <span className="cfi-split-bar" aria-hidden="true">
        <span className="is-ind" style={{ width: `${ind * 100}%` }} />
        <span className="is-pac" style={{ width: `${(1 - ind) * 100}%` }} />
      </span>
      <span className="cfi-mono cfi-split-val">{pct(m.itemized, m.raised) || '0%'}</span>
    </span>
  );
}

export function FinancialLeaderboard({ data, onOpen, onOrder, updated }) {
  const members = data?.members || [];
  const [tab, setTab] = useState('raised');
  const [sort, setSort] = useState(null);
  const [dir, setDir] = useState('desc');
  const [q, setQ] = useState('');
  const [party, setParty] = useState('all');
  const [chamber, setChamber] = useState('all');
  const [page, setPage] = useState(1);
  const [mobileShown, setMobileShown] = useState(8);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rows = useLeaderboardRows(members, { tab, sort, dir, q, party, chamber });

  useEffect(() => {
    setPage(1);
    setMobileShown(8);
  }, [tab, sort, dir, q, party, chamber]);

  useEffect(() => {
    onOrder?.(rows.map((r) => r.id));
  }, [rows, onOrder]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice((page - 1) * PAGE, page * PAGE);
  const sortKey = sort || TABS.find((t) => t.key === tab)?.sort;

  const clickSort = (k) => {
    if (sortKey === k) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSort(k);
      setDir('desc');
    }
  };

  const t = data?.totals || {};
  const chips = (
    <div className="cfi-chips" aria-label="Congress totals">
      <div>
        <span className="cfi-eyebrow">Raised</span>
        <b className="cfi-mono">{money(t.raised) ?? 'n/a'}</b>
      </div>
      <div>
        <span className="cfi-eyebrow">Cash</span>
        <b className="cfi-mono">{money(t.cash) ?? 'n/a'}</b>
      </div>
      <div>
        <span className="cfi-eyebrow">Debt</span>
        <b className="cfi-mono">{money(t.debt) ?? 'n/a'}</b>
      </div>
    </div>
  );

  const pageNums = useMemo(() => {
    const out = new Set([1, pages, page - 1, page, page + 1]);
    return [...out].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  }, [page, pages]);

  return (
    <CFCardState
      className="cfi-lb"
      title={
        <>
          <span className="cfi-section-num cfi-mono">01</span> Financial position leaderboard
        </>
      }
      sub="Every member of Congress ranked by their campaign's money. Select a row to open the full research profile."
      actions={chips}
      state={data?.ready ? 'ready' : 'unavailable'}
      bodyHeight={420}
      footer={<CardFoot updated={updated} covered={members.length} />}
    >
      <Pills
        label="Leaderboard view"
        value={tab}
        onChange={(k) => {
          setTab(k);
          setSort(null);
          setDir('desc');
        }}
        options={TABS}
        className="cfi-lb-tabs"
      />
      {tab === 'intensity' ? (
        <p className="cfi-note cfi-lb-note">
          Spending intensity is spent divided by raised this cycle. It is not a burn rate: it leaves
          out cash carried in from earlier cycles and transfers between committees.
        </p>
      ) : null}

      <div className={`cfi-lb-filters${filtersOpen ? ' is-open' : ''}`}>
        <label className="cfi-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search member or state"
            aria-label="Search member or state"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="cfi-btn cfi-lb-filter-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <i className="bi bi-sliders" aria-hidden="true" />
          Filters
        </button>
        <div className="cfi-lb-pillsets">
          <Pills
            label="Party"
            value={party}
            onChange={setParty}
            size="sm"
            options={[
              { key: 'all', label: 'All parties' },
              { key: 'D', label: 'Democratic', dot: 'is-dem' },
              { key: 'R', label: 'Republican', dot: 'is-rep' },
              { key: 'I', label: 'Independent', dot: 'is-ind' },
            ]}
          />
          <Pills
            label="Chamber"
            value={chamber}
            onChange={setChamber}
            size="sm"
            options={[
              { key: 'all', label: 'Both chambers' },
              { key: 'H', label: 'House' },
              { key: 'S', label: 'Senate' },
            ]}
          />
        </div>
        <span className="cfi-count cfi-mono" aria-live="polite">
          {rows.length} members
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="cfi-state-note cfi-lb-empty">No records for this selection</p>
      ) : (
        <>
          <div className="cfi-table-wrap cfi-lb-table">
            <table className="cfi-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Member</th>
                  <th scope="col">Party</th>
                  <th scope="col">Seat</th>
                  {COLS.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className="r"
                      aria-sort={
                        sortKey === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
                      }
                    >
                      <button type="button" className="cfi-sort" onClick={() => clickSort(c.key)}>
                        {c.label}
                        {sortKey === c.key ? (
                          <i
                            className={`bi bi-arrow-${dir === 'asc' ? 'up' : 'down'}`}
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    </th>
                  ))}
                  <th scope="col">Individual / PAC</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {view.map((m, i) => {
                  const rank = (page - 1) * PAGE + i + 1;
                  const ratio = intensity(m);
                  return (
                    <tr
                      key={m.id}
                      className="cfi-row"
                      tabIndex={0}
                      onClick={() => onOpen(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpen(m.id);
                        }
                      }}
                      aria-label={`${m.name}, open research profile`}
                    >
                      <td className="cfi-mono cfi-muted">{rank}</td>
                      <td>
                        <span className="cfi-member">
                          <Avatar member={m} size={28} />
                          <span className="cfi-member-name">{m.name}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`cfi-party ${partyOf(m.party).cls}`}>
                          <i className="cfi-dot" aria-hidden="true" />
                          {partyOf(m.party).code}
                        </span>
                      </td>
                      <td className="cfi-mono cfi-seat">{seatLabel(m)}</td>
                      <td className="cfi-mono r">{money(m.raised) ?? 'n/a'}</td>
                      <td className="cfi-mono r">
                        {money(m.spent) ?? 'n/a'}
                        {tab === 'intensity' && ratio != null ? (
                          <span className="cfi-sub-val">{Math.round(ratio * 100)}% of raised</span>
                        ) : null}
                      </td>
                      <td className="cfi-mono r">{money(m.cash) ?? 'n/a'}</td>
                      <td className={`cfi-mono r${m.debt ? ' is-debt' : ''}`}>
                        {money(m.debt) ?? 'n/a'}
                      </td>
                      <td>
                        <SplitBar m={m} />
                      </td>
                      <td>
                        <span className={`cfi-tag${m.sizes ? ' is-full' : ''}`}>
                          {m.sizes ? 'Full detail' : 'Totals only'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ol className="cfi-lb-list">
            {rows.slice(0, mobileShown).map((m, i) => (
              <li key={m.id}>
                <button type="button" className="cfi-lb-item" onClick={() => onOpen(m.id)}>
                  <span className="cfi-mono cfi-muted cfi-lb-rank">{i + 1}</span>
                  <Avatar member={m} size={32} />
                  <span className="cfi-lb-who">
                    <b>{m.name}</b>
                    <span className="cfi-mono cfi-muted">
                      {partyOf(m.party).code} · {seatLabel(m)}
                    </span>
                    <span className="cfi-split-bar" aria-hidden="true">
                      {(() => {
                        const mix = (m.itemized || 0) + (m.pac || 0);
                        const ind = mix ? m.itemized / mix : 0;
                        return mix ? (
                          <>
                            <span className="is-ind" style={{ width: `${ind * 100}%` }} />
                            <span className="is-pac" style={{ width: `${(1 - ind) * 100}%` }} />
                          </>
                        ) : null;
                      })()}
                    </span>
                  </span>
                  <span className="cfi-lb-money">
                    <b className="cfi-mono">
                      {money(valueOf(m, sortKey === 'intensity' ? 'raised' : sortKey)) ?? 'n/a'}
                    </b>
                    <span className="cfi-mono cfi-muted">cash {money(m.cash) ?? 'n/a'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="cfi-lb-foot">
            <span className="cfi-legend">
              <i className="cfi-key is-ind" aria-hidden="true" />
              Itemized individual
              <i className="cfi-key is-pac" aria-hidden="true" />
              PAC
            </span>
            <p className="cfi-note">
              The split compares itemized individual and PAC money; the figure is itemized
              individual money as a share of everything raised. Detail shows whether a contribution
              size breakdown exists for the member.
            </p>
            <nav className="cfi-pager" aria-label="Leaderboard pages">
              <button
                type="button"
                className="cfi-pg"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              {pageNums.map((n, i) => (
                <span key={n} className="cfi-pg-wrap">
                  {i > 0 && n - pageNums[i - 1] > 1 ? <span className="cfi-pg-gap">…</span> : null}
                  <button
                    type="button"
                    className={`cfi-pg${n === page ? ' is-on' : ''}`}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="cfi-pg"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
            {mobileShown < rows.length ? (
              <button
                type="button"
                className="cfi-link-btn cfi-lb-more"
                onClick={() => setMobileShown((n) => n + 8)}
              >
                Show more ({Math.min(mobileShown, rows.length)} of {rows.length})
              </button>
            ) : null}
          </div>
        </>
      )}
    </CFCardState>
  );
}

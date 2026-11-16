'use client';

import { NA, fmtMoney, fmtSignedPct, toneOf } from '@/lib/org-command-center';
import {
  ROLE_GROUP_LABEL,
  ROSTER_FILTERS,
  customTitle,
  fmtDateTime,
  fmtDay,
  initialsOf,
  isCommittee,
  memberName,
  rankLabel,
} from '@/lib/org-chart-model';
import {
  Empty,
  Section,
  SectionError,
  Skel,
  TextToggle,
} from '@/components/org/command-center/parts';

const toneClass = (v) => `tcc-${toneOf(v)}`;
const na = <span className="tcc-na tcc-mono">{NA}</span>;

function SkelRows({ n = 4 }) {
  return (
    <div className="ooc-skelrows" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <Skel key={i} h={14} w={`${96 - (i % 3) * 14}%`} />
      ))}
    </div>
  );
}

/** A member as a button: initials, name and, in words, rank and committee seat. */
export function Person({ member, onOpen, size = 'md', isSelf = false, sub, showRank = true }) {
  const name = memberName(member);
  const title = customTitle(member);
  return (
    <button
      type="button"
      className={`ooc-person ooc-person--${size}${isSelf ? ' is-self' : ''}`}
      onClick={() => onOpen(member.id)}
      aria-label={`Open ${name}, ${rankLabel(member)}`}
    >
      <span className="ooc-avatar" aria-hidden="true">
        {initialsOf(name)}
      </span>
      <span className="ooc-person__text">
        <span className="ooc-person__name">
          {name}
          {isSelf && <span className="ooc-tag">You</span>}
          {isCommittee(member) && (
            <span className="ooc-tag ooc-tag--ic" title="Investment committee: votes on pitches">
              IC
            </span>
          )}
        </span>
        {showRank && (
          <span className="ooc-person__rank">
            {rankLabel(member)}
            {title ? `, ${title}` : ''}
          </span>
        )}
        {sub ? <span className="ooc-person__sub">{sub}</span> : null}
      </span>
    </button>
  );
}

/* ── Reporting structure ─────────────────────────────────────────────────── */

export function Structure({ chart, structure, byId, viewerId, note, onOpen, onRetry, inviteHref }) {
  const loading = chart.status === 'loading';
  const failed = chart.status === 'error';
  const reportsTo = (m) => {
    const mgr = m?.reports_to ? byId.get(m.reports_to) : null;
    return mgr ? `Reports to ${memberName(mgr)}` : null;
  };
  const empty = !loading && !failed && (chart.data?.members || []).length === 0;

  return (
    <Section
      id="ooc-structure"
      title="Reporting structure"
      aside={!loading && !failed && note ? <span className="ooc-scope">{note}</span> : null}
    >
      {failed ? (
        <SectionError message="Could not load the council’s members." onRetry={onRetry} />
      ) : loading ? (
        <div className="ooc-tree" aria-busy="true">
          <div className="ooc-tree__lead">
            <Skel w={180} h={36} />
            <Skel w={180} h={36} />
          </div>
          <div className="ooc-tree__teams">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ooc-team">
                <Skel w={96} h={14} />
                <Skel w="80%" h={28} />
                <Skel w="70%" h={12} />
                <Skel w="64%" h={12} />
              </div>
            ))}
          </div>
        </div>
      ) : empty ? (
        <Empty href={inviteHref} action={inviteHref ? 'Invite members' : undefined}>
          No active members yet.
        </Empty>
      ) : (
        <div className="ooc-tree">
          <p className="ooc-tier">Leadership</p>
          {structure.leadership.length > 0 ? (
            <ul className="ooc-tree__lead">
              {structure.leadership.map((m) => (
                <li key={m.id}>
                  <Person
                    member={m}
                    size="lg"
                    onOpen={onOpen}
                    isSelf={m.id === viewerId}
                    sub={reportsTo(m)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="tcc-state">
              <span>No executives on the roster.</span>
            </p>
          )}

          <p className="ooc-tier">Sector teams</p>
          {structure.teams.length === 0 && structure.unassigned.length === 0 ? (
            <p className="tcc-state">
              <span>No sector teams yet.</span>
            </p>
          ) : (
            <ul className="ooc-tree__teams">
              {structure.teams.map((t) => (
                <li key={t.id} className="ooc-team">
                  <h3 className="ooc-team__name">{t.name}</h3>
                  {t.head ? (
                    <Person
                      member={t.head}
                      onOpen={onOpen}
                      isSelf={t.head.id === viewerId}
                      sub={reportsTo(t.head)}
                    />
                  ) : (
                    <p className="ooc-vacant">
                      <span className="ooc-avatar ooc-avatar--vacant" aria-hidden="true">
                        <i className="bi bi-dash" />
                      </span>
                      <span>
                        <span className="ooc-vacant__title">No sector head</span>
                        <span className="ooc-vacant__sub">No portfolio manager on this team</span>
                      </span>
                    </p>
                  )}
                  {t.others.length > 0 ? (
                    <ul className="ooc-team__members">
                      {t.others.map((m) => (
                        <li key={m.id}>
                          <Person member={m} size="sm" onOpen={onOpen} isSelf={m.id === viewerId} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !t.head && <p className="ooc-team__none">No members</p>
                  )}
                </li>
              ))}
              {structure.unassigned.length > 0 && (
                <li className="ooc-team">
                  <h3 className="ooc-team__name">Unassigned</h3>
                  <p className="ooc-team__none">On no sector team</p>
                  <ul className="ooc-team__members">
                    {structure.unassigned.map(({ member, reason }) => (
                      <li key={member.id}>
                        <Person
                          member={member}
                          size="sm"
                          onOpen={onOpen}
                          isSelf={member.id === viewerId}
                          sub={reason}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}

/* ── Sector coverage ─────────────────────────────────────────────────────── */

export function SectorCoverage({ chart, coverage, counts, canManage, onAssign, onOpen, onRetry }) {
  const loading = chart.status === 'loading';
  const failed = chart.status === 'error';
  return (
    <Section
      id="ooc-coverage"
      title="Sector coverage"
      aside={
        !loading && !failed ? (
          <span className="tcc-meta">
            <span className="tcc-mono">{counts.sectorsCovered}</span> of{' '}
            <span className="tcc-mono">{counts.sectorCount}</span> covered
          </span>
        ) : null
      }
    >
      {failed ? (
        <SectionError message="Could not load sector coverage." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows n={11} />
      ) : (
        <ul className="tcc-rows ooc-cover" aria-busy={undefined}>
          {coverage.map((row) => (
            <li key={row.sector} className="ooc-cover__row">
              <span className="ooc-cover__sector">{row.sector}</span>
              <span className="ooc-cover__who">
                {row.covering.length === 0
                  ? na
                  : row.covering.map((m, i) => (
                      <span key={m.id}>
                        {i > 0 && ', '}
                        <button
                          type="button"
                          className="tcc-textbtn ooc-inline"
                          onClick={() => onOpen(m.id)}
                        >
                          {memberName(m)}
                        </button>
                      </span>
                    ))}
              </span>
              {canManage && (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent ooc-inline"
                  onClick={() => onAssign(row.sector)}
                  aria-label={`${row.covering.length ? 'Change' : 'Assign'} coverage for ${row.sector}`}
                >
                  {row.covering.length ? 'Change' : 'Assign'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ── Sector teams ────────────────────────────────────────────────────────── */

export function TeamsTable({
  chart,
  summary,
  table,
  structure,
  onOpen,
  onRetry,
  onRetrySummary,
  settingsHref,
}) {
  const loading = chart.status === 'loading';
  const failed = chart.status === 'error';
  const moneyBusy = summary.status === 'loading';
  const moneyFailed = summary.status === 'error';
  const money = (v) => (moneyBusy ? <Skel w={72} h={12} /> : v == null ? na : fmtMoney(v));
  const pct = (v) => (moneyBusy ? <Skel w={52} h={12} /> : v == null ? na : fmtSignedPct(v));
  const pctTone = (v) => (moneyBusy || v == null ? '' : ` ${toneClass(v)}`);

  return (
    <Section id="ooc-teams" title="Sector teams">
      {failed ? (
        <SectionError message="Could not load sector teams." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows n={5} />
      ) : table.rows.length === 0 && structure.unassigned.length === 0 ? (
        <Empty href={settingsHref} action={settingsHref ? 'Open council settings' : undefined}>
          No sector teams yet. Executives create them in council settings.
        </Empty>
      ) : (
        <>
          {moneyFailed && (
            <SectionError
              message="Could not load team values. Members and sector heads are shown."
              onRetry={onRetrySummary}
            />
          )}
          <div className="ooc-scroll">
            <table className="ooc-table">
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col">Sector head</th>
                  <th scope="col" className="ooc-num">
                    Members
                  </th>
                  <th scope="col" className="ooc-num">
                    Team value
                  </th>
                  <th scope="col" className="ooc-num">
                    Team return
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((t) => (
                  <tr key={t.id}>
                    <td role="rowheader">{t.name}</td>
                    <td>
                      {t.head ? (
                        <button
                          type="button"
                          className="tcc-textbtn ooc-inline"
                          onClick={() => onOpen(t.head.id)}
                        >
                          {memberName(t.head)}
                        </button>
                      ) : (
                        <span className="ooc-warnline">
                          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                          No sector head
                        </span>
                      )}
                      {t.headDiffers && t.topRanked && (
                        <span className="ooc-cellnote">
                          Highest rank on the team: {memberName(t.topRanked)},{' '}
                          {rankLabel(t.topRanked)}
                        </span>
                      )}
                    </td>
                    <td className="ooc-num tcc-mono">{t.count}</td>
                    <td className="ooc-num tcc-mono">{money(t.value)}</td>
                    <td className={`ooc-num tcc-mono${pctTone(t.roiPct)}`}>{pct(t.roiPct)}</td>
                  </tr>
                ))}
                {structure.unassigned.length > 0 && (
                  <tr>
                    <td role="rowheader">Unassigned</td>
                    <td>{na}</td>
                    <td className="ooc-num tcc-mono">{structure.unassigned.length}</td>
                    <td className="ooc-num">{na}</td>
                    <td className="ooc-num">{na}</td>
                  </tr>
                )}
                <tr>
                  <td role="rowheader">Leadership</td>
                  <td>{na}</td>
                  <td className="ooc-num tcc-mono">{structure.leadership.length}</td>
                  <td className="ooc-num">{na}</td>
                  <td className="ooc-num">{na}</td>
                </tr>
                <tr className="ooc-total">
                  <td role="rowheader">Total</td>
                  <td />
                  <td className="ooc-num tcc-mono">{table.total.members}</td>
                  <td className="ooc-num tcc-mono">{money(table.total.value)}</td>
                  <td className={`ooc-num tcc-mono${pctTone(table.total.roiPct)}`}>
                    {pct(table.total.roiPct)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="ooc-foot">
            Team value and return on cost come from the fund book, at the last close on file. The
            total covers holdings assigned to a sector team.
          </p>
        </>
      )}
    </Section>
  );
}

/* ── Flag routing ────────────────────────────────────────────────────────── */

export function FlagRouting({ chart, rows, onOpen, onRetry }) {
  const loading = chart.status === 'loading';
  const failed = chart.status === 'error';
  const who = (m) => (
    <button type="button" className="tcc-textbtn ooc-inline" onClick={() => onOpen(m.id)}>
      {memberName(m)}
    </button>
  );
  const exec = rows[0]?.fallbackExecutive || null;
  return (
    <Section id="ooc-routing" title="Flag routing">
      {failed ? (
        <SectionError message="Could not load flag routing." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows n={5} />
      ) : (
        <>
          <p className="ooc-lede">
            A flag on a holding goes to its covering analyst: the analyst on the latest pitch for
            the ticker, else the analyst covering its sector, else the first analyst on its team.
            The team’s portfolio manager is the sector head. With neither, it goes to{' '}
            {exec ? <>{who(exec)} (first executive)</> : 'an executive, and there is none'}. The
            person flagging never chooses.
          </p>
          <ul className="tcc-rows">
            {rows.map((r) => (
              <li key={r.teamId || 'none'} className="ooc-route">
                <span className="ooc-route__team">{r.name}</span>
                <span className="ooc-route__line">
                  {r.sectorHead ? (
                    <>Sector head {who(r.sectorHead)}. </>
                  ) : r.unassigned ? (
                    <>No sector head. </>
                  ) : (
                    <span className="ooc-warnline">
                      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                      No portfolio manager to route to.{' '}
                    </span>
                  )}
                  {r.teamAnalyst ? (
                    <>With no pitch or sector coverage, the analyst is {who(r.teamAnalyst)}.</>
                  ) : r.unassigned ? (
                    <>Without a pitch or sector coverage, </>
                  ) : (
                    <>No analyst on the team. Without a pitch or sector coverage, </>
                  )}
                  {!r.teamAnalyst &&
                    !r.sectorHead &&
                    (r.fallbackExecutive ? (
                      <>the flag goes to {who(r.fallbackExecutive)}.</>
                    ) : (
                      <span className="ooc-warnline">no one can receive the flag.</span>
                    ))}
                  {!r.teamAnalyst && r.sectorHead && <>the flag goes to the sector head.</>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

/* ── Roster ──────────────────────────────────────────────────────────────── */

export function Roster({
  chart,
  rows,
  total,
  filter,
  setFilter,
  viewerId,
  onOpen,
  onRank,
  onRetry,
  inviteHref,
}) {
  const loading = chart.status === 'loading';
  const failed = chart.status === 'error';
  return (
    <Section
      id="ooc-roster"
      title="Roster"
      aside={
        !loading && !failed ? (
          <span className="tcc-meta" aria-live="polite">
            <span className="tcc-mono">{rows.length}</span> of{' '}
            <span className="tcc-mono">{total}</span> members
          </span>
        ) : null
      }
    >
      {!failed && (
        <div className="tcc-toggles ooc-filters" role="group" aria-label="Roster filter">
          {ROSTER_FILTERS.map((f) => (
            <TextToggle
              key={f.value}
              pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </TextToggle>
          ))}
        </div>
      )}
      {failed ? (
        <SectionError message="Could not load the roster." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows n={8} />
      ) : total === 0 ? (
        <Empty href={inviteHref} action={inviteHref ? 'Invite members' : undefined}>
          No active members yet.
        </Empty>
      ) : rows.length === 0 ? (
        <Empty action="Show all members" onAction={() => setFilter('all')}>
          No members match this filter.
        </Empty>
      ) : (
        <div className="ooc-scroll">
          <table className="ooc-table ooc-table--roster">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Rank</th>
                <th scope="col">Title</th>
                <th scope="col">Team</th>
                <th scope="col">Reports to</th>
                <th scope="col">Coverage</th>
                <th scope="col">Term end</th>
                <th scope="col">Graduating</th>
                <th scope="col" title="Investment committee: votes on pitches">
                  IC
                </th>
                <th scope="col" className="ooc-num">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ member: m, placement, manager, sectors, committee }) => {
                const self = m.id === viewerId;
                const title = customTitle(m);
                return (
                  <tr key={m.id} className={self ? 'ooc-self' : undefined}>
                    <td role="rowheader">
                      <button
                        type="button"
                        className="tcc-textbtn ooc-inline ooc-rowname"
                        onClick={() => onOpen(m.id)}
                      >
                        {memberName(m)}
                      </button>
                      {self && <span className="ooc-tag">You</span>}
                    </td>
                    <td title={ROLE_GROUP_LABEL[m.role] ? `${ROLE_GROUP_LABEL[m.role]} group` : ''}>
                      {rankLabel(m)}
                    </td>
                    <td>{title || na}</td>
                    <td>{placement.label}</td>
                    <td>{manager ? memberName(manager) : na}</td>
                    <td className="ooc-wrap">{sectors.length ? sectors.join(', ') : na}</td>
                    <td className="tcc-mono">{fmtDay(m.term_end) || na}</td>
                    <td>
                      {m.is_graduating ? (
                        <span className="ooc-warnline">
                          <i className="bi bi-mortarboard" aria-hidden="true" />
                          Yes
                        </span>
                      ) : (
                        'No'
                      )}
                    </td>
                    <td>{committee ? 'Yes' : 'No'}</td>
                    <td className="ooc-num">
                      <span className="ooc-actions">
                        {m.editable && (
                          <button
                            type="button"
                            className="tcc-textbtn ooc-inline"
                            onClick={() => onRank(m.id)}
                            aria-label={`Change rank for ${memberName(m)}`}
                          >
                            Change rank
                          </button>
                        )}
                        <button
                          type="button"
                          className="tcc-textbtn tcc-textbtn--accent ooc-inline"
                          onClick={() => onOpen(m.id)}
                          aria-label={`View ${memberName(m)}`}
                        >
                          View
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/* ── Succession ──────────────────────────────────────────────────────────── */

export function Succession({ chart, rows, canManage, onOpen, onRetry }) {
  const loading = chart.status === 'loading';
  const failed = chart.status === 'error';
  return (
    <Section
      id="ooc-succession"
      title="Succession"
      aside={
        !loading && !failed && rows.length > 0 ? (
          <span className="tcc-meta">
            <span className="tcc-mono">{rows.filter((r) => r.graduating).length}</span> graduating
          </span>
        ) : null
      }
    >
      {failed ? (
        <SectionError message="Could not load term dates." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows n={3} />
      ) : rows.length === 0 ? (
        <p className="tcc-state">
          <span>
            No term end dates or graduating members on file.
            {canManage ? ' Open a member to set them.' : ''}
          </span>
        </p>
      ) : (
        <ul className="tcc-rows">
          {rows.map((r) => (
            <li key={r.member.id} className="ooc-succ">
              <span className="ooc-succ__who">
                <button
                  type="button"
                  className="tcc-textbtn ooc-inline ooc-rowname"
                  onClick={() => onOpen(r.member.id)}
                >
                  {memberName(r.member)}
                </button>
                <span className="ooc-succ__sub">
                  {rankLabel(r.member)}
                  {r.sectors.length ? `. Covers ${r.sectors.join(', ')}` : ''}
                </span>
              </span>
              <span className="ooc-succ__when">
                <span>
                  Term end <span className="tcc-mono">{fmtDay(r.termEnd) || NA}</span>
                </span>
                {r.graduating && (
                  <span className="ooc-warnline">
                    <i className="bi bi-mortarboard" aria-hidden="true" />
                    Graduating
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/* ── Recent changes ──────────────────────────────────────────────────────── */

export function RecentChanges({ chart, rows, logFailed, onRetry }) {
  const loading = chart.status === 'loading';
  const failed = chart.status === 'error' || logFailed;
  const name = (m) => (m ? memberName(m) : 'Former member');
  return (
    <Section
      id="ooc-changes"
      title="Recent rank changes"
      aside={
        !loading && !failed && rows.length > 0 ? (
          <span className="tcc-meta">
            Latest <span className="tcc-mono">{rows.length}</span>
          </span>
        ) : null
      }
    >
      {failed ? (
        <SectionError message="Could not load the rank change log." onRetry={onRetry} />
      ) : loading ? (
        <SkelRows n={4} />
      ) : rows.length === 0 ? (
        <p className="tcc-state">
          <span>No rank changes logged yet.</span>
        </p>
      ) : (
        <div className="ooc-scroll">
          <table className="ooc-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">From</th>
                <th scope="col">To</th>
                <th scope="col">Changed by</th>
                <th scope="col" className="ooc-num">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td role="rowheader">{name(c.target)}</td>
                  <td className="ooc-wrap">{c.from || na}</td>
                  <td className="ooc-wrap">{c.to || na}</td>
                  <td>{name(c.by)}</td>
                  <td className="ooc-num tcc-mono" title={fmtDateTime(c.at) || undefined}>
                    {fmtDay(c.at) || NA}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

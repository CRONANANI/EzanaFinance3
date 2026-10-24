'use client';

/**
 * Card 4, Committee Profile: the selected committee in depth. Subcommittee
 * chips swap the roster (each subcommittee is its own fetch); the roster
 * draws facing majority/minority columns ordered by rank. The trades strip
 * links to Card 7 filtered to this committee.
 */
import { useState } from 'react';
import { mappingNote, seatSplit } from '@/lib/congress/committees-page-model';
import {
  Card,
  CHAMBER_WORD,
  CodeChip,
  Headshot,
  LeadBadge,
  PartyTag,
  SectorChips,
  SkelRows,
  fmtCount,
  useJson,
} from './ui';

const INITIAL_ROWS = 10;

function RosterColumn({ side, label, members, onMember }) {
  const [expanded, setExpanded] = useState(false);
  const list = members
    .filter((m) => m.side === side)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const shown = expanded ? list : list.slice(0, INITIAL_ROWS);
  return (
    <div className="cmx-roster-col">
      <p className="cmx-roster-head">
        <i
          className={`cmx-dot cmx-dot--${side === 'majority' ? 'maj' : 'min'}`}
          aria-hidden="true"
        />
        <span>{label}</span>
        <span className="cmx-mono cmx-faint">{list.length} seats</span>
      </p>
      <ul className="cmx-roster">
        {shown.map((m) => (
          <li key={m.bioguideId}>
            <button
              type="button"
              className="cmx-roster-row"
              onClick={() => onMember(m.bioguideId)}
              aria-label={`${m.name}${m.title ? `, ${m.title}` : ''}. Open member panel.`}
            >
              <span className="cmx-roster-rank cmx-mono">{m.rank ?? ''}</span>
              <Headshot src={m.headshot} name={m.name} size={26} />
              <span className="cmx-roster-name cmx-ellipsis">{m.name}</span>
              <PartyTag party={m.party} />
              <LeadBadge title={m.title} />
            </button>
          </li>
        ))}
      </ul>
      {list.length > shown.length ? (
        <button type="button" className="cmx-link" onClick={() => setExpanded(true)}>
          All {list.length} members
        </button>
      ) : null}
    </div>
  );
}

export default function ProfileCard({ thomasId, tradesCount, tradesWindow, onMember, onTrades }) {
  const [rosterId, setRosterId] = useState(null); // null = the full committee
  const { status, data, retry } = useJson(thomasId ? `/api/committees/${thomasId}` : null);
  const activeRoster = rosterId && rosterId !== thomasId ? rosterId : null;
  const sub = useJson(activeRoster ? `/api/committees/${activeRoster}` : null);
  const c = data?.committee || data;
  const ready = status === 'ready' && c?.thomasId;
  const rosterSource = activeRoster ? sub.data?.committee || sub.data : c;
  const rosterStatus = activeRoster ? sub.status : status;
  const split = ready ? seatSplit(c.majority, c.minority) : null;

  return (
    <Card
      id="cmx-profile"
      className="cmx-card--profile"
      title={
        ready ? (
          <span className="cmx-profile-name">
            {c.shortName || c.name} <CodeChip code={c.thomasId} selected />
            <span className="cmx-chamber-chip">{CHAMBER_WORD[c.chamber] || c.chamber}</span>
          </span>
        ) : (
          'Committee profile'
        )
      }
      sub={
        ready
          ? `COMMITTEE PROFILE · ${split.total} SEATS · ${c.subcommittees?.length || 0} SUBCOMMITTEES`
          : 'COMMITTEE PROFILE'
      }
      right={
        ready && c.url ? (
          <a className="cmx-link" href={c.url} target="_blank" rel="noopener noreferrer">
            Official site <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          </a>
        ) : null
      }
      status={thomasId ? status : 'ready'}
      onRetry={retry}
      empty={
        !thomasId
          ? 'Select a committee in the atlas, the gavels list or the search to open its profile.'
          : null
      }
      skeleton={<SkelRows n={6} h={44} />}
    >
      {ready ? (
        <div className="cmx-profile">
          <div className="cmx-profile-left">
            {c.jurisdiction ? <p className="cmx-jurisdiction">{c.jurisdiction}</p> : null}
            {c.sectors?.length ? (
              <>
                <p className="cmx-kicker">Overseen sectors</p>
                <SectorChips sectors={c.sectors} />
                <p className="cmx-note-line">{mappingNote()}</p>
              </>
            ) : null}
            {c.subcommittees?.length ? (
              <>
                <p className="cmx-kicker">Subcommittees</p>
                <div className="cmx-subchips" role="radiogroup" aria-label="Roster to show">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!activeRoster}
                    className={`cmx-subchip${!activeRoster ? ' is-on' : ''}`}
                    onClick={() => setRosterId(null)}
                  >
                    Full committee
                  </button>
                  {c.subcommittees.map((s) => (
                    <button
                      key={s.thomasId}
                      type="button"
                      role="radio"
                      aria-checked={activeRoster === s.thomasId}
                      className={`cmx-subchip${activeRoster === s.thomasId ? ' is-on' : ''}`}
                      onClick={() => setRosterId(s.thomasId)}
                    >
                      <span className="cmx-ellipsis">{s.shortName || s.name}</span>
                      <span className="cmx-mono cmx-faint">{s.seats}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {tradesCount != null ? (
              <button type="button" className="cmx-tile cmx-trades-strip" onClick={onTrades}>
                <span className="cmx-kpi cmx-mono">{fmtCount(tradesCount)}</span>
                <span>
                  trades by this committee&apos;s members in its sectors
                  {tradesWindow ? ` in the last ${tradesWindow} months` : ''}
                </span>
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="cmx-profile-right">
            {activeRoster && rosterStatus === 'loading' ? (
              <SkelRows n={8} h={42} />
            ) : rosterSource?.members?.length ? (
              <div className="cmx-roster-cols">
                <RosterColumn
                  side="majority"
                  label="Majority"
                  members={rosterSource.members}
                  onMember={onMember}
                />
                <RosterColumn
                  side="minority"
                  label="Minority"
                  members={rosterSource.members}
                  onMember={onMember}
                />
              </div>
            ) : (
              <p className="cmx-state">No members listed for this roster.</p>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

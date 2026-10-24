'use client';

/**
 * Card 3, Gavels: who holds power. Chairs or ranking members by committee;
 * a person opens the member panel, the code chip opens the Committee Profile.
 */
import { useState } from 'react';
import { Card, CodeChip, Headshot, PartyTag, Segmented, SkelRows } from './ui';

const MODES = [
  { value: 'chair', label: 'Chairs' },
  { value: 'ranking', label: 'Ranking members' },
];
const INITIAL_ROWS = 9;

export default function GavelsCard({
  committees,
  status,
  retry,
  sub,
  empty,
  party,
  onMember,
  onCommittee,
}) {
  const [mode, setMode] = useState('chair');
  const [expanded, setExpanded] = useState(false);
  const rows = committees
    .map((c) => ({ c, who: mode === 'chair' ? c.chair : c.ranking }))
    .filter((r) => r.who && (party === 'all' || r.who.party === party));
  const shown = expanded ? rows : rows.slice(0, INITIAL_ROWS);
  return (
    <Card
      id="cmx-gavels"
      className="cmx-card--fill"
      title="Gavels"
      sub={sub}
      right={<Segmented label="Leadership role" value={mode} options={MODES} onChange={setMode} />}
      status={status}
      onRetry={retry}
      empty={status === 'ready' && !rows.length ? empty : null}
      skeleton={<SkelRows n={9} h={52} />}
      footer={
        <>
          <span>Select a person for their seats and trades.</span>
          {rows.length > INITIAL_ROWS && !expanded ? (
            <button type="button" className="cmx-link" onClick={() => setExpanded(true)}>
              All {rows.length} committees
            </button>
          ) : null}
        </>
      }
    >
      <ul className="cmx-gavels">
        {shown.map(({ c, who }) => (
          <li key={c.thomasId} className="cmx-gavel">
            <button
              type="button"
              className="cmx-gavel-person"
              onClick={() => onMember(who.bioguideId)}
              aria-label={`${who.name}, ${mode === 'chair' ? 'chair' : 'ranking member'} of ${c.shortName}. Open member panel.`}
            >
              <Headshot src={who.headshot} name={who.name} size={32} />
              <span className="cmx-gavel-main">
                <span className="cmx-gavel-name">
                  {who.name} <PartyTag party={who.party} />
                </span>
                <span className="cmx-gavel-committee cmx-ellipsis">{c.shortName}</span>
              </span>
            </button>
            <button
              type="button"
              className="cmx-codebtn"
              onClick={() => onCommittee(c.thomasId)}
              aria-label={`Open the ${c.shortName} profile`}
            >
              <CodeChip code={c.thomasId} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

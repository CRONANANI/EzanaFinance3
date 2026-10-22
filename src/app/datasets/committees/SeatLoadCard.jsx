'use client';

/**
 * Card 6, Seat Load: the distribution of seats held per member (committee
 * plus subcommittee seats), with the most-seated members beside it.
 */
import { useMemo } from 'react';
import { mostSeated, seatHistogram } from '@/lib/congress/committees-page-model';
import { Card, Headshot, PartyTag, SeatLabel, Skel, SkelRows, fmtCount } from './ui';

const BAR_MAX = 118;

export default function SeatLoadCard({ members, status, retry, sub, empty, onMember }) {
  const buckets = useMemo(() => seatHistogram(members), [members]);
  const top = useMemo(() => mostSeated(members, 5), [members]);
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const topMax = Math.max(1, top[0]?.seatCount || 1);
  return (
    <Card
      id="cmx-seatload"
      className="cmx-card--fill"
      title="Seat load"
      sub={sub}
      status={status}
      onRetry={retry}
      empty={status === 'ready' && !members.length ? empty : null}
      skeleton={
        <>
          <Skel h={140} />
          <SkelRows n={5} h={38} />
        </>
      }
    >
      <div className="cmx-hist" role="img" aria-label="Distribution of seats held per member">
        {buckets.map((b) => (
          <div key={b.label} className="cmx-hist-col">
            <span className="cmx-mono cmx-hist-n">{b.count || ''}</span>
            <span
              className="cmx-hist-bar"
              style={{
                height: `${Math.max(b.count ? 3 : 1, Math.round((b.count / max) * BAR_MAX))}px`,
              }}
            />
            <span className="cmx-mono cmx-hist-x">{b.label}</span>
          </div>
        ))}
      </div>
      <p className="cmx-caption">How many committee and subcommittee seats each member holds.</p>
      <p className="cmx-kicker">Most seats held</p>
      <ul className="cmx-seated">
        {top.map((m) => (
          <li key={m.bioguideId}>
            <button
              type="button"
              className="cmx-seated-row"
              onClick={() => onMember(m.bioguideId)}
              aria-label={`${m.name}, ${m.seatCount} seats. Open member lookup.`}
            >
              <Headshot name={m.name} size={26} />
              <span className="cmx-ellipsis">{m.name}</span>
              <PartyTag party={m.party} />
              <SeatLabel member={m} />
              <span className="cmx-seated-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((m.seatCount / topMax) * 100)}%` }} />
              </span>
              <span className="cmx-mono cmx-seated-n">{fmtCount(m.seatCount)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

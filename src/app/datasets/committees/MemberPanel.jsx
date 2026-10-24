'use client';

/**
 * The member panel: a member's seats as chips with rank and title, and their
 * 24-month trades in overseen sectors as a dot timeline (colour by side,
 * size by disclosure range). Links out to Politician Tracker.
 *
 * This was the "Member lookup" card at the bottom of the page. The search
 * in the control bar already finds members, so the card's own search box is
 * gone and its result opens here, as a dialog, from the control-bar search,
 * a gavel, a seat-load row, a trade row or the ticker belt (?member= deep
 * links still work).
 */
import Link from 'next/link';
import { useMemo } from 'react';
import {
  TRADE_FOOTNOTE,
  rangeDotSize,
  timelineLayout,
  tradeSide,
} from '@/lib/congress/committees-page-model';
import {
  CodeChip,
  Headshot,
  LeadBadge,
  Overlay,
  PartyTag,
  SeatLabel,
  SkelRows,
  fmtCount,
  fmtDate,
  fmtRange,
  useJson,
} from './ui';

const MONTHS = 24;

function DotTimeline({ trades, counts }) {
  const to = useMemo(() => Date.now(), []);
  const from = useMemo(() => {
    const d = new Date(to);
    d.setUTCMonth(d.getUTCMonth() - MONTHS);
    return d.getTime();
  }, [to]);
  const laid = useMemo(() => timelineLayout(trades, from, to), [trades, from, to]);
  return (
    <div className="cmx-timeline-block">
      <p className="cmx-timeline-meta cmx-mono">
        {fmtCount(counts?.overseen)} trades · {fmtCount(counts?.unmapped)} unmapped
      </p>
      <div
        className="cmx-timeline"
        role="img"
        aria-label={`${laid.length} trades over the last 24 months`}
      >
        <span className="cmx-timeline-base" aria-hidden="true" />
        {laid.map((t, i) => {
          const size = rangeDotSize(t.amount_min);
          const side = tradeSide(t.type);
          return (
            <span
              key={`${t.transaction_date}-${t.ticker}-${i}`}
              className={`cmx-timeline-dot cmx-timeline-dot--${side}`}
              style={{ left: `${t.x * 100}%`, width: size, height: size }}
              title={`${fmtDate(t.transaction_date)} · ${t.ticker} · ${fmtRange(t.amount_min, t.amount_max)}`}
            />
          );
        })}
        <span className="cmx-timeline-label cmx-mono" style={{ left: 0 }}>
          {fmtDate(new Date(from).toISOString())}
        </span>
        <span className="cmx-timeline-label cmx-timeline-label--end cmx-mono">
          {fmtDate(new Date(to).toISOString())}
        </span>
      </div>
      <p className="cmx-timeline-legend">
        <span>
          <i className="cmx-dot cmx-dot--buy" aria-hidden="true" /> Buy
        </span>
        <span>
          <i className="cmx-dot cmx-dot--sell" aria-hidden="true" /> Sell
        </span>
        <span className="cmx-faint">Size: disclosure range</span>
      </p>
      <p className="cmx-footnote">{TRADE_FOOTNOTE}</p>
    </div>
  );
}

export default function MemberPanel({ bioguideId, members, onClose }) {
  const { status, data, retry } = useJson(
    bioguideId ? `/api/committees/member/${bioguideId}` : null,
  );
  /* What the page already knows (name, party, state) shows at once; seats
     and trades fill in when the detail lands. */
  const known = members.find((m) => m.bioguideId === bioguideId) || null;
  const member = data?.member || known;
  const seats = useMemo(() => {
    const out = [];
    for (const c of data?.committees || []) {
      if (c.onCommittee) out.push({ ...c, code: c.thomasId });
      for (const s of c.subcommittees || []) out.push({ ...s, code: s.thomasId });
    }
    return out;
  }, [data]);
  if (!bioguideId) return null;
  const name = member?.name || bioguideId;

  return (
    <Overlay
      label={`${name}: seats and overseen trades`}
      onClose={onClose}
      className="cmx-sheet--member"
    >
      <div className="cmx-sheet-head">
        <div>
          <h2 className="cmx-title">{name}</h2>
          <p className="cmx-sub cmx-mono">SEATS AND OVERSEEN TRADES · LAST {MONTHS} MONTHS</p>
        </div>
        <button
          type="button"
          className="cmx-btn cmx-btn--icon"
          aria-label="Close member panel"
          onClick={onClose}
        >
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
      <div className="cmx-lookup">
        <div className="cmx-lookup-left">
          <div className="cmx-lookup-id">
            <Headshot name={member?.name} size={52} />
            <span className="cmx-lookup-who">
              <span className="cmx-lookup-name">
                {name} {member?.party ? <PartyTag party={member.party} /> : null}{' '}
                {member ? <SeatLabel member={member} /> : null}
              </span>
              <span className="cmx-lookup-meta">
                {member?.chamber ? `${member.chamber} · ` : ''}
                {status === 'ready' ? `${fmtCount(seats.length)} seats` : ''}
              </span>
            </span>
            <Link
              className="cmx-link"
              href={`/datasets/politician-tracker?member=${encodeURIComponent(bioguideId)}`}
            >
              Open in Politician Tracker
            </Link>
          </div>
          <p className="cmx-kicker">Seats</p>
          {status === 'loading' ? (
            <SkelRows n={3} h={32} />
          ) : status === 'error' ? (
            <p className="cmx-quiet">
              Could not load this member.{' '}
              <button type="button" className="cmx-link" onClick={retry}>
                Retry
              </button>
            </p>
          ) : (
            <ul className="cmx-seatchips">
              {seats.map((s) => (
                <li key={s.code} className="cmx-seatchip">
                  <CodeChip code={s.code} />
                  <span className="cmx-ellipsis">{s.shortName || s.name}</span>
                  {s.rank ? <span className="cmx-mono cmx-faint">#{s.rank}</span> : null}
                  <LeadBadge title={s.title} />
                </li>
              ))}
              {!seats.length ? (
                <li className="cmx-quiet">No committee assignments on record for this member.</li>
              ) : null}
            </ul>
          )}
        </div>
        <div className="cmx-lookup-right">
          <p className="cmx-kicker">Trades in overseen sectors</p>
          {status === 'loading' ? (
            <SkelRows n={2} h={44} />
          ) : data?.trades?.length ? (
            <DotTimeline trades={data.trades} counts={data.counts} />
          ) : status === 'ready' ? (
            <p className="cmx-quiet">
              No disclosed trades in the sectors this member&apos;s committees oversee in the last{' '}
              {MONTHS} months.
            </p>
          ) : null}
        </div>
      </div>
    </Overlay>
  );
}

'use client';

/**
 * Card 2, Committee Atlas: chamber-grouped tiles sized by seat count. A
 * tile click loads the Committee Profile. Unmapped committees are calmer;
 * the sector note renders in the footer.
 */
import { useState } from 'react';
import { atlasSizeClass, mappingNote, seatSplit } from '@/lib/congress/committees-page-model';
import { Card, CHAMBER_WORD, CodeChip, SectorChips, SkelRows, SplitBar, fmtCount } from './ui';

const INITIAL_TILES = 8;

function Tile({ c, selected, onSelect }) {
  const split = seatSplit(c.majority, c.minority);
  const size = atlasSizeClass(c.seats);
  return (
    <button
      type="button"
      className={`cmx-atile cmx-atile--${size}${selected ? ' is-on' : ''}${c.sectors.length ? '' : ' is-unmapped'}`}
      aria-pressed={selected}
      onClick={() => onSelect(c.thomasId)}
      aria-label={`${c.shortName}: ${c.seats} seats, ${c.subcommittees.length} subcommittees. Open the committee profile.`}
    >
      <span className="cmx-atile-top">
        <span className="cmx-ellipsis" title={c.shortName}>
          {c.shortName}
        </span>
        <CodeChip code={c.thomasId} selected={selected} />
      </span>
      <SplitBar split={split} />
      <span className="cmx-atile-meta">
        <span className="cmx-mono">
          {c.seats} seats · {c.subcommittees.length} sub
        </span>
        <SectorChips sectors={c.sectors} max={2} />
      </span>
    </button>
  );
}

function ChamberGroup({ chamber, list, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? list : list.slice(0, INITIAL_TILES);
  const hidden = list.length - shown.length;
  const subs = list.reduce((s, c) => s + c.subcommittees.length, 0);
  return (
    <div className="cmx-agroup">
      <p className="cmx-agroup-head">
        <span className="cmx-kicker">{CHAMBER_WORD[chamber] || chamber}</span>
        <span className="cmx-mono cmx-faint">
          {list.length} committees · {subs} subcommittees
        </span>
      </p>
      <div className="cmx-agrid">
        {shown.map((c) => (
          <Tile key={c.thomasId} c={c} selected={selected === c.thomasId} onSelect={onSelect} />
        ))}
        {hidden > 0 ? (
          <button
            type="button"
            className="cmx-atile cmx-atile--more"
            onClick={() => setExpanded(true)}
          >
            +{hidden} more
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function AtlasCard({ committees, status, retry, sub, empty, selected, onSelect }) {
  const groups = ['house', 'senate', 'joint']
    .map((ch) => ({ chamber: ch, list: committees.filter((c) => c.chamber === ch) }))
    .filter((g) => g.list.length);
  return (
    <Card
      id="cmx-atlas"
      className="cmx-card--fill"
      title="Committee atlas"
      sub={sub}
      status={status}
      onRetry={retry}
      empty={status === 'ready' && !groups.length ? empty : null}
      skeleton={<SkelRows n={6} h={64} />}
      footer={
        <div className="cmx-notes">
          <p>Select a committee to open its profile below.</p>
          <p>{mappingNote()}</p>
        </div>
      }
    >
      <div className="cmx-atlas">
        {groups.map((g) => (
          <ChamberGroup
            key={g.chamber}
            chamber={g.chamber}
            list={g.list}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
      </div>
    </Card>
  );
}

'use client';

/**
 * Card 5, Oversight Map: committees on the left, sectors on the right,
 * cubic links between them. Hover or focus on either side highlights its
 * links; a sector click sets the page filter, a committee click opens the
 * profile. A visually hidden table lists every pair for screen readers.
 * Phone: the two columns stack as chip lists and links are not drawn.
 */
import { useMemo, useState } from 'react';
import { mappingNote, oversightLinks } from '@/lib/congress/committees-page-model';
import { Card, SkelRows } from './ui';

const ROW_H = 27;

export default function OversightCard({
  committees,
  status,
  retry,
  sub,
  empty,
  onSector,
  onCommittee,
}) {
  const graph = useMemo(() => oversightLinks(committees), [committees]);
  const [hot, setHot] = useState(null); // { kind: 'committee'|'sector', id }

  const comIndex = new Map(graph.committees.map((c, i) => [c.thomasId, i]));
  const secIndex = new Map(graph.sectors.map((s, i) => [s.key, i]));
  const height = Math.max(graph.committees.length, graph.sectors.length) * ROW_H;

  const linkHot = (l) =>
    hot &&
    ((hot.kind === 'committee' && l.committee === hot.id) ||
      (hot.kind === 'sector' && l.sector === hot.id));
  const rowHot = (kind, id) => {
    if (!hot) return false;
    if (hot.kind === kind) return hot.id === id;
    return graph.links.some(
      (l) => linkHot(l) && (kind === 'committee' ? l.committee === id : l.sector === id),
    );
  };

  return (
    <Card
      id="cmx-oversight"
      className="cmx-card--fill"
      title="Oversight map"
      sub={sub}
      status={status}
      onRetry={retry}
      empty={status === 'ready' && !graph.committees.length ? empty : null}
      skeleton={<SkelRows n={8} h={27} />}
      footer={
        <div className="cmx-notes">
          <p>{mappingNote()}</p>
          <p>Subcommittees inherit their parent committee&apos;s sectors.</p>
        </div>
      }
    >
      <div className="cmx-map" style={{ '--cmx-map-h': `${height}px` }}>
        <ul className="cmx-map-col cmx-map-col--left" aria-hidden="true">
          {graph.committees.map((c) => (
            <li key={c.thomasId}>
              <button
                type="button"
                tabIndex={-1}
                className={`cmx-map-row${rowHot('committee', c.thomasId) ? ' is-hot' : ''}`}
                onMouseEnter={() => setHot({ kind: 'committee', id: c.thomasId })}
                onMouseLeave={() => setHot(null)}
                onClick={() => onCommittee(c.thomasId)}
              >
                <span className="cmx-mono cmx-map-meta">{c.thomasId}</span>
                <span className="cmx-ellipsis">{c.shortName}</span>
              </button>
            </li>
          ))}
        </ul>
        <svg
          className="cmx-map-links"
          aria-hidden="true"
          preserveAspectRatio="none"
          viewBox={`0 0 100 ${height}`}
        >
          {graph.links.map((l) => {
            const y1 = (comIndex.get(l.committee) ?? 0) * ROW_H + ROW_H / 2;
            const y2 = (secIndex.get(l.sector) ?? 0) * ROW_H + ROW_H / 2;
            return (
              <path
                key={`${l.committee}-${l.sector}`}
                className={`cmx-map-link${linkHot(l) ? ' is-hot' : ''}`}
                d={`M 0 ${y1} C 50 ${y1}, 50 ${y2}, 100 ${y2}`}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <ul className="cmx-map-col cmx-map-col--right" aria-hidden="true">
          {graph.sectors.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                tabIndex={-1}
                className={`cmx-map-row${rowHot('sector', s.key) ? ' is-hot' : ''}`}
                onMouseEnter={() => setHot({ kind: 'sector', id: s.key })}
                onMouseLeave={() => setHot(null)}
                onClick={() => onSector(s.key)}
              >
                <span className="cmx-ellipsis">{s.label}</span>
                <span className="cmx-mono cmx-map-meta">{s.committees} com.</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* keyboard and screen-reader access: every pair as a table */}
      <table className="cmx-sr-table">
        <caption>Committees and the sectors they oversee</caption>
        <thead>
          <tr>
            <th scope="col">Committee</th>
            <th scope="col">Sector</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {graph.links.map((l) => {
            const c = graph.committees.find((x) => x.thomasId === l.committee);
            const s = graph.sectors.find((x) => x.key === l.sector);
            return (
              <tr key={`sr-${l.committee}-${l.sector}`}>
                <td>{c?.shortName}</td>
                <td>{s?.label}</td>
                <td>
                  <button
                    type="button"
                    onFocus={() => setHot({ kind: 'committee', id: l.committee })}
                    onBlur={() => setHot(null)}
                    onClick={() => onCommittee(l.committee)}
                  >
                    Open the {c?.shortName} profile
                  </button>
                  <button type="button" onClick={() => onSector(l.sector)}>
                    Filter the page to {s?.label}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

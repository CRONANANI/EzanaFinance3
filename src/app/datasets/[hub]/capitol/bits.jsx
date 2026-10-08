/**
 * Small pieces several Capitol Watch modules share: the linked-dataset
 * chips, the strength dots, party and trader-type tags.
 */
import { signalStrength } from '@/lib/datasets/capitol-hub/signals';
import { partyClass } from './cwh-format';

export function Strength({ datasets }) {
  const s = signalStrength(datasets);
  return (
    <span className="cwh-strength" aria-label={s.label.toLowerCase()}>
      <span className="cwh-dots" aria-hidden="true">
        {s.dots.map((on, i) => (
          <i key={i} className={on ? 'is-on' : undefined} />
        ))}
      </span>
      <span className="cwh-strength-txt">{s.label}</span>
    </span>
  );
}

export function LinkedChips({ datasets }) {
  return (
    <span className="cwh-chips">
      {datasets.map((d, i) => (
        <span key={d} className="cwh-chip-wrap">
          {i ? <i className="bi bi-link-45deg cwh-chip-link" aria-hidden="true" /> : null}
          <span className="cwh-chip">{d.toUpperCase()}</span>
        </span>
      ))}
    </span>
  );
}

export function PartyTag({ party }) {
  if (!party) return null;
  return <span className={`cwh-party ${partyClass(party)}`}>{party}</span>;
}

export function TypeTag({ type }) {
  if (!type) return null;
  return (
    <span className={`cwh-type${/^pol/i.test(type) ? ' is-pol' : ''}`}>
      {String(type).toUpperCase()}
    </span>
  );
}

export function SourceFoot({ note, window: win, sources }) {
  return (
    <div className="cwh-foot">
      {note ? <p className="cwh-foot-note">{note}</p> : null}
      <p className="cwh-foot-meta">
        {win ? (
          <span>
            <i className="bi bi-clock" aria-hidden="true" /> {win}
          </span>
        ) : null}
        {sources ? (
          <span>
            <i className="bi bi-file-earmark-text" aria-hidden="true" /> Sources: {sources}
          </span>
        ) : null}
      </p>
    </div>
  );
}

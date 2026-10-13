'use client';

/**
 * Trades by state: a US map of congressional stock trades, one dot per state
 * sized by trade count on a ground tinted by disclosed volume, with a window
 * switch (1 year, 3 years, all time). Selecting a state (click, keyboard, or
 * the jump list) shows that state's traders; a trader opens the member
 * drawer. With nothing selected the panel ranks the busiest states.
 *
 * Shared by the Capitol Watch hub and the politician tracker's rail
 * (`compact`): the host passes `onMember(member)` to open its own member
 * panel. Self-contained styling (state-map.css), so it needs no hub CSS.
 *
 * Every mark encodes something true: dot area is trades, state tint is
 * volume (disclosed midpoints), the party bar is the share of trades by
 * party. Nothing is estimated beyond the midpoint of each disclosed range.
 */
import { useId, useMemo, useState } from 'react';
import {
  US_MAP_H,
  US_MAP_W,
  US_NATION_PATH,
  US_STATES,
} from '@/lib/datasets/capitol-hub/us-states';
import { STATE_WINDOWS } from '@/lib/datasets/capitol-hub/state-windows';
import { count, longDate, money, partyClass } from '@/app/datasets/[hub]/capitol/cwh-format';
import './state-map.css';

const R_MIN = 3;
const R_MAX = 22;

function StateGlyph({ id }) {
  const s = US_STATES[id];
  if (!s) return null;
  const [x, y, w, h] = s.box;
  const pad = Math.max(w, h) * 0.08;
  return (
    <svg
      className="cwh-sm-glyph"
      viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={s.d} />
    </svg>
  );
}

function PartyBar({ d, r, i }) {
  const total = d + r + i || 1;
  const pd = Math.round((d / total) * 100);
  const pr = Math.round((r / total) * 100);
  return (
    <div className="cwh-sm-party" aria-label={`${pd}% Democratic trades, ${pr}% Republican trades`}>
      <span className="is-dem" style={{ width: `${pd}%` }} />
      <span className="is-ind" style={{ width: `${100 - pd - pr}%` }} />
      <span className="is-rep" style={{ width: `${pr}%` }} />
    </div>
  );
}

function PartyTag({ party }) {
  if (!party) return null;
  return <span className={`cwh-party ${partyClass(party)}`}>{party}</span>;
}

function SourceFoot({ note, window: win, sources }) {
  return (
    <div className="cwh-foot">
      {note ? <p className="cwh-foot-note">{note}</p> : null}
      <p className="cwh-foot-meta">
        <span>
          <i className="bi bi-clock" aria-hidden="true" /> {win}
        </span>
        <span>
          <i className="bi bi-file-earmark-text" aria-hidden="true" /> Sources: {sources}
        </span>
      </p>
    </div>
  );
}

export default function StateMap({ data, onMember, compact = false, topStates = 8 }) {
  const [win, setWin] = useState('3y');
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState(null);
  const headingId = useId();
  const selectId = useId();

  const view = useMemo(
    () => data?.windows?.[win] || { states: [], members: [], totals: null },
    [data, win],
  );
  const byState = useMemo(() => new Map(view.states.map((s) => [s.id, s])), [view]);
  const maxTrades = view.states[0]?.trades || 1;
  const maxVolume = Math.max(1, ...view.states.map((s) => s.volume));
  const current = selected ? byState.get(selected) || null : null;
  const traders = useMemo(
    () => (selected ? view.members.filter((m) => m.state === selected) : []),
    [view, selected],
  );
  const rank = useMemo(() => Object.fromEntries(view.states.map((s, i) => [s.id, i + 1])), [view]);

  const radius = (t) => R_MIN + Math.sqrt(t / maxTrades) * (R_MAX - R_MIN);
  const tint = (v) => Math.round(8 + Math.sqrt(v / maxVolume) * 52);
  const windowLabel = STATE_WINDOWS.find((w) => w.key === win)?.label || '';
  const toggle = (id) => setSelected((cur) => (cur === id ? null : id));
  const onKey = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(id);
    }
  };

  if (data?.error) {
    return (
      <section
        className={`cwh-card cwh-sm${compact ? ' cwh-sm--compact' : ''}`}
        aria-labelledby={headingId}
      >
        <h2 className="cwh-h4" id={headingId}>
          Trades by state
        </h2>
        <p className="cwh-empty">Trades by state could not load. Try again shortly.</p>
      </section>
    );
  }
  if (data?.empty) {
    return (
      <section
        className={`cwh-card cwh-sm${compact ? ' cwh-sm--compact' : ''}`}
        aria-labelledby={headingId}
      >
        <h2 className="cwh-h4" id={headingId}>
          Trades by state
        </h2>
        <p className="cwh-empty">Appears once disclosed trades carry a home state.</p>
      </section>
    );
  }

  return (
    <section
      className={`cwh-card cwh-sm${compact ? ' cwh-sm--compact' : ''}`}
      aria-labelledby={headingId}
    >
      <div className="cwh-mod-head">
        <div>
          <h2 className="cwh-h4" id={headingId}>
            Trades by state
          </h2>
          <p className="cwh-caption">
            Where disclosed congressional trades come from. Dot size is the number of trades; the
            state tint is disclosed volume. Select a state to see who is trading.
          </p>
        </div>
        <div className="cwh-pills cwh-pills--sm" role="group" aria-label="Window">
          {STATE_WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              className={`cwh-pill${win === w.key ? ' is-active' : ''}`}
              aria-pressed={win === w.key}
              onClick={() => setWin(w.key)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {view.totals ? (
        <dl className="cwh-sm-totals">
          <div>
            <dt>Trades</dt>
            <dd>{count(view.totals.trades)}</dd>
          </div>
          <div>
            <dt>Politicians</dt>
            <dd>{count(view.totals.members)}</dd>
          </div>
          <div>
            <dt>States</dt>
            <dd>{count(view.totals.states)}</dd>
          </div>
          <div>
            <dt>Volume</dt>
            <dd>{money(view.totals.volume)}</dd>
          </div>
        </dl>
      ) : null}

      <div className="cwh-sm-body">
        <div className="cwh-sm-mapwrap">
          <svg
            className="cwh-sm-map"
            viewBox={`0 0 ${US_MAP_W} ${US_MAP_H}`}
            role="group"
            aria-label={`United States map of congressional trades, ${windowLabel.toLowerCase()}`}
          >
            <path className="cwh-sm-nation" d={US_NATION_PATH} aria-hidden="true" />
            {Object.entries(US_STATES).map(([id, s]) => {
              const st = byState.get(id);
              const isSel = selected === id;
              const label = st
                ? `${s.name}: ${count(st.trades)} trades by ${count(st.members)} politicians, ${money(st.volume)}`
                : `${s.name}: no disclosed trades in this window`;
              return (
                <path
                  key={id}
                  d={s.d}
                  className={`cwh-sm-state${isSel ? ' is-selected' : ''}${hover === id ? ' is-hover' : ''}${st ? '' : ' is-empty'}`}
                  style={st ? { '--cwh-sm-tint': `${tint(st.volume)}%` } : undefined}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSel}
                  aria-label={label}
                  onClick={() => toggle(id)}
                  onKeyDown={(e) => onKey(e, id)}
                  onMouseEnter={() => setHover(id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(id)}
                  onBlur={() => setHover(null)}
                >
                  <title>{label}</title>
                </path>
              );
            })}
            {view.states.map((st) => {
              const s = US_STATES[st.id];
              if (!s) return null;
              return (
                <circle
                  key={st.id}
                  className={`cwh-sm-dot${selected === st.id ? ' is-selected' : ''}`}
                  cx={s.cx}
                  cy={s.cy}
                  r={radius(st.trades)}
                  aria-hidden="true"
                  onClick={() => toggle(st.id)}
                  onMouseEnter={() => setHover(st.id)}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </svg>
          {hover && US_STATES[hover] ? (
            <p className="cwh-sm-hover" aria-hidden="true">
              <b>{US_STATES[hover].name}</b>
              {byState.get(hover)
                ? ` ${count(byState.get(hover).trades)} trades · ${money(byState.get(hover).volume)}`
                : ' no trades in this window'}
            </p>
          ) : null}
          <label className="cwh-sm-jump" htmlFor={selectId}>
            <span>Jump to</span>
            <select
              id={selectId}
              value={selected || ''}
              onChange={(e) => setSelected(e.target.value || null)}
            >
              <option value="">All states</option>
              {view.states.map((st) => (
                <option key={st.id} value={st.id}>
                  {US_STATES[st.id]?.name || st.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cwh-sm-panel" aria-live="polite">
          {current ? (
            <>
              <div className="cwh-sm-panel-head">
                <StateGlyph id={current.id} />
                <div>
                  <h3 className="cwh-h4">{US_STATES[current.id]?.name || current.id}</h3>
                  <p className="cwh-caption">
                    #{rank[current.id]} of {view.states.length} states, {windowLabel.toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  className="cwh-pill cwh-sm-clear"
                  onClick={() => setSelected(null)}
                >
                  All states
                </button>
              </div>
              <dl className="cwh-sm-stats">
                <div>
                  <dt>Trades</dt>
                  <dd>{count(current.trades)}</dd>
                </div>
                <div>
                  <dt>Politicians</dt>
                  <dd>{count(current.members)}</dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>{money(current.volume)}</dd>
                </div>
              </dl>
              <PartyBar d={current.d} r={current.r} i={current.i} />
              <ol
                className="cwh-sm-list"
                aria-label={`Traders from ${US_STATES[current.id]?.name}`}
              >
                {traders.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="cwh-sm-row" onClick={() => onMember?.(m)}>
                      <span className="cwh-sm-who">
                        <span className="cwh-sm-name">{m.name}</span>
                        <span className="cwh-sm-meta">
                          <PartyTag party={m.party} />
                          {m.chamber ? (
                            <span>{m.chamber === 'senate' ? 'Senate' : 'House'}</span>
                          ) : null}
                          {m.last ? <span>last {longDate(m.last)}</span> : null}
                        </span>
                      </span>
                      <span className="cwh-sm-nums">
                        <b>{count(m.trades)}</b>
                        <small>
                          {count(m.buys)} buy · {count(m.sells)} sell
                        </small>
                      </span>
                      <span className="cwh-sm-vol">{money(m.volume)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <div className="cwh-sm-panel-head">
                <div>
                  <h3 className="cwh-h4">Busiest states</h3>
                  <p className="cwh-caption">By disclosed trades, {windowLabel.toLowerCase()}</p>
                </div>
              </div>
              <ol className="cwh-sm-list cwh-sm-list--states">
                {view.states.slice(0, topStates).map((st, i) => (
                  <li key={st.id}>
                    <button type="button" className="cwh-sm-row" onClick={() => setSelected(st.id)}>
                      <span className="cwh-sm-rank">{i + 1}</span>
                      <StateGlyph id={st.id} />
                      <span className="cwh-sm-who">
                        <span className="cwh-sm-name">{US_STATES[st.id]?.name || st.id}</span>
                        <span className="cwh-sm-meta">
                          <span>{count(st.members)} politicians</span>
                        </span>
                      </span>
                      <span className="cwh-sm-nums">
                        <b>{count(st.trades)}</b>
                        <small>trades</small>
                      </span>
                      <span className="cwh-sm-vol">{money(st.volume)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      <SourceFoot
        note="Volume is the sum of the midpoints of each trade's disclosed range. State is the member's home state at the time of filing."
        window={`Trades dated in the last ${windowLabel.toLowerCase()}`}
        sources="House Clerk and Senate eFD (STOCK Act), congress-legislators"
      />
    </section>
  );
}

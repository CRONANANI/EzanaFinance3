'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  QUANT_MODELS,
  RUBRIC,
  RUBRIC_MAX,
  MIN_COMMUNITY_VOTES,
  buildBoard,
} from '@/lib/quants/model-library';
import { ModelDetail } from './ModelDetail';

const MODES = [
  { id: 'rubric', label: 'Ezana rubric' },
  { id: 'community', label: 'Community' },
];

function ModelTile({ model, active, onSelect }) {
  return (
    <button
      type="button"
      className={`ftqm-tile ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(model.id)}
    >
      <span className="ftqm-tile-name">{model.name}</span>
      <span className="ftqm-tile-family">{model.family}</span>
      {model.live ? (
        <span className="ftqm-live">
          <i className="bi bi-broadcast" aria-hidden /> Live
        </span>
      ) : null}
    </button>
  );
}

export function ModelLibraryCard() {
  const [mode, setMode] = useState('rubric');
  const [selectedId, setSelectedId] = useState(null);
  const [votes, setVotes] = useState({ available: false, summary: {}, mine: {} });
  const [votesLoaded, setVotesLoaded] = useState(false);

  const loadVotes = useCallback(async () => {
    try {
      const res = await fetch('/api/quants/models/votes');
      const json = await res.json();
      if (res.ok)
        setVotes({
          available: !!json.available,
          summary: json.summary || {},
          mine: json.mine || {},
        });
    } catch {
      /* fail open: the rubric board never depends on votes */
    } finally {
      setVotesLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  const castVote = useCallback(
    async (modelId, tier) => {
      setVotes((v) => ({ ...v, mine: { ...v.mine, [modelId]: tier } }));
      try {
        await fetch('/api/quants/models/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelId, tier }),
        });
      } catch {
        /* the refresh below restores the stored vote */
      }
      loadVotes();
    },
    [loadVotes],
  );

  const board = useMemo(() => buildBoard(mode, votes.summary), [mode, votes.summary]);
  const selected = useMemo(() => {
    if (!selectedId) return null;
    const all = [...board.rows.flatMap((r) => r.models), ...board.unranked];
    return all.find((m) => m.id === selectedId) || null;
  }, [board, selectedId]);

  const toggleSelect = (id) => setSelectedId((cur) => (cur === id ? null : id));
  const communityOff = votesLoaded && !votes.available;

  return (
    <section className="db-card ftqm-root" id="ftq-model-library" aria-label="Model library">
      <div className="db-card-header ftqm-head">
        <div>
          <h3 className="ftq-section-title">
            <i className="bi bi-diagram-3" aria-hidden />
            Model Library
          </h3>
          <p className="ftqm-sub">
            {QUANT_MODELS.length} models every quant should know, ranked. Select one for the math,
            where it breaks, and a live run where available.
          </p>
        </div>
        <div className="ftqm-modes" role="group" aria-label="Ranking source">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`ftq-tab ${mode === m.id ? 'active' : ''}`}
              aria-pressed={mode === m.id}
              disabled={m.id === 'community' && communityOff}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
        <p className="ftqm-method">
          {mode === 'rubric' ? (
            <>
              Ranked on four criteria scored 1 to 5 (
              {RUBRIC.map((c) => c.label.toLowerCase()).join(', ')}
              ), for a total out of {RUBRIC_MAX}. The scores are shown on every model.
            </>
          ) : (
            <>
              Ranked by the average tier Ezana members voted. A model appears once it has{' '}
              {MIN_COMMUNITY_VOTES} votes. Open any model to cast yours.
            </>
          )}
        </p>

        <div className="ftqm-board">
          {board.rows.map((row) => (
            <div key={row.tier} className={`ftqm-row ftqm-row--${row.tier.toLowerCase()}`}>
              <div className="ftqm-row-label" aria-label={`Tier ${row.tier}`}>
                {row.tier}
              </div>
              <div className="ftqm-row-tiles">
                {row.models.length ? (
                  row.models.map((m) => (
                    <ModelTile
                      key={m.id}
                      model={m}
                      active={selectedId === m.id}
                      onSelect={toggleSelect}
                    />
                  ))
                ) : (
                  <span className="ftqm-empty">No models in this tier</span>
                )}
              </div>
            </div>
          ))}
          {mode === 'community' && board.unranked.length ? (
            <div className="ftqm-row ftqm-row--unranked">
              <div className="ftqm-row-label ftqm-row-label--text">Awaiting votes</div>
              <div className="ftqm-row-tiles">
                {board.unranked.map((m) => (
                  <ModelTile
                    key={m.id}
                    model={m}
                    active={selectedId === m.id}
                    onSelect={toggleSelect}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div aria-live="polite">
          {selected ? (
            <ModelDetail
              key={selected.id}
              model={selected}
              votesAvailable={votes.available}
              myTier={votes.mine[selected.id] || null}
              communityVotes={votes.summary[selected.id]?.votes || 0}
              onVote={castVote}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </div>

        <p className="ftqm-disclaimer">
          For educational and informational purposes only. Not financial advice. Past performance
          does not guarantee future results.
        </p>
      </div>
    </section>
  );
}

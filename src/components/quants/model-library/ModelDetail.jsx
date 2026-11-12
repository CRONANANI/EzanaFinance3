'use client';

import { RUBRIC, RUBRIC_MAX, TIERS } from '@/lib/quants/model-library';
import { GarchTool, MarkovTool, PcaTool } from './LiveTools';

const TOOLS = { garch: GarchTool, markov: MarkovTool, pca: PcaTool };

export function ModelDetail({ model, votesAvailable, myTier, communityVotes, onVote, onClose }) {
  const Tool = model.live ? TOOLS[model.live] : null;

  return (
    <article className="ftqm-detail">
      <header className="ftqm-detail-head">
        <div>
          <p className="ftqm-eyebrow">{model.family}</p>
          <h4 className="ftqm-detail-title">{model.name}</h4>
        </div>
        <div className="ftqm-detail-meta">
          <span className="ftqm-badge">Tier {model.rubricTier}</span>
          <span className="ftqm-score">
            {model.total}
            <span className="ftqm-score-max">/{RUBRIC_MAX}</span>
          </span>
          <button
            type="button"
            className="ftqm-close"
            onClick={onClose}
            aria-label="Close model details"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>
      </header>

      <div className="ftqm-detail-grid">
        <div>
          <p className="ftqm-body">{model.summary}</p>
          <p className="ftqm-label">Core equation</p>
          <pre className="ftqm-equation">{model.equation}</pre>
          <p className="ftqm-label">Where it breaks</p>
          <p className="ftqm-body">{model.breaks}</p>
          {model.reading ? (
            <>
              <p className="ftqm-label">Further reading</p>
              <p className="ftqm-body ftqm-body--muted">{model.reading}</p>
            </>
          ) : null}
        </div>

        <div>
          <p className="ftqm-label">Ezana rubric</p>
          <ul className="ftqm-rubric">
            {RUBRIC.map((c) => {
              const score = model.scores[c.id];
              return (
                <li key={c.id} className="ftqm-rubric-row" title={c.hint}>
                  <span className="ftqm-rubric-name">{c.label}</span>
                  <span className="ftqm-rubric-track" aria-hidden>
                    <span className="ftqm-rubric-fill" style={{ width: `${(score / 5) * 100}%` }} />
                  </span>
                  <span className="ftqm-rubric-score">{score}/5</span>
                </li>
              );
            })}
          </ul>

          <p className="ftqm-label">Your tier</p>
          {votesAvailable ? (
            <>
              <div className="ftqm-vote" role="group" aria-label={`Vote a tier for ${model.name}`}>
                {TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`ftqm-vote-btn ${myTier === t ? 'is-active' : ''}`}
                    aria-pressed={myTier === t}
                    onClick={() => onVote(model.id, t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="ftqm-body ftqm-body--muted">
                {communityVotes === 1 ? '1 member vote' : `${communityVotes} member votes`} so far.
              </p>
            </>
          ) : (
            <p className="ftqm-body ftqm-body--muted">
              Community voting is not available right now.
            </p>
          )}
        </div>
      </div>

      {Tool ? (
        <div className="ftqm-tool">
          <p className="ftqm-label">Run it live</p>
          <Tool />
        </div>
      ) : null}
    </article>
  );
}

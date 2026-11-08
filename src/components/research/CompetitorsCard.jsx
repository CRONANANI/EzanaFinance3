'use client';

import { usePeers } from '@/hooks/useFinnhub';
import './research-tab-cards.css';

export function CompetitorsCard({ symbol, onSelectPeer }) {
  const { data, loading, error } = usePeers(symbol);

  if (!symbol) return null;
  if (loading) {
    return (
      <section className="rcp research-fade-in" aria-busy="true">
        <div className="rcp-head-id">
          <span className="rcp-skel rcp-skel--icon" />
          <div className="rcp-head-text">
            <span className="rcp-skel rcp-skel--title" />
            <span className="rcp-skel rcp-skel--line" />
          </div>
        </div>
        <span className="rcp-skel rcp-skel--block" />
        <span className="rcp-sr" role="status">
          Loading peers...
        </span>
      </section>
    );
  }
  if (error || !data?.length) {
    return (
      <section className="rcp rcp--state research-fade-in">
        <p className="rcp-state-title">Peer companies unavailable.</p>
        <p className="rcp-state-text">No peers were returned for {symbol}.</p>
      </section>
    );
  }

  const peers = data.filter((p) => p && p !== symbol).slice(0, 12);

  return (
    <section className="rcp research-fade-up">
      <header className="rcp-head">
        <div className="rcp-head-id">
          <span className="rcp-icon" aria-hidden="true">
            <i className="bi bi-diagram-3" />
          </span>
          <div className="rcp-head-text">
            <h3 className="rcp-title">Peer Companies</h3>
            <p className="rcp-desc">Select a peer to open its research</p>
          </div>
        </div>
      </header>
      <ul className="rcp-grid">
        {peers.map((peer, pi) => (
          <li key={peer}>
            <button
              type="button"
              onClick={() => onSelectPeer?.(peer)}
              className="rcp-peer"
              data-task-target={pi === 0 ? 'research-compare-button' : undefined}
            >
              {peer}
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

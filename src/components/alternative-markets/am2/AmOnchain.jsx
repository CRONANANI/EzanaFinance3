'use client';

import { AmSymbolChip } from './AmSymbolChip';

export function AmOnchain({ btcStats = [], ethStats = [], whales = [] }) {
  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <div className="am2-card-head-titles">
          <h3 className="am2-card-title">On-chain snapshot</h3>
          <span className="am2-card-subtitle">Updated 1m ago</span>
        </div>
      </div>
      <div className="am2-card-body">
        <div className="am2-onchain-grid">
          <Column accent="gold" symbol="BTC" name="Bitcoin" rows={btcStats} />
          <Column accent="purple" symbol="ETH" name="Ethereum" rows={ethStats} />
          <WhaleColumn whales={whales} />
        </div>
      </div>
    </div>
  );
}

function Column({ accent, symbol, name, rows }) {
  return (
    <div>
      <div className="am2-onchain-col-head">
        <AmSymbolChip accent={accent}>{symbol}</AmSymbolChip>
        <span className="am2-onchain-col-name">{name}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="am2-onchain-row">
          <span className="am2-onchain-label">{r.label}</span>
          <span className="am2-onchain-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function WhaleColumn({ whales }) {
  return (
    <div>
      <div
        className="am2-onchain-col-head"
        style={{ display: 'flex', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AmSymbolChip accent="cyan">FLOW</AmSymbolChip>
          <span className="am2-onchain-col-name">Whale activity</span>
        </div>
        <span className="am2-card-subtitle" style={{ marginLeft: 0 }}>
          {whales.length} events
        </span>
      </div>
      {whales.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          No qualifying transactions in the last hour.
        </p>
      ) : (
        whales.map((w, i) => (
          <div key={i} className="am2-whale">
            <div className="am2-whale-head">
              <span className="am2-whale-addr">{w.addr}</span>
              <span className="am2-whale-age">{w.age}</span>
            </div>
            <div className="am2-whale-body">
              {w.action} <span className="am2-whale-amount">{w.amount}</span>{' '}
              {w.target ? `to ${w.target}` : ''}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

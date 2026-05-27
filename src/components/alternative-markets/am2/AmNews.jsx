'use client';

export function AmNews({ items = [] }) {
  return (
    <div className="am2-card">
      <div className="am2-card-head">
        <div className="am2-card-head-titles">
          <h3 className="am2-card-title">News wire</h3>
          <span className="am2-card-subtitle">All sources · last 12h</span>
        </div>
      </div>
      <div className="am2-card-body--flush">
        <div className="am2-table">
          <div className="am2-table-head am2-table-news">
            <span>Time</span>
            <span>Topic</span>
            <span>Headline</span>
            <span style={{ textAlign: 'right' }}>Source</span>
          </div>
          {items.map((n, i) => (
            <div key={i} className="am2-table-row am2-table-news">
              <span className="am2-news-time">{n.time}</span>
              <span>
                <span className="am2-news-topic">{n.topic || 'Markets'}</span>
              </span>
              <span className="am2-news-headline">{n.title}</span>
              <span className="am2-news-source">{n.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

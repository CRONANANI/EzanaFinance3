'use client';

import {
  CONGRESS_TRADES_ALL,
  INTEL_DATA,
  PORTFOLIO_BACK_METRICS,
  COMMUNITY_BACK_POSTS,
  ALERTS_FEED,
  ALT_SIGNALS_FEED,
} from './features-landing-data';

const PORTFOLIO_SPARKLINE = (
  <svg className="fcb-sparkline" viewBox="0 0 240 60" aria-hidden>
    <defs>
      <linearGradient id="fcb-spark-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      fill="url(#fcb-spark-grad)"
      d="M0,45 L30,42 L60,38 L90,35 L120,28 L150,22 L180,18 L210,12 L240,8 L240,60 L0,60 Z"
    />
    <path
      fill="none"
      stroke="#10b981"
      strokeWidth="2"
      d="M0,45 L30,42 L60,38 L90,35 L120,28 L150,22 L180,18 L210,12 L240,8"
    />
  </svg>
);

export function PortfolioBack() {
  return (
    <div className="fcb fcb-portfolio">
      <div className="fcb-head-row">
        <span className="fcb-kicker lf-mono">PORTFOLIO</span>
        <span className="fcb-head-sub lf-mono">1W</span>
      </div>
      <div className="fcb-big lf-mono">$127,843.52</div>
      <div className="fcb-delta lf-mono positive">+$2,847.31 (+2.28%)</div>
      {PORTFOLIO_SPARKLINE}
      <div className="fcb-metric-grid">
        {PORTFOLIO_BACK_METRICS.map((m) => (
          <div key={m.label} className="fcb-metric">
            <span className="fcb-metric-label lf-mono">{m.label}</span>
            <span className="fcb-metric-value lf-mono">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CongressBack() {
  const rows = CONGRESS_TRADES_ALL.slice(0, 4);
  return (
    <div className="fcb fcb-congress">
      <div className="fcb-row-head">
        <span className="fcb-back-title">Congressional Ledger</span>
      </div>
      <div className="fcb-congress-rows">
        {rows.map((t) => (
          <div key={t.id} className="fcb-congress-row">
            <span
              className={`fcb-party-dot ${t.party === 'Democrat' ? 'dem' : 'rep'}`}
              aria-hidden
            />
            <span className="fcb-congress-name">{t.name.split(' ').pop()}</span>
            <span className="fcb-congress-ticker lf-mono">{t.ticker}</span>
            <span className={`fcb-pill ${t.type === 'Purchase' ? 'buy' : 'sell'}`}>
              {t.type === 'Purchase' ? 'Buy' : 'Sell'}
            </span>
            <span className="fcb-congress-amt lf-mono">{t.amount}</span>
          </div>
        ))}
      </div>
      <div className="fcb-foot lf-mono">535 members tracked</div>
    </div>
  );
}

export function IntelligenceBack() {
  const rows = INTEL_DATA.contracts.slice(0, 3);
  return (
    <div className="fcb fcb-intel">
      <div className="fcb-back-title">Government Activity</div>
      <div className="fcb-tabs lf-mono">
        <span className="active">Contracts</span>
        <span>·</span>
        <span>Lobbying</span>
        <span>·</span>
        <span>Patents</span>
      </div>
      <div className="fcb-intel-rows">
        {rows.map((item, i) => (
          <div key={i} className="fcb-intel-row">
            <div className="fcb-intel-icon">
              <i className="bi bi-file-earmark-text" aria-hidden />
            </div>
            <div className="fcb-intel-text">
              <div className="fcb-intel-agency">{item.agency}</div>
              <div className="fcb-intel-co">{item.company}</div>
            </div>
            <div className="fcb-intel-amt lf-mono">
              {item.amount.replace(' Contract Award', '')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CommunityBack() {
  return (
    <div className="fcb fcb-community">
      <div className="fcb-row-head">
        <span className="fcb-back-title">Community</span>
      </div>
      <div className="fcb-community-feed">
        {COMMUNITY_BACK_POSTS.map((post, i) => (
          <div key={i} className="fcb-community-item">
            <div className="fcb-post-head">
              <div className="fcb-avatar">{post.author}</div>
              <div>
                <div className="fcb-post-name">{post.name}</div>
                <span className="fcb-badge">{post.badge}</span>
              </div>
            </div>
            <p className="fcb-post-body">{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlertsBack() {
  // Cap to 3 so the stack fits the fixed flip-card height without overlapping.
  const rows = ALERTS_FEED.slice(0, 3);
  return (
    <div className="fcb fcb-alerts">
      <div className="fcb-row-head">
        <span className="fcb-back-title">Real-time Alerts</span>
      </div>
      <div className="fcb-alert-stack">
        {rows.map((a, i) => (
          <div key={i} className="fcb-alert-row">
            <i className={`bi ${a.icon}`} aria-hidden />
            <span className="fcb-alert-text">{a.text}</span>
            <span className="fcb-alert-time lf-mono">{a.time}</span>
          </div>
        ))}
      </div>
      <div className="fcb-foot lf-mono">Across all your positions</div>
    </div>
  );
}

export function AltAnalyticsBack() {
  return (
    <div className="fcb fcb-alt">
      <div className="fcb-kicker lf-mono">ALT-DATA SIGNALS</div>
      <div className="fcb-alt-rows">
        {ALT_SIGNALS_FEED.map((s, i) => (
          <div key={i} className="fcb-alt-row">
            <span className="fcb-alt-label">{s.label}</span>
            <span className="fcb-alt-ticker lf-mono">{s.ticker}</span>
            <span className={`fcb-alt-delta lf-mono ${s.up ? 'up' : 'down'}`}>{s.delta}</span>
          </div>
        ))}
      </div>
      <div className="fcb-foot lf-mono">Updated daily</div>
    </div>
  );
}

const BACK_BY_KEY = {
  congress: CongressBack,
  portfolio: PortfolioBack,
  intelligence: IntelligenceBack,
  alerts: AlertsBack,
  community: CommunityBack,
  alt: AltAnalyticsBack,
};

export function FeatureCardBack({ cardKey }) {
  const Back = BACK_BY_KEY[cardKey];
  if (!Back) return null;
  return <Back />;
}

'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { OpportunityAnalysisModal } from './OpportunityAnalysisModal';
import './market-opportunities.css';

export function MarketOpportunities() {
  const { isOrgUser, orgRole, isLoading: orgLoading } = useOrg();
  const [activeTab, setActiveTab] = useState('windfalls');
  const [windfalls, setWindfalls] = useState([]);
  const [banes, setBanes] = useState([]);
  const [riskCategory, setRiskCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (orgLoading) return;
    let cancelled = false;
    setLoading(true);
    const endpoint = isOrgUser ? '/api/market-opportunities/org' : '/api/market-opportunities';
    fetch(endpoint, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { windfalls: [], banes: [] }))
      .then((d) => {
        if (cancelled) return;
        setWindfalls(d.windfalls || []);
        setBanes(d.banes || []);
        setRiskCategory(d.riskCategory || '');
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOrgUser, orgLoading]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const items = activeTab === 'windfalls' ? windfalls : banes;

  return (
    <div className="mkt-opps-card">
      <div className="mkt-opps-header">
        <div className="mkt-opps-header-left">
          <i className="bi bi-gem mkt-opps-header-icon" />
          <div>
            <h3 className="mkt-opps-title">Market Opportunities</h3>
            {riskCategory && (
              <span className="mkt-opps-risk-badge">
                {isOrgUser
                  ? `${orgRole === 'executive' ? 'Exec' : orgRole === 'portfolio_manager' ? 'PM' : 'Analyst'} · `
                  : ''}
                {riskCategory} profile
              </span>
            )}
          </div>
        </div>
        <div className="mkt-opps-tabs">
          <button
            type="button"
            className={`mkt-opps-tab ${activeTab === 'windfalls' ? 'is-active is-windfall' : ''}`}
            onClick={() => setActiveTab('windfalls')}
          >
            <i className="bi bi-graph-up-arrow" /> Windfalls
          </button>
          <button
            type="button"
            className={`mkt-opps-tab ${activeTab === 'banes' ? 'is-active is-bane' : ''}`}
            onClick={() => setActiveTab('banes')}
          >
            <i className="bi bi-exclamation-triangle" /> Banes
          </button>
        </div>
      </div>

      <div className="mkt-opps-body">
        {loading ? (
          <div className="mkt-opps-loading">
            <i className="bi bi-hourglass-split" /> Scanning markets…
          </div>
        ) : items.length === 0 ? (
          <div className="mkt-opps-empty">
            <i className="bi bi-binoculars" />
            <p>No {activeTab === 'windfalls' ? 'opportunities' : 'risks'} detected for your profile right now.</p>
          </div>
        ) : (
          <div className="mkt-opps-list">
            {items.map((event, i) => (
              <button
                key={event.id || i}
                type="button"
                className="mkt-opps-item"
                onClick={() => handleEventClick(event)}
              >
                <div className={`mkt-opps-item-indicator ${event.type}`} />
                <div className="mkt-opps-item-body">
                  <p className="mkt-opps-item-headline">{event.headline}</p>
                  <div className="mkt-opps-item-meta">
                    {event.ticker && <span className="mkt-opps-item-ticker">${event.ticker}</span>}
                    <span className="mkt-opps-item-source">{event.source}</span>
                    <span className="mkt-opps-item-time">
                      {new Date(event.publishedAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                </div>
                <i className="bi bi-chevron-right mkt-opps-item-arrow" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mkt-opps-footer">
        <i className="bi bi-robot" /> AI-curated based on your risk profile and activity
      </div>

      {selectedEvent && (
        <OpportunityAnalysisModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

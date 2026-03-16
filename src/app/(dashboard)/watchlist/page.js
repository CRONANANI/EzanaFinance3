'use client';

import { useState } from 'react';
import { PinnableCard } from '@/components/ui/PinnableCard';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/watchlist.css';

export default function WatchlistPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="watchlist-container">
      <div className="stats-grid condensed">
        <div className="stat-card">
          <div className="stat-icon stocks"><i className="bi bi-graph-up" /></div>
          <div className="stat-content">
            <div className="stat-value">24</div>
            <div className="stat-label">Stocks Tracked</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon congress"><i className="bi bi-activity" /></div>
          <div className="stat-content">
            <div className="stat-value">18</div>
            <div className="stat-label">Recent Activity</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alerts"><i className="bi bi-bell" /></div>
          <div className="stat-content">
            <div className="stat-value">8</div>
            <div className="stat-label">Active Alerts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon performance"><i className="bi bi-trophy" /></div>
          <div className="stat-content">
            <div className="stat-value" id="watchlistPerformanceValue">+12.4%</div>
            <div className="stat-label">Performance</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid watchlist-grid-two-column">
        <PinnableCard cardId="recent-activity" title="Recent Activity" sourcePage="/watchlist" sourceLabel="Watchlist" defaultW={4} defaultH={3}>
        <div className="component-card recent-activity-card recent-activity-compact">
          <div className="card-body recent-activity-body">
            <button
              type="button"
              className="mobile-filter-toggle"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <i className={`bi ${filtersOpen ? 'bi-x-lg' : 'bi-funnel'}`} />
              {filtersOpen ? 'Close Filters' : 'Filters'}
            </button>

            {/* Filters + Members inline at top */}
            <aside className={`filters-sidebar ${filtersOpen ? 'filters-open' : ''}`} id="filtersSidebar">
              <div className="filters-header">
                <span className="filters-title">Filters</span>
                <button type="button" className="filters-clear-btn" id="clearAllFilters" title="Clear all">Clear all</button>
              </div>
              <div className="active-filters-chips" id="activeFiltersChips" />
              <div className="filters-presets">
                <span className="filters-section-label">Presets</span>
                <button type="button" className="preset-btn" data-preset="congress">Congress Watch</button>
                <button type="button" className="preset-btn" data-preset="institutional">Institutional Moves</button>
                <button type="button" className="preset-btn" data-preset="insider">Insider Buying</button>
                <button type="button" className="preset-btn" data-preset="tech">Tech Whales</button>
                <button type="button" className="preset-btn" data-preset="contrarian">Contrarian Plays</button>
                <button type="button" className="preset-btn" data-preset="political">Political Pulse</button>
              </div>
              <nav className="filters-sections" id="filtersSections">
                <div className="filter-section" data-section="activity-type">
                  <button type="button" className="filter-section-toggle"><i className="bi bi-chevron-down" /><span>Activity Type</span><span className="filter-count">0</span></button>
                  <div className="filter-options">
                    <label><input type="checkbox" name="activity" value="congressional" /> Congressional Trades</label>
                    <label><input type="checkbox" name="activity" value="13f" /> 13F Filings</label>
                    <label><input type="checkbox" name="activity" value="insider" /> Insider Transactions</label>
                    <label><input type="checkbox" name="activity" value="gov-contracts" /> Government Contracts</label>
                    <label><input type="checkbox" name="activity" value="lobbying" /> Lobbying Activity</label>
                    <label><input type="checkbox" name="activity" value="patents" /> Patent Filings</label>
                  </div>
                </div>
                <div className="filter-section" data-section="investor-type">
                  <button type="button" className="filter-section-toggle"><i className="bi bi-chevron-down" /><span>Investor Type</span><span className="filter-count">0</span></button>
                  <div className="filter-options">
                    <label><input type="checkbox" name="investor" value="congressional" /> Congressional Members</label>
                    <label><input type="checkbox" name="investor" value="hedge-funds" /> Hedge Funds</label>
                    <label><input type="checkbox" name="investor" value="institutional" /> Institutional Investors</label>
                    <label><input type="checkbox" name="investor" value="insiders" /> Corporate Insiders</label>
                  </div>
                </div>
                <div className="filter-section" data-section="position-size">
                  <button type="button" className="filter-section-toggle"><i className="bi bi-chevron-down" /><span>Position Size</span><span className="filter-count">0</span></button>
                  <div className="filter-options">
                    <label><input type="checkbox" name="position" value="under-10k" /> Under $10K</label>
                    <label><input type="checkbox" name="position" value="10k-100k" /> $10K - $100K</label>
                    <label><input type="checkbox" name="position" value="100k-1m" /> $100K - $1M</label>
                    <label><input type="checkbox" name="position" value="over-1m" /> Over $1M</label>
                  </div>
                </div>
                <div className="filter-section" data-section="time-period">
                  <button type="button" className="filter-section-toggle"><i className="bi bi-chevron-down" /><span>Time Period</span><span className="filter-count">0</span></button>
                  <div className="filter-options">
                    <label><input type="radio" name="time" value="24h" /> Last 24 Hours</label>
                    <label><input type="radio" name="time" value="7d" /> Last 7 Days</label>
                    <label><input type="radio" name="time" value="30d" /> Last 30 Days</label>
                    <label><input type="radio" name="time" value="quarter" /> Last Quarter</label>
                    <label><input type="radio" name="time" value="year" /> Last Year</label>
                  </div>
                </div>
              </nav>
            </aside>
            <div className="activity-content">
              <div className="members-list" id="activityList">
                <div className="member-item" data-activity="congressional" data-investor="congressional" data-position="over-1m" data-time="7d">
                  <div className="member-avatar">NP</div>
                  <div className="member-info">
                    <div className="member-name">Nancy Pelosi</div>
                    <div className="member-meta">House · Democrat · CA · NVDA · 2d ago</div>
                  </div>
                  <div className="member-stats">
                    <div className="stat-small"><span className="stat-value">$1.2M</span><span className="stat-label">buy</span></div>
                    <div className="stat-small"><span className="stat-value positive">+18%</span><span className="stat-label">return</span></div>
                  </div>
                  <button className="icon-btn" type="button"><i className="bi bi-three-dots-vertical" /></button>
                </div>
                <div className="member-item" data-activity="congressional" data-investor="congressional" data-position="100k-1m" data-time="7d">
                  <div className="member-avatar">DC</div>
                  <div className="member-info">
                    <div className="member-name">Dan Crenshaw</div>
                    <div className="member-meta">House · Republican · TX · AAPL · 5d ago</div>
                  </div>
                  <div className="member-stats">
                    <div className="stat-small"><span className="stat-value">$450K</span><span className="stat-label">buy</span></div>
                    <div className="stat-small"><span className="stat-value positive">+12%</span><span className="stat-label">return</span></div>
                  </div>
                  <button className="icon-btn" type="button"><i className="bi bi-three-dots-vertical" /></button>
                </div>
                <div className="member-item" data-activity="13f" data-investor="hedge-funds" data-position="over-1m" data-time="7d">
                  <div className="member-avatar">CT</div>
                  <div className="member-info">
                    <div className="member-name">Citadel Advisors</div>
                    <div className="member-meta">Hedge Fund · 13F · NVDA · New position</div>
                  </div>
                  <div className="member-stats">
                    <div className="stat-small"><span className="stat-value">$42M</span><span className="stat-label">added</span></div>
                    <div className="stat-small"><span className="stat-value positive">+15%</span><span className="stat-label">return</span></div>
                  </div>
                  <button className="icon-btn" type="button"><i className="bi bi-three-dots-vertical" /></button>
                </div>
                <div className="member-item" data-activity="insider" data-investor="insiders" data-position="over-1m" data-time="24h">
                  <div className="member-avatar">JH</div>
                  <div className="member-info">
                    <div className="member-name">Jensen Huang</div>
                    <div className="member-meta">CEO · NVDA · Option exercise · Today</div>
                  </div>
                  <div className="member-stats">
                    <div className="stat-small"><span className="stat-value">$12M</span><span className="stat-label">exercise</span></div>
                    <div className="stat-small"><span className="stat-value positive">+2.6%</span><span className="stat-label">return</span></div>
                  </div>
                  <button className="icon-btn" type="button"><i className="bi bi-three-dots-vertical" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </PinnableCard>

        <PinnableCard cardId="stock-watchlist" title="Watchlist" sourcePage="/watchlist" sourceLabel="Watchlist" defaultW={2} defaultH={3}>
        <div className="component-card stock-watchlist-card stock-watchlist-template watchlist-tall">
          <div className="stock-watchlist-header">
            <h3 className="stock-watchlist-title">Watchlist</h3>
            <div className="stock-watchlist-header-actions">
              <div className="watchlist-dropdown-wrap">
                <button className="stock-watchlist-dropdown-btn" id="watchlistDropdownBtn" title="Select watchlist" type="button" aria-haspopup="true" aria-expanded="false">
                  <span id="activeWatchlistName">My Watchlist</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-dropdown-menu" id="watchlistDropdownMenu" role="menu" aria-hidden="true">
                  <button type="button" className="watchlist-dropdown-item active" data-watchlist="all" role="menuitem"><i className="bi bi-bookmark-star" /><span>My Watchlist</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="technology" role="menuitem"><i className="bi bi-cpu" /><span>Technology</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="healthcare" role="menuitem"><i className="bi bi-heart-pulse" /><span>Healthcare</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="finance" role="menuitem"><i className="bi bi-bank" /><span>Financial Services</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="energy" role="menuitem"><i className="bi bi-lightning-charge" /><span>Energy</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="consumer" role="menuitem"><i className="bi bi-cart3" /><span>Consumer</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="industrials" role="menuitem"><i className="bi bi-gear" /><span>Industrials</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="realestate" role="menuitem"><i className="bi bi-building" /><span>Real Estate</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="utilities" role="menuitem"><i className="bi bi-plug" /><span>Utilities</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="materials" role="menuitem"><i className="bi bi-gem" /><span>Materials</span></button>
                  <button type="button" className="watchlist-dropdown-item" data-watchlist="telecom" role="menuitem"><i className="bi bi-broadcast" /><span>Telecom</span></button>
                </div>
              </div>
              <button className="stock-watchlist-info-btn" title="Info" type="button"><i className="bi bi-info-circle" /></button>
              <button className="stock-filters-toggle icon-btn" id="stockFiltersToggle" title="Filters" type="button"><i className="bi bi-funnel" /></button>
            </div>
          </div>
          <div className="stock-watchlist-filters-panel" id="stockFiltersPanel">
            <div className="stock-filters-header">
              <span className="filters-title">Stock Filters</span>
              <button type="button" className="filters-clear-btn" id="stockFiltersClear">Clear all</button>
            </div>
            <div className="stock-filters-presets">
              <span className="filters-section-label">Presets</span>
              <div className="stock-preset-btns">
                <button type="button" className="preset-btn" data-preset="growth">Growth Stocks</button>
                <button type="button" className="preset-btn" data-preset="value">Value Stocks</button>
                <button type="button" className="preset-btn" data-preset="momentum">Momentum Plays</button>
                <button type="button" className="preset-btn" data-preset="dividend">Dividend Income</button>
              </div>
            </div>
          </div>
          <div className="stock-watchlist-body">
            <div className="watchlist-categories">
              <div className="watchlist-category expanded" data-category="all">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title">Top 10 Hot</span>
                  <span className="category-count">6 items</span>
                  <i className="bi bi-chevron-up" />
                </button>
                <div className="watchlist-category-items">
                  <div className="watchlist-stock-item" data-symbol="NVDA">
                    <div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">NVDA</span></div>
                    <div className="stock-item-price">
                      <span className="watchlist-price">$485.20</span>
                      <span className="watchlist-change positive">+$12.40</span>
                    </div>
                  </div>
                  <div className="watchlist-stock-item" data-symbol="AAPL">
                    <div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">AAPL</span></div>
                    <div className="stock-item-price">
                      <span className="watchlist-price">$182.30</span>
                      <span className="watchlist-change positive">+$2.10</span>
                    </div>
                  </div>
                  <div className="watchlist-stock-item" data-symbol="TSLA">
                    <div className="stock-item-icon insight-icon negative"><i className="bi bi-graph-down-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">TSLA</span></div>
                    <div className="stock-item-price">
                      <span className="watchlist-price">$248.50</span>
                      <span className="watchlist-change negative">-$8.20</span>
                    </div>
                  </div>
                  <div className="watchlist-stock-item" data-symbol="MSFT">
                    <div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">MSFT</span></div>
                    <div className="stock-item-price">
                      <span className="watchlist-price">$415.20</span>
                      <span className="watchlist-change positive">+$3.30</span>
                    </div>
                  </div>
                  <div className="watchlist-stock-item" data-symbol="JPM">
                    <div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">JPM</span></div>
                    <div className="stock-item-price">
                      <span className="watchlist-price">$198.40</span>
                      <span className="watchlist-change positive">+$2.95</span>
                    </div>
                  </div>
                  <div className="watchlist-stock-item" data-symbol="XOM">
                    <div className="stock-item-icon insight-icon negative"><i className="bi bi-graph-down-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">XOM</span></div>
                    <div className="stock-item-price">
                      <span className="watchlist-price">$108.20</span>
                      <span className="watchlist-change negative">-$1.32</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="watchlist-category" data-category="technology">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-cpu" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Technology</span>
                  <span className="category-count">4 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <div className="watchlist-stock-item" data-symbol="NVDA"><div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div><div className="stock-item-info"><span className="stock-item-symbol">NVDA</span></div><div className="stock-item-price"><span className="watchlist-price">$485.20</span><span className="watchlist-change positive">+$12.40</span></div></div>
                  <div className="watchlist-stock-item" data-symbol="AAPL"><div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div><div className="stock-item-info"><span className="stock-item-symbol">AAPL</span></div><div className="stock-item-price"><span className="watchlist-price">$182.30</span><span className="watchlist-change positive">+$2.10</span></div></div>
                  <div className="watchlist-stock-item" data-symbol="TSLA"><div className="stock-item-icon insight-icon negative"><i className="bi bi-graph-down-arrow" /></div><div className="stock-item-info"><span className="stock-item-symbol">TSLA</span></div><div className="stock-item-price"><span className="watchlist-price">$248.50</span><span className="watchlist-change negative">-$8.20</span></div></div>
                  <div className="watchlist-stock-item" data-symbol="MSFT"><div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div><div className="stock-item-info"><span className="stock-item-symbol">MSFT</span></div><div className="stock-item-price"><span className="watchlist-price">$415.20</span><span className="watchlist-change positive">+$3.30</span></div></div>
                </div>
              </div>
              <div className="watchlist-category" data-category="healthcare">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-heart-pulse" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Healthcare</span>
                  <span className="category-count">0 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <p className="watchlist-empty-hint">No stocks in this sector yet.</p>
                </div>
              </div>
              <div className="watchlist-category" data-category="finance">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-bank" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Financial Services</span>
                  <span className="category-count">1 item</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <div className="watchlist-stock-item" data-symbol="JPM"><div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div><div className="stock-item-info"><span className="stock-item-symbol">JPM</span></div><div className="stock-item-price"><span className="watchlist-price">$198.40</span><span className="watchlist-change positive">+$2.95</span></div></div>
                </div>
              </div>
              <div className="watchlist-category" data-category="energy">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-lightning-charge" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Energy</span>
                  <span className="category-count">1 item</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <div className="watchlist-stock-item" data-symbol="XOM"><div className="stock-item-icon insight-icon negative"><i className="bi bi-graph-down-arrow" /></div><div className="stock-item-info"><span className="stock-item-symbol">XOM</span></div><div className="stock-item-price"><span className="watchlist-price">$108.20</span><span className="watchlist-change negative">-$1.32</span></div></div>
                </div>
              </div>
              <div className="watchlist-category" data-category="consumer">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-cart3" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Consumer</span>
                  <span className="category-count">0 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <p className="watchlist-empty-hint">No stocks in this sector yet.</p>
                </div>
              </div>
              <div className="watchlist-category" data-category="industrials">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-gear" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Industrials</span>
                  <span className="category-count">0 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <p className="watchlist-empty-hint">No stocks in this sector yet.</p>
                </div>
              </div>
              <div className="watchlist-category" data-category="realestate">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-building" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Real Estate</span>
                  <span className="category-count">0 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <p className="watchlist-empty-hint">No stocks in this sector yet.</p>
                </div>
              </div>
              <div className="watchlist-category" data-category="utilities">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-plug" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Utilities</span>
                  <span className="category-count">0 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <p className="watchlist-empty-hint">No stocks in this sector yet.</p>
                </div>
              </div>
              <div className="watchlist-category" data-category="materials">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-gem" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Materials</span>
                  <span className="category-count">0 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <p className="watchlist-empty-hint">No stocks in this sector yet.</p>
                </div>
              </div>
              <div className="watchlist-category" data-category="telecom">
                <button type="button" className="watchlist-category-toggle">
                  <span className="category-title"><i className="bi bi-broadcast" style={{ marginRight: '0.375rem', opacity: 0.7 }} />Telecom</span>
                  <span className="category-count">0 items</span>
                  <i className="bi bi-chevron-down" />
                </button>
                <div className="watchlist-category-items">
                  <p className="watchlist-empty-hint">No stocks in this sector yet.</p>
                </div>
              </div>
            </div>
            <button type="button" className="watchlist-create-btn"><i className="bi bi-plus-lg" /> Create new watchlist</button>
          </div>
        </div>
        </PinnableCard>

        <PinnableCard cardId="price-alerts" title="Active Price Alerts" sourcePage="/watchlist" sourceLabel="Watchlist" defaultW={4} defaultH={1}>
        <div className="component-card full-width price-alerts-card price-alerts-compact">
          <div className="card-header">
            <h3><i className="bi bi-bell-fill" /> Active Price Alerts</h3>
            <button className="card-action-btn" type="button">New Alert</button>
          </div>
          <div className="card-body">
            <div className="alerts-list">
              <div className="alert-item">
                <div className="alert-icon success"><i className="bi bi-check-circle" /></div>
                <div className="alert-content">
                  <div className="alert-title">NVDA reached $485</div>
                  <div className="alert-meta">Target price hit · 2 hours ago</div>
                </div>
                <button className="alert-dismiss" type="button"><i className="bi bi-x" /></button>
              </div>
              <div className="alert-item">
                <div className="alert-icon warning"><i className="bi bi-exclamation-triangle" /></div>
                <div className="alert-content">
                  <div className="alert-title">TSLA dropped below $250</div>
                  <div className="alert-meta">Stop loss triggered · 4 hours ago</div>
                </div>
                <button className="alert-dismiss" type="button"><i className="bi bi-x" /></button>
              </div>
              <div className="alert-item pending">
                <div className="alert-icon info"><i className="bi bi-clock" /></div>
                <div className="alert-content">
                  <div className="alert-title">AAPL above $185</div>
                  <div className="alert-meta">Pending · Current: $182.30</div>
                </div>
                <button className="alert-edit" type="button"><i className="bi bi-pencil" /></button>
              </div>
            </div>
          </div>
        </div>
        </PinnableCard>
      </div>
    </div>
  );
}

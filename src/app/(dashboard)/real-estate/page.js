'use client';

import { useState, useMemo } from 'react';
import './real-estate.css';

// Property types for the filter pill row.
const PROPERTY_TYPES = ['All', 'Residential', 'Commercial', 'Industrial', 'Land', 'Mixed-Use'];

// Mock listings — placeholder until the Supabase `real_estate_listings`
// table + sponsor onboarding flow lands. Shape mirrors what the partner
// API is expected to return so the UI here will keep working unchanged.
const LISTINGS = [
  {
    id: 're-001',
    name: 'The Hudson Yards Residences',
    location: 'New York, NY',
    type: 'Residential',
    image: null,
    minInvestment: 500,
    targetReturn: 8.5,
    totalRaise: 2500000,
    funded: 67,
    sponsor: 'Manhattan Equity Partners',
    description:
      'Luxury residential units in Hudson Yards with projected 8.5% annual returns. Fractional ownership starting at $500.',
    holdPeriod: '5 years',
  },
  {
    id: 're-002',
    name: 'Austin Tech Campus — Phase II',
    location: 'Austin, TX',
    type: 'Commercial',
    image: null,
    minInvestment: 1000,
    targetReturn: 12.0,
    totalRaise: 10000000,
    funded: 43,
    sponsor: 'Lone Star Capital',
    description:
      'Class A office space anchored by two Fortune 500 tech tenants. 12% target IRR over 7-year hold.',
    holdPeriod: '7 years',
  },
  {
    id: 're-003',
    name: 'Miami Beach Mixed-Use Development',
    location: 'Miami, FL',
    type: 'Mixed-Use',
    image: null,
    minInvestment: 250,
    targetReturn: 10.2,
    totalRaise: 5000000,
    funded: 81,
    sponsor: 'Coastal Ventures',
    description:
      'Ground-floor retail + 120 residential units in South Beach. 81% funded — closing in 30 days.',
    holdPeriod: '6 years',
  },
  {
    id: 're-004',
    name: 'Denver Industrial Logistics Hub',
    location: 'Denver, CO',
    type: 'Industrial',
    image: null,
    minInvestment: 2000,
    targetReturn: 9.8,
    totalRaise: 15000000,
    funded: 22,
    sponsor: 'Rocky Mountain Industrial',
    description:
      'Last-mile distribution center serving Denver metro. Triple-net leased to an e-commerce anchor tenant.',
    holdPeriod: '10 years',
  },
  {
    id: 're-005',
    name: 'Nashville Short-Term Rental Portfolio',
    location: 'Nashville, TN',
    type: 'Residential',
    image: null,
    minInvestment: 100,
    targetReturn: 14.5,
    totalRaise: 800000,
    funded: 92,
    sponsor: 'Music City Holdings',
    description:
      '8-property STR portfolio near Broadway. 92% funded — generating cash flow from day one.',
    holdPeriod: '3 years',
  },
  {
    id: 're-006',
    name: 'Toronto Waterfront Condos',
    location: 'Toronto, ON',
    type: 'Residential',
    image: null,
    minInvestment: 500,
    targetReturn: 7.2,
    totalRaise: 4000000,
    funded: 55,
    sponsor: 'North Shore Development Group',
    description:
      "Pre-construction condo units on Toronto's waterfront. Canadian market diversification for US investors.",
    holdPeriod: '4 years',
  },
  {
    id: 're-007',
    name: 'Phoenix Solar Farm Land',
    location: 'Phoenix, AZ',
    type: 'Land',
    image: null,
    minInvestment: 5000,
    targetReturn: 6.5,
    totalRaise: 20000000,
    funded: 15,
    sponsor: 'Desert Sun Energy',
    description:
      '500-acre land acquisition for utility-scale solar. Long-term lease to a major energy company.',
    holdPeriod: '20 years',
  },
  {
    id: 're-008',
    name: 'Chicago Multifamily Value-Add',
    location: 'Chicago, IL',
    type: 'Residential',
    image: null,
    minInvestment: 1000,
    targetReturn: 11.0,
    totalRaise: 6000000,
    funded: 38,
    sponsor: 'Windy City Capital',
    description:
      '200-unit apartment complex in Lincoln Park. Value-add renovation with projected 11% IRR.',
    holdPeriod: '5 years',
  },
];

function formatCurrency(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function RealEstateMarketplacePage() {
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('funded');

  const filtered = useMemo(() => {
    let list = filter === 'All' ? LISTINGS : LISTINGS.filter((l) => l.type === filter);
    if (sortBy === 'funded') list = [...list].sort((a, b) => b.funded - a.funded);
    if (sortBy === 'return') list = [...list].sort((a, b) => b.targetReturn - a.targetReturn);
    if (sortBy === 'minInvestment')
      list = [...list].sort((a, b) => a.minInvestment - b.minInvestment);
    return list;
  }, [filter, sortBy]);

  const totalRaised = LISTINGS.reduce((s, l) => s + (l.totalRaise * l.funded) / 100, 0);
  const avgReturn = LISTINGS.reduce((s, l) => s + l.targetReturn, 0) / LISTINGS.length;

  return (
    <div className="re-page">
      <div className="re-hero">
        <h1 className="re-hero-title">
          <span className="re-gold">Real Estate</span> Marketplace
        </h1>
        <p className="re-hero-sub">
          Fractional property investments from vetted sponsors. Invest in real estate starting at
          $100.
        </p>
      </div>

      <div className="re-kpi-grid">
        <div className="re-kpi">
          <div className="re-kpi-value">{LISTINGS.length}</div>
          <div className="re-kpi-label">Active Listings</div>
        </div>
        <div className="re-kpi">
          <div className="re-kpi-value">{formatCurrency(totalRaised)}</div>
          <div className="re-kpi-label">Total Capital Raised</div>
        </div>
        <div className="re-kpi">
          <div className="re-kpi-value">{avgReturn.toFixed(1)}%</div>
          <div className="re-kpi-label">Avg Target Return</div>
        </div>
        <div className="re-kpi">
          <div className="re-kpi-value">$100</div>
          <div className="re-kpi-label">Minimum Investment</div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <div className="re-filters">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`re-filter-pill ${filter === t ? 'active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            background: 'rgba(212, 175, 55, 0.04)',
            border: '1px solid rgba(212, 175, 55, 0.12)',
            borderRadius: 6,
            color: '#D4AF37',
            fontSize: '0.6rem',
            padding: '0.3rem 0.5rem',
            cursor: 'pointer',
          }}
        >
          <option value="funded">Sort: Most Funded</option>
          <option value="return">Sort: Highest Return</option>
          <option value="minInvestment">Sort: Lowest Minimum</option>
        </select>
      </div>

      <div className="re-listings">
        {filtered.map((listing) => (
          <div key={listing.id} className="re-card">
            <div
              className="re-card-img"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: 'rgba(212, 175, 55, 0.2)',
              }}
            >
              <i className="bi bi-building" />
            </div>

            <div className="re-card-body">
              <span
                className={`re-card-type re-card-type--${listing.type
                  .toLowerCase()
                  .replace('-use', '')}`}
              >
                {listing.type}
              </span>
              <h3 className="re-card-name">{listing.name}</h3>
              <p className="re-card-location">
                <i className="bi bi-geo-alt" /> {listing.location}
              </p>

              <div className="re-card-stats">
                <div className="re-card-stat">
                  <div className="re-card-stat-value">{listing.targetReturn}%</div>
                  <div className="re-card-stat-label">Target IRR</div>
                </div>
                <div className="re-card-stat">
                  <div className="re-card-stat-value">{formatCurrency(listing.minInvestment)}</div>
                  <div className="re-card-stat-label">Minimum</div>
                </div>
                <div className="re-card-stat">
                  <div className="re-card-stat-value">{listing.holdPeriod}</div>
                  <div className="re-card-stat-label">Hold Period</div>
                </div>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.5rem',
                    color: '#8b949e',
                    marginBottom: '0.2rem',
                  }}
                >
                  <span>{listing.funded}% funded</span>
                  <span>{formatCurrency(listing.totalRaise)} goal</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div
                    style={{
                      width: `${listing.funded}%`,
                      height: '100%',
                      background: listing.funded > 80 ? '#10b981' : '#D4AF37',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>

              <p
                style={{
                  fontSize: '0.6rem',
                  color: '#c9d1d9',
                  lineHeight: 1.5,
                  margin: '0 0 0.5rem',
                }}
              >
                {listing.description}
              </p>

              <div className="re-card-footer">
                <span className="re-card-sponsor">
                  <i className="bi bi-building" /> {listing.sponsor}
                </span>
                <button type="button" className="re-card-btn">
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="re-empty">
          <div className="re-empty-icon">
            <i className="bi bi-houses" />
          </div>
          <h3 className="re-empty-title">No {filter} listings yet</h3>
          <p className="re-empty-desc">Check back soon — new properties are added weekly.</p>
        </div>
      )}

      <div className="re-partner-cta">
        <h3>
          <i className="bi bi-stars" /> List Your Property on Ezana
        </h3>
        <p>
          Are you a real estate sponsor or developer? Ezana&apos;s marketplace connects you with
          thousands of qualified investors. Fractional offerings from $100 to $50M. White-glove
          onboarding for sponsors.
        </p>
        <button
          type="button"
          className="re-card-btn"
          style={{ fontSize: '0.65rem', padding: '0.4rem 1rem' }}
        >
          Apply as a Sponsor
        </button>
      </div>
    </div>
  );
}

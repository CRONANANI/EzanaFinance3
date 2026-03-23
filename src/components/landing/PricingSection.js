'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import Link from 'next/link';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">
        <div className="pricing-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Choose the plan that fits your investment journey. All plans include a 14-day free trial.</p>

          <div className="billing-toggle">
            <button
              type="button"
              className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly <span className="save-badge">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {/* Plan 1 */}
          <div className="pricing-card">
            <h3>Individual</h3>
            <p className="pricing-tagline">For casual investors</p>
            <div className="pricing-price">
              <span className="pricing-amount">${billingCycle === 'yearly' ? '4' : '5'}</span>
              <span className="pricing-interval">/month</span>
            </div>
            {billingCycle === 'yearly' && <p className="pricing-annual">$48/year — save 20%</p>}
            <ul className="features-list">
              <li>
                <Check className="feature-check" size={16} />
                <span>Congressional trade alerts (24hr delay)</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Basic 13F filing access</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Community forum access</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Weekly market digest</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Watchlist (up to 10 tickers)</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Ezana Echo access</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Email notifications</span>
              </li>
            </ul>
            <Link href="/auth/login" className="pricing-btn">
              Get Started
            </Link>
            <p className="pricing-trial">14-day free trial • No credit card required</p>
          </div>

          {/* Plan 2 — Most Popular */}
          <div className="pricing-card popular">
            <span className="pricing-badge">Most Popular</span>
            <h3>Personal Advanced</h3>
            <p className="pricing-tagline">For active traders</p>
            <div className="pricing-price">
              <span className="pricing-amount">${billingCycle === 'yearly' ? '15' : '19'}</span>
              <span className="pricing-interval">/month</span>
            </div>
            {billingCycle === 'yearly' && <p className="pricing-annual">$180/year — save 20%</p>}
            <ul className="features-list">
              <li>
                <Check className="feature-check" size={16} />
                <span>Everything in Individual</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Real-time congressional alerts</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Full 13F filing database</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Legendary investor portfolios</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Advanced filtering & search</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Unlimited watchlists</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>AI-powered company research</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>API access (10K calls/mo)</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Priority support</span>
              </li>
            </ul>
            <Link href="/auth/login" className="pricing-btn primary">
              Start Free Trial
            </Link>
            <p className="pricing-trial">14-day free trial • No credit card required</p>
          </div>

          {/* Plan 3 */}
          <div className="pricing-card">
            <h3>Family</h3>
            <p className="pricing-tagline">Households & shared portfolios</p>
            <div className="pricing-price">
              <span className="pricing-amount">${billingCycle === 'yearly' ? '39' : '49'}</span>
              <span className="pricing-interval">/month</span>
            </div>
            {billingCycle === 'yearly' && <p className="pricing-annual">$468/year — save 20%</p>}
            <ul className="features-list">
              <li>
                <Check className="feature-check" size={16} />
                <span>Everything in Personal Advanced</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Up to 5 user accounts</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Shared watchlists & alerts</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Family portfolio dashboard</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Consolidated reporting</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Joint investment tracking</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>API access on main account (25K calls/mo)</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Dedicated family support</span>
              </li>
            </ul>
            <Link href="/auth/login" className="pricing-btn">
              Start Free Trial
            </Link>
            <p className="pricing-trial">14-day free trial • No credit card required</p>
          </div>

          {/* Plan 4 */}
          <div className="pricing-card professional">
            <h3>Professional</h3>
            <p className="pricing-tagline">Full-time traders & family offices</p>
            <div className="pricing-price">
              <span className="pricing-amount">${billingCycle === 'yearly' ? '95' : '119'}</span>
              <span className="pricing-interval">/month</span>
            </div>
            {billingCycle === 'yearly' && <p className="pricing-annual">$1,140/year — save 20%</p>}
            <p className="pricing-partner-note">Verified partners receive a discounted rate</p>
            <ul className="features-list">
              <li>
                <Check className="feature-check" size={16} />
                <span>Everything in Family</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Unlimited user accounts</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>API access (100K calls/mo)</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Custom data exports & white-label reports</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Compliance & audit logs</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Team management & role-based access</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Copy trading infrastructure</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Dedicated account manager</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>SLA guarantees</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Institutional-grade data feeds</span>
              </li>
              <li>
                <Check className="feature-check" size={16} />
                <span>Direct support channel</span>
              </li>
            </ul>
            <Link href="/auth/login" className="pricing-btn">
              Start Free Trial
            </Link>
            <p className="pricing-trial">14-day free trial • No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}

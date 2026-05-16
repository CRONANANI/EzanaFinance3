'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './sponsor-application.css';

const STEPS = [
  { num: 1, label: 'About You' },
  { num: 2, label: 'Property' },
  { num: 3, label: 'Offering' },
  { num: 4, label: 'Review' },
];

const ROLE_OPTIONS = [
  'Sponsor / GP',
  'Developer',
  'Property Manager',
  'REIT / Fund',
  'Individual Owner',
];
const PROPERTY_TYPES = [
  'Residential',
  'Commercial',
  'Industrial',
  'Mixed-Use',
  'Land',
  'Hospitality',
];
const RAISE_RANGES = ['Under $500K', '$500K – $2M', '$2M – $10M', '$10M – $50M', '$50M+'];
const HOLD_PERIODS = ['1–3 years', '3–5 years', '5–7 years', '7–10 years', '10+ years'];
const MIN_INVEST_OPTIONS = ['$100', '$250', '$500', '$1,000', '$5,000', '$10,000+'];

export default function SponsorApplicationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    company: '',
    role: '',
    website: '',
    propertyName: '',
    propertyType: '',
    location: '',
    description: '',
    raiseAmount: '',
    targetReturn: '',
    holdPeriod: '',
    minInvestment: '',
    whyEzana: '',
  });

  const set = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), []);

  const canAdvance = () => {
    if (step === 1) return form.fullName && form.email && form.company && form.role;
    if (step === 2) return form.propertyName && form.propertyType && form.location;
    if (step === 3) return form.raiseAmount && form.holdPeriod && form.minInvestment;
    return true;
  };

  const handleSubmit = () => {
    // Lead-gen only for now: log the payload so it shows up in dev tools
    // and ship the success state. The Supabase `sponsor_applications`
    // table + email notification ride in a follow-up PR per the spec.
    console.log('[Sponsor Application]', form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="sa-page">
        <div className="sa-card">
          <div className="sa-success">
            <div className="sa-success-icon">
              <i className="bi bi-check-circle-fill" />
            </div>
            <h2 className="sa-success-title">Application Submitted</h2>
            <p className="sa-success-desc">
              Thank you, {form.fullName}. Our team will review your application for{' '}
              {form.propertyName} and reach out within 48 hours. Once approved, your property will
              be listed on the Ezana Real Estate Marketplace — where everyday investors get first
              access to fractional ownership opportunities.
            </p>
            <button
              type="button"
              className="sa-btn-next"
              style={{ marginTop: '1rem' }}
              onClick={() => router.push('/real-estate')}
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sa-page">
      <div className="sa-hero">
        <h1 className="sa-hero-title">
          <span className="sa-gold">Sponsor</span> Application
        </h1>
        <p className="sa-hero-sub">
          List your property on Ezana&apos;s fractional marketplace and raise capital from thousands
          of everyday investors.
        </p>
      </div>

      <div className="sa-banner">
        <div className="sa-banner-icon">🏠</div>
        <div className="sa-banner-text">
          <h4>People-First Capital — Not Institutional, Not Government</h4>
          <p>
            Ezana&apos;s marketplace is built for everyday investors. When you list a property here,
            the general population gets first access to buy fractional stakes — not hedge funds, not
            sovereign wealth funds, not government entities. We believe real estate wealth should be
            accessible to everyone, starting at $100. Your investors are teachers, nurses,
            engineers, and small business owners building generational wealth through real assets.
          </p>
        </div>
      </div>

      <div className="sa-steps">
        {STEPS.map((s) => (
          <div
            key={s.num}
            className={`sa-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}
          >
            <span className="sa-step-num">
              {step > s.num ? <i className="bi bi-check" /> : s.num}
            </span>
            {s.label}
          </div>
        ))}
      </div>

      <div className="sa-card">
        {step === 1 && (
          <>
            <h2 className="sa-card-title">About You</h2>
            <p className="sa-card-desc">
              Tell us about yourself and your organization. We work with sponsors, developers,
              property managers, REITs, and individual owners.
            </p>

            <div className="sa-row">
              <div className="sa-field">
                <label className="sa-label">Full Name *</label>
                <input
                  className="sa-input"
                  placeholder="Jane Smith"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                />
              </div>
              <div className="sa-field">
                <label className="sa-label">Email *</label>
                <input
                  className="sa-input"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
            </div>

            <div className="sa-row">
              <div className="sa-field">
                <label className="sa-label">Company / Entity *</label>
                <input
                  className="sa-input"
                  placeholder="Acme Real Estate Group"
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                />
              </div>
              <div className="sa-field">
                <label className="sa-label">
                  Website <span className="sa-label-hint">(optional)</span>
                </label>
                <input
                  className="sa-input"
                  placeholder="https://yourcompany.com"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                />
              </div>
            </div>

            <div className="sa-field">
              <label className="sa-label">Your Role *</label>
              <div className="sa-options">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`sa-option ${form.role === r ? 'selected' : ''}`}
                    onClick={() => set('role', r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="sa-card-title">Property Details</h2>
            <p className="sa-card-desc">
              Describe the property you want to list on the marketplace. This is what everyday
              investors will evaluate before buying fractional stakes.
            </p>

            <div className="sa-field">
              <label className="sa-label">Property Name *</label>
              <input
                className="sa-input"
                placeholder="Sunset Ridge Apartments"
                value={form.propertyName}
                onChange={(e) => set('propertyName', e.target.value)}
              />
            </div>

            <div className="sa-field">
              <label className="sa-label">Property Type *</label>
              <div className="sa-options">
                {PROPERTY_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`sa-option ${form.propertyType === t ? 'selected' : ''}`}
                    onClick={() => set('propertyType', t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="sa-field">
              <label className="sa-label">Location *</label>
              <input
                className="sa-input"
                placeholder="Austin, TX"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
              />
            </div>

            <div className="sa-field">
              <label className="sa-label">
                Property Description{' '}
                <span className="sa-label-hint">(what makes this a good investment?)</span>
              </label>
              <textarea
                className="sa-textarea"
                placeholder="200-unit multifamily complex near downtown with 95% occupancy. Value-add opportunity through unit renovations and common area upgrades..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="sa-card-title">Offering Structure</h2>
            <p className="sa-card-desc">
              How do you want to structure the fractional offering? Remember: your investors will be
              everyday people — keep minimums accessible and terms clear.
            </p>

            <div className="sa-row">
              <div className="sa-field">
                <label className="sa-label">Total Capital Raise *</label>
                <div className="sa-options">
                  {RAISE_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`sa-option ${form.raiseAmount === r ? 'selected' : ''}`}
                      onClick={() => set('raiseAmount', r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sa-field">
                <label className="sa-label">
                  Target Annual Return <span className="sa-label-hint">(%)</span>
                </label>
                <input
                  className="sa-input"
                  type="text"
                  placeholder="e.g. 8.5"
                  value={form.targetReturn}
                  onChange={(e) => set('targetReturn', e.target.value)}
                />
              </div>
            </div>

            <div className="sa-row">
              <div className="sa-field">
                <label className="sa-label">Projected Hold Period *</label>
                <div className="sa-options">
                  {HOLD_PERIODS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`sa-option ${form.holdPeriod === h ? 'selected' : ''}`}
                      onClick={() => set('holdPeriod', h)}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sa-field">
                <label className="sa-label">Minimum Investment Per Investor *</label>
                <div className="sa-options">
                  {MIN_INVEST_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`sa-option ${form.minInvestment === m ? 'selected' : ''}`}
                      onClick={() => set('minInvestment', m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sa-field">
              <label className="sa-label">
                Why Ezana?{' '}
                <span className="sa-label-hint">(why do you want to raise on our platform?)</span>
              </label>
              <textarea
                className="sa-textarea"
                placeholder="We want to democratize access to our properties and connect with a community of engaged retail investors..."
                value={form.whyEzana}
                onChange={(e) => set('whyEzana', e.target.value)}
              />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="sa-card-title">Review Your Application</h2>
            <p className="sa-card-desc">
              Please review your information before submitting. Our team will review within 48
              hours.
            </p>

            <div className="sa-review-grid">
              {[
                { label: 'Name', value: form.fullName },
                { label: 'Email', value: form.email },
                { label: 'Company', value: form.company },
                { label: 'Role', value: form.role },
                { label: 'Property', value: form.propertyName },
                { label: 'Type', value: form.propertyType },
                { label: 'Location', value: form.location },
                { label: 'Raise Amount', value: form.raiseAmount },
                {
                  label: 'Target Return',
                  value: form.targetReturn ? `${form.targetReturn}%` : '—',
                },
                { label: 'Hold Period', value: form.holdPeriod },
                { label: 'Min Investment', value: form.minInvestment },
                { label: 'Website', value: form.website || '—' },
              ].map((item) => (
                <div key={item.label} className="sa-review-item">
                  <div className="sa-review-label">{item.label}</div>
                  <div className="sa-review-value">{item.value}</div>
                </div>
              ))}
            </div>

            {form.description && (
              <div className="sa-field" style={{ marginTop: '0.75rem' }}>
                <div className="sa-review-label">Property Description</div>
                <p
                  style={{
                    fontSize: '0.65rem',
                    color: '#c9d1d9',
                    lineHeight: 1.5,
                    margin: '0.2rem 0 0',
                  }}
                >
                  {form.description}
                </p>
              </div>
            )}

            {form.whyEzana && (
              <div className="sa-field" style={{ marginTop: '0.5rem' }}>
                <div className="sa-review-label">Why Ezana</div>
                <p
                  style={{
                    fontSize: '0.65rem',
                    color: '#c9d1d9',
                    lineHeight: 1.5,
                    margin: '0.2rem 0 0',
                  }}
                >
                  {form.whyEzana}
                </p>
              </div>
            )}
          </>
        )}

        <div className="sa-nav">
          {step > 1 ? (
            <button type="button" className="sa-btn-back" onClick={() => setStep(step - 1)}>
              <i className="bi bi-arrow-left" /> Back
            </button>
          ) : (
            <button
              type="button"
              className="sa-btn-back"
              onClick={() => router.push('/real-estate')}
            >
              <i className="bi bi-arrow-left" /> Marketplace
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              className="sa-btn-next"
              disabled={!canAdvance()}
              onClick={() => setStep(step + 1)}
              style={!canAdvance() ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
            >
              Next <i className="bi bi-arrow-right" />
            </button>
          ) : (
            <button type="button" className="sa-btn-submit" onClick={handleSubmit}>
              <i className="bi bi-send" /> Submit Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PLANS } from '@/config/pricing';
import '../../../app-legacy/assets/css/theme.css';
import '../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../app-legacy/assets/css/pages-common.css';
import '../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../settings/settings.css';
import './onboarding.css';

const STEPS = [
  { key: 'details', label: 'My Details', number: 1 },
  { key: 'profile', label: 'Profile', number: 2 },
  { key: 'notifications', label: 'Notifications', number: 3 },
  { key: 'plan', label: 'Plan & Billing', number: 4 },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT',
  'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const CA_PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const [formData, setFormData] = useState({
    phone: '',
    date_of_birth: '',
    country: 'United States',
    state: '',
    city: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    display_name: '',
    bio: '',
    investor_type: 'retail_investor',
    experience_level: 'intermediate',
    website: '',
    twitter: '',
    linkedin: '',
    privacy_show_profile: true,
    privacy_show_portfolio: false,
    privacy_show_trades: false,
    privacy_show_holdings: false,
    privacy_show_activity: true,
    privacy_show_watchlist: false,
    privacy_show_on_leaderboard: true,
    notifications_email_trades: true,
    notifications_email_alerts: true,
    notifications_email_community: false,
    notifications_email_newsletter: true,
    notifications_desktop_enabled: false,
    email_digest_frequency: 'weekly',
    email_transactional_confirmations: true,
    email_security_alerts: true,
    email_marketing: false,
  });

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (currentStep) => {
    setError('');
    switch (currentStep) {
      case 0: // My Details
        if (!formData.phone?.trim()) {
          setError('Phone number is required');
          return false;
        }
        if (!formData.date_of_birth) {
          setError('Date of birth is required');
          return false;
        }
        if (!formData.country) {
          setError('Country is required');
          return false;
        }
        if (!formData.state) {
          setError('State/Province is required');
          return false;
        }
        if (!formData.city?.trim()) {
          setError('City is required');
          return false;
        }
        return true;
      case 1: // Profile
        if (!formData.display_name?.trim()) {
          setError('Display name is required');
          return false;
        }
        if (!formData.investor_type) {
          setError('Investor type is required');
          return false;
        }
        if (!formData.experience_level) {
          setError('Experience level is required');
          return false;
        }
        return true;
      case 2: // Notifications
        return true;
      case 3: // Plan & Billing
        return true;
      default:
        return true;
    }
  };

  const saveProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('profiles').upsert({
      id: user.id,
      phone: formData.phone,
      date_of_birth: formData.date_of_birth,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      display_name: formData.display_name,
      bio: formData.bio,
      investor_type: formData.investor_type,
      experience_level: formData.experience_level,
      website: formData.website || null,
      twitter: formData.twitter || null,
      linkedin: formData.linkedin || null,
      timezone: formData.timezone,
      user_settings: formData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  };

  const handleContinue = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    try {
      await saveProgress();
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      }
    } catch (err) {
      setError(err.message || 'Failed to save progress');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planKey) => {
    setSelectedPlan(planKey);
    setCheckoutLoading(true);
    setError('');

    try {
      await saveProgress();

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          cancelPath: '/onboarding',
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to start checkout');
        setCheckoutLoading(false);
        setSelectedPlan(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to process');
      setCheckoutLoading(false);
      setSelectedPlan(null);
    }
  };

  const getStateOptions = () => {
    return formData.country === 'Canada' ? CA_PROVINCES : US_STATES;
  };

  const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const monthlyPlans = Object.entries(PLANS).filter(([key]) => key.includes('monthly'));
  const annualPlans = Object.entries(PLANS).filter(([key]) => key.includes('annual'));
  const visiblePlans = billingCycle === 'monthly' ? monthlyPlans : annualPlans;

  return (
    <div className="onboarding-page dashboard-page-inset">
      {/* Progress Bar */}
      <div className="onboarding-progress-container">
        <div className="onboarding-progress">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`onboarding-step ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}>
              <div className="onboarding-step-dot">
                {i < step ? '✓' : s.number}
              </div>
              <span className="onboarding-step-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="onboarding-content">
        {error && (
          <div className="onboarding-error">
            <i className="bi bi-exclamation-circle-fill" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: My Details */}
        {step === 0 && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Tell us about yourself</h2>
              <p className="settings-panel-desc">We just need some basic information to get started.</p>
            </div>

            <div className="settings-section">
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Phone number *</label>
                  <input
                    type="tel"
                    className="settings-input"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Date of birth *</label>
                  <input
                    type="date"
                    className="settings-input"
                    value={formData.date_of_birth}
                    onChange={(e) => updateFormData('date_of_birth', e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Country *</label>
                  <select
                    className="settings-input"
                    value={formData.country}
                    onChange={(e) => {
                      updateFormData('country', e.target.value);
                      updateFormData('state', '');
                    }}
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-label">State / Province *</label>
                  <select
                    className="settings-input"
                    value={formData.state}
                    onChange={(e) => updateFormData('state', e.target.value)}
                  >
                    <option value="">Select {formData.country === 'Canada' ? 'Province' : 'State'}</option>
                    {getStateOptions().map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">City *</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="New York"
                    value={formData.city}
                    onChange={(e) => updateFormData('city', e.target.value)}
                  />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Timezone *</label>
                  <select
                    className="settings-input"
                    value={formData.timezone}
                    onChange={(e) => updateFormData('timezone', e.target.value)}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Profile */}
        {step === 1 && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Create your profile</h2>
              <p className="settings-panel-desc">Set your display name and investment preferences.</p>
            </div>

            <div className="settings-section">
              <div className="settings-row single">
                <div className="settings-field">
                  <label className="settings-label">Display name *</label>
                  <input
                    type="text"
                    className="settings-input"
                    placeholder="Your public name"
                    value={formData.display_name}
                    onChange={(e) => updateFormData('display_name', e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-row single">
                <div className="settings-field">
                  <label className="settings-label">Short bio (optional)</label>
                  <textarea
                    className="settings-input"
                    placeholder="Tell us about yourself"
                    rows="3"
                    value={formData.bio}
                    onChange={(e) => updateFormData('bio', e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Investor type *</label>
                  <select
                    className="settings-input"
                    value={formData.investor_type}
                    onChange={(e) => updateFormData('investor_type', e.target.value)}
                  >
                    <option value="retail_investor">Retail Investor</option>
                    <option value="day_trader">Day Trader</option>
                    <option value="swing_trader">Swing Trader</option>
                    <option value="long_term_investor">Long-term Investor</option>
                    <option value="institutional">Institutional</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-label">Experience level *</label>
                  <select
                    className="settings-input"
                    value={formData.experience_level}
                    onChange={(e) => updateFormData('experience_level', e.target.value)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Personal website (optional)</label>
                  <input
                    type="url"
                    className="settings-input"
                    placeholder="https://yourwebsite.com"
                    value={formData.website}
                    onChange={(e) => updateFormData('website', e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Twitter handle (optional)</label>
                  <div className="settings-input-row">
                    <span className="settings-input-prefix">@</span>
                    <input
                      type="text"
                      className="settings-input"
                      placeholder="handle"
                      value={formData.twitter}
                      onChange={(e) => updateFormData('twitter', e.target.value)}
                    />
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-label">LinkedIn URL (optional)</label>
                  <input
                    type="url"
                    className="settings-input"
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedin}
                    onChange={(e) => updateFormData('linkedin', e.target.value)}
                  />
                </div>
              </div>

              {/* Privacy Toggles */}
              <div className="settings-section-title" style={{ marginTop: '2rem' }}>Privacy Settings</div>

              <div className="onboarding-privacy-toggles">
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Show my profile to other users</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.privacy_show_profile}
                    onChange={(e) => updateFormData('privacy_show_profile', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Show my portfolio publicly</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.privacy_show_portfolio}
                    onChange={(e) => updateFormData('privacy_show_portfolio', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Show my trades publicly</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.privacy_show_trades}
                    onChange={(e) => updateFormData('privacy_show_trades', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Show my holdings</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.privacy_show_holdings}
                    onChange={(e) => updateFormData('privacy_show_holdings', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Show my activity in the community feed</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.privacy_show_activity}
                    onChange={(e) => updateFormData('privacy_show_activity', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Show my watchlist</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.privacy_show_watchlist}
                    onChange={(e) => updateFormData('privacy_show_watchlist', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Show me on the leaderboard</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.privacy_show_on_leaderboard}
                    onChange={(e) => updateFormData('privacy_show_on_leaderboard', e.target.checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Notifications */}
        {step === 2 && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Email & notifications</h2>
              <p className="settings-panel-desc">Choose how you'd like to stay updated.</p>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Email Notifications</div>

              <div className="onboarding-privacy-toggles">
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Trade confirmations</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.notifications_email_trades}
                    onChange={(e) => updateFormData('notifications_email_trades', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Price alerts</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.notifications_email_alerts}
                    onChange={(e) => updateFormData('notifications_email_alerts', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Community replies and mentions</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.notifications_email_community}
                    onChange={(e) => updateFormData('notifications_email_community', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Weekly newsletter</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.notifications_email_newsletter}
                    onChange={(e) => updateFormData('notifications_email_newsletter', e.target.checked)}
                  />
                </div>
              </div>

              <div className="settings-section-title" style={{ marginTop: '2rem' }}>Email Preferences</div>

              <div className="settings-row single">
                <div className="settings-field">
                  <label className="settings-label">Email digest frequency</label>
                  <select
                    className="settings-input"
                    value={formData.email_digest_frequency}
                    onChange={(e) => updateFormData('email_digest_frequency', e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>

              <div className="onboarding-privacy-toggles">
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Transactional confirmations (trades, deposits)</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.email_transactional_confirmations}
                    onChange={(e) => updateFormData('email_transactional_confirmations', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Security alerts (login from new device)</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.email_security_alerts}
                    onChange={(e) => updateFormData('email_security_alerts', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Marketing emails</span>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.email_marketing}
                    onChange={(e) => updateFormData('email_marketing', e.target.checked)}
                  />
                </div>
                <div className="onboarding-toggle-row">
                  <div className="onboarding-toggle-label">
                    <span className="onboarding-toggle-title">Push notifications in your browser</span>
                    <p className="onboarding-toggle-hint">Turning this on will request browser permission</p>
                  </div>
                  <input
                    type="checkbox"
                    className="onboarding-toggle"
                    checked={formData.notifications_desktop_enabled}
                    onChange={(e) => updateFormData('notifications_desktop_enabled', e.target.checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Plan & Billing */}
        {step === 3 && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Choose your plan</h2>
              <p className="settings-panel-desc">Start your 7-day free trial on any plan.</p>
            </div>

            <div className="settings-section">
              {/* Billing Cycle Toggle */}
              <div className="onboarding-billing-toggle-container">
                <button
                  type="button"
                  className={`onboarding-billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`onboarding-billing-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('annual')}
                >
                  Annual <span className="onboarding-save-badge">Save 20%</span>
                </button>
              </div>

              {/* Plan Cards */}
              <div className="onboarding-plans-grid">
                {visiblePlans.map(([key, plan]) => (
                  <div key={key} className={`onboarding-plan-card ${plan.popular ? 'popular' : ''} ${selectedPlan === key ? 'selected' : ''}`}>
                    <div className="onboarding-plan-header">
                      <h3 className="onboarding-plan-name">{plan.name}</h3>
                      {plan.popular && <span className="onboarding-plan-badge">MOST POPULAR</span>}
                    </div>

                    <div className="onboarding-plan-pricing">
                      <span className="onboarding-price">${plan.price}</span>
                      <span className="onboarding-price-period">/{plan.interval === 'month' ? 'mo' : 'yr'}</span>
                    </div>

                    <ul className="onboarding-plan-features">
                      {plan.features.map((feature, idx) => (
                        <li key={idx}>
                          <i className="bi bi-check2" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="onboarding-plan-button"
                      onClick={() => handleSelectPlan(key)}
                      disabled={checkoutLoading && selectedPlan === key}
                    >
                      {checkoutLoading && selectedPlan === key ? 'Loading...' : 'Select plan'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Trial Info */}
              <div className="onboarding-trial-info">
                <div className="onboarding-trial-header">7-DAY FREE TRIAL ON ALL PLANS</div>
                <p className="onboarding-trial-text">
                  You won't be charged until <strong>{trialEndDate}</strong>. Cancel anytime with no charge.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="onboarding-actions">
        {step > 0 && (
          <button
            type="button"
            className="onboarding-btn-secondary"
            onClick={() => setStep(step - 1)}
            disabled={loading}
          >
            ← Back
          </button>
        )}

        {step < STEPS.length - 1 && (
          <button
            type="button"
            className="onboarding-btn-primary"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Continue →'}
          </button>
        )}
      </div>
    </div>
  );
}

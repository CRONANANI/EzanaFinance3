'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PLANS } from '@/config/pricing';
import { useOrg } from '@/contexts/OrgContext';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../settings/settings.css';
import './onboarding.css';

const REGULAR_STEPS = [
  { key: 'details', label: 'My Details', number: 1 },
  { key: 'profile', label: 'Profile', number: 2 },
  { key: 'notifications', label: 'Notifications', number: 3 },
  { key: 'plan', label: 'Plan & Billing', number: 4 },
];

const ORG_STEPS = [
  { key: 'details', label: 'My Details', number: 1 },
  { key: 'org_profile', label: 'Your Role', number: 2 },
  { key: 'notifications', label: 'Notifications', number: 3 },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];
const CA_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
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
  const { isOrgUser, orgRole, orgData, isLoading: orgLoading } = useOrg();
  const STEPS = isOrgUser ? ORG_STEPS : REGULAR_STEPS;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [initialLoaded, setInitialLoaded] = useState(false);

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

  useEffect(() => {
    async function restore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInitialLoaded(true);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_step, user_settings')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.onboarding_step > 0) {
          setStep(Math.min(profile.onboarding_step, STEPS.length - 1));
        }
        if (profile.user_settings && typeof profile.user_settings === 'object') {
          setFormData((prev) => ({ ...prev, ...profile.user_settings }));
        }
      }
      setInitialLoaded(true);
    }
    if (!orgLoading) restore();
  }, [orgLoading, STEPS.length]);

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (currentStep) => {
    setError('');
    const stepKey = STEPS[currentStep]?.key;

    if (stepKey === 'details') {
      if (!formData.phone?.trim()) { setError('Phone number is required'); return false; }
      if (!formData.date_of_birth) { setError('Date of birth is required'); return false; }
      if (!formData.country) { setError('Country is required'); return false; }
      if (!formData.state) { setError('State/Province is required'); return false; }
      if (!formData.city?.trim()) { setError('City is required'); return false; }
      return true;
    }
    if (stepKey === 'profile') {
      if (!formData.display_name?.trim()) { setError('Display name is required'); return false; }
      if (!formData.investor_type) { setError('Investor type is required'); return false; }
      if (!formData.experience_level) { setError('Experience level is required'); return false; }
      return true;
    }
    if (stepKey === 'org_profile') {
      if (!formData.display_name?.trim()) { setError('Display name is required'); return false; }
      return true;
    }
    return true;
  };

  const saveProgress = async (targetStep) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: saveErr } = await supabase.from('profiles').upsert({
      id: user.id,
      phone: formData.phone || null,
      date_of_birth: formData.date_of_birth || null,
      country: formData.country || null,
      state: formData.state || null,
      city: formData.city || null,
      display_name: formData.display_name || null,
      bio: formData.bio || null,
      investor_type: formData.investor_type || null,
      experience_level: formData.experience_level || null,
      website: formData.website || null,
      twitter: formData.twitter || null,
      linkedin: formData.linkedin || null,
      timezone: formData.timezone || null,
      user_settings: formData,
      onboarding_step: targetStep,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (saveErr) console.error('[Onboarding] Save error:', saveErr);
  };

  const handleContinue = async () => {
    if (!validateStep(step)) return;
    setLoading(true);
    try {
      const nextStep = step + 1;
      await saveProgress(nextStep);
      if (step < STEPS.length - 1) {
        setStep(nextStep);
      }
    } catch (err) {
      setError(err.message || 'Failed to save progress');
    } finally {
      setLoading(false);
    }
  };

  const handleOrgComplete = async () => {
    if (!validateStep(step)) return;
    setLoading(true);
    try {
      await saveProgress(STEPS.length);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          onboarding_completed: true,
          has_seen_tutorial: false,
        }).eq('id', user.id);
      }
      router.push('/home');
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planKey) => {
    setSelectedPlan(planKey);
    setCheckoutLoading(true);
    setError('');
    try {
      await saveProgress(STEPS.length);
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, cancelPath: '/onboarding' }),
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

  const getStateOptions = () => (formData.country === 'Canada' ? CA_PROVINCES : US_STATES);

  const monthlyPlans = Object.entries(PLANS).filter(([, p]) => p.interval === 'month');
  const annualPlans = Object.entries(PLANS).filter(([, p]) => p.interval === 'year');
  const visiblePlans = billingCycle === 'monthly' ? monthlyPlans : annualPlans;
  const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  if (!initialLoaded || orgLoading) {
    return (
      <div className="onboarding-page">
        <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>Loading onboarding…</div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-stepper">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`onboarding-step ${i === step ? 'active' : i < step ? 'completed' : ''}`}>
            <div className="onboarding-step-number">{i < step ? '✓' : s.number}</div>
            <span className="onboarding-step-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="onboarding-body">
        {error && (
          <div className="onboarding-error">
            <i className="bi bi-exclamation-triangle" /> {error}
          </div>
        )}

        {STEPS[step]?.key === 'details' && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">My Details</h2>
              <p className="settings-panel-desc">Tell us a bit about yourself.</p>
            </div>
            <div className="settings-section">
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Phone number *</label>
                  <input type="tel" className="settings-input" value={formData.phone} onChange={(e) => updateFormData('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Date of birth *</label>
                  <input type="date" className="settings-input" value={formData.date_of_birth} onChange={(e) => updateFormData('date_of_birth', e.target.value)} />
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Country *</label>
                  <select className="settings-input" value={formData.country} onChange={(e) => updateFormData('country', e.target.value)}>
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-label">State / Province *</label>
                  <select className="settings-input" value={formData.state} onChange={(e) => updateFormData('state', e.target.value)}>
                    <option value="">Select…</option>
                    {getStateOptions().map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">City *</label>
                  <input type="text" className="settings-input" value={formData.city} onChange={(e) => updateFormData('city', e.target.value)} placeholder="Your city" />
                </div>
                <div className="settings-field">
                  <label className="settings-label">Timezone</label>
                  <select className="settings-input" value={formData.timezone} onChange={(e) => updateFormData('timezone', e.target.value)}>
                    {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isOrgUser && STEPS[step]?.key === 'profile' && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Profile</h2>
              <p className="settings-panel-desc">Set up your public profile and investor preferences.</p>
            </div>
            <div className="settings-section">
              <div className="settings-row single">
                <div className="settings-field">
                  <label className="settings-label">Display name *</label>
                  <input type="text" className="settings-input" value={formData.display_name} onChange={(e) => updateFormData('display_name', e.target.value)} placeholder="How you appear on the platform" />
                </div>
              </div>
              <div className="settings-row single">
                <div className="settings-field">
                  <label className="settings-label">Bio</label>
                  <textarea className="settings-input" rows={3} value={formData.bio} onChange={(e) => updateFormData('bio', e.target.value)} placeholder="Tell other investors about yourself" style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Investor type *</label>
                  <select className="settings-input" value={formData.investor_type} onChange={(e) => updateFormData('investor_type', e.target.value)}>
                    <option value="retail_investor">Retail Investor</option>
                    <option value="day_trader">Day Trader</option>
                    <option value="swing_trader">Swing Trader</option>
                    <option value="long_term">Long-term Investor</option>
                    <option value="institutional">Institutional</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label className="settings-label">Experience level *</label>
                  <select className="settings-input" value={formData.experience_level} onChange={(e) => updateFormData('experience_level', e.target.value)}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-field"><label className="settings-label">Website</label><input type="url" className="settings-input" value={formData.website} onChange={(e) => updateFormData('website', e.target.value)} placeholder="https://" /></div>
                <div className="settings-field"><label className="settings-label">Twitter</label><input type="text" className="settings-input" value={formData.twitter} onChange={(e) => updateFormData('twitter', e.target.value)} placeholder="@handle" /></div>
              </div>
              <div className="settings-row single">
                <div className="settings-field"><label className="settings-label">LinkedIn</label><input type="url" className="settings-input" value={formData.linkedin} onChange={(e) => updateFormData('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
              </div>
            </div>
          </div>
        )}

        {isOrgUser && STEPS[step]?.key === 'org_profile' && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Your Role at {orgData?.org?.name || 'Your Organization'}</h2>
              <p className="settings-panel-desc">Tell us about your position in the investment council.</p>
            </div>
            <div className="settings-section">
              <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)', marginBottom: '1.5rem' }}>
                <p style={{ color: '#6366f1', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                  {orgRole === 'executive' ? '🏛️ Executive' : orgRole === 'portfolio_manager' ? '📊 Portfolio Manager' : '📈 Analyst'}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>
                  {orgRole === 'executive' && 'You have oversight of all teams and portfolios.'}
                  {orgRole === 'portfolio_manager' && `You manage the ${orgData?.team?.name || 'your team'} portfolio and analysts.`}
                  {orgRole === 'analyst' && `You are an analyst on the ${orgData?.team?.name || 'your'} team.`}
                </p>
              </div>
              <div className="settings-row single">
                <div className="settings-field"><label className="settings-label">Display name *</label><input type="text" className="settings-input" value={formData.display_name} onChange={(e) => updateFormData('display_name', e.target.value)} placeholder="How you appear to your team" /></div>
              </div>
              <div className="settings-row single">
                <div className="settings-field"><label className="settings-label">Short bio</label><textarea className="settings-input" rows={3} value={formData.bio} onChange={(e) => updateFormData('bio', e.target.value)} placeholder="Your background, interests, or focus areas" style={{ resize: 'vertical' }} /></div>
              </div>
              <div className="settings-row">
                <div className="settings-field">
                  <label className="settings-label">Year of study</label>
                  <select className="settings-input" value={formData.experience_level} onChange={(e) => updateFormData('experience_level', e.target.value)}>
                    <option value="freshman">Freshman</option>
                    <option value="sophomore">Sophomore</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="graduate">Graduate Student</option>
                    <option value="alumni">Alumni</option>
                  </select>
                </div>
                <div className="settings-field"><label className="settings-label">LinkedIn (optional)</label><input type="url" className="settings-input" value={formData.linkedin} onChange={(e) => updateFormData('linkedin', e.target.value)} placeholder="https://linkedin.com/in/you" /></div>
              </div>
            </div>
          </div>
        )}

        {STEPS[step]?.key === 'notifications' && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Notifications</h2>
              <p className="settings-panel-desc">Choose what you want to be notified about.</p>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">Email Notifications</div>
              <div className="onboarding-privacy-toggles">
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Trade confirmations &amp; alerts</span></div><input type="checkbox" className="onboarding-toggle" checked={formData.notifications_email_trades} onChange={(e) => updateFormData('notifications_email_trades', e.target.checked)} /></div>
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Price alerts</span></div><input type="checkbox" className="onboarding-toggle" checked={formData.notifications_email_alerts} onChange={(e) => updateFormData('notifications_email_alerts', e.target.checked)} /></div>
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Community replies and mentions</span></div><input type="checkbox" className="onboarding-toggle" checked={formData.notifications_email_community} onChange={(e) => updateFormData('notifications_email_community', e.target.checked)} /></div>
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Weekly newsletter</span></div><input type="checkbox" className="onboarding-toggle" checked={formData.notifications_email_newsletter} onChange={(e) => updateFormData('notifications_email_newsletter', e.target.checked)} /></div>
              </div>
              <div className="settings-section-title" style={{ marginTop: '2rem' }}>Email Preferences</div>
              <div className="settings-row single"><div className="settings-field"><label className="settings-label">Email digest frequency</label><select className="settings-input" value={formData.email_digest_frequency} onChange={(e) => updateFormData('email_digest_frequency', e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="never">Never</option></select></div></div>
              <div className="onboarding-privacy-toggles">
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Transactional confirmations (trades, deposits)</span></div><input type="checkbox" className="onboarding-toggle" checked={formData.email_transactional_confirmations} onChange={(e) => updateFormData('email_transactional_confirmations', e.target.checked)} /></div>
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Security alerts (login from new device)</span></div><input type="checkbox" className="onboarding-toggle" checked={formData.email_security_alerts} onChange={(e) => updateFormData('email_security_alerts', e.target.checked)} /></div>
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Marketing emails</span></div><input type="checkbox" className="onboarding-toggle" checked={formData.email_marketing} onChange={(e) => updateFormData('email_marketing', e.target.checked)} /></div>
                <div className="onboarding-toggle-row"><div className="onboarding-toggle-label"><span className="onboarding-toggle-title">Push notifications in your browser</span><p className="onboarding-toggle-hint">Turning this on will request browser permission</p></div><input type="checkbox" className="onboarding-toggle" checked={formData.notifications_desktop_enabled} onChange={(e) => updateFormData('notifications_desktop_enabled', e.target.checked)} /></div>
              </div>
            </div>
          </div>
        )}

        {!isOrgUser && STEPS[step]?.key === 'plan' && (
          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2 className="settings-panel-title">Choose your plan</h2>
              <p className="settings-panel-desc">Start your 7-day free trial on any plan.</p>
            </div>
            <div className="settings-section">
              <div className="onboarding-billing-toggle-container">
                <button type="button" className={`onboarding-billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`} onClick={() => setBillingCycle('monthly')}>Monthly</button>
                <button type="button" className={`onboarding-billing-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`} onClick={() => setBillingCycle('annual')}>Annual <span className="onboarding-save-badge">Save 20%</span></button>
              </div>
              <div className="onboarding-plans-grid">
                {visiblePlans.map(([key, plan]) => (
                  <div key={key} className={`onboarding-plan-card ${plan.popular ? 'popular' : ''} ${selectedPlan === key ? 'selected' : ''}`}>
                    <div className="onboarding-plan-header"><h3 className="onboarding-plan-name">{plan.name}</h3>{plan.popular && <span className="onboarding-plan-badge">MOST POPULAR</span>}</div>
                    <div className="onboarding-plan-pricing"><span className="onboarding-price">${plan.price}</span><span className="onboarding-price-period">/{plan.interval === 'month' ? 'mo' : 'yr'}</span></div>
                    <ul className="onboarding-plan-features">{plan.features.map((f, i) => <li key={i}><i className="bi bi-check2" />{f}</li>)}</ul>
                    <button type="button" className="onboarding-plan-button" onClick={() => handleSelectPlan(key)} disabled={checkoutLoading && selectedPlan === key}>{checkoutLoading && selectedPlan === key ? 'Loading...' : 'Select plan'}</button>
                  </div>
                ))}
              </div>
              <div className="onboarding-trial-info"><div className="onboarding-trial-header">7-DAY FREE TRIAL ON ALL PLANS</div><p className="onboarding-trial-text">You won&apos;t be charged until <strong>{trialEndDate}</strong>. Cancel anytime with no charge.</p></div>
            </div>
          </div>
        )}
      </div>

      <div className="onboarding-actions">
        {step > 0 && (
          <button type="button" className="onboarding-btn-secondary" onClick={() => setStep(step - 1)} disabled={loading}>← Back</button>
        )}

        {step < STEPS.length - 1 && (
          <button type="button" className="onboarding-btn-primary" onClick={handleContinue} disabled={loading}>{loading ? 'Saving…' : 'Continue →'}</button>
        )}

        {isOrgUser && step === STEPS.length - 1 && (
          <button type="button" className="onboarding-btn-primary" onClick={handleOrgComplete} disabled={loading}>{loading ? 'Completing…' : 'Complete Setup →'}</button>
        )}
      </div>
    </div>
  );
}

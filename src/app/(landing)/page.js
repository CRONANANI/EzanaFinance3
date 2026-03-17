'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import './landing.css';

/* ═══════════════════════════════════════════════════════
   EZANA FINANCE — MAIN LANDING PAGE REDESIGN
   Inspired by Traders Hub Dribbble (Mirhayot for Eloqwnt)
   Keeps: Globe, News ticker, Top nav, Trusted-by logos,
          Data Sources section
   Adds:  Chatbot widget, Why Ezana cards, Features tabs,
          Pricing horizontal scroll, Trade Smarter section,
          FAQ accordion, New footer
   ═══════════════════════════════════════════════════════ */

/* ── Intersection Observer hook for scroll animations ── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ═══ SECTION: Chatbot Widget ═══ */
function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('consent');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });

  return (
    <div className="lp-chatbot">
      {open && (
        <div className="lp-chat-panel">
          {step === 'consent' && (
            <div className="lp-chat-consent">
              <div className="lp-chat-avatar"><i className="bi bi-robot" /></div>
              <p>Hello! We&apos;d like to talk to you. Under our privacy policy, we need your approval for the use of personal information (e.g. your name and email). Is this ok with you?</p>
              <div className="lp-chat-consent-btns">
                <button type="button" className="lp-chat-btn-ghost" onClick={() => setOpen(false)}>Not now</button>
                <button type="button" className="lp-chat-btn-primary" onClick={() => setStep('form')}>I accept <i className="bi bi-check2" /></button>
              </div>
            </div>
          )}
          {step === 'form' && (
            <div className="lp-chat-form">
              <p className="lp-chat-form-title">Please fill out the form below and we will get back to you as soon as possible.</p>
              <input type="text" placeholder="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input type="email" placeholder="Email *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <input type="tel" placeholder="Phone Number *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <textarea placeholder="Message" rows={3} value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
              <button type="button" className="lp-chat-btn-primary full" onClick={() => setStep('thanks')}>Send Message</button>
            </div>
          )}
          {step === 'thanks' && (
            <div className="lp-chat-thanks">
              <i className="bi bi-check-circle-fill" />
              <p>Thank you! We&apos;ll be in touch shortly.</p>
              <button type="button" className="lp-chat-btn-ghost" onClick={() => { setOpen(false); setStep('consent'); }}>Close</button>
            </div>
          )}
        </div>
      )}
      <button type="button" className="lp-chat-fab" onClick={() => setOpen(!open)} aria-label="Chat with us">
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-chat-dots-fill'}`} />
      </button>
    </div>
  );
}

/* ═══ SECTION: Hero ═══ */
function HeroSection() {
  const [heroRef, heroIn] = useInView(0.1);
  return (
    <section ref={heroRef} className={`lp-hero ${heroIn ? 'in' : ''}`}>
      <div className="lp-hero-overlay">
        <span className="lp-hero-badge"><i className="bi bi-bar-chart-fill" /> Ezana Finance</span>
        <h1 className="lp-hero-h1">
          Your Gateway to<br />
          <span className="lp-hero-accent">Smarter Investing</span>
        </h1>
        <p className="lp-hero-sub">
          Track congressional trades, institutional 13F filings, and market movements — with AI-powered tools, real-time data, and actionable intelligence.
        </p>
        <div className="lp-hero-ctas">
          <Link href="/register" className="lp-btn-primary">Open Account</Link>
          <Link href="/market-analysis" className="lp-btn-outline">Explore Markets <i className="bi bi-arrow-right" /></Link>
        </div>
      </div>
    </section>
  );
}

/* ═══ SECTION: Why Ezana Finance ═══ */
function WhyEzanaSection() {
  const [ref, inView] = useInView(0.12);
  const cards = [
    {
      title: 'Congressional Trade Tracking',
      desc: 'Monitor every stock trade made by U.S. senators and representatives. See what politicians are buying before the market reacts.',
      cta: 'Track Trades',
      href: '/inside-the-capitol',
      visual: 'capitol',
    },
    {
      title: 'Institutional Intelligence',
      desc: 'Follow 13F filings from hedge funds and institutional investors. See where the smart money is flowing in real-time.',
      cta: 'View 13F Data',
      href: '/for-the-quants',
      visual: 'quants',
    },
    {
      stat: '50+',
      statLabel: 'Data Sources',
      title: 'Comprehensive Market Data',
      desc: 'Aggregated from government filings, market feeds, and alternative data — everything you need in one platform.',
      cta: 'Explore Data',
      href: '/market-analysis',
      visual: 'data',
    },
  ];

  return (
    <section ref={ref} className={`lp-why ${inView ? 'in' : ''}`}>
      <span className="lp-section-badge"><i className="bi bi-shield-check" /> About Ezana Finance</span>
      <h2 className="lp-section-h2">Smarter Data.<br />Better Decisions.</h2>
      <p className="lp-section-sub">Focused on transparency, alternative data, and giving retail investors an institutional edge.</p>
      <div className="lp-why-grid">
        {cards.map((c, i) => (
          <div key={i} className={`lp-why-card ${c.visual}`} style={{ animationDelay: `${i * 0.15}s` }}>
            <div className="lp-why-card-inner">
              {c.stat && (
                <div className="lp-why-stat">
                  <span className="lp-why-stat-label">{c.statLabel}</span>
                  <span className="lp-why-stat-num">{c.stat}</span>
                </div>
              )}
              <h3 className="lp-why-card-title">{c.title}</h3>
              <p className="lp-why-card-desc">{c.desc}</p>
              <Link href={c.href} className="lp-why-card-cta">{c.cta}</Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ SECTION: Trusted By (KEEP existing) ═══ */
function TrustedBySection() {
  return (
    <section className="lp-trusted-placeholder">
      {/* Existing "Trusted by Industry Leaders" section renders here — no changes */}
    </section>
  );
}

/* ═══ SECTION: Features ═══ */
function FeaturesSection() {
  const [ref, inView] = useInView(0.1);
  const [activeTab, setActiveTab] = useState(0);
  const features = [
    {
      icon: 'bi-bank',
      tab: 'Congressional Trades',
      title: 'Inside the Capitol',
      desc: 'Track stock and options trades reported by members of Congress under the STOCK Act. Filter by politician, party, sector, or trade type.',
      tags: ['STOCK Act', 'Senate', 'House', 'Options'],
      cta: 'Track Congress',
      href: '/inside-the-capitol',
    },
    {
      icon: 'bi-graph-up-arrow',
      tab: 'Market Analysis',
      title: 'Global Market Monitor',
      desc: 'Interactive world map with live market data from every major financial center. Layer overlays for indices, currencies, commodities, and volatility.',
      tags: ['Real-Time', 'Global', 'Multi-Layer'],
      cta: 'Explore Markets',
      href: '/market-analysis',
    },
    {
      icon: 'bi-building',
      tab: '13F Filings',
      title: 'For the Quants',
      desc: 'Institutional investor tracking powered by SEC 13F filings. See what Citadel, Bridgewater, Renaissance, and hundreds of hedge funds are holding.',
      tags: ['Hedge Funds', 'SEC Filings', '13F'],
      cta: 'View Filings',
      href: '/for-the-quants',
    },
    {
      icon: 'bi-bar-chart-steps',
      tab: 'Betting Markets',
      title: 'Prediction Markets',
      desc: 'Real-time odds and sentiment from political and economic prediction markets. Gauge market consensus on elections, Fed decisions, and policy outcomes.',
      tags: ['Polymarket', 'Kalshi', 'Sentiment'],
      cta: 'View Markets',
      href: '/betting-markets',
    },
    {
      icon: 'bi-people',
      tab: 'Community',
      title: 'Investor Community',
      desc: 'Connect with like-minded investors, share research, follow top performers, and learn from legendary investors — all in one place.',
      tags: ['Social', 'Research', 'Leaderboards'],
      cta: 'Join Community',
      href: '/community',
    },
  ];
  const f = features[activeTab];

  return (
    <section ref={ref} className={`lp-features ${inView ? 'in' : ''}`}>
      <span className="lp-section-badge"><i className="bi bi-grid-3x3-gap-fill" /> Our Platform</span>
      <h2 className="lp-section-h2">Access Powerful<br />Financial Intelligence</h2>
      <div className="lp-feat-container">
        <div className="lp-feat-sidebar">
          <span className="lp-feat-sidebar-label"><i className="bi bi-arrow-left" /> VIEW ALL FEATURES</span>
          {features.map((ft, i) => (
            <button key={i} type="button" className={`lp-feat-tab ${activeTab === i ? 'on' : ''}`} onClick={() => setActiveTab(i)}>
              <i className={`bi ${ft.icon}`} />
              <span>{ft.tab}</span>
            </button>
          ))}
        </div>
        <div className="lp-feat-panel" key={activeTab}>
          <div className="lp-feat-icon-lg"><i className={`bi ${f.icon}`} /></div>
          <h3 className="lp-feat-title">{f.title}</h3>
          <p className="lp-feat-desc">{f.desc}</p>
          <div className="lp-feat-tags">
            {f.tags.map(t => <span key={t} className="lp-feat-tag">{t}</span>)}
          </div>
          <Link href={f.href} className="lp-btn-primary sm">{f.cta}</Link>
        </div>
      </div>
    </section>
  );
}

/* ═══ SECTION: Pricing ═══ */
function PricingSection() {
  const [ref, inView] = useInView(0.1);
  const scrollRef = useRef(null);
  const plans = [
    {
      tier: 'Free',
      icon: 'bi-lightning-charge',
      tagline: 'Get Started',
      desc: 'Perfect for exploring the platform and basic market tracking.',
      features: ['Basic market data', 'Limited congressional trades', 'Community access', 'Weekly newsletters'],
      cta: 'Start Free',
      highlight: false,
    },
    {
      tier: 'Pro',
      icon: 'bi-graph-up',
      tagline: 'Trade Like a Pro',
      desc: 'Advanced tools and real-time data for active investors and researchers.',
      features: ['Real-time trade alerts', 'Full 13F filing access', 'AI-powered insights', 'Advanced charting'],
      cta: 'Go Pro',
      highlight: true,
    },
    {
      tier: 'Enterprise',
      icon: 'bi-trophy',
      tagline: 'Elite Advantage',
      desc: 'Premium data, API access, and personalized support for institutional needs.',
      features: ['API access', 'Custom data exports', 'Priority support', 'White-label options'],
      cta: 'Contact Sales',
      highlight: false,
    },
  ];

  return (
    <section ref={ref} className={`lp-pricing ${inView ? 'in' : ''}`}>
      <span className="lp-section-badge"><i className="bi bi-bookmark-star" /> Our Plans</span>
      <h2 className="lp-section-h2">Discover Your Perfect<br />Investment Plan</h2>
      <div className="lp-pricing-scroll" ref={scrollRef}>
        {plans.map((p, i) => (
          <div key={i} className={`lp-price-card ${p.highlight ? 'featured' : ''}`} style={{ animationDelay: `${i * 0.12}s` }}>
            <div className="lp-price-head">
              <span className="lp-price-icon"><i className={`bi ${p.icon}`} /></span>
              <span className="lp-price-tier">{p.tier}</span>
            </div>
            <h3 className="lp-price-tagline">{p.tagline}</h3>
            <p className="lp-price-desc">{p.desc}</p>
            <div className="lp-price-features">
              <span className="lp-price-feat-label">FEATURES:</span>
              {p.features.map(f => (
                <div key={f} className="lp-price-feat-row">
                  <i className="bi bi-check-circle-fill" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <button type="button" className={`lp-price-cta ${p.highlight ? 'primary' : ''}`}>{p.cta}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ SECTION: Data Sources (KEEP existing) ═══ */
function DataSourcesPlaceholder() {
  return (
    <section className="lp-datasources-placeholder">
      {/* Existing "Data Sources & Resources" section stays as-is */}
    </section>
  );
}

/* ═══ SECTION: Trade Smarter. Grow Faster. ═══ */
function TradeSmarter() {
  const [ref, inView] = useInView(0.12);
  const items = [
    {
      icon: 'bi-rocket-takeoff',
      title: 'Quick Setup',
      desc: 'Create your account in minutes — secure, verified, and ready to start tracking markets immediately.',
    },
    {
      icon: 'bi-shield-lock',
      title: 'Bank-Grade Security',
      desc: 'Your data is encrypted end-to-end with enterprise-grade security. SOC 2 compliant infrastructure.',
    },
    {
      icon: 'bi-activity',
      title: 'Real-Time Analytics',
      desc: 'Make informed decisions with live charts, AI-powered alerts, and instant data updates across all markets.',
    },
  ];

  return (
    <section ref={ref} className={`lp-smarter ${inView ? 'in' : ''}`}>
      <div className="lp-smarter-head">
        <div>
          <span className="lp-section-badge"><i className="bi bi-stars" /> Our Benefits</span>
          <h2 className="lp-smarter-h2">Trade Smarter.<br />Grow Faster.</h2>
          <p className="lp-smarter-sub">Access financial intelligence with confidence — from fast onboarding to powerful tools, everything is built for your success.</p>
        </div>
        <Link href="/register" className="lp-btn-outline light">Start Investing Now</Link>
      </div>
      <div className="lp-smarter-grid">
        {items.map((it, i) => (
          <div key={i} className="lp-smarter-card" style={{ animationDelay: `${i * 0.12}s` }}>
            <div className="lp-smarter-card-visual">
              <i className={`bi ${it.icon}`} />
            </div>
            <h3>{it.title}</h3>
            <p>{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ SECTION: FAQ ═══ */
function FAQSection() {
  const [ref, inView] = useInView(0.1);
  const [openIdx, setOpenIdx] = useState(-1);
  const [filter, setFilter] = useState('All');
  const categories = ['All', 'Getting Started', 'Data & Features', 'Pricing'];
  const faqs = [
    { q: 'What is Ezana Finance?', a: 'Ezana Finance is a financial intelligence platform that tracks congressional stock trades, institutional 13F filings, market data, and prediction markets — all in one dashboard.', cat: 'Getting Started' },
    { q: 'How do I create an account?', a: 'Click "Open Account" and follow the signup process. You can start with our free tier immediately and upgrade anytime.', cat: 'Getting Started' },
    { q: 'Where does the congressional trade data come from?', a: 'All congressional trade data comes from official STOCK Act disclosures filed with the U.S. Senate and House of Representatives, parsed and enriched with our AI pipeline.', cat: 'Data & Features' },
    { q: 'What are 13F filings?', a: '13F filings are quarterly reports filed by institutional investment managers with over $100M in AUM. They reveal the stock holdings of hedge funds and large investors.', cat: 'Data & Features' },
    { q: 'Is the data real-time?', a: 'Market data is real-time. Congressional trade data is updated within minutes of official disclosure. 13F filings are processed as soon as they appear on SEC EDGAR.', cat: 'Data & Features' },
    { q: 'Is Ezana Finance free to use?', a: 'Yes! Our free tier gives you access to basic features. Pro and Enterprise plans unlock real-time alerts, AI insights, API access, and more.', cat: 'Pricing' },
    { q: 'Can I export data for my own analysis?', a: 'Pro users can export CSV data. Enterprise users get full API access for custom integrations and automated workflows.', cat: 'Pricing' },
    { q: 'How do I cancel my subscription?', a: 'You can cancel anytime from your account settings. No long-term contracts or hidden fees.', cat: 'Pricing' },
  ];
  const filtered = filter === 'All' ? faqs : faqs.filter(f => f.cat === filter);

  return (
    <section ref={ref} className={`lp-faq ${inView ? 'in' : ''}`}>
      <div className="lp-faq-layout">
        <div className="lp-faq-left">
          <span className="lp-section-badge"><i className="bi bi-question-circle" /> FAQs</span>
          <h2 className="lp-faq-h2">FAQ</h2>
          <div className="lp-faq-contact">
            <p>Have more questions?<br />Contact our team anytime — we&apos;re here 24/5.</p>
            <Link href="/contact" className="lp-btn-primary sm">Contact Us <i className="bi bi-arrow-right" /></Link>
          </div>
        </div>
        <div className="lp-faq-right">
          <div className="lp-faq-pills">
            {categories.map(c => (
              <button key={c} type="button" className={`lp-faq-pill ${filter === c ? 'on' : ''}`} onClick={() => { setFilter(c); setOpenIdx(-1); }}>{c}</button>
            ))}
          </div>
          <div className="lp-faq-list">
            {filtered.map((f, i) => (
              <div key={i} className={`lp-faq-item ${openIdx === i ? 'open' : ''}`}>
                <button type="button" className="lp-faq-q" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
                  <span>{f.q}</span>
                  <i className={`bi ${openIdx === i ? 'bi-dash' : 'bi-plus'}`} />
                </button>
                <div className="lp-faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ SECTION: Footer ═══ */
function FooterSection() {
  const cols = [
    { title: 'Platform', links: [{ t: 'Inside the Capitol', h: '/inside-the-capitol' }, { t: 'Market Analysis', h: '/market-analysis' }, { t: 'For the Quants', h: '/for-the-quants' }, { t: 'Betting Markets', h: '/betting-markets' }, { t: 'Community', h: '/community' }] },
    { title: 'Data', links: [{ t: 'Congressional Trades', h: '/inside-the-capitol' }, { t: '13F Filings', h: '/for-the-quants' }, { t: 'Company Research', h: '/company-research' }, { t: 'Watchlist', h: '/watchlist' }] },
    { title: 'Company', links: [{ t: 'About Us', h: '/about' }, { t: 'Blog', h: '/blog' }, { t: 'Careers', h: '/careers' }, { t: 'Contact', h: '/contact' }] },
    { title: 'Resources', links: [{ t: 'Learning Center', h: '/learning-center' }, { t: 'Documentation', h: '/docs' }, { t: 'API Reference', h: '/api' }, { t: 'Help & Support', h: '/support' }] },
  ];

  return (
    <footer className="lp-footer">
      <div className="lp-footer-cta-bar">
        <span className="lp-section-badge light"><i className="bi bi-broadcast" /> All-in-One Platform</span>
        <h2 className="lp-footer-cta-h2">Smarter Access to<br />Financial Intelligence</h2>
        <div className="lp-footer-cta-btns">
          <Link href="/register" className="lp-btn-primary">Get Started Free</Link>
          <Link href="/market-analysis" className="lp-btn-outline light">Explore Platform <i className="bi bi-arrow-right" /></Link>
        </div>
      </div>

      <div className="lp-footer-grid">
        <div className="lp-footer-brand">
          <div className="lp-footer-logo">
            <i className="bi bi-bar-chart-fill" />
            <span>Ezana Finance</span>
          </div>
          <Link href="/register" className="lp-btn-outline sm light foot">Try Free Demo <i className="bi bi-arrow-right" /></Link>
        </div>
        {cols.map(c => (
          <div key={c.title} className="lp-footer-col">
            <h4>{c.title}</h4>
            {c.links.map(l => <Link key={l.t} href={l.h}>{l.t}</Link>)}
          </div>
        ))}
      </div>

      <div className="lp-footer-bottom">
        <span>COPYRIGHT 2025 &copy; EZANA FINANCE</span>
        <div className="lp-footer-bottom-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms &amp; Conditions</Link>
        </div>
      </div>

      <div className="lp-footer-risk">
        <p><strong>DISCLAIMER:</strong> Ezana Finance provides financial data and analytics for informational purposes only. Nothing on this platform constitutes investment advice, a recommendation, or solicitation. Congressional trade data comes from public STOCK Act disclosures. 13F data comes from SEC filings. Always conduct your own research before making investment decisions.</p>
      </div>
    </footer>
  );
}

/* ═══ MAIN PAGE COMPONENT ═══ */
export default function LandingPage() {
  return (
    <div className="lp-root">
      <HeroSection />
      <WhyEzanaSection />
      <TrustedBySection />
      <FeaturesSection />
      <PricingSection />
      <DataSourcesPlaceholder />
      <TradeSmarter />
      <FAQSection />
      <FooterSection />
      <ChatbotWidget />
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import '../home-dashboard/home-dashboard.css';
import './trading.css';

function isActiveStatus(status) {
  return status === 'ACTIVE' || status === 'APPROVED';
}

export default function TradingPage() {
  const [user, setUser] = useState(null);
  const [brokerageAccount, setBrokerageAccount] = useState(null);
  const [checklistComplete, setChecklistComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUserData = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setLoading(false);
      return;
    }
    setUser(u);

    const { data: br } = await supabase
      .from('brokerage_accounts')
      .select('*')
      .eq('user_id', u.id)
      .maybeSingle();

    if (br) {
      setBrokerageAccount(br);
    } else {
      const { data: legacy } = await supabase
        .from('alpaca_accounts')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();
      if (legacy) {
        setBrokerageAccount({
          account_status: legacy.account_status,
          alpaca_account_id: legacy.alpaca_account_id,
          _legacy: true,
        });
      } else {
        setBrokerageAccount(null);
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('checklist_completed')
      .eq('id', u.id)
      .single();

    setChecklistComplete(!!profile?.checklist_completed);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    if (loading) return;
    if (brokerageAccount && isActiveStatus(brokerageAccount.account_status)) {
      router.replace('/trading/dashboard');
    }
  }, [loading, brokerageAccount, router]);

  const handleOpenAccount = () => {
    if (!checklistComplete) {
      window.alert(
        'Please complete all 18 tasks in your Getting Started checklist before opening a brokerage account.'
      );
      return;
    }
    router.push('/trading/open-account');
  };

  if (loading) {
    return (
      <div className="trd-page dashboard-page-inset">
        <div className="trd-loading">Loading…</div>
      </div>
    );
  }

  if (brokerageAccount && isActiveStatus(brokerageAccount.account_status)) {
    return (
      <div className="trd-page dashboard-page-inset">
        <div className="trd-loading">Redirecting…</div>
      </div>
    );
  }

  if (brokerageAccount && !isActiveStatus(brokerageAccount.account_status)) {
    return (
      <div className="trd-page trd-showcase dashboard-page-inset">
        <div className="trd-open-top">
          <Link href="/home-dashboard" className="trd-open-back">
            ← Back to dashboard
          </Link>
        </div>
        <section className="trd-pending-wrap">
          <div className="trd-pending-app db-card">
            <h2 className="trd-pending-title">Application received</h2>
            <p className="trd-pending-text">
              Your brokerage application status is{' '}
              <strong>{brokerageAccount.account_status}</strong>. We&apos;ll email you when it is
              approved.
            </p>
            <p className="trd-pending-hint">
              You can leave this page and return anytime from the Trading menu.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="trd-page trd-showcase dashboard-page-inset">
      <section className="trd-hero">
        <h1 className="trd-hero-title">Trade smarter with Ezana</h1>
        <p className="trd-hero-sub">
          Open a brokerage account and access powerful tools built for informed investors. Copy
          legendary traders, automate your strategy, and invest commission-free.
        </p>
      </section>

      <section className="trd-feature-grid">
        <div className="trd-feature-card db-card">
          <div className="trd-feature-icon-wrap" aria-hidden>
            <i className="bi bi-bezier2 trd-feature-bi" />
          </div>
          <h3 className="trd-feature-h3">Hybrid portfolios</h3>
          <p className="trd-feature-p">
            Blend strategies from multiple legendary investors and verified partners into a single
            portfolio. Allocate percentages to each, and invest fractionally in the combined mix.
            Create your own personalized investment strategy powered by the best minds in finance.
          </p>
        </div>

        <div className="trd-feature-card db-card">
          <div className="trd-feature-icon-wrap" aria-hidden>
            <i className="bi bi-clipboard-data trd-feature-bi" />
          </div>
          <h3 className="trd-feature-h3">Copy trading</h3>
          <p className="trd-feature-p">
            Follow and automatically mirror the trades of your favourite legendary investors,
            verified partners, or hedge funds. When they buy, you buy. When they sell, you sell.
            Hands-free investing from the people you trust most.
          </p>
        </div>

        <div className="trd-feature-card db-card">
          <div className="trd-feature-icon-wrap" aria-hidden>
            <i className="bi bi-bar-chart-line trd-feature-bi" />
          </div>
          <h3 className="trd-feature-h3">Margin trading &amp; short selling</h3>
          <p className="trd-feature-p">
            Accounts with a balance of $2,000 or more unlock margin trading and short selling.
            Before accessing these features, you&apos;ll need to complete our dedicated courses on
            both topics in the Learning Center to ensure you understand the risks involved.
          </p>
          <div className="trd-badges">
            <span className="trd-badge trd-badge--amber">$2,000 minimum</span>
            <span className="trd-badge trd-badge--amber">Course required</span>
          </div>
        </div>

        <div className="trd-feature-card db-card">
          <div className="trd-feature-icon-wrap" aria-hidden>
            <i className="bi bi-gear trd-feature-bi" />
          </div>
          <h3 className="trd-feature-h3">Automated investing</h3>
          <p className="trd-feature-p">
            Set up recurring investments on your own terms. Choose daily, weekly, or monthly
            frequency. Pick specific stocks, a custom portfolio mix, or mirror a copy-trade strategy
            — all running automatically based on your parameters.
          </p>
        </div>

        <div className="trd-feature-card db-card">
          <div className="trd-feature-icon-wrap" aria-hidden>
            <i className="bi bi-cash-coin trd-feature-bi" />
          </div>
          <h3 className="trd-feature-h3">Commission-free trading</h3>
          <p className="trd-feature-p">
            Trade stocks, ETFs, and crypto with zero commissions on every trade of $250 USD or
            more. No hidden fees, no per-trade charges. Keep more of your returns.
          </p>
          <div className="trd-badges">
            <span className="trd-badge trd-badge--green">$0 commission on trades ≥ $250</span>
          </div>
        </div>

        <div className="trd-feature-card db-card">
          <div className="trd-feature-icon-wrap" aria-hidden>
            <i className="bi bi-puzzle trd-feature-bi" />
          </div>
          <h3 className="trd-feature-h3">Fractional shares</h3>
          <p className="trd-feature-p">
            Invest in any stock or ETF with any dollar amount. Own a piece of companies like Amazon,
            Google, or Tesla without needing thousands of dollars. Start building your portfolio
            with as little as $1.
          </p>
        </div>
      </section>

      <section className="trd-requirements db-card">
        <h3 className="trd-requirements-title">Before you open an account</h3>
        <div className="trd-req-cols">
          <div className="trd-req-col">
            <div className="trd-req-row">
              <div className={`trd-req-num ${checklistComplete ? 'trd-req-num--done' : ''}`}>
                {checklistComplete ? '✓' : '1'}
              </div>
              <span className={checklistComplete ? 'trd-req-label trd-req-label--done' : 'trd-req-label'}>
                Complete all 18 checklist tasks
              </span>
            </div>
            <p className="trd-req-desc">
              {checklistComplete
                ? 'Completed. You can open your account.'
                : 'Explore the platform and complete your Getting Started checklist first.'}
            </p>
          </div>

          <div className="trd-req-col">
            <div className="trd-req-row">
              <div className="trd-req-num">2</div>
              <span className="trd-req-label">Verify your identity (KYC)</span>
            </div>
            <p className="trd-req-desc">
              We&apos;ll need your legal name, date of birth, SSN/tax ID, and address.
            </p>
          </div>

          <div className="trd-req-col">
            <div className="trd-req-row">
              <div className="trd-req-num">3</div>
              <span className="trd-req-label">Fund your account</span>
            </div>
            <p className="trd-req-desc">Link your bank account and deposit funds to start trading.</p>
          </div>
        </div>
      </section>

      <section className="trd-cta">
        <button
          type="button"
          onClick={handleOpenAccount}
          disabled={!checklistComplete}
          className="trd-cta-btn trd-btn-primary"
        >
          {checklistComplete ? 'Open brokerage account' : 'Complete checklist to unlock'}
        </button>
        {!checklistComplete && (
          <p className="trd-cta-hint">
            Complete all 18 tasks in your Getting Started checklist to enable account opening.
          </p>
        )}

        <p className="trd-cta-legal">
          Brokerage services provided by Alpaca Securities LLC, member{' '}
          <a href="https://www.finra.org" target="_blank" rel="noopener noreferrer">FINRA</a>
          /
          <a href="https://www.sipc.org" target="_blank" rel="noopener noreferrer">SIPC</a>.
          Investments involve risk and are not FDIC insured.
        </p>

        {user && (
          <p className="trd-cta-back">
            <Link href="/home-dashboard">← Back to dashboard</Link>
          </p>
        )}
      </section>
    </div>
  );
}

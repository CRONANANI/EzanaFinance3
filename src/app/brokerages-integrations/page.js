'use client';

import Link from 'next/link';
import { ArrowRight, Check, Shield, X, Link2 } from 'lucide-react';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import '../marketing-explore.css';

function CheckItem({ ok, children }) {
  return (
    <li>
      {ok ? (
        <Check className="mkt-check-yes" size={16} aria-hidden />
      ) : (
        <X className="mkt-check-no" size={16} aria-hidden />
      )}
      <span>{children}</span>
    </li>
  );
}

export default function BrokeragesIntegrationsPage() {
  return (
    <MarketingPageShell>
      <div className="mkt-hero">
        <p className="mkt-eyebrow">Integrations</p>
        <h1 className="mkt-h1">Connect your brokerage, your way</h1>
        <p className="mkt-lead">
          Ezana links your accounts through two trusted aggregators — SnapTrade and Plaid — so you
          can read holdings or place trades without leaving Ezana. 1,000+ brokerages &amp; exchanges
          supported.
        </p>
      </div>

      <div className="mkt-grid-2">
        <article className="mkt-card">
          <div className="mkt-card-header">
            <Link2 size={20} aria-hidden />
            SnapTrade
          </div>
          <p>
            <strong>Brokerage-native connectivity.</strong> Best for reading positions and placing
            trades from supported brokers.
          </p>
          <p>Coverage: major retail brokers and crypto exchanges.</p>
          <ul className="mkt-checklist">
            <CheckItem ok>Holdings &amp; balances</CheckItem>
            <CheckItem ok>Orders &amp; trading (supported brokers)</CheckItem>
            <CheckItem ok>Account sync</CheckItem>
            <CheckItem ok>OAuth broker login</CheckItem>
          </ul>
          <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            How it works: choose your broker → authorize on SnapTrade → Ezana syncs your data.
          </p>
        </article>

        <article className="mkt-card">
          <div className="mkt-card-header">
            <Link2 size={20} aria-hidden />
            Plaid
          </div>
          <p>
            <strong>Bank- and investment-account aggregation.</strong> Best for read-only holdings
            and investment transactions across a very broad set of institutions.
          </p>
          <p>Coverage: banks, credit unions, and investment accounts via Plaid Investments.</p>
          <ul className="mkt-checklist">
            <CheckItem ok>Holdings (read-only)</CheckItem>
            <CheckItem ok>Investment transactions</CheckItem>
            <CheckItem ok>Balances (read-only)</CheckItem>
            <CheckItem ok={false}>Placing trades (not supported)</CheckItem>
          </ul>
          <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            How it works: link your institution → sign in with Plaid OAuth → Ezana reads your
            investment data.
          </p>
        </article>
      </div>

      <h2 className="mkt-section-title">How connecting works</h2>
      <div className="mkt-steps">
        <div className="mkt-step">
          <span className="mkt-step-num">1</span>
          <h3>Choose a provider</h3>
          <p>Pick SnapTrade for trading-capable brokers or Plaid for broad read-only coverage.</p>
        </div>
        <div className="mkt-step">
          <span className="mkt-step-num">2</span>
          <h3>Authorize securely</h3>
          <p>Credentials never touch Ezana — you authenticate directly with SnapTrade or Plaid.</p>
        </div>
        <div className="mkt-step">
          <span className="mkt-step-num">3</span>
          <h3>Sync to your dashboard</h3>
          <p>Holdings, balances, and activity flow into your Ezana portfolio view.</p>
        </div>
      </div>

      <div className="mkt-note">
        <p>
          <Shield
            size={16}
            style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}
          />
          <strong>Security:</strong> connections are read-only by default where the provider allows
          it; data is encrypted in transit; you can disconnect any linked account anytime from
          settings.
        </p>
      </div>

      <div className="mkt-cta-block">
        <Link href="/auth/login" className="mkt-cta-btn">
          Get started
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </MarketingPageShell>
  );
}

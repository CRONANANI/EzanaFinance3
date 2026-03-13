'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const BASE = '/help-center/user';

const ARTICLES = {
  'create-account': { title: 'How to create your account', category: 'Getting Started', content: `<p>Creating an Ezana Finance account is quick and easy.</p><ol class="list-decimal list-inside space-y-2 mt-4"><li>Click "Sign Up" on the homepage</li><li>Enter your email and create a password</li><li>Verify your email address</li><li>Complete your profile (optional)</li></ol><p class="mt-4">Once your account is created, you can connect your brokerage and start exploring congressional trades, 13F filings, and portfolio analytics.</p>` },
  'connect-brokerage': { title: 'Connecting your brokerage with Plaid', category: 'Getting Started', content: `<p>Ezana uses Plaid to securely connect your brokerage accounts. Plaid is used by thousands of financial apps and banks.</p><h3 class="mt-6 font-semibold text-white">Supported brokerages</h3><p class="mt-2">We support most major US brokerages including Fidelity, Charles Schwab, TD Ameritrade, E*TRADE, Robinhood, and many more.</p><h3 class="mt-6 font-semibold text-white">Steps to connect</h3><ol class="list-decimal list-inside space-y-2 mt-4"><li>Go to your Dashboard</li><li>Click "Connect Brokerage"</li><li>Select your brokerage from the list</li><li>Sign in with your brokerage credentials (handled securely by Plaid)</li><li>Select which accounts to link</li></ol><p class="mt-4">Your data is read-only. Ezana never initiates trades or transfers on your behalf.</p>` },
  'dashboard-overview': { title: 'Understanding the dashboard', category: 'Getting Started', content: `<p>The Ezana dashboard gives you a complete view of your portfolio and market intelligence.</p><h3 class="mt-6 font-semibold text-white">Key sections</h3><ul class="list-disc list-inside space-y-2 mt-4"><li><strong>Portfolio Value</strong> – Your total portfolio value with historical chart</li><li><strong>Top Holdings</strong> – Your largest positions</li><li><strong>Congressional Trades</strong> – Recent trades by members of Congress</li><li><strong>13F Filings</strong> – Institutional investor holdings</li></ul>` },
  'portfolio-sync': { title: 'Syncing your portfolio data', category: 'Portfolio & Brokerage', content: `<p>Your portfolio data syncs automatically when you connect your brokerage. We refresh holdings periodically to keep your dashboard up to date.</p><p class="mt-4">To manually refresh, click the "Refresh" button on your dashboard. Note: Some brokerages may limit how often we can sync.</p>` },
  'manage-accounts': { title: 'Adding and removing brokerage accounts', category: 'Portfolio & Brokerage', content: `<p>To add another brokerage account, click "Connect Brokerage" and follow the same flow. You can link multiple accounts.</p><p class="mt-4">To remove an account, go to Account Settings → Linked Accounts and disconnect the account you no longer want to track.</p>` },
  'portfolio-analytics': { title: 'Understanding portfolio analytics', category: 'Portfolio & Brokerage', content: `<p>Ezana provides analytics including performance over time, sector allocation, and comparison to market indices. Use the time range selector (1D, 1W, 1M, 3M, 6M, 1Y) to view different periods.</p>` },
  'update-profile': { title: 'Updating your profile', category: 'Account & Security', content: `<p>Go to Account Settings to update your name, email, and preferences. Changes to your email will require verification.</p>` },
  'change-password': { title: 'Changing your password', category: 'Account & Security', content: `<p>In Account Settings, click "Change Password". You'll need to enter your current password and your new password twice.</p>` },
  '2fa': { title: 'Two-factor authentication', category: 'Account & Security', content: `<p>Two-factor authentication adds an extra layer of security. We support authenticator apps like Google Authenticator and Authy. Enable it in Account Settings → Security.</p>` },
  'subscription-plans': { title: 'Subscription plans explained', category: 'Billing & Subscriptions', content: `<p>Ezana offers tiered plans. The free tier includes basic portfolio tracking and congressional trade data. Premium tiers unlock 13F filings, advanced analytics, and more.</p>` },
  'change-plan': { title: 'Upgrading or downgrading', category: 'Billing & Subscriptions', content: `<p>Go to Account Settings → Billing to change your plan. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.</p>` },
  billing: { title: 'Billing and invoices', category: 'Billing & Subscriptions', content: `<p>Invoices are sent to your email and available in Account Settings → Billing. We accept major credit cards and process payments securely through Stripe.</p>` },
  'congressional-trades': { title: 'What data does Ezana track from congressional trades?', category: 'Getting Started', content: `<p>We track trades disclosed by members of Congress under the STOCK Act. This includes the transaction type (buy/sell), ticker symbol, amount range, and date. We display this data to help you see how lawmakers invest.</p>` },
  'cancel-subscription': { title: 'How do I cancel my subscription?', category: 'Billing & Subscriptions', content: `<p>Go to Account Settings → Billing and click "Cancel subscription". Your access continues until the end of your current billing period. You can resubscribe anytime.</p>` },
  'data-security': { title: 'Is my financial data secure?', category: 'Account & Security', content: `<p>Yes. We use Plaid for brokerage connections—Plaid is bank-level secure and never shares your credentials with us. We encrypt all data in transit and at rest. We are read-only and never initiate trades.</p>` },
};

export default function UserHelpArticlePage() {
  const params = useParams();
  const slug = params?.slug;
  const article = slug ? ARTICLES[slug] : null;

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-semibold text-white">Article not found</h1>
          <Link href={BASE} className="inline-flex items-center gap-2 text-[#10b981] hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Back to User Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <article className="mx-auto max-w-3xl px-4 py-12">
        <Link href={BASE} className="mb-8 inline-flex items-center gap-2 text-[#10b981] hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Back to User Help Center
        </Link>
        <p className="mb-2 text-sm text-[#10b981]">{article.category}</p>
        <h1 className="mb-8 text-3xl font-bold text-white">{article.title}</h1>
        <div className="prose prose-invert max-w-none text-[#9ca3af] [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-white [&_ol]:space-y-2 [&_ul]:space-y-2 [&_p]:mt-4 [&_p]:first:mt-0 [&_strong]:text-white" dangerouslySetInnerHTML={{ __html: article.content }} />
        <div className="mt-12 border-t border-[rgba(16,185,129,0.1)] pt-8">
          <p className="mb-4 text-sm text-[#6b7280]">Was this article helpful?</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-[rgba(16,185,129,0.2)] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:border-[#10b981] hover:text-[#10b981]">Yes</button>
            <button type="button" className="rounded-lg border border-[rgba(16,185,129,0.2)] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:border-[#10b981] hover:text-[#10b981]">No</button>
          </div>
        </div>
      </article>
    </div>
  );
}

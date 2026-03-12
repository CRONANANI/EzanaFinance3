'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';

const CATEGORIES = {
  'getting-started': {
    title: 'Getting Started',
    articles: [
      { title: 'How to create your account', slug: 'create-account' },
      { title: 'Connecting your brokerage with Plaid', slug: 'connect-brokerage' },
      { title: 'Understanding the dashboard', slug: 'dashboard-overview' },
    ],
  },
  portfolio: {
    title: 'Portfolio & Brokerage',
    articles: [
      { title: 'Syncing your portfolio data', slug: 'portfolio-sync' },
      { title: 'Adding and removing brokerage accounts', slug: 'manage-accounts' },
      { title: 'Understanding portfolio analytics', slug: 'portfolio-analytics' },
    ],
  },
  account: {
    title: 'Account & Security',
    articles: [
      { title: 'Updating your profile', slug: 'update-profile' },
      { title: 'Changing your password', slug: 'change-password' },
      { title: 'Two-factor authentication', slug: '2fa' },
    ],
  },
  billing: {
    title: 'Billing & Subscriptions',
    articles: [
      { title: 'Subscription plans explained', slug: 'subscription-plans' },
      { title: 'Upgrading or downgrading', slug: 'change-plan' },
      { title: 'Billing and invoices', slug: 'billing' },
    ],
  },
};

export default function HelpCategoryPage() {
  const params = useParams();
  const slug = params?.slug;
  const category = slug ? CATEGORIES[slug] : null;

  if (!category) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-semibold text-white">Category not found</h1>
          <Link
            href="/help-center"
            className="inline-flex items-center gap-2 text-[#10b981] hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/help-center"
          className="mb-8 inline-flex items-center gap-2 text-[#10b981] hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Help Center
        </Link>
        <h1 className="mb-10 text-3xl font-bold text-white">{category.title}</h1>
        <div className="space-y-2">
          {category.articles.map((art) => (
            <Link
              key={art.slug}
              href={`/help-center/article/${art.slug}`}
              className="flex items-center gap-4 rounded-lg border border-[rgba(16,185,129,0.1)] bg-[rgba(26,35,50,0.4)] p-4 transition-all hover:border-[#10b981]/30 hover:bg-[rgba(16,185,129,0.05)]"
            >
              <FileText className="h-5 w-5 flex-shrink-0 text-[#10b981]" />
              <span className="text-white hover:text-[#10b981]">{art.title}</span>
              <ChevronLeft className="ml-auto h-4 w-4 rotate-180 text-[#6b7280]" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

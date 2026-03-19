'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Activity,
  Wallet,
  BarChart3,
  Shield,
  CreditCard,
  Users,
  GraduationCap,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { USER_CATEGORIES } from '@/lib/help-center-content';

const BASE = '/help-center/user';

const ICON_MAP = { BookOpen, Activity, Wallet, BarChart3, Shield, CreditCard, Users, GraduationCap };

const POPULAR_ARTICLES = [
  { title: 'How do I connect my brokerage account?', slug: 'connecting-your-brokerage' },
  { title: 'How does congressional trading data work?', slug: 'how-congressional-data-works' },
  { title: 'How do I cancel my subscription?', slug: 'managing-subscription' },
  { title: 'Is my financial data secure?', slug: 'data-security' },
];

const FAQ_ITEMS = [
  { q: 'How do I connect my brokerage account?', a: 'Go to Settings → Integrations and click Connect on any supported brokerage. You\'ll be redirected to Plaid\'s secure connection flow. Ezana receives read-only access to your positions and balances.' },
  { q: 'What is congressional trading data?', a: 'Ezana aggregates publicly disclosed trades by members of Congress under the STOCK Act. Each trade shows the politician\'s name, party, chamber, stock traded, transaction type, estimated dollar range, and filing date.' },
  { q: 'Can I export my portfolio data?', a: 'Yes. From your Dashboard, use the Report button to export your portfolio summary. The For The Quants section allows CSV export for advanced analytics.' },
  { q: 'How do I contact support?', a: 'Email us at contact@ezana.world or use the Contact button in the footer. We typically respond within 24 hours on business days.' },
];

export default function UserHelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  return (
    <div className="help-center-page min-h-screen bg-[#0f1419]">
      <section className="relative border-b border-[rgba(16,185,129,0.1)] bg-gradient-to-b from-[#0f1419] to-[#161b22] px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Link href="/help-center" className="mb-6 inline-flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#10b981]">
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Help Center
          </Link>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">User Support</h1>
          <p className="mb-8 text-lg text-[#9ca3af]">Search our help center or browse categories below</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]" />
            <input type="search" placeholder="Search for help..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-[rgba(16,185,129,0.2)] bg-[rgba(17,24,39,0.8)] py-4 pl-12 pr-4 text-white placeholder-[#6b7280] outline-none transition-colors focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20" />
            <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-[rgba(16,185,129,0.2)] bg-[rgba(17,24,39,0.6)] px-2 py-1 text-xs text-[#9ca3af] md:inline">⌘K</kbd>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-2xl font-semibold text-white">Browse by category</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USER_CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] || BookOpen;
            return (
              <Link key={cat.id} href={`${BASE}/category/${cat.id}`} className="group rounded-xl border border-[rgba(16,185,129,0.1)] bg-[rgba(26,35,50,0.6)] p-6 transition-all hover:border-[#10b981]/30 hover:bg-[rgba(16,185,129,0.05)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.15)] text-[#10b981] transition-colors group-hover:bg-[rgba(16,185,129,0.25)]"><Icon className="h-6 w-6" /></div>
                <h3 className="mb-2 font-semibold text-white group-hover:text-[#10b981]">{cat.title}</h3>
                <p className="mb-4 text-sm text-[#9ca3af]">{cat.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[#10b981]">View articles <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="border-t border-[rgba(16,185,129,0.1)] bg-[#161b22]/50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-2xl font-semibold text-white">Popular articles</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {POPULAR_ARTICLES.map((art) => (
              <Link key={art.slug} href={`${BASE}/article/${art.slug}`} className="flex items-center gap-4 rounded-lg border border-[rgba(16,185,129,0.1)] bg-[rgba(26,35,50,0.4)] p-4 transition-all hover:border-[#10b981]/30 hover:bg-[rgba(16,185,129,0.05)]">
                <FileText className="h-5 w-5 flex-shrink-0 text-[#10b981]" />
                <span className="text-white hover:text-[#10b981]">{art.title}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-[#6b7280]" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-10 text-2xl font-semibold text-white">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="rounded-xl border border-[rgba(16,185,129,0.1)] bg-[rgba(26,35,50,0.4)] overflow-hidden">
              <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-white transition-colors hover:bg-[rgba(16,185,129,0.05)]">
                <span className="font-medium">{item.q}</span>
                <ChevronRight className={`h-5 w-5 flex-shrink-0 text-[#10b981] transition-transform ${expandedFaq === i ? 'rotate-90' : ''}`} />
              </button>
              {expandedFaq === i && <div className="border-t border-[rgba(16,185,129,0.1)] px-6 py-4 text-[#9ca3af]">{item.a}</div>}
            </div>
          ))}
        </div>
      </section>
      <section className="border-t border-[rgba(16,185,129,0.1)] bg-gradient-to-b from-[#161b22] to-[#0f1419] px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[rgba(16,185,129,0.2)] bg-[rgba(26,35,50,0.6)] p-8 text-center">
          <HelpCircle className="mx-auto mb-4 h-12 w-12 text-[#10b981]" />
          <h2 className="mb-2 text-xl font-semibold text-white">Still need help?</h2>
          <p className="mb-6 text-[#9ca3af]">Our support team is here for you. Reach out and we&apos;ll get back to you as soon as possible.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="mailto:contact@ezana.world" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 font-medium text-white transition-colors hover:bg-[#059669]">Contact Support <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/help-center" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(16,185,129,0.3)] px-6 py-3 font-medium text-[#10b981] transition-colors hover:bg-[rgba(16,185,129,0.1)]">Back to Help Center</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

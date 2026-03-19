'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  Code2,
  FileText,
  Repeat,
  LayoutDashboard,
  Users,
  HelpCircle,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { PARTNER_CATEGORIES } from '@/lib/help-center-content';

const BASE = '/help-center/partner';

const ICON_MAP = { BookOpen, FileText, Repeat, LayoutDashboard, Users, Code2 };

const POPULAR_ARTICLES = [
  { title: 'How do I get my API keys?', slug: 'api-keys' },
  { title: 'How are partner commissions calculated?', slug: 'commission-structure' },
  { title: 'How do I become a partner?', slug: 'becoming-a-partner' },
  { title: 'How do I track my copiers?', slug: 'reading-metrics' },
];

const FAQ_ITEMS = [
  { q: 'How do I join the partner program?', a: 'Visit our Partner page and apply. Once approved, you\'ll receive access to the Partner Dashboard, API keys, and referral tools. Approval typically takes 1-2 business days.' },
  { q: 'What commission do partners earn?', a: 'Commission rates vary by tier and referral type. See the Commission structure article for full details. Payouts are processed monthly via your preferred payment method.' },
  { q: 'Can I use the Ezana API for my own product?', a: 'Yes. Approved partners receive API access for integration. Be sure to follow our API terms of use and rate limits.' },
  { q: 'How do I contact partner support?', a: 'Email partners@ezana.world for partner-specific questions. For technical API issues, include your partner ID and a description of the issue.' },
];

export default function PartnerHelpCenterPage() {
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
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">Partner Support</h1>
          <p className="mb-8 text-lg text-[#9ca3af]">Resources for Ezana partners, affiliates, and API integrators</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]" />
            <input type="search" placeholder="Search for help..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-[rgba(16,185,129,0.2)] bg-[rgba(17,24,39,0.8)] py-4 pl-12 pr-4 text-white placeholder-[#6b7280] outline-none transition-colors focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20" />
            <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-[rgba(16,185,129,0.2)] bg-[rgba(17,24,39,0.6)] px-2 py-1 text-xs text-[#9ca3af] md:inline">⌘K</kbd>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-2xl font-semibold text-white">Browse by category</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNER_CATEGORIES.map((cat) => {
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
          <p className="mb-6 text-[#9ca3af]">Our partner support team is here for you. Reach out and we&apos;ll get back to you as soon as possible.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="mailto:partners@ezana.world" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 font-medium text-white transition-colors hover:bg-[#059669]">Contact Partner Support <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/help-center" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(16,185,129,0.3)] px-6 py-3 font-medium text-[#10b981] transition-colors hover:bg-[rgba(16,185,129,0.1)]">Back to Help Center</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

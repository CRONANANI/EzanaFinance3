'use client';

import { useState, useMemo } from 'react';
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
import { PARTNER_CATEGORIES, PARTNER_ARTICLES } from '@/lib/help-center-content';
import '../help-center.css';

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

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return PARTNER_CATEGORIES;
    return PARTNER_CATEGORIES
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter((a) => {
          const meta = PARTNER_ARTICLES[a.slug];
          const haystack = [
            a.title,
            cat.title,
            cat.description,
            meta?.title,
            meta?.category,
            meta?.content,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [searchQuery]);

  return (
    <div className="hc-page">
      <section className="hc-hero">
        <div className="mx-auto max-w-3xl text-center">
          <Link href="/help-center" className="hc-link-muted mb-6 inline-flex items-center gap-2 text-sm">
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Help Center
          </Link>
          <h1 className="hc-title mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">Partner Support</h1>
          <p className="hc-subtitle mb-8 text-lg">Resources for Ezana partners, affiliates, and API integrators</p>
          <div className="relative">
            <Search className="hc-input-icon absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hc-input"
            />
            <kbd className="hc-kbd absolute right-4 top-1/2 hidden -translate-y-1/2 rounded px-2 py-1 text-xs md:inline">⌘K</kbd>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="hc-title mb-10 text-2xl font-semibold">
          {searchQuery.trim() ? `Matching categories (${filteredCategories.length})` : 'Browse by category'}
        </h2>
        {filteredCategories.length === 0 ? (
          <p className="hc-subtitle text-center">
            No articles matched <span className="hc-accent font-semibold">&ldquo;{searchQuery}&rdquo;</span>. Try a different term or browse the categories below.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat) => {
              const Icon = ICON_MAP[cat.iconName] || BookOpen;
              const matchedCount = searchQuery.trim() ? cat.articles.length : null;
              return (
                <Link key={cat.id} href={`${BASE}/category/${cat.id}`} className="hc-card-interactive group p-6">
                  <div className="hc-icon-pill mb-4 h-12 w-12 rounded-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="hc-title mb-2 font-semibold group-hover:text-[color:var(--emerald-text)]">{cat.title}</h3>
                  <p className="hc-subtitle mb-4 text-sm">{cat.description}</p>
                  <span className="hc-accent inline-flex items-center gap-1 text-sm font-medium">
                    {matchedCount !== null ? `${matchedCount} match${matchedCount === 1 ? '' : 'es'}` : 'View articles'}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="hc-section-alt hc-section-divider px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="hc-title mb-10 text-2xl font-semibold">Popular articles</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {POPULAR_ARTICLES.map((art) => (
              <Link key={art.slug} href={`${BASE}/article/${art.slug}`} className="hc-card-compact flex items-center gap-4 p-4">
                <FileText className="hc-accent h-5 w-5 flex-shrink-0" />
                <span className="hc-title">{art.title}</span>
                <ChevronRight className="hc-faint ml-auto h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="hc-title mb-10 text-2xl font-semibold">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="hc-card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[color:var(--surface-card-hover)]"
              >
                <span className="hc-title font-medium">{item.q}</span>
                <ChevronRight
                  className={`hc-accent h-5 w-5 flex-shrink-0 transition-transform ${
                    expandedFaq === i ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {expandedFaq === i && (
                <div
                  className="hc-subtitle px-6 py-4 text-sm"
                  style={{ borderTop: '1px solid var(--border-primary)' }}
                >
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="hc-footer-band px-4 py-16">
        <div className="hc-card mx-auto max-w-2xl p-8 text-center">
          <HelpCircle className="hc-accent mx-auto mb-4 h-12 w-12" />
          <h2 className="hc-title mb-2 text-xl font-semibold">Still need help?</h2>
          <p className="hc-subtitle mb-6">Our partner support team is here for you. Reach out and we&apos;ll get back to you as soon as possible.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="mailto:partners@ezana.world" className="hc-btn-primary">
              Contact Partner Support
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/help-center" className="hc-btn-secondary">Back to Help Center</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

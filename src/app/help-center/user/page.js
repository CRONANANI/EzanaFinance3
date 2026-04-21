'use client';

import { useState, useMemo } from 'react';
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
  Globe2,
  Bookmark,
  Scale,
} from 'lucide-react';
import { USER_CATEGORIES, USER_ARTICLES } from '@/lib/help-center-content';
import '../help-center.css';

const BASE = '/help-center/user';

const ICON_MAP = {
  BookOpen,
  Activity,
  Wallet,
  BarChart3,
  Shield,
  CreditCard,
  Users,
  GraduationCap,
  Globe2,
  Bookmark,
  Scale,
};

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

  /*
   * Search filters both categories AND the underlying article catalog so a
   * query like "messages" or "paper trading" surfaces the matching article
   * cards even when the user hasn't clicked into a category yet.
   */
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return USER_CATEGORIES;
    return USER_CATEGORIES
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter((a) => {
          const meta = USER_ARTICLES[a.slug];
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
          <h1 className="hc-title mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">User Support</h1>
          <p className="hc-subtitle mb-8 text-lg">Search our help center or browse categories below</p>
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="hc-subtitle mb-6">Our support team is here for you. Reach out and we&apos;ll get back to you as soon as possible.</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="mailto:contact@ezana.world" className="hc-btn-primary">
              Contact Support
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/help-center" className="hc-btn-secondary">Back to Help Center</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

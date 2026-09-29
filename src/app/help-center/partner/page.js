'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Code2,
  FileText,
  Repeat,
  LayoutDashboard,
  Users,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { PARTNER_CATEGORIES } from '@/lib/help-center-content';
import HelpSearchAsk from '@/components/help-center/HelpSearchAsk';
import TrendingArticles from '@/components/help-center/TrendingArticles';
import { searchHelp } from '@/lib/help-center-search';
import '../help-center.css';

const BASE = '/help-center/partner';

const ICON_MAP = { BookOpen, FileText, Repeat, LayoutDashboard, Users, Code2 };

const FAQ_ITEMS = [
  {
    q: 'How do I join the partner program?',
    a: 'Apply from the Partner page. The team reviews each application by hand; see Before you apply for what reviewers look for and how long review takes. Once approved you get the partner experience, including the Partner Dashboard.',
    href: '/help-center/partner/article/before-you-apply-checklist',
    linkLabel: 'Before you apply: partner checklist',
  },
  {
    q: 'What commission do partners earn?',
    a: 'See the Commission structure article for how earnings are calculated. Payouts run monthly to the bank account you add in Settings, then Payouts.',
    href: '/help-center/partner/article/commission-structure',
    linkLabel: 'Commission structure',
  },
  {
    q: 'Can I use the Ezana API for my own product?',
    a: 'API access is requested through the Ezana API page and granted by the team. Follow the API terms of use and rate limits described there.',
    href: '/help-center/partner/article/api-overview',
    linkLabel: 'API overview',
  },
  {
    q: 'How do I contact partner support?',
    a: 'Email partners@ezana.world for partner-specific questions. For technical API issues, include your partner ID and a description of the issue.',
  },
];

export default function PartnerHelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return PARTNER_CATEGORIES;
    /* Same token index as the type-ahead, so "connect brokerage" or "link my
       broker" filter to the right articles (a raw substring match did not). */
    const hits = new Set(searchHelp(q, { audience: 'partner', limit: 200 }).map((r) => r.slug));
    return PARTNER_CATEGORIES.map((cat) => ({
      ...cat,
      articles: cat.articles.filter((a) => hits.has(a.slug)),
    })).filter((cat) => cat.articles.length > 0);
  }, [searchQuery]);

  return (
    <div className="hc-page">
      <section className="hc-hero">
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href="/help-center"
            className="hc-link-muted mb-3 inline-flex items-center gap-2 text-sm"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Help Center
          </Link>
          <h1 className="hc-title mb-2 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            Partner Support
          </h1>
          <p className="hc-subtitle mb-5 text-lg">
            Resources for Ezana partners, affiliates, and API integrators
          </p>
          <HelpSearchAsk audience="partner" value={searchQuery} onChange={setSearchQuery} />
        </div>
      </section>

      <div className="hc-index-grid mx-auto max-w-6xl px-4 pb-16">
        <section className="min-w-0" aria-labelledby="hc-cats-title">
          <h2 id="hc-cats-title" className="hc-title mb-6 text-2xl font-semibold">
            {searchQuery.trim()
              ? `Matching categories (${filteredCategories.length})`
              : 'Browse by category'}
          </h2>
          {filteredCategories.length === 0 ? (
            <p className="hc-subtitle text-center">
              No articles matched{' '}
              <span className="hc-accent font-semibold">&ldquo;{searchQuery}&rdquo;</span>. Try a
              different term or browse the categories below.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCategories.map((cat) => {
                const Icon = ICON_MAP[cat.iconName] || BookOpen;
                const matchedCount = searchQuery.trim() ? cat.articles.length : null;
                return (
                  <Link
                    key={cat.id}
                    href={`${BASE}/category/${cat.id}`}
                    className="hc-card-interactive group p-6"
                  >
                    <div className="hc-icon-pill mb-4 h-12 w-12 rounded-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="hc-title mb-2 font-semibold group-hover:text-[color:var(--emerald-text)]">
                      {cat.title}
                    </h3>
                    <p className="hc-subtitle mb-4 text-sm">{cat.description}</p>
                    <span className="hc-accent inline-flex items-center gap-1 text-sm font-medium">
                      {matchedCount !== null
                        ? `${matchedCount} match${matchedCount === 1 ? '' : 'es'}`
                        : 'View articles'}
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <TrendingArticles section="partner" />
      </div>

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
                  <p className="m-0">{item.a}</p>
                  {item.href ? (
                    <Link href={item.href} className="hc-link mt-2 inline-flex items-center gap-1">
                      {item.linkLabel || 'Read the article'}
                      <i className="bi bi-arrow-right" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="hc-footer-band px-4 py-16">
        <div className="hc-card mx-auto max-w-2xl p-8 text-center">
          <h2 className="hc-title mb-2 text-xl font-semibold">Still need help?</h2>
          <p className="hc-subtitle mb-6">
            Our partner support team is here for you. Reach out and we&apos;ll get back to you as
            soon as possible.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="mailto:partners@ezana.world" className="hc-btn-primary">
              Contact Partner Support
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/help-center" className="hc-btn-secondary">
              Back to Help Center
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

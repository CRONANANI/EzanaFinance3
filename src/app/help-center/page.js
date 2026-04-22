'use client';

import Link from 'next/link';
import { User, Building2, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/Layout/PageContainer';
import './help-center.css';

export default function HelpCenterChoicePage() {
  return (
    <PageContainer maxWidth="7xl" className="hc-page min-h-screen">
      <section className="hc-hero">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="hc-title mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            How can we help?
          </h1>
          <p className="hc-subtitle mb-12 text-lg">
            Choose the support center that matches your account type
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/help-center/user"
              className="hc-card-interactive group flex flex-col items-center p-8"
            >
              <div className="hc-icon-pill mb-4 h-16 w-16 rounded-2xl">
                <User className="h-8 w-8" />
              </div>
              <h2 className="hc-title mb-2 text-xl font-semibold group-hover:text-[color:var(--emerald-text)]">
                User Support
              </h2>
              <p className="hc-subtitle mb-4 text-center text-sm">
                Portfolio tracking, congressional trades, brokerage connections, and account help for individual investors
              </p>
              <span className="hc-accent inline-flex items-center gap-1 text-sm font-medium">
                Enter User Help Center
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/help-center/partner"
              className="hc-card-interactive group flex flex-col items-center p-8"
            >
              <div className="hc-icon-pill mb-4 h-16 w-16 rounded-2xl">
                <Building2 className="h-8 w-8" />
              </div>
              <h2 className="hc-title mb-2 text-xl font-semibold group-hover:text-[color:var(--emerald-text)]">
                Partner Support
              </h2>
              <p className="hc-subtitle mb-4 text-center text-sm">
                API access, program resources, affiliate tools, and partner dashboard help
              </p>
              <span className="hc-accent inline-flex items-center gap-1 text-sm font-medium">
                Enter Partner Help Center
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
          <p className="hc-faint mt-10 text-sm">
            Not sure?{' '}
            <Link href="/help-center/user" className="hc-link hover:underline">
              User Support
            </Link>{' '}
            is for individual investors.{' '}
            <Link href="/help-center/partner" className="hc-link hover:underline">
              Partner Support
            </Link>{' '}
            is for affiliates and API partners.
          </p>
        </div>
      </section>
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <Link
            href="/"
            className="hc-link-muted inline-flex items-center gap-2 transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Home
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}

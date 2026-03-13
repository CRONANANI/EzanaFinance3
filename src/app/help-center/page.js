'use client';

import Link from 'next/link';
import { User, Building2, ChevronRight } from 'lucide-react';

export default function HelpCenterChoicePage() {
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <section className="relative border-b border-[rgba(16,185,129,0.1)] bg-gradient-to-b from-[#0f1419] to-[#161b22] px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            How can we help?
          </h1>
          <p className="mb-12 text-lg text-[#9ca3af]">
            Choose the support center that matches your account type
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              href="/help-center/user"
              className="group flex flex-col items-center rounded-2xl border border-[rgba(16,185,129,0.2)] bg-[rgba(26,35,50,0.6)] p-8 transition-all hover:border-[#10b981]/50 hover:bg-[rgba(16,185,129,0.08)]"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.15)] text-[#10b981] transition-colors group-hover:bg-[rgba(16,185,129,0.25)]">
                <User className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white group-hover:text-[#10b981]">
                User Support
              </h2>
              <p className="mb-4 text-center text-sm text-[#9ca3af]">
                Portfolio tracking, congressional trades, brokerage connections, and account help for individual investors
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#10b981]">
                Enter User Help Center
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/help-center/partner"
              className="group flex flex-col items-center rounded-2xl border border-[rgba(16,185,129,0.2)] bg-[rgba(26,35,50,0.6)] p-8 transition-all hover:border-[#10b981]/50 hover:bg-[rgba(16,185,129,0.08)]"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(16,185,129,0.15)] text-[#10b981] transition-colors group-hover:bg-[rgba(16,185,129,0.25)]">
                <Building2 className="h-8 w-8" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white group-hover:text-[#10b981]">
                Partner Support
              </h2>
              <p className="mb-4 text-center text-sm text-[#9ca3af]">
                API access, program resources, affiliate tools, and partner dashboard help
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-[#10b981]">
                Enter Partner Help Center
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
          <p className="mt-10 text-sm text-[#6b7280]">
            Not sure? <Link href="/help-center/user" className="text-[#10b981] hover:underline">User Support</Link> is for individual investors. <Link href="/help-center/partner" className="text-[#10b981] hover:underline">Partner Support</Link> is for affiliates and API partners.
          </p>
        </div>
      </section>
      <section className="px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#9ca3af] transition-colors hover:text-[#10b981]"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}

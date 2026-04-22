"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const METALLIC_ICON = "drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]";
const PRO_ICON = "drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)] drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]";

const EZANA_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    icon: (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-zinc-400 to-zinc-600 ${METALLIC_ICON}`}>
        <svg className="w-6 h-6 text-white/95" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>
    ),
    priceMonthly: 0,
    priceYearly: 0,
    users: "1 brokerage account",
    features: [
      { label: "Basic portfolio tracking", included: true },
      { label: "Weekly congressional alerts", included: true },
      { label: "Real-time alerts", included: false },
      { label: "Advanced analytics", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious investors",
    icon: (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-background ${PRO_ICON}`}>
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
    ),
    priceMonthly: 29,
    priceYearly: 278,
    users: "Unlimited brokerage accounts",
    features: [
      { label: "Real-time congressional alerts", included: true },
      { label: "Advanced portfolio analytics", included: true },
      { label: "Institutional holdings (13F)", included: true },
      { label: "AI-powered insights", included: true },
      { label: "Lobbying & contracts data", included: true },
      { label: "Priority support", included: true },
    ],
    recommended: true,
  },
  {
    id: "family",
    name: "Family",
    description: "For households & shared portfolios",
    icon: (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-400 to-slate-600 ${METALLIC_ICON}`}>
        <svg className="w-6 h-6 text-white/95" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
    ),
    priceMonthly: 99,
    priceYearly: 950,
    users: "Up to 5 members",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Shared watchlists & alerts", included: true },
      { label: "Family portfolio dashboard", included: true },
      { label: "Lobbying & contracts data", included: true },
      { label: "Priority support", included: true },
      { label: "14-day free trial", included: true },
    ],
  },
  {
    id: "elite",
    name: "Elite",
    description: "Maximum intelligence",
    icon: (
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 ${METALLIC_ICON}`}>
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5.9M7 21h10m-10 0v-5.9a2 2 0 012-2h6a2 2 0 012 2V21" />
        </svg>
      </div>
    ),
    priceMonthly: 99,
    priceYearly: 950,
    users: "Unlimited everything",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "API access for automation", included: true },
      { label: "Custom watchlists (unlimited)", included: true },
      { label: "Advanced pattern detection", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "White-glove onboarding", included: true },
    ],
  },
];

export function PricingModule({
  title = "Simple, Transparent Pricing",
  subtitle = "Choose the plan that fits your investment strategy.",
  annualBillingLabel = "Pay annually and save 20%",
  buttonLabel = "Get started",
  plans = EZANA_PLANS,
  defaultAnnual = false,
  className,
}) {
  const [isAnnual, setIsAnnual] = React.useState(defaultAnnual);

  return (
    <section
      className={cn(
        "w-full bg-background text-foreground py-20 px-4 md:px-8",
        className
      )}
    >
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl mb-2">{title}</h2>
        <p className="text-muted-foreground mb-8">{subtitle}</p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <span className="text-sm font-medium text-foreground">Monthly</span>
          <ToggleSwitch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={(checked) => setIsAnnual(checked)}
          />
          <span className="text-sm font-medium text-foreground">Annual</span>
          <span className="text-sm text-muted-foreground w-full text-center sm:w-auto">
            {annualBillingLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative border border-muted rounded-xl transition-all hover:shadow-md hover:border-primary/30",
                plan.recommended && "border-primary ring-1 ring-primary/30 scale-[1.03]"
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-0 right-0 mx-auto w-fit bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}

              <CardHeader className="text-center pt-8">
                <div className="flex justify-center mb-4">{plan.icon}</div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="flex items-baseline justify-center gap-1 mb-4 transition-all duration-300">
                  <span className="text-3xl font-bold">${isAnnual ? plan.priceYearly : plan.priceMonthly}</span>
                  {plan.priceMonthly !== 0 && (
                    <span className="text-sm text-muted-foreground">/{isAnnual ? "year" : "month"}</span>
                  )}
                </div>

                <Button
                  variant={plan.recommended ? "default" : "outline"}
                  className="w-full mb-6"
                  asChild
                >
                  <Link href="/sign-up">{buttonLabel}</Link>
                </Button>

                <div className="text-left text-sm">
                  <h4 className="font-semibold mb-2 min-h-[1.5rem]">Overview</h4>
                  <p className="text-muted-foreground mb-4">✓ {plan.users}</p>

                  <h4 className="font-semibold mb-2 min-h-[1.5rem]">Highlights</h4>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {f.included ? (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span
                          className={cn(
                            f.included
                              ? "text-muted-foreground"
                              : "text-muted-foreground/60 line-through"
                          )}
                        >
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

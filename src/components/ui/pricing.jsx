"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, StarIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const frequencies = ["monthly", "yearly"];

const PLANS = [
  {
    name: "Free",
    info: "Perfect for getting started",
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "Connect 1 brokerage account" },
      { text: "Basic portfolio tracking" },
      { text: "Weekly congressional trade alerts" },
      { text: "Limited market data" },
    ],
    btn: { text: "Get Started Free", href: "/sign-up" },
  },
  {
    name: "Pro",
    info: "For serious investors",
    price: { monthly: 29, yearly: Math.round(29 * 12 * 0.8) },
    features: [
      { text: "Unlimited brokerage accounts" },
      { text: "Real-time congressional alerts" },
      { text: "Advanced portfolio analytics" },
      { text: "Institutional holdings (13F)" },
      { text: "AI-powered insights" },
      { text: "Lobbying & contracts data" },
      { text: "Priority support", tooltip: "Get 24/7 chat support" },
    ],
    btn: { text: "Start Free Trial", href: "/sign-up" },
    highlighted: true,
  },
  {
    name: "Family",
    info: "For households & shared portfolios",
    price: { monthly: 99, yearly: Math.round(99 * 12 * 0.8) },
    features: [
      { text: "Everything in Pro (up to 5 members)" },
      { text: "Shared watchlists & alerts" },
      { text: "Family portfolio dashboard" },
      { text: "Lobbying & contracts data" },
      { text: "Priority support" },
      { text: "14-day free trial" },
    ],
    btn: { text: "Start Free Trial", href: "/sign-up" },
  },
];

export function PricingSection({
  plans = PLANS,
  heading = "Simple, Transparent Pricing",
  description = "Choose the plan that fits your investment strategy",
  className,
  ...props
}) {
  const [frequency, setFrequency] = React.useState("monthly");

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center space-y-5 p-4",
        className
      )}
      {...props}
    >
      <div className="mx-auto max-w-xl space-y-2">
        <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">
          {heading}
        </h2>
        {description && (
          <p className="text-center text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>
      <div className="mx-auto flex w-fit rounded-full border border-border bg-muted/30 p-1">
        {frequencies.map((freq) => (
          <button
            key={freq}
            type="button"
            onClick={() => setFrequency(freq)}
            className="relative px-4 py-1 text-sm capitalize text-foreground"
          >
            <span className="relative z-10">{freq}</span>
            {frequency === freq && (
              <motion.span
                layoutId="frequency"
                transition={{ type: "spring", duration: 0.4 }}
                className="absolute inset-0 z-0 rounded-full bg-foreground mix-blend-difference"
              />
            )}
          </button>
        ))}
      </div>
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <PricingCard plan={plan} key={plan.name} frequency={frequency} />
        ))}
      </div>
    </div>
  );
}

function PricingCard({ plan, frequency = "monthly" }) {
  const price = plan.price[frequency] ?? plan.price.monthly;
  const discount =
    plan.name !== "Free" && frequency === "yearly"
      ? Math.round(
          ((plan.price.monthly * 12 - plan.price.yearly) /
            plan.price.monthly /
            12) *
            100
        )
      : 0;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-lg border border-border",
        plan.highlighted && "ring-1 ring-primary/30"
      )}
    >
      <div
        className={cn(
          "rounded-t-lg border-b border-border p-4",
          plan.highlighted ? "bg-muted/40" : "bg-muted/20"
        )}
      >
        <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
          {plan.highlighted && (
            <span className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs">
              <StarIcon className="h-3 w-3 fill-current" />
              Popular
            </span>
          )}
          {frequency === "yearly" && discount > 0 && (
            <span className="flex items-center gap-1 rounded-md border border-primary bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {discount}% off
            </span>
          )}
        </div>
        <div className="text-lg font-medium">{plan.name}</div>
        <p className="text-sm font-normal text-muted-foreground">{plan.info}</p>
        <h3 className="mt-2 flex items-end gap-1">
          <span className="text-3xl font-bold">${price}</span>
          <span className="text-muted-foreground">
            {plan.name !== "Free"
              ? "/" + (frequency === "monthly" ? "month" : "year")
              : ""}
          </span>
        </h3>
      </div>
      <div
        className={cn(
          "space-y-4 px-4 py-6 text-sm text-muted-foreground",
          plan.highlighted && "bg-muted/10"
        )}
      >
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-foreground" />
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <p
                    className={cn(
                      feature.tooltip && "cursor-pointer border-b border-dashed border-muted-foreground"
                    )}
                  >
                    {feature.text}
                  </p>
                </TooltipTrigger>
                {feature.tooltip && (
                  <TooltipContent>
                    <p>{feature.tooltip}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "mt-auto w-full border-t border-border p-3",
          plan.highlighted && "bg-muted/40"
        )}
      >
        <Button
          className="w-full"
          variant={plan.highlighted ? "default" : "outline"}
          asChild
        >
          <Link href={plan.btn.href}>{plan.btn.text}</Link>
        </Button>
      </div>
    </div>
  );
}

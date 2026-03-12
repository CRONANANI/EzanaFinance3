"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const DEFAULT_ITEMS = [
  {
    question: "What is Ezana Finance?",
    answer:
      "Ezana Finance is a comprehensive investment analytics platform that provides institutional-grade market intelligence and portfolio management tools to individual investors.",
  },
  {
    question: "How do I get started?",
    answer:
      "Click \"Sign Up\" to create your free account, complete onboarding, and start tracking congressional trades and market intelligence.",
  },
  {
    question: "How does congressional trading tracking work?",
    answer:
      "We aggregate publicly disclosed congressional stock trades from STOCK Act filings. We monitor all 535 members, update in real-time, and provide advanced filtering and alerts.",
  },
  {
    question: "Can I follow specific congress members?",
    answer:
      "Yes! Create custom watchlists of congress members, receive real-time alerts when they trade, and view their complete trading history.",
  },
  {
    question: "Do I need to connect my brokerage account?",
    answer:
      "No, it's optional. You can track congressional trades without linking accounts, enter holdings manually, or connect for automatic syncing.",
  },
  {
    question: "What is the early access waitlist?",
    answer:
      "The first 1,000 users to sign up receive lifetime legacy access—no subscription, no limits. Join the waitlist to be notified at launch.",
  },
];

export function Faq1({
  heading = "Frequently asked questions",
  items = DEFAULT_ITEMS,
  onContactClick,
}) {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="mb-4 text-3xl font-semibold text-foreground md:mb-11 md:text-5xl">
          {heading}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left text-foreground hover:text-foreground/80 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-6 text-center">
          <Link
            href="/help-center"
            className="text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
          >
            view our more in depth help center
          </Link>
        </p>
        {onContactClick && (
          <div className="mt-12 rounded-xl border border-border bg-card/30 p-8 text-center">
            <h3 className="mb-2 text-xl font-semibold text-foreground">Still have questions?</h3>
            <p className="mb-4 text-muted-foreground">
              Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
            </p>
            <button
              type="button"
              onClick={onContactClick}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Contact Support
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

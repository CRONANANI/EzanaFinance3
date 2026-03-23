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
    question: "How does Ezana Finance know what politicians are trading before the news does?",
    answer:
      "We aggregate data directly from official congressional financial disclosures filed with the Clerk of the House and Secretary of the Senate under the STOCK Act. Our system parses new filings within minutes of publication — often days or weeks before mainstream media picks them up. Every trade you see on the platform links back to the original government filing so you can verify it yourself.",
  },
  {
    question: "Is it legal to trade based on what members of Congress buy and sell?",
    answer:
      "Yes. Congressional trade disclosures are public records made available under the STOCK Act of 2012. While members of Congress are prohibited from trading on nonpublic information, the public is free to view and act on their disclosed transactions. Ezana simply makes this public data easier to access, filter, and analyze — we do not provide investment advice.",
  },
  {
    question: "What happens to my data when I connect my brokerage account?",
    answer:
      "Your brokerage connection is handled through Plaid and Alpaca — industry-standard infrastructure used by apps like Venmo, Robinhood, and Coinbase. Ezana never sees or stores your brokerage login credentials. We receive read-only access to your holdings and transactions for portfolio tracking. Your financial data is encrypted in transit and at rest, and you can disconnect your brokerage at any time from Settings.",
  },
  {
    question: "How is Ezana different from free tools like Quiver Quantitative or Capitol Trades?",
    answer:
      "Free congressional trade trackers show you raw data. Ezana turns that data into actionable intelligence. We combine congressional trades with hedge fund 13F filings, government contract awards, lobbying expenditures, and patent data — then correlate it all with market movements. Add real-time alerts, portfolio analytics, copy trading, community insights, and a full brokerage account, and you have an institutional-grade platform, not just a data table.",
  },
  {
    question: "What does the first 1,000 users get lifetime legacy access actually mean?",
    answer:
      "The first 1,000 users who sign up during our early access period receive permanent Personal Advanced access — the full $19/month tier — forever. No monthly subscription, no annual renewal, no price increases. This includes real-time congressional alerts, full 13F filing access, legendary investor portfolios, unlimited watchlists, AI-powered research, API access, and priority support. Once the 1,000 spots are filled, the offer closes permanently.",
  },
  {
    question: "Can I actually execute trades directly on Ezana, or is it just a research tool?",
    answer:
      "Both. Ezana is a full-featured platform. You can use our research tools — congressional trading data, company analysis, market intelligence — without ever placing a trade. But if you want to act on what you find, you can open a brokerage account directly within Ezana (powered by Alpaca Securities, a FINRA/SIPC member). Buy and sell stocks, invest fractional shares, copy partner strategies, and manage your portfolio all in one place. Your account is SIPC insured up to $500,000.",
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
          <div className="mt-12 rounded-xl border border-border/50 bg-transparent p-8 text-center">
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

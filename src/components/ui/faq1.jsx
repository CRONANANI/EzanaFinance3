"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

const DEFAULT_ITEMS = [
  {
    id: "what-is-ezana",
    question: "What exactly does Ezana do?",
    answer:
      "Ezana is a personal investment research platform that combines portfolio tracking, company and macro analysis, prediction market signals, and a learning center — all designed for everyday investors rather than professional traders. You can paper-trade, connect a real brokerage, follow politicians' trades, watch sectors and geopolitics, and compare yourself honestly against the broader platform.",
  },
  {
    id: "need-brokerage",
    question: "Do I need a brokerage account to use Ezana?",
    answer:
      "No. Every feature works with a paper-trading portfolio you build inside Ezana. If you later connect a real brokerage, the platform automatically switches to using your live holdings — your watchlists, metrics, and analysis all carry over seamlessly.",
  },
  {
    id: "data-sources",
    question: "Where does Ezana get its data?",
    answer:
      "From the source providers you'd expect: Financial Modeling Prep for market and sector data, the World Bank and IMF for macro indicators, SEC EDGAR for filings, Polymarket for prediction market odds, GDELT for geolocated global news, and additional specialized providers for areas like congressional trading and institutional holdings. Every data category on the landing page shows its sources on hover.",
  },
  {
    id: "peer-comparison",
    question: "How is my portfolio compared to other users?",
    answer:
      "Your performance chart shows your cumulative return alongside the platform-wide median — what the typical Ezana user earned over the same window — plus the top 25% cohort line. All peer data is aggregated and anonymized; individual users' portfolios are never exposed. Comparisons are available across 1W, 1M, 3M, and YTD windows.",
  },
  {
    id: "pricing",
    question: "Is the platform free?",
    answer:
      "The Starter tier is free forever and includes paper trading, core research, community access, and the Learning Center basics. Paid tiers unlock unlimited watchlists, real brokerage connections, and advanced analytics like stress testing, MPT, Black-Litterman, and Monte Carlo simulation. Every paid plan includes a 14-day free trial, no charge until the trial ends.",
  },
  {
    id: "cancel",
    question: "Can I cancel anytime?",
    answer:
      "Yes, from your account settings. Cancel during the trial and you're never charged. Cancel during a paid period and you keep access through the end of that period — no proration surprises, no retention gauntlets.",
  },
  {
    id: "security",
    question: "Is my financial data secure?",
    answer:
      "We never store your brokerage credentials. Live accounts connect through regulated read-only aggregators, all data in transit is encrypted, and we don't sell user data or serve ads inside the product. Aggregate peer comparisons pool data across users in a way that can't be reverse-engineered to identify individuals.",
  },
  {
    id: "achievements",
    question: "How do I earn badges and achievements?",
    answer:
      "By doing the things that make you a better investor over time — completing Learning Center courses, participating in community discussions, hitting portfolio milestones like diversification and contribution streaks. Badges appear on your profile, and earning them unlocks features and recognition across the community.",
  },
];

export function Faq1({
  heading = "Frequently asked",
  items = DEFAULT_ITEMS,
  onContactClick,
}) {
  const [openId, setOpenId] = useState(null);
  const buttonRefs = useRef([]);

  const toggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  // Arrow-key navigation between the question buttons. Keeps Tab order intact
  // (each button is still focusable in sequence) but lets keyboard users move
  // up/down through the list quickly once focused.
  const handleKeyDown = (event, index) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = buttonRefs.current[(index + 1) % items.length];
      next?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const prev =
        buttonRefs.current[(index - 1 + items.length) % items.length];
      prev?.focus();
    }
  };

  return (
    <section className="landing-faq-section">
      <div className="landing-faq-container">
        <h2 className="landing-faq-heading">{heading}</h2>
        <div className="landing-faq-list">
          {items.map((item, index) => {
            const id = item.id || `faq-${index}`;
            const isOpen = openId === id;
            return (
              <FaqRow
                key={id}
                id={id}
                question={item.question}
                answer={item.answer}
                isOpen={isOpen}
                isFirst={index === 0}
                onToggle={() => toggle(id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                buttonRef={(el) => {
                  buttonRefs.current[index] = el;
                }}
              />
            );
          })}
        </div>
        <p className="landing-faq-help-link">
          <Link href="/help-center">
            view our more in depth help center
          </Link>
        </p>
        {onContactClick && (
          <div className="landing-faq-contact-box">
            <h3 className="landing-faq-contact-title">Still have questions?</h3>
            <p className="landing-faq-contact-text">
              Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
            </p>
            <button
              type="button"
              onClick={onContactClick}
              className="landing-faq-contact-btn"
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

function FaqRow({
  id,
  question,
  answer,
  isOpen,
  isFirst,
  onToggle,
  onKeyDown,
  buttonRef,
}) {
  const answerRef = useRef(null);
  const [height, setHeight] = useState(0);

  // Measure the answer's natural height when opening so the transition animates
  // from 0 → actual-height, then back to 0 on close. Using scrollHeight here
  // (rather than letting content drive height directly) is what gives us the
  // smooth collapse that a raw <details> element can't do.
  useEffect(() => {
    if (!answerRef.current) return;
    setHeight(isOpen ? answerRef.current.scrollHeight : 0);
  }, [isOpen, answer]);

  return (
    <div className={`landing-faq-item${isFirst ? " landing-faq-item--first" : ""}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        onKeyDown={onKeyDown}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${id}`}
        id={`faq-trigger-${id}`}
        className={`landing-faq-question${isOpen ? " landing-faq-question--open" : ""}`}
      >
        <span className="landing-faq-question-text">{question}</span>
        <span
          className={`landing-faq-icon${isOpen ? " landing-faq-icon--open" : ""}`}
          aria-hidden="true"
        >
          <Plus size={16} strokeWidth={2.5} />
        </span>
      </button>
      <div
        id={`faq-panel-${id}`}
        role="region"
        aria-labelledby={`faq-trigger-${id}`}
        className="landing-faq-answer-wrap"
        style={{ height: `${height}px` }}
      >
        <div ref={answerRef} className="landing-faq-answer-inner">
          <p className="landing-faq-answer">{answer}</p>
        </div>
      </div>
    </div>
  );
}

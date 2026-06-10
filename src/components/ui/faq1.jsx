'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const DEFAULT_ITEMS = [
  {
    id: 'data-source-of-truth',
    question: 'What’s the source of truth behind the alternative data — and how current is it?',
    answer:
      "Each signal traces to a primary source, not an aggregator's interpretation: House and Senate financial disclosures for congressional trades, SEC EDGAR for 13F/13D/13G filings, FEC records for campaign finance, GDELT for global event data, Polymarket for prediction-market odds, and the World Bank and IMF for macro indicators. Filings-based data refreshes as new disclosures are published; market and event data update on their providers' native cadence. Every data category on the landing page shows its underlying sources on hover, so you can audit where a number comes from before you trade on it.",
  },
  {
    id: 'congressional-edge',
    question: 'Does following congressional or institutional trades actually produce an edge — or is it just interesting?',
    answer:
      "It's a signal, not a guarantee, and we present it that way. Disclosure timing means you're never seeing a trade in real time — there's a legally mandated reporting lag — so this isn't front-running anyone. What it is: a structured view of how informed, access-rich actors are positioned, which historically has been hard for individuals to assemble. The value is in pattern recognition across many filings, cross-referenced with insider activity and institutional flows, not in blindly mirroring one politician's single trade.",
  },
  {
    id: 'paper-to-live',
    question: 'What happens to my analysis and watchlists when I switch from paper trading to a connected brokerage?',
    answer:
      "Everything carries over. The paper portfolio exists so you can build conviction and test a process before real money is involved; when you connect a brokerage, the platform swaps in your live holdings and every watchlist, metric, alert, and piece of analysis you've built continues working against real positions. You don't rebuild anything, and you don't lose your history.",
  },
  {
    id: 'brokerage-boundary',
    question: 'You connect to my brokerage — what can Ezana actually touch, and what can it never do?',
    answer:
      "Brokerage connections run through regulated, read-only aggregators. Ezana can read positions and balances to power your analysis; it cannot move money, place trades on your live account, or access your login credentials — we never see or store them. Paper trading is the only place orders execute, and that's simulated by design. We also don't sell user data or run ads inside the product, so your holdings aren't a revenue stream for anyone but you.",
  },
  {
    id: 'who-its-for',
    question: 'Who is this actually built for — and who is it not for?',
    answer:
      "It's built for the investor who's outgrown a broker's basic dashboard and wants the data professionals use, but who isn't a day trader chasing momentum. If you want one-click meme-stock tips or a copy-trading autopilot, this isn't that. If you want to understand why a position makes sense — across fundamentals, institutional positioning, macro context, and your own risk tolerance — and to build a repeatable process, that's exactly who Ezana is for. The family-office tier extends the same toolkit to people managing larger, multi-account portfolios.",
  },
];

export function Faq1({ heading = 'Frequently asked', items = DEFAULT_ITEMS, onContactClick }) {
  const [openId, setOpenId] = useState(null);
  const buttonRefs = useRef([]);

  const toggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  // Arrow-key navigation between the question buttons. Keeps Tab order intact
  // (each button is still focusable in sequence) but lets keyboard users move
  // up/down through the list quickly once focused.
  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = buttonRefs.current[(index + 1) % items.length];
      next?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = buttonRefs.current[(index - 1 + items.length) % items.length];
      prev?.focus();
    }
  };

  return (
    <section className="landing-faq-section">
      <div className="landing-faq-container">
        <p className="landing-faq-eyebrow lf-mono">Support</p>
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
          <Link href="/help-center">view our more in depth help center</Link>
        </p>
        {onContactClick && (
          <div className="landing-faq-contact-box">
            <h3 className="landing-faq-contact-title">Still have questions?</h3>
            <p className="landing-faq-contact-text">
              Can&apos;t find the answer you&apos;re looking for? Our support team is here to help.
            </p>
            <button type="button" onClick={onContactClick} className="landing-faq-contact-btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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

function FaqRow({ id, question, answer, isOpen, isFirst, onToggle, onKeyDown, buttonRef }) {
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
    <div className={`landing-faq-item${isFirst ? ' landing-faq-item--first' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        onKeyDown={onKeyDown}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${id}`}
        id={`faq-trigger-${id}`}
        className={`landing-faq-question${isOpen ? ' landing-faq-question--open' : ''}`}
      >
        <span className="landing-faq-question-text">{question}</span>
        <span
          className={`landing-faq-icon${isOpen ? ' landing-faq-icon--open' : ''}`}
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

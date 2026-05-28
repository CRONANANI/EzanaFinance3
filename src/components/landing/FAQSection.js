'use client';

import { useState } from 'react';
import Link from 'next/link';

const faqData = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'What is Ezana Finance?',
        a: 'Ezana Finance is an investment intelligence platform that combines institutional-grade market research, real-time congressional trade tracking, portfolio analytics, and a structured learning center — all in one place.',
      },
      {
        q: 'How do I get started?',
        a: 'Click "Sign Up" to create your account, complete the onboarding walkthrough, and you\'ll have immediate access to market intelligence, watchlists, and the learning center. You can optionally connect your brokerage for automatic portfolio syncing.',
      },
    ],
  },
  {
    category: 'Community & Competitions',
    items: [
      {
        q: 'What are the best ways to get engaged and involved in the community?',
        a: 'Join discussions in the Community feed, follow traders whose strategies interest you, share your trade notes with analysis, build public watchlists, and participate in the leaderboard rankings. The more active you are, the higher your ELO rating climbs, unlocking new tiers and visibility.',
      },
      {
        q: 'What kind of prizes can I earn from participating in competitions on the platform?',
        a: 'Ezana runs seasonal trading competitions where top performers earn recognition badges, leaderboard placement, and featured profile status. Prizes can include premium feature access, partner program invitations, and exclusive community roles. Check the Community page for active and upcoming competitions.',
      },
      {
        q: 'How does the ELO rating system work?',
        a: 'Your ELO rating reflects your overall engagement across three pillars: trading performance, learning progress, and community contribution. You earn points by completing courses, maintaining winning streaks, posting quality trade analyses, and climbing the leaderboard. Higher ELO tiers (Novice → Apprentice → Analyst → Strategist → Expert → Master) unlock profile badges and community recognition.',
      },
    ],
  },
  {
    category: 'Platform Features',
    items: [
      {
        q: 'How does congressional trading tracking work?',
        a: 'We aggregate publicly disclosed congressional stock trades from STOCK Act filings. We monitor all 535 members, update in real-time as new filings are published, and provide advanced filtering by politician, party, committee, sector, and transaction size.',
      },
      {
        q: 'Can I connect my brokerage account?',
        a: "Yes. Go to Settings → Integrations and connect through Plaid's secure flow. Ezana receives read-only access to your positions and balances — we never execute trades or move money. You can also track a paper trading portfolio without connecting a brokerage.",
      },
      {
        q: 'What data sources does Ezana use?',
        a: 'Ezana aggregates data from SEC EDGAR (13F, 13D filings), Quiver Quantitative (congressional disclosures), Financial Modeling Prep (market data and earnings), Polymarket (prediction markets), the World Bank and IMF (macro indicators), and our own platform signals from the Ezana community.',
      },
    ],
  },
];

export function FAQSection() {
  const [openItem, setOpenItem] = useState(null);

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container">
        <div className="faq-header">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          <p className="faq-subtitle">
            If you&apos;re new to Ezana Finance or looking to maximize the platform experience, this
            guide will help you learn more about our features and capabilities.
          </p>
        </div>

        <div className="faq-categories">
          {faqData.map((cat, catIdx) => (
            <div key={catIdx} className="faq-category">
              <h3 className="category-title">{cat.category}</h3>
              <div className="faq-items">
                {cat.items.map((item, idx) => {
                  const id = `${catIdx}-${idx}`;
                  const isOpen = openItem === id;
                  return (
                    <div key={idx} className={`faq-item ${isOpen ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="faq-question"
                        aria-expanded={isOpen}
                        onClick={() => setOpenItem(isOpen ? null : id)}
                      >
                        <span className="question-text">{item.q}</span>
                        <span className="faq-icon">
                          <i
                            className={`bi ${isOpen ? 'bi-dash-circle' : 'bi-plus-circle'}`}
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                      <div className="faq-answer">
                        <div className="answer-content">
                          <p>{item.a}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

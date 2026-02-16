'use client';

import { useState } from 'react';
import Link from 'next/link';

const faqData = [
  {
    category: 'Getting Started',
    items: [
      { q: 'What is Ezana Finance?', a: 'Ezana Finance is a comprehensive investment analytics platform that provides institutional-grade market intelligence and portfolio management tools to individual investors.' },
      { q: 'How do I get started?', a: 'Click "Sign Up" to create your free account, complete onboarding, and start tracking congressional trades and market intelligence.' },
    ],
  },
  {
    category: 'Congressional Trading',
    items: [
      { q: 'How does congressional trading tracking work?', a: 'We aggregate publicly disclosed congressional stock trades from STOCK Act filings. We monitor all 535 members, update in real-time, and provide advanced filtering and alerts.' },
      { q: 'Can I follow specific congress members?', a: 'Yes! Create custom watchlists of congress members, receive real-time alerts when they trade, and view their complete trading history.' },
    ],
  },
  {
    category: 'Portfolio Management',
    items: [
      { q: 'Do I need to connect my brokerage account?', a: 'No, it\'s optional. You can track congressional trades without linking accounts, enter holdings manually, or connect for automatic syncing.' },
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
            If you're new to Ezana Finance or looking to maximize the platform experience,
            this guide will help you learn more about our features and capabilities.
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
                        <span className="faq-icon"><i className={`bi ${isOpen ? 'bi-dash-circle' : 'bi-plus-circle'}`} aria-hidden="true" /></span>
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

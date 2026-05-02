'use client';

import Link from 'next/link';
import './partner-apply.css';

export default function PartnerApplyPage() {
  return (
    <div className="signin-dark-lock partner-apply-page">
      <div className="partner-apply-container">
        <Link href="/" className="partner-apply-back"><i className="bi bi-arrow-left" /> Back to Home</Link>

        <div className="partner-apply-hero">
          <span className="partner-apply-badge">PARTNER PROGRAM</span>
          <h1>Build Your Financial Brand on Ezana</h1>
          <p>Join a select group of traders, creators, and financial professionals who earn revenue by sharing their expertise with thousands of investors on the Ezana platform.</p>
        </div>

        <div className="partner-apply-grid">
          <div className="partner-apply-card">
            <i className="bi bi-graph-up-arrow" />
            <h3>Copy Trading Revenue</h3>
            <p>Publish your trading strategies. Earn 10% of your copiers&apos; profits every month. More profitable trades = more copiers = more revenue.</p>
          </div>
          <div className="partner-apply-card">
            <i className="bi bi-mortarboard" />
            <h3>Course Revenue</h3>
            <p>Create and sell investment courses. Earn 70% revenue share on every enrollment. Build a library of content that earns passively.</p>
          </div>
          <div className="partner-apply-card">
            <i className="bi bi-pen" />
            <h3>Ezana Echo Publishing</h3>
            <p>Publish market analysis and insights on Ezana Echo. Grow your subscriber base and establish your reputation as a thought leader.</p>
          </div>
          <div className="partner-apply-card">
            <i className="bi bi-link-45deg" />
            <h3>Referral Commissions</h3>
            <p>Earn $25 for every new user who signs up with your referral link and activates their account. No cap on referrals.</p>
          </div>
        </div>

        <div className="partner-apply-section">
          <h2>Eligibility Requirements</h2>
          <div className="partner-apply-requirements">
            <div className="partner-apply-req">
              <i className="bi bi-check-circle-fill" />
              <div>
                <strong>Minimum 2 years of investing or trading experience</strong>
                <p>Active participation in financial markets with a demonstrable track record.</p>
              </div>
            </div>
            <div className="partner-apply-req">
              <i className="bi bi-check-circle-fill" />
              <div>
                <strong>Valid government-issued ID</strong>
                <p>Passport, driver&apos;s license, or national ID for identity verification (KYC).</p>
              </div>
            </div>
            <div className="partner-apply-req">
              <i className="bi bi-check-circle-fill" />
              <div>
                <strong>Proof of financial activity</strong>
                <p>Brokerage statement, CFA/CFP/FRM certification, or professional credentials.</p>
              </div>
            </div>
            <div className="partner-apply-req">
              <i className="bi bi-check-circle-fill" />
              <div>
                <strong>Content creation ability</strong>
                <p>Willingness to publish strategies, courses, or articles on the platform.</p>
              </div>
            </div>
            <div className="partner-apply-req">
              <i className="bi bi-check-circle-fill" />
              <div>
                <strong>Clean regulatory history</strong>
                <p>No SEC, FINRA, or equivalent regulatory actions or sanctions.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="partner-apply-section">
          <h2>Application Process</h2>
          <div className="partner-apply-steps">
            <div className="partner-apply-step">
              <div className="partner-apply-step-num">1</div>
              <h4>Screening Form</h4>
              <p>Fill out your background, investment experience, and what you plan to contribute to the platform.</p>
            </div>
            <div className="partner-apply-step">
              <div className="partner-apply-step-num">2</div>
              <h4>Email Verification</h4>
              <p>Receive a secure link to verify your email and continue the application.</p>
            </div>
            <div className="partner-apply-step">
              <div className="partner-apply-step-num">3</div>
              <h4>Identity & Documents</h4>
              <p>Upload your government ID and proof of financial credentials for verification.</p>
            </div>
            <div className="partner-apply-step">
              <div className="partner-apply-step-num">4</div>
              <h4>Review & Approval</h4>
              <p>Our team reviews your application within 5–7 business days. Approved partners get instant access.</p>
            </div>
          </div>
        </div>

        <div className="partner-apply-cta">
          <Link href="/auth/partner/apply/form" className="partner-apply-btn">
            Start Application <i className="bi bi-arrow-right" />
          </Link>
          <p>Takes approximately 5 minutes. Have your LinkedIn profile and credentials ready.</p>
        </div>
      </div>
    </div>
  );
}

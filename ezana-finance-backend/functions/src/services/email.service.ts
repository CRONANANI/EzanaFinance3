import { apiConfig } from "../config/apis";

/**
 * Email Service (SendGrid)
 * Sign up at https://sendgrid.com/ for an API key.
 * Free: 100 emails/day | Essentials: $19.95/month
 *
 * Install: npm install @sendgrid/mail
 */
class EmailService {
  private get apiKey() {
    return apiConfig.sendgrid.apiKey;
  }

  private get fromEmail() {
    return apiConfig.sendgrid.fromEmail;
  }

  private get hasKey() {
    return !!this.apiKey;
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.hasKey) {
      console.warn("SendGrid not configured - email not sent:", subject);
      return false;
    }
    try {
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(this.apiKey);
      await sgMail.send({ to, from: this.fromEmail, subject, html });
      return true;
    } catch (error) {
      console.error("Email send error:", error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
    return this.sendEmail(
      to,
      "Welcome to Ezana Finance!",
      `<h2>Welcome, ${name}!</h2>
       <p>Thank you for joining Ezana Finance. Here is what you can do:</p>
       <ul>
         <li>Track your investment portfolio in real-time</li>
         <li>Monitor congressional trading activity</li>
         <li>Research companies with financial models</li>
         <li>Get personalized market alerts</li>
       </ul>
       <p><a href="https://ezanafinance.com">Get started now</a></p>`
    );
  }

  async sendTradeAlert(to: string, alert: { symbol: string; action: string; details: string }) {
    return this.sendEmail(
      to,
      `Trade Alert: ${alert.symbol} - ${alert.action}`,
      `<h3>${alert.symbol} - ${alert.action}</h3><p>${alert.details}</p>`
    );
  }

  async sendDailyDigest(to: string, digest: {
    portfolioValue: number;
    dayChange: number;
    dayChangePercent: number;
    topMovers: Array<{ symbol: string; change: number }>;
    newsCount: number;
  }) {
    const sign = digest.dayChange >= 0 ? "+" : "";
    return this.sendEmail(
      to,
      `Daily Digest: Portfolio ${sign}${digest.dayChangePercent.toFixed(2)}%`,
      `<h2>Your Daily Portfolio Digest</h2>
       <p><strong>Portfolio Value:</strong> $${digest.portfolioValue.toLocaleString()}</p>
       <p><strong>Day Change:</strong> ${sign}$${digest.dayChange.toFixed(2)} (${sign}${digest.dayChangePercent.toFixed(2)}%)</p>
       <h3>Top Movers</h3>
       <ul>${digest.topMovers.map((m) => `<li>${m.symbol}: ${m.change >= 0 ? "+" : ""}${m.change.toFixed(2)}%</li>`).join("")}</ul>
       <p>${digest.newsCount} new market stories today.</p>`
    );
  }

  async sendPasswordReset(to: string, resetLink: string) {
    return this.sendEmail(
      to,
      "Reset Your Password - Ezana Finance",
      `<h2>Password Reset</h2>
       <p>Click the link below to reset your password:</p>
       <p><a href="${resetLink}">Reset Password</a></p>
       <p>This link expires in 1 hour.</p>`
    );
  }
}

export default new EmailService();

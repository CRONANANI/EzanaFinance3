import { apiConfig } from "../config/apis";

/**
 * Stripe Payment & Subscription Service
 * Sign up at https://stripe.com/ for API keys.
 * Cost: 2.9% + $0.30 per transaction
 *
 * Features: subscriptions, invoicing, billing portal, webhooks.
 * Install: npm install stripe
 */

interface SubscriptionPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "Basic portfolio tracking",
      "5 watchlist stocks",
      "Daily market summaries",
      "Limited API calls",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 14.99,
    priceYearly: 149.99,
    features: [
      "Unlimited portfolio tracking",
      "Unlimited watchlist",
      "Real-time quotes",
      "Technical indicators",
      "Financial statements",
      "Analyst ratings",
      "Priority support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    priceMonthly: 29.99,
    priceYearly: 299.99,
    features: [
      "Everything in Pro",
      "AI-powered analysis (Claude)",
      "Custom alerts & notifications",
      "DCF & financial models",
      "Congressional trade alerts",
      "Insider trading data",
      "API access",
      "Dedicated support",
    ],
  },
];

class StripeService {
  private get secretKey() { return apiConfig.stripe.secretKey; }
  private get hasKey() { return !!this.secretKey; }

  getPlans() {
    return PLANS;
  }

  async createCheckoutSession(userId: string, planId: string, billing: "monthly" | "yearly" = "monthly") {
    if (!this.hasKey) {
      throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY in environment.");
    }
    const Stripe = require("stripe");
    const stripe = new Stripe(this.secretKey);
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error("Invalid plan");

    const priceId = billing === "yearly" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) throw new Error("Stripe price not configured for this plan");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/subscription/cancel`,
      client_reference_id: userId,
      metadata: { userId, planId },
    });

    return { sessionId: session.id, url: session.url };
  }

  async createBillingPortalSession(customerId: string) {
    if (!this.hasKey) throw new Error("Stripe not configured");
    const Stripe = require("stripe");
    const stripe = new Stripe(this.secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/settings`,
    });
    return { url: session.url };
  }

  async handleWebhook(payload: string, signature: string) {
    if (!this.hasKey) throw new Error("Stripe not configured");
    const Stripe = require("stripe");
    const stripe = new Stripe(this.secretKey);
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      apiConfig.stripe.webhookSecret
    );
    return event;
  }
}

export default new StripeService();

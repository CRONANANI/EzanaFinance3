'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const BASE = '/help-center/partner';

const ARTICLES = {
  'join-partner-program': { title: 'How to join the partner program', category: 'Partner Onboarding', content: `<p>To join the Ezana partner program, visit our Partner page and complete the application form. You'll need to provide information about your business or platform and how you plan to use Ezana.</p><p class="mt-4">Once submitted, our team reviews applications within 1-2 business days. Approved partners receive access to the Partner Dashboard, API keys, and referral tools.</p>` },
  'partner-eligibility': { title: 'Partner eligibility requirements', category: 'Partner Onboarding', content: `<p>Partners must operate a legitimate business or platform. We accept affiliates, content creators, developers, and businesses that can drive qualified users to Ezana.</p><p class="mt-4">Requirements include: valid contact information, a clear use case, and compliance with our partner terms. We reserve the right to decline or revoke access if terms are violated.</p>` },
  'partner-account-setup': { title: 'Setting up your partner account', category: 'Partner Onboarding', content: `<p>After approval, log in to the Partner Dashboard with your credentials. Complete your profile, add payment details for payouts, and generate your API keys if you need programmatic access.</p><p class="mt-4">Create your first referral link from the Affiliate section to start tracking referrals.</p>` },
  'api-keys': { title: 'Getting your API keys', category: 'API Access', content: `<p>API keys are available in the Partner Dashboard under API Access. Click "Generate API Key" to create a new key. Keep your keys secure and never expose them in client-side code.</p><p class="mt-4">Use the API key in the Authorization header: <code class="rounded bg-[rgba(16,185,129,0.1)] px-1 py-0.5 text-[#10b981]">Authorization: Bearer YOUR_API_KEY</code></p>` },
  'api-rate-limits': { title: 'API rate limits and usage', category: 'API Access', content: `<p>Rate limits vary by plan. Standard partners typically have 100 requests per minute. Higher tiers are available for high-volume integrations.</p><p class="mt-4">Monitor your usage in the Partner Dashboard. Exceeding limits returns HTTP 429. Implement exponential backoff for retries.</p>` },
  webhooks: { title: 'Webhook integration', category: 'API Access', content: `<p>Configure webhooks in the Partner Dashboard to receive real-time events (e.g., new referrals, subscription events). Provide a valid HTTPS endpoint and verify the signature on incoming payloads.</p>` },
  'referral-links': { title: 'Creating referral links', category: 'Affiliate & Referral Tools', content: `<p>In the Partner Dashboard, go to Affiliate → Referral Links. Create a new link and optionally add UTM parameters for tracking. Share the link on your site, social media, or in content.</p><p class="mt-4">Each link tracks clicks and conversions. Use unique links for different campaigns to compare performance.</p>` },
  'referral-tracking': { title: 'Tracking referrals and commissions', category: 'Affiliate & Referral Tools', content: `<p>The Partner Dashboard shows real-time referral data: clicks, sign-ups, and conversions. Filter by date range and campaign.</p><p class="mt-4">Commissions are credited when referred users complete qualifying actions (e.g., subscription). Payouts are processed monthly.</p>` },
  'commission-structure': { title: 'Commission structure', category: 'Affiliate & Referral Tools', content: `<p>Commission rates depend on your partner tier and the referred user's subscription. See your Partner Dashboard for your current rates.</p><p class="mt-4">Commissions are paid out monthly via your configured payment method. Minimum payout thresholds may apply.</p>` },
  'dashboard-overview': { title: 'Partner Dashboard overview', category: 'Partner Dashboard', content: `<p>The Partner Dashboard gives you a complete view of your partnership. Key sections include: Overview (summary metrics), Referrals (links and conversions), API (keys and usage), and Payouts (earnings and payment history).</p>` },
  'partner-analytics': { title: 'Viewing analytics and performance', category: 'Partner Dashboard', content: `<p>Analytics are available in the Partner Dashboard. View referral performance over time, top-performing links, and conversion rates. Export data for your own reporting.</p>` },
  payouts: { title: 'Payout and payment methods', category: 'Partner Dashboard', content: `<p>Add your payment method in Partner Dashboard → Payouts. We support bank transfer and PayPal. Payouts are processed monthly for earnings above the minimum threshold.</p>` },
  'brand-guidelines': { title: 'Brand guidelines and logos', category: 'Program Resources', content: `<p>Download official Ezana logos and brand assets from the Partner Dashboard. Follow our brand guidelines when promoting Ezana. Do not modify logos or use unapproved variations.</p>` },
  'marketing-materials': { title: 'Marketing materials', category: 'Program Resources', content: `<p>Pre-built banners, email templates, and social copy are available in the Partner Dashboard. Customize with your referral link. Contact partner support for custom assets.</p>` },
  'partner-support': { title: 'Partner support contacts', category: 'Program Resources', content: `<p>For partner-specific questions, email partners@ezana.world. Include your partner ID for faster resolution. For API technical issues, provide request IDs and error details.</p>` },
};

export default function PartnerHelpArticlePage() {
  const params = useParams();
  const slug = params?.slug;
  const article = slug ? ARTICLES[slug] : null;

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-semibold text-white">Article not found</h1>
          <Link href={BASE} className="inline-flex items-center gap-2 text-[#10b981] hover:underline">
            <ChevronLeft className="h-4 w-4" />
            Back to Partner Help Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <article className="mx-auto max-w-3xl px-4 py-12">
        <Link href={BASE} className="mb-8 inline-flex items-center gap-2 text-[#10b981] hover:underline">
          <ChevronLeft className="h-4 w-4" />
          Back to Partner Help Center
        </Link>
        <p className="mb-2 text-sm text-[#10b981]">{article.category}</p>
        <h1 className="mb-8 text-3xl font-bold text-white">{article.title}</h1>
        <div className="prose prose-invert max-w-none text-[#9ca3af] [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-white [&_ol]:space-y-2 [&_ul]:space-y-2 [&_p]:mt-4 [&_p]:first:mt-0 [&_strong]:text-white [&_code]:text-[#10b981]" dangerouslySetInnerHTML={{ __html: article.content }} />
        <div className="mt-12 border-t border-[rgba(16,185,129,0.1)] pt-8">
          <p className="mb-4 text-sm text-[#6b7280]">Was this article helpful?</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-[rgba(16,185,129,0.2)] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:border-[#10b981] hover:text-[#10b981]">Yes</button>
            <button type="button" className="rounded-lg border border-[rgba(16,185,129,0.2)] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:border-[#10b981] hover:text-[#10b981]">No</button>
          </div>
        </div>
      </article>
    </div>
  );
}

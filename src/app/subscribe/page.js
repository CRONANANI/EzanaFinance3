import { redirect } from 'next/navigation';

/**
 * /subscribe (Nov 21, 2026): retired as a separate checkout. It listed
 * monthly and Professional prices that /pricing no longer sells, so it now
 * forwards to the in-app plan picker (/select-plan), which reads the same
 * plan registry as /pricing. A ?canceled=true from Stripe carries over.
 * Existing monthly and Professional subscribers keep their plans: the keys
 * stay in src/config/pricing.js and src/config/plan-features.js.
 */
export default function SubscribePage({ searchParams }) {
  const canceled = searchParams?.canceled === 'true' ? '?canceled=true' : '';
  redirect(`/select-plan${canceled}`);
}

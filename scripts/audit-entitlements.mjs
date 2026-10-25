#!/usr/bin/env node
/**
 * Security assessment F-01 / F-02: READ-ONLY billing and partner integrity
 * audit. Finds accounts that may have self-upgraded before the profiles
 * lock-down (20261025160000_security_p0_privileged_writes.sql):
 *
 *  1. profiles whose subscription_status is active/trialing/past_due but
 *     whose subscription_id is not a live Stripe subscription for that
 *     profile's customer (or who have a paid plan with no subscription id);
 *  2. profiles with one_time_plan set but no purchase timestamp;
 *  3. partners rows with status 'active' and no approved_at, and
 *     echo_writer_approved with no echo_writer_approved_at.
 *
 * Writes nothing. Prints ids and the mismatch only (no emails or names).
 * Run by Noah, not by CI:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   STRIPE_SECRET_KEY=... node scripts/audit-entitlements.mjs
 */
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
const stripe = stripeKey ? new Stripe(stripeKey) : null;

async function pageAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

const findings = [];

/* 1. Paid status without a matching live Stripe subscription. */
const paid = await pageAll(() =>
  admin
    .from('profiles')
    .select(
      'id, subscription_status, subscription_plan, subscription_id, stripe_customer_id, subscription_source',
    )
    .in('subscription_status', ['active', 'trialing', 'past_due']),
);
const live = new Map();
if (stripe) {
  for (const status of ['active', 'trialing', 'past_due']) {
    for await (const sub of stripe.subscriptions.list({ status, limit: 100 }))
      live.set(sub.id, sub);
  }
} else {
  console.warn('STRIPE_SECRET_KEY not set: only profiles with no subscription id are flagged.');
}
for (const p of paid) {
  if (p.subscription_source && p.subscription_source !== 'stripe') continue; // RevenueCat etc.
  if (!p.subscription_id) {
    findings.push({
      kind: 'paid_without_subscription_id',
      profile: p.id,
      status: p.subscription_status,
      plan: p.subscription_plan,
    });
    continue;
  }
  if (!stripe) continue;
  const sub = live.get(p.subscription_id);
  const customer = typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id;
  if (!sub) {
    findings.push({
      kind: 'subscription_not_live_in_stripe',
      profile: p.id,
      subscription: p.subscription_id,
      status: p.subscription_status,
    });
  } else if (p.stripe_customer_id && customer !== p.stripe_customer_id) {
    findings.push({
      kind: 'subscription_belongs_to_other_customer',
      profile: p.id,
      subscription: p.subscription_id,
    });
  } else if (sub.status !== p.subscription_status) {
    findings.push({
      kind: 'status_mismatch',
      profile: p.id,
      profileStatus: p.subscription_status,
      stripeStatus: sub.status,
    });
  }
}

/* 2. One-time plans with no purchase time. */
const oneTime = await pageAll(() =>
  admin
    .from('profiles')
    .select('id, one_time_plan, one_time_plan_purchased_at')
    .not('one_time_plan', 'is', null),
);
for (const p of oneTime) {
  if (!p.one_time_plan_purchased_at) {
    findings.push({ kind: 'one_time_plan_without_purchase', profile: p.id, plan: p.one_time_plan });
  }
}

/* 3. Partner rows that look self-granted. */
const partners = await pageAll(() =>
  admin
    .from('partners')
    .select('id, user_id, status, approved_at, echo_writer_approved, echo_writer_approved_at'),
);
for (const r of partners) {
  if (r.status === 'active' && !r.approved_at) {
    findings.push({ kind: 'active_partner_without_approval', partner: r.id, user: r.user_id });
  }
  if (r.echo_writer_approved && !r.echo_writer_approved_at) {
    findings.push({ kind: 'echo_writer_without_approval', partner: r.id, user: r.user_id });
  }
}

const byKind = findings.reduce((m, f) => ({ ...m, [f.kind]: (m[f.kind] || 0) + 1 }), {});
console.log(
  JSON.stringify(
    {
      checked: { paid: paid.length, oneTime: oneTime.length, partners: partners.length },
      byKind,
      findings,
    },
    null,
    2,
  ),
);

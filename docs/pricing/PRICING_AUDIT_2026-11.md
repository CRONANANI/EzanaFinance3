# Pricing, entitlements and Advanced-first launch: audit and implementation

Nov 21, 2026. Implements `PRICING_TIER_STRATEGY_AND_AUDIT.md` and
`CLAUDE_CODE_PRICING_IMPLEMENTATION_MASTER_PROMPT_V2.md`.

The source of truth for what each plan gets is now **`src/config/plan-features.js`**.
The `/pricing` cards and comparison table, `/select-plan`, the server gates
and the watchlist cap all read from it. Sonar numbers in it are read from
the enforced Sonar matrix (`src/lib/sonar/entitlements.js`), not copied.
`npm run test:plan-features` keeps it consistent with the Stripe catalog, the
Sonar matrix and the gates.

## 1. Feature inventory (one row per candidate pricing claim)

Status: **live** = works on real data; **limited** = works with a stated
boundary; **sample** = runs on generated data; **planned** = designed, not built.
Gate: **server** = an API refuses below the tier; **open** = every account.

| Capability | Route / component | Data and lag | Status | Gate before | Gate now | Tier | Allowed wording |
|---|---|---|---|---|---|---|---|
| Market overview, charts, company profiles | `/company-research`, `/market-analysis` | Market data providers; views show last-updated time; not exchange-direct | live | open | open | All | "Market overview, price charts and company profiles". Never "real-time". |
| Financial statements, ratios, estimates | `/company-research` (useCompanyResearch, FMP/Finnhub) | Reported filings | live | open | open | All | as listed |
| Ezana Echo | `/ezana-echo` | Editorial | live | open | open | All | "Ezana Echo editorial" |
| Sonar answers per day | `/api/sonar/query`, `/v2`, `/research` (quota per UTC day) | Ezana datasets + web | live | server | server | 5 / 30 / 100 | "N Sonar answers a day, every one cited" |
| Sonar deep research runs | `/api/sonar/research` (`deepRunsPerDay`) | | live | server | server | 2 / 5 / 15 | as listed |
| Sonar synthesis depth | entitlements `depth` | | live | server | server | Quick / Standard / Deep | as listed |
| Sonar datasets | entitlements `datasets` | Free: Echo, congress, contracts, sanctions, IPO, macro. Starter + SEC filings, prediction markets. Advanced + 13F, lobbying | live | server | server | 6 / 8 / 10 | "adds 13F holdings and lobbying" |
| Sonar web sources | entitlements `webSearch.maxUses` | | live | server | server | 2 / 4 / 6 | as listed |
| Sonar Form 4 insider filings | registry lists `insider-buys`, no tier includes it | SEC Form 4 | limited | n/a | n/a | not sold | **Do not advertise as a Sonar dataset** |
| Save Sonar answers | `/api/sonar/saved` | | live | open (no cap) | open | All | "Save answers to your research library". Do not quote a count. |
| Sonar exports | `exportsEnabled` flag only, no UI | | planned | n/a | n/a | none | **Do not advertise** |
| DCF / reverse DCF, three-statement, comps | ValuationModelsWorkspace (client compute on FMP data) | Reported statements, recent quote | live | open | open | All | "DCF and reverse DCF, three-statement forecast, comparable companies" |
| Earnings call analyzer | `/api/earnings/analysis` | Published transcripts | live | open | open | All | "Earnings call analyzer" |
| AI model reports (GRPV and AI reads of every model) | `/api/ai-stock-analysis` (Anthropic) | AI opinion on supplied data | live | auth + AI rate limit | **server, Advanced** | Advanced | "AI model reports: GRPV score and an AI read of every model". Never "valuation". |
| Analyst track records | `/api/research/analyst-accuracy` | | live | server (tier 2) | server | Advanced | as listed |
| Congressional disclosures | `/inside-the-capitol` | Up to 45 days after the trade; shown at publication | live | open | open | All | Never "real-time congressional alerts" |
| Contracts, lobbying, 13F, sanctions datasets | `/datasets/*` | USAspending; quarterly LDA; 13F up to 45 days after quarter; OFAC | live | open | open | All | as listed |
| Watchlists | `/api/watchlists` | | live | none (marketing said 5, config said 1/3) | **server cap 3 / 10 / 50** | All | "N watchlists"; existing lists kept |
| Watchlist notes, smart watchlists | `/api/watchlists/notes`, `/smart` | | live | open | open | All | "watchlists with notes" |
| Portfolio tracking, brokerage linking | `/home`, Plaid/SnapTrade | Broker data | live | open | open | All | as listed |
| Mock trading | `/trading/mock` | Simulated | live | open | open | All | "Mock trading with a simulated portfolio"; never brokerage |
| Live brokerage orders, copy trading | `/trading/dashboard` says "later" | | planned | n/a | n/a | none | **Do not advertise** |
| Quant Lab model library, single-ticker indicators | `/for-the-quants/model-library`, `/api/quants/indicators` | Daily prices | live | open | open | All | as listed |
| Strategy Lab, backtests, factors, pairs, correlation, portfolio risk, GARCH/PCA/Markov, event study, validations | `/api/quants/*` compute routes | Daily price history | live | auth only | **server, Advanced** (reads/deletes of own saved work stay open) | Advanced | "...Results are research, not a validated strategy" |
| Backtest comparison, simulation visuals | `/for-the-quants/backtesting` | Sample data (labelled) | sample | | | none | **Do not advertise** |
| Paper deployment, universe pairs scanner, saved factor studies, stress tests | Quant Lab PlannedPanel | | planned | | | none | **Do not advertise** |
| Learning center, community | `/learning-center`, `/community` | | live | open | open | All | as listed |
| Household sharing, parental controls | none found | | planned | | | none | **Do not advertise**; Family sold as "everything in Advanced", waitlist |
| SSO/SAML, integrations, dedicated manager | none | | not offered | | | none | **Do not advertise** |
| Org Team Hub (roles, pitch pipeline, shared research, fund analytics) | `/org-team-hub`, org RLS | | live (B2B) | org scope | org scope | Organizations | "Scoped and priced with each organization" |
| Ezana API | `/ezana-api` | Metered | live | separate | separate | separate | "billed separately from every plan" |

## 2. Final packaging matrix

| | Free | Starter | Advanced | Family | Organizations |
|---|---|---|---|---|---|
| Availability | Waitlist | Waitlist | **Available now, 30-day trial** | Waitlist | Contact us |
| Price (USD) | $0 | $15/qtr or $48/yr | $57/qtr or $180/yr | $147/qtr or $468/yr | Scoped |
| Sonar answers / deep runs per day | 5 / 2 | 30 / 5 | 100 / 15 | 100 / 15 | Plan tier of the member |
| Sonar depth / datasets / web sources | Quick / 6 / 2 | Standard / 8 / 4 | Deep / 10 / 6 | Deep / 10 / 6 | + council internal data |
| 13F and lobbying in Sonar | | | Yes | Yes | |
| AI model reports, analyst track records | | | Yes | Yes | Yes (org scope) |
| Quant Lab compute | | | Yes | Yes | Yes (org scope) |
| Watchlists | 3 | 10 | 50 | 50 | Not capped |
| Everything marked "open" in section 1 | Yes | Yes | Yes | Yes | Yes |

Org members, active partners and admins pass every retail feature gate
(`resolvePlanAccess` scope). Account-trial users (invited, no subscription
yet, inside 30 days) count as Starter, matching the Starter trial invites
promise.

## 3. Pricing copy and checkout disclosures

- Hero: "One place to investigate what moves markets." / "Discover the
  signal. Verify the source. Model the decision. Track what changes." /
  "Advanced is open now with a 30-day trial. Free and Starter are joining by waitlist."
- Next to every Advanced CTA: "Card required, nothing charged today. Then $57
  every 3 months (or $180 every year) until you cancel." plus `RenewalTerms`
  (date-specific, cancel path Settings, Billing).
- Cards show the amount actually billed first ($57/quarter) with the monthly
  equivalent underneath ("Equal to $19 a month, billed every 3 months").
- Trial length copy reads from `TRIAL_DAYS` (30): `TRIAL_LABEL` is now "30-day".
- No "Most popular", no countdowns, no testimonials, no outcome claims.

## 4. Trial and waitlist journeys

**Advanced (open):** /pricing (Quarterly or Yearly) → signed out:
`/auth/start-trial?billing=` → `/api/auth/trial-signup` (account marked
`app_metadata.signup_source = advanced_trial`) → Stripe Checkout with
`trial_period_days: 30` → account opens only when the webhook reports
trialing/active → `/home?checkout=success&welcome=advanced` → goal picker
(Research a stock / Follow the money / Explore a strategy, or skip).
Signed in: straight to Checkout. A billing period with no Stripe price
returns `409 price_unavailable` and the page offers the other period.

**Free (waitlist):** card → `/auth/signup?plan=free` → details only, no card.

**Starter / Family (waitlist):** card → `/auth/signup?plan=starter&billing=quarterly|yearly`
→ details → Stripe setup mode saves a card, nothing charged → invite →
30-day Starter trial on that card (unchanged; copy now matches it exactly).
The pre-invite card step was kept: changing it needs explicit approval and a
migration of existing waitlist rows.

**Bypasses closed:**
- `/api/auth/activate-free` refused (403 `waitlist_only`) for accounts made by
  the Advanced trial signup. Previously any such account could set itself to
  Free and unlock the dashboard without a waitlist invite or a trial.
- `/api/stripe/create-checkout-session` refuses Starter/Family (403
  `waitlist_only`) for those accounts unless they already have a subscription.
  Previously the pricing page's Starter "Join waitlist" button opened Starter
  checkout for any signed-in visitor, and the Free button activated Free.
- One trial per customer: an account whose subscription ended (`canceled`)
  subscribes without a new trial.

## 5. Funnel tracking

`public.funnel_events` (migration `20261126090000_funnel_events_and_trial_marker.sql`),
written by `/api/funnel-event` (client steps) and the server (checkout
started, trial confirmed by the webhook). Events: `pricing_view`,
`billing_toggle`, `plan_cta`, `trial_signup_started`, `checkout_started`,
`trial_confirmed`, `onboarding_goal`, `onboarding_skip`. Fields are
enumerated only (plan, billing, goal); no query text, holdings, email or IP.
RLS on, no policies: read it with the service role or the SQL editor.

## 6. Excluded (built but not sold)

See `EXCLUDED_FEATURES` in the registry; shown on /pricing under "Built but
not included in any plan yet".

## 7. Remaining limitations (manual review)

1. **Stripe quarterly prices do not exist yet** in the live account. Create
   three recurring prices (every 3 months) with lookup keys
   `personal_quarterly` ($15), `personal_advanced_quarterly` ($57),
   `family_quarterly` ($147). Until then quarterly checkout reports
   unavailable and offers yearly; the waitlist Starter trial for quarterly
   members cannot start.
2. **Apply the migration** (funnel events table and the app_metadata backfill
   for trial-signup accounts created before this change).
3. Saved Sonar reports are not capped server-side although the Sonar matrix
   carries `savedReports` values; the page does not quote a count.
4. Valuation workbenches compute in the browser and are open to all plans; only
   the AI reports are gated.
5. OAuth sign-up and any other account-creation path not reviewed here should
   be checked for waitlist bypasses.
6. Tax display: Stripe Checkout shows taxes only if Stripe Tax is enabled.
7. Regional auto-renewal law review (California, Quebec) still applies to the
   unchanged `RENEWAL_POLICY_TEXT`.
8. Provider and AI cost per Sonar answer and per AI report has not been
   measured here; quotas are unchanged from the existing matrix.
9. Mobile store products (RevenueCat) still sell monthly/annual; their plan
   keys map to the same tiers.

-- =============================================================================
-- DEMO seed: University Council Rankings leaderboard
-- =============================================================================
-- WHY: council_elo / council_fund_metrics are empty (the recompute cron hasn't
-- run against real competition + fund data yet), so /council-rankings shows its
-- honest empty state. This seeds a SMALL demo leaderboard so the page and its
-- points-breakdown can be demonstrated in the test environment.
--
-- HONEST-EMPTY-STATES / NOT REAL STANDINGS:
--   * These are DEMO standings, not real results. Every fund-metrics row is
--     flagged `self_reported = true` (surfaced as a "self-reported" pill) and
--     labelled period `Demo · FY2026` (shown on the detail page). Every rating
--     transaction carries `metadata.demo = true`.
--   * Ratings/ratios are internally consistent with the real council-ELO model
--     (competition ELO blended 60/40 with normalized fund ratios) but the inputs
--     are illustrative.
--   * Scoped to EXACTLY 8 org ids (listed below). Idempotent: prior rows for
--     THOSE ids are deleted then re-inserted. Re-running does not duplicate.
--   * BEFORE onboarding/demoing a real council, run the TEARDOWN block at the
--     bottom so no demo standings sit against a real university org.
--
-- Data only — no schema changes, no app code. Ratios only; no dollar amounts.
-- =============================================================================

do $seed$
declare
  v_ids uuid[] := array[
    '7e510000-0000-4000-8000-000000000003', -- University of Toronto
    '7e510000-0000-4000-8000-000000000002', -- University of Waterloo
    '7e510000-0000-4000-8000-000000000013', -- McGill University
    '7e510000-0000-4000-8000-000000000012', -- Queen's University
    '7e510000-0000-4000-8000-000000000019', -- University of British Columbia
    '7e510000-0000-4000-8000-000000000014', -- Western University
    '7e510000-0000-4000-8000-000000000018', -- McMaster University
    '7e510000-0000-4000-8000-000000000016'  -- University of Calgary
  ]::uuid[];
begin
  -- IDEMPOTENCY: clear prior demo rows for exactly these ids (nothing else).
  delete from public.council_elo_transactions where org_id = any(v_ids);
  delete from public.council_fund_metrics      where org_id = any(v_ids);
  delete from public.council_elo               where org_id = any(v_ids);

  insert into public.council_elo
    (org_id, current_rating, peak_rating, tier, competition_rating, fund_rating, updated_at)
  values
    ('7e510000-0000-4000-8000-000000000003', 1191, 1191, 'established', 1127, 1287, now()),
    ('7e510000-0000-4000-8000-000000000002', 1122, 1122, 'established', 1068, 1202, now()),
    ('7e510000-0000-4000-8000-000000000013', 1085, 1085, 'competitive', 1054, 1132, now()),
    ('7e510000-0000-4000-8000-000000000012', 1045, 1045, 'competitive', 1037, 1056, now()),
    ('7e510000-0000-4000-8000-000000000019', 945, 945, 'emerging', 917, 988, now()),
    ('7e510000-0000-4000-8000-000000000014', 933, 933, 'emerging', 959, 894, now()),
    ('7e510000-0000-4000-8000-000000000018', 857, 857, 'emerging', 903, 789, now()),
    ('7e510000-0000-4000-8000-000000000016', 822, 822, 'emerging', 935, 653, now());

  insert into public.council_fund_metrics
    (org_id, roi_pct, sharpe, max_drawdown_pct, volatility_pct, benchmark_alpha_pct, period_label, self_reported, updated_at)
  values
    ('7e510000-0000-4000-8000-000000000003', 18.4, 1.9, 8.2, 11, 6.1, 'Demo · FY2026', true, now()),
    ('7e510000-0000-4000-8000-000000000002', 21.2, 1.7, 12.5, 14.8, 5.4, 'Demo · FY2026', true, now()),
    ('7e510000-0000-4000-8000-000000000013', 14.1, 1.6, 7.1, 9.6, 3.8, 'Demo · FY2026', true, now()),
    ('7e510000-0000-4000-8000-000000000012', 16.7, 1.4, 10.3, 12.9, 3.1, 'Demo · FY2026', true, now()),
    ('7e510000-0000-4000-8000-000000000019', 12.9, 1.3, 9, 10.4, 2.2, 'Demo · FY2026', true, now()),
    ('7e510000-0000-4000-8000-000000000014', 15.3, 1.1, 13.8, 15.7, 1.5, 'Demo · FY2026', true, now()),
    ('7e510000-0000-4000-8000-000000000018', 9.8, 0.9, 11.2, 13.1, 0.4, 'Demo · FY2026', true, now()),
    ('7e510000-0000-4000-8000-000000000016', 7.4, 0.7, 14.6, 16.2, -0.9, 'Demo · FY2026', true, now());

  -- Two transactions per council (fund report, then a competition placement).
  -- rating_before/after reconstruct 1000 → +fund → +competition = current.
  insert into public.council_elo_transactions
    (org_id, delta, component, reason, metadata, rating_before, rating_after, created_at)
  values
    ('7e510000-0000-4000-8000-000000000003', 115, 'fund', 'Fund ratios reported — Sharpe 1.9, ROI 18.4%, alpha 6.1%', '{"demo": true, "sharpe": 1.9, "roi_pct": 18.4}'::jsonb, 1000, 1115, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000003', 76, 'competition', 'Placed 1st at National IC Invitational → +76', '{"demo": true, "competition": "National IC Invitational", "rank": 1}'::jsonb, 1115, 1191, now() - interval '7 days'),
    ('7e510000-0000-4000-8000-000000000002', 81, 'fund', 'Fund ratios reported — Sharpe 1.7, ROI 21.2%, alpha 5.4%', '{"demo": true, "sharpe": 1.7, "roi_pct": 21.2}'::jsonb, 1000, 1081, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000002', 41, 'competition', 'Placed 1st at Waterloo Stock Pitch → +41', '{"demo": true, "competition": "Waterloo Stock Pitch", "rank": 1}'::jsonb, 1081, 1122, now() - interval '7 days'),
    ('7e510000-0000-4000-8000-000000000013', 53, 'fund', 'Fund ratios reported — Sharpe 1.6, ROI 14.1%, alpha 3.8%', '{"demo": true, "sharpe": 1.6, "roi_pct": 14.1}'::jsonb, 1000, 1053, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000013', 32, 'competition', 'Placed 2nd at National IC Invitational → +32', '{"demo": true, "competition": "National IC Invitational", "rank": 2}'::jsonb, 1053, 1085, now() - interval '7 days'),
    ('7e510000-0000-4000-8000-000000000012', 23, 'fund', 'Fund ratios reported — Sharpe 1.4, ROI 16.7%, alpha 3.1%', '{"demo": true, "sharpe": 1.4, "roi_pct": 16.7}'::jsonb, 1000, 1023, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000012', 22, 'competition', 'Placed 1st at QUIC Challenge → +22', '{"demo": true, "competition": "QUIC Challenge", "rank": 1}'::jsonb, 1023, 1045, now() - interval '7 days'),
    ('7e510000-0000-4000-8000-000000000019', -5, 'fund', 'Fund ratios reported — Sharpe 1.3, ROI 12.9%, alpha 2.2%', '{"demo": true, "sharpe": 1.3, "roi_pct": 12.9}'::jsonb, 1000, 995, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000019', -50, 'competition', 'Placed 4th at Waterloo Stock Pitch → -50', '{"demo": true, "competition": "Waterloo Stock Pitch", "rank": 4}'::jsonb, 995, 945, now() - interval '7 days'),
    ('7e510000-0000-4000-8000-000000000014', -42, 'fund', 'Fund ratios reported — Sharpe 1.1, ROI 15.3%, alpha 1.5%', '{"demo": true, "sharpe": 1.1, "roi_pct": 15.3}'::jsonb, 1000, 958, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000014', -25, 'competition', 'Placed 3rd at QUIC Challenge → -25', '{"demo": true, "competition": "QUIC Challenge", "rank": 3}'::jsonb, 958, 933, now() - interval '7 days'),
    ('7e510000-0000-4000-8000-000000000018', -85, 'fund', 'Fund ratios reported — Sharpe 0.9, ROI 9.8%, alpha 0.4%', '{"demo": true, "sharpe": 0.9, "roi_pct": 9.8}'::jsonb, 1000, 915, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000018', -58, 'competition', 'Placed 4th at QUIC Challenge → -58', '{"demo": true, "competition": "QUIC Challenge", "rank": 4}'::jsonb, 915, 857, now() - interval '7 days'),
    ('7e510000-0000-4000-8000-000000000016', -139, 'fund', 'Fund ratios reported — Sharpe 0.7, ROI 7.4%, alpha -0.9%', '{"demo": true, "sharpe": 0.7, "roi_pct": 7.4}'::jsonb, 1000, 861, now() - interval '20 days'),
    ('7e510000-0000-4000-8000-000000000016', -39, 'competition', 'Placed 5th at Waterloo Stock Pitch → -39', '{"demo": true, "competition": "Waterloo Stock Pitch", "rank": 5}'::jsonb, 861, 822, now() - interval '7 days');

  raise notice 'Council rankings DEMO seed applied for % councils.', array_length(v_ids, 1);
end
$seed$;

-- =============================================================================
-- TEARDOWN — uncomment and run to remove ALL council-rankings demo data before
-- onboarding/demoing a real council. Scoped to exactly the 8 demo ids.
-- =============================================================================
-- do $teardown$
-- declare
--   v_ids uuid[] := array[
--     '7e510000-0000-4000-8000-000000000003','7e510000-0000-4000-8000-000000000002',
--     '7e510000-0000-4000-8000-000000000013','7e510000-0000-4000-8000-000000000012',
--     '7e510000-0000-4000-8000-000000000019','7e510000-0000-4000-8000-000000000014',
--     '7e510000-0000-4000-8000-000000000018','7e510000-0000-4000-8000-000000000016'
--   ]::uuid[];
-- begin
--   delete from public.council_elo_transactions where org_id = any(v_ids);
--   delete from public.council_fund_metrics      where org_id = any(v_ids);
--   delete from public.council_elo               where org_id = any(v_ids);
-- end
-- $teardown$;

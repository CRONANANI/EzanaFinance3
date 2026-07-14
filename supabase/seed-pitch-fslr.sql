-- ═══════════════════════════════════════════════════════════════════════════
-- Pitch Stage Machine — demo seed (spec Part 8). The FSLR pitch at deep_dive in
-- a deliberately, INFORMATIVELY blocked state so the Gate Panel demos well:
--   • Energy desk (thin → min_senior_signoffs = 2), both sign-offs in.
--   • Desk meeting logged, 6 attendees.
--   • Models: DCF ✓, comps ✓, earnings ✓ — 3-statement MISSING (hard gate fails).
--   • 1 open challenge (soft warning at deep_dive).
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING. Run after seed-demo-org.sql.
--
-- Real ids from seed-demo-org.sql:
--   org  84c0372a-6b0a-4126-963e-9b0aa6660570
--   Energy team   76a5af44-191c-422b-b428-17803eb799bd  (thin desk, min 2)
--   Priya Nair (Energy PM)         d1000000-0000-4000-a000-000000000008
--   Fatima Al-Sayed (Energy Sr An) d1000000-0000-4000-a000-000000000014
--   Elena Petrova (Energy An)      d1000000-0000-4000-a000-000000000046
--   Samuel Adeyemi (Energy Jr PM)  d1000000-0000-4000-a000-000000000041
--   Diane Whitfield (VP Research)  d1000000-0000-4000-a000-000000000035
--   Noah Raymond-Leigh (President) e8e3758f-9a71-4efb-9532-228ae257d09e
-- ═══════════════════════════════════════════════════════════════════════════
BEGIN;

INSERT INTO public.org_pitches
  (id, org_id, team_id, ticker, company_name, pitch_type, analyst_member_id, approving_pm_member_id,
   stage, status, thesis_short, thesis_full, why_now, variant_perception, falsification,
   catalysts, risks, target_price, current_price_at_submission, pitch_price, expected_return_pct,
   time_horizon, sector, benchmark_symbol, conviction_level, position_size_pct,
   valuation_method, valuation_bull, valuation_base, valuation_bear, stage_entered_at)
VALUES (
  'f5100000-0000-4000-a000-000000000001',
  '84c0372a-6b0a-4126-963e-9b0aa6660570',
  '76a5af44-191c-422b-b428-17803eb799bd',
  'FSLR', 'First Solar', 'long',
  'd1000000-0000-4000-a000-000000000014',   -- Fatima (Energy Sr Analyst)
  'd1000000-0000-4000-a000-000000000008',   -- Priya (Energy PM)
  'deep_dive', 'active',
  'Domestic-content IRA tailwinds and a booked backlog make FSLR the lowest-risk US solar scale play.',
  'First Solar''s CdTe modules sidestep the polysilicon supply chain and qualify for the IRA domestic-content adder, giving a structural cost and margin edge over crystalline-silicon peers. A multi-year booked backlog (~80 GW) de-risks revenue through 2027, and new US capacity ramps into a demand environment where utilities are prioritizing domestic supply. The market is discounting execution risk that the backlog and vertically-integrated manufacturing substantially mitigate.',
  'The 2026 domestic-content guidance and the Q4 bookings print are near-term catalysts the market has not yet priced after the recent policy-driven drawdown.',
  'Consensus treats FSLR as a commoditized module maker; we think the domestic-content moat and booked backlog make revenue and margins far more visible than a commodity framing implies.',
  '2026 bookings guide below 18 GW, or the domestic-content premium falling below 12%.',
  ARRAY['Q4 2025 bookings print', '2026 domestic-content guidance', 'Series 7 line ramp update'],
  ARRAY['Policy reversal on the IRA adder', 'ASP compression from module oversupply', 'Ramp execution slippage'],
  265.00, 192.40, 192.40, 37.8,
  '12m', 'Energy', 'XLE', 4, 3.50,
  'dcf', 320.00, 265.00, 180.00, now() - interval '6 days'
)
ON CONFLICT (id) DO NOTHING;

-- Screening sign-offs (both in-desk → satisfies the thin Energy desk's 2).
INSERT INTO public.org_pitch_signoff (id, pitch_id, org_id, member_id, scope, decision, in_desk, comment)
VALUES
 ('f5510000-0000-4000-a000-000000000001','f5100000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000014','qualitative','approve',true,'Thesis holds; backlog checks out.'),
 ('f5510000-0000-4000-a000-000000000002','f5100000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000008','model','approve',true,'Model reviewed — base case supported.')
ON CONFLICT (id) DO NOTHING;

-- Desk meeting logged with 6 attendees.
INSERT INTO public.org_desk_meeting
  (id, pitch_id, org_id, held_at, attendee_ids, compliance_notes, sector_weight_notes,
   headwinds, tailwinds, proposed_sizing_pct, decision, logged_by, recorded_by)
VALUES (
  'f5610000-0000-4000-a000-000000000001','f5100000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570',
  now() - interval '5 days',
  ARRAY['d1000000-0000-4000-a000-000000000008','d1000000-0000-4000-a000-000000000014',
        'd1000000-0000-4000-a000-000000000046','d1000000-0000-4000-a000-000000000041',
        'd1000000-0000-4000-a000-000000000035','e8e3758f-9a71-4efb-9532-228ae257d09e']::uuid[],
  'Energy desk would reach 18.4% vs the 15% soft sector limit — flagged, within tolerance.',
  'Current Energy weight 15.1%; this position takes it to ~18.4%.',
  'Module ASP compression; policy headline risk.',
  'IRA domestic-content adder; booked multi-year backlog.',
  3.50, 'advance',
  'd1000000-0000-4000-a000-000000000008','d1000000-0000-4000-a000-000000000008'
)
ON CONFLICT (id) DO NOTHING;

-- Models: DCF / comps / earnings reviewed & complete; 3-statement intentionally ABSENT.
INSERT INTO public.org_pitch_model
  (id, pitch_id, org_id, model_type, file_url, version, complete, uploaded_by, reviewed_by, reviewed_at)
VALUES
 ('f5710000-0000-4000-a000-000000000001','f5100000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','dcf','notes/fslr-dcf',1,true,'d1000000-0000-4000-a000-000000000014','d1000000-0000-4000-a000-000000000008', now() - interval '4 days'),
 ('f5710000-0000-4000-a000-000000000002','f5100000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','comps','notes/fslr-comps',1,true,'d1000000-0000-4000-a000-000000000014','d1000000-0000-4000-a000-000000000008', now() - interval '4 days'),
 ('f5710000-0000-4000-a000-000000000003','f5100000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','earnings_analysis','notes/fslr-earnings',1,true,'d1000000-0000-4000-a000-000000000014','d1000000-0000-4000-a000-000000000008', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- One OPEN challenge on the bear case (soft warning at deep_dive).
INSERT INTO public.org_pitch_discussion_messages
  (id, pitch_id, author_member_id, body, post_type, status, anchor_section, created_at)
VALUES (
  'f5810000-0000-4000-a000-000000000001','f5100000-0000-4000-a000-000000000001',
  'd1000000-0000-4000-a000-000000000046',
  'Module ASP compression looks under-modeled — if 2026 ASPs fall 15%+, the base case breaks. What supports the current ASP path?',
  'challenge', 'open', 'bear_case', now() - interval '2 days'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- =============================================================================
-- Demo-data seed: Research Library ticker dossiers + coverage lineage
-- =============================================================================
-- WHY: The Research Library's ticker (dossier) and coverage-lineage views
-- render empty for the council demo org — org_coverage_lineage has no rows and
-- only a handful of research notes carry tickers. This seed populates seven
-- covered tickers (the org book's own names) with published, ticker-tagged
-- notes and a chronological handoff chain per ticker so both surfaces demo
-- properly.
--
-- SCOPE (hard rule): every row is written ONLY for
--   org_id = 'a0000000-0000-0000-0000-000000000001'  (Ezana Test University).
-- Real university orgs are never touched.
--
-- DATA INTEGRITY:
--   * Everything here is fictional student work product. Author identity
--     resolves through real FK-valid council TEST members (same pattern as the
--     council demo seed) — no real person's name is invented or embedded.
--   * Real tickers are referenced (that is the product), but every rationale
--     stays qualitative or uses round illustrative levels; nothing presents
--     fabricated firm financials as fact, and no performance claims are made
--     about the companies themselves.
--   * Deterministic: literal dates and text, no randomness.
--   * Idempotent: prior seeded rows (matched by the note/term markers below)
--     are deleted first; re-running does not duplicate.
-- =============================================================================

do $seed$
declare
  v_org uuid := 'a0000000-0000-0000-0000-000000000001';
  v_members int;
  v_u1 uuid;  v_m1 uuid;
  v_u2 uuid;  v_m2 uuid;
  t record;
  v_note_init uuid;
  v_note_update uuid;
  v_note_handoff uuid;
begin
  -- Resolve REAL, FK-valid active members (mirrors the council demo seed).
  select count(*) into v_members
  from public.org_members om
  where om.org_id = v_org and om.is_active
    and exists (select 1 from auth.users u where u.id = om.user_id);
  if v_members = 0 then
    raise notice 'Research library seed: no FK-valid active members - skipping (no-op).';
    return;
  end if;

  select om.user_id, om.id into v_u1, v_m1
  from public.org_members om
  where om.org_id = v_org and om.is_active
    and exists (select 1 from auth.users u where u.id = om.user_id)
  order by om.joined_at asc limit 1;

  select om.user_id, om.id into v_u2, v_m2
  from public.org_members om
  where om.org_id = v_org and om.is_active and om.id <> v_m1
    and exists (select 1 from auth.users u where u.id = om.user_id)
  order by om.joined_at asc limit 1;
  if v_u2 is null then v_u2 := v_u1; v_m2 := v_m1; end if;

  -- IDEMPOTENCY: remove prior rows from THIS seed (marked by the RLSEED tag).
  delete from public.org_coverage_lineage
   where org_id = v_org and term like '%· RLSEED';
  delete from public.org_research_notes
   where org_id = v_org and (tags @> array['rlseed']);

  -- One block per covered ticker: initiation note -> update note -> handoff
  -- packet, then a 3-hop lineage chain referencing the handoff packet.
  for t in
    select * from (values
      ('JPM',  'Financials', 'JPMorgan Chase & Co.',
        'Initiating coverage: scale and deposit franchise anchor the financials sleeve; rating Buy on franchise quality.',
        'Thesis update: net interest tailwind thesis intact; watching credit normalization. Rating stays Buy.',
        'Handoff packet: coverage history, model walkthrough, and open questions for the incoming analyst.'),
      ('LLY',  'Healthcare', 'Eli Lilly & Co.',
        'Initiating coverage: metabolic franchise leadership; rating Buy with position sizing per IPS single-name cap.',
        'Thesis update: supply capacity is the key debate; trimming conviction from Buy to Hold pending capacity data.',
        'Handoff packet: thesis lineage, IC questions log, and the demand-vs-supply framework for the next analyst.'),
      ('SCHW', 'Financials', 'Charles Schwab Corp.',
        'Initiating coverage: asset-gathering flywheel; rating Hold until cash-sorting pressure clears.',
        'Thesis update: sorting pressure easing per management commentary; upgrading Hold to Buy.',
        'Handoff packet: deposit-beta tracker and the sweep-cash framework, with open items for next term.'),
      ('NVDA', 'Technology', 'NVIDIA Corp.',
        'Initiating coverage: accelerated-computing platform thesis; rating Buy with concentration risk flagged to IC.',
        'Thesis update: sizing reviewed against the IPS tech-sleeve cap; rating Buy, position capped.',
        'Handoff packet: platform thesis notes, competitive watch list, and the capex-cycle checklist.'),
      ('MSFT', 'Technology', 'Microsoft Corp.',
        'Initiating coverage: durable enterprise franchise; rating Buy as the sleeve''s core compounder.',
        'Thesis update: AI monetization pace is the swing factor; rating Buy, thesis unchanged.',
        'Handoff packet: segment model walkthrough and the questions the outgoing analyst could not close.'),
      ('UNH',  'Healthcare', 'UnitedHealth Group',
        'Initiating coverage: managed-care scale thesis; rating Hold while regulatory overhang is priced.',
        'Thesis update: cost-trend debate continues; rating moves Hold to Trim on risk discipline.',
        'Handoff packet: cost-trend tracker and the bear-case checklist for the incoming analyst.'),
      ('COST', 'Consumer',   'Costco Wholesale Corp.',
        'Initiating coverage: membership-economics quality thesis; rating Hold on valuation discipline.',
        'Thesis update: thesis quality confirmed, valuation still rich; rating stays Hold.',
        'Handoff packet: unit-economics one-pager and renewal-rate watch items.')
    ) as x(ticker, sector, co_name, init_abstract, update_abstract, handoff_abstract)
  loop
    insert into public.org_research_notes
      (org_id, author_id, title, body, ticker, sector, tags, visibility,
       doc_type, status, abstract, term, created_at, updated_at)
    values
      (v_org, v_u1,
       t.ticker || ' - Coverage Initiation',
       'Fictional student work product for the demo council. ' || t.init_abstract,
       t.ticker, t.sector, array['rlseed','coverage'], 'org',
       'note', 'published', t.init_abstract, 'Fall 2025',
       timestamptz '2025-09-18 15:00:00Z', timestamptz '2025-09-18 15:00:00Z')
    returning id into v_note_init;

    insert into public.org_research_notes
      (org_id, author_id, title, body, ticker, sector, tags, visibility,
       doc_type, status, abstract, term, created_at, updated_at)
    values
      (v_org, v_u2,
       t.ticker || ' - Thesis Update',
       'Fictional student work product for the demo council. ' || t.update_abstract,
       t.ticker, t.sector, array['rlseed','coverage'], 'org',
       'note', 'published', t.update_abstract, 'Spring 2026',
       timestamptz '2026-02-12 16:00:00Z', timestamptz '2026-02-12 16:00:00Z')
    returning id into v_note_update;

    insert into public.org_research_notes
      (org_id, author_id, title, body, ticker, sector, tags, visibility,
       doc_type, status, abstract, term, created_at, updated_at)
    values
      (v_org, v_u2,
       t.ticker || ' - Coverage Handoff Packet',
       'Fictional student work product for the demo council. ' || t.handoff_abstract,
       t.ticker, t.sector, array['rlseed','handoff'], 'org',
       'primer', 'published', t.handoff_abstract, 'Spring 2026',
       timestamptz '2026-04-24 17:00:00Z', timestamptz '2026-04-24 17:00:00Z')
    returning id into v_note_handoff;

    -- Lineage chain: initiation (no prior analyst) -> mid-year handoff ->
    -- rollover handoff carrying the handoff packet.
    insert into public.org_coverage_lineage
      (org_id, ticker, from_member_id, to_member_id, handoff_note_id, term, created_at)
    values
      (v_org, t.ticker, null, v_m1, v_note_init,   'Fall 2025 - initiation · RLSEED',
        timestamptz '2025-09-18 15:30:00Z'),
      (v_org, t.ticker, v_m1, v_m2, v_note_update, 'Spring 2026 - midyear handoff · RLSEED',
        timestamptz '2026-01-20 15:30:00Z'),
      (v_org, t.ticker, v_m2, v_m1, v_note_handoff, 'Fall 2026 - cohort rollover · RLSEED',
        timestamptz '2026-04-24 17:30:00Z');
  end loop;

  raise notice 'Research library seed: 7 tickers seeded with notes + lineage.';
end
$seed$;

-- TEARDOWN (manual, if ever needed):
--   delete from public.org_coverage_lineage
--     where org_id = 'a0000000-0000-0000-0000-000000000001' and term like '%· RLSEED';
--   delete from public.org_research_notes
--     where org_id = 'a0000000-0000-0000-0000-000000000001' and tags @> array['rlseed'];

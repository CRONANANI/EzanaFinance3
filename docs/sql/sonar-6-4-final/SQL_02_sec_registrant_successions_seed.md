# SQL 02: seed verified successions (Sonar 6.4 final integration)

Run after SQL 01. Every row was checked on Nov 28 2026 against SEC's submissions API: the successor's Form 8-K12B (accession below), the predecessor's name and its last annual report under the old CIK. Two rows are inserted **unverified** on purpose (mergers that combine two businesses, one an IFRS filer); they are not used until someone reviews them and sets `verified = true`.

This only writes the mapping table. It does **not** backfill `sec_fundamentals`; that needs `SEC_PREDECESSOR_MAPPING=1` on the ingest and your approval.

```sql
insert into public.sec_registrant_successions
  (ticker, successor_cik, predecessor_cik, effective_date, relationship, source_accession,
   source_form, verified, verified_by, verified_at, provenance, notes)
values
  ('XOM',  '2115436', '34088',   '2026-07-01', 'holding_company_reorganization', '0001193125-26-291990',
   '8-K12B', true,  'sonar-6.4-review', now(),
   'SEC submissions: ExxonMobil Holdings Corp 8-K12B 2026-07-01; Exxon Mobil Corp (CIK 34088) filed the FY2025 10-K 0000034088-26-000045',
   'New holding company, same business. Facts for periods ending before 2026-07-01 come from CIK 34088.'),
  ('DMRC', '2119322', '1438231', '2026-05-18', 'holding_company_reorganization', '0001437749-26-017527',
   '8-K12B', true,  'sonar-6.4-review', now(),
   'SEC submissions: Digimarc Corp (new) 8-K12B 2026-05-18; Old Digimarc Corp (CIK 1438231, formerly Digimarc Corp) filed FY2025 10-K',
   'Holding company reorganization.'),
  ('XPRO', '2126198', '1575828', '2026-07-13', 'redomiciliation', '0001104659-26-083106',
   '8-K12B', true,  'sonar-6.4-review', now(),
   'SEC submissions: Expro Ltd 8-K12B 2026-07-13; Expro Group Holdings N.V. (CIK 1575828) filed FY2025 10-K 0001437749-26-004727',
   'Dutch N.V. to new parent; same business.'),
  ('REAX', '2136387', '1862461', '2026-08-24', 'merger_successor', '0001104659-26-100334',
   '8-K12B', false, null, null,
   'SEC submissions: Real REMAX Group Inc. 8-K12B 2026-08-24 (amended 2026-11-03); Real Brokerage Inc (CIK 1862461) files 40-F',
   'UNVERIFIED: merger of two businesses and the predecessor reports under IFRS on 40-F. Historical figures are not comparable; review before enabling.'),
  ('SKYD', '2041610', '813828',  '2025-08-07', 'merger_successor', '0001193125-25-175046',
   '8-K12B', false, null, null,
   'SEC submissions: Skydance Corp 8-K12B 2025-08-07 (amended 2025-10-23); Paramount Global (CIK 813828) last 10-K FY2024',
   'UNVERIFIED: Paramount and Skydance combination. Check which entity the ticker should carry history for before enabling.')
on conflict (predecessor_cik, successor_cik) do nothing;
```

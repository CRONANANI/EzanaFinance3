-- Deep research, strategic positioning (Nov 2026): "How is Microsoft
-- positioning itself to capture value from the AI infrastructure boom?"
--
--   1. company_disclosures: two more kinds read from 10-Q and 10-K text,
--      cloud_ai_metrics (cloud and AI revenue and growth as the company
--      reports it) and infrastructure_commitments (data center leases not
--      yet commenced, capital spending plans).
--   2. company_disclosure_ingest.kinds: the kinds a filing has been read
--      for, so a filing read before a kind existed is read again for the
--      new kinds only. A row with no kinds counts as the original three.
--   3. lobbying_client_tickers: the hyperscalers' own LDA client names
--      (the entities that file their reports in-house), verified, so the
--      lobbying comparison counts every company under the same rule.
--
-- Additive and idempotent.

alter table if exists public.company_disclosures
  drop constraint if exists company_disclosures_kind_check;
do $$
begin
  if to_regclass('public.company_disclosures') is not null then
    alter table public.company_disclosures
      add constraint company_disclosures_kind_check check (kind in (
        'customer_concentration', 'export_risk', 'purchase_obligations',
        'cloud_ai_metrics', 'infrastructure_commitments'
      ));
  end if;
end;
$$;

alter table if exists public.company_disclosure_ingest
  add column if not exists kinds text[];

do $$
begin
  if to_regclass('public.lobbying_client_tickers') is not null then
    insert into public.lobbying_client_tickers
      (client_name, ticker, exchange, company_label, verified, match_method, source)
    values
      ('AMAZON.COM SERVICES LLC', 'AMZN', 'NASDAQ', 'Amazon.com, Inc.', true, 'manual', 'sonar_positioning'),
      ('GOOGLE CLIENT SERVICES LLC', 'GOOGL', 'NASDAQ', 'Alphabet Inc.', true, 'manual', 'sonar_positioning'),
      ('META PLATFORMS, INC. AND VARIOUS SUBSIDIARIES', 'META', 'NASDAQ', 'Meta Platforms, Inc.', true, 'manual', 'sonar_positioning'),
      ('ORACLE CORPORATION', 'ORCL', 'NYSE', 'Oracle Corporation', true, 'manual', 'sonar_positioning')
    on conflict (client_name) do update
      set ticker = excluded.ticker, verified = true;
  end if;
end;
$$;

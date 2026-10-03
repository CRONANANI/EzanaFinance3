-- The House PTR parser now reads the owner code (SP spouse, JT joint, DC
-- dependent child; null is the member) and the asset-type code ([ST], [GS],
-- [OP], ...). house_trades had nowhere to keep either. Additive and
-- idempotent. NOT applied by CI or by Claude: apply manually in the SQL Editor.
alter table public.house_trades add column if not exists owner text;
alter table public.house_trades add column if not exists asset_type text;

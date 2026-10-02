-- Senate eFD PTRs report who owns each transaction (Self, Spouse, Joint,
-- Child) and the asset type. The parser already reads both; the table had
-- nowhere to keep them, so a senator's and a spouse's identical same-day
-- trades collapsed into one row in congress_trades. Additive and idempotent.
-- NOT applied by CI or by Claude: apply manually in the SQL Editor.
alter table public.senate_trades add column if not exists owner text;
alter table public.senate_trades add column if not exists asset_type text;

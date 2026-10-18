-- Prediction markets: trending inputs and score on prediction_market_index.
-- Written by the two index crons (index-prediction-markets for Polymarket,
-- index-kalshi for Kalshi) on every run and read by
-- /api/prediction-markets/trending. Additive and idempotent.
--
-- volume_24h        volume traded in the last 24h, in volume_unit
-- price_change_24h  signed change in the YES price over 24h, probability points
-- best_bid/best_ask best YES quotes in (0, 1)
-- spread            best_ask minus best_bid when both sides quote
-- yes_token_id      Polymarket CLOB token id for the YES outcome
-- trending_score    0..1 per-venue score, null when the market is not eligible

alter table public.prediction_market_index
  add column if not exists volume_24h numeric,
  add column if not exists price_change_24h numeric,
  add column if not exists best_bid numeric,
  add column if not exists best_ask numeric,
  add column if not exists spread numeric,
  add column if not exists yes_token_id text,
  add column if not exists trending_score numeric;

-- The trending read filters on platform and status and sorts by score.
create index if not exists prediction_market_index_trending_idx
  on public.prediction_market_index (platform, trending_score desc)
  where status = 'active' and trending_score is not null;

-- Prediction markets: event grouping on prediction_market_index.
-- Written by /api/cron/index-prediction-markets (Polymarket) and
-- /api/cron/index-kalshi (Kalshi); read by /api/prediction-markets/trending
-- to show one card per event with its top outcomes.

alter table public.prediction_market_index
  add column if not exists event_key     text,  -- 'polymarket:<event id>' | 'kalshi:<event ticker>'; outcomes of one event share it
  add column if not exists event_title   text,  -- the event headline, e.g. 'AFC South Division Winner'
  add column if not exists outcome_label text,  -- this row's outcome within the event, e.g. 'Houston'
  add column if not exists recurrence    text;  -- Polymarket series cadence ('daily', 'weekly', 'monthly'...); null for Kalshi

create index if not exists prediction_market_index_event_idx
  on public.prediction_market_index (event_key, probability desc)
  where status = 'active' and event_key is not null;

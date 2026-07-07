-- Nearest-neighbour match for prediction_market_index (mirrors Adjacent's
-- match_documents): cosine similarity over live, unresolved markets above a tuned
-- threshold, top-k, returning the fields RelatedMarketsPanel needs.
create or replace function public.match_markets(
  query_embedding vector(384),
  match_threshold float default 0.803,
  match_count int default 8
)
returns table (
  market_id text, adj_ticker text, platform text, question text,
  probability numeric, volume numeric, liquidity numeric,
  end_date timestamptz, link text, category text, similarity float
)
language sql
stable
as $$
  select
    m.market_id, m.adj_ticker, m.platform, m.question,
    m.probability, m.volume, m.liquidity, m.end_date, m.link, m.category,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.prediction_market_index m
  where m.embedding is not null
    and (m.status = 'active' or m.status = 'true')
    and (m.end_date is null or m.end_date > now())
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_markets(vector, float, int)
  to anon, authenticated, service_role;

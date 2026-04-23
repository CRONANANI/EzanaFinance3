-- Earnings call transcripts (FMP) + lexicon/NLP analysis cache
-- -----------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create table if not exists public.earnings_transcripts (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  year int not null,
  quarter int not null check (quarter between 1 and 4),
  call_date date,
  content text not null,
  fetched_at timestamptz default now() not null,
  unique (symbol, year, quarter)
);

create index if not exists earnings_transcripts_symbol_idx
  on public.earnings_transcripts(symbol, year desc, quarter desc);

create table if not exists public.earnings_transcript_analysis (
  symbol text not null,
  year int not null,
  quarter int not null check (quarter between 1 and 4),
  call_date date,

  sentiment_score numeric not null,
  confidence_score numeric not null,
  uncertainty_score numeric not null,
  litigious_score numeric not null,

  prepared_remarks_sentiment numeric,
  qa_sentiment numeric,
  qa_evasiveness_score numeric,

  top_topics jsonb,

  word_count int,
  positive_word_count int,
  negative_word_count int,
  uncertainty_word_count int,

  directional_tilt text check (directional_tilt in ('bullish','neutral','bearish','mixed')),
  tilt_confidence text check (tilt_confidence in ('low','moderate','high')),
  tilt_reasoning text,

  computed_at timestamptz default now() not null,
  primary key (symbol, year, quarter)
);

create index if not exists transcript_analysis_symbol_idx
  on public.earnings_transcript_analysis(symbol, year desc, quarter desc);

alter table public.earnings_transcripts enable row level security;
alter table public.earnings_transcript_analysis enable row level security;

drop policy if exists "earnings_transcripts_public_read" on public.earnings_transcripts;
create policy "earnings_transcripts_public_read"
  on public.earnings_transcripts for select using (true);

drop policy if exists "earnings_transcript_analysis_public_read" on public.earnings_transcript_analysis;
create policy "earnings_transcript_analysis_public_read"
  on public.earnings_transcript_analysis for select using (true);

notify pgrst, 'reload schema';

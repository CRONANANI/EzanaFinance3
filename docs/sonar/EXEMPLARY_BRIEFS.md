# Sonar exemplary briefs

An exemplary brief is a hand-reviewed, dated, sourced Sonar answer in the
evidence-led response format. It is served for the exact question it answers
and stored so retrieval can find it again.

It is not a few-shot exemplar. `src/lib/sonar/exemplars.js` and
`exemplar-seeds.js` hold placeholder-only examples that teach the v2 composer
structure. An exemplary brief holds real facts and real citations.

## Where things live

| What                          | Path                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| The briefs (source of truth)  | `src/lib/sonar/exemplary/briefs/`                               |
| Registry and lookup           | `src/lib/sonar/exemplary/index.js`                              |
| Matching rules (pure)         | `src/lib/sonar/exemplary/match.js`                              |
| The response page             | `src/components/sonar/exemplary/SonarExemplaryBrief.jsx`        |
| The live market chart         | `src/components/sonar/exemplary/SonarExemplaryChart.jsx`        |
| Retrieval table and match RPC | `supabase/migrations/20261122090000_sonar_exemplary_briefs.sql` |
| Indexer (embeds and upserts)  | `GET /api/cron/index-sonar-exemplary`                           |
| Tests                         | `npm run test:sonar-exemplary`                                  |

## How a ping reaches a brief

1. The Sonar band posts the ping to `/api/sonar/landing-query` with
   `formats: ['exemplary']`.
2. Before anything is reserved or spent, the route calls
   `findExemplaryBrief(query)`.
3. Two gates, both required (match.js):
   - **Concepts.** The ping names every concept group of the brief (for the
     NVIDIA brief: the person and the event).
   - **Similarity.** The ping's content words overlap the brief's question, or
     one of its listed variants, by at least 0.72.
4. A ping that passes the concept gate and scores between 0.40 and 0.72 is
   borderline. Only then is the ping embedded (gte-small, the shared vector
   space) and compared with `match_sonar_exemplary_briefs`; it is served at a
   cosine similarity of 0.90 or more, and only for the brief the concept gate
   already chose. With the table absent, a borderline ping is not served.
5. Anything else runs the live pipeline as before.

A served brief is not charged: no ledger row, and the guest cookie is left
alone.

## Rules for a brief

- Every factual line cites a source listed in the brief. Prefer primary
  sources: filings and issuer releases. Read each source on the day in
  `verifiedAsOf`.
- A line that is interpretation says so.
- No price data in a brief. The chart is drawn at view time from real daily
  closes; with no prices it shows an empty state and Retry.
- A brief is dated. Set `reviewAfter` to the first day it should be read again
  (the next earnings date, for example) and update or retire it then.
- No em dashes, no vendor or infrastructure names in anything a reader sees.

## Adding a brief

1. Add a file under `briefs/` in the shape of the existing one, with
   `question`, `variants`, and `concepts`.
2. Register it in `EXEMPLARY_BRIEFS` (index.js).
3. Add serve and do-not-serve pings for it to
   `scripts/check-sonar-exemplary.mjs`.
4. After deploy, run the indexer once so the retrieval table has its
   embedding.

## Other questions

A question without a stored brief is planned by the adaptive research layer
(`docs/sonar/adaptive-research/README.md`). Where its scenario has an executor
the answer is researched live and drawn in this same visual language with the
sections that scenario calls for; otherwise it gets the existing Sonar answer.

## Expiry

A brief is withdrawn automatically (`src/lib/sonar/exemplary/freshness.js`):

- `expiresAt` (an ISO instant) with `expiryReason`: a scheduled event that
  changes the answer, such as a results release.
- otherwise `reviewAfter` (a day), from 00:00 UTC.
- `SONAR_EXEMPLARY_RETIRED=slug-a,slug-b`: retire a brief at once for news
  nobody scheduled. No deploy is needed beyond the environment change.

A withdrawn brief is never shown with a warning. The ping runs as adaptive
research (leadership impact for the NVIDIA brief) and reads today's evidence.
To bring a brief back, re-verify it, raise `version`, and set new dates.

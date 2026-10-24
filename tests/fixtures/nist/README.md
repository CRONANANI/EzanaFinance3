# NIST CHIPS awards page fixtures

These are STRUCTURE fixtures, not fetched pages. The sandbox that wrote the
parser could not reach www.nist.gov (egress refused), so the files reproduce
the published entry format ("Company (State) – City, ST" heading linking to a
detail page, then "Award Amount:" or "Proposed Award Amount:") with fictional
companies and figures. They test the parser only and are never imported into
the database.

Replace them with real saved pages (`curl -A "<UA>" https://www.nist.gov/chips/chips-program-office-awards > page-0.html`)
on the first run from a machine that can reach NIST, and re-run
`npm run test:chips-ingest`.

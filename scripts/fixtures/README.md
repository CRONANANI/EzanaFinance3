# Test fixtures

Schedule 13D / 13G primary XML documents used by `scripts/check-titans.mjs`.
They are real filings as submitted to SEC EDGAR (public records) in the
structured format the SEC introduced in December 2024. The filer access codes
were already redacted (`XXXXXXXX`) in the copies taken.

| File                             | Form                                     | Issuer                     |
| -------------------------------- | ---------------------------------------- | -------------------------- |
| `schedule13d.xml`                | SCHEDULE 13D                             | Aadi Bioscience, Inc.      |
| `schedule13d-nested-cusip.xml`   | SCHEDULE 13D (CUSIP in `issuerCusips`)   | Seaport Therapeutics, Inc. |
| `schedule13g.xml`                | SCHEDULE 13G                             | Jushi Holdings Inc.        |
| `schedule13g-a-nested-cusip.xml` | SCHEDULE 13G/A (CUSIP in `issuerCusips`) | Avis Budget Group, Inc.    |

Copied from the test data of the open-source edgartools project
(github.com/dgunning/edgartools, `tests/data/beneficial_ownership/`), because
EDGAR itself was not reachable from the environment the parser was written in.

## Titans Shadow steps 2 to 4 (`scripts/check-titans-2.mjs`)

Also copied from the edgartools test data (real SEC filings unless marked):

| File                                      | What it is                                                                                                                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `form4/snow-sale-exercise.xml`            | Form 4, Snowflake CFO: five open-market sales and an option exercise (derivative row)                                                                                                                                            |
| `form4/374water-award.xml`                | Form 4, 374Water: awards (code A), non-derivative and derivative                                                                                                                                                                 |
| `form4/vertex-derivative-only.xml`        | Form 4, Vertex: one derivative row only                                                                                                                                                                                          |
| `form4/synthetic-purchase-two-owners.xml` | **SYNTHETIC**, written for the test: an open-market purchase (code P), two reporting owners and a footnote-only price, which no real fixture available here covered. Invented names and numbers; never loaded into the database. |
| `pvp/cabot-def14a-trimmed.html`           | Cabot Corporation DEF 14A (fiscal 2023): the inline XBRL contexts and the ecd, dei and NetIncomeLoss facts, unchanged; narrative HTML removed                                                                                    |
| `nport/dupree-kentucky.xml`               | NPORT-P, Dupree Kentucky Tax-Free Short-to-Medium Series (55 holdings)                                                                                                                                                           |

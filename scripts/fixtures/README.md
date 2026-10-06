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

# IMF WEO reference table: refresh every April and October

Sonar labels every IMF World Economic Outlook value as **actual**, **IMF estimate** or
**IMF projection** (`src/lib/sonar/analysts/weo-status.js`). The boundary is each country's
last actual year per indicator group (national accounts, CPI, government finance, balance of
payments), from the WEO Database Appendix's Country Data Documentation tables. It lives in
`src/lib/sonar/analysts/reference/weo-latest-actual.js`.

Years after a country's last actual year are IMF staff estimates even when they are in the
past (for many countries 2025 is still an estimate in the October 2026 vintage; Libya's
national accounts are actual only to 2019). The current year and later are projections.

## When

Every April and October, after the IMF publishes a new WEO and its Database Appendix.

## How

1. Download the new Database Appendix PDF from the IMF WEO page.
2. Regenerate the table (needs `pdftotext`, from poppler-utils):

   ```bash
   npm run build:weo-latest-actual -- /path/to/appendix.pdf --vintage 2027-04 --through 2027-03-31
   ```

   The script reads years by the column they sit under ("Latest Actual Annual Data"), never by
   their order in the row, and refuses to write if it parses fewer than 150 economies (a sign the
   layout changed). Unplaced rows are listed: add the IMF spelling to `IMF_NAMES` in the script.

3. Review the diff of `weo-latest-actual.js`, run `npm run test:sonar-weo`, and commit.

`--check` compares a new appendix with the committed table without writing.

## Related

- The OECD Economic Outlook projection boundary is `PROJECTION_FROM_YEAR` in
  `src/lib/oecd-curated.js` (2026 for the June 2026 edition). Update it whenever a new OECD
  edition is synced.
- Output gap and potential growth (OECD members only) are catalogue families `output_gap` and
  `potential_growth`, read from `oecd_series_observations` (`eo-gap`, `eo-gdpvtr_annpct`).

# Ezana datasets roadmap: Eyes Above, Consumer Whispers, The Hive, Global Empire Lighthouse, Regulatory Winds

Status Oct 2026. Capitol Watch and Titans Shadow are live or in final build. This file lists, for every remaining dataset, the source to build from, the GitHub project or API to use, what it costs, and the order to build in for go-to-market.

Rules for every source: public or licensed for commercial display, attributed on the page, ingested by cron into our database (never fetched live per request), no invented numbers.

## Build order (go-to-market first)

1. Global Empire Lighthouse: World Bank, IMF, Geopolitical Risk Index, OFAC sanctions, GDELT. All free and official; reuses the OECD pipeline pattern. Fastest dimension to finish.
2. Regulatory Winds: Federal Register, Regulations.gov, CourtListener, SEC enforcement releases, openFDA. Free APIs; strong tie-in to Capitol Watch and Titans tickers.
3. The Hive: Kalshi and Manifold beside our Polymarket index; Ezana community signals from our own data.
4. Consumer Whispers: FRED and Census for spending, Wikipedia pageviews for attention, Cloudflare Radar and Tranco for web traffic, Apple chart rankings for apps.
5. Eyes Above: USPTO patents first (free, clean), IMF PortWatch for supply chains, then satellite-derived signals (largest build).

## Global Empire Lighthouse

| Dataset                           | Source                                                    | GitHub / API                                                                              | Access                      | Effort |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------- | ------ |
| OECD Macro Data                   | OECD (live)                                               | existing pipeline                                                                         | Free                        | Done   |
| World Bank Economic Indicators    | World Bank Indicators API                                 | api.worldbank.org/v2; Python client github.com/tgherzog/wbgapi                            | Free, no key, CC BY 4.0     | Low    |
| Global & Macro                    | IMF Data (SDMX) and FRED                                  | data.imf.org API; fred.stlouisfed.org API                                                 | Free; FRED needs a free key | Low    |
| Geopolitical Risk Indices         | Caldara and Iacoviello GPR index                          | matteoiacoviello.com/gpr.htm (monthly and daily CSV)                                      | Free with citation          | Low    |
| Sanctions & Trade Policy Tracking | OFAC SDN and consolidated lists; WTO tariff and trade API | ofac.treasury.gov sanctions list service (XML/CSV); apiportal.wto.org                     | Free (WTO needs a free key) | Medium |
| GDELT Global Events Database      | GDELT 2.0                                                 | gdeltproject.org (15-minute event files; DOC 2.0 API); BigQuery public dataset `gdelt-bq` | Free                        | Medium |

Note: OpenSanctions (github.com/opensanctions/opensanctions) is the best merged sanctions dataset, but commercial use needs a paid licence. Start with OFAC directly.

## Regulatory Winds

| Dataset                                 | Source                                                                                                                    | GitHub / API                                                                                                        | Access                   | Effort |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ |
| New Laws & Policy Legislation           | Congress.gov API (already ingesting bills), GovInfo API                                                                   | api.congress.gov; api.govinfo.gov; github.com/unitedstates/congress (scrapers)                                      | Free key (api.data.gov)  | Low    |
| Government Agency Rulings & Decisions   | Federal Register API; Regulations.gov API                                                                                 | federalregister.gov/developers (no key); open.gsa.gov/api/regulationsgov                                            | Free                     | Low    |
| Lawsuits & Legal Proceedings            | CourtListener (Free Law Project), RECAP federal dockets                                                                   | courtlistener.com/api; github.com/freelawproject/courtlistener                                                      | Free token; rate limited | Medium |
| Regulatory Investigations & Enforcement | SEC litigation releases and administrative proceedings; DOJ press releases; CFPB enforcement actions; openFDA enforcement | sec.gov RSS and EDGAR; justice.gov/api; consumerfinance.gov enforcement data; open.fda.gov (github.com/FDA/openfda) | Free                     | Medium |

Linkage to build: match companies in rulings, dockets and enforcement to tickers (company_tickers.json and the CUSIP map), so a hub card can show "regulatory action against a company members or funds just bought".

## The Hive

| Dataset                    | Source                                                  | GitHub / API                                                                          | Access                                             | Effort |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| Prediction Markets         | Polymarket (live index), Kalshi, Manifold               | Polymarket Gamma API; trading-api.kalshi.com public market data; api.manifold.markets | Free for market data; check Kalshi's display terms | Low    |
| Crowdsourced Intelligence  | Metaculus, Manifold                                     | metaculus.com/api; api.manifold.markets                                               | Free; Metaculus terms require attribution          | Low    |
| Platform Community Signals | Ezana community (our own data)                          | our database                                                                          | Owned                                              | Low    |
| Retail Sentiment Data      | ApeWisdom (aggregated Reddit and 4chan ticker mentions) | apewisdom.io/api                                                                      | Free; confirm commercial-display terms first       | Low    |

Note: Reddit's own API requires a paid commercial agreement since 2023, and StockTwits' API is not open to new developers. Do not scrape either.

## Consumer Whispers

| Dataset                  | Source                                                                                                  | GitHub / API                                                                                              | Access                                        | Effort |
| ------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------ |
| Consumer Spending Trends | FRED (retail sales, PCE), Census Monthly Retail Trade, BEA; Opportunity Insights Economic Tracker       | fred.stlouisfed.org API; api.census.gov; apps.bea.gov/api; github.com/OpportunityInsights/EconomicTracker | Free                                          | Low    |
| Search Interest Data     | Google Trends API (alpha, by application); Wikipedia pageviews as the always-available attention signal | developers.google.com/search/apis/trends (apply); wikimedia.org/api/rest_v1 (pageviews)                   | Trends: application required. Pageviews: free | Medium |
| Web Traffic Analytics    | Cloudflare Radar domain rankings; Tranco research ranking                                               | developers.cloudflare.com/radar (free token); tranco-list.eu, github.com/DistributedSecurity/tranco       | Free                                          | Medium |
| App Download Velocity    | Apple top-chart rankings (rank, not downloads)                                                          | rss.applemarketingtools.com                                                                               | Free                                          | Low    |

Link check (Oct 6, 2026): github.com/DistributedSecurity/tranco did not resolve as a public repository; confirm the current Tranco repository on tranco-list.eu before building.

Notes: true download counts are only available commercially (Sensor Tower, Appfigures); we show chart-rank velocity and say so. Unofficial Google Trends scrapers (pytrends) break often and are against Google's terms; use the official API once approved.

## Eyes Above

| Dataset                         | Source                                                                                                                              | GitHub / API                                                                                                                                                           | Access | Effort                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Patent Activity                 | USPTO PatentsView and the USPTO Open Data Portal                                                                                    | search.patentsview.org/api (free key); data.uspto.gov; github.com/PatentsView                                                                                          | Free   | Low                                                                                                            |
| Supply Chain Monitoring         | IMF PortWatch (daily port calls and chokepoint transits); NY Fed Global Supply Chain Pressure Index; Census international trade API | portwatch.imf.org (ArcGIS REST, no key); newyorkfed.org GSCPI CSV; api.census.gov                                                                                      | Free   | Medium                                                                                                         |
| Satellite Imagery               | Copernicus Sentinel-2 and Sentinel-5P (NO2), NASA Black Marble night lights, NASA FIRMS fires                                       | dataspace.copernicus.eu; earth-search STAC on AWS Open Data; github.com/stac-utils/pystac-client; github.com/sentinel-hub/sentinelhub-py; firms.modaps.eosdis.nasa.gov | Free   | High: needs a processing worker (Python, GitHub Actions or Cloud Run) that turns imagery into per-site signals |
| Commercial Real Estate Activity | FRED commercial real estate price and lending series; Census construction spending                                                  | fred.stlouisfed.org; api.census.gov                                                                                                                                    | Free   | Low (macro level only)                                                                                         |

Note: property-level commercial real estate data (CoStar, Reonomy) is commercial only. We ship the macro series first and say so on the page.

## How each dataset ships

1. Source check: licence, rate limits, attribution text.
2. Table and cron (Supabase-first, bounded per run, `CRON_SECRET`).
3. Ticker linkage where it applies (company name or CIK to ticker; CUSIP map for securities).
4. EzanaQL catalog entry in its dimension.
5. Hub summary numbers and at least one linkage card.
6. Taxonomy `live: true` only when the page shows real data end to end.

## Sources

- IMF PortWatch data and methodology: https://portwatch.imf.org/pages/data-and-methodology
- Google Trends API (alpha) coverage: https://www.seroundtable.com/google-trends-api-39820.html
- SEC insider transactions data sets: https://www.sec.gov/data-research/sec-markets-data/insider-transactions-data-sets
- SEC Form N-PORT data sets: https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets
- unitedstates/congress-legislators: https://github.com/unitedstates/congress-legislators

Link check (Oct 6, 2026): every GitHub repository above was confirmed with `git ls-remote` except the Tranco one noted under Consumer Whispers. The web pages and APIs could not be reached from the build environment's network, so their licence and access terms were not re-checked here; confirm each in step 1 of How each dataset ships.

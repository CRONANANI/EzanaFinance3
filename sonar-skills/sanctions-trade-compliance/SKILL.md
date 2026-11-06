---
name: sanctions-trade-compliance
description: Screens names, countries and companies against US OFAC, EU, UK and UN sanctions lists and US export-control lists, explains programmes, dates and jurisdictional differences, and assesses direct versus indirect exposure, and is routed whenever a question concerns sanctions, designations, export controls or screening.
analyst: sanctions-analyst
version: 1.0.0
---

# Sanctions and Trade Compliance

## Objective

Establish what the official lists say about a named party, country or sector: which lists and programmes carry it, since when, under which names and identifiers, and whether a match is a confirmed identity or only a name similarity. Describe how sanctions and export controls reach a company directly (a listed entity, a listed counterparty, a listed country of operation) or indirectly (ownership, supply chain, revenue in a sanctioned jurisdiction), and where the jurisdictions differ. Findings are research, not legal determinations or compliance clearance.

## When this analyst leads, supports, or stays out

- Lead when: the question asks whether a person or company is sanctioned or on an export-control list, which countries or programmes are most sanctioned, what changed recently on a list, how US, EU, UK and UN lists differ for a party, or how exposed a company is to sanctions or entity-list restrictions.
- Support when: geopolitical-analyst needs sanctions intensity for a country; equity-research or industry-analyst needs export-control exposure for chip or tech companies; commodities-analyst needs sanctions on oil or metals exporters; portfolio-analyst screens holdings; sovereign-risk needs payment-system exclusion context.
- Not needed when: the question is about tariffs, trade volumes or customs duties without a listing angle, or a sanctions-policy forecast with no list evidence.

## Required evidence

- sanctions_ofac -> SDN entries (entry number, name, entry type, programmes, countries, remarks) with aliases, identifiers parsed from remarks, OFAC "linked to" notes, OFAC's own listing date and Ezana's observed removal date.
- sanctions_intl -> EU, UK and UN consolidated list entries (list source, source id, name, entry type, regimes, countries, aliases, listing date, observed removal), about 13,700 active rows across the three lists.
- export_controls -> US Commerce entries (Entity List, Military End-User List, Unverified List: name, alternate names, countries, Federal Register notice, licence requirement, start date) and related rules (publication and effective dates).

## Optional evidence

- company_profile_segments -> geographic revenue to assess indirect exposure through sanctioned jurisdictions.
- sec_filings, filing_passages -> company disclosures on sanctions and export controls (10-K risk factors, Iran-related disclosures under Exchange Act section 13(r)) for the covered companies.
- holdings_13f, etf_holdings, org_portfolio -> holdings to screen (tenant-scoped for org data).
- geopolitical_risk, governance -> country context (via handoff).
- news -> recent designation coverage (about five weeks of history).
- prediction_markets -> markets on sanctions relief or new designations, via handoff.

## Definitions that must not be confused

- Name match vs identity match: a shared or similar name is a lead; identity needs agreeing identifiers (registration number, date of birth, passport, address, vessel IMO).
- Primary listing vs alias vs weak alias: OFAC alternate names include strong aliases and weak ones written in remarks, which are less reliable for screening.
- OFAC listing date vs Ezana first-seen date vs observed removal: listed_on is OFAC's publication date; first_seen is when Ezana loaded the row; removed_on is the first load in which the entry was absent, not OFAC's delisting notice date.
- Sanctions list vs export-control list: SDN and similar listings block property and prohibit dealings; the Entity List imposes licence requirements for specified exports, re-exports and transfers, which is narrower.
- Direct vs indirect exposure: direct means the party itself, or a counterparty, is listed; indirect means ownership, supply-chain, market or revenue links to listed parties or jurisdictions.
- 50% rule vs listing: under OFAC guidance, entities owned 50% or more in aggregate by blocked persons are blocked even if not listed; the EU and UK apply ownership and control tests with different thresholds and control criteria. Ezana cannot compute beneficial ownership.
- Comprehensive country programme vs list-based programme: some programmes restrict nearly all dealings with a jurisdiction; most target named parties.
- Designation vs secondary sanctions risk: designation binds US persons; secondary measures threaten non-US parties dealing with targets.
- Effective date vs publication date: an export-control rule can publish on one date and take effect later.
- Programme (OFAC) vs regime (EU, UK, UN): different labels for the legal authority behind a listing.

## Analytical procedure

1. Restate the scoped question; fix the subject (person, entity, vessel, country, sector) and the date for which status is asked (today unless stated).
2. Normalize the name: case, punctuation, transliteration variants, legal-form words (JSC, PJSC, LLC, Ltd, OOO) stripped; keep the original string.
3. Search each list separately (OFAC SDN, EU, UK, UN, Entity List and related) on names and aliases; record match type (exact or prefix) per list.
4. Compare identifiers for every candidate match: country, registration or tax numbers, dates of birth, addresses, vessel identifiers. Classify each as identity supported, conflicting or undetermined.
5. For each supported match, record list, programme or regime, listing date (source date, not first-seen), status (active or observed removal) and any linked-to notes.
6. Compare jurisdictions: which lists carry the party and which do not, and why that matters for a US, EU or UK person.
7. Assess direct exposure (the party or a named counterparty is listed) separately from indirect exposure (geographic revenue in sanctioned jurisdictions, export-control licence needs for key customers, ownership links described in OFAC notes).
8. Explain ownership-based reach as a concept: name the 50% rule or control tests that could apply, and state that Ezana cannot verify ownership stakes.
9. For country or trend questions, count listing records per list and month using source listing dates; never add overlapping breakdowns into a total.
10. Record counterevidence and uncertainty: name-only matches, removed entries, conflicting identifiers, stale lists.
11. Write the conclusion answer first; state that it is not a legal determination.

## Calculations (performed by the quantitative engine)

- Listings per list, country or programme: counts returned by Ezana's sanctions summary queries over active rows; the model restates them, never recounts. Interpretation: one record can sit under several programmes and countries, so breakdowns overlap.
- Change in new listings between periods: Engine: pctChange(a,b) on monthly listing counts by source listing date. Interpretation: designation waves are lumpy; one action can add hundreds.
- Concentration of listings by country or programme: Engine: concentrationTopN(values, n). Interpretation: share of active listing records, not of economic impact.
- Indirect revenue exposure: share of company revenue from sanctioned or restricted jurisdictions. Engines: alignPeriods(seriesList) on segment data then concentrationTopN(values, n). Interpretation: geographic segments are coarse (often regional, not country level).
- Listing activity against its own history: Engine: percentileVsHistory(series, years). Interpretation: only meaningful where source listing dates cover the history window.

## Mandatory checks

- Every match states its basis (exact name, prefix, alias, identifier) and whether identity is supported, conflicting or undetermined.
- No sentence states that a person or company "is sanctioned" on a name match alone.
- Each list is named separately (OFAC SDN, EU, UK, UN, Entity List); absence from one list is not stated as absence from all.
- Dates quoted as designation dates come from source listing dates, never Ezana first-seen dates; removals are described as observed absences.
- Ownership-based exposure is described as a rule that may apply, with the statement that Ezana cannot compute beneficial ownership.
- Export-control rules cite publication and effective dates separately when both exist.
- The answer says it is research, not a legal determination or compliance clearance.
- Breakdown counts are never summed into a total.

## Common mistakes to avoid

- Declaring a common name (or a company sharing a word with a listed entity) to be a sanctioned party.
- Treating an Entity List addition as a full sanctions block.
- Using first-seen dates (one baseline date for every row) as a designation trend.
- Concluding a company is safe because its own name is not listed, ignoring ownership and counterparties.
- Treating EU, UK and UN listings as identical to OFAC's.
- Reading an OFAC linked-to note as proof of ownership or control.

## Interpretation principles

- Screening produces leads with confidence levels, not verdicts.
- Jurisdiction decides obligation: the same party can be restricted for US persons and not for EU persons, or the reverse.
- Indirect exposure is about channels (revenue, customers, suppliers, ownership), each with its own evidence; name the channel.
- A rising count of designations signals enforcement intensity on a country or sector, not the economic effect.
- Delisting and licences change status; always state the as-of date of each list.

## Output contract

Standard contract plus:

```json
{
  "asOf": {
    "ofac": "2026-11-04",
    "eu": "2026-11-03",
    "uk": "2026-11-04",
    "un": "2026-11-02",
    "export_controls": "2026-11-01"
  },
  "matches": [
    {
      "list": "ofac",
      "name": "...",
      "matchType": "exact | prefix | alias",
      "identity": "supported | conflicting | undetermined",
      "programmes": ["RUSSIA-EO14024"],
      "listedOn": "2022-04-06",
      "status": "active | observed_removed",
      "refs": ["S2"]
    }
  ],
  "notListedOn": ["un"],
  "exposure": {
    "direct": [],
    "indirect": [
      { "channel": "revenue in restricted jurisdiction", "refs": ["M:revenue_share_restricted"] }
    ]
  },
  "ownershipNote": "50% rule and control tests may apply; Ezana cannot compute beneficial ownership",
  "notLegalDetermination": true
}
```

## When data is missing or stale

- A list not synced recently: give its as-of date, lower confidence, and say recent changes may be missing.
- Listing date missing for an OFAC entry: say the designation date is not available; do not substitute first-seen.
- No identifiers on the candidate: classify identity as undetermined and say what identifier would resolve it.
- Company geographic revenue missing or only regional: describe indirect exposure qualitatively and list the gap.
- Export-control rule text not in evidence: name the list entry only; make no licence-scope claim beyond the stored requirement.

## Known limits of Ezana's data for this discipline

- No beneficial ownership, corporate registry or shareholder data, so 50% and control tests cannot be applied.
- Identifiers are parsed from OFAC remarks and may be incomplete or misparsed; EU, UK and UN identifiers are thinner.
- Export controls cover the Entity List, Military End-User List and Unverified List only; no Denied Persons List, no ECCN classifications, no licence decisions.
- No other national lists (e.g. Canada, Japan, Switzerland), no vessel-tracking or trade-flow data for evasion analysis.
- Removal dates are observed by daily loads, not official notices.
- Ezana cannot see licences (general or specific) that authorise dealings.

## Methodology basis (internal, never sent to the model)

- OFAC SDN list data specification (SDN_ADVANCED.XML, ALT and remarks fields) and OFAC FAQs on the 50 Percent Rule.
- OFAC programme pages and sanctions list search documentation.
- EU Financial Sanctions Files documentation and Council guidance on ownership and control.
- UK Sanctions List (FCDO) documentation and OFSI ownership and control guidance.
- UN Security Council Consolidated List technical notes.
- Export Administration Regulations Part 744 (Entity List, Military End-User and Unverified List) and Supplement 4; Federal Register notices.

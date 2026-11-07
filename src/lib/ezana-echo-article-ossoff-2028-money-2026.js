// src/lib/ezana-echo-article-ossoff-2028-money-2026.js
// Ezana Echo article: Jon Ossoff's post-midterm repricing as the 2028
// prediction-market favorite, and the campaign money behind it.
// Written from the 7 November 2026 vantage.
//
// SOURCING NOTE
// Campaign finance figures come from Ezana's campaign finance dataset
// (public.fec_candidate_totals / fec_candidate_outside, built from OpenFEC),
// bioguide O000174, FEC S8GA00180, cycle 2026, coverage 1 Jan 2025 to
// 14 Oct 2026, pulled 7 Nov 2026. Every dataset figure below was read from
// those rows; derived shares are Ezana arithmetic on the same rows.
// The outside-money row for Ossoff shows support/oppose totals of 0 with no
// committees: that is treated as NOT CAPTURED, not as zero outside spending,
// and the article makes no outside-money claim.
// Mike Collins's dataset row is his House committee (seat-matched ID) and is
// all zeros for his Senate run, so it is NOT used; his Senate fundraising is
// cited from CBS News.
//
// FACT CHECK MANIFEST
// 1. Kalshi 2028 presidency: Ossoff 22%, Vance 12%, Rubio 10% -> Kalshi post, 6 Nov 2026
// 2. Kalshi and Polymarket presidency 20% on 4 Nov, up 8 and 7 pts; Vance 16%/15%, Rubio 12% Kalshi, Newsom 14% Polymarket -> The Daily Beast, 4 Nov 2026
// 3. Ossoff ~12% on Kalshi presidency on 2 Nov -> derived: 20% less the 8-pt gain (Daily Beast)
// 4. Kalshi Dem nomination: Ossoff 13% -> 24% all-time high; Newsom peak 36% (2025 to mid-2026) -> 13%; AOC 13% to 14% -> Action Network, 4 Nov 2026
// 5. AP called GA Senate for Ossoff at 7:55 p.m. EST 3 Nov; opponent Rep. Mike Collins, Trump-endorsed -> OPB/AP, 3 Nov 2026
// 6. Margin about 18 points; Trump carried GA in 2024 -> The Daily Beast, 4 Nov 2026
// 7. Democrats at least 54 Senate seats; flips incl. Maine (Susan Collins lost) and Ohio (Husted lost) -> Al Jazeera, 4 Nov 2026
// 8. Q2 2026: Ossoff raised $20M, >$42M on hand, >474,000 donations, ~340,000 from <$200 donors; Collins $2.1M, ~16,000 donations -> CBS News Atlanta, 15 Jul 2026
// 9. 731 days from 7 Nov 2026 to the 7 Nov 2028 election -> calendar arithmetic (the "731 days" on Kalshi's chart is days to election, NOT days the market has been open)
// 10. Senate year-end FEC report due 31 Jan 2027; post-general report covers the final weeks -> FEC filing calendar
// 11. Gray Media (GTN) is Atlanta-based; GTN, NXST, SBGI report political advertising revenue -> company 10-K/10-Q filings
// 12. HOOD offers Kalshi-listed event contracts; ICE agreed to invest up to $2B in Polymarket; CME and DKNG have launched event-contract products -> company announcements 2025
// 13. Ossoff took office January 2021 -> Senate records
// 14. No candidate named in FIG. 5 has formally declared a 2028 candidacy -> re-check on publish day
// 15. Transfers between a candidate's own federal campaign committees are permitted under FEC conditions -> 11 CFR 110.3(c)(4)
// ============================================================

export const ossoff2028Money2026 = {
  id: 'ossoff-2028-money-2026',
  title:
    "Ossoff's $115.9 Million Machine: The Small-Dollar Money Behind the 2028 Prediction-Market Favorite",
  excerpt:
    "Kalshi now prices Jon Ossoff at 22% to win the 2028 presidency, up from about 12% before his Georgia reelection. Ezana's campaign finance data shows why traders noticed: $115.9 million raised this cycle, the most in Congress, with 75.3% of sized contributions under $200.",
  heroImage: {
    // Owned/cleared image only. Noah supplies public/echo/ossoff-2028-hero.jpg.
    src: '/echo/ossoff-2028-hero.jpg',
    alt: 'Editorial illustration of the Georgia state capitol dome beside a rising prediction-market price line',
    caption:
      "Editorial illustration. Market prices from Kalshi and Polymarket; fundraising figures from Ezana's campaign finance dataset, built from FEC filings through 14 October 2026.",
  },
  category: 'politics-policy',
  subcategory: 'Elections',
  contentBlocks: [
    {
      type: 'paragraph',
      text: "Jon Ossoff became the prediction-market favorite for the 2028 presidency within 72 hours of winning a second Senate term. Kalshi priced his 2028 presidential contract at 22% on 6 November, ahead of J.D. Vance at 12% and Marco Rubio at 10%, according to the exchange's own post. The repricing rests on more than one election night. Ezana's campaign finance dataset shows Ossoff's committee took in $115.9 million in the 2026 cycle through 14 October, the most of all 538 sitting members of Congress and 2.4 times the next-largest total, and 75.3% of the contributions the filings size arrived in amounts under $200.",
    },
    {
      type: 'stat-grid',
      stats: [
        { label: '2026-cycle receipts', value: '$115.9M', change: '#1 of 538 members' },
        { label: 'Sized money under $200', value: '75.3%', change: '$84.5M of $112.2M' },
        { label: 'Kalshi 2028 presidency', value: '22%', change: '+10 pts since 2 Nov' },
        { label: 'Georgia margin', value: '~18 pts', change: 'AP call 7:55 p.m., 3 Nov' },
      ],
    },

    { type: 'heading', text: 'How the market repriced in 72 hours', level: 2 },
    {
      type: 'paragraph',
      text: "On Monday, 2 November, Kalshi's 2028 presidential contract priced Ossoff near 12%. The Associated Press called Georgia's Senate race for him at 7:55 p.m. Eastern on 3 November, shortly after polls closed, and he finished about 18 points ahead of Republican Representative Mike Collins, according to The Daily Beast, in a state Donald Trump carried in 2024. By Wednesday afternoon the contract stood at 20% on both Kalshi and Polymarket, gains of 8 and 7 points. Kalshi's 6 November post put him at 22%.",
    },
    {
      type: 'paragraph',
      text: "The nomination market moved harder. Kalshi's contract on the 2028 Democratic nomination rose from about 13% to an all-time high of 24% in the hours after the Georgia call, according to Action Network, with the gain coming largely out of Gavin Newsom's contract, which had peaked at 36% between 2025 and mid-2026 and fell to 13%. Alexandria Ocasio-Cortez held between 13% and 14%. On 7 November the election was 731 days away, so these are [[kw:implied-probability]]implied probabilities[[/kw]] on an event two years out, set by traders rather than pollsters.",
    },
    {
      type: 'revision-ledger',
      figureLabel: 'FIG. 1 · THE 72-HOUR REPRICING',
      kicker:
        'EVENT-CONTRACT PRICES BEFORE AND AFTER THE 3 NOVEMBER 2026 GEORGIA CALL, % · HOLLOW = BEFORE, FILLED = AFTER · GREEN = PRICE UP, RED = PRICE DOWN · CLICK A ROW FOR THE RECORD',
      hint: 'Prices are market-implied probabilities, not forecasts.',
      source:
        'Kalshi post (6 Nov 2026); The Daily Beast (4 Nov 2026); Action Network (4 Nov 2026). The 2 Nov Kalshi presidency level is derived from the reported 8-point gain to 20%; the Polymarket before-level from the reported 7-point gain.',
      scale: 'linear',
      unit: '%',
      rows: [
        {
          label: 'Ossoff · Kalshi 2028 presidency',
          sub: '2 Nov to 6 Nov',
          before: 12,
          after: 22,
          beforeDisplay: '~12%',
          afterDisplay: '22%',
          delta: 10,
          deltaDisplay: '+10 pts',
          favorable: 'up',
          record:
            "About 12% on Monday 2 November (derived from the reported 8-point move to 20% on 4 November); 22% in Kalshi's own post on 6 November, ahead of Vance at 12% and Rubio at 10%.",
        },
        {
          label: 'Ossoff · Polymarket 2028 presidency',
          sub: '3 Nov to 4 Nov',
          before: 13,
          after: 20,
          beforeDisplay: '~13%',
          afterDisplay: '20%',
          delta: 7,
          deltaDisplay: '+7 pts',
          favorable: 'up',
          record:
            'Up 7 points to 20% by Tuesday morning, per The Daily Beast; the before-level is derived from that reported gain. Newsom sat third on Polymarket at 14%.',
        },
        {
          label: 'Ossoff · Kalshi Democratic nomination',
          sub: 'pre-election to post-call peak',
          before: 13,
          after: 24,
          beforeDisplay: '13%',
          afterDisplay: '24%',
          delta: 11,
          deltaDisplay: '+11 pts',
          favorable: 'up',
          record:
            "From 13% to 24%, the contract's all-time high, within hours of the Georgia call, per Action Network.",
        },
        {
          label: 'Newsom · Kalshi Democratic nomination',
          sub: '2025 to mid-2026 peak to 4 Nov',
          before: 36,
          after: 13,
          beforeDisplay: '36%',
          afterDisplay: '13%',
          delta: -23,
          deltaDisplay: '-23 pts',
          favorable: 'up',
          record:
            "Newsom's nomination contract peaked at 36% between 2025 and mid-2026 and stood at 13% on 4 November, with Action Network attributing the post-election leg of the decline to Ossoff's gain.",
        },
      ],
      verdict:
        "Three of four lines moved 7 to 11 points toward Ossoff in about 72 hours. The one decline, Newsom's nomination contract, built over a longer stretch and ended the week level with Ocasio-Cortez.",
    },
    {
      type: 'paragraph',
      text: 'The national result framed the move. Democrats secured at least 54 Senate seats on 3 November, flipping at least seven Republican-held seats including Maine and Ohio, according to Al Jazeera. Within that wave, traders singled out a Democrat who won by double digits in a state Trump carried two years earlier, and who had the largest campaign account in Congress to do it. The second half of that sentence is the part the filings can measure.',
    },

    { type: 'heading', text: 'The largest campaign account in Congress', level: 2 },
    {
      type: 'paragraph',
      text: "Ezana's campaign finance dataset, built from Federal Election Commission filings for every sitting member, puts Ossoff's 2026-cycle receipts at $115.9 million across a coverage window from 1 January 2025 to 14 October 2026. That is 6.4% of the $1.81 billion raised by all 538 members tracked, and 19.3% of the $600.9 million raised by sitting senators. The median senator with receipts raised $2.82 million; Ossoff raised 41 times that. Mark Kelly of Arizona, second on the list, raised $47.5 million.",
    },
    {
      type: 'bubble-field',
      figureLabel: 'FIG. 2 · TEN LARGEST ACCOUNTS IN CONGRESS',
      kicker:
        '2026 CYCLE, 1 JAN 2025 TO 14 OCT 2026 · X = RECEIPTS ($M) · Y = CASH ON HAND ($M) · BUBBLE = ITEMIZED INDIVIDUAL CONTRIBUTIONS ($M) · TOP 10 OF 538 SITTING MEMBERS BY RECEIPTS',
      hint: 'Far right is size; height is what was left on 14 October.',
      source:
        "Ezana campaign finance dataset (FEC two-year candidate totals), cycle 2026, pulled 7 Nov 2026. Some committees' coverage ends 30 Sep or 22 Oct 2026.",
      xLabel: 'Receipts, $M',
      yLabel: 'Cash on hand, $M',
      zLabel: 'Itemized individual, $M',
      points: [
        { label: 'Ossoff', x: 115.9, y: 15.13, z: 46.89 },
        { label: 'Kelly', x: 47.54, y: 26.5, z: 17.28 },
        { label: 'Ocasio-Cortez', x: 38.03, y: 17.58, z: 12.88 },
        { label: 'Sanders', x: 26.48, y: 21.69, z: 7.41 },
        { label: 'Johnson', x: 24.58, y: 6.51, z: 9.73 },
        { label: 'S. Collins', x: 22.47, y: 2.69, z: 12.66 },
        { label: 'Booker', x: 21.28, y: 22.9, z: 6.32 },
        { label: 'Warner', x: 20.22, y: 6.22, z: 7.14 },
        { label: 'Husted', x: 19.89, y: 4.24, z: 6.93 },
        { label: 'Jeffries', x: 17.89, y: 4.23, z: 4.54 },
      ],
    },
    {
      type: 'paragraph',
      text: "The figure also shows the cost of that scale. Ossoff had spent $105.8 million, 91% of receipts, by 14 October, leaving $15.1 million in cash, a smaller reserve than Kelly's $26.5 million, Booker's $22.9 million or Sanders's $21.7 million, whose committees spent 45% to 59% of what they raised. In the second quarter of 2026 alone he raised $20 million and held more than $42 million, according to CBS News; Collins raised $2.1 million in the same quarter. The 14 October figure is a pre-general snapshot, and the final weeks of the race land in the post-general report.",
    },
    {
      type: 'paragraph',
      text: "Scale on this order is unusual even for a battleground incumbent. Ossoff's $115.9 million exceeds the combined 2026-cycle receipts of Kelly, Ocasio-Cortez and Sanders, the next three names on the list, at $112.0 million. The gap with his opponent was not a small-dollar campaign against a large-dollar one: Collins's second-quarter haul averaged slightly more than $19 per donation, according to CBS News. The difference was volume, about 474,000 donations against about 16,000 in the same quarter, for a Republican nominee settled only in a June runoff.",
    },

    { type: 'heading', text: 'Three quarters of the sized money came in under $200', level: 2 },
    {
      type: 'paragraph',
      text: "The FEC sorts individual contributions by size. Of the $112.2 million in Ossoff's contributions that the filings break out by size, $84.5 million, or 75.3%, came in [[kw:unitemized-contributions]]amounts under $200[[/kw]]. Contributions of $2,000 and above, the band where maximum-donor networks sit, added $12.3 million across 3,990 contributions, 11.0% of the sized total. His campaign reported more than 474,000 donations in the second quarter alone, nearly 340,000 of them from donors giving less than $200 in total, according to CBS News.",
    },
    {
      type: 'radial-stack',
      figureLabel: 'FIG. 3 · SIX DONOR MIXES',
      kicker:
        'INDIVIDUAL CONTRIBUTIONS BY SIZE BAND, $M, 2026 CYCLE · ONE ARC PER MEMBER, SWEEP SCALED TO THE LARGEST TOTAL · SEGMENTS STACK FROM UNDER $200 OUTWARD TO $2,000 AND ABOVE',
      hint: 'Hover a segment for its band and dollar total.',
      source:
        'Ezana campaign finance dataset (FEC contribution-size buckets), cycle 2026, through 14 Oct 2026 (Husted through 22 Oct). Six largest raisers with size data; Ezana arithmetic for shares.',
      maxAngle: 270,
      categories: [
        {
          label: 'Ossoff',
          segments: [
            { label: 'Under $200', value: 84.51 },
            { label: '$200 to $499', value: 5.07 },
            { label: '$500 to $999', value: 4.84 },
            { label: '$1,000 to $1,999', value: 5.47 },
            { label: '$2,000 and above', value: 12.31 },
          ],
        },
        {
          label: 'Ocasio-Cortez',
          segments: [
            { label: 'Under $200', value: 31.91 },
            { label: '$200 to $499', value: 1.19 },
            { label: '$500 to $999', value: 0.83 },
            { label: '$1,000 to $1,999', value: 0.55 },
            { label: '$2,000 and above', value: 0.34 },
          ],
        },
        {
          label: 'Johnson',
          segments: [
            { label: 'Under $200', value: 11.99 },
            { label: '$200 to $499', value: 0.73 },
            { label: '$500 to $999', value: 0.65 },
            { label: '$1,000 to $1,999', value: 1.38 },
            { label: '$2,000 and above', value: 7.18 },
          ],
        },
        {
          label: 'S. Collins',
          segments: [
            { label: 'Under $200', value: 3.24 },
            { label: '$200 to $499', value: 0.44 },
            { label: '$500 to $999', value: 1.1 },
            { label: '$1,000 to $1,999', value: 2.67 },
            { label: '$2,000 and above', value: 9.4 },
          ],
        },
        {
          label: 'Husted',
          segments: [
            { label: 'Under $200', value: 3.41 },
            { label: '$200 to $499', value: 0.2 },
            { label: '$500 to $999', value: 0.55 },
            { label: '$1,000 to $1,999', value: 1.67 },
            { label: '$2,000 and above', value: 7.62 },
          ],
        },
        {
          label: 'Vindman',
          segments: [
            { label: 'Under $200', value: 9.97 },
            { label: '$200 to $499', value: 0.46 },
            { label: '$500 to $999', value: 0.58 },
            { label: '$1,000 to $1,999', value: 0.79 },
            { label: '$2,000 and above', value: 1.63 },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "Ossoff's mix sits between two models. Ocasio-Cortez, the third-largest raiser in Congress at $38.0 million, took 91.6% of her sized money under $200 and only 1.0% at $2,000 and above. Susan Collins and Jon Husted, the sixth and ninth-largest raisers, drew 55.8% and 56.6% of their sized money from $2,000-plus contributions, and both lost their seats on 3 November, according to Al Jazeera. Speaker Mike Johnson runs a hybrid, 54.7% under $200 and 32.7% at $2,000 and above. A donor mix does not decide an election, but Ossoff's profile sits far closer to the Ocasio-Cortez model than to the large-check senators.",
    },
    {
      type: 'paragraph',
      text: "The under-$200 band is also the least transparent part of any filing. Campaigns do not itemize donors whose cycle total stays below $200, so the dataset carries that money as a single $84.5 million total with no donor count. That is why the 474,000 second-quarter donations come from the campaign's own statement rather than the FEC buckets, while the 3,990 contributions of $2,000 and above are an exact count. For a 2028 read the distinction matters: the dollars are verifiable, the headcount is self-reported.",
    },
    {
      type: 'callout',
      label: 'Ossoff against the median senator',
      value: '41x',
      context:
        "$115.9 million in 2026-cycle receipts against a $2.82 million median for the 98 senators with receipts, per Ezana's campaign finance dataset through 14 October 2026.",
    },

    { type: 'heading', text: 'A California base for a Georgia senator', level: 2 },
    {
      type: 'paragraph',
      text: "The state data turns a Senate race into a national one. California donors gave Ossoff $9.0 million across 92,310 itemized contributions, more than Georgia's $7.9 million across 81,592. New York added $4.4 million, Massachusetts $2.3 million and Washington $1.8 million. Georgia supplied 31.1% of the money from his top five states; the other four, none of them presidential battlegrounds, supplied 68.9%. His California total alone exceeds the entire 2026-cycle receipts of 508 of the 538 members in the dataset.",
    },
    {
      type: 'variable-pie',
      figureLabel: 'FIG. 4 · WHERE THE ITEMIZED MONEY LIVES',
      kicker:
        'TOP FIVE DONOR STATES, 2026 CYCLE · SLICE ANGLE = DOLLARS ($M) · SLICE RADIUS = NUMBER OF ITEMIZED CONTRIBUTIONS (THOUSANDS)',
      hint: 'A wide, long slice is a state with both money and donor depth.',
      source:
        'Ezana campaign finance dataset (FEC itemized receipts by state), cycle 2026, through 14 Oct 2026. Ezana arithmetic for shares.',
      yLabel: 'Dollars, $M',
      zLabel: 'Contributions, thousands',
      slices: [
        { label: 'California', y: 9.01, z: 92.31 },
        { label: 'Georgia', y: 7.89, z: 81.59 },
        { label: 'New York', y: 4.38, z: 40.96 },
        { label: 'Massachusetts', y: 2.31, z: 20.89 },
        { label: 'Washington', y: 1.81, z: 20.93 },
      ],
    },
    {
      type: 'paragraph',
      text: "For a national primary this is the useful part of the map. A donor file already 92,310 contributions deep in California, 40,963 in New York and 20,894 in Massachusetts is an asset few first-time national candidates start with. Federal rules permit transfers between a candidate's own federal campaign committees under FEC conditions, which makes the $15.1 million on hand on 14 October, and whatever survives the post-general report, the most visible portable asset.",
    },
    {
      type: 'cta-callout',
      headline: "Ossoff's full filing, and every other member's",
      body: "Ezana's Campaign Finance Intelligence page carries the same receipts, spending, cash on hand, contribution-size bands and donor-state breakdowns for every member of Congress across the 2022, 2024 and 2026 cycles, with party and chamber comparisons. Open Ossoff's research drawer to see each number in this article at its source row.",
      ctaLabel: 'Open Campaign Finance Intelligence',
      ctaHref: '/datasets/campaignfinancerecords',
      ctaAuthGate: false,
    },

    { type: 'heading', text: 'Where $105.8 million went', level: 2 },
    {
      type: 'paragraph',
      text: 'Spending data shows a campaign built for broadcast. Of the disbursements the itemized records assign a purpose to, advertising is the largest line at $22.0 million across 85 payments, 20.8% of everything the committee spent; fundraising costs added $3.4 million, and refunds to donors, $281,209 across 1,499 payments, are the routine overhead of a donor file this large. Another $13.9 million sits in an "other" category, and the rest of the $105.8 million carries no purpose code in the records the dataset aggregates. Political advertising is a reported revenue line for broadcasters such as Atlanta-based Gray Media (GTN), Nexstar (NXST) and Sinclair (SBGI).',
    },

    { type: 'heading', text: 'The 2028 field as the market sees it', level: 2 },
    {
      type: 'paragraph',
      text: "The market's 2028 board mixes officials with very different data footprints. Ossoff and Ocasio-Cortez sit in Congress, so their fundraising is in Ezana's dataset; Vance, Rubio and Newsom hold executive offices and do not file as congressional candidates, so their money is not comparable here. The prices also come from different contracts: Kalshi's presidency contract for Ossoff, Vance and Rubio, Polymarket's for Newsom, and Kalshi's nomination contract for Ocasio-Cortez. None of the five has formally declared a 2028 candidacy.",
    },
    {
      type: 'dossier-table',
      figureLabel: 'FIG. 5 · FIVE NAMES ON THE 2028 BOARD',
      kicker:
        'MARKET-IMPLIED PRICES, 4 TO 6 NOVEMBER 2026 · CONTRACT NAMED IN EACH ROW · FEC DATA ONLY WHERE THE PERSON IS A SITTING MEMBER OF CONGRESS · CLICK DOSSIER + FOR THE RECORD',
      hint: 'Prices from different venues and contracts are not directly comparable.',
      source:
        'Kalshi post (6 Nov 2026); The Daily Beast (4 Nov 2026); Action Network (4 Nov 2026); Ezana campaign finance dataset, cycle 2026, through 14 Oct 2026.',
      headers: ['Name', 'Current office', 'Market price', 'Key risk', ''],
      rows: [
        {
          name: 'Jon Ossoff',
          tag: 'D-GA',
          role: 'US senator, reelected 3 Nov 2026',
          anchor: '22% · Kalshi presidency',
          keyRisk: 'Part of the 18-point margin belongs to a national wave',
          dossier: [
            {
              label: 'Market',
              text: '22% Kalshi presidency (6 Nov); 24% Kalshi nomination peak (4 Nov).',
            },
            { label: 'Receipts', text: '$115.9M, #1 of 538 members, 2026 cycle through 14 Oct.' },
            {
              label: 'Donor mix',
              text: '75.3% of sized money under $200; 11.0% at $2,000 and above.',
            },
            { label: 'Cash', text: '$15.1M on hand on 14 Oct after $105.8M spent.' },
          ],
        },
        {
          name: 'J.D. Vance',
          tag: 'R',
          role: 'Vice President',
          anchor: '12% · Kalshi presidency',
          keyRisk: 'Ran at 16% on Kalshi two days earlier',
          dossier: [
            {
              label: 'Market',
              text: "12% in Kalshi's 6 Nov post; 16% Kalshi and 15% Polymarket on 4 Nov.",
            },
            {
              label: 'FEC data',
              text: 'Not a member of Congress; no comparable row in the dataset.',
            },
          ],
        },
        {
          name: 'Marco Rubio',
          tag: 'R',
          role: 'Secretary of State',
          anchor: '10% · Kalshi presidency',
          keyRisk: 'Shares a party lane with Vance',
          dossier: [
            { label: 'Market', text: "10% in Kalshi's 6 Nov post; 12% on Kalshi on 4 Nov." },
            {
              label: 'FEC data',
              text: 'Not a member of Congress; no comparable row in the dataset.',
            },
          ],
        },
        {
          name: 'Gavin Newsom',
          tag: 'D-CA',
          role: 'Governor of California',
          anchor: '14% · Polymarket presidency',
          keyRisk: 'Nomination contract down from a 36% peak',
          dossier: [
            {
              label: 'Market',
              text: '14% Polymarket presidency (4 Nov); 13% Kalshi nomination (4 Nov), down from 36%.',
            },
            {
              label: 'FEC data',
              text: 'Not a member of Congress; no comparable row in the dataset.',
            },
          ],
        },
        {
          name: 'Alexandria Ocasio-Cortez',
          tag: 'D-NY',
          role: 'US representative',
          anchor: '14% · Kalshi nomination',
          keyRisk: 'Competes for the same small-dollar donors',
          dossier: [
            { label: 'Market', text: '13% to 14% Kalshi nomination over several weeks to 4 Nov.' },
            { label: 'Receipts', text: '$38.0M, #3 of 538 members, 2026 cycle through 14 Oct.' },
            {
              label: 'Donor mix',
              text: '91.6% of sized money under $200; 1.0% at $2,000 and above.',
            },
            { label: 'Cash', text: '$17.6M on hand on 14 Oct.' },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The table also shows how thin the gaps are. A 22% contract is a minority outcome: at that price the market assigns a 78% chance that someone other than Ossoff wins in 2028. His 10-point lead over Vance on Kalshi's board is the same size as the move Ossoff made in a single week, and Vance's own contract slipped from 16% to 12% over the same two days.",
    },
    {
      type: 'paragraph',
      text: "Prices this far out move on news flow rather than resolution. Newsom's nomination contract fell from 36% to 13% without a single primary vote cast, and Ossoff's rose 11 points on one Senate result. Each point in a contract that settles in November 2028 says as much about attention as about votes, which is why the scenarios at the end of this article tie the price to FEC filings, a record that updates on a fixed calendar, rather than to polling.",
    },

    { type: 'heading', text: 'What the money proves, and what it does not', level: 2 },
    {
      type: 'paragraph',
      text: "Fundraising is evidence of organization, not of votes. The matrix below grades five claims in Ossoff's 2028 case against three tests: whether the FEC record supports the claim, whether the Georgia result supports it, and whether it carries into a national primary. Only one claim, a national small-dollar base, is supported by the filings and plausibly portable, and it meets direct competition from Ocasio-Cortez, whose $38.0 million committee runs the same model at 91.6% small-dollar.",
    },
    {
      type: 'adjudication-matrix',
      figureLabel: 'FIG. 6 · THE 2028 CASE, GRADED',
      kicker:
        'FIVE CLAIMS x THREE TESTS · SAME = SUPPORTED · PART = PARTLY OR CONDITIONALLY SUPPORTED · NONE = NOT TESTED BY THIS EVIDENCE · CLICK ANY CELL FOR THE NOTE',
      hint: 'Click any cell for the evidence behind the grade.',
      source:
        'Ezana editorial grading of Ezana campaign finance dataset rows (cycle 2026, through 14 Oct 2026) and reported results (AP via OPB, The Daily Beast, Al Jazeera, 3 to 4 Nov 2026).',
      cols: ['FEC record, 2026 cycle', 'Georgia result', 'Carries into a 2028 primary'],
      rows: [
        {
          label: 'National small-dollar base',
          cells: [
            { value: 'same', note: '$84.5M, 75.3% of sized money, under $200.' },
            {
              value: 'part',
              note: 'He won by about 18 points, but the result does not isolate donor effects.',
            },
            {
              value: 'part',
              note: 'Portable, but Ocasio-Cortez draws on the same pool at 91.6% small-dollar.',
            },
          ],
        },
        {
          label: 'Reach beyond Georgia',
          cells: [
            {
              value: 'same',
              note: 'California $9.0M exceeds Georgia $7.9M; Georgia is 31.1% of top-five-state money.',
            },
            { value: 'none', note: 'A statewide race does not test out-of-state appeal.' },
            {
              value: 'part',
              note: 'Donor reach is national; voter reach is untested outside Georgia.',
            },
          ],
        },
        {
          label: 'Strength in a Trump state',
          cells: [
            { value: 'none', note: 'Fundraising data measures money, not votes.' },
            { value: 'same', note: 'About 18 points in a state Trump carried in 2024.' },
            {
              value: 'part',
              note: 'Democrats flipped at least seven Senate seats the same night; the wave is shared.',
            },
          ],
        },
        {
          label: 'Spending discipline',
          cells: [
            { value: 'part', note: '91% of receipts spent by 14 Oct; $15.1M left.' },
            { value: 'part', note: 'A large margin, but spending and result cannot be separated.' },
            { value: 'none', note: 'A presidential primary is a different cost structure.' },
          ],
        },
        {
          label: 'Large-donor network',
          cells: [
            {
              value: 'part',
              note: '$12.3M across 3,990 contributions of $2,000 and above, 11.0% of sized money.',
            },
            { value: 'none', note: 'The result does not test donor networks.' },
            {
              value: 'part',
              note: 'Meaningful, but smaller than the small-dollar base by a factor of nearly seven.',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      text: "The weakest link is the election environment. Democrats flipped at least seven Senate seats on 3 November, so part of Ossoff's 18-point margin belongs to the national wave rather than to him, and the dataset has no control group to separate the two. The strongest link is the donor file: $84.5 million in contributions under $200 from a base that reached 92,310 itemized California contributions, a list that can be asked again in a way a margin cannot.",
    },

    { type: 'heading', text: 'The verdict: a price, not a forecast', level: 2 },
    {
      type: 'paragraph',
      text: "The base case is that the post-midterm repricing holds through the first 2027 filings, with Ossoff's presidency contract trading in the 20% to 22% band set between 4 and 6 November. The bear case is that the premium fades as the field forms and the contract drifts back toward the 12% it held on 2 November. The first measurable test is 31 January 2027, when Senate committees file year-end reports with the FEC: a committee that keeps raising at its 2026 pace after winning is building for something beyond the Senate.",
    },
    {
      type: 'scenario-chain',
      figureLabel: 'FIG. 7 · THREE PATHS FOR A 22% CONTRACT',
      kicker:
        'EACH CHAIN RUNS FROM A 2027 SIGNAL TO A MARKET OUTCOME · RANGES ARE OBSERVED KALSHI PRICE LEVELS FROM 2 TO 6 NOVEMBER 2026, NOT EZANA FORECASTS',
      hint: 'Read each chain left to right; the kill switch falsifies the repricing.',
      source:
        'Price levels from Kalshi (6 Nov 2026) and The Daily Beast (4 Nov 2026); fundraising baseline from Ezana campaign finance dataset, cycle 2026. FEC year-end report due 31 Jan 2027.',
      scenarios: [
        {
          id: 'base',
          label: 'BASE CASE · REPRICING HOLDS',
          tone: 'base',
          range: '20% to 22%',
          steps: [
            { label: 'Year-end report keeps the pace', sub: 'receipts continue after the win' },
            { label: 'Donor file stays active', sub: 'small-dollar share near 75%' },
          ],
          result: { value: 'Holds the board', sub: 'front-runner pricing persists' },
        },
        {
          id: 'alt',
          label: 'ALTERNATIVE · FIELD CROWDS IN',
          tone: 'alt',
          range: '12% to 20%',
          steps: [
            { label: 'Rivals rebuild', sub: 'Newsom and Ocasio-Cortez contracts recover' },
            { label: 'Small-dollar pool splits', sub: 'shared donor base' },
          ],
          result: { value: 'Shared lead', sub: 'one of several near the top' },
        },
        {
          id: 'bear',
          label: 'BEAR CASE · POST-MIDTERM PREMIUM FADES',
          tone: 'bear',
          range: 'below 12%',
          steps: [
            { label: 'Fundraising slows', sub: 'Senate committee winds down' },
            { label: 'Wave reassessed', sub: 'margin credited to the national environment' },
          ],
          result: { value: 'Back to the pack', sub: 'pre-election pricing' },
        },
      ],
      killSwitch:
        "If Ossoff's Kalshi 2028 presidency contract closes below 12%, its 2 November level, the post-midterm repricing has fully unwound and the market no longer treats the Georgia result as a national signal.",
    },
    {
      type: 'paragraph',
      text: "Ossoff's 2028 price is a bet on a donor file and a margin, made 731 days before the election. The donor file is verifiable in FEC data: $115.9 million raised, 75.3% of sized money under $200, a California base larger than his Georgia one. The margin is real but shared with a national wave. Between now and the 31 January filings, the contract trades on attention; after them, it trades on whether $115.9 million was the ceiling of a Senate campaign or the floor of a national one. The listed companies most directly tied to this kind of trading are the venues themselves: Robinhood (HOOD) offers Kalshi-listed event contracts, Intercontinental Exchange (ICE) agreed to invest up to $2 billion in Polymarket, and CME Group (CME) and DraftKings (DKNG) have launched event-contract products of their own.",
    },
    {
      type: 'cta-callout',
      headline: 'Watch the 2028 contracts move',
      body: "Ezana's prediction markets dashboard tracks event-contract pricing across Kalshi and Polymarket in eight cards, including movers and price history, so the 12% to 22% move in this article, and whatever comes after the 31 January filings, is visible as it happens.",
      ctaLabel: 'Open Prediction Markets',
      ctaHref: '/datasets/prediction-markets',
      ctaAuthGate: false,
    },
  ],
  globeRail: {
    metric: {
      title: 'OSSOFF · KALSHI 2028 PRESIDENCY (%)',
      data: [
        { x: 0, y: 12 },
        { x: 1, y: 20 },
        { x: 2, y: 22 },
      ],
      startLabel: '2 Nov · ~12%',
      endLabel: '6 Nov · 22%',
      note: "Kalshi presidency contract: about 12% on 2 November (derived), 20% on 4 November (The Daily Beast), 22% in Kalshi's 6 November post.",
    },
    cities: [
      {
        name: 'Atlanta',
        region: 'Georgia',
        country: 'US',
        lat: 33.75,
        lng: -84.39,
        impact:
          'Ossoff won reelection by about 18 points in a state Trump carried in 2024, after raising $115.9 million this cycle, the most of any sitting member of Congress. Georgia donors gave $7.9 million across 81,592 itemized contributions.',
      },
      {
        name: 'Los Angeles',
        region: 'California',
        country: 'US',
        lat: 34.05,
        lng: -118.24,
        impact:
          'California donors gave Ossoff $9.0 million across 92,310 itemized contributions, more than his home state. That California total alone exceeds the full 2026-cycle receipts of 508 of 538 members of Congress.',
      },
      {
        name: 'New York',
        region: 'New York',
        country: 'US',
        lat: 40.71,
        lng: -74.01,
        impact:
          'New York was his third-largest donor state at $4.4 million. It is also home to Kalshi and Polymarket, where his 2028 presidency contract moved from about 12% to 22% in a week.',
      },
      {
        name: 'Boston',
        region: 'Massachusetts',
        country: 'US',
        lat: 42.36,
        lng: -71.06,
        impact:
          'Massachusetts donors added $2.3 million across 20,894 contributions, part of the 68.9% of top-five-state money that came from outside Georgia.',
      },
      {
        name: 'Washington',
        region: 'District of Columbia',
        country: 'US',
        lat: 38.9,
        lng: -77.04,
        impact:
          'Democrats secured at least 54 Senate seats on 3 November. Year-end FEC reports are due 31 January 2027, the first filing test of whether Ossoff keeps raising at his 2026 pace.',
      },
    ],
  },
  author: 'Ezana Finance Editorial',
  tags: ['politics', 'elections', 'prediction-markets', 'campaign-finance', 'markets'],
  meta: {
    sectors: ['Financials', 'Communication Services'],
    industries: ['Financial Exchanges & Data', 'Broadcasting'],
    institutions: [
      'Kalshi',
      'Polymarket',
      'Robinhood',
      'Intercontinental Exchange',
      'CME Group',
      'DraftKings',
      'Gray Media',
      'Nexstar',
      'Sinclair',
    ],
    investors: [],
    government: ['Federal Election Commission', 'US Senate'],
    geos: ['United States'],
    assetClasses: ['Equities', 'Event Contracts'],
    themes: ['Political Money', 'Elections', 'Prediction Markets'],
    datasets: ['Campaign finance', 'Prediction markets'],
    markets: ['Kalshi', 'Polymarket'],
  },
  tickers: ['HOOD', 'ICE', 'CME', 'DKNG', 'GTN', 'NXST', 'SBGI'],
  entities: {
    people: [],
    terms: [],
  },
  readTime: 8,
  publishedAt: '2026-11-07',
  featured: false,
  likes: 0,
  comments: 0,
  reads: 0,
  listMeta: '7 Nov 2026',
};

/**
 * Ezana Echo — article hub data (restored from pre-dashboard Echo + ongoing catalog).
 * Featured / sections / latest feed all read from this single ARTICLES array.
 *
 * Article content can use either:
 *   - A legacy array of plain-text paragraph strings
 *   - contentBlocks: [Block]       (rich, supports headings, charts, callouts, quotes)
 *
 * Block types supported by EchoArticleClient:
 *   - paragraph  → <p>
 *   - heading    → <h2> or <h3> based on level
 *   - callout    → labeled statistic card
 *   - stat-grid  → row of statistic tiles
 *   - chart      → inline SVG chart
 *   - quote      → pull quote with source
 *
 * The renderer prefers contentBlocks when present, falling back to
 * legacy paragraph strings so all existing articles continue to render unchanged.
 *
 * Long-form rich article: best-performing-commodities-iran-war-2026
 * (see ./ezana-echo-article-iran-commodities-2026.js)
 */

import { africaBillionCompaniesArticle } from './ezana-echo-article-africa-billion-companies.js';
import { nvidiaSecondMostValuableArticle } from './ezana-echo-article-nvidia-most-valuable.js';
import { iranWarCommoditiesArticle2026 } from './ezana-echo-article-iran-commodities-2026.js';
import { sectorDominanceArticle } from './ezana-echo-article-sector-dominance.js';
import { fiberOpticArticle } from './ezana-echo-article-fiber-optic.js';
import { hantavirusArticle } from './ezana-echo-article-hantavirus.js';
import { semiconductorArticle } from './ezana-echo-article-semiconductors.js';
import { trumpPortfolio2026 } from './ezana-echo-article-trump-portfolio-2026.js';
import { peterThiel2026 } from './ezana-echo-article-peter-thiel-2026.js';
import { privateCreditMaturityWallArticle2026 } from './ezana-echo-article-private-credit-maturity-wall-2026.js';
import { criticalMineralsArticle2026 } from './ezana-echo-article-critical-minerals-2026.js';
import { ballroomDonorsContracts2026 } from './ezana-echo-article-ballroom-donors-contracts-2026.js';
import { fdaPeptidesBpc157Article2026 } from './ezana-echo-article-fda-peptides-bpc157-2026.js';
import { africaRefiningArticle2026 } from './ezana-echo-article-africa-refining-2026.js';
import { dataConsolidationArticle2026 } from './ezana-echo-article-data-consolidation-2026.js';
import { johnnyMnemonicConsolidation2026 } from './ezana-echo-article-johnny-mnemonic-consolidation-2026.js';
import { tokenizationCollateral2026 } from './ezana-echo-article-tokenization-collateral-2026.js';
import { empireRankings2026 } from './ezana-echo-article-empire-rankings-2026.js';
// Draft catalog (status: 'draft'): registered for parity with curated-seed;
// nothing reads ARTICLES for public rendering.
import { bitcoinInstitutionalHolders2026 } from './ezana-echo-article-bitcoin-institutional-holders-13f-2026.js';
import { stablecoinSettlementLayer2026 } from './ezana-echo-article-stablecoin-settlement-layer-2026.js';
import { cryptoLegislationPredictionMarkets2026 } from './ezana-echo-article-crypto-legislation-prediction-markets-2026.js';
import { gulfSovereignFundsUsEquities2026 } from './ezana-echo-article-gulf-sovereign-funds-us-equities-2026.js';
import { yenCarryTradeUnwind2026 } from './ezana-echo-article-yen-carry-trade-unwind-2026.js';
import { latamCapitalMarketsAfterTheCows2026 } from './ezana-echo-article-latam-capital-markets-after-the-cows-2026.js';
import { midtermTrade2026 } from './ezana-echo-article-midterm-trade-2026.js';
import { tariffWinnersContractLosers2026 } from './ezana-echo-article-tariff-winners-contract-losers-2026.js';
import { centralBankGoldCycle2026 } from './ezana-echo-article-central-bank-gold-cycle-2026.js';
import { datacenterPowerCrunch2026 } from './ezana-echo-article-datacenter-power-crunch-2026.js';

const ARTICLES = [
  johnnyMnemonicConsolidation2026,
  tokenizationCollateral2026,
  empireRankings2026,
  dataConsolidationArticle2026,
  africaRefiningArticle2026,
  fdaPeptidesBpc157Article2026,
  ballroomDonorsContracts2026,
  criticalMineralsArticle2026,
  peterThiel2026,
  trumpPortfolio2026,
  nvidiaSecondMostValuableArticle,
  sectorDominanceArticle,
  iranWarCommoditiesArticle2026,
  africaBillionCompaniesArticle,
  fiberOpticArticle,
  hantavirusArticle,
  semiconductorArticle,
  privateCreditMaturityWallArticle2026,
  // Drafts (invisible until status flips to published):
  bitcoinInstitutionalHolders2026,
  stablecoinSettlementLayer2026,
  cryptoLegislationPredictionMarkets2026,
  gulfSovereignFundsUsEquities2026,
  yenCarryTradeUnwind2026,
  latamCapitalMarketsAfterTheCows2026,
  midtermTrade2026,
  tariffWinnersContractLosers2026,
  centralBankGoldCycle2026,
  datacenterPowerCrunch2026,
];

/** Article-of-the-Month history — index 0 is the CURRENT month. The Echo home
 *  banner renders index 0 by default and offers previous months in a dropdown.
 *  When a new AOTM is crowned: prepend it here AND move the `articleOfMonth`
 *  flag to its article file (flag = fallback if this list ever fails to resolve). */
export const AOTM_HISTORY = [
  { month: 'August 2026', articleId: 'johnny-mnemonic-tech-consolidation-2026' },
  { month: 'July 2026', articleId: 'ballroom-donors-federal-contracts-2026' },
];

export const ECHO_TRENDING = {
  mostRead: [
    {
      title: 'What Johnny Mnemonic Saw Coming: Tech’s $649B Consolidation Wave',
      reads: 6100,
      id: 'johnny-mnemonic-tech-consolidation-2026',
    },
    {
      title: 'Five Centuries of Empire Rankings: Who Ran the World From 1500 to 2026',
      reads: 3900,
      id: 'empire-rankings-1500-2026',
    },
    {
      title: 'The Cow Is the Collateral: The $16 Trillion Tokenization Trade',
      reads: 4700,
      id: 'tokenization-collateral-2026',
    },
    {
      title: 'Who Controls the World’s Critical Minerals',
      reads: 7300,
      id: 'critical-minerals-reserve-concentration-2026',
    },
    {
      title: "Peter Thiel's Worldview, Decoded",
      reads: 11200,
      id: 'peter-thiel-worldview-2026',
    },
    {
      title: "Inside Trump's Q1 2026 Trading Blitz",
      reads: 9800,
      id: 'trump-portfolio-q1-2026',
    },
    {
      title: "Nvidia Is the World's Second Most Valuable Asset",
      reads: 15200,
      id: 'nvidia-worlds-second-most-valuable-asset-2026',
    },
    {
      title: "Tech Reigns, But Falls Short of History's Heavyweights",
      reads: 12400,
      id: 'dominating-us-stock-market-sectors-through-the-times',
    },
    {
      title: 'Fiber Optic Cable: Alotta Money In This Stuff',
      reads: 5840,
      id: 'fiber-optic-cable-ai-boom-benny-fazio',
    },
    {
      title: 'Best Performing Commodities During the Iran Conflict',
      reads: 8900,
      id: 'best-performing-commodities-iran-war-2026',
    },
    {
      title: 'Africa Has at Least 345 Companies with Revenues of $1B or More',
      reads: 4200,
      id: 'africa-billion-dollar-companies-2026',
    },
  ],
  mostDiscussed: [
    {
      title: 'What Johnny Mnemonic Saw Coming: Tech’s $649B Consolidation Wave',
      comments: 37,
      id: 'johnny-mnemonic-tech-consolidation-2026',
    },
    {
      title: 'The Cow Is the Collateral: The $16 Trillion Tokenization Trade',
      comments: 29,
      id: 'tokenization-collateral-2026',
    },
    {
      title: 'Fiber Optic Cable: Alotta Money In This Stuff',
      comments: 64,
      id: 'fiber-optic-cable-ai-boom-benny-fazio',
    },
    {
      title: "Tech Reigns, But Falls Short of History's Heavyweights",
      comments: 42,
      id: 'dominating-us-stock-market-sectors-through-the-times',
    },
  ],
  bookmarks: [
    {
      title: "Nvidia Is the World's Second Most Valuable Asset",
      id: 'nvidia-worlds-second-most-valuable-asset-2026',
    },
    {
      title: 'Best Performing Commodities During the Iran Conflict',
      id: 'best-performing-commodities-iran-war-2026',
    },
    {
      title: 'Fiber Optic Cable: Alotta Money In This Stuff',
      id: 'fiber-optic-cable-ai-boom-benny-fazio',
    },
  ],
};

/** @type {Record<string, { id: string; author: { name: string; initials: string; id?: string }; content: string; createdAt: string }[]>} */
export const ECHO_MOCK_COMMENTS_BY_ARTICLE = {
  'empire-rankings-1500-2026': [
    {
      id: 'c-empire-1',
      author: { name: 'Alexei Novak', initials: 'AN' },
      content:
        'The sequence framing is what makes this more than a history lesson. "Reserve status arrives last and decays last" reframes the whole dollar debate — the 58% share isn\'t strength, it\'s the last overhang to erode, exactly like sterling into the 1950s. The kill switch at 45% COFER is the right number to actually watch.',
      createdAt: '2026-08-05T14:05:00Z',
    },
    {
      id: 'c-empire-2',
      author: { name: 'Priya Raghunathan', initials: 'PR' },
      content:
        'Appreciate that the PPP-vs-nominal ambiguity is stated outright instead of quietly picking whichever number flatters the argument. China at ~19% (PPP) vs the US at ~26% (nominal) is the entire "who\'s ahead" debate, and the piece lets the basis choice decide the cell rather than pretending there\'s one answer.',
      createdAt: '2026-08-05T16:40:00Z',
    },
    {
      id: 'c-empire-3',
      author: { name: 'Tomás Herrera', initials: 'TH' },
      content:
        "The Soviet row is the most useful part for me — output alone never converted because the middle steps (convertible currency, open capital market, financial center) were simply missing. That's the real question hanging over China, and the article is honest that no prior challenger cleared it without capital-account convertibility.",
      createdAt: '2026-08-06T09:15:00Z',
    },
  ],
  'tokenization-collateral-2026': [
    {
      id: 'c-tok-1',
      author: { name: 'Lucas Ferreira', initials: 'LF' },
      content:
        'The enforceability point is the one everyone waves away. A token is a clean record of a lien; it is not a court order. The Paraná deal only works because the sensor feed plus B3 registration make the cow seizable in practice — most "tokenize the building" pitches have no equivalent, and that gap is exactly where the first collateral blow-up will come from.',
      createdAt: '2026-08-02T15:10:00Z',
    },
    {
      id: 'c-tok-2',
      author: { name: 'Hana Kim', initials: 'HK' },
      content:
        'Inverting the RWA pitch to "watch the venue, not the asset" is the correct read. The tokenized treasuries were never the trade — the fee-earning issuers and the lending/trading venues charging basis points are. Toll booth, not treasure hunt, and the scarce thing is the license stack.',
      createdAt: '2026-08-02T18:45:00Z',
    },
    {
      id: 'c-tok-3',
      author: { name: 'Sofia Alvarez', initials: 'SA' },
      content:
        'Glad the $33T raw vs $28T bot-adjusted caveat is stated outright instead of quietly using the bigger number. Either way it clears Visa+Mastercard combined, but keeping both figures is what separates this from the usual on-chain-volume hype.',
      createdAt: '2026-08-03T10:20:00Z',
    },
  ],
  'johnny-mnemonic-tech-consolidation-2026': [
    {
      id: 'c-jm-1',
      author: { name: 'Priya Raghunathan', initials: 'PR' },
      content:
        'The four-phase framing is the useful part — everyone knows consolidation happens, but "which categories are entering the consolidation phase now" is the actual tradable question. Security is clearly mid-phase; the data layer (IBM–Confluent) looks earlier.',
      createdAt: '2026-08-02T14:20:00Z',
    },
    {
      id: 'c-jm-2',
      author: { name: 'Marcus Feld', initials: 'MF' },
      content:
        'Reading Jones the dolphin as the fate of the point solution is genuinely good. Best-in-class at one task, funded by a platform, decommissioned the moment that platform consolidates its stack. That is the entire CrowdStrike-vs-platform debate in one image.',
      createdAt: '2026-08-02T16:05:00Z',
    },
    {
      id: 'c-jm-3',
      author: { name: 'Dana Osei', initials: 'DO' },
      content:
        'Appreciate that the Nvidia–Groq line is described as an asset/licensing deal and not an acquisition — most write-ups collapse that distinction and then get the antitrust angle wrong. The "consolidation finds a structure" point is the one to remember.',
      createdAt: '2026-08-03T09:40:00Z',
    },
  ],
  // No seeded comments — the "No one's written in yet" empty state handles this.
  'acquirers-buy-the-pipeline-not-the-model-2026': [],
  'africa-refining-capacity-dangote-inflection-2026': [],
  'fda-peptides-bpc157-compounding-vote-2026': [],
  'critical-minerals-reserve-concentration-2026': [
    {
      id: 'c-minerals-1',
      author: { name: 'Ingrid Solberg', initials: 'IS' },
      content:
        'The reserves-vs-resources distinction up front is what most of these pieces skip. Concentration of *reserves* is the number that actually binds supply, and 83% PGMs in one country is genuinely shocking laid out this way.',
      createdAt: '2026-07-05T13:10:00Z',
    },
    {
      id: 'c-minerals-2',
      author: { name: 'Rafael Mendes', initials: 'RM' },
      content:
        'Glad the rare-earths number is the USGS ~48% and not the 52% infographic everyone keeps reposting. The point that reserves understate China because processing is the real lever is the whole ballgame.',
      createdAt: '2026-07-05T15:35:00Z',
    },
    {
      id: 'c-minerals-3',
      author: { name: 'Wei Tan', initials: 'WT' },
      content:
        'The battery-metals chart makes the additive-not-interchangeable argument better than any paragraph could. You are exposed to DRC, Indonesia, Chile, and China all at once, and you cannot substitute your way out.',
      createdAt: '2026-07-05T18:02:00Z',
    },
  ],
  'peter-thiel-worldview-2026': [
    {
      id: 'c-thiel-1',
      author: { name: 'Elena Vasquez', initials: 'EV' },
      content:
        'Appreciate that this quotes the 2009 essay directly instead of paraphrasing it. The "freedom and democracy" line lands very differently in his own words.',
      createdAt: '2026-06-21T11:15:00Z',
    },
    {
      id: 'c-thiel-2',
      author: { name: 'Tobias Lindqvist', initials: 'TL' },
      content:
        'The "warns of surveillance, builds surveillance" tension is the whole story. PLTR is up on every defense headline and this explains why better than any sell-side note.',
      createdAt: '2026-06-21T14:40:00Z',
    },
    {
      id: 'c-thiel-3',
      author: { name: 'Maya Okonkwo', initials: 'MO' },
      content:
        'Glad the chart is labeled as a share of the named set and not the full roster. Too many writeups would have faked a clean percentage there.',
      createdAt: '2026-06-21T17:05:00Z',
    },
  ],
  'trump-portfolio-q1-2026': [
    {
      id: 'c-trump-1',
      author: { name: 'Dana Whitfield', initials: 'DW' },
      content:
        'The ranges-not-weights point is the part everyone misses. Good to see it called out instead of slapping fake percentages on a pie chart.',
      createdAt: '2026-06-20T13:30:00Z',
    },
    {
      id: 'c-trump-2',
      author: { name: 'Andre Kessler', initials: 'AK' },
      content:
        'Would love a saved screen for the AI-chip basket mentioned here — NVDA/AMD/AVGO/INTC/MU/TXN. The disclosure-lag framing is exactly right.',
      createdAt: '2026-06-20T16:05:00Z',
    },
  ],
  'dominating-us-stock-market-sectors-through-the-times': [
    {
      id: 'c-sector-1',
      author: { name: 'Morgan Ellis', initials: 'ME' },
      content: 'The finance era dominance at 90% is staggering — great visualization.',
      createdAt: '2026-04-20T12:00:00Z',
    },
  ],
  'fiber-optic-cable-ai-boom-benny-fazio': [
    {
      id: 'c-fiber-1',
      author: { name: 'David Kim', initials: 'DK' },
      content:
        'The Benny Fazio opening is legendary. Also, MCF at 4x density is a bigger deal than people realize.',
      createdAt: '2026-05-02T14:00:00Z',
    },
    {
      id: 'c-fiber-2',
      author: { name: 'Lisa Park', initials: 'LP' },
      content:
        "That interactive map is incredible — clicked through every company. Corning profile card is chef's kiss.",
      createdAt: '2026-05-02T16:20:00Z',
    },
  ],
  'best-performing-commodities-iran-war-2026': [
    {
      id: 'c-iran-1',
      author: { name: 'Jordan R.', initials: 'JR' },
      content:
        'Oil price projections seem conservative given the escalation timeline. Great data though.',
      createdAt: '2026-04-15T18:00:00Z',
    },
  ],
  'nvidia-worlds-second-most-valuable-asset-2026': [
    {
      id: 'c-nvda-val-1',
      author: { name: 'Marcus Chen', initials: 'MC' },
      content:
        'The NVDA/GLD ratio as a trade expression is brilliant. Long intelligence, short inertia.',
      createdAt: '2026-05-19T10:00:00Z',
    },
    {
      id: 'c-nvda-val-2',
      author: { name: 'Priya Sharma', initials: 'PS' },
      content:
        'Aramco dropping from #1 to #10 in five years is the single most important chart in macro right now.',
      createdAt: '2026-05-19T12:30:00Z',
    },
    {
      id: 'c-nvda-val-3',
      author: { name: 'David Oyelaran', initials: 'DO' },
      content: 'The $26B R&D spend exceeding AMD entire revenue — that is the moat in one number.',
      createdAt: '2026-05-19T15:45:00Z',
    },
  ],
  'africa-billion-dollar-companies-2026': [
    {
      id: 'c-africa-1',
      author: { name: 'Nneka Okafor', initials: 'NO' },
      content:
        'The 54 foreign-HQ companies stat is the most important number here. That is value extraction in real time.',
      createdAt: '2026-05-19T14:00:00Z',
    },
    {
      id: 'c-africa-2',
      author: { name: 'James Mensah', initials: 'JM' },
      content:
        'Mauritius with 3 companies at 1.3M population is wild. Financial hub effects are real.',
      createdAt: '2026-05-19T16:30:00Z',
    },
  ],
};

export function getAllArticles() {
  return ARTICLES;
}

export function getArticleById(id) {
  return ARTICLES.find((a) => a.id === id) ?? null;
}

export function getFeaturedArticle() {
  return ARTICLES.find((a) => a.featured) ?? ARTICLES[0];
}

export function getArticlesByCategory(category) {
  if (category === 'markets')
    return ARTICLES.filter((a) => a.category === 'markets' && !a.featured);
  if (category === 'companies') return ARTICLES.filter((a) => a.category === 'companies');
  if (category === 'policy') return ARTICLES.filter((a) => a.category === 'policy');
  if (category === 'crypto') return ARTICLES.filter((a) => a.category === 'crypto');
  return [];
}

export function getArticleListForSection(section) {
  const map = {
    marketAnalysis: 'markets',
    companySpotlights: 'companies',
    politicalPolicy: 'policy',
  };
  const cat = map[section];
  return getArticlesByCategory(cat).slice(0, 3);
}

export function getRelatedArticles(category, excludeId, limit = 3) {
  return ARTICLES.filter((a) => a.category === category && a.id !== excludeId).slice(0, limit);
}

export function formatPublishedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPublishedShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

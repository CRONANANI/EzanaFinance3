/**
 * Ezana Echo HOME card photography: one photo per published article, used only
 * by the Echo home hero (Article of the Month) and bento cards. Article pages
 * keep their own heroImage from the article module and are never affected.
 *
 * Every article has a reserved file name, public/images/ezana-echo/<slug>-card.<ext>
 * (about 1600x1000, 16:10), where <ext> is webp, avif, jpg, jpeg or png (first
 * found wins, in that order). One extension only: `x-card.webp.jpg` won't match. Upload a file under that exact name and the card
 * picks it up on the next deploy: the build regenerates
 * src/lib/echo/public-images.json, and an entry is only used once its file is
 * in that manifest. Until then the card falls back to the article's own
 * heroImage, or a text tile if the article has none, so no card ever shows an
 * empty picture box.
 *
 * Only owned, generated, or Unsplash/Pexels License photos. When a photo is
 * chosen, fill in `alt` (plain description) and, for stock photos, `credit`,
 * `source` and `license` as the rights trail.
 */
import PUBLIC_IMAGES from '@/lib/echo/public-images.json';

const PRESENT = new Set(PUBLIC_IMAGES);
const CARD_EXTS = ['webp', 'avif', 'jpg', 'jpeg', 'png'];
const card = (slug) => `/images/ezana-echo/${slug}-card.webp`;

/** The uploaded card file for a slug, in whichever allowed format exists, or null. */
function cardSrc(slug) {
  for (const ext of CARD_EXTS) {
    const p = `/images/ezana-echo/${slug}-card.${ext}`;
    if (PRESENT.has(p)) return p;
  }
  return null;
}

export const HOME_CARD_IMAGES = {
  // The Cow Is the Collateral
  'tokenization-collateral-2026': { src: card('tokenization-collateral-2026'), alt: '' },
  // Tech Reigns, But Falls Short of History's Heavyweights
  'dominating-us-stock-market-sectors-through-the-times': {
    src: card('dominating-us-stock-market-sectors-through-the-times'),
    alt: '',
  },
  // Peter Thiel's Worldview, Decoded
  'peter-thiel-worldview-2026': { src: card('peter-thiel-worldview-2026'), alt: '' },
  // Inside Trump's Q1 2026 Trading Blitz
  'trump-portfolio-q1-2026': { src: card('trump-portfolio-q1-2026'), alt: '' },
  // Best-Performing Commodities Since the Iran War
  'best-performing-commodities-iran-war-2026': {
    src: card('best-performing-commodities-iran-war-2026'),
    alt: '',
  },
  // Fiber Optic Cable: Alotta Money In This Stuff
  'fiber-optic-cable-ai-boom-benny-fazio': {
    src: card('fiber-optic-cable-ai-boom-benny-fazio'),
    alt: '',
  },
  // Ossoff's $115.9 Million Machine
  'ossoff-2028-money-2026': {
    // Supplied photo (Nov 20th): Ossoff speaking at a "United for Georgia"
    // podium. Framed on his face for the small Editors' picks thumbnail. The
    // supplied file was 1024 x 683; it is upscaled 4x with the EDSR
    // super-resolution model (OpenCV dnn_superres), resized to 3072 x 2048
    // with light sharpening, and stored as a quality-90 webp.
    src: card('ossoff-2028-money-2026'),
    alt: 'Jon Ossoff speaking at a United for Georgia podium in front of an American flag.',
    position: '52% 22%',
  },
  // The Biggest M&A Deals of 2026, Checked (original Ezana illustration, Nov 19th)
  'biggest-ma-deals-2026': {
    src: card('biggest-ma-deals-2026'),
    alt: 'Abstract illustration of nine glowing columns of different heights on a dark grid.',
  },
  // Five Outages, One Story? (supplied retro poster illustration, second
  // version, Nov 20th; 3:2, served at 2x for high-density screens).
  // `layout: 'stack'`: the Article of the Month card shows the whole picture
  // with the headline beneath it, so no face is covered by type.
  'tokenized-money-outage-theory-2026': {
    src: card('tokenized-money-outage-theory-2026'),
    alt: 'Retro poster-style illustration of tech, finance and energy leaders over green hills, with a data center, cooling towers, the Capitol dome, a satellite dish and a drone.',
    position: '50% 40%',
    layout: 'stack',
  },
  // Twelve Funds, $12.4 Trillion
  'sovereign-wealth-league-table-2026': {
    src: card('sovereign-wealth-league-table-2026'),
    alt: '',
  },
  // Which Industries Actually Keep the Money?
  'industries-that-actually-make-money-net-margins-2026': {
    src: card('industries-that-actually-make-money-net-margins-2026'),
    alt: '',
  },
  // The AI Stack Is Upside Down
  'the-ai-stack-is-upside-down-what-market-caps-say': {
    src: card('the-ai-stack-is-upside-down-what-market-caps-say'),
    alt: '',
  },
  // Up More Than 200%: Trump's March Moderna Buy
  'moderna-cancer-trial-trump-2026': { src: card('moderna-cancer-trial-trump-2026'), alt: '' },
  // After the Cows
  'latam-capital-markets-after-the-cows-2026': {
    src: card('latam-capital-markets-after-the-cows-2026'),
    alt: '',
  },
  // Tariff Winners, Contract Losers
  'tariff-winners-contract-losers-2026': {
    src: card('tariff-winners-contract-losers-2026'),
    alt: '',
  },
  // The Settlement Layer Nobody Voted On
  'stablecoin-settlement-layer-2026': { src: card('stablecoin-settlement-layer-2026'), alt: '' },
  // Trading the Rulebook
  'crypto-legislation-prediction-markets-2026': {
    src: card('crypto-legislation-prediction-markets-2026'),
    alt: '',
  },
  // The Carry Trade That Moves Everything
  'yen-carry-trade-unwind-2026': { src: card('yen-carry-trade-unwind-2026'), alt: '' },
  // The Datacenter Power Bill
  'datacenter-power-crunch-2026': { src: card('datacenter-power-crunch-2026'), alt: '' },
  // The Midterm Trade
  'midterm-trade-2026': { src: card('midterm-trade-2026'), alt: '' },
  // Central Banks Are Buying
  'central-bank-gold-cycle-2026': { src: card('central-bank-gold-cycle-2026'), alt: '' },
  // Who Actually Holds Bitcoin (the NYSE editorial image, moved here from
  // Five Outages on Nov 20th)
  'bitcoin-institutional-holders-13f-2026': {
    src: card('bitcoin-institutional-holders-13f-2026'),
    alt: 'The New York Stock Exchange facade on Wall Street with American flags between its columns.',
    position: '62% 50%',
  },
  // The Gulf's American Portfolio
  'gulf-sovereign-funds-us-equities-2026': {
    src: card('gulf-sovereign-funds-us-equities-2026'),
    alt: '',
  },
  // Five Centuries of Empire Rankings
  'empire-rankings-1500-2026': { src: card('empire-rankings-1500-2026'), alt: '' },
  // What Johnny Mnemonic Saw Coming
  'johnny-mnemonic-tech-consolidation-2026': {
    src: card('johnny-mnemonic-tech-consolidation-2026'),
    alt: '',
  },
  // They're Not Buying the Model
  'acquirers-buy-the-pipeline-not-the-model-2026': {
    src: card('acquirers-buy-the-pipeline-not-the-model-2026'),
    alt: '',
  },
  // An 8-6 Vote on a Peptide Nobody Can Define
  'fda-peptides-bpc157-compounding-vote-2026': {
    src: card('fda-peptides-bpc157-compounding-vote-2026'),
    alt: '',
  },
  // Ballroom Billions
  'ballroom-donors-federal-contracts-2026': {
    src: card('ballroom-donors-federal-contracts-2026'),
    alt: '',
  },
  // Who Controls the World's Critical Minerals
  'critical-minerals-reserve-concentration-2026': {
    src: card('critical-minerals-reserve-concentration-2026'),
    alt: '',
  },
  // The Silicon Shield
  'silicon-shield-taiwan-semiconductor-dominance': {
    src: card('silicon-shield-taiwan-semiconductor-dominance'),
    alt: '',
  },
  // The $84 Billion Question
  'private-credit-maturity-wall-2026': { src: card('private-credit-maturity-wall-2026'), alt: '' },
  // Africa Has at Least 345 Companies with Revenues of $1 Billion or More
  'africa-billion-dollar-companies-2026': {
    src: card('africa-billion-dollar-companies-2026'),
    alt: '',
  },
  // Africa Stops Exporting Its Crude Raw
  'africa-refining-capacity-dangote-inflection-2026': {
    src: card('africa-refining-capacity-dangote-inflection-2026'),
    alt: '',
  },
  // Hantavirus: From The Four Corners To The Open Sea
  'hantavirus-from-four-corners-to-open-sea': {
    src: card('hantavirus-from-four-corners-to-open-sea'),
    alt: '',
  },
  // Nvidia Is the World's Second Most Valuable Asset
  'nvidia-worlds-second-most-valuable-asset-2026': {
    src: card('nvidia-worlds-second-most-valuable-asset-2026'),
    alt: '',
  },
};

/**
 * Master switch for photography on the Echo home (hero, bento cards and their
 * loading skeletons). On: each story shows its <slug>-card.webp once uploaded,
 * else its article heroImage, else a text tile.
 */
export const HOME_IMAGES_ENABLED = true;

/** True when a home card file for this slug has been uploaded to public/. */
export function hasHomeCardImage(slug) {
  return Boolean(HOME_CARD_IMAGES[slug] && cardSrc(slug));
}

/** The home image for a story: none while disabled, else the uploaded card file, else its own. */
export function withHomeImage(story) {
  if (!story) return story;
  if (!HOME_IMAGES_ENABLED) return { ...story, image: null, imageAlt: '', imagePosition: null };
  if (!hasHomeCardImage(story.id)) return story;
  const img = HOME_CARD_IMAGES[story.id];
  return {
    ...story,
    image: cardSrc(story.id),
    imageAlt: img.alt || '',
    imagePosition: img.position || null,
    imageLayout: img.layout || null,
  };
}

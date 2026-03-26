/** Mock data for Crypto Research — swap for API later */

export const CRYPTO_STATS = [
  { id: 'btc', biClass: 'bi-currency-bitcoin', label: 'Bitcoin', price: '$39,280', change: '▼ -1.92% today', positive: false },
  { id: 'eth', biClass: 'bi-lightning-charge', label: 'Ethereum', price: '$2,840', change: '▲ +0.84% today', positive: true },
  { id: 'mcap', biClass: 'bi-pie-chart', label: 'Total Market Cap', price: '$1.72T', change: '▼ -0.3% today', positive: false },
  { id: 'fg', biClass: 'bi-emoji-smile', label: 'Fear & Greed', price: '72 — Greed', change: '▲ from 65 last week', positive: true },
];

export const CRYPTO_ROWS = [
  { tier: 'top', name: 'Bitcoin (BTC)', price: '$39,280', chg: '-1.92%', pos: false, mcap: '$756B' },
  { tier: 'top', name: 'Ethereum (ETH)', price: '$2,840', chg: '+0.84%', pos: true, mcap: '$342B' },
  { tier: 'top', name: 'Solana (SOL)', price: '$148.50', chg: '+3.20%', pos: true, mcap: '$65B' },
  { tier: 'top', name: 'XRP', price: '$0.62', chg: '+1.10%', pos: true, mcap: '$34B' },
  { tier: 'top', name: 'Cardano (ADA)', price: '$0.45', chg: '-0.60%', pos: false, mcap: '$16B' },
  { tier: 'top', name: 'Polkadot (DOT)', price: '$7.20', chg: '+2.40%', pos: true, mcap: '$10B' },
  { tier: 'top', name: 'Avalanche (AVAX)', price: '$36.80', chg: '+4.10%', pos: true, mcap: '$14B' },
  { tier: 'top', name: 'Chainlink (LINK)', price: '$14.90', chg: '+1.80%', pos: true, mcap: '$8.7B' },
  { tier: 'defi', name: 'Uniswap (UNI)', price: '$9.20', chg: '+1.20%', pos: true, mcap: '$5.5B' },
  { tier: 'l1', name: 'Sui (SUI)', price: '$2.10', chg: '+5.40%', pos: true, mcap: '$2.8B' },
  { tier: 'meme', name: 'PEPE', price: '$0.000012', chg: '+8.20%', pos: true, mcap: '$4.2B' },
  { tier: 'meme', name: 'WIF', price: '$2.85', chg: '-2.10%', pos: false, mcap: '$2.9B' },
];

export const ONCHAIN = {
  btc: [
    { label: 'Active Addresses (24h)', value: '892,340' },
    { label: 'Hash Rate', value: '580 EH/s (ATH)' },
    { label: 'Exchange Outflows', value: '+12,400 BTC' },
  ],
  btcNote: '(accumulation signal)',
  eth: [
    { label: 'Gas Price', value: '28 Gwei (Low)' },
    { label: 'Staked ETH', value: '32.4M (27%)' },
    { label: 'DeFi TVL', value: '$48.2B' },
  ],
  whales: [
    '🐋 3 wallets moved 10K+ BTC',
    '🐋 Coinbase saw $240M outflow',
  ],
};

export const TRENDING_PROJECTS = [
  { rank: 1, name: 'Solana', note: 'Breakpoint conf' },
  { rank: 2, name: 'Chainlink', note: 'CCIP launch' },
  { rank: 3, name: 'Arbitrum', note: 'Airdrop season' },
  { rank: 4, name: 'Sui', note: 'TVL growth +40%' },
  { rank: 5, name: 'Celestia', note: 'Modular narrative' },
];

export const CRYPTO_NEWS = [
  { title: 'Bitcoin ETFs see net inflows after consolidation', source: 'CoinDesk', time: '1h ago' },
  { title: 'Ethereum validators queue lengthens post-upgrade', source: 'The Block', time: '3h ago' },
  { title: 'Solana DEX volume rivals Ethereum for third week', source: 'Decrypt', time: '4h ago' },
  { title: 'Regulatory clarity talks boost altcoin sentiment', source: 'Bloomberg Crypto', time: '6h ago' },
  { title: 'Whale wallets accumulate ahead of halving narrative', source: 'Glassnode', time: '12h ago' },
];

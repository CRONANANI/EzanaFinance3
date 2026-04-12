/**
 * Bronze-tier course content: crypto, betting, commodities, risk tracks.
 * Shape matches buildPlaceholderContent. Educational tone; no fabricated citations.
 */

function q(question, options, correctIndex, explanation) {
  return { question, options, correctIndex, explanation };
}

const mk = (sections, quiz) => ({ sections, quiz });

export default {
  'crypto-basic-1': mk(
    [
      {
        title: 'What cryptocurrency is',
        content:
          'Cryptocurrency is digital money secured by cryptography and typically recorded on a distributed ledger called a blockchain. Unlike bank deposits, there is usually no central issuer that can reverse transactions at will; instead, rules are enforced by protocol and network consensus. Bitcoin pioneered this model: scarce digital units move peer-to-peer without a traditional intermediary, though exchanges and custodians still sit between most users and the network.',
        keyTerms: ['blockchain', 'cryptography', 'consensus'],
      },
      {
        title: 'Decentralization in practice',
        content:
          '“Decentralized” does not mean chaos — it means no single party controls the ledger. Thousands of nodes validate blocks according to fixed rules. Trade-offs include slower upgrades (everyone must agree) and responsibility: if you lose keys, there is no password-reset department. Understanding this helps you evaluate marketing claims that slap “crypto” on centralized products.',
      },
      {
        title: 'Wallets and keys',
        content:
          'A wallet holds cryptographic keys, not “coins” in a physical sense. A public address receives funds; a private key authorizes spending. Anyone with the private key controls the assets. That is why seed phrases must be stored offline and never shared — they can rebuild all keys in a wallet.',
      },
    ],
    [
      q('What is the primary role of cryptography in mainstream cryptocurrencies?', ['Printing money', 'Securing transactions and proving ownership without a central authority', 'Replacing the internet', 'Guaranteeing profits'], 1, 'Cryptography enables secure transfers and key-based ownership in a trust-minimized way.'),
      q('A blockchain is best described as:', ['A single company database', 'A distributed ledger updated by network rules and consensus', 'A type of bank account', 'A government registry'], 1, 'Blockchains are maintained across many participants following protocol rules.'),
      q('If you lose your seed phrase for a non-custodial wallet:', ['The exchange can reset it', 'You may permanently lose access to funds', 'The SEC will recover it', 'Bitcoin Core emails you a backup'], 1, 'Self-custody means you alone control recovery material.'),
      q('Why might “decentralization” be misunderstood in marketing?', ['It always means anonymous', 'Some products use crypto branding but rely on centralized control', 'It means tax-free', 'It bans exchanges'], 1, 'Always read who custody keys and who can freeze or upgrade the system.'),
      q('Peer-to-peer in Bitcoin primarily refers to:', ['Loans between banks', 'Transfers between users without requiring a traditional intermediary in the protocol', 'Free trading', 'Only dark-net use'], 1, 'The protocol allows direct transfers; in practice users often use exchanges.'),
    ],
  ),

  'crypto-basic-2': mk(
    [
      {
        title: 'Bitcoin’s design goals',
        content:
          'Bitcoin aims to be a scarce, censorship-resistant digital asset with a transparent issuance schedule. Supply is capped at 21 million coins; new coins enter as rewards to miners who secure the network. Halving events periodically cut the issuance rate, which is why supply growth slows over time. Volatility remains high because demand shifts faster than the slow-moving supply rules.',
      },
      {
        title: 'Mining and energy',
        content:
          'Mining is the process of expending computational work to propose valid blocks and earn rewards. It ties real-world cost to ledger security: attacking the chain becomes expensive. Critics focus on energy use; supporters note geographic flexibility and increasing use of stranded or renewable energy. Either way, mining is integral to Bitcoin’s proof-of-work security model.',
      },
      {
        title: 'Halving and expectations',
        content:
          'Halvings reduce miner revenue from new coins, which can affect short-term miner economics but do not guarantee price direction. Markets may anticipate halvings months in advance. Students should separate the protocol rule (predictable supply) from speculative narratives (unpredictable demand).',
      },
    ],
    [
      q('Bitcoin’s maximum supply is approximately:', ['Unlimited', '21 million BTC', '100 million BTC', 'Tied to GDP'], 1, 'The cap is a core rule of Bitcoin’s issuance schedule.'),
      q('A halving event refers to:', ['Doubling block size', 'Cutting the block subsidy for new bitcoins', 'Banning mining', 'Switching to proof-of-stake'], 1, 'Halvings reduce new issuance on a fixed schedule.'),
      q('Mining primarily serves to:', ['Print dollars', 'Secure the network and order transactions under proof-of-work', 'Guarantee green energy', 'Eliminate volatility'], 1, 'Miners compete to add blocks and are rewarded for honest work.'),
      q('Why might Bitcoin still be volatile despite a fixed supply cap?', ['The cap changes daily', 'Demand and liquidity fluctuate while supply rules are slow to change', 'The SEC sets the price', 'Coins are printed when needed'], 1, 'Fixed supply does not fix demand shocks.'),
      q('Proof-of-work ties security to:', ['Bank reserves', 'Real computational cost and economic incentives', 'Credit scores', 'Number of tweets'], 1, 'Work makes attacks expensive relative to honest mining.'),
    ],
  ),

  'crypto-basic-3': mk(
    [
      {
        title: 'Ethereum vs Bitcoin',
        content:
          'Ethereum generalizes blockchain into a programmable platform: smart contracts are programs that run when conditions are met, enabling tokens, DeFi protocols, and NFTs. Ether (ETH) pays for computation (“gas”). Bitcoin prioritizes simple, robust money; Ethereum prioritizes flexibility — with added complexity and upgrade coordination.',
      },
      {
        title: 'Gas and smart contracts',
        content:
          'Gas prices fluctuate with network demand. Complex contracts cost more gas. Failed transactions can still consume fees if they run out of gas mid-execution. Users should simulate transactions and set reasonable limits when wallets allow.',
      },
      {
        title: 'dApps',
        content:
          'Decentralized applications combine front-end websites with on-chain logic. Not every “dApp” is fully decentralized — often the UI is hosted traditionally while value settles on-chain. Understanding the split helps you assess trust assumptions.',
      },
    ],
    [
      q('Ether (ETH) is primarily used on Ethereum to:', ['Pay for computation and transaction fees (gas)', 'Replace the U.S. dollar', 'Mine Bitcoin', 'Vote in national elections'], 0, 'ETH pays validators/miners for processing and secures usage.'),
      q('A smart contract is:', ['A legal document filed in court', 'Code that executes on the blockchain when conditions are met', 'A bank loan', 'A password'], 1, 'Smart contracts automate rules transparently on-chain.'),
      q('High gas prices usually indicate:', ['Low demand for block space', 'High demand for block space relative to supply', 'Free transactions', 'ETH is worthless'], 1, 'Users bid for limited space in each block.'),
      q('Which statement is most accurate?', ['Ethereum and Bitcoin have identical goals', 'Ethereum emphasizes programmability; Bitcoin emphasizes simple sound money', 'Neither uses cryptography', 'Both ban tokens'], 1, 'Different design priorities lead to different ecosystems.'),
      q('A failed Ethereum transaction might still cost fees because:', ['Banks charge overdraft', 'Computation was attempted on-chain before failure', 'The SEC approves it', 'Gas is always zero'], 1, 'Used gas pays for work performed up to the failure point.'),
    ],
  ),

  'crypto-basic-4': mk(
    [
      {
        title: 'Exchanges vs wallets',
        content:
          'Centralized exchanges (CEXs) hold crypto on your behalf — convenient, but counterparty risk exists if the exchange is hacked or insolvent. Self-custody wallets put you in control but place recovery burden on you. Many investors use a tiered approach: small hot-wallet balances for activity, hardware wallets for larger long-term holdings.',
      },
      {
        title: 'Hot vs cold storage',
        content:
          'Hot wallets are internet-connected (mobile, browser). Cold wallets (often hardware) keep keys offline. Cold storage reduces remote attack surface but adds friction. For long holding periods, cold storage is standard practice among security-conscious users.',
      },
      {
        title: 'Seed phrases',
        content:
          'A seed phrase (often 12–24 words) derives all keys in an HD wallet. Anyone with the phrase can move funds. Write it on durable media, store offline, and never photograph it in cloud backups. Treat it like a master password to your vault.',
      },
    ],
    [
      q('Custodial exchange storage means:', ['You alone hold private keys', 'The exchange holds keys on your behalf', 'There are no private keys', 'Coins are printed by the Fed'], 1, 'Convenience trades off against trust in the custodian.'),
      q('Cold storage most directly reduces risk from:', ['Inflation only', 'Remote hacking and malware targeting hot wallets', 'Dividend taxes', 'Stock splits'], 1, 'Offline keys are harder to steal over the network.'),
      q('A seed phrase should be:', ['Posted on social media', 'Stored offline and never shared', 'Emailed to support', 'Replaced monthly with a guess'], 1, 'It is sufficient to steal all derived keys.'),
      q('Why might you keep a small balance in a hot wallet?', ['To earn 20% guaranteed yield', 'For spending and dApp interaction while limiting exposure', 'Because cold wallets are illegal', 'To avoid KYC'], 1, 'Layer security: small active stack, larger cold savings.'),
      q('Exchange failure risk is an example of:', ['Smart contract bug only', 'Counterparty / custody risk', 'Mining risk only', 'Dividend risk'], 1, 'You rely on the exchange’s solvency and security.'),
    ],
  ),

  'crypto-basic-5': mk(
    [
      {
        title: 'Price, market cap, volume',
        content:
          'Price is the last trade in a given market. Market cap approximates network value as price times circulating supply — but supply definitions differ (circulating vs fully diluted). Volume measures trading activity in a window; spikes can accompany news or volatility. None of these alone tells you if an asset is fairly valued.',
      },
      {
        title: 'Volatility',
        content:
          'Crypto trades 24/7 with often high volatility. That can help traders and hurt unprepared investors. Position sizing and time horizon matter: short-term noise dominates daily charts; multi-year holders focus on protocol adoption and risk management.',
      },
      {
        title: 'FDV',
        content:
          'Fully diluted valuation assumes all future tokens exist at the current price. It can be much larger than circulating market cap for new projects with large unlock schedules. Compare FDV to roadmap and emissions when evaluating hype.',
      },
    ],
    [
      q('Market capitalization generally equals:', ['Price × weight in S&P', 'Price × relevant supply measure (often circulating)', 'Daily volume', 'Number of Twitter followers'], 1, 'Always check which supply definition a site uses.'),
      q('High 24h volume with a sharp price move suggests:', ['No one cares', 'Meaningful trading interest and liquidity events', 'The asset is delisted', 'Zero volatility'], 1, 'Volume contextualizes moves.'),
      q('FDV can exceed circulating market cap when:', ['There are no more tokens', 'Large future token unlocks exist but are not yet circulating', 'Mining stopped', 'Stocks pay dividends'], 1, 'Dilution schedules matter.'),
      q('Why is 24/7 trading a double-edged sword?', ['Markets never close, so risk and opportunity both compound without nights off', 'Trading is banned on weekends', 'Prices only update monthly', 'Exchanges shut down'], 0, 'Continuous markets react instantly to global news.'),
      q('Spot price alone indicates:', ['Intrinsic value with certainty', 'The latest trade, not necessarily fair value', 'Future regulation', 'Guaranteed yield'], 1, 'Valuation requires context and fundamentals or thesis.'),
    ],
  ),

  'crypto-basic-6': mk(
    [
      {
        title: 'Major categories',
        content:
          'Large-cap tokens often include Bitcoin and Ether as bellwethers. Beyond them, categories include smart-contract platforms, DeFi governance tokens, stablecoins, and infrastructure layers. Each category has different risk drivers: regulatory treatment, technical roadmap, competitive moats, and user adoption.',
      },
      {
        title: 'Stablecoins',
        content:
          'Stablecoins aim to track fiat value — collateralized, algorithmic, or hybrid. They are useful for trading and remittances but carry issuer, reserve, and regulatory risks. Know what backs a stablecoin before treating it like cash.',
      },
      {
        title: 'Research habits',
        content:
          'Read the whitepaper or docs, check open-source activity, and verify claims about partnerships. Be skeptical of guaranteed yields; they often embed hidden leverage or token emissions.',
      },
    ],
    [
      q('Layer-1 platforms generally compete on:', ['Shoe sizes', 'Security, scalability, and developer adoption', 'Postal mail speed', 'Oil reserves'], 1, 'Ecosystem and tech trade-offs define competition.'),
      q('A stablecoin’s primary promise is:', ['Doubling every week', 'Price stability versus a reference asset like USD', 'Free gas forever', 'No blockchain use'], 1, 'Implementation and reserves determine whether it holds that promise.'),
      q('Why treat “guaranteed yield” claims skeptically?', ['Yields are always illegal', 'High yields often come from risky lending, leverage, or token inflation', 'Yield is impossible in crypto', 'Banks forbid it'], 1, 'Understand sources of return and failure modes.'),
      q('Market cap rankings can mislead if:', ['They ignore supply definitions and project stage', 'They always include real estate', 'They update hourly', 'They use euros only'], 0, 'FDV, emissions, and fundamentals matter.'),
      q('Due diligence should include:', ['Only TikTok hype', 'Documentation, team/track record, and tokenomics', 'Random DMs', 'Ignoring risks'], 1, 'Primary sources beat social buzz.'),
    ],
  ),

  'crypto-basic-7': mk(
    [
      {
        title: 'Settlement and intermediaries',
        content:
          'Traditional finance routes payments through banks, clearinghouses, and business-day schedules. Crypto networks can settle peer-to-peer in minutes to hours depending on chain and congestion — but on-ramps (banks, cards) still gate fiat access. Regulatory treatment differs by jurisdiction.',
      },
      {
        title: 'Transparency vs privacy',
        content:
          'Public chains expose transaction history to varying degrees; privacy coins and techniques exist but face regulatory scrutiny. Traditional bank privacy differs from blockchain transparency — each has distinct risks for users and investigators.',
      },
      {
        title: 'Composability',
        content:
          'Open protocols can be combined permissionlessly — a strength (innovation) and a risk (exploit chains across DeFi). Smart users audit approvals and limit token allowances.',
      },
    ],
    [
      q('Compared to typical bank wires, public blockchain transfers:', ['Are always instant and free', 'May settle faster peer-to-peer but face different risks (irreversibility, user error)', 'Require a notary', 'Cannot move internationally'], 1, 'Trade-offs: speed vs irreversible mistakes.'),
      q('Why are blockchain transactions hard to reverse?', ['Banks approve each one', 'Consensus finality and lack of a central undo button', 'They are all private', 'The UN blocks reversals'], 1, 'Immutability is a feature and a responsibility.'),
      q('Composability in DeFi means:', ['Only one app exists', 'Protocols can integrate without manual bilateral deals — with systemic risk if one fails', 'Music NFTs only', 'No smart contracts'], 1, 'Innovation and contagion risk rise together.'),
      q('Fiat on-ramps matter because:', ['They connect traditional banking to crypto networks', 'They eliminate all fees', 'They ban Bitcoin', 'They replace blockchains'], 0, 'Most users still enter via regulated gateways.'),
      q('Public ledger transparency implies:', ['No cryptography', 'Transactions may be traceable by analysts and tools', 'Perfect anonymity by default', 'No wallets'], 1, 'Privacy varies by chain and usage patterns.'),
    ],
  ),

  'crypto-basic-8': mk(
    [
      {
        title: 'Common attack vectors',
        content:
          'Phishing sites mimic real wallets and exchanges to steal credentials or seed phrases. Fake airdrops ask you to sign malicious transactions. Rug pulls drain liquidity from thin pools. Always verify URLs, use hardware wallets for large sums, and be cautious of “too good to be true” returns.',
      },
      {
        title: 'Approvals',
        content:
          'Token approvals let dApps move tokens on your behalf. Unlimited approvals are convenient but dangerous if the contract is malicious or compromised. Revoke approvals periodically using reputable tools and prefer least privilege.',
      },
      {
        title: 'Social engineering',
        content:
          'Support impersonators, fake Discord mods, and “send crypto to verify” scams exploit urgency. Legitimate teams never ask for your seed phrase. When in doubt, stop and verify through official channels.',
      },
    ],
    [
      q('A phishing attack typically tries to:', ['Improve your credit score', 'Steal credentials or trick you into signing malicious transactions', 'Give free hardware wallets', 'Lower network fees'], 1, 'Verify domain names and bookmark official sites.'),
      q('Why are unlimited token approvals risky?', ['They reduce gas', 'A compromised contract could drain approved tokens', 'They are required by law', 'They only affect Bitcoin'], 1, 'Least privilege limits blast radius.'),
      q('A “rug pull” often involves:', ['SEC registration', 'Malicious removal of liquidity or abandonment after hype', 'Dividend reinvestment', 'FDIC insurance'], 1, 'Thin liquidity and anonymous teams increase this risk.'),
      q('If someone asks for your seed phrase to “verify” your account:', ['Send it quickly', 'It is a scam — never share seed phrases', 'Share only half', 'Post publicly'], 1, 'Seeds equal full control; no legitimate support needs them.'),
      q('Best practice for large holdings:', ['Store all on exchange for convenience', 'Use cold storage and careful backups', 'Use one password for everything', 'Trust random airdrop links'], 1, 'Layer security and custody thoughtfully.'),
    ],
  ),

  'betting-basic-1': mk(
    [
      {
        title: 'Prediction markets in one sentence',
        content:
          'Prediction markets let participants trade contracts whose payouts depend on real-world outcomes — aggregating beliefs into prices that approximate probabilities. Liquidity and design matter: thin markets can swing wildly; deep markets often outperform polls for some event types.',
      },
      {
        title: 'Why prices move',
        content:
          'Prices change as traders incorporate new information and as risk-averse participants demand compensation for holding risky positions. A 60-cent price does not mean “60% true” in every model — it reflects marginal trader beliefs plus fees and constraints.',
      },
      {
        title: 'Ezana context',
        content:
          'Platforms like Polymarket have popularized crypto-settled event markets. Always read the resolution rules: ambiguous wording causes disputes. The market price is only as good as the rulebook.',
      },
    ],
    [
      q('A prediction market price can be interpreted as:', ['A guaranteed outcome', 'A market-implied probability blended with fees and risk premia', 'A sports score', 'A bank interest rate'], 1, 'It is informative but not infallible.'),
      q('Liquidity matters because:', ['It only affects colors', 'Thin books mean small trades move prices more', 'It removes all risk', 'It bans retail'], 1, 'Depth reduces slippage and noise.'),
      q('Resolution rules matter because:', ['They define what counts as winning', 'They are irrelevant', 'They are always identical', 'They replace math'], 0, 'Read the contract carefully before trading.'),
      q('Why might prediction markets outperform simple polls?', ['They always bribe voters', 'Participants have financial incentives to be informed', 'They ignore news', 'They sample randomly'], 1, 'Skin in the game can aggregate information.'),
      q('New information tends to:', ['Never affect prices', 'Move prices as traders update beliefs', 'Freeze markets forever', 'Guarantee arbitrage profits'], 1, 'Markets are forward-looking.'),
    ],
  ),

  'betting-basic-2': mk(
    [
      {
        title: 'Decimal odds',
        content:
          'Decimal odds of 3.0 mean a winning one-unit stake returns three units total (profit plus stake). Implied probability is roughly 1/decimal for fair-ish markets before margin — bookmakers embed margin so implied probabilities sum above 100%.',
      },
      {
        title: 'American odds',
        content:
          'Positive American odds (+200) show profit on a $100 stake; negative (-150) shows how much you must stake to win $100. Converting formats is essential when line shopping.',
      },
      {
        title: 'Implied probability',
        content:
          'Implied probability is the break-even win rate needed ignoring fees. Comparing implied probability to your own estimate is the start of value betting — never the end.',
      },
    ],
    [
      q('Decimal odds of 2.5 on a winning bet return:', ['2.5 units total including stake in typical display', 'Exactly 1 unit always', '0 units', 'Stake × 10'], 0, 'Decimal includes stake in the return multiple (check your book’s display).'),
      q('American odds of +300 imply a $100 bet wins how much profit if successful?', ['$30', '$300', '$3', '$100'], 1, '+300 means $300 profit on $100 stake at standard interpretation.'),
      q('Bookmaker margin causes:', ['Implied probabilities to sum above 100%', 'Perfect efficiency with no spread', 'Free money', 'Negative decimals'], 0, 'The overround is how books earn.'),
      q('Implied probability helps you:', ['Guarantee wins', 'Compare market price to your own fair odds', 'Eliminate variance', 'Avoid math'], 1, 'Edge is the gap between belief and price — if you are calibrated.'),
      q('Fractional odds 5/1 profit on a 1-unit stake is:', ['5 units profit', '1 unit', '6 units total always', '0.2 units'], 0, 'Classic fractional shows profit relative to stake.'),
    ],
  ),

  'betting-basic-3': mk(
    [
      {
        title: 'Spreads and moneylines',
        content:
          'Point spreads handicap favorites: covering means beating the spread after the adjustment. Moneylines pick winners outright with odds reflecting strength. Totals (over/under) bet combined scores. Parlays multiply payouts but multiply risk — each leg must win.',
      },
      {
        title: 'House edge',
        content:
          'Sportsbooks embed margin in lines. Beating sports long-run requires finding mispriced lines — not picking winners more often in a naive sense. Bankroll discipline keeps you in the game while signal accumulates.',
      },
      {
        title: 'Variance',
        content:
          'Even positive-expectation bets can lose for long streaks due to variance. Short-term results are noisy; evaluate process over many bets.',
      },
    ],
    [
      q('A favorite “covers the spread” when:', ['They win the game', 'They win after applying the point spread adjustment', 'The game ties always', 'The spread is zero'], 1, 'Spread betting is about margin of victory, not only W/L.'),
      q('A parlay loses if:', ['Any leg loses', 'Any leg wins', 'The first leg loses only', 'Weather is cold'], 0, 'Parlays chain outcomes — variance spikes.'),
      q('The sportsbook’s margin mainly:', ['Guarantees you win', 'Skews lines so implied probabilities include profit for the book', 'Eliminates randomness', 'Sets player salaries'], 1, 'You are paying for market making and risk.'),
      q('Why is “picking winners” alone a weak strategy?', ['Win rate without odds is meaningless', 'Edges live in price vs probability', 'Sports are random', 'Books are illegal'], 1, 'Value is price-relative.'),
      q('Variance means:', ['Results equal expectation every time', 'Short-run outcomes can deviate wildly from expectation', 'Odds never change', 'Kelly is illegal'], 1, 'Even good processes face losing streaks.'),
    ],
  ),

  'betting-basic-4': mk(
    [
      {
        title: 'Getting started safely',
        content:
          'Create an account on a reputable platform, enable two-factor authentication, and fund with amounts you can afford to lose. Read each market’s rules: some markets resolve on specific oracles or sources. Start small while learning order types and fees.',
      },
      {
        title: 'Orders and liquidity',
        content:
          'Limit orders control price; market orders prioritize speed. In thin markets, market orders can slip badly. Watch the order book depth when sizing trades.',
      },
      {
        title: 'Responsible participation',
        content:
          'Treat prediction markets as high-risk entertainment unless you have a verified edge and strict bankroll rules. Seek help if trading causes distress.',
      },
    ],
    [
      q('Before trading a Polymarket-style contract you should:', ['Ignore the rules', 'Read resolution criteria and fee schedule', 'Max leverage always', 'Share your seed phrase'], 1, 'Ambiguous rules cause disputes and losses.'),
      q('Two-factor authentication helps because:', ['It adds a second layer beyond password theft', 'It removes fees', 'It guarantees profits', 'It replaces KYC'], 0, 'Stolen passwords are common; 2FA mitigates.'),
      q('Market orders in illiquid books may:', ['Always fill at mid', 'Execute at worse prices than expected (slippage)', 'Be free', 'Cancel automatically'], 1, 'Depth protects execution quality.'),
      q('You should size positions:', ['With money you can afford to lose', 'With rent money', 'Randomly', 'Based on horoscopes'], 0, 'Prediction markets are risky and can go to zero.'),
      q('Limit orders help traders:', ['Guarantee fills', 'Control execution price at the risk of non-fill', 'Eliminate taxes', 'Remove oracle risk'], 1, 'Price vs certainty trade-off.'),
    ],
  ),

  'betting-basic-5': mk(
    [
      {
        title: 'Crowd wisdom',
        content:
          'Aggregating diverse independent estimates can outperform individual experts under the right conditions — but markets need sufficient participation and incentives. Manipulation and thin liquidity break the magic.',
      },
      {
        title: 'Information incorporation',
        content:
          'Prices should reflect available public information quickly when traders compete. If some participants have private information, markets may be less “fair” in the informational sense.',
      },
      {
        title: 'Limits',
        content:
          'Crowds can herd and panic. Financial markets and prediction markets both suffer bubbles. Use markets as inputs, not oracles of moral truth.',
      },
    ],
    [
      q('The “wisdom of crowds” works best when:', ['Everyone copies one influencer', 'Estimates are diverse and independent', 'No one trades', 'Information is secret to one person'], 1, 'Diversity reduces correlated error.'),
      q('Manipulation can break prediction markets when:', ['Liquidity is deep', 'A trader can move prices with relatively small size', 'Regulators exist', 'There are fees'], 1, 'Thin markets are fragile.'),
      q('Prediction market prices update when:', ['Only once per year', 'Traders incorporate new information', 'Never', 'Only if the SEC posts'], 1, 'Markets are forward-looking mechanisms.'),
      q('Herding can cause:', ['More accurate prices always', 'Bubbles and correlated mistakes', 'Zero volatility', 'Perfect forecasts'], 1, 'Independence assumption fails.'),
      q('A fair market in the economic sense:', ['Means you always win', 'Still can be wrong ex post about outcomes', 'Ignores probabilities', 'Eliminates risk'], 1, 'Good prices ≠ guaranteed truth.'),
    ],
  ),

  'betting-basic-6': mk(
    [
      {
        title: 'Bankroll basics',
        content:
          'Your bankroll is the dedicated trading stake — separate from living expenses. Risking a tiny fraction per bet (often 1–2% or less of bankroll) prevents ruin during losing streaks. Chasing losses with larger bets is a common path to zero.',
      },
      {
        title: 'Kelly criterion (intro)',
        content:
          'Kelly sizing suggests bet size grows with edge and shrinks with odds — but real Kelly requires accurate probability estimates and can be volatile. Many pros use fractional Kelly to reduce variance.',
      },
      {
        title: 'Emotional discipline',
        content:
          'Tilt after losses leads to oversized bets. Pre-commit to rules and take breaks. Track results to see if your edge is real or imagined.',
      },
    ],
    [
      q('Why do professionals avoid betting the rent?', ['Rent is too cheap', 'Ruin risk dominates even with a small edge', 'Landlords forbid it', 'Taxes are zero'], 1, 'Survival first — then edge.'),
      q('Chasing losses typically:', ['Restores EV', 'Increases risk of ruin and emotional decisions', 'Is required', 'Guarantees recovery'], 1, 'Negative expectancy spirals hurt.'),
      q('Fractional Kelly is often used because:', ['Full Kelly assumes perfect probabilities and can be very volatile', 'It is illegal', 'It removes all risk', 'It doubles your bankroll daily'], 0, 'Real-world uncertainty warrants downsizing.'),
      q('A 1% per-bet rule means:', ['Each bet risks ~1% of bankroll (definitions vary)', 'You always win 1%', 'You bet once per year', 'You ignore odds'], 0, 'Common heuristic — adapt to your edge model.'),
      q('Tracking results helps you:', ['Prove you have an edge or discover you do not', 'Win every week', 'Avoid taxes', 'Predict coin flips'], 1, 'Process evaluation beats gut feelings.'),
    ],
  ),

  'commodities-basic-1': mk(
    [
      {
        title: 'What commodities are',
        content:
          'Commodities are fungible physical goods traded in standardized units: energy (oil, gas), metals (gold, copper), agriculture (corn, coffee). Prices balance global supply and demand with storage, transport, and geopolitics layered on top.',
      },
      {
        title: 'Why they matter to portfolios',
        content:
          'Commodities can diversify equity risk and sometimes hedge inflation — but they are volatile and can draw down for years. Role in a portfolio should match your horizon and risk tolerance.',
      },
      {
        title: 'Spot vs futures',
        content:
          'Spot refers to immediate delivery markets; most retail exposure is via futures-based products or ETFs that roll contracts. Rolling introduces nuances like contango that affect returns.',
      },
    ],
    [
      q('Commodities are generally:', ['Identical branded goods', 'Fungible bulk goods with standardized grades', 'Only stocks', 'Tax-exempt always'], 1, 'Standardization enables global markets.'),
      q('Why might commodities diversify stocks?', ['They always move together', 'Drivers differ — supply shocks, weather, geopolitics', 'They are the same asset class', 'They never fall'], 1, 'Correlation is not fixed at 1.'),
      q('Retail investors often gain exposure through:', ['Storing oil in a garage', 'ETFs, funds, or futures products', 'Printing gold', 'Only coins'], 1, 'Physical storage is costly; products abstract it.'),
      q('Geopolitics can move commodity prices because:', ['Supply chains and sanctions affect availability', 'CEOs choose colors', 'Bond yields are fixed', 'Weather stops'], 0, 'Energy and ag markets are politically sensitive.'),
      q('“Fungible” means:', ['Unique art pieces', 'Units are interchangeable within a grade', 'Illiquid', 'Illegal'], 1, 'Standard barrels or bushels trade interchangeably.'),
    ],
  ),

  'commodities-basic-2': mk(
    [
      {
        title: 'Gold',
        content:
          'Gold is a monetary metal and jewelry/industrial input. It often behaves as a crisis and inflation hedge — imperfectly — and pays no coupon, so opportunity cost rises when real rates are high.',
      },
      {
        title: 'Oil',
        content:
          'Crude oil prices hinge on OPEC+ decisions, shale supply, refining constraints, and global demand. Inventory data releases routinely move markets.',
      },
      {
        title: 'Agriculture',
        content:
          'Weather dominates short-run crop prices; disease affects livestock. Seasonal planting and harvest patterns create recurring annual rhythms traders watch.',
      },
    ],
    [
      q('Gold’s lack of coupon means:', ['It always beats stocks', 'Its opportunity cost rises when real interest rates are attractive elsewhere', 'It pays monthly dividends', 'It cannot be stored'], 1, 'Yielding assets compete for capital.'),
      q('Oil inventories often:', ['Have no impact', 'Move prices when they surprise versus expectations', 'Are secret', 'Are fixed by law'], 1, 'Stock levels signal near-term tightness.'),
      q('Weather primarily impacts:', ['Tech stock multiples', 'Agricultural yields and short-run ag prices', 'Bond coupons', 'Forever unchanged oil'], 1, 'Crop stress and yields link to price.'),
      q('OPEC+ coordination can influence oil by:', ['Setting fashion trends', 'Adjusting production targets affecting supply', 'Setting retail gas prices directly in every country', 'Banning futures'], 1, 'Supply policy shifts the global balance.'),
      q('Gold industrial and jewelry demand:', ['Is irrelevant', 'Contributes to baseline physical demand alongside investment flows', 'Sets Fed policy', 'Fixes bitcoin price'], 1, 'Multiple demand channels matter.'),
    ],
  ),

  'commodities-basic-3': mk(
    [
      {
        title: 'Supply and demand',
        content:
          'Commodity prices clear markets where supply meets demand. Supply shocks (hurricanes, wars) can spike prices even without demand changes. Demand shocks (recessions) can crush energy use.',
      },
      {
        title: 'Seasonality',
        content:
          'Agricultural markets show planting and harvest cycles. Natural gas has winter heating demand. Seasonality is a tendency, not a guarantee — exogenous shocks override patterns.',
      },
      {
        title: 'Inventories',
        content:
          'Low inventories amplify price volatility when supply wobbles. High inventories buffer shocks. Analysts track days of supply and stockpiles.',
      },
    ],
    [
      q('A hurricane in the Gulf might:', ['Ignore oil markets', 'Disrupt refining or production, affecting fuel prices', 'Lower all prices', 'Guarantee calm markets'], 1, 'Physical disruptions propagate to prices.'),
      q('Seasonal patterns:', ['Always repeat exactly', 'Provide tendencies that can be overridden by shocks', 'Only apply to stocks', 'Are illegal'], 1, 'Expectations vs surprises.'),
      q('Recessions often reduce commodity demand because:', ['Factories and transport slow', 'Governments ban oil', 'Gold stops trading', 'Weather stops'], 0, 'Industrial activity ties to energy and metals.'),
      q('Inventories buffer prices by:', ['Allowing consumption without immediate production shocks', 'Eliminating speculation', 'Fixing OPEC', 'Setting interest rates'], 0, 'Stocks smooth short mismatches.'),
      q('Demand elasticity varies:', ['Never', 'By commodity — gasoline is inelastic short-run vs luxury goods', 'Only for bitcoin', 'Only weekly'], 1, 'Substitution and necessity matter.'),
    ],
  ),

  'commodities-basic-4': mk(
    [
      {
        title: 'Commodity ETFs',
        content:
          'ETFs like broad commodity funds or single-commodity trackers offer exposure without futures accounts — but returns may differ from spot due to rolling futures, fees, and tax treatment.',
      },
      {
        title: 'ETNs and credit risk',
        content:
          'Exchange-traded notes are unsecured debt of the issuer — if the bank fails, you may lose money unrelated to the commodity. Read the prospectus.',
      },
      {
        title: 'Equity producers',
        content:
          'Buying mining or oil company stocks gives commodity-linked exposure with corporate fundamentals layered in — not a pure commodity play.',
      },
    ],
    [
      q('A futures-based commodity ETF may diverge from spot because:', ['It rolls contracts and pays fees', 'It always matches spot perfectly', 'Spots do not exist', 'ETFs cannot trade'], 0, 'Roll yield and expenses matter.'),
      q('An ETN’s risk includes:', ['Issuer credit risk', 'Only commodity risk', 'No risk', 'Football scores'], 0, 'You are exposed to the note issuer.'),
      q('Buying an oil major’s stock gives:', ['Pure oil spot exposure', 'Equity exposure with company-specific risks', 'A barrel delivery', 'Guaranteed dividends'], 1, 'Stocks ≠ commodities.'),
      q('Expense ratios:', ['Do not matter', 'Drag long-run returns and vary by fund', 'Are always zero', 'Are paid by the Fed'], 1, 'Compare products carefully.'),
      q('Physical gold ETFs hold:', ['Your house deeds', 'Bullion or claims per prospectus — verify', 'Only bitcoin', 'Cash only'], 1, 'Read what backs shares.'),
    ],
  ),

  'commodities-basic-5': mk(
    [
      {
        title: 'OPEC and cartels',
        content:
          'OPEC+ coordinates production targets among major oil exporters. When members comply, prices can stabilize or rise; cheating or political fractures undermine agreements. Sanctions also reroute oil flows.',
      },
      {
        title: 'Strategic reserves',
        content:
          'Countries maintain petroleum reserves to buffer emergencies. Releases can temporarily lower prices but do not fix structural shortages.',
      },
      {
        title: 'Non-OPEC supply',
        content:
          'U.S. shale, Norway, Brazil, and others add non-OPEC supply that responds to price with lags — technology and financing matter.',
      },
    ],
    [
      q('OPEC+ decisions matter because:', ['They influence collective oil supply targets', 'They set your mortgage rate', 'They ban gold', 'They control weather'], 0, 'Supply policy shifts global balances.'),
      q('Cartel cohesion can weaken when:', ['Members cheat on quotas or face domestic budget stress', 'Everyone always complies perfectly', 'Oil is free', 'Demand is zero'], 0, 'Incentives misalign across members.'),
      q('Sanctions can:', ['Shift oil flows between regions and affect prices', 'Have no economic effect', 'Guarantee lower prices always', 'Eliminate futures'], 0, 'Barrels find routes — at a cost.'),
      q('Strategic reserve releases:', ['Guarantee permanently lower prices', 'Can add short-term supply', 'Replace production forever', 'Ban exports'], 1, 'Temporary buffer, not a fix.'),
      q('Shale supply often responds to:', ['Price signals with drilling and financing lags', 'Daily tweets only', 'Moon phases', 'Stock buybacks only'], 0, 'High prices eventually attract capital — with delay.'),
    ],
  ),

  'commodities-basic-6': mk(
    [
      {
        title: 'Correlation over time',
        content:
          'Commodities and equities are not perfectly correlated — correlation rises in some crises when everything sells off (liquidity crunch) and diverges during supply shocks that hurt growth but raise energy prices.',
      },
      {
        title: 'Inflation hedging',
        content:
          'Commodities can help when inflation surprises — but they are volatile and can lag policy responses. Size positions thoughtfully.',
      },
      {
        title: 'Portfolio role',
        content:
          'Think of commodities as a satellite allocation: potential diversification and inflation sensitivity, not a core replacement for diversified equities and bonds for most investors.',
      },
    ],
    [
      q('During a liquidity crisis, many assets may:', ['Always decorrelate', 'Correlate upward as investors raise cash', 'Stop trading forever', 'Guarantee profits'], 1, 'Correlation is not stable in stress.'),
      q('Commodities as an inflation hedge are:', ['Perfect and risk-free', 'Imperfect but sometimes helpful', 'Unrelated to inflation', 'Guaranteed by FDIC'], 1, 'Macro regimes matter.'),
      q('A satellite allocation means:', ['All-in bet', 'Smaller supportive slice around a core portfolio', 'Only bonds', 'Margin-only'], 1, 'Risk budgeting concept.'),
      q('Energy price spikes can:', ['Hurt consumers while benefiting producers', 'Help everyone equally', 'Lower all stock prices always', 'Eliminate inflation'], 0, 'Winners and losers differ.'),
      q('Long-run commodity returns are:', ['Guaranteed above stocks', 'Volatile and cycle-dependent', 'Zero always', 'Equal to cash'], 1, 'Cycles and supercycles dominate narratives.'),
    ],
  ),

  'risk-basic-1': mk(
    [
      {
        title: 'Why risk management matters',
        content:
          'Markets are uncertain; outcomes are path-dependent. Risk management exists so one bad streak does not end your ability to participate. Professionals obsess about survival first, returns second — because without capital, there is no compounding.',
      },
      {
        title: 'Process over prediction',
        content:
          'You cannot control whether the next trade wins; you can control position sizing, entry rules, and how you respond to losses. A repeatable process is the only durable edge for most participants.',
      },
      {
        title: 'Expectancy',
        content:
          'Long-run results approximate average win × win rate minus average loss × loss rate (simplified). Negative expectancy cannot be fixed by doubling down — only by improving the strategy or quitting.',
      },
    ],
    [
      q('The main goal of risk management is often:', ['Win every trade', 'Stay in the game and limit ruin risk', 'Eliminate all losses', 'Predict the future'], 1, 'Survival enables compounding.'),
      q('You control:', ['Tomorrow’s headlines', 'Position size and adherence to rules', 'Other traders’ emotions', 'Fed decisions'], 1, 'Focus on controllable inputs.'),
      q('Doubling down after losses without edge:', ['Always recovers', 'Increases risk of ruin', 'Is required', 'Removes variance'], 1, 'Martingale-like behavior is dangerous.'),
      q('Expectancy depends on:', ['Only win rate', 'The full distribution of wins and losses', 'Luck spells', 'Chart colors'], 1, 'Size of wins/losses matters as much as frequency.'),
      q('A process-based approach means:', ['No rules', 'Documented rules you follow consistently', 'Random entries', 'Ignoring stops'], 1, 'Discipline scales better than hero trades.'),
    ],
  ),

  'risk-basic-2': mk(
    [
      {
        title: 'The 1–2% idea',
        content:
          'A common guideline is to risk only a small fraction of account equity on a single trade — often 1–2% — so a string of losses cannot wipe you out. The exact number should fit your strategy’s win rate and payoff ratio.',
      },
      {
        title: 'Risk per trade vs stop distance',
        content:
          'Position size links stop distance to dollar risk: tighter stops allow larger share counts for the same dollar risk — but tight stops get hunted in noise. Calibrate stops to volatility, not wishful thinking.',
      },
      {
        title: 'Leverage',
        content:
          'Leverage multiplies both gains and losses — and margin calls can force exits at the worst time. Treat leverage as a risk amplifier, not a free tool.',
      },
    ],
    [
      q('Risking 1% per trade means:', ['Each trade risks ~1% of equity (by common definition)', 'You always lose 1%', 'You trade once per year', 'You ignore stops'], 0, 'Definitions vary — write yours down.'),
      q('Wider stops generally require:', ['Smaller position size for the same dollar risk', 'Larger size always', 'No math', 'Higher leverage'], 0, 'Risk = size × per-unit move to stop.'),
      q('Leverage increases:', ['Only upside', 'Both upside and downside variability', 'Certainty', 'Tax refunds'], 1, 'Borrowed money magnifies outcomes.'),
      q('Position sizing should reflect:', ['Your edge quality and volatility', 'Only optimism', 'Round numbers', 'Social media'], 0, 'Match size to strategy stats and market conditions.'),
      q('A losing streak with proper sizing should:', ['Still leave capital to continue if rules were sound', 'Always mean the strategy is wrong immediately', 'Force all-in', 'Ignore review'], 0, 'Evaluate after enough samples.'),
    ],
  ),

  'risk-basic-3': mk(
    [
      {
        title: 'Stop losses',
        content:
          'A stop order exits a position at a market order once a price level trades — it caps loss but can be whipsawed in volatile names. Stops are insurance, not perfection.',
      },
      {
        title: 'Take profits',
        content:
          'Taking profits locks in gains — but cutting winners too early can forfeit trend upside. Some traders scale out: partial profits at targets, runner for trends.',
      },
      {
        title: 'Plan before entry',
        content:
          'Define stop and target logic before you enter — when you are calm. In the trade, emotions argue for moving stops; pre-commitment resists that.',
      },
    ],
    [
      q('A stop-loss order primarily:', ['Guarantees fill at exactly the stop price in all conditions', 'Triggers a market order after the stop level — slippage possible', 'Eliminates gaps', 'Prevents all losses'], 1, 'Gaps can blow through stops.'),
      q('Take-profit rules help by:', ['Removing some emotional exit decisions in advance', 'Guaranteeing maximum gains', 'Banning losses', 'Replacing research'], 0, 'Automation supports discipline.'),
      q('Whipsaw risk means:', ['Stops can exit before a favorable move continues', 'Stops always win', 'No volatility', 'Profits double'], 0, 'Balance stop tightness vs noise.'),
      q('Planning exits before entry reduces:', ['Emotional decision-making mid-trade', 'All risk to zero', 'Need for research', 'Liquidity'], 0, 'Process beats panic.'),
      q('Trailing stops:', ['Move with favorable price to protect gains', 'Never change', 'Only for bonds', 'Guarantee tops'], 0, 'Lock in progress while allowing trend participation.'),
    ],
  ),

  'risk-basic-4': mk(
    [
      {
        title: 'Losses hurt more than gains help',
        content:
          'Loss aversion is well documented: a dollar lost feels worse than a dollar gained feels good. Revenge trading tries to “make it back” immediately — usually enlarging mistakes.',
      },
      {
        title: 'Cooldown routines',
        content:
          'After a loss, step away, journal what happened, and return only when rules are clear. Reducing trade frequency after tilt preserves capital.',
      },
      {
        title: 'Identity',
        content:
          'If your self-worth is tied to each trade’s outcome, variance becomes unbearable. Treat trading as a probabilistic game with bounded risk — not a verdict on your value.',
      },
    ],
    [
      q('Revenge trading usually:', ['Restores discipline', 'Increases size and risk after losses', 'Is encouraged', 'Eliminates emotions'], 1, 'Emotional escalation compounds damage.'),
      q('A trading journal helps because:', ['It forces review of decisions independent of P&L luck', 'It guarantees profits', 'It replaces stops', 'It is optional always'], 0, 'Feedback loops improve process.'),
      q('Loss aversion implies:', ['People feel losses more strongly than equivalent gains', 'People are rational always', 'Gains hurt', 'Risk does not exist'], 0, 'Classic behavioral finding.'),
      q('After a large loss, a healthy step is:', ['Immediately double position', 'Cooldown and review rules before next trade', 'Ignore the loss', 'Blame others only'], 1, 'Break the tilt cycle.'),
      q('Detaching self-worth from each trade:', ['Makes you careless', 'Reduces emotional overreaction to variance', 'Means no rules', 'Bans journaling'], 1, 'Process focus beats ego protection.'),
    ],
  ),
};

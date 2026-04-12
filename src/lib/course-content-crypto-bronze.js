/**
 * Bronze Crypto & Digital — Edelman, The Truth About Crypto (Simon & Schuster, 2022);
 * Leinweber, Willig & Schoenfeld, Mastering Crypto Assets (Wiley, 2023).
 * Paraphrased for education; shape matches buildPlaceholderContent.
 */

// ───────────────────────── crypto · basic ─────────────────────────
const CRYPTO_BRONZE = {
  'crypto-basic-1': {
    sections: [
      {
        title: 'What "cryptocurrency" actually means',
        content:
          'A cryptocurrency is a digital asset whose ownership is recorded on a blockchain — a shared ledger maintained by a distributed network of computers rather than by a single bank or government. Edelman frames the breakthrough simply: for the first time in history, two people who do not know or trust each other can exchange value over the internet without an intermediary verifying the transaction. The "crypto" prefix refers to the cryptography that secures the ledger, not to anything secret or hidden. The term covers thousands of different assets with very different purposes — Bitcoin is one of them, not the whole category.',
        keyTerms: ['blockchain', 'decentralization', 'cryptography', 'digital wallet'],
      },
      {
        title: 'Decentralization in plain language',
        content:
          'A decentralized network has no central operator who can shut it down, change the rules unilaterally, or reverse a transaction. Edelman compares it to email: there is no "email company" — the protocol is open and runs on millions of independent servers. Blockchain networks like Bitcoin and Ethereum work the same way. Thousands of independent nodes around the world each keep a copy of the ledger, and changes are accepted only when most of them agree. This is what gives the system its censorship resistance and its political weight.',
        callout:
          'Edelman: the four most transformative innovations of the modern era — the personal computer, the internet, the smartphone, and now blockchain — each made the previous one more useful.',
      },
      {
        title: 'Wallets, keys, and what you actually own',
        content:
          'A digital wallet is software that holds your private keys — the secret codes that prove you own the coins recorded against your address on the blockchain. The coins themselves are not "in" the wallet; they live on the ledger, and the wallet is just the tool that authorizes transactions. Lose the private key and you lose access to the coins permanently — there is no customer service line to call. Both Edelman and Leinweber et al. emphasize that this self-custody model is the single biggest mental shift for newcomers from traditional finance.',
      },
    ],
    quiz: [
      {
        question: 'What does "decentralized" mean in the context of a blockchain?',
        options: [
          'It is run by a single decentralized company',
          'No single entity controls the network — many independent nodes maintain it together',
          'It only operates in certain countries',
          'It is illegal in the United States',
        ],
        correctIndex: 1,
        explanation:
          'Decentralization means the ledger is maintained by a distributed network of independent participants, not a central authority.',
      },
      {
        question: 'Why does Edelman compare blockchain to email?',
        options: [
          'Both are obsolete technologies',
          'Both are open protocols with no central operator',
          'Both are run by Google',
          'Both require a password to use',
        ],
        correctIndex: 1,
        explanation:
          'Edelman uses email as the analogy for an open, decentralized protocol that anyone can connect to without permission.',
      },
      {
        question: 'When you "own" cryptocurrency, what do you actually possess?',
        options: [
          'Physical coins',
          'A bank account at a crypto company',
          'The private keys that authorize transactions for an address on the blockchain',
          'A printed certificate',
        ],
        correctIndex: 2,
        explanation: 'Coins live on the ledger; ownership is proven by control of the corresponding private key.',
      },
      {
        question: 'What happens if you lose the private key to a self-custodied wallet?',
        options: [
          'You can call customer support to reset it',
          'The coins are typically lost permanently — there is no recovery mechanism',
          'The blockchain automatically refunds you',
          'The keys regenerate after 30 days',
        ],
        correctIndex: 1,
        explanation:
          'Self-custody means there is no central party who can recover access. Losing the key means losing the coins.',
      },
      {
        question: 'The "crypto" in cryptocurrency refers to:',
        options: [
          'Secrecy or hidden activity',
          'Cryptography — the math that secures the ledger',
          'A Greek currency',
          'A type of computer chip',
        ],
        correctIndex: 1,
        explanation:
          'The name comes from the cryptographic techniques used to secure transactions and ownership, not from any notion of secrecy.',
      },
    ],
  },

  'crypto-basic-2': {
    sections: [
      {
        title: 'Where Bitcoin came from',
        content:
          'Bitcoin was introduced in October 2008 in a nine-page whitepaper published under the pseudonym Satoshi Nakamoto, whose real identity remains unknown. The first block of the network — the genesis block — was mined in January 2009, just months after the global financial crisis exposed deep weaknesses in the traditional banking system. Edelman emphasizes the timing: Bitcoin was designed as a response to a system that had just required massive bailouts. The genesis block contains a hidden message referencing a Times of London headline about a second bank bailout, which most readers take as a quiet political statement about why the system was built.',
        keyTerms: ['Satoshi Nakamoto', 'genesis block', 'whitepaper'],
      },
      {
        title: 'The fixed supply of 21 million',
        content:
          'Bitcoin\'s monetary policy is hard-coded into its software: there will only ever be 21 million bitcoins, and new coins enter circulation through a process called mining. This makes Bitcoin the first asset in history with mathematically guaranteed scarcity — no central bank can print more. Leinweber et al. devote an entire chapter to why this digital scarcity is the foundation of any institutional valuation case for Bitcoin. As of 2024, more than 19 million of the 21 million have already been mined; the rest will be released gradually over the next century.',
        callout:
          'The 21 million cap is enforced by every full node on the Bitcoin network. Changing it would require near-unanimous agreement from independent operators around the world, which is widely considered politically impossible.',
      },
      {
        title: 'Mining and the halving',
        content:
          'New bitcoins are awarded to the network participants ("miners") who use computing power to validate blocks of transactions. Roughly every four years, the reward miners receive for each new block is cut in half — an event called the halving. This pre-programmed reduction is what gradually slows the rate of new supply until the cap of 21 million is reached around the year 2140. Edelman highlights the halvings as scheduled supply-shock events that historically have preceded large price moves, though both authors caution that past patterns are not promises about the future.',
      },
    ],
    quiz: [
      {
        question: 'Who created Bitcoin?',
        options: [
          'Vitalik Buterin',
          'A pseudonymous person or group known as Satoshi Nakamoto',
          'The U.S. Treasury',
          'IBM',
        ],
        correctIndex: 1,
        explanation: 'Bitcoin was introduced under the pseudonym Satoshi Nakamoto, whose real identity remains unknown.',
      },
      {
        question: 'What is the maximum supply of Bitcoin?',
        options: ['1 million', '21 million', '100 million', 'Unlimited'],
        correctIndex: 1,
        explanation: 'The Bitcoin protocol caps total issuance at 21 million coins. No more can ever be created.',
      },
      {
        question: 'What is a Bitcoin "halving"?',
        options: [
          'When the price falls by 50%',
          'A pre-scheduled event roughly every four years that cuts the mining reward in half',
          'A government tax',
          'A user dividing one coin in two',
        ],
        correctIndex: 1,
        explanation:
          'The halving is a programmed supply-issuance reduction that gradually slows the rate of new bitcoin creation.',
      },
      {
        question: 'Why do Edelman and others emphasize the timing of Bitcoin\'s 2008-2009 launch?',
        options: [
          'It coincided with a presidential election',
          'It came directly out of the global financial crisis, framing Bitcoin as a response to a fragile banking system',
          'Because computing power was at its peak',
          'It was announced at Davos',
        ],
        correctIndex: 1,
        explanation:
          'The whitepaper appeared during the 2008 crisis and the genesis block referenced a bailout headline — context most observers read as deliberate.',
      },
      {
        question: 'What protects Bitcoin\'s 21 million cap from being changed?',
        options: [
          'A patent',
          'A central authority enforces it',
          'It is enforced by every full node on the network, requiring near-unanimous consensus to alter',
          'A United Nations treaty',
        ],
        correctIndex: 2,
        explanation:
          'Changing the cap would require near-unanimous agreement from independent node operators worldwide — practically impossible.',
      },
    ],
  },

  'crypto-basic-3': {
    sections: [
      {
        title: 'Ethereum is a programmable blockchain',
        content:
          'Where Bitcoin is designed primarily as a peer-to-peer money system, Ethereum is designed as a general-purpose computer running on a blockchain. It was launched in 2015 by a team that included Vitalik Buterin, who proposed extending blockchain technology to support arbitrary programs called smart contracts. Edelman describes Ethereum as the blockchain that turned the technology from a single application (digital cash) into a platform for many applications. The native currency of Ethereum is ether (ETH), which is used both as an asset and as the "fuel" required to execute computations on the network.',
        keyTerms: ['Ethereum', 'smart contract', 'ether (ETH)', 'gas'],
      },
      {
        title: 'What a smart contract actually is',
        content:
          'A smart contract is a piece of code stored on a blockchain that executes automatically when certain conditions are met. The classic example is an escrow: code holds funds and releases them to a seller only when the buyer has confirmed delivery, with no human intermediary required. Leinweber et al. emphasize that smart contracts make finance programmable in a way that traditional finance never has been — lending, trading, insurance, and asset management can all be encoded as software that runs identically for everyone, with no manual processing.',
        callout:
          'Smart contracts are immutable once deployed, which is both their strength (no one can change the rules) and their weakness (a bug in the code cannot be patched without redeploying).',
      },
      {
        title: 'Gas fees and why they exist',
        content:
          'Every action on Ethereum — sending ether, executing a smart contract, minting a token — costs a small fee called "gas." Gas is paid in ether to compensate the network operators (validators) who process the transaction and to prevent spam from clogging the system. When demand for blockspace is high, gas fees rise; when demand is low, they fall. Edelman warns newcomers that surprising gas fees are one of the most common frustrations early users encounter, and that fees on Ethereum can vary by 10x or more between quiet and busy moments.',
      },
    ],
    quiz: [
      {
        question: 'What is the main difference between Bitcoin and Ethereum?',
        options: [
          'Bitcoin is faster than Ethereum',
          'Ethereum is a programmable platform that supports smart contracts; Bitcoin is primarily designed as digital money',
          'Bitcoin is older and therefore more valuable per coin',
          'Ethereum is centralized; Bitcoin is decentralized',
        ],
        correctIndex: 1,
        explanation:
          'Ethereum extended blockchain technology to support general-purpose programs (smart contracts), while Bitcoin remained focused on peer-to-peer value transfer.',
      },
      {
        question: 'What is a smart contract?',
        options: [
          'A legally binding paper agreement signed digitally',
          'Self-executing code stored on a blockchain that runs automatically when conditions are met',
          'A subscription service from a crypto exchange',
          'A type of cryptocurrency',
        ],
        correctIndex: 1,
        explanation:
          'Smart contracts are programs that live on the blockchain and execute deterministically without a human intermediary.',
      },
      {
        question: 'What is "gas" on the Ethereum network?',
        options: [
          'A type of token',
          'The fee paid in ether to compensate validators for processing a transaction or smart contract',
          'A separate cryptocurrency',
          'A backup blockchain',
        ],
        correctIndex: 1,
        explanation: 'Gas is the fee mechanism that pays for computational work and prevents spam.',
      },
      {
        question: 'Once a smart contract is deployed to Ethereum, it is generally:',
        options: [
          'Editable by the developer at any time',
          'Immutable — its code cannot be changed without redeploying a new contract',
          'Automatically updated by the Ethereum Foundation',
          'Deleted after one year',
        ],
        correctIndex: 1,
        explanation: 'Immutability is a key feature of smart contracts — both a strength (trust) and a risk (bugs).',
      },
      {
        question: 'Why do gas fees on Ethereum fluctuate?',
        options: [
          'Because exchanges set them',
          'Because the U.S. government adjusts them',
          'Because they are determined by supply and demand for limited blockspace at any moment',
          'Because they are fixed by Ethereum developers monthly',
        ],
        correctIndex: 2,
        explanation:
          'Gas fees are set by an auction-like market for limited block capacity — high demand means high fees.',
      },
    ],
  },

  'crypto-basic-4': {
    sections: [
      {
        title: 'Exchanges: where most people start',
        content:
          'A crypto exchange is a platform that lets you convert traditional money like dollars or euros into cryptocurrency and vice versa. Edelman notes that most newcomers buy their first crypto on a centralized exchange — Coinbase, Kraken, Binance, and others — because these services handle the complexity of private keys, deposits, and tax reporting. The trade-off is that the exchange holds your coins on your behalf in what is sometimes called a "custodial" account, similar to how a bank holds your dollars. This is convenient, but it means you are trusting the exchange not to fail, get hacked, or freeze your account.',
        keyTerms: ['exchange', 'custodial', 'fiat on-ramp'],
      },
      {
        title: 'Hot wallets vs cold wallets',
        content:
          'A hot wallet is connected to the internet — typically a mobile app or browser extension — and is convenient for everyday use. A cold wallet is a hardware device or paper backup that is kept offline, making it dramatically harder for an attacker to steal. Leinweber et al. recommend a tiered approach for serious holders: keep small spending amounts in a hot wallet, and keep the bulk of holdings in cold storage. Edelman puts it more bluntly: "if you would not carry the cash in your back pocket, do not keep the equivalent crypto on your phone."',
        callout:
          'Hardware wallets like Ledger and Trezor are the most common cold-storage option for retail holders. They typically cost under $200 and isolate the private keys from any internet-connected computer.',
      },
      {
        title: 'Seed phrases — the master backup',
        content:
          'When you set up a self-custody wallet for the first time, the software generates a "seed phrase" — usually 12 or 24 randomly chosen English words. This phrase is the master backup of your private keys. Anyone who has the seed phrase has total control over the wallet, and anyone who loses it has no way to recover access. Both books emphasize that the seed phrase should be written down on paper (or stamped into metal for fire/water resistance), stored in a physically secure location, and never typed into any website, photographed, or stored in cloud services.',
      },
    ],
    quiz: [
      {
        question: 'A "custodial" exchange account means:',
        options: [
          'You hold your own private keys',
          'The exchange holds the coins on your behalf and you trust them not to fail',
          'Only institutions can use it',
          'It cannot be hacked',
        ],
        correctIndex: 1,
        explanation:
          'Custodial accounts mean the exchange controls the keys — convenient, but it introduces counterparty risk.',
      },
      {
        question: 'What is the main difference between a hot wallet and a cold wallet?',
        options: [
          'Hot wallets are physically warmer',
          'Hot wallets are connected to the internet; cold wallets are kept offline',
          'Cold wallets only work in winter',
          'Hot wallets are illegal in some countries',
        ],
        correctIndex: 1,
        explanation:
          'Internet connectivity is the defining difference and the reason cold wallets are more secure against remote attacks.',
      },
      {
        question: 'What is a seed phrase?',
        options: [
          'A password you choose',
          'A 12 or 24-word backup that gives full control of a self-custody wallet',
          'A cryptocurrency name',
          'A type of smart contract',
        ],
        correctIndex: 1,
        explanation:
          'The seed phrase is the master backup — protecting it is the most important security task in self-custody.',
      },
      {
        question: 'Which is the WORST place to store a seed phrase?',
        options: [
          'Stamped into a metal plate in a safe',
          'Written on paper in a locked drawer',
          'Saved as a screenshot in your cloud photo backup',
          'Memorized',
        ],
        correctIndex: 2,
        explanation:
          'Cloud storage is exactly what attackers target. Seed phrases should never be photographed or uploaded to any internet-connected service.',
      },
      {
        question: 'The recommended approach for serious holders is:',
        options: [
          'Keep everything in one hot wallet',
          'Keep everything on a single exchange',
          'A tiered approach: small spending amounts in a hot wallet, the bulk in cold storage',
          'Buy coins and never write down the seed',
        ],
        correctIndex: 2,
        explanation:
          'Both Edelman and Leinweber et al. recommend tiering — convenience for small amounts, cold storage for the rest.',
      },
    ],
  },

  'crypto-basic-5': {
    sections: [
      {
        title: 'Why crypto prices move so much',
        content:
          'Crypto prices are famously volatile — daily moves of 5 to 10 percent are routine, and 30 percent moves in a week are not uncommon. Leinweber et al. attribute this to a combination of factors: the asset class is young and thinly traded compared to global equities, sentiment is amplified by social media, regulatory news can shift the entire market in hours, and there is no central bank to intervene if prices crash. Edelman tells newcomers bluntly that anyone who cannot tolerate a 50 percent drawdown probably should not be holding crypto at all — historically, even the largest assets have experienced drops of that size.',
        keyTerms: ['volatility', 'drawdown', 'liquidity'],
      },
      {
        title: 'Market cap vs fully diluted valuation',
        content:
          'Market capitalization for a cryptocurrency is the current price multiplied by the circulating supply — the coins that exist and trade right now. Fully diluted valuation (FDV) is the price multiplied by the maximum supply that will ever exist. For Bitcoin, the two are close because most of the supply has already been mined. For many newer tokens, the gap is enormous: only a small fraction of the supply may be circulating, and the rest will be released gradually, putting downward pressure on the price as it enters the market. Leinweber et al. warn institutional investors to always check FDV before judging a token as "small."',
        callout:
          'A token with a $100M market cap but a $5B fully diluted valuation has 50x more supply waiting to enter circulation. That dilution risk is invisible if you only look at market cap.',
      },
      {
        title: '24-hour volume and what it tells you',
        content:
          '24-hour volume measures the dollar value of a cryptocurrency that has changed hands in the last day. High volume usually means tighter spreads and easier exits — Edelman notes this is why most retail buyers should stick to assets with substantial daily volume, even if smaller tokens look more exciting. Low volume in a token is a warning sign: it may be hard to sell when you want to, prices may move sharply on small orders, and the published price may not reflect what you would actually receive in a real trade.',
      },
    ],
    quiz: [
      {
        question: 'Crypto prices are generally more volatile than traditional stocks because:',
        options: [
          'The market is young, sentiment is amplified, and there is no central bank to intervene',
          'Exchanges manipulate them daily',
          'They follow the moon\'s phases',
          'They are tied to oil prices',
        ],
        correctIndex: 0,
        explanation:
          'Volatility comes from the relative youth of the asset class, sentiment-driven trading, and the absence of a stabilizing central authority.',
      },
      {
        question: 'What is the difference between market cap and fully diluted valuation?',
        options: [
          'They are the same thing',
          'Market cap uses circulating supply; FDV uses the maximum supply that will ever exist',
          'FDV applies only to Bitcoin',
          'Market cap is in dollars, FDV is in coins',
        ],
        correctIndex: 1,
        explanation:
          'FDV captures all future dilution from supply that has not yet been released. The gap between the two is a hidden risk for many newer tokens.',
      },
      {
        question: 'A token with high 24-hour volume tends to have:',
        options: [
          'Wider spreads',
          'Tighter spreads and easier exits',
          'Lower volatility guaranteed',
          'Higher fees',
        ],
        correctIndex: 1,
        explanation:
          'Higher volume usually means more buyers and sellers competing, which tightens spreads and makes large orders easier to execute.',
      },
      {
        question: 'Why does low 24-hour volume in a token concern serious investors?',
        options: [
          'It guarantees the token will fail',
          'It can mean prices move sharply on small orders and selling becomes difficult',
          'It means the token is overvalued',
          'It is irrelevant',
        ],
        correctIndex: 1,
        explanation:
          'Low liquidity makes both entry and exit harder and amplifies the impact of any single order on the price.',
      },
      {
        question: 'According to Edelman, anyone who cannot tolerate a 50% drawdown:',
        options: [
          'Should buy more aggressively',
          'Should probably not hold crypto',
          'Should only buy on Mondays',
          'Should use only hot wallets',
        ],
        correctIndex: 1,
        explanation:
          'Edelman is blunt: drawdowns of that size have happened repeatedly even to the largest assets, so emotional capacity for them is a prerequisite.',
      },
    ],
  },

  'crypto-basic-6': {
    sections: [
      {
        title: 'A simple way to think about thousands of coins',
        content:
          'There are tens of thousands of cryptocurrencies in existence, but the vast majority of value and activity is concentrated in a small number of major assets. Leinweber et al. propose a taxonomy that groups them by purpose rather than by name: monetary assets like Bitcoin (designed primarily as a store of value), smart-contract platforms like Ethereum and Solana (designed to host applications), stablecoins like USDC and USDT (designed to hold a constant dollar value), and utility tokens that grant access to specific services. Newcomers often get overwhelmed by the sheer number of coins; a useful first step is to understand which bucket each one belongs to.',
        keyTerms: ['monetary asset', 'smart-contract platform', 'stablecoin', 'utility token'],
      },
      {
        title: 'Stablecoins: the dollar on a blockchain',
        content:
          'Stablecoins are cryptocurrencies designed to maintain a constant value against a reference asset — almost always the U.S. dollar. The two largest are USDT (Tether) and USDC (USD Coin), each backed by reserves the issuer claims to hold one-for-one against the coins in circulation. Edelman emphasizes that stablecoins are the practical bridge between traditional finance and crypto: they let users move dollar-equivalent value at any hour, settle on-chain in minutes, and avoid the volatility of holding bitcoin or ether for short-term needs. The risk is the issuer itself — if the reserves are not what they claim, the peg can fail.',
        callout:
          'In May 2022, the algorithmic stablecoin TerraUSD lost its dollar peg and collapsed within days, wiping out tens of billions in value. Both authors use this episode as a warning that not all "stable" coins are actually stable.',
      },
      {
        title: 'Beyond Bitcoin and Ethereum',
        content:
          'After Bitcoin and Ethereum, the most prominent assets typically include Solana (a fast smart-contract platform), Cardano and Avalanche (alternative platforms with different design trade-offs), Chainlink (a network providing real-world data to smart contracts), and various exchange tokens like BNB. Leinweber et al. caution that the rankings shift constantly — coins that dominated the top 20 in 2017 are largely gone today — and that long-term institutional investors typically focus their attention on Bitcoin and Ethereum, treating smaller assets as higher-risk satellite positions rather than core holdings.',
      },
    ],
    quiz: [
      {
        question: 'What is a useful way to categorize the thousands of cryptocurrencies?',
        options: [
          'Alphabetically',
          'By taxonomy of purpose: monetary assets, smart-contract platforms, stablecoins, utility tokens',
          'By color of logo',
          'By age of the founder',
        ],
        correctIndex: 1,
        explanation:
          'Leinweber et al. propose grouping by what each asset is designed to do, which is more useful than memorizing names.',
      },
      {
        question: 'What is a stablecoin designed to do?',
        options: [
          'Pay the highest interest in crypto',
          'Maintain a constant value against a reference asset (usually the U.S. dollar)',
          'Replace Bitcoin',
          'Run smart contracts',
        ],
        correctIndex: 1,
        explanation:
          'Stablecoins peg their value to a reference asset, almost always the dollar, to provide on-chain price stability.',
      },
      {
        question: 'What is the main risk of holding a fiat-backed stablecoin?',
        options: [
          'It cannot be transferred',
          'The issuer may not actually hold the reserves it claims, causing the peg to fail',
          'It is taxed at 100%',
          'It only works on weekends',
        ],
        correctIndex: 1,
        explanation:
          'The peg depends on the issuer\'s reserves. If those reserves are missing or insufficient, the stablecoin can break its peg.',
      },
      {
        question: 'The TerraUSD collapse in May 2022 is cited as a warning that:',
        options: [
          'All crypto is fraudulent',
          'Not every coin labeled "stable" is actually stable, especially algorithmic ones',
          'Stablecoins do not exist',
          'Only Bitcoin is real',
        ],
        correctIndex: 1,
        explanation:
          'TerraUSD was an algorithmic stablecoin that lost its peg and collapsed, demonstrating that the "stable" label is not a guarantee.',
      },
      {
        question: 'How do institutional investors typically treat smaller cryptocurrencies relative to Bitcoin and Ethereum?',
        options: [
          'As the core of every portfolio',
          'As higher-risk satellite positions, with most attention concentrated on BTC and ETH',
          'They avoid Bitcoin and Ethereum entirely',
          'Equal-weighted across all coins',
        ],
        correctIndex: 1,
        explanation:
          'Leinweber et al. note that institutional allocators typically anchor in BTC and ETH and treat smaller assets as a smaller risk-on satellite.',
      },
    ],
  },

  'crypto-basic-7': {
    sections: [
      {
        title: 'Three structural differences',
        content:
          'Leinweber et al. lay out the comparison cleanly. First, traditional finance settles slowly — equity trades take two business days to clear, international wires take days, and markets close on nights and weekends; crypto settles in minutes and never closes. Second, traditional finance is intermediated — banks, brokers, custodians, and clearinghouses all sit between you and the asset; crypto can be peer-to-peer with no intermediary at all. Third, traditional finance is permissioned — opening an account requires identification and approval; most crypto wallets can be created instantly by anyone with an internet connection.',
        keyTerms: ['settlement', 'intermediation', 'permissionless'],
      },
      {
        title: 'What crypto gains and what it gives up',
        content:
          'The advantages of crypto over the traditional system are speed, openness, and programmability. The disadvantages are equally real: volatility is much higher, legal recourse is much weaker, the user experience is harder, and self-custody puts the burden of security entirely on the holder. Edelman frames it as a trade-off rather than a contest — crypto is not better or worse, it is structurally different, and the right amount of it for any individual depends on what they are trying to accomplish. Most institutional allocators today recommend a small percentage allocation rather than a wholesale replacement.',
        callout:
          'When a bank reverses a fraudulent charge on your credit card, that reversal exists because banks are intermediaries with the power to undo transactions. On a blockchain, transactions are final by design — that is a feature for some uses and a serious limitation for others.',
      },
      {
        title: 'The regulatory question',
        content:
          'Crypto operates in a regulatory environment that is still being written. Edelman walks through the landscape: the SEC has taken positions on which tokens it considers securities, the IRS treats crypto as property for tax purposes, FinCEN imposes anti-money-laundering rules on exchanges, and individual states have their own rules. Leinweber et al. emphasize that for institutional investors, regulatory clarity is the single biggest unresolved variable, and progress on it has been the largest factor enabling broader adoption. This regulatory uncertainty is one of the structural differences from traditional finance, where rules are mature and stable.',
      },
    ],
    quiz: [
      {
        question: 'How quickly do crypto transactions typically settle compared to traditional equity trades?',
        options: [
          'Slower — several weeks',
          'About the same — two days',
          'Much faster — minutes vs. two business days for equities',
          'Crypto does not settle',
        ],
        correctIndex: 2,
        explanation:
          'Crypto settles on-chain in minutes; U.S. equity trades historically took two business days (now T+1).',
      },
      {
        question: 'What does "permissionless" mean in the context of crypto?',
        options: [
          'Anyone can create a wallet and transact without approval',
          'Transactions are illegal',
          'Only the rich can use it',
          'You need a license to hold any',
        ],
        correctIndex: 0,
        explanation:
          'Permissionless means there is no gatekeeper deciding who can participate — anyone with internet access can create a wallet.',
      },
      {
        question: 'A key disadvantage of crypto vs. traditional finance is:',
        options: [
          'Slower settlement',
          'More legal recourse if something goes wrong',
          'Weaker consumer protection and the burden of self-custody on the holder',
          'Lower volatility',
        ],
        correctIndex: 2,
        explanation:
          'Crypto users typically have less recourse if they lose access or are defrauded, and bear the security burden themselves.',
      },
      {
        question: 'Why is regulatory clarity so important for institutional crypto adoption?',
        options: [
          'Regulators set the price',
          'Institutions need to know how assets will be classified, taxed, and overseen before allocating large sums',
          'Regulators store the coins',
          'It is required by gravity',
        ],
        correctIndex: 1,
        explanation:
          'Institutional allocators have fiduciary and compliance obligations that require predictable rules about classification, tax treatment, and oversight.',
      },
      {
        question: 'A blockchain transaction, once confirmed, is generally:',
        options: [
          'Easily reversible by calling the network operator',
          'Final by design — there is no central party who can undo it',
          'Reversible within 30 days',
          'Subject to FDIC insurance',
        ],
        correctIndex: 1,
        explanation:
          'Finality is a core property of blockchains; it is a feature for some uses and a real risk for users who make mistakes.',
      },
    ],
  },

  'crypto-basic-8': {
    sections: [
      {
        title: 'The threats that matter most',
        content:
          'Most crypto losses do not come from technical attacks on blockchains themselves — those are extremely rare. They come from attacks on users: phishing emails impersonating exchanges, fake support agents on social media, malicious browser extensions, and clipboard hijackers that swap a copied wallet address for the attacker\'s. Edelman devotes substantial space to these because they are by far the most common cause of loss for retail users. The pattern is consistent: an attacker tricks the user into voluntarily handing over a seed phrase, signing a malicious transaction, or sending funds to the wrong address.',
        keyTerms: ['phishing', 'social engineering', 'address poisoning'],
      },
      {
        title: 'Rug pulls and exit scams',
        content:
          'A "rug pull" is a fraud in which the founders of a token launch the project, attract investor money, and then abruptly drain the liquidity and disappear. Leinweber et al. document several patterns common to rug pulls: anonymous teams, promises of guaranteed returns, heavy marketing through influencers, and contracts that give the developers special privileges to mint or move tokens. The defense is simple but unglamorous — only invest in projects with public, named teams; check whether contracts have been audited by reputable firms; and treat any promise of guaranteed returns as a scam regardless of how legitimate the surrounding presentation looks.',
        callout:
          'Both authors give the same single best rule: if an offer sounds too good to be true, it is a scam. Crypto is not magic — there is no risk-free way to earn 50 percent per year, and anyone selling that story is selling something else.',
      },
      {
        title: 'Practical security checklist',
        content:
          'Edelman\'s practical checklist for retail holders covers a small number of habits that prevent the vast majority of losses: use a hardware wallet for any meaningful amount, never share or photograph the seed phrase, double-check the first and last few characters of any address before sending, type exchange URLs manually rather than following links from emails, and treat unsolicited messages — even from people who seem to know you — as the most likely vector for attack. None of these are technically complex; the failure mode is almost always psychological pressure, urgency, or distraction at the moment of the attack.',
      },
    ],
    quiz: [
      {
        question: 'Most crypto losses for retail users come from:',
        options: [
          'Direct attacks on blockchain protocols',
          'Phishing, social engineering, and tricks that get users to voluntarily hand over keys or sign malicious transactions',
          'The IRS',
          'Exchange hardware failures',
        ],
        correctIndex: 1,
        explanation:
          'Edelman emphasizes that user-facing attacks vastly outnumber technical exploits of the underlying protocols.',
      },
      {
        question: 'What is a "rug pull"?',
        options: [
          'A type of trading order',
          'A fraud where founders launch a token, collect money, and drain the liquidity',
          'A new consensus mechanism',
          'A regulatory action',
        ],
        correctIndex: 1,
        explanation:
          'Rug pulls involve developers abruptly disappearing with investor funds after artificial marketing-driven hype.',
      },
      {
        question: 'Which is a red flag commonly associated with rug pulls?',
        options: [
          'A fully audited smart contract',
          'A public, named, accountable team',
          'Anonymous founders combined with promises of guaranteed returns',
          'Conservative growth projections',
        ],
        correctIndex: 2,
        explanation:
          'Anonymous teams plus guaranteed returns are the textbook combination — both books name them as warning signs.',
      },
      {
        question: 'What is the recommended way to verify a wallet address before sending funds?',
        options: [
          'Trust whatever your clipboard contains',
          'Visually check the first and last few characters of the address against the intended destination',
          'Send a test of half the amount first',
          'Email the recipient and wait for confirmation',
        ],
        correctIndex: 1,
        explanation:
          'Clipboard hijackers can swap a copied address for an attacker\'s, so verifying the first and last characters defeats this attack.',
      },
      {
        question: 'According to both Edelman and Leinweber et al., the single best rule of thumb against scams is:',
        options: [
          'If the website is colorful, it is legitimate',
          'If an offer sounds too good to be true, it is a scam',
          'Trust messages from people who know your name',
          'Always click links in unsolicited emails',
        ],
        correctIndex: 1,
        explanation:
          'There is no risk-free way to earn dramatic returns. Both authors give the same blunt heuristic: too good to be true means it is fake.',
      },
    ],
  },
};

export default CRYPTO_BRONZE;

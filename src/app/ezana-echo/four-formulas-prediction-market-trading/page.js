'use client';

import { useState } from 'react';
import Link from 'next/link';
import './formula-article.css';

function FormulaModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="formula-overlay" onClick={onClose}>
      <div className="formula-modal" onClick={(e) => e.stopPropagation()}>
        <div className="formula-modal-header">
          <h3>{title}</h3>
          <button className="formula-modal-close" onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        </div>
        <div className="formula-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

function FormulaButton({ label, onClick }) {
  return (
    <button type="button" className="formula-trigger" onClick={onClick}>
      <i className="bi bi-code-square" />
      <span>{label}</span>
      <i className="bi bi-arrow-up-right" />
    </button>
  );
}

export default function FourFormulasArticle() {
  const [activeFormula, setActiveFormula] = useState(null);

  return (
    <div className="echo-article-page">
      <div className="echo-article-container">
        <Link href="/ezana-echo" className="echo-article-back">
          <i className="bi bi-arrow-left" /> Back to Ezana Echo
        </Link>

        <div className="echo-article-header">
          <span className="echo-article-category">Trading</span>
          <h1 className="echo-article-title">The 4 Formulas That Separate Winning Prediction Market Traders From Everyone Else</h1>
          <div className="echo-article-meta-row">
            <span>Ezana Finance Editorial</span>
            <span>·</span>
            <span>12 min read</span>
            <span>·</span>
            <span>March 2026</span>
          </div>
        </div>

        <article className="echo-article-body">
          <p className="echo-article-lead">
            The top 0.04% of wallets on Polymarket capture 70% of all profits — roughly $3.7 billion. The gap between them and everyone else is not insider information, starting capital, or luck. It comes down to four mathematical formulas and the discipline to apply them systematically.
          </p>

          <p>
            What follows is a complete breakdown of those four formulas, how they work together, and how pairing them with an AI engine turns a manual research process into an automated signal generator that scans dozens of markets simultaneously and outputs one decision: enter or pass.
          </p>

          <h2>The evidence is on the leaderboard</h2>

          <p>
            Before getting into the math, consider what is already happening on Polymarket. One trader on the public leaderboard generated over $6 million in profit in a single day, primarily from sports markets where each individual position returned seven figures. Another runs a high-frequency strategy across $36 million in volume, extracting a tiny edge on every transaction at massive scale. A third joined the platform, placed ten trades, and turned one of them into a $99,000 return — an 887% gain — not by guessing the direction of Bitcoin, but by identifying critical mispricing in a short-duration market.
          </p>

          <p>
            The common thread across all of them is the same: mathematical edge combined with systematic execution. None of these results come from gut instinct or conviction. They come from doing the arithmetic that most people skip.
          </p>

          <h2>Formula 1 — Expected Value: Deciding When to Enter</h2>

          <p>
            Expected Value is the single most important concept in any form of probabilistic trading. If you internalize nothing else from this article, internalize EV.
          </p>

          <p>
            The idea is straightforward. A contract on Polymarket trades at 40 cents, meaning the market collectively assigns a 40% probability to the YES outcome. You have done your research and believe the actual probability is closer to 60%. The difference between the market&apos;s estimate and yours is your edge. EV quantifies that edge in dollar terms — how much you expect to make per dollar risked if your assessment is correct.
          </p>

          <FormulaButton label="View Expected Value Formula & Code" onClick={() => setActiveFormula('ev')} />

          <p>
            In this example, the edge works out to 20 cents per dollar. In traditional finance, entire careers are built on edges of 2 to 3 percent. Twenty percent is enormous — when it exists.
          </p>

          <p>
            The critical question is where the &quot;true probability&quot; estimate comes from. No human can objectively assess probabilities across fifty markets simultaneously. Cognitive research suggests the brain can track roughly nineteen variables at once, while markets move on hundreds. This is where AI becomes essential — not as a replacement for judgment, but as a tool that evaluates at a scale and speed that human cognition cannot match.
          </p>

          <h2>Formula 2 — Kelly Criterion: Deciding How Much to Risk</h2>

          <p>
            Finding a positive expected value trade answers the first question: should you enter? The Kelly Criterion answers the second: how much of your capital should you allocate?
          </p>

          <p>
            Most traders operate in one of two modes — recklessly large positions or timidly small ones. Both approaches are mathematically suboptimal. The Kelly Criterion is the formula that maximizes long-term capital growth by sizing each bet proportionally to the magnitude of your edge.
          </p>

          <FormulaButton label="View Kelly Criterion Formula & Code" onClick={() => setActiveFormula('kelly')} />

          <p>
            For the 40-cent contract where you estimate 60% true probability, Full Kelly recommends allocating 33% of your bankroll. But five decades of real-world trading experience have demonstrated that Full Kelly is far too aggressive in practice. The variance will destroy your ability to execute the strategy long before the math pays off.
          </p>

          <p>
            Every professional trader and serious gambler uses a fraction — typically Quarter Kelly to Half Kelly. On a $1,000 bankroll at Quarter Kelly, that means an $83 position. Not exciting. Not the kind of bet that makes for a dramatic screenshot. But it is the kind of sizing that keeps you in the game long enough for the edge to compound.
          </p>

          <h2>Formula 3 — Bayesian Updating: Changing Your Mind Correctly</h2>

          <p>
            Most traders form a thesis and then defend it against all new evidence. New data that contradicts their position gets rationalized away. New data that supports it gets amplified. This is not analysis — it is ego management.
          </p>

          <p>
            Bayes&apos; Theorem provides the mathematically correct framework for updating a belief when new information arrives. It tells you exactly how much to shift your probability estimate — not too much (overreaction), not too little (stubbornness), but proportionally to the strength of the evidence.
          </p>

          <FormulaButton label="View Bayesian Update Formula & Code" onClick={() => setActiveFormula('bayes')} />

          <p>
            Consider a market on whether the Fed will cut rates. Your initial estimate is 55%. Then an inflation report drops showing a significant decrease. Bayes&apos; Theorem takes your prior estimate, weighs it against how likely you would be to see this data under your hypothesis versus in general, and outputs an updated estimate of 88%.
          </p>

          <p>
            This is exactly how prediction markets function at their best. Thousands of traders constantly updating their assessments — the price moves as a reflection of aggregated Bayesian reasoning. The traders who profit most are not the ones with the strongest convictions. They are the ones who update fastest. Certainty is a liability in markets that run on probability.
          </p>

          <h2>Formula 4 — Log Returns: Measuring Performance Honestly</h2>

          <p>
            A contract drops from 80 cents to 40 cents, then recovers back to 80 cents. Standard arithmetic says you lost 50% then gained 100%, netting you a 50% profit. Except you are back exactly where you started. The arithmetic is lying to you.
          </p>

          <p>
            Logarithmic returns solve this problem. They are the mathematically correct way to measure performance over multiple periods because they sum properly — a loss followed by an equivalent recovery nets to zero, as it should.
          </p>

          <FormulaButton label="View Log Returns Formula & Code" onClick={() => setActiveFormula('log')} />

          <p>
            This matters because when you aggregate hundreds of trades over weeks or months, arithmetic returns systematically overstate your results. You can believe you are profitable when you are not. Log returns eliminate that distortion. Every quantitative fund and serious systematic trader uses them for exactly this reason.
          </p>

          <h2>The five cognitive traps that undermine the math</h2>

          <p>
            Formulas alone are insufficient if the person deploying them is subject to the same biases that afflict every human trader. Five cognitive traps account for the majority of losses among otherwise mathematically literate participants.
          </p>

          <p>
            <strong>Base rate neglect.</strong> A disease affects 1 in 1,000 people. A test with 99% accuracy comes back positive. Most people estimate the probability of actually being sick at 99%. The real answer is approximately 9%. On prediction markets, the equivalent error is seeing negative headlines and jumping to &quot;this must be at 80% probability&quot; without considering how rarely this class of event actually resolves YES.
          </p>

          <p>
            <strong>Sunk cost fallacy.</strong> You bought YES at 70 cents. It drops to 40 cents. New information clearly favors NO. The only question that matters is: if you had cash right now and no existing position, would you buy YES at 40 cents? If the answer is no, holding is indefensible. The market does not know or care about your entry price.
          </p>

          <p>
            <strong>Survivorship bias.</strong> Approximately 87% of Polymarket wallets are in the red. You never see their posts. Every screenshot of a $50,000 gain represents a population of traders who used the same approach and lost. The leaderboard shows winners by definition — it tells you nothing about the strategy&apos;s actual distribution of outcomes.
          </p>

          <p>
            <strong>Loss aversion.</strong> A coin flip that pays $150 on heads and costs $100 on tails has an expected value of positive $25. Most people reject it because the psychological pain of losing $100 is roughly twice as intense as the pleasure of gaining an equivalent amount. This is hardwired — and it causes traders to pass on positive-EV opportunities repeatedly.
          </p>

          <p>
            <strong>Overfitting.</strong> Three instances of a pattern is noise, not signal. The human brain is a pattern-recognition engine that will find structure in randomness given enough motivation. AI helps here specifically because it operates on large datasets and does not suffer from confirmation bias on small samples.
          </p>

          <h2>What separates the top fraction of a percent</h2>

          <p>
            After analyzing thousands of wallets on Polymarket, the pattern is consistent. The most profitable traders are not smarter, better connected, or operating with information advantages. They have better math.
          </p>

          <p>
            They calculate expected value before every entry. They check base rates before forming opinions. They update their estimates using Bayes when new data arrives. They size positions using Kelly. They cut losses without attachment. They measure returns using logarithms.
          </p>

          <p>
            None of this is proprietary. Every formula in this article is on Wikipedia. The code runs on any laptop. The data is available to everyone on the platform.
          </p>

          <p>
            The edge is not access to information — everyone has the same information. The edge is in actually doing the math that everyone else skips.
          </p>
        </article>

        <div className="echo-article-footer-author">
          <div className="echo-article-author-avatar">E</div>
          <div>
            <span className="echo-article-author-name">Ezana Finance Editorial</span>
            <span className="echo-article-author-desc">Market insights and analysis from the Ezana research team.</span>
          </div>
        </div>
      </div>

      <FormulaModal isOpen={activeFormula === 'ev'} onClose={() => setActiveFormula(null)} title="Expected Value (EV)">
        <div className="formula-math">EV = P(win) × Profit − P(lose) × Loss</div>
        <pre className="formula-code"><code>{`def expected_value(market_price, true_prob):
    # If YES wins: we get (1 - market_price) per share
    # If NO wins: we lose market_price
    ev = true_prob * (1 - market_price) - (1 - true_prob) * market_price
    return ev

market = 0.40   # market says 40%
you    = 0.60   # you think 60%

print(f"Edge per dollar: \${expected_value(market, you):.2f}")
# >>> Edge per dollar: $0.20`}`</code></pre>
      </FormulaModal>

      <FormulaModal isOpen={activeFormula === 'kelly'} onClose={() => setActiveFormula(null)} title="Kelly Criterion">
        <div className="formula-math">f* = (p × b − q) / b</div>
        <p className="formula-legend">p = probability of winning · q = 1 − p · b = payout ratio · f* = fraction of bankroll</p>
        <pre className="formula-code"><code>{`def kelly_fraction(true_prob, market_price):
    b = (1 - market_price) / market_price  # payout ratio
    p = true_prob
    q = 1 - p
    
    f = (p * b - q) / b
    return max(f, 0)

market = 0.40
true_p = 0.60

full_kelly = kelly_fraction(true_p, market)
half_kelly = full_kelly * 0.5
quarter_kelly = full_kelly * 0.25

print(f"Full Kelly:    \${full_kelly:.1%} of bankroll")
print(f"Half Kelly:    \${half_kelly:.1%} of bankroll")
print(f"Quarter Kelly: \${quarter_kelly:.1%} of bankroll")
# >>> Full Kelly:    33.3%
# >>> Half Kelly:    16.7%
# >>> Quarter Kelly: 8.3%`}`</code></pre>
      </FormulaModal>

      <FormulaModal isOpen={activeFormula === 'bayes'} onClose={() => setActiveFormula(null)} title="Bayesian Updating">
        <div className="formula-math">P(H|E) = P(E|H) × P(H) / P(E)</div>
        <p className="formula-legend">P(H) = prior · P(E|H) = likelihood · P(E) = evidence · P(H|E) = posterior</p>
        <pre className="formula-code"><code>{`def bayesian_update(prior, likelihood, evidence):
    posterior = (likelihood * prior) / evidence
    return posterior

# Market: "Will the Fed cut rates in June?"
prior = 0.55       # your initial estimate

# Inflation data drops
likelihood = 0.80   # P(see this data | Fed cuts)
evidence = 0.50     # P(see this data in general)

updated = bayesian_update(prior, likelihood, evidence)
print(f"Before news:  \${prior:.0%}")
print(f"After news:   \${updated:.0%}")
# >>> Before news:  55%
# >>> After news:   88%`}`</code></pre>
      </FormulaModal>

      <FormulaModal isOpen={activeFormula === 'log'} onClose={() => setActiveFormula(null)} title="Log Returns">
        <div className="formula-math">log_return = ln(P₁ / P₀)</div>
        <pre className="formula-code"><code>{`import numpy as np

def log_return(price_start, price_end):
    return np.log(price_end / price_start)

def arithmetic_return(price_start, price_end):
    return (price_end - price_start) / price_start

# Contract: 0.80 → 0.40 → 0.80
leg1_arith = arithmetic_return(0.80, 0.40)  # -50%
leg2_arith = arithmetic_return(0.40, 0.80)  # +100%
total_arith = leg1_arith + leg2_arith        # +50% WRONG

leg1_log = log_return(0.80, 0.40)  # -0.693
leg2_log = log_return(0.40, 0.80)  # +0.693
total_log = leg1_log + leg2_log     #  0.000 CORRECT

print(f"Arithmetic says: \${total_arith:+.0%}")  # +50%
print(f"Log returns:     \${total_log:+.3f}")     #  0.000`}`</code></pre>
      </FormulaModal>
    </div>
  );
}

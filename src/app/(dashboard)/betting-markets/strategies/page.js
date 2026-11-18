import Link from 'next/link';
import { STRATEGIES, STATUS_LABEL } from '@/lib/strategies/catalog';
import { VERIFY_MIN_BETS } from '@/lib/strategies/metrics';
import { StrategyDeskLegal } from './legal';
import './strategies.css';

export const metadata = { title: 'Strategy Desk | Ezana' };

/**
 * Strategy Desk (Nov 18 2026): Ezana's proprietary sports betting and
 * prediction-market strategies, each with its rules in plain sentences and a
 * record judged by one standard (lib/strategies/metrics.js).
 */
export default function StrategyDeskPage() {
  return (
    <div className="sd">
      <Link className="sd-back" href="/betting-markets">
        <i className="bi bi-arrow-left" aria-hidden="true" /> Betting Markets
      </Link>
      <p className="sd-eyebrow">Ezana Strategy Desk</p>
      <h1 className="sd-title">Strategies with a record you can check</h1>
      <p className="sd-lead">
        Ezana&apos;s own sports betting and prediction-market strategies. Every one reads as plain
        rules and is judged against the prices actually paid, not by how often it wins.
      </p>
      <p className="sd-rule-note">
        <strong>How a strategy earns Verified.</strong> At least {VERIFY_MIN_BETS} settled bets,
        all counted after its rules were fixed; a win rate above the break-even its prices imply,
        by more than chance allows; and a profit after fees. A strategy that wins 90% of the time
        at 93 cents a contract still loses money.
      </p>
      <ul className="sd-list">
        {STRATEGIES.map((s) => (
          <li key={s.slug}>
            <Link className="sd-item" href={`/betting-markets/strategies/${s.slug}`}>
              <span className="sd-item-meta">
                {s.market === 'sports' ? 'Sports betting' : 'Prediction markets'} · {s.venue}
              </span>
              <span className="sd-item-name">{s.name}</span>
              <span className={`sd-item-status sd-status--${s.status}`}>
                {STATUS_LABEL[s.status]}
              </span>
              <p className="sd-item-sum">{s.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
      <StrategyDeskLegal />
    </div>
  );
}

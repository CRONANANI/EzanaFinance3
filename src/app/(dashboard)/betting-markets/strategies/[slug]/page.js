import { notFound } from 'next/navigation';
import { strategyBySlug } from '@/lib/strategies/catalog';
import StrategyDetail from './StrategyDetail';
import '../strategies.css';

export function generateMetadata({ params }) {
  const s = strategyBySlug(params.slug);
  return { title: s ? `${s.name} | Strategy Desk | Ezana` : 'Strategy Desk | Ezana' };
}

export default function StrategyPage({ params }) {
  const strategy = strategyBySlug(params.slug);
  if (!strategy) notFound();
  return <StrategyDetail strategy={strategy} />;
}

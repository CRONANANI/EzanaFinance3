/**
 * Shared legislative chips — the SINGLE definition of <BillStageChip> and
 * <MomentumChip> used across every Congress.gov favorability surface (political
 * disclosures, gov contracts, lobbying, prediction markets, markets). Pure
 * presentational; safe in server or client components. No advice framing.
 */
import { STAGE_LABEL, STAGE_RANK } from '@/lib/congress/stage';

const STAGE_TONE = {
  introduced: '#94a3b8',
  committee: '#60a5fa',
  reported: '#38bdf8',
  floor: '#818cf8',
  passed_chamber: '#a78bfa',
  passed_both: '#34d399',
  law: '#22c55e',
};

/**
 * A small pill showing where a bill sits in the legislative pipeline.
 * @param {{stage?:string, size?:'sm'|'md'}} props
 */
export function BillStageChip({ stage, size = 'md' }) {
  const key = stage && STAGE_LABEL[stage] ? stage : 'introduced';
  const label = STAGE_LABEL[key];
  const tone = STAGE_TONE[key] || '#94a3b8';
  const rank = STAGE_RANK[key] || 1;
  const pad = size === 'sm' ? '1px 7px' : '2px 9px';
  const font = size === 'sm' ? 11 : 12;
  return (
    <span
      className="congress-stage-chip"
      title={`Legislative stage: ${label} (${rank}/7)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: pad,
        fontSize: font,
        fontWeight: 600,
        lineHeight: 1.3,
        borderRadius: 999,
        color: tone,
        border: `1px solid ${tone}44`,
        background: `${tone}18`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{ width: 6, height: 6, borderRadius: 999, background: tone, flex: '0 0 auto' }}
      />
      {label}
    </span>
  );
}

/**
 * A momentum indicator: a labeled score chip whose intensity scales with the
 * relative Legislative Momentum Score. Informational only — "rising activity",
 * never a buy/sell signal.
 * @param {{score?:number, max?:number, label?:string, size?:'sm'|'md'}} props
 */
export function MomentumChip({ score, max, label, size = 'md' }) {
  const s = Number(score);
  if (!Number.isFinite(s)) return null;
  const ratio = max && max > 0 ? Math.max(0, Math.min(1, s / max)) : 0.5;
  // muted slate → amber → green as momentum rises
  const tone = ratio >= 0.66 ? '#22c55e' : ratio >= 0.33 ? '#f59e0b' : '#94a3b8';
  const arrow = ratio >= 0.66 ? '▲▲' : ratio >= 0.33 ? '▲' : '△';
  const pad = size === 'sm' ? '1px 7px' : '2px 9px';
  const font = size === 'sm' ? 11 : 12;
  return (
    <span
      className="congress-momentum-chip"
      title={`Legislative momentum score ${s.toFixed(1)}${max ? ` of ${Number(max).toFixed(1)} top` : ''} — rising activity, not advice`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: pad,
        fontSize: font,
        fontWeight: 600,
        lineHeight: 1.3,
        borderRadius: 999,
        color: tone,
        border: `1px solid ${tone}44`,
        background: `${tone}18`,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden>{arrow}</span>
      {label ? <span style={{ opacity: 0.85 }}>{label}</span> : null}
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.toFixed(1)}</span>
    </span>
  );
}

'use client';

/**
 * Era strip — a static annotation layer beneath the history chart. Seven equal
 * boxes marking the macro regimes the series pass through. Plain, factual labels
 * (historical context, not editorial commentary). The final box (2024–25
 * projections) carries the amber projection treatment.
 */
import OecdInfoButton from './OecdInfoButton';
import { OECD_METHODOLOGY } from './oecd-methodology';

const ERAS = [
  { years: '1960s', label: 'Postwar growth' },
  { years: '1973–79', label: 'Oil shocks' },
  { years: '1980s', label: 'Disinflation' },
  { years: '1990s', label: 'Globalisation' },
  { years: '2008–12', label: 'GFC / euro crisis' },
  { years: '2020–22', label: 'COVID / inflation spike' },
  { years: '2024–25', label: 'OECD projections', proj: true },
];

export default function OecdEras() {
  return (
    <section className="oecd-eras-wrap" aria-label="Macro eras">
      <OecdInfoButton entry={OECD_METHODOLOGY.eras} />
      <div className="oecd-eras">
        {ERAS.map((e) => (
          <div key={e.years} className={`oecd-era ${e.proj ? 'oecd-era--proj' : ''}`}>
            <span className="oecd-era-years oecd-num">{e.years}</span>
            <span className="oecd-era-label">{e.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

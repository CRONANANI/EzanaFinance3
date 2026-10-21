'use client';

/** Card 1, Influence Pulse: five KPI tiles with YoY vs the same period last year. */
import { gatedYoy } from '@/lib/lobbying/page-model';
import { fmtCount, fmtPriorPeriod, fmtSpend } from '@/lib/lobbying/page-format';
import { Card, Skel, YoyPill } from './ui';

const TILES = [
  {
    key: 'spend',
    kicker: 'Disclosed spend',
    fmt: fmtSpend,
    note: 'Sum of reported amounts on activity reports. Registrations carry no dollar figure.',
  },
  { key: 'filings', kicker: 'Filings', fmt: fmtCount },
  { key: 'clients', kicker: 'Distinct clients', fmt: fmtCount },
  { key: 'firms', kicker: 'Distinct firms', fmt: fmtCount },
  { key: 'doorLobbyists', kicker: 'Revolving-door lobbyists', fmt: fmtCount },
];

export default function PulseCard({
  view,
  filters,
  nowMs,
  sub,
  partial,
  empty,
  onReset,
  coverage,
  priorCoverage,
}) {
  const now = view.data?.now || null;
  const prior = view.data?.prior || null;
  const priorLabel = fmtPriorPeriod(filters.period, nowMs);
  const isEmpty = view.status === 'ready' && (!now || !Number(now.filings));
  return (
    <Card
      id="lbx-pulse"
      className="lbx-card--pulse"
      title="Influence pulse"
      sub={sub}
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      onReset={onReset}
      partial={partial}
      footer={
        gatedYoy(1, 1, coverage, priorCoverage).reason === 'coverage' ? (
          <p className="lbx-notes-line">
            Year-over-year change appears once both periods are fully loaded
            {coverage?.pct != null ? ` (this period ${coverage.pct}%` : ' ('}
            {priorCoverage?.pct != null
              ? `, prior ${priorCoverage.pct}%)`
              : ', prior period not loaded)'}
            .
          </p>
        ) : null
      }
      skeleton={
        <div className="lbx-pulse-grid">
          {TILES.map((t) => (
            <div key={t.key} className="lbx-tile lbx-tile--kpi">
              <Skel w="60%" h={10} />
              <Skel w="70%" h={24} style={{ marginTop: 12 }} />
              <Skel w="40%" h={16} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      }
    >
      <div className="lbx-pulse-grid">
        {TILES.map((t) => {
          const yoy = gatedYoy(now?.[t.key], prior?.[t.key], coverage, priorCoverage);
          return (
            <div key={t.key} className="lbx-tile lbx-tile--kpi">
              <p className="lbx-kicker lbx-kicker--sm">{t.kicker}</p>
              <p className="lbx-kpi lbx-mono">{t.fmt(now?.[t.key])}</p>
              <p className="lbx-kpi-yoy">
                <YoyPill value={yoy.value} reason={yoy.reason} prior={priorLabel} />
                <span className="lbx-faint lbx-mono">{priorLabel}</span>
              </p>
              {t.note ? <p className="lbx-tile-note">{t.note}</p> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

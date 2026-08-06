'use client';

import { EchoFigureShell } from './EchoFigureShell';

export function EchoScenarioChain({
  figureLabel,
  kicker,
  hint,
  source,
  scenarios = [],
  killSwitch,
}) {
  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div className="echo-fig-scenarios">
        {scenarios.map((s) => (
          <div key={s.id} className={`echo-fig-scenario echo-fig-tone-${s.tone}`}>
            <div className="echo-fig-scenario-label" style={{ color: 'var(--text-muted)' }}>
              {s.label}
              <strong
                className="echo-fig-mono"
                style={{
                  color:
                    s.tone === 'base'
                      ? 'var(--echo-chart-blue)'
                      : s.tone === 'bear'
                        ? 'var(--echo-chart-red)'
                        : 'var(--text-primary)',
                }}
              >
                {s.range}
              </strong>
            </div>
            <div className="echo-fig-steps">
              {s.steps.map((st, i) => (
                <div key={st.label} style={{ display: 'contents' }}>
                  {i > 0 && <span className="echo-fig-step-op">×</span>}
                  <div className="echo-fig-step">
                    <strong>{st.label}</strong>
                    {st.sub}
                  </div>
                </div>
              ))}
              <span className="echo-fig-step-op">→</span>
            </div>
            <div className="echo-fig-result">
              <strong>{s.result.value}</strong>
              <span>{s.result.sub}</span>
            </div>
          </div>
        ))}
        {killSwitch && (
          <div className="echo-fig-killswitch">
            <i className="bi bi-exclamation-octagon" style={{ marginRight: 8 }} />
            KILL SWITCH · {killSwitch}
          </div>
        )}
      </div>
    </EchoFigureShell>
  );
}

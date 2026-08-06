'use client';

import { useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

export function EchoDossierTable({ figureLabel, kicker, hint, source, headers, rows = [] }) {
  const [open, setOpen] = useState(null);
  const h = headers || ['Power', 'What it is on the board', 'Anchor metric', 'Key risk', ''];

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div className="echo-fig-dossier">
        <div className="echo-fig-dossier-row echo-fig-dossier-head" aria-hidden>
          {h.map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
        {rows.map((r, i) => (
          <div key={r.name} className="echo-fig-dossier-row">
            <div>
              <span className="echo-fig-dossier-name">{r.name}</span>
              {r.tag && <span className="echo-fig-dossier-ticker">{r.tag}</span>}
            </div>
            <div className="echo-fig-dossier-cell">{r.role}</div>
            <div className="echo-fig-dossier-cell">{r.anchor}</div>
            <div className="echo-fig-dossier-cell">{r.keyRisk}</div>
            <div>
              <button
                type="button"
                className="echo-fig-dossier-btn"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                DOSSIER +
              </button>
            </div>
            {open === i && r.dossier && (
              <dl className="echo-fig-dossier-panel">
                {r.dossier.map((d) => (
                  <div key={d.label}>
                    <dt>{d.label}</dt>
                    <dd>{d.text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </EchoFigureShell>
  );
}

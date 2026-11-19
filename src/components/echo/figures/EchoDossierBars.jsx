'use client';

import { useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * Dossier bars (Nov 2026): a dossier table drawn as ranked bars. Each row's
 * anchor metric becomes a bar (same unit across rows), with the role and key
 * risk under it and the full dossier one click away, so nothing the table
 * carried is lost. Built for dossier-table data: { name, tag, role, anchor,
 * keyRisk, dossier: [{ label, text }] }, plus `scale` from figure-variety.
 */
export function EchoDossierBars({ figureLabel, kicker, hint, source, rows = [], headers }) {
  const [open, setOpen] = useState(null);
  const vals = rows.map((r) => Number(r.anchorValue) || 0);
  const max = Math.max(1e-9, ...vals.map((v) => Math.abs(v)));
  const metric = headers?.[2] || 'Anchor metric';
  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div className="echo-dbars" role="list" aria-label={metric}>
        {rows.map((r, i) => (
          <div key={r.name} className="echo-dbars-row" role="listitem">
            <div className="echo-dbars-top">
              <span className="echo-dbars-name">{r.name}</span>
              {r.tag ? <span className="echo-fig-dossier-ticker">{r.tag}</span> : null}
            </div>
            <div className="echo-dbars-track" aria-hidden="true">
              <span
                className="echo-dbars-fill"
                style={{ width: `${Math.max(2, (Math.abs(vals[i]) / max) * 100)}%` }}
              />
              <span className="echo-dbars-val">{r.anchor}</span>
            </div>
            <span className="sr-only">
              {metric}: {r.anchor}
            </span>
            <p className="echo-dbars-role">{r.role}</p>
            {r.keyRisk ? (
              <p className="echo-dbars-risk">
                <span>Key risk</span> {r.keyRisk}
              </p>
            ) : null}
            {r.dossier?.length ? (
              <>
                <button
                  type="button"
                  className="echo-fig-dossier-btn"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  DOSSIER {open === i ? '−' : '+'}
                </button>
                {open === i ? (
                  <dl className="echo-fig-dossier-panel">
                    {r.dossier.map((d) => (
                      <div key={d.label}>
                        <dt>{d.label}</dt>
                        <dd>{d.text}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </EchoFigureShell>
  );
}

export default EchoDossierBars;

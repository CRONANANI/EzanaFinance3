'use client';

/**
 * MethodologySection (Nov 2026): the record of how a standard or deep report
 * was produced, from report.team.methodology and report.team.audit. Rendered
 * inside the report's "Methodology and limitations" section, above the
 * limitations and the sources searched, so nothing is said twice:
 *   - which analysts ran (titles only);
 *   - the engine calculations used, with the method of each (citable rows:
 *     a finding's calculation ref jumps here);
 *   - the methodology checks: the count, and each check that did not pass
 *     (the full list sits in the Research team panel);
 *   - data freshness, with stale data tagged "not current".
 * The gaps are merged into the parent section's limitations list.
 */
import { Badge, Table, THead, TBody, TR, TH, TD } from '@/components/ds';
import { analystTitle } from '@/lib/sonar/research-state';
import { calcAnchor } from './Cites';
import { AuditChecks } from './ResearchTeamPanel';
import './research-team.css';

/* methodology.analysts carries titles; an id-shaped entry maps to its title. */
const asTitle = (s) => (/^[a-z]+(-[a-z]+)+$/.test(String(s)) ? analystTitle({ id: s }) : s);

export default function MethodologySection({ methodology, audit, focus }) {
  if (!methodology && !audit) return null;
  const analysts = [...new Set((methodology?.analysts || []).map(asTitle).filter(Boolean))];
  const calcs = (methodology?.calculations || []).filter((c) => c?.label);
  const fresh = (methodology?.freshness || []).filter((f) => f?.label);
  const total = Number(audit?.total) || audit?.checks?.length || 0;
  const passed = Number(audit?.passed) || 0;
  const failed = (audit?.checks || []).filter((c) => !c.pass);

  return (
    <div className="srr-meth">
      {analysts.length ? (
        <div className="srr-meth-block">
          <h3 className="srr-h3">Analysts</h3>
          <ul className="srr-meth-analysts">
            {analysts.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {calcs.length ? (
        <div className="srr-meth-block">
          <h3 className="srr-h3" id="srr-meth-calc-h">
            Calculations
          </h3>
          <div className="srr-table-wrap">
            <Table className="srr-meth-table" aria-labelledby="srr-meth-calc-h">
              <THead>
                <TR>
                  <TH scope="col">Calculation</TH>
                  <TH scope="col">Method</TH>
                </TR>
              </THead>
              <TBody>
                {calcs.map((c) => (
                  <TR
                    key={c.id || c.label}
                    id={c.id ? calcAnchor(c.id) : undefined}
                    tabIndex={c.id ? -1 : undefined}
                    className={focus === `M:${c.id}` ? 'is-focus' : undefined}
                  >
                    <TD className="srr-meth-name">{c.label}</TD>
                    <TD>{c.method || 'As reported'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      ) : null}

      {audit && total ? (
        <div className="srr-meth-block">
          <h3 className="srr-h3">Methodology checks</h3>
          <p className="srr-meth-summary">
            <span className="srr-mono">{passed}</span> of <span className="srr-mono">{total}</span>{' '}
            checks passed.
            {failed.length
              ? ' Each check that did not pass is listed below, and the report states it as a limitation.'
              : ''}
          </p>
          {failed.length ? <AuditChecks checks={failed} /> : null}
        </div>
      ) : null}

      {fresh.length ? (
        <div className="srr-meth-block">
          <h3 className="srr-h3" id="srr-meth-fresh-h">
            Data freshness
          </h3>
          <div className="srr-table-wrap">
            <Table className="srr-meth-table" aria-labelledby="srr-meth-fresh-h">
              <THead>
                <TR>
                  <TH scope="col">Data</TH>
                  <TH scope="col">Period</TH>
                  <TH scope="col">Status</TH>
                </TR>
              </THead>
              <TBody>
                {fresh.map((f, i) => (
                  <TR key={`${f.label}-${i}`}>
                    <TD>{f.label}</TD>
                    <TD className="srr-mono">{f.period || 'Undated'}</TD>
                    <TD>
                      {f.stale ? (
                        <Badge tone="warning">Not current</Badge>
                      ) : (
                        <Badge tone="neutral">Current</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

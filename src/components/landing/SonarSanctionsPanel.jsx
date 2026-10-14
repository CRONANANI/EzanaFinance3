'use client';

/**
 * Sonar's sanctions panel, shown under the brief for a sanctions ping. The
 * figures are Ezana's copy of the OFAC SDN list (the same aggregates as the
 * Sanctions & Trade Policy page); the exposure table is the brief's own web
 * research, labelled as such. Loaded on demand, so the map outlines only
 * reach visitors who ask about sanctions.
 */
import Link from 'next/link';
import { useMemo } from 'react';
import SanctionsWorldMap from '@/components/sanctions/SanctionsWorldMap';
import { worldCountries } from '@/lib/sanctions/world-map';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const EXPOSURE = { high: 'High', medium: 'Medium', low: 'Low' };

function Bars({ rows, colorOf, sub }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <ol className="snrx-bars">
      {rows.map((r) => (
        <li key={r.key}>
          <span className="snrx-bar-label">
            <span className="snrx-bar-name">{r.name}</span>
            {sub ? <span className="snrx-bar-sub">{sub(r)}</span> : null}
          </span>
          <span className="snrx-bar-track" aria-hidden="true">
            <span
              className="snrx-bar-fill"
              style={{ width: `${(r.total / max) * 100}%`, background: colorOf(r) }}
            />
          </span>
          <span className="snrx-bar-n">{fmt(r.total)}</span>
        </li>
      ))}
    </ol>
  );
}

export default function SonarSanctionsPanel({ data }) {
  const map = useMemo(() => worldCountries(), []);
  const targets = (data.targets || []).slice(0, 8).map((t) => ({
    key: t.name,
    name: t.name,
    total: t.total,
    entity: t.entity,
  }));
  const programs = (data.programs || []).slice(0, 8).map((p) => ({
    key: p.code,
    name: p.code,
    label: p.label,
    total: p.total,
    color: p.color,
  }));
  const exposed = Array.isArray(data.exposed) ? data.exposed : [];

  return (
    <div className="snrx-block snrx-sanctions">
      <div className="snrx-head">
        <p className="snrx-eyebrow">
          <i className="bi bi-shield-exclamation" aria-hidden="true" /> US sanctions · OFAC SDN list
        </p>
        <h2 className="snrx-title">Where US sanctions land</h2>
        <p className="snrx-sub">
          {fmt(data.active)} active listings: {fmt(data.byType?.entity)} companies and
          organisations, {fmt(data.byType?.individual)} individuals, {fmt(data.byType?.vessel)}{' '}
          vessels.
        </p>
      </div>

      <div className="snrx-sx-grid">
        <div className="snrx-sx-map">
          <SanctionsWorldMap
            map={map}
            countries={data.countries || []}
            compact
            label="World map shaded by the number of OFAC listings with an address in each country."
          />
        </div>
        <div className="snrx-sx-charts">
          <div>
            <h3 className="snrx-col-title">
              <i className="bi bi-flag" aria-hidden="true" />
              Jurisdictions under a US program
            </h3>
            <Bars
              rows={targets}
              colorOf={() => 'var(--brand-band-mint)'}
              sub={(r) => (r.entity ? `${fmt(r.entity)} companies` : null)}
            />
          </div>
          <div>
            <h3 className="snrx-col-title">
              <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
              Largest programs
            </h3>
            <Bars rows={programs} colorOf={(r) => r.color} sub={(r) => r.label} />
          </div>
        </div>
      </div>

      {exposed.length ? (
        <div className="snrx-exposed">
          <h3 className="snrx-col-title">
            <i className="bi bi-building-exclamation" aria-hidden="true" />
            Companies most exposed, from the brief&apos;s web research
          </h3>
          <table className="snrx-table">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Exposure</th>
                <th scope="col">Why</th>
              </tr>
            </thead>
            <tbody>
              {exposed.map((e) => (
                <tr key={`${e.company}-${e.ticker || ''}`}>
                  <th scope="row">
                    {e.company}
                    {e.ticker ? <span className="snrx-ticker">{e.ticker}</span> : null}
                  </th>
                  <td>
                    <span className={`snrx-exp snrx-exp--${e.exposure}`}>
                      {EXPOSURE[e.exposure] || 'Medium'}
                    </span>
                  </td>
                  <td>{e.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="snrx-fine">
            Named in web reporting the brief found, not in Ezana&apos;s datasets. Findings only,
            never advice.
          </p>
        </div>
      ) : null}

      <Link className="snrx-more" href="/datasets/sanctions">
        Open the Sanctions &amp; Trade Policy dataset
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </div>
  );
}

'use client';

/**
 * Sonar's sanctions panel for a sanctions ping. The figures are Ezana's copy
 * of the OFAC SDN list (the same aggregates as the Sanctions & Trade Policy
 * page); the exposure table is the brief's own web research, labelled as
 * such. Loaded on demand, so the map outlines only reach visitors who ask
 * about sanctions.
 *
 * Nov 3:
 *   - `rail` sets it at the top of the results' right-hand stack (one
 *     column: map, then the list) instead of below the band.
 *   - The title comes from the ping (data.title: "China, chips and US
 *     sanctions").
 *   - A ping about one country (data.focus) shades that country alone and
 *     lists its own SDN profile beside the map. China is not a program
 *     jurisdiction, so "Jurisdictions under a US program" never listed it,
 *     although its outline said 1,190 listings.
 *   - The "Largest programs" chart is gone.
 */
import Link from 'next/link';
import { useMemo } from 'react';
import SanctionsWorldMap from '@/components/sanctions/SanctionsWorldMap';
import { worldCountries } from '@/lib/sanctions/world-map';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const ordinal = (n) => {
  const v = n % 100;
  const suf = v >= 11 && v <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${suf}`;
};
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

export default function SonarSanctionsPanel({ data, rail = false }) {
  const map = useMemo(() => worldCountries(), []);
  const focus = data.focus || null;
  const mapFocus = useMemo(
    () => (focus ? { label: `${focus.label}-based`, counts: focus.counts } : null),
    [focus],
  );
  const focusRows = focus
    ? [
        ['entity', 'Companies', focus.entity],
        ['individual', 'Individuals', focus.individual],
        ['vessel', 'Vessels', focus.vessel],
        ['aircraft', 'Aircraft', focus.aircraft],
      ]
        .filter(([, , n]) => n > 0)
        .map(([key, name, total]) => ({ key, name, total }))
    : [];
  const targets = (data.targets || []).slice(0, 8).map((t) => ({
    key: t.name,
    name: t.name,
    total: t.total,
    entity: t.entity,
  }));
  const exposed = Array.isArray(data.exposed) ? data.exposed : [];

  return (
    <div className={`snrx-block snrx-sanctions${rail ? ' snrx-sanctions--rail' : ''}`}>
      <div className="snrx-head">
        <p className="snrx-eyebrow">
          <i className="bi bi-shield-exclamation" aria-hidden="true" /> US sanctions · OFAC SDN list
        </p>
        <h2 className="snrx-title">{data.title || 'Where US sanctions land'}</h2>
        {focus ? (
          <p className="snrx-sub">
            {fmt(focus.total)} of {fmt(data.active)} active listings have an address in{' '}
            {focus.label}, {ordinal(focus.rank)} of {fmt(focus.ofCountries)} countries on the list.
          </p>
        ) : (
          <p className="snrx-sub">
            {fmt(data.active)} active listings: {fmt(data.byType?.entity)} companies and
            organisations, {fmt(data.byType?.individual)} individuals, {fmt(data.byType?.vessel)}{' '}
            vessels.
          </p>
        )}
      </div>

      <div className="snrx-sx-grid">
        <div className="snrx-sx-map">
          <SanctionsWorldMap
            map={map}
            countries={data.countries || []}
            focus={mapFocus}
            compact
            label={
              focus
                ? `World map with ${focus.label} shaded by its ${fmt(focus.total)} OFAC listings; other countries are grey.`
                : 'World map shaded by the number of OFAC listings with an address in each country.'
            }
          />
        </div>
        <div className="snrx-sx-charts">
          {focus ? (
            <div>
              <h3 className="snrx-col-title">
                <i className="bi bi-flag" aria-hidden="true" />
                {focus.label} on the SDN list
              </h3>
              <Bars rows={focusRows} colorOf={() => 'var(--brand-band-mint)'} />
              {data.chips ? (
                <p className="snrx-fine">
                  The SDN list is Treasury&apos;s sanctions list. Chip export controls sit on the
                  Commerce Department&apos;s Entity List, a separate list.
                </p>
              ) : null}
            </div>
          ) : (
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
          )}
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

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Input } from '@/components/ds';
import {
  PITCH_CIRCUIT,
  VERIFIED_ON,
  REGION_LABEL,
  MODE_LABEL,
  ACADEMIC_MONTHS,
  circuitStatus,
  statusMeta,
  seasonMonths,
  sortCircuit,
  fmtDate,
  fmtRange,
  daysBetween,
} from '@/lib/competitions/pitch-circuit';
import './pitch-circuit.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'season', label: 'In season' },
  { id: 'ca', label: 'Canada' },
  { id: 'us', label: 'United States' },
  { id: 'virtual', label: 'Virtual finals' },
];

function matchesFilter(entry, status, filter) {
  if (filter === 'season') return status.state !== 'tba';
  if (filter === 'ca' || filter === 'us') return entry.region === filter;
  if (filter === 'virtual') return entry.finalsMode === 'virtual';
  return true;
}

function matchesQuery(entry, q) {
  if (!q) return true;
  const hay = [
    entry.name,
    entry.shortName,
    entry.alsoKnownAs,
    entry.host,
    entry.partner,
    entry.location,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function countdown(todayIso, iso) {
  const d = daysBetween(todayIso, iso);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `In ${d} days`;
}

function StatStrip({ entries, todayIso }) {
  const comps = entries.filter((e) => e.kind === 'competition');
  const awards = entries.length - comps.length;
  const inSeason = entries.filter((e) => circuitStatus(e, todayIso).state !== 'tba').length;
  const virtual = comps.filter((e) => e.finalsMode === 'virtual').length;
  const nextUp = entries
    .map((e) => ({ e, next: circuitStatus(e, todayIso).next }))
    .filter((x) => x.next)
    .sort((a, b) => a.next.date.localeCompare(b.next.date))[0];

  return (
    <div className="pcc-stats" role="list">
      <div className="pcc-stat" role="listitem">
        <span className="pcc-stat-label">Tracked</span>
        <span className="pcc-stat-value">{comps.length}</span>
        <span className="pcc-stat-sub">competitions{awards ? `, plus ${awards} award` : ''}</span>
      </div>
      <div className="pcc-stat" role="listitem">
        <span className="pcc-stat-label">In season now</span>
        <span className="pcc-stat-value">{inSeason}</span>
        <span className="pcc-stat-sub">with live published dates</span>
      </div>
      <div className="pcc-stat" role="listitem">
        <span className="pcc-stat-label">Next deadline</span>
        <span className="pcc-stat-value pcc-stat-value--date">
          {nextUp ? fmtDate(nextUp.next.date) : 'None'}
        </span>
        <span className="pcc-stat-sub">
          {nextUp ? `${nextUp.e.shortName}: ${nextUp.next.label}` : 'No published dates ahead'}
        </span>
      </div>
      <div className="pcc-stat" role="listitem">
        <span className="pcc-stat-label">Virtual finals</span>
        <span className="pcc-stat-value">{virtual}</span>
        <span className="pcc-stat-sub">no travel required</span>
      </div>
    </div>
  );
}

function SeasonCalendar({ entries, todayIso }) {
  const nowMonth = Number(todayIso.slice(5, 7)) - 1;
  return (
    <section className="pcc-card pcc-season" aria-labelledby="pcc-season-title">
      <header className="pcc-card-head">
        <div>
          <p className="pcc-kicker">Academic year</p>
          <h2 id="pcc-season-title" className="pcc-card-title">
            Competition season
          </h2>
        </div>
        <span className="pcc-legend">
          <span className="pcc-legend-swatch" aria-hidden="true" /> Months of the latest published
          edition
        </span>
      </header>
      <div className="pcc-season-scroll">
        <table className="pcc-season-grid">
          <caption className="pcc-sr">
            Months in which each competition ran in its latest published edition
          </caption>
          <thead>
            <tr>
              <th scope="col" className="pcc-season-name-h">
                Competition
              </th>
              {ACADEMIC_MONTHS.map((m) => (
                <th
                  key={m.index}
                  scope="col"
                  className={`pcc-season-m${m.index === nowMonth ? ' is-now' : ''}`}
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const months = seasonMonths(e);
              return (
                <tr key={e.slug}>
                  <th scope="row" className="pcc-season-name">
                    <Link href={`/org-competitions/circuit/${e.slug}`}>{e.shortName}</Link>
                  </th>
                  {ACADEMIC_MONTHS.map((m) => (
                    <td
                      key={m.index}
                      className={`pcc-season-cell${m.index === nowMonth ? ' is-now' : ''}`}
                    >
                      {months.has(m.index) ? (
                        <span
                          className={`pcc-season-bar${e.kind === 'award' ? ' pcc-season-bar--award' : ''}`}
                          title={`${e.shortName}, ${m.label}`}
                        />
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CircuitCard({ entry, todayIso }) {
  const status = circuitStatus(entry, todayIso);
  const meta = statusMeta(entry, status);
  const lastDate = entry.keyDates[entry.keyDates.length - 1];

  return (
    <article className="pcc-card pcc-comp">
      <div className="pcc-comp-top">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="pcc-comp-region">
          <i className="bi bi-geo-alt" aria-hidden="true" /> {REGION_LABEL[entry.region]}
        </span>
      </div>

      <h3 className="pcc-comp-name">
        <Link href={`/org-competitions/circuit/${entry.slug}`} className="pcc-comp-link">
          {entry.name}
        </Link>
      </h3>
      <p className="pcc-comp-host">{entry.host}</p>

      <dl className="pcc-facts">
        <div className="pcc-fact">
          <dt>Team</dt>
          <dd>{entry.teamSize || 'Not published'}</dd>
        </div>
        <div className="pcc-fact">
          <dt>Finals</dt>
          <dd>{entry.finalsMode ? MODE_LABEL[entry.finalsMode] : 'Not applicable'}</dd>
        </div>
        <div className="pcc-fact pcc-fact--wide">
          <dt>Ideas</dt>
          <dd>{entry.ideaRules || 'Not published'}</dd>
        </div>
      </dl>

      <div className="pcc-comp-foot">
        {status.next ? (
          <div className="pcc-next">
            <span className="pcc-next-label">{status.next.label}</span>
            <span className="pcc-next-date">
              {fmtRange(status.next.date, status.next.endDate)}
              <span className="pcc-next-count">{countdown(todayIso, status.next.date)}</span>
            </span>
          </div>
        ) : (
          <div className="pcc-next pcc-next--past">
            <span className="pcc-next-label">Last edition, {lastDate.label.toLowerCase()}</span>
            <span className="pcc-next-date">{fmtRange(lastDate.date, lastDate.endDate)}</span>
          </div>
        )}
        <Link
          href={`/org-competitions/circuit/${entry.slug}`}
          className="pcc-open"
          aria-label={`Open ${entry.name}`}
        >
          Details <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function PitchCircuitClient({ todayIso }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => sortCircuit(PITCH_CIRCUIT, todayIso), [todayIso]);
  const q = query.trim().toLowerCase();

  const competitions = sorted.filter(
    (e) =>
      e.kind === 'competition' &&
      matchesFilter(e, circuitStatus(e, todayIso), filter) &&
      matchesQuery(e, q),
  );
  const awards = sorted.filter(
    (e) =>
      e.kind === 'award' &&
      matchesFilter(e, circuitStatus(e, todayIso), filter) &&
      matchesQuery(e, q),
  );

  return (
    <div className="pcc-page">
      <header className="pcc-head">
        <div>
          <p className="pcc-eyebrow">
            <i className="bi bi-signpost-split" aria-hidden="true" /> Pitch Circuit
          </p>
          <h1 className="pcc-h1">Inter-university stock pitch competitions</h1>
          <p className="pcc-lead">
            The external competitions your analysts can enter, with eligibility, idea rules, prizes
            and the full round timeline from each organizer&apos;s latest published edition.
          </p>
        </div>
        <Link href="/org-competitions" className="ds-btn ds-btn--secondary">
          <i className="bi bi-trophy" aria-hidden="true" /> Host Command Center
        </Link>
      </header>

      <StatStrip entries={PITCH_CIRCUIT} todayIso={todayIso} />
      <SeasonCalendar entries={sorted} todayIso={todayIso} />

      <div className="pcc-toolbar">
        <div className="pcc-chips" role="group" aria-label="Filter competitions">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`pcc-chip${filter === f.id ? ' is-active' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="pcc-search">
          <Input
            type="search"
            aria-label="Search competitions"
            placeholder="Search by name, host or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <section aria-labelledby="pcc-comps-title">
        <h2 id="pcc-comps-title" className="pcc-h2">
          Competitions <span className="pcc-count">{competitions.length}</span>
        </h2>
        {competitions.length ? (
          <div className="pcc-grid">
            {competitions.map((e) => (
              <CircuitCard key={e.slug} entry={e} todayIso={todayIso} />
            ))}
          </div>
        ) : (
          <p className="pcc-empty">No competitions match these filters.</p>
        )}
      </section>

      {awards.length ? (
        <section aria-labelledby="pcc-awards-title" className="pcc-awards">
          <h2 id="pcc-awards-title" className="pcc-h2">
            Awards and scholarships <span className="pcc-count">{awards.length}</span>
          </h2>
          <div className="pcc-grid">
            {awards.map((e) => (
              <CircuitCard key={e.slug} entry={e} todayIso={todayIso} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="pcc-note">
        <i className="bi bi-info-circle" aria-hidden="true" /> Details come from each
        organizer&apos;s published materials, last verified {fmtDate(VERIFIED_ON)}. Rules and dates
        change between editions, so confirm on the official site before registering.
      </p>
    </div>
  );
}

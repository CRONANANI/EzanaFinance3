'use client';

/**
 * The seven dimension cards under the Sonar stage (Oct 28 redesign,
 * datasets-index-handoff). A bus line with a chevron where the stage's beam
 * lands feeds one card per dimension, in taxonomy order.
 *
 * What is real (all from src/lib/datasets/taxonomy.js via page.js): the name,
 * Bootstrap icon, tagline, live/total count, status (Live, Partial, Soon:
 * text and icon, never colour alone) and, when a card is selected, its dataset
 * list with each dataset's own live or soon state.
 *
 * The activity line renders only from a real series (`d.series`, an array of
 * numbers). No dimension has one today, so every card draws the dashed
 * baseline. Never generate or smooth a series for decoration.
 *
 * Selecting a card drives the shared SonarSelection (and ?dimension=). While a
 * signal brief is open, choosing a card opens that dimension's freshest signal
 * instead, or closes the brief when the dimension has none. Choosing the
 * selected card again, or Escape inside the rail, clears the selection.
 */
import Link from 'next/link';
import { useSonarSelection } from './SonarSelection';
import { usePulse } from './PulseProvider';
import { hubHref } from '@/lib/datasets/hubs';
import './console-rail.css';

const STATUS = {
  live: { label: 'Live', icon: 'bi-circle-fill' },
  partial: { label: 'Partial', icon: 'bi-circle-half' },
  soon: { label: 'Soon', icon: 'bi-circle' },
};

export function dimensionStatus(live, total) {
  if (total > 0 && live === total) return 'live';
  if (live === 0) return 'soon';
  return 'partial';
}

const SW = 140;
const SH = 22;

function ActivityLine({ series }) {
  const ok =
    Array.isArray(series) && series.length > 1 && series.every((v) => Number.isFinite(Number(v)));
  if (!ok) {
    return (
      <svg
        className="dsi-card__spark"
        viewBox={`0 0 ${SW} ${SH}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path className="dsi-card__spark-base" d={`M0 ${SH / 2}H${SW}`} />
      </svg>
    );
  }
  const nums = series.map(Number);
  const min = Math.min(...nums);
  const span = Math.max(...nums) - min || 1;
  const d = nums
    .map((v, i) => {
      const x = (i / (nums.length - 1)) * SW;
      const y = SH - 2 - ((v - min) / span) * (SH - 4);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join('');
  return (
    <svg
      className="dsi-card__spark"
      viewBox={`0 0 ${SW} ${SH}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="dsi-card__spark-line" d={d} />
    </svg>
  );
}

function Card({ d, on, onChoose }) {
  const total = d.items.length;
  const live = d.liveCount;
  const st = dimensionStatus(live, total);
  const listId = `dsi-list-${d.id}`;

  return (
    <article id={`dsi-card-${d.id}`} className={`dsi-card${on ? ' is-selected' : ''}`}>
      <h3 className="dsi-card__title">
        <button
          type="button"
          className="dsi-card__head"
          aria-pressed={on}
          aria-expanded={on}
          aria-controls={listId}
          onClick={onChoose}
        >
          <i className={`bi ${d.icon} dsi-card__icon`} aria-hidden="true" />
          <span>{d.label}</span>
        </button>
      </h3>

      <ActivityLine series={d.series} />

      {d.tagline ? <p className="dsi-card__desc">{d.tagline}</p> : null}

      <div className="dsi-card__foot">
        <span className="dsi-card__count">
          <span aria-hidden="true">
            {live}/{total}
          </span>
          <span className="dsi-vh">
            {live} of {total} datasets live
          </span>
        </span>
        <span className={`dsi-status dsi-status--${st}`}>
          <i className={`bi ${STATUS[st].icon}`} aria-hidden="true" />
          {STATUS[st].label}
        </span>
      </div>

      <div id={listId} className="dsi-card__more" hidden={!on}>
        <ul className="dsi-card__list">
          {d.items.map((it) => (
            <li key={it.label} className="dsi-card__ds">
              {it.live && it.href ? (
                <Link href={it.href}>{it.label}</Link>
              ) : (
                <span className="dsi-card__ds-soon">{it.label}</span>
              )}
              <span className={`dsi-status dsi-status--${it.live ? 'live' : 'soon'}`}>
                <i
                  className={`bi ${it.live ? 'bi-circle-fill' : 'bi-circle'}`}
                  aria-hidden="true"
                />
                {it.live ? 'Live' : 'Soon'}
              </span>
            </li>
          ))}
        </ul>
        <Link className="dsi-card__open" href={hubHref(d.id)}>
          Open dimension <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function ConsoleRail({ dims }) {
  const { selected, select } = useSonarSelection();
  const { openKey, open, close, leadFor } = usePulse();

  const choose = (id) => {
    if (openKey) {
      const lead = leadFor(id);
      if (lead) open(lead.key, 'rail');
      else {
        close();
        select(id, 'rail');
      }
      return;
    }
    select(selected === id ? null : id, 'rail');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && selected) {
      e.stopPropagation();
      select(null, 'rail');
    }
  };

  return (
    <section className="dsi-rail" aria-labelledby="dsi-rail-title" onKeyDown={onKeyDown}>
      <h2 id="dsi-rail-title" className="dsi-vh">
        Dimensions
      </h2>
      <div className="dsi-bus" aria-hidden="true">
        <span className="dsi-bus__chev">
          <i className="bi bi-chevron-down" />
        </span>
      </div>
      <div className="dsi-rail__grid">
        {dims.map((d) => (
          <Card key={d.id} d={d} on={selected === d.id} onChoose={() => choose(d.id)} />
        ))}
      </div>
    </section>
  );
}

/**
 * The five datasets at the foot of the Capitol Watch hub, as a bento of
 * tiles: Politician Tracker and Government Contracts wide on the first row,
 * Lobbying, Campaign Finance and Committees on the second. Each tile is one
 * link with an accent colour, an icon, a headline figure, two supporting
 * figures, its own small visual and a live dot with the last update.
 *
 * Server components only, no client JavaScript. Tiles are in DOM order so
 * tab order matches what is seen. Visuals come from one precomputed row
 * (getDatasetVisuals); periods still filling (this month, quarters whose
 * reports are not yet due, a fiscal year loaded before it closed) draw dashed
 * and say so in their tooltip. Every bar has a <title>; axis labels are HTML,
 * so they never stretch with the drawing.
 */
import Link from 'next/link';
import { getDatasetVisuals } from '@/lib/datasets/capitol-hub/data';
import { summaryFor } from '../HubCards';
import { fmt } from '../hub-format';
import { money } from './cwh-format';
import {
  fiscalYearPartial,
  monthLabel,
  monthPartial,
  quarterLabel,
  quarterPartial,
} from './tile-periods';

const DASH = '–';

const TILES = {
  'Politician Tracker': { key: 'trades', icon: 'bi-bank', accent: 'emerald', wide: true },
  'Government Contracts': { key: 'contracts', icon: 'bi-briefcase', accent: 'info', wide: true },
  'Lobbying Activity': { key: 'lobbying', icon: 'bi-megaphone', accent: 'amber' },
  'Campaign Finance Records': { key: 'finance', icon: 'bi-cash-stack', accent: 'purple' },
  'Committee Assignments': { key: 'committees', icon: 'bi-diagram-3', accent: 'cyan' },
};
const ORDER = Object.keys(TILES);
const PARTY = { D: 'Democrats', R: 'Republicans', I: 'Independents' };

/* ── visuals ──────────────────────────────────────────────────────────── */

function Bars({ items, label, axis }) {
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  const n = items.length;
  const W = 100;
  const H = 40;
  const gap = 1.6;
  const bw = (W - gap * (n - 1)) / n;
  return (
    <div className="cwh-tile-vis">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="cwh-tile-bars"
        role="img"
        aria-label={label}
      >
        {items.map((it, i) => {
          const h = Math.max(it.value ? 1.5 : 0.6, ((it.value || 0) / max) * (H - 1));
          return (
            <rect
              key={it.key}
              x={i * (bw + gap)}
              y={H - h}
              width={bw}
              height={h}
              rx="0.8"
              className={it.partial ? 'is-partial' : undefined}
              vectorEffect="non-scaling-stroke"
            >
              <title>{it.title}</title>
            </rect>
          );
        })}
      </svg>
      <div className="cwh-tile-axis" aria-hidden="true">
        <span className="cwh-mono">{axis[0]}</span>
        <span className="cwh-mono">{axis[1]}</span>
      </div>
    </div>
  );
}

function TradesVis({ v }) {
  const items = (v || []).map((r) => {
    const partial = monthPartial(r.m);
    return {
      key: r.m,
      value: r.n,
      partial,
      title: `${monthLabel(r.m)}: ${fmt('int', r.n) ?? 0} disclosures${partial ? ' (month in progress)' : ''}`,
    };
  });
  if (!items.length) return null;
  return (
    <Bars
      items={items}
      label="Trades disclosed per month, last 12 months"
      axis={[monthLabel(items[0].key), monthLabel(items[items.length - 1].key)]}
    />
  );
}

function ContractsVis({ v }) {
  const items = (v || []).map((r) => {
    const partial = fiscalYearPartial(r.fy, r.synced);
    return {
      key: String(r.fy),
      value: Number(r.total) || 0,
      partial,
      title: `FY${r.fy}: ${money(r.total)} obligated${partial ? ' (loaded before the fiscal year closed)' : ''}`,
    };
  });
  if (!items.length) return null;
  return (
    <Bars
      items={items}
      label="Federal contract obligations per fiscal year"
      axis={[`FY${items[0].key}`, `FY${items[items.length - 1].key}`]}
    />
  );
}

function LobbyingVis({ v }) {
  const items = (v || []).map((r) => {
    const partial = quarterPartial(r.y, r.q);
    return {
      key: `${r.y}-${r.q}`,
      value: Number(r.spend) || 0,
      partial,
      title: `${quarterLabel(r.y, r.q)}: ${money(r.spend)} reported${partial ? ' (reports still due)' : ''}`,
    };
  });
  if (!items.length) return null;
  const first = v[0];
  const last = v[v.length - 1];
  return (
    <Bars
      items={items}
      label="Lobbying spend per quarter"
      axis={[quarterLabel(first.y, first.q), quarterLabel(last.y, last.q)]}
    />
  );
}

function FinanceVis({ v }) {
  const parties = (v?.byParty || []).filter((p) => PARTY[p.party]);
  const total = parties.reduce((s, p) => s + (Number(p.raised) || 0), 0);
  if (!total) return null;
  return (
    <div className="cwh-tile-vis">
      <div
        className="cwh-tile-stack"
        role="img"
        aria-label={`Money raised in the ${v.cycle} cycle by party`}
      >
        {parties.map((p) => (
          <span
            key={p.party}
            className={`is-${p.party}`}
            style={{ width: `${(100 * (Number(p.raised) || 0)) / total}%` }}
            title={`${PARTY[p.party]}: ${money(p.raised)} across ${p.members} members`}
          />
        ))}
      </div>
      <ol className="cwh-tile-top">
        {(v.top || []).slice(0, 3).map((t) => (
          <li key={t.name}>
            <span className="cwh-tile-top-name">
              {t.name} <span className={`cwh-tile-party is-${t.party}`}>{t.party}</span>
            </span>
            <span className="cwh-mono">{money(t.raised)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CommitteesVis({ v }) {
  const chambers = ['house', 'senate']
    .map((c) => ({
      chamber: c,
      rows: (v || []).filter((r) => r.chamber === c && PARTY[r.party]),
    }))
    .filter((c) => c.rows.length);
  if (!chambers.length) return null;
  return (
    <div className="cwh-tile-vis">
      {chambers.map((c) => {
        const seats = c.rows.reduce((s, r) => s + (r.seats || 0), 0);
        return (
          <div key={c.chamber} className="cwh-tile-chamber">
            <span className="cwh-tile-chamber-l">{c.chamber === 'house' ? 'House' : 'Senate'}</span>
            <div
              className="cwh-tile-stack"
              role="img"
              aria-label={`${c.chamber === 'house' ? 'House' : 'Senate'} committee seats by party`}
            >
              {c.rows.map((r) => (
                <span
                  key={r.party}
                  className={`is-${r.party}`}
                  style={{ width: `${(100 * r.seats) / seats}%` }}
                  title={`${PARTY[r.party]}: ${r.seats} seats, ${r.members} members`}
                />
              ))}
            </div>
            <span className="cwh-mono cwh-tile-chamber-n">{fmt('int', seats)}</span>
          </div>
        );
      })}
    </div>
  );
}

const VISUAL = {
  trades: TradesVis,
  contracts: ContractsVis,
  lobbying: LobbyingVis,
  finance: FinanceVis,
  committees: CommitteesVis,
};

/* ── tiles ────────────────────────────────────────────────────────────── */

async function Tile({ item, visuals }) {
  const t = TILES[item.label];
  const s = await summaryFor(item.label);
  const ok = s && !s.empty && !s.error;
  const [lead, ...rest] = ok ? s.numbers || [] : [];
  const Vis = VISUAL[t.key];
  const vData = visuals && !visuals.error && !visuals.empty ? visuals[t.key] : null;
  return (
    <Link
      href={item.href}
      className={`cwh-tile cwh-tile--${t.accent}${t.wide ? ' cwh-tile--wide' : ''}`}
      title={item.description}
    >
      <span className="cwh-tile-head">
        <span className="cwh-tile-icon" aria-hidden="true">
          <i className={`bi ${t.icon}`} />
        </span>
        <span className="cwh-tile-name">{item.label}</span>
        <i className="bi bi-arrow-up-right cwh-tile-go" aria-hidden="true" />
      </span>
      {s?.error ? (
        <span className="cwh-caption">Figures unavailable just now</span>
      ) : !ok ? (
        <span className="cwh-caption">No records yet</span>
      ) : (
        <>
          <span className="cwh-tile-lead">{fmt(lead.kind, lead.value) ?? DASH}</span>
          <span className="cwh-tile-label">{lead.label}</span>
          <span className="cwh-tile-sub">
            {rest.slice(0, 2).map((n) => (
              <span key={n.label}>
                <b className={n.kind === 'text' ? undefined : 'cwh-mono'}>
                  {fmt(n.kind, n.value) ?? DASH}
                </b>{' '}
                {n.label.toLowerCase()}
              </span>
            ))}
          </span>
        </>
      )}
      {vData ? <Vis v={vData} /> : null}
      <span className="cwh-tile-foot">
        <span className={`cwh-tile-dot${ok ? ' is-live' : ''}`} aria-hidden="true" />
        <span className="cwh-mono">
          {ok && s.freshest ? `UPDATED ${fmt('date', s.freshest).toUpperCase()}` : 'AWAITING DATA'}
        </span>
      </span>
    </Link>
  );
}

function TileSkeleton({ item }) {
  const t = TILES[item.label] || {};
  return (
    <div
      className={`cwh-tile cwh-tile--${t.accent || 'emerald'}${t.wide ? ' cwh-tile--wide' : ''}`}
      aria-busy="true"
    >
      <span className="cwh-tile-head">
        <span className="cwh-tile-icon" aria-hidden="true">
          <i className={`bi ${t.icon || 'bi-database'}`} />
        </span>
        <span className="cwh-tile-name">{item.label}</span>
      </span>
      <span className="cwh-skel" />
      <span className="cwh-skel cwh-skel--short" />
    </div>
  );
}

const ordered = (items) =>
  ORDER.map((label) => items.find((i) => i.label === label)).filter(Boolean);

/** The skeleton while the tiles load, in the same order. */
export function TilesSkeleton({ items }) {
  return (
    <div className="cwh-tiles" aria-busy="true" aria-label="Datasets loading">
      {ordered(items).map((item) => (
        <TileSkeleton key={item.label} item={item} />
      ))}
    </div>
  );
}

/** The bento, in its fixed order; datasets not in the map are left out. */
export default async function DatasetTiles({ items }) {
  const visuals = await getDatasetVisuals();
  const list = ordered(items);
  return (
    <div className="cwh-tiles">
      {list.map((item) => (
        <Tile key={item.label} item={item} visuals={visuals} />
      ))}
    </div>
  );
}

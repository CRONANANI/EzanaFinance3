/**
 * The five Capitol datasets at the foot of the hub, as a bento of tiles.
 * Server components: each tile is one link (the whole tile opens the dataset)
 * with the dataset's headline figure, two supporting figures, a small visual
 * of its own shape, and how fresh it is.
 *
 *   Politician Tracker     trades disclosed per month, 12 months
 *   Government Contracts   obligations per fiscal year, 10 years
 *   Lobbying Activity      reported spend per quarter, 8 quarters
 *   Campaign Finance       money raised by party this cycle, top raisers
 *   Committee Assignments  seats by chamber and party
 *
 * Visuals come from mv_capitol_dataset_visuals (dataset-visuals.js); when it
 * is missing the tile still renders its figures. SVG only, no client JS;
 * every bar carries a <title> with its exact value.
 */
import Link from 'next/link';
import { fmt } from '../hub-format';
import { DASH } from './cwh-format';

const META = {
  'Politician Tracker': { icon: 'bi-bank', tone: 'tracker', sub: 'STOCK Act trades and holdings' },
  'Government Contracts': { icon: 'bi-briefcase', tone: 'contracts', sub: 'Federal prime awards' },
  'Lobbying Activity': { icon: 'bi-megaphone', tone: 'lobbying', sub: 'Senate LDA filings' },
  'Campaign Finance Records': {
    icon: 'bi-cash-stack',
    tone: 'finance',
    sub: 'FEC receipts by member',
    name: 'Campaign Finance',
  },
  'Committee Assignments': { icon: 'bi-diagram-3', tone: 'committees', sub: 'Who oversees what' },
};

/* Bento order: the two wide tiles, then the three narrow ones. */
export const TILE_ORDER = [
  'Politician Tracker',
  'Government Contracts',
  'Lobbying Activity',
  'Campaign Finance Records',
  'Committee Assignments',
];
export const orderTiles = (items) =>
  [...items].sort(
    (a, b) => (TILE_ORDER.indexOf(a.label) + 1 || 99) - (TILE_ORDER.indexOf(b.label) + 1 || 99),
  );

const MONTH = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_LONG = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function usd(v) {
  const n = Number(v) || 0;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

/* ── shared bar chart ─────────────────────────────────────────────── */

function Bars({ data, caption }) {
  if (!data?.length) return null;
  const W = 280;
  const H = 70;
  const gap = 4;
  const bw = (W - gap * (data.length - 1)) / data.length;
  const max = data.reduce((m, d) => Math.max(m, d.v), 0) || 1;
  return (
    <figure className="cwh-dst-viz">
      {/* Bars stretch to the tile's width; the axis labels sit in HTML below
          so the text never stretches with them. */}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption} preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = Math.max(2, (d.v / max) * H);
          return (
            <rect
              key={d.key}
              x={i * (bw + gap)}
              y={H - h}
              width={bw}
              height={h}
              rx="2"
              vectorEffect="non-scaling-stroke"
              className={`cwh-dst-bar${d.partial ? ' is-partial' : ''}${i === data.length - 1 ? ' is-last' : ''}`}
            >
              <title>{d.title}</title>
            </rect>
          );
        })}
      </svg>
      <span className="cwh-dst-ticks" aria-hidden="true" style={{ '--n': data.length }}>
        {data.map((d) => (
          <span key={d.key}>{d.tick || ''}</span>
        ))}
      </span>
      <figcaption className="cwh-dst-cap">{caption}</figcaption>
    </figure>
  );
}

/* ── per-dataset visuals ──────────────────────────────────────────── */

function TradesViz({ v }) {
  const rows = v?.trades || [];
  const now = new Date().toISOString().slice(0, 7);
  return (
    <Bars
      caption="Trades disclosed per month, last 12 months"
      data={rows.map((r) => {
        const m = Number(String(r.m).slice(5, 7)) - 1;
        return {
          key: r.m,
          v: Number(r.n) || 0,
          tick: MONTH[m],
          partial: r.m === now,
          title: `${MONTH_LONG[m]} ${String(r.m).slice(0, 4)}: ${Number(r.n).toLocaleString('en-US')} trades${r.m === now ? ' (month to date)' : ''}`,
        };
      })}
    />
  );
}

function ContractsViz({ v }) {
  const rows = v?.contracts || [];
  return (
    <Bars
      caption="Obligations per federal fiscal year"
      data={rows.map((r, i) => {
        /* Loaded before the fiscal year closed (Sep 30): a partial year. */
        const partial = Boolean(r.synced) && String(r.synced).slice(0, 10) < `${r.fy}-09-30`;
        return {
          key: r.fy,
          v: Number(r.total) || 0,
          tick: i === 0 || i === rows.length - 1 || i % 3 === 0 ? `FY${String(r.fy).slice(2)}` : '',
          partial,
          title: `FY${r.fy}: ${usd(r.total)} across ${Number(r.n).toLocaleString('en-US')} awards${partial ? ' (loaded before the year closed)' : ''}`,
        };
      })}
    />
  );
}

/* A quarter's filings are due 20 days after it ends; until then it is partial. */
function quarterOpen(y, q) {
  const end = new Date(Date.UTC(Number(y), Number(String(q).slice(1)) * 3, 0));
  return Date.now() < end.getTime() + 20 * 86400000;
}

function LobbyingViz({ v }) {
  const rows = v?.lobbying || [];
  return (
    <Bars
      caption="Reported lobbying spend per quarter"
      data={rows.map((r) => {
        const open = quarterOpen(r.y, r.q);
        return {
          key: `${r.y}${r.q}`,
          v: Number(r.spend) || 0,
          tick: `${String(r.q).toUpperCase()} ${String(r.y).slice(2)}`,
          partial: open,
          title: `${String(r.q).toUpperCase()} ${r.y}: ${usd(r.spend)}, ${Number(r.n).toLocaleString('en-US')} filings${open ? ' (filings still arriving)' : ''}`,
        };
      })}
    />
  );
}

const PARTY = { D: 'is-dem', R: 'is-rep', I: 'is-ind' };

function FinanceViz({ v }) {
  const f = v?.finance;
  const parts = (f?.byParty || []).filter((p) => Number(p.raised) > 0);
  const total = parts.reduce((s, p) => s + Number(p.raised), 0);
  if (!total) return null;
  return (
    <figure className="cwh-dst-viz">
      <div className="cwh-dst-split" role="img" aria-label="Money raised this cycle by party">
        {parts.map((p) => (
          <span
            key={p.party}
            className={PARTY[p.party] || 'is-ind'}
            style={{ flexGrow: Number(p.raised) }}
            title={`${p.party}: ${usd(p.raised)} raised by ${p.members} members`}
          />
        ))}
      </div>
      <div className="cwh-dst-split-legend">
        {parts.map((p) => (
          <span key={p.party}>
            <i className={PARTY[p.party] || 'is-ind'} aria-hidden="true" /> {p.party}{' '}
            <b className="cwh-mono">{Math.round((Number(p.raised) / total) * 100)}%</b>
          </span>
        ))}
      </div>
      <ol className="cwh-dst-top">
        {(f?.top || []).slice(0, 3).map((t) => (
          <li key={t.name}>
            <span className="cwh-dst-top-name">{t.name}</span>
            <span className={`cwh-party ${PARTY[t.party] || 'is-ind'}`}>{t.party}</span>
            <b className="cwh-mono">{usd(t.raised)}</b>
          </li>
        ))}
      </ol>
      <figcaption className="cwh-dst-cap">Raised by party, {f.cycle} cycle; top raisers</figcaption>
    </figure>
  );
}

function CommitteesViz({ v }) {
  const rows = v?.committees || [];
  const by = (ch) => rows.filter((r) => r.chamber === ch);
  const chambers = [
    ['house', 'House'],
    ['senate', 'Senate'],
  ].filter(([c]) => by(c).length);
  if (!chambers.length) return null;
  return (
    <figure className="cwh-dst-viz">
      {chambers.map(([c, label]) => {
        const list = by(c).sort((a, b) => String(a.party).localeCompare(String(b.party)));
        const seats = list.reduce((s, r) => s + Number(r.seats), 0);
        const members = list.reduce((s, r) => s + Number(r.members), 0);
        return (
          <div key={c} className="cwh-dst-chamber">
            <span className="cwh-dst-chamber-l">
              {label}
              <span className="cwh-mono cwh-faint"> {members}</span>
            </span>
            <div
              className="cwh-dst-split"
              role="img"
              aria-label={`${label} committee seats by party`}
            >
              {list.map((r) => (
                <span
                  key={r.party}
                  className={PARTY[r.party] || 'is-ind'}
                  style={{ flexGrow: Number(r.seats) }}
                  title={`${label} ${r.party}: ${r.seats} seats, ${r.members} members`}
                />
              ))}
            </div>
            <span className="cwh-mono cwh-dst-chamber-n">{seats.toLocaleString('en-US')}</span>
          </div>
        );
      })}
      <figcaption className="cwh-dst-cap">Committee seats by party; members in grey</figcaption>
    </figure>
  );
}

const VIZ = {
  'Politician Tracker': TradesViz,
  'Government Contracts': ContractsViz,
  'Lobbying Activity': LobbyingViz,
  'Campaign Finance Records': FinanceViz,
  'Committee Assignments': CommitteesViz,
};

/* ── the tile ─────────────────────────────────────────────────────── */

export function DatasetTile({ item, summary: s, visuals, index }) {
  const meta = META[item.label] || { icon: 'bi-database', tone: 'tracker', sub: '' };
  const ok = s && !s.empty && !s.error;
  const [lead, ...rest] = ok ? s.numbers || [] : [];
  const Viz = VIZ[item.label];
  const today = new Date().toISOString().slice(0, 10);
  const fresh = ok && s.freshest && s.freshest <= today ? s.freshest : null;
  return (
    <Link
      href={item.href}
      className={`cwh-dst cwh-dst--${meta.tone}`}
      aria-label={`Open ${item.label}`}
      title={item.description}
    >
      <span className="cwh-dst-head">
        <span className="cwh-dst-icon" aria-hidden="true">
          <i className={`bi ${meta.icon}`} />
        </span>
        <span className="cwh-dst-names">
          <span className="cwh-dst-name">{meta.name || item.label}</span>
          <span className="cwh-dst-sub">{meta.sub}</span>
        </span>
        <span className="cwh-dst-n cwh-mono" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      </span>

      {s?.error ? (
        <span className="cwh-caption">Figures unavailable just now</span>
      ) : !ok ? (
        <span className="cwh-caption">No records yet</span>
      ) : (
        <span className="cwh-dst-figs">
          <span className="cwh-dst-lead">
            <b className="cwh-mono">{fmt(lead.kind, lead.value) ?? DASH}</b>
            <span>{lead.label}</span>
          </span>
          <span className="cwh-dst-rest">
            {rest.slice(0, 2).map((x) => (
              <span key={x.label} className="cwh-dst-stat">
                <span className="cwh-dst-stat-l">{x.label}</span>
                <b className={x.kind === 'text' ? 'cwh-dst-stat-t' : 'cwh-mono'}>
                  {fmt(x.kind, x.value) ?? DASH}
                </b>
              </span>
            ))}
          </span>
        </span>
      )}

      {Viz && visuals && !visuals.error ? <Viz v={visuals} /> : null}

      <span className="cwh-dst-foot">
        <span className="cwh-dst-fresh">
          {fresh ? (
            <>
              <i className="cwh-dst-live" aria-hidden="true" /> Updated {fmt('date', fresh)}
            </>
          ) : (
            ''
          )}
        </span>
        <span className="cwh-dst-open">
          Open dataset <i className="bi bi-arrow-right" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

export function DatasetTileSkeleton({ item, index }) {
  const meta = META[item.label] || { icon: 'bi-database', tone: 'tracker', sub: '' };
  return (
    <div className={`cwh-dst cwh-dst--${meta.tone}`} aria-busy="true">
      <span className="cwh-dst-head">
        <span className="cwh-dst-icon" aria-hidden="true">
          <i className={`bi ${meta.icon}`} />
        </span>
        <span className="cwh-dst-names">
          <span className="cwh-dst-name">{meta.name || item.label}</span>
          <span className="cwh-dst-sub">{meta.sub}</span>
        </span>
        <span className="cwh-dst-n cwh-mono" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      </span>
      <span className="cwh-skel" />
      <span className="cwh-skel cwh-skel--short" />
      <span className="cwh-skel cwh-skel--chart cwh-dst-skel-viz" />
    </div>
  );
}

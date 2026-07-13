'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  LineChart,
  Vote,
  Clock,
  AlertTriangle,
  Lock,
  Archive,
  CircleDot,
  Inbox,
  CheckCircle2,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';

const VIEWS = [
  { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
  { id: 'tracker', label: 'Tracker', Icon: LineChart },
  { id: 'ic', label: 'IC Vote', Icon: Vote },
];

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

function pct(x) {
  if (x == null || Number.isNaN(x)) return '—';
  const v = x * 100;
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}
function money(x) {
  if (x == null || Number.isNaN(Number(x))) return '—';
  return `$${Number(x).toFixed(2)}`;
}
function ConvictionDots({ level }) {
  const n = Number(level) || 0;
  return (
    <span className="pw-conv" title={`Conviction ${n}/5`} aria-label={`Conviction ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  );
}

function PitchCard({ p }) {
  const upClass = p.upside == null ? 'pw-up-na' : p.upside >= 0 ? 'pw-up-pos' : 'pw-up-neg';
  return (
    <Link
      href={`/org-team-hub/pitches/${p.id}`}
      className={`pw-card${p.is_aging ? ' is-aging' : ''}${p.gate_block ? ' is-blocked' : ''}`}
    >
      <div className="pw-card-top">
        <span className="pw-ticker">{p.ticker}</span>
        <span className={`pw-upside ${upClass}`}>{p.upside == null ? '—' : pct(p.upside)}</span>
      </div>
      <div className="pw-company">
        {p.company_name}
        {p.sector ? ` · ${p.sector}` : ''}
      </div>
      {p.thesis_short && <div className="pw-thesis">{p.thesis_short}</div>}
      <div className="pw-card-meta">
        <span className="pw-chip">{p.analyst_name?.split(' ')[0] || 'Unassigned'}</span>
        <ConvictionDots level={p.conviction_level} />
        <span className={`pw-chip${p.is_aging ? ' is-amber' : ''}`}>
          <Clock size={11} />
          <span className="pw-num">{p.days_in_stage}d</span>
        </span>
        <span className="pw-chip">
          <span className="pw-num">{p.current_price == null ? '—' : money(p.current_price)}</span>
          {p.target_price != null && <span className="pw-num"> → {money(p.target_price)}</span>}
        </span>
        {p.catalyst_date && (
          <span className="pw-chip">
            <CalendarClock size={11} />
            {new Date(p.catalyst_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
      {p.gate_block && (
        <div className="pw-badge-block">
          <Lock size={11} /> {p.gate_block}
        </div>
      )}
    </Link>
  );
}

function KanbanView({ board }) {
  const archive = board.archive || [];
  const exitedCount = archive.filter((p) => p.stage === 'exited').length;
  const rejectedCount = archive.length - exitedCount;
  return (
    <>
      <div className="pw-board">
        {board.columns.map((col) => (
          <div key={col.id} className="pw-col">
            <div className="pw-col-head">
              <span className="pw-dot" style={{ background: col.token }} />
              <span className="pw-col-title">{col.label}</span>
              <span className="pw-col-count">{col.pitches.length}</span>
            </div>
            <div className="pw-col-body">
              {col.pitches.length === 0 ? (
                <div className="pw-col-empty">—</div>
              ) : (
                col.pitches.map((p) => <PitchCard key={p.id} p={p} />)
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pw-archive">
        <div className="pw-archive-head">
          <div className="pw-archive-head-l">
            <Archive size={13} />
            <span className="pw-archive-title">Archive</span>
            <span className="pw-archive-counts">
              <span className="pw-arc-count is-rejected">
                <span className="pw-num">{rejectedCount}</span> rejected
              </span>
              <span className="pw-arc-count is-exited">
                <span className="pw-num">{exitedCount}</span> exited
              </span>
            </span>
          </div>
          <Link href="/org-team-hub/pitch-archive" className="pw-archive-link">
            Open archive <ArrowRight size={13} />
          </Link>
        </div>
        {archive.length === 0 ? (
          <div className="pw-col-empty">Nothing archived yet.</div>
        ) : (
          <div className="pw-archive-row">
            {archive.map((p) => (
              <Link
                key={p.id}
                href={`/org-team-hub/pitches/${p.id}`}
                className={`pw-arc-card ${p.stage === 'exited' ? 'is-exited' : 'is-rejected'}`}
              >
                <div className="pw-card-top">
                  <span className="pw-ticker">{p.ticker}</span>
                  <span className="pw-company">{p.status_label}</span>
                </div>
                <div className="pw-arc-reason">
                  {p.archive_reason || p.decision_rationale || 'No reason recorded.'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function TrackerView({ data }) {
  if (!data.rows?.length) {
    return (
      <div className="pw-empty">
        <Inbox size={26} />
        <div>No live or portfolio pitches to track yet.</div>
      </div>
    );
  }
  return (
    <div className="pw-table-wrap">
      <table className="pw-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Stage</th>
            <th>Conviction</th>
            <th>Pitch price</th>
            <th>Current</th>
            <th>P&amp;L</th>
            <th>Target</th>
            <th>Upside</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/org-team-hub/pitches/${p.id}`}>{p.ticker}</Link>
              </td>
              <td style={{ textAlign: 'left', color: 'var(--text-muted)' }}>{p.stage_label}</td>
              <td className="num">{p.conviction_level || '—'}</td>
              <td className="num">{money(p.pitch_price)}</td>
              <td className="num">{p.current_price == null ? 'stale' : money(p.current_price)}</td>
              <td
                className="num"
                style={{ color: p.pnl_pct >= 0 ? 'var(--emerald-text)' : 'var(--pink)' }}
              >
                {pct(p.pnl_pct)}
              </td>
              <td className="num">{money(p.target_price)}</td>
              <td className="num">{pct(p.upside)}</td>
              <td>
                {p.review_due ? (
                  <span className="pw-flag">
                    <AlertTriangle size={12} /> Due
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-ghost)' }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Quorum({ q }) {
  const fill = q.needed ? Math.min(100, (q.castCount / q.needed) * 100) : 0;
  return (
    <div className={`pw-quorum${q.met ? ' met' : ''}`}>
      <CircleDot size={12} />
      <span className="pw-num">
        {q.castCount}/{q.needed}
      </span>
      quorum
      <span className="pw-quorum-bar">
        <span style={{ width: `${fill}%` }} />
      </span>
    </div>
  );
}

function IcView({ data, canManage, onScheduled }) {
  const [form, setForm] = useState({
    meets_at: '',
    ballot_type: 'open',
    threshold: 'simple',
    quorum_pct: 50,
  });
  const [busy, setBusy] = useState(false);

  const schedule = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/org/pitches/ic-meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onScheduled?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pw-ic">
      {canManage && (
        <div className="pw-meeting-form">
          <label>
            Meets at
            <input
              type="datetime-local"
              value={form.meets_at}
              onChange={(e) => setForm((f) => ({ ...f, meets_at: e.target.value }))}
            />
          </label>
          <label>
            Ballot
            <select
              value={form.ballot_type}
              onChange={(e) => setForm((f) => ({ ...f, ballot_type: e.target.value }))}
            >
              <option value="open">Open</option>
              <option value="blind">Blind</option>
            </select>
          </label>
          <label>
            Threshold
            <select
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
            >
              <option value="simple">Simple majority</option>
              <option value="supermajority">Supermajority</option>
            </select>
          </label>
          <label>
            Quorum %
            <input
              type="number"
              min="0"
              max="100"
              value={form.quorum_pct}
              onChange={(e) => setForm((f) => ({ ...f, quorum_pct: Number(e.target.value) }))}
            />
          </label>
          <button type="button" className="pw-btn" disabled={busy} onClick={schedule}>
            <CalendarClock size={14} /> Schedule IC meeting
          </button>
        </div>
      )}

      <div style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>
        Agenda auto-assembles from Pitch-Scheduled pitches · {data.eligible_voters} eligible IC
        voters
      </div>

      {!data.agenda?.length ? (
        <div className="pw-empty">
          <Vote size={26} />
          <div>No pitches scheduled for the Investment Committee.</div>
        </div>
      ) : (
        <div className="pw-ic-agenda">
          {data.agenda.map((p) => (
            <div key={p.id} className={`pw-ic-card${p.voting_open ? ' is-live' : ''}`}>
              <div className="pw-ic-top">
                <Link href={`/org-team-hub/pitches/${p.id}`} className="pw-ticker">
                  {p.ticker}
                </Link>
                {p.voting_open ? (
                  <span className="pw-live-dot">
                    <span className="pw-dot" /> Voting live
                  </span>
                ) : (
                  <span style={{ fontSize: '0.64rem', color: 'var(--text-faint)' }}>Scheduled</span>
                )}
              </div>
              <div className="pw-company">
                {p.company_name} · {p.analyst_name}
              </div>
              <div className="pw-tally">
                <div className="pw-tally-cell yes">
                  <span className="n">{p.vote_yes_count || 0}</span>
                  <span className="l">Buy</span>
                </div>
                <div className="pw-tally-cell no">
                  <span className="n">{p.vote_no_count || 0}</span>
                  <span className="l">Pass</span>
                </div>
                <div className="pw-tally-cell abs">
                  <span className="n">{p.vote_abstain_count || 0}</span>
                  <span className="l">Abstain</span>
                </div>
              </div>
              <Quorum q={p.quorum} />
              <Link href={`/org-team-hub/pitches/${p.id}`} className="pw-btn pw-btn--ghost">
                {p.voting_open ? 'Cast ballot' : 'Open record'}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PitchWorkspace({ refreshKey = 0, initialData = null }) {
  const { orgData } = useOrg();
  const role = orgData?.member?.role || 'analyst';
  const canManage = MANAGER_ROLES.includes(role);

  const [view, setView] = useState('kanban');
  // Seed from the server-rendered kanban payload (first paint has data); the
  // client fetch below stays the authoritative refetch path for every change.
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [sector, setSector] = useState('');
  const [analyst, setAnalyst] = useState('');
  const [conviction, setConviction] = useState('');
  const [aging, setAging] = useState('');
  const [icNonce, setIcNonce] = useState(0);
  // When seeded, skip exactly the first mount fetch (view is still the default
  // 'kanban' the server rendered). Any later view/refresh change refetches.
  const skipInitialFetch = useRef(!!initialData);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ view });
    return fetch(`/api/org/pitches/board?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [view]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    let cancelled = false;
    load().then(() => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey, icNonce]);

  // Filter option sets (derived from whatever the board returned; honest-empty).
  const { sectors, analysts } = useMemo(() => {
    const pool = data?.columns?.flatMap((c) => c.pitches) || data?.rows || data?.agenda || [];
    const withArchive = [...pool, ...(data?.archive || [])];
    return {
      sectors: [...new Set(withArchive.map((p) => p.sector).filter(Boolean))].sort(),
      analysts: [...new Set(withArchive.map((p) => p.analyst_name).filter(Boolean))].sort(),
    };
  }, [data]);

  const applyFilters = useCallback(
    (list = []) =>
      list.filter(
        (p) =>
          (!sector || p.sector === sector) &&
          (!analyst || p.analyst_name === analyst) &&
          (!conviction || Number(p.conviction_level) === Number(conviction)) &&
          (!aging || p.is_aging),
      ),
    [sector, analyst, conviction, aging],
  );

  const filteredBoard = useMemo(() => {
    if (view !== 'kanban' || !data?.columns) return data;
    return {
      ...data,
      columns: data.columns.map((c) => ({ ...c, pitches: applyFilters(c.pitches) })),
      archive: applyFilters(data.archive || []),
    };
  }, [data, view, applyFilters]);

  const filteredTracker = useMemo(() => {
    if (view !== 'tracker' || !data?.rows) return data;
    return { ...data, rows: applyFilters(data.rows) };
  }, [data, view, applyFilters]);

  const agingCount = useMemo(
    () => (data?.columns?.flatMap((c) => c.pitches) || []).filter((p) => p.is_aging).length,
    [data],
  );

  return (
    <div className="pw">
      {view === 'kanban' && (
        <div className="pw-rollup">
          <div className="pw-stat">
            <span className="pw-stat-label">Active pitches</span>
            <span className="pw-stat-value">{data?.total_active ?? 0}</span>
          </div>
          <div className="pw-stat">
            <span className="pw-stat-label">In portfolio</span>
            <span className="pw-stat-value">{data?.portfolio_count ?? 0}</span>
          </div>
          <div className="pw-stat">
            <span className="pw-stat-label">Aging &gt;30d</span>
            <span className={`pw-stat-value${agingCount ? ' is-amber' : ''}`}>{agingCount}</span>
          </div>
          <div className="pw-stat">
            <span className="pw-stat-label">Archived</span>
            <span className="pw-stat-value">{data?.archive?.length ?? 0}</span>
          </div>
        </div>
      )}

      <div className="pw-toolbar">
        <div className="pw-toggle" role="tablist" aria-label="Pipeline view">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={view === id ? 'is-active' : ''}
              onClick={() => setView(id)}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {(view === 'kanban' || view === 'tracker') && (
          <div className="pw-toolbar-right">
            <div className="pw-filters">
              {data?.stale && (
                <span className="pw-stale">
                  <AlertTriangle size={12} /> Prices stale (FMP unavailable)
                </span>
              )}
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                aria-label="Sector"
              >
                <option value="">All sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={analyst}
                onChange={(e) => setAnalyst(e.target.value)}
                aria-label="Analyst"
              >
                <option value="">All analysts</option>
                {analysts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <select
                value={conviction}
                onChange={(e) => setConviction(e.target.value)}
                aria-label="Conviction"
              >
                <option value="">Any conviction</option>
                {[5, 4, 3, 2, 1].map((c) => (
                  <option key={c} value={c}>
                    {c}★ conviction
                  </option>
                ))}
              </select>
              <select value={aging} onChange={(e) => setAging(e.target.value)} aria-label="Aging">
                <option value="">All ages</option>
                <option value="aging">Aging &gt;30d</option>
              </select>
            </div>
            {view === 'kanban' && (
              <div className="pw-summary" aria-live="polite">
                <span className="pw-num">{data?.total_active ?? 0}</span> active
                <span className="pw-summary-sep">·</span>
                <span className={`pw-summary-aging${agingCount ? ' is-amber' : ''}`}>
                  <span className="pw-num">{agingCount}</span> aging &gt;30d
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="pw-board">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="pw-col">
              <div className="pw-skeleton" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <div className="pw-empty">
          <AlertTriangle size={26} />
          <div>Could not load the pipeline.</div>
        </div>
      ) : view === 'kanban' ? (
        (filteredBoard?.total_active ?? 0) === 0 && (filteredBoard?.archive?.length ?? 0) === 0 ? (
          <div className="pw-empty">
            <CheckCircle2 size={26} />
            <div>No pitches yet. Submit the first idea to seed the pipeline.</div>
          </div>
        ) : (
          <KanbanView board={filteredBoard} />
        )
      ) : view === 'tracker' ? (
        <TrackerView data={filteredTracker} />
      ) : (
        <IcView data={data} canManage={canManage} onScheduled={() => setIcNonce((n) => n + 1)} />
      )}
    </div>
  );
}

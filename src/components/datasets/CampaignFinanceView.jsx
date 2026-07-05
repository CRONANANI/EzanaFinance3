'use client';

/**
 * Campaign Finance (FEC / OpenFEC) — the SHARED campaign-finance view. This is
 * the single source of the Money-Map strip, Top Raisers, Top Donor Industries,
 * and Outside Money cards plus the per-member drill-down. It is rendered both:
 *   - inside the Political Trade Tracker (as an additive section below trades),
 *     where the host passes `onSelectMember` so a row opens the full member
 *     modal that page already owns; and
 *   - as the primary content of the standalone /datasets/campaignfinancerecords
 *     page, where no `onSelectMember` is passed and this component opens its own
 *     focused campaign-finance drill-down modal.
 *
 * Reads the cached FEC routes (Supabase-first, honest empties). NO mock data.
 * Neutral presentation: amounts, mixes, donor industries only; source + cycle
 * labeled on every card. Reuses the shared headshot resolver + pol-campaign-
 * finance.css — no forked section logic.
 */
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { resolveHeadshot } from '@/lib/politicians/headshots';
import '@/app/datasets/political/pol-campaign-finance.css';

const FEC_CYCLES = [2026, 2024];

/* ── shared presentational primitives (party / headshot / money) ── */
const PARTIES = {
  Democrat: { code: 'D', color: 'var(--info)' },
  Republican: { code: 'R', color: 'var(--negative)' },
  Independent: { code: 'I', color: 'var(--purple)' },
};
const partyMeta = (p) => PARTIES[p] || { code: '?', color: 'var(--text-faint)' };
const PARTY_WORD = { D: 'Democrat', R: 'Republican', I: 'Independent' };

function fmtUSD(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
const fmtMoney = fmtUSD;

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* 26px table avatar — shared resolver + onError + party ring. */
function MiniAvatar({ name, bioguideId, party }) {
  const pm = partyMeta(party);
  const shot = resolveHeadshot({ name, bioguideId });
  const [failed, setFailed] = useState(false);
  const showImg = shot && !failed;
  return (
    <span className="ptx-mini-avatar" style={{ borderColor: pm.color }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shot.src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function useFec(url, deps) {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null });
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setState({ loading: false, data: d }))
      .catch(() => alive && setState({ loading: false, data: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/* ═══════════════════════════ shared view ═══════════════════════════ */

/**
 * @param {{members?:Array, onSelectMember?:(row)=>void}} props
 *   members   optional bioguide→member index source (political page provides its
 *             trades-derived members so a row reopens the full member modal).
 *   onSelectMember  optional host handler; when omitted this view manages its own
 *             focused campaign-finance drill-down modal.
 */
export function CampaignFinanceView({ members = [], onSelectMember }) {
  const [cycle, setCycle] = useState(2026);
  const [ownSelected, setOwnSelected] = useState(null);

  const byBioguide = useMemo(() => {
    const m = new Map();
    for (const mem of members) if (mem.bioguideId) m.set(mem.bioguideId, mem);
    return m;
  }, [members]);

  const openMember = (row) => {
    if (onSelectMember) {
      const existing = row.bioguideId && byBioguide.get(row.bioguideId);
      if (existing) return onSelectMember(existing);
      return onSelectMember({
        name: row.name,
        party: row.party,
        chamber: row.office === 'S' ? 'Senate' : row.office === 'H' ? 'House' : '—',
        state: row.state || null,
        bioguideId: row.bioguideId || null,
        trades: [],
        count: 0,
        excess: null,
      });
    }
    // no host handler → open our own focused drill-down
    setOwnSelected({
      name: row.name,
      party: PARTY_WORD[row.party] || row.party,
      office: row.office,
      state: row.state || null,
      bioguideId: row.bioguideId || null,
    });
  };

  return (
    <section className="pcf-section" aria-label="Campaign finance">
      <div className="pcf-section-head">
        <h2 className="pcf-title">Campaign finance · {cycle}</h2>
        <span className="pcf-source">Source: FEC · api.open.fec.gov</span>
      </div>

      <div className="pcf-controls" style={{ marginBottom: 16 }}>
        <span className="pcf-card-note">Cycle</span>
        <div className="pcf-toggle" role="group" aria-label="Election cycle">
          {FEC_CYCLES.map((c) => (
            <button
              key={c}
              type="button"
              className={`pcf-toggle-btn${c === cycle ? ' is-active' : ''}`}
              aria-pressed={c === cycle}
              onClick={() => setCycle(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <MoneyMapStrip cycle={cycle} />
      <TopRaisersCard cycle={cycle} onSelectMember={openMember} />
      <div className="pcf-grid" style={{ marginTop: 16 }}>
        <DonorIndustriesCard cycle={cycle} />
        <OutsideMoneyCard cycle={cycle} onSelectMember={openMember} />
      </div>

      {!onSelectMember && ownSelected ? (
        <CampaignFinanceMemberModal
          member={ownSelected}
          cycle={cycle}
          onClose={() => setOwnSelected(null)}
        />
      ) : null}
    </section>
  );
}

function MoneyMapStrip({ cycle }) {
  const { loading, data } = useFec(`/api/fec/top-raisers?cycle=${cycle}`, [cycle]);
  const mm = data?.moneyMap || {};
  const cards = [
    { label: 'Total raised', value: mm.totalRaised, sub: 'Tracked members' },
    { label: 'Total PAC money', value: mm.totalPac, sub: 'Committee contributions' },
    { label: 'Avg cash on hand', value: mm.avgCashOnHand, sub: 'Per member with filings' },
    {
      label: 'Members with filings',
      value: mm.membersWithFilings,
      sub: `Cycle ${cycle}`,
      count: true,
    },
  ];
  return (
    <div className="pcf-strip">
      {cards.map((c) => (
        <div key={c.label} className="pcf-stat">
          <div className="pcf-stat-label">{c.label}</div>
          <div className="pcf-stat-value">
            {loading ? '—' : c.count ? Number(c.value || 0) : fmtMoney(c.value)}
          </div>
          <div className="pcf-stat-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

function TopRaisersCard({ cycle, onSelectMember }) {
  const [office, setOffice] = useState(''); // '', 'H', 'S'
  const [sortKey, setSortKey] = useState('raised'); // 'raised' | 'cashOnHand'
  const { loading, data } = useFec(
    `/api/fec/top-raisers?cycle=${cycle}${office ? `&office=${office}` : ''}`,
    [cycle, office],
  );
  const raisers = useMemo(() => {
    const list = [...(data?.raisers || [])];
    list.sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    return list.slice(0, 25);
  }, [data, sortKey]);

  return (
    <section className="pcf-card pcf-card--wide">
      <div className="pcf-card-head">
        <h3 className="pcf-card-title">Top raisers · {cycle}</h3>
        <div className="pcf-controls">
          <div className="pcf-toggle" role="group" aria-label="Chamber filter">
            {[
              ['', 'All'],
              ['H', 'House'],
              ['S', 'Senate'],
            ].map(([val, label]) => (
              <button
                key={label}
                type="button"
                className={`pcf-toggle-btn${office === val ? ' is-active' : ''}`}
                aria-pressed={office === val}
                onClick={() => setOffice(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="pcf-table-wrap">
        <table className="pcf-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Member</th>
              <th>Party</th>
              <th>Seat</th>
              <th
                className="r sortable"
                onClick={() => setSortKey('raised')}
                aria-sort={sortKey === 'raised' ? 'descending' : 'none'}
              >
                Raised {sortKey === 'raised' ? '▾' : ''}
              </th>
              <th
                className="r sortable"
                onClick={() => setSortKey('cashOnHand')}
                aria-sort={sortKey === 'cashOnHand' ? 'descending' : 'none'}
              >
                Cash on hand {sortKey === 'cashOnHand' ? '▾' : ''}
              </th>
              <th>Individual vs PAC</th>
            </tr>
          </thead>
          <tbody>
            {raisers.map((r, i) => {
              const pm = partyMeta(PARTY_WORD[r.party] || 'Unknown');
              const indPct = r.individualShare != null ? Math.round(r.individualShare * 100) : null;
              const pacPct = r.pacShare != null ? Math.round(r.pacShare * 100) : null;
              return (
                <tr
                  key={r.bioguideId || r.name || i}
                  className="pcf-row"
                  onClick={() => onSelectMember(r)}
                >
                  <td>
                    <span className="pcf-rank">{i + 1}</span>
                  </td>
                  <td>
                    <span className="pcf-member">
                      <MiniAvatar
                        name={r.name}
                        bioguideId={r.bioguideId}
                        party={PARTY_WORD[r.party]}
                      />
                      <span className="pcf-member-name">{r.name || '—'}</span>
                    </span>
                  </td>
                  <td>
                    <span className="pcf-badge" style={{ background: pm.color }}>
                      {pm.code}
                    </span>
                  </td>
                  <td className="pcf-member-sub">
                    {r.office === 'S' ? 'Senate' : r.office === 'H' ? 'House' : '—'}
                    {r.state ? ` · ${r.state}` : ''}
                  </td>
                  <td className="pcf-mono r">{fmtMoney(r.raised)}</td>
                  <td className="pcf-mono r">{fmtMoney(r.cashOnHand)}</td>
                  <td>
                    {indPct == null ? (
                      <span className="pcf-muted">—</span>
                    ) : (
                      <span className="pcf-mix">
                        <span
                          className="pcf-mixbar"
                          title={`${indPct}% individual · ${pacPct}% PAC`}
                        >
                          <span className="pcf-mixbar-ind" style={{ width: `${indPct}%` }} />
                          <span className="pcf-mixbar-pac" style={{ width: `${pacPct}%` }} />
                        </span>
                        <span className="pcf-mix-legend">
                          {indPct}/{pacPct}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && raisers.length === 0 && (
              <tr>
                <td colSpan={7} className="pcf-empty">
                  No campaign-finance filings ingested for this cycle yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="pcf-empty">
                  Loading FEC totals…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pcf-modal-sub" style={{ marginTop: 8 }}>
        <span className="pcf-mix-dot" style={{ background: 'var(--info,#3b82f6)' }} />
        Individual itemized
        <span
          className="pcf-mix-dot"
          style={{ background: 'var(--warning,#d97706)', marginLeft: 12 }}
        />
        PAC (other committee) · Source: FEC · api.open.fec.gov · cycle {cycle}
      </p>
    </section>
  );
}

function DonorIndustriesCard({ cycle }) {
  const [by, setBy] = useState('occupation'); // 'occupation' | 'employer'
  const { loading, data } = useFec(`/api/fec/donor-industries?cycle=${cycle}&by=${by}`, [
    cycle,
    by,
  ]);
  const rows = (data?.industries || []).slice(0, 10);
  return (
    <section className="pcf-card">
      <div className="pcf-card-head">
        <h3 className="pcf-card-title">Top donor industries · {cycle}</h3>
        <div className="pcf-toggle" role="group" aria-label="Group donors by">
          {[
            ['occupation', 'Occupation'],
            ['employer', 'Employer'],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`pcf-toggle-btn${by === val ? ' is-active' : ''}`}
              aria-pressed={by === val}
              onClick={() => setBy(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="pcf-table-wrap">
        <table className="pcf-table">
          <thead>
            <tr>
              <th>{by === 'employer' ? 'Employer' : 'Occupation'}</th>
              <th className="r">Total</th>
              <th className="r">Members</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td className="pcf-mono r">{fmtMoney(r.total)}</td>
                <td className="pcf-mono r">{r.members}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="pcf-empty">
                  No donor-industry data ingested for this cycle yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={3} className="pcf-empty">
                  Loading donor industries…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pcf-modal-foot">
        Aggregate of Schedule A {by} across tracked members. Source: FEC · api.open.fec.gov
      </p>
    </section>
  );
}

function OutsideMoneyCard({ cycle, onSelectMember }) {
  const { loading, data } = useFec(`/api/fec/outside-leaders?cycle=${cycle}`, [cycle]);
  const rows = (data?.leaders || []).slice(0, 10);
  return (
    <section className="pcf-card">
      <div className="pcf-card-head">
        <h3 className="pcf-card-title">Outside money · {cycle}</h3>
        <span className="pcf-card-note">Independent expenditures</span>
      </div>
      <div className="pcf-table-wrap">
        <table className="pcf-table">
          <thead>
            <tr>
              <th>Member</th>
              <th className="r">For</th>
              <th className="r">Against</th>
              <th className="r">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.bioguideId || r.name}
                className="pcf-row"
                onClick={() => onSelectMember(r)}
              >
                <td>
                  <span className="pcf-member">
                    <MiniAvatar
                      name={r.name}
                      bioguideId={r.bioguideId}
                      party={PARTY_WORD[r.party]}
                    />
                    <span className="pcf-member-name">{r.name || '—'}</span>
                  </span>
                </td>
                <td className="pcf-mono r pcf-pos">{fmtMoney(r.forAmount)}</td>
                <td className="pcf-mono r pcf-neg">{fmtMoney(r.againstAmount)}</td>
                <td className={`pcf-mono r ${r.net >= 0 ? 'pcf-pos' : 'pcf-neg'}`}>
                  {r.net >= 0 ? '+' : '−'}
                  {fmtMoney(Math.abs(r.net))}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="pcf-empty">
                  No independent-expenditure data ingested for this cycle yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={4} className="pcf-empty">
                  Loading outside money…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="pcf-modal-foot">
        Schedule E independent expenditures for/against. Source: FEC · api.open.fec.gov
      </p>
    </section>
  );
}

/* ── Campaign-finance block for a member modal (FEC / OpenFEC). Fetches the
   member's totals + donors + outside money by bioguideId; honest empty for a
   member without filings (or without a bioguide to resolve). Neutral: amounts,
   mix, donor industries only. Exported so the Political Trade Tracker's own
   member modal renders the SAME block. ── */
export function MemberCampaignFinance({ member: m, cycle = 2026 }) {
  const [state, setState] = useState({ loading: true, finance: null, donors: null, outside: null });

  useEffect(() => {
    if (!m.bioguideId) {
      setState({ loading: false, finance: null, donors: null, outside: null });
      return;
    }
    let alive = true;
    const q = `bioguideId=${encodeURIComponent(m.bioguideId)}&cycle=${cycle}`;
    Promise.all([
      fetch(`/api/fec/member-finance?${q}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/fec/member-donors?${q}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/fec/outside-money?${q}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([f, d, o]) => {
        if (!alive) return;
        setState({
          loading: false,
          finance: f?.finance || null,
          donors: d || null,
          outside: o?.outside || null,
        });
      })
      .catch(
        () => alive && setState({ loading: false, finance: null, donors: null, outside: null }),
      );
    return () => {
      alive = false;
    };
  }, [m.bioguideId, cycle]);

  const { loading, finance, donors, outside } = state;

  const sizeSplit = useMemo(() => {
    const buckets = finance?.sizeBuckets || [];
    let small = 0;
    let large = 0;
    for (const b of buckets) {
      if (Number(b.size) < 200) small += Number(b.total) || 0;
      else large += Number(b.total) || 0;
    }
    const tot = small + large;
    return tot > 0 ? { smallPct: Math.round((small / tot) * 100), small, large } : null;
  }, [finance]);

  return (
    <div className="pcf-modal-block">
      <div className="pcf-modal-h">
        <span>Campaign finance</span>
        <span style={{ fontWeight: 600, color: 'var(--text-faint)' }}>{cycle}</span>
      </div>

      {loading ? (
        <div className="pcf-modal-sub">Loading FEC data…</div>
      ) : !finance ? (
        <div className="pcf-modal-sub">
          No FEC campaign-finance filings found for this member this cycle.
        </div>
      ) : (
        <>
          <div className="pcf-modal-grid">
            <div className="pcf-modal-stat">
              <div className="pcf-modal-stat-label">Raised</div>
              <div className="pcf-modal-stat-value">{fmtUSD(finance.raised)}</div>
            </div>
            <div className="pcf-modal-stat">
              <div className="pcf-modal-stat-label">Spent</div>
              <div className="pcf-modal-stat-value">{fmtUSD(finance.spent)}</div>
            </div>
            <div className="pcf-modal-stat">
              <div className="pcf-modal-stat-label">Cash on hand</div>
              <div className="pcf-modal-stat-value">{fmtUSD(finance.cashOnHand)}</div>
            </div>
          </div>

          {(() => {
            const ind = Number(finance.individualItemized) || 0;
            const pac = Number(finance.pac) || 0;
            const mix = ind + pac;
            if (mix <= 0) return null;
            const indPct = Math.round((ind / mix) * 100);
            return (
              <div style={{ marginBottom: 10 }}>
                <div className="pcf-modal-stat-label" style={{ marginBottom: 4 }}>
                  Individual vs PAC
                </div>
                <span className="pcf-mix">
                  <span className="pcf-mixbar">
                    <span className="pcf-mixbar-ind" style={{ width: `${indPct}%` }} />
                    <span className="pcf-mixbar-pac" style={{ width: `${100 - indPct}%` }} />
                  </span>
                  <span className="pcf-mix-legend">
                    {indPct}% indiv · {100 - indPct}% PAC
                  </span>
                </span>
              </div>
            );
          })()}

          {sizeSplit && (
            <p className="pcf-modal-sub">
              Small-dollar (&lt;$200): {fmtUSD(sizeSplit.small)} ({sizeSplit.smallPct}%) · Larger:{' '}
              {fmtUSD(sizeSplit.large)}
            </p>
          )}

          {finance.topStates?.length ? (
            <>
              <div className="pcf-modal-stat-label" style={{ marginTop: 10, marginBottom: 4 }}>
                Top donor states
              </div>
              <div className="pcf-modal-list">
                {finance.topStates.slice(0, 5).map((s) => (
                  <div className="pcf-modal-list-row" key={s.state}>
                    <span>{s.stateFull || s.state}</span>
                    <span className="pcf-mono">{fmtUSD(s.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {donors?.byOccupation?.length ? (
            <>
              <div className="pcf-modal-stat-label" style={{ marginTop: 10, marginBottom: 4 }}>
                Top donor occupations
              </div>
              <div className="pcf-modal-list">
                {donors.byOccupation.slice(0, 5).map((o) => (
                  <div className="pcf-modal-list-row" key={o.occupation}>
                    <span>{o.occupation}</span>
                    <span className="pcf-mono">{fmtUSD(o.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {outside && (outside.supportTotal > 0 || outside.opposeTotal > 0) ? (
            <p className="pcf-modal-sub" style={{ marginTop: 10 }}>
              Outside money — for: <span className="pcf-pos">{fmtUSD(outside.supportTotal)}</span> ·
              against: <span className="pcf-neg">{fmtUSD(outside.opposeTotal)}</span>
            </p>
          ) : null}
        </>
      )}

      <div className="pcf-modal-foot">Source: FEC · api.open.fec.gov</div>
    </div>
  );
}

/* Focused drill-down modal used by the standalone page (the political page has
   its own richer member modal). Header + the shared MemberCampaignFinance block. */
function CampaignFinanceMemberModal({ member: m, cycle, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);
  const pm = partyMeta(m.party);
  return (
    <div className="pcf-cfm-backdrop" onClick={onClose}>
      <div className="pcf-cfm" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="pcf-cfm-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="pcf-cfm-head">
          <MiniAvatar name={m.name} bioguideId={m.bioguideId} party={m.party} />
          <div>
            <div className="pcf-cfm-name">{m.name || '—'}</div>
            <div className="pcf-cfm-sub">
              <span className="pcf-badge" style={{ background: pm.color }}>
                {pm.code}
              </span>{' '}
              {m.office === 'S' ? 'Senate' : m.office === 'H' ? 'House' : ''}
              {m.state ? ` · ${m.state}` : ''}
            </div>
          </div>
        </div>
        <MemberCampaignFinance member={m} cycle={cycle} />
      </div>
    </div>
  );
}

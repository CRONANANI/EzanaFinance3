'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, UserCog } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { OrgMemberProfileModal } from '@/components/org/OrgMemberProfileModal';
import './org-final.css';

/* ── helpers ──────────────────────────────────────────────────── */
function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
function fmtCompactMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v)}`;
}
function fmtSignedPct(n, digits = 1) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}%`;
}
function longDate(d = new Date()) {
  return d
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}
function toModalMember(m) {
  if (!m) return null;
  return {
    id: m.id,
    name: m.display_name || 'Unnamed',
    role: m.role,
    sub_role: m.sub_role || null,
    email: m.email || null,
    team_id: m.team_id || null,
    title: m.title || null,
  };
}
async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function Avatar({ member, cls, size = 26, fs }) {
  return (
    <div
      className={`ox-av ${cls || 'an'}`}
      style={{ width: size, height: size, fontSize: fs || 8.5 }}
    >
      {initials(member.display_name)}
    </div>
  );
}

function Skel({ w = 80, h = 14, style }) {
  return (
    <span className="ox-skel" style={{ display: 'inline-block', width: w, height: h, ...style }} aria-hidden="true" />
  );
}

/* ── page ─────────────────────────────────────────────────────── */
export function OrgFinalClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { isOrgUser, isLoading, fundName, universityName } = useOrg();

  const [chart, setChart] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | exec | pm | an
  const [profileId, setProfileId] = useState(null);
  const [editId, setEditId] = useState(null); // member whose role popover is open
  const [pendingTier, setPendingTier] = useState(null);
  const [saving, setSaving] = useState(false);
  const editRef = useRef(null);

  useEffect(() => {
    if (!isOrgUser || isLoading) return undefined;
    let alive = true;
    (async () => {
      const [c, s] = await Promise.allSettled([
        fetchJson('/api/org/chart'),
        fetchJson('/api/org/team-hub/summary'),
      ]);
      if (!alive) return;
      setChart(c.status === 'fulfilled' ? c.value : null);
      setSummary(s.status === 'fulfilled' ? s.value : null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [isOrgUser, isLoading]);

  // Close the role popover on outside click.
  useEffect(() => {
    if (!editId) return undefined;
    const onDoc = (e) => {
      if (editRef.current && !editRef.current.contains(e.target)) {
        setEditId(null);
        setPendingTier(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [editId]);

  /* ── derivations ── */
  const members = chart?.members || [];
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const tierById = useMemo(() => new Map((chart?.tiers || []).map((t) => [t.id, t])), [chart]);
  const tierOf = useCallback((m) => tierById.get(m?.tier) || { cls: 'an', short: '', rank: 6, label: '' }, [tierById]);
  const clsOf = useCallback((m) => tierOf(m).cls, [tierOf]);
  const rankOf = useCallback((m) => tierOf(m).rank ?? 6, [tierOf]);
  const childrenOf = useCallback(
    (id) =>
      members
        .filter((m) => m.reports_to === id)
        .sort((a, b) => rankOf(a) - rankOf(b) || (a.display_name || '').localeCompare(b.display_name || '')),
    [members, rankOf],
  );

  const president = useMemo(
    () =>
      members.find((m) => m.tier === 'president') ||
      [...members].filter((m) => !m.reports_to).sort((a, b) => rankOf(a) - rankOf(b))[0] ||
      null,
    [members, rankOf],
  );
  const vp = useMemo(() => members.find((m) => m.tier === 'vice_president') || null, [members]);
  const execs = useMemo(
    () => members.filter((m) => m.tier === 'executive').sort((a, b) => rankOf(a) - rankOf(b)),
    [members, rankOf],
  );
  const leadership = useMemo(() => members.filter((m) => clsOf(m) === 'exec'), [members, clsOf]);

  // Desks from the team-hub summary (name / roi / value), members joined by team_id.
  const deskSectors = summary?.sectors || [];
  const desks = useMemo(() => {
    return deskSectors.map((s) => {
      const onDesk = members.filter((m) => m.team_id === s.teamId);
      const sorted = [...onDesk].sort((a, b) => rankOf(a) - rankOf(b));
      const lead = sorted[0] || null;
      const analysts = lead ? sorted.slice(1) : [];
      const overseer = lead?.reports_to ? byId.get(lead.reports_to) : null;
      const exec = overseer && clsOf(overseer) === 'exec' ? overseer : null;
      return { ...s, members: sorted, lead, analysts, exec };
    });
  }, [deskSectors, members, byId, rankOf, clsOf]);

  const perf = summary?.performance || null;
  const roiValues = desks.map((d) => d.roiPct).filter((r) => r != null && Number.isFinite(r));
  const topDesk = useMemo(
    () => desks.filter((d) => d.roiPct != null).sort((a, b) => b.roiPct - a.roiPct)[0] || null,
    [desks],
  );
  const stats = {
    members: members.length,
    desks: desks.length,
    leadership: leadership.length,
    topRoi: roiValues.length ? Math.max(...roiValues) : null,
    avgRoi: roiValues.length ? roiValues.reduce((a, b) => a + b, 0) / roiValues.length : null,
  };

  const orgName = summary?.org?.name || chart?.universityName || 'Investment Council';
  const canManage = Boolean(chart?.viewer?.canManage);
  const viewerMemberId = chart?.viewer?.memberId || null;
  const assignable = (chart?.viewer?.assignableTiers || []).filter((t) => tierById.has(t));

  /* ── role edit ── */
  const openProfile = (m) => setProfileId(m?.id || null);
  const openEdit = (m) => {
    setEditId(m.id);
    setPendingTier(m.tier);
  };
  const saveRole = async (target) => {
    if (!target || !pendingTier || pendingTier === target.tier) {
      setEditId(null);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/org/members/${target.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: pendingTier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update role');
      setChart((c) => ({
        ...c,
        members: c.members.map((m) => (m.id === target.id ? { ...m, ...data.member } : m)),
      }));
      toast.success(`${target.display_name} is now ${tierById.get(pendingTier)?.label || pendingTier}`);
      setEditId(null);
      setPendingTier(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── guards ── */
  if (isLoading) {
    return <div className="ox-root" style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading organization…</div>;
  }
  if (!isOrgUser) {
    return (
      <div className="ox-root" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        This page is for organizational members only.
      </div>
    );
  }

  /* ── building blocks ── */
  const Node = ({ m, big }) =>
    m ? (
      <button
        type="button"
        className={`ox-node${big ? ' big' : ''}`}
        onClick={() => openProfile(m)}
      >
        <Avatar member={m} cls={clsOf(m)} size={big ? 38 : 26} fs={big ? 11 : 8.5} />
        <div style={{ minWidth: 0 }}>
          <div className="ox-node-nm">{m.display_name}</div>
          <div className="ox-node-rl">{m.title || tierOf(m).label}</div>
        </div>
      </button>
    ) : null;

  const TierChip = ({ m }) => {
    const t = tierOf(m);
    const editable = m.editable && assignable.length > 0;
    if (!editable) {
      return (
        <span className={`oxr-tier ${t.cls}`}>
          <span className={`ox-dot ${t.cls}`} />
          {t.short}
        </span>
      );
    }
    const open = editId === m.id;
    return (
      <span className="oxr-tier-wrap" ref={open ? editRef : null}>
        <button
          type="button"
          className={`oxr-tier ${t.cls} editable`}
          onClick={(e) => {
            e.stopPropagation();
            if (open) {
              setEditId(null);
            } else {
              openEdit(m);
            }
          }}
          title="Change role"
        >
          <span className={`ox-dot ${t.cls}`} />
          {t.short}
          <UserCog size={11} strokeWidth={1.8} />
        </button>
        {open && (
          <div className="oxr-rolepop" onClick={(e) => e.stopPropagation()}>
            <div className="oxr-rolepop-head">Change role — {m.display_name}</div>
            {(chart?.tiers || [])
              .filter((t2) => assignable.includes(t2.id) || t2.id === m.tier)
              .map((t2) => {
                const checked = (pendingTier || m.tier) === t2.id;
                const disabled = !assignable.includes(t2.id) && t2.id !== m.tier;
                return (
                  <button
                    key={t2.id}
                    type="button"
                    className={`oxr-roleopt${checked ? ' sel' : ''}`}
                    disabled={disabled || saving}
                    onClick={() => setPendingTier(t2.id)}
                  >
                    <span className={`ox-dot ${t2.cls}`} />
                    {t2.label}
                    {t2.id === m.tier && <span className="oxr-roleopt-now">CURRENT</span>}
                    {checked && t2.id !== m.tier && (
                      <Check size={12} strokeWidth={2} style={{ marginLeft: 'auto', color: 'var(--emerald)' }} />
                    )}
                  </button>
                );
              })}
            <div className="oxr-rolepop-foot">
              <button
                type="button"
                className="oxr-rolebtn ghost"
                onClick={() => {
                  setEditId(null);
                  setPendingTier(null);
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="oxr-rolebtn"
                onClick={() => saveRole(m)}
                disabled={saving || !pendingTier || pendingTier === m.tier}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </span>
    );
  };

  const RosterRow = ({ m, lead }) => {
    const mgr = m.reports_to ? byId.get(m.reports_to) : null;
    const isSelf = m.id === viewerMemberId;
    return (
      <div className={`oxr-row${lead ? ' oxr-lead-row' : ''}${isSelf ? ' oxr-self' : ''}`}>
        <button type="button" className="oxr-row-member" onClick={() => openProfile(m)}>
          <Avatar member={m} cls={clsOf(m)} size={28} fs={8.5} />
          <span style={{ minWidth: 0 }}>
            <span className="oxr-row-nm">{m.display_name}</span>
            <span className="oxr-row-rl">{m.title || tierOf(m).label}</span>
          </span>
        </button>
        <span className="oxr-row-mgr">{mgr ? mgr.display_name : '—'}</span>
        <TierChip m={m} />
      </div>
    );
  };

  /* ── desk card (chart band 3) ── */
  const DeskCard = ({ d }) => (
    <div className="ox2-deskcard full">
      <div className="ox-teamtag">
        <span>{d.name}</span>
        {d.exec && (
          <span className="ox2-execchip" title={d.exec.display_name}>
            {initials(d.exec.display_name)}
          </span>
        )}
        <b className={d.roiPct != null && d.roiPct < 0 ? 'neg' : ''}>{fmtSignedPct(d.roiPct)}</b>
      </div>
      {d.lead ? (
        <button type="button" className="ox2-lead" onClick={() => openProfile(d.lead)}>
          <Avatar member={d.lead} cls={clsOf(d.lead)} size={26} fs={8.5} />
          <div style={{ minWidth: 0 }}>
            <div className="ox2-lead-nm">{d.lead.display_name}</div>
            <div className="ox2-lead-rl">{d.lead.title || tierOf(d.lead).label}</div>
          </div>
        </button>
      ) : (
        <div className="ox2-lead-empty">No lead assigned</div>
      )}
      {d.analysts.length > 0 && (
        <div className="ox2-memberlist">
          {d.analysts.map((a) => (
            <button key={a.id} type="button" className="ox2-member-row" onClick={() => openProfile(a)}>
              <Avatar member={a} cls={clsOf(a)} size={20} fs={6.5} />
              <span className="ox2-member-nm">{a.display_name}</span>
              {a.tier === 'senior_analyst' && <span className="ox2-member-sr">SR</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ── roster segment ── */
  const matches = (m) => filter === 'all' || clsOf(m) === filter;
  const visibleCount = members.filter(matches).length;
  const showLeadership = filter === 'all' || filter === 'exec';
  const showDesks = filter !== 'exec';

  const filterPills = [
    { id: 'all', label: 'All desks' },
    { id: 'exec', label: 'Leadership', dot: 'exec' },
    { id: 'pm', label: 'Desk leads', dot: 'pm' },
    { id: 'an', label: 'Analysts', dot: 'an' },
  ];

  const selected = profileId ? byId.get(profileId) : null;
  const filterLabel = {
    all: 'desks',
    exec: 'leadership',
    pm: 'desk leads',
    an: 'analysts',
  };

  return (
    <div className="ox-root">
      {/* Desk tape */}
      <div className="ox-tape" aria-label="Desk tape">
        {loading ? (
          <Skel w={520} h={11} />
        ) : (
          <>
            <span className="ox-tape-item">
              <span className="ox-tape-sym">FUND</span>
              <span className="ox-tape-val">{fmtCompactMoney(perf?.total_value)}</span>
              <span className={`ox-tape-d ${(perf?.return_pct ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                {fmtSignedPct(perf?.return_pct)}
              </span>
            </span>
            {desks.map((d) => (
              <span key={d.teamId} className="ox-tape-item">
                <span className="ox-tape-sym">{d.name.toUpperCase()}</span>
                <span className="ox-tape-val">{fmtCompactMoney(d.value)}</span>
                <span className={`ox-tape-d ${(d.roiPct ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                  {fmtSignedPct(d.roiPct)}
                </span>
              </span>
            ))}
          </>
        )}
      </div>

      <div className="ox-wrap">
        {/* Centered brief */}
        <header className="ox2-brief">
          <div className="ox-eyebrow">
            <b>{fundName || 'Team Hub'}</b> · {universityName || 'Organization'} · {longDate()}
          </div>
          <h1 className="ox-h1">The investment council.</h1>
          <p className="ox-prose">
            {loading ? (
              <Skel w={520} h={16} />
            ) : (
              <>
                {stats.members} member{stats.members === 1 ? '' : 's'} across {stats.desks} sector
                desk{stats.desks === 1 ? '' : 's'}.{' '}
                {president && (
                  <>
                    <button type="button" className="ox-prose-a" onClick={() => openProfile(president)}>
                      {president.display_name}
                    </button>{' '}
                    presides
                  </>
                )}
                {vp && (
                  <>
                    , with{' '}
                    <button type="button" className="ox-prose-a" onClick={() => openProfile(vp)}>
                      {vp.display_name}
                    </button>{' '}
                    running operations
                  </>
                )}
                {execs.length > 0 && (
                  <>
                    {' '}
                    and {execs.length} executive{execs.length === 1 ? '' : 's'} overseeing the desks
                  </>
                )}
                {president && '. '}
                {topDesk && topDesk.lead && (
                  <>
                    <b>{topDesk.name}</b> leads the fund at <b>{fmtSignedPct(topDesk.roiPct)} ROI</b> under{' '}
                    <button type="button" className="ox-prose-a" onClick={() => openProfile(topDesk.lead)}>
                      {topDesk.lead.display_name}
                    </button>
                    .
                  </>
                )}
              </>
            )}
          </p>
        </header>

        {/* Stats line */}
        <div className="ox2-statsline" aria-label="Council stats">
          <div className="ox2-statcell">
            <div className="ox-stat-label">Members</div>
            <div className="ox-stat-value">{loading ? <Skel w={24} h={17} /> : stats.members}</div>
          </div>
          <div className="ox2-statcell">
            <div className="ox-stat-label">Desks</div>
            <div className="ox-stat-value">{loading ? <Skel w={18} h={17} /> : stats.desks}</div>
          </div>
          <div className="ox2-statcell">
            <div className="ox-stat-label">Leadership</div>
            <div className="ox-stat-value">{loading ? <Skel w={18} h={17} /> : stats.leadership}</div>
          </div>
          <div className="ox2-statcell">
            <div className="ox-stat-label">Top desk</div>
            <div className="ox-stat-value pos">{loading ? <Skel w={48} h={17} /> : fmtSignedPct(stats.topRoi)}</div>
          </div>
          <div className="ox2-statcell">
            <div className="ox-stat-label">Avg desk ROI</div>
            <div className="ox-stat-value pos">{loading ? <Skel w={48} h={17} /> : fmtSignedPct(stats.avgRoi)}</div>
          </div>
          {canManage && (
            <div className="ox2-addcell">
              <button type="button" className="ox-ghostpill" onClick={() => router.push('/org-team-hub/assignments')}>
                <Plus size={13} strokeWidth={2} /> Add member
              </button>
            </div>
          )}
        </div>

        {/* Section I — Chain of command */}
        <section className="ox-sec" style={{ borderTop: 'none', paddingTop: 40 }}>
          <div className="ox-sec-head">
            <span className="ox-roman">I</span>
            <h2 className="ox-sec-title">Chain of command</h2>
            <div className="ox-legend">
              <span className="ox-key">
                <span className="ox-dot exec" />
                Leadership
              </span>
              <span className="ox-key">
                <span className="ox-dot pm" />
                Portfolio management
              </span>
              <span className="ox-key">
                <span className="ox-dot an" />
                Analysts
              </span>
            </div>
          </div>

          {loading ? (
            <div className="ox2-bandchart">
              <Skel w={540} h={62} style={{ borderRadius: 10 }} />
              <div className="ox2-vline" />
              <Skel w="100%" h={150} style={{ borderRadius: 10, maxWidth: 1318 }} />
            </div>
          ) : (
            <div className="ox2-bandchart">
              <div className="ox2-row">
                <Node m={president} big />
                {president && vp && <span className="ox2-hlink" style={{ alignSelf: 'center' }} />}
                <Node m={vp} big />
              </div>
              {execs.length > 0 && (
                <>
                  <div className="ox2-vline" />
                  <div className="ox2-row" style={{ gap: 14 }}>
                    {execs.map((ex) => (
                      <div key={ex.id} style={{ width: 232 }}>
                        <Node m={ex} />
                      </div>
                    ))}
                  </div>
                </>
              )}
              {desks.length > 0 && (
                <>
                  <div className="ox2-vline" />
                  <div className="ox2-deskscroll">
                    <div className="ox2-deskrow">
                      {desks.map((d) => (
                        <DeskCard key={d.teamId} d={d} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* Section II — The roster */}
        <section className="ox-sec">
          <div className="ox-sec-head">
            <span className="ox-roman">II</span>
            <h2 className="ox-sec-title">The roster</h2>
            <span className="ox-sec-meta">
              {loading ? '—' : `${visibleCount} OF ${members.length} MEMBERS`}
            </span>
          </div>

          <div className="ox-filters">
            {filterPills.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ox-fpill${filter === p.id ? ' active' : ''}`}
                onClick={() => setFilter(p.id)}
              >
                {p.dot && <span className={`ox-dot ${p.dot}`} />}
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="oxr-grid">
              <div className="oxr-seg lead">
                <Skel w="100%" h={160} />
              </div>
            </div>
          ) : (
            <div className="oxr-grid">
              {showLeadership && leadership.length > 0 && (
                <div className="oxr-seg lead">
                  <div className="oxr-seg-head">
                    <span className="oxr-seg-rail exec" />
                    <div style={{ minWidth: 0 }}>
                      <div className="oxr-seg-title">Leadership</div>
                      <div className="oxr-seg-sub">President · VP · Executives</div>
                    </div>
                    <div className="oxr-seg-meta">
                      <span className="oxr-seg-count">{leadership.length} MEMBERS</span>
                    </div>
                  </div>
                  <div className="oxr-body">
                    {president && <RosterRow m={president} lead />}
                    {vp && <RosterRow m={vp} lead />}
                    {execs.length > 0 && <div className="oxr-divider" />}
                    {execs.map((ex) => (
                      <RosterRow key={ex.id} m={ex} />
                    ))}
                  </div>
                </div>
              )}

              {showDesks &&
                desks.map((d) => {
                  const rowMembers = (d.lead ? [d.lead, ...d.analysts] : d.analysts).filter(matches);
                  if (rowMembers.length === 0) return null;
                  return (
                    <div key={d.teamId} className="oxr-seg">
                      <div className="oxr-seg-head">
                        <span className="oxr-seg-rail desk" />
                        <div style={{ minWidth: 0 }}>
                          <div className="oxr-seg-title">{d.name}</div>
                          <div className="oxr-seg-sub">
                            {d.name} desk · {fmtCompactMoney(d.value)} sleeve
                          </div>
                        </div>
                        <div className="oxr-seg-meta">
                          <span className={`oxr-seg-roi${d.roiPct != null && d.roiPct < 0 ? ' neg' : ''}`}>
                            {fmtSignedPct(d.roiPct)}
                          </span>
                          <span className="oxr-seg-count">{d.members.length}</span>
                        </div>
                      </div>
                      <div className="oxr-body">
                        {rowMembers.map((m) => (
                          <RosterRow key={m.id} m={m} lead={d.lead && m.id === d.lead.id} />
                        ))}
                      </div>
                    </div>
                  );
                })}

              {visibleCount === 0 && (
                <div className="ox-roster-empty">No {filterLabel[filter]} to show.</div>
              )}
            </div>
          )}
        </section>
      </div>

      <OrgMemberProfileModal
        member={toModalMember(selected)}
        isOpen={Boolean(selected)}
        onClose={() => setProfileId(null)}
        viewerMemberId={viewerMemberId}
      />
    </div>
  );
}

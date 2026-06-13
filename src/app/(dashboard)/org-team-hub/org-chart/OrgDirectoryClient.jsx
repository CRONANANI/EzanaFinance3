'use client';

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  UserCog,
  Check,
} from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/contexts/ToastContext';
import { OrgMemberProfileModal } from '@/components/org/OrgMemberProfileModal';
import './org-directory.css';

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

function Avatar({ member, tierCls, size = 26, fs }) {
  return (
    <div
      className={`ocx-avatar ${tierCls}`}
      style={{ width: size, height: size, fontSize: fs || Math.round(size / 3) }}
    >
      {initials(member.display_name)}
    </div>
  );
}

function Skel({ w = 80, h = 14, style }) {
  return (
    <span className="ocx-skel" style={{ display: 'inline-block', width: w, height: h, ...style }} aria-hidden="true" />
  );
}

/** Map a chart member (DB shape) to the shape OrgMemberProfileModal expects. */
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

/* ── tree row (collapsible) ───────────────────────────────────── */
function TreeRow({ member, depth, ctx }) {
  const { childrenOf, tierById, collapsed, toggle, selectedId, select } = ctx;
  const kids = childrenOf(member.id);
  const isClosed = collapsed.has(member.id);
  const tier = tierById.get(member.tier);
  return (
    <Fragment>
      <button
        type="button"
        className={`oc-row${selectedId === member.id ? ' sel' : ''}`}
        style={{ paddingLeft: 8 + depth * 18 }}
        onClick={() => select(member.id)}
      >
        {kids.length > 0 ? (
          <span
            className={`oc-caret${isClosed ? ' closed' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggle(member.id);
            }}
            role="button"
            aria-label={isClosed ? 'Expand' : 'Collapse'}
          >
            <ChevronDown size={11} strokeWidth={2} />
          </span>
        ) : (
          <span className="oc-caret" />
        )}
        <Avatar member={member} tierCls={tier?.cls || 'an'} size={22} fs={7.5} />
        <span className="oc-nm">{member.display_name || 'Unnamed'}</span>
        <span className="oc-rl">{tier?.short || ''}</span>
      </button>
      {!isClosed &&
        kids.map((k) => <TreeRow key={k.id} member={k} depth={depth + 1} ctx={ctx} />)}
    </Fragment>
  );
}

/* ── page ─────────────────────────────────────────────────────── */
export function OrgDirectoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { isOrgUser, isLoading } = useOrg();

  const [chart, setChart] = useState(null);
  const [sleeves, setSleeves] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [pendingTier, setPendingTier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const searchRef = useRef(null);

  /* load chart + sector sleeves */
  useEffect(() => {
    if (!isOrgUser || isLoading) return undefined;
    let alive = true;
    (async () => {
      const [c, s] = await Promise.allSettled([
        fetchJson('/api/org/chart'),
        fetchJson('/api/org/team-hub/summary'),
      ]);
      if (!alive) return;
      const chartData = c.status === 'fulfilled' ? c.value : null;
      setChart(chartData);
      if (s.status === 'fulfilled' && s.value?.sectors) {
        setSleeves(new Map(s.value.sectors.map((x) => [x.teamId, x])));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [isOrgUser, isLoading]);

  /* derivations */
  const members = chart?.members || [];
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const tierById = useMemo(
    () => new Map((chart?.tiers || []).map((t) => [t.id, t])),
    [chart],
  );
  const rankOf = useCallback(
    (m) => tierById.get(m?.tier)?.rank ?? 6,
    [tierById],
  );
  const childrenOf = useCallback(
    (id) =>
      members
        .filter((m) => m.reports_to === id)
        .sort((a, b) => rankOf(a) - rankOf(b) || (a.display_name || '').localeCompare(b.display_name || '')),
    [members, rankOf],
  );
  const roots = useMemo(
    () =>
      members
        .filter((m) => !m.reports_to || !byId.has(m.reports_to))
        .sort((a, b) => rankOf(a) - rankOf(b)),
    [members, byId, rankOf],
  );
  const ancestorsOf = useCallback(
    (id) => {
      const chain = [];
      const seen = new Set();
      let cur = byId.get(id);
      while (cur?.reports_to && !seen.has(cur.reports_to)) {
        seen.add(cur.reports_to);
        cur = byId.get(cur.reports_to);
        if (cur) chain.unshift(cur);
      }
      return chain;
    },
    [byId],
  );
  const isAbove = useCallback(
    (ancestorId, m) => {
      const seen = new Set();
      let cur = m;
      while (cur?.reports_to && !seen.has(cur.reports_to)) {
        if (cur.reports_to === ancestorId) return true;
        seen.add(cur.reports_to);
        cur = byId.get(cur.reports_to);
      }
      return false;
    },
    [byId],
  );

  /* desk lead = highest tier on the desk; oversees = desks led from your subtree */
  const deskLeadOf = useCallback(
    (teamId) => {
      const onDesk = members.filter((m) => m.team_id === teamId);
      if (onDesk.length === 0) return null;
      return onDesk.sort((a, b) => rankOf(a) - rankOf(b))[0];
    },
    [members, rankOf],
  );

  /* selection (deep-linked via ?member=) */
  const select = useCallback(
    (id, { fromUrl = false } = {}) => {
      setSelectedId(id);
      setEditOpen(false);
      setPendingTier(null);
      setQuery('');
      // reveal in the tree
      setCollapsed((prev) => {
        const next = new Set(prev);
        const seen = new Set();
        let cur = byId.get(id);
        while (cur?.reports_to && !seen.has(cur.reports_to)) {
          next.delete(cur.reports_to);
          seen.add(cur.reports_to);
          cur = byId.get(cur.reports_to);
        }
        return next;
      });
      if (!fromUrl) router.replace(`/org-team-hub/org-chart?member=${id}`, { scroll: false });
    },
    [byId, router],
  );

  /* initial selection: ?member= → viewer → root */
  useEffect(() => {
    if (loading || selectedId || members.length === 0) return;
    const fromUrl = searchParams.get('member');
    if (fromUrl && byId.has(fromUrl)) select(fromUrl, { fromUrl: true });
    else if (chart?.viewer?.memberId && byId.has(chart.viewer.memberId)) {
      select(chart.viewer.memberId, { fromUrl: true });
    } else if (roots[0]) select(roots[0].id, { fromUrl: true });
  }, [loading, selectedId, members.length, byId, roots, chart, searchParams, select]);

  const toggle = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ⌘K focuses search */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => {
        const tier = tierById.get(m.tier);
        return (
          (m.display_name || '').toLowerCase().includes(q) ||
          (m.title || '').toLowerCase().includes(q) ||
          (m.sub_role || '').toLowerCase().includes(q) ||
          (tier?.label || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [query, members, tierById]);

  /* role edit */
  const saveRole = async () => {
    const target = byId.get(selectedId);
    if (!target || !pendingTier || pendingTier === target.tier) return;
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
      toast.success(
        `${target.display_name} is now ${tierById.get(pendingTier)?.label || pendingTier}`,
      );
      setEditOpen(false);
      setPendingTier(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* guards */
  if (isLoading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading organization…</div>;
  }
  if (!isOrgUser) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        This page is for organizational members only.
      </div>
    );
  }

  const selected = byId.get(selectedId) || null;
  const selTier = selected ? tierById.get(selected.tier) : null;
  const sleeve = selected?.team_id ? sleeves.get(selected.team_id) : null;
  const deskSize = selected?.team_id
    ? members.filter((m) => m.team_id === selected.team_id).length
    : 0;
  const reports = selected ? childrenOf(selected.id) : [];
  const chain = selected ? ancestorsOf(selected.id) : [];
  const leadership = selTier && selTier.rank <= 2;
  const oversees = leadership
    ? [...sleeves.values()].filter((t) => {
        const lead = deskLeadOf(t.teamId);
        return lead && (lead.id === selected.id || isAbove(selected.id, lead));
      })
    : [];
  const assignable = (chart?.viewer?.assignableTiers || []).filter((t) => tierById.has(t));
  const treeCtx = { childrenOf, tierById, collapsed, toggle, selectedId, select };

  return (
    <div className="ocx-root">
      <header className="org-head">
        <div>
          <div className="org-crumb">
            <b>TEAM HUB</b> › ORGANIZATION
          </div>
          <h1 className="org-h1">Organization</h1>
          <p className="org-sub">
            {loading ? (
              <Skel w={300} h={12} />
            ) : (
              `${chart?.universityName || 'Organization'} Investment Council · ${members.length} member${members.length === 1 ? '' : 's'} · ${sleeves.size} sector team${sleeves.size === 1 ? '' : 's'}`
            )}
          </p>
        </div>
        <div className="org-legend">
          <span className="org-key">
            <span className="org-dot exec" />
            Leadership
          </span>
          <span className="org-key">
            <span className="org-dot pm" />
            Portfolio management
          </span>
          <span className="org-key">
            <span className="org-dot an" />
            Analysts
          </span>
        </div>
      </header>

      <div className="oc-shell">
        <aside className="oc-left">
          <div className="oc-search-wrap">
            <div className="oc-search">
              <Search size={14} strokeWidth={1.8} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a member…"
                aria-label="Find a member"
              />
              <span className="oc-kbd">⌘K</span>
            </div>
            {matches.length > 0 && (
              <div className="oc-results" role="listbox">
                {matches.map((m) => {
                  const t = tierById.get(m.tier);
                  return (
                    <button key={m.id} type="button" className="oc-result" onClick={() => select(m.id)}>
                      <Avatar member={m} tierCls={t?.cls || 'an'} size={22} fs={7.5} />
                      <span className="oc-nm">{m.display_name}</span>
                      <span className="oc-rl">{t?.short}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="oc-tree">
            {loading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{ padding: '5px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Skel w={22} h={22} style={{ borderRadius: '50%' }} />
                    <Skel w={`${55 + (i % 3) * 12}%`} h={12} />
                  </div>
                ))
              : roots.map((r) => <TreeRow key={r.id} member={r} depth={0} ctx={treeCtx} />)}
          </div>
        </aside>

        <main className="oc-main">
          {loading || !selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Skel w={220} h={10} />
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <Skel w={56} h={56} style={{ borderRadius: '50%' }} />
                <div>
                  <Skel w={200} h={20} />
                  <div style={{ marginTop: 6 }}>
                    <Skel w={150} h={12} />
                  </div>
                </div>
              </div>
              <Skel w="60%" h={64} style={{ borderRadius: 10 }} />
            </div>
          ) : (
            <>
              <div className="oc-chain">
                {chain.map((a) => (
                  <Fragment key={a.id}>
                    <button type="button" onClick={() => select(a.id)}>
                      {(a.display_name || '').toUpperCase()}
                    </button>
                    <ChevronRight size={10} strokeWidth={2} />
                  </Fragment>
                ))}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {(selected.display_name || '').toUpperCase()}
                </span>
              </div>

              <div className="oc-profile">
                <Avatar member={selected} tierCls={selTier?.cls || 'an'} size={56} fs={16} />
                <div style={{ minWidth: 0 }}>
                  <div className="oc-profile-name">
                    {selected.display_name}
                    <span className={`org-tier-badge ${selTier?.cls || 'an'}`}>{selTier?.short}</span>
                  </div>
                  <div className="oc-profile-role">
                    {selected.title || selTier?.label}
                    {sleeve ? ` · ${sleeve.name}` : ' · Investment Council'}
                  </div>
                </div>
                <div className="oc-actions" style={{ marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="org-btn"
                    onClick={() => router.push('/org-team-hub/assignments')}
                  >
                    <ClipboardList size={13} strokeWidth={1.8} /> View tasks
                  </button>
                  <button type="button" className="org-btn ghost" onClick={() => setMsgOpen(true)}>
                    <MessageSquare size={13} strokeWidth={1.8} /> Message
                  </button>
                  {selected.editable && (
                    <button
                      type="button"
                      className={`org-btn ghost${editOpen ? ' active' : ''}`}
                      onClick={() => {
                        setEditOpen((o) => !o);
                        setPendingTier(selected.tier);
                      }}
                    >
                      <UserCog size={13} strokeWidth={1.8} /> Edit role
                    </button>
                  )}
                </div>
              </div>

              {editOpen && selected.editable && (
                <div className="oc-editrole">
                  <div className="oc-editrole-head">
                    Change role — {selected.display_name}
                  </div>
                  <div className="oc-editrole-opts">
                    {(chart?.tiers || [])
                      .filter((t) => assignable.includes(t.id) || t.id === selected.tier)
                      .map((t) => {
                        const disabled = !assignable.includes(t.id) && t.id !== selected.tier;
                        const checked = (pendingTier || selected.tier) === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            className={`oc-tieropt${checked ? ' sel' : ''}`}
                            disabled={disabled || saving}
                            onClick={() => setPendingTier(t.id)}
                          >
                            <span className={`org-dot ${t.cls}`} />
                            {t.label}
                            {t.id === selected.tier && <span className="oc-tieropt-now">CURRENT</span>}
                            {checked && t.id !== selected.tier && (
                              <Check size={13} strokeWidth={2} style={{ marginLeft: 'auto', color: 'var(--emerald)' }} />
                            )}
                          </button>
                        );
                      })}
                  </div>
                  <div className="oc-editrole-foot">
                    <span className="oc-editrole-note">
                      You can change roles for members below you in your reporting line or on your desk.
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="org-btn ghost"
                        onClick={() => {
                          setEditOpen(false);
                          setPendingTier(null);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="org-btn"
                        onClick={saveRole}
                        disabled={saving || !pendingTier || pendingTier === selected.tier}
                      >
                        {saving ? 'Saving…' : 'Save role'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {sleeve && (
                <div className="oc-stats">
                  <div className="oc-stat">
                    <div className="oc-stat-label">Desk</div>
                    <div className="oc-stat-value" style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5 }}>
                      {sleeve.name}
                    </div>
                  </div>
                  <div className="oc-stat">
                    <div className="oc-stat-label">Desk ROI</div>
                    <div className={`oc-stat-value ${(sleeve.roiPct ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                      {fmtSignedPct(sleeve.roiPct)}
                    </div>
                  </div>
                  <div className="oc-stat">
                    <div className="oc-stat-label">Sleeve value</div>
                    <div className="oc-stat-value">{fmtCompactMoney(sleeve.value)}</div>
                  </div>
                  <div className="oc-stat">
                    <div className="oc-stat-label">Desk size</div>
                    <div className="oc-stat-value">{deskSize}</div>
                  </div>
                </div>
              )}

              {oversees.length > 0 && (
                <section>
                  <div className="oc-col-label">
                    Oversees {oversees.length} desk{oversees.length === 1 ? '' : 's'}
                  </div>
                  <div className="oc-teamchips">
                    {oversees.map((t) => (
                      <span key={t.teamId} className="oc-teamchip">
                        {t.name} <b>{fmtSignedPct(t.roiPct)}</b>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="oc-col-label">Direct reports · {reports.length}</div>
                {reports.length > 0 ? (
                  <div className="oc-reports">
                    {reports.map((r) => {
                      const rt = tierById.get(r.tier);
                      const rTeam = r.team_id ? sleeves.get(r.team_id) : null;
                      return (
                        <button key={r.id} type="button" className="oc-report" onClick={() => select(r.id)}>
                          <Avatar member={r} tierCls={rt?.cls || 'an'} size={30} fs={9.5} />
                          <div style={{ minWidth: 0 }}>
                            <div className="oc-report-nm">{r.display_name}</div>
                            <div className="oc-report-rl">
                              {r.title || rt?.label}
                              {rTeam ? ` · ${rTeam.name}` : ''}
                            </div>
                          </div>
                          <span style={{ marginLeft: 'auto', color: 'var(--text-ghost)', display: 'flex' }}>
                            <ChevronRight size={13} strokeWidth={1.8} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="oc-empty">No direct reports.</div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <OrgMemberProfileModal
        member={toModalMember(selected)}
        isOpen={msgOpen}
        onClose={() => setMsgOpen(false)}
        viewerMemberId={chart?.viewer?.memberId}
      />
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import './org-chart.css';

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Mgr',
  analyst: 'Analyst',
};

function roleLabel(role) {
  return ROLE_LABEL[role] || (role || '').replace(/_/g, ' ');
}

function formatTerm(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * A single chart node. Clicking opens the member profile modal.
 */
function MemberNode({ member, onSelect }) {
  const grad = member.is_graduating ? formatTerm(member.term_end) : null;
  return (
    <button
      type="button"
      className="oc2-node"
      onClick={() => onSelect?.(member)}
      aria-label={`${member.display_name || 'Member'} — open profile`}
    >
      <span className="oc2-node-name">{member.display_name || 'Unnamed'}</span>
      {member.title ? <span className="oc2-node-title">{member.title}</span> : null}
      <span className={`oc2-node-pill oc2-pill--${member.role}`}>{roleLabel(member.role)}</span>
      {member.sectors?.length > 0 && (
        <span className="oc2-node-sectors">
          {member.sectors.slice(0, 3).map((s) => (
            <span key={s.sector} className="oc2-sector-tag">
              {s.sector}
            </span>
          ))}
          {member.sectors.length > 3 && (
            <span className="oc2-sector-tag">+{member.sectors.length - 3}</span>
          )}
        </span>
      )}
      {member.is_graduating && (
        <span className="oc2-node-grad">
          <i className="bi bi-mortarboard-fill" aria-hidden />
          Graduating{grad ? ` · ${grad}` : ''}
        </span>
      )}
    </button>
  );
}

/**
 * Recursive subtree renderer. `childrenOf` maps a member id to its children.
 * `visited` guards against accidental cycles in reports_to.
 */
function Subtree({ node, childrenOf, onSelect, visited }) {
  const kids = childrenOf.get(node.id) || [];
  const nextVisited = new Set(visited);
  nextVisited.add(node.id);
  const safeKids = kids.filter((k) => !nextVisited.has(k.id));

  return (
    <li>
      <MemberNode member={node} onSelect={onSelect} />
      {safeKids.length > 0 && (
        <ul>
          {safeKids.map((child) => (
            <Subtree
              key={child.id}
              node={child}
              childrenOf={childrenOf}
              onSelect={onSelect}
              visited={nextVisited}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Visual hierarchical org chart built from a flat member array via reports_to.
 * Faculty advisors (sub_role === 'Faculty Advisor') are lifted out of the
 * hierarchy into a distinct dashed lane above the tree.
 */
export function OrgChartTree({ members = [], onSelectMember }) {
  const { advisors, roots, childrenOf } = useMemo(() => {
    const isAdvisor = (m) => m.sub_role === 'Faculty Advisor';
    const advisorList = members.filter(isAdvisor);
    const treeMembers = members.filter((m) => !isAdvisor(m));

    const byId = new Map(treeMembers.map((m) => [m.id, m]));
    const kids = new Map();
    const rootList = [];

    for (const m of treeMembers) {
      // A node roots the tree when it has no parent, or its parent isn't part
      // of the hierarchy (e.g. reports to an advisor, or a stale id).
      const parent = m.reports_to ? byId.get(m.reports_to) : null;
      if (!parent || parent.id === m.id) {
        rootList.push(m);
      } else {
        if (!kids.has(parent.id)) kids.set(parent.id, []);
        kids.get(parent.id).push(m);
      }
    }

    const sortFn = (a, b) =>
      (a.display_name || '').localeCompare(b.display_name || '');
    rootList.sort(sortFn);
    for (const arr of kids.values()) arr.sort(sortFn);
    advisorList.sort(sortFn);

    return { advisors: advisorList, roots: rootList, childrenOf: kids };
  }, [members]);

  if (members.length === 0) {
    return <div className="oc2-state">No active members in this organization yet.</div>;
  }

  return (
    <div>
      {/* Faculty advisor lane */}
      {advisors.length > 0 && (
        <div className="oc2-advisor-lane">
          <div className="oc2-advisor-lane-label">
            <i className="bi bi-shield-check" aria-hidden /> Faculty Advisors
          </div>
          <div className="oc2-advisor-cards">
            {advisors.map((a) => (
              <button
                key={a.id}
                type="button"
                className="oc2-advisor-card"
                onClick={() => onSelectMember?.(a)}
                aria-label={`${a.display_name || 'Advisor'} — open profile`}
              >
                <span className="oc2-advisor-badge">Advisor</span>
                <span className="oc2-node-name">{a.display_name || 'Unnamed'}</span>
                {a.title ? <span className="oc2-node-title">{a.title}</span> : null}
                <span className="oc2-advisor-supervises">
                  <span className="oc2-supervise-chip">Council-wide oversight</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hierarchy */}
      <div className="oc2-tree-scroll">
        <div className="oc2-tree">
          <ul>
            {roots.map((root) => (
              <Subtree
                key={root.id}
                node={root}
                childrenOf={childrenOf}
                onSelect={onSelectMember}
                visited={new Set()}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useOrg } from '@/contexts/OrgContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { OrgHierarchyCard } from '@/components/org/OrgHierarchyCard';
import { PerformanceMetricsCard } from '@/components/org/PerformanceMetricsCard';
import { UpcomingDeadlinesCard } from '@/components/org/UpcomingDeadlinesCard';
import {
  StrategicOverviewCard,
  ResourceAllocationCard,
} from '@/components/org/ExecutiveCards';
import {
  TeamPortfolioSummaryCard,
  AnalystWorkloadCard,
  CoveragePipelineCard,
} from '@/components/org/PortfolioManagerCards';
import {
  MyCoverageCard,
  ResearchDeliverablesCard,
  SkillDevelopmentCard,
} from '@/components/org/AnalystCards';
import { getTasksByRole, getMemberByEmail, MOCK_MEMBERS, MOCK_TEAMS, MOCK_TEAM_PERFORMANCE } from '@/lib/orgMockData';
import '../../../../app-legacy/assets/css/theme.css';
import './team-hub.css';

/* ── Helpers ───────────────────────────────────────────────── */
function getFileTypeInfo(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return { type: 'pdf', icon: 'bi-file-earmark-pdf', label: 'PDF', category: 'pdf' };
  if (['pptx', 'ppt'].includes(ext)) return { type: 'pptx', icon: 'bi-file-earmark-slides', label: 'PowerPoint', category: 'powerpoint' };
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { type: 'xlsx', icon: 'bi-file-earmark-spreadsheet', label: 'Spreadsheet', category: 'spreadsheet' };
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return { type: 'video', icon: 'bi-camera-video', label: 'Video', category: 'video' };
  if (['doc', 'docx'].includes(ext)) return { type: 'doc', icon: 'bi-file-earmark-word', label: 'Word', category: 'document' };
  return { type: 'other', icon: 'bi-file-earmark', label: ext?.toUpperCase() || 'File', category: 'other' };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function roleColor(role) {
  if (role === 'executive') return '#f59e0b';
  if (role === 'portfolio_manager') return '#6366f1';
  return '#10b981';
}

function AvatarCircle({ name, role, size = 22 }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="th-file-avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${roleColor(role)}44, ${roleColor(role)}88)`,
        color: roleColor(role),
      }}
    >
      {initials}
    </div>
  );
}

/* ── Mock files (with team_id + tag) ──────────────────────── */
const MOCK_FILES = [
  { id: 'f1', name: 'Q2 TMT Stock Pitch.pptx', size: 4200000, uploadedBy: 'm3', sharedWith: ['m1', 'm2', 'm10'], uploadedAt: '2026-04-02', team_id: 't7', tag: null, contentType: 'valuations' },
  { id: 'f2', name: 'AAPL Valuation Model.xlsx', size: 890000, uploadedBy: 'm10', sharedWith: ['m3', 'm11'], uploadedAt: '2026-04-01', team_id: 't7', tag: null, contentType: 'models_dcf' },
  { id: 'f3', name: 'Healthcare Sector Primer.pdf', size: 2100000, uploadedBy: 'm4', sharedWith: ['m1', 'm13', 'm14'], uploadedAt: '2026-03-30', team_id: 't1', tag: null, contentType: 'primer' },
  { id: 'f4', name: 'Weekly Investment Committee Recording 04/04/2026.mp4', size: 156000000, uploadedBy: 'm1', sharedWith: ['m2', 'm3', 'm4', 'm5', 'm6'], uploadedAt: '2026-04-04', team_id: null, tag: 'administrative', contentType: null },
  { id: 'f5', name: 'Comparable Company Analysis - Semis.xlsx', size: 1200000, uploadedBy: 'm22', sharedWith: ['m3', 'm10'], uploadedAt: '2026-03-27', team_id: 't7', tag: null, contentType: 'models_comparable_companies' },
  { id: 'f6', name: 'Energy Sector Update Q1.pdf', size: 3400000, uploadedBy: 'm5', sharedWith: ['m1', 'm2', 'm15'], uploadedAt: '2026-03-25', team_id: 't3', tag: null, contentType: 'annual_report' },
  { id: 'f7', name: '2026 New Analyst Onboarding.pdf', size: 780000, uploadedBy: 'm2', sharedWith: ['m12', 'm23', 'm18'], uploadedAt: '2026-03-20', team_id: null, tag: 'administrative', contentType: null },
  { id: 'f8', name: 'Portfolio Risk Review - March.pptx', size: 5600000, uploadedBy: 'm6', sharedWith: ['m1', 'm2'], uploadedAt: '2026-03-18', team_id: 't4', tag: null, contentType: 'valuations' },
  { id: 'f9', name: 'Metals & Mining Deep Dive.pdf', size: 2800000, uploadedBy: 'm9', sharedWith: ['m1', 'm19'], uploadedAt: '2026-03-15', team_id: 't6', tag: null, contentType: 'primer' },
  { id: 'f10', name: 'Consumer Staples Earnings Preview.pptx', size: 3100000, uploadedBy: 'm7', sharedWith: ['m1', 'm17'], uploadedAt: '2026-03-12', team_id: 't2', tag: null, contentType: 'valuations' },
  { id: 'f11', name: 'Industrials Capex Model.xlsx', size: 1500000, uploadedBy: 'm8', sharedWith: ['m1', 'm18'], uploadedAt: '2026-03-10', team_id: 't5', tag: null, contentType: 'models_capex' },
  { id: 'f12', name: 'Utilities Dividend Discount Model.xlsx', size: 920000, uploadedBy: 'm10', sharedWith: ['m3', 'm11'], uploadedAt: '2026-04-03', team_id: 't7', tag: null, contentType: 'models_ddm' },
];

/** File extension / MIME-style categories (Format filter) */
const FORMAT_FILTERS = [
  { id: 'spreadsheet', label: 'Spreadsheet' },
  { id: 'powerpoint', label: 'PowerPoint' },
  { id: 'video', label: 'Video' },
  { id: 'pdf', label: 'PDF' },
];

const MODEL_SUBTYPES = [
  { id: 'models_capex', label: 'Capex' },
  { id: 'models_dcf', label: 'DCF' },
  { id: 'models_comparable_companies', label: 'Comparable companies' },
  { id: 'models_ddm', label: 'DDM' },
];

const TEAM_FILTERS = MOCK_TEAMS.map((t) => ({ id: t.id, label: t.name }));

const CONTENT_TYPE_LABELS = {
  primer: 'Primer',
  valuations: 'Valuations',
  annual_report: 'Annual Report',
  models_capex: 'Models · Capex',
  models_dcf: 'Models · DCF',
  models_comparable_companies: 'Models · Comparable companies',
  models_ddm: 'Models · DDM',
};

function contentTypeLabel(id) {
  return CONTENT_TYPE_LABELS[id] || id;
}

/* ── Team Ranking Cards (horizontal row) ──────────────────── */
function TeamRankingRow() {
  const sorted = useMemo(
    () => [...MOCK_TEAM_PERFORMANCE].sort((a, b) => b.ytd_return - a.ytd_return),
    [],
  );

  return (
    <div className="th-ranking-row">
      {sorted.map((team, i) => (
        <div key={team.team_id} className="th-ranking-card">
          <div className="th-ranking-rank">#{i + 1}</div>
          <div className="th-ranking-name">{team.team_name}</div>
          <div className={`th-ranking-roi ${team.ytd_return >= 0 ? 'positive' : 'negative'}`}>
            {team.ytd_return >= 0 ? '+' : ''}
            {team.ytd_return}% ROI
          </div>
          <div className="th-ranking-value">${(team.value / 1000).toFixed(0)}K</div>
          <div className="th-ranking-tickers">
            {team.top_holdings.slice(0, 3).map((t) => (
              <span key={t} className="th-ticker-pill">
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Upload Modal ─────────────────────────────────────────── */
function UploadModal({ isOpen, onClose, members }) {
  const [dragover, setDragover] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setRecipients([]);
      setShowMemberPicker(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer?.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };
  const toggleRecipient = (id) => setRecipients((p) => (p.includes(id) ? p.filter((r) => r !== id) : [...p, id]));
  const handleUpload = () => {
    alert(`Upload "${selectedFile?.name}" shared with ${recipients.length} member(s).`);
    onClose();
  };

  return (
    <div className="th-modal-overlay" onClick={onClose} role="presentation">
      <div className="th-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="th-upload-title">
        <div className="th-modal-header">
          <h2 id="th-upload-title">
            <i className="bi bi-cloud-arrow-up" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
            Upload & share
          </h2>
          <button type="button" className="th-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div
          className={`th-dropzone${dragover ? ' dragover' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragover(true);
          }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx,.ppt,.xlsx,.xls,.csv,.doc,.docx,.mp4,.mov,.avi,.webm"
            hidden
            onChange={handleFileSelect}
          />
          {selectedFile ? (
            <>
              <i className={`bi ${getFileTypeInfo(selectedFile.name).icon}`} />
              <p style={{ color: '#f0f6fc', fontWeight: 600 }}>{selectedFile.name}</p>
              <small>{formatSize(selectedFile.size)}</small>
            </>
          ) : (
            <>
              <i className="bi bi-cloud-arrow-up" />
              <p>Drop a file here or click to browse</p>
              <small>PDF, PowerPoint, Excel, Word, or Video</small>
            </>
          )}
        </div>
        <div className="th-form-group">
          <span className="th-form-label">Share with</span>
          <button
            type="button"
            className="th-upload-btn"
            style={{
              width: '100%',
              justifyContent: 'center',
              background: 'rgba(99,102,241,0.1)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
            onClick={() => setShowMemberPicker(!showMemberPicker)}
          >
            <i className="bi bi-people" /> {recipients.length ? `${recipients.length} selected` : 'Select recipients'}
          </button>
          {showMemberPicker && (
            <div className="th-member-list">
              {members.map((m) => (
                <div
                  key={m.id}
                  className={`th-member-row${recipients.includes(m.id) ? ' selected' : ''}`}
                  onClick={() => toggleRecipient(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleRecipient(m.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="th-member-check">{recipients.includes(m.id) && <i className="bi bi-check" />}</div>
                  <AvatarCircle name={m.name} role={m.role} size={28} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#f0f6fc', fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>{m.name}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.6rem', margin: 0 }}>{m.sub_role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {recipients.length > 0 && (
            <div className="th-recipient-chips">
              {recipients.map((rid) => {
                const m = members.find((mm) => mm.id === rid);
                return m ? (
                  <span key={rid} className="th-chip">
                    {m.name.split(' ')[0]}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRecipient(rid);
                      }}
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
        <button type="button" className="th-submit-btn" disabled={!selectedFile} onClick={handleUpload}>
          Upload{recipients.length > 0 ? ` & share with ${recipients.length}` : ''}
        </button>
      </div>
    </div>
  );
}

/* ── Filter dropdowns (Format / Team / Type) ─────────────── */
function useCloseOnOutsideClick(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen, ref]);
}

function TeamFilterDropdown({ teamFilters, toggleTeam, clearTeams }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useCloseOnOutsideClick(open, setOpen, ref);
  const summary =
    teamFilters.length === 0 ? 'All teams' : `${teamFilters.length} team${teamFilters.length === 1 ? '' : 's'}`;

  return (
    <div className="th-filter-dd" ref={ref}>
      <span className="th-filter-label">Team</span>
      <button
        type="button"
        className={`th-filter-dd-trigger${open ? ' open' : ''}${teamFilters.length ? ' has-value' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        {summary}
        <i className="bi bi-chevron-down th-filter-dd-chevron" aria-hidden />
      </button>
      {open && (
        <div className="th-filter-dd-panel" role="listbox">
          {teamFilters.length > 0 && (
            <button type="button" className="th-filter-dd-clear" onClick={() => clearTeams()}>
              Clear teams
            </button>
          )}
          {TEAM_FILTERS.map((t) => (
            <label key={t.id} className="th-filter-dd-checkrow">
              <input type="checkbox" checked={teamFilters.includes(t.id)} onChange={() => toggleTeam(t.id)} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeFilterDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useCloseOnOutsideClick(open, setOpen, ref);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const display = value ? contentTypeLabel(value) : 'All types';

  return (
    <div className="th-filter-dd" ref={ref}>
      <span className="th-filter-label">Type</span>
      <button
        type="button"
        className={`th-filter-dd-trigger${open ? ' open' : ''}${value ? ' has-value' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        {display}
        <i className="bi bi-chevron-down th-filter-dd-chevron" aria-hidden />
      </button>
      {open && (
        <div className="th-filter-dd-panel th-type-dd-panel" role="menu">
          <button
            type="button"
            role="menuitem"
            className={`th-filter-dd-item${value === 'primer' ? ' active' : ''}`}
            onClick={() => {
              onChange('primer');
              setOpen(false);
            }}
          >
            Primer
          </button>
          <div className="th-type-models-wrap">
            <div className="th-type-models-row">
              <span className="th-type-models-label">Models</span>
              <i className="bi bi-chevron-right th-type-models-chevron" aria-hidden />
            </div>
            <div className="th-type-flyout" role="menu">
              {MODEL_SUBTYPES.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  role="menuitem"
                  className={`th-filter-dd-item${value === sub.id ? ' active' : ''}`}
                  onClick={() => {
                    onChange(sub.id);
                    setOpen(false);
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            className={`th-filter-dd-item${value === 'valuations' ? ' active' : ''}`}
            onClick={() => {
              onChange('valuations');
              setOpen(false);
            }}
          >
            Valuations
          </button>
          <button
            type="button"
            role="menuitem"
            className={`th-filter-dd-item${value === 'annual_report' ? ' active' : ''}`}
            onClick={() => {
              onChange('annual_report');
              setOpen(false);
            }}
          >
            Annual Report
          </button>
          {value && (
            <button
              type="button"
              className="th-filter-dd-clear th-filter-dd-clear--inline"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Clear type
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── File Portal Card (dropdown filters) ─────────────────── */
function FilePortalCard({ members }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sendFile, setSendFile] = useState(null);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [teamFilters, setTeamFilters] = useState([]);
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);

  const toggleTeam = (id) => setTeamFilters((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const clearTeams = () => setTeamFilters([]);

  const filtered = useMemo(() => {
    let list = MOCK_FILES;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (formatFilter) list = list.filter((f) => getFileTypeInfo(f.name).category === formatFilter);
    if (teamFilters.length > 0) list = list.filter((f) => f.team_id && teamFilters.includes(f.team_id));
    if (contentTypeFilter) list = list.filter((f) => f.contentType === contentTypeFilter);
    if (showAdmin) list = list.filter((f) => f.tag === 'administrative');
    return list;
  }, [search, formatFilter, teamFilters, contentTypeFilter, showAdmin]);

  return (
    <div className="th-card th-file-portal-card">
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} members={members} />
      {sendFile && (
        <div className="th-modal-overlay" onClick={() => setSendFile(null)} role="presentation">
          <div className="th-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="th-send-title">
            <div className="th-modal-header">
              <h2 id="th-send-title">
                <i className="bi bi-send" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
                Send &quot;{sendFile.name}&quot;
              </h2>
              <button type="button" className="th-modal-close" onClick={() => setSendFile(null)} aria-label="Close">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.78rem' }}>
              Select recipients from the member list and click send. (Production: updates shared_with in DB)
            </p>
            <button type="button" className="th-submit-btn" onClick={() => { alert('Sent!'); setSendFile(null); }}>
              Send
            </button>
          </div>
        </div>
      )}

      <div className="th-card-header">
        <div className="th-card-header-left">
          <i className="bi bi-folder2-open" />
          <span>Team File Portal</span>
        </div>
        <button type="button" className="th-upload-btn" onClick={() => setUploadOpen(true)}>
          <i className="bi bi-cloud-arrow-up" /> Upload
        </button>
      </div>
      <div className="th-card-body">
        <div className="th-file-controls">
          <input
            className="th-file-search"
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search files"
          />
        </div>
        <div className="th-filter-bar th-filter-bar--dropdowns">
          <div className="th-filter-dd">
            <span className="th-filter-label">Format</span>
            <select
              className="th-filter-select"
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              aria-label="Filter by file format"
            >
              <option value="">All formats</option>
              {FORMAT_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <TeamFilterDropdown teamFilters={teamFilters} toggleTeam={toggleTeam} clearTeams={clearTeams} />
          <TypeFilterDropdown value={contentTypeFilter} onChange={setContentTypeFilter} />
          <span className="th-filter-divider" aria-hidden />
          <button type="button" className={`th-filter-btn${showAdmin ? ' active' : ''}`} onClick={() => setShowAdmin(!showAdmin)}>
            Administrative
          </button>
        </div>
        <div className="th-file-list">
          {filtered.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0' }}>No files match your filters.</p>
          )}
          {filtered.map((file) => {
            const info = getFileTypeInfo(file.name);
            const uploader = members.find((m) => m.id === file.uploadedBy);
            const shared = file.sharedWith.map((sid) => members.find((mm) => mm.id === sid)).filter(Boolean);
            const team = file.team_id ? MOCK_TEAMS.find((t) => t.id === file.team_id) : null;
            return (
              <div key={file.id} className="th-file-row">
                <div className={`th-file-icon ${info.type}`}>
                  <i className={`bi ${info.icon}`} />
                </div>
                <div className="th-file-info">
                  <p className="th-file-name">{file.name}</p>
                  <p className="th-file-meta">
                    {formatSize(file.size)} · {uploader?.name || '?'} · {file.uploadedAt}
                    {team ? ` · ${team.name}` : ''}
                    {file.contentType ? ` · ${contentTypeLabel(file.contentType)}` : ''}
                    {file.tag === 'administrative' ? ' · Admin' : ''}
                  </p>
                </div>
                <div className="th-file-shared-to">
                  {shared.slice(0, 3).map((mem) => (
                    <AvatarCircle key={mem.id} name={mem.name} role={mem.role} size={22} />
                  ))}
                  {shared.length > 3 && (
                    <span style={{ fontSize: '0.55rem', color: '#6b7280', marginLeft: 4 }}>+{shared.length - 3}</span>
                  )}
                </div>
                <div className="th-file-actions">
                  <button type="button" className="th-icon-btn" title="Send to…" onClick={() => setSendFile(file)}>
                    <i className="bi bi-send" />
                  </button>
                  <button type="button" className="th-icon-btn" title="Download">
                    <i className="bi bi-download" />
                  </button>
                  <button type="button" className="th-icon-btn" title="Delete">
                    <i className="bi bi-trash3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────── */
export default function OrgTeamHubPage() {
  const { isOrgUser, orgRole, orgData, isLoading } = useOrg();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!isOrgUser || !orgData) return;
    const emailMatch = getMemberByEmail(orgData?.member?.email);
    const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];
    setTasks(getTasksByRole(orgRole, currentMember.id));
  }, [isOrgUser, orgData, orgRole]);

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading Team Hub…</div>;
  if (!isOrgUser) return <div style={{ padding: '2rem', color: '#888' }}>This page is for organizational members only.</div>;

  const isExecutive = orgRole === 'executive';
  const isPortfolioManager = orgRole === 'portfolio_manager';
  const isAnalyst = orgRole === 'analyst';

  return (
    <div className="dashboard-page-inset th-page">
      <div className="th-hero">
        <div className="th-hero-left">
          <div className="th-hero-icon">
            <i className="bi bi-building" />
          </div>
          <div>
            <h1>Team Hub</h1>
            <p className="th-hero-sub">
              {orgData?.org?.name || 'Organization'} · {orgRole?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="th-hero-stats">
          <div className="th-hero-stat">
            <div className="th-hero-stat-value">{MOCK_MEMBERS.length}</div>
            <div className="th-hero-stat-label">Members</div>
          </div>
          <div className="th-hero-stat">
            <div className="th-hero-stat-value">{MOCK_TEAMS.length}</div>
            <div className="th-hero-stat-label">Teams</div>
          </div>
          <div className="th-hero-stat">
            <div className="th-hero-stat-value">{tasks.length}</div>
            <div className="th-hero-stat-label">Tasks</div>
          </div>
        </div>
      </div>

      {isExecutive && <TeamRankingRow />}

      <div className="th-row-task-file">
        <div className="th-card th-task-col">
          <div className="th-card-header">
            <div className="th-card-header-left">
              <i className="bi bi-list-task" />
              <span>{isAnalyst ? 'My Tasks' : 'Task Management'}</span>
            </div>
            <span style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 600 }}>{tasks.length}</span>
          </div>
          <div className="th-card-body th-task-scroll">
            {tasks.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>No tasks yet.</p>
            ) : (
              tasks.slice(0, 10).map((t) => (
                <div key={t.id} className="th-task-row">
                  <div style={{ minWidth: 0 }}>
                    <p className="th-task-title">{t.title}</p>
                    <p className="th-task-meta">
                      {t.priority} · {t.category || ''}
                    </p>
                  </div>
                  <span
                    className={`th-badge ${t.status === 'completed' ? 'completed' : t.status === 'in_progress' ? 'in-progress' : 'pending'}`}
                  >
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <FilePortalCard members={MOCK_MEMBERS} />
      </div>

      <div className="th-row-compact">
        <div className="th-card th-compact-card">
          <div className="th-card-header">
            <div className="th-card-header-left">
              <i className="bi bi-mortarboard" />
              <span>Learning Assignments</span>
            </div>
          </div>
          <div className="th-card-body">
            <p style={{ color: '#9ca3af', fontSize: '0.78rem' }}>
              No current assignments from {orgData?.org?.name || 'your organization'}.
            </p>
          </div>
        </div>
        <div className="th-compact-card">
          <UpcomingDeadlinesCard />
        </div>
        <div className="th-compact-card">
          <OrgHierarchyCard />
        </div>
      </div>

      <div className="th-grid-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <PerformanceMetricsCard />
          {isExecutive && <StrategicOverviewCard />}
          {isPortfolioManager && <TeamPortfolioSummaryCard />}
          {isAnalyst && <MyCoverageCard />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isExecutive && <ResourceAllocationCard />}
          {isPortfolioManager && <AnalystWorkloadCard />}
          {isAnalyst && <ResearchDeliverablesCard />}
          {isPortfolioManager && <CoveragePipelineCard />}
          {isAnalyst && <SkillDevelopmentCard />}
        </div>
      </div>
    </div>
  );
}

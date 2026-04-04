'use client';

import { useOrg } from '@/contexts/OrgContext';
import { useEffect, useState, useMemo, useRef } from 'react';
import { OrgHierarchyCard } from '@/components/org/OrgHierarchyCard';
import { PerformanceMetricsCard } from '@/components/org/PerformanceMetricsCard';
import { UpcomingDeadlinesCard } from '@/components/org/UpcomingDeadlinesCard';
import {
  StrategicOverviewCard,
  TeamPerformanceComparisonCard,
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
import { getTasksByRole, getMemberByEmail, MOCK_MEMBERS, MOCK_TEAMS } from '@/lib/orgMockData';
import '../../../../app-legacy/assets/css/theme.css';
import './team-hub.css';

/* ── File type helpers ─────────────────────────────────────── */
function getFileTypeInfo(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return { type: 'pdf', icon: 'bi-file-earmark-pdf', label: 'PDF' };
  if (['pptx', 'ppt'].includes(ext)) return { type: 'pptx', icon: 'bi-file-earmark-slides', label: 'PPTX' };
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { type: 'xlsx', icon: 'bi-file-earmark-spreadsheet', label: 'Excel' };
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return { type: 'video', icon: 'bi-camera-video', label: 'Video' };
  if (['doc', 'docx'].includes(ext)) return { type: 'doc', icon: 'bi-file-earmark-word', label: 'Word' };
  return { type: 'other', icon: 'bi-file-earmark', label: ext?.toUpperCase() || 'File' };
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

/* ── Mock files ────────────────────────────────────────────── */
const MOCK_FILES = [
  { id: 'f1', name: 'Q2 TMT Stock Pitch.pptx', size: 4200000, uploadedBy: 'm3', sharedWith: ['m1', 'm2', 'm10'], uploadedAt: '2026-04-02', category: 'presentation' },
  { id: 'f2', name: 'AAPL Valuation Model.xlsx', size: 890000, uploadedBy: 'm10', sharedWith: ['m3', 'm11'], uploadedAt: '2026-04-01', category: 'model' },
  { id: 'f3', name: 'Healthcare Sector Primer.pdf', size: 2100000, uploadedBy: 'm4', sharedWith: ['m1', 'm13', 'm14'], uploadedAt: '2026-03-30', category: 'research' },
  { id: 'f4', name: 'Weekly Investment Committee Recording.mp4', size: 156000000, uploadedBy: 'm1', sharedWith: ['m2', 'm3', 'm4', 'm5', 'm6'], uploadedAt: '2026-03-28', category: 'recording' },
  { id: 'f5', name: 'Comparable Company Analysis - Semis.xlsx', size: 1200000, uploadedBy: 'm22', sharedWith: ['m3', 'm10'], uploadedAt: '2026-03-27', category: 'model' },
  { id: 'f6', name: 'Energy Sector Update Q1.pdf', size: 3400000, uploadedBy: 'm5', sharedWith: ['m1', 'm2', 'm15'], uploadedAt: '2026-03-25', category: 'research' },
  { id: 'f7', name: 'New Analyst Onboarding Guide.pdf', size: 780000, uploadedBy: 'm2', sharedWith: ['m12', 'm23', 'm18'], uploadedAt: '2026-03-20', category: 'training' },
  { id: 'f8', name: 'Portfolio Risk Review - March.pptx', size: 5600000, uploadedBy: 'm6', sharedWith: ['m1', 'm2'], uploadedAt: '2026-03-18', category: 'presentation' },
];

const FILE_FILTERS = ['All', 'PDF', 'PPTX', 'Excel', 'Video'];

/* ── Upload Modal ──────────────────────────────────────────── */
function UploadModal({ isOpen, onClose, members }) {
  const [dragover, setDragover] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setDragover(false);
      setSelectedFile(null);
      setRecipients([]);
      setShowMemberPicker(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const toggleRecipient = (id) => {
    setRecipients((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const handleUpload = () => {
    // In production: upload to Supabase Storage, insert row in org_files table
    alert(`Upload "${selectedFile?.name}" and share with ${recipients.length} team member(s). In production this would use Supabase Storage.`);
    onClose();
  };

  return (
    <div className="th-modal-overlay" onClick={onClose} role="presentation">
      <div className="th-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="th-upload-title">
        <div className="th-modal-header">
          <h2 id="th-upload-title">
            <i className="bi bi-cloud-arrow-up" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
            Upload & share file
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
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
              <small>PDF, PowerPoint, Excel, Word, or Video (max 200MB)</small>
            </>
          )}
        </div>

        <div className="th-form-group">
          <span className="th-form-label">Share with team members</span>
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
            <i className="bi bi-people" />
            {recipients.length ? `${recipients.length} selected` : 'Select recipients'}
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
                  <div className="th-member-check">
                    {recipients.includes(m.id) && <i className="bi bi-check" />}
                  </div>
                  <AvatarCircle name={m.name} role={m.role} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#f0f6fc', fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>{m.name}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.6rem', margin: 0 }}>
                      {m.sub_role}{' '}
                      {m.team_id ? `· ${MOCK_TEAMS.find((t) => t.id === m.team_id)?.name || ''}` : ''}
                    </p>
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
          <i className="bi bi-cloud-arrow-up" style={{ marginRight: '0.35rem' }} />
          {recipients.length > 0
            ? `Upload & share with ${recipients.length} member${recipients.length > 1 ? 's' : ''}`
            : 'Upload file'}
        </button>
      </div>
    </div>
  );
}

/* ── Send To Modal ─────────────────────────────────────────── */
function SendToModal({ file, isOpen, onClose, members }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (isOpen && file?.id) setSelected([]);
  }, [isOpen, file?.id]);

  if (!isOpen || !file) return null;

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  const handleSend = () => {
    alert(`Shared "${file.name}" with ${selected.length} member(s). In production this would update the org_files shared_with column.`);
    onClose();
  };

  return (
    <div className="th-modal-overlay" onClick={onClose} role="presentation">
      <div className="th-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="th-send-title">
        <div className="th-modal-header">
          <h2 id="th-send-title">
            <i className="bi bi-send" style={{ marginRight: '0.5rem', color: '#6366f1' }} />
            Send file
          </h2>
          <button type="button" className="th-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#e2e8f0', margin: '0 0 0.75rem' }}>
          <i className={`bi ${getFileTypeInfo(file.name).icon}`} style={{ marginRight: '0.35rem', color: '#6366f1' }} />
          {file.name}
        </p>
        <span className="th-form-label">Select recipients</span>
        <div className="th-member-list">
          {members.map((m) => (
            <div
              key={m.id}
              className={`th-member-row${selected.includes(m.id) ? ' selected' : ''}`}
              onClick={() => toggle(m.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(m.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="th-member-check">{selected.includes(m.id) && <i className="bi bi-check" />}</div>
              <AvatarCircle name={m.name} role={m.role} size={28} />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#f0f6fc', fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>{m.name}</p>
                <p style={{ color: '#6b7280', fontSize: '0.6rem', margin: 0 }}>{m.sub_role}</p>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="th-submit-btn" style={{ marginTop: '0.75rem' }} disabled={!selected.length} onClick={handleSend}>
          Send to {selected.length || '...'} member{selected.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}

/* ── File Portal Card ──────────────────────────────────────── */
function FilePortalCard({ members }) {
  const [files] = useState(MOCK_FILES);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [sendFile, setSendFile] = useState(null);

  const filtered = useMemo(() => {
    let list = files;
    if (filter !== 'All') {
      const typeMap = { PDF: 'pdf', PPTX: 'pptx', Excel: 'xlsx', Video: 'video' };
      list = list.filter((f) => getFileTypeInfo(f.name).type === typeMap[filter]);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [files, filter, search]);

  return (
    <>
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} members={members} />
      <SendToModal file={sendFile} isOpen={!!sendFile} onClose={() => setSendFile(null)} members={members} />

      <div className="th-card th-full-width">
        <div className="th-card-header">
          <div className="th-card-header-left">
            <i className="bi bi-folder2-open" />
            <span>Team File Portal</span>
          </div>
          <button type="button" className="th-upload-btn" onClick={() => setUploadOpen(true)}>
            <i className="bi bi-cloud-arrow-up" /> Upload & share
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
            {FILE_FILTERS.map((f) => (
              <button key={f} type="button" className={`th-filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="th-file-list">
            {filtered.length === 0 && (
              <p style={{ color: '#6b7280', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0' }}>
                No files match your search.
              </p>
            )}
            {filtered.map((file) => {
              const info = getFileTypeInfo(file.name);
              const uploader = members.find((m) => m.id === file.uploadedBy);
              const shared = file.sharedWith.map((sid) => members.find((mm) => mm.id === sid)).filter(Boolean);
              return (
                <div key={file.id} className="th-file-row">
                  <div className={`th-file-icon ${info.type}`}>
                    <i className={`bi ${info.icon}`} />
                  </div>
                  <div className="th-file-info">
                    <p className="th-file-name">{file.name}</p>
                    <p className="th-file-meta">
                      {formatSize(file.size)} · {uploader?.name || 'Unknown'} · {file.uploadedAt}
                    </p>
                  </div>
                  <div className="th-file-shared-to">
                    {shared.slice(0, 3).map((mem) => (
                      <AvatarCircle key={mem.id} name={mem.name} role={mem.role} size={22} />
                    ))}
                    {shared.length > 3 && (
                      <span style={{ fontSize: '0.55rem', color: '#6b7280', marginLeft: '4px' }}>+{shared.length - 3}</span>
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
    </>
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
    const roleTasks = getTasksByRole(orgRole, currentMember.id);
    setTasks(roleTasks);
  }, [isOrgUser, orgData, orgRole]);

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading Team Hub…</div>;
  if (!isOrgUser) return <div style={{ padding: '2rem', color: '#888' }}>This page is for organizational members only.</div>;

  const isExecutive = orgRole === 'executive';
  const isPortfolioManager = orgRole === 'portfolio_manager';
  const isAnalyst = orgRole === 'analyst';
  const memberCount = MOCK_MEMBERS.length;
  const teamCount = MOCK_TEAMS.length;

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
            <div className="th-hero-stat-value">{memberCount}</div>
            <div className="th-hero-stat-label">Members</div>
          </div>
          <div className="th-hero-stat">
            <div className="th-hero-stat-value">{teamCount}</div>
            <div className="th-hero-stat-label">Teams</div>
          </div>
          <div className="th-hero-stat">
            <div className="th-hero-stat-value">{tasks.length}</div>
            <div className="th-hero-stat-label">Tasks</div>
          </div>
          <div className="th-hero-stat">
            <div className="th-hero-stat-value">{MOCK_FILES.length}</div>
            <div className="th-hero-stat-label">Files</div>
          </div>
        </div>
      </div>

      <FilePortalCard members={MOCK_MEMBERS} />

      <div className="th-grid-main">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="th-card">
            <div className="th-card-header">
              <div className="th-card-header-left">
                <i className="bi bi-list-task" />
                <span>{isAnalyst ? 'My Tasks' : 'Task Management'}</span>
              </div>
              <span style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 600 }}>{tasks.length} total</span>
            </div>
            <div className="th-card-body">
              {tasks.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>No tasks yet.</p>
              ) : (
                tasks.slice(0, 8).map((t) => (
                  <div key={t.id} className="th-task-row">
                    <div style={{ minWidth: 0 }}>
                      <p className="th-task-title">{t.title}</p>
                      <p className="th-task-meta">
                        {t.priority} priority{t.category ? ` · ${t.category}` : ''}
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

          <PerformanceMetricsCard />

          {isExecutive && <StrategicOverviewCard />}
          {isPortfolioManager && <TeamPortfolioSummaryCard />}
          {isAnalyst && <MyCoverageCard />}

          {isExecutive && <TeamPerformanceComparisonCard />}
          {isPortfolioManager && <AnalystWorkloadCard />}
          {isAnalyst && <ResearchDeliverablesCard />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <OrgHierarchyCard />
          <UpcomingDeadlinesCard />

          {isExecutive && <ResourceAllocationCard />}
          {isPortfolioManager && <CoveragePipelineCard />}
          {isAnalyst && <SkillDevelopmentCard />}
        </div>
      </div>
    </div>
  );
}

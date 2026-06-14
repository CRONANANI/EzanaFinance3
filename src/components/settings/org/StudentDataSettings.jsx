'use client';

import { useEffect, useState } from 'react';

export function StudentDataSettings() {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/members', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (alive && res.ok) {
          const students = (data.members || []).filter((m) => m.role !== 'executive');
          setMembers(students);
          if (students[0]) setSelected(students[0].id);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const exportStudent = () => {
    if (!selected) return;
    window.open(`/api/org/students/${selected}/export`, '_blank', 'noopener');
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Student Data &amp; Privacy</h2>
        <p className="settings-panel-desc">
          What student data the platform stores and how it can be exported. Designed around
          FERPA-style expectations for student-managed funds.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">What we store</div>
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: '#9ca3af', fontSize: '0.84rem', lineHeight: 1.7 }}>
          <li>Grades and rubric feedback on pitches, research, coverage, and participation.</li>
          <li>Pitch performance and outcomes (returns, alpha, committee decisions).</li>
          <li>Participation — assignments, votes, meeting attendance, recognition.</li>
        </ul>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Who can see grades</div>
        <p style={{ color: '#9ca3af', fontSize: '0.84rem', lineHeight: 1.6 }}>
          Enforced by row-level security: <strong style={{ color: '#e2e8f0' }}>a student sees only
          their own grades</strong>; executives and faculty advisors see all. Visibility to students
          can be paused under <em>Faculty Advisor Controls</em>.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Export a student record</div>
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Download a student&apos;s grades, pitches, and participation as a JSON file. Every export is
          recorded in the audit log.
        </p>
        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
        ) : (
          <div className="settings-row">
            <div className="settings-field" style={{ flex: 1 }}>
              <label className="settings-label">Student</label>
              <select
                className="settings-input"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                {members.length === 0 && <option value="">No students</option>}
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name || 'Member'}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-field" style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className="settings-btn-primary"
                onClick={exportStudent}
                disabled={!selected}
              >
                Export record
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Retention</div>
        <p style={{ color: '#9ca3af', fontSize: '0.84rem', lineHeight: 1.6 }}>
          When a cohort is archived, its members&apos; track record is snapshotted and the members are
          graduated out of the active roster. Archived cohort data is retained read-only for program
          history; export a record before archiving if a student needs a copy.
        </p>
      </div>
    </div>
  );
}

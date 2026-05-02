'use client';

import { useEffect, useState } from 'react';

export function PinnedAttachmentPicker({ ticker, selected = [], onChange }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch(`/api/org/pinned-items?ticker=${encodeURIComponent(ticker || '')}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, [ticker]);

  const toggle = (item) => {
    const exists = selected.some(
      (s) => s.attachment_ref === item.attachment_ref && s.attachment_kind === item.attachment_kind
    );
    if (exists) {
      onChange(
        selected.filter(
          (s) => !(s.attachment_ref === item.attachment_ref && s.attachment_kind === item.attachment_kind)
        )
      );
    } else {
      onChange([...selected, item]);
    }
  };

  if (items === null) {
    return (
      <div style={{ fontSize: '0.75rem', color: '#8b949e', padding: '0.5rem' }}>Loading collection…</div>
    );
  }
  if (items.length === 0) {
    return (
      <div
        style={{
          fontSize: '0.75rem',
          color: '#8b949e',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 6,
        }}
      >
        Your collection is empty. Pin charts, models, or news from research pages to attach them here.
      </div>
    );
  }

  const isSelected = (item) =>
    selected.some(
      (s) => s.attachment_ref === item.attachment_ref && s.attachment_kind === item.attachment_kind
    );

  const ICONS = {
    pinned_card: 'bi-pin-fill',
    saved_chart: 'bi-graph-up',
    saved_model: 'bi-calculator',
    saved_news: 'bi-newspaper',
    document: 'bi-file-earmark',
  };

  return (
    <div className="ot-attachment-list">
      {items.map((item, i) => (
        <div
          key={i}
          className={`ot-attachment-item ${isSelected(item) ? 'is-selected' : ''}`}
          onClick={() => toggle(item)}
          onKeyDown={(e) => e.key === 'Enter' && toggle(item)}
          role="button"
          tabIndex={0}
        >
          <i className={`bi ${ICONS[item.attachment_kind] || 'bi-file-earmark'} ot-attachment-icon`} />
          <div style={{ flex: 1 }}>
            <div className="ot-attachment-label">{item.attachment_label}</div>
            <div className="ot-attachment-kind-pill">{item.attachment_kind.replace('_', ' ')}</div>
          </div>
          {isSelected(item) && <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }} />}
        </div>
      ))}
    </div>
  );
}

'use client';

import { useMemo, useRef, useState } from 'react';
import './social.css';

/**
 * Textarea with @-autocomplete over active org members. Reports both the raw
 * text (onChange) and the resolved mentioned user_ids (onMentionsChange).
 *
 * Props:
 *  - value, onChange(text)
 *  - members: [{ user_id, display_name, role }]
 *  - onMentionsChange(userIds: string[])
 *  - placeholder, rows
 */
export function MentionInput({
  value,
  onChange,
  members = [],
  onMentionsChange,
  placeholder,
  rows = 3,
}) {
  const ref = useRef(null);
  const [query, setQuery] = useState(null); // active @query or null
  const [activeIdx, setActiveIdx] = useState(0);

  const matches = useMemo(() => {
    if (query == null) return [];
    const q = query.toLowerCase();
    return members
      .filter((m) => (m.display_name || '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, members]);

  // Recompute which members are mentioned in the current text (full name match).
  const reportMentions = (text) => {
    if (!onMentionsChange) return;
    const lower = text.toLowerCase();
    const ids = members
      .filter((m) => {
        const name = (m.display_name || '').toLowerCase();
        const first = name.split(' ')[0];
        return name && (lower.includes(`@${name}`) || (first && lower.includes(`@${first}`)));
      })
      .map((m) => m.user_id);
    onMentionsChange([...new Set(ids)]);
  };

  const handleChange = (e) => {
    const text = e.target.value;
    onChange?.(text);
    reportMentions(text);

    // Detect an in-progress @mention immediately before the caret.
    const caret = e.target.selectionStart;
    const upto = text.slice(0, caret);
    const m = upto.match(/@([\w]*)$/);
    setQuery(m ? m[1] : null);
    setActiveIdx(0);
  };

  const pick = (member) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([\w]*)$/, '');
    const after = value.slice(caret);
    const insert = `@${member.display_name} `;
    const next = `${before}${insert}${after}`;
    onChange?.(next);
    reportMentions(next);
    setQuery(null);
    // Restore focus after React updates the value.
    requestAnimationFrame(() => {
      el.focus();
      const pos = (before + insert).length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e) => {
    if (query == null || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pick(matches[activeIdx]);
    } else if (e.key === 'Escape') {
      setQuery(null);
    }
  };

  return (
    <div className="sc2-mention-wrap">
      <textarea
        ref={ref}
        className="sc2-textarea"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
      />
      {query != null && matches.length > 0 && (
        <div className="sc2-mention-menu" role="listbox">
          {matches.map((m, i) => (
            <button
              key={m.user_id}
              type="button"
              className={`sc2-mention-item${i === activeIdx ? ' is-active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m);
              }}
            >
              <span>{m.display_name}</span>
              {m.role && <span className="sc2-mention-role">{m.role.replace('_', ' ')}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

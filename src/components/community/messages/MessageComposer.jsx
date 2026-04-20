'use client';

import { useEffect, useRef } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';

export function MessageComposer({
  value,
  onChange,
  onSend,
  sending,
  disabled,
  error,
  onTyping,
  placeholder = 'Type message',
}) {
  const taRef = useRef(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend?.();
    }
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
    if (e.target.value.trim()) onTyping?.();
  };

  const canSend = !!value?.trim() && !sending && !disabled;

  return (
    <div className="m-composer">
      {error && (
        <p className="m-composer__error" role="alert">
          {error}
        </p>
      )}
      <div className="m-composer__row">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="m-composer__textarea"
          aria-label="Type a message"
        />
        <button
          type="button"
          className="m-composer__tool"
          aria-label="Add emoji"
          title="Emoji picker coming soon"
          tabIndex={-1}
        >
          <Smile size={16} />
        </button>
        <button
          type="button"
          className="m-composer__tool"
          aria-label="Attach file"
          title="Attachments coming soon"
          tabIndex={-1}
        >
          <Paperclip size={16} />
        </button>
        <button
          type="button"
          className="m-composer__send"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

'use client';

import { MessageSquare, Plus } from 'lucide-react';

export function EmptyConversationState({ onStartNew }) {
  return (
    <div className="m-empty">
      <div className="m-empty__card">
        <div className="m-empty__icon" aria-hidden>
          <MessageSquare size={22} />
        </div>
        <h2 className="m-empty__title">Select a conversation</h2>
        <p className="m-empty__desc">
          Pick a thread from the list to read messages, or start a new conversation
          with someone from the community.
        </p>
        {onStartNew && (
          <button type="button" className="m-empty__cta" onClick={onStartNew}>
            <Plus size={14} /> New message
          </button>
        )}
      </div>
    </div>
  );
}

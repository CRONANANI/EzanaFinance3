'use client';

export function EmptyConversationState({ onStartNew }) {
  return (
    <div className="m-empty">
      <div className="m-empty__card">
        <div className="m-empty__icon" aria-hidden="true">
          <i className="bi bi-chat-dots" />
        </div>
        <h2 className="m-empty__title">Select a chat</h2>
        <p className="m-empty__desc">
          Pick a chat from the list, or start a new one with anyone on Ezana. Friends get your
          message right away; anyone else gets a message request.
        </p>
        {onStartNew && (
          <button type="button" className="m-empty__cta" onClick={onStartNew}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> New message
          </button>
        )}
      </div>
    </div>
  );
}

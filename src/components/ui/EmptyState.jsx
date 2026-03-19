'use client';

/**
 * EmptyState - thoughtful empty state for lists/tables
 * @param {string} icon - Bootstrap icon class (e.g. 'bi-bookmark')
 * @param {string} title - Main message
 * @param {string} description - Optional subtext
 * @param {React.ReactNode} action - CTA button/link
 */
export function EmptyState({ icon = 'bi-inbox', title = 'No items yet', description, action }) {
  return (
    <div className="empty-state" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
    }}>
      <div className="empty-state-icon" style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: 'rgba(16,185,129,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 1,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: '1.5rem', color: '#6b7280' }} />
      </div>
      <h3 className="empty-state-title" style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: '#f0f6fc',
        margin: '0.5rem 0 0.25rem',
      }}>{title}</h3>
      {description && (
        <p className="empty-state-desc" style={{
          fontSize: '0.8125rem',
          color: '#6b7280',
          margin: 0,
          maxWidth: 280,
        }}>{description}</p>
      )}
      {action && (
        <div style={{ marginTop: '1rem' }}>{action}</div>
      )}
    </div>
  );
}

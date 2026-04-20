'use client';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '?';
}

export function OnlineNowStrip({ users, onSeeAll }) {
  if (!users || users.length === 0) return null;
  return (
    <div className="m-online">
      <div className="m-online__head">
        <h3 className="m-online__title">Online Now</h3>
        {onSeeAll && (
          <button type="button" className="m-online__see-all" onClick={onSeeAll}>
            See all
          </button>
        )}
      </div>
      <div className="m-online__strip" role="list">
        {users.slice(0, 8).map((u) => (
          <div key={u.id} className="m-online__avatar" role="listitem" title={u.name}>
            {u.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatar_url} alt="" className="m-online__avatar-img" />
            ) : (
              <div className="m-online__avatar-fallback" aria-hidden>
                {getInitials(u.name)}
              </div>
            )}
            <span className="m-online__dot" aria-label="Online" />
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

export function WorthItTile({
  iconDefault,
  iconActive,
  label,
  labelActive,
  subLabel,
  subLabelActive,
  isActive,
  isToggle = true,
  onClick,
}) {
  const showActive = isToggle && isActive;
  const iconClass = showActive ? iconActive : iconDefault;
  const displayLabel = showActive && labelActive ? labelActive : label;
  const displaySub = showActive && subLabelActive ? subLabelActive : subLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`echo-worthit-tile ${showActive ? 'is-active' : ''}`}
      aria-pressed={isToggle ? isActive : undefined}
    >
      <div className="echo-worthit-tile-icon-wrap">
        <i className={`bi ${iconClass}`} aria-hidden />
      </div>
      <div className="echo-worthit-tile-label">{displayLabel}</div>
      <div className="echo-worthit-tile-sub">{displaySub}</div>
    </button>
  );
}

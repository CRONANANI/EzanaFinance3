'use client';

function formatDateLabel(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yest)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function DateSeparator({ date }) {
  return (
    <div className="m-date-sep" role="separator" aria-label={formatDateLabel(date)}>
      <span className="m-date-sep__pill">{formatDateLabel(date)}</span>
    </div>
  );
}

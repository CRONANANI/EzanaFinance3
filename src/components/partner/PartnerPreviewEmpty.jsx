/**
 * Honest placeholder for partner surfaces that have no real data source yet
 * (QA PAR-5, PAR-7, PAR-12). Keeps the card in place without inventing numbers.
 */
export function PartnerPreviewEmpty({
  icon = 'bi-hourglass-split',
  title = 'Preview: data coming soon',
  children,
}) {
  return (
    <div className="ptr-preview-empty" role="note">
      <i className={`bi ${icon}`} aria-hidden />
      <span className="ptr-preview-empty-title">{title}</span>
      {children ? <span className="ptr-preview-empty-body">{children}</span> : null}
    </div>
  );
}

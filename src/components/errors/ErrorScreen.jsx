'use client';

/**
 * The one branded error screen (Nov 2026). The 404 design ("Wandered off",
 * ErrorScreen.css) used for every not-found and error state:
 *
 *   variant  'not-found'  the "4 [mark] 4" code
 *            'error'      the orbit mark alone, a "Try again" button, and the
 *                         Next.js error digest so users can quote it to support
 *   layout   'page'       full viewport, light, global nav hidden: the 404 and
 *                         the root / global error boundaries
 *            'inline'     inside the app shell, following the user's theme:
 *                         route-segment boundaries keep the navigation, so one
 *                         failing section never takes the whole app down
 *
 * Props: onRetry (shows "Try again"), digest, title / message (overrides; the
 * title may contain an <em>), homeHref / homeLabel, helpHref / helpLabel,
 * details (shown in development only, e.g. the error stack).
 */
import Link from 'next/link';
import './ErrorScreen.css';

const COPY = {
  'not-found': {
    title: (
      <>
        This page <em>wandered off</em> the map.
      </>
    ),
    message: 'Even our best signals couldn’t track it down. Let’s get you back to familiar ground.',
    footer: 'ERROR 404 · EZANA.WORLD',
  },
  error: {
    title: (
      <>
        This page <em>hit a snag</em>.
      </>
    ),
    message:
      'Something on our side interrupted it. Try again, and if it keeps happening, let us know.',
    footer: 'ERROR · EZANA.WORLD',
  },
};

function OrbitMark() {
  return (
    <span className="ez-404__zero" aria-hidden="true">
      <span className="ez-404__orbit" />
      <span className="ez-404__disc" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ez-404__mark" src="/ezana-logo.svg" alt="" width={104} height={104} />
    </span>
  );
}

export default function ErrorScreen({
  variant = 'not-found',
  layout = 'page',
  onRetry,
  digest,
  title,
  message,
  homeHref = '/',
  homeLabel = 'Back to home',
  helpHref = '/help-center',
  helpLabel = 'Visit Help Center',
  details,
}) {
  const isError = variant === 'error';
  const copy = COPY[variant] ?? COPY['not-found'];
  const inline = layout === 'inline';
  const Heading = inline ? 'h2' : 'h1';
  const Main = inline ? 'div' : 'main';
  const showDetails = details && process.env.NODE_ENV === 'development';

  return (
    <div
      className={inline ? 'ez-404 ez-404--inline' : 'ez-404 force-light-theme'}
      role={isError ? 'alert' : undefined}
    >
      {inline ? null : (
        <header className="ez-404__header">
          <Link href="/" className="ez-404__home-mark" aria-label="Ezana Finance home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ezana-logo.svg" alt="" width={48} height={48} />
          </Link>
        </header>
      )}

      <Main id={inline ? undefined : 'main-content'} className="ez-404__main">
        <div className="ez-404__content">
          {isError ? (
            <p className="ez-404__code ez-404__code--solo" role="img" aria-label="Error">
              <OrbitMark />
            </p>
          ) : (
            <p className="ez-404__code" role="img" aria-label="Error 404">
              <span className="ez-404__digit" aria-hidden="true">
                4
              </span>
              <OrbitMark />
              <span className="ez-404__digit" aria-hidden="true">
                4
              </span>
            </p>
          )}

          <Heading className="ez-404__title">{title ?? copy.title}</Heading>
          <p className="ez-404__lead">{message ?? copy.message}</p>

          <div className="ez-404__actions">
            {onRetry ? (
              <button
                type="button"
                className="ez-404__btn ez-404__btn--primary"
                onClick={() => onRetry()}
              >
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                Try again
              </button>
            ) : null}
            <Link
              href={homeHref}
              className={`ez-404__btn ${onRetry ? 'ez-404__btn--ghost' : 'ez-404__btn--primary'}`}
            >
              <i className="bi bi-arrow-left" aria-hidden="true" />
              {homeLabel}
            </Link>
            {!onRetry && helpHref ? (
              <Link href={helpHref} className="ez-404__btn ez-404__btn--ghost">
                {helpLabel}
              </Link>
            ) : null}
          </div>

          {digest ? (
            <p className="ez-404__digest">
              Reference <span>{digest}</span>
            </p>
          ) : null}
          {showDetails ? <pre className="ez-404__details">{details}</pre> : null}
        </div>
      </Main>

      {inline ? null : <footer className="ez-404__footer">{copy.footer}</footer>}
    </div>
  );
}

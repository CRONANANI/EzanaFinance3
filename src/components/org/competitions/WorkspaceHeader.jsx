'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dropdown, MenuItem } from '@/components/ds';
import { stageOf } from '@/lib/org-competitions-model';

/**
 * The head of one event's workspace, shared by every sub-page: a link back to
 * the landing screen, the event's name (at section size: there is no page
 * title block), its stage, the viewer's role in it, a Switch event menu and
 * the text tabs. Tabs are links to the sub-page addresses, so every address
 * keeps working; the sample workspace passes `onTab` and switches in place.
 */
export function WorkspaceHeader({
  name,
  status,
  roleLabel,
  tabs,
  active,
  onTab,
  events = [],
  currentSlug,
  sample = false,
  aside = null,
}) {
  const router = useRouter();
  const stage = stageOf(status);
  const others = events.filter((e) => e.slug !== currentSlug);

  return (
    <header className="pcx-ws">
      <Link href="/org-competitions" className="pcx-ws__back">
        <i className="bi bi-arrow-left" aria-hidden="true" />
        All competitions
      </Link>
      <div className="pcx-ws__row">
        <div className="pcx-ws__name">
          <h1 className="pcx-ws__title">{name}</h1>
          <span className="pcx-ws__meta">
            <span className="pcx-stage">
              <i className={`bi ${stage.icon}`} aria-hidden="true" />
              {stage.label}
            </span>
            {roleLabel && <span>{roleLabel}</span>}
            {sample && <span className="pcx-ws__sample">Sample content</span>}
          </span>
        </div>
        <div className="pcx-ws__aside">
          {aside}
          {others.length > 0 && (
            <Dropdown
              align="right"
              className="pcx-ws__switch"
              trigger={
                <span className="tcc-textbtn">
                  Switch event <i className="bi bi-chevron-down" aria-hidden="true" />
                </span>
              }
            >
              {others.map((e) => (
                <MenuItem key={e.slug} onClick={() => router.push(`/org-competitions/${e.slug}`)}>
                  {e.name}
                </MenuItem>
              ))}
            </Dropdown>
          )}
        </div>
      </div>
      <nav className="pcx-ws__tabs" aria-label="Event sections">
        {tabs.map((t) =>
          onTab ? (
            <button
              key={t.key}
              type="button"
              className={`pcx-ws__tab${active === t.key ? ' is-on' : ''}`}
              aria-current={active === t.key ? 'page' : undefined}
              onClick={() => onTab(t.key)}
            >
              {t.label}
            </button>
          ) : (
            <Link
              key={t.key}
              href={t.href}
              className={`pcx-ws__tab${active === t.key ? ' is-on' : ''}`}
              aria-current={active === t.key ? 'page' : undefined}
            >
              {t.label}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
}

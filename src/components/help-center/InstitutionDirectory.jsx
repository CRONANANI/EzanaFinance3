'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CAP_BANKING,
  CAP_HOLDINGS,
  buildIndex,
  initialsFor,
  searchInstitutions,
} from '@/lib/help-center/institution-search';
import './institution-directory.css';

/**
 * Searchable wall of supported banks and brokerages, embedded in the Help
 * Center article "Supported Banks and Brokerages".
 *
 * One request loads the whole directory (CDN cached), then every search runs
 * in the browser, so results follow the keystroke with no network in the
 * path. Before a search the wall shows the institutions that have a logo;
 * a search covers all of them, and a result without a logo gets an initials
 * tile.
 *
 * The landing page's integrations CTA links here, optionally with ?q= to
 * arrive on a search already run.
 */
const RESULT_LIMIT = 48;
const SKELETON_TILES = 12;
const CSV_ARTICLE = '/help-center/user/article/importing-positions-from-a-csv';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

function Capabilities({ caps }) {
  const labels = [];
  if (caps & CAP_HOLDINGS) labels.push('Holdings');
  if (caps & CAP_BANKING) labels.push('Banking');
  if (!labels.length) labels.push('Supported');
  return (
    <span className="hid-caps">
      {labels.map((label) => (
        <span key={label} className="hid-cap">
          {label}
        </span>
      ))}
    </span>
  );
}

function Tile({ name, caps, logo }) {
  const [failed, setFailed] = useState(false);
  return (
    <li className="hid-tile">
      <span className="hid-mark" aria-hidden="true">
        {logo && !failed ? (
          /* A plain img: the logos are small remote PNGs on several hosts, and
             the image optimizer would need each host allow-listed to save a
             few kilobytes. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={logo}
            alt=""
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="hid-initials">{initialsFor(name)}</span>
        )}
      </span>
      <span className="hid-name">{name}</span>
      <Capabilities caps={caps} />
    </li>
  );
}

export function InstitutionDirectory() {
  const [state, setState] = useState({ status: 'loading', total: 0, featured: [], all: [] });
  const [query, setQuery] = useState('');

  /* ?q= from the landing CTA or a shared link. Read after mount, not with
     useSearchParams, so the article page needs no Suspense boundary and the
     server and first client render stay identical. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q.slice(0, 80));
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/help-center/institutions')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        setState({
          status: 'ready',
          total: Number(d?.total) || 0,
          featured: Array.isArray(d?.featured) ? d.featured : [],
          all: Array.isArray(d?.all) ? d.all : [],
        });
      })
      .catch(() => {
        if (alive) setState((s) => ({ ...s, status: 'error' }));
      });
    return () => {
      alive = false;
    };
  }, []);

  const index = useMemo(() => buildIndex(state.all), [state.all]);
  const logos = useMemo(
    () => new Map(state.featured.map((f) => [f.name, f.logo])),
    [state.featured],
  );

  const trimmed = query.trim();
  const searching = trimmed.length >= 2;
  const results = useMemo(
    () =>
      searching
        ? searchInstitutions(index, trimmed, {
            limit: RESULT_LIMIT,
            hasLogo: (name) => logos.has(name),
          })
        : { items: [], total: 0 },
    [searching, index, trimmed, logos],
  );

  const tiles = searching
    ? results.items.map((r) => ({ ...r, logo: logos.get(r.name) || null }))
    : state.featured;

  let status = '';
  if (state.status === 'ready') {
    if (!searching) {
      status = `Showing ${fmt(state.featured.length)} popular institutions of ${fmt(state.total)}. Search to see the rest.`;
    } else if (results.total === 0) {
      status = `No match for "${trimmed}".`;
    } else if (results.total > results.items.length) {
      status = `Showing the first ${fmt(results.items.length)} of ${fmt(results.total)} matches for "${trimmed}". Keep typing to narrow it down.`;
    } else {
      status = `${fmt(results.total)} ${results.total === 1 ? 'match' : 'matches'} for "${trimmed}".`;
    }
  }

  return (
    <div className="hid-root">
      <div className="hid-search">
        <i className="bi bi-search hid-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="hid-input"
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 80))}
          placeholder="Search for your bank or brokerage"
          aria-label="Search supported banks and brokerages"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {query ? (
          <button
            type="button"
            className="hid-clear"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p className="hid-status" role="status" aria-live="polite">
        {status}
      </p>

      {state.status === 'loading' ? (
        <ul className="hid-grid" aria-hidden="true">
          {Array.from({ length: SKELETON_TILES }, (_, i) => (
            <li key={i} className="hid-tile hid-tile--skeleton" />
          ))}
        </ul>
      ) : null}

      {state.status === 'error' ? (
        <div className="hid-empty">
          <p className="hid-empty-title">The list could not be loaded right now.</p>
          <p className="hid-empty-body">
            Reload the page to try again. In the app, the same search is in the Add Portfolio window
            on Home.
          </p>
        </div>
      ) : null}

      {state.status === 'ready' && tiles.length > 0 ? (
        <ul className="hid-grid" aria-label="Supported institutions">
          {tiles.map((t) => (
            <Tile key={t.name} name={t.name} caps={t.caps} logo={t.logo} />
          ))}
        </ul>
      ) : null}

      {state.status === 'ready' && searching && results.total === 0 ? (
        <div className="hid-empty">
          <p className="hid-empty-title">We do not list &ldquo;{trimmed}&rdquo; yet.</p>
          <p className="hid-empty-body">
            Try the name on your statement or a shorter version of it. If it is still missing, you
            can <a href={CSV_ARTICLE}>import your positions from a CSV file</a> today, or{' '}
            <a
              href={`mailto:contact@ezana.world?subject=${encodeURIComponent(
                `Institution request: ${trimmed}`,
              )}`}
            >
              ask us to add it
            </a>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default InstitutionDirectory;

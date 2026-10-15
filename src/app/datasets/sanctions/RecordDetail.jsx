'use client';

/**
 * One OFAC record in full, for the listings explorer: inline when a row is
 * expanded (compact) and in the side drawer (full).
 *
 * Shown as OFAC wrote it: names, aliases (ALT.CSV and the a.k.a. names in
 * the remarks, labelled by source), programs, address countries and
 * localities, identifiers and facts extracted from the remarks (marked as
 * machine-extracted), OFAC's secondary-sanctions clauses verbatim, "Linked
 * To" notes resolved against the list (a shared name is not proof of the
 * same party, so 0, 1 or several matches are shown as such), records that
 * name this one, the ORIGINAL remarks, and every date with its meaning.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { programMeta } from '@/lib/sanctions/programs';
import { ProgramChip, StateNote, TypeTag, fmt, shortDate, stampLabel } from './ui';

const cache = new Map();

export function useRecord(id) {
  const [state, setState] = useState(() =>
    id && cache.has(id) ? { data: cache.get(id) } : { loading: Boolean(id) },
  );
  useEffect(() => {
    if (!id) return undefined;
    if (cache.has(id)) {
      setState({ data: cache.get(id) });
      return undefined;
    }
    const ctrl = new AbortController();
    setState({ loading: true });
    fetch(`/api/datasets/sanctions/${id}`, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'The record could not be loaded.');
        cache.set(id, body);
        setState({ data: body });
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setState({ error: e.message });
      });
    return () => ctrl.abort();
  }, [id]);
  return state;
}

/** Plain-text record for the clipboard, with its source line. */
export function recordText(r) {
  const lines = [
    r.name,
    `OFAC SDN entry ${r.id} · ${r.type}`,
    `Programs: ${r.programs.map((p) => `${p} (${programMeta(p).label})`).join('; ') || 'none'}`,
    `Address countries: ${r.countries.join('; ') || 'none stated'}`,
  ];
  if (r.localities?.length) lines.push(`Localities: ${r.localities.join('; ')}`);
  lines.push(`Listed by OFAC: ${r.listedOn || 'date not available'}`);
  if (r.aliases?.length) lines.push(`Aliases: ${r.aliases.map((a) => a.alt_name).join('; ')}`);
  if (r.identifiers?.length) {
    lines.push(
      `Identifiers (extracted from OFAC remarks): ${r.identifiers
        .map(
          (i) =>
            `${i.label} ${i.value}${i.issuer ? ` (${i.issuer})` : ''}${i.is_alt ? ' [alt.]' : ''}`,
        )
        .join('; ')}`,
    );
  }
  if (r.secondaryRisk?.length)
    lines.push(`Secondary sanctions risk (OFAC): ${r.secondaryRisk.join(' | ')}`);
  if (r.links?.length)
    lines.push(`Linked To (OFAC note): ${r.links.map((l) => l.name).join('; ')}`);
  if (r.remarks) lines.push(`OFAC remarks: ${r.remarks}`);
  lines.push(
    `Source: US Treasury OFAC SDN list (public domain), entry ${r.id}, via ezana.world, copied ${new Date()
      .toISOString()
      .slice(0, 10)}.`,
  );
  return lines.join('\n');
}

function Section({ title, children, note }) {
  return (
    <div className="snx-rec-sec">
      <h4 className="snx-rec-h">
        {title}
        {note ? <span className="snx-rec-note"> · {note}</span> : null}
      </h4>
      {children}
    </div>
  );
}

export default function RecordDetail({ id, compact = false, onFilter, onOpen }) {
  const { data: r, loading, error } = useRecord(id);
  const [copied, setCopied] = useState('');

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(recordText(r));
      setCopied('Copied with its source line.');
    } catch {
      setCopied('Copy is not available in this browser.');
    }
  }, [r]);

  if (loading) return <p className="snx-rail-note">Loading the record…</p>;
  if (error) return <StateNote kind="error">{error}</StateNote>;
  if (!r) return null;

  const ids = r.identifiers || [];
  const aliases = r.aliases || [];

  return (
    <div className={`snx-rec${compact ? ' is-compact' : ''}`}>
      {!compact ? (
        <div className="snx-rec-top">
          <TypeTag type={r.type} />
          <span className="snx-mono snx-muted">OFAC entry {r.id}</span>
          {r.removedOn ? (
            <span className="snx-feed-tag">
              Absent from OFAC file since {shortDate(r.removedOn)}
            </span>
          ) : null}
        </div>
      ) : null}

      <Section title="Programs">
        <ul className="snx-rec-programs">
          {r.programs.map((p) => (
            <li key={p}>
              <ProgramChip
                code={p}
                onPick={onFilter ? (c) => onFilter({ program: c }) : undefined}
              />
              <span>{programMeta(p).label}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Where based">
        <p className="snx-rec-p">
          {r.countries.length ? (
            r.countries.join(' · ')
          ) : (
            <span className="snx-muted">No address country stated by OFAC.</span>
          )}
          {r.localities?.length ? (
            <span className="snx-muted"> ({r.localities.slice(0, 6).join('; ')})</span>
          ) : null}
        </p>
      </Section>

      {aliases.length ? (
        <Section title="Also known as" note={`${aliases.length}`}>
          <ul className="snx-rec-list">
            {aliases.slice(0, compact ? 6 : 60).map((a) => (
              <li key={`${a.source}-${a.alt_name}`}>
                {a.alt_name}{' '}
                <span className="snx-muted">
                  {a.source === 'alt' ? a.alt_type || 'a.k.a.' : 'a.k.a. in remarks'}
                </span>
              </li>
            ))}
            {compact && aliases.length > 6 ? (
              <li className="snx-muted">+{aliases.length - 6} more</li>
            ) : null}
          </ul>
        </Section>
      ) : null}

      {r.identifiers === null ? null : ids.length ? (
        <Section title="Identifiers" note="extracted from OFAC remarks, not verified">
          <table className="snx-rec-ids">
            <tbody>
              {ids.slice(0, compact ? 6 : 100).map((i) => (
                <tr key={`${i.kind}-${i.value}`}>
                  <th scope="row">
                    {i.label}
                    {i.is_alt ? <span className="snx-muted"> (alt.)</span> : null}
                  </th>
                  <td className="snx-mono">{i.value}</td>
                  <td className="snx-muted">{i.issuer || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {compact && ids.length > 6 ? (
            <p className="snx-rail-note">+{ids.length - 6} more in the full record</p>
          ) : null}
        </Section>
      ) : r.parsed ? null : (
        <p className="snx-rail-note">Structured identifiers appear after the remarks are parsed.</p>
      )}

      {r.secondaryRisk?.length ? (
        <Section title="Secondary sanctions risk" note="OFAC's wording">
          <ul className="snx-rec-list">
            {r.secondaryRisk.map((s) => (
              <li key={s}>&ldquo;{s}&rdquo;</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {r.links?.length ? (
        <Section
          title="Linked to"
          note="OFAC's note; not proof of ownership, control or wrongdoing"
        >
          <ul className="snx-rec-list">
            {r.links.map((l) => (
              <li key={l.name}>
                {onFilter ? (
                  <button
                    type="button"
                    className="snx-link"
                    onClick={() => onFilter({ linkedTo: l.name })}
                  >
                    {l.name}
                  </button>
                ) : (
                  l.name
                )}{' '}
                <span className="snx-muted">
                  {l.matches.length === 0
                    ? 'not itself an active listing'
                    : l.matches.length === 1
                      ? 'matches 1 listing by name'
                      : `name matches ${l.matches.length} listings`}
                </span>
                {l.matches.length === 1 && onOpen ? (
                  <button
                    type="button"
                    className="snx-link snx-link--sm"
                    onClick={() => onOpen(l.matches[0].id)}
                  >
                    open
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {!compact && r.linkedFrom?.length ? (
        <Section title="Named in other listings" note={`${r.linkedFrom.length}`}>
          <ul className="snx-rec-list">
            {r.linkedFrom.slice(0, 40).map((x) => (
              <li key={x.id}>
                {onOpen ? (
                  <button type="button" className="snx-link" onClick={() => onOpen(x.id)}>
                    {x.name}
                  </button>
                ) : (
                  x.name
                )}{' '}
                <span className="snx-muted">{x.type}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {!compact ? (
        <Section title="OFAC remarks" note="original text">
          {r.remarks ? (
            <p className="snx-rec-remarks">{r.remarks}</p>
          ) : (
            <p className="snx-muted">None.</p>
          )}
          {r.remarksTruncated ? (
            <p className="snx-rail-note">
              OFAC cut these remarks at 1,000 characters; the rest is not loaded yet.
            </p>
          ) : null}
          {r.unparsed ? (
            <p className="snx-rail-note">Not structured above (kept as written): {r.unparsed}</p>
          ) : null}
        </Section>
      ) : null}

      <Section title="Dates">
        <dl className="snx-rec-dates">
          <div>
            <dt>Listed by OFAC</dt>
            <dd className="snx-mono">{r.listedOn ? shortDate(r.listedOn) : 'not available'}</dd>
          </div>
          <div>
            <dt>First seen in our import</dt>
            <dd className="snx-mono">{shortDate(r.firstSeen)}</dd>
          </div>
          {!compact ? (
            <div>
              <dt>Last confirmed on the list</dt>
              <dd className="snx-mono">{shortDate(r.lastSeen)}</dd>
            </div>
          ) : null}
          {!compact && r.parsedAt ? (
            <div>
              <dt>Remarks parsed</dt>
              <dd className="snx-mono">
                {stampLabel(r.parsedAt)} (v{r.parserVersion})
              </dd>
            </div>
          ) : null}
        </dl>
      </Section>

      <div className="snx-rec-actions">
        {compact && onOpen ? (
          <button type="button" className="snx-action-btn" onClick={() => onOpen(r.id)}>
            Open full record <i className="bi bi-layout-sidebar-reverse" aria-hidden="true" />
          </button>
        ) : null}
        <button type="button" className="snx-action-btn" onClick={copy}>
          Copy details <i className="bi bi-clipboard" aria-hidden="true" />
        </button>
        <a
          className="snx-action-btn"
          href="https://sanctionssearch.ofac.treas.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Verify on OFAC&apos;s search <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
        </a>
        <span className="snx-rec-copied" role="status">
          {copied}
        </span>
      </div>
      {!compact ? (
        <p className="snx-fine">
          Source: US Treasury OFAC SDN list, entry {fmt(r.id)}, last synced {stampLabel(r.syncedAt)}
          . A listing record is one OFAC entry; the same real-world party can appear under related
          entries.
        </p>
      ) : null}
    </div>
  );
}

/** The side drawer: a modal dialog with focus kept inside and Escape to close. */
export function RecordDrawer({ id, onClose, onFilter, onOpen }) {
  const ref = useRef(null);
  const closeRef = useRef(null);
  const { data } = useRecord(id);

  useEffect(() => {
    if (!id) return undefined;
    const opener = document.activeElement;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !ref.current) return;
      const f = ref.current.querySelectorAll(
        'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [id, onClose]);

  if (!id) return null;
  return (
    <div className="snx-drawer-wrap">
      <button
        type="button"
        className="snx-drawer-scrim"
        aria-label="Close the record"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        ref={ref}
        className="snx-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snx-drawer-title"
      >
        <div className="snx-drawer-head">
          <h3 id="snx-drawer-title" className="snx-drawer-title">
            {data?.name || 'OFAC record'}
          </h3>
          <button
            ref={closeRef}
            type="button"
            className="snx-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
        <div className="snx-drawer-body">
          <RecordDetail
            id={id}
            onFilter={(f) => {
              onFilter(f);
              onClose();
            }}
            onOpen={onOpen}
          />
        </div>
      </aside>
    </div>
  );
}

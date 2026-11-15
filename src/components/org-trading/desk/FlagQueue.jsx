'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { actionLabel, reasonLabel } from '@/lib/org-flag-taxonomy';
import {
  FLAG_TABS,
  FLAG_TAB_EMPTY,
  NA,
  flagColorLabel,
  flagDeadline,
  flagEvidenceLabels,
  flagOutcome,
  flagRecipients,
  flagStatusLabel,
  fmtAgo,
  fmtDateTime,
  isRoutedRecipient,
  shortName,
} from '@/lib/org-trading-desk';
import {
  Empty,
  Section,
  SectionError,
  Skel,
  TextToggle,
} from '@/components/org/command-center/parts';

const CONVICTION_LABEL = { low: 'Low', med: 'Med', high: 'High' };
const TONE_CLASS = { warn: 'tcc-warn', neg: 'tcc-neg', default: '' };

function Deadline({ flag }) {
  if (flag.status !== 'open') {
    return <span className="otd-flag__due">{flagStatusLabel(flag.status)}</span>;
  }
  const d = flagDeadline(flag);
  if (!d) return <span className="otd-flag__due tcc-mono tcc-na">{NA}</span>;
  return (
    <span className={`otd-flag__due tcc-mono ${TONE_CLASS[d.tone]}`}>
      {d.tone === 'warn' && <i className="bi bi-clock" aria-hidden="true" />}
      {d.overdue && <i className="bi bi-exclamation-triangle" aria-hidden="true" />}
      {d.label}
    </span>
  );
}

function FlagRow({ flag, selected, onSelect }) {
  const names = flagRecipients(flag);
  return (
    <li>
      <button
        type="button"
        className={`otd-flag${selected ? ' is-on' : ''}`}
        aria-pressed={selected}
        onClick={() => onSelect(selected ? null : flag.id)}
      >
        <span className="otd-flag__ticker tcc-mono">{flag.ticker}</span>
        <span className={`otd-flag__color ${flag.flag_color === 'red' ? 'tcc-neg' : 'tcc-pos'}`}>
          {flagColorLabel(flag.flag_color)}
        </span>
        <span className="otd-flag__action">
          {flag.suggested_action ? actionLabel(flag.suggested_action) : NA}
        </span>
        <span className="otd-flag__who" title={flag.raiser?.display_name || undefined}>
          {shortName(flag.raiser?.display_name)}
        </span>
        <span className="otd-flag__who" title={names.join(', ') || undefined}>
          {names.length ? names.map(shortName).join(', ') : NA}
        </span>
        <Deadline flag={flag} />
        <span className="otd-flag__msg">{flag.body}</span>
      </button>
    </li>
  );
}

function Field({ label, children }) {
  return (
    <div className="otd-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * One flag in full, with its written trail. Only the two members a flag is
 * routed to see the answer controls, and the server checks that again.
 * Answering records the response. It never changes the position.
 */
export function FlagDetail({ flagId, data, onClose, compact = false }) {
  const { fetchFlag, answerFlag, commentOnFlag, viewer, sampleRevision, sampleActive } = data;
  const [state, setState] = useState({ status: 'loading', flag: null });
  const [rejecting, setRejecting] = useState(false);
  const [rebuttal, setRebuttal] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const uid = useId();

  const load = useCallback(async () => {
    const out = await fetchFlag(flagId);
    setState(
      out.ok
        ? { status: 'ready', flag: out.flag }
        : { status: out.missing ? 'missing' : 'error', flag: null },
    );
  }, [fetchFlag, flagId]);

  useEffect(() => {
    setState((s) => (s.flag?.id === flagId ? s : { status: 'loading', flag: null }));
    load();
    /* sampleRevision: sample rows changed on the page, so read them again. */
  }, [flagId, load, sampleRevision]);
  useEffect(() => {
    setRejecting(false);
    setRebuttal('');
    setReply('');
    setError(null);
  }, [flagId]);

  if (state.status === 'loading') {
    return (
      <div className="otd-detail" aria-busy="true">
        <Skel w={180} h={18} />
        <div className="otd-skelrows">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skel key={i} h={12} />
          ))}
        </div>
      </div>
    );
  }
  if (state.status !== 'ready') {
    return (
      <div className="otd-detail">
        <SectionError
          message={
            state.status === 'missing'
              ? 'This flag is no longer available.'
              : 'Could not load this flag.'
          }
          onRetry={state.status === 'missing' ? null : load}
        />
      </div>
    );
  }

  const flag = state.flag;
  const open = flag.status === 'open';
  const routed = isRoutedRecipient(flag, viewer.memberId);
  const names = flagRecipients(flag);
  const evidence = flagEvidenceLabels(flag);
  const deadline = flagDeadline(flag);
  const outcome = flagOutcome(flag);

  const answer = async (response) => {
    setError(null);
    setBusy(true);
    const out = await answerFlag(flag.id, response, response === 'rejected' ? rebuttal : '');
    setBusy(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setRejecting(false);
    setRebuttal('');
    if (!out.sample) load();
  };
  const post = async () => {
    setError(null);
    setBusy(true);
    const out = await commentOnFlag(flag.id, reply);
    setBusy(false);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    setReply('');
    if (!out.sample) load();
  };

  return (
    <div
      className={`otd-detail${compact ? ' otd-detail--compact' : ''}`}
      role="region"
      aria-label={`Flag on ${flag.ticker}`}
    >
      <div className="otd-detail__head">
        <h3 className="otd-detail__title">
          <span className="tcc-mono">{flag.ticker}</span>
          <span className={flag.flag_color === 'red' ? 'tcc-neg' : 'tcc-pos'}>
            {flagColorLabel(flag.flag_color)}
          </span>
        </h3>
        <span className="otd-detail__meta">
          Raised by {flag.raiser?.display_name || 'a member'},{' '}
          <span className="tcc-mono">{fmtAgo(flag.created_at)}</span>
        </span>
        {deadline && (
          <span className={`otd-detail__meta ${TONE_CLASS[deadline.tone]}`}>
            {deadline.overdue ? (
              'Response overdue'
            ) : (
              <>
                Response due in <span className="tcc-mono">{deadline.label}</span>
              </>
            )}
          </span>
        )}
        {onClose && (
          <button type="button" className="tcc-textbtn otd-detail__close" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <dl className="otd-fields">
        <Field label="Status">
          {flagStatusLabel(flag.status)}
          {flag.resolved_at ? (
            <>
              , <span className="tcc-mono">{fmtDateTime(flag.resolved_at)}</span>
            </>
          ) : null}
        </Field>
        <Field label="Thesis on file">
          {flag.thesis_snapshot || 'No pitch thesis was on file when this flag was raised.'}
        </Field>
        <Field label="Reason">{flag.reason ? reasonLabel(flag.reason) : NA}</Field>
        <Field label="Message">{flag.body}</Field>
        <Field label="Evidence">
          {evidence.length ? (
            <ul className="otd-evidence">
              {evidence.map((e, i) => (
                <li key={`${e}-${i}`}>{e}</li>
              ))}
            </ul>
          ) : (
            'None attached'
          )}
        </Field>
        <Field label="Conviction">{CONVICTION_LABEL[flag.conviction] || NA}</Field>
        <Field label="Suggested action">
          {flag.suggested_action ? actionLabel(flag.suggested_action) : NA}
          <span className="otd-field__note">The raiser&apos;s view, not an instruction</span>
        </Field>
        <Field label="Escalate to IC">{flag.escalated_to_ic ? 'Yes' : 'No'}</Field>
        <Field label="Conflict">
          {flag.conflict_disclosed
            ? `The raiser disclosed a personal holding in ${flag.ticker}`
            : 'None disclosed'}
        </Field>
        <Field label="Routed to">{names.length ? names.join(' and ') : NA}</Field>
        {flag.benchmark_symbol && (
          <Field label="Judged against">
            <span className="tcc-mono">{flag.benchmark_symbol}</span>
          </Field>
        )}
        {!open && flag.resolution_note && (
          <Field label={flag.status === 'rejected' ? 'Rebuttal' : 'Note'}>
            {flag.resolution_note}
          </Field>
        )}
        {!open && (
          <Field label="Outcome">
            {outcome ? (
              <span className={outcome.correct ? 'tcc-pos' : 'tcc-neg'}>
                {outcome.correct ? 'Proved right' : 'Proved wrong'}
                <span className="otd-field__note">Scored 90 days after the flag</span>
              </span>
            ) : (
              'Not scored yet. Flags are scored 90 days after they are raised.'
            )}
          </Field>
        )}
      </dl>

      {flag.messages?.length > 0 && (
        <ul className="otd-msgs" aria-label="Comments on this flag">
          {flag.messages.map((m) => (
            <li key={m.id}>
              <span className="otd-msgs__who">{m.author?.display_name || 'Member'}</span>
              <span className="otd-msgs__when tcc-mono">{fmtAgo(m.created_at)}</span>
              <p>{m.body}</p>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {open && routed && !rejecting && (
        <div className="otd-answer">
          <span className="otd-answer__label">Answer</span>
          <button
            type="button"
            className="tcc-btn"
            disabled={busy}
            onClick={() => answer('accepted')}
          >
            Accept
          </button>
          <button
            type="button"
            className="tcc-textbtn otd-action"
            disabled={busy}
            onClick={() => answer('acknowledged')}
          >
            Acknowledge
          </button>
          <button
            type="button"
            className="tcc-textbtn otd-action otd-danger"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            Reject with rebuttal
          </button>
          <button
            type="button"
            className="tcc-textbtn otd-action"
            disabled={busy}
            onClick={() => answer('escalated')}
          >
            Escalate to IC
          </button>
          <p className="otd-answer__note">
            Your answer is recorded on the flag. It does not change the position.
            {sampleActive ? ' Sample content: nothing is saved.' : ''}
          </p>
        </div>
      )}
      {open && routed && rejecting && (
        <div className="otd-reject">
          <label className="otd-label" htmlFor={`${uid}-rebuttal`}>
            Rebuttal (required)
          </label>
          <textarea
            id={`${uid}-rebuttal`}
            className="ds-textarea"
            rows={3}
            value={rebuttal}
            onChange={(e) => setRebuttal(e.target.value)}
            placeholder="Why the thesis still holds, in writing"
          />
          <div className="otd-reject__actions">
            <button
              type="button"
              className="tcc-textbtn otd-action"
              disabled={busy}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tcc-btn otd-btn--danger"
              disabled={busy || !rebuttal.trim()}
              onClick={() => answer('rejected')}
            >
              Reject flag
            </button>
          </div>
        </div>
      )}
      {open && !routed && (
        <p className="otd-answer__note otd-answer__note--alone">
          Only {names.length ? names.join(' and ') : 'the routed members'} can answer this flag. Any
          council member can comment while it is open.
        </p>
      )}

      {open && !rejecting && (
        <div className="otd-comment">
          <label className="otd-label" htmlFor={`${uid}-reply`}>
            Comment
          </label>
          <textarea
            id={`${uid}-reply`}
            className="ds-textarea"
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Add to the written trail"
          />
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent otd-action"
            disabled={busy || !reply.trim()}
            onClick={post}
          >
            Post comment
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The flag queue: what is waiting on the member (Inbox), what they raised
 * (Sent) and what has been answered (Resolved). A holding's Review cell can
 * also narrow the list to the open flags on one ticker.
 *
 * layout "column" stacks the detail under the list (the desk);
 * layout "page" sets them side by side (the inbox route).
 */
export function FlagQueue({
  data,
  tab,
  onTab,
  ticker = null,
  onClearTicker,
  selectedId,
  onSelect,
  layout = 'column',
  title = 'Flag queue',
}) {
  const { resource, retry } = data;
  const key = ticker ? 'openFlags' : tab;
  const res = resource(key);
  const inbox = resource('inbox');
  const all = res.data?.flags || [];
  const flags = ticker ? all.filter((f) => f.ticker === ticker) : all;
  const inboxCount = inbox.status === 'ready' ? (inbox.data?.flags || []).length : null;
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [key, ticker]);
  const cap = layout === 'page' ? 50 : 6;
  const visible = showAll ? flags : flags.slice(0, cap);

  return (
    <Section id="otd-flags" title={title} className={`otd-queue otd-queue--${layout}`}>
      <div className="tcc-toggles otd-queue__tabs" role="group" aria-label="Flag list">
        {FLAG_TABS.map((t) => (
          <TextToggle
            key={t.value}
            pressed={!ticker && tab === t.value}
            onClick={() => onTab(t.value)}
          >
            {t.label}
            {t.value === 'inbox' && inboxCount != null && (
              <span className="tcc-mono">{inboxCount}</span>
            )}
          </TextToggle>
        ))}
        {ticker && (
          <>
            <TextToggle pressed onClick={() => {}}>
              Open on <span className="tcc-mono">{ticker}</span>
              <span className="tcc-mono">{flags.length}</span>
            </TextToggle>
            <button type="button" className="tcc-textbtn otd-action" onClick={onClearTicker}>
              Clear
            </button>
          </>
        )}
      </div>

      <div className="otd-queue__body">
        <div className="otd-queue__list">
          {res.status === 'error' ? (
            <SectionError message="Could not load flags." onRetry={() => retry(key)} />
          ) : res.status === 'loading' ? (
            <div className="otd-skelrows" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skel key={i} h={34} />
              ))}
            </div>
          ) : flags.length === 0 ? (
            <Empty
              action={!ticker && tab !== 'inbox' ? 'Go to inbox' : null}
              onAction={!ticker && tab !== 'inbox' ? () => onTab('inbox') : null}
            >
              {ticker ? `No open flags on ${ticker}.` : FLAG_TAB_EMPTY[tab]}
              {!ticker && tab === 'sent' ? ' Raise one from a holding below.' : ''}
            </Empty>
          ) : (
            <>
              <div className="otd-flag otd-flag--head" aria-hidden="true">
                <span>Ticker</span>
                <span>Flag</span>
                <span>Suggested</span>
                <span>Raiser</span>
                <span>Routed to</span>
                <span className="otd-flag__due">
                  {tab === 'inbox' || ticker
                    ? 'Due in'
                    : tab === 'sent'
                      ? 'Due or status'
                      : 'Status'}
                </span>
              </div>
              <ul className="otd-flags">
                {visible.map((f) => (
                  <FlagRow key={f.id} flag={f} selected={selectedId === f.id} onSelect={onSelect} />
                ))}
              </ul>
              {flags.length > cap && (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent otd-action otd-more"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? 'Show fewer' : `Show all ${flags.length}`}
                </button>
              )}
            </>
          )}
        </div>
        {selectedId ? (
          <FlagDetail
            flagId={selectedId}
            data={data}
            onClose={() => onSelect(null)}
            compact={layout === 'column'}
          />
        ) : (
          layout === 'page' &&
          flags.length > 0 && (
            <p className="tcc-state otd-detail otd-detail--hint">
              Select a flag to read it and its written trail.
            </p>
          )
        )}
      </div>
    </Section>
  );
}

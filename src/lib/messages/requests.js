/**
 * Message requests (Nov 2026). Pure rules shared by the /api/messages
 * routes and the Messages page; no I/O. Tested by
 * scripts/check-message-requests.mjs.
 *
 * Friends (mutual follows) message each other straight into the inbox.
 * Anyone else can start a conversation by username, but it opens as a
 * request: the recipient sees it under Requests and accepts or declines.
 *
 *   conversations.status   'active' | 'request' | 'declined'
 *   conversations.requested_by   who opened the request
 */

export const STATUS = Object.freeze({
  ACTIVE: 'active',
  REQUEST: 'request',
  DECLINED: 'declined',
});

/** Messages a requester may send before the recipient answers. */
export const REQUEST_PENDING_CAP = 3;

export const DECLINED_ERROR = "This member isn't accepting your messages right now.";
export const CAP_ERROR = `You can send up to ${REQUEST_PENDING_CAP} messages until your request is accepted.`;

/**
 * What happens when `senderId` sends a message.
 *
 * @param {object}  args
 * @param {object|null} args.convo  existing conversation row ({ status, requested_by }) or null
 * @param {string}  args.senderId
 * @param {boolean} args.mutual     sender and recipient follow each other
 * @param {number}  [args.pendingSent]  messages the sender already sent on an open request
 * @returns {{ ok: true, status: string, create: boolean, activate: boolean,
 *             requestedBy: string|null, notify: 'message'|'request'|'none' }
 *          | { ok: false, code: number, error: string }}
 */
export function decideSend({ convo, senderId, mutual, pendingSent = 0 }) {
  const base = { ok: true, create: false, activate: false, requestedBy: null };

  if (mutual) {
    return {
      ...base,
      status: STATUS.ACTIVE,
      create: !convo,
      activate: Boolean(convo && convo.status !== STATUS.ACTIVE),
      notify: 'message',
    };
  }

  if (!convo) {
    return {
      ...base,
      status: STATUS.REQUEST,
      create: true,
      requestedBy: senderId,
      notify: 'request',
    };
  }

  const status = convo.status || STATUS.ACTIVE;
  if (status === STATUS.ACTIVE) return { ...base, status, notify: 'message' };

  const mine = convo.requested_by === senderId;

  if (status === STATUS.REQUEST) {
    // The recipient replying is the same as accepting.
    if (!mine) return { ...base, status: STATUS.ACTIVE, activate: true, notify: 'message' };
    if (pendingSent >= REQUEST_PENDING_CAP) return { ok: false, code: 429, error: CAP_ERROR };
    // Follow-ups on an open request don't ping the recipient again.
    return { ...base, status, notify: 'none' };
  }

  // Declined: the member who declined can still change their mind.
  if (!mine) return { ...base, status: STATUS.ACTIVE, activate: true, notify: 'message' };
  return { ok: false, code: 403, error: DECLINED_ERROR };
}

/**
 * Accept or decline. Only the recipient of an open request may answer.
 *
 * @returns {{ ok: true, status: string } | { ok: false, code: number, error: string }}
 */
export function decideRespond({ convo, userId, action }) {
  if (action !== 'accept' && action !== 'decline') {
    return { ok: false, code: 400, error: 'action must be "accept" or "decline"' };
  }
  if (!convo || (convo.participant_a !== userId && convo.participant_b !== userId)) {
    return { ok: false, code: 404, error: 'Conversation not found' };
  }
  if (convo.status !== STATUS.REQUEST) {
    return { ok: false, code: 409, error: 'There is no open request on this conversation.' };
  }
  if (convo.requested_by === userId) {
    return { ok: false, code: 403, error: 'Only the recipient can answer a message request.' };
  }
  return { ok: true, status: action === 'accept' ? STATUS.ACTIVE : STATUS.DECLINED };
}

/**
 * How a conversation looks to `userId`.
 *  - The requester never sees "declined": to them it stays a sent request.
 *  - The member who declined no longer sees the thread in their list.
 */
export function viewFor(convo, userId) {
  const status = convo?.status || STATUS.ACTIVE;
  const mine = convo?.requested_by === userId;
  if (status === STATUS.DECLINED) {
    return mine
      ? {
          status: STATUS.REQUEST,
          is_incoming_request: false,
          is_outgoing_request: true,
          hidden: false,
        }
      : { status, is_incoming_request: false, is_outgoing_request: false, hidden: true };
  }
  if (status === STATUS.REQUEST) {
    return { status, is_incoming_request: !mine, is_outgoing_request: mine, hidden: false };
  }
  return { status, is_incoming_request: false, is_outgoing_request: false, hidden: false };
}

/**
 * Chat-list timestamp: "Now", "2m ago", "1h ago", "Yesterday", a weekday
 * inside the last week, then "Mar 4" (with the year once it's a past year).
 * Calendar days are the viewer's local days.
 */
export function chatTime(iso, now = Date.now()) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m ago`;
  const then = new Date(t);
  const today = new Date(now);
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayGap = Math.round((startOf(today) - startOf(then)) / 86400000);
  if (dayGap === 0) return `${Math.floor(mins / 60)}h ago`;
  if (dayGap === 1) return 'Yesterday';
  if (dayGap < 7) return then.toLocaleDateString('en-US', { weekday: 'long' });
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(then.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** "@handle" from a profile username, or '' when there isn't one. */
export function handleOf(username) {
  const u = typeof username === 'string' ? username.trim().replace(/^@+/, '') : '';
  return u ? `@${u}` : '';
}

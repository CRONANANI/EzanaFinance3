/**
 * Before any real-money call, confirm the Alpaca account in our database
 * really is this user's (security assessment F-03): the stored
 * alpaca_account_id is fetched from Alpaca and its contact email must match
 * the signed-in user's, and Alpaca must report it ACTIVE. Ezana sets that
 * email from the user's auth email when it creates the account, so a row
 * pointed at someone else's account id fails here even if the database
 * policy were ever loosened again. Results are cached for 5 minutes per
 * (user, account).
 */
import { BoundedMap } from '@/lib/bounded-map';

const TTL_MS = 5 * 60_000;
const cache = new BoundedMap(2000);

export class AccountOwnershipError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}

const norm = (e) =>
  String(e || '')
    .trim()
    .toLowerCase();

export async function assertAlpacaAccountOwner(alpaca, accountId, user, { now = Date.now() } = {}) {
  if (!accountId || !user?.id) throw new AccountOwnershipError('No brokerage account', 400);
  const key = `${user.id}:${accountId}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) {
    if (!hit.ok) throw new AccountOwnershipError(hit.reason);
    return hit.account;
  }
  const account = await alpaca.get(`/v1/accounts/${encodeURIComponent(accountId)}`);
  const email = norm(account?.contact?.email_address);
  let reason = null;
  if (!email || !user.email || email !== norm(user.email)) {
    reason = 'Brokerage account does not belong to this user';
  } else if (!['ACTIVE', 'APPROVED'].includes(String(account?.status || '').toUpperCase())) {
    reason = 'Brokerage account is not active';
  }
  cache.set(key, { at: now, ok: !reason, reason, account: reason ? null : account });
  if (reason) throw new AccountOwnershipError(reason);
  return account;
}

export function clearAccountOwnerCache() {
  cache.clear();
}

/**
 * Add tickers to the signed-in user's default watchlist. Shared by the
 * EzanaQL bar and the hub linkage rows so both make the same calls.
 * Resolves 'done', or 'auth' when there is no session; throws otherwise.
 */
export async function addTickersToWatchlist(tickers) {
  const listsRes = await fetch('/api/watchlists'); // GET seeds the default list
  if (listsRes.status === 401) return 'auth';
  if (!listsRes.ok) throw new Error(String(listsRes.status));
  const { watchlists } = await listsRes.json();
  const listId = watchlists?.[0]?.id;
  if (!listId) throw new Error('no list');
  const results = await Promise.all(
    tickers.map((ticker) =>
      fetch(`/api/watchlists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stock', ticker }),
      }),
    ),
  );
  /* 409 is "already on the list", which is the outcome we wanted. */
  if (results.some((r) => !r.ok && r.status !== 409)) throw new Error('partial');
  return 'done';
}

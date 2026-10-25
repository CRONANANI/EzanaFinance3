"""Minimal Supabase REST upsert for the Global Empire Lighthouse workers (service role)."""
import json
import os
import signal
import urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Graceful shutdown (reliability audit P3): on SIGTERM (a cancelled or
# timed-out GitHub Actions job) the worker stops starting new work, writes
# what it has (every write is an idempotent upsert, so a partial run is safe
# to repeat) and exits. Loops check stopping() between units of work.
_STOP = {"flag": False}


def _on_term(signum, _frame):
    if not _STOP["flag"]:
        print(f"signal {signum}: finishing the current batch, then exiting", flush=True)
    _STOP["flag"] = True


signal.signal(signal.SIGTERM, _on_term)


def stopping():
    return _STOP["flag"]


def upsert(table, rows, on_conflict, chunk=500):
    for i in range(0, len(rows), chunk):
        body = json.dumps(rows[i : i + chunk], default=str).encode()
        req = urllib.request.Request(
            f"{URL}/rest/v1/{table}?on_conflict={on_conflict}",
            data=body,
            method="POST",
            headers={
                "apikey": KEY,
                "Authorization": f"Bearer {KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        with urllib.request.urlopen(req, timeout=120) as res:
            if res.status >= 300:
                raise RuntimeError(f"{table}: HTTP {res.status}")

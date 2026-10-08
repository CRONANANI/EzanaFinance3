"""Minimal Supabase REST upsert for the Eyes Above workers (service role)."""
import json
import os
import urllib.request

URL = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


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

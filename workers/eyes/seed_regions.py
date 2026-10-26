"""Seed eyes_regions from workers/eyes/regions.json (idempotent upsert).

Runs before the night-lights job, with the standard library only, so the
region list lands even when the Black Marble download fails or is skipped.
night_lights.py upserts the same rows again; both are safe to repeat.
Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
"""
import datetime as dt
import json
import pathlib

from supabase_rest import upsert

HERE = pathlib.Path(__file__).parent
COLUMNS = ("region_id", "name", "kind", "country", "bbox", "note")


def rows():
    regions = json.loads((HERE / "regions.json").read_text())
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    out = []
    for r in regions:
        if not r.get("region_id") or not r.get("name") or len(r.get("bbox") or []) != 4:
            raise SystemExit(f"regions.json: incomplete region {r!r}")
        out.append({**{k: r.get(k) for k in COLUMNS}, "updated_at": now})
    return out


def main():
    regions = rows()
    upsert("eyes_regions", regions, "region_id")
    print(f"eyes_regions: {len(regions)} regions upserted")


if __name__ == "__main__":
    main()

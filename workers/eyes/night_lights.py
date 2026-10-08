"""Monthly night-lights brightness per region from NASA Black Marble.

Uses worldbank/blackmarblepy (https://github.com/worldbank/blackmarblepy, MPL-2.0)
to download VNP46A3 (monthly, 500 m, cloud-free composites) and compute zonal
statistics over each region's bounding box in workers/eyes/regions.json.
Writes eyes_regions and eyes_night_lights. Needs NASA_EARTHDATA_TOKEN (a free
NASA Earthdata login bearer token), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

  python workers/eyes/night_lights.py --months-back 3      # monthly run
  python workers/eyes/night_lights.py --months-back 24     # backfill

VNP46A3 is published with a lag of a few weeks; months not yet published are
skipped and picked up by the next run.

API: blackmarblepy 2026.x, bm_extract(gdf, product_id, date_range, token,
aggfunc=[...]) returning the gdf columns plus ntl_<stat> per statistic.
"""
import argparse
import datetime as dt
import json
import os
import pathlib

import geopandas as gpd
import pandas as pd
from shapely.geometry import box

from blackmarble.extract import bm_extract
from supabase_rest import upsert

HERE = pathlib.Path(__file__).parent


def month_starts(months_back):
    today = dt.date.today().replace(day=1)
    out = []
    y, m = today.year, today.month
    for _ in range(months_back):
        m -= 1
        if m == 0:
            y, m = y - 1, 12
        out.append(dt.date(y, m, 1))
    return sorted(out)


def pick(df, *needles):
    for c in df.columns:
        lc = str(c).lower()
        if lc.startswith("ntl_") and all(n in lc for n in needles):
            return c
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--months-back", type=int, default=3)
    args = ap.parse_args()

    regions = json.loads((HERE / "regions.json").read_text())
    upsert(
        "eyes_regions",
        [{**r, "updated_at": dt.datetime.utcnow().isoformat()} for r in regions],
        "region_id",
    )
    gdf = gpd.GeoDataFrame(
        [{"region_id": r["region_id"]} for r in regions],
        geometry=[box(*r["bbox"]) for r in regions],
        crs="EPSG:4326",
    )
    token = os.environ["NASA_EARTHDATA_TOKEN"]
    months = month_starts(args.months_back)
    rows = []
    for m in months:
        try:
            df = bm_extract(
                gdf,
                product_id="VNP46A3",
                date_range=m,
                token=token,
                aggfunc=["mean", "sum", "count"],
            )
        except Exception as e:  # month not published yet, or a transient error
            print(f"{m}: skipped ({e})")
            continue
        mean_c, sum_c, cnt_c = pick(df, "mean"), pick(df, "sum"), pick(df, "count")
        for _, r in df.iterrows():
            rows.append(
                {
                    "region_id": r["region_id"],
                    "month": m.isoformat(),
                    "mean_radiance": None if mean_c is None or pd.isna(r[mean_c]) else float(r[mean_c]),
                    "sum_radiance": None if sum_c is None or pd.isna(r[sum_c]) else float(r[sum_c]),
                    "valid_pixels": None if cnt_c is None or pd.isna(r[cnt_c]) else int(r[cnt_c]),
                }
            )
        print(f"{m}: {len(df)} regions")
    if rows:
        upsert("eyes_night_lights", rows, "region_id,month")
    print(f"wrote {len(rows)} region-months")


if __name__ == "__main__":
    main()

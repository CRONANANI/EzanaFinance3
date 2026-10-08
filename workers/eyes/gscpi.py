"""NY Fed Global Supply Chain Pressure Index (monthly) into eyes_series_obs.

The NY Fed publishes the GSCPI as an Excel file linked from
https://www.newyorkfed.org/research/policy/gscpi. The link is read from that
page each run, so a renamed file is followed rather than hard-coded; the
long-standing file path is the fallback when the page cannot be parsed.
Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
"""
import datetime as dt
import io
import re
import urllib.request

import pandas as pd

from supabase_rest import upsert

PAGE = "https://www.newyorkfed.org/research/policy/gscpi"
FALLBACK = "https://www.newyorkfed.org/medialibrary/research/interactives/gscpi/downloads/gscpi_data.xlsx"
UA = {"User-Agent": "Mozilla/5.0 (Ezana data ingest)"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def workbook_url():
    try:
        html = get(PAGE).decode("utf-8", "ignore")
    except Exception as e:  # the page itself is optional
        print(f"GSCPI page unreadable ({e}); using the known file path")
        return FALLBACK
    m = re.search(r'href="([^"]+gscpi[^"]*\.xlsx)"', html, re.I)
    if not m:
        return FALLBACK
    href = m.group(1)
    return "https://www.newyorkfed.org" + href if href.startswith("/") else href


def date_column(df):
    for c in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[c]):
            return c, df[c]
    for c in df.columns:
        parsed = pd.to_datetime(df[c], errors="coerce")
        if parsed.notna().mean() > 0.8:
            return c, parsed
    return None, None


def main():
    book = pd.read_excel(io.BytesIO(get(workbook_url())), sheet_name=None)
    obs = []
    for _, df in book.items():
        val_col = next((c for c in df.columns if "gscpi" in str(c).lower()), None)
        date_col, dates = date_column(df)
        if date_col is None or val_col is None or date_col == val_col:
            continue
        for d, v in zip(dates, pd.to_numeric(df[val_col], errors="coerce")):
            if pd.isna(d) or pd.isna(v):
                continue
            day = pd.Timestamp(d).to_pydatetime().date().replace(day=1)
            obs.append({"series_id": "GSCPI", "date": day.isoformat(), "value": float(v)})
        if obs:
            break
    if not obs:
        raise SystemExit("No GSCPI rows parsed; check the workbook layout")
    last = max(o["date"] for o in obs)
    upsert(
        "eyes_series",
        [
            {
                "series_id": "GSCPI",
                "source": "nyfed",
                "dataset": "supply",
                "title": "Global Supply Chain Pressure Index",
                "units": "Standard deviations from average",
                "frequency": "Monthly",
                "last_date": last,
                "synced_at": dt.datetime.utcnow().isoformat(),
            }
        ],
        "series_id",
    )
    upsert("eyes_series_obs", obs, "series_id,date")
    print(f"GSCPI: {len(obs)} months through {last}")


if __name__ == "__main__":
    main()

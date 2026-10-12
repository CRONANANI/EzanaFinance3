"""Caldara and Iacoviello Geopolitical Risk (GPR) index into lighthouse_observations.

Monthly file: the global index (GPR), threats (GPRT), acts (GPRA) and the
country indexes (GPRC_<ISO3>), from 1985. Daily file: the recent daily index
(GPRD, GPRD_ACT, GPRD_THREAT), last DAILY_YEARS years. The file links are read
from the GPR page each run, so a renamed file is followed; the long-standing
paths are the fallback. Licence: CC BY. Cite Caldara, Dario and Matteo
Iacoviello (2022), "Measuring Geopolitical Risk," American Economic Review,
112(4), 1194-1225. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
"""
import datetime as dt
import io
import json
import re
import urllib.request

import pandas as pd

from supabase_rest import upsert

PAGE = "https://www.matteoiacoviello.com/gpr.htm"
BASE = "https://www.matteoiacoviello.com/"
FALLBACK_MONTHLY = BASE + "gpr_files/data_gpr_export.xls"
FALLBACK_DAILY = BASE + "gpr_files/data_gpr_daily_recent.xls"
UA = {"User-Agent": "Mozilla/5.0 (Ezana data ingest; +https://ezana.world)"}
# Confirm against the file's variable notes in Step 0.
UNIT = "Index, 1985 to 2019 average = 100"
HEADLINE = ("GPR", "GPRT", "GPRA")
DAILY = ("GPRD", "GPRD_ACT", "GPRD_THREAT")
DAILY_YEARS = 3
FROM_YEAR = 1985


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def links():
    try:
        html = get(PAGE).decode("utf-8", "ignore")
    except Exception as e:  # the page itself is optional
        print(f"GPR page unreadable ({e}); using the known file paths")
        return FALLBACK_MONTHLY, FALLBACK_DAILY

    def find(stem, fallback):
        m = re.search(r'href="([^"]*%s[^"]*\.xlsx?)"' % stem, html, re.I)
        if not m:
            return fallback
        href = m.group(1)
        return href if href.startswith("http") else BASE + href.lstrip("./")

    return find("data_gpr_export", FALLBACK_MONTHLY), find("data_gpr_daily_recent", FALLBACK_DAILY)


def country_names():
    """ISO3 -> name from the World Bank country list (no key)."""
    try:
        data = json.loads(get("https://api.worldbank.org/v2/country?format=json&per_page=400"))
        return {str(c["id"]).upper(): c["name"] for c in data[1]}
    except Exception as e:
        print(f"country names unavailable ({e}); using ISO3 codes")
        return {}


def column(df, *names):
    lower = {str(c).strip().lower(): c for c in df.columns}
    for n in names:
        if n.lower() in lower:
            return lower[n.lower()]
    return None


def main():
    monthly_url, daily_url = links()
    names = country_names()
    synced = dt.datetime.now(dt.timezone.utc).isoformat()
    rows = []

    m = pd.read_excel(io.BytesIO(get(monthly_url)))
    date_col = column(m, "month", "date")
    if date_col is None:
        raise SystemExit("Monthly GPR file has no month/date column; check the layout")
    months = pd.to_datetime(m[date_col], errors="coerce")
    for col in m.columns:
        key = str(col).strip()
        upper = key.upper()
        if upper in HEADLINE:
            indicator, area, area_name, unit = upper, "WLD", "World", UNIT
        elif upper.startswith("GPRC_"):
            indicator, area = "GPRC", upper[5:]
            area_name, unit = names.get(area, area), None
        else:
            continue
        for d, v in zip(months, pd.to_numeric(m[col], errors="coerce")):
            if pd.isna(d) or pd.isna(v) or d.year < FROM_YEAR:
                continue
            rows.append({
                "source": "gpr",
                "indicator": indicator,
                "ref_area": area,
                "ref_area_name": area_name,
                "period": d.date().replace(day=1).isoformat(),
                "frequency": "monthly",
                "value": float(v),
                "unit": unit,
                "synced_at": synced,
            })

    d = pd.read_excel(io.BytesIO(get(daily_url)))
    day_col = column(d, "date", "day")
    if day_col is not None:
        days = pd.to_datetime(d[day_col], errors="coerce")
        cutoff = dt.date.today() - dt.timedelta(days=365 * DAILY_YEARS)
        for name in DAILY:
            col = column(d, name)
            if col is None:
                print(f"daily column {name} not found")
                continue
            for day, v in zip(days, pd.to_numeric(d[col], errors="coerce")):
                if pd.isna(day) or pd.isna(v) or day.date() < cutoff:
                    continue
                rows.append({
                    "source": "gpr",
                    "indicator": name,
                    "ref_area": "WLD",
                    "ref_area_name": "World",
                    "period": day.date().isoformat(),
                    "frequency": "daily",
                    "value": float(v),
                    "unit": UNIT,
                    "synced_at": synced,
                })
    else:
        print("Daily GPR file has no date column; skipped")

    if not any(r["indicator"] == "GPR" for r in rows):
        raise SystemExit("No headline GPR rows parsed; check the workbook layout")
    upsert("lighthouse_observations", rows, "source,indicator,ref_area,period")
    counts = {}
    for r in rows:
        counts[r["indicator"]] = counts.get(r["indicator"], 0) + 1
    print(f"GPR rows upserted: {len(rows)} {counts}")


if __name__ == "__main__":
    main()

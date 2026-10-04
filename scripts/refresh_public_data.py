#!/usr/bin/env python3
"""Refresh the public, ZIP/ZCTA-level source data used by EnviroVitals.

Sources: CDC PLACES 2025 and 2023 (CKD is no longer in current PLACES), EPA
AirData annual PM2.5 by monitor for 2025, and EPA's final UCMR 5 results.
The EPA water-system service-area geometry is queried live by the app because
that source is maintained as a spatial service rather than a flat ZIP table.
"""

from __future__ import annotations

import csv
import io
import json
import math
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "src" / "data"
USER_AGENT = "EnviroVitals/1.0 (public data refresh; contact via repository)"

PLACES_2025 = "https://data.cdc.gov/resource/kee5-23sr.json"
PLACES_2023 = "https://data.cdc.gov/resource/c7b2-4ecy.json"
AIR_2025 = "https://aqs.epa.gov/aqsweb/airdata/annual_conc_by_monitor_2025.zip"
UCMR5_FINAL = "https://www.epa.gov/system/files/other-files/2023-08/ucmr5-occurrence-data.zip"

CURRENT_FIELDS = [
    "zcta5", "totalpopulation", "totalpop18plus",
    "chd_crudeprev", "stroke_crudeprev", "bphigh_crudeprev",
    "highchol_crudeprev", "diabetes_crudeprev", "obesity_crudeprev",
    "geolocation",
]
CKD_FIELDS = ["zcta5", "kidney_crudeprev"]


def download(url: str, retries: int = 4) -> bytes:
    error: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": USER_AGENT},
            )
            with urllib.request.urlopen(req, timeout=150) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            error = exc
            if attempt + 1 < retries:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Download failed after {retries} attempts: {url}: {error}")


def download_json_pages(base_url: str, fields: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    limit = 5000
    offset = 0
    select = ",".join(fields)
    while True:
        query = urllib.parse.urlencode({
            "$select": select,
            "$limit": str(limit),
            "$offset": str(offset),
            "$order": "zcta5",
        })
        page = json.loads(download(f"{base_url}?{query}"))
        if not isinstance(page, list):
            raise RuntimeError(f"Unexpected CDC API response at offset {offset}")
        rows.extend(page)
        print(f"  {base_url.rsplit('/', 1)[-1]}: {len(rows):,} rows", flush=True)
        if len(page) < limit:
            break
        offset += limit
    return rows


def number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def build_places() -> dict[str, Any]:
    print("Fetching CDC PLACES 2025 ZCTA estimates…", flush=True)
    current_rows = download_json_pages(PLACES_2025, CURRENT_FIELDS)
    current_by_zip: dict[str, dict[str, Any]] = {}
    for row in current_rows:
        zip_code = str(row.get("zcta5", "")).zfill(5)
        point = row.get("geolocation") or {}
        coords = point.get("coordinates") or []
        if len(coords) < 2:
            continue
        lon, lat = number(coords[0]), number(coords[1])
        if lat is None or lon is None:
            continue
        current_by_zip[zip_code] = {
            "z": zip_code,
            "g": [round(lat, 5), round(lon, 5)],
            "p": int(number(row.get("totalpopulation")) or 0),
            "a": int(number(row.get("totalpop18plus")) or 0),
            "c": {
                "chd": number(row.get("chd_crudeprev")),
                "stroke": number(row.get("stroke_crudeprev")),
                "bp": number(row.get("bphigh_crudeprev")),
                "chol": number(row.get("highchol_crudeprev")),
                "diabetes": number(row.get("diabetes_crudeprev")),
                "obesity": number(row.get("obesity_crudeprev")),
            },
            "kidney": None,
        }

    print("Fetching CDC PLACES 2023 CKD estimates (latest ZIP-level CKD series)…", flush=True)
    kidney_rows = download_json_pages(PLACES_2023, CKD_FIELDS)
    for row in kidney_rows:
        zip_code = str(row.get("zcta5", "")).zfill(5)
        if zip_code in current_by_zip:
            current_by_zip[zip_code]["kidney"] = number(row.get("kidney_crudeprev"))

    records = [current_by_zip[key] for key in sorted(current_by_zip)]
    metadata = {
        "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "placesRelease": 2025,
        "placesBrfssYear": 2023,
        "kidneyRelease": 2023,
        "kidneyBrfssYear": 2021,
        "geography": "2020 Census ZIP Code Tabulation Areas (ZCTAs)",
        "recordCount": len(records),
        "currentSource": PLACES_2025,
        "kidneySource": PLACES_2023,
    }
    print(f"  Joined CKD and current measures for {len(records):,} ZCTAs", flush=True)
    return {"meta": metadata, "records": records}


def build_air_monitors() -> dict[str, Any]:
    print("Fetching EPA AirData 2025 monitor annual concentrations…", flush=True)
    archive = zipfile.ZipFile(io.BytesIO(download(AIR_2025)))
    csv_name = next((name for name in archive.namelist() if name.lower().endswith(".csv")), None)
    if not csv_name:
        raise RuntimeError("EPA AirData ZIP did not contain a CSV")

    monitors: list[dict[str, Any]] = []
    with archive.open(csv_name) as stream:
        reader = csv.DictReader(io.TextIOWrapper(stream, encoding="cp1252", newline=""))
        for row in reader:
            if row.get("Parameter Code") != "88101":
                continue
            if row.get("Pollutant Standard") != "PM25 Annual 2024":
                continue
            if row.get("Sample Duration") != "24-HR BLK AVG":
                continue
            if row.get("Completeness Indicator") != "Y":
                continue
            lat, lon, mean = number(row.get("Latitude")), number(row.get("Longitude")), number(row.get("Arithmetic Mean"))
            if lat is None or lon is None or mean is None:
                continue
            site_id = "-".join([
                row.get("State Code", ""), row.get("County Code", ""),
                row.get("Site Num", ""), row.get("POC", ""),
            ])
            monitors.append({
                "id": site_id,
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "mean": round(mean, 2),
                "city": row.get("City Name") or row.get("Local Site Name") or "EPA monitor",
                "county": row.get("County Name"),
                "state": row.get("State Name"),
                "observations": int(number(row.get("Observation Count")) or 0),
            })
    if not monitors:
        raise RuntimeError("No complete PM2.5 annual monitor rows found in EPA AirData file")
    print(f"  {len(monitors):,} complete annual PM2.5 monitor records", flush=True)
    return {
        "meta": {
            "year": 2025,
            "standard": "PM25 Annual 2024",
            "source": AIR_2025,
            "recordCount": len(monitors),
            "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "monitors": monitors,
    }


def parse_collection_date(value: str) -> tuple[datetime | None, str | None]:
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
        try:
            parsed = datetime.strptime(value.strip(), fmt)
            return parsed, parsed.strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            continue
    return None, None


def build_ucmr5() -> dict[str, Any]:
    print("Fetching EPA final UCMR 5 (2023–2025) results…", flush=True)
    archive = zipfile.ZipFile(io.BytesIO(download(UCMR5_FINAL)))
    text_name = next((name for name in archive.namelist() if name.lower().endswith("_all.txt")), None)
    if not text_name:
        raise RuntimeError("EPA UCMR 5 ZIP did not contain the national results file")

    systems: dict[str, dict[str, Any]] = {}
    rows_seen = 0
    allowed_points = {"EP", "DS"}  # Entry point or distribution system, after treatment.
    with archive.open(text_name) as stream:
        reader = csv.DictReader(io.TextIOWrapper(stream, encoding="cp1252", newline=""), delimiter="\t")
        for row in reader:
            rows_seen += 1
            if row.get("SamplePointType") not in allowed_points:
                continue
            pwsid = (row.get("PWSID") or "").strip()
            contaminant = (row.get("Contaminant") or "").strip()
            if not pwsid or not contaminant:
                continue
            result, date_text = number(row.get("AnalyticalResultValue")), row.get("CollectionDate", "")
            parsed_date, normalized_date = parse_collection_date(date_text)
            system = systems.setdefault(pwsid, {
                "results": 0,
                "detections": 0,
                "latest": None,
                "positive": {},
            })
            system["results"] += 1
            if normalized_date and (system["latest"] is None or normalized_date > system["latest"]):
                system["latest"] = normalized_date
            # EPA reports a quantitative value at/above the MRL with sign '='.
            if row.get("AnalyticalResultsSign") == "=" and result is not None:
                system["detections"] += 1
                aggregate = system["positive"].setdefault(contaminant, {
                    "detections": 0,
                    "max": None,
                    "latest": None,
                })
                aggregate["detections"] += 1
                aggregate["max"] = result if aggregate["max"] is None else max(aggregate["max"], result)
                if normalized_date and (aggregate["latest"] is None or normalized_date > aggregate["latest"]):
                    aggregate["latest"] = normalized_date

            if rows_seen % 500000 == 0:
                print(f"  {rows_seen:,} EPA analytical records scanned", flush=True)

    for system in systems.values():
        system["positive"] = [
            {"name": name, **values, "unit": "µg/L"}
            for name, values in sorted(system["positive"].items())
        ]
    print(f"  {rows_seen:,} rows scanned; {len(systems):,} systems with treated-water samples", flush=True)
    return {
        "meta": {
            "cycle": "UCMR 5",
            "collectionYears": "2023–2025",
            "releaseDate": "2026-08",
            "samplePointTypes": ["EP", "DS"],
            "note": "Only post-treatment entry-point and distribution-system results are included. A blank result is below the UCMR minimum reporting level; no record is not a non-detection.",
            "source": UCMR5_FINAL,
            "builtAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "systems": systems,
    }


def write_json(name: str, payload: Any) -> None:
    path = DATA_DIR / name
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp.replace(path)
    print(f"  Wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1_000_000:.1f} MB)", flush=True)


def main() -> int:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        places = build_places()
        write_json("places-zcta.json", places)
        air = build_air_monitors()
        write_json("air-monitors-2025.json", air)
        ucmr5 = build_ucmr5()
        write_json("ucmr5-by-pws.json", ucmr5)
    except Exception as exc:
        print(f"Data refresh failed: {exc}", file=sys.stderr, flush=True)
        return 1
    print("Public data refresh complete.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Build a reproducible state-based air × CKM index at postal ZIP coordinates.

No random values, ZIP-specific exposure predictions, or imputed disease rates.
Postal geography: GeoNames, CC BY 4.0. Source datasets refreshed separately.
"""
import argparse
import csv
import io
import json
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
GEOGRAPHY_URL = 'https://download.geonames.org/export/zip/US.zip'
STATE_CODES = set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split())


def build(postal_text):
    places = json.loads((ROOT / 'src/data/places-zcta.json').read_text())
    air = json.loads((ROOT / 'src/data/air-monitors-2025.json').read_text())
    postal = {}
    for row in csv.reader(io.StringIO(postal_text), delimiter='\t'):
        if len(row) < 11 or row[4] not in STATE_CODES:
            continue
        # One point per postal ZIP. A code may have multiple place-name aliases.
        postal.setdefault(row[1], dict(zip=row[1], name=row[3], state=row[4],
                                      lat=float(row[9]), lon=float(row[10])))
    states = {p['state']: dict(code=p['state'], name=p['name']) for p in postal.values()}
    sums = defaultdict(lambda: defaultdict(float))
    weights = defaultdict(lambda: defaultdict(float))
    health_counts = defaultdict(int)
    for row in places['records']:
        p = postal.get(row['z'])
        if not p:
            continue
        p['lat'], p['lon'] = row['g']
        state = p['state']
        health_counts[state] += 1
        for metric, value in [('chd', row['c']['chd']), ('kidney', row['kidney']),
                              ('diabetes', row['c']['diabetes']), ('obesity', row['c']['obesity'])]:
            if value is not None and row['a'] > 0:
                sums[state][metric] += value * row['a']
                weights[state][metric] += row['a']
    # Average instruments at the same site before averaging sites within a state.
    sites = defaultdict(list)
    for row in air['monitors']:
        sites[(row['state'], '-'.join(row['id'].split('-')[:3]))].append(row['mean'])
    state_air = defaultdict(list)
    for (name, _), values in sites.items():
        state_air[name.lower()].append(sum(values) / len(values))
    rows = []
    for code in sorted(states):
        state = states[code]
        state['healthZctas'] = health_counts[code]
        for metric in ['chd', 'kidney', 'diabetes', 'obesity']:
            state[metric] = sums[code][metric] / weights[code][metric] if weights[code][metric] else None
        values = state_air[state['name'].lower()]
        state['airSites'] = len(values)
        state['pm25'] = sum(values) / len(values) if values else None
        rows.append(state)
    # Midrank percentiles make units comparable without inventing prevalence.
    def percentile(metric, value):
        values = [r[metric] for r in rows if r[metric] is not None]
        if value is None or len(values) < 2:
            return None
        rank = sum(v < value for v in values) + (sum(v == value for v in values) - 1) / 2
        return 100 * rank / (len(values) - 1)
    for state in rows:
        cardiac = percentile('chd', state['chd'])
        kidney = percentile('kidney', state['kidney'])
        metabolic = [percentile(m, state[m]) for m in ['diabetes', 'obesity']]
        air_rank = percentile('pm25', state['pm25'])
        metabolic = [v for v in metabolic if v is not None]
        domains = [v for v in [cardiac, kidney, sum(metabolic) / len(metabolic) if metabolic else None] if v is not None]
        components = [v for v in [air_rank, sum(domains) / len(domains) if domains else None] if v is not None]
        state['partial'] = air_rank is None or len(domains) < 3 or len(metabolic) < 2
        state['index'] = round(sum(components) / len(components), 1) if components else None
        for metric in ['chd', 'kidney', 'diabetes', 'obesity', 'pm25']:
            if state[metric] is not None:
                state[metric] = round(state[metric], 3)
    indices = {s['code']: i for i, s in enumerate(rows)}
    points = [[p['zip'], round(p['lat'], 5), round(p['lon'], 5), indices[p['state']]]
              for p in sorted(postal.values(), key=lambda p: p['zip'])]
    result = dict(meta=dict(version=1, builtAt=datetime.now(timezone.utc).isoformat(),
                           pointCount=len(points), geography=GEOGRAPHY_URL,
                           geographyCredit='GeoNames · CC BY 4.0',
                           label='State-based estimates',
                           formula='50% air percentile + 50% CKM; CKM = mean(CHD percentile, CKD percentile, mean(diabetes percentile, obesity percentile)); available components only when incomplete',
                           places=places['meta'], air=air['meta']), states=rows, points=points)
    output = ROOT / 'public/data/national-map.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, separators=(',', ':'), allow_nan=False) + '\n')
    print(f'{len(points):,} ZIP points across {len(rows)} states/DC; {sum(s["index"] is None for s in rows)} missing indices. {output.stat().st_size:,} bytes.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--postal-file', type=Path, help='Use a downloaded GeoNames US.txt snapshot')
    args = parser.parse_args()
    if args.postal_file:
        contents = args.postal_file.read_text()
    else:
        with urlopen(GEOGRAPHY_URL, timeout=90) as response:
            contents = zipfile.ZipFile(io.BytesIO(response.read())).read('US.txt').decode('utf-8')
    build(contents)

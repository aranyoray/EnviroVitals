#!/usr/bin/env python3
"""Average existing ZIP index values inside Census county boundaries.

2024 Census cartographic county boundaries: https://www2.census.gov/geo/tiger/GENZ2024/kml/cb_2024_us_county_5m.zip
Uses polygon containment, with no geographic interpolation or invented values.
"""
import argparse
import io
import json
import math
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://www2.census.gov/geo/tiger/GENZ2024/kml/cb_2024_us_county_5m.zip'
N = {'k': 'http://www.opengis.net/kml/2.2'}


def read_boundary_archive(archive):
    with zipfile.ZipFile(io.BytesIO(archive)) as package:
        name = next(item for item in package.namelist() if item.endswith('.kml'))
        root = ET.fromstring(package.read(name))
    features = []
    for place in root.findall('.//k:Placemark', N):
        data = {item.get('name'): item.text for item in place.findall('.//k:SimpleData', N)}
        if not data.get('GEOID'):
            continue
        polygons = []
        for polygon in place.findall('.//k:Polygon', N):
            rings = []
            for boundary in [*polygon.findall('k:outerBoundaryIs', N), *polygon.findall('k:innerBoundaryIs', N)]:
                node = boundary.find('.//k:coordinates', N)
                if node is not None and node.text:
                    ring = [[float(pair[0]), float(pair[1])] for item in node.text.split() if len(pair := item.split(',')) >= 2]
                    if len(ring) >= 4:
                        rings.append(ring)
            if rings:
                polygons.append(rings)
        if not polygons:
            continue
        geometry = {'type': 'Polygon', 'coordinates': polygons[0]} if len(polygons) == 1 else {'type': 'MultiPolygon', 'coordinates': polygons}
        features.append({'type': 'Feature', 'properties': {'fips': data['GEOID'], 'name': data.get('NAMELSAD') or data.get('NAME'), 'state': data.get('STUSPS')}, 'geometry': geometry})
    features.sort(key=lambda f: f['properties']['fips'])
    if len(features) < 3000 or len({f['properties']['fips'] for f in features}) != len(features):
        raise ValueError('County geometry is incomplete or has duplicate FIPS codes')
    return features


def inside_ring(lon, lat, ring):
    inside = False
    previous = ring[-1]
    for current in ring:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            inside = not inside
        previous = current
    return inside


def inside_feature(lon, lat, feature):
    polygons = feature['geometry']['coordinates']
    if feature['geometry']['type'] == 'Polygon':
        polygons = [polygons]
    return any(inside_ring(lon, lat, polygon[0]) and not any(inside_ring(lon, lat, hole) for hole in polygon[1:]) for polygon in polygons)


def bounds_of(feature):
    polygons = feature['geometry']['coordinates']
    if feature['geometry']['type'] == 'Polygon':
        polygons = [polygons]
    coords = [point for polygon in polygons for ring in polygon for point in ring]
    return min(p[0] for p in coords), min(p[1] for p in coords), max(p[0] for p in coords), max(p[1] for p in coords)


def aggregate(features, national):
    states = national['states']
    buckets = defaultdict(list)
    boxes = []
    for i, feature in enumerate(features):
        box = bounds_of(feature)
        boxes.append(box)
        for lat in range(math.floor(box[1]), math.floor(box[3]) + 1):
            for lon in range(math.floor(box[0]), math.floor(box[2]) + 1):
                buckets[(lat, lon)].append(i)
    totals = defaultdict(lambda: {'sum': 0, 'count': 0, 'partial': 0, 'sampleZip': None})
    assigned = 0
    for zip_code, lat, lon, state_index, value, coverage in national['points']:
        if value is None:
            continue
        candidates = buckets.get((math.floor(lat), math.floor(lon)), ())
        for i in candidates:
            box = boxes[i]
            if features[i]['properties']['state'] != states[state_index]['code'] or not (box[0] <= lon <= box[2] and box[1] <= lat <= box[3]):
                continue
            if inside_feature(lon, lat, features[i]):
                item = totals[i]
                item['sum'] += value
                item['count'] += 1
                item['partial'] += bool(coverage & 4)
                if item['sampleZip'] is None:
                    item['sampleZip'] = zip_code
                assigned += 1
                break
    for i, feature in enumerate(features):
        item = totals[i]
        feature['properties'].update(index=round(item['sum'] / item['count'], 1) if item['count'] else None,
                                     zipCount=item['count'], partialCount=item['partial'], sampleZip=item['sampleZip'])
    return assigned


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--county-zip', type=Path, help='Previously downloaded Census KML ZIP')
    args = parser.parse_args()
    archive = args.county_zip.read_bytes() if args.county_zip else urllib.request.urlopen(SOURCE, timeout=90).read()
    features = read_boundary_archive(archive)
    national = json.loads((ROOT / 'public/data/national-map.json').read_text())
    assigned = aggregate(features, national)
    if assigned < 25000:
        raise ValueError(f'Only {assigned} ZIP points matched a county polygon')
    output = ROOT / 'public/data/county-map.json'
    output.write_text(json.dumps({'type': 'FeatureCollection', 'meta': {'source': SOURCE, 'indexSource': 'national-map.json', 'method': 'Arithmetic mean of available ZIP index values at postal coordinates inside each 2024 county boundary', 'assignedZipCount': assigned}, 'features': features}, separators=(',', ':')) + '\n')
    print(f'{len(features):,} counties, {assigned:,} matched ZIP points, {output.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()

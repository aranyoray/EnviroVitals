import json
import unittest
from pathlib import Path

from scripts.build_county_map import inside_feature


class CountyMapTests(unittest.TestCase):
    def test_polygon_hole_and_disconnected_part(self):
        feature = {'geometry': {'type': 'MultiPolygon', 'coordinates': [
            [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]],
             [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]],
            [[[6, 6], [8, 6], [8, 8], [6, 8], [6, 6]]],
        ]}}
        self.assertTrue(inside_feature(.5, .5, feature))
        self.assertFalse(inside_feature(2, 2, feature))
        self.assertTrue(inside_feature(7, 7, feature))
        self.assertFalse(inside_feature(5, 5, feature))

    def test_generated_coverage(self):
        root = Path(__file__).resolve().parents[1]
        data = json.loads((root / 'public/data/county-map.json').read_text())
        features = data['features']
        self.assertGreaterEqual(len(features), 3000)
        self.assertEqual(len({f['properties']['fips'] for f in features}), len(features))
        self.assertEqual(sum(f['properties']['zipCount'] for f in features), data['meta']['assignedZipCount'])
        self.assertGreater(data['meta']['assignedZipCount'], 40000)
        for feature in features:
            properties = feature['properties']
            self.assertEqual(properties['index'] is None, properties['zipCount'] == 0)
            if properties['index'] is not None:
                self.assertLessEqual(0, properties['index'])
                self.assertLessEqual(properties['index'], 100)


if __name__ == '__main__':
    unittest.main()

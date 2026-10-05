# EnviroVitals

EnviroVitals is a ZIP-level web app for community cardiovascular, kidney, and metabolic (CKM) health. It pairs adult prevalence estimates where CDC has a matching ZCTA with nearby outdoor air data and public drinking-water-system records, then creates a deterministic household action checklist. Checking actions complete raises the **EnviroHealth action-progress score**; the score is not a personal health or exposure-risk estimate.

## Run the web app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The landing page opens a nationwide map. Use **Explore a ZIP** to open the profile panel (initially ZIP `10013`), or zoom in and click a circle. Pan or zoom to explore, including Alaska and Hawaii; the ZIP report scrolls as a single panel on phones.

The interface uses Next.js App Router, React, and TypeScript. Profile data is served by `/api/profile?zip=10013`. No account or API key is required. Checklist progress is stored in browser local storage.

## Data coverage and methods

- **CKM prevalence:** CDC PLACES 2025 provides 2023 BRFSS estimates for populated 2020 Census ZIP Code Tabulation Areas (ZCTAs). The snapshot covers 32,520 ZCTAs with at least 50 adults. It includes coronary heart disease, stroke, high blood pressure, high cholesterol, diabetes, and obesity. The newest ZIP-level chronic kidney disease measure available is PLACES 2023, based on 2021 BRFSS data. CDC discontinued the CKD measure in later releases; older CKD ZCTA IDs are joined to current records by five-digit ZCTA code.
- **Outdoor air:** EPA AirData 2025 annual concentration records. Each profile uses the nearest complete PM₂.₅ monitor within 50 miles of the Census ZCTA centroid when available, otherwise the postal ZIP coordinates returned by the ZIP place lookup. The app displays monitor distance. This is a measured monitor value, not an address-level estimate or current AQI. EPA’s annual 9.0 µg/m³ standard is a three-year average; EnviroVitals uses it only as a screening reference for the single 2025 monitor value, not to determine attainment.
- **Map:** A canvas layer displays 40,977 unique GeoNames ZIP points across all 50 states and DC. Each has an air × CKM index based on matching CDC ZCTA health estimates and state air context, using state health fallback per missing measure. Local color and circle-size variation comes from data, without random noise. OpenStreetMap public raster tiles load directly from `tile.openstreetmap.org` without an API key. The basemap is visually muted to keep the index prominent; street labels are part of the raster tiles. Attribution credits OpenStreetMap contributors and GeoNames (CC BY 4.0). Tile requests follow the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) with browser caching and a valid referrer, without bulk downloads or offline prefetching. A weighted-mean heatmap at wider zooms transitions into circles, without treating ZIP density as higher risk. ZIP indices use equal weights for the air and CKM components; CKM averages cardiac, kidney, and metabolic percentile ranks. Health inputs use national ZCTA percentile references; state health fallbacks use adult-population-weighted aggregates of matched CDC ZCTAs; air inputs are means of complete EPA sites. Incomplete components are omitted and remaining weights renormalized (Idaho, Florida, Pennsylvania). These are exploratory ZIP and state estimates, not ZIP measurements, a validated clinical risk score, or the household checklist score. Full calculation and coverage are described at `/about#national-map`.
- **Drinking water:** EPA’s current public-water-system service-area map is queried at the same ZIP-area coordinates. The app shows the system name, boundary source/model label, and population served when available. It joins EPA’s final UCMR 5 analytical records (2023–2025) by PWS ID and summarizes treated-water entry-point and distribution-system samples. These are system samples, not tap tests. A system absent from UCMR 5 may not have been selected for monitoring; absence is not a non-detection.
- **Task rules:** Air tasks change when the nearest annual PM₂.₅ reading is above 9.0 µg/m³. Water tasks change based on the system match, UCMR 5 records, and whether the user selects public water, private well, or unsure. The public-system branch prioritizes confirming the utility, reviewing the Consumer Confidence Report, and matching any filter certification to a measured contaminant. The private-well branch follows EPA’s annual test list.
- **Score:** Completed task points divided by all points in the current checklist, rounded to a whole number. Task rules and points are fixed; completion only changes the progress score. A ZIP or source-mode change loads that profile’s separate saved checklist.

Sources are linked in the app under **Sources & methods**. Valid postal ZIPs recognized by the ZIP place lookup can receive air and water results. CKM estimates are available only for matching populated Census ZCTAs in CDC PLACES; a missing estimate is shown as unavailable, never as zero. The data layers use different source years and geographic methods. ZCTAs approximate, but are not identical to, USPS ZIP delivery areas.

## Refresh public data snapshots

```bash
npm run data:refresh
npm run data:map
```

This downloads CDC PLACES 2025 and 2023 ZCTA data, EPA AirData 2025 annual monitor data, and the final EPA UCMR 5 archive. It writes compact JSON snapshots under `src/data/`. `data:map` then downloads GeoNames US postal coordinates and builds `public/data/national-map.json` from the current CDC/EPA snapshots. To reuse a downloaded geography snapshot, run `python3 scripts/build_national_map.py --postal-file /path/to/US.txt`. The map JSON is fetched separately in the browser; do not statically import large data snapshots into TypeScript (literal inference can exceed the compiler’s Map size limit). The EPA water-system boundary layer is queried live. Python 3 and network access are required; the script uses only the Python standard library.

## Existing iOS project

The repository’s original SwiftUI project remains in `CivicVision/` and `CivicVision.xcodeproj/`.

## Use notice

EnviroVitals provides community context and general information only. It does not provide a diagnosis, treatment recommendation, or assurance of a home’s air or drinking-water quality. Consult a qualified clinician for health questions, your water provider or a state-certified lab for water testing, and EPA/AirNow for current air-quality advisories.

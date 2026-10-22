import Link from "next/link";

const sources = [
  {
    name: "EPA AirNow · hourly reporting-area observations and forecasts",
    url: "https://files.airnowtech.org/",
    note: "AirNow's public file products publish the current AQI, primary pollutant, category, Air Quality Action Day flag and next-day forecast for about 750 US reporting areas each hour. The profile uses the nearest reporting area within 60 miles of the ZIP-area coordinates and refreshes every 10 minutes; a reporting area is a regional value, not a reading at your address.",
  },
  {
    name: "NOAA National Weather Service · active alerts API",
    url: "https://www.weather.gov/documentation/services-web-api",
    note: "Active watches, warnings and advisories for the ZIP-area point (status: actual). Heat, air-quality and cold alerts map to specific steps; other severe or extreme alerts trigger medicine and dialysis continuity steps. Times are shown in the alert area's local time.",
  },
  {
    name: "Open-Meteo · forecast and air-quality APIs",
    url: "https://open-meteo.com/en/terms",
    note: "Feels-like (apparent) temperature, air temperature, humidity and today's and tomorrow's feels-like range, compared against the NWS heat-index bands (Caution 80–90°F, Extreme Caution 90–103°F, Danger 103–124°F, Extreme Danger 125°F+). Apparent temperature includes wind and radiation, so it can differ from the NWS heat index. The Open-Meteo CAMS air-quality model supplies a US AQI estimate only where no AirNow reporting area is within range, and is labeled as a model estimate.",
  },
  {
    name: "GeoNames · US postal geography",
    url: "https://download.geonames.org/export/zip/",
    note: "40,977 unique geographic ZIP coordinates across 50 states and DC in the downloaded snapshot. GeoNames is licensed under CC BY 4.0. ZIPs can share coordinates; military and territorial codes are excluded. This is snapshot coverage, not a guarantee of every current USPS code.",
  },
  {
    name: "CDC PLACES 2025 · ZIP Code Tabulation Areas",
    url: "https://data.cdc.gov/500-Cities-Places/PLACES-ZCTA-Data-GIS-Friendly-Format-2025-release/kee5-23sr",
    note: "32,520 populated 2020 Census ZCTAs with at least 50 adults. CHD, stroke, high blood pressure, high cholesterol, diabetes, and obesity estimates use the 2023 BRFSS in the 2025 release. Each estimate is also ranked as a midrank percentile against all ZCTAs with that measure.",
  },
  {
    name: "CDC PLACES 2023 · ZIP Code Tabulation Areas",
    url: "https://data.cdc.gov/500-Cities-Places/PLACES-ZCTA-Data-GIS-Friendly-Format-2023-release/c7b2-4ecy",
    note: "Latest ZIP-level chronic kidney disease estimate still available in PLACES. This is a model-based estimate using 2021 BRFSS data and the older 2010 Census ZCTA geography; ZIP IDs are joined to the current 2020 ZCTA where available.",
  },
  {
    name: "EPA AirData · 2025 annual concentration by monitor",
    url: "https://aqs.epa.gov/aqsweb/airdata/download_files.html",
    note: "Complete annual PM₂.₅ readings for monitors using EPA's PM25 Annual 2024 metric. Each ZIP profile uses the nearest complete monitor within 50 miles of the Census ZCTA centroid when available, otherwise the postal ZIP coordinates. EPA's 9.0 µg/m³ annual standard is calculated as a three-year average; EnviroVitals shows one 2025 annual value against it only as a screening reference, not as an attainment determination.",
  },
  {
    name: "EPA Public Water System Service Areas · version 3",
    url: "https://gispub.epa.gov/serviceareas/",
    note: "The EPA's March 2026 spatial layer identifies public systems whose service-area polygon intersects the ZIP-area coordinates. Boundaries can be system-sourced or modeled; the app labels the boundary type. It is not an address-level service confirmation.",
  },
  {
    name: "EPA UCMR 5 · final 2023–2025 results",
    url: "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder",
    note: "Final dataset released August 2026. The app aggregates results from entry-point and distribution-system samples for each matched PWS. A reported detection is an analytical result at or above the rule's minimum reporting level; it is not a determination of health risk or compliance. Some small systems were not selected for monitoring, so a missing record is not a non-detection.",
  },
  {
    name: "EPA PFAS National Primary Drinking Water Regulation (2024)",
    url: "https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas",
    note: "Enforceable limits of 4.0 ng/L for PFOA and PFOS, 10 ng/L for PFHxS, PFNA and HFPO-DA, and a hazard index of 1 for mixtures, with compliance due by 2029. On May 18, 2026 EPA proposed rescinding the three 10 ng/L limits and the hazard index and allowing PFOA/PFOS compliance extensions to 2031; the app labels those limits as proposed for rescission. Health context comes from EPA's PFAS health-effects summary.",
  },
  {
    name: "EPA UCMR 5 Data Summary · health reference values",
    url: "https://www.epa.gov/system/files/documents/2023-08/ucmr5-data-summary_0.pdf",
    note: "EPA's non-regulatory health reference level for lithium is 10 µg/L, compared at one significant digit, so sample maximums above 15 µg/L round to 20 µg/L and are flagged as above the reference; roughly a quarter of US systems report lithium above it. The app flags only system maximums above 15 µg/L.",
  },
  {
    name: "EPA · Lead and Copper Rule Improvements (2024) and lead basics",
    url: "https://www.epa.gov/ground-water-and-drinking-water/basic-information-about-lead-drinking-water",
    note: "The 2024 rule lowered the lead action level to 10 µg/L and requires lead service-line inventories and replacement. EPA notes that lead exposure in adults raises blood pressure and reduces kidney function, which is why lead testing sits in the CKM-focused water steps.",
  },
  {
    name: "AHA · Cardiovascular-Kidney-Metabolic (CKM) health",
    url: "https://www.heart.org/CKMhealth",
    note: "The 2023 AHA presidential advisory defines CKM syndrome and stages it from 0 (no risk factors) through 1 (excess or dysfunctional body fat), 2 (metabolic risk factors or chronic kidney disease), 3 (subclinical cardiovascular disease) to 4 (clinical cardiovascular disease). EnviroVitals maps the optional conditions a user selects to a stage context only; the actual stage requires clinical assessment.",
  },
  {
    name: "EPA AirNow · heart disease, stroke and outdoor air pollution",
    url: "https://www.airnow.gov/publications/health-professionals/heart-disease-stroke-and-outdoor-air-pollution-health-professionals/",
    note: "EPA's AQI guidance for people with heart disease: consider reducing prolonged or heavy exertion at Moderate, reduce it at Unhealthy for Sensitive Groups, avoid it at Unhealthy, avoid all outdoor activity at Very Unhealthy, and remain indoors with low activity at Hazardous. Palpitations, shortness of breath or unusual fatigue on polluted days warrant contacting a clinician.",
  },
  {
    name: "CDC · heat and chronic conditions; heat and medications",
    url: "https://www.cdc.gov/heat-health/risk-factors/heat-and-chronic-conditions.html",
    note: "CDC advises people with heart disease to create a heat action plan with their clinician. CDC's clinician guidance (cdc.gov/heat-health) notes that diuretics, ACE inhibitors and ARBs reduce thirst, beta blockers can reduce sweating, and ACE/ARB-plus-diuretic combinations substantially raise heat risk. CDC's diabetes guidance covers glucose checks, hydration and keeping insulin and devices out of heat; ADA's storage guidance gives the 86°F room-temperature limit for opened insulin.",
  },
  {
    name: "National Kidney Foundation · extreme heat and kidneys",
    url: "https://www.kidney.org/news-stories/can-extreme-heat-harm-your-kidneys-new-research-highlights-risks",
    note: "Fluid needs with kidney disease can be higher or lower than usual and must follow the care team's plan; NSAIDs such as ibuprofen and naproxen reduce kidney blood flow and raise acute kidney injury risk when dehydrated.",
  },
  {
    name: "AHA · cold weather and cardiovascular disease; NWS cold safety",
    url: "https://www.heart.org/en/health-topics/consumer-healthcare/what-is-cardiovascular-disease/cold-weather-and-cardiovascular-disease",
    note: "Cold narrows blood vessels and raises blood pressure; people with coronary disease often experience angina in cold weather and should avoid sudden exertion such as snow shoveling. Cold steps appear when the feels-like temperature is at or below 32°F or an NWS cold alert is active.",
  },
  {
    name: "CDC · chronic kidney disease testing; National Diabetes Prevention Program",
    url: "https://www.cdc.gov/kidney-disease/testing/index.html",
    note: "eGFR and urine albumin-to-creatinine ratio (uACR) are the two kidney tests; a uACR of 30 or above may indicate kidney disease and should be repeated. CDC's find-a-program locator lists CDC-recognized lifestyle change programs; HRSA's health-center locator lists sliding-fee screening sites.",
  },
  {
    name: "CDC · One Health",
    url: "https://www.cdc.gov/one-health/about/index.html",
    note: "One Health is a collaborative, multisectoral and transdisciplinary approach that recognizes the interconnection between people, animals, plants and their shared environment. The One Health steps draw on EPA's pets-and-wildfire-smoke guidance, AVMA warm-weather pet safety, EPA harmful-algal-bloom guidance, EPA medicine take-back guidance, EPA Burn Wise and EPA source-water protection.",
  },
];

function ExternalIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 2h5v5M14 2 7.5 8.5M12 9v4.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H7" /></svg>;
}

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-topline"><span>ENVIROVITALS · TRANSPARENCY</span><Link href="/">← Back to ZIP profile</Link></div>
      <div className="eyebrow" style={{ marginTop: 44 }}>SOURCES &amp; METHODS</div>
      <h1>What the ZIP profile can—and cannot—say.</h1>
      <p className="about-deck">EnviroVitals is a One Health view of cardiovascular-kidney-metabolic (CKM) health: live air, heat and weather alerts, drinking-water records and community prevalence for one ZIP, turned into steps that depend on the actual values. The dates and geographies differ by measure, and the app keeps those differences visible.</p>

      <section className="about-section">
        <h2>How the data are assembled</h2>
        <ul>
          <li><strong>ZIP geography:</strong> Air, heat and water lookups accept postal ZIPs recognized by the ZIP place lookup. Where CDC has a matching record, coordinates use the Census ZIP Code Tabulation Area (ZCTA) centroid; otherwise they use the postal ZIP coordinates. ZCTAs approximate but do not exactly match postal ZIP service areas.</li>
          <li><strong>Right now:</strong> The nearest AirNow reporting area within 60 miles supplies the current AQI, primary pollutant and tomorrow’s forecast; NWS supplies active alerts for the point; Open-Meteo supplies the feels-like temperature and today’s range. The panel refreshes these every 10 minutes while open. Each source can fail on its own, and a failed source is shown in gray rather than filled in.</li>
          <li><strong>Air:</strong> The app also uses the nearest complete 2025 EPA monitor within 50 miles of the selected ZIP-area coordinates as a long-term exposure signal. It reports a measured outdoor monitor value, not a prediction for each street or indoor air.</li>
          <li><strong>Water:</strong> EPA service polygons are checked at the selected ZIP-area coordinates. The matched system may not serve every address in the ZIP. UCMR 5 values are from system sampling points after treatment; they are not a test of a household tap. Sample maximums are compared with the 2024 PFAS limits and EPA’s lithium reference level.</li>
          <li><strong>CKM:</strong> CDC PLACES publishes modeled adult prevalence, not individual diagnoses. Most current measures use 2023 BRFSS data; CKD uses 2021. Each estimate is ranked against all US ZCTAs so a value also reads as “higher than N% of ZCTAs”.</li>
          <li><strong>Missing data is gray:</strong> A missing monitor, system, estimate, live reading or alert feed is displayed in gray with a dash. The app never substitutes zero, never treats missing air data as clean, and never treats a missing water record as a non-detection.</li>
          <li><strong>Actions and score:</strong> Rules are deterministic functions of the values above and the optional conditions a user selects. The EnviroHealth score is the weighted share of checklist points a user has marked complete. It does not estimate health, exposure, or treatment benefit. Checklist state and selections are saved in this browser only.</li>
        </ul>
      </section>

      <section className="about-section" id="ckm">
        <h2>CKM focus · what the steps are built around</h2>
        <p>Cardiovascular, kidney and metabolic disease share causes, measurements and treatments, which the AHA formalized as CKM syndrome in 2023. The checklist therefore carries a “why it matters for CKM” line on most steps, asks for the five CKM numbers (blood pressure, glucose or A1c, lipids, eGFR with uACR, weight or waist) and a yearly kidney check, and tailors live steps to the conditions a person selects: high blood pressure, diabetes or prediabetes, kidney disease, heart disease or stroke, excess weight, and age 65 or older.</p>
        <h3>Stage context</h3>
        <p>Selections map to an AHA stage context only: heart disease or stroke to Stage 4; high blood pressure, diabetes or kidney disease to Stage 2; excess weight alone to Stage 1; no selections to Stage 0–1. Stage 3 (subclinical cardiovascular disease) cannot be inferred from selections and is flagged as requiring testing. The context never changes a diagnosis or treatment plan; it decides which guidance appears first.</p>
        <h3>Environmental triggers used</h3>
        <p>Fine particles (heart attack, stroke and kidney-function decline), heat (cardiac strain, dehydration, acute kidney injury, altered insulin handling, medicines that reduce heat tolerance), cold (vasoconstriction and blood-pressure rise), PFAS (cholesterol, blood pressure in pregnancy, kidney cancer), lead (blood pressure, kidney function), lithium (kidney clearance) and well contaminants such as arsenic and nitrate. Each appears only when the relevant value crosses the threshold documented in the action rules below.</p>
      </section>

      <section className="about-section" id="one-health">
        <h2>One Health · people, animals, shared environment</h2>
        <p>CDC defines One Health as a collaborative approach that recognizes the interconnection between people, animals, plants and their shared environment. EnviroVitals applies it in two directions. Upstream, the air, water and climate conditions that drive CKM disease are shared with animals and ecosystems, so the One Health steps extend the same AQI, heat, water and algal-bloom precautions to pets and livestock. Downstream, household choices shape the shared environment: returning unused blood-pressure, diabetes and heart medicines to take-back sites, burning only dry wood and nothing on poor-air days, and keeping septic, fertilizer and animal waste away from wells and source water.</p>
      </section>

      <section className="about-section" id="national-map">
        <h2>Nationwide map · ZIP and state estimates</h2>
        <p>The map is an exploratory air × CKM index, from 0 to 100. Each ZIP uses the matching CDC ZCTA health estimates where available, combined with state air context. Missing local health measures fall back to the state aggregate. County shades average the ZIP indices inside each county; no random variation is added. Counties with no matched ZIP index are drawn in gray. This is not measured ZIP-level air quality, a disease probability, or a validated health-risk score.</p>
        <h3>Fixed calculation</h3>
        <p>For each ZIP, we match CDC ZCTA prevalence by five-digit code. When a measure is missing locally, its state fallback is the adult-population-weighted average of available, postal-matched ZCTAs. State assignments come from the postal ZIP match; unmatched ZCTAs are excluded from state aggregates. CHD represents cardiac context, CKD represents kidney context, and diabetes and obesity represent metabolic context. Health measures are converted separately to percentiles against the national distribution of available ZCTA estimates, using midranks for ties. State fallback prevalences use the same reference distribution. Thus colors use one consistent scale for local and fallback estimates. The CKM component is the average of cardiac, kidney, and metabolic percentiles; the metabolic component averages diabetes and obesity percentiles.</p>
        <p>Air uses the mean of complete 2025 EPA PM₂.₅ site values in each state. Multiple instruments at a site are averaged first; sites are then weighted equally. Its percentile across states with available air data contributes 50% of the index, with the CKM component contributing 50%. This is a monitor-network average, not population-weighted exposure. Water and live conditions are shown in the ZIP profile and are not part of this index.</p>
        <h3>Coverage and interpretation</h3>
        <p>After using state fallback for any missing local health measure, components still unavailable are omitted and remaining weights are normalized. Idaho has no complete PM₂.₅ site in this snapshot; Florida lacks the kidney estimate; Pennsylvania lacks the current cardiac and metabolic estimates. Tooltips identify local health, state health fallback, and partial data. A missing value is never replaced by zero. Source vintages remain mixed: 2025 air, 2023 cardiac/metabolic BRFSS, and 2021 kidney BRFSS.</p>
        <p>County boundaries use the 2024 U.S. Census Bureau cartographic file. Each county shade is the arithmetic mean of available ZIP indices whose postal coordinates fall inside that county. County colors do not infer values between ZIP coordinates or measure county-wide exposure. Counties without matched ZIP indices are gray. The red-to-yellow-to-teal colors follow the Opportunity Atlas visual reference, with the red end assigned to higher EnviroVitals indices. Click a county for its ZIP count and an example ZIP profile, or use ZIP search to select a specific code. The map index is independent of your EnviroHealth checklist progress.</p>
      </section>

      <section className="about-section">
        <h2>Public data sources</h2>
        <div className="source-list">
          {sources.map((source) => (
            <div className="source-item" key={source.name}>
              <a href={source.url} target="_blank" rel="noreferrer">{source.name}<ExternalIcon /></a>
              <p>{source.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-section" id="action-rules">
        <h2>Action rules</h2>
        <h3>Right now</h3>
        <p>The current AQI selects one step using EPA’s category thresholds (Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150, Unhealthy 151–200, Very Unhealthy 201–300, Hazardous 301+), with stronger wording when the user has selected heart disease, age 65+, diabetes, kidney disease or high blood pressure. Ozone adds a morning-hours note; particle pollutants add a windows-closed, HEPA note. A forecast AQI above 100 and above today’s value adds a plan-ahead step. The higher of the current and today’s maximum feels-like temperature selects a heat step at the NWS Caution (80°F), Extreme Caution (90°F), Danger (103°F) or Extreme Danger (125°F) band, with condition-specific guidance for kidney disease (fluid plan, no NSAIDs), diabetes (glucose checks, insulin storage), hypertension or heart disease (medicine review) and older adults; a feels-like temperature at or below 32°F adds a cold step. Active NWS heat, air-quality and cold alerts each add a priority step linked to the forecast office page; other severe or extreme alerts add a medicine and dialysis continuity step, and flood-type alerts add a well-safety step for private wells.</p>
        <h3>Air at home</h3>
        <p>If the nearest 2025 PM₂.₅ monitor value is above 9.0 µg/m³, the app prioritizes a room-sized portable air cleaner and states how far above the reference the value sits. This single-year comparison is a screening signal, not a NAAQS attainment determination. It asks for a smoke CADR of at least two-thirds of room area, and recommends checking the HVAC manual before upgrading to MERV 13. If a nearby monitor is missing, the air card is gray and the app adds a fire-and-smoke-map step rather than treating missing data as clean air.</p>
        <h3>Drinking water</h3>
        <p>For public systems, the task list starts with confirming the provider and reviewing its Consumer Confidence Report. UCMR 5 sample maximums are then compared with the limits: PFOA or PFOS above 4.0 ng/L creates a priority step with the measured value and the compliance timeline; PFHxS, PFNA or HFPO-DA above 10 ng/L creates a review step that notes EPA’s May 2026 proposal to rescind those limits; other PFAS detections create a filter-matching step that lists the compounds and values; lithium above 15 µg/L creates a review step against the 10 µg/L reference level. The app does not suggest buying a filter when it has no household tap test, and lead steps cite EPA’s 10 µg/L action level and its blood-pressure and kidney effects. For private wells, it uses EPA’s annual test list and adds arsenic, PFAS and lead to the questions for the health department; an active flood alert adds a do-not-drink step.</p>
        <h3>CKM care</h3>
        <p>Every profile includes knowing the five CKM numbers and a yearly eGFR plus uACR check. Home blood-pressure logging appears for hypertension, heart disease or kidney disease, or when the ZIP’s high-blood-pressure estimate ranks in the top quarter of US ZCTAs. A CDC-recognized diabetes-prevention or self-management step appears for diabetes, excess weight, or a ZIP diabetes estimate above the 60th percentile. Kidney disease adds a sick-day and NSAID-free medicine plan. With no conditions selected and ZIP heart-disease or stroke estimates in the top quarter, a community screening step appears. Community prevalence never produces a diagnosis; it changes which general public-health steps appear and quotes the ZIP’s values and ranks.</p>
        <h3>One Health</h3>
        <p>Pet smoke steps appear when the live AQI exceeds 100, an air-quality alert is active, or the annual monitor exceeds 9.0 µg/m³; pet heat steps appear in any NWS heat band; algal-bloom steps appear from May through October; medicine take-back, Burn Wise, source-water protection and a shared-household plan appear for every ZIP.</p>
      </section>

      <section className="about-section">
        <div className="about-warning"><strong>For information and planning only.</strong> EnviroVitals is not a medical device and does not provide medical advice, diagnosis, or treatment. The condition selections and CKM stage context exist only to order general public-health guidance. Use your water provider, state-certified laboratory, EPA/AirNow and NWS alerts, and qualified clinicians for decisions about your home, your medicines or your health.</div>
        <h3>Data requests and local storage</h3>
        <p>When you look up a ZIP, the profile route checks the CDC snapshot, queries the EPA service-area layer, and uses a ZIP-to-place lookup for postal ZIP coordinates and the area label; the live route fetches AirNow’s reporting-area file, the NWS alerts API and Open-Meteo for the same coordinates and is cached for 10 minutes. CDC CKM values are shown only when a matching ZCTA estimate exists; missing estimates are gray, not zero. Checklist checkboxes, the selected water-source option and your optional condition selections are stored in this browser’s local storage; there is no account, no cross-device sync, and nothing about you is sent to the live data providers beyond rounded coordinates.</p>
      </section>
    </main>
  );
}

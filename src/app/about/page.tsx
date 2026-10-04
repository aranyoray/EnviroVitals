import Link from "next/link";

const sources = [
  {
    name: "CDC PLACES 2025 · ZIP Code Tabulation Areas",
    url: "https://data.cdc.gov/500-Cities-Places/PLACES-ZCTA-Data-GIS-Friendly-Format-2025-release/kee5-23sr",
    note: "32,520 populated 2020 Census ZCTAs with at least 50 adults. CHD, stroke, high blood pressure, high cholesterol, diabetes, and obesity estimates use the 2023 BRFSS in the 2025 release.",
  },
  {
    name: "CDC PLACES 2023 · ZIP Code Tabulation Areas",
    url: "https://data.cdc.gov/500-Cities-Places/PLACES-ZCTA-Data-GIS-Friendly-Format-2023-release/c7b2-4ecy",
    note: "Latest ZIP-level chronic kidney disease estimate still available in PLACES. This is a model-based estimate using 2021 BRFSS data and the older 2010 Census ZCTA geography; ZIP IDs are joined to the current 2020 ZCTA where available.",
  },
  {
    name: "EPA AirData · 2025 annual concentration by monitor",
    url: "https://aqs.epa.gov/aqsweb/airdata/download_files.html",
    note: "Complete annual PM₂.₅ readings for monitors using EPA’s PM25 Annual 2024 metric. Each ZIP profile uses the nearest complete monitor within 50 miles of the Census ZCTA centroid when available, otherwise the postal ZIP coordinates. EPA’s 9.0 µg/m³ annual standard is calculated as a three-year average; EnviroVitals shows one 2025 annual value against it only as a screening reference, not as an attainment determination.",
  },
  {
    name: "EPA Public Water System Service Areas · version 3",
    url: "https://gispub.epa.gov/serviceareas/",
    note: "The EPA’s March 2026 spatial layer identifies public systems whose service-area polygon intersects the ZIP-area coordinates. Boundaries can be system-sourced or modeled; the app labels the boundary type. It is not an address-level service confirmation.",
  },
  {
    name: "EPA UCMR 5 · final 2023–2025 results",
    url: "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder",
    note: "Final dataset released August 2026. The app aggregates results from entry-point and distribution-system samples for each matched PWS. A reported detection is an analytical result at or above the rule’s minimum reporting level; it is not a determination of health risk or compliance. Some small systems were not selected for monitoring, so a missing record is not a non-detection.",
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
      <p className="about-deck">EnviroVitals joins the most recent public CKM prevalence, outdoor-air, and drinking-water sources we could reliably map. The dates differ by measure, and the app keeps those differences visible.</p>

      <section className="about-section">
        <h2>How the data are assembled</h2>
        <ul>
          <li><strong>ZIP geography:</strong> Air and water lookups accept postal ZIPs recognized by the ZIP place lookup. Where CDC has a matching record, coordinates use the Census ZIP Code Tabulation Area (ZCTA) centroid; otherwise they use the postal ZIP coordinates. ZCTAs approximate but do not exactly match postal ZIP service areas.</li>
          <li><strong>Air:</strong> The app uses the nearest complete 2025 EPA monitor within 50 miles of the selected ZIP-area coordinates. It reports a measured outdoor monitor value, not a prediction for each street, a current AQI, or indoor air.</li>
          <li><strong>Water:</strong> EPA service polygons are checked at the selected ZIP-area coordinates. The matched system may not serve every address in the ZIP. UCMR 5 values are from system sampling points after treatment; they are not a test of a household tap.</li>
          <li><strong>CKM:</strong> CDC PLACES publishes modeled adult prevalence, not individual diagnoses. Most current measures use 2023 BRFSS data. CKD was removed from later PLACES releases; 2021 is the latest ZIP-level year available.</li>
          <li><strong>Actions and score:</strong> Rules are deterministic. The EnviroHealth score is the weighted share of checklist points a user has marked complete. It does not estimate health, exposure, or treatment benefit. Checklist state is saved in this browser.</li>
        </ul>
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

      <section className="about-section">
        <h2>Action rules</h2>
        <h3>Indoor air</h3>
        <p>If the nearest 2025 PM₂.₅ monitor value is above 9.0 µg/m³, the app prioritizes a room-sized portable air cleaner. This single-year comparison is a screening signal, not a NAAQS attainment determination. It asks for a smoke CADR of at least two-thirds of room area, and recommends checking the HVAC manual before upgrading to MERV 13. If a nearby monitor is missing, it recommends checking current AQI during smoke events rather than treating missing data as clean air.</p>
        <h3>Drinking water</h3>
        <p>For public systems, the task list starts with confirming the provider and reviewing its Consumer Confidence Report. When UCMR 5 lists a PFAS detection, the filter task points to EPA guidance to verify the exact contaminant claim under NSF/ANSI 53 or 58. The app does not suggest buying a filter when it has no household tap test. For private wells, it uses EPA’s annual test list: total coliform bacteria, nitrate, total dissolved solids, and pH.</p>
        <h3>CKM estimates</h3>
        <p>CKM prevalence is shown as community context. It does not change a person’s medical plan or generate a diagnosis. The checklist remains focused on verifiable environmental steps and does not turn an area-level disease estimate into personal medical advice.</p>
      </section>

      <section className="about-section">
        <div className="about-warning"><strong>For information and planning only.</strong> EnviroVitals is not a medical device and does not provide medical advice, diagnosis, or treatment. Use your water provider, state-certified laboratory, EPA/AirNow alerts, and qualified clinicians for decisions about your home or health.</div>
        <h3>Data requests and local storage</h3>
        <p>When you look up a ZIP, the app profile route checks the CDC snapshot, queries the EPA service-area layer, and uses a ZIP-to-place lookup for postal ZIP coordinates and the area label. CDC CKM values are shown only when a matching ZCTA estimate exists; missing estimates are unavailable, not zero. Checklist checkboxes and the selected water-source option are stored in this browser’s local storage; there is no account or cross-device sync.</p>
      </section>
    </main>
  );
}

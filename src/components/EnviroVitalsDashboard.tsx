"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommunityMap } from "@/components/CommunityMap";
import type { ActionItem, LocationProfile, WaterMode } from "@/lib/profile";
import { buildActionPlan, calculateEnviroHealth, formatEstimate } from "@/lib/profile";

const SAMPLE_ZIP = "10013";
const STORAGE_KEY = "envirovitals.actions.v1";
const WATER_MODE_KEY = "envirovitals.water-source.v1";

function BrandMark() {
  return (
    <svg viewBox="0 0 34 34" aria-hidden="true" className="brand-mark">
      <rect x="1" y="1" width="32" height="32" rx="10" fill="currentColor" />
      <path d="M8 17.2h5.1l2.3-5.3 3.2 10 2.4-5h5" fill="none" stroke="#f5f7f2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="17.2" r="1.3" fill="#c8df85" />
      <circle cx="26" cy="16.9" r="1.3" fill="#c8df85" />
    </svg>
  );
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M10 4l6 6-6 6" /></svg>;
}

function SectionIcon({ kind }: { kind: "pin" | "air" | "water" | "health" | "tasks" | "pulse" | "heart" | "kidney" | "metabolic" | "check" | "alert" | "info" | "missing" }) {
  const paths = {
    heart: <><path d="M12 21 3.5 12.5a5.5 5.5 0 0 1 8-7.5l.5.5.5-.5a5.5 5.5 0 0 1 8 7.5Z" /><path d="M5 11h4l2-3 2 7 2-4h4" /></>,
    kidney: <><path d="M8 3C2 3 1 12 4 17c2 3 6 3 7 0 1-2-2-3-3-5s3-3 3-5-1-4-3-4Z" /><path d="M16 3c6 0 7 9 4 14-2 3-6 3-7 0-1-2 2-3 3-5s-3-3-3-5 1-4 3-4Z" /></>,
    metabolic: <><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" /><path d="m13 10-4 5h5l-3 5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m7.5 12 3 3 6-6" /></>,
    alert: <><path d="M10.3 4a2 2 0 0 1 3.4 0l8 14a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3Z" /><path d="M12 9v5m0 3v.1" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>,
    missing: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
    pin: <><path d="M16 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z" /><circle cx="16" cy="9" r="2.2" /></>,
    air: <><path d="M3 8h13a3 3 0 1 0-2.8-4" /><path d="M2 12h17a3 3 0 1 1-2.8 4" /><path d="M4 16h6" /></>,
    water: <><path d="M12 3s-6 7.1-6 11a6 6 0 0 0 12 0c0-3.9-6-11-6-11Z" /><path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2" /></>,
    health: <><path d="M3 12h4l2-5 4 10 2-5h6" /><path d="M21 4v4m-2-2h4" /></>,
    tasks: <><path d="m5 12 3.5 3.5L16 8" /><path d="M20 12v7H4V5h11" /></>,
    pulse: <><path d="M3 12h4l2-6 4 12 2-6h6" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="section-icon">{paths[kind]}</svg>;
}

function ActionRow({ action, checked, onToggle }: { action: ActionItem; checked: boolean; onToggle: () => void }) {
  return (
    <div className={`action-row ${checked ? "action-complete" : ""}`}>
      <button
        type="button"
        className="task-check"
        aria-pressed={checked}
        aria-label={`${checked ? "Mark incomplete" : "Complete"}: ${action.title}`}
        onClick={onToggle}
      >
        {checked && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.3 8.2 3.1 3.1 6.3-6.5" /></svg>}
      </button>
      <div className="action-copy">
        <div className="action-title-line">
          <span className="action-category">{action.category}</span>
          {action.tag && <span className={`task-tag ${action.tag === "Priority" ? "task-tag-priority" : ""}`}>{action.tag}</span>}
          <span className="action-points">+{action.points} pts</span>
        </div>
        <h3 className={checked ? "checked-title" : ""}>{action.title}</h3>
        <p>{action.detail}</p>
        {action.href && <a className="text-link" href={action.href} target="_blank" rel="noreferrer">{action.linkLabel || "Open source"}<ArrowIcon /></a>}
      </div>
    </div>
  );
}

function OverviewContent({ profile }: { profile: LocationProfile }) {
  const system = profile.waterSystems[0];
  const air = profile.air;
  const airTone = !air ? "neutral" : air.annualPM25 > 9 ? "attention" : "reference";
  const detections = system?.ucmr5?.detections;
  const waterTone = detections !== undefined && detections > 0 ? "attention" : system ? "water" : "neutral";
  return (
    <div className="report-cards">
      <article className={`report-card report-${airTone}`}>
        <div className="report-card-heading"><span className="report-category-icon"><SectionIcon kind="air" /></span><h3>Outdoor air</h3><span className="report-status"><SectionIcon kind={!air ? "missing" : air.annualPM25 > 9 ? "alert" : "check"} />{!air ? "No nearby data" : air.annualPM25 > 9 ? "Above reference" : "Within reference"}</span></div>
        <div className="report-value">{air ? <>{air.annualPM25.toFixed(1)}<small>µg/m³ PM₂.₅</small></> : <span className="report-value-unavailable">Monitor unavailable</span>}</div>
        {air && <div className="report-air-scale" aria-hidden="true"><span style={{ left: `${Math.min(98, air.annualPM25 / 18 * 100)}%` }} /><i /></div>}
        <p>{air ? `Annual ${air.year} · ${air.distanceMiles.toFixed(1)} mi away · reference 9.0 µg/m³` : "No complete EPA PM₂.₅ monitor within 50 miles."}</p>
        <p className="report-note">{air ? "Annual screening reference; not current AQI or an attainment decision." : "Missing data does not mean clean air."}</p>
      </article>
      <article className={`report-card report-${waterTone}`}>
        <div className="report-card-heading"><span className="report-category-icon"><SectionIcon kind="water" /></span><h3>Drinking water</h3><span className="report-status"><SectionIcon kind={waterTone === "attention" ? "alert" : system ? "info" : "missing"} />{waterTone === "attention" ? "Review results" : system ? "Confirm provider" : "Needs a match"}</span></div>
        <div className="report-provider">{system?.name ?? (profile.waterLookupAvailable ? "No system matched" : "Service map unavailable")}</div>
        {detections !== undefined ? <div className="report-water-count"><strong>{detections.toLocaleString()}</strong><span>results above reporting level<br />of {system!.ucmr5!.results.toLocaleString()} sample records</span></div> : <p>{system ? "No UCMR 5 results matched this system." : "Check a utility bill to identify your water provider."}</p>}
        <p className="report-note">System sampling · not a household tap test or a safety rating.</p>
      </article>
      <article className="report-card report-health">
        <div className="report-card-heading"><span className="report-category-icon"><SectionIcon kind="health" /></span><h3>Community CKM</h3><span className="report-status"><SectionIcon kind="info" />Area estimates</span></div>
        <div className="report-health-grid">
          {([
            ["heart", "Cardiac", "Coronary heart disease", profile.health.chd],
            ["kidney", "Kidney", "Chronic kidney disease", profile.health.kidneyDisease],
            ["metabolic", "Metabolic", "Diabetes", profile.health.diabetes],
          ] as const).map(([kind, label, condition, value]) => <div className={`report-health-metric report-domain-${kind}`} key={kind}>
            <SectionIcon kind={kind} /><span>{label}</span><strong>{value === null ? "—" : <>{value.toFixed(1)}<small>%</small></>}</strong><span className="report-condition">{condition}</span>
          </div>)}
        </div>
        <p className="report-note">Adult prevalence · {profile.healthSource.brfssYear} cardiac/metabolic, {profile.healthSource.kidneyBrfssYear} kidney · — unavailable</p>
      </article>
    </div>
  );
}

export function EnviroVitalsDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const profileRequest = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [zip, setZip] = useState(SAMPLE_ZIP);
  const [profile, setProfile] = useState<LocationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waterMode, setWaterMode] = useState<WaterMode>("unknown");
  const [savedChecks, setSavedChecks] = useState<Record<string, string[]>>({});
  const [hydrated, setHydrated] = useState(false);

  const loadProfile = useCallback(async (target: string, focus = false) => {
    profileRequest.current?.abort();
    const controller = new AbortController();
    profileRequest.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/profile?zip=${encodeURIComponent(target)}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load this ZIP code.");
      if (controller.signal.aborted) return;
      setProfile(data as LocationProfile);
      if (focus) {
        setFocusRequest(value => value + 1);
        panelRef.current?.scrollTo({ top: 0, behavior: "auto" });
      }
      setZip(target);
      let savedMode: WaterMode | null = null;
      try {
        const stored = window.localStorage.getItem(`${WATER_MODE_KEY}:${target}`);
        if (stored === "public" || stored === "private" || stored === "unknown") savedMode = stored;
      } catch {
        savedMode = null;
      }
      setWaterMode(savedMode ?? (data.waterSystems?.length ? "public" : "unknown"));
    } catch (issue) {
      if (controller.signal.aborted) return;
      setError(issue instanceof Error ? issue.message : "Unable to load this ZIP code.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let restoredChecks: Record<string, string[]> = {};
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (value) restoredChecks = JSON.parse(value) as Record<string, string[]>;
    } catch {
      restoredChecks = {};
    }
    const hydrationTimer = window.setTimeout(() => {
      if (!active) return;
      setSavedChecks(restoredChecks);
      setHydrated(true);
    }, 0);
    const profileTimer = window.setTimeout(() => {
      if (active) void loadProfile(SAMPLE_ZIP);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(hydrationTimer);
      window.clearTimeout(profileTimer);
      profileRequest.current?.abort();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedChecks)); } catch { /* Persistence is optional. */ }
  }, [savedChecks, hydrated]);

  const actions = useMemo(() => profile ? buildActionPlan(profile, waterMode) : [], [profile, waterMode]);
  const checkKey = profile ? `${profile.zip}:${waterMode}` : "";
  const checkedIds = useMemo(() => new Set(savedChecks[checkKey] ?? []), [savedChecks, checkKey]);
  const score = calculateEnviroHealth(actions, checkedIds);
  const totalPoints = actions.reduce((sum, action) => sum + action.points, 0);
  const completedPoints = actions.reduce((sum, action) => sum + (checkedIds.has(action.id) ? action.points : 0), 0);
  const completedCount = actions.filter((action) => checkedIds.has(action.id)).length;
  const locationName = profile ? [profile.city, profile.stateAbbr].filter(Boolean).join(", ") || `ZIP ${profile.zip}` : `ZIP ${zip}`;
  const nearestAir = profile?.air;
  const topSystem = profile?.waterSystems[0];
  const selectMapZip = useCallback((target: string) => {
    setSidebarOpen(true);
    void loadProfile(target, true);
  }, [loadProfile]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a five-digit ZIP code.");
      return;
    }
    (event.currentTarget.elements.namedItem("zip") as HTMLInputElement | null)?.blur();
    void loadProfile(zip, true);
  }

  function toggleAction(action: ActionItem) {
    if (!checkKey) return;
    setSavedChecks((current) => {
      const existing = new Set(current[checkKey] ?? []);
      if (existing.has(action.id)) existing.delete(action.id);
      else existing.add(action.id);
      return { ...current, [checkKey]: [...existing] };
    });
  }

  function changeWaterMode(mode: WaterMode) {
    if (!profile) return;
    setWaterMode(mode);
    try { window.localStorage.setItem(`${WATER_MODE_KEY}:${profile.zip}`, mode); } catch { /* Local persistence is optional. */ }
  }

  return (
    <div className="map-app-shell">
      <header className="site-header map-site-header">
        <Link href="/" className="brand-lockup" aria-label="EnviroVitals home">
          <BrandMark />
          <span>EnviroVitals</span>
          <i>PLACE · HEALTH · ACTION</i>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <span className="header-data-label"><span className="live-dot" /> PUBLIC DATA · 2025</span>
          <Link href="/about">Sources &amp; methods <ArrowIcon /></Link>
        </nav>
      </header>

      <main className="map-workspace">
        <CommunityMap profile={profile} focusRequest={focusRequest} onSelectZip={selectMapZip} />
        {!sidebarOpen && <button className="map-panel-toggle" type="button" onClick={() => setSidebarOpen(true)} aria-controls="community-panel" aria-expanded={false}><SectionIcon kind="pin" /> Explore a ZIP <ArrowIcon /></button>}

        <aside ref={panelRef} id="community-panel" hidden={!sidebarOpen} className="map-sidebar" aria-label="Community environmental dashboard">
          <div className="panel-toolbar"><span><SectionIcon kind="pin" /> ZIP report</span><button type="button" className="panel-close" aria-label="Close ZIP profile" onClick={() => setSidebarOpen(false)}>×</button></div>
          <div className="panel-heading">
            <div className="panel-brand-line"><BrandMark /><span>COMMUNITY ENVIRONMENTAL HEALTH</span></div>
            <h1>Your ZIP, at a glance.</h1>
            <p>Local conditions, community health, and practical steps in one view.</p>
          </div>

          <form className="zip-search map-search" onSubmit={submitSearch}>
            <label htmlFor="zip-search-input">Explore a ZIP code</label>
            <div className="search-control">
              <span className="search-icon"><SectionIcon kind="pin" /></span>
              <input
                id="zip-search-input"
                name="zip"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                autoComplete="postal-code"
                value={zip}
                onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="e.g. 10013"
                aria-describedby="zip-help"
              />
              <button type="submit" disabled={loading || zip.length !== 5}>
                {loading ? "Loading" : "Explore"}<ArrowIcon />
              </button>
            </div>
            <div id="zip-help" className="search-hint">Air and water map to the ZIP area. CKM estimates appear where CDC has a matching ZCTA.</div>
          </form>

          {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={() => { setZip(SAMPLE_ZIP); void loadProfile(SAMPLE_ZIP); }}>Load sample ZIP</button></div>}

          <div className="location-row" aria-live="polite">
            <div className="location-copy">
              <span className="eyebrow">CURRENT AREA</span>
              <h2>{loading && !profile ? "Loading ZIP profile" : locationName}</h2>
              <p>{profile ? `ZIP ${profile.zip}${profile.healthAvailable ? ` · ${profile.adultPopulation.toLocaleString()} estimated adults` : " · CDC estimate unavailable"}` : "ZIP 10013 · New York, NY"}</p>
            </div>
            <span className="area-status"><i /> {loading ? profile ? "UPDATING" : "CONNECTING" : profile ? "PROFILE READY" : "SEARCH TO BEGIN"}</span>
          </div>

          {profile ? (
            <div className="sidebar-content">
              <details className="panel-disclosure" open>
                <summary><span className="summary-icon"><SectionIcon kind="pulse" /></span><span>Community report card</span><span className="summary-chev" /></summary>
                <OverviewContent profile={profile} />
              </details>

              <details className="panel-disclosure" id="environmental-concerns" open>
                <summary><span className="summary-icon"><SectionIcon kind="air" /></span><span>Environmental Concerns</span><span className="summary-chev" /></summary>
                <div className="concern-list">
                  <details className="concern-item" id="concern-air" open>
                    <summary><span className={`concern-symbol ${nearestAir && nearestAir.annualPM25 > 9 ? "concern-symbol-attention" : "concern-symbol-air"}`}><SectionIcon kind="air" /></span><span className="concern-title">Outdoor air · PM₂.₅</span><span className="concern-value">{nearestAir ? `${nearestAir.annualPM25.toFixed(1)} µg/m³` : "No monitor"}</span><span className="summary-chev" /></summary>
                    <div className="concern-detail">
                      {nearestAir ? <><p><strong>{nearestAir.monitorName}</strong> is the nearest complete 2025 EPA monitor, {nearestAir.distanceMiles.toFixed(1)} miles from this ZIP area.</p><p>{nearestAir.annualPM25 > 9 ? "Above" : "At or below"} EPA’s 9.0 µg/m³ annual reference. A single-year reading is not an attainment decision.</p></> : <p>No complete EPA PM₂.₅ monitor was found within 50 miles. The nationwide map combines ZIP health estimates with state air context.</p>}
                      <p className="detail-meta">{profile.airMonitors.length} complete EPA monitor{profile.airMonitors.length === 1 ? "" : "s"} within 50 miles · 2025 annual data</p>
                    </div>
                  </details>
                  <details className="concern-item" id="concern-water">
                    <summary><span className="concern-symbol concern-symbol-water"><SectionIcon kind="water" /></span><span className="concern-title">Drinking water</span><span className="concern-value">{topSystem ? "System match" : "Needs confirmation"}</span><span className="summary-chev" /></summary>
                    <div className="concern-detail">
                      {topSystem ? <><p><strong>{topSystem.name}</strong> overlaps the mapped ZIP area. Confirm it serves your address with a utility bill or provider.</p><p>{topSystem.ucmr5 ? `${topSystem.ucmr5.detections} above-reporting-level result${topSystem.ucmr5.detections === 1 ? "" : "s"} in ${topSystem.ucmr5.results.toLocaleString()} EPA UCMR 5 samples.` : "No UCMR 5 record was matched; missing records are not non-detections."}</p></> : <p>{profile.waterLookupAvailable ? "The EPA map did not identify a provider at the ZIP-area coordinates." : "The EPA service-area map is temporarily unavailable."} Check your bill or ask the property owner which system serves the address.</p>}
                      <p className="detail-meta">System-area data does not test water at your tap.</p>
                    </div>
                  </details>
                  <details className="concern-item" id="concern-health">
                    <summary><span className="concern-symbol concern-symbol-health"><SectionIcon kind="health" /></span><span className="concern-title">Community CKM</span><span className="concern-value">{profile.healthAvailable ? "CDC estimate" : "Unavailable"}</span><span className="summary-chev" /></summary>
                    <div className="concern-detail">
                      {profile.healthAvailable ? <><p>Adult prevalence estimates for {profile.adultPopulation.toLocaleString()} people in this Census ZCTA.</p><p>CHD {formatEstimate(profile.health.chd)} · CKD {formatEstimate(profile.health.kidneyDisease)} · Diabetes {formatEstimate(profile.health.diabetes)} per 100 adults.</p></> : <p>CDC PLACES has no matching populated ZCTA estimate for this postal ZIP. The dash means unavailable, not zero.</p>}
                      <p className="detail-meta">Community context only · not a personal diagnosis.</p>
                    </div>
                  </details>
                </div>
              </details>

              <details className="panel-disclosure" id="what-were-tracking">
                <summary><span className="summary-icon"><SectionIcon kind="pulse" /></span><span>What We’re Tracking</span><span className="summary-chev" /></summary>
                <div className="tracking-content">
                  <p>Official readings that help describe the area around {profile.city || `ZIP ${profile.zip}`}.</p>
                  <div className="tracking-row"><span>EPA outdoor PM₂.₅</span><strong>2025 annual</strong></div>
                  <div className="tracking-row"><span>Public water samples</span><strong>EPA UCMR 5 · 2023–25</strong></div>
                  <div className="tracking-row"><span>Cardio/metabolic estimates</span><strong>CDC PLACES · {profile.healthSource.brfssYear}</strong></div>
                  <div className="tracking-row"><span>Kidney estimate</span><strong>CDC PLACES · {profile.healthSource.kidneyBrfssYear}</strong></div>
                  <Link className="detail-link" href="/about">Read sources &amp; methods <ArrowIcon /></Link>
                </div>
              </details>

              <details className="panel-disclosure action-disclosure" id="what-you-can-do">
                <summary><span className="summary-icon"><SectionIcon kind="tasks" /></span><span>What You Can Do</span><span className="summary-count">{completedCount}/{actions.length}</span><span className="summary-chev" /></summary>
                <div className="action-panel-content">
                  <div className="mini-score">
                    <div><span className="eyebrow">ENVIROHEALTH ACTION SCORE</span><strong>{score}<small>/100</small></strong></div>
                    <div className="mini-score-track"><span style={{ width: `${score}%` }} /></div>
                    <p>{completedPoints} of {totalPoints} task points completed · checklist progress only</p>
                  </div>
                  <div className="water-source-control">
                    <span>Water source at home</span>
                    <div className="segmented-control" role="group" aria-label="Water source at home">
                      {(["public", "private", "unknown"] as WaterMode[]).map((mode) => <button key={mode} type="button" aria-pressed={waterMode === mode} onClick={() => changeWaterMode(mode)}>{mode === "public" ? "Public" : mode === "private" ? "Well" : "Unsure"}</button>)}
                    </div>
                  </div>
                  <div className="action-list">{actions.map((action) => <ActionRow key={action.id} action={action} checked={checkedIds.has(action.id)} onToggle={() => toggleAction(action)} />)}</div>
                  <div className="action-footnote">Your checked items and water source stay saved in this browser for ZIP {profile.zip}.</div>
                </div>
              </details>
            </div>
          ) : (
            <div className="panel-placeholder">{loading ? "Gathering EPA and CDC data for this ZIP…" : "Search a five-digit ZIP to load its public data."}</div>
          )}
          <div className="panel-footer"><span>Public data · ZIP-level context</span><Link href="/about">Sources &amp; methods <ArrowIcon /></Link></div>
        </aside>

      </main>
    </div>
  );
}

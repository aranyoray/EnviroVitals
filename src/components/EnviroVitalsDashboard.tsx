"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommunityMap } from "@/components/CommunityMap";
import type { ActionItem, CkmCondition, LiveConditions, LocationProfile, WaterMode } from "@/lib/profile";
import { ACTION_CATEGORIES, CKM_CONDITIONS, HEALTH_MEASURES, aqiBand, buildActionPlan, calculateEnviroHealth, ckmStageContext, formatEstimate, formatRank, heatBand, pollutantLabel } from "@/lib/profile";

const SAMPLE_ZIP = "10013";
const STORAGE_KEY = "envirovitals.actions.v1";
const WATER_MODE_KEY = "envirovitals.water-source.v1";
const CKM_KEY = "envirovitals.ckm-conditions.v1";
const LIVE_REFRESH_MS = 10 * 60 * 1000;
const CKM_IDS = new Set<string>(CKM_CONDITIONS.map((condition) => condition.id));

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

type IconKind = "pin" | "air" | "water" | "health" | "tasks" | "pulse" | "heart" | "kidney" | "metabolic" | "check" | "alert" | "info" | "missing" | "now" | "heat" | "paw" | "person";

function SectionIcon({ kind }: { kind: IconKind }) {
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
    now: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    heat: <><path d="M10 4a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0Z" /><path d="M12 9v7" /></>,
    paw: <><circle cx="7" cy="9" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="17" cy="9" r="2" /><path d="M12 11c-3 0-6 3-6 6a2.5 2.5 0 0 0 3 2.5c1.5-.4 2-1 3-1s1.5.6 3 1a2.5 2.5 0 0 0 3-2.5c0-3-3-6-6-6Z" /></>,
    person: <><circle cx="12" cy="7" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="section-icon">{paths[kind]}</svg>;
}

function tagClass(tag: string): string {
  if (tag === "Priority") return "task-tag task-tag-priority";
  if (tag === "Today" || tag === "Tomorrow") return "task-tag task-tag-today";
  return "task-tag";
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
          {action.tag && <span className={tagClass(action.tag)}>{action.tag}</span>}
          <span className="action-points">+{action.points} pts</span>
        </div>
        <h3 className={checked ? "checked-title" : ""}>{action.title}</h3>
        <p>{action.detail}</p>
        {action.ckm && <p className="action-ckm"><span>Why it matters for CKM</span> {action.ckm}</p>}
        {action.href && <a className="text-link" href={action.href} target="_blank" rel="noreferrer">{action.linkLabel || "Open source"}<ArrowIcon /></a>}
      </div>
    </div>
  );
}

function LiveCard({ live }: { live: LiveConditions | null | undefined }) {
  const loading = live === undefined;
  const air = live?.air ?? null;
  const weather = live?.weather ?? null;
  const alerts = live?.alerts ?? null;
  const band = air ? aqiBand(air.aqi) : null;
  const peak = weather ? Math.max(weather.feelsLikeF, weather.todayMaxFeelsLikeF ?? -Infinity) : null;
  const heat = peak !== null ? heatBand(peak) : null;
  const unavailable = !loading && !air && !weather && !alerts;
  const tone = loading || unavailable ? "missing" : band ? `aqi-${band.tone}` : "neutral";
  const status = loading ? "Updating" : unavailable ? "Live feed unavailable" : band ? band.name : alerts?.length ? "Alerts active" : "Weather only";
  const statusIcon: IconKind = loading || unavailable ? "missing" : band && band.tone !== "good" && band.tone !== "moderate" ? "alert" : alerts?.length ? "alert" : "check";
  const updated = live?.fetchedAt ? new Date(live.fetchedAt) : null;
  return (
    <article className={`report-card report-${tone}`} aria-busy={loading}>
      <div className="report-card-heading"><span className="report-category-icon"><SectionIcon kind="now" /></span><h3>Right now</h3><span className="report-status"><SectionIcon kind={statusIcon} />{status}</span></div>
      <div className="live-grid">
        <div className={`live-metric ${air ? "" : "live-metric-missing"}`}>
          <span className="live-label">Air quality index</span>
          {air && band ? (
            <>
              <strong><i className={`aqi-swatch aqi-${band.tone}`} aria-hidden="true" />{air.aqi}</strong>
              <span className="live-sub">{band.name} · {pollutantLabel(air.pollutant)}</span>
              <span className="live-meta">{air.source === "airnow" ? `${air.areaName}${air.state ? `, ${air.state}` : ""} · ${air.distanceMiles} mi` : "Model estimate · no AirNow area within 60 mi"}{air.observedAt ? ` · ${air.observedAt}` : ""}</span>
            </>
          ) : (
            <>
              <strong>—</strong>
              <span className="live-sub">{loading ? "Loading AirNow" : "No reading"}</span>
              <span className="live-meta">{loading ? "Hourly observation" : "Unknown is not clean"}</span>
            </>
          )}
        </div>
        <div className={`live-metric ${weather ? "" : "live-metric-missing"}`}>
          <span className="live-label">Feels like</span>
          {weather ? (
            <>
              <strong>{Math.round(weather.feelsLikeF)}<small>°F</small></strong>
              <span className="live-sub">{heat ? `${heat.name} · peak ${Math.round(peak!)}°F` : peak !== null && peak < 80 ? `Peak ${Math.round(peak)}°F · no heat stress` : "No heat stress"}</span>
              <span className="live-meta">Air {Math.round(weather.tempF)}°F{weather.humidity !== null ? ` · ${weather.humidity}% humidity` : ""}{weather.timezone ? ` · ${weather.timezone}` : ""}</span>
            </>
          ) : (
            <>
              <strong>—</strong>
              <span className="live-sub">{loading ? "Loading weather" : "No reading"}</span>
              <span className="live-meta">Open-Meteo</span>
            </>
          )}
        </div>
      </div>
      <div className={`alert-chips ${alerts === null ? "alert-chips-missing" : ""}`}>
        {alerts === null ? <span className="alert-chip alert-chip-missing">{loading ? "Checking NWS alerts" : "NWS alerts unavailable"}</span>
          : alerts.length === 0 ? <span className="alert-chip alert-chip-none"><SectionIcon kind="check" /> No active NWS alerts</span>
          : alerts.slice(0, 4).map((alert) => <a key={alert.id} className={`alert-chip ${alert.severity === "Extreme" || alert.severity === "Severe" ? "alert-chip-severe" : ""}`} href={alert.url ?? "https://www.weather.gov/"} target="_blank" rel="noreferrer"><SectionIcon kind="alert" />{alert.event}{alert.expires ? ` · until ${alert.expires.replace(" local time", "")}` : ""}</a>)}
      </div>
      {air?.actionDay && <p className="live-action-day"><SectionIcon kind="alert" /> Air Quality Action Day declared{air.agency ? ` by ${air.agency}` : ""}.</p>}
      <p className="report-note">AirNow hourly observation · NWS alerts · Open-Meteo feels-like{updated ? ` · updated ${updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""} · refreshes every 10 min</p>
    </article>
  );
}

function OverviewContent({ profile, live }: { profile: LocationProfile; live: LiveConditions | null | undefined }) {
  const system = profile.waterSystems[0];
  const air = profile.air;
  const airTone = !air ? "missing" : air.annualPM25 > 9 ? "attention" : "reference";
  const detections = system?.ucmr5?.detections;
  const waterTone = detections !== undefined && detections > 0 ? "attention" : system ? "water" : "missing";
  const healthTone = profile.healthAvailable ? "health" : "missing";
  const domains = [
    { kind: "heart" as const, label: "Cardiac", condition: "Coronary heart disease", value: profile.health.chd, rank: profile.healthRank.chd },
    { kind: "kidney" as const, label: "Kidney", condition: "Chronic kidney disease", value: profile.health.kidneyDisease, rank: profile.healthRank.kidneyDisease },
    { kind: "metabolic" as const, label: "Metabolic", condition: "Diabetes", value: profile.health.diabetes, rank: profile.healthRank.diabetes },
  ];
  const extras = HEALTH_MEASURES.filter((measure) => !["chd", "kidneyDisease", "diabetes"].includes(measure.key));
  return (
    <div className="report-cards">
      <LiveCard live={live} />
      <article className={`report-card report-${airTone}`}>
        <div className="report-card-heading"><span className="report-category-icon"><SectionIcon kind="air" /></span><h3>Outdoor air · annual</h3><span className="report-status"><SectionIcon kind={!air ? "missing" : air.annualPM25 > 9 ? "alert" : "check"} />{!air ? "No nearby monitor" : air.annualPM25 > 9 ? "Above reference" : "Within reference"}</span></div>
        <div className="report-value">{air ? <>{air.annualPM25.toFixed(1)}<small>µg/m³ PM₂.₅</small></> : <span className="report-value-unavailable">No data within 50 miles</span>}</div>
        {air && <div className="report-air-scale" aria-hidden="true"><span style={{ left: `${Math.min(98, air.annualPM25 / 18 * 100)}%` }} /><i /></div>}
        <p>{air ? `${air.monitorName} · ${air.year} annual · ${air.distanceMiles.toFixed(1)} mi away · reference 9.0 µg/m³` : "No complete EPA PM₂.₅ monitor within 50 miles of this ZIP area."}</p>
        <p className="report-note">{air ? "Long-term exposure signal for heart and kidney risk; not current AQI or an attainment decision." : "Gray means unknown, not clean. Use the live reading above and the fire and smoke map."}</p>
      </article>
      <article className={`report-card report-${waterTone}`}>
        <div className="report-card-heading"><span className="report-category-icon"><SectionIcon kind="water" /></span><h3>Drinking water</h3><span className="report-status"><SectionIcon kind={waterTone === "attention" ? "alert" : system ? "info" : "missing"} />{waterTone === "attention" ? "Review results" : system ? "Confirm provider" : profile.waterLookupAvailable ? "No system matched" : "Lookup unavailable"}</span></div>
        <div className="report-provider">{system?.name ?? (profile.waterLookupAvailable ? "No public system at the ZIP centroid" : "EPA service-area map unavailable")}</div>
        {detections !== undefined ? <div className="report-water-count"><strong>{detections.toLocaleString()}</strong><span>results above reporting level<br />of {system!.ucmr5!.results.toLocaleString()} UCMR 5 sample records</span></div> : <div className={`report-water-count ${system ? "report-water-count-missing" : ""}`}><strong>—</strong><span>{system ? "No UCMR 5 record matched this system; not a non-detection." : "Check a utility bill to identify your water provider."}</span></div>}
        <p className="report-note">System sampling after treatment · not a household tap test or a safety rating.</p>
      </article>
      <article className={`report-card report-${healthTone}`}>
        <div className="report-card-heading"><span className="report-category-icon"><SectionIcon kind="health" /></span><h3>Community CKM</h3><span className="report-status"><SectionIcon kind={profile.healthAvailable ? "info" : "missing"} />{profile.healthAvailable ? "CDC area estimates" : "No CDC estimate"}</span></div>
        <div className="report-health-grid">
          {domains.map(({ kind, label, condition, value, rank }) => <div className={`report-health-metric report-domain-${kind} ${value === null ? "metric-missing" : ""}`} key={kind}>
            <SectionIcon kind={kind} /><span>{label}</span><strong>{value === null ? "—" : <>{value.toFixed(1)}<small>%</small></>}</strong><span className="report-condition">{condition}</span><span className="report-rank">{value === null ? "No estimate" : formatRank(rank)}</span>
          </div>)}
        </div>
        <div className="report-health-extra">
          {extras.map((measure) => {
            const value = profile.health[measure.key];
            return <div className={`report-extra ${value === null ? "report-extra-missing" : ""}`} key={measure.key}><span>{measure.label}</span><strong>{formatEstimate(value)}</strong></div>;
          })}
        </div>
        <p className="report-note">{profile.healthAvailable ? `Adult prevalence · ${profile.healthSource.brfssYear} cardiac/metabolic, ${profile.healthSource.kidneyBrfssYear} kidney · rank among US ZCTAs` : "CDC PLACES has no populated ZCTA matching this postal ZIP. Gray means unavailable, never zero."}</p>
      </article>
      <p className="report-legend"><i className="legend-gray" aria-hidden="true" /> Gray means no data for this ZIP area—never zero and never clean.</p>
    </div>
  );
}

export function EnviroVitalsDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const profileRequest = useRef<AbortController | null>(null);
  const liveRequest = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [zip, setZip] = useState(SAMPLE_ZIP);
  const [profile, setProfile] = useState<LocationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waterMode, setWaterMode] = useState<WaterMode>("unknown");
  const [savedChecks, setSavedChecks] = useState<Record<string, string[]>>({});
  const [conditions, setConditions] = useState<Set<CkmCondition>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [liveState, setLiveState] = useState<{ key: string; data: LiveConditions | null } | null>(null);

  const liveKey = profile ? `${profile.latitude.toFixed(2)},${profile.longitude.toFixed(2)}` : "";
  const live: LiveConditions | null | undefined = liveState && liveState.key === liveKey ? liveState.data : undefined;

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

  const loadLive = useCallback(async (key: string, latitude: number, longitude: number) => {
    liveRequest.current?.abort();
    const controller = new AbortController();
    liveRequest.current = controller;
    try {
      const response = await fetch(`/api/live?lat=${latitude.toFixed(2)}&lon=${longitude.toFixed(2)}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Live conditions unavailable.");
      const data = await response.json() as LiveConditions;
      if (controller.signal.aborted) return;
      setLiveState({ key, data });
    } catch {
      if (!controller.signal.aborted) setLiveState({ key, data: null });
    }
  }, []);

  useEffect(() => {
    let active = true;
    let restoredChecks: Record<string, string[]> = {};
    let restoredConditions: CkmCondition[] = [];
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (value) restoredChecks = JSON.parse(value) as Record<string, string[]>;
      const stored = window.localStorage.getItem(CKM_KEY);
      if (stored) restoredConditions = (JSON.parse(stored) as string[]).filter((id): id is CkmCondition => CKM_IDS.has(id));
    } catch {
      restoredChecks = {};
      restoredConditions = [];
    }
    const hydrationTimer = window.setTimeout(() => {
      if (!active) return;
      setSavedChecks(restoredChecks);
      setConditions(new Set(restoredConditions));
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
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedChecks));
      window.localStorage.setItem(CKM_KEY, JSON.stringify([...conditions]));
    } catch { /* Persistence is optional. */ }
  }, [savedChecks, conditions, hydrated]);

  useEffect(() => {
    if (!profile) return;
    const { latitude, longitude } = profile;
    const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const start = window.setTimeout(() => { void loadLive(key, latitude, longitude); }, 0);
    const timer = window.setInterval(() => { void loadLive(key, latitude, longitude); }, LIVE_REFRESH_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
      liveRequest.current?.abort();
    };
  }, [profile, loadLive]);

  const actions = useMemo(() => profile ? buildActionPlan(profile, waterMode, live, conditions) : [], [profile, waterMode, live, conditions]);
  const checkKey = profile ? `${profile.zip}:${waterMode}` : "";
  const checkedIds = useMemo(() => new Set(savedChecks[checkKey] ?? []), [savedChecks, checkKey]);
  const score = calculateEnviroHealth(actions, checkedIds);
  const totalPoints = actions.reduce((sum, action) => sum + action.points, 0);
  const completedPoints = actions.reduce((sum, action) => sum + (checkedIds.has(action.id) ? action.points : 0), 0);
  const completedCount = actions.filter((action) => checkedIds.has(action.id)).length;
  const locationName = profile ? [profile.city, profile.stateAbbr].filter(Boolean).join(", ") || `ZIP ${profile.zip}` : `ZIP ${zip}`;
  const nearestAir = profile?.air;
  const topSystem = profile?.waterSystems[0];
  const stage = ckmStageContext(conditions);
  const liveAir = live?.air ?? null;
  const liveBand = liveAir ? aqiBand(liveAir.aqi) : null;
  const weather = live?.weather ?? null;
  const peakFeelsLike = weather ? Math.max(weather.feelsLikeF, weather.todayMaxFeelsLikeF ?? -Infinity) : null;
  const heat = peakFeelsLike !== null ? heatBand(peakFeelsLike) : null;
  const alerts = live?.alerts ?? null;
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

  function toggleCondition(condition: CkmCondition) {
    setConditions((current) => {
      const next = new Set(current);
      if (next.has(condition)) next.delete(condition);
      else next.add(condition);
      return next;
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
          <i>ONE HEALTH · CKM</i>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <span className="header-data-label"><span className="live-dot" /> LIVE + PUBLIC DATA</span>
          <Link href="/about">Sources &amp; methods <ArrowIcon /></Link>
        </nav>
      </header>

      <main className="map-workspace">
        <CommunityMap profile={profile} focusRequest={focusRequest} onSelectZip={selectMapZip} />
        {!sidebarOpen && <button className="map-panel-toggle" type="button" onClick={() => setSidebarOpen(true)} aria-controls="community-panel" aria-expanded={false}><SectionIcon kind="pin" /> Explore a ZIP <ArrowIcon /></button>}

        <aside ref={panelRef} id="community-panel" hidden={!sidebarOpen} className="map-sidebar" aria-label="Community CKM and environmental dashboard">
          <div className="panel-toolbar"><span><SectionIcon kind="pin" /> ZIP report</span><button type="button" className="panel-close" aria-label="Close ZIP profile" onClick={() => setSidebarOpen(false)}>×</button></div>
          <div className="panel-heading">
            <div className="panel-brand-line"><BrandMark /><span>ONE HEALTH · PEOPLE · ANIMALS · ENVIRONMENT</span></div>
            <h1>Your ZIP, your CKM health.</h1>
            <p>Live air, heat and water conditions, community heart–kidney–metabolic estimates, and the steps that fit you today.</p>
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
            <div id="zip-help" className="search-hint">Air, heat and water map to the ZIP area. CKM estimates appear where CDC has a matching ZCTA; anything missing shows in gray.</div>
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
                <OverviewContent profile={profile} live={live} />
              </details>

              <details className="panel-disclosure" id="environmental-concerns" open>
                <summary><span className="summary-icon"><SectionIcon kind="air" /></span><span>Shared environment</span><span className="summary-chev" /></summary>
                <div className="concern-list">
                  <details className="concern-item" id="concern-air" open>
                    <summary><span className={`concern-symbol ${liveAir ? (liveBand && liveBand.tone !== "good" && liveBand.tone !== "moderate" ? "concern-symbol-attention" : "concern-symbol-air") : nearestAir ? (nearestAir.annualPM25 > 9 ? "concern-symbol-attention" : "concern-symbol-air") : "concern-symbol-missing"}`}><SectionIcon kind="air" /></span><span className="concern-title">Outdoor air</span><span className={`concern-value ${!liveAir && !nearestAir ? "concern-value-missing" : ""}`}>{liveAir && liveBand ? `AQI ${liveAir.aqi} · ${liveBand.name}` : live === undefined ? "Loading live AQI" : nearestAir ? `${nearestAir.annualPM25.toFixed(1)} µg/m³ annual` : "No data"}</span><span className="summary-chev" /></summary>
                    <div className="concern-detail">
                      {liveAir && liveBand ? <p><strong>AQI {liveAir.aqi} ({liveBand.name})</strong> for {pollutantLabel(liveAir.pollutant)} {liveAir.source === "airnow" ? <>at AirNow&apos;s {liveAir.areaName} reporting area, {liveAir.distanceMiles} miles away{liveAir.observedAt ? `, ${liveAir.observedAt}` : ""}</> : "from the Open-Meteo model, because no AirNow reporting area is within 60 miles"}.{liveAir.others.length ? ` Other pollutants: ${liveAir.others.map((other) => `${pollutantLabel(other.pollutant)} ${other.aqi}`).join(", ")}.` : ""}</p> : <p>{live === undefined ? "Fetching the latest hourly AirNow observation." : "No live AirNow reading or model estimate is available for this ZIP area; current air quality is unknown, not clean."}</p>}
                      {nearestAir ? <p><strong>{nearestAir.monitorName}</strong> is the nearest complete 2025 EPA monitor, {nearestAir.distanceMiles.toFixed(1)} miles away, averaging {nearestAir.annualPM25.toFixed(1)} µg/m³—{nearestAir.annualPM25 > 9 ? "above" : "at or below"} EPA&apos;s 9.0 µg/m³ annual reference. A single-year reading is not an attainment decision.</p> : <p>No complete EPA PM₂.₅ monitor was found within 50 miles, so the annual exposure signal is missing (shown in gray).</p>}
                      <p className="detail-meta">{profile.airMonitors.length} complete EPA monitor{profile.airMonitors.length === 1 ? "" : "s"} within 50 miles · 2025 annual data · live AQI refreshes every 10 minutes</p>
                    </div>
                  </details>
                  <details className="concern-item" id="concern-heat">
                    <summary><span className={`concern-symbol ${weather ? (heat && heat.level >= 2 ? "concern-symbol-attention" : "concern-symbol-heat") : "concern-symbol-missing"}`}><SectionIcon kind="heat" /></span><span className="concern-title">Heat, cold &amp; alerts</span><span className={`concern-value ${weather ? "" : "concern-value-missing"}`}>{weather ? `${Math.round(weather.feelsLikeF)}°F feels like${heat ? ` · ${heat.name}` : ""}` : live === undefined ? "Loading weather" : "No data"}</span><span className="summary-chev" /></summary>
                    <div className="concern-detail">
                      {weather ? <p>Feels like <strong>{Math.round(weather.feelsLikeF)}°F</strong> now (air {Math.round(weather.tempF)}°F{weather.humidity !== null ? `, ${weather.humidity}% humidity` : ""}); today&apos;s feels-like range {weather.todayMinFeelsLikeF !== null ? `${Math.round(weather.todayMinFeelsLikeF)}–` : ""}{weather.todayMaxFeelsLikeF !== null ? `${Math.round(weather.todayMaxFeelsLikeF)}°F` : "unavailable"}{weather.tomorrowMaxFeelsLikeF !== null ? `, tomorrow up to ${Math.round(weather.tomorrowMaxFeelsLikeF)}°F` : ""}. {heat ? `NWS ${heat.name.toLowerCase()} range: ${heat.effect}.` : "Below the NWS caution range for heat stress."}</p> : <p>{live === undefined ? "Fetching the Open-Meteo forecast." : "Weather conditions are unavailable right now."}</p>}
                      {alerts === null ? <p>{live === undefined ? "Checking NWS alerts." : "NWS alerts could not be checked."}</p> : alerts.length ? <p><strong>{alerts.length} active NWS alert{alerts.length === 1 ? "" : "s"}:</strong> {alerts.map((alert) => `${alert.event} (${alert.severity})`).join(", ")}.</p> : <p>No active NWS watches, warnings or advisories for this point.</p>}
                      <p className="detail-meta">Heat and cold both raise blood pressure and cardiac strain; people with CKM conditions are the priority group for every alert.</p>
                    </div>
                  </details>
                  <details className="concern-item" id="concern-water">
                    <summary><span className={`concern-symbol ${topSystem ? "concern-symbol-water" : "concern-symbol-missing"}`}><SectionIcon kind="water" /></span><span className="concern-title">Drinking water</span><span className={`concern-value ${topSystem ? "" : "concern-value-missing"}`}>{topSystem ? "System match" : "No match"}</span><span className="summary-chev" /></summary>
                    <div className="concern-detail">
                      {topSystem ? <><p><strong>{topSystem.name}</strong> overlaps the mapped ZIP area. Confirm it serves your address with a utility bill or provider.</p><p>{topSystem.ucmr5 ? `${topSystem.ucmr5.detections} above-reporting-level result${topSystem.ucmr5.detections === 1 ? "" : "s"} in ${topSystem.ucmr5.results.toLocaleString()} EPA UCMR 5 samples${topSystem.ucmr5.positive.length ? ` (${topSystem.ucmr5.positive.map((entry) => entry.name).slice(0, 5).join(", ")}${topSystem.ucmr5.positive.length > 5 ? ", …" : ""})` : ""}.` : "No UCMR 5 record was matched; missing records are not non-detections."}</p></> : <p>{profile.waterLookupAvailable ? "The EPA map did not identify a provider at the ZIP-area coordinates." : "The EPA service-area map is temporarily unavailable."} Check your bill or ask the property owner which system serves the address.</p>}
                      <p className="detail-meta">System-area data does not test water at your tap. PFAS, lead, nitrate and arsenic all have heart, kidney or metabolic effects.</p>
                    </div>
                  </details>
                  <details className="concern-item" id="concern-health">
                    <summary><span className={`concern-symbol ${profile.healthAvailable ? "concern-symbol-health" : "concern-symbol-missing"}`}><SectionIcon kind="health" /></span><span className="concern-title">Community CKM</span><span className={`concern-value ${profile.healthAvailable ? "" : "concern-value-missing"}`}>{profile.healthAvailable ? "CDC estimate" : "No data"}</span><span className="summary-chev" /></summary>
                    <div className="concern-detail">
                      {profile.healthAvailable ? <><p>Adult prevalence estimates for {profile.adultPopulation.toLocaleString()} people in this Census ZCTA, ranked against all US ZCTAs.</p><p>{HEALTH_MEASURES.map((measure) => `${measure.label} ${formatEstimate(profile.health[measure.key])}${profile.healthRank[measure.key] !== null ? ` (${Math.round(profile.healthRank[measure.key]!)}th pct)` : ""}`).join(" · ")}.</p></> : <p>CDC PLACES has no matching populated ZCTA estimate for this postal ZIP. The gray dash means unavailable, not zero.</p>}
                      <p className="detail-meta">Community context only · not a personal diagnosis. Your own CKM stage comes from your numbers, not your ZIP.</p>
                    </div>
                  </details>
                </div>
              </details>

              <details className="panel-disclosure" id="what-were-tracking">
                <summary><span className="summary-icon"><SectionIcon kind="pulse" /></span><span>What We&apos;re Tracking</span><span className="summary-chev" /></summary>
                <div className="tracking-content">
                  <p>Live and official readings that describe the shared environment around {profile.city || `ZIP ${profile.zip}`}.</p>
                  <div className="tracking-row"><span>Current AQI</span><strong>EPA AirNow · hourly</strong></div>
                  <div className="tracking-row"><span>Weather alerts</span><strong>NWS · live</strong></div>
                  <div className="tracking-row"><span>Feels-like temperature</span><strong>Open-Meteo · 15-min</strong></div>
                  <div className="tracking-row"><span>Annual outdoor PM₂.₅</span><strong>EPA AirData · 2025</strong></div>
                  <div className="tracking-row"><span>Public water samples</span><strong>EPA UCMR 5 · 2023–25</strong></div>
                  <div className="tracking-row"><span>Cardiac/metabolic estimates</span><strong>CDC PLACES · {profile.healthSource.brfssYear}</strong></div>
                  <div className="tracking-row"><span>Kidney estimate</span><strong>CDC PLACES · {profile.healthSource.kidneyBrfssYear}</strong></div>
                  <Link className="detail-link" href="/about">Read sources &amp; methods <ArrowIcon /></Link>
                </div>
              </details>

              <details className="panel-disclosure action-disclosure" id="what-you-can-do" open>
                <summary><span className="summary-icon"><SectionIcon kind="tasks" /></span><span>What You Can Do</span><span className="summary-count">{completedCount}/{actions.length}</span><span className="summary-chev" /></summary>
                <div className="action-panel-content">
                  <div className="mini-score">
                    <div><span className="eyebrow">ENVIROHEALTH ACTION SCORE</span><strong>{score}<small>/100</small></strong></div>
                    <div className="mini-score-track"><span style={{ width: `${score}%` }} /></div>
                    <p>{completedPoints} of {totalPoints} task points completed · checklist progress only, not a risk score</p>
                  </div>
                  <div className="ckm-profile">
                    <div className="ckm-profile-head"><span className="summary-icon"><SectionIcon kind="person" /></span><div><span>About you (optional)</span><p>Pick what applies so the steps match your CKM stage. Saved only in this browser.</p></div></div>
                    <div className="ckm-chips" role="group" aria-label="Your CKM conditions">
                      {CKM_CONDITIONS.map((condition) => <button key={condition.id} type="button" className="ckm-chip" aria-pressed={conditions.has(condition.id)} title={condition.hint} onClick={() => toggleCondition(condition.id)}>{condition.label}</button>)}
                    </div>
                    <p className="ckm-stage"><strong>AHA CKM context: {stage.stage}</strong> · {stage.summary}. {stage.detail}</p>
                  </div>
                  <div className="water-source-control">
                    <span>Water source at home</span>
                    <div className="segmented-control" role="group" aria-label="Water source at home">
                      {(["public", "private", "unknown"] as WaterMode[]).map((mode) => <button key={mode} type="button" aria-pressed={waterMode === mode} onClick={() => changeWaterMode(mode)}>{mode === "public" ? "Public" : mode === "private" ? "Well" : "Unsure"}</button>)}
                    </div>
                  </div>
                  <div className="action-list">
                    {ACTION_CATEGORIES.map((group) => {
                      const items = actions.filter((action) => action.category === group.id);
                      if (!items.length && !(group.id === "Now" && live === undefined)) return null;
                      const done = items.filter((action) => checkedIds.has(action.id)).length;
                      return (
                        <section className="action-group" key={group.id} aria-label={group.title}>
                          <div className="action-group-head"><div><h4>{group.title}</h4><p>{group.note}</p></div><span>{done}/{items.length}</span></div>
                          {items.length ? items.map((action) => <ActionRow key={action.id} action={action} checked={checkedIds.has(action.id)} onToggle={() => toggleAction(action)} />) : <p className="action-group-loading">Loading live conditions for today&apos;s steps…</p>}
                        </section>
                      );
                    })}
                  </div>
                  <div className="action-footnote">Your checked items and water source stay saved in this browser for ZIP {profile.zip}; your conditions apply to every ZIP. Steps are general public-health guidance, not a diagnosis or treatment plan.</div>
                </div>
              </details>
            </div>
          ) : (
            <div className="panel-placeholder">{loading ? "Gathering EPA, CDC, AirNow and NWS data for this ZIP…" : "Search a five-digit ZIP to load its public data."}</div>
          )}
          <div className="panel-footer"><span>Live + public data · One Health · CKM context</span><Link href="/about">Sources &amp; methods <ArrowIcon /></Link></div>
        </aside>

      </main>
    </div>
  );
}

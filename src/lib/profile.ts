export type Estimate = number | null;

export interface CommunityHealth {
  chd: Estimate;
  stroke: Estimate;
  bloodPressure: Estimate;
  highCholesterol: Estimate;
  diabetes: Estimate;
  obesity: Estimate;
  kidneyDisease: Estimate;
}

export type HealthMeasure = keyof CommunityHealth;
/** National percentile rank (0–100) of a ZCTA estimate among all CDC PLACES ZCTAs; null when the estimate is missing. */
export type HealthRanks = Record<HealthMeasure, number | null>;
export type CkmDomain = "cardiac" | "kidney" | "metabolic";

export const HEALTH_MEASURES: ReadonlyArray<{ key: HealthMeasure; label: string; domain: CkmDomain }> = [
  { key: "chd", label: "Coronary heart disease", domain: "cardiac" },
  { key: "stroke", label: "Stroke", domain: "cardiac" },
  { key: "bloodPressure", label: "High blood pressure", domain: "cardiac" },
  { key: "highCholesterol", label: "High cholesterol", domain: "cardiac" },
  { key: "kidneyDisease", label: "Chronic kidney disease", domain: "kidney" },
  { key: "diabetes", label: "Diabetes", domain: "metabolic" },
  { key: "obesity", label: "Obesity", domain: "metabolic" },
];

export interface AirMonitor {
  latitude: number;
  longitude: number;
  annualPM25: number;
  year: number;
  monitorName: string;
  county: string | null;
  state: string | null;
  siteId: string;
  distanceMiles: number;
  observations: number;
}

export interface UcmrDetection {
  name: string;
  detections: number;
  max: number;
  latest: string | null;
  unit: string;
}

export interface UcmrSummary {
  results: number;
  detections: number;
  latest: string | null;
  positive: UcmrDetection[];
}

export interface WaterSystem {
  pwsId: string;
  name: string;
  populationServed: number | null;
  serviceAreaType: string | null;
  boundaryType: string | null;
  modelMethod: string | null;
  dataProvider: string | null;
  ucmr5: UcmrSummary | null;
}

export interface LocationProfile {
  zip: string;
  city: string | null;
  state: string | null;
  stateAbbr: string | null;
  latitude: number;
  longitude: number;
  population: number;
  adultPopulation: number;
  healthAvailable: boolean;
  health: CommunityHealth;
  healthRank: HealthRanks;
  healthMedian: Record<HealthMeasure, number | null>;
  healthSource: {
    release: number;
    brfssYear: number;
    kidneyRelease: number;
    kidneyBrfssYear: number;
  };
  air: AirMonitor | null;
  airMonitors: AirMonitor[];
  waterSystems: WaterSystem[];
  waterLookupAvailable: boolean;
  dataUpdated: string;
}

/* ---------- Live conditions (hourly AirNow observations, NWS alerts, Open-Meteo weather) ---------- */

export interface LiveAir {
  aqi: number;
  category: string;
  pollutant: string;
  areaName: string;
  state: string | null;
  observedAt: string | null;
  distanceMiles: number;
  actionDay: boolean;
  agency: string | null;
  others: { pollutant: string; aqi: number; category: string }[];
  tomorrow: { aqi: number | null; category: string | null; pollutant: string | null } | null;
  source: "airnow" | "open-meteo";
}

export interface LiveWeather {
  tempF: number;
  feelsLikeF: number;
  humidity: number | null;
  todayMaxFeelsLikeF: number | null;
  todayMinFeelsLikeF: number | null;
  tomorrowMaxFeelsLikeF: number | null;
  observedAt: string;
  timezone: string | null;
}

export interface LiveAlert {
  id: string;
  event: string;
  severity: string;
  urgency: string;
  headline: string | null;
  expires: string | null;
  sender: string | null;
  url: string | null;
}

export interface LiveConditions {
  air: LiveAir | null;
  weather: LiveWeather | null;
  alerts: LiveAlert[] | null;
  fetchedAt: string;
}

export interface AqiBand {
  name: string;
  tone: "good" | "moderate" | "usg" | "unhealthy" | "very" | "hazardous";
  range: string;
}

/** EPA AQI categories (AirNow AQI basics). */
export function aqiBand(aqi: number): AqiBand {
  if (aqi <= 50) return { name: "Good", tone: "good", range: "0–50" };
  if (aqi <= 100) return { name: "Moderate", tone: "moderate", range: "51–100" };
  if (aqi <= 150) return { name: "Unhealthy for Sensitive Groups", tone: "usg", range: "101–150" };
  if (aqi <= 200) return { name: "Unhealthy", tone: "unhealthy", range: "151–200" };
  if (aqi <= 300) return { name: "Very Unhealthy", tone: "very", range: "201–300" };
  return { name: "Hazardous", tone: "hazardous", range: "301+" };
}

export interface HeatBand {
  level: 1 | 2 | 3 | 4;
  name: string;
  range: string;
  effect: string;
}

/** NWS heat-index bands, applied to the Open-Meteo feels-like (apparent) temperature. */
export function heatBand(feelsLikeF: number): HeatBand | null {
  if (feelsLikeF >= 125) return { level: 4, name: "Extreme danger", range: "125°F or higher", effect: "heat stroke highly likely" };
  if (feelsLikeF >= 103) return { level: 3, name: "Danger", range: "103–124°F", effect: "heat cramps or heat exhaustion likely, heat stroke possible with prolonged exposure or activity" };
  if (feelsLikeF >= 90) return { level: 2, name: "Extreme caution", range: "90–103°F", effect: "heat stroke, cramps or exhaustion possible with prolonged exposure or activity" };
  if (feelsLikeF >= 80) return { level: 1, name: "Caution", range: "80–90°F", effect: "fatigue possible with prolonged exposure or activity" };
  return null;
}

export function pollutantLabel(pollutant: string): string {
  switch (pollutant.toUpperCase()) {
    case "PM2.5": return "fine particles (PM₂.₅)";
    case "PM10": return "coarse particles (PM₁₀)";
    case "OZONE":
    case "O3": return "ozone";
    case "NO2": return "nitrogen dioxide";
    case "CO": return "carbon monoxide";
    case "SO2": return "sulfur dioxide";
    default: return pollutant;
  }
}

/* ---------- CKM syndrome context (AHA 2023 presidential advisory) ---------- */

export type CkmCondition = "hypertension" | "diabetes" | "ckd" | "heart" | "weight" | "older";

export const CKM_CONDITIONS: ReadonlyArray<{ id: CkmCondition; label: string; hint: string }> = [
  { id: "hypertension", label: "High blood pressure", hint: "Diagnosed hypertension or taking blood-pressure medicine" },
  { id: "diabetes", label: "Diabetes or prediabetes", hint: "Type 1, type 2, gestational or prediabetes" },
  { id: "ckd", label: "Kidney disease", hint: "Chronic kidney disease at any stage, dialysis or transplant" },
  { id: "heart", label: "Heart disease or stroke", hint: "Coronary disease, heart failure, prior heart attack or stroke" },
  { id: "weight", label: "Excess weight", hint: "BMI of 25 or more, or a large waist" },
  { id: "older", label: "Age 65+", hint: "Older adults are a sensitive group for both air pollution and heat" },
];

export function ckmStageContext(conditions: ReadonlySet<CkmCondition>): { stage: string; summary: string; detail: string } {
  if (conditions.has("heart")) {
    return {
      stage: "Stage 4",
      summary: "clinical cardiovascular disease",
      detail: "Heart disease or stroke places CKM syndrome at Stage 4 in the AHA framework. Environmental triggers (particle pollution, heat, cold) matter most at this stage, so the daily steps below are prioritized for you.",
    };
  }
  if (conditions.has("ckd") || conditions.has("diabetes") || conditions.has("hypertension")) {
    return {
      stage: "Stage 2",
      summary: "metabolic risk factor or kidney disease",
      detail: "High blood pressure, diabetes or chronic kidney disease corresponds to Stage 2. Stage 3 (silent heart or blood-vessel disease) can only be found by testing, so ask your clinician which screening fits you; many people at this stage can move back a stage with treatment.",
    };
  }
  if (conditions.has("weight")) {
    return {
      stage: "Stage 1",
      summary: "excess or dysfunctional body fat",
      detail: "Excess weight corresponds to Stage 1. Checking blood pressure, glucose, cholesterol and kidney markers now finds Stage 2 early, when it is most reversible.",
    };
  }
  return {
    stage: "Stage 0–1",
    summary: "no reported CKM risk factors",
    detail: "Select any conditions that apply to tailor the steps. With no risk factors, the AHA framework still asks for periodic screening of blood pressure, glucose, cholesterol and kidney markers.",
  };
}

/* ---------- AQI → CKM action guide, personalized per ZIP ---------- */

export interface CkmAirAction {
  /** Imperative label, e.g. "Mask up". */
  label: string;
  text: string;
}

export interface CkmAirLevel {
  id: "good" | "moderate" | "usg" | "unhealthy";
  name: string;
  tone: AqiBand["tone"];
  aqiRange: string;
  pm25Range: string;
  aqiMax: number;
  /** What this band does to the cardiovascular–kidney–metabolic system. */
  means: string;
  actions: CkmAirAction[];
}

/**
 * The EPA AQI collapsed to the four bands that change what a CKM patient
 * should do. PM₂.₅ figures are EPA's current breakpoints (revised May 2024:
 * Good ends at 9.0 µg/m³, not the older 12.0) so they agree with the 9.0
 * µg/m³ annual reference used elsewhere in this report.
 */
export const CKM_AIR_LEVELS: ReadonlyArray<CkmAirLevel> = [
  {
    id: "good",
    name: "Good",
    tone: "good",
    aqiRange: "0–50",
    pm25Range: "0.0–9.0 µg/m³",
    aqiMax: 50,
    means: "Safe ambient air. Minimal added systemic inflammation, so nothing outdoors has to be rationed today.",
    actions: [
      { label: "Maximize outdoor activity", text: "Aerobic exercise—walking, cycling, anything that raises your heart rate. Cardiovascular fitness is the strongest modifiable brake on CKM progression, and the AHA asks for 150 minutes a week." },
      { label: "Ventilate", text: "Open the windows and flush the indoor air; indoor pollutants build up on the days you keep the house sealed." },
    ],
  },
  {
    id: "moderate",
    name: "Moderate",
    tone: "moderate",
    aqiRange: "51–100",
    pm25Range: "9.1–35.4 µg/m³",
    aqiMax: 100,
    means: "Acceptable for most people, but unusually sensitive adults and advanced CKM (AHA stage 3 or 4) can feel subtle strain.",
    actions: [
      { label: "Monitor symptoms", text: "Watch for fatigue, mild breathlessness or a sudden shift in your blood-pressure readings, and log them against the AQI instead of dismissing them." },
      { label: "Modify exertion", text: "With advanced heart or kidney disease, keep the session shorter and lighter, or move the intense part of it indoors." },
    ],
  },
  {
    id: "usg",
    name: "Unhealthy for Sensitive Groups",
    tone: "usg",
    aqiRange: "101–150",
    pm25Range: "35.5–55.4 µg/m³",
    aqiMax: 150,
    means: "High-alert zone. Particles start driving oxidative stress on the nephrons—the kidney's filters—and on vascular tissue.",
    actions: [
      { label: "Move indoors", text: "Shift all exercise inside. It is still fine to be outdoors for errands; it is the prolonged or heavy exertion that matters." },
      { label: "Purify the air", text: "Close the windows, set the HVAC fan to recirculate, and run a HEPA cleaner in the room you spend most of the day in." },
      { label: "Hold your medication line", text: "Take your prescribed CKM protectors—ACE inhibitors, ARBs, SGLT2 inhibitors—exactly on schedule. A stable baseline is what absorbs a pollution spike." },
    ],
  },
  {
    id: "unhealthy",
    name: "Unhealthy and above",
    tone: "unhealthy",
    aqiRange: "151 and up",
    pm25Range: "55.5 µg/m³ and up",
    aqiMax: Infinity,
    means: "Dangerous. This band raises the short-term risk of arrhythmia, clotting and acute metabolic and kidney events, not just symptoms.",
    actions: [
      { label: "Avoid outdoor air", text: "Stay indoors and keep activity low. Build one clean room with a HEPA cleaner and keep rescue medicines within reach." },
      { label: "Mask up", text: "If you must step outside, wear a well-fitted N95 or other particulate respirator. Surgical and cloth masks do not filter fine particles." },
    ],
  },
];

export function ckmAirLevelFor(aqi: number): CkmAirLevel {
  return CKM_AIR_LEVELS.find((level) => aqi <= level.aqiMax) ?? CKM_AIR_LEVELS[CKM_AIR_LEVELS.length - 1];
}

/** Same four bands, reached from a PM₂.₅ concentration instead of an AQI value. */
export function ckmAirLevelForPm25(pm25: number): CkmAirLevel {
  if (pm25 <= 9) return CKM_AIR_LEVELS[0];
  if (pm25 <= 35.4) return CKM_AIR_LEVELS[1];
  if (pm25 <= 55.4) return CKM_AIR_LEVELS[2];
  return CKM_AIR_LEVELS[3];
}

/** One personalized line per selected condition, for the band currently in force. */
const CKM_AIR_PERSONAL: Record<CkmCondition, Record<CkmAirLevel["id"], string>> = {
  hypertension: {
    good: "Blood pressure answers to aerobic activity within weeks—use a clean-air day for the longer session.",
    moderate: "Particle exposure nudges blood pressure up within hours. If you track at home, log today's reading next to the AQI rather than dismissing a high number.",
    usg: "Keep the indoor session, and keep your ACE inhibitor, ARB or diuretic on schedule—a stable baseline is what absorbs a spike.",
    unhealthy: "Stay in with a HEPA cleaner running, and call your clinician about a reading far above your usual range instead of waiting it out.",
  },
  diabetes: {
    good: "A walk after meals is the cheapest glucose control there is, and today's air does not stand in the way.",
    moderate: "PM₂.₅ worsens insulin resistance over days rather than minutes. Keep the routine; just shorten a hard session if you feel unusually flat.",
    usg: "Move the workout indoors but hold the usual meal and medication timing—a disrupted routine shifts glucose more than one polluted afternoon does.",
    unhealthy: "Stay indoors and check glucose more often than usual; the stress response to a pollution episode pushes it up.",
  },
  ckd: {
    good: "Clean air and regular activity both slow the decline in eGFR. This is a day to be outside.",
    moderate: "Nothing to change today. Keep to your fluid plan and your scheduled labs—the risk at this level is cumulative, not acute.",
    usg: "Particles at this level drive oxidative stress on the nephrons. Exercise indoors, and do not reach for ibuprofen or naproxen for the headache a smoky day brings; NSAIDs cut kidney blood flow.",
    unhealthy: "Stay indoors, keep to your fluid plan, keep taking your ACE inhibitor, ARB or SGLT2 inhibitor, and avoid NSAIDs entirely.",
  },
  heart: {
    good: "Full activity. Cardiorespiratory fitness is the single modifiable factor that most slows CKM progression.",
    moderate: "EPA names heart disease first among the sensitive groups. Soften or shorten today's outdoor session rather than skipping it.",
    usg: "Move all exercise indoors. Palpitations, chest pressure or new breathlessness on a polluted day is a reason to call, not to rest and see.",
    unhealthy: "Remain indoors with a HEPA cleaner running and rescue medicines to hand. Treat new chest pain or an irregular beat as an emergency—this band raises arrhythmia and clotting risk.",
  },
  weight: {
    good: "Take the outdoor session. Clean-air days are when the weekly 150 minutes actually get banked.",
    moderate: "No change needed. Keep the routine outdoors if it feels normal.",
    usg: "Swap to an indoor session rather than dropping it; consistency matters more than the setting.",
    unhealthy: "Indoor only today. Stairs or a bodyweight circuit keep the week intact without the exposure.",
  },
  older: {
    good: "Open the windows while the air is clean, and get the walk in early.",
    moderate: "Adults 65 and over are a sensitive group even at Moderate. Keep the walk, drop the hill.",
    usg: "Stay in, run the air cleaner, and arrange for someone to check in if you live alone.",
    unhealthy: "Remain indoors and keep activity low. Ask someone to check in today, and make sure you have a few days of medicine in hand.",
  },
};

export function ckmAirPersonalSteps(
  level: CkmAirLevel,
  conditions: ReadonlySet<CkmCondition>,
): { label: string; text: string }[] {
  return CKM_CONDITIONS.filter((condition) => conditions.has(condition.id)).map((condition) => ({
    label: condition.label,
    text: CKM_AIR_PERSONAL[condition.id][level.id],
  }));
}

/* ---------- Water reference values ---------- */

/** 2024 EPA PFAS rule, in ng/L. On May 18, 2026 EPA proposed rescinding the three 10 ng/L limits and the hazard index; PFOA and PFOS stand. */
export const PFAS_LIMITS_NGL: Record<string, { limit: number; status: "mcl" | "proposed-rescission" }> = {
  PFOA: { limit: 4, status: "mcl" },
  PFOS: { limit: 4, status: "mcl" },
  PFHxS: { limit: 10, status: "proposed-rescission" },
  PFNA: { limit: 10, status: "proposed-rescission" },
  "HFPO-DA": { limit: 10, status: "proposed-rescission" },
};
/** EPA's non-regulatory health reference level for lithium (µg/L). EPA compares at one significant digit: results above 15 µg/L round to 20 and count as above. */
export const LITHIUM_HRL_UGL = 10;
export const LITHIUM_ABOVE_UGL = 15;

export interface WaterFinding {
  name: string;
  status: "exceeds-mcl" | "exceeds-proposed" | "pfas-detected" | "lithium-above" | "lithium-detected" | "other";
  maxUgL: number;
  maxNgL: number;
  limitNgL: number | null;
  detections: number;
  latest: string | null;
}

export function isPfasName(name: string): boolean {
  return /PF|FTS|HFPO|ADONA|FOSA|Cl-PF/i.test(name);
}

export function assessUcmr(ucmr: UcmrSummary): WaterFinding[] {
  return ucmr.positive.map((entry) => {
    const maxUgL = /ng\/L/i.test(entry.unit) ? entry.max / 1000 : entry.max;
    const maxNgL = maxUgL * 1000;
    const base = { name: entry.name, maxUgL, maxNgL, detections: entry.detections, latest: entry.latest };
    if (/^lithium$/i.test(entry.name)) {
      return { ...base, limitNgL: LITHIUM_HRL_UGL * 1000, status: maxUgL > LITHIUM_ABOVE_UGL ? "lithium-above" : "lithium-detected" };
    }
    const rule = PFAS_LIMITS_NGL[entry.name];
    if (rule) {
      const over = maxNgL > rule.limit;
      return { ...base, limitNgL: rule.limit, status: over ? (rule.status === "mcl" ? "exceeds-mcl" : "exceeds-proposed") : "pfas-detected" };
    }
    return { ...base, limitNgL: null, status: isPfasName(entry.name) ? "pfas-detected" : "other" };
  });
}

/* ---------- Action plan ---------- */

export type WaterMode = "public" | "private" | "unknown";
export type ActionCategory = "Now" | "Air" | "Water" | "CKM care" | "One Health";
export const ACTION_CATEGORIES: ReadonlyArray<{ id: ActionCategory; title: string; note: string }> = [
  { id: "Now", title: "Right now", note: "Hourly AirNow readings, NWS alerts and today's feels-like temperature" },
  { id: "Air", title: "Air at home", note: "Nearest EPA annual PM₂.₅ monitor" },
  { id: "Water", title: "Drinking water", note: "EPA service area and UCMR 5 samples" },
  { id: "CKM care", title: "CKM care", note: "Heart, kidney and metabolic numbers for you and your community" },
  { id: "One Health", title: "One Health", note: "People, animals and the shared environment" },
];

export interface ActionItem {
  id: string;
  category: ActionCategory;
  title: string;
  detail: string;
  points: number;
  href?: string;
  linkLabel?: string;
  tag?: string;
  /** Why this step matters for cardiovascular-kidney-metabolic health. */
  ckm?: string;
}

const AIR_GUIDE = "https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home";
const AIRNOW = "https://www.airnow.gov/";
const AIRNOW_HEART = "https://www.airnow.gov/publications/health-professionals/heart-disease-stroke-and-outdoor-air-pollution-health-professionals/";
const FIRE_SMOKE_MAP = "https://fire.airnow.gov/";
const SMOKE_GUIDE = "https://www.airnow.gov/wildfires/when-smoke-is-in-the-air/";
const WELL_GUIDE = "https://www.epa.gov/privatewells/protect-your-homes-water";
const WELL_CONTAMINANTS = "https://www.epa.gov/privatewells/potential-well-water-contaminants-and-their-impacts";
const FLOOD_GUIDE = "https://www.epa.gov/natural-disasters/flooding";
const PFAS_FILTER_GUIDE = "https://www.epa.gov/water-research/identifying-drinking-water-filters-certified-reduce-pfas";
const PFAS_HEALTH = "https://www.epa.gov/pfas/our-current-understanding-human-health-and-environmental-risks-pfas";
const PFAS_RULE = "https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas";
const LEAD_FILTER_GUIDE = "https://www.epa.gov/water-research/consumer-tool-identifying-point-use-and-pitcher-filters-certified-reduce-lead";
const HOME_WATER_TEST = "https://www.epa.gov/ground-water-and-drinking-water/home-drinking-water-testing";
const UCMR_GUIDE = "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder";
const CCR_GUIDE = "https://www.epa.gov/ccr";
const SERVICE_AREAS = "https://gispub.epa.gov/serviceareas/";
const CDC_HEAT_CHRONIC = "https://www.cdc.gov/heat-health/risk-factors/heat-and-chronic-conditions.html";
const CDC_DIABETES_HEAT = "https://www.cdc.gov/diabetes/articles/managing-diabetes-in-the-heat.html";
const NKF_HEAT = "https://www.kidney.org/news-stories/can-extreme-heat-harm-your-kidneys-new-research-highlights-risks";
const AHA_COLD = "https://www.heart.org/en/health-topics/consumer-healthcare/what-is-cardiovascular-disease/cold-weather-and-cardiovascular-disease";
const NWS_COLD = "https://www.weather.gov/safety/cold";
const AHA_CKM = "https://www.heart.org/CKMhealth";
const CDC_KIDNEY_TEST = "https://www.cdc.gov/kidney-disease/testing/index.html";
const CDC_DPP = "https://www.cdc.gov/diabetes-prevention/lifestyle-change-program/find-a-program.html";
const HRSA_CENTERS = "https://findahealthcenter.hrsa.gov/";
const EPA_PETS_SMOKE = "https://www.epa.gov/wildfires/protect-your-pets-wildfire-smoke";
const AVMA_HEAT = "https://www.avma.org/resources/pet-owners/petcare/warm-weather-pet-safety";
const EPA_MEDS = "https://www.epa.gov/hwgenerators/collecting-and-disposing-unwanted-medicines";
const BURN_WISE = "https://www.epa.gov/burnwise";
const SOURCE_WATER = "https://www.epa.gov/sourcewaterprotection";
const EPA_HABS = "https://www.epa.gov/habs";
const CDC_ONE_HEALTH = "https://www.cdc.gov/one-health/about/index.html";

const CKM_AIR = "Fine particles enter the bloodstream and are linked to heart attacks, strokes and faster loss of kidney function; EPA lists heart disease and older age as sensitive groups.";
const CKM_HEAT = "Heat stresses the heart, concentrates the blood and can trigger acute kidney injury; many CKM medicines reduce heat tolerance.";

function fmt1(value: number): string {
  return value.toFixed(1);
}

function ngL(value: number): string {
  return value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2).replace(/\.?0+$/, "");
}

function listNames(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function conditionNames(conditions: ReadonlySet<CkmCondition>): string {
  const labels = CKM_CONDITIONS.filter((c) => conditions.has(c.id)).map((c) => c.label.toLowerCase());
  return listNames(labels);
}

export function formatRank(rank: number | null): string {
  if (rank === null) return "no national rank";
  return `higher than ${Math.round(rank)}% of US ZCTAs`;
}

export function buildActionPlan(
  profile: LocationProfile,
  waterMode: WaterMode,
  live: LiveConditions | null | undefined,
  conditions: ReadonlySet<CkmCondition>,
): ActionItem[] {
  const actions: ActionItem[] = [];
  const has = (condition: CkmCondition) => conditions.has(condition);
  const anyCondition = CKM_CONDITIONS.some((c) => has(c.id));
  // EPA names heart disease and older adults as sensitive to particle pollution; AHA extends the concern to diabetes, kidney disease and hypertension.
  const sensitive = has("heart") || has("older") || has("diabetes") || has("ckd") || has("hypertension");
  const who = anyCondition ? `With ${conditionNames(conditions)}, ` : "";
  const air = profile.air;
  const liveAir = live?.air ?? null;
  const weather = live?.weather ?? null;
  const alerts = live?.alerts ?? [];
  const heatAlert = alerts.find((a) => /heat/i.test(a.event)) ?? null;
  const airAlert = alerts.find((a) => /air quality|smoke|dust/i.test(a.event)) ?? null;
  const coldAlert = alerts.find((a) => /cold|wind chill|freez|frost|winter|blizzard|ice/i.test(a.event)) ?? null;
  const floodAlert = alerts.find((a) => /flood|hurricane|tropical|storm surge/i.test(a.event)) ?? null;
  const hazardAlerts = alerts.filter((a) => (a.severity === "Extreme" || a.severity === "Severe") && !/heat|air quality|smoke|dust|cold|wind chill|freez|frost/i.test(a.event));
  const month = new Date().getMonth() + 1;

  /* ---------- Right now ---------- */
  if (live !== undefined) {
    if (liveAir) {
      const band = aqiBand(liveAir.aqi);
      const where = `${liveAir.areaName}${liveAir.state ? `, ${liveAir.state}` : ""} (${liveAir.distanceMiles} mi away)`;
      const when = liveAir.observedAt ? ` at ${liveAir.observedAt}` : "";
      const sourceNote = liveAir.source === "airnow" ? `AirNow's ${where} reporting area measured` : `No AirNow reporting area is within range; Open-Meteo's model estimates`;
      const base = `${sourceNote} AQI ${liveAir.aqi} (${band.name}) for ${pollutantLabel(liveAir.pollutant)}${when}.`;
      const ozoneNote = /OZONE|O3/i.test(liveAir.pollutant) ? " Ozone peaks on sunny afternoons, so mornings are the cleanest window." : "";
      const particleNote = /PM/i.test(liveAir.pollutant) ? " Keep windows closed and run a HEPA cleaner in the room you use most." : "";
      const heartSymptoms = has("heart") ? " Palpitations, shortness of breath or unusual fatigue on a polluted day can signal a serious problem—contact your clinician." : "";
      const actionDay = liveAir.actionDay ? ` An Air Quality Action Day is in effect${liveAir.agency ? ` (${liveAir.agency})` : ""}.` : "";
      if (liveAir.aqi <= 50) {
        actions.push({
          id: "now-air", category: "Now", tag: "Today", points: 10, href: AIRNOW, linkLabel: "AirNow current conditions",
          title: `Take today's activity outside—AQI ${liveAir.aqi} is Good`,
          detail: `${base} Regular activity is core CKM care: the AHA suggests at least 150 minutes a week of moderate activity, and today's air does not limit it.${ozoneNote}${actionDay}`,
          ckm: "Physical activity lowers blood pressure, glucose and weight at every CKM stage.",
        });
      } else if (liveAir.aqi <= 100) {
        actions.push({
          id: "now-air", category: "Now", tag: "Today", points: 10, href: AIRNOW_HEART, linkLabel: "EPA guidance for heart patients",
          title: sensitive ? `Keep today's outdoor effort lighter—AQI ${liveAir.aqi} is Moderate` : `Outdoor activity is fine today—AQI ${liveAir.aqi} is Moderate`,
          detail: `${base} EPA: unusually sensitive people should consider reducing prolonged or heavy exertion and watch for coughing or shortness of breath. ${who ? `${who}a shorter or less intense session outdoors is the cautious choice.` : "Most people can keep their usual routine."}${ozoneNote}${heartSymptoms}${actionDay}`,
          ckm: CKM_AIR,
        });
      } else if (liveAir.aqi <= 150) {
        actions.push({
          id: "now-air", category: "Now", tag: sensitive ? "Priority" : "Today", points: 15, href: AIRNOW_HEART, linkLabel: "EPA guidance for heart patients",
          title: sensitive ? `Reduce prolonged or heavy exertion outdoors today (AQI ${liveAir.aqi})` : `Take more breaks outdoors today (AQI ${liveAir.aqi})`,
          detail: `${base} EPA: sensitive groups—people with heart disease, older adults and children—should reduce prolonged or heavy exertion; it is OK to be outside, but take more breaks and do less intense activities.${particleNote}${ozoneNote}${heartSymptoms}${actionDay}`,
          ckm: CKM_AIR,
        });
      } else if (liveAir.aqi <= 200) {
        actions.push({
          id: "now-air", category: "Now", tag: "Priority", points: 20, href: SMOKE_GUIDE, linkLabel: "AirNow: when air is unhealthy",
          title: sensitive ? `Avoid prolonged or heavy exertion outdoors today (AQI ${liveAir.aqi})` : `Move workouts indoors today (AQI ${liveAir.aqi})`,
          detail: `${base} EPA: sensitive groups should avoid prolonged or heavy exertion and move activities indoors or reschedule; everyone else should reduce it.${particleNote} If you must be outside in smoke, a well-fitted N95 respirator reduces particle exposure.${heartSymptoms}${actionDay}`,
          ckm: CKM_AIR,
        });
      } else if (liveAir.aqi <= 300) {
        actions.push({
          id: "now-air", category: "Now", tag: "Priority", points: 25, href: SMOKE_GUIDE, linkLabel: "AirNow: when air is unhealthy",
          title: sensitive ? `Avoid all outdoor physical activity today (AQI ${liveAir.aqi})` : `Avoid prolonged or heavy exertion outdoors today (AQI ${liveAir.aqi})`,
          detail: `${base} EPA: sensitive groups should avoid all physical activity outdoors; everyone else should avoid prolonged or heavy exertion. Keep windows closed, run a HEPA cleaner, and set the HVAC fan to recirculate.${heartSymptoms}${actionDay}`,
          ckm: CKM_AIR,
        });
      } else {
        actions.push({
          id: "now-air", category: "Now", tag: "Priority", points: 25, href: SMOKE_GUIDE, linkLabel: "AirNow: when air is unhealthy",
          title: `Stay indoors and keep activity low today (AQI ${liveAir.aqi}, Hazardous)`,
          detail: `${base} EPA: everyone should avoid all physical activity outdoors; sensitive groups should remain indoors and keep activity levels low. Create a clean room with a HEPA cleaner and keep rescue medicines within reach.${heartSymptoms}${actionDay}`,
          ckm: CKM_AIR,
        });
      }
      const tomorrow = liveAir.tomorrow;
      if (tomorrow && tomorrow.aqi !== null && tomorrow.aqi > 100 && tomorrow.aqi > liveAir.aqi) {
        const tomorrowBand = aqiBand(tomorrow.aqi);
        actions.push({
          id: "now-air-tomorrow", category: "Now", tag: "Tomorrow", points: 10, href: FIRE_SMOKE_MAP, linkLabel: "Fire & smoke map",
          title: `Plan around tomorrow's forecast AQI ${tomorrow.aqi} (${tomorrowBand.name})`,
          detail: `AirNow forecasts ${tomorrow.pollutant ? pollutantLabel(tomorrow.pollutant) : "pollution"} at AQI ${tomorrow.aqi} for ${liveAir.areaName} tomorrow. Move errands, exercise and medical trips to the cleanest hours, refill any medicines that are running low, and check the fire and smoke map in the morning.`,
          ckm: CKM_AIR,
        });
      }
    } else {
      actions.push({
        id: "now-air", category: "Now", points: 10, href: FIRE_SMOKE_MAP, linkLabel: "Fire & smoke map",
        title: live ? "Check the fire and smoke map before outdoor activity" : "Check AirNow before outdoor activity",
        detail: live
          ? "No AirNow reporting area or model estimate was available for this ZIP area right now, so current air quality is unknown—not clean. The fire and smoke map adds low-cost sensors between official monitors."
          : "The live conditions feed could not be loaded, so current air quality is unknown—not clean. AirNow and its fire and smoke map show the latest hourly readings.",
        ckm: CKM_AIR,
      });
    }

    if (weather) {
      const peak = Math.max(weather.feelsLikeF, weather.todayMaxFeelsLikeF ?? -Infinity);
      const band = heatBand(peak);
      if (band) {
        const measured = `Open-Meteo estimates a feels-like temperature of ${Math.round(weather.feelsLikeF)}°F now and ${Math.round(peak)}°F at today's peak—NWS "${band.name}" range (${band.range}): ${band.effect}.`;
        const parts: string[] = [];
        if (has("ckd")) parts.push("NKF: with kidney disease your fluid needs may be higher or lower than usual, so follow the plan from your care team, do not exceed a fluid limit without asking, and avoid ibuprofen or naproxen, which reduce kidney blood flow when you are dehydrated. Dark urine, dizziness or confusion are warning signs.");
        if (has("diabetes")) parts.push("CDC: dehydration raises blood sugar and heat changes how your body uses insulin—check glucose more often, drink water, and keep insulin, pumps, CGMs and strips out of direct sun and hot cars (opened insulin keeps at room temperature up to 86°F).");
        if (has("hypertension") || has("heart")) parts.push("CDC: diuretics, ACE inhibitors and ARBs blunt thirst and beta blockers can reduce sweating—review a heat action plan with your clinician and do not stop medicines on your own. Chest pain, palpitations or fainting need urgent care.");
        if (has("older")) parts.push("CDC: adults 65 and older adjust to heat less well; use air conditioning or a cooling center and have someone check in twice a day.");
        if (!parts.length) parts.push("Move exertion before 10 am or after 6 pm, drink water unless you have a fluid limit, and rest in air conditioning during the peak hours.");
        const title = has("ckd") ? `Follow your fluid plan and skip NSAIDs—feels like ${Math.round(peak)}°F today`
          : has("diabetes") ? `Check glucose more often and keep insulin cool—feels like ${Math.round(peak)}°F today`
          : has("hypertension") || has("heart") ? `Use your heat plan—feels like ${Math.round(peak)}°F today`
          : `Shift outdoor activity to cooler hours—feels like ${Math.round(peak)}°F today`;
        actions.push({
          id: "now-heat", category: "Now", tag: band.level >= 3 ? "Priority" : "Today", points: band.level >= 3 ? 25 : band.level === 2 ? 20 : 10,
          href: has("ckd") ? NKF_HEAT : has("diabetes") ? CDC_DIABETES_HEAT : CDC_HEAT_CHRONIC,
          linkLabel: has("ckd") ? "NKF: heat and kidneys" : has("diabetes") ? "CDC: diabetes in the heat" : "CDC: heat and chronic conditions",
          title,
          detail: `${measured} ${parts.join(" ")}`,
          ckm: CKM_HEAT,
        });
      }
      const low = Math.min(weather.feelsLikeF, weather.todayMinFeelsLikeF ?? Infinity);
      if (low <= 32) {
        actions.push({
          id: "now-cold", category: "Now", tag: low <= 15 ? "Priority" : "Today", points: low <= 15 ? 15 : 10, href: has("heart") || has("hypertension") ? AHA_COLD : NWS_COLD,
          linkLabel: has("heart") || has("hypertension") ? "AHA: cold weather and the heart" : "NWS cold safety",
          title: has("heart") || has("hypertension") ? `Avoid sudden exertion in the cold—feels like ${Math.round(low)}°F` : `Dress for a feels-like low of ${Math.round(low)}°F`,
          detail: `AHA: cold narrows blood vessels and raises blood pressure, and people with coronary disease often get angina in cold weather. Warm up indoors first, avoid sudden heavy exertion such as shoveling snow, cover your head and hands, and limit time outside when the feels-like temperature is below freezing.${has("older") ? " Older adults lose body heat faster; keep indoor temperatures at 68°F or higher." : ""}`,
          ckm: "Cold raises blood pressure and clotting tendency, which is why winter heart attacks and strokes rise.",
        });
      }
    }

    if (heatAlert) {
      actions.push({
        id: "now-alert-heat", category: "Now", tag: "Priority", points: 25, href: heatAlert.url ?? CDC_HEAT_CHRONIC, linkLabel: "Read the NWS alert",
        title: `NWS ${heatAlert.event} in effect—activate your heat plan`,
        detail: `${heatAlert.headline ?? `${heatAlert.sender ?? "The National Weather Service"} issued a ${heatAlert.event}.`}${heatAlert.expires ? ` Expires ${heatAlert.expires}.` : ""} Stay in air conditioning during the hottest hours, check in on neighbors, and ${has("ckd") ? "follow your fluid plan exactly" : has("diabetes") ? "check glucose more often" : "drink water before you feel thirsty"}. ${has("hypertension") || has("heart") ? "Ask your clinician how diuretics and blood-pressure medicines should be handled during the alert." : ""}`,
        ckm: CKM_HEAT,
      });
    }
    if (airAlert) {
      actions.push({
        id: "now-alert-air", category: "Now", tag: "Priority", points: 20, href: airAlert.url ?? AIRNOW, linkLabel: "Read the NWS alert",
        title: `NWS ${airAlert.event}—follow sensitive-group guidance today`,
        detail: `${airAlert.headline ?? `${airAlert.sender ?? "The National Weather Service"} issued a ${airAlert.event}.`}${airAlert.expires ? ` Expires ${airAlert.expires}.` : ""} ${sensitive ? `${who}you count as a sensitive group: limit outdoor exertion, keep windows closed and run a HEPA cleaner.` : "Reduce prolonged outdoor exertion, keep windows closed and run a HEPA cleaner."}`,
        ckm: CKM_AIR,
      });
    }
    if (coldAlert) {
      actions.push({
        id: "now-alert-cold", category: "Now", tag: "Today", points: 15, href: coldAlert.url ?? NWS_COLD, linkLabel: "Read the NWS alert",
        title: `NWS ${coldAlert.event}—limit outdoor exertion and layer up`,
        detail: `${coldAlert.headline ?? `${coldAlert.sender ?? "The National Weather Service"} issued a ${coldAlert.event}.`}${coldAlert.expires ? ` Expires ${coldAlert.expires}.` : ""} AHA: cold raises blood pressure and strain on the heart; avoid sudden heavy exertion outdoors and keep the home at 68°F or higher.`,
        ckm: "Cold snaps raise blood pressure, angina and stroke risk.",
      });
    }
    if (hazardAlerts.length) {
      const events = listNames([...new Set(hazardAlerts.map((a) => a.event))].slice(0, 3));
      actions.push({
        id: "now-alert-hazard", category: "Now", tag: "Priority", points: 20, href: hazardAlerts[0].url ?? "https://www.weather.gov/", linkLabel: "Read the NWS alert",
        title: `Prepare CKM medicines and care for the ${events} alert`,
        detail: `${hazardAlerts[0].headline ?? `${hazardAlerts[0].sender ?? "The National Weather Service"} issued a ${hazardAlerts[0].event}.`} Keep at least a week of blood-pressure, diabetes, heart and kidney medicines on hand, and plan for power loss: opened insulin keeps at room temperature (up to 86°F) for about 28 days, and dialysis patients should confirm their center's emergency schedule.${waterMode === "private" && floodAlert ? " If your well floods, do not drink the water until it is disinfected and tested." : ""}`,
        ckm: "Missed doses and dialysis sessions during disasters drive avoidable heart and kidney emergencies.",
      });
    }
  }

  /* ---------- Air at home (annual monitor) ---------- */
  if (air && air.annualPM25 > 9) {
    const over = Math.round(((air.annualPM25 - 9) / 9) * 100);
    actions.push({
      id: "air-room-cleaner", category: "Air", tag: "Priority", points: 25, href: AIR_GUIDE, linkLabel: "EPA sizing guide",
      title: `Size a HEPA cleaner for the room you sleep in (${fmt1(air.annualPM25)} µg/m³ annual PM₂.₅)`,
      detail: `${air.monitorName}, the nearest complete EPA monitor (${fmt1(air.distanceMiles)} mi), averaged ${fmt1(air.annualPM25)} µg/m³ in ${air.year}—${over}% above the 9.0 µg/m³ annual standard used here as a screening reference (one year is not an attainment decision). Choose a portable unit whose smoke CADR is at least two-thirds of the room's square footage; avoid ozone-generating models.`,
      ckm: CKM_AIR,
    });
  } else {
    actions.push({
      id: "air-room-cleaner", category: "Air", points: 15, href: AIR_GUIDE, linkLabel: "EPA air-cleaner guide",
      title: air ? `Prepare one room for smoke days (annual PM₂.₅ ${fmt1(air.annualPM25)} µg/m³)` : "Prepare one room for smoke days",
      detail: air
        ? `${air.monitorName} (${fmt1(air.distanceMiles)} mi) averaged ${fmt1(air.annualPM25)} µg/m³ in ${air.year}, within the 9.0 µg/m³ annual reference. Short smoke events and indoor sources are not captured by an annual value, so pick a room-sized HEPA cleaner now rather than during a smoke episode.`
        : "No complete EPA PM₂.₅ monitor sits within 50 miles of this ZIP area, so annual exposure is unknown—not clean. Use the fire and smoke map during smoke events and size a HEPA cleaner for the room where you spend the most time.",
      ckm: CKM_AIR,
    });
  }
  actions.push({
    id: "air-hvac-filter", category: "Air", points: 10, href: AIR_GUIDE, linkLabel: "EPA filter guidance",
    title: "Upgrade the central HVAC filter to MERV 13 if the system allows",
    detail: "Use MERV 13 or the highest rating the equipment manual supports, and replace it on schedule. A higher-resistance filter forced into an incompatible system reduces airflow instead of improving it.",
    ckm: "Lower indoor particle levels mean lower blood-pressure and inflammatory responses in people with CKM conditions.",
  });
  if (!air) {
    actions.push({
      id: "air-find-monitor", category: "Air", points: 10, href: FIRE_SMOKE_MAP, linkLabel: "Fire & smoke map",
      title: "Find the nearest sensor on the fire and smoke map",
      detail: "AirNow's fire and smoke map includes low-cost sensors that fill gaps between official monitors. Note the nearest one and check it on windy, dusty or smoky days.",
      ckm: CKM_AIR,
    });
  }

  /* ---------- Drinking water ---------- */
  if (waterMode === "private") {
    actions.push({
      id: "well-annual-test", category: "Water", tag: "Yearly", points: 30, href: WELL_GUIDE, linkLabel: "EPA well-testing guide",
      title: "Book the annual private-well test",
      detail: "Ask a state-certified drinking-water lab to test for total coliform bacteria, nitrate (EPA limit 10 mg/L as nitrogen), total dissolved solids and pH, and ask the health department whether arsenic, PFAS, lead or local groundwater contaminants should be added.",
      ckm: "Arsenic and lead in well water are linked to high blood pressure, diabetes and kidney damage.",
    });
    if (floodAlert) {
      actions.push({
        id: "well-flood", category: "Water", tag: "Priority", points: 20, href: FLOOD_GUIDE, linkLabel: "EPA: flooding and wells",
        title: `Treat well water as unsafe during the ${floodAlert.event}`,
        detail: "If floodwater reaches the wellhead, use bottled water until the well is disinfected and a lab test confirms it is free of bacteria. Do not drink or cook with it in the meantime.",
        ckm: "Vomiting or diarrhea from contaminated water dehydrates people with kidney disease and diabetes quickly.",
      });
    }
    actions.push({
      id: "well-treatment-after-results", category: "Water", points: 15, href: WELL_CONTAMINANTS, linkLabel: "Testing and treatment",
      title: "Match any treatment to a lab result",
      detail: "Keep the lab report, then ask the lab or health department what treatment fits the contaminant and measured level. Do not choose a filter from neighborhood data alone.",
    });
  } else if (waterMode === "public" && profile.waterSystems[0]) {
    const system = profile.waterSystems[0];
    const ucmr = system.ucmr5;
    actions.push({
      id: "water-confirm-system", category: "Water", points: 15, href: SERVICE_AREAS, linkLabel: "EPA service-area map",
      title: "Confirm this provider serves your address",
      detail: `${system.name} overlaps the ZIP centroid${system.serviceAreaType ? ` (${system.serviceAreaType.toLowerCase()} service area)` : ""}${system.populationServed ? `, serving about ${system.populationServed.toLocaleString()} people` : ""}. Check the provider on your bill or with the utility; ZIP-level service boundaries may not identify the system at a specific home.`,
    });
    actions.push({
      id: "water-read-report", category: "Water", points: 15, href: CCR_GUIDE, linkLabel: "Find a water-quality report",
      title: "Open the latest Consumer Confidence Report",
      detail: "Review the utility's annual report for regulated contaminants, monitoring dates and any notices. The EPA system record and UCMR samples do not measure water at your kitchen tap.",
    });
    if (ucmr && ucmr.detections > 0) {
      const findings = assessUcmr(ucmr);
      const exceedsMcl = findings.filter((f) => f.status === "exceeds-mcl");
      const exceedsProposed = findings.filter((f) => f.status === "exceeds-proposed");
      const pfas = findings.filter((f) => f.status === "pfas-detected" || f.status === "exceeds-mcl" || f.status === "exceeds-proposed");
      const lithiumAbove = findings.find((f) => f.status === "lithium-above");
      const lithiumBelow = findings.find((f) => f.status === "lithium-detected");
      const describe = (f: WaterFinding) => `${f.name} ${ngL(f.maxNgL)} ng/L${f.limitNgL ? ` vs ${f.limitNgL} ng/L` : ""}`;
      if (exceedsMcl.length) {
        actions.push({
          id: "water-pfas-mcl", category: "Water", tag: "Priority", points: 25, href: PFAS_RULE, linkLabel: "EPA PFAS drinking-water rule",
          title: `Ask ${system.name} about its ${listNames(exceedsMcl.map((f) => f.name))} plan`,
          detail: `EPA UCMR 5 treated-water samples for this system reached ${listNames(exceedsMcl.map(describe))} (sample maximums${ucmr.latest ? `, latest ${ucmr.latest}` : ""}). The 2024 rule's 4.0 ng/L limits for PFOA and PFOS remain in force, with compliance due by 2029 (EPA has proposed allowing until 2031). Ask the utility for its current results and treatment timeline, and until levels fall, use a point-of-use filter certified under NSF/ANSI 53 or 58 for PFOA/PFOS.`,
          ckm: "EPA links PFOA/PFOS exposure to higher cholesterol, high blood pressure in pregnancy and kidney cancer.",
        });
      }
      if (exceedsProposed.length) {
        actions.push({
          id: "water-pfas-proposed", category: "Water", tag: "Review", points: 15, href: PFAS_HEALTH, linkLabel: "EPA PFAS health effects",
          title: `Review ${listNames(exceedsProposed.map((f) => f.name))} above the 10 ng/L limits`,
          detail: `Samples reached ${listNames(exceedsProposed.map(describe))}. EPA set these 10 ng/L limits in 2024 and on May 18, 2026 proposed rescinding them along with the mixture hazard index, so they may not be enforced—but a filter certified for PFOA/PFOS under NSF/ANSI 53 or 58 also reduces these compounds.`,
          ckm: "PFAS as a class is associated with higher LDL cholesterol in population studies.",
        });
      }
      if (!exceedsMcl.length && !exceedsProposed.length && pfas.length) {
        actions.push({
          id: "water-pfas-filter", category: "Water", tag: "Review", points: 15, href: PFAS_FILTER_GUIDE, linkLabel: "EPA PFAS filter guidance",
          title: `Match any PFAS filter to the ${pfas.length} compound${pfas.length === 1 ? "" : "s"} detected`,
          detail: `Samples reported ${listNames(pfas.slice(0, 4).map(describe))}${pfas.length > 4 ? ` and ${pfas.length - 4} more` : ""}—${exceedsMcl.length || exceedsProposed.length ? "" : "all below EPA limits where one exists"}. If you choose a point-of-use filter, verify that the exact model is certified for the listed PFAS under NSF/ANSI 53 or 58; EPA notes that current certifications do not by themselves prove removal to every standard.`,
          ckm: "PFAS as a class is associated with higher LDL cholesterol in population studies.",
        });
      }
      if (lithiumAbove) {
        actions.push({
          id: "water-lithium", category: "Water", tag: "Review", points: 10, href: UCMR_GUIDE, linkLabel: "EPA UCMR 5 results",
          title: `Ask about lithium: ${fmt1(lithiumAbove.maxUgL)} µg/L vs EPA's ${LITHIUM_HRL_UGL} µg/L screening level`,
          detail: `The system's maximum lithium result (${fmt1(lithiumAbove.maxUgL)} µg/L${lithiumAbove.latest ? `, ${lithiumAbove.latest}` : ""}) rounds above EPA's non-regulatory health reference level, as it does for roughly a quarter of US systems. There is no drinking-water standard, and the amount is far below medical doses; ask the utility whether lithium is monitored, and if you have kidney disease or take lithium, mention it at your next visit.`,
          ckm: "Lithium is cleared by the kidneys, which is why nephrologists track it in patients who take it.",
        });
      } else if (lithiumBelow && !pfas.length) {
        actions.push({
          id: "water-review-samples", category: "Water", points: 10, href: UCMR_GUIDE, linkLabel: "EPA UCMR 5 results",
          title: "Review what EPA sampled for this system",
          detail: `UCMR 5 reported lithium at up to ${fmt1(lithiumBelow.maxUgL)} µg/L—below EPA's ${LITHIUM_HRL_UGL} µg/L screening level—and no PFAS above reporting levels in ${ucmr.results.toLocaleString()} treated-water results. This does not describe every contaminant, period or your home's plumbing.`,
        });
      }
    } else if (ucmr && ucmr.results > 0) {
      actions.push({
        id: "water-review-samples", category: "Water", points: 10, href: UCMR_GUIDE, linkLabel: "EPA UCMR 5 results",
        title: "Review what EPA sampled for this system",
        detail: `EPA UCMR 5 includes ${ucmr.results.toLocaleString()} treated-water results for this system with no PFAS or lithium above the rule's reporting levels. This does not describe every contaminant, every period, or your home's plumbing.`,
      });
    } else {
      actions.push({
        id: "water-check-ucmr", category: "Water", points: 15, href: UCMR_GUIDE, linkLabel: "EPA UCMR 5 information",
        title: "Ask the utility about recent PFAS testing",
        detail: "No UCMR 5 record was matched to this system. EPA did not select every small system for this monitoring cycle, so a missing record is not a non-detection. Ask your provider for its latest PFAS results.",
      });
    }
    actions.push({
      id: "water-lead-test", category: "Water", points: 15, href: HOME_WATER_TEST, linkLabel: "EPA home water-testing guide",
      title: "Check for lead in the home plumbing",
      detail: "Confirm the home's build year and service-line material. If the home predates 1986 or the plumbing is unknown, ask the utility or state for a certified tap-water lead test; EPA's 2024 rule lowered the lead action level to 10 µg/L and requires utilities to inventory and replace lead service lines.",
      ckm: "EPA: lead exposure in adults raises blood pressure and reduces kidney function.",
    });
    actions.push({
      id: "water-lead-filter-after-test", category: "Water", points: 10, href: LEAD_FILTER_GUIDE, linkLabel: "EPA certified-filter guide",
      title: "If lead is detected, match a certified point-of-use filter",
      detail: "Only after a tap test identifies lead, check that the exact pitcher or faucet model has a third-party lead-reduction claim under NSF/ANSI 53 and 42, and follow its replacement schedule. Use cold water for drinking and cooking, and flush the tap after it has sat for hours.",
    });
  } else {
    actions.push({
      id: "water-identify-source", category: "Water", points: 15, href: SERVICE_AREAS, linkLabel: "EPA service-area map",
      title: profile.waterLookupAvailable ? "Identify the water source at your home" : "Confirm the water provider for your address",
      detail: profile.waterLookupAvailable
        ? "The ZIP centroid did not match a public-water service area. Check your bill or ask your landlord whether the address uses a public utility or a private well, then choose it above to unlock specific steps."
        : "EPA's service-area layer did not return data for this lookup. Check your bill or ask the property owner whether the address uses a public utility or a private well, then choose it above.",
    });
    actions.push({
      id: "water-find-report", category: "Water", points: 20, href: WELL_GUIDE, linkLabel: "EPA water guidance",
      title: "Request a report or certified well test",
      detail: "For public water, ask the provider for its Consumer Confidence Report and PWS ID. For a private well, test annually through a state-certified lab.",
    });
  }

  /* ---------- CKM care ---------- */
  const rank = profile.healthRank;
  const health = profile.health;
  const stage = ckmStageContext(conditions);
  actions.push({
    id: "ckm-know-numbers", category: "CKM care", points: 20, href: AHA_CKM, linkLabel: "AHA CKM health",
    title: "Know your CKM numbers",
    detail: `Blood pressure, A1c or fasting glucose, a cholesterol panel, eGFR with urine albumin (uACR), and weight or waist size. The AHA stages CKM syndrome from 0 (no risk factors) to 4 (heart disease); your selections suggest ${stage.stage} context (${stage.summary}). ${stage.detail}`,
    ckm: "Heart, kidney and metabolic disease share causes and treatments; measuring all five numbers together is how CKM care starts.",
  });
  const kidneyRank = rank.kidneyDisease;
  actions.push({
    id: "ckm-kidney-check", category: "CKM care", tag: has("ckd") ? "Ongoing" : "Yearly", points: 20, href: CDC_KIDNEY_TEST, linkLabel: "CDC kidney tests",
    title: has("ckd") ? "Keep eGFR and uACR on your nephrology schedule" : "Get a yearly eGFR blood test and uACR urine test",
    detail: has("ckd")
      ? "Ask what interval your care team wants for eGFR and uACR, and bring every lab result to each visit. A uACR of 30 mg/g or higher, or a falling eGFR, changes which medicines protect the kidneys best."
      : `${has("diabetes") || has("hypertension") ? `${who}CDC and NKF recommend both tests every year, because kidney disease is silent until late. ` : "CDC: people with diabetes or high blood pressure should have both tests every year, because kidney disease is silent until late. "}${health.kidneyDisease !== null && kidneyRank !== null ? `This ZIP's CKD estimate is ${fmt1(health.kidneyDisease)}% of adults (${formatRank(kidneyRank)}).` : "No ZIP-level CKD estimate is available here, which does not lower your own risk."} A uACR of 30 mg/g or above may mean kidney disease and should be repeated to confirm.`,
    ckm: "Kidney markers are the earliest measurable signal that heart and metabolic disease are damaging organs.",
  });
  const bpRank = rank.bloodPressure;
  if (has("hypertension") || has("heart") || has("ckd") || (bpRank !== null && bpRank >= 75)) {
    actions.push({
      id: "ckm-home-bp", category: "CKM care", points: 15, href: AHA_CKM, linkLabel: "AHA CKM health",
      title: "Log home blood pressure for one week",
      detail: `Use a validated upper-arm cuff, sit quietly for five minutes, take two readings morning and evening, and bring the log to your clinician. Many adults with hypertension aim for below 130/80 (ACC/AHA); ask for your own target.${health.bloodPressure !== null && bpRank !== null ? ` This ZIP's high-blood-pressure estimate is ${fmt1(health.bloodPressure)}% of adults (${formatRank(bpRank)}).` : ""}`,
      ckm: "Blood pressure control is the single most effective way to slow both heart and kidney damage.",
    });
  }
  const diabetesRank = rank.diabetes;
  if (has("diabetes")) {
    actions.push({
      id: "ckm-diabetes-program", category: "CKM care", points: 15, href: CDC_DPP, linkLabel: "Find a CDC-recognized program",
      title: "Enroll in a diabetes or prediabetes lifestyle program",
      detail: `CDC-recognized National DPP programs (in person or online) roughly halve progression from prediabetes to type 2 diabetes; people with diabetes can ask for diabetes self-management education. Ask also whether medicines that protect the heart and kidneys together (such as SGLT2 inhibitors or GLP-1 medicines) fit your stage.${health.diabetes !== null && diabetesRank !== null ? ` This ZIP's diabetes estimate is ${fmt1(health.diabetes)}% of adults (${formatRank(diabetesRank)}).` : ""}`,
      ckm: "Diabetes is the leading cause of kidney failure and doubles cardiovascular risk.",
    });
  } else if (has("weight") || (diabetesRank !== null && diabetesRank >= 60)) {
    actions.push({
      id: "ckm-prediabetes-screen", category: "CKM care", points: 15, href: CDC_DPP, linkLabel: "Find a CDC-recognized program",
      title: "Ask for an A1c and a CDC-recognized prevention program",
      detail: `${health.diabetes !== null && diabetesRank !== null ? `This ZIP's diabetes estimate is ${fmt1(health.diabetes)}% of adults (${formatRank(diabetesRank)}), and ` : ""}most people with prediabetes do not know it. An A1c or fasting glucose test takes one visit; CDC-recognized lifestyle programs are free or low cost in many areas.`,
      ckm: "Catching prediabetes keeps CKM syndrome at Stage 1, where it is most reversible.",
    });
  }
  if (has("ckd")) {
    actions.push({
      id: "ckm-sick-day", category: "CKM care", points: 15, href: NKF_HEAT, linkLabel: "NKF guidance",
      title: "Agree an NSAID-free, sick-day medicine plan",
      detail: "Ask your care team which medicines to pause when you are vomiting, have diarrhea or cannot drink, and keep acetaminophen rather than ibuprofen or naproxen for pain. Bring the plan to every pharmacy and urgent-care visit.",
      ckm: "Dehydration plus NSAIDs or some blood-pressure medicines is a common, preventable cause of acute kidney injury.",
    });
  }
  const cardiacRank = Math.max(rank.chd ?? -1, rank.stroke ?? -1);
  if (!anyCondition && cardiacRank >= 75) {
    actions.push({
      id: "ckm-community-screening", category: "CKM care", points: 10, href: HRSA_CENTERS, linkLabel: "Find a health center",
      title: "Book a blood-pressure and cholesterol check nearby",
      detail: `Community heart-disease and stroke estimates for this ZIP rank in the top quarter of US ZCTAs (CHD ${formatEstimate(health.chd)}, stroke ${formatEstimate(health.stroke)}). HRSA-funded health centers provide screening on a sliding fee scale.`,
      ckm: "Area prevalence reflects shared risk factors—food, activity, air, water—that also affect you.",
    });
  }

  /* ---------- One Health ---------- */
  const smokeNow = liveAir ? liveAir.aqi > 100 : false;
  if (smokeNow || airAlert || (air && air.annualPM25 > 9)) {
    actions.push({
      id: "oh-pets-smoke", category: "One Health", tag: smokeNow || airAlert ? "Today" : undefined, points: 10, href: EPA_PETS_SMOKE, linkLabel: "EPA: pets and smoke",
      title: smokeNow ? `Keep pets indoors while the AQI is ${liveAir!.aqi}` : "Plan to keep pets indoors on smoke days",
      detail: "EPA: reduce animals' smoke exposure as you would your own—keep pets inside, bring outdoor animals into a cooler, less smoky room, and call a vet for coughing, red or watery eyes or nasal discharge. Older animals and those with heart or lung disease are most at risk.",
      ckm: "The same particle pollution that strains your heart strains theirs; one plan protects the household.",
    });
  }
  if (weather && heatBand(Math.max(weather.feelsLikeF, weather.todayMaxFeelsLikeF ?? -Infinity))) {
    actions.push({
      id: "oh-pets-heat", category: "One Health", tag: "Today", points: 10, href: AVMA_HEAT, linkLabel: "AVMA warm-weather safety",
      title: "Walk dogs early and never leave animals in a parked car",
      detail: `With a feels-like high near ${Math.round(Math.max(weather.feelsLikeF, weather.todayMaxFeelsLikeF ?? weather.feelsLikeF))}°F, exercise pets in the coolest hours, test pavement with your hand, and keep water and shade available. Heavy panting, drooling or weakness are signs of heat stroke.`,
      ckm: "Heat that is dangerous for people with heart or kidney disease is dangerous for animals in the same home.",
    });
  }
  if (month >= 5 && month <= 10) {
    actions.push({
      id: "oh-algal-blooms", category: "One Health", points: 10, href: EPA_HABS, linkLabel: "EPA harmful algal blooms",
      title: "Check for algal-bloom advisories before lake or pond outings",
      detail: "Warm, nutrient-rich water grows cyanobacteria whose toxins can kill dogs within hours and sicken people. Keep pets and children out of scummy, green or foul-smelling water, rinse animals that swim, and report blooms to the state.",
      ckm: "Cyanotoxins target the liver and kidneys—organs already under strain in CKM syndrome.",
    });
  }
  actions.push({
    id: "oh-medicine-takeback", category: "One Health", points: 10, href: EPA_MEDS, linkLabel: "EPA medicine disposal",
    title: "Return unused blood-pressure, diabetes and heart medicines to a take-back site",
    detail: "Flushed or trashed pharmaceuticals reach rivers and drinking-water sources and harm aquatic life. Most pharmacies and police stations host year-round drop boxes; if none is nearby, mix pills with coffee grounds in a sealed bag before trashing.",
    ckm: "CKM medicines are among the most frequently detected pharmaceuticals in US surface water.",
  });
  actions.push({
    id: "oh-burn-wise", category: "One Health", points: 10, href: BURN_WISE, linkLabel: "EPA Burn Wise",
    title: liveAir && liveAir.aqi > 100 ? `Skip wood burning and idling while the AQI is ${liveAir.aqi}` : "Burn only dry wood—and nothing on poor-air days",
    detail: `Residential wood smoke and idling engines are the main sources neighbors control. ${air ? `With an annual PM₂.₅ of ${fmt1(air.annualPM25)} µg/m³ nearby, ` : ""}use seasoned wood in an EPA-certified stove, never burn trash, and pause burning when the AQI passes 100.`,
    ckm: "Wood smoke is fine-particle pollution: the same exposure linked to heart attacks and kidney decline.",
  });
  actions.push({
    id: "oh-source-water", category: "One Health", points: 10, href: waterMode === "private" ? WELL_GUIDE : SOURCE_WATER, linkLabel: waterMode === "private" ? "EPA wellhead protection" : "EPA source-water protection",
    title: waterMode === "private" ? "Keep septic, fertilizer and animal waste away from the wellhead" : `Protect the source water behind ${profile.waterSystems[0]?.name ?? "your utility"}`,
    detail: waterMode === "private"
      ? "Pump the septic tank on schedule, keep livestock and pet waste, fuel and pesticides at least 50 feet from the well, and cap the casing above grade so runoff cannot enter."
      : "Lawn chemicals, pet waste, septic leaks and dumped oil end up in the rivers and aquifers utilities treat. Pick up pet waste, limit fertilizer, and report spills or illegal dumping to the state environmental agency.",
    ckm: "Cleaner source water lowers nitrate, metals and PFAS that burden the kidneys and raise blood pressure.",
  });
  actions.push({
    id: "oh-share-plan", category: "One Health", points: 5, href: CDC_ONE_HEALTH, linkLabel: "CDC: One Health",
    title: "Share today's air and heat plan with the household, including pets and older relatives",
    detail: "One Health treats people, animals and the shared environment as one system. The AQI, heat and water steps above apply to everyone under the same roof; agree who checks AirNow and NWS alerts each morning.",
  });

  return actions;
}

export function calculateEnviroHealth(actions: ActionItem[], checkedIds: Set<string>): number {
  const possible = actions.reduce((sum, action) => sum + action.points, 0);
  if (!possible) return 0;
  const completed = actions.reduce((sum, action) => sum + (checkedIds.has(action.id) ? action.points : 0), 0);
  return Math.round((completed / possible) * 100);
}

export function formatEstimate(value: Estimate): string {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

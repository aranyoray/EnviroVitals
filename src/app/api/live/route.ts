import { NextRequest, NextResponse } from "next/server";
import type { LiveAir, LiveAlert, LiveConditions, LiveWeather } from "@/lib/profile";
import { aqiBand } from "@/lib/profile";

// Hourly AirNow observations come from EPA's public file products (no API key); NWS alerts and
// Open-Meteo weather are keyless as well. Every source fails independently to null so the panel
// can show the unavailable state in gray instead of guessing.
const AIRNOW_FILE = "https://files.airnowtech.org/airnow/today/reportingarea.dat";
const USER_AGENT = "EnviroVitals/1.0 (https://github.com/aranyoray/EnviroVitals)";
const AIRNOW_TTL_MS = 10 * 60 * 1000;
const MAX_AREA_MILES = 60;

type ReportingRow = {
  validDate: string;
  validTime: string;
  timeZone: string;
  sequence: number;
  type: "O" | "F";
  primary: boolean;
  pollutant: string;
  aqi: number | null;
  category: string;
  actionDay: boolean;
  agency: string;
};

type ReportingArea = {
  name: string;
  state: string;
  lat: number;
  lon: number;
  observations: ReportingRow[];
  forecasts: ReportingRow[];
  actionDay: boolean;
  agency: string | null;
};

// The file is ~1.5 MB, above Next's per-entry data-cache limit, so it is parsed once per instance and reused.
let airnowCache: { at: number; areas: ReportingArea[] } | null = null;
let airnowPending: Promise<ReportingArea[]> | null = null;

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseFileDate(value: string): number | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return Date.UTC(2000 + Number(match[3]), Number(match[1]) - 1, Number(match[2]));
}

/** Pipe-delimited AirNow reporting-area rows: issue date, valid date, time, zone, sequence, type (Y/O/F), primary, area, state, lat, lon, pollutant, AQI, category, action day, discussion, agency. */
function parseReportingAreas(text: string): ReportingArea[] {
  const areas = new Map<string, ReportingArea>();
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const field = line.split("|");
    if (field.length < 17) continue;
    const type = field[5];
    if (type !== "O" && type !== "F") continue;
    const lat = Number(field[9]);
    const lon = Number(field[10]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const aqiText = field[12].trim();
    const aqi = aqiText === "" ? null : Number(aqiText);
    if (aqi !== null && !Number.isFinite(aqi)) continue;
    const issued = parseFileDate(field[0]);
    const valid = parseFileDate(field[1]);
    // Observations older than a day belong to areas that stopped reporting; skip them.
    if (type === "O" && issued !== null && valid !== null && issued - valid > 24 * 60 * 60 * 1000) continue;
    const key = `${field[7]}|${field[8]}`;
    let area = areas.get(key);
    if (!area) {
      area = { name: field[7].trim(), state: field[8].trim(), lat, lon, observations: [], forecasts: [], actionDay: false, agency: null };
      areas.set(key, area);
    }
    const row: ReportingRow = {
      validDate: field[1].trim(),
      validTime: field[2].trim(),
      timeZone: field[3].trim(),
      sequence: Number(field[4]),
      type,
      primary: field[6].trim() === "Y",
      pollutant: field[11].trim(),
      aqi,
      category: field[13].trim(),
      actionDay: field[14].trim().toLowerCase() === "yes",
      agency: field[16].trim(),
    };
    if (type === "O") area.observations.push(row);
    else area.forecasts.push(row);
    if (row.actionDay) area.actionDay = true;
    if (!area.agency && row.agency) area.agency = row.agency;
  }
  return [...areas.values()].filter((area) => area.observations.some((row) => row.aqi !== null));
}

async function loadAirNowAreas(): Promise<ReportingArea[]> {
  if (airnowCache && Date.now() - airnowCache.at < AIRNOW_TTL_MS) return airnowCache.areas;
  if (airnowPending) return airnowPending;
  airnowPending = (async () => {
    try {
      const response = await fetch(AIRNOW_FILE, {
        cache: "no-store",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`AirNow file returned ${response.status}`);
      const areas = parseReportingAreas(await response.text());
      if (!areas.length) throw new Error("AirNow file had no observations");
      airnowCache = { at: Date.now(), areas };
      return areas;
    } catch (issue) {
      if (airnowCache) return airnowCache.areas;
      throw issue;
    } finally {
      airnowPending = null;
    }
  })();
  return airnowPending;
}

function nearestAir(lat: number, lon: number, areas: ReportingArea[]): LiveAir | null {
  let best: ReportingArea | null = null;
  let bestDistance = MAX_AREA_MILES;
  for (const area of areas) {
    const distance = haversineMiles(lat, lon, area.lat, area.lon);
    if (distance < bestDistance) {
      best = area;
      bestDistance = distance;
    }
  }
  if (!best) return null;
  const observations = best.observations.filter((row) => row.aqi !== null);
  if (!observations.length) return null;
  const primary = observations.find((row) => row.primary) ?? observations.reduce((top, row) => (row.aqi! > top.aqi! ? row : top));
  const tomorrowRows = best.forecasts.filter((row) => row.sequence === 1 && row.aqi !== null).sort((a, b) => b.aqi! - a.aqi!);
  const tomorrow = tomorrowRows.find((row) => row.primary) ?? tomorrowRows[0] ?? null;
  return {
    aqi: primary.aqi!,
    category: primary.category || aqiBand(primary.aqi!).name,
    pollutant: primary.pollutant,
    areaName: best.name,
    state: best.state || null,
    observedAt: [primary.validDate, primary.validTime, primary.timeZone].filter(Boolean).join(" ") || null,
    distanceMiles: Math.round(bestDistance * 10) / 10,
    actionDay: best.actionDay,
    agency: best.agency,
    others: observations.filter((row) => row !== primary).map((row) => ({ pollutant: row.pollutant, aqi: row.aqi!, category: row.category })),
    tomorrow: tomorrow ? { aqi: tomorrow.aqi, category: tomorrow.category || aqiBand(tomorrow.aqi!).name, pollutant: tomorrow.pollutant } : null,
    source: "airnow",
  };
}

type MeteoCurrent = Record<string, number | string | null | undefined>;

async function fetchWeather(lat: number, lon: number): Promise<LiveWeather | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m",
    daily: "apparent_temperature_max,apparent_temperature_min",
    forecast_days: "2",
    temperature_unit: "fahrenheit",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const current = (data.current ?? {}) as MeteoCurrent;
  const daily = (data.daily ?? {}) as { apparent_temperature_max?: (number | null)[]; apparent_temperature_min?: (number | null)[] };
  const tempF = Number(current.temperature_2m);
  const feelsLikeF = Number(current.apparent_temperature);
  if (!Number.isFinite(tempF) || !Number.isFinite(feelsLikeF) || typeof current.time !== "string") return null;
  const number = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  return {
    tempF,
    feelsLikeF,
    humidity: number(current.relative_humidity_2m as number | null | undefined),
    todayMaxFeelsLikeF: number(daily.apparent_temperature_max?.[0]),
    todayMinFeelsLikeF: number(daily.apparent_temperature_min?.[0]),
    tomorrowMaxFeelsLikeF: number(daily.apparent_temperature_max?.[1]),
    observedAt: current.time,
    timezone: typeof data.timezone_abbreviation === "string" ? data.timezone_abbreviation : null,
  };
}

/** Model-based (CAMS) estimate used only where no AirNow reporting area is within range. */
async function fetchModelAir(lat: number, lon: number): Promise<LiveAir | null> {
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    current: "us_aqi,us_aqi_pm2_5,us_aqi_pm10,us_aqi_ozone,us_aqi_nitrogen_dioxide",
    hourly: "us_aqi",
    forecast_days: "2",
    timezone: "auto",
  });
  const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`, {
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const current = (data.current ?? {}) as MeteoCurrent;
  const aqi = Number(current.us_aqi);
  if (!Number.isFinite(aqi)) return null;
  const components: [string, number][] = [
    ["PM2.5", Number(current.us_aqi_pm2_5)],
    ["PM10", Number(current.us_aqi_pm10)],
    ["OZONE", Number(current.us_aqi_ozone)],
    ["NO2", Number(current.us_aqi_nitrogen_dioxide)],
  ];
  const dominant = components.filter(([, value]) => Number.isFinite(value)).sort((a, b) => b[1] - a[1])[0];
  const hourly = (data.hourly?.us_aqi ?? []) as (number | null)[];
  const tomorrowValues = hourly.slice(24, 48).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const tomorrowMax = tomorrowValues.length ? Math.max(...tomorrowValues) : null;
  return {
    aqi: Math.round(aqi),
    category: aqiBand(aqi).name,
    pollutant: dominant ? dominant[0] : "PM2.5",
    areaName: "Model estimate",
    state: null,
    observedAt: typeof current.time === "string" ? current.time.replace("T", " ") : null,
    distanceMiles: 0,
    actionDay: false,
    agency: "Open-Meteo (CAMS model)",
    others: [],
    tomorrow: tomorrowMax === null ? null : { aqi: Math.round(tomorrowMax), category: aqiBand(tomorrowMax).name, pollutant: null },
    source: "open-meteo",
  };
}

const SEVERITY_RANK: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** NWS timestamps carry the local offset, so format them as the alert area's local time. */
function formatLocal(iso: string | null | undefined): string | null {
  if (typeof iso !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return null;
  const hours = Number(match[4]);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${hour12}:${match[5]} ${suffix} local time`;
}

type AlertProperties = {
  id?: string;
  event?: string;
  severity?: string;
  urgency?: string;
  headline?: string | null;
  expires?: string | null;
  ends?: string | null;
  senderName?: string | null;
};

async function fetchAlerts(lat: number, lon: number): Promise<LiveAlert[] | null> {
  const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}&status=actual&message_type=alert,update`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  const features = Array.isArray(data.features) ? (data.features as Array<{ properties?: AlertProperties }>) : [];
  const now = Date.now();
  const pointUrl = `https://forecast.weather.gov/MapClick.php?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const byEvent = new Map<string, LiveAlert>();
  for (const feature of features) {
    const item = feature.properties ?? {};
    if (typeof item.event !== "string") continue;
    const until = item.ends ?? item.expires ?? null;
    const untilMs = until ? Date.parse(until) : Number.NaN;
    if (Number.isFinite(untilMs) && untilMs < now) continue;
    const alert: LiveAlert = {
      id: item.id ?? `${item.event}-${byEvent.size}`,
      event: item.event,
      severity: item.severity ?? "Unknown",
      urgency: item.urgency ?? "Unknown",
      headline: item.headline ?? null,
      expires: formatLocal(until),
      sender: item.senderName ?? null,
      url: pointUrl,
    };
    const existing = byEvent.get(alert.event);
    if (!existing || (SEVERITY_RANK[alert.severity] ?? 4) < (SEVERITY_RANK[existing.severity] ?? 4)) byEvent.set(alert.event, alert);
  }
  return [...byEvent.values()].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 4) - (SEVERITY_RANK[b.severity] ?? 4));
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 17 || lat > 72 || lon < -180 || lon > -64) {
    return NextResponse.json({ error: "Provide a latitude and longitude inside the United States." }, { status: 400 });
  }
  const [areas, weather, alerts] = await Promise.allSettled([loadAirNowAreas(), fetchWeather(lat, lon), fetchAlerts(lat, lon)]);
  let air = areas.status === "fulfilled" ? nearestAir(lat, lon, areas.value) : null;
  if (!air) {
    try {
      air = await fetchModelAir(lat, lon);
    } catch {
      air = null;
    }
  }
  const conditions: LiveConditions = {
    air,
    weather: weather.status === "fulfilled" ? weather.value : null,
    alerts: alerts.status === "fulfilled" ? alerts.value : null,
    fetchedAt: new Date().toISOString(),
  };
  return NextResponse.json(conditions, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
  });
}

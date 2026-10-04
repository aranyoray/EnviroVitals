import { NextRequest, NextResponse } from "next/server";
import placesData from "@/data/places-zcta.json";
import airData from "@/data/air-monitors-2025.json";
import ucmrData from "@/data/ucmr5-by-pws.json";
import type { AirMonitor, LocationProfile, UcmrSummary, WaterSystem } from "@/lib/profile";

type PlaceRow = {
  z: string;
  g: [number, number];
  p: number;
  a: number;
  c: {
    chd: number | null;
    stroke: number | null;
    bp: number | null;
    chol: number | null;
    diabetes: number | null;
    obesity: number | null;
  };
  kidney: number | null;
};

type MonitorRow = {
  id: string;
  lat: number;
  lon: number;
  mean: number;
  city: string;
  county?: string | null;
  state?: string | null;
  observations: number;
};

type UcmrRow = {
  results: number;
  detections: number;
  latest: string | null;
  positive: Array<{ name: string; detections: number; max: number; latest: string | null; unit: string }>;
};

type WaterAttributes = {
  PWSID?: string;
  PWS_Name?: string;
  Population_Served_Count?: number;
  Service_Area_Type?: string;
  Symbology_Field?: string;
  Model_Method?: string;
  Original_Data_Provider?: string;
};

const placeByZip = new Map((placesData.records as PlaceRow[]).map((row) => [row.z, row]));
const waterRegionsByState: Record<string, string> = {
  CT: "01", ME: "01", MA: "01", NH: "01", RI: "01", VT: "01",
  NJ: "02", NY: "02", PR: "02", VI: "02",
  DE: "03", DC: "03", MD: "03", PA: "03", VA: "03", WV: "03",
  AL: "04", FL: "04", GA: "04", KY: "04", MS: "04", NC: "04", SC: "04", TN: "04",
  IL: "05", IN: "05", MI: "05", MN: "05", OH: "05", WI: "05",
  AR: "06", LA: "06", NM: "06", OK: "06", TX: "06",
  IA: "07", KS: "07", MO: "07", NE: "07",
  CO: "08", MT: "08", ND: "08", SD: "08", UT: "08", WY: "08",
  AZ: "09", CA: "09", HI: "09", NV: "09",
  AK: "10", ID: "10", OR: "10", WA: "10",
};
const ucmrById = ucmrData.systems as Record<string, UcmrRow>;

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.7613 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearbyMonitors(lat: number, lon: number): AirMonitor[] {
  const monitors = airData.monitors as MonitorRow[];
  return monitors
    .map((monitor) => ({ monitor, distance: haversineMiles(lat, lon, monitor.lat, monitor.lon) }))
    .filter(({ distance }) => distance <= 50)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 30)
    .map(({ monitor, distance }) => ({
      latitude: monitor.lat,
      longitude: monitor.lon,
      annualPM25: monitor.mean,
      year: 2025,
      monitorName: monitor.city,
      county: monitor.county ?? null,
      state: monitor.state ?? null,
      siteId: monitor.id,
      distanceMiles: Math.round(distance * 10) / 10,
      observations: monitor.observations,
    }));
}

function findUcmrSystem(pwsId: string): UcmrRow | null {
  const direct = ucmrById[pwsId];
  if (direct) return direct;
  const match = /^([A-Z]{2})(\d{7})$/.exec(pwsId);
  if (!match) return null;
  const region = waterRegionsByState[match[1]];
  return region ? (ucmrById[`${region}${match[2]}`] ?? null) : null;
}

async function lookupPlace(zip: string): Promise<{
  city: string | null;
  state: string | null;
  stateAbbr: string | null;
  latitude: number | null;
  longitude: number | null;
}> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zip}`, {
      next: { revalidate: 30 * 24 * 60 * 60 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { city: null, state: null, stateAbbr: null, latitude: null, longitude: null };
    const data = await response.json();
    const first = data.places?.[0];
    const latitude = Number(first?.latitude);
    const longitude = Number(first?.longitude);
    return {
      city: first?.["place name"] ?? null,
      state: first?.state ?? null,
      stateAbbr: first?.["state abbreviation"] ?? null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };
  } catch {
    return { city: null, state: null, stateAbbr: null, latitude: null, longitude: null };
  }
}

async function lookupWaterSystems(lat: number, lon: number): Promise<{ systems: WaterSystem[]; available: boolean }> {
  const base = "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Water_System_Boundaries/FeatureServer/0/query";
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "PWSID,PWS_Name,Population_Served_Count,Service_Area_Type,Symbology_Field,Model_Method,Original_Data_Provider",
    returnGeometry: "false",
    f: "json",
  });
  try {
    const response = await fetch(`${base}?${params.toString()}`, {
      next: { revalidate: 7 * 24 * 60 * 60 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return { systems: [], available: false };
    const data = await response.json();
    if (data.error) return { systems: [], available: false };
    const features = Array.isArray(data.features) ? data.features as Array<{ attributes?: WaterAttributes }> : [];
    const mapped = features.flatMap(({ attributes }) => {
      const item = attributes ?? {};
      const pwsId = item.PWSID?.trim();
      if (!pwsId) return [];
      const summary = findUcmrSystem(pwsId);
      const ucmr5: UcmrSummary | null = summary
        ? {
            results: summary.results,
            detections: summary.detections,
            latest: summary.latest,
            positive: summary.positive,
          }
        : null;
      return [{
        pwsId,
        name: item.PWS_Name?.trim() || "Public water system",
        populationServed: Number.isFinite(item.Population_Served_Count) ? item.Population_Served_Count! : null,
        serviceAreaType: item.Service_Area_Type ?? null,
        boundaryType: item.Symbology_Field ?? null,
        modelMethod: item.Model_Method ?? null,
        dataProvider: item.Original_Data_Provider ?? null,
        ucmr5,
      } satisfies WaterSystem];
    });
    const unique = [...new Map(mapped.map((item) => [item.pwsId, item])).values()];
    const systems = unique.sort((a, b) => {
      const aWholesale = a.serviceAreaType?.toLowerCase().includes("wholesaler") ? 1 : 0;
      const bWholesale = b.serviceAreaType?.toLowerCase().includes("wholesaler") ? 1 : 0;
      if (aWholesale !== bWholesale) return aWholesale - bWholesale;
      const aVerified = a.boundaryType?.toLowerCase().includes("sourced") ? 0 : 1;
      const bVerified = b.boundaryType?.toLowerCase().includes("sourced") ? 0 : 1;
      if (aVerified !== bVerified) return aVerified - bVerified;
      return (b.populationServed ?? 0) - (a.populationServed ?? 0);
    }).slice(0, 5);
    return { systems, available: true };
  } catch {
    return { systems: [], available: false };
  }
}

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip")?.trim() ?? "";
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "Enter a five-digit ZIP code." }, { status: 400 });
  }
  const placeRow = placeByZip.get(zip);
  const place = await lookupPlace(zip);
  const latitude = placeRow?.g[0] ?? place.latitude;
  const longitude = placeRow?.g[1] ?? place.longitude;
  if (latitude === null || longitude === null) {
    return NextResponse.json({ error: "This ZIP could not be located. Check the five-digit code and try again." }, { status: 404 });
  }

  const waterLookup = await lookupWaterSystems(latitude, longitude);
  const airMonitors = nearbyMonitors(latitude, longitude);
  const profile: LocationProfile = {
    zip,
    ...place,
    latitude,
    longitude,
    population: placeRow?.p ?? 0,
    adultPopulation: placeRow?.a ?? 0,
    healthAvailable: Boolean(placeRow),
    health: {
      chd: placeRow?.c.chd ?? null,
      stroke: placeRow?.c.stroke ?? null,
      bloodPressure: placeRow?.c.bp ?? null,
      highCholesterol: placeRow?.c.chol ?? null,
      diabetes: placeRow?.c.diabetes ?? null,
      obesity: placeRow?.c.obesity ?? null,
      kidneyDisease: placeRow?.kidney ?? null,
    },
    healthSource: {
      release: placesData.meta.placesRelease,
      brfssYear: placesData.meta.placesBrfssYear,
      kidneyRelease: placesData.meta.kidneyRelease,
      kidneyBrfssYear: placesData.meta.kidneyBrfssYear,
    },
    air: airMonitors[0] ?? null,
    airMonitors,
    waterSystems: waterLookup.systems,
    waterLookupAvailable: waterLookup.available,
    dataUpdated: placesData.meta.builtAt,
  };
  return NextResponse.json(profile, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
  });
}

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

export type WaterMode = "public" | "private" | "unknown";

export interface ActionItem {
  id: string;
  category: "Air" | "Water";
  title: string;
  detail: string;
  points: number;
  href?: string;
  linkLabel?: string;
  tag?: string;
}

const AIR_GUIDE = "https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home";
const WELL_GUIDE = "https://www.epa.gov/privatewells/protect-your-homes-water";
const PFAS_FILTER_GUIDE = "https://www.epa.gov/water-research/identifying-drinking-water-filters-certified-reduce-pfas";
const LEAD_FILTER_GUIDE = "https://www.epa.gov/water-research/consumer-tool-identifying-point-use-and-pitcher-filters-certified-reduce-lead";
const HOME_WATER_TEST = "https://www.epa.gov/ground-water-and-drinking-water/home-drinking-water-testing";
const UCMR_GUIDE = "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder";
const CCR_GUIDE = "https://www.epa.gov/ccr";

export function buildActionPlan(profile: LocationProfile, waterMode: WaterMode): ActionItem[] {
  const actions: ActionItem[] = [];
  const air = profile.air;

  if (air && air.annualPM25 > 9) {
    actions.push({
      id: "air-room-cleaner",
      category: "Air",
      title: "Size a HEPA air cleaner for one room",
      detail: `The nearest EPA monitor measured ${air.annualPM25.toFixed(1)} µg/m³ annual PM2.5 in ${air.year}, above the 9.0 µg/m³ screening reference. One year of data is not an attainment determination. For a portable unit, choose a smoke CADR at least two-thirds of room area in square feet; avoid ozone-generating models.`,
      points: 25,
      href: AIR_GUIDE,
      linkLabel: "EPA sizing guide",
      tag: "Priority",
    });
  } else {
    actions.push({
      id: "air-room-cleaner",
      category: "Air",
      title: "Prepare one room for smoke days",
      detail: air
        ? `The nearest EPA monitor measured ${air.annualPM25.toFixed(1)} µg/m³ annual PM2.5 in ${air.year}. Indoor sources and short smoke events are not represented by this annual outdoor value. A room-sized HEPA cleaner can help during high-AQI days.`
        : "No EPA PM2.5 monitor was found within 50 miles of this ZIP centroid. Check current AQI during smoke events and size any portable HEPA cleaner to the room where you spend the most time.",
      points: 20,
      href: AIR_GUIDE,
      linkLabel: "EPA air-cleaner guide",
    });
  }

  actions.push({
    id: "air-hvac-filter",
    category: "Air",
    title: "Check the central HVAC filter fit",
    detail: "Use MERV 13 or the highest-rated filter your system can accommodate. Confirm the size and airflow requirements in the equipment manual; do not force a higher-resistance filter into an incompatible system.",
    points: 15,
    href: AIR_GUIDE,
    linkLabel: "EPA filter guidance",
  });

  if (waterMode === "private") {
    actions.push({
      id: "well-annual-test",
      category: "Water",
      title: "Book the annual private-well test",
      detail: "Ask a state-certified drinking-water lab to test for total coliform bacteria, nitrate, total dissolved solids, and pH. Your health department can suggest other contaminants common to local groundwater.",
      points: 30,
      href: WELL_GUIDE,
      linkLabel: "EPA well-testing guide",
      tag: "Annual",
    });
    actions.push({
      id: "well-treatment-after-results",
      category: "Water",
      title: "Match any treatment to a lab result",
      detail: "Keep the lab report, then ask the lab or health department what treatment fits the contaminant and measured level. Do not choose a filter from neighborhood data alone.",
      points: 20,
      href: WELL_GUIDE,
      linkLabel: "Testing and treatment",
    });
  } else if (waterMode === "public" && profile.waterSystems[0]) {
    const system = profile.waterSystems[0];
    const ucmr = system.ucmr5;
    actions.push({
      id: "water-confirm-system",
      category: "Water",
      title: "Confirm this provider serves your address",
      detail: `${system.name} overlaps the ZIP centroid${system.serviceAreaType ? ` (${system.serviceAreaType.toLowerCase()} service area)` : ""}. Check the provider on your bill or with the utility; ZIP-level service boundaries may not identify the system at a specific home.`,
      points: 20,
      href: "https://gispub.epa.gov/serviceareas/",
      linkLabel: "EPA service-area map",
    });
    actions.push({
      id: "water-read-report",
      category: "Water",
      title: "Open the latest Consumer Confidence Report",
      detail: "Review the utility’s annual report for regulated contaminants, monitoring dates, and any notices. The EPA system record and UCMR samples do not measure water at your kitchen tap.",
      points: 20,
      href: CCR_GUIDE,
      linkLabel: "Find a water-quality report",
    });
    if (ucmr && ucmr.detections > 0) {
      const detections = ucmr.positive.slice(0, 3).map((entry) => entry.name).join(", ");
      actions.push({
        id: "water-review-detections",
        category: "Water",
        title: `Review ${ucmr.positive.length} detected contaminant${ucmr.positive.length === 1 ? "" : "s"}`,
        detail: `EPA UCMR 5 records report above-reporting-level results for ${detections}${ucmr.positive.length > 3 ? ` and ${ucmr.positive.length - 3} more` : ""}. Check the exact sample dates and provider response before deciding whether home treatment is appropriate.`,
        points: 20,
        href: UCMR_GUIDE,
        linkLabel: "EPA UCMR 5 results",
        tag: "Review",
      });
      const pfas = ucmr.positive.some((entry) => /PFAS|PFOA|PFOS|PFNA|PFHxS|PFBS|GenX/i.test(entry.name));
      if (pfas) {
        actions.push({
          id: "water-pfas-filter",
          category: "Water",
          title: "Match any PFAS filter to the exact claim",
          detail: "If you choose a point-of-use filter, verify that the exact model is certified for the PFAS listed in the report under NSF/ANSI 53 or NSF/ANSI 58. EPA says current certifications do not by themselves show removal to every EPA drinking-water standard level.",
          points: 20,
          href: PFAS_FILTER_GUIDE,
          linkLabel: "EPA PFAS filter guidance",
        });
      }
    } else if (ucmr && ucmr.results > 0) {
      actions.push({
        id: "water-review-samples",
        category: "Water",
        title: "Review what EPA sampled for this system",
        detail: `EPA UCMR 5 includes ${ucmr.results.toLocaleString()} treated-water analytical results for this system, with no reported values above the rule’s minimum reporting levels. This does not describe every contaminant, every period, or your home’s plumbing.`,
        points: 15,
        href: UCMR_GUIDE,
        linkLabel: "EPA UCMR 5 results",
      });
    } else {
      actions.push({
        id: "water-check-ucmr",
        category: "Water",
        title: "Ask the utility about recent PFAS testing",
        detail: "No UCMR 5 record was matched to this system. EPA did not select every small system for this monitoring cycle, so a missing record is not a non-detection. Ask your provider for its latest report and test results.",
        points: 20,
        href: UCMR_GUIDE,
        linkLabel: "EPA UCMR 5 information",
      });
    }
    actions.push({
      id: "water-lead-test",
      category: "Water",
      title: "Check for lead in the home plumbing",
      detail: "Confirm the home’s build year and service-line material. If the home predates 1986 or the plumbing is unknown, ask the utility or state for a certified tap-water lead test; a system-wide report cannot rule out lead from household pipes.",
      points: 20,
      href: HOME_WATER_TEST,
      linkLabel: "EPA home water-testing guide",
    });
    actions.push({
      id: "water-lead-filter-after-test",
      category: "Water",
      title: "If lead is detected, match a certified point-of-use filter",
      detail: "Only after a tap test identifies lead, check that the exact pitcher or faucet model has a third-party lead-reduction claim under NSF/ANSI 53 and 42. Follow its replacement schedule.",
      points: 10,
      href: LEAD_FILTER_GUIDE,
      linkLabel: "EPA certified-filter guide",
    });
  } else {
    actions.push({
      id: "water-identify-source",
      category: "Water",
      title: profile.waterLookupAvailable ? "Identify the water source at your home" : "Confirm the water provider for your address",
      detail: profile.waterLookupAvailable
        ? "The ZIP centroid did not match a public-water service area. Check your bill or ask your landlord whether the address uses a public utility or a private well."
        : "EPA’s service-area layer did not return data for this lookup. Check your bill or ask the property owner whether the address uses a public utility or a private well.",
      points: 20,
      href: "https://gispub.epa.gov/serviceareas/",
      linkLabel: "EPA service-area map",
    });
    actions.push({
      id: "water-find-report",
      category: "Water",
      title: "Request a report or certified well test",
      detail: "For public water, ask the provider for its Consumer Confidence Report and PWS ID. For a private well, test annually through a state-certified lab.",
      points: 25,
      href: WELL_GUIDE,
      linkLabel: "EPA water guidance",
    });
  }

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

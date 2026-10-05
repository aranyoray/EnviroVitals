/** Opportunity Atlas inspired red-to-yellow-to-teal steps, sampled from its map legend. */
export const COUNTY_COLORS = [
  "#8d2c32", "#a75645", "#c58366", "#d8a378", "#eaca9a",
  "#faf3be", "#e2eabf", "#b9ccb1", "#92afa4", "#6e9196", "#4f7484",
] as const;

export const NO_COUNTY_DATA = "#d4d8d5";

/** A higher EnviroVitals index uses the red end of the reference palette. */
export function countyColor(index: number | null): string {
  if (index === null || !Number.isFinite(index)) return NO_COUNTY_DATA;
  const clamped = Math.max(0, Math.min(100, index));
  return COUNTY_COLORS[Math.min(10, Math.floor((100 - clamped) / 100 * COUNTY_COLORS.length))];
}

export interface CountyProperties {
  fips: string;
  name: string;
  state: string;
  index: number | null;
  zipCount: number;
  partialCount: number;
  sampleZip: string | null;
}

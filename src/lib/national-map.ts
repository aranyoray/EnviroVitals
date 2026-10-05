/** Compact, separately fetched geography avoids enormous inferred JSON types. */
export interface NationalState {
  code: string;
  name: string;
  index: number | null;
  partial: boolean;
  pm25: number | null;
  chd: number | null;
  kidney: number | null;
  diabetes: number | null;
  obesity: number | null;
}
/** Coverage bits: 1 = local health, 2 = state health fallback, 4 = missing component. */
export type ZipPoint = [zip: string, latitude: number, longitude: number, stateIndex: number, index: number | null, coverage: number];
export interface NationalMapData {
  meta: { version: number; pointCount: number; label: string };
  states: NationalState[];
  points: ZipPoint[];
}

export function indexColor(index: number | null): [number, number, number] {
  if (index === null) return [142, 151, 148];
  const stops = [[48, 132, 122], [157, 185, 107], [229, 181, 90], [202, 92, 70]];
  const t = Math.max(0, Math.min(1, index / 100)) * 3;
  const a = Math.min(2, Math.floor(t));
  return stops[a].map((v, i) => Math.round(v + (stops[a + 1][i] - v) * (t - a))) as [number, number, number];
}

export function projectZip(point: ZipPoint) {
  const sine = Math.sin(point[1] * Math.PI / 180);
  return {
    point,
    x: (point[2] + 180) / 360,
    y: 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI),
  };
}

/** Weighted mean, not point density: cities do not get a higher index for having more ZIPs. */
export function paintHeat(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: { x: number; y: number; value: number }[],
  opacity: number,
) {
  const step = Math.max(4, Math.ceil(Math.sqrt(width * height / 150000)));
  const w = Math.ceil(width / step), h = Math.ceil(height / step);
  const totals = new Float32Array(w * h);
  const weights = new Float32Array(w * h);
  const bins = new Map<string, { x: number; y: number; sum: number; count: number }>();
  for (const p of points) {
    const x = Math.round(p.x / 12) * 12 / step;
    const y = Math.round(p.y / 12) * 12 / step;
    const key = `${x}:${y}`;
    const bin = bins.get(key);
    if (bin) { bin.sum += p.value; bin.count++; }
    else bins.set(key, { x, y, sum: p.value, count: 1 });
  }
  const radius = Math.ceil(44 / step), sigma = 18 / step;
  for (const p of bins.values()) {
    const value = p.sum / p.count;
    for (let y = Math.max(0, Math.floor(p.y - radius)); y <= Math.min(h - 1, p.y + radius); y++) {
      for (let x = Math.max(0, Math.floor(p.x - radius)); x <= Math.min(w - 1, p.x + radius); x++) {
        const d = (x - p.x) ** 2 + (y - p.y) ** 2;
        if (d > radius ** 2) continue;
        const weight = Math.exp(-d / (2 * sigma ** 2));
        const i = y * w + x;
        totals[i] += value * weight;
        weights[i] += weight;
      }
    }
  }
  const raster = document.createElement('canvas');
  raster.width = w; raster.height = h;
  const rasterContext = raster.getContext('2d');
  if (!rasterContext) return;
  const pixels = rasterContext.createImageData(w, h);
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] < 0.02) continue;
    const rgb = indexColor(totals[i] / weights[i]);
    pixels.data[i * 4] = rgb[0];
    pixels.data[i * 4 + 1] = rgb[1];
    pixels.data[i * 4 + 2] = rgb[2];
    pixels.data[i * 4 + 3] = Math.round(255 * opacity * Math.min(0.78, weights[i] * 0.8));
  }
  rasterContext.putImageData(pixels, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(raster, 0, 0, width, height);
}

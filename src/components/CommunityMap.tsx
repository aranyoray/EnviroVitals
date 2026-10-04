"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LeafletMouseEvent } from "leaflet";
import type { LocationProfile } from "@/lib/profile";
import { indexColor, paintHeat, projectZip, type NationalMapData, type ZipPoint } from "@/lib/national-map";

interface CommunityMapProps {
  profile: LocationProfile | null;
  focusRequest: number;
  onSelectZip: (zip: string) => void;
}
type Region = "US" | "Alaska" | "Hawaii";

function focusProfile(instance: LeafletMap, profile: LocationProfile) {
  instance.setView([profile.latitude, profile.longitude], 10, { animate: false });
  const panel = document.querySelector<HTMLElement>(".map-sidebar:not([hidden])");
  if (panel) {
    const size = instance.getSize();
    instance.panBy(size.x > 640 ? [-panel.offsetWidth / 2, 0] : [0, panel.offsetHeight / 2], { animate: false });
  }
}

export function CommunityMap({ profile, focusRequest, onSelectZip }: CommunityMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const selection = useRef({ profile, focusRequest, onSelectZip });
  const redraw = useRef<(() => void) | null>(null);
  const fitRegion = useRef<((region: Region) => void) | null>(null);
  const [status, setStatus] = useState("Loading nationwide layer…");
  const [pointCount, setPointCount] = useState(0);
  const [view, setView] = useState("Heatmap");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    selection.current = { profile, focusRequest, onSelectZip };
    if (profile && focusRequest > 0) {
      if (map.current) focusProfile(map.current, profile);
    }
    redraw.current?.();
  }, [profile, focusRequest, onSelectZip]);

  useEffect(() => {
    let disposed = false;
    let activeMap: LeafletMap | null = null;
    let resize: ResizeObserver | null = null;
    let frame = 0;
    const controller = new AbortController();

    async function createMap() {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;
      const instance = L.map(mapElement.current, {
        center: [38.5, -97], zoom: 4, minZoom: 2, maxZoom: 15,
        zoomControl: false, scrollWheelZoom: true, zoomAnimation: false,
      });
      activeMap = instance;
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, className: "quiet-basemap", updateWhenIdle: true,
        referrerPolicy: "strict-origin-when-cross-origin",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · ZIPs: <a href="https://www.geonames.org/">GeoNames</a>',
      }).addTo(instance);
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      fitRegion.current = (region) => {
        const bounds: Record<Region, [[number, number], [number, number]]> = {
          US: [[24.3, -125], [49.7, -66.5]],
          Alaska: [[51, -179.5], [71.5, -129]],
          Hawaii: [[18.8, -160.5], [22.5, -154.5]],
        };
        const size = instance.getSize();
        const panel = document.querySelector<HTMLElement>(".map-sidebar:not([hidden])");
        const left = size.x > 640 && panel ? panel.offsetWidth + 45 : 24;
        const bottom = size.x <= 640 && panel ? panel.offsetHeight + 35 : 100;
        instance.fitBounds(bounds[region], { paddingTopLeft: [left, 65], paddingBottomRight: [45, bottom], animate: false });
      };
      fitRegion.current("US");
      const canvas = document.createElement("canvas");
      canvas.className = "national-map-overlay";
      canvas.setAttribute("aria-hidden", "true");
      instance.getContainer().appendChild(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser could not open the map canvas.");
      const tooltip = L.tooltip({ direction: "top", offset: [0, -10], className: "zip-map-tooltip" });
      let data: NationalMapData | null = null;
      let projected: ReturnType<typeof projectZip>[] = [];
      let visible: { x: number; y: number; point: ZipPoint }[] = [];

      function render() {
        if (disposed || !ctx) return;
        const { x: width, y: height } = instance.getSize();
        if (!width || !height) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
          canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
          canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        if (!data) return;
        const zoom = instance.getZoom();
        const world = 256 * 2 ** zoom;
        // containerPointToLayerPoint includes Leaflet's translation while dragging.
        const topLeft = instance.containerPointToLayerPoint([0, 0]).add(instance.getPixelOrigin());
        const centerX = topLeft.x + width / 2;
        visible = [];
        const heatPoints: { x: number; y: number; value: number }[] = [];
        for (const p of projected) {
          let wx = p.x * world;
          wx += Math.round((centerX - wx) / world) * world;
          const x = wx - topLeft.x, y = p.y * world - topLeft.y;
          if (x < -50 || y < -50 || x > width + 50 || y > height + 50) continue;
          visible.push({ x, y, point: p.point });
          const value = data.states[p.point[3]].index;
          if (value !== null) heatPoints.push({ x, y, value });
        }
        const dotOpacity = Math.max(0, Math.min(1, (zoom - 5) / 3));
        if (dotOpacity < 1) paintHeat(ctx, width, height, heatPoints, 1 - dotOpacity);
        if (dotOpacity > 0) {
          ctx.globalAlpha = dotOpacity * 0.88;
          const radius = zoom >= 11 ? 7 : zoom >= 9 ? 5 : 3.2;
          for (const p of visible) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${indexColor(data.states[p.point[3]].index).join(",")})`;
            ctx.fill();
            ctx.lineWidth = zoom >= 9 ? 1.3 : 0.7;
            ctx.strokeStyle = "rgba(255,255,255,.9)";
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        const current = selection.current;
        if (current.profile && current.focusRequest > 0) {
          const p = instance.latLngToContainerPoint([current.profile.latitude, current.profile.longitude]);
          ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = "#173c32"; ctx.lineWidth = 2; ctx.stroke();
          ctx.beginPath(); ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
        }
      }
      const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(render);
      };
      redraw.current = schedule;
      instance.on("move zoom resize", schedule);
      instance.on("zoomend", () => setView(instance.getZoom() >= 8 ? "ZIP circles" : instance.getZoom() > 5 ? "Heatmap + circles" : "Heatmap"));
      instance.on("movestart", () => tooltip.remove());
      function nearest(event: LeafletMouseEvent, radius: number) {
        let found: typeof visible[number] | undefined;
        let distance = radius ** 2;
        for (const p of visible) {
          const d = (p.x - event.containerPoint.x) ** 2 + (p.y - event.containerPoint.y) ** 2;
          if (d < distance) { distance = d; found = p; }
        }
        return found;
      }
      instance.on("mousemove", (event: LeafletMouseEvent) => {
        if (!data || instance.getZoom() < 7) return;
        const hit = nearest(event, 12);
        instance.getContainer().style.cursor = hit ? "pointer" : "";
        if (!hit) { tooltip.remove(); return; }
        const state = data.states[hit.point[3]];
        const content = document.createElement("div");
        content.textContent = `ZIP ${hit.point[0]} · ${state.name} · Index ${state.index === null ? "unavailable" : Math.round(state.index)}${state.partial ? " · Partial data" : ""}`;
        const note = document.createElement("small");
        note.textContent = "State-based estimate · Click for ZIP profile";
        content.appendChild(note);
        tooltip.setLatLng([hit.point[1], hit.point[2]]).setContent(content).addTo(instance);
      });
      instance.on("mouseout", () => tooltip.remove());
      instance.on("click", (event: LeafletMouseEvent) => {
        const hit = nearest(event, instance.getZoom() < 8 ? 45 : 14);
        if (!hit) return;
        tooltip.remove();
        if (instance.getZoom() < 8) instance.setView(event.latlng, Math.min(8, instance.getZoom() + 2));
        else selection.current.onSelectZip(hit.point[0]);
      });
      resize = new ResizeObserver(() => { instance.invalidateSize(); schedule(); });
      resize.observe(mapElement.current);
      const response = await fetch("/data/national-map.json", { signal: controller.signal });
      if (!response.ok) throw new Error("Nationwide layer unavailable.");
      const result = await response.json() as NationalMapData;
      if (!Array.isArray(result.points) || result.points.length > 100000 || !Array.isArray(result.states) || result.states.length > 60
        || result.points.some(p => p.length !== 4 || !/^\d{5}$/.test(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[1]) > 85 || !Number.isFinite(p[2]) || Math.abs(p[2]) > 180 || !Number.isInteger(p[3]) || !result.states[p[3]])
        || result.states.some(s => s.index !== null && (!Number.isFinite(s.index) || s.index < 0 || s.index > 100))) {
        throw new Error("Nationwide layer could not be read.");
      }
      if (disposed) return;
      data = result;
      projected = data.points.map(projectZip);
      setPointCount(data.points.length);
      setStatus("");
      const current = selection.current;
      if (current.profile && current.focusRequest > 0) focusProfile(instance, current.profile);
      schedule();
    }
    void createMap().catch((error: unknown) => {
      if (!disposed) setStatus(error instanceof Error ? error.message : "Map unavailable.");
    });
    return () => {
      disposed = true;
      controller.abort(); cancelAnimationFrame(frame); resize?.disconnect();
      redraw.current = null; fitRegion.current = null; map.current = null;
      activeMap?.remove();
    };
  }, [attempt]);

  return (
    <div className="community-map" aria-label="United States air and CKM index map, using state-based estimates">
      <div className="map-canvas" ref={mapElement} />
      <div className="map-region-control" role="group" aria-label="Map region">
        {(["US", "Alaska", "Hawaii"] as Region[]).map(region => <button type="button" key={region} onClick={() => fitRegion.current?.(region)}>{region === "US" ? "Contiguous US" : region}</button>)}
      </div>
      {status && <div className="national-map-status" role="status">{status}{!status.startsWith("Loading") && <button onClick={() => { setStatus("Loading nationwide layer…"); setAttempt(a => a + 1); }}>Retry</button>}</div>}
      <div className="national-map-legend">
        <div className="national-legend-title"><strong>Environment × CKM</strong><span>{view}</span></div>
        <Link href="/about#national-map">State-based estimates ↗</Link>
        <div className="national-color-ramp" />
        <div className="national-legend-range"><span>Lower index</span><span>Higher index</span></div>
        <p>{pointCount ? `${pointCount.toLocaleString()} ZIPs · 50 states + DC` : "Nationwide ZIP coverage"}</p>
      </div>
    </div>
  );
}

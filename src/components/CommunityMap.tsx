"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoJSON as LeafletGeoJSON, Map as LeafletMap, Path as LeafletPath } from "leaflet";
import type { LocationProfile } from "@/lib/profile";
import { COUNTY_COLORS, NO_COUNTY_DATA, countyColor, type CountyProperties } from "@/lib/national-map";

interface CommunityMapProps {
  profile: LocationProfile | null;
  focusRequest: number;
  onSelectZip: (zip: string) => void;
}

type CountyFeature = Feature<Geometry, CountyProperties>;
type CountyData = FeatureCollection<Geometry, CountyProperties> & {
  meta: { assignedZipCount: number; source: string; indexSource: string };
};

function focusProfile(instance: LeafletMap, profile: LocationProfile) {
  instance.setView([profile.latitude, profile.longitude], 10, { animate: false });
  const panel = document.querySelector<HTMLElement>(".map-sidebar:not([hidden])");
  if (panel) {
    const size = instance.getSize();
    instance.panBy(size.x > 640 ? [-panel.offsetWidth / 2, 0] : [0, panel.offsetHeight / 2], { animate: false });
  }
}

function validCountyData(data: CountyData): boolean {
  return data.type === "FeatureCollection" && Array.isArray(data.features)
    && data.features.length >= 3000 && data.features.length <= 4000
    && Number.isInteger(data.meta?.assignedZipCount) && data.meta.assignedZipCount >= 25000
    && data.features.every((feature) => {
      const p = feature.properties;
      return feature.type === "Feature" && ["Polygon", "MultiPolygon"].includes(feature.geometry?.type)
        && /^\d{5}$/.test(p?.fips) && typeof p.name === "string" && typeof p.state === "string"
        && Number.isInteger(p.zipCount) && p.zipCount >= 0
        && Number.isInteger(p.partialCount) && p.partialCount >= 0 && p.partialCount <= p.zipCount
        && (p.index === null || (Number.isFinite(p.index) && p.index >= 0 && p.index <= 100))
        && (p.sampleZip === null || /^\d{5}$/.test(p.sampleZip));
    });
}

export function CommunityMap({ profile, focusRequest, onSelectZip }: CommunityMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const selection = useRef({ profile, focusRequest, onSelectZip });
  const [status, setStatus] = useState("Loading county map…");
  const [coverage, setCoverage] = useState({ counties: 0, withData: 0, zips: 0 });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    selection.current = { profile, focusRequest, onSelectZip };
    if (profile && focusRequest > 0 && map.current) focusProfile(map.current, profile);
  }, [profile, focusRequest, onSelectZip]);

  useEffect(() => {
    let disposed = false;
    let activeMap: LeafletMap | null = null;
    let countyLayer: LeafletGeoJSON<CountyProperties> | null = null;
    let resize: ResizeObserver | null = null;
    const controller = new AbortController();

    async function createMap() {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;
      const instance = L.map(mapElement.current, {
        center: [38.5, -97], zoom: 4, minZoom: 2, maxZoom: 15,
        zoomControl: false, scrollWheelZoom: true, zoomAnimation: false,
        preferCanvas: true,
      });
      activeMap = instance;
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, className: "quiet-basemap", updateWhenIdle: true,
        referrerPolicy: "strict-origin-when-cross-origin",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Counties: <a href="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html">U.S. Census Bureau</a>',
      }).addTo(instance);
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      const size = instance.getSize();
      const panel = document.querySelector<HTMLElement>(".map-sidebar:not([hidden])");
      const left = size.x > 640 && panel ? panel.offsetWidth + 45 : 24;
      const bottom = size.x <= 640 && panel ? panel.offsetHeight + 35 : 100;
      instance.fitBounds([[24.3, -125], [49.7, -66.5]], {
        paddingTopLeft: [left, 40], paddingBottomRight: [45, bottom], animate: false,
      });
      if (size.x <= 640) instance.setView([38.5, -97], 3, { animate: false });
      resize = new ResizeObserver(() => instance.invalidateSize());
      resize.observe(mapElement.current);

      const response = await fetch("/data/county-map.json?v=1", { signal: controller.signal });
      if (!response.ok) throw new Error("County map unavailable.");
      const data = await response.json() as CountyData;
      if (!validCountyData(data)) throw new Error("County map could not be read.");
      if (disposed) return;

      const renderer = L.canvas({ padding: 0.4 });
      const text = (value: string, className?: string) => {
        const element = document.createElement("div");
        if (className) element.className = className;
        element.textContent = value;
        return element;
      };
      countyLayer = L.geoJSON(data, {
        style(feature) {
          const p = feature?.properties as CountyProperties | undefined;
          return { renderer, color: p?.index === null ? "#b4bcb8" : "#ffffff", weight: 0.72,
            fillColor: countyColor(p?.index ?? null), fillOpacity: 0.96 };
        },
        onEachFeature(feature, layer) {
          const p = (feature as CountyFeature).properties;
          const tooltip = document.createElement("div");
          tooltip.append(text(`${p.name}, ${p.state}`, "county-tooltip-title"));
          tooltip.append(text(p.index === null ? "No ZIP index available" : `County mean index ${p.index.toFixed(1)} · ${p.zipCount.toLocaleString()} ZIPs`));
          layer.bindTooltip(tooltip, { direction: "top", className: "county-map-tooltip" });
          layer.on("mouseover", () => (layer as LeafletPath).setStyle({ weight: 1.6, color: "#314d52", fillOpacity: 1 }));
          layer.on("mouseout", () => countyLayer?.resetStyle(layer as LeafletPath));
          layer.on("click", (event) => {
            const popup = document.createElement("div");
            popup.className = "county-popup";
            popup.append(text(`${p.name}, ${p.state}`, "county-popup-name"));
            popup.append(text(p.index === null ? "No ZIP index available for this county." : `Average index ${p.index.toFixed(1)} across ${p.zipCount.toLocaleString()} postal ZIPs.`));
            if (p.partialCount) popup.append(text(`${p.partialCount.toLocaleString()} ZIPs have partial input data.`));
            if (p.sampleZip) {
              const button = document.createElement("button");
              button.type = "button";
              button.textContent = `Open example ZIP ${p.sampleZip}`;
              button.addEventListener("click", () => { instance.closePopup(); selection.current.onSelectZip(p.sampleZip!); });
              popup.append(button);
            }
            L.popup({ maxWidth: 270 }).setLatLng(event.latlng).setContent(popup).openOn(instance);
          });
        },
      }).addTo(instance);
      setCoverage({ counties: data.features.length, withData: data.features.filter(f => f.properties.index !== null).length, zips: data.meta.assignedZipCount });
      setStatus("");
      const current = selection.current;
      if (current.profile && current.focusRequest > 0) focusProfile(instance, current.profile);
    }
    void createMap().catch((error: unknown) => {
      if (!disposed) setStatus(error instanceof Error ? error.message : "Map unavailable.");
    });
    return () => {
      disposed = true;
      controller.abort(); resize?.disconnect();
      map.current = null;
      activeMap?.remove();
    };
  }, [attempt]);

  return (
    <div className="community-map" aria-label="United States county map of the air and CKM ZIP index">
      <div className="map-canvas" ref={mapElement} />
      {status && <div className="national-map-status" role="status">{status}{!status.startsWith("Loading") && <button onClick={() => { setStatus("Loading county map…"); setAttempt(a => a + 1); }}>Retry</button>}</div>}
      <div className="national-map-legend">
        <div className="national-legend-title"><strong>Environment × CKM</strong><span>County averages</span></div>
        <Link href="/about#national-map">ZIP + state estimates ↗</Link>
        <div className="national-color-ramp" aria-label="Higher index in red, lower index in teal">
          {COUNTY_COLORS.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
        </div>
        <div className="national-legend-range"><span>Higher index</span><span>Lower index</span></div>
        <div className="county-no-data"><i style={{ backgroundColor: NO_COUNTY_DATA }} />No ZIP index</div>
        <p>{coverage.counties ? `${coverage.withData.toLocaleString()} of ${coverage.counties.toLocaleString()} counties · ${coverage.zips.toLocaleString()} ZIPs` : "Nationwide county coverage"}</p>
      </div>
    </div>
  );
}

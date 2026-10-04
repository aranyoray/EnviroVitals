"use client";

import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { LocationProfile } from "@/lib/profile";

interface CommunityMapProps {
  profile: LocationProfile | null;
}

export function CommunityMap({ profile }: CommunityMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<LayerGroup | null>(null);
  const drawProfile = useRef<((next: LocationProfile | null) => void) | null>(null);
  const currentProfile = useRef(profile);

  useEffect(() => {
    currentProfile.current = profile;
    drawProfile.current?.(profile);
  }, [profile]);

  useEffect(() => {
    let disposed = false;
    let activeMap: LeafletMap | null = null;

    async function createMap() {
      const L = await import("leaflet");
      if (disposed || !mapElement.current) return;

      const instance = L.map(mapElement.current, {
        center: [40.7128, -74.006],
        zoom: 11,
        zoomControl: false,
        scrollWheelZoom: true,
      });
      activeMap = instance;
      map.current = instance;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(instance);
      L.control.zoom({ position: "bottomright" }).addTo(instance);

      const layer = L.layerGroup().addTo(instance);
      markers.current = layer;

      drawProfile.current = (next) => {
        if (!next || !map.current || !markers.current) return;
        const liveMap = map.current;
        const liveLayer = markers.current;
        liveLayer.clearLayers();
        liveMap.setView([next.latitude, next.longitude], 11, { animate: true });

        const selectedArea = L.circleMarker([next.latitude, next.longitude], {
          radius: 10,
          color: "#173c32",
          weight: 3,
          opacity: 1,
          fillColor: "#d9e7b1",
          fillOpacity: 0.96,
        });
        selectedArea.bindTooltip(`ZIP ${next.zip} area`, { direction: "top", offset: [0, -9] });
        selectedArea.addTo(liveLayer);

        for (const monitor of next.airMonitors) {
          const aboveReference = monitor.annualPM25 > 9;
          const marker = L.circleMarker([monitor.latitude, monitor.longitude], {
            radius: monitor.siteId === next.air?.siteId ? 8 : 6,
            color: aboveReference ? "#9a3f32" : "#276e54",
            weight: monitor.siteId === next.air?.siteId ? 2.5 : 1.5,
            fillColor: aboveReference ? "#df7562" : "#7ebd8e",
            fillOpacity: 0.9,
          });
          marker.bindTooltip(
            `${monitor.monitorName} · ${monitor.annualPM25.toFixed(1)} µg/m³ PM₂.₅ · ${monitor.distanceMiles.toFixed(1)} mi from ZIP`,
            { direction: "top", offset: [0, -5] },
          );
          marker.addTo(liveLayer);
        }
      };

      drawProfile.current?.(currentProfile.current);
      window.setTimeout(() => instance.invalidateSize(), 60);
    }

    void createMap();
    return () => {
      disposed = true;
      drawProfile.current = null;
      markers.current = null;
      map.current = null;
      activeMap?.remove();
    };
  }, []);

  return (
    <div className="community-map" aria-label="OpenStreetMap with nearby EPA air monitors">
      <div className="map-canvas" ref={mapElement} />
      {!profile && <div className="map-loading"><span />Loading ZIP profile</div>}
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-area" /> ZIP area</span>
        <span><i className="legend-monitor-low" /> At or below 9.0</span>
        <span><i className="legend-monitor-high" /> Above 9.0 µg/m³</span>
      </div>
    </div>
  );
}

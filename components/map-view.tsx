"use client";

import { useRef, useEffect, useCallback } from "react";
import type L from "leaflet";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  isEcoCertified?: boolean;
}

interface MapViewProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function MapView({
  markers,
  center = [9.7489, 118.7354],
  zoom = 13,
  className = "h-full w-full",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const updateMarkers = useCallback(
    (map: L.Map, leaflet: typeof L, markerData: MapMarker[]) => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const ecoIcon = new leaflet.Icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: "eco-marker",
      });

      markerData.forEach((m) => {
        const marker = leaflet
          .marker([m.lat, m.lng], {
            icon: m.isEcoCertified ? ecoIcon : undefined,
          })
          .addTo(map);

        const popupHtml = `
          <div class="text-sm">
            <strong>${m.name}</strong>
            ${m.isEcoCertified ? '<span style="margin-left:4px;color:#2E7D32;font-size:12px;font-weight:500;">Eco</span>' : ""}
            <br/>
            <a href="/listings/${m.id}" style="color:#2E7D32;text-decoration:underline;">View Details</a>
          </div>
        `;
        marker.bindPopup(popupHtml);
        markersRef.current.push(marker);
      });
    },
    [],
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    let map: L.Map | null = null;

    (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      await import("leaflet/dist/leaflet.css");

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Guard: container may have unmounted during async import
      if (!containerRef.current) return;

      map = L.map(containerRef.current).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      updateMarkers(map, L, markers);
    })();

    return () => {
      if (map) {
        map.remove();
        map = null;
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current) return;

    (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      if (mapRef.current) {
        updateMarkers(mapRef.current, L, markers);
      }
    })();
  }, [markers, updateMarkers]);

  return (
    <>
      <style>{`
        .eco-marker { filter: hue-rotate(85deg) saturate(1.5); }
      `}</style>
      <div ref={containerRef} className={className} />
    </>
  );
}

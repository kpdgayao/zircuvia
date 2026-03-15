"use client";

import { useRef, useEffect, useCallback, useState } from "react";
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
  const leafletRef = useRef<typeof L | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const cancelledRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const updateMarkers = useCallback(
    (map: L.Map, leaflet: typeof L, markerData: MapMarker[]) => {
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const iconOptions = {
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41] as [number, number],
        iconAnchor: [12, 41] as [number, number],
        popupAnchor: [1, -34] as [number, number],
        shadowSize: [41, 41] as [number, number],
      };

      const defaultIcon = new leaflet.Icon(iconOptions);
      const ecoIcon = new leaflet.Icon({
        ...iconOptions,
        className: "eco-marker",
      });

      markerData.forEach((m) => {
        const marker = leaflet
          .marker([m.lat, m.lng], {
            icon: m.isEcoCertified ? ecoIcon : defaultIcon,
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

  // Initialize map (once)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      const Leaflet = leaflet.default ?? leaflet;
      await import("leaflet/dist/leaflet.css");

      // Bail out if component unmounted during async import
      if (cancelled || !containerRef.current) return;

      // Fix default icon paths
      delete (Leaflet.Icon.Default.prototype as any)._getIconUrl;
      Leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = Leaflet.map(containerRef.current).setView(center, zoom);
      mapRef.current = map;
      leafletRef.current = Leaflet;
      cancelledRef.current = false;

      Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Signal that the map is ready so the marker effect can run
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // Ignore errors if DOM is already detached
        }
        mapRef.current = null;
      }
      leafletRef.current = null;
      markersRef.current = [];
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when map is ready or marker data changes
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current || cancelledRef.current) return;
    updateMarkers(mapRef.current, leafletRef.current, markers);
  }, [markers, mapReady, updateMarkers]);

  return (
    <>
      <style>{`
        .eco-marker { filter: hue-rotate(85deg) saturate(1.5); }
      `}</style>
      <div ref={containerRef} className={className} />
    </>
  );
}

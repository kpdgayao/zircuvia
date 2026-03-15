"use client";

import Link from "next/link";
import { useRef, useState, useEffect, type ReactElement } from "react";

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
  const [mapContent, setMapContent] = useState<ReactElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        // Dynamically import leaflet and react-leaflet only on client
        const [L, RL] = await Promise.all([
          import("leaflet"),
          import("react-leaflet"),
        ]);

        // Import leaflet CSS
        await import("leaflet/dist/leaflet.css");

        const leaflet = L.default ?? L;

        // Fix default icon paths
        delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

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

        const { MapContainer, TileLayer, Marker, Popup } = RL;

        setMapContent(
          <>
            <style>{`.eco-marker { filter: hue-rotate(85deg) saturate(1.5); }`}</style>
            <MapContainer
              center={center}
              zoom={zoom}
              className={className}
              scrollWheelZoom={true}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {markers.map((m) => (
                <Marker
                  key={m.id}
                  position={[m.lat, m.lng]}
                  icon={m.isEcoCertified ? ecoIcon : undefined}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{m.name}</strong>
                      {m.isEcoCertified && (
                        <span className="ml-1 text-[#2E7D32] text-xs font-medium">
                          Eco
                        </span>
                      )}
                      <br />
                      <Link
                        href={`/listings/${m.id}`}
                        className="text-[#2E7D32] underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </>,
        );
      } catch (err) {
        console.error("Failed to load map libraries:", err);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load map",
        );
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-sm text-gray-600 mb-1">Unable to load the map.</p>
          <p className="text-xs text-gray-400 mb-2">{loadError}</p>
          <button
            className="text-sm text-[#2E7D32] underline"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }

  if (!mapContent) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    );
  }

  return mapContent;
}

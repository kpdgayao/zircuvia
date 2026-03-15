"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useRef } from "react";

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

function useLeafletIcons() {
  const initialized = useRef(false);
  const ecoIconRef = useRef<L.Icon | null>(null);

  if (!initialized.current && typeof window !== "undefined") {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    ecoIconRef.current = new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
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
    initialized.current = true;
  }

  return ecoIconRef.current;
}

export function MapView({
  markers,
  center = [9.7489, 118.7354],
  zoom = 13,
  className = "h-full w-full",
}: MapViewProps) {
  const ecoIcon = useLeafletIcons();

  return (
    <>
      <style>{`
        .eco-marker {
          filter: hue-rotate(85deg) saturate(1.5);
        }
      `}</style>
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
            icon={m.isEcoCertified && ecoIcon ? ecoIcon : undefined}
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
    </>
  );
}

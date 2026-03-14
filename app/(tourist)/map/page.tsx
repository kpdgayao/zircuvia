"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { MapMarker } from "@/components/map-view";

const MapView = dynamic(() => import("@/components/map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <p className="text-sm text-gray-500">Loading map...</p>
    </div>
  ),
});

interface BusinessWithCoords {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  isEcoCertified: boolean;
}

export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/businesses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const withCoords: MapMarker[] = (json.businesses as BusinessWithCoords[])
          .filter((b) => b.lat != null && b.lng != null)
          .map((b) => ({
            id: b.id,
            lat: b.lat!,
            lng: b.lng!,
            name: b.name,
            isEcoCertified: b.isEcoCertified,
          }));
        setMarkers(withCoords);
      }
    } catch (err) {
      console.error("Failed to load businesses for map:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return (
    <div className="fixed inset-0 top-14 bottom-[52px] z-10">
      {/* Search overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search businesses on map..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white shadow-md border-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-full w-full bg-gray-100 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      ) : (
        <MapView markers={markers} className="h-full w-full" />
      )}
    </div>
  );
}

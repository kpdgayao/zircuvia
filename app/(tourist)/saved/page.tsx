"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { BusinessCard } from "@/components/business-card";
import Link from "next/link";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";

interface SavedBusiness {
  id: string;
  name: string;
  category: string;
  about: string | null;
  address: string;
  isEcoCertified: boolean;
  coverPhotoUrl: string | null;
  avgRating: number;
  reviewCount: number;
}

export default function SavedPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<SavedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const isOnline = useOnlineStatus();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchSaved() {
      try {
        const res = await fetch("/api/saved");
        if (res.status === 401) {
          setIsSignedIn(false);
          return;
        }
        if (res.ok) {
          setIsSignedIn(true);
          const json = await res.json();
          setBusinesses(json.businesses);
        } else if (res.status !== 401) {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchSaved();
  }, []);

  const retry = () => {
    setError(false);
    setLoading(true);
    fetch("/api/saved")
      .then(async (res) => {
        if (res.status === 401) {
          setIsSignedIn(false);
        } else if (res.ok) {
          setIsSignedIn(true);
          const json = await res.json();
          setBusinesses(json.businesses);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Saved Places</h1>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Saved Places</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <WifiOff className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-1">
            {isOnline ? "Failed to load saved places" : "You're offline"}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {isOnline
              ? "Something went wrong. Please try again."
              : "Your saved places will appear when you reconnect."}
          </p>
          {isOnline && (
            <button
              onClick={retry}
              className="rounded-lg bg-[#2E7D32] px-4 py-2 text-sm font-medium text-white hover:bg-[#1B5E20] transition"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isSignedIn === false) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Saved Places</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bookmark className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-4">
            Sign in to save places you love
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white bg-[#2E7D32] hover:bg-[#1B5E20] transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Saved Places</h1>

      {businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bookmark className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm text-gray-500">No saved places yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Explore listings and save your favorites
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {businesses.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              onClick={() => router.push(`/listings/${b.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-6">
        <WifiOff className="h-8 w-8 text-gray-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">
        You&apos;re offline
      </h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Check your internet connection and try again. Some pages you&apos;ve
        visited before may still be available.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-[#2E7D32] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1B5E20] transition"
      >
        Try Again
      </button>
    </div>
  );
}

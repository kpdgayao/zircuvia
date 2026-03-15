"use client";

import { useEffect, useState, useCallback } from "react";

export function PWARegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates periodically (every 60 minutes)
        setInterval(() => registration.update(), 60 * 60 * 1000);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("SW registration failed:", err);
      });

    // Reload when new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = useCallback(() => {
    waitingWorker?.postMessage("SKIP_WAITING");
    setShowUpdate(false);
  }, [waitingWorker]);

  if (!showUpdate) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-lg bg-[#2E7D32] px-4 py-3 text-white shadow-lg sm:left-auto sm:right-4 sm:w-80"
    >
      <p className="text-sm font-medium">A new version is available</p>
      <button
        onClick={handleUpdate}
        className="ml-3 shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#2E7D32] hover:bg-green-50 transition"
      >
        Update
      </button>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { flushQueue, getPendingCount } from "@/lib/offline-queue";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (isOnline) {
      const count = getPendingCount();
      if (count > 0) {
        toast.promise(flushQueue(), {
          loading: `Syncing ${count} pending action${count > 1 ? "s" : ""}...`,
          success: (synced) =>
            synced > 0
              ? `Synced ${synced} action${synced > 1 ? "s" : ""}`
              : "All caught up",
          error: "Some actions failed to sync",
        });
      }
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-14 left-0 right-0 z-40 flex items-center justify-center gap-2 bg-gray-800 px-4 py-2 text-white text-xs font-medium"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>You&apos;re offline — some features may be limited</span>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queueAction } from "@/lib/offline-queue";

interface BusinessActionsProps {
  businessId: string;
  isSignedIn: boolean;
  initialSaved?: boolean;
}

export function BusinessActions({
  businessId,
  isSignedIn,
  initialSaved = false,
}: BusinessActionsProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/saved/${businessId}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.saved);
        toast.success(data.saved ? "Saved!" : "Removed from saved");
      }
    } catch {
      // Offline: queue and optimistically update UI
      queueAction({ endpoint: `/api/saved/${businessId}`, method: "POST" });
      setSaved(!saved);
      toast.info("Saved offline — will sync when you reconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size="sm"
      onClick={handleSave}
      disabled={loading}
      className={
        saved
          ? "bg-[#2E7D32] hover:bg-[#1B5E20] gap-1.5"
          : "gap-1.5"
      }
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4" />
          Saved
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          Save
        </>
      )}
    </Button>
  );
}

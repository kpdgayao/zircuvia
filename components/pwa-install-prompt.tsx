"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed this session
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
    setDismissed(true);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:w-80"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2E7D32]/10">
        <Download className="h-5 w-5 text-[#2E7D32]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">Install ZircuVia</p>
        <p className="text-xs text-gray-500">
          Add to home screen for quick access
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 rounded-md bg-[#2E7D32] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1B5E20] transition"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

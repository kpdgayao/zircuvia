"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OnboardingGuard() {
  const router = useRouter();

  useEffect(() => {
    try {
      const onboarded = localStorage.getItem("onboarded");
      if (!onboarded) {
        router.replace("/onboarding");
      }
    } catch {
      // localStorage not available — skip redirect
    }
  }, [router]);

  return null;
}

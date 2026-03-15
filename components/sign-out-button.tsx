"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      setSigningOut(false);
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      {signingOut ? "Signing out..." : "Sign Out"}
    </button>
  );
}

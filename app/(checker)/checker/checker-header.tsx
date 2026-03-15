"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckerHeaderProps {
  firstName: string;
  locationName: string | null;
}

const TABS = [
  { href: "/checker/verify", label: "Verify" },
  { href: "/checker/history", label: "History" },
] as const;

export function CheckerHeader({ firstName, locationName }: CheckerHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="w-full max-w-md border-b">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-[#2E7D32] text-lg">ZircuVia</h1>
            <p className="text-xs text-gray-500">Visitor Checker — {firstName}</p>
          </div>
          <SignOutButton redirectTo="/checker-login" />
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
          <span className={cn("text-xs", locationName ? "text-gray-500" : "text-gray-400 italic")}>
            {locationName ?? "No location assigned"}
          </span>
        </div>
      </div>
      <nav className="flex">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 text-center py-2.5 text-sm font-medium transition-colors",
              pathname === tab.href
                ? "text-[#2E7D32] border-b-2 border-[#2E7D32]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

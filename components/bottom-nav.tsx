"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, Map, Calendar, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ isSignedIn }: { isSignedIn: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/listings", label: "Listings", icon: List },
    { href: "/map", label: "Map", icon: Map },
    ...(isSignedIn ? [{ href: "/events", label: "Events", icon: Calendar }] : []),
    { href: "/saved", label: "Saved", icon: Bookmark },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
      <div className="flex justify-around py-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-xs",
                active ? "text-[#2E7D32]" : "text-gray-400"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

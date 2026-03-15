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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-40 safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around items-center py-1.5 px-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[3.5rem]",
                active
                  ? "text-[#2E7D32]"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                active && "bg-green-50"
              )}>
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              </div>
              <span className={cn(
                "text-[10px] leading-none",
                active ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

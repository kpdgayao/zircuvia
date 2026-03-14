"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  CalendarDays,
  CreditCard,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  memberSince: string;
  avatarUrl: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (!json.user) {
            router.replace("/login");
            return;
          }
          setProfile(json.user);
        } else if (res.status === 401) {
          router.replace("/login");
          return;
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Profile</h1>
        <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Profile</h1>

      {/* User info card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-[#2E7D32] text-white text-xl">
                {profile.firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="font-semibold text-base">
                {profile.firstName} {profile.lastName}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Mail className="w-3 h-3" />
                {profile.email}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <CalendarDays className="w-3 h-3" />
                Member since {formatDate(profile.memberSince)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardContent className="p-0">
          <Link
            href="/fees"
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Check Fee Payments</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Separator />
          <Link
            href="/saved"
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm">Saved Places</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button
        variant="outline"
        className="w-full text-red-600 border-red-200 hover:bg-red-50"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        {signingOut ? "Signing out..." : "Sign Out"}
      </Button>
    </div>
  );
}

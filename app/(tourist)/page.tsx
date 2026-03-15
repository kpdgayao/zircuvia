import Link from "next/link";
import { getSession } from "@/lib/auth";
import { BusinessCard } from "@/components/business-card";
import { OnboardingGuard } from "./onboarding-guard";
import { DiscoverIllustration } from "@/components/illustrations";
import { CircularEconomySection } from "@/components/circular-economy-section";
import { prisma } from "@/lib/prisma";
import {
  Leaf,
  MapPin,
  ChevronRight,
  CreditCard,
  Search,
  Sparkles,
  Hotel,
  UtensilsCrossed,
  TreePalm,
  Compass,
  Paintbrush,
  Plane,
} from "lucide-react";
import type { Prisma } from "@prisma/client";

async function fetchBusinesses(options: { limit?: number; ecoOnly?: boolean } = {}) {
  try {
    const { limit = 6, ecoOnly = false } = options;

    const where: Prisma.BusinessWhereInput = {
      isArchived: false,
    };

    if (ecoOnly) {
      where.isEcoCertified = true;
    }

    const businesses = await prisma.business.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { reviews: true } },
        reviews: {
          select: { rating: true },
        },
      },
    });

    return businesses.map((b) => {
      const { reviews, _count, ...rest } = b;
      const reviewCount = _count.reviews;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;
      return { ...rest, avgRating, reviewCount };
    });
  } catch {
    return [];
  }
}

const QUICK_CATEGORIES = [
  { value: "HOTEL", label: "Hotels", icon: Hotel, color: "bg-blue-50 text-blue-600" },
  { value: "RESTAURANT", label: "Food", icon: UtensilsCrossed, color: "bg-orange-50 text-orange-600" },
  { value: "RESORT", label: "Resorts", icon: TreePalm, color: "bg-teal-50 text-teal-600" },
  { value: "TOUR", label: "Tours", icon: Compass, color: "bg-green-50 text-green-600" },
  { value: "ARTISAN", label: "Artisans", icon: Paintbrush, color: "bg-purple-50 text-purple-600" },
  { value: "TRAVEL_AND_TOURS", label: "Travel", icon: Plane, color: "bg-sky-50 text-sky-600" },
];

export default async function HomePage() {
  const session = await getSession();

  const [topBusinesses, ecoBusinesses] = await Promise.all([
    fetchBusinesses({ limit: 6 }),
    fetchBusinesses({ limit: 6, ecoOnly: true }),
  ]);

  return (
    <>
      <OnboardingGuard />

      {session ? (
        /* ========== SIGNED-IN STATE ========== */
        <div className="space-y-6">
          {/* Hero greeting with illustration */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E7D32] via-[#388E3C] to-[#1B5E20] px-5 py-6 text-white shadow-lg">
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-green-200 text-xs font-medium uppercase tracking-wide">
                  Welcome back
                </p>
                <h1 className="text-xl font-bold mt-0.5">
                  {session.firstName}!
                </h1>
                <p className="text-sm text-green-100 mt-1.5 leading-relaxed">
                  Discover eco-friendly places in Puerto Princesa City
                </p>
              </div>
              <DiscoverIllustration className="w-24 h-24 shrink-0 drop-shadow-lg" />
            </div>
            {/* Decorative wave */}
            <svg className="absolute -bottom-1 left-0 w-full opacity-10" viewBox="0 0 400 40" fill="none">
              <path d="M0 20 Q100 0 200 20 Q300 40 400 20 L400 40 L0 40 Z" fill="white" />
            </svg>
          </div>

          {/* Quick actions row */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/fees"
              className="flex items-center gap-3 bg-white border border-green-100 rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-green-300 transition group"
            >
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition">
                <CreditCard className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">Fee Payments</p>
                <p className="text-[11px] text-gray-500 truncate">View & manage</p>
              </div>
            </Link>
            <Link
              href="/listings"
              className="flex items-center gap-3 bg-white border border-green-100 rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-green-300 transition group"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition">
                <Search className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">Explore</p>
                <p className="text-[11px] text-gray-500 truncate">Browse listings</p>
              </div>
            </Link>
          </div>

          {/* Category quick filters */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-3">Browse by Category</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {QUICK_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/listings?category=${cat.value}`}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center shadow-sm hover:shadow-md transition`}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">{cat.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Circular Economy Education */}
          <CircularEconomySection />

          {/* Eco Businesses section */}
          {ecoBusinesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Leaf className="w-3.5 h-3.5 text-[#2E7D32]" />
                  </div>
                  <h2 className="font-semibold text-gray-800">Eco-Certified</h2>
                </div>
                <Link href="/listings?ecoOnly=true" className="text-xs text-[#2E7D32] hover:underline flex items-center gap-0.5">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ecoBusinesses.map((b) => (
                  <Link key={b.id} href={`/listings/${b.id}`}>
                    <BusinessCard business={b} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Top Places section */}
          {topBusinesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h2 className="font-semibold text-gray-800">Top Places</h2>
                </div>
                <Link href="/listings" className="text-xs text-[#2E7D32] hover:underline flex items-center gap-0.5">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {topBusinesses.map((b) => (
                  <Link key={b.id} href={`/listings/${b.id}`}>
                    <BusinessCard business={b} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ========== SIGNED-OUT STATE ========== */
        <div className="space-y-6">
          {/* Hero section with illustration */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E7D32] via-[#388E3C] to-[#1B5E20] shadow-lg">
            <div className="relative z-10 px-5 pt-8 pb-6 text-center">
              <div className="flex justify-center mb-4">
                <DiscoverIllustration className="w-36 h-36 drop-shadow-lg" />
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                Discover Puerto Princesa
              </h1>
              <p className="text-sm text-green-100 mt-2 max-w-xs mx-auto leading-relaxed">
                Your guide to eco-certified hotels, restaurants, tours, and local artisans
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <MapPin className="w-3.5 h-3.5 text-green-200" />
                <span className="text-xs text-green-200 font-medium">Puerto Princesa City, Palawan</span>
              </div>
            </div>
            {/* Decorative wave */}
            <svg className="absolute -bottom-1 left-0 w-full opacity-10" viewBox="0 0 400 30" fill="none">
              <path d="M0 15 Q100 0 200 15 Q300 30 400 15 L400 30 L0 30 Z" fill="white" />
            </svg>
          </div>

          {/* CTA cards */}
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/login"
              className="flex items-center gap-4 bg-white border border-green-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-green-300 transition group"
            >
              <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition shrink-0">
                <CreditCard className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Pay Environmental Fee</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sign in to pay your eco-tourism fee
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#2E7D32] transition shrink-0" />
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-4 bg-white border border-green-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-green-300 transition group"
            >
              <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition shrink-0">
                <Leaf className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Create an Account</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Save favorites and track your visits
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-600 transition shrink-0" />
            </Link>
          </div>

          {/* Category quick filters */}
          <section>
            <h2 className="font-semibold text-gray-800 mb-3">Browse by Category</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {QUICK_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/listings?category=${cat.value}`}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center shadow-sm hover:shadow-md transition`}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">{cat.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Circular Economy Education */}
          <CircularEconomySection />

          {/* Top Places horizontal scroll */}
          {topBusinesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h2 className="font-semibold text-gray-800">Top Places to Visit</h2>
                </div>
                <Link href="/listings" className="text-xs text-[#2E7D32] hover:underline flex items-center gap-0.5">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x scrollbar-hide">
                {topBusinesses.map((b) => (
                  <Link
                    key={b.id}
                    href={`/listings/${b.id}`}
                    className="shrink-0 w-48 snap-start"
                  >
                    <BusinessCard business={b} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Eco-certified horizontal scroll */}
          {ecoBusinesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Leaf className="w-3.5 h-3.5 text-[#2E7D32]" />
                  </div>
                  <h2 className="font-semibold text-gray-800">Eco-Certified</h2>
                </div>
                <Link href="/listings?ecoOnly=true" className="text-xs text-[#2E7D32] hover:underline flex items-center gap-0.5">
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x scrollbar-hide">
                {ecoBusinesses.map((b) => (
                  <Link
                    key={b.id}
                    href={`/listings/${b.id}`}
                    className="shrink-0 w-48 snap-start"
                  >
                    <BusinessCard business={b} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

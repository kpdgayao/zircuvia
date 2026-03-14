import Link from "next/link";
import { getSession } from "@/lib/auth";
import { BusinessCard } from "@/components/business-card";
import { OnboardingGuard } from "./onboarding-guard";

interface BusinessSummary {
  id: string;
  name: string;
  category: string;
  about: string | null;
  address: string;
  isEcoCertified: boolean;
  coverPhotoUrl: string | null;
  avgRating: number;
  reviewCount: number;
}

async function fetchBusinesses(params: string): Promise<BusinessSummary[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/businesses?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.businesses ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const session = await getSession();

  const [topBusinesses, ecoBusinesses] = await Promise.all([
    fetchBusinesses("limit=6"),
    fetchBusinesses("ecoOnly=true&limit=6"),
  ]);

  return (
    <>
      <OnboardingGuard />

      {session ? (
        /* Signed-in state */
        <div className="space-y-6">
          {/* Hero greeting */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E7D32] to-[#1B5E20] px-5 py-6 text-white shadow-lg">
            <div className="relative z-10">
              <h1 className="text-xl font-bold">
                Welcome Back, {session.firstName}!
              </h1>
              <p className="text-sm text-green-100 mt-1">
                Puerto Princesa City — Explore Sustainability. Support Local.
              </p>
            </div>
            {/* Decorative elements */}
            <svg className="absolute right-0 top-0 h-full w-32 opacity-10" viewBox="0 0 100 100" fill="none">
              <circle cx="80" cy="20" r="40" fill="white" />
              <circle cx="60" cy="70" r="25" fill="white" />
              <circle cx="90" cy="90" r="15" fill="white" />
            </svg>
          </div>

          <Link
            href="/fees"
            className="flex items-center justify-between bg-white border border-green-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-green-300 transition"
          >
            <div>
              <p className="font-semibold text-gray-900">Check Fee Payments</p>
              <p className="text-xs text-gray-500 mt-0.5">
                View and manage your environmental fees
              </p>
            </div>
            <span className="text-2xl">🌿</span>
          </Link>

          {ecoBusinesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Eco Businesses</h2>
                <Link href="/listings?ecoOnly=true" className="text-xs text-[#2E7D32] hover:underline">
                  See all
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

          {topBusinesses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800">Top Places</h2>
                <Link href="/listings" className="text-xs text-[#2E7D32] hover:underline">
                  See all
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
        /* Signed-out state */
        <div className="space-y-6">
          {/* Hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E7D32] via-[#388E3C] to-[#1B5E20] px-5 py-8 text-white shadow-lg">
            <div className="relative z-10 text-center space-y-2">
              <h1 className="text-2xl font-bold leading-tight">
                Puerto Princesa City
              </h1>
              <p className="text-sm text-green-100">
                Explore Sustainability. Support Local.
              </p>
            </div>
            {/* Decorative background */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.07]" viewBox="0 0 200 100" fill="none">
              <path d="M0 80 Q50 50 100 70 Q150 90 200 60 L200 100 L0 100 Z" fill="white" />
              <circle cx="30" cy="25" r="20" fill="white" />
              <circle cx="170" cy="20" r="15" fill="white" />
              <circle cx="100" cy="15" r="10" fill="white" />
            </svg>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-between bg-white border border-green-200 rounded-xl px-5 py-4 shadow-sm hover:shadow-md hover:border-green-300 transition"
          >
            <div>
              <p className="font-semibold text-gray-900">Pay Environmental Fee</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sign in to pay your eco-tourism fee
              </p>
            </div>
            <span className="text-2xl">🌿</span>
          </Link>

          {topBusinesses.length > 0 && (
            <section>
              <h2 className="font-semibold text-gray-800 mb-3">Top Places to Visit</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {topBusinesses.map((b) => (
                  <Link
                    key={b.id}
                    href={`/listings/${b.id}`}
                    className="shrink-0 w-52"
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

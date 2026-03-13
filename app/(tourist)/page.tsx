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
        /* ── Signed-in state ── */
        <div className="space-y-6">
          <div className="pt-2">
            <h1 className="text-xl font-bold text-gray-900">
              Welcome Back, {session.firstName}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Puerto Princesa City — Explore Sustainability. Support Local.
            </p>
          </div>

          <Link
            href="/fees"
            className="flex items-center justify-between bg-[#2E7D32] text-white rounded-xl px-5 py-4 shadow hover:bg-[#1B5E20] transition"
          >
            <div>
              <p className="font-semibold">Check Fee Payments</p>
              <p className="text-xs text-green-100 mt-0.5">
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
        /* ── Signed-out state ── */
        <div className="space-y-6">
          <div className="pt-4 text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Puerto Princesa City
            </h1>
            <p className="text-gray-500 text-sm">
              Explore Sustainability. Support Local.
            </p>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-between bg-[#2E7D32] text-white rounded-xl px-5 py-4 shadow hover:bg-[#1B5E20] transition"
          >
            <div>
              <p className="font-semibold">Pay Environmental Fee</p>
              <p className="text-xs text-green-100 mt-0.5">
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

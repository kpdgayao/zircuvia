import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { StarRating } from "@/components/star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import {
  MapPin,
  Phone,
  Globe,
  Mail,
  Leaf,
  ExternalLink,
} from "lucide-react";
import { BusinessActions } from "./business-actions";
import { ReviewForm } from "./review-form";

interface Review {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

interface BusinessDetail {
  id: string;
  name: string;
  category: string;
  about: string | null;
  address: string;
  barangay: string | null;
  lat: number | null;
  lng: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  owner: string | null;
  coverPhotoUrl: string | null;
  isEcoCertified: boolean;
  ecoStatus: string;
  reviews: Review[];
  avgRating: number;
  reviewCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  HOTEL: "Hotel",
  RESORT: "Resort",
  RESTAURANT: "Restaurant",
  TOUR: "Tour",
  ARTISAN: "Artisan",
  TRAVEL_AND_TOURS: "Travel & Tours",
  EVENT_VENUE: "Event Venue",
};

async function getBusiness(id: string): Promise<BusinessDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/businesses/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.business ?? null;
  } catch {
    return null;
  }
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [business, session] = await Promise.all([getBusiness(id), getSession()]);

  if (!business) notFound();

  const mapsUrl =
    business.lat && business.lng
      ? `https://www.google.com/maps?q=${business.lat},${business.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`;

  return (
    <div className="space-y-5 pb-4">
      {/* Cover photo */}
      {business.coverPhotoUrl && (
        <div className="-mx-4 h-48 bg-gray-100 overflow-hidden">
          <img
            src={business.coverPhotoUrl}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABELS[business.category] ?? business.category}
          </Badge>
          {business.isEcoCertified && (
            <Badge
              variant="outline"
              className="text-[#2E7D32] border-[#2E7D32] text-xs"
            >
              <Leaf className="w-3 h-3 mr-1" /> Eco Certified
            </Badge>
          )}
          {business.ecoStatus !== "NONE" && !business.isEcoCertified && (
            <StatusBadge
              status={business.ecoStatus as "PENDING" | "APPROVED" | "REVOKED" | "NONE"}
            />
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900">{business.name}</h1>

        {business.avgRating > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(business.avgRating)} size="sm" />
            <span className="text-sm text-gray-600">
              {business.avgRating.toFixed(1)} ({business.reviewCount} review
              {business.reviewCount !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>

      {/* Save button (client action) */}
      <BusinessActions businessId={business.id} isSignedIn={!!session} />

      <Separator />

      {/* About */}
      {business.about && (
        <section>
          <h2 className="font-semibold text-sm text-gray-700 mb-1">About</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{business.about}</p>
        </section>
      )}

      {/* Contact info */}
      <section className="space-y-2">
        <h2 className="font-semibold text-sm text-gray-700">Contact & Location</h2>
        <div className="space-y-1.5 text-sm">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-[#2E7D32] hover:underline"
          >
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {business.address}
              {business.barangay ? `, ${business.barangay}` : ""}
              <ExternalLink className="w-3 h-3 inline ml-1 opacity-60" />
            </span>
          </a>

          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="flex items-center gap-2 text-gray-600 hover:text-[#2E7D32]"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>{business.phone}</span>
            </a>
          )}

          {business.email && (
            <a
              href={`mailto:${business.email}`}
              className="flex items-center gap-2 text-gray-600 hover:text-[#2E7D32]"
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>{business.email}</span>
            </a>
          )}

          {business.website && (
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-[#2E7D32]"
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate">{business.website}</span>
            </a>
          )}
        </div>
      </section>

      <Separator />

      {/* Reviews */}
      <section className="space-y-4">
        <h2 className="font-semibold text-sm text-gray-700">
          Reviews ({business.reviewCount})
        </h2>

        {/* Write review */}
        {session ? (
          <ReviewForm businessId={business.id} userId={session.userId} />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Sign in to write a review
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-[#2E7D32] hover:underline"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Review list */}
        {business.reviews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No reviews yet. Be the first!
          </p>
        ) : (
          <div className="space-y-4">
            {business.reviews.map((review) => (
              <div key={review.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-gray-100">
                    {review.user.firstName.charAt(0)}
                    {review.user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {review.user.firstName} {review.user.lastName}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  <StarRating value={review.rating} size="sm" />
                  {review.text && (
                    <p className="text-sm text-gray-600">{review.text}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

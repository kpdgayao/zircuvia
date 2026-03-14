"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Leaf, Hotel, UtensilsCrossed, TreePalm, Compass, Paintbrush, Plane, CalendarHeart } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  HOTEL: <Hotel className="w-8 h-8" />,
  RESORT: <TreePalm className="w-8 h-8" />,
  RESTAURANT: <UtensilsCrossed className="w-8 h-8" />,
  TOUR: <Compass className="w-8 h-8" />,
  ARTISAN: <Paintbrush className="w-8 h-8" />,
  TRAVEL_AND_TOURS: <Plane className="w-8 h-8" />,
  EVENT_VENUE: <CalendarHeart className="w-8 h-8" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  HOTEL: "from-blue-100 to-blue-50 text-blue-400",
  RESORT: "from-teal-100 to-teal-50 text-teal-400",
  RESTAURANT: "from-orange-100 to-orange-50 text-orange-400",
  TOUR: "from-green-100 to-green-50 text-green-500",
  ARTISAN: "from-purple-100 to-purple-50 text-purple-400",
  TRAVEL_AND_TOURS: "from-sky-100 to-sky-50 text-sky-400",
  EVENT_VENUE: "from-pink-100 to-pink-50 text-pink-400",
};

interface BusinessCardProps {
  business: {
    id: string;
    name: string;
    category: string;
    about?: string | null;
    address: string;
    isEcoCertified: boolean;
    coverPhotoUrl?: string | null;
    avgRating?: number;
    reviewCount?: number;
  };
  onClick?: () => void;
}

export function BusinessCard({ business, onClick }: BusinessCardProps) {
  const colorClass = CATEGORY_COLORS[business.category] ?? "from-gray-100 to-gray-50 text-gray-400";
  const icon = CATEGORY_ICONS[business.category] ?? <Compass className="w-8 h-8" />;

  return (
    <Card className="cursor-pointer hover:shadow-md transition overflow-hidden" onClick={onClick}>
      {business.coverPhotoUrl ? (
        <div className="h-32 bg-gray-100 overflow-hidden">
          <img
            src={business.coverPhotoUrl}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={`h-32 bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
          {icon}
        </div>
      )}
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-sm line-clamp-1">{business.name}</h3>
          {business.isEcoCertified && (
            <Badge
              variant="outline"
              className="text-[#2E7D32] border-[#2E7D32] text-xs shrink-0 ml-2"
            >
              <Leaf className="w-3 h-3 mr-1" /> Eco
            </Badge>
          )}
        </div>
        {business.about && (
          <p className="text-xs text-gray-500 line-clamp-2">{business.about}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="line-clamp-1">{business.address}</span>
        </div>
        {(business.avgRating ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{business.avgRating!.toFixed(1)}</span>
            <span className="text-gray-400">({business.reviewCount})</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

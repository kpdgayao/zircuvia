"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Leaf } from "lucide-react";

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
  return (
    <Card className="cursor-pointer hover:shadow-md transition" onClick={onClick}>
      {business.coverPhotoUrl && (
        <div className="h-32 bg-gray-100 rounded-t-lg overflow-hidden">
          <img
            src={business.coverPhotoUrl}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
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
          <MapPin className="w-3 h-3" />
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

"use client";

import { useState, useEffect } from "react";
import { Calendar, MapPin, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  coverPhotoUrl: string | null;
  isPromo: boolean;
  businessId: string | null;
  business: { id: string; name: string } | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuthAndFetch() {
      try {
        // Auth check — events page requires sign-in
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meData.user) {
          setAuthed(false);
          setLoading(false);
          return;
        }
        setAuthed(true);

        const res = await fetch("/api/events");
        if (res.ok) {
          const json = await res.json();
          setEvents(json.events);
        }
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndFetch();
  }, []);

  if (authed === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-sm text-gray-500">Sign in to view events</p>
        <Link href="/login" className="text-sm text-[#2E7D32] underline mt-2">
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Events</h1>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Upcoming Events</h1>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm text-gray-500">No upcoming events</p>
          <p className="text-xs text-gray-400 mt-1">
            Check back later for new events and promos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              {event.coverPhotoUrl && (
                <div className="h-40 bg-gray-100 overflow-hidden">
                  <img
                    src={event.coverPhotoUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2">
                    {event.title}
                  </h3>
                  {event.isPromo && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 shrink-0">
                      <Tag className="w-3 h-3 mr-1" />
                      Promo
                    </Badge>
                  )}
                </div>

                {event.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>
                    {formatDate(event.startDate)}
                    {event.endDate && ` - ${formatDate(event.endDate)}`}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                )}

                {event.business && (
                  <Link
                    href={`/listings/${event.business.id}`}
                    className="inline-block text-xs text-[#2E7D32] underline mt-1"
                  >
                    {event.business.name}
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

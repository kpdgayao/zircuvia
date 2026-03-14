export const BUSINESS_CATEGORIES = [
  { value: "HOTEL", label: "Hotel" },
  { value: "RESORT", label: "Resort" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "TOUR", label: "Tour" },
  { value: "ARTISAN", label: "Artisan" },
  { value: "TRAVEL_AND_TOURS", label: "Travel & Tours" },
  { value: "EVENT_VENUE", label: "Event Venue" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  BUSINESS_CATEGORIES.map((c) => [c.value, c.label])
);

export const DEFAULT_TEMP_PASSWORD = "Welcome2026!";

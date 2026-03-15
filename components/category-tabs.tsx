"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CategoryTab =
  | "All"
  | "Hotels"
  | "Restaurants"
  | "Tours"
  | "Artisan"
  | "Events";

const TAB_ITEMS: CategoryTab[] = [
  "All",
  "Hotels",
  "Restaurants",
  "Tours",
  "Artisan",
  "Events",
];

export function getCategoryEnums(tab: CategoryTab): string[] {
  switch (tab) {
    case "All":
      return [];
    case "Hotels":
      return ["HOTEL", "RESORT"];
    case "Restaurants":
      return ["RESTAURANT"];
    case "Tours":
      return ["TOUR", "TRAVEL_AND_TOURS"];
    case "Artisan":
      return ["ARTISAN"];
    case "Events":
      return ["EVENT_VENUE"];
    default:
      return [];
  }
}

/** Map a raw business category enum (e.g. "HOTEL") to the corresponding tab label */
export function categoryEnumToTab(category: string): CategoryTab {
  const upper = category.toUpperCase();
  for (const tab of TAB_ITEMS) {
    if (tab === "All") continue;
    if (getCategoryEnums(tab).includes(upper)) return tab;
  }
  return "All";
}

interface CategoryTabsProps {
  value: CategoryTab;
  onChange: (tab: CategoryTab) => void;
}

export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CategoryTab)}>
      <TabsList className="flex gap-1 overflow-x-auto h-auto flex-wrap">
        {TAB_ITEMS.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="text-xs px-3 py-1.5">
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

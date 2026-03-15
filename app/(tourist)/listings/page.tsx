"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BusinessCard } from "@/components/business-card";
import { CategoryTabs, getCategoryEnums, categoryEnumToTab, type CategoryTab } from "@/components/category-tabs";
import { SearchWithHistory } from "@/components/search-with-history";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSurveyContext } from "@/components/survey/SurveyProvider";

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

interface ApiResponse {
  businesses: BusinessSummary[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Business Directory</h1>
        <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <ListingsContent />
    </Suspense>
  );
}

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { markAction } = useSurveyContext();
  const categoryParam = searchParams.get("category");
  const initialTab = categoryParam ? categoryEnumToTab(categoryParam) : "All";

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CategoryTab>(initialTab);
  const [ecoOnly, setEcoOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");
      if (search) params.set("search", search);
      if (ecoOnly) params.set("ecoOnly", "true");

      const categories = getCategoryEnums(activeTab);
      if (categories.length > 0) {
        params.set("category", categories.join(","));
      }

      const res = await fetch(`/api/businesses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching businesses:", err);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab, ecoOnly, page]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    if (data && data.businesses.length > 0 && search) markAction("business_search");
  }, [data, search, markAction]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, activeTab, ecoOnly]);

  const handleSearch = (query: string) => {
    setSearch(query);
  };

  const businesses = data?.businesses ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Business Directory</h1>

      {/* Search */}
      <SearchWithHistory
        value={search}
        onChange={setSearch}
        onSearch={handleSearch}
        placeholder="Search businesses…"
        storageKey="business_search_history"
      />

      {/* Category tabs */}
      <CategoryTabs value={activeTab} onChange={setActiveTab} />

      {/* Eco toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="eco-only"
          checked={ecoOnly}
          onCheckedChange={setEcoOnly}
        />
        <Label htmlFor="eco-only" className="text-sm cursor-pointer">
          Eco businesses only
        </Label>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">
          No businesses found.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {businesses.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              onClick={() => router.push(`/listings/${b.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

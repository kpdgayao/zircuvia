"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/data-table";
import { SearchWithHistory } from "@/components/search-with-history";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { BUSINESS_CATEGORIES, CATEGORY_LABELS } from "@/lib/business-constants";

const ALL_CATEGORIES = [{ value: "", label: "All Categories" }, ...BUSINESS_CATEGORIES];

interface BusinessRow extends Record<string, unknown> {
  id: string;
  name: string;
  category: string;
  address: string;
  isEcoCertified: boolean;
  ecoStatus: string;
  isArchived: boolean;
  createdAt: string;
}

export default function AdminBusinessesPage() {
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ businesses: BusinessRow[]; totalPages: number }>({ businesses: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (searchQuery) params.set("search", searchQuery);
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      if (tab === "archived") params.set("archived", "true");
      const res = await fetch(`/api/businesses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData({ businesses: json.businesses ?? [], totalPages: json.totalPages ?? 1 });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, category, sort, tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, category, tab]);

  const columns: Column<BusinessRow>[] = [
    { key: "name", label: "Name" },
    {
      key: "category", label: "Category",
      render: (row) => CATEGORY_LABELS[row.category] ?? row.category,
    },
    { key: "address", label: "Address" },
    {
      key: "ecoStatus", label: "Eco Status",
      render: (row) => (
        <StatusBadge status={row.ecoStatus as "NONE" | "PENDING" | "APPROVED" | "REVOKED"} />
      ),
    },
    {
      key: "actions", label: "Actions",
      render: (row) => (
        <Link href={`/admin/businesses/${row.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
        <Link href="/admin/businesses/new">
          <Button className="bg-[#2E7D32] hover:bg-[#1B5E20]">
            <Plus className="h-4 w-4 mr-2" />
            Add Business
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="active" onValueChange={(v) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 max-w-sm">
            <SearchWithHistory
              value={search}
              onChange={setSearch}
              onSearch={(q) => setSearchQuery(q)}
              placeholder="Search businesses..."
              storageKey="admin_biz_search"
            />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {ALL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value || "__all__"}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v ?? "desc")}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="active" className="mt-4">
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : (
            <DataTable<BusinessRow>
              columns={columns}
              data={data.businesses}
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              emptyMessage="No businesses found."
            />
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : (
            <DataTable<BusinessRow>
              columns={columns}
              data={data.businesses}
              page={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              emptyMessage="No archived businesses."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

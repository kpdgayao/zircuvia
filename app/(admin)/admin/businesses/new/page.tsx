"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  { value: "HOTEL", label: "Hotel" },
  { value: "RESORT", label: "Resort" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "TOUR", label: "Tour" },
  { value: "ARTISAN", label: "Artisan" },
  { value: "TRAVEL_AND_TOURS", label: "Travel & Tours" },
  { value: "EVENT_VENUE", label: "Event Venue" },
];

export default function NewBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "HOTEL",
    about: "",
    address: "",
    barangay: "",
    email: "",
    phone: "",
    website: "",
    owner: "",
    coverPhotoUrl: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          about: form.about || undefined,
          barangay: form.barangay || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          website: form.website || undefined,
          owner: form.owner || undefined,
          coverPhotoUrl: form.coverPhotoUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create business");
        return;
      }

      router.push("/admin/businesses");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/businesses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Business</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={form.category} onValueChange={(v) => handleChange("category", v ?? "HOTEL")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="about">About</Label>
              <Textarea
                id="about"
                value={form.about}
                onChange={(e) => {
                  if (e.target.value.length <= 300) handleChange("about", e.target.value);
                }}
                rows={3}
              />
              <p className="text-xs text-gray-500 text-right">{form.about.length}/300</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" value={form.address} onChange={(e) => handleChange("address", e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barangay">Barangay</Label>
              <Input id="barangay" value={form.barangay} onChange={(e) => handleChange("barangay", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => handleChange("website", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input id="owner" value={form.owner} onChange={(e) => handleChange("owner", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverPhotoUrl">Cover Photo URL</Label>
              <Input id="coverPhotoUrl" value={form.coverPhotoUrl} onChange={(e) => handleChange("coverPhotoUrl", e.target.value)} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="bg-[#2E7D32] hover:bg-[#1B5E20]">
                {loading ? "Creating..." : "Create Business"}
              </Button>
              <Link href="/admin/businesses">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

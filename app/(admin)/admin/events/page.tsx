"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";

interface EventRow extends Record<string, unknown> {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  isPromo: boolean;
  businessId: string | null;
  business: { id: string; name: string } | null;
}

interface BusinessOption {
  id: string;
  name: string;
}

const defaultForm = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  isPromo: false,
  businessId: "",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventRow | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/businesses?limit=100");
      if (res.ok) {
        const json = await res.json();
        setBusinesses(
          (json.businesses ?? []).map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchBusinesses();
  }, [fetchEvents, fetchBusinesses]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (event: EventRow) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? "",
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      location: event.location ?? "",
      isPromo: event.isPromo,
      businessId: event.businessId ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate) {
      setFormError("Title and start date are required.");
      return;
    }
    setSaving(true);
    setFormError("");

    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        location: form.location || undefined,
        isPromo: form.isPromo,
        businessId: form.businessId || undefined,
      };

      const url = editingId ? `/api/events/${editingId}` : "/api/events";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save event");
        return;
      }

      setDialogOpen(false);
      fetchEvents();
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/events/${deleteTarget.id}`, { method: "DELETE" });
      fetchEvents();
    } catch {
      // ignore
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const columns: Column<EventRow>[] = [
    { key: "title", label: "Title" },
    {
      key: "startDate",
      label: "Start Date",
      render: (row) =>
        new Date(row.startDate).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    },
    {
      key: "endDate",
      label: "End Date",
      render: (row) =>
        row.endDate
          ? new Date(row.endDate).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
    },
    { key: "location", label: "Location", render: (row) => row.location ?? "—" },
    {
      key: "isPromo",
      label: "Promo",
      render: (row) =>
        row.isPromo ? (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            Promo
          </span>
        ) : (
          <span className="text-xs text-gray-400">Event</span>
        ),
    },
    {
      key: "business",
      label: "Business",
      render: (row) => row.business?.name ?? "—",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              setDeleteTarget(row);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-[#2E7D32]" />
          <h1 className="text-2xl font-bold text-gray-900">Events & Promos</h1>
        </div>
        <Button className="bg-[#2E7D32] hover:bg-[#1B5E20]" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : (
            <DataTable<EventRow>
              columns={columns}
              data={events}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              emptyMessage="No events found."
            />
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{formError}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-start">Start Date *</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">End Date</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-business">Associated Business</Label>
              <Select
                value={form.businessId || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, businessId: !v || v === "__none__" ? "" : v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isPromo}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isPromo: Boolean(checked) }))
                }
              />
              <Label>Mark as Promo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2E7D32] hover:bg-[#1B5E20]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Event"
        description={`Are you sure you want to delete "${deleteTarget?.title ?? ""}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}

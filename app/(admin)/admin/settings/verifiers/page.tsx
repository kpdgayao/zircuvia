"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { Settings, Plus, Pencil, Trash2, Users } from "lucide-react";

interface VerifierRow extends Record<string, unknown> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  verifierProfile: {
    id: string;
    assignedLocationId: string | null;
    assignedLocation: { id: string; name: string } | null;
  } | null;
}

interface BusinessOption {
  id: string;
  name: string;
}

const defaultForm = {
  firstName: "",
  lastName: "",
  email: "",
  assignedLocationId: "",
};

export default function AdminVerifiersPage() {
  const [verifiers, setVerifiers] = useState<VerifierRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VerifierRow | null>(null);

  const fetchVerifiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verifiers");
      if (res.ok) {
        const json = await res.json();
        setVerifiers(json.verifiers ?? []);
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
    fetchVerifiers();
    fetchBusinesses();
  }, [fetchVerifiers, fetchBusinesses]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (verifier: VerifierRow) => {
    setEditingId(verifier.id);
    setForm({
      firstName: verifier.firstName,
      lastName: verifier.lastName,
      email: verifier.email,
      assignedLocationId:
        verifier.verifierProfile?.assignedLocationId ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");

    try {
      if (editingId) {
        // Update assignment only
        const res = await fetch(`/api/admin/verifiers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedLocationId: form.assignedLocationId || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to update");
          return;
        }
      } else {
        // Create new verifier
        if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
          setFormError("First name, last name, and email are required.");
          return;
        }
        const res = await fetch("/api/admin/verifiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            assignedLocationId: form.assignedLocationId || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to create verifier");
          return;
        }
      }

      setDialogOpen(false);
      fetchVerifiers();
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/verifiers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchVerifiers();
      }
    } catch {
      // ignore
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const columns: Column<VerifierRow>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    { key: "email", label: "Email" },
    {
      key: "location",
      label: "Assigned Location",
      render: (row) =>
        row.verifierProfile?.assignedLocation?.name ?? (
          <span className="text-gray-400">Unassigned</span>
        ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) =>
        new Date(row.createdAt).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
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
          <Settings className="h-6 w-6 text-[#2E7D32]" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Link href="/admin/settings">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Admin Users
          </Button>
        </Link>
        <Button variant="default" className="bg-[#2E7D32] hover:bg-[#1B5E20]">
          Verifiers
        </Button>
      </div>

      {/* Verifier List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Verifiers</CardTitle>
          <Button
            size="sm"
            className="bg-[#2E7D32] hover:bg-[#1B5E20]"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Verifier
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : (
            <DataTable<VerifierRow>
              columns={columns}
              data={verifiers}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              emptyMessage="No verifiers found."
            />
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Verifier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Verifier Assignment" : "Add Verifier"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {!editingId && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="verifier-first">First Name *</Label>
                    <Input
                      id="verifier-first"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verifier-last">Last Name *</Label>
                    <Input
                      id="verifier-last"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verifier-email">Email *</Label>
                  <Input
                    id="verifier-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Default password: Welcome2026! (user must change on first login)
                </p>
              </>
            )}

            <div className="space-y-2">
              <Label>Assigned Location</Label>
              <Select
                value={form.assignedLocationId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    assignedLocationId: !v || v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a business" />
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
        title="Delete Verifier"
        description={`Are you sure you want to delete "${deleteTarget?.firstName ?? ""} ${deleteTarget?.lastName ?? ""}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}

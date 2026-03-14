"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import { Settings, Plus, Pencil, Trash2, Users } from "lucide-react";

interface AdminAccess {
  businessManagement: boolean;
  ecoBusinessProcessing: boolean;
  environmentalFees: boolean;
  visitorStats: boolean;
  eventsAndPromos: boolean;
  systemLogs: boolean;
  settings: boolean;
}

interface AdminRow extends Record<string, unknown> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  adminAccess: AdminAccess | null;
}

const PERMISSION_LABELS: { key: keyof AdminAccess; label: string }[] = [
  { key: "businessManagement", label: "Business Management" },
  { key: "ecoBusinessProcessing", label: "Eco Business Processing" },
  { key: "environmentalFees", label: "Environmental Fees" },
  { key: "visitorStats", label: "Visitor Stats" },
  { key: "eventsAndPromos", label: "Events & Promos" },
  { key: "systemLogs", label: "System Logs" },
  { key: "settings", label: "Settings" },
];

const defaultPermissions: AdminAccess = {
  businessManagement: false,
  ecoBusinessProcessing: false,
  environmentalFees: false,
  visitorStats: false,
  eventsAndPromos: false,
  systemLogs: false,
  settings: false,
};

const defaultForm = {
  firstName: "",
  lastName: "",
  email: "",
  permissions: { ...defaultPermissions },
};

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        setAdmins(json.admins ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (admin: AdminRow) => {
    setEditingId(admin.id);
    setForm({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      permissions: admin.adminAccess
        ? { ...admin.adminAccess }
        : { ...defaultPermissions },
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError("");

    try {
      if (editingId) {
        // Update permissions only
        const res = await fetch(`/api/admin/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: form.permissions }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to update");
          return;
        }
      } else {
        // Create new admin
        if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
          setFormError("All fields are required.");
          return;
        }
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            permissions: form.permissions,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || "Failed to create admin");
          return;
        }
      }

      setDialogOpen(false);
      fetchAdmins();
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAdmins();
      }
    } catch {
      // ignore
    } finally {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const togglePermission = (key: keyof AdminAccess) => {
    setForm((f) => ({
      ...f,
      permissions: { ...f.permissions, [key]: !f.permissions[key] },
    }));
  };

  const columns: Column<AdminRow>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => `${row.firstName} ${row.lastName}`,
    },
    { key: "email", label: "Email" },
    {
      key: "permissions",
      label: "Permissions",
      render: (row) => {
        if (!row.adminAccess) return <span className="text-gray-400">None</span>;
        const active = PERMISSION_LABELS.filter(
          (p) => row.adminAccess?.[p.key]
        );
        return (
          <div className="flex flex-wrap gap-1">
            {active.length === 0 ? (
              <span className="text-gray-400 text-xs">None</span>
            ) : (
              active.map((p) => (
                <span
                  key={p.key}
                  className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded"
                >
                  {p.label}
                </span>
              ))
            )}
          </div>
        );
      },
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
        <Button variant="default" className="bg-[#2E7D32] hover:bg-[#1B5E20]">
          <Users className="h-4 w-4 mr-2" />
          Admin Users
        </Button>
        <Link href="/admin/settings/verifiers">
          <Button variant="outline">Verifiers</Button>
        </Link>
      </div>

      {/* Admin Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Admin Users</CardTitle>
          <Button
            size="sm"
            className="bg-[#2E7D32] hover:bg-[#1B5E20]"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Admin
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
          ) : (
            <DataTable<AdminRow>
              columns={columns}
              data={admins}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              emptyMessage="No admin users found."
            />
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Admin Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Admin Permissions" : "Add Admin User"}
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
                    <Label htmlFor="admin-first">First Name *</Label>
                    <Input
                      id="admin-first"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-last">Last Name *</Label>
                    <Input
                      id="admin-last"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
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

            <div className="space-y-3">
              <Label className="text-sm font-medium">Permissions</Label>
              {PERMISSION_LABELS.map((perm) => (
                <div
                  key={perm.key}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm">{perm.label}</span>
                  <Switch
                    checked={form.permissions[perm.key]}
                    onCheckedChange={() => togglePermission(perm.key)}
                  />
                </div>
              ))}
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
        title="Delete Admin"
        description={`Are you sure you want to delete "${deleteTarget?.firstName ?? ""} ${deleteTarget?.lastName ?? ""}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}

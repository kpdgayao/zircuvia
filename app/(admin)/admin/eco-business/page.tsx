"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Leaf, CheckCircle, XCircle } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/business-constants";

interface BusinessRow extends Record<string, unknown> {
  id: string;
  name: string;
  category: string;
  address: string;
  ecoStatus: string;
  isEcoCertified: boolean;
}

export default function EcoBusinessPage() {
  const [pendingData, setPendingData] = useState<BusinessRow[]>([]);
  const [approvedData, setApprovedData] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all businesses and filter by eco status client-side
      const res = await fetch("/api/businesses?limit=100");
      if (res.ok) {
        const json = await res.json();
        const all: BusinessRow[] = json.businesses ?? [];
        setPendingData(all.filter((b) => b.ecoStatus === "PENDING"));
        setApprovedData(all.filter((b) => b.ecoStatus === "APPROVED"));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    try {
      const res = await fetch(`/api/businesses/${confirmAction.id}/eco-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: confirmAction.status }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const openConfirm = (id: string, status: string, name: string) => {
    setConfirmAction({ id, status, name });
    setConfirmOpen(true);
  };

  const pendingColumns: Column<BusinessRow>[] = [
    { key: "name", label: "Business Name" },
    { key: "category", label: "Category", render: (row) => CATEGORY_LABELS[row.category] ?? row.category },
    { key: "address", label: "Address" },
    {
      key: "actions", label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" className="bg-[#2E7D32] hover:bg-[#1B5E20]"
            onClick={() => openConfirm(row.id, "APPROVED", row.name)}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => openConfirm(row.id, "REVOKED", row.name)}>
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const approvedColumns: Column<BusinessRow>[] = [
    { key: "name", label: "Business Name" },
    { key: "category", label: "Category", render: (row) => CATEGORY_LABELS[row.category] ?? row.category },
    { key: "address", label: "Address" },
    {
      key: "ecoStatus", label: "Status",
      render: (row) => <StatusBadge status={row.ecoStatus as "APPROVED"} />,
    },
    {
      key: "actions", label: "Actions",
      render: (row) => (
        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
          onClick={() => openConfirm(row.id, "REVOKED", row.name)}>
          <XCircle className="h-4 w-4 mr-1" />
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Leaf className="h-6 w-6 text-[#2E7D32]" />
        <h1 className="text-2xl font-bold text-gray-900">Eco Business Management</h1>
      </div>

      {/* Pending Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
          ) : (
            <DataTable<BusinessRow>
              columns={pendingColumns}
              data={pendingData}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              emptyMessage="No pending applications."
            />
          )}
        </CardContent>
      </Card>

      {/* Approved Eco Businesses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved Eco Businesses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
          ) : (
            <DataTable<BusinessRow>
              columns={approvedColumns}
              data={approvedData}
              page={1}
              totalPages={1}
              onPageChange={() => {}}
              emptyMessage="No approved eco businesses."
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          confirmAction?.status === "APPROVED"
            ? "Approve Eco Certification"
            : "Revoke Eco Certification"
        }
        description={
          confirmAction?.status === "APPROVED"
            ? `Grant eco certification to "${confirmAction?.name ?? ""}"? This will display the eco badge on their listing.`
            : `Revoke eco certification from "${confirmAction?.name ?? ""}"? The eco badge will be removed.`
        }
        onConfirm={handleStatusChange}
        confirmLabel={confirmAction?.status === "APPROVED" ? "Approve" : "Revoke"}
        variant={confirmAction?.status === "APPROVED" ? "default" : "destructive"}
      />
    </div>
  );
}

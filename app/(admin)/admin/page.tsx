import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { PAYER_TYPE_LABELS } from "@/lib/fee-constants";
import { Users, Receipt, TrendingUp, MapPin } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/admin-login");

  // Total visitors and amount from confirmed payments
  const aggregates = await prisma.feePayment.aggregate({
    where: { status: { in: ["ACTIVE", "EXPIRED"] } },
    _sum: { totalPersons: true, totalAmount: true },
    _count: true,
  });

  const totalVisitors = aggregates._sum.totalPersons ?? 0;
  const totalAmount = aggregates._sum.totalAmount ?? 0;
  const totalPayments = aggregates._count;

  // Breakdown by payer type
  const lines = await prisma.feePaymentLine.findMany({
    where: { feePayment: { status: { in: ["ACTIVE", "EXPIRED"] } } },
    select: { payerType: true, quantity: true, lineTotal: true },
  });

  const breakdownMap: Record<string, { persons: number; amount: number }> = {};
  for (const line of lines) {
    if (!breakdownMap[line.payerType]) {
      breakdownMap[line.payerType] = { persons: 0, amount: 0 };
    }
    breakdownMap[line.payerType].persons += line.quantity;
    breakdownMap[line.payerType].amount += line.lineTotal;
  }

  const breakdown = Object.entries(breakdownMap).map(([payerType, data]) => ({
    payerType,
    label: PAYER_TYPE_LABELS[payerType] ?? payerType,
    ...data,
  }));

  // Top 5 places by check-in count
  const topPlacesRaw = await prisma.checkIn.groupBy({
    by: ["verifierId"],
    _sum: { totalPersons: true },
    orderBy: { _sum: { totalPersons: "desc" } },
    take: 5,
  });

  const verifierIds = topPlacesRaw.map((v) => v.verifierId);
  const verifiers = verifierIds.length > 0
    ? await prisma.verifierProfile.findMany({
        where: { id: { in: verifierIds } },
        include: { assignedLocation: { select: { id: true, name: true } } },
      })
    : [];

  const verifierMap = Object.fromEntries(verifiers.map((v) => [v.id, v]));

  const topPlaces = topPlacesRaw
    .map((item) => {
      const verifier = verifierMap[item.verifierId];
      return {
        name: verifier?.assignedLocation?.name ?? "Unknown Location",
        visitors: item._sum.totalPersons ?? 0,
      };
    })
    .filter((p) => p.name !== "Unknown Location");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Visitors</CardTitle>
            <Users className="h-5 w-5 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisitors.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">{totalPayments} fee payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Collected</CardTitle>
            <Receipt className="h-5 w-5 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">Environmental fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Per Payment</CardTitle>
            <TrendingUp className="h-5 w-5 text-[#2E7D32]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPayments > 0 ? formatCurrency(totalAmount / totalPayments) : formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Overview by Payer Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visitor Overview by Payer Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payer Type</TableHead>
                <TableHead className="text-right">Persons</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-6">No data available</TableCell>
                </TableRow>
              ) : (
                breakdown.map((row) => (
                  <TableRow key={row.payerType}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.persons.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top 5 Places by Check-in Count */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <MapPin className="h-5 w-5 text-[#2E7D32]" />
          <CardTitle className="text-base">Top 5 Places by Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Place</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPlaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-gray-500 py-6">No check-in data</TableCell>
                </TableRow>
              ) : (
                topPlaces.map((place, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{place.name}</TableCell>
                    <TableCell className="text-right">{place.visitors.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

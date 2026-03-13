import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PAYER_TYPE_LABELS } from "@/lib/fee-constants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface InvoiceLine {
  payerType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface InvoiceViewProps {
  referenceId: string;
  status: "ACTIVE" | "PENDING" | "EXPIRED" | "FAILED";
  validFrom: Date | string;
  validUntil: Date | string;
  lines: InvoiceLine[];
  totalAmount: number;
  paidAt?: Date | string | null;
}

export function InvoiceView({
  referenceId,
  status,
  validFrom,
  validUntil,
  lines,
  totalAmount,
  paidAt,
}: InvoiceViewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Reference</p>
          <p className="font-mono font-semibold text-sm">{referenceId}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <Separator />

      {/* Validity */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Valid From</p>
          <p className="font-medium">{formatDate(validFrom)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Valid Until</p>
          <p className="font-medium">{formatDate(validUntil)}</p>
        </div>
        {paidAt && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Paid On</p>
            <p className="font-medium">{formatDate(paidAt)}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Line items */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Payer Breakdown
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">
                  {PAYER_TYPE_LABELS[line.payerType] ?? line.payerType}
                </TableCell>
                <TableCell className="text-right text-sm">{line.quantity}</TableCell>
                <TableCell className="text-right text-sm">
                  {formatCurrency(line.unitPrice)}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatCurrency(line.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Separator />

      {/* Grand total */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Grand Total</span>
        <span className="font-bold text-lg text-[#2E7D32]">
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}

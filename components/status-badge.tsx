import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "ACTIVE"
  | "PENDING"
  | "EXPIRED"
  | "FAILED"
  | "APPROVED"
  | "REVOKED"
  | "NONE";

interface StatusBadgeProps {
  status: StatusVariant;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusVariant,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  REVOKED: {
    label: "Revoked",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  NONE: {
    label: "None",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.NONE;
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

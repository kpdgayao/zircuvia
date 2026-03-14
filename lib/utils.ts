import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function parseDateRangeFilter(from: string | null, to: string | null) {
  const filter: { gte?: Date; lte?: Date } = {};
  if (from) { const d = new Date(from); if (!isNaN(d.getTime())) filter.gte = d; }
  if (to) { const d = new Date(to); if (!isNaN(d.getTime())) filter.lte = d; }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function generateReferenceId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ZV-${date}-${rand}`;
}

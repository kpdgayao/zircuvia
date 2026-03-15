import { toast } from "sonner";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { formatDate } from "@/lib/utils";

/** Map raw API errors to user-friendly messages. Uses optional payment status for contextual messaging. */
export function mapVerifyError(rawError: string, paymentStatus?: string, validUntil?: string): string {
  if (rawError === "Already checked in today") {
    return "This payment was already verified today. They can check in again tomorrow.";
  }
  if (rawError === "Payment has expired") {
    const dateStr = validUntil ? ` on ${formatDate(validUntil)}` : "";
    return `This payment expired${dateStr}. The visitor needs to purchase a new fee.`;
  }
  if (rawError === "Payment is not active") {
    const status = paymentStatus?.toLowerCase() ?? "inactive";
    return `This payment cannot be verified — its status is ${status}. The visitor may need to complete or repurchase their fee.`;
  }
  if (rawError === "Verifier profile not found") {
    return "Your verifier profile is missing. Contact your administrator.";
  }
  return "Something went wrong. Please try again.";
}

/** Check response for 401/403 and redirect to login. Returns true if redirected. */
export function handleAuthError(res: Response, router: AppRouterInstance): boolean {
  if (res.status === 401 || res.status === 403) {
    toast.error("Session expired. Please sign in again.");
    router.replace("/checker-login");
    return true;
  }
  return false;
}

"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OTPInput } from "@/components/otp-input";
import { ZircuviaLogo } from "@/components/illustrations";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const userEmail = searchParams.get("email") ?? "";
  const isMock = searchParams.get("mock") === "1";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (res.status === 410) {
        toast.error("Code expired. Please request a new one.");
        return;
      }
      if (!res.ok) {
        toast.error(data.message ?? "Verification failed");
        return;
      }
      router.push(data.redirectTo ?? "/");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!userEmail) {
      toast.error("Could not resend code. Please try registering again.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, type: "SIGNUP" }),
      });
      const data = await res.json();
      if (data.mock && data.code) {
        toast.info(`Your verification code is ${data.code}`);
      } else {
        toast.success("A new code has been sent to your email");
      }
    } catch {
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ZircuviaLogo className="w-9 h-9" />
          <span className="text-3xl font-bold" style={{ color: "#2E7D32" }}>ZircuVia</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {isMock
            ? "Enter the 6-digit code shown in the notification"
            : "Enter the 6-digit code sent to your email"}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <OTPInput value={code} onChange={setCode} />

          <Button
            type="submit"
            className="w-full"
            disabled={loading || code.length < 6}
            style={{ backgroundColor: "#2E7D32" }}
          >
            {loading ? "Verifying…" : "Verify Email"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Didn&apos;t receive a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-medium hover:underline disabled:opacity-50"
            style={{ color: "#2E7D32" }}
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
        </p>
      </CardContent>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-gray-500 py-8">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}

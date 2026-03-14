"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OTPInput } from "@/components/otp-input";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    toast.info("Your verification code is 123456");
  }, []);

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

  function handleResend() {
    toast.info("Your verification code is 123456");
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="text-3xl font-bold mb-1" style={{ color: "#2E7D32" }}>
          ZircuVia
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to your email
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
            className="font-medium hover:underline"
            style={{ color: "#2E7D32" }}
          >
            Resend code
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

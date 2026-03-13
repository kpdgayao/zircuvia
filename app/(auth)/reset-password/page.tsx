"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OTPInput } from "@/components/otp-input";
import { CheckCircle2, XCircle } from "lucide-react";

interface PasswordRules {
  minLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function checkPassword(pw: string): PasswordRules {
  return {
    minLength: pw.length >= 8,
    hasLower: /[a-z]/.test(pw),
    hasUpper: /[A-Z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[^a-zA-Z0-9]/.test(pw),
  };
}

function RuleItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {ok ? (
        <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
      ) : (
        <XCircle className="size-3.5 text-muted-foreground shrink-0" />
      )}
      <span className={ok ? "text-green-700" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forced = searchParams.get("forced") === "true";

  // forced=true means user is already logged in, skip to step 3
  const [step, setStep] = useState<1 | 2 | 3>(forced ? 3 : 1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  const rules = checkPassword(newPassword);
  const allRulesPass = Object.values(rules).every(Boolean);

  // Step 1: Enter email
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.info("Your verification code is 123456");
    setStep(2);
  }

  // Step 2: Enter OTP
  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setStep(3);
  }

  // Step 3: Enter new password
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRulesPass) {
      toast.error("Password does not meet all requirements");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // For forced password change, we need to supply a dummy email + code
      // since the user is already authenticated; the API still needs them.
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forced ? "__forced__" : email,
          code: forced ? "123456" : code,
          newPassword,
        }),
      });
      const data = await res.json();

      if (forced && !res.ok) {
        // For forced flow, submit with actual session email via /api/auth/me
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData.user?.email) {
          const retryRes = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: meData.user.email, code: "123456", newPassword }),
          });
          const retryData = await retryRes.json();
          if (!retryRes.ok) {
            toast.error(retryData.message ?? "Reset failed");
            return;
          }
          toast.success("Password updated successfully");
          router.push("/login");
          return;
        }
        toast.error(data.message ?? "Reset failed");
        return;
      }

      if (!res.ok) {
        toast.error(data.message ?? "Reset failed");
        return;
      }
      toast.success("Password reset successful");
      router.push("/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="text-3xl font-bold mb-1" style={{ color: "#2E7D32" }}>
          ZircuVia
        </div>
        <p className="text-sm text-muted-foreground">
          {step === 1 && "Reset your password"}
          {step === 2 && "Enter verification code"}
          {step === 3 && (forced ? "Set a new password" : "Choose a new password")}
        </p>
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: "#2E7D32" }}
            >
              Send Verification Code
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="hover:underline" style={{ color: "#2E7D32" }}>
                Back to Sign In
              </Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCodeSubmit} className="space-y-6">
            <p className="text-sm text-center text-muted-foreground">
              A code was sent to <strong>{email}</strong>
            </p>
            <OTPInput value={code} onChange={setCode} />
            <Button
              type="submit"
              className="w-full"
              disabled={code.length < 6}
              style={{ backgroundColor: "#2E7D32" }}
            >
              Verify Code
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive a code?{" "}
              <button
                type="button"
                className="font-medium hover:underline"
                style={{ color: "#2E7D32" }}
                onClick={() => toast.info("Your verification code is 123456")}
              >
                Resend
              </button>
            </p>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setPwFocused(true)}
                placeholder="••••••••"
              />
              {(pwFocused || newPassword.length > 0) && (
                <ul className="mt-1.5 space-y-0.5 pl-0.5">
                  <RuleItem ok={rules.minLength} label="At least 8 characters" />
                  <RuleItem ok={rules.hasUpper} label="One uppercase letter" />
                  <RuleItem ok={rules.hasLower} label="One lowercase letter" />
                  <RuleItem ok={rules.hasNumber} label="One number" />
                  <RuleItem ok={rules.hasSpecial} label="One special character" />
                </ul>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ backgroundColor: "#2E7D32" }}
            >
              {loading ? "Saving…" : "Set New Password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle2, XCircle, Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { ZircuviaLogo } from "@/components/illustrations";

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

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const rules = useMemo(() => checkPassword(password), [password]);
  const allRulesPass = useMemo(() => Object.values(rules).every(Boolean), [rules]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!allRulesPass) {
      toast.error("Password does not meet all requirements");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!agreed) {
      toast.error("Please accept the Terms and Conditions");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Registration failed");
        return;
      }
      if (data.mock && data.code) {
        toast.info(`Your verification code is ${data.code}`);
      } else {
        toast.success("Verification code sent to your email");
      }
      router.push(`/verify-otp?userId=${data.userId}&email=${encodeURIComponent(email)}&mock=${data.mock ? "1" : "0"}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ZircuviaLogo className="w-9 h-9" />
          <span className="text-3xl font-bold" style={{ color: "#2E7D32" }}>ZircuVia</span>
        </div>
        <p className="text-sm text-muted-foreground">Create your account</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPwFocused(true)}
                placeholder="••••••••"
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {(pwFocused || password.length > 0) && (
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
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-[#2E7D32]"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-sm text-muted-foreground">
              I agree to the{" "}
              <span className="font-medium" style={{ color: "#2E7D32" }}>
                Terms and Conditions
              </span>
            </span>
          </label>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            style={{ backgroundColor: "#2E7D32" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium hover:underline" style={{ color: "#2E7D32" }}>
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

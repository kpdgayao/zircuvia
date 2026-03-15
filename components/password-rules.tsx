"use client";
import { useMemo } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface PasswordRules {
  minLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function checkPassword(pw: string): PasswordRules {
  return {
    minLength: pw.length >= 8,
    hasLower: /[a-z]/.test(pw),
    hasUpper: /[A-Z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecial: /[^a-zA-Z0-9]/.test(pw),
  };
}

export function usePasswordRules(password: string) {
  const rules = useMemo(() => checkPassword(password), [password]);
  const allPass = useMemo(() => Object.values(rules).every(Boolean), [rules]);
  return { rules, allPass };
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

export function PasswordRulesList({ password, visible }: { password: string; visible: boolean }) {
  const { rules } = usePasswordRules(password);
  if (!visible) return null;
  return (
    <ul className="mt-1.5 space-y-0.5 pl-0.5">
      <RuleItem ok={rules.minLength} label="At least 8 characters" />
      <RuleItem ok={rules.hasUpper} label="One uppercase letter" />
      <RuleItem ok={rules.hasLower} label="One lowercase letter" />
      <RuleItem ok={rules.hasNumber} label="One number" />
      <RuleItem ok={rules.hasSpecial} label="One special character" />
    </ul>
  );
}

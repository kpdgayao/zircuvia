# Login & Register UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password visibility toggle, input icons, demo quick-fill buttons, and loading spinners to the login and register pages.

**Architecture:** Direct edits to two page-level components. No new files or components needed — all changes are inline using existing lucide-react icons and Tailwind utilities.

**Tech Stack:** Next.js 15 (App Router), React, Tailwind CSS 4, lucide-react, shadcn-style Input/Button/Card components

**Spec:** `docs/superpowers/specs/2026-03-15-login-ux-improvements-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/(auth)/login/page.tsx` | Modify | Password toggle, input icons, demo quick-fill, spinner |
| `app/(auth)/register/page.tsx` | Modify | Password toggle (2 fields), input icons, spinner |

No new files created.

---

## Chunk 1: Login Page

### Task 1: Update login page with all improvements

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Update imports**

Add lucide-react icons to the existing import block:

```tsx
import { Eye, EyeOff, Mail, Lock, Loader2, MapPin, Shield, BadgeCheck } from "lucide-react";
```

- [ ] **Step 2: Add state for password visibility**

Add after the existing `useState` declarations (line 16):

```tsx
const [showPassword, setShowPassword] = useState(false);
```

- [ ] **Step 3: Add `handleDemoLogin` function**

Add after the `handleSubmit` function. This function bypasses React state to avoid batching race conditions — it calls the API directly with the passed credentials:

```tsx
async function handleDemoLogin(demoEmail: string, demoPassword: string) {
  setEmail(demoEmail);
  setPassword(demoPassword);
  setLoading(true);
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: demoEmail, password: demoPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.message ?? "Login failed");
      return;
    }
    router.push(data.redirectTo ?? "/");
  } catch {
    toast.error("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}
```

- [ ] **Step 4: Wrap email input with icon**

Replace the email `<Input>` block (lines 51-62) with:

```tsx
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
```

- [ ] **Step 5: Wrap password input with icon and toggle**

Replace the password `<Input>` block (lines 63-74) with:

```tsx
<div className="space-y-1">
  <Label htmlFor="password">Password</Label>
  <div className="relative">
    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      autoComplete="current-password"
      required
      value={password}
      onChange={(e) => setPassword(e.target.value)}
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
</div>
```

- [ ] **Step 6: Update the submit button with spinner**

Replace the `<Button>` (lines 75-82) with:

```tsx
<Button
  type="submit"
  className="w-full"
  disabled={loading}
  style={{ backgroundColor: "#2E7D32" }}
>
  {loading ? (
    <span className="flex items-center justify-center gap-2">
      <Loader2 className="size-4 animate-spin" />
      Signing in...
    </span>
  ) : (
    "Sign In"
  )}
</Button>
```

- [ ] **Step 7: Add demo quick-fill section**

Add after the `</form>` closing tag (line 83), before the existing `<div className="mt-4 ...">` links section:

```tsx
<div className="mt-4 border-t pt-4">
  <p className="text-xs text-muted-foreground text-center mb-2">Quick demo access</p>
  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => handleDemoLogin("tourist@demo.zircuvia.ph", "Demo2026!")}
      disabled={loading}
      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
    >
      <MapPin className="size-3.5" aria-hidden="true" />
      Tourist
    </button>
    <button
      type="button"
      onClick={() => handleDemoLogin("admin@demo.zircuvia.ph", "Demo2026!")}
      disabled={loading}
      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
    >
      <Shield className="size-3.5" aria-hidden="true" />
      Admin
    </button>
    <button
      type="button"
      onClick={() => handleDemoLogin("verifier@demo.zircuvia.ph", "Demo2026!")}
      disabled={loading}
      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-md text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      Verifier
    </button>
  </div>
</div>
```

- [ ] **Step 8: Verify the build compiles**

Run: `cd "C:/Users/ASUS TUF/Projects/zircuvia-mock/zircuvia" && npx next build 2>&1 | tail -20`
Expected: Build succeeds with no TypeScript errors in `login/page.tsx`

- [ ] **Step 9: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat: improve login page UX with password toggle, input icons, demo quick-fill, and spinner"
```

---

## Chunk 2: Register Page

### Task 2: Update register page with improvements

**Files:**
- Modify: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Update imports**

Add `Eye`, `EyeOff`, `Mail`, `Lock`, `Loader2` to the existing lucide-react import (line 10):

```tsx
import { CheckCircle2, XCircle, Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
```

- [ ] **Step 2: Add state for password visibility**

Add after the existing `useState` declarations (after line 53):

```tsx
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
```

- [ ] **Step 3: Wrap email input with icon**

Replace the email input block (lines 129-140) with:

```tsx
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
```

- [ ] **Step 4: Wrap password input with icon and toggle**

Replace the password input block (lines 142-162) with:

```tsx
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
```

- [ ] **Step 5: Wrap confirm password input with icon and toggle**

Replace the confirm password input block (lines 164-177) with:

```tsx
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
```

- [ ] **Step 6: Update the submit button with spinner**

Replace the `<Button>` (lines 194-201) with:

```tsx
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
```

- [ ] **Step 7: Verify the build compiles**

Run: `cd "C:/Users/ASUS TUF/Projects/zircuvia-mock/zircuvia" && npx next build 2>&1 | tail -20`
Expected: Build succeeds with no TypeScript errors in `register/page.tsx`

- [ ] **Step 8: Commit**

```bash
git add app/(auth)/register/page.tsx
git commit -m "feat: improve register page UX with password toggles, input icons, and spinner"
```

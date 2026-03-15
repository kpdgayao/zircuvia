# Login & Register UX Improvements

**Date:** 2026-03-15
**Status:** Approved

## Overview

Improve the login and register pages with better UX for demo/presentation contexts. All changes use existing dependencies (lucide-react icons, Tailwind CSS).

## Changes

### 1. Password Visibility Toggle

- Add `Eye`/`EyeOff` icon button inside the password input field (right-aligned)
- Clicking toggles the input between `type="password"` and `type="text"`
- Toggle must be `<button type="button" aria-label={showPassword ? "Hide password" : "Show password"}>` to prevent accidental form submission and ensure screen reader accessibility
- State: `showPassword` boolean per field
- **Login page**: 1 toggle (password field)
- **Register page**: 2 toggles (password + confirm password fields, independent state each: `showPassword`, `showConfirmPassword`)

### 2. Input Field Icons

- **Email input**: `Mail` icon (left side, absolutely positioned)
- **Password input**: `Lock` icon (left side, absolutely positioned)
- All decorative icons must have `aria-hidden="true"` so screen readers skip them
- Wrapper `div` with `relative` class; icon with `absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4`
- Input gets `pl-9` padding to accommodate icon (overrides base `px-2.5` via `cn()` which uses `tailwind-merge`)
- Applied to email and password fields on both login and register pages
- **First/last name fields on register page do NOT get icons** — the two-column layout is too tight for left-padding, and name fields don't benefit from iconography

### 3. Demo Quick-Fill Buttons (Login Page Only)

- Section below the Sign In button, separated by a divider line
- Label: "Quick demo access" in muted text
- Three buttons with `type="button"` (prevents form submission), each with a differentiating lucide icon:
  - `MapPin` **Tourist** — credentials `tourist@demo.zircuvia.ph` / `Demo2026!`
  - `Shield` **Admin** — credentials `admin@demo.zircuvia.ph` / `Demo2026!`
  - `BadgeCheck` **Verifier** — credentials `verifier@demo.zircuvia.ph` / `Demo2026!`
- **Auto-submit approach**: To avoid React state batching race conditions, the quick-fill handler calls a dedicated `handleDemoLogin(email, password)` function that directly calls `fetch("/api/auth/login", ...)` with the passed credentials, bypassing `setEmail`/`setPassword` state. State is also set for visual feedback but is not relied upon for the API call.
- Styled: `bg-green-50 border border-green-200 text-green-700 rounded-md text-xs font-medium`

### 4. Loading Spinner

- **Login page**: Replace `"Signing in..."` with `<Loader2 className="size-4 animate-spin" />` + `"Signing in..."`
- **Register page**: Same treatment for `"Creating account..."` text
- `size-4` keeps the spinner proportional to button text

## Files Modified

| File | Changes |
|------|---------|
| `app/(auth)/login/page.tsx` | Password toggle, input icons, demo quick-fill, loading spinner |
| `app/(auth)/register/page.tsx` | Password toggle (2 fields), input icons, loading spinner |

## No New Dependencies

All icons come from `lucide-react` (already installed): `Eye`, `EyeOff`, `Mail`, `Lock`, `Loader2`, `MapPin`, `Shield`, `BadgeCheck`

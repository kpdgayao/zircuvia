# Mailjet Email Service Integration

**Date:** 2026-03-15
**Status:** Approved
**Approach:** Minimal Integration (single service file, mock fallback)

## Overview

Replace hardcoded OTP codes ("123456" shown via toast) with real email delivery using Mailjet. When Mailjet credentials are not configured, the system falls back to the current toast-based behavior for dev/demo use.

## Emails to Send

| Email | Trigger | Content |
|-------|---------|---------|
| OTP verification | After sign-up | 6-digit code |
| Password reset code | Forgot password (Step 1) | 6-digit code |
| Welcome | After successful OTP verification | Greeting message |
| Password changed | After password reset completes | Confirmation notice |

## Database Changes

### New table: `VerificationCode`

```prisma
model VerificationCode {
  id        String    @id @default(cuid())
  userId    String
  email     String
  code      String        // 6-digit random code
  type      CodeType      // SIGNUP or PASSWORD_RESET
  expiresAt DateTime      // 10 minutes from creation
  usedAt    DateTime?     // null until consumed
  createdAt DateTime @default(now())

  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, type])
  @@index([email, code, type])
}

enum CodeType {
  SIGNUP
  PASSWORD_RESET
}
```

Add reverse relation on `User` model: `verificationCodes VerificationCode[]`

### Key decisions

- 10-minute expiry for codes
- `usedAt` prevents code reuse
- `onDelete: Cascade` cleans up codes when user is deleted
- Indexed by `[email, code, type]` for fast lookups during verification

## Email Service (`lib/email.ts`)

Single file with these exports:

```typescript
// Core
isEmailConfigured()    // checks MAILJET_API_KEY + MAILJET_SECRET_KEY in env
sendEmail(to, subject, htmlBody)  // low-level Mailjet send, logs warning in mock mode

// High-level functions
sendOtpEmail(email, code, firstName)           // "Your verification code is ..."
sendPasswordResetEmail(email, code, firstName)  // "Your password reset code is ..."
sendWelcomeEmail(email, firstName)              // "Welcome to ZircuVia!"
sendPasswordChangedEmail(email, firstName)      // "Your password was just changed"
```

### Behavior

- `sendEmail` checks `isEmailConfigured()` first
- **Configured:** sends via Mailjet API using `node-mailjet` package
- **Not configured:** logs `[EMAIL MOCK] Would have sent "{subject}" to {email}` to console, returns `{ sent: false, mock: true, code? }` so the API route can fall back to toast
- All functions return: `{ sent: boolean, mock: boolean }`

### Mailjet env vars

```
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
MAILJET_FROM_EMAIL=noreply@zircuvia.com
MAILJET_FROM_NAME=ZircuVia
```

### HTML templates

Simple inline HTML strings within each function. Clean, minimal design — logo placeholder, the message, a footer. Transactional emails for a prototype; nothing fancy.

## API Route Changes

### `POST /api/auth/register` (modified)

1. Create user (same as now)
2. Generate random 6-digit code via `crypto.randomInt(100000, 999999)`
3. Store in `VerificationCode` table (type: SIGNUP, 10-min expiry)
4. Call `sendOtpEmail(email, code, firstName)`
5. Return `{ userId, mock }` — frontend uses `mock` flag to decide toast vs "check your email"

### `POST /api/auth/verify-otp` (modified)

1. Look up `VerificationCode` where `userId` + `type: SIGNUP` + `usedAt: null` + `expiresAt > now()`
2. Compare submitted code against stored code
3. If match: mark `usedAt = now()`, set `emailVerified = true`, create session, send welcome email
4. If expired: return 410 "Code expired, request a new one"
5. If wrong: return 401 "Invalid code"

### `POST /api/auth/forgot-password` (new route — Step 1)

1. Receive `{ email }`
2. Look up user by email (return generic success even if not found — prevents email enumeration)
3. Generate 6-digit code, store in `VerificationCode` (type: PASSWORD_RESET)
4. Call `sendPasswordResetEmail(email, code, firstName)`
5. Return `{ mock }` for toast fallback

### `POST /api/auth/reset-password` (modified — Steps 2+3)

1. Receive `{ email, code, newPassword }`
2. Look up `VerificationCode` where `email` + `code` + `type: PASSWORD_RESET` + valid
3. If valid: hash new password, update user, mark code used
4. Call `sendPasswordChangedEmail(email, firstName)`
5. Return success

### `POST /api/auth/resend-otp` (new route)

1. Receive `{ userId, type }` (SIGNUP or PASSWORD_RESET)
2. Invalidate any existing unused codes for that user+type
3. Generate new code, store, send email
4. Return `{ mock }`

## Frontend Changes

Minimal — UI flows stay the same, just handle the `mock` flag from API responses.

### Register page (`app/(auth)/register/page.tsx`)

Check `response.mock` — if `true`, show toast with the actual code (same as today). If `false`, show toast "Verification code sent to your email".

### Verify OTP page (`app/(auth)/verify-otp/page.tsx`)

- Remove auto-toast on mount (no need if email was sent)
- Resend button calls `POST /api/auth/resend-otp` instead of showing toast
- Handle new error states: 410 expired code, 401 invalid code
- In mock mode: still show toast with code (detected via query param or stored response)

### Reset password page (`app/(auth)/reset-password/page.tsx`)

- Step 1: Call `POST /api/auth/forgot-password`. Show "Check your email" or toast with code based on `mock` flag
- Step 2: No change (user types 6-digit code)
- Step 3: Call modified `POST /api/auth/reset-password` with email + code + newPassword
- Forced password change flow (`?forced=true`): unchanged

### No changes needed to

- Login pages (all 3), logout, auth layout, any other pages

## Configuration & Deployment

### New dependency

`node-mailjet` — official Mailjet SDK for Node.js

### Environment variables (added to `.env.example`)

```
# Email (Mailjet) — optional, falls back to mock mode if not set
MAILJET_API_KEY=
MAILJET_SECRET_KEY=
MAILJET_FROM_EMAIL=noreply@zircuvia.com
MAILJET_FROM_NAME=ZircuVia
```

### Railway

Add the 4 Mailjet env vars to the Railway service. Once set, the app automatically switches from mock to real emails.

## Security

- **No email enumeration:** Forgot-password returns generic success whether or not the email exists
- **Code expiry:** 10 minutes, enforced server-side
- **Single use:** Codes marked as used after consumption, can't be replayed
- **Codes not logged in production:** Only logged to console in mock mode
- **Rate limiting:** Out of scope for this iteration (future improvement)

## Scope Summary

| Area | Changes |
|------|---------|
| Prisma | 1 new table, 1 new enum, 1 relation on User |
| New files | `lib/email.ts` |
| New routes | `/api/auth/forgot-password`, `/api/auth/resend-otp` |
| Modified routes | `register`, `verify-otp`, `reset-password` |
| Modified pages | `register`, `verify-otp`, `reset-password` (minimal — mock flag handling) |
| Config | 4 env vars, 1 npm package |

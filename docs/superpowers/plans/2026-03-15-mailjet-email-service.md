# Mailjet Email Service Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded OTP codes with real Mailjet email delivery, falling back to toast-based mock mode when Mailjet credentials are not configured.

**Architecture:** Single `lib/email.ts` service file with mock fallback. New `VerificationCode` Prisma table for storing codes with expiry. Two new API routes (`forgot-password`, `resend-otp`) and three modified routes (`register`, `verify-otp`, `reset-password`). Minimal frontend changes — just mock flag handling.

**Tech Stack:** Next.js 15, Prisma 7, node-mailjet, TypeScript, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-15-mailjet-email-service-design.md`

---

## Chunk 1: Foundation (Database + Email Service + Config)

### Task 1: Install node-mailjet and add env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install node-mailjet**

```bash
pnpm add node-mailjet
```

- [ ] **Step 2: Add Mailjet env vars to .env.example**

Append to `.env.example` after the Xendit section:

```
# Email (Mailjet) — optional, falls back to mock mode if not set
MAILJET_API_KEY=""
MAILJET_SECRET_KEY=""
MAILJET_FROM_EMAIL="noreply@zircuvia.com"
MAILJET_FROM_NAME="ZircuVia"
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add node-mailjet dependency and email env vars"
```

---

### Task 2: Add VerificationCode model to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add CodeType enum and VerificationCode model**

Add after the existing enums in `prisma/schema.prisma`:

```prisma
enum CodeType {
  SIGNUP
  PASSWORD_RESET
}
```

Add the model after `SurveyResponse`:

```prisma
model VerificationCode {
  id        String    @id @default(cuid())
  userId    String
  email     String
  code      String
  type      CodeType
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, type])
  @@index([email, code, type])
}
```

Add the reverse relation to the `User` model, after `surveyResponses`:

```prisma
verificationCodes VerificationCode[]
```

- [ ] **Step 2: Push schema to database**

```bash
pnpm db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify Prisma client generation**

```bash
pnpm db:generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add VerificationCode model for OTP storage"
```

---

### Task 3: Create email service (`lib/email.ts`)

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1: Create `lib/email.ts`**

```typescript
import { Client } from "node-mailjet";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || "noreply@zircuvia.com";
const FROM_NAME = process.env.MAILJET_FROM_NAME || "ZircuVia";

export interface EmailResult {
  sent: boolean;
  mock: boolean;
}

export function isEmailConfigured(): boolean {
  return !!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
}

// ---------------------------------------------------------------------------
// Low-level send
// ---------------------------------------------------------------------------

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.log(`[EMAIL MOCK] Would have sent "${subject}" to ${to}`);
    return { sent: false, mock: true };
  }

  const mailjet = new Client({
    apiKey: process.env.MAILJET_API_KEY!,
    apiSecret: process.env.MAILJET_SECRET_KEY!,
  });

  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: FROM_EMAIL, Name: FROM_NAME },
        To: [{ Email: to }],
        Subject: subject,
        HTMLPart: htmlBody,
      },
    ],
  });

  return { sent: true, mock: false };
}

// ---------------------------------------------------------------------------
// HTML wrapper
// ---------------------------------------------------------------------------

function wrapHtml(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <div style="text-align: center; margin-bottom: 24px;">
    <span style="font-size: 24px; font-weight: bold; color: #2E7D32;">ZircuVia</span>
  </div>
  ${content}
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;" />
  <p style="font-size: 12px; color: #888; text-align: center;">
    This is an automated message from ZircuVia. Please do not reply.
  </p>
</body>
</html>`.trim();
}

// ---------------------------------------------------------------------------
// High-level email functions
// ---------------------------------------------------------------------------

export async function sendOtpEmail(
  email: string,
  code: string,
  firstName: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <p>Hi ${firstName},</p>
    <p>Your verification code is:</p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2E7D32;">${code}</span>
    </div>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p>If you didn't create an account on ZircuVia, you can safely ignore this email.</p>
  `);
  return sendEmail(email, "Verify your ZircuVia account", html);
}

export async function sendPasswordResetEmail(
  email: string,
  code: string,
  firstName: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <p>Hi ${firstName},</p>
    <p>You requested a password reset. Your code is:</p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2E7D32;">${code}</span>
    </div>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `);
  return sendEmail(email, "Reset your ZircuVia password", html);
}

export async function sendWelcomeEmail(
  email: string,
  firstName: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <p>Hi ${firstName},</p>
    <p>Welcome to <strong>ZircuVia</strong>! Your account has been verified and is ready to use.</p>
    <p>Start exploring eco-certified businesses and sustainable tourism experiences in Palawan.</p>
    <p style="margin-top: 24px;">See you around,<br/>The ZircuVia Team</p>
  `);
  return sendEmail(email, "Welcome to ZircuVia!", html);
}

export async function sendPasswordChangedEmail(
  email: string,
  firstName: string
): Promise<EmailResult> {
  const html = wrapHtml(`
    <p>Hi ${firstName},</p>
    <p>Your ZircuVia password was just changed successfully.</p>
    <p>If you didn't make this change, please contact us immediately.</p>
  `);
  return sendEmail(email, "Your ZircuVia password was changed", html);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `lib/email.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add email service with Mailjet integration and mock fallback"
```

---

## Chunk 2: Backend API Routes

### Task 4: Modify register route to generate real OTP

**Files:**
- Modify: `app/api/auth/register/route.ts`

- [ ] **Step 1: Update register route**

Replace the full contents of `app/api/auth/register/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { sendOtpEmail, isEmailConfigured } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "TOURIST",
      },
    });

    // Generate OTP and store in DB
    const code = String(randomInt(100000, 999999));
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: data.email,
        code,
        type: "SIGNUP",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    const result = await sendOtpEmail(data.email, code, data.firstName);

    return NextResponse.json(
      {
        message: "Registration successful. Please verify your email.",
        userId: user.id,
        mock: result.mock,
        ...(result.mock ? { code } : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[register]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/register/route.ts
git commit -m "feat: register route generates real OTP and sends via email"
```

---

### Task 5: Modify verify-otp route to validate from DB

**Files:**
- Modify: `app/api/auth/verify-otp/route.ts`

- [ ] **Step 1: Update verify-otp route**

Replace the full contents of `app/api/auth/verify-otp/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, code } = body as { userId?: string; code?: string };

    if (!userId || !code) {
      return NextResponse.json({ message: "userId and code are required" }, { status: 400 });
    }

    const now = new Date();

    // Check if there's an expired code first (for better error messaging)
    const expiredCode = await prisma.verificationCode.findFirst({
      where: {
        userId,
        type: "SIGNUP",
        usedAt: null,
        code,
        expiresAt: { lt: now },
      },
    });

    if (expiredCode) {
      return NextResponse.json(
        { message: "Code expired. Please request a new one." },
        { status: 410 }
      );
    }

    // Find a valid, unused, non-expired code for this user
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId,
        type: "SIGNUP",
        usedAt: null,
        code,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 401 });
    }

    // Mark code as used and verify user in a transaction
    const user = await prisma.$transaction(async (tx) => {
      await tx.verificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      return tx.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });
    });

    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
    });

    await setSessionCookie(token);

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(user.email, user.firstName).catch((err) =>
      console.error("[welcome-email]", err)
    );

    return NextResponse.json({ redirectTo: "/" });
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/verify-otp/route.ts
git commit -m "feat: verify-otp validates codes from DB instead of hardcoded value"
```

---

### Task 6: Create forgot-password route

**Files:**
- Create: `app/api/auth/forgot-password/route.ts`

- [ ] **Step 1: Create the directory and route**

```bash
mkdir -p "app/api/auth/forgot-password"
```

Create `app/api/auth/forgot-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, isEmailConfigured } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists, a code has been sent.",
        mock: !isEmailConfigured(),
      });
    }

    // Invalidate previous unused codes
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, type: "PASSWORD_RESET", usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = String(randomInt(100000, 999999));
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const result = await sendPasswordResetEmail(user.email, code, user.firstName);

    return NextResponse.json({
      message: "If an account exists, a code has been sent.",
      mock: result.mock,
      ...(result.mock ? { code } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[forgot-password]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/forgot-password/route.ts
git commit -m "feat: add forgot-password route with OTP generation"
```

---

### Task 7: Modify reset-password route (OTP validation + forced flow)

**Files:**
- Modify: `app/api/auth/reset-password/route.ts`

- [ ] **Step 1: Update reset-password route**

Replace the full contents of `app/api/auth/reset-password/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { passwordSchema } from "@/lib/validations";
import { sendPasswordChangedEmail } from "@/lib/email";

const resetSchema = z.object({
  email: z.string().email("Invalid email"),
  code: z.string().min(1, "Code is required"),
  newPassword: passwordSchema,
});

const forcedSchema = z.object({
  newPassword: passwordSchema,
  forced: z.literal(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // --- Forced password change (authenticated user) ---
    const forcedParse = forcedSchema.safeParse(body);
    if (forcedParse.success) {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
      }

      const passwordHash = await bcrypt.hash(forcedParse.data.newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });

      // Fire-and-forget
      sendPasswordChangedEmail(user.email, user.firstName).catch((err) =>
        console.error("[password-changed-email]", err)
      );

      const redirectTo = user.role === "VERIFIER" ? "/checker-login" : "/login";
      return NextResponse.json({ message: "Password updated successfully", redirectTo });
    }

    // --- Normal password reset (with OTP code) ---
    const data = resetSchema.parse(body);

    const verification = await prisma.verificationCode.findFirst({
      where: {
        email: data.email,
        code: data.code,
        type: "PASSWORD_RESET",
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 401 });
    }

    if (verification.expiresAt < new Date()) {
      return NextResponse.json(
        { message: "Code expired. Please request a new one." },
        { status: 410 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return NextResponse.json({ message: "No account found with this email" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.verificationCode.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          ...(user.mustChangePassword ? { mustChangePassword: false } : {}),
        },
      });
    });

    // Fire-and-forget
    sendPasswordChangedEmail(user.email, user.firstName).catch((err) =>
      console.error("[password-changed-email]", err)
    );

    return NextResponse.json({ message: "Password reset successful" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[reset-password]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/reset-password/route.ts
git commit -m "feat: reset-password validates OTP from DB, supports forced flow via session"
```

---

### Task 8: Create resend-otp route

**Files:**
- Create: `app/api/auth/resend-otp/route.ts`

- [ ] **Step 1: Create the directory and route**

```bash
mkdir -p "app/api/auth/resend-otp"
```

Create `app/api/auth/resend-otp/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail, sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Invalid email"),
  type: z.enum(["SIGNUP", "PASSWORD_RESET"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Generic success to prevent enumeration
      return NextResponse.json({ message: "If an account exists, a new code has been sent.", mock: false });
    }

    // Don't issue new SIGNUP codes to already-verified users
    if (type === "SIGNUP" && user.emailVerified) {
      return NextResponse.json({ message: "Account already verified." }, { status: 400 });
    }

    // Invalidate previous unused codes
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = String(randomInt(100000, 999999));
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const result =
      type === "SIGNUP"
        ? await sendOtpEmail(user.email, code, user.firstName)
        : await sendPasswordResetEmail(user.email, code, user.firstName);

    return NextResponse.json({
      message: "A new code has been sent.",
      mock: result.mock,
      ...(result.mock ? { code } : {}),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation failed", errors: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("[resend-otp]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/auth/resend-otp/route.ts
git commit -m "feat: add resend-otp route for both signup and password reset flows"
```

---

## Chunk 3: Frontend Changes

### Task 9: Update register page mock flag handling

**Files:**
- Modify: `app/(auth)/register/page.tsx`

**Depends on:** Task 4 (register route must return `mock` and `code` fields).

- [ ] **Step 1: Update handleSubmit in register page**

In `app/(auth)/register/page.tsx`, replace the two lines after the `if (!res.ok)` block (lines 88-89):

```typescript
toast.info("Your verification code is 123456");
router.push(`/verify-otp?userId=${data.userId}`);
```

With:

```typescript
      if (data.mock && data.code) {
        toast.info(`Your verification code is ${data.code}`);
      } else {
        toast.success("Verification code sent to your email");
      }
      router.push(`/verify-otp?userId=${data.userId}&email=${encodeURIComponent(email)}&mock=${data.mock ? "1" : "0"}`);
```

- [ ] **Step 2: Commit**

```bash
git add "app/(auth)/register/page.tsx"
git commit -m "feat: register page handles mock flag for OTP delivery"
```

---

### Task 10: Update verify-otp page

**Files:**
- Modify: `app/(auth)/verify-otp/page.tsx`

- [ ] **Step 1: Update verify-otp page**

Replace the full contents of `app/(auth)/verify-otp/page.tsx` with:

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/verify-otp/page.tsx"
git commit -m "feat: verify-otp page uses real resend and handles mock/live mode"
```

---

### Task 11: Update reset-password page

**Files:**
- Modify: `app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Update reset-password page**

Replace the full contents of `app/(auth)/reset-password/page.tsx` with:

```tsx
"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { OTPInput } from "@/components/otp-input";
import { CheckCircle2, XCircle } from "lucide-react";
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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forced = searchParams.get("forced") === "true";

  const [step, setStep] = useState<1 | 2 | 3>(forced ? 3 : 1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [isMock, setIsMock] = useState(false);

  const rules = checkPassword(newPassword);
  const allRulesPass = Object.values(rules).every(Boolean);

  // Step 1: Enter email — call forgot-password API
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Failed to send code");
        return;
      }
      setIsMock(data.mock);
      if (data.mock && data.code) {
        toast.info(`Your verification code is ${data.code}`);
      } else {
        toast.success("If an account exists, a code has been sent to your email");
      }
      setStep(2);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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

  // Resend code in step 2
  async function handleResend() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "PASSWORD_RESET" }),
      });
      const data = await res.json();
      if (data.mock && data.code) {
        toast.info(`Your verification code is ${data.code}`);
      } else {
        toast.success("A new code has been sent to your email");
      }
    } catch {
      toast.error("Failed to resend code.");
    } finally {
      setLoading(false);
    }
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          forced
            ? { newPassword, forced: true }
            : { email, code, newPassword }
        ),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          toast.error("Code expired. Please go back and request a new one.");
        } else {
          toast.error(data.message ?? "Reset failed");
        }
        return;
      }

      toast.success("Password updated successfully");
      if (data.redirectTo) {
        router.push(data.redirectTo);
      } else {
        router.push("/login");
      }
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
              disabled={loading}
              style={{ backgroundColor: "#2E7D32" }}
            >
              {loading ? "Sending…" : "Send Verification Code"}
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
              {isMock
                ? <>A code was shown in the notification for <strong>{email}</strong></>
                : <>A code was sent to <strong>{email}</strong></>}
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
                className="font-medium hover:underline disabled:opacity-50"
                style={{ color: "#2E7D32" }}
                disabled={loading}
                onClick={handleResend}
              >
                {loading ? "Sending…" : "Resend"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-gray-500 py-8">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(auth)/reset-password/page.tsx"
git commit -m "feat: reset-password page calls real APIs with mock fallback"
```

---

## Chunk 4: Verification & Cleanup

### Task 12: TypeScript check and dev server smoke test

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --pretty
```

Expected: No errors. Fix any issues before proceeding.

- [ ] **Step 2: Start dev server and smoke test**

```bash
pnpm dev
```

Manual smoke tests (all in mock mode, no Mailjet keys needed):

1. **Sign-up flow:** Go to `/register`, fill form, submit. Verify:
   - Toast shows a random 6-digit code (not "123456")
   - Redirects to `/verify-otp?userId=...&mock=1`
   - Enter the code from the toast → verifies and redirects to `/`
   - Check console for `[EMAIL MOCK]` log

2. **Resend OTP:** On `/verify-otp`, click "Resend code". Verify:
   - New toast appears with a different code
   - Old code no longer works, new code does

3. **Forgot password flow:** Go to `/reset-password`, enter a registered email. Verify:
   - Step 1: Toast shows code, moves to step 2
   - Step 2: Enter code, moves to step 3
   - Step 3: Enter new password → success

4. **Forced password change:** Log in as a user with `mustChangePassword: true`. Verify:
   - Redirected to `/reset-password?forced=true`
   - Only password step shown (step 3)
   - After submit → password changed, redirected to login

5. **Expired code:** Register, wait 10+ min (or manually update DB `expiresAt`), try to verify → should see "Code expired" error

- [ ] **Step 3: Push schema to Railway (if needed)**

```bash
pnpm db:push
```

- [ ] **Step 4: Final commit with all fixes**

If any fixes were needed during smoke testing:

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

---

### Task 13: Update .env.example and commit all remaining changes

- [ ] **Step 1: Verify .env.example has all new vars**

Confirm `.env.example` contains the 4 Mailjet vars added in Task 1.

- [ ] **Step 2: Final git status check**

```bash
git status
```

Ensure no untracked or unstaged files remain.

- [ ] **Step 3: Verify build passes**

```bash
pnpm build
```

Expected: Build completes successfully.

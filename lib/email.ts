import { Client } from "node-mailjet";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import type { CodeType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || "noreply@zircuvia.com";
const FROM_NAME = process.env.MAILJET_FROM_NAME || "ZircuVia";
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface EmailResult {
  sent: boolean;
  mock: boolean;
}

export function isEmailConfigured(): boolean {
  return !!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
}

// ---------------------------------------------------------------------------
// OTP helper
// ---------------------------------------------------------------------------

export async function createVerificationCode(
  userId: string,
  email: string,
  type: CodeType,
  { invalidateExisting = false }: { invalidateExisting?: boolean } = {}
): Promise<string> {
  const code = String(randomInt(100000, 999999));
  const data = {
    userId,
    email,
    code,
    type,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  };

  if (invalidateExisting) {
    await prisma.$transaction([
      prisma.verificationCode.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.verificationCode.create({ data }),
    ]);
  } else {
    await prisma.verificationCode.create({ data });
  }

  return code;
}

// ---------------------------------------------------------------------------
// Low-level send
// ---------------------------------------------------------------------------

let _client: Client | null = null;
function getMailjetClient(): Client {
  if (!_client) {
    _client = new Client({
      apiKey: process.env.MAILJET_API_KEY!,
      apiSecret: process.env.MAILJET_SECRET_KEY!,
    });
  }
  return _client;
}

async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<EmailResult> {
  if (!isEmailConfigured()) {
    console.log(`[EMAIL MOCK] Would have sent "${subject}" to ${to}`);
    return { sent: false, mock: true };
  }

  const mailjet = getMailjetClient();

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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "zircuvia_session";

interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  firstName: string;
}

async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes require ADMIN role
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.redirect(new URL("/admin-login", request.url));
    const session = await verifyToken(token);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }

  // Checker routes require VERIFIER role
  if (pathname.startsWith("/checker")) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.redirect(new URL("/checker-login", request.url));
    const session = await verifyToken(token);
    if (!session || session.role !== "VERIFIER") {
      return NextResponse.redirect(new URL("/checker-login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/checker/:path*"],
};

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ message: "Logged out" });
  } catch (err) {
    console.error("[logout]", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

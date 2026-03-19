import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  try {
    const payload = await verifySession(token);
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}


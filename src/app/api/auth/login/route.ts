import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, signSession, verifyPassword } from "@/lib/auth";
import { isValidEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Correo y contraseña son obligatorios." },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  const token = await signSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 días
  });

  return res;
}


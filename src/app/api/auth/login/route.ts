import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, signSession, verifyPassword } from "@/lib/auth";
import { isValidEmail } from "@/lib/email";

function loginCatchMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("Missing JWT_SECRET")) {
    return "Falta configurar JWT_SECRET en variables de entorno.";
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "No se pudo conectar a la base de datos. Revisa DATABASE_URL en .env.local y que PostgreSQL esté en marcha.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1001" || error.code === "P1017") {
      return "No se alcanza el servidor de base de datos. Comprueba DATABASE_URL y que la base esté en marcha.";
    }
  }
  if (
    error instanceof Error &&
    (error.message.includes("DATABASE_URL") ||
      error.message.toLowerCase().includes("database server"))
  ) {
    return "Error de base de datos. Verifica DATABASE_URL y las migraciones (npx prisma migrate dev).";
  }
  return "No se pudo continuar.";
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: "Ingresa un correo válido." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas." },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Credenciales inválidas." },
        { status: 401 },
      );
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
  } catch (error) {
    console.error("Error en login", error);
    return NextResponse.json(
      { error: loginCatchMessage(error) },
      { status: 500 },
    );
  }
}


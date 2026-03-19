import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { isValidEmail } from "@/lib/email";

const ALLOWED_ROLES = new Set(["doctora", "secretaria"]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const role = String(body?.role ?? "doctora").trim().toLowerCase();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Nombre, correo y contraseña son obligatorios." },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Ingresa un correo válido." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener mínimo 6 caracteres." },
      { status: 400 },
    );
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { error: "Rol inválido." },
      { status: 400 },
    );
  }

  try {
    const count = await prisma.user.count();
    if (count >= 5) {
      return NextResponse.json(
        {
          error:
            "Límite de 5 usuarios alcanzado. Gestiona usuarios directamente en la base de datos (Railway).",
        },
        { status: 403 },
      );
    }

    const hashed = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role,
        emailVerifiedAt: new Date(),
        emailVerifyTokenHash: null,
        emailVerifyTokenExpiresAt: null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        needsVerification: false,
        message: "Cuenta creada. Ya puedes iniciar sesión.",
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const code = (err as { code?: unknown } | null)?.code;
    const message =
      code === "P2002" ? "Ese correo ya está registrado." : "No se pudo crear la cuenta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


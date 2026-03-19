import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/email";
import { createEmailVerifyToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // No revelamos si existe o no por seguridad
    return NextResponse.json({ ok: true });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true });
  }

  const verify = createEmailVerifyToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifyTokenHash: verify.hash,
      emailVerifyTokenExpiresAt: verify.expiresAt,
    },
  });

  try {
    await sendVerificationEmail(user.email, user.name, verify.token);
  } catch (e) {
    console.error("Error reenviando verificación", e);
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { error: `No se pudo enviar correo: ${(e as Error)?.message ?? "error"}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "";

  if (!token) {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyTokenHash: tokenHash,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Token inválido o expirado." }, { status: 400 });
  }

  if (user.emailVerifyTokenExpiresAt && user.emailVerifyTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Token expirado. Solicita uno nuevo." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyTokenHash: null,
      emailVerifyTokenExpiresAt: null,
    },
  });

  // Redirigir al login con mensaje
  const url = new URL("/login", request.url);
  url.searchParams.set("verified", "1");
  return NextResponse.redirect(url);
}


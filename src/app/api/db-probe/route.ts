import { NextResponse } from "next/server";

/** Desactivado en producción para evitar abuso y carga innecesaria en Railway. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { prisma } = await import("@/lib/prisma");
  try {
    const [users, patients, appointments, clinicalNotes, recipes] =
      await Promise.all([
        prisma.user.count(),
        prisma.patient.count(),
        prisma.appointment.count(),
        prisma.clinicalNote.count(),
        prisma.recipe.count(),
      ]);

    return NextResponse.json({
      ok: true,
      counts: { users, patients, appointments, clinicalNotes, recipes },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

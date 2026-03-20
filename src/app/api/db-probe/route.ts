import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Solo mostramos conteos para confirmar que estamos conectados a la DB correcta.
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


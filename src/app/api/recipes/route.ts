import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointmentId");
  const patientId = searchParams.get("patientId");
  const date = searchParams.get("date");

  if (!appointmentId && !patientId && !date) {
    return NextResponse.json(
      { error: "Falta appointmentId, patientId o date." },
      { status: 400 },
    );
  }

  // findMany recibe un argumento opcional, por eso usamos NonNullable para
  // asegurar que exista la propiedad "where" al tipar.
  const where: NonNullable<Parameters<typeof prisma.recipe.findMany>[0]>["where"] =
    {};
  if (appointmentId) {
    where.appointmentId = appointmentId;
  }
  if (patientId) {
    where.patientId = patientId;
  }
  if (date) {
    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  }

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { patient: true, appointment: true },
  });

  return NextResponse.json(recipes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { patientId, appointmentId, diagnosis, workPlan, prescriptionText } =
    body || {};

  if (!patientId) {
    return NextResponse.json(
      { error: "Falta patientId para crear la receta." },
      { status: 400 },
    );
  }

  try {
    const recipe = await prisma.recipe.create({
      data: {
        patientId,
        appointmentId: appointmentId ?? null,
        diagnosis: diagnosis ?? null,
        workPlan: workPlan ?? null,
        prescriptionText: prescriptionText ?? null,
      },
    });

    // Si la receta está asociada a una cita, la marcamos como concluida.
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "Concluida" },
      });
    }

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error("Error creando receta", error);
    return NextResponse.json(
      { error: "No se pudo crear la receta." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Falta id de la receta a eliminar." },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, appointmentId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Receta no encontrada." }, { status: 404 });
    }

    await prisma.recipe.delete({ where: { id } });

    // Si la receta estaba asociada a una cita, la volvemos a marcar como pendiente.
    if (existing.appointmentId) {
      await prisma.appointment.update({
        where: { id: existing.appointmentId },
        data: { status: "pendiente" },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error eliminando receta", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la receta." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const {
    id,
    diagnosis,
    workPlan,
    prescriptionText,
  }: {
    id?: string;
    diagnosis?: string | null;
    workPlan?: string | null;
    prescriptionText?: string | null;
  } = body || {};

  if (!id) {
    return NextResponse.json(
      { error: "Falta id de la receta a actualizar." },
      { status: 400 },
    );
  }

  const normalizeField = <T,>(value: T | undefined) =>
    value === undefined ? undefined : value;

  try {
    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        diagnosis: normalizeField(diagnosis),
        workPlan: normalizeField(workPlan),
        prescriptionText: normalizeField(prescriptionText),
      },
      include: { patient: true, appointment: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error actualizando receta", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la receta." },
      { status: 500 },
    );
  }
}


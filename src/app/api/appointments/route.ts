import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  // findMany recibe un argumento opcional, por eso usamos NonNullable para
  // asegurar que exista la propiedad "where" al tipar.
  const where: NonNullable<Parameters<typeof prisma.appointment.findMany>[0]>["where"] = {};
  if (date) {
    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");
    where.startAt = { gte: startOfDay, lte: endOfDay };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { patient: true },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // En esta demo asumimos una doctora fija (primer usuario) o un id recibido
  let doctorId = body.doctorId as string | undefined;
  if (!doctorId) {
    // Si no existe usuario doctora en la BD, creamos uno por defecto
    const defaultEmail = "doctora@harmonia.local";
    const doctor =
      (await prisma.user.findFirst()) ??
      (await prisma.user.upsert({
        where: { email: defaultEmail },
        update: {},
        create: {
          email: defaultEmail,
          password: "local",
          name: "Dra. Leidy Rosales Jiménez",
          role: "doctora",
          emailVerifiedAt: new Date(),
        },
      }));

    doctorId = doctor.id;
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: body.patientId,
        doctorId,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        type: body.type || "Consulta",
        status: body.status || "pendiente",
        reason: body.reason ?? null,
        notes: body.notes ?? null,
      },
      include: { patient: true },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Error creando cita", error);
    return NextResponse.json(
      { error: "No se pudo crear la cita." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body as { id?: string };

  if (!id) {
    return NextResponse.json(
      { error: "Falta id de la cita a actualizar." },
      { status: 400 },
    );
  }

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        startAt: body.startAt ? new Date(body.startAt) : undefined,
        endAt: body.endAt ? new Date(body.endAt) : undefined,
        type: body.type ?? undefined,
        status: body.status ?? undefined,
        reason: body.reason ?? undefined,
        notes: body.notes ?? undefined,
      },
      include: { patient: true },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error actualizando cita", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la cita." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Falta id de la cita a eliminar." },
      { status: 400 },
    );
  }

  try {
    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando cita", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la cita." },
      { status: 500 },
    );
  }
}


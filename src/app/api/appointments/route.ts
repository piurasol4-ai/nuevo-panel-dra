import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeProcedures,
  proceduresLabel,
} from "@/lib/appointment-procedures";

function resolveProceduresFromBody(body: {
  procedures?: unknown;
  type?: unknown;
}): { procedures: string[]; type: string } {
  const procedures = normalizeProcedures(
    body.procedures,
    typeof body.type === "string" ? body.type : null,
  );
  const list = procedures.length > 0 ? procedures : ["Consulta"];
  return { procedures: list, type: proceduresLabel(list) };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Falta el parámetro date (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");

  const appointments = await prisma.appointment.findMany({
    where: { startAt: { gte: startOfDay, lte: endOfDay } },
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          documentType: true,
          dni: true,
          phone: true,
          birthDate: true,
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 200,
  });

  return NextResponse.json(appointments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  let doctorId = body.doctorId as string | undefined;
  if (!doctorId) {
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

  const { procedures, type } = resolveProceduresFromBody(body);

  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: body.patientId,
        doctorId,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        type,
        procedures: procedures as Prisma.InputJsonValue,
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

  const hasProcedures =
    Object.prototype.hasOwnProperty.call(body, "procedures") ||
    Object.prototype.hasOwnProperty.call(body, "type");
  const resolved = hasProcedures ? resolveProceduresFromBody(body) : null;

  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        startAt: body.startAt ? new Date(body.startAt) : undefined,
        endAt: body.endAt ? new Date(body.endAt) : undefined,
        ...(resolved
          ? {
              type: resolved.type,
              procedures: resolved.procedures as Prisma.InputJsonValue,
            }
          : {}),
        status: body.status ?? undefined,
        reason: body.reason ?? undefined,
        notes: body.notes ?? undefined,
        patientId: body.patientId ?? undefined,
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

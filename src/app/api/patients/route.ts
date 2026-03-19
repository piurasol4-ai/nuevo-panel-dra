import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const patient = await prisma.patient.create({
      data: {
        fullName: body.fullName,
        dni: body.dni,
        phone: body.phone,
        address: body.address,
        birthDate: new Date(body.birthDate),
        referralSource: body.referralSource ?? null,
        emergencyContactName: body.emergencyContactName ?? null,
        emergencyContactPhone: body.emergencyContactPhone ?? null,
        allergyNotes: body.allergyNotes ?? null,
        medicalHistory: body.medicalHistory ?? null,
        status: body.status ?? "estable",
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error: unknown) {
    // Maneja DNI duplicado (constraint unique en la tabla)
    const code = (error as { code?: unknown } | null)?.code;
    const target = (error as { meta?: { target?: unknown } } | null)?.meta?.target;
    if (code === "P2002" && Array.isArray(target) && target.includes("dni")) {
      return NextResponse.json(
        { error: "El paciente con este DNI ya está registrado." },
        { status: 409 },
      );
    }

    console.error("Error creando paciente", error);
    return NextResponse.json(
      { error: "No se pudo registrar el paciente." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Falta id de paciente" }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        fullName: body.fullName,
        dni: body.dni,
        phone: body.phone,
        address: body.address,
        birthDate: new Date(body.birthDate),
        referralSource: body.referralSource ?? null,
        emergencyContactName: body.emergencyContactName ?? null,
        emergencyContactPhone: body.emergencyContactPhone ?? null,
        allergyNotes: body.allergyNotes ?? null,
        medicalHistory: body.medicalHistory ?? null,
        status: body.status ?? "estable",
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(patient);
  } catch (error: unknown) {
    const code = (error as { code?: unknown } | null)?.code;
    const target = (error as { meta?: { target?: unknown } } | null)?.meta?.target;
    if (code === "P2002" && Array.isArray(target) && target.includes("dni")) {
      return NextResponse.json(
        { error: "El paciente con este DNI ya está registrado." },
        { status: 409 },
      );
    }

    console.error("Error actualizando paciente", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el paciente." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Falta id de paciente" }, { status: 400 });
  }

  try {
    await prisma.patient.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando paciente", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el paciente." },
      { status: 500 },
    );
  }
}
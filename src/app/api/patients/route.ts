import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePatientDocument } from "@/lib/patient-document";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)),
  );
  const skip = (page - 1) * pageSize;
  const search = searchParams.get("search")?.trim() ?? "";

  const where = search
    ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { dni: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return NextResponse.json({ data: patients, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const doc = validatePatientDocument(
    String(body.documentType ?? "dni"),
    String(body.dni ?? ""),
  );
  if (!doc.ok) {
    return NextResponse.json({ error: doc.error }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        fullName: body.fullName,
        documentType: doc.documentType,
        dni: doc.number,
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
    if (
      code === "P2002" &&
      Array.isArray(target) &&
      (target.includes("dni") || target.includes("documentType"))
    ) {
      return NextResponse.json(
        {
          error:
            "Ya existe un paciente con este tipo y número de documento.",
        },
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

  const docPut = validatePatientDocument(
    String(body.documentType ?? "dni"),
    String(body.dni ?? ""),
  );
  if (!docPut.ok) {
    return NextResponse.json({ error: docPut.error }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        fullName: body.fullName,
        documentType: docPut.documentType,
        dni: docPut.number,
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
    if (
      code === "P2002" &&
      Array.isArray(target) &&
      (target.includes("dni") || target.includes("documentType"))
    ) {
      return NextResponse.json(
        {
          error:
            "Ya existe un paciente con este tipo y número de documento.",
        },
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
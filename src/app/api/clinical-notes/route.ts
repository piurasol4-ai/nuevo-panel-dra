import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json(
      { error: "Falta patientId en la consulta" },
      { status: 400 },
    );
  }

  const notes = await prisma.clinicalNote.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { patientId } = body;

  if (!patientId) {
    return NextResponse.json(
      { error: "Falta patientId para crear la nota clínica" },
      { status: 400 },
    );
  }

  try {
    // Permitir solo una historia clínica por paciente
    const existing = await prisma.clinicalNote.findFirst({
      where: { patientId },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Este paciente ya tiene una historia clínica registrada. Edítala en lugar de crear una nueva.",
        },
        { status: 409 },
      );
    }

    const note = await prisma.clinicalNote.create({
      data: {
        patientId,
        appointmentId: body.appointmentId ?? null,
        identificationExtra: body.identificationExtra ?? null,
        personalHistory: body.personalHistory ?? null,
        familyHistory: body.familyHistory ?? null,
        consultationReason: body.consultationReason ?? null,
        currentIllness: body.currentIllness ?? null,
        physicalExam: body.physicalExam ?? null,
        diagnostics: body.diagnostics ?? null,
        diagnosis: body.diagnosis ?? null,
        treatmentPlan: body.treatmentPlan ?? null,
        evolutionNotes: body.evolutionNotes ?? null,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creando nota clínica", error);
    return NextResponse.json(
      { error: "No se pudo crear la nota clínica." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Falta id de la nota clínica a actualizar" },
      { status: 400 },
    );
  }

  try {
    const note = await prisma.clinicalNote.update({
      where: { id },
      data: {
        consultationReason: body.consultationReason ?? null,
        currentIllness: body.currentIllness ?? null,
        physicalExam: body.physicalExam ?? null,
        diagnostics: body.diagnostics ?? null,
        diagnosis: body.diagnosis ?? null,
        treatmentPlan: body.treatmentPlan ?? null,
        evolutionNotes: body.evolutionNotes ?? null,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error actualizando nota clínica", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la nota clínica." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Falta id de la nota clínica a eliminar" },
      { status: 400 },
    );
  }

  try {
    await prisma.clinicalNote.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando nota clínica", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la nota clínica." },
      { status: 500 },
    );
  }
}


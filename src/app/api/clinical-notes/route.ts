import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { deleteDriveFile } from "@/lib/google-drive";

export type ClinicalAttachment = {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  uploadedAt: string;
};

type Visit = {
  id: string;
  createdAt: string; // ISO
  visitDate: string | null; // yyyy-mm-dd
  appointmentId: string | null;
  identificationExtra: string | null;
  personalHistory: string | null;
  familyHistory: string | null;
  consultationReason: string | null;
  currentIllness: string | null;
  physicalExam: string | null;
  diagnostics: string | null;
  diagnosis: string | null;
  treatmentPlan: string | null;
  evolutionNotes: string | null;
  nursingNotes: string | null;
  treatmentNotes: string | null;
  weight: string | null;
  height: string | null;
  bodyTemperature: string | null;
  bloodPressure: string | null;
  oxygenSaturation: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  glucose: string | null;
  /** Nombre del procedimiento según la cita (snapshot) */
  procedureName: string | null;
  /** Detalle / notas del procedimiento en la ficha */
  procedureNote: string | null;
  auxiliaryExams: string | null;
  medicalRest: string | null;
  /** Archivos en Google Drive (solo metadatos en BD) */
  attachments?: ClinicalAttachment[];
};

type ClinicalVisitDTO = {
  id: string; // visitId
  patientId: string;
  appointmentId: string | null;
  createdAt: string;
  visitDate: string | null;
  historyNumber: number;
  identificationExtra: string | null;
  personalHistory: string | null;
  familyHistory: string | null;
  consultationReason: string | null;
  currentIllness: string | null;
  physicalExam: string | null;
  diagnostics: string | null;
  diagnosis: string | null;
  treatmentPlan: string | null;
  evolutionNotes: string | null;
  nursingNotes: string | null;
  treatmentNotes: string | null;
  weight: string | null;
  height: string | null;
  bodyTemperature: string | null;
  bloodPressure: string | null;
  oxygenSaturation: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  glucose: string | null;
  procedureName: string | null;
  procedureNote: string | null;
  auxiliaryExams: string | null;
  medicalRest: string | null;
  attachments: ClinicalAttachment[];
};

type VisitBodyInput = {
  patientId: string;
  visitDate?: string | null;
  appointmentId?: string | null;
  identificationExtra?: string | null;
  personalHistory?: string | null;
  familyHistory?: string | null;
  consultationReason?: string | null;
  currentIllness?: string | null;
  physicalExam?: string | null;
  diagnostics?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  evolutionNotes?: string | null;
  nursingNotes?: string | null;
  treatmentNotes?: string | null;
  weight?: string | null;
  height?: string | null;
  bodyTemperature?: string | null;
  bloodPressure?: string | null;
  oxygenSaturation?: string | null;
  heartRate?: string | null;
  respiratoryRate?: string | null;
  glucose?: string | null;
  attachments?: unknown;
  /** ISO de la atención (p. ej. hora de la cita en agenda) */
  createdAt?: string;
  procedureName?: string | null;
  procedureNote?: string | null;
  auxiliaryExams?: string | null;
  medicalRest?: string | null;
};

function isClinicalAttachment(x: unknown): x is ClinicalAttachment {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.driveFileId === "string" &&
    typeof o.name === "string" &&
    typeof o.mimeType === "string" &&
    (o.webViewLink === null || typeof o.webViewLink === "string") &&
    typeof o.uploadedAt === "string"
  );
}

function normalizeAttachments(input: unknown): ClinicalAttachment[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isClinicalAttachment);
}

async function deleteDriveFileSafe(fileId: string) {
  try {
    await deleteDriveFile(fileId);
  } catch (e) {
    console.error("deleteDriveFileSafe:", fileId, e);
  }
}

function isVisitArray(value: unknown): value is Visit[] {
  if (!Array.isArray(value)) return false;
  return value.every((v) => v && typeof v === "object" && "id" in v);
}

function toVisitDTO(patientId: string, historyNumber: number, v: Visit) {
  return {
    id: v.id,
    patientId,
    appointmentId: v.appointmentId,
    createdAt: v.createdAt,
    visitDate: v.visitDate ?? v.createdAt.slice(0, 10) ?? null,
    historyNumber,
    identificationExtra: v.identificationExtra,
    personalHistory: v.personalHistory,
    familyHistory: v.familyHistory,
    consultationReason: v.consultationReason,
    currentIllness: v.currentIllness,
    physicalExam: v.physicalExam,
    diagnostics: v.diagnostics,
    diagnosis: v.diagnosis,
    treatmentPlan: v.treatmentPlan,
    evolutionNotes: v.evolutionNotes,
    nursingNotes: v.nursingNotes,
    treatmentNotes: v.treatmentNotes,
    weight: v.weight,
    height: v.height,
    bodyTemperature: v.bodyTemperature,
    bloodPressure: v.bloodPressure,
    oxygenSaturation: v.oxygenSaturation,
    heartRate: v.heartRate,
    respiratoryRate: v.respiratoryRate,
    glucose: v.glucose,
    procedureName: v.procedureName ?? null,
    procedureNote: v.procedureNote ?? null,
    auxiliaryExams: v.auxiliaryExams ?? null,
    medicalRest: v.medicalRest ?? null,
    attachments: normalizeAttachments(v.attachments),
  } satisfies ClinicalVisitDTO;
}

function mapBodyToVisitFields(body: Partial<VisitBodyInput>) {
  return {
    visitDate: body.visitDate ?? null,
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
    nursingNotes: body.nursingNotes ?? null,
    treatmentNotes: body.treatmentNotes ?? null,
    weight: body.weight ?? null,
    height: body.height ?? null,
    bodyTemperature: body.bodyTemperature ?? null,
    bloodPressure: body.bloodPressure ?? null,
    oxygenSaturation: body.oxygenSaturation ?? null,
    heartRate: body.heartRate ?? null,
    respiratoryRate: body.respiratoryRate ?? null,
    glucose: body.glucose ?? null,
    procedureName: body.procedureName ?? null,
    procedureNote: body.procedureNote ?? null,
    auxiliaryExams: body.auxiliaryExams ?? null,
    medicalRest: body.medicalRest ?? null,
  };
}

async function loadHistoryAndVisits(patientId: string) {
  // Buscamos TODAS las filas legacy para consolidarlas en el primer registro.
  const rows = await prisma.clinicalNote.findMany({
    where: { patientId },
    orderBy: { createdAt: "asc" },
  });

  if (rows.length === 0) {
    const history = await prisma.clinicalNote.create({
      data: { patientId },
    });
    return { history, visits: [] as Visit[] };
  }

  const history = rows[0];

  // Si el campo visits ya tiene datos, usamos eso.
  if (isVisitArray(history.visits)) {
    return { history, visits: history.visits };
  }

  // Caso legacy: convertimos los campos raíz de cada fila a visitas.
  const legacyVisits: Visit[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    visitDate: r.createdAt.toISOString().slice(0, 10),
    appointmentId: r.appointmentId ?? null,
    identificationExtra: r.identificationExtra ?? null,
    personalHistory: r.personalHistory ?? null,
    familyHistory: r.familyHistory ?? null,
    consultationReason: r.consultationReason ?? null,
    currentIllness: r.currentIllness ?? null,
    physicalExam: r.physicalExam ?? null,
    diagnostics: r.diagnostics ?? null,
    diagnosis: r.diagnosis ?? null,
    treatmentPlan: r.treatmentPlan ?? null,
    evolutionNotes: r.evolutionNotes ?? null,
    nursingNotes: r.nursingNotes ?? null,
    treatmentNotes: r.treatmentNotes ?? null,
    weight: r.weight ?? null,
    height: r.height ?? null,
    bodyTemperature: r.bodyTemperature ?? null,
    bloodPressure: r.bloodPressure ?? null,
    oxygenSaturation: r.oxygenSaturation ?? null,
    heartRate: r.heartRate ?? null,
    respiratoryRate: r.respiratoryRate ?? null,
    glucose: r.glucose ?? null,
    procedureName: null,
    procedureNote: null,
    auxiliaryExams: null,
    medicalRest: null,
    attachments: [],
  }));

  // Persistimos en el contenedor (historia) para que exista “gregario” en una sola fila.
  await prisma.clinicalNote.update({
    where: { id: history.id },
    data: { visits: legacyVisits },
  });

  return { history, visits: legacyVisits };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json(
      { error: "Falta patientId en la consulta" },
      { status: 400 },
    );
  }

  const { history, visits } = await loadHistoryAndVisits(patientId);
  const historyNumber = history.historyNumber;

  // Retornamos las visitas en el formato que consume la UI.
  const sortedVisits = visits
    .slice()
    .sort((a, b) => {
      const ad = a.visitDate ?? a.createdAt.slice(0, 10);
      const bd = b.visitDate ?? b.createdAt.slice(0, 10);
      if (ad > bd) return -1;
      if (ad < bd) return 1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  return NextResponse.json(
    sortedVisits.map((v) => toVisitDTO(patientId, historyNumber, v)),
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<VisitBodyInput>;
  const patientId = body.patientId;

  if (!patientId) {
    return NextResponse.json(
      { error: "Falta patientId para crear la atención" },
      { status: 400 },
    );
  }

  try {
    const { history, visits } = await loadHistoryAndVisits(patientId);
    const visitDate =
      body.visitDate ?? new Date().toISOString().slice(0, 10);

    const createdAtIso =
      typeof body.createdAt === "string" && body.createdAt.length > 10
        ? body.createdAt
        : new Date().toISOString();

    const newVisit: Visit = {
      id: crypto.randomUUID(),
      createdAt: createdAtIso,
      visitDate,
      ...(mapBodyToVisitFields({ ...body, visitDate }) as Omit<
        Visit,
        "id" | "createdAt" | "visitDate" | "attachments"
      >),
      attachments:
        "attachments" in body && body.attachments !== undefined
          ? normalizeAttachments(body.attachments)
          : [],
    };

    const updatedVisits = [newVisit, ...visits];
    await prisma.clinicalNote.update({
      where: { id: history.id },
      data: { visits: updatedVisits },
    });

    return NextResponse.json(
      toVisitDTO(patientId, history.historyNumber, newVisit),
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creando atención clínica", error);
    return NextResponse.json(
      { error: "No se pudo crear la atención clínica." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as Partial<
    VisitBodyInput & { id?: string }
  >;
  const visitId = body.id; // La UI manda `id` como visitId

  if (!visitId) {
    return NextResponse.json(
      { error: "Falta id (visitId) para actualizar la atención" },
      { status: 400 },
    );
  }

  const patientId = body.patientId;
  if (!patientId) {
    return NextResponse.json(
      { error: "Falta patientId para actualizar la atención" },
      { status: 400 },
    );
  }

  try {
    const { history, visits } = await loadHistoryAndVisits(patientId);

    const idx = visits.findIndex((v) => v.id === visitId);
    if (idx === -1) {
      return NextResponse.json(
        { error: "Atención no encontrada." },
        { status: 404 },
      );
    }

    const updatedVisit: Visit = {
      ...visits[idx],
      ...(mapBodyToVisitFields(body) as Omit<
        Visit,
        "id" | "createdAt"
      >),
    };

    const updatedVisits = visits.map((v) => (v.id === visitId ? updatedVisit : v));
    await prisma.clinicalNote.update({
      where: { id: history.id },
      data: { visits: updatedVisits },
    });

    return NextResponse.json(
      toVisitDTO(patientId, history.historyNumber, updatedVisit),
    );
  } catch (error) {
    console.error("Error actualizando atención clínica", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la atención clínica." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get("id");
  const patientId = searchParams.get("patientId");

  if (!visitId) {
    return NextResponse.json(
      { error: "Falta id (visitId) de la atención a eliminar" },
      { status: 400 },
    );
  }
  if (!patientId) {
    return NextResponse.json(
      { error: "Falta patientId para eliminar la atención" },
      { status: 400 },
    );
  }

  try {
    const { history, visits } = await loadHistoryAndVisits(patientId);
    const removed = visits.find((v) => v.id === visitId);
    if (removed) {
      for (const a of normalizeAttachments(removed.attachments)) {
        void deleteDriveFileSafe(a.driveFileId);
      }
    }
    const updatedVisits = visits.filter((v) => v.id !== visitId);

    await prisma.clinicalNote.update({
      where: { id: history.id },
      data: { visits: updatedVisits },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando atención clínica", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la atención clínica." },
      { status: 500 },
    );
  }
}


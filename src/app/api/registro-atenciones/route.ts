import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPatientDocument } from "@/lib/patient-document";
import { toLocalISODate } from "@/lib/date-range";

function isVisitArray(value: unknown): value is Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return false;
  return value.every((v) => v && typeof v === "object" && "id" in v);
}

function defaultDateFrom(): string {
  const now = new Date();
  return toLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function visitInRange(
  visitDate: string | null | undefined,
  createdAt: string,
  dateFrom: string,
  dateTo: string,
): boolean {
  const day = visitDate ?? createdAt.slice(0, 10);
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

export type RegistroAtencionRow = {
  visitId: string;
  patientId: string;
  patientName: string;
  patientDocument: string;
  historyNumber: number;
  visitDate: string | null;
  createdAt: string;
  appointmentId: string | null;
  procedureName: string | null;
  summary: string;
};

/** Lista plana de fichas de atención (sin el JSON completo de cada visita). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom")?.trim() || defaultDateFrom();
  const dateTo = searchParams.get("dateTo")?.trim() || toLocalISODate(new Date());

  const notes = await prisma.clinicalNote.findMany({
    select: {
      historyNumber: true,
      visits: true,
      patient: {
        select: {
          id: true,
          fullName: true,
          documentType: true,
          dni: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows: RegistroAtencionRow[] = [];

  for (const note of notes) {
    const visits = isVisitArray(note.visits) ? note.visits : [];
    const historyNumber = note.historyNumber;
    const patient = note.patient;

    for (const raw of visits) {
      const v = raw as {
        id?: string;
        createdAt?: string;
        visitDate?: string | null;
        appointmentId?: string | null;
        diagnosis?: string | null;
        consultationReason?: string | null;
        procedureName?: string | null;
      };
      if (!v.id || !v.createdAt) continue;
      if (!visitInRange(v.visitDate, v.createdAt, dateFrom, dateTo)) continue;

      const summaryParts = [v.consultationReason, v.diagnosis].filter(
        (x) => x && String(x).trim(),
      );
      const summary = summaryParts.length
        ? String(summaryParts[0]).slice(0, 180) +
          (summaryParts.length > 1 ? ` · ${String(summaryParts[1]).slice(0, 80)}` : "")
        : "Sin resumen";

      rows.push({
        visitId: v.id,
        patientId: patient.id,
        patientName: patient.fullName,
        patientDocument: formatPatientDocument(patient),
        historyNumber,
        visitDate: v.visitDate ?? v.createdAt.slice(0, 10),
        createdAt: v.createdAt,
        appointmentId: v.appointmentId ?? null,
        procedureName: v.procedureName ?? null,
        summary,
      });
    }
  }

  rows.sort((a, b) => {
    const da = a.visitDate ?? a.createdAt.slice(0, 10);
    const db = b.visitDate ?? b.createdAt.slice(0, 10);
    if (da !== db) return db.localeCompare(da);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return NextResponse.json(rows, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPatientDocument } from "@/lib/patient-document";
import { toLocalISODate } from "@/lib/date-range";

function defaultDateFrom(): string {
  // Por defecto últimos 14 días (menos carga que todo el mes).
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 13);
  return toLocalISODate(from);
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

type RawRow = {
  visitId: string;
  patientId: string;
  patientName: string;
  documentType: string;
  dni: string;
  historyNumber: number;
  visitDate: string | null;
  createdAt: string;
  appointmentId: string | null;
  procedureName: string | null;
  consultationReason: string | null;
  diagnosis: string | null;
};

/**
 * Lista plana de fichas. Filtra por fecha en PostgreSQL (jsonb) y solo proyecta
 * campos de lista — evita cargar el JSON completo de visitas en Node.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom")?.trim() || defaultDateFrom();
  const dateTo = searchParams.get("dateTo")?.trim() || toLocalISODate(new Date());
  const limitRaw = Number(searchParams.get("limit") ?? "300");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), 500)
    : 300;

  const rawRows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      v.elem->>'id' AS "visitId",
      p.id AS "patientId",
      p."fullName" AS "patientName",
      p."documentType" AS "documentType",
      p.dni AS "dni",
      cn."historyNumber" AS "historyNumber",
      NULLIF(v.elem->>'visitDate', '') AS "visitDate",
      v.elem->>'createdAt' AS "createdAt",
      NULLIF(v.elem->>'appointmentId', '') AS "appointmentId",
      NULLIF(v.elem->>'procedureName', '') AS "procedureName",
      NULLIF(v.elem->>'consultationReason', '') AS "consultationReason",
      NULLIF(v.elem->>'diagnosis', '') AS "diagnosis"
    FROM "ClinicalNote" cn
    INNER JOIN "Patient" p ON p.id = cn."patientId"
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN cn.visits IS NULL THEN '[]'::jsonb
        WHEN jsonb_typeof(cn.visits::jsonb) = 'array' THEN cn.visits::jsonb
        ELSE '[]'::jsonb
      END
    ) AS v(elem)
    WHERE COALESCE(
      NULLIF(v.elem->>'visitDate', ''),
      LEFT(v.elem->>'createdAt', 10)
    ) BETWEEN ${dateFrom} AND ${dateTo}
      AND v.elem->>'id' IS NOT NULL
      AND v.elem->>'createdAt' IS NOT NULL
    ORDER BY
      COALESCE(NULLIF(v.elem->>'visitDate', ''), LEFT(v.elem->>'createdAt', 10)) DESC,
      v.elem->>'createdAt' DESC
    LIMIT ${limit}
  `;

  const rows: RegistroAtencionRow[] = rawRows.map((r) => {
    const summaryParts = [r.consultationReason, r.diagnosis].filter(
      (x) => x && String(x).trim(),
    );
    const summary = summaryParts.length
      ? String(summaryParts[0]).slice(0, 180) +
        (summaryParts.length > 1
          ? ` · ${String(summaryParts[1]).slice(0, 80)}`
          : "")
      : "Sin resumen";

    return {
      visitId: r.visitId,
      patientId: r.patientId,
      patientName: r.patientName,
      patientDocument: formatPatientDocument({
        documentType: r.documentType,
        dni: r.dni,
      }),
      historyNumber: Number(r.historyNumber),
      visitDate: r.visitDate ?? r.createdAt.slice(0, 10),
      createdAt: r.createdAt,
      appointmentId: r.appointmentId,
      procedureName: r.procedureName,
      summary,
    };
  });

  return NextResponse.json(rows, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

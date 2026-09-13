import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limaDayEndUTC, limaDayStartUTC } from "@/lib/date-range";
import type {
  TreatmentStatPatient,
  TreatmentStatRow,
  TreatmentStatsResponse,
} from "@/lib/treatment-stats";
import { appointmentProcedures } from "@/lib/appointment-procedures";

export type {
  TreatmentStatPatient,
  TreatmentStatRow,
  TreatmentStatsResponse,
} from "@/lib/treatment-stats";

function parseMonth(raw: string | null): { year: number; month: number } | null {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

function currentMonthISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toLimaISODate(d: Date): string {
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Reporte de tratamientos (citas de Agenda) por mes. */
export async function GET(request: NextRequest) {
  const monthParam =
    request.nextUrl.searchParams.get("month")?.trim() || currentMonthISO();
  const parsed = parseMonth(monthParam);
  if (!parsed) {
    return NextResponse.json(
      { error: "Parámetro month inválido. Usa YYYY-MM." },
      { status: 400 },
    );
  }

  const { year, month } = parsed;
  const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateTo = `${year}-${String(month).padStart(2, "0")}-${String(
    lastDayOfMonth(year, month),
  ).padStart(2, "0")}`;

  const start = limaDayStartUTC(dateFrom);
  const end = limaDayEndUTC(dateTo);
  if (!start || !end) {
    return NextResponse.json({ error: "Rango de fechas inválido." }, { status: 400 });
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: start, lte: end },
      NOT: {
        status: { in: ["cancelada", "Cancelada", "CANCELADA"] },
      },
    },
    select: {
      id: true,
      type: true,
      procedures: true,
      status: true,
      startAt: true,
      patient: {
        select: {
          id: true,
          fullName: true,
          documentType: true,
          dni: true,
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 5000,
  });

  const byTreatment = new Map<string, TreatmentStatPatient[]>();

  for (const a of appointments) {
    const treatments = appointmentProcedures({
      type: a.type,
      procedures: a.procedures,
    });
    const listTreatments =
      treatments.length > 0 ? treatments : ["Sin especificar"];
    const dateISO = toLimaISODate(a.startAt);

    for (const treatment of listTreatments) {
      const entry: TreatmentStatPatient = {
        id: a.patient.id,
        fullName: a.patient.fullName,
        documentType: a.patient.documentType,
        dni: a.patient.dni,
        dateISO,
        status: a.status,
        appointmentId: `${a.id}:${treatment}`,
      };
      const list = byTreatment.get(treatment) ?? [];
      list.push(entry);
      byTreatment.set(treatment, list);
    }
  }

  const totalSessions = [...byTreatment.values()].reduce(
    (sum, list) => sum + list.length,
    0,
  );
  const pct = (count: number) =>
    totalSessions > 0 ? Math.round((count / totalSessions) * 1000) / 10 : 0;

  const breakdown: TreatmentStatRow[] = [...byTreatment.entries()]
    .map(([treatment, patients]) => ({
      treatment,
      count: patients.length,
      percent: pct(patients.length),
      patients,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.treatment.localeCompare(b.treatment, "es");
    });

  const payload: TreatmentStatsResponse = {
    month: monthParam,
    dateFrom,
    dateTo,
    totalSessions,
    distinctTreatments: breakdown.length,
    breakdown,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createdAtRangeWhere } from "@/lib/date-range";
import {
  isKnownReferralSource,
  REFERRAL_SOURCE_OPTIONS,
  REFERRAL_SOURCE_OTHER,
  REFERRAL_SOURCE_UNSPECIFIED,
  type ReferralStatsResponse,
  type ReferralStatRow,
  type ReferralStatPatient,
} from "@/lib/referral-sources";

export type {
  ReferralStatsResponse,
  ReferralStatRow,
  ReferralStatPatient,
} from "@/lib/referral-sources";

function resolveSource(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return REFERRAL_SOURCE_UNSPECIFIED;
  if (isKnownReferralSource(trimmed)) return trimmed;
  return REFERRAL_SOURCE_OTHER;
}

export async function GET(request: NextRequest) {
  const dateFrom = request.nextUrl.searchParams.get("dateFrom")?.trim() || null;
  const dateTo = request.nextUrl.searchParams.get("dateTo")?.trim() || null;

  const patients = await prisma.patient.findMany({
    where: createdAtRangeWhere(dateFrom, dateTo),
    select: {
      id: true,
      fullName: true,
      documentType: true,
      dni: true,
      referralSource: true,
      createdAt: true,
    },
    orderBy: { fullName: "asc" },
  });

  const totalPatients = patients.length;
  const patientsBySource = new Map<string, ReferralStatPatient[]>();

  for (const opt of REFERRAL_SOURCE_OPTIONS) {
    patientsBySource.set(opt, []);
  }
  patientsBySource.set(REFERRAL_SOURCE_UNSPECIFIED, []);
  patientsBySource.set(REFERRAL_SOURCE_OTHER, []);

  let withSource = 0;

  for (const p of patients) {
    const source = resolveSource(p.referralSource);
    const entry: ReferralStatPatient = {
      id: p.id,
      fullName: p.fullName,
      documentType: p.documentType,
      dni: p.dni,
      registeredAt: p.createdAt.toISOString(),
    };
    patientsBySource.get(source)?.push(entry);
    if (source !== REFERRAL_SOURCE_UNSPECIFIED) withSource += 1;
  }

  const withoutSource = patientsBySource.get(REFERRAL_SOURCE_UNSPECIFIED)?.length ?? 0;
  const otherPatients = patientsBySource.get(REFERRAL_SOURCE_OTHER) ?? [];
  const otherCount = otherPatients.length;

  const pct = (count: number) =>
    totalPatients > 0 ? Math.round((count / totalPatients) * 1000) / 10 : 0;

  const breakdown: ReferralStatRow[] = [
    ...REFERRAL_SOURCE_OPTIONS.map((source) => {
      const list = patientsBySource.get(source) ?? [];
      return {
        source,
        count: list.length,
        percent: pct(list.length),
        patients: list,
      };
    }),
    ...(otherCount > 0
      ? [
          {
            source: REFERRAL_SOURCE_OTHER,
            count: otherCount,
            percent: pct(otherCount),
            patients: otherPatients,
          },
        ]
      : []),
    {
      source: REFERRAL_SOURCE_UNSPECIFIED,
      count: withoutSource,
      percent: pct(withoutSource),
      patients: patientsBySource.get(REFERRAL_SOURCE_UNSPECIFIED) ?? [],
    },
  ].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.source.localeCompare(b.source, "es");
  });

  const payload: ReferralStatsResponse = {
    totalPatients,
    withSource,
    withoutSource,
    dateFrom,
    dateTo,
    breakdown,
  };

  return NextResponse.json(payload);
}

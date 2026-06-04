import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isKnownReferralSource,
  REFERRAL_SOURCE_OPTIONS,
  REFERRAL_SOURCE_OTHER,
  REFERRAL_SOURCE_UNSPECIFIED,
  type ReferralStatsResponse,
  type ReferralStatRow,
} from "@/lib/referral-sources";

export type { ReferralStatsResponse, ReferralStatRow } from "@/lib/referral-sources";

export async function GET() {
  const patients = await prisma.patient.findMany({
    select: { referralSource: true },
  });

  const totalPatients = patients.length;
  const counts = new Map<string, number>();

  for (const opt of REFERRAL_SOURCE_OPTIONS) {
    counts.set(opt, 0);
  }
  counts.set(REFERRAL_SOURCE_UNSPECIFIED, 0);
  counts.set(REFERRAL_SOURCE_OTHER, 0);

  let withSource = 0;

  for (const p of patients) {
    const raw = (p.referralSource ?? "").trim();
    if (!raw) {
      counts.set(
        REFERRAL_SOURCE_UNSPECIFIED,
        (counts.get(REFERRAL_SOURCE_UNSPECIFIED) ?? 0) + 1,
      );
      continue;
    }
    withSource += 1;
    if (isKnownReferralSource(raw)) {
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    } else {
      counts.set(REFERRAL_SOURCE_OTHER, (counts.get(REFERRAL_SOURCE_OTHER) ?? 0) + 1);
    }
  }

  const withoutSource = counts.get(REFERRAL_SOURCE_UNSPECIFIED) ?? 0;
  const otherCount = counts.get(REFERRAL_SOURCE_OTHER) ?? 0;

  const pct = (count: number) =>
    totalPatients > 0 ? Math.round((count / totalPatients) * 1000) / 10 : 0;

  const breakdown: ReferralStatRow[] = [
    ...REFERRAL_SOURCE_OPTIONS.map((source) => ({
      source,
      count: counts.get(source) ?? 0,
      percent: pct(counts.get(source) ?? 0),
    })),
    ...(otherCount > 0
      ? [
          {
            source: REFERRAL_SOURCE_OTHER,
            count: otherCount,
            percent: pct(otherCount),
          },
        ]
      : []),
    {
      source: REFERRAL_SOURCE_UNSPECIFIED,
      count: withoutSource,
      percent: pct(withoutSource),
    },
  ].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.source.localeCompare(b.source, "es");
  });

  const payload: ReferralStatsResponse = {
    totalPatients,
    withSource,
    withoutSource,
    breakdown,
  };

  return NextResponse.json(payload);
}

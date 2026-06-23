import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getLimaMonthDay(d: Date): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const monthStr = parts.find((p) => p.type === "month")?.value;
  const dayStr = parts.find((p) => p.type === "day")?.value;

  return {
    month: monthStr ? Number(monthStr) : 0,
    day: dayStr ? Number(dayStr) : 0,
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const baseDate = dateParam ? new Date(dateParam) : new Date();

  const { month, day } = getLimaMonthDay(baseDate);

  const todayBirthdays = await prisma.$queryRaw<
    Array<{
      id: string;
      fullName: string;
      documentType: string;
      dni: string;
      phone: string;
      address: string;
      birthDate: Date;
      emergencyContactName: string | null;
      emergencyContactPhone: string | null;
      allergyNotes: string | null;
      medicalHistory: string | null;
      referralSource: string | null;
      status: string;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT *
    FROM "Patient"
    WHERE EXTRACT(MONTH FROM ("birthDate" AT TIME ZONE 'America/Lima')) = ${month}
      AND EXTRACT(DAY FROM ("birthDate" AT TIME ZONE 'America/Lima')) = ${day}
    ORDER BY "fullName" ASC
  `;

  return NextResponse.json(todayBirthdays);
}

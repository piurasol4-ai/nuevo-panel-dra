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

  const patients = await prisma.patient.findMany({
    orderBy: { fullName: "asc" },
  });

  const todayBirthdays = patients.filter((p) => {
    const bd = new Date(p.birthDate);
    const lima = getLimaMonthDay(bd);
    return lima.month === month && lima.day === day;
  });

  return NextResponse.json(todayBirthdays);
}


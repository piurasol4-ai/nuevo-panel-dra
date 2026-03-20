import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSolesToCents } from "@/lib/money";
import { Prisma } from "@prisma/client";

function toLimaISODate(d: Date) {
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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const dateISO = url.searchParams.get("dateISO");
  const startISO = url.searchParams.get("startISO");
  const endISO = url.searchParams.get("endISO");

  const where: Prisma.TicketRecordWhereInput = {};
  if (dateISO) where.dateISO = dateISO;
  if (startISO || endISO) {
    where.dateISO = {
      ...(startISO ? { gte: startISO } : {}),
      ...(endISO ? { lte: endISO } : {}),
    };
  }
  const appointmentId = url.searchParams.get("appointmentId");
  if (appointmentId) where.appointmentId = appointmentId;

  const tickets = await prisma.ticketRecord.findMany({
    where,
    include: {
      ticketLines: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    tickets: tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      createdAt: t.createdAt,
      dateISO: t.dateISO,
      appointmentId: t.appointmentId,
      patientId: t.patientId,
      patientName: t.patientName,
      patientDni: t.patientDni,
      procedureName: t.procedureName,
      procedureUnitPriceCents: t.procedureUnitPriceCents,
      paymentEfectivoCents: t.paymentEfectivoCents,
      paymentYapeCents: t.paymentYapeCents,
      paymentPlinCents: t.paymentPlinCents,
      paymentTransferenciaCents: t.paymentTransferenciaCents,
      paymentTotalCents: t.paymentTotalCents,
      totalCents: t.totalCents,
      ticketLines: t.ticketLines.map((l) => ({
        id: l.id,
        productId: l.productId,
        name: l.name,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        lineTotalCents: l.lineTotalCents,
      })),
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        appointmentId?: unknown;
        procedureUnitPriceSoles?: unknown;
        procedureUnitPriceCents?: unknown;
        paymentEfectivoSoles?: unknown;
        paymentYapeSoles?: unknown;
        paymentPlinSoles?: unknown;
        paymentTransferenciaSoles?: unknown;
        items?: Array<{
          productId?: unknown;
          name?: unknown;
          quantity?: unknown;
          unitPriceSoles?: unknown;
          unitPriceCents?: unknown;
        }>;
      }
    | null;

  const appointmentId = String(body?.appointmentId ?? "").trim();
  if (!appointmentId) {
    return NextResponse.json({ error: "Falta appointmentId" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true },
  });

  if (!appt) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  const procedureUnitPriceCents =
    typeof body?.procedureUnitPriceCents !== "undefined"
      ? Number(body.procedureUnitPriceCents)
      : parseSolesToCents(body?.procedureUnitPriceSoles);

  const paymentEfectivoCents = parseSolesToCents(body?.paymentEfectivoSoles);
  const paymentYapeCents = parseSolesToCents(body?.paymentYapeSoles);
  const paymentPlinCents = parseSolesToCents(body?.paymentPlinSoles);
  const paymentTransferenciaCents = parseSolesToCents(
    body?.paymentTransferenciaSoles,
  );

  const items = Array.isArray(body?.items) ? body!.items : [];

  const ticketLines = items.map((it) => {
    const productId =
      typeof it.productId === "undefined" || it.productId === null
        ? null
        : Number(it.productId);
    const name = String(it.name ?? "").trim();
    const quantity = Math.floor(Number(it.quantity ?? 0));
    const unitPriceCents =
      typeof it.unitPriceCents !== "undefined" ? Number(it.unitPriceCents) : parseSolesToCents(it.unitPriceSoles);
    const lineTotalCents = unitPriceCents * quantity;
    return {
      productId: Number.isFinite(productId) ? productId : null,
      name,
      quantity,
      unitPriceCents,
      lineTotalCents,
    };
  });

  if (ticketLines.some((l) => !l.name || !Number.isFinite(l.quantity) || l.quantity <= 0)) {
    return NextResponse.json({ error: "Items inválidos" }, { status: 400 });
  }

  const itemsTotalCents = ticketLines.reduce((acc, l) => acc + l.lineTotalCents, 0);
  const totalCents = procedureUnitPriceCents + itemsTotalCents;
  if (totalCents <= 0) {
    return NextResponse.json(
      { error: "El Ticket/Boleta debe tener un monto total mayor a 0." },
      { status: 400 },
    );
  }
  const paymentTotalCents =
    paymentEfectivoCents + paymentYapeCents + paymentPlinCents + paymentTransferenciaCents;

  const delta = Math.abs(paymentTotalCents - totalCents);
  if (delta > 1) {
    return NextResponse.json(
      {
        error: `La suma de pagos (${paymentTotalCents}) no coincide con el total (${totalCents}).`,
      },
      { status: 400 },
    );
  }

  const dateISO = toLimaISODate(new Date(appt.startAt));

  return await prisma.$transaction(async (tx) => {
    // Validar y descontar stock (solo productos catálogo)
    for (const line of ticketLines) {
      if (line.productId == null) continue;
      if (!Number.isFinite(line.productId)) continue;

      const prod = await tx.productCatalog.findUnique({ where: { id: line.productId } });
      if (!prod) {
        throw new Error(`Producto catálogo no existe (id=${line.productId})`);
      }
      if (prod.stock < line.quantity) {
        throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}, requerido: ${line.quantity}.`);
      }
      await tx.productCatalog.update({
        where: { id: prod.id },
        data: { stock: prod.stock - line.quantity },
      });
    }

    const ticketLinesData = ticketLines.map((l) => ({
      productId: l.productId,
      name: l.name,
      quantity: l.quantity,
      unitPriceCents: l.unitPriceCents,
      lineTotalCents: l.lineTotalCents,
    }));

    const created = await tx.ticketRecord.create({
      data: {
        appointmentId,
        dateISO,
        patientId: appt.patientId,
        patientName: appt.patient.fullName,
        patientDni: appt.patient.dni,
        procedureName: appt.type,
        procedureUnitPriceCents,
        paymentEfectivoCents,
        paymentYapeCents,
        paymentPlinCents,
        paymentTransferenciaCents,
        paymentTotalCents,
        totalCents,
        ...(ticketLinesData.length > 0
          ? { ticketLines: { create: ticketLinesData } }
          : {}),
      },
      include: { ticketLines: true },
    });

    return NextResponse.json(
      {
        ok: true,
        ticket: created,
      },
      { status: 201 },
    );
  }).catch((err) => {
    const message = err instanceof Error ? err.message : "No se pudo crear ticket";
    return NextResponse.json({ error: message }, { status: 400 });
  });
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await prisma.ticketRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { centsToDisplay, parseSolesToCents } from "@/lib/money";

const DEFAULT_PROCEDURES: Array<{ name: string; price: string }> = [
  { name: "CONSULTA MEDICA", price: "S/ 150.00" },
  { name: "AUTOHEMOC MAYOR", price: "S/ 150.00" },
  { name: "HIDROCOLON POR SESION", price: "S/ 200.00" },
  { name: "SUERO OZONIZADO", price: "S/ 100.00" },
  { name: "AUTOHEMOC MENOR", price: "S/ 80.00" },
  { name: "TERAPIA NEURAL", price: "S/ 100.00" },
  { name: "ACUPUNTURA", price: "S/ 70.00" },
  { name: "OZONO RECTAL", price: "S/ 50.00" },
  { name: "OZONO VAGINAL", price: "S/ 80.00" },
  { name: "OZONO URETRAL", price: "S/ 80.00" },
  { name: "AUTO HEMOTERAPIA MAYOR", price: "S/ 200.00" },
  { name: "AUTO HEMOTERAPIA MENOR", price: "S/ 80.00" },
  { name: "OZONO PARAVERTEBRAL", price: "S/ 100.00" },
  { name: "OZONO INTRAARTICULAR 1 APLICACION", price: "S/ 100.00" },
  { name: "OZONO INTRAARTICULAR 2 APLICACIONES", price: "S/ 120.00" },
  { name: "OZONO INTRAARTICULAR 3 APLICACIONES", price: "S/ 150.00" },
  { name: "OZONO INTRAMUSCULAR", price: "S/ 80.00" },
  {
    name: "PLASMA RICO EN PLAQUETAS (1 ARTICULACIÓN) 4 TUBOS",
    price: "S/ 250.00",
  },
  {
    name: "PLASMA RICO EN PLAQUETAS (1 ARTICULACIÓN) 3 TUBOS",
    price: "S/ 200.00",
  },
  {
    name: "PLASMA RICO EN PLAQUETAS (2 ARTICULACIONES) 4 TUBOS",
    price: "S/ 300.00",
  },
  {
    name: "PLASMA RICO EN PLAQUETAS (2 ARTICULACIONES) 3 TUBOS",
    price: "S/ 250.00",
  },
  { name: "DISCOLISIS", price: "S/ 8,000.00" },
  { name: "HIDROTERAPIA DE COLON", price: "S/ 300.00" },
];

async function ensureDefaults() {
  const count = await prisma.procedurePrice.count();
  if (count > 0) return;

  await prisma.procedurePrice.createMany({
    data: DEFAULT_PROCEDURES.map((p) => ({
      name: p.name,
      priceCents: parseSolesToCents(p.price),
    })),
    skipDuplicates: true,
  });
}

function toDto(p: { id: number; name: string; priceCents: number }) {
  return { id: p.id, name: p.name, price: centsToDisplay(p.priceCents) };
}

export async function GET() {
  await ensureDefaults();
  const all = await prisma.procedurePrice.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json(all.map(toDto));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; price?: unknown }
    | null;
  const name = String(body?.name ?? "").trim();
  const priceCents = parseSolesToCents(body?.price);
  if (!name) {
    return NextResponse.json({ error: "Falta name." }, { status: 400 });
  }

  const created = await prisma.procedurePrice.create({
    data: { name, priceCents },
  });
  return NextResponse.json(toDto(created), { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { id?: unknown; name?: unknown; price?: unknown }
    | null;
  const id = Number(body?.id);
  const name = String(body?.name ?? "").trim();
  const priceCents = parseSolesToCents(body?.price);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Falta name." }, { status: 400 });
  }

  const updated = await prisma.procedurePrice.update({
    where: { id },
    data: { name, priceCents },
  });
  return NextResponse.json(toDto(updated));
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido." }, { status: 400 });
  }

  await prisma.procedurePrice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


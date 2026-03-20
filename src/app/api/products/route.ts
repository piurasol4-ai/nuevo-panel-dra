import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { centsToDisplay, parseSolesToCents } from "@/lib/money";

const DEFAULT_PRODUCTS: Array<{
  name: string;
  category: string;
  use: string;
  stock: number;
  price: string;
}> = [
  { name: "Paracetamol 500 mg", category: "Analgésico", use: "Dolor y fiebre", stock: 300, price: "S/ 2.50" },
  { name: "Ibuprofeno 400 mg", category: "Antiinflamatorio", use: "Dolor e inflamación", stock: 300, price: "S/ 4.00" },
  { name: "Naproxeno 550 mg", category: "Antiinflamatorio", use: "Dolor muscular", stock: 300, price: "S/ 5.50" },
  { name: "Acemuk", category: "Mucolítico", use: "Tos y flema", stock: 300, price: "S/ 18.00" },
  { name: "Aspirina Prevent", category: "Cardiovascular", use: "Prevención cardiovascular", stock: 300, price: "S/ 15.00" },
  { name: "Corbis 5", category: "Antihipertensivo", use: "Presión arterial", stock: 300, price: "S/ 35.00" },
  { name: "Actron", category: "Antiinflamatorio", use: "Dolor general", stock: 300, price: "S/ 12.00" },
  { name: "Tafirof", category: "Analgésico", use: "Fiebre y dolor", stock: 300, price: "S/ 10.00" },
  { name: "Ambroxol jarabe", category: "Respiratorio", use: "Tos productiva", stock: 300, price: "S/ 9.00" },
  { name: "Loratadina 10 mg", category: "Antialérgico", use: "Alergias", stock: 300, price: "S/ 6.00" },
  { name: "Omeprazol 20 mg", category: "Gastrointestinal", use: "Acidez gástrica", stock: 300, price: "S/ 7.50" },
  { name: "Sales de rehidratación oral", category: "Hidratación", use: "Deshidratación", stock: 300, price: "S/ 3.00" },
  { name: "Vitamina C", category: "Suplemento", use: "Defensas", stock: 300, price: "S/ 4.50" },
  { name: "Metformina 850 mg", category: "Antidiabético", use: "Diabetes tipo 2", stock: 300, price: "S/ 18.00" },
  { name: "Amoxicilina 500 mg", category: "Antibiótico", use: "Infecciones bacterianas", stock: 300, price: "S/ 14.00" },
];

async function ensureDefaults() {
  const count = await prisma.productCatalog.count();
  if (count > 0) return;

  await prisma.productCatalog.createMany({
    data: DEFAULT_PRODUCTS.map((p) => ({
      name: p.name,
      category: p.category,
      use: p.use,
      stock: p.stock,
      unitPriceCents: parseSolesToCents(p.price),
    })),
    skipDuplicates: true,
  });
}

function toDto(p: {
  id: number;
  name: string;
  category: string;
  use: string;
  stock: number;
  unitPriceCents: number;
}) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    use: p.use,
    stock: String(p.stock),
    price: centsToDisplay(p.unitPriceCents),
  };
}

export async function GET() {
  await ensureDefaults();
  const all = await prisma.productCatalog.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(all.map(toDto));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        name?: unknown;
        category?: unknown;
        use?: unknown;
        stock?: unknown;
        price?: unknown;
      }
    | null;
  const name = String(body?.name ?? "").trim();
  const category = String(body?.category ?? "").trim();
  const use = String(body?.use ?? "").trim();
  const stock = parseInt(String(body?.stock ?? "0").replace(/[^\d]/g, ""), 10);
  const unitPriceCents = parseSolesToCents(body?.price);
  if (!name) return NextResponse.json({ error: "Falta name." }, { status: 400 });

  const created = await prisma.productCatalog.create({
    data: {
      name,
      category,
      use,
      stock: Number.isFinite(stock) ? stock : 0,
      unitPriceCents,
    },
  });
  return NextResponse.json(toDto(created), { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        id?: unknown;
        name?: unknown;
        category?: unknown;
        use?: unknown;
        stock?: unknown;
        price?: unknown;
      }
    | null;
  const id = Number(body?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido." }, { status: 400 });
  }

  const name = String(body?.name ?? "").trim();
  const category = String(body?.category ?? "").trim();
  const use = String(body?.use ?? "").trim();
  const stock = parseInt(String(body?.stock ?? "0").replace(/[^\d]/g, ""), 10);
  const unitPriceCents = parseSolesToCents(body?.price);

  if (!name) return NextResponse.json({ error: "Falta name." }, { status: 400 });

  const updated = await prisma.productCatalog.update({
    where: { id },
    data: {
      name,
      category,
      use,
      stock: Number.isFinite(stock) ? stock : 0,
      unitPriceCents,
    },
  });
  return NextResponse.json(toDto(updated));
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido." }, { status: 400 });
  }

  await prisma.productCatalog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSolesToCents, centsToDisplay } from "@/lib/money";

function parseStock(value: unknown): number {
  return parseInt(String(value ?? "0").replace(/[^\d]/g, ""), 10) || 0;
}

function normalizeUnit(value: unknown): number {
  return parseSolesToCents(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        mode?: unknown;
        products?: Array<Record<string, unknown>>;
      }
    | null;

  const mode = String(body?.mode ?? "replace") as "replace" | "merge";
  const products = Array.isArray(body?.products) ? body!.products : [];

  if (products.length === 0) {
    return NextResponse.json({ error: "No products en el payload." }, { status: 400 });
  }

  const data = products
    .map((p) => {
      const name = String(p.name ?? "").trim();
      if (!name) return null;
      const category = String(p.category ?? "").trim();
      const use = String(p.use ?? "").trim();
      return {
        name,
        category,
        use,
        stock: parseStock(p.stock),
        unitPriceCents: normalizeUnit(p.price),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  if (data.length === 0) {
    return NextResponse.json({ error: "No products válidos." }, { status: 400 });
  }

  if (mode === "replace") {
    await prisma.productCatalog.deleteMany({});
  }

  await Promise.all(
    data.map(async (p) => {
      await prisma.productCatalog.upsert({
        where: { name: p.name },
        update: {
          category: p.category,
          use: p.use,
          stock: p.stock,
          unitPriceCents: p.unitPriceCents,
        },
        create: {
          name: p.name,
          category: p.category,
          use: p.use,
          stock: p.stock,
          unitPriceCents: p.unitPriceCents,
        },
      });
    }),
  );

  const all = await prisma.productCatalog.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(
    all.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      use: p.use,
      stock: String(p.stock),
      price: centsToDisplay(p.unitPriceCents),
    })),
  );
}


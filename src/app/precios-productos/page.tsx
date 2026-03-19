 "use client";

import { useEffect, useState } from "react";

type ProductRow = {
  id: number;
  name: string;
  category: string;
  use: string;
  stock: string;
  price: string;
};

const PRODUCTS_STORAGE_KEY = "hc_productos_v1";

export default function PreciosProductosPage() {
  const DEFAULT_ROWS: ProductRow[] = [
    {
      id: 1,
      name: "Paracetamol 500 mg",
      category: "Analgésico",
      use: "Dolor y fiebre",
      stock: "300",
      price: "S/ 2.50",
    },
    {
      id: 2,
      name: "Ibuprofeno 400 mg",
      category: "Antiinflamatorio",
      use: "Dolor e inflamación",
      stock: "300",
      price: "S/ 4.00",
    },
    {
      id: 3,
      name: "Naproxeno 550 mg",
      category: "Antiinflamatorio",
      use: "Dolor muscular",
      stock: "300",
      price: "S/ 5.50",
    },
    {
      id: 4,
      name: "Acemuk",
      category: "Mucolítico",
      use: "Tos y flema",
      stock: "300",
      price: "S/ 18.00",
    },
    {
      id: 5,
      name: "Aspirina Prevent",
      category: "Cardiovascular",
      use: "Prevención cardiovascular",
      stock: "300",
      price: "S/ 15.00",
    },
    {
      id: 6,
      name: "Corbis 5",
      category: "Antihipertensivo",
      use: "Presión arterial",
      stock: "300",
      price: "S/ 35.00",
    },
    {
      id: 7,
      name: "Actron",
      category: "Antiinflamatorio",
      use: "Dolor general",
      stock: "300",
      price: "S/ 12.00",
    },
    {
      id: 8,
      name: "Tafirof",
      category: "Analgésico",
      use: "Fiebre y dolor",
      stock: "300",
      price: "S/ 10.00",
    },
    {
      id: 9,
      name: "Ambroxol jarabe",
      category: "Respiratorio",
      use: "Tos productiva",
      stock: "300",
      price: "S/ 9.00",
    },
    {
      id: 10,
      name: "Loratadina 10 mg",
      category: "Antialérgico",
      use: "Alergias",
      stock: "300",
      price: "S/ 6.00",
    },
    {
      id: 11,
      name: "Omeprazol 20 mg",
      category: "Gastrointestinal",
      use: "Acidez gástrica",
      stock: "300",
      price: "S/ 7.50",
    },
    {
      id: 12,
      name: "Sales de rehidratación oral",
      category: "Hidratación",
      use: "Deshidratación",
      stock: "300",
      price: "S/ 3.00",
    },
    {
      id: 13,
      name: "Vitamina C",
      category: "Suplemento",
      use: "Defensas",
      stock: "300",
      price: "S/ 4.50",
    },
    {
      id: 14,
      name: "Metformina 850 mg",
      category: "Antidiabético",
      use: "Diabetes tipo 2",
      stock: "300",
      price: "S/ 18.00",
    },
    {
      id: 15,
      name: "Amoxicilina 500 mg",
      category: "Antibiótico",
      use: "Infecciones bacterianas",
      stock: "300",
      price: "S/ 14.00",
    },
  ];

  const [rows, setRows] = useState<ProductRow[]>(() => {
    if (typeof window === "undefined") return DEFAULT_ROWS;
    try {
      const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (!raw) return DEFAULT_ROWS;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_ROWS;

      const safe = parsed
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .map((x, idx) => ({
          id: typeof x.id === "number" ? x.id : idx + 1,
          name: String(x.name ?? ""),
          category: String(x.category ?? ""),
          use: String(x.use ?? ""),
          stock: String(x.stock ?? "0"),
          price: String(x.price ?? "S/ 0.00"),
        }))
        .filter((x) => x.name.trim().length > 0);

      return safe.length > 0 ? safe : DEFAULT_ROWS;
    } catch {
      return DEFAULT_ROWS;
    }
  });

  const [nextId, setNextId] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_ROWS.length + 1;
    try {
      const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (!raw) return DEFAULT_ROWS.length + 1;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_ROWS.length + 1;
      const maxId = parsed.reduce((acc: number, x: unknown) => {
        if (!x || typeof x !== "object") return acc;
        const maybeId = (x as Record<string, unknown>).id;
        return typeof maybeId === "number" ? Math.max(acc, maybeId) : acc;
      }, 0);
      return maxId + 1;
    } catch {
      return DEFAULT_ROWS.length + 1;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PRODUCTS_STORAGE_KEY,
        JSON.stringify(rows),
      );
    } catch {
      // ignore
    }
  }, [rows]);
  const [editingId, setEditingId] = useState<number | null>(null);

  function handleChange(
    id: number,
    field: "name" | "category" | "use" | "stock" | "price",
    value: string,
  ) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        if (field === "price") {
          const clean = value.replace(/^S\/\s*/i, "").replace(/[^\d.,]/g, "");
          const formatted = clean ? `S/ ${clean}` : "S/ 0.00";
          return { ...row, price: formatted };
        }

        if (field === "stock") {
          const onlyDigits = value.replace(/[^\d]/g, "");
          return { ...row, stock: onlyDigits };
        }

        return { ...row, [field]: value };
      }),
    );
  }

  function handleDelete(id: number) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function handleAddRow() {
    setRows((prev) => [
      ...prev,
      {
        id: nextId,
        name: "Nuevo producto",
        category: "",
        use: "",
        stock: "0",
        price: "S/ 0.00",
      },
    ]);
    setNextId((x) => x + 1);
  }

  return (
    <main className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold">Lista de precios de productos</h1>
        <p className="text-sm text-slate-600">
          Medicamentos y productos para venta en Harmonia Center.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddRow}
            className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-600"
          >
            Agregar producto
          </button>
        </div>
        <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Medicamento
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Categoría
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Uso principal
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                  Stock
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                  Precio (S/)
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-1.5 text-[13px]">
                    {editingId === row.id ? (
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-1 text-[13px]"
                        value={row.name}
                        onChange={(e) =>
                          handleChange(row.id, "name", e.target.value)
                        }
                      />
                    ) : (
                      <span>{row.name}</span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-[13px]">
                    {editingId === row.id ? (
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-1 text-[13px]"
                        value={row.category}
                        onChange={(e) =>
                          handleChange(row.id, "category", e.target.value)
                        }
                      />
                    ) : (
                      <span>{row.category}</span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-[13px]">
                    {editingId === row.id ? (
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-1 text-[13px]"
                        value={row.use}
                        onChange={(e) =>
                          handleChange(row.id, "use", e.target.value)
                        }
                      />
                    ) : (
                      <span>{row.use}</span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right text-[13px]">
                    {editingId === row.id ? (
                      <input
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-[13px]"
                        value={row.stock}
                        onChange={(e) =>
                          handleChange(row.id, "stock", e.target.value)
                        }
                      />
                    ) : (
                      <span>{row.stock}</span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right text-[13px] font-medium">
                    {editingId === row.id ? (
                      <input
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-[13px]"
                        value={row.price}
                        onChange={(e) =>
                          handleChange(row.id, "price", e.target.value)
                        }
                      />
                    ) : (
                      <span>{row.price}</span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right">
                    {editingId === row.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="mr-2 rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                        >
                          Borrar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(row.id)}
                          className="mr-2 rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                        >
                          Borrar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


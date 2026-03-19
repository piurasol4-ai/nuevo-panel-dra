 "use client";

import { useEffect, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";

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
  type ImportMode = "replace" | "merge";
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
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("replace");

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

  function formatPrice(value: unknown) {
    const text = String(value ?? "").trim();
    if (!text) return "S/ 0.00";
    const clean = text.replace(/^S\/\s*/i, "").replace(/[^\d.,]/g, "");
    return clean ? `S/ ${clean}` : "S/ 0.00";
  }

  function normalizeStock(value: unknown) {
    return String(value ?? "0").replace(/[^\d]/g, "");
  }

  function normalizeHeader(value: unknown) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildRowFromExcel(
    row: Record<string, unknown>,
    id: number,
  ): ProductRow | null {
    const normalizedEntries = Object.entries(row).map(([k, v]) => [
      normalizeHeader(k),
      v,
    ]);
    const get = (...keys: string[]) => {
      for (const key of keys) {
        const found = normalizedEntries.find(([k]) => k === key);
        if (found) return found[1];
      }
      return "";
    };

    const name = String(
      get("medicamento", "producto", "nombre", "name"),
    ).trim();
    if (!name) return null;

    return {
      id,
      name,
      category: String(
        get("categoria", "categoría", "category"),
      ).trim(),
      use: String(
        get("uso principal", "uso", "use"),
      ).trim(),
      stock: normalizeStock(get("stock")),
      price: formatPrice(
        get("precio (s/)", "precio", "precio s/", "price"),
      ),
    };
  }

  function handleDownloadExcelTemplate() {
    const templateRows = rows.length
      ? rows.map((r) => ({
          Medicamento: r.name,
          Categoria: r.category,
          "Uso principal": r.use,
          Stock: r.stock,
          "Precio (S/)": r.price.replace(/^S\/\s*/i, ""),
        }))
      : [
          {
            Medicamento: "Ejemplo producto",
            Categoria: "Categoria",
            "Uso principal": "Uso principal",
            Stock: "100",
            "Precio (S/)": "10.00",
          },
        ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla-productos-harmonia.xlsx");
    setExcelMessage("Plantilla Excel descargada.");
  }

  function handleImportExcelClick(mode: ImportMode) {
    setImportMode(mode);
    const input = document.getElementById(
      "excel-import-productos",
    ) as HTMLInputElement | null;
    input?.click();
  }

  async function handleImportExcelFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        setExcelMessage("El archivo Excel no contiene hojas.");
        return;
      }
      const ws = wb.Sheets[sheetName];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
      });
      const importedRows = parsed
        .map((row, idx) => buildRowFromExcel(row, idx + 1))
        .filter((x): x is ProductRow => Boolean(x));

      if (!importedRows.length) {
        setExcelMessage(
          "No se encontraron productos válidos. Revisa columnas como Medicamento y Precio.",
        );
        return;
      }

      if (importMode === "replace") {
        setRows(importedRows);
        setNextId(importedRows.length + 1);
        setExcelMessage(
          `Se importaron ${importedRows.length} productos desde Excel (reemplazo total).`,
        );
        return;
      }

      const key = (v: string) => v.trim().toLowerCase();
      const existingByName = new Map(rows.map((r) => [key(r.name), r] as const));
      const mergedRows = [...rows];
      let updatedCount = 0;
      let insertedCount = 0;
      let maxId = rows.reduce((acc, r) => Math.max(acc, r.id), 0);

      for (const incoming of importedRows) {
        const k = key(incoming.name);
        const existing = existingByName.get(k);
        if (existing) {
          const idx = mergedRows.findIndex((r) => r.id === existing.id);
          if (idx >= 0) {
            mergedRows[idx] = {
              ...mergedRows[idx],
              category: incoming.category,
              use: incoming.use,
              stock: incoming.stock,
              price: incoming.price,
            };
            updatedCount += 1;
          }
          continue;
        }

        maxId += 1;
        const toInsert: ProductRow = {
          ...incoming,
          id: maxId,
        };
        mergedRows.push(toInsert);
        existingByName.set(k, toInsert);
        insertedCount += 1;
      }

      setRows(mergedRows);
      setNextId(maxId + 1);
      setEditingId(null);
      setExcelMessage(
        `Importación combinada: ${updatedCount} actualizados, ${insertedCount} nuevos.`,
      );
    } catch {
      setExcelMessage("No se pudo importar el archivo Excel.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">Lista de precios de productos</h1>
        <p className="text-sm text-slate-600">
          Medicamentos y productos para venta en Harmonia Center.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
          <input
            id="excel-import-productos"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcelFile}
          />
          <button
            type="button"
            onClick={handleDownloadExcelTemplate}
            className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
          >
            Descargar plantilla Excel
          </button>
          <button
            type="button"
            onClick={() => handleImportExcelClick("replace")}
            className="rounded border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
          >
            Subir Excel (reemplazar)
          </button>
          <button
            type="button"
            onClick={() => handleImportExcelClick("merge")}
            className="rounded border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
          >
            Subir Excel y combinar
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-600"
          >
            Agregar producto
          </button>
        </div>
        {excelMessage && (
          <p className="text-xs text-slate-600">{excelMessage}</p>
        )}
        <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
          <table className="min-w-[980px] border-collapse text-sm">
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
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
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(row.id)}
                          className="rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
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
                      </div>
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


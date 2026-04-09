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

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    use: "",
    stock: "0",
    price: "S/ 0.00",
  });

  useEffect(() => {
    Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products");
        const json = (await res.json()) as unknown;
        const list = Array.isArray(json) ? (json as ProductRow[]) : DEFAULT_ROWS;
        setRows(list);
      } catch {
        setRows(DEFAULT_ROWS);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function refreshRows() {
    const res = await fetch("/api/products");
    const json = (await res.json()) as unknown;
    const list = Array.isArray(json) ? (json as ProductRow[]) : DEFAULT_ROWS;
    setRows(list);
  }

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
    fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(json?.error ?? "Error borrando");
        }
        setRows((prev) => prev.filter((row) => row.id !== id));
      })
      .catch(() => alert("No se pudo borrar el producto."));
  }

  function setNewProductField(
    field: "name" | "category" | "use" | "stock" | "price",
    value: string,
  ) {
    setNewProduct((prev) => {
      if (field === "price") {
        const clean = value.replace(/^S\/\s*/i, "").replace(/[^\d.,]/g, "");
        const formatted = clean ? `S/ ${clean}` : "S/ 0.00";
        return { ...prev, price: formatted };
      }
      if (field === "stock") {
        return { ...prev, stock: value.replace(/[^\d]/g, "") };
      }
      return { ...prev, [field]: value };
    });
  }

  async function handleCreateProduct() {
    const name = newProduct.name.trim();
    if (!name) {
      alert("Escribe el nombre del medicamento o producto.");
      return;
    }
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: newProduct.category.trim(),
          use: newProduct.use.trim(),
          stock: newProduct.stock,
          price: newProduct.price,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | ProductRow
        | { error?: string }
        | null;
      if (!res.ok) {
        const msg =
          payload && "error" in payload && payload.error
            ? String(payload.error)
            : "No se pudo agregar el producto.";
        alert(msg);
        await refreshRows().catch(() => null);
        return;
      }
      const created = payload as ProductRow;
      setRows((prev) => [...prev, created]);
      setEditingId(created.id);
      setAddFormOpen(false);
      setNewProduct({
        name: "",
        category: "",
        use: "",
        stock: "0",
        price: "S/ 0.00",
      });
    } catch {
      alert("No se pudo agregar el producto.");
      await refreshRows().catch(() => null);
    }
  }

  async function handleSave(row: ProductRow) {
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          name: row.name,
          category: row.category,
          use: row.use,
          stock: row.stock,
          price: row.price,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | ProductRow
        | { error?: string }
        | null;
      if (!res.ok) {
        const msg =
          payload && "error" in payload && payload.error
            ? String(payload.error)
            : "No se pudo guardar el producto.";
        alert(msg);
        return;
      }
      const updated = payload as ProductRow;
      setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditingId(null);
    } catch {
      alert("No se pudo guardar el producto.");
    }
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
      const payloadProducts = importedRows.map((r) => ({
        name: r.name,
        category: r.category,
        use: r.use,
        stock: r.stock,
        price: r.price,
      }));

      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: importMode, products: payloadProducts }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(json?.error ?? "No se pudo importar el Excel.");
      }

      const json = (await res.json()) as unknown;
      const list = Array.isArray(json) ? (json as ProductRow[]) : [];

      if (list.length) setRows(list);
      else await refreshRows().catch(() => null);

      setEditingId(null);
      setExcelMessage(
        `Se importaron ${importedRows.length} productos desde Excel (${importMode === "replace" ? "reemplazo total" : "combinación"}).`,
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
            onClick={() => {
              setAddFormOpen((open) => !open);
              setExcelMessage(null);
            }}
            className={
              "rounded px-3 py-1.5 text-xs font-semibold " +
              (addFormOpen
                ? "bg-amber-600 text-black ring-2 ring-amber-300"
                : "bg-amber-500 text-black hover:bg-amber-600")
            }
          >
            {addFormOpen ? "Ocultar formulario" : "Agregar producto"}
          </button>
        </div>
        {addFormOpen && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
            <p className="mb-3 text-xs font-semibold text-slate-800">
              Nuevo producto
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                <span className="font-medium text-slate-700">
                  Medicamento / nombre <span className="text-red-600">*</span>
                </span>
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Ej: Paracetamol 500 mg"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProductField("name", e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-slate-700">Categoría</span>
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Ej: Analgésico"
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProductField("category", e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                <span className="font-medium text-slate-700">
                  Uso principal
                </span>
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Ej: Dolor y fiebre"
                  value={newProduct.use}
                  onChange={(e) => setNewProductField("use", e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-slate-700">Stock</span>
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={newProduct.stock}
                  onChange={(e) =>
                    setNewProductField("stock", e.target.value)
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-slate-700">Precio (S/)</span>
                <input
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={newProduct.price}
                  onChange={(e) =>
                    setNewProductField("price", e.target.value)
                  }
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleCreateProduct()}
                className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-600"
              >
                Crear producto
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddFormOpen(false);
                  setNewProduct({
                    name: "",
                    category: "",
                    use: "",
                    stock: "0",
                    price: "S/ 0.00",
                  });
                }}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                    Cargando productos...
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
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
                          onClick={() => void handleSave(row)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}


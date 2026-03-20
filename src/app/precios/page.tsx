 "use client";

import { useEffect, useState } from "react";

type Row = { id: number; name: string; price: string };

const DEFAULT_ROWS: Row[] = [
  { id: 1, name: "AUTOHEMOC MAYOR", price: "S/ 150.00" },
  { id: 2, name: "HIDROCOLON POR SESION", price: "S/ 200.00" },
  { id: 3, name: "SUERO OZONIZADO", price: "S/ 100.00" },
  { id: 4, name: "AUTOHEMOC MENOR", price: "S/ 80.00" },
  { id: 5, name: "TERAPIA NEURAL", price: "S/ 100.00" },
  { id: 6, name: "ACUPUNTURA", price: "S/ 70.00" },
  { id: 7, name: "CONSULTA MEDICA", price: "S/ 150.00" },
  { id: 8, name: "OZONO RECTAL", price: "S/ 50.00" },
  { id: 9, name: "OZONO VAGINAL", price: "S/ 80.00" },
  { id: 10, name: "OZONO URETRAL", price: "S/ 80.00" },
  { id: 11, name: "AUTO HEMOTERAPIA MAYOR", price: "S/ 200.00" },
  { id: 12, name: "AUTO HEMOTERAPIA MENOR", price: "S/ 80.00" },
  { id: 13, name: "OZONO PARAVERTEBRAL", price: "S/ 100.00" },
  { id: 14, name: "OZONO INTRAARTICULAR 1 APLICACION", price: "S/ 100.00" },
  { id: 15, name: "OZONO INTRAARTICULAR 2 APLICACIONES", price: "S/ 120.00" },
  { id: 16, name: "OZONO INTRAARTICULAR 3 APLICACIONES", price: "S/ 150.00" },
  { id: 17, name: "OZONO INTRAMUSCULAR", price: "S/ 80.00" },
  {
    id: 18,
    name: "PLASMA RICO EN PLAQUETAS (1 ARTICULACIÓN) 4 TUBOS",
    price: "S/ 250.00",
  },
  {
    id: 19,
    name: "PLASMA RICO EN PLAQUETAS (1 ARTICULACIÓN) 3 TUBOS",
    price: "S/ 200.00",
  },
  {
    id: 20,
    name: "PLASMA RICO EN PLAQUETAS (2 ARTICULACIONES) 4 TUBOS",
    price: "S/ 300.00",
  },
  {
    id: 21,
    name: "PLASMA RICO EN PLAQUETAS (2 ARTICULACIONES) 3 TUBOS",
    price: "S/ 250.00",
  },
  { id: 22, name: "DISCOLISIS", price: "S/ 8,000.00" },
  { id: 23, name: "HIDROTERAPIA DE COLON", price: "S/ 300.00" },
];

export default function PreciosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.resolve().then(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/procedures");
        const json = (await res.json()) as unknown;
        const list = Array.isArray(json) ? (json as Row[]) : DEFAULT_ROWS;
        setRows(list);
      } catch {
        setRows(DEFAULT_ROWS);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  function handleChange(id: number, field: "name" | "price", value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === "name") {
          return { ...row, name: value };
        }
        // Normalizamos precio para que siempre tenga el prefijo S/
        const clean = value.replace(/^S\/\s*/i, "").replace(/[^\d.,]/g, "");
        const formatted = clean ? `S/ ${clean}` : "S/ 0.00";
        return { ...row, price: formatted };
      }),
    );
  }

  function handleDelete(id: number) {
    fetch(`/api/procedures?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(json?.error ?? "Error borrando procedimiento");
        }
        setRows((prev) => prev.filter((row) => row.id !== id));
      })
      .catch(() => alert("No se pudo borrar el procedimiento."));
  }

  async function handleSave(row: Row) {
    try {
      const res = await fetch("/api/procedures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, name: row.name, price: row.price }),
      });
      if (!res.ok) throw new Error("Error guardando procedimiento");
      const updated = (await res.json()) as Row;
      setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditingId(null);
    } catch {
      alert("No se pudo guardar el procedimiento.");
    }
  }

  async function handleAddRow() {
    try {
      const res = await fetch("/api/procedures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nuevo procedimiento", price: "S/ 0.00" }),
      });
      if (!res.ok) throw new Error("Error agregando procedimiento");
      const created = (await res.json()) as Row;
      setRows((prev) => [...prev, created]);
      setEditingId(created.id);
    } catch {
      alert("No se pudo agregar el procedimiento.");
    }
  }

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">Precios Harmonia Center</h1>
        <p className="text-sm text-slate-600">
          Tabla de referencia de precios de procedimientos médicos.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleAddRow()}
            className="rounded bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-600"
          >
            Agregar fila
          </button>
        </div>
        <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
          <table className="min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Procedimiento
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                  Precio de venta
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-sm text-slate-500">
                    Cargando precios...
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
                        onChange={(e) => handleChange(row.id, "name", e.target.value)}
                      />
                    ) : (
                      <span>{row.name}</span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right text-[13px] font-medium">
                    {editingId === row.id ? (
                      <input
                        className="w-32 rounded border border-slate-300 px-2 py-1 text-right text-[13px]"
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


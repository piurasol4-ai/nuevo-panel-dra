"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import PatientNamesDialog, {
  type PatientNameEntry,
} from "@/components/patient-names-dialog";
import type { TreatmentStatsResponse } from "@/lib/treatment-stats";

const BAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-pink-500",
];

type DialogState = {
  title: string;
  patients: PatientNameEntry[];
} | null;

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthISO: string): string {
  const [y, m] = monthISO.split("-").map(Number);
  if (!y || !m) return monthISO;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}

export default function ReporteTratamientosPage() {
  const [month, setMonth] = useState(currentMonthValue);
  const [appliedMonth, setAppliedMonth] = useState(currentMonthValue);
  const [stats, setStats] = useState<TreatmentStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const loadStats = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/treatment-stats?month=${encodeURIComponent(monthValue)}`,
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "No se pudo cargar el reporte.");
      }
      const data = (await res.json()) as TreatmentStatsResponse;
      setStats(data);
      setAppliedMonth(monthValue);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de carga.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats(currentMonthValue());
  }, [loadStats]);

  const maxCount =
    stats?.breakdown.reduce((m, r) => Math.max(m, r.count), 0) ?? 0;

  const periodTitle = useMemo(
    () => monthLabel(appliedMonth),
    [appliedMonth],
  );

  function toDialogPatients(
    patients: TreatmentStatsResponse["breakdown"][number]["patients"],
  ): PatientNameEntry[] {
    return patients.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      documentType: p.documentType,
      dni: p.dni,
      rowKey: p.appointmentId,
      dateLabel: `Sesión: ${new Date(`${p.dateISO}T12:00:00`).toLocaleDateString(
        "es-PE",
        { dateStyle: "medium" },
      )} · ${p.status}`,
    }));
  }

  function openTreatment(
    treatment: string,
    patients: TreatmentStatsResponse["breakdown"][number]["patients"],
  ) {
    setDialog({
      title: `${treatment} · ${periodTitle}`,
      patients: toDialogPatients(patients),
    });
  }

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          Reporte mensual de tratamientos
        </h1>
        <p className="text-sm text-slate-600">
          Sesiones de tratamiento contadas desde la{" "}
          <Link href="/agenda" className="font-semibold text-amber-700 underline">
            Agenda
          </Link>
          . Si una cita tiene varios procedimientos (ej. hidrocolon + ozono), cada
          uno suma en el reporte. Haz clic en una cantidad para ver pacientes y
          fechas.
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Mes
          <input
            type="month"
            className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => void loadStats(month)}
          disabled={loading || !month}
          className="rounded border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Ver reporte"}
        </button>
        <button
          type="button"
          onClick={() => {
            const now = currentMonthValue();
            setMonth(now);
            void loadStats(now);
          }}
          disabled={loading}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Mes actual
        </button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !stats ? (
        <p className="text-sm text-slate-500">Cargando reporte…</p>
      ) : stats ? (
        <>
          <p className="text-xs text-slate-500">
            Período:{" "}
            <span className="font-medium capitalize text-slate-800">
              {periodTitle}
            </span>{" "}
            ({stats.dateFrom} – {stats.dateTo})
          </p>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sesiones del mes
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats.totalSessions}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
                Tipos de tratamiento
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">
                {stats.distinctTreatments}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Más frecuente
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {stats.breakdown[0]?.treatment ?? "—"}
              </p>
              {stats.breakdown[0] && (
                <p className="mt-0.5 text-xs text-slate-600">
                  {stats.breakdown[0].count} sesión
                  {stats.breakdown[0].count === 1 ? "" : "es"}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Tratamientos del mes
            </h2>
            {stats.breakdown.length === 0 ? (
              <p className="text-sm text-slate-500">
                No hay citas registradas en este mes.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.breakdown.map((row, idx) => (
                  <div key={row.treatment} className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => openTreatment(row.treatment, row.patients)}
                        className="text-left font-medium text-amber-900 underline decoration-amber-300 underline-offset-2 hover:text-amber-950"
                      >
                        {row.treatment}
                      </button>
                      <button
                        type="button"
                        onClick={() => openTreatment(row.treatment, row.patients)}
                        className="text-xs text-slate-600"
                      >
                        <span className="font-semibold text-amber-800 underline">
                          {row.count}
                        </span>{" "}
                        sesión{row.count === 1 ? "" : "es"} · {row.percent}%
                      </button>
                    </div>
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => openTreatment(row.treatment, row.patients)}
                    >
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            BAR_COLORS[idx % BAR_COLORS.length]
                          }`}
                          style={{
                            width: `${
                              maxCount > 0 ? (row.count / maxCount) * 100 : 0
                            }%`,
                          }}
                        />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Tratamiento</th>
                    <th className="py-2 pr-4 font-semibold">Sesiones</th>
                    <th className="py-2 font-semibold">% del mes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.breakdown.map((row) => (
                    <tr
                      key={`tbl-${row.treatment}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium text-slate-800">
                        {row.treatment}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          type="button"
                          onClick={() =>
                            openTreatment(row.treatment, row.patients)
                          }
                          className="font-semibold text-amber-800 underline"
                        >
                          {row.count}
                        </button>
                      </td>
                      <td className="py-2 text-slate-700">{row.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <PatientNamesDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        patients={dialog?.patients ?? []}
        onClose={() => setDialog(null)}
      />
    </main>
  );
}

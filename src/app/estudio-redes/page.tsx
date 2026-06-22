"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import DateRangeFilter from "@/components/date-range-filter";
import PatientNamesDialog, {
  type PatientNameEntry,
} from "@/components/patient-names-dialog";
import { buildDateRangeQuery } from "@/lib/date-range";
import {
  REFERRAL_SOURCE_UNSPECIFIED,
  type ReferralStatsResponse,
} from "@/lib/referral-sources";

const BAR_COLORS = [
  "bg-blue-500",
  "bg-pink-500",
  "bg-red-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-slate-600",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-rose-400",
];

type DialogState = {
  title: string;
  patients: PatientNameEntry[];
} | null;

function CountButton({
  count,
  disabled,
  onClick,
  className = "",
}: {
  count: number;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  if (count <= 0 || disabled) {
    return (
      <span className={`font-semibold text-slate-900 ${className}`}>{count}</span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-semibold text-amber-800 underline decoration-amber-400 underline-offset-2 hover:text-amber-900 ${className}`}
      title="Ver nombres de pacientes"
    >
      {count}
    </button>
  );
}

export default function EstudioRedesPage() {
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);

  const loadStats = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/referral-stats${buildDateRangeQuery(from, to)}`);
      if (!res.ok) throw new Error("No se pudieron cargar las estadísticas.");
      const data = (await res.json()) as ReferralStatsResponse;
      setStats(data);
      setAppliedFrom(from);
      setAppliedTo(to);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de carga.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats("", "");
  }, [loadStats]);

  const maxCount = stats?.breakdown.reduce((m, r) => Math.max(m, r.count), 0) ?? 0;

  const allPatients = useMemo(
    () => stats?.breakdown.flatMap((r) => r.patients) ?? [],
    [stats],
  );

  const withSourcePatients = useMemo(
    () =>
      stats?.breakdown
        .filter((r) => r.source !== REFERRAL_SOURCE_UNSPECIFIED)
        .flatMap((r) => r.patients) ?? [],
    [stats],
  );

  const withoutSourcePatients = useMemo(
    () =>
      stats?.breakdown.find((r) => r.source === REFERRAL_SOURCE_UNSPECIFIED)
        ?.patients ?? [],
    [stats],
  );

  const periodLabel = useMemo(() => {
    if (!appliedFrom && !appliedTo) return "Todo el tiempo";
    if (appliedFrom && appliedTo && appliedFrom === appliedTo) {
      return new Date(`${appliedFrom}T12:00:00`).toLocaleDateString("es-PE", {
        dateStyle: "medium",
      });
    }
    const from = appliedFrom
      ? new Date(`${appliedFrom}T12:00:00`).toLocaleDateString("es-PE", {
          dateStyle: "medium",
        })
      : "inicio";
    const to = appliedTo
      ? new Date(`${appliedTo}T12:00:00`).toLocaleDateString("es-PE", {
          dateStyle: "medium",
        })
      : "hoy";
    return `${from} – ${to}`;
  }, [appliedFrom, appliedTo]);

  function openDialog(title: string, patients: PatientNameEntry[]) {
    setDialog({ title, patients });
  }

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Estudio de redes</h1>
        <p className="text-sm text-slate-600">
          Origen de pacientes según el campo{" "}
          <span className="font-medium">¿Cómo nos conoció?</span> al registrarlos
          en{" "}
          <Link href="/patients" className="font-semibold text-amber-700 underline">
            Pacientes
          </Link>
          . Filtra por fecha de registro y haz clic en cualquier cantidad para ver
          los nombres.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filtro por fecha de registro
        </p>
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApply={() => void loadStats(dateFrom, dateTo)}
          onClear={() => {
            setDateFrom("");
            setDateTo("");
            void loadStats("", "");
          }}
          loading={loading}
        />
        {stats && (
          <p className="mt-2 text-xs text-slate-500">
            Período mostrado: <span className="font-medium">{periodLabel}</span>
          </p>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !stats ? (
        <p className="text-sm text-slate-500">Cargando estadísticas…</p>
      ) : stats ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div
              role={stats.totalPatients > 0 ? "button" : undefined}
              tabIndex={stats.totalPatients > 0 ? 0 : undefined}
              onClick={() =>
                stats.totalPatients > 0 &&
                openDialog(`Todos los pacientes (${periodLabel})`, allPatients)
              }
              onKeyDown={(e) => {
                if (
                  stats.totalPatients > 0 &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  openDialog(`Todos los pacientes (${periodLabel})`, allPatients);
                }
              }}
              className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
                stats.totalPatients > 0
                  ? "cursor-pointer transition hover:border-amber-300 hover:bg-amber-50/30"
                  : ""
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total pacientes
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats.totalPatients}
              </p>
              {stats.totalPatients > 0 && (
                <p className="mt-1 text-xs text-amber-700">Clic para ver nombres</p>
              )}
            </div>
            <div
              role={stats.withSource > 0 ? "button" : undefined}
              tabIndex={stats.withSource > 0 ? 0 : undefined}
              onClick={() =>
                stats.withSource > 0 &&
                openDialog(`Con origen registrado (${periodLabel})`, withSourcePatients)
              }
              onKeyDown={(e) => {
                if (
                  stats.withSource > 0 &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  openDialog(
                    `Con origen registrado (${periodLabel})`,
                    withSourcePatients,
                  );
                }
              }}
              className={`rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm ${
                stats.withSource > 0
                  ? "cursor-pointer transition hover:border-emerald-300"
                  : ""
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
                Con origen registrado
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">
                {stats.withSource}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                {stats.totalPatients > 0
                  ? `${Math.round((stats.withSource / stats.totalPatients) * 1000) / 10}% del total`
                  : "—"}
                {stats.withSource > 0 ? " · Clic para ver nombres" : ""}
              </p>
            </div>
            <div
              role={stats.withoutSource > 0 ? "button" : undefined}
              tabIndex={stats.withoutSource > 0 ? 0 : undefined}
              onClick={() =>
                stats.withoutSource > 0 &&
                openDialog(`Sin especificar (${periodLabel})`, withoutSourcePatients)
              }
              onKeyDown={(e) => {
                if (
                  stats.withoutSource > 0 &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  openDialog(
                    `Sin especificar (${periodLabel})`,
                    withoutSourcePatients,
                  );
                }
              }}
              className={`rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm ${
                stats.withoutSource > 0
                  ? "cursor-pointer transition hover:border-slate-300"
                  : ""
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sin especificar
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-800">
                {stats.withoutSource}
              </p>
              {stats.withoutSource > 0 && (
                <p className="mt-1 text-xs text-slate-600">Clic para ver nombres</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Pacientes por canal / red
            </h2>
            {stats.breakdown.length === 0 || stats.totalPatients === 0 ? (
              <p className="text-sm text-slate-500">
                No hay pacientes en el período seleccionado.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.breakdown.map((row, idx) => (
                  <div key={row.source} className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          row.count > 0 &&
                          openDialog(`${row.source} (${periodLabel})`, row.patients)
                        }
                        disabled={row.count === 0}
                        className={`text-left font-medium ${
                          row.count > 0
                            ? "text-amber-900 underline decoration-amber-300 underline-offset-2 hover:text-amber-950"
                            : "text-slate-800"
                        }`}
                      >
                        {row.source}
                      </button>
                      <span className="text-xs text-slate-600">
                        <CountButton
                          count={row.count}
                          onClick={() =>
                            openDialog(`${row.source} (${periodLabel})`, row.patients)
                          }
                        />{" "}
                        paciente{row.count === 1 ? "" : "s"} · {row.percent}%
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={row.count === 0}
                      onClick={() =>
                        openDialog(`${row.source} (${periodLabel})`, row.patients)
                      }
                      className="block w-full disabled:cursor-default"
                    >
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            BAR_COLORS[idx % BAR_COLORS.length]
                          } ${row.count > 0 ? "hover:opacity-80" : ""}`}
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
                    <th className="py-2 pr-4 font-semibold">Origen</th>
                    <th className="py-2 pr-4 font-semibold">Pacientes</th>
                    <th className="py-2 font-semibold">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.breakdown.map((row) => (
                    <tr
                      key={`tbl-${row.source}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium text-slate-800">
                        {row.source}
                      </td>
                      <td className="py-2 pr-4 text-slate-700">
                        <CountButton
                          count={row.count}
                          onClick={() =>
                            openDialog(`${row.source} (${periodLabel})`, row.patients)
                          }
                        />
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

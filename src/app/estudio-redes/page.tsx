"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { ReferralStatsResponse } from "@/lib/referral-sources";

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

export default function EstudioRedesPage() {
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/referral-stats");
      if (!res.ok) throw new Error("No se pudieron cargar las estadísticas.");
      const data = (await res.json()) as ReferralStatsResponse;
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de carga.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const maxCount = stats?.breakdown.reduce((m, r) => Math.max(m, r.count), 0) ?? 0;

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
          .
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void loadStats()}
          disabled={loading}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !stats ? (
        <p className="text-sm text-slate-500">Cargando estadísticas…</p>
      ) : stats ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total pacientes
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats.totalPatients}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
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
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Sin especificar
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-800">
                {stats.withoutSource}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Pacientes por canal / red
            </h2>
            {stats.breakdown.length === 0 || stats.totalPatients === 0 ? (
              <p className="text-sm text-slate-500">
                Aún no hay pacientes registrados.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.breakdown.map((row, idx) => (
                  <div key={row.source} className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800">
                        {row.source}
                      </span>
                      <span className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">
                          {row.count}
                        </span>{" "}
                        paciente{row.count === 1 ? "" : "s"} · {row.percent}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          BAR_COLORS[idx % BAR_COLORS.length]
                        }`}
                        style={{
                          width: `${
                            maxCount > 0 ? (row.count / maxCount) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
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
                      <td className="py-2 pr-4 text-slate-700">{row.count}</td>
                      <td className="py-2 text-slate-700">{row.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}

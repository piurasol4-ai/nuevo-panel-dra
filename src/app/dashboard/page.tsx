import { prisma } from "@/lib/prisma";
import Link from "next/link";
import RevenueSummary from "./revenue-summary";

// Evita que Next prerenderice esta página durante `next build`,
// porque aquí consultamos la BD con Prisma.
export const dynamic = "force-dynamic";

function getLimaMonthDay(d: Date): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const monthStr = parts.find((p) => p.type === "month")?.value;
  const dayStr = parts.find((p) => p.type === "day")?.value;

  return {
    month: monthStr ? Number(monthStr) : 0,
    day: dayStr ? Number(dayStr) : 0,
  };
}

export default async function DashboardPage() {
  const now = new Date();
  const { month, day } = getLimaMonthDay(now);

  const patients = await prisma.patient.findMany({
    orderBy: { fullName: "asc" },
  });
  const todaysBirthdays = patients.filter((p) => {
    const bd = new Date(p.birthDate);
    const lima = getLimaMonthDay(bd);
    return lima.month === month && lima.day === day;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-xl border border-amber-400 bg-black">
            <img
              src="/logo-harmonia.png"
              alt="Logo Harmonia Center"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-amber-500">
              HARMONIA CENTER
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Dashboard del día
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Resumen de pacientes, citas, alertas e ingresos para entender el estado
              del consultorio en pocos segundos.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500">Sesión no iniciada.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Pacientes del día</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">18</p>
          <p className="mt-1 text-xs text-amber-600">5 en seguimiento</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Próximas citas</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">7</p>
          <p className="mt-1 text-xs text-emerald-600">3 en la próxima hora</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Alertas activas</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">4</p>
          <p className="mt-1 text-xs text-rose-600">
            2 requieren atención inmediata
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ingresos del día</p>
          <RevenueSummary />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <header className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Pacientes del día
              </h2>
              <p className="text-xs text-slate-500">
                Consulta rápida de pacientes priorizados y próximas atenciones.
              </p>
            </div>
            <button className="rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white shadow hover:bg-amber-600">
              Ver agenda completa
            </button>
          </header>

          <div className="space-y-3">
            <article className="rounded-lg border border-slate-100 bg-amber-50/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Maria Perez
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    DNI 45812376 · 47 años, 11 meses y 4 días · 3001234567
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Nacimiento: 12/04/1978 · Estado:{" "}
                    <span className="font-medium text-rose-600">crítico</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Contacto de emergencia: Luis Perez · 30009876543
                  </p>
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                  Prioritario
                </span>
              </div>
            </article>

            <article className="rounded-lg border border-slate-100 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Juan Gómez
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Control post operatorio · Consulta a las 15:30
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Estable
                </span>
              </div>
            </article>
          </div>
        </div>

        <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Alertas importantes
          </h2>
          <p className="text-xs text-slate-500">
            Seguimiento rápido de eventos clínicos y administrativos.
          </p>

          <div className="space-y-3">
            <div
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
              aria-live="polite"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Cumpleaños de hoy
              </p>
              {todaysBirthdays.length === 0 ? (
                <p className="mt-1 text-xs text-slate-700">
                  No hay cumpleaños registrados para hoy.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-slate-700">
                    Hoy cumplen{" "}
                    <span className="font-semibold">
                      {todaysBirthdays.length}
                    </span>{" "}
                    paciente(s).
                    <span className="block text-[11px] text-slate-600">
                      {todaysBirthdays
                        .slice(0, 3)
                        .map((p) => p.fullName)
                        .join(", ")}
                      {todaysBirthdays.length > 3 ? "…" : ""}
                    </span>
                  </p>
                  <Link
                    href="/cumpleanos"
                    className="mt-2 inline-flex items-center rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                  >
                    Enviar felicitación
                  </Link>
                </>
              )}
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Paciente crítico pendiente
              </p>
              <p className="mt-1 text-xs text-slate-700">
                Maria Perez necesita revisión de resultados de laboratorio.
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Autorización pendiente
              </p>
              <p className="mt-1 text-xs text-slate-700">
                Falta aprobación de aseguradora para 2 procedimientos de hoy.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}


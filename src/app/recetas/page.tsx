"use client";

import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import type { Appointment, Patient } from "@prisma/client";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";

import "react-datepicker/dist/react-datepicker.css";

import { formatPatientDocument } from "@/lib/patient-document";

registerLocale("es", es);

type Recipe = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  recipeNumber: number;
  createdAt: string;
  diagnosis: string | null;
  workPlan: string | null;
  prescriptionText: string | null;
  patient?: Patient;
  appointment?: Appointment;
};

function toLocalISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcularEdadDetallada(fechaISO: string | Date) {
  const fecha =
    typeof fechaISO === "string" ? new Date(fechaISO) : (fechaISO as Date);
  if (Number.isNaN(fecha.getTime())) return "";
  const hoy = new Date();
  let años = hoy.getFullYear() - fecha.getFullYear();
  let meses = hoy.getMonth() - fecha.getMonth();
  let dias = hoy.getDate() - fecha.getDate();
  if (dias < 0) {
    meses -= 1;
    const previoMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    dias += previoMes.getDate();
  }
  if (meses < 0) {
    meses += 12;
    años -= 1;
  }
  if (años < 0) return "";
  return `${años} años, ${meses} meses y ${dias} días`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildRecipePrintHtml(params: {
  recipe: Recipe;
  patient: Patient;
  appt: Appointment | null;
  logoUrl: string;
  fechaCreacion: string;
  fechaImpresion: string;
  edadTexto: string;
}) {
  const { recipe, patient, appt, logoUrl, fechaCreacion, fechaImpresion, edadTexto } =
    params;

  const nombre = escapeHtml(patient.fullName);
  const dni = escapeHtml(formatPatientDocument(patient));
  const telefono = escapeHtml(patient.phone);
  const direccion = escapeHtml(patient.address ?? "");
  const emergenciaNombre = escapeHtml(patient.emergencyContactName ?? "");
  const emergenciaTelefono = escapeHtml(patient.emergencyContactPhone ?? "");
  const motivoInicial = escapeHtml(patient.notes ?? "");
  const alergias = escapeHtml(patient.allergyNotes ?? "");

  const diagnostico = escapeHtml(recipe.diagnosis ?? "");
  const plan = escapeHtml(recipe.workPlan ?? "");
  const receta = escapeHtml(recipe.prescriptionText ?? "");
  const procedimiento = escapeHtml(appt?.type ?? "");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Receta</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
      .clinic-info { display: flex; align-items: center; gap: 10px; }
      .clinic-name { font-weight: 700; font-size: 18px; }
      .clinic-subtitle { font-size: 12px; color: #fbbf24; margin-top: 2px; }
      .meta { font-size: 12px; color: #4b5563; }
      .label { font-weight: 600; }
      .section-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin-top: 8px; }
      .block { font-size: 13px; white-space: pre-wrap; }
      .logo { height: 52px; }
      .footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; gap: 18px; }
      .line { height: 1px; background: #9ca3af; margin-top: 34px; }
      .sign-label { margin-top: 6px; font-size: 12px; color: #4b5563; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 18px; margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="clinic-info">
        <img src="${logoUrl}" alt="Logo Harmonia Center" class="logo" />
        <div>
          <div class="clinic-name">Harmonia Center</div>
          <div class="clinic-subtitle">Medicina Alternativa Complementaria</div>
          <div class="meta">Receta N.º ${recipe.recipeNumber}</div>
        </div>
      </div>
      <div class="meta">
        <div><span class="label">Fecha y hora de creación:</span> ${fechaCreacion}</div>
        <div><span class="label">Fecha y hora de impresión:</span> ${fechaImpresion}</div>
      </div>
    </div>

    <h1>Datos del paciente</h1>
    <div class="section-box">
      <div><span class="label">Nombre:</span> ${nombre}</div>
      <div><span class="label">Documento:</span> ${dni}</div>
      <div><span class="label">Teléfono:</span> ${telefono}</div>
      <div><span class="label">Edad:</span> ${escapeHtml(edadTexto)}</div>
      ${direccion ? `<div><span class="label">Dirección:</span> ${direccion}</div>` : ""}
      ${
        emergenciaNombre || emergenciaTelefono
          ? `<div><span class="label">Contacto de emergencia:</span> ${emergenciaNombre}${
              emergenciaTelefono ? ` · ${emergenciaTelefono}` : ""
            }</div>`
          : ""
      }
      ${motivoInicial ? `<div><span class="label">Motivo Inicial de Consulta:</span> ${motivoInicial}</div>` : ""}
      ${alergias ? `<div><span class="label">Alergias (inscripción):</span> ${alergias}</div>` : ""}
      ${procedimiento ? `<div><span class="label">Procedimiento:</span> ${procedimiento}</div>` : ""}
    </div>

    <h2>Diagnóstico</h2>
    <div class="section-box block">${diagnostico}</div>

    <h2>Plan de trabajo</h2>
    <div class="section-box block">${plan}</div>

    <h2>Receta</h2>
    <div class="section-box block">${receta}</div>

    <div class="footer">
      <div class="sign">
        <div class="line"></div>
        <div class="sign-label">Dra. Leidy Rosales Jiménez</div>
      </div>
      <div class="sign">
        <div class="line"></div>
        <div class="sign-label">Firma del paciente</div>
      </div>
    </div>
  </body>
</html>`;
}

export default function RecetasPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const selectedDateISO = useMemo(
    () => toLocalISODate(selectedDate),
    [selectedDate],
  );
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeSearchPatient, setActiveSearchPatient] = useState<Patient | null>(
    null,
  );
  const [patientCandidates, setPatientCandidates] = useState<Patient[]>([]);
  const [showPatientCandidates, setShowPatientCandidates] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);

  async function ensurePatientsLoaded() {
    if (patients.length > 0) return;
    const r = await fetch("/api/patients");
    const data = (await r.json().catch(() => null)) as Patient[] | null;
    setPatients(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    if (activeSearchPatient) return;

    Promise.resolve().then(() => {
      setLoading(true);
      setError(null);
    });

    fetch(`/api/recipes?date=${selectedDateISO}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          setError(data?.error || "No se pudieron cargar las recetas.");
          return;
        }
        setRecipes(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error(e);
        setError("No se pudieron cargar las recetas.");
      })
      .finally(() => setLoading(false));
  }, [selectedDateISO, activeSearchPatient]);

  async function loadRecipesForPatient(patientId: string) {
    setLoading(true);
    setError(null);

    try {
      const r = await fetch(`/api/recipes?patientId=${encodeURIComponent(patientId)}`);
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setError(data?.error || "No se pudieron cargar las recetas.");
        setRecipes([]);
        return;
      }
      setRecipes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las recetas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchRecipes() {
    const term = searchTerm.trim();
    const termAtTrigger = term;
    setSearchError(null);
    setShowPatientCandidates(false);
    setActiveSearchPatient(null);
    setRecipes([]);

    if (!term) {
      setSearchError(
        "Escribe documento (p. ej. DNI 8 dígitos) o el nombre del paciente.",
      );
      return;
    }

    setSearchLoading(true);
    try {
      await ensurePatientsLoaded();
      if (termAtTrigger !== searchTerm.trim()) return;

      const lower = term.toLowerCase();
      const digits = term.replace(/\D/g, "");

      let candidates: Patient[] = [];
      if (digits.length === 8) {
        candidates = patients.filter((p) => p.dni === digits);
      } else {
        candidates = patients.filter(
          (p) =>
            p.fullName.toLowerCase().includes(lower) ||
            (digits ? p.dni.includes(digits) : false) ||
            formatPatientDocument(p).toLowerCase().includes(lower),
        );
      }

      if (candidates.length === 0) {
        if (termAtTrigger !== searchTerm.trim()) return;
        setSearchError(
          "No se encontró un paciente con ese documento o nombre.",
        );
        setActiveSearchPatient(null);
        return;
      }

      if (candidates.length === 1) {
        if (termAtTrigger !== searchTerm.trim()) return;
        const chosen = candidates[0];
        setActiveSearchPatient(chosen);
        await loadRecipesForPatient(chosen.id);
        return;
      }

      if (termAtTrigger !== searchTerm.trim()) return;
      setPatientCandidates(candidates.slice(0, 10));
      setShowPatientCandidates(true);
    } catch (e) {
      console.error(e);
      setSearchError("No se pudo realizar la búsqueda.");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleClearSearch() {
    setActiveSearchPatient(null);
    setSearchTerm("");
    setSearchError(null);
    setPatientCandidates([]);
    setShowPatientCandidates(false);
    setError(null);
    setRecipes([]);
  }

  // Búsqueda automática mientras el usuario escribe.
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }

      // Volvemos al modo por fecha al limpiar la búsqueda.
      setSearchError(null);
      setSearchLoading(false);
      setActiveSearchPatient(null);
      setPatientCandidates([]);
      setShowPatientCandidates(false);
      setError(null);
      setRecipes([]);
      return;
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(() => {
      void handleSearchRecipes();
    }, 350);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  function handlePrintRecipe(r: Recipe) {
    if (!r.patient) return;
    const patient = r.patient;
    const appt = r.appointment ?? null;

    const win = window.open("", "_blank");
    if (!win) return;

    try {
      win.opener = null;
    } catch {
      // ignore
    }

    const fechaCreacion = new Date(r.createdAt).toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const fechaImpresion = new Date().toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const edadTexto = calcularEdadDetallada(patient.birthDate);
    const logoUrl = new URL("/logo-harmonia.png", window.location.origin).href;

    const html = buildRecipePrintHtml({
      recipe: r,
      patient,
      appt,
      logoUrl,
      fechaCreacion,
      fechaImpresion,
      edadTexto,
    });

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  }

  function handleSendRecipeWhatsapp(r: Recipe) {
    if (typeof window === "undefined") return;
    if (!r.patient) return;

    const patient = r.patient;
    const receta = r.prescriptionText ?? "";

    if (!receta.trim()) {
      alert("La receta está vacía.");
      return;
    }

    const phoneDigits = String(patient.phone ?? "").replace(/\D/g, "");
    if (!phoneDigits) {
      alert("El paciente no tiene un número de WhatsApp/telefono.");
      return;
    }

    const waNumber = phoneDigits.startsWith("51")
      ? phoneDigits
      : `51${phoneDigits}`;

    const texto = `Receta: ${receta}`;
    const fullMessage = `Hamonia CenterH., Buen día: Sr(a) ${patient.fullName} le hacemos saber que: ${texto}`;

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(fullMessage)}`;
    window.open(url, "_blank");
  }

  async function handleDeleteRecipe(r: Recipe) {
    const ok = window.confirm(
      `¿Deseas eliminar la receta N.º ${r.recipeNumber}?`,
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/recipes?id=${encodeURIComponent(r.id)}`, {
        method: "DELETE",
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "")
            : "";
        alert(msg || "No se pudo eliminar la receta.");
        return;
      }

      setRecipes((prev) => prev.filter((x) => x.id !== r.id));
    } catch {
      alert("No se pudo eliminar la receta.");
    }
  }

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Recetas</h1>
            <p className="text-sm text-slate-600">
              {activeSearchPatient
                ? `Recetas de ${activeSearchPatient.fullName} (cualquier fecha)`
                : `Recetas registradas para ${selectedDateISO}.`}
            </p>
          </div>

          <div className="space-y-2 sm:space-y-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">Fecha</p>
              <DatePicker
                selected={selectedDate}
                onChange={(d: Date | null) => {
                  if (!d) return;
                  if (activeSearchPatient) {
                    setSearchError("Para usar la fecha, primero limpia la búsqueda.");
                    return;
                  }
                  setSelectedDate(d);
                }}
                dateFormat="dd/MM/yyyy"
                locale="es"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                  Escribe documento (p. ej. DNI 8 dígitos) o nombre del
                  paciente.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black"
                  placeholder="Ej: 12345678 o Juan"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  type="button"
                  disabled={searchLoading}
                  onClick={() => handleSearchRecipes()}
                  className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-600 disabled:opacity-60"
                >
                  {searchLoading ? "..." : "Buscar"}
                </button>
              </div>

              {searchError && (
                <p className="text-xs text-red-600">{searchError}</p>
              )}

              {(activeSearchPatient || showPatientCandidates) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {showPatientCandidates && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Se encontraron múltiples pacientes. Selecciona uno:
            </p>
            <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
              {patientCandidates.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={async () => {
                    setActiveSearchPatient(p);
                    setShowPatientCandidates(false);
                    setSearchError(null);
                    await loadRecipesForPatient(p.id);
                  }}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:bg-slate-100"
                >
                  <div className="font-semibold text-slate-900">{p.fullName}</div>
                  <div className="text-[11px] text-slate-600">
                    {formatPatientDocument(p)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Cargando recetas…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : recipes.length === 0 ? (
          <p className="text-sm text-slate-500">
            {activeSearchPatient
              ? "Aún no hay recetas registradas para este paciente."
              : `Aún no hay recetas registradas para ${selectedDateISO}.`}
          </p>
        ) : (
          <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
            <table className="min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                    N.º Receta
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                    Documento
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                    Procedimiento
                  </th>
                  <th className="border-b border-slate-200 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                    Hora
                  </th>
                </tr>
              </thead>
              <tbody>
                {recipes.slice(0, 15).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-900">
                      {r.recipeNumber}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                      {r.patient?.fullName ?? "—"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                      {r.patient
                        ? formatPatientDocument(r.patient)
                        : "—"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                      {r.appointment?.type ?? "—"}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">
                      {activeSearchPatient
                        ? new Date(r.createdAt).toLocaleString("es-PE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : new Date(r.createdAt).toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintRecipe(r)}
                          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Imprimir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendRecipeWhatsapp(r)}
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecipe(r)}
                          className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}


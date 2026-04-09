"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type RegistroRow = {
  visitId: string;
  patientId: string;
  patientName: string;
  patientDocument: string;
  historyNumber: number;
  visitDate: string | null;
  createdAt: string;
  appointmentId: string | null;
  procedureName: string | null;
  summary: string;
  visit: Record<string, unknown>;
};

type TabId = "atencion" | "procedimiento" | "receta" | "examenes" | "descanso";

type RecipeLite = {
  id: string;
  diagnosis: string | null;
  workPlan: string | null;
  prescriptionText: string | null;
  appointmentId: string | null;
};

function visitToDraft(v: Record<string, unknown>): Record<string, string | null> {
  const keys = [
    "identificationExtra",
    "personalHistory",
    "familyHistory",
    "consultationReason",
    "currentIllness",
    "physicalExam",
    "diagnostics",
    "diagnosis",
    "treatmentPlan",
    "evolutionNotes",
    "nursingNotes",
    "treatmentNotes",
    "weight",
    "height",
    "bodyTemperature",
    "bloodPressure",
    "oxygenSaturation",
    "heartRate",
    "respiratoryRate",
    "glucose",
    "procedureName",
    "procedureNote",
    "auxiliaryExams",
    "medicalRest",
  ] as const;
  const out: Record<string, string | null> = {};
  for (const k of keys) {
    const val = v[k];
    out[k] = val == null ? null : String(val);
  }
  return out;
}

function RegistroAtencionesPageInner() {
  const searchParams = useSearchParams();
  const highlightVisitId = searchParams.get("visitId");
  const highlightPatientId = searchParams.get("patientId");

  const [rows, setRows] = useState<RegistroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("atencion");
  const [draft, setDraft] = useState<Record<string, string | null>>({});
  const [visitPatientId, setVisitPatientId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [recipe, setRecipe] = useState<RecipeLite | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/registro-atenciones");
      if (!res.ok) throw new Error("No se pudo cargar el registro.");
      const data = (await res.json()) as RegistroRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de carga.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!rows.length) return;
    const stillThere =
      selectedId && rows.some((r) => r.visitId === selectedId);
    if (stillThere) return;

    const fromQuery =
      highlightVisitId && highlightPatientId
        ? rows.find(
            (r) =>
              r.visitId === highlightVisitId &&
              r.patientId === highlightPatientId,
          )
        : undefined;
    const pick = fromQuery ?? rows[0];
    setSelectedId(pick.visitId);
    setDraft(visitToDraft(pick.visit));
    setVisitPatientId(pick.patientId);
  }, [rows, highlightVisitId, highlightPatientId, selectedId]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.visitId === selectedId) ?? null,
    [rows, selectedId],
  );

  useEffect(() => {
    if (!selectedRow?.appointmentId) {
      setRecipe(null);
      return;
    }
    setRecipeLoading(true);
    fetch(
      `/api/recipes?appointmentId=${encodeURIComponent(selectedRow.appointmentId)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const first = list[0] as RecipeLite | undefined;
        setRecipe(first ?? null);
      })
      .catch(() => setRecipe(null))
      .finally(() => setRecipeLoading(false));
  }, [selectedRow?.appointmentId, selectedId]);

  const filteredRows = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const d = filterDate.trim();
    return rows.filter((r) => {
      if (d && (r.visitDate ?? r.createdAt.slice(0, 10)) !== d) return false;
      if (!q) return true;
      return (
        r.patientName.toLowerCase().includes(q) ||
        r.patientDocument.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q)
      );
    });
  }, [rows, filterText, filterDate]);

  function selectRow(r: RegistroRow) {
    setSelectedId(r.visitId);
    setDraft(visitToDraft(r.visit));
    setVisitPatientId(r.patientId);
    setTab("atencion");
    setSaveMsg(null);
  }

  function setField(key: string, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value || null }));
  }

  async function saveVisit() {
    if (!selectedId || !visitPatientId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/clinical-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          patientId: visitPatientId,
          identificationExtra: draft.identificationExtra,
          personalHistory: draft.personalHistory,
          familyHistory: draft.familyHistory,
          consultationReason: draft.consultationReason,
          currentIllness: draft.currentIllness,
          physicalExam: draft.physicalExam,
          diagnostics: draft.diagnostics,
          diagnosis: draft.diagnosis,
          treatmentPlan: draft.treatmentPlan,
          evolutionNotes: draft.evolutionNotes,
          nursingNotes: draft.nursingNotes,
          treatmentNotes: draft.treatmentNotes,
          weight: draft.weight,
          height: draft.height,
          bodyTemperature: draft.bodyTemperature,
          bloodPressure: draft.bloodPressure,
          oxygenSaturation: draft.oxygenSaturation,
          heartRate: draft.heartRate,
          respiratoryRate: draft.respiratoryRate,
          glucose: draft.glucose,
          procedureName: draft.procedureName,
          procedureNote: draft.procedureNote,
          auxiliaryExams: draft.auxiliaryExams,
          medicalRest: draft.medicalRest,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveMsg(
          typeof (payload as { error?: string })?.error === "string"
            ? (payload as { error: string }).error
            : "No se pudo guardar.",
        );
        return;
      }
      setSaveMsg("Cambios guardados.");
      await loadList();
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipe() {
    if (!selectedRow || !visitPatientId || !recipe) {
      setSaveMsg("No hay receta para guardar o falta cita vinculada.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recipe.id,
          diagnosis: recipe.diagnosis,
          workPlan: recipe.workPlan,
          prescriptionText: recipe.prescriptionText,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        setSaveMsg(j?.error ?? "No se pudo guardar la receta.");
        return;
      }
      setSaveMsg("Receta guardada.");
    } finally {
      setSaving(false);
    }
  }

  async function createRecipeForVisit() {
    if (!selectedRow || !visitPatientId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: visitPatientId,
          appointmentId: selectedRow.appointmentId,
          diagnosis: draft.diagnosis ?? "",
          workPlan: draft.treatmentPlan ?? null,
          prescriptionText: "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveMsg(
          typeof (data as { error?: string })?.error === "string"
            ? (data as { error: string }).error
            : "No se pudo crear la receta.",
        );
        return;
      }
      setRecipe(data as RecipeLite);
      setSaveMsg("Receta creada. Completa el texto y guarda.");
    } finally {
      setSaving(false);
    }
  }

  const fmtWhen = (r: RegistroRow) => {
    try {
      const d = new Date(r.createdAt);
      return d.toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Lima",
      });
    } catch {
      return r.createdAt;
    }
  };

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          Registro de Atenciones
        </h1>
        <p className="text-sm text-slate-600">
          Fichas de consulta por paciente y fecha. Se alimenta desde la{" "}
          <Link href="/agenda" className="font-semibold text-amber-700 underline">
            Agenda
          </Link>{" "}
          (botón Atención) y complementa las{" "}
          <Link href="/historias" className="font-semibold text-amber-700 underline">
            Historias clínicas
          </Link>
          .
        </p>
      </header>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Buscar
          <input
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nombre o documento"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-slate-600">
          Fecha de atención
          <input
            type="date"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => void loadList()}
          className="self-end rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Actualizar lista
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="lg:col-span-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">
            Atenciones ({filteredRows.length})
          </h2>
          <div className="max-h-[520px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
            {loading ? (
              <p className="p-4 text-sm text-slate-500">Cargando…</p>
            ) : filteredRows.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">
                No hay fichas. Usa Agenda → Atención en una cita para crear una.
              </p>
            ) : (
              filteredRows.map((r) => (
                <button
                  key={`${r.patientId}-${r.visitId}`}
                  type="button"
                  onClick={() => selectRow(r)}
                  className={
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition " +
                    (selectedId === r.visitId
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200 hover:bg-slate-50")
                  }
                >
                  <p className="font-semibold text-slate-900">{r.patientName}</p>
                  <p className="text-xs text-slate-500">{r.patientDocument}</p>
                  <p className="text-xs text-slate-600">{fmtWhen(r)}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-700">
                    {r.summary}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="lg:col-span-7">
          {!selectedRow ? (
            <p className="text-sm text-slate-500">
              Selecciona una atención en la lista.
            </p>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 border-b border-slate-100 pb-3">
                <p className="text-lg font-bold text-slate-900">
                  {selectedRow.patientName}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedRow.patientDocument} · HC N.º {selectedRow.historyNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {fmtWhen(selectedRow)} · Fecha atención:{" "}
                  {selectedRow.visitDate ?? "—"}
                </p>
                <Link
                  href={`/historias?patientId=${encodeURIComponent(selectedRow.patientId)}`}
                  className="mt-2 inline-block text-xs font-semibold text-indigo-700 underline"
                >
                  Abrir historia clínica del paciente
                </Link>
              </div>

              <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-100 pb-2">
                {(
                  [
                    ["atencion", "Atención"],
                    ["procedimiento", "Procedimiento"],
                    ["receta", "Receta"],
                    ["examenes", "Exámenes auxiliares"],
                    ["descanso", "Descanso médico"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={
                      "rounded-full px-3 py-1 text-xs font-semibold " +
                      (tab === id
                        ? "bg-amber-500 text-black"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "atencion" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Motivo, examen, diagnóstico y signos. Se guarda en la misma ficha
                    que en Historias clínicas.
                  </p>
                  {(
                    [
                      ["consultationReason", "Motivo de consulta"],
                      ["currentIllness", "Enfermedad actual"],
                      ["physicalExam", "Examen físico"],
                      ["diagnosis", "Diagnóstico"],
                      ["evolutionNotes", "Evolución / observaciones"],
                      ["nursingNotes", "Notas de enfermería"],
                      ["treatmentNotes", "Notas de tratamiento"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-xs">
                      <span className="font-medium text-slate-700">{label}</span>
                      <textarea
                        className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={draft[key] ?? ""}
                        onChange={(e) => setField(key, e.target.value)}
                      />
                    </label>
                  ))}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["weight", "Peso"],
                        ["height", "Talla"],
                        ["bodyTemperature", "Temperatura"],
                        ["bloodPressure", "Presión arterial"],
                        ["oxygenSaturation", "Saturación"],
                        ["heartRate", "Frec. cardíaca"],
                        ["respiratoryRate", "Frec. respiratoria"],
                        ["glucose", "Glucosa"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="text-xs">
                        <span className="font-medium text-slate-700">{label}</span>
                        <input
                          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                          value={draft[key] ?? ""}
                          onChange={(e) => setField(key, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tab === "procedimiento" && (
                <div className="space-y-3">
                  <label className="block text-xs">
                    <span className="font-medium text-slate-700">
                      Procedimiento (cita)
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
                      value={draft.procedureName ?? ""}
                      onChange={(e) => setField("procedureName", e.target.value)}
                      placeholder="Ej: acupuntura, consulta…"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium text-slate-700">
                      Detalle del procedimiento
                    </span>
                    <textarea
                      className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={draft.procedureNote ?? ""}
                      onChange={(e) => setField("procedureNote", e.target.value)}
                      placeholder="Qué se realizó en la sesión…"
                    />
                  </label>
                </div>
              )}

              {tab === "receta" && (
                <div className="space-y-3">
                  {recipeLoading ? (
                    <p className="text-sm text-slate-500">Cargando receta…</p>
                  ) : !selectedRow.appointmentId ? (
                    <p className="text-sm text-slate-600">
                      Esta ficha no tiene cita vinculada. Asocia una cita desde la
                      agenda o registra la receta desde la sección Recetas.
                    </p>
                  ) : !recipe ? (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600">
                        Aún no hay receta para esta cita.
                      </p>
                      <button
                        type="button"
                        onClick={() => void createRecipeForVisit()}
                        disabled={saving}
                        className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        Crear receta vinculada a la cita
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block text-xs">
                        <span className="font-medium text-slate-700">Diagnóstico</span>
                        <textarea
                          className="mt-1 min-h-[64px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={recipe.diagnosis ?? ""}
                          onChange={(e) =>
                            setRecipe({ ...recipe, diagnosis: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium text-slate-700">
                          Plan de trabajo
                        </span>
                        <textarea
                          className="mt-1 min-h-[64px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={recipe.workPlan ?? ""}
                          onChange={(e) =>
                            setRecipe({ ...recipe, workPlan: e.target.value })
                          }
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium text-slate-700">Receta</span>
                        <textarea
                          className="mt-1 min-h-[140px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          value={recipe.prescriptionText ?? ""}
                          onChange={(e) =>
                            setRecipe({
                              ...recipe,
                              prescriptionText: e.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveRecipe()}
                        disabled={saving}
                        className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Guardar receta
                      </button>
                    </>
                  )}
                </div>
              )}

              {tab === "examenes" && (
                <label className="block text-xs">
                  <span className="font-medium text-slate-700">
                    Exámenes auxiliares solicitados / resultados
                  </span>
                  <textarea
                    className="mt-1 min-h-[180px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={draft.auxiliaryExams ?? ""}
                    onChange={(e) => setField("auxiliaryExams", e.target.value)}
                    placeholder="Laboratorio, imagen, etc."
                  />
                </label>
              )}

              {tab === "descanso" && (
                <label className="block text-xs">
                  <span className="font-medium text-slate-700">
                    Descanso médico / justificación
                  </span>
                  <textarea
                    className="mt-1 min-h-[180px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={draft.medicalRest ?? ""}
                    onChange={(e) => setField("medicalRest", e.target.value)}
                    placeholder="Días, restricciones…"
                  />
                </label>
              )}

              {tab !== "receta" && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => void saveVisit()}
                    disabled={saving}
                    className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-600 disabled:opacity-50"
                  >
                    {saving ? "Guardando…" : "Guardar ficha"}
                  </button>
                  {saveMsg && (
                    <span className="text-xs text-slate-600">{saveMsg}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function RegistroAtencionesPage() {
  return (
    <Suspense
      fallback={
        <main className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-slate-500">Cargando registro de atenciones…</p>
        </main>
      }
    >
      <RegistroAtencionesPageInner />
    </Suspense>
  );
}

"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";
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
  /** Viene del GET /api/recipes (include patient) para WhatsApp */
  patient?: { fullName: string; phone: string | null };
};

function recipeFromApiRow(raw: unknown): RecipeLite | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  let patient: RecipeLite["patient"];
  const pRaw = o.patient;
  if (pRaw && typeof pRaw === "object") {
    const p = pRaw as Record<string, unknown>;
    patient = {
      fullName: typeof p.fullName === "string" ? p.fullName : "",
      phone: p.phone == null || p.phone === "" ? null : String(p.phone),
    };
  }
  return {
    id: o.id,
    diagnosis: o.diagnosis == null ? null : String(o.diagnosis),
    workPlan: o.workPlan == null ? null : String(o.workPlan),
    prescriptionText:
      o.prescriptionText == null ? null : String(o.prescriptionText),
    appointmentId:
      o.appointmentId == null ? null : String(o.appointmentId),
    patient,
  };
}

function visitToDraft(v: Record<string, unknown>): Record<string, string | null> {
  const keys = [
    "identificationExtra",
    "personalHistory",
    "familyHistory",
    "consultationReason",
    "diagnostics",
    "treatmentPlan",
    "nursingNotes",
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

type ClinicalAttachment = {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  uploadedAt: string;
};

function isClinicalAttachment(x: unknown): x is ClinicalAttachment {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.driveFileId === "string" &&
    typeof o.name === "string" &&
    typeof o.mimeType === "string" &&
    (o.webViewLink === null || typeof o.webViewLink === "string") &&
    typeof o.uploadedAt === "string"
  );
}

function attachmentsFromVisit(v: Record<string, unknown>): ClinicalAttachment[] {
  const raw = v.attachments;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isClinicalAttachment);
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

  const [attachments, setAttachments] = useState<ClinicalAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const pendingDriveIdsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (!selectedId) {
      setAttachments([]);
      pendingDriveIdsRef.current.clear();
      return;
    }
    const row = rows.find((r) => r.visitId === selectedId);
    if (!row) return;
    setAttachments(attachmentsFromVisit(row.visit));
    pendingDriveIdsRef.current.clear();
  }, [selectedId, rows]);

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
        const first = list[0];
        setRecipe(first ? recipeFromApiRow(first) : null);
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

  async function handleCopyAttachmentLink(link: string | null) {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setSaveMsg("Enlace copiado al portapapeles.");
    } catch {
      setSaveMsg("No se pudo copiar el enlace.");
    }
  }

  async function handleRemoveAttachment(att: ClinicalAttachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    if (pendingDriveIdsRef.current.has(att.driveFileId)) {
      pendingDriveIdsRef.current.delete(att.driveFileId);
      try {
        await fetch(
          `/api/clinical-notes/attachments?driveFileId=${encodeURIComponent(
            att.driveFileId,
          )}`,
          { method: "DELETE" },
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function handleAuxiliaryExamFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !visitPatientId || !selectedId) return;

    setUploadingAttachment(true);
    setSaveMsg(null);
    setUploadMsg("Subiendo archivo...");
    try {
      const fd = new FormData();
      fd.set("patientId", visitPatientId);
      fd.set("visitId", selectedId);
      fd.set("file", file);
      const res = await fetch("/api/clinical-notes/attachments/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadMsg(
          (data as { error?: string })?.error ?? "No se pudo subir el archivo.",
        );
        return;
      }
      const att = (data as { attachment?: ClinicalAttachment }).attachment;
      if (!att) {
        setUploadMsg("Respuesta inválida al subir el archivo.");
        return;
      }
      pendingDriveIdsRef.current.add(att.driveFileId);
      setAttachments((prev) => [...prev, att]);
      setUploadMsg(`Archivo subido: ${att.name}`);
    } catch (err) {
      console.error(err);
      setUploadMsg("No se pudo subir el archivo.");
    } finally {
      setUploadingAttachment(false);
    }
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
          diagnostics: draft.diagnostics,
          treatmentPlan: draft.treatmentPlan,
          nursingNotes: draft.nursingNotes,
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
          attachments,
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
      const saved = payload as { attachments?: ClinicalAttachment[] };
      if (Array.isArray(saved.attachments)) {
        setAttachments(saved.attachments);
        pendingDriveIdsRef.current.clear();
      }
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
    if (!recipe.id?.trim()) {
      setSaveMsg("La receta no tiene identificador. Vuelve a crearla o recarga la página.");
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
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const j = payload as { error?: string } | null;
        setSaveMsg(j?.error ?? "No se pudo guardar la receta.");
        return;
      }
      setSaveMsg("Receta guardada.");
      const parsed = payload ? recipeFromApiRow(payload) : null;
      if (parsed) {
        setRecipe((prev) =>
          prev
            ? {
                ...prev,
                ...parsed,
                patient: parsed.patient ?? prev.patient,
              }
            : parsed,
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function sendRecipeWhatsapp() {
    if (typeof window === "undefined") return;
    if (!recipe || !selectedRow) return;

    const receta = (recipe.prescriptionText ?? "").trim();
    if (!receta) {
      alert("La receta está vacía.");
      return;
    }

    const fullName =
      recipe.patient?.fullName?.trim() || selectedRow.patientName;
    const phoneDigits = String(recipe.patient?.phone ?? "").replace(/\D/g, "");
    if (!phoneDigits) {
      alert(
        "El paciente no tiene un número de WhatsApp/teléfono registrado. Actualízalo en la ficha del paciente.",
      );
      return;
    }

    const waNumber = phoneDigits.startsWith("51")
      ? phoneDigits
      : `51${phoneDigits}`;

    const texto = `Receta: ${receta}`;
    const fullMessage = `Hamonia CenterH., Buen día: Sr(a) ${fullName} le hacemos saber que: ${texto}`;

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(fullMessage)}`;
    window.open(url, "_blank");
  }

  async function createRecipeForVisit() {
    if (!selectedRow || !visitPatientId || !selectedRow.appointmentId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: visitPatientId,
          appointmentId: selectedRow.appointmentId,
          diagnosis: "",
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
      const refRes = await fetch(
        `/api/recipes?appointmentId=${encodeURIComponent(selectedRow.appointmentId)}`,
      );
      const list = await refRes.json().catch(() => []);
      const first = Array.isArray(list) ? list[0] : null;
      const next =
        (first ? recipeFromApiRow(first) : null) ?? recipeFromApiRow(data);
      if (next) setRecipe(next);
      else if (data && typeof data === "object" && "id" in data) {
        setRecipe(data as RecipeLite);
      }
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
                    Motivo de consulta y signos vitales. Se guarda en la misma ficha
                    que en Historias clínicas.
                  </p>
                  {(
                    [
                      ["consultationReason", "Motivo de consulta"],
                      ["nursingNotes", "Notas de enfermería"],
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
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void saveRecipe()}
                          disabled={saving}
                          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Guardar receta
                        </button>
                        <button
                          type="button"
                          onClick={() => sendRecipeWhatsapp()}
                          disabled={saving}
                          className="rounded bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#20bd5a] disabled:opacity-50"
                        >
                          Enviar por WhatsApp
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {tab === "examenes" && (
                <div className="space-y-4">
                  <label className="block text-xs">
                    <span className="font-medium text-slate-700">
                      Exámenes auxiliares solicitados / resultados
                    </span>
                    <textarea
                      className="mt-1 min-h-[140px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={draft.auxiliaryExams ?? ""}
                      onChange={(e) =>
                        setField("auxiliaryExams", e.target.value)
                      }
                      placeholder="Laboratorio, imagen, etc."
                    />
                  </label>

                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-semibold text-slate-700">
                      Documento del paciente (PDF o foto)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Máx. 15 MB. Se sube a Cloudinary; en la ficha solo se
                      guarda el enlace. Pulsa &quot;Guardar ficha&quot; para
                      persistir la lista de archivos.
                    </p>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
                      disabled={
                        uploadingAttachment || saving || !selectedId || !visitPatientId
                      }
                      onChange={(e) => {
                        void handleAuxiliaryExamFileChange(e);
                      }}
                      className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-amber-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold"
                    />
                    {uploadingAttachment && (
                      <p className="text-[11px] text-slate-500">
                        Subiendo archivo…
                      </p>
                    )}
                    {uploadMsg && (
                      <p className="text-[11px] text-slate-600">{uploadMsg}</p>
                    )}
                    {attachments.length === 0 && !uploadingAttachment && (
                      <p className="text-[11px] text-slate-400">
                        Aún no hay archivos adjuntos.
                      </p>
                    )}
                    {attachments.length > 0 && (
                      <ul className="space-y-1">
                        {attachments.map((a) => (
                          <li
                            key={a.id}
                            className="flex flex-wrap items-start justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1 text-[11px]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800">{a.name}</p>
                              {a.webViewLink && (
                                <a
                                  href={a.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block max-w-[320px] truncate text-[10px] text-slate-500 underline"
                                  title={a.webViewLink}
                                >
                                  {a.webViewLink}
                                </a>
                              )}
                            </div>
                            <span className="flex items-center gap-2">
                              {a.webViewLink ? (
                                <a
                                  href={a.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-amber-700 underline"
                                >
                                  Abrir archivo
                                </a>
                              ) : (
                                <span className="text-slate-400">
                                  (sin enlace)
                                </span>
                              )}
                              <button
                                type="button"
                                disabled={!a.webViewLink}
                                onClick={() => {
                                  void handleCopyAttachmentLink(a.webViewLink);
                                }}
                                className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Copiar link
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void handleRemoveAttachment(a);
                                }}
                                className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                              >
                                Quitar
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
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
                </div>
              )}

              {saveMsg && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-600">{saveMsg}</p>
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

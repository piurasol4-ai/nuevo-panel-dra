 "use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Patient } from "@prisma/client";
import { useSearchParams } from "next/navigation";

import {
  clinicalAttachmentSizeErrorMessage,
  isClinicalAttachmentOverLimit,
} from "@/lib/clinical-attachment-limits";
import { notifyVisitUpdated } from "@/lib/clinical-visit-sync";
import DateRangeFilter from "@/components/date-range-filter";
import ClinicalRoleToggle from "@/components/clinical-role-toggle";
import {
  DOCTORA_FIELD_KEYS,
  ENFERMERIA_FIELD_KEYS,
  fieldsForRole,
  loadClinicalEditorRole,
  saveClinicalEditorRole,
  type ClinicalEditorRole,
} from "@/lib/clinical-roles";
import { formatPatientDocument } from "@/lib/patient-document";

type ClinicalAttachment = {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  uploadedAt: string;
};

type ClinicalNote = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  createdAt: string;
  // Fecha de atención/ficha definida por la doctora (no es necesariamente createdAt)
  visitDate: string | null;
  historyNumber: number;
  identificationExtra: string | null;
  personalHistory: string | null;
  familyHistory: string | null;
  consultationReason: string | null;
  currentIllness: string | null;
  physicalExam: string | null;
  diagnostics: string | null;
  diagnosis: string | null;
  treatmentPlan: string | null;
  evolutionNotes: string | null;
  // --- Campos extra por ficha/atención ---
  nursingNotes: string | null;
  treatmentNotes: string | null;
  weight: string | null;
  height: string | null;
  bodyTemperature: string | null;
  bloodPressure: string | null;
  oxygenSaturation: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  glucose: string | null;
  attachments?: ClinicalAttachment[];
};

/** Campos de enfermería (autosave / sync). */
type EnfermeriaAutosaveFields = {
  consultationReason: string;
  nursingNotes: string;
  weight: string;
  height: string;
  bodyTemperature: string;
  bloodPressure: string;
  oxygenSaturation: string;
  heartRate: string;
  respiratoryRate: string;
  glucose: string;
};

type DoctoraAutosaveFields = {
  currentIllness: string;
  physicalExam: string;
  diagnostics: string;
  diagnosis: string;
  evolutionNotes: string;
  treatmentNotes: string;
};

/** Guardado frecuente: si esperan demasiado y cambian de pantalla, se pierde lo escrito. */
const AUTOSAVE_DEBOUNCE_MS = 2000;

type PatientExtras = Patient & {
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  allergyNotes?: string | null;
  createdAt?: Date | string;
};

function asPatientExtras(p: Patient): PatientExtras {
  return p as unknown as PatientExtras;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toLocalISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortNotesByVisitDate(
  items: ClinicalNote[],
  order: "desc" | "asc" = "desc",
) {
  return items.slice().sort((a, b) => {
    const ad = a.visitDate ?? a.createdAt.slice(0, 10);
    const bd = b.visitDate ?? b.createdAt.slice(0, 10);
    if (ad > bd) return order === "desc" ? -1 : 1;
    if (ad < bd) return order === "desc" ? 1 : -1;
    // Desempate por fecha de creación
    if (a.createdAt < b.createdAt) return order === "desc" ? 1 : -1;
    if (a.createdAt > b.createdAt) return order === "desc" ? -1 : 1;
    return 0;
  });
}

function splitTreatmentNotesAndRecipe(raw: string | null | undefined) {
  const text = (raw ?? "").trim();
  if (!text) return { treatmentNotes: "", recipe: "" };

  const marker = "Receta:";
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return { treatmentNotes: text, recipe: "" };

  const before = text.slice(0, markerIndex).trim();
  const after = text.slice(markerIndex + marker.length).trim();
  return { treatmentNotes: before, recipe: after };
}

function buildHistoriaClinicaHtml(
  note: ClinicalNote,
  patient: Patient | null,
  edadTexto: string,
  fechaAtencion: string,
  fechaCreacion: string,
  fechaImpresion: string,
  logoUrl: string,
) {
  const nombre = escapeHtml(patient ? patient.fullName : "");
  const dni = escapeHtml(
    patient ? formatPatientDocument(patient) : "",
  );
  const telefono = escapeHtml(patient ? patient.phone : "");
  const extra = patient ? asPatientExtras(patient) : null;
  const direccion = escapeHtml(extra?.address ?? "");
  const emergenciaNombre = escapeHtml(extra?.emergencyContactName ?? "");
  const emergenciaTelefono = escapeHtml(extra?.emergencyContactPhone ?? "");
  const motivoInicial = escapeHtml(extra?.notes ?? "");
  const alergiasInscripcion = escapeHtml(extra?.allergyNotes ?? "");
  const fechaInscripcion = patient
    ? escapeHtml(
        new Date(extra?.createdAt ?? Date.now()).toLocaleDateString(
          "es-PE",
          { dateStyle: "medium" },
        ),
      )
    : "";
  const edad = escapeHtml(edadTexto || "");
  const nursingNotes = escapeHtml(note.nursingNotes ?? "");
  const treatmentSplit = splitTreatmentNotesAndRecipe(note.treatmentNotes);
  const treatmentNotes = escapeHtml(treatmentSplit.treatmentNotes);
  const recipeText = escapeHtml(treatmentSplit.recipe);
  const weight = escapeHtml(note.weight ?? "");
  const height = escapeHtml(note.height ?? "");
  const bodyTemperature = escapeHtml(note.bodyTemperature ?? "");
  const bloodPressure = escapeHtml(note.bloodPressure ?? "");
  const oxygenSaturation = escapeHtml(note.oxygenSaturation ?? "");
  const heartRate = escapeHtml(note.heartRate ?? "");
  const respiratoryRate = escapeHtml(note.respiratoryRate ?? "");
  const glucose = escapeHtml(note.glucose ?? "");

  const vitalLines = [
    weight ? `Peso: ${weight}` : null,
    height ? `Talla: ${height}` : null,
    bodyTemperature ? `Temperatura corporal: ${bodyTemperature}` : null,
    bloodPressure ? `Presión arterial: ${bloodPressure}` : null,
    oxygenSaturation ? `Saturación: ${oxygenSaturation}` : null,
    heartRate ? `Frecuencia cardíaca: ${heartRate}` : null,
    respiratoryRate
      ? `Frecuencia respiratoria: ${respiratoryRate}`
      : null,
    glucose ? `Glucosa: ${glucose}` : null,
  ].filter(Boolean);

  const vitalText = vitalLines.length ? vitalLines.join("<br/>") : "—";

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Historia clínica</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 18px; margin-bottom: 4px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
      .clinic-info { display: flex; align-items: center; gap: 10px; }
      .clinic-name { font-weight: 700; font-size: 18px; }
      .clinic-subtitle { font-size: 12px; color: #fbbf24; margin-top: 2px; }
      .meta { font-size: 12px; color: #4b5563; }
      .label { font-weight: 600; }
      .block { margin-top: 8px; font-size: 13px; white-space: pre-wrap; }
      .section-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin-top: 8px; }
      .logo { height: 48px; }
      .footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; gap: 18px; }
      .sign { flex: 1; }
      .line { height: 1px; background: #9ca3af; margin-top: 34px; }
      .sign-label { margin-top: 6px; font-size: 12px; color: #4b5563; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="clinic-info">
        <img src="${logoUrl}" alt="Logo del consultorio Harmonia Center" class="logo" />
        <div>
          <div class="clinic-name">Harmonia Center</div>
          <div class="clinic-subtitle">Medicina Alternativa Complementaria</div>
          <div class="meta">Historia clínica N.º ${note.historyNumber}</div>
        </div>
      </div>
      <div class="meta">
        <div><span class="label">Fecha de atención:</span> ${fechaAtencion}</div>
        <div><span class="label">Fecha y hora de creación:</span> ${fechaCreacion}</div>
        <div><span class="label">Fecha y hora de impresión:</span> ${fechaImpresion}</div>
      </div>
    </div>

    <h1>Datos del paciente</h1>
    <div class="section-box">
      <div><span class="label">Nombre:</span> ${nombre}</div>
      <div><span class="label">Documento:</span> ${dni}</div>
      <div><span class="label">Teléfono:</span> ${telefono}</div>
      <div><span class="label">Edad:</span> ${edad}</div>
      ${
        fechaInscripcion
          ? `<div><span class="label">Fecha de inscripción:</span> ${fechaInscripcion}</div>`
          : ""
      }
      ${
        motivoInicial
          ? `<div><span class="label">Motivo Inicial de Consulta:</span> ${motivoInicial}</div>`
          : ""
      }
      ${
        alergiasInscripcion
          ? `<div><span class="label">Alergias (inscripción):</span> ${alergiasInscripcion}</div>`
          : ""
      }
      ${
        direccion
          ? `<div><span class="label">Dirección:</span> ${direccion}</div>`
          : ""
      }
      ${
        emergenciaNombre || emergenciaTelefono
          ? `<div><span class="label">Contacto de emergencia:</span> ${emergenciaNombre}${
              emergenciaTelefono ? ` · ${emergenciaTelefono}` : ""
            }</div>`
          : ""
      }
    </div>

    <h2>Motivo de consulta</h2>
    <div class="section-box block">${escapeHtml(note.consultationReason ?? "")}</div>

    <h2>Historia de la enfermedad actual</h2>
    <div class="section-box block">${escapeHtml(note.currentIllness ?? "")}</div>

    <h2>Examen físico</h2>
    <div class="section-box block">${escapeHtml(note.physicalExam ?? "")}</div>

    <h2>Resultados de pruebas / estudios</h2>
    <div class="section-box block">${escapeHtml(note.diagnostics ?? "")}</div>

    <h2>Diagnóstico</h2>
    <div class="section-box block">${escapeHtml(note.diagnosis ?? "")}</div>

    ${
      nursingNotes
        ? `<h2>Notas de Enfermería</h2><div class="section-box block">${nursingNotes}</div>`
        : ""
    }

    ${
      treatmentNotes
        ? `<h2>Notas de tratamiento</h2><div class="section-box block">${treatmentNotes}</div>`
        : ""
    }

    ${
      recipeText
        ? `<h2>Receta</h2><div class="section-box block">${recipeText}</div>`
        : ""
    }

    <h2>Signos vitales</h2>
    <div class="section-box block">${vitalText}</div>

    <h2>Evolución / notas de progreso</h2>
    <div class="section-box block">${escapeHtml(note.evolutionNotes ?? "")}</div>

    ${
      note.attachments && note.attachments.length > 0
        ? `<h2>Archivos adjuntos</h2><div class="section-box"><ul style="margin:0;padding-left:18px;">${note.attachments
            .map((a) => {
              const label = escapeHtml(a.name);
              if (a.webViewLink) {
                return `<li><a href="${escapeHtml(a.webViewLink)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
              }
              return `<li>${label}</li>`;
            })
            .join("")}</ul></div>`
        : ""
    }

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

function HistoriasClinicasPageInner() {
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<
    "idle" | "pending" | "saving" | "saved" | "error"
  >("idle");
  const [editorRole, setEditorRole] = useState<ClinicalEditorRole>("enfermeria");
  const dirtyKeysRef = useRef<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [consultationReason, setConsultationReason] = useState("");
  const [currentIllness, setCurrentIllness] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [diagnostics, setDiagnostics] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [evolutionNotes, setEvolutionNotes] = useState("");
  const [nursingNotes, setNursingNotes] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bodyTemperature, setBodyTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [glucose, setGlucose] = useState("");
  const [visitDate, setVisitDate] = useState<string>(() => toLocalISODate(new Date()));
  const [patientQuery, setPatientQuery] = useState("");
  const [patientInputFocused, setPatientInputFocused] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [historySortOrder, setHistorySortOrder] = useState<"desc" | "asc">(
    "desc",
  );
  const [noteDateFrom, setNoteDateFrom] = useState("");
  const [noteDateTo, setNoteDateTo] = useState("");
  const [attachments, setAttachments] = useState<ClinicalAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  /** Subidas temporales aún no guardadas en la ficha. */
  const pendingDriveIdsRef = useRef<Set<string>>(new Set());
  const autosaveReadyRef = useRef(false);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const autosaveSnapshotRef = useRef("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveInFlightRef = useRef(false);
  const loadGenRef = useRef(0);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) || null,
    [patients, selectedPatientId],
  );

  const requestedPatientId = useMemo(
    () => (searchParams.get("patientId") || "").trim(),
    [searchParams],
  );

  const orderedNotes = useMemo(
    () => sortNotesByVisitDate(notes, historySortOrder),
    [notes, historySortOrder],
  );

  const filteredNotes = useMemo(() => {
    const from = noteDateFrom.trim();
    const to = noteDateTo.trim();
    if (!from && !to) return orderedNotes;
    return orderedNotes.filter((n) => {
      const day = n.visitDate ?? n.createdAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }, [orderedNotes, noteDateFrom, noteDateTo]);

  useEffect(() => {
    setEditorRole(loadClinicalEditorRole());
  }, []);

  const getEnfermeriaFields = useCallback(
    (): EnfermeriaAutosaveFields => ({
      consultationReason,
      nursingNotes,
      weight,
      height,
      bodyTemperature,
      bloodPressure,
      oxygenSaturation,
      heartRate,
      respiratoryRate,
      glucose,
    }),
    [
      consultationReason,
      nursingNotes,
      weight,
      height,
      bodyTemperature,
      bloodPressure,
      oxygenSaturation,
      heartRate,
      respiratoryRate,
      glucose,
    ],
  );

  const getDoctoraFields = useCallback(
    (): DoctoraAutosaveFields => ({
      currentIllness,
      physicalExam,
      diagnostics,
      diagnosis,
      evolutionNotes,
      treatmentNotes,
    }),
    [
      currentIllness,
      physicalExam,
      diagnostics,
      diagnosis,
      evolutionNotes,
      treatmentNotes,
    ],
  );

  const markDirty = useCallback((key: string) => {
    dirtyKeysRef.current.add(key);
  }, []);

  const clearDirtyKeys = useCallback((keys: readonly string[]) => {
    for (const k of keys) dirtyKeysRef.current.delete(k);
  }, []);

  const applyRemoteVisitFields = useCallback(
    (saved: ClinicalNote, onlyKeys?: string[]) => {
      const keys = onlyKeys?.length
        ? onlyKeys
        : [...ENFERMERIA_FIELD_KEYS, ...DOCTORA_FIELD_KEYS];
      const setters: Record<string, (v: string) => void> = {
        consultationReason: setConsultationReason,
        nursingNotes: setNursingNotes,
        weight: setWeight,
        height: setHeight,
        bodyTemperature: setBodyTemperature,
        bloodPressure: setBloodPressure,
        oxygenSaturation: setOxygenSaturation,
        heartRate: setHeartRate,
        respiratoryRate: setRespiratoryRate,
        glucose: setGlucose,
        currentIllness: setCurrentIllness,
        physicalExam: setPhysicalExam,
        diagnostics: setDiagnostics,
        diagnosis: setDiagnosis,
        evolutionNotes: setEvolutionNotes,
        treatmentNotes: setTreatmentNotes,
      };
      for (const key of keys) {
        if (dirtyKeysRef.current.has(key)) continue;
        const raw = (saved as unknown as Record<string, unknown>)[key];
        const setter = setters[key];
        if (setter) setter(raw == null ? "" : String(raw));
      }
    },
    [],
  );

  const applySavedNoteToState = useCallback((saved: ClinicalNote) => {
    setEditingNoteId(saved.id);
    setConsultationReason(saved.consultationReason ?? "");
    setCurrentIllness(saved.currentIllness ?? "");
    setPhysicalExam(saved.physicalExam ?? "");
    setDiagnostics(saved.diagnostics ?? "");
    setDiagnosis(saved.diagnosis ?? "");
    setEvolutionNotes(saved.evolutionNotes ?? "");
    setNursingNotes(saved.nursingNotes ?? "");
    setTreatmentNotes(saved.treatmentNotes ?? "");
    setWeight(saved.weight ?? "");
    setHeight(saved.height ?? "");
    setBodyTemperature(saved.bodyTemperature ?? "");
    setBloodPressure(saved.bloodPressure ?? "");
    setOxygenSaturation(saved.oxygenSaturation ?? "");
    setHeartRate(saved.heartRate ?? "");
    setRespiratoryRate(saved.respiratoryRate ?? "");
    setGlucose(saved.glucose ?? "");
    setVisitDate(saved.visitDate ?? toLocalISODate(new Date(saved.createdAt)));
    setAttachments(saved.attachments ?? []);
    pendingDriveIdsRef.current.clear();
  }, []);

  const mergeSavedNoteInList = useCallback(
    (saved: ClinicalNote, isEditing: boolean) => {
      setNotes((prev) =>
        sortNotesByVisitDate(
          isEditing
            ? prev.map((n) => (n.id === saved.id ? saved : n))
            : prev.some((n) => n.id === saved.id)
              ? prev.map((n) => (n.id === saved.id ? saved : n))
              : [saved, ...prev],
          "desc",
        ),
      );
    },
    [],
  );

  useEffect(() => {
    loadGenRef.current += 1;
    autosaveReadyRef.current = false;
    setAutosaveReady(false);
    setAutosaveStatus("idle");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    // Solo al cambiar paciente. NO al crear/asignar editingNoteId por autosave
    // (si no, el snapshot “come” lo tipado y nunca se vuelve a guardar).
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId || loadingNotes) {
      autosaveReadyRef.current = false;
      setAutosaveReady(false);
      return;
    }
    const gen = loadGenRef.current;
    const t = setTimeout(() => {
      if (gen !== loadGenRef.current) return;
      const snap =
        editorRole === "enfermeria"
          ? getEnfermeriaFields()
          : getDoctoraFields();
      autosaveSnapshotRef.current = JSON.stringify(snap);
      autosaveReadyRef.current = true;
      setAutosaveReady(true);
      dirtyKeysRef.current.clear();
    }, 400);
    return () => clearTimeout(t);
  }, [
    selectedPatientId,
    loadingNotes,
    editorRole,
    getEnfermeriaFields,
    getDoctoraFields,
  ]);

  const runRoleAutosave = useCallback(async () => {
    if (
      !selectedPatientId ||
      !autosaveReadyRef.current ||
      saving ||
      autosaveInFlightRef.current
    ) {
      return;
    }

    const roleKeys = fieldsForRole(editorRole);
    const fields =
      editorRole === "enfermeria" ? getEnfermeriaFields() : getDoctoraFields();
    const serialized = JSON.stringify({ role: editorRole, fields });
    if (serialized === autosaveSnapshotRef.current) return;
    const hasContent = Object.values(fields).some(
      (v) => String(v ?? "").trim() !== "",
    );
    if (!editingNoteId && !hasContent) return;

    autosaveInFlightRef.current = true;
    setAutosaveStatus("saving");

    try {
      const isEditing = Boolean(editingNoteId);
      const res = await fetch("/api/clinical-notes", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { id: editingNoteId } : {}),
          patientId: selectedPatientId,
          visitDate,
          ...fields,
        }),
        keepalive: true,
      });
      const txt = await res.text();
      const payload = txt
        ? (() => {
            try {
              return JSON.parse(txt);
            } catch {
              return { error: "Respuesta inválida del servidor." };
            }
          })()
        : null;

      if (!res.ok || !payload || typeof payload !== "object") {
        setAutosaveStatus("error");
        return;
      }

      const saved = payload as ClinicalNote;
      mergeSavedNoteInList(saved, isEditing);
      autosaveSnapshotRef.current = serialized;
      clearDirtyKeys(roleKeys);
      // Traer del servidor la sección del otro rol (sin pisar dirty local).
      applyRemoteVisitFields(
        saved,
        editorRole === "enfermeria"
          ? [...DOCTORA_FIELD_KEYS]
          : [...ENFERMERIA_FIELD_KEYS],
      );
      if (!isEditing) {
        setEditingNoteId(saved.id);
      }
      notifyVisitUpdated(selectedPatientId, saved.id, {
        updatedKeys: [...roleKeys],
        role: editorRole,
      });
      setAutosaveStatus("saved");
      window.setTimeout(() => setAutosaveStatus("idle"), 2500);
    } catch (err) {
      console.error(err);
      setAutosaveStatus("error");
    } finally {
      autosaveInFlightRef.current = false;
    }
  }, [
    selectedPatientId,
    saving,
    editingNoteId,
    visitDate,
    editorRole,
    getEnfermeriaFields,
    getDoctoraFields,
    mergeSavedNoteInList,
    clearDirtyKeys,
    applyRemoteVisitFields,
  ]);

  const armAutosaveFromNote = useCallback(
    (n: ClinicalNote | Record<string, string | null | undefined>) => {
      const enfermeria: EnfermeriaAutosaveFields = {
        consultationReason: String(n.consultationReason ?? ""),
        nursingNotes: String(n.nursingNotes ?? ""),
        weight: String(n.weight ?? ""),
        height: String(n.height ?? ""),
        bodyTemperature: String(n.bodyTemperature ?? ""),
        bloodPressure: String(n.bloodPressure ?? ""),
        oxygenSaturation: String(n.oxygenSaturation ?? ""),
        heartRate: String(n.heartRate ?? ""),
        respiratoryRate: String(n.respiratoryRate ?? ""),
        glucose: String(n.glucose ?? ""),
      };
      const doctora: DoctoraAutosaveFields = {
        currentIllness: String(n.currentIllness ?? ""),
        physicalExam: String(n.physicalExam ?? ""),
        diagnostics: String(n.diagnostics ?? ""),
        diagnosis: String(n.diagnosis ?? ""),
        evolutionNotes: String(n.evolutionNotes ?? ""),
        treatmentNotes: String(n.treatmentNotes ?? ""),
      };
      const fields = editorRole === "enfermeria" ? enfermeria : doctora;
      autosaveSnapshotRef.current = JSON.stringify({
        role: editorRole,
        fields,
      });
      autosaveReadyRef.current = true;
      setAutosaveReady(true);
      setAutosaveStatus("idle");
      dirtyKeysRef.current.clear();
    },
    [editorRole],
  );

  const flushRoleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    void runRoleAutosave();
  }, [runRoleAutosave]);

  useEffect(() => {
    if (!selectedPatientId || !autosaveReady || saving) return;

    const fields =
      editorRole === "enfermeria" ? getEnfermeriaFields() : getDoctoraFields();
    const serialized = JSON.stringify({ role: editorRole, fields });
    if (serialized === autosaveSnapshotRef.current) return;
    const hasContent = Object.values(fields).some(
      (v) => String(v ?? "").trim() !== "",
    );
    if (!editingNoteId && !hasContent) return;

    setAutosaveStatus("pending");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void runRoleAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [
    selectedPatientId,
    autosaveReady,
    saving,
    editingNoteId,
    visitDate,
    editorRole,
    getEnfermeriaFields,
    getDoctoraFields,
    runRoleAutosave,
  ]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushRoleAutosave();
    };
    const onPageHide = () => flushRoleAutosave();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      flushRoleAutosave();
    };
  }, [flushRoleAutosave]);

  // Traer cambios del otro dispositivo/rol sin pisar lo que se está tipando.
  useEffect(() => {
    if (!selectedPatientId || !editingNoteId) return;

    const pullRemote = async () => {
      try {
        const res = await fetch(
          `/api/clinical-notes?patientId=${encodeURIComponent(selectedPatientId)}`,
        );
        if (!res.ok) return;
        const visits = (await res.json()) as ClinicalNote[];
        const fresh = visits.find((v) => v.id === editingNoteId);
        if (!fresh) return;
        applyRemoteVisitFields(fresh);
      } catch {
        // ignore
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible") void pullRemote();
    };
    document.addEventListener("visibilitychange", onVis);
    const interval = window.setInterval(() => void pullRemote(), 12000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(interval);
    };
  }, [selectedPatientId, editingNoteId, applyRemoteVisitFields]);

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

  const filteredPatients = useMemo(() => {
    if (!patientQuery.trim()) return patients;
    const q = patientQuery.toLowerCase();
    return patients.filter((p) => {
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.dni.toLowerCase().includes(q) ||
        formatPatientDocument(p).toLowerCase().includes(q)
      );
    });
  }, [patients, patientQuery]);

  useEffect(() => {
    fetch("/api/patients?lite=1")
      .then((r) => r.json())
      .then(setPatients)
      .catch((err) => {
        console.error(err);
        setError("No se pudieron cargar los pacientes.");
      });
  }, []);

  useEffect(() => {
    if (!requestedPatientId || !patients.length) return;
    if (selectedPatientId === requestedPatientId) return;
    const targetPatient = patients.find((p) => p.id === requestedPatientId);
    if (!targetPatient) return;
    setSelectedPatientId(targetPatient.id);
    setPatientQuery(targetPatient.fullName);
  }, [patients, requestedPatientId, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) {
      setNotes([]);
      setEditingNoteId(null);
      setAttachments([]);
      pendingDriveIdsRef.current.clear();
      setConsultationReason("");
      setCurrentIllness("");
      setPhysicalExam("");
      setDiagnostics("");
      setDiagnosis("");
      setEvolutionNotes("");
      setNursingNotes("");
      setTreatmentNotes("");
      setWeight("");
      setHeight("");
      setBodyTemperature("");
      setBloodPressure("");
      setOxygenSaturation("");
      setHeartRate("");
      setRespiratoryRate("");
      setGlucose("");
      setVisitDate(toLocalISODate(new Date()));
      return;
    }

    setLoadingNotes(true);
    setError(null);
    fetch(`/api/clinical-notes?patientId=${selectedPatientId}`)
      .then(async (r) => {
        const txt = await r.text();
        const data = txt
          ? (() => {
              try {
                return JSON.parse(txt) as ClinicalNote[] | { error?: string };
              } catch {
                return { error: "Respuesta inválida del servidor." };
              }
            })()
          : [];

        if (!r.ok) {
          const msg =
            data && typeof data === "object" && "error" in data
              ? String((data as { error?: unknown }).error ?? "")
              : "";
          throw new Error(msg || "No se pudieron cargar las historias clínicas.");
        }

        return Array.isArray(data) ? data : [];
      })
      .then((data: ClinicalNote[]) => {
        const ordered = sortNotesByVisitDate(data ?? [], "desc");
        setNotes(ordered);
        if (ordered && ordered.length > 0) {
          const n = ordered[0];
          setEditingNoteId(n.id);
          setAttachments(n.attachments ?? []);
          pendingDriveIdsRef.current.clear();
          setConsultationReason(n.consultationReason ?? "");
          setCurrentIllness(n.currentIllness ?? "");
          setPhysicalExam(n.physicalExam ?? "");
          setDiagnostics(n.diagnostics ?? "");
          setDiagnosis(n.diagnosis ?? "");
          setEvolutionNotes(n.evolutionNotes ?? "");
          setNursingNotes(n.nursingNotes ?? "");
          setTreatmentNotes(n.treatmentNotes ?? "");
          setWeight(n.weight ?? "");
          setHeight(n.height ?? "");
          setBodyTemperature(n.bodyTemperature ?? "");
          setBloodPressure(n.bloodPressure ?? "");
          setOxygenSaturation(n.oxygenSaturation ?? "");
          setHeartRate(n.heartRate ?? "");
          setRespiratoryRate(n.respiratoryRate ?? "");
          setGlucose(n.glucose ?? "");
          setVisitDate(n.visitDate ?? toLocalISODate(new Date(n.createdAt)));
          armAutosaveFromNote(n);
        } else {
          setEditingNoteId(null);
          setAttachments([]);
          pendingDriveIdsRef.current.clear();
          setConsultationReason("");
          setCurrentIllness("");
          setPhysicalExam("");
          setDiagnostics("");
          setDiagnosis("");
          setEvolutionNotes("");
          setNursingNotes("");
          setTreatmentNotes("");
          setWeight("");
          setHeight("");
          setBodyTemperature("");
          setBloodPressure("");
          setOxygenSaturation("");
          setHeartRate("");
          setRespiratoryRate("");
          setGlucose("");
          setVisitDate(toLocalISODate(new Date()));
          armAutosaveFromNote({});
        }
      })
      .catch((err) => {
        console.error(err);
        setError(
          err instanceof Error && err.message
            ? err.message
            : "No se pudieron cargar las historias clínicas.",
        );
      })
      .finally(() => setLoadingNotes(false));
  }, [selectedPatientId]);

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

  async function handleCopyAttachmentLink(link: string | null) {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setError("Enlace copiado al portapapeles.");
    } catch {
      setError("No se pudo copiar el enlace.");
    }
  }

  async function handleAttachmentFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedPatientId || !editingNoteId) return;

    if (isClinicalAttachmentOverLimit(file.size)) {
      setError(clinicalAttachmentSizeErrorMessage(file.size));
      return;
    }

    setUploadingAttachment(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("patientId", selectedPatientId);
      fd.set("visitId", editingNoteId);
      fd.set("file", file);
      const res = await fetch("/api/clinical-notes/attachments/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          (data as { error?: string })?.error ||
            "No se pudo subir el archivo.",
        );
        return;
      }
      const att = (data as { attachment?: ClinicalAttachment }).attachment;
      if (!att) {
        setError("Respuesta inválida al subir el archivo.");
        return;
      }
      pendingDriveIdsRef.current.add(att.driveFileId);
      setAttachments((prev) => [...prev, att]);
    } catch (err) {
      console.error(err);
      setError("No se pudo subir el archivo.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteNote(id: string) {
    if (!window.confirm("¿Deseas eliminar esta historia clínica?")) return;
    if (!selectedPatientId) return;
    try {
      const res = await fetch(
        `/api/clinical-notes?id=${encodeURIComponent(id)}&patientId=${encodeURIComponent(
          selectedPatientId,
        )}`,
        { method: "DELETE" },
      );
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "No se pudo eliminar la historia clínica.");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
      setError("No se pudo eliminar la historia clínica.");
    }
  }

  function handlePrintNote(note: ClinicalNote) {
    if (typeof window === "undefined") return;
    const patient = patients.find((p) => p.id === note.patientId) || null;
    // En Chrome, usar `noreferrer` puede impedir escribir el HTML (queda about:blank en blanco).
    const win = window.open("", "_blank");
    if (!win) {
      setError("No se pudo abrir la ventana de impresión. Revisa si el navegador bloqueó ventanas emergentes.");
      return;
    }
    // Seguridad: evitar acceso a `window.opener` desde la pestaña nueva.
    try {
      win.opener = null;
    } catch {
      // ignore
    }

    const fechaCreacion = new Date(note.createdAt).toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const fechaAtencion = new Date(
      (note.visitDate ?? note.createdAt.slice(0, 10)) + "T00:00:00",
    ).toLocaleDateString("es-PE", { dateStyle: "medium" });
    const fechaImpresion = new Date().toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const edadTexto =
      patient && patient.birthDate
        ? calcularEdadDetallada((patient.birthDate as unknown) as string)
        : "";

    const logoUrl = new URL("/logo-harmonia.png", window.location.origin).href;
    const html = buildHistoriaClinicaHtml(
      note,
      patient,
      edadTexto,
      fechaAtencion,
      fechaCreacion,
      fechaImpresion,
      logoUrl,
    );

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // pequeño retraso para asegurar que el contenido se haya renderizado
    setTimeout(() => {
      win.print();
    }, 300);
  }

  function handleRoleChange(role: ClinicalEditorRole) {
    if (role === editorRole) return;
    flushRoleAutosave();
    saveClinicalEditorRole(role);
    setEditorRole(role);
  }

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) {
      setError("Selecciona primero un paciente.");
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const roleKeys = fieldsForRole(editorRole);
    const roleFields =
      editorRole === "enfermeria" ? getEnfermeriaFields() : getDoctoraFields();

    setSaving(true);
    setError(null);
    try {
      const isEditing = Boolean(editingNoteId);
      const res = await fetch("/api/clinical-notes", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingNoteId ?? undefined,
          patientId: selectedPatientId,
          visitDate,
          ...roleFields,
          ...(isEditing ? { attachments } : {}),
        }),
      });
      const txt = await res.text();
      const payload = txt
        ? (() => {
            try {
              return JSON.parse(txt);
            } catch {
              return { error: "Respuesta inválida del servidor." };
            }
          })()
        : null;
      if (!res.ok) {
        setError(
          (payload as { error?: string } | null)?.error ||
            (isEditing
              ? "No se pudo actualizar la historia clínica."
              : "No se pudo guardar la historia clínica."),
        );
        return;
      }
      if (!payload || typeof payload !== "object") {
        setError("No se pudo guardar la historia clínica.");
        return;
      }

      const saved = payload as ClinicalNote;
      mergeSavedNoteInList(saved, isEditing);
      applySavedNoteToState(saved);
      clearDirtyKeys(roleKeys);
      autosaveSnapshotRef.current = JSON.stringify({
        role: editorRole,
        fields: roleFields,
      });
      setAutosaveStatus("idle");
      notifyVisitUpdated(selectedPatientId, saved.id, {
        updatedKeys: [...roleKeys],
        role: editorRole,
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar la historia clínica.");
    } finally {
      setSaving(false);
    }
  }

  const enfermeriaEditable = editorRole === "enfermeria";
  const doctoraEditable = editorRole === "doctora";
  const fieldClass = (editable: boolean) =>
    "min-h-[60px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm " +
    (editable ? "bg-white" : "cursor-default bg-slate-50 text-slate-700");
  const inputClass = (editable: boolean) =>
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm " +
    (editable ? "bg-white" : "cursor-default bg-slate-50 text-slate-700");

  return (
    <main className="space-y-4 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Historias Clínicas</h1>
        <p className="text-sm text-slate-600">
          Selecciona un paciente para ver y registrar la evolución de sus
          consultas.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 text-sm relative sm:flex-1">
            <span className="block text-xs font-semibold text-slate-700">
              Paciente
            </span>
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="Escribe nombre o documento…"
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value);
                }}
                onFocus={() => setPatientInputFocused(true)}
                onBlur={() => {
                  // pequeño retraso para permitir clic en la lista
                  setTimeout(() => setPatientInputFocused(false), 150);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setPatientQuery("");
                  setSelectedPatientId("");
                  setNotes([]);
                  setError(null);
                }}
                className="whitespace-nowrap rounded border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Limpiar búsqueda
              </button>
            </div>
            {patientInputFocused && filteredPatients.length > 0 && (
              <ul className="absolute left-0 right-0 z-10 mt-1 max-h-60 w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-slate-300 bg-white text-xs shadow">
                {filteredPatients.map((p) => (
                  <li
                    key={p.id}
                    className="cursor-pointer px-3 py-1.5 hover:bg-slate-100"
                    onMouseDown={() => {
                      setSelectedPatientId(p.id);
                      setPatientQuery(
                        `${p.fullName} · ${formatPatientDocument(p)}`,
                      );
                      setPatientInputFocused(false);
                    }}
                  >
                    <span className="font-semibold text-slate-900">
                      {p.fullName}
                    </span>
                    <span className="ml-1 text-slate-600">
                      · {formatPatientDocument(p)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedPatient && (
            <div className="text-xs text-slate-600">
              <p className="font-semibold text-slate-800">
                {selectedPatient.fullName}
              </p>
              <p>
                {formatPatientDocument(selectedPatient)} · Tel.{" "}
                {selectedPatient.phone}
              </p>
              <p className="mt-0.5">
                Inscrito:{" "}
                {new Date(
                  (selectedPatient.createdAt as unknown) as string,
                ).toLocaleDateString("es-PE", { dateStyle: "medium" })}
              </p>
              {selectedPatient.notes && (
                <p className="mt-0.5">
                  Motivo Inicial de Consulta:{" "}
                  <span className="text-slate-700">{selectedPatient.notes}</span>
                </p>
              )}
              {asPatientExtras(selectedPatient).allergyNotes && (
                <p className="mt-0.5">
                  Alergias (inscripción):{" "}
                  <span className="text-slate-700">
                    {asPatientExtras(selectedPatient).allergyNotes}
                  </span>
                </p>
              )}
              <p>
                Edad:{" "}
                {calcularEdadDetallada(
                  (selectedPatient.birthDate as unknown) as string,
                )}
              </p>
            </div>
          )}
        </div>

        {selectedPatient && (
          <form
            onSubmit={handleSaveNote}
            className="space-y-4 border-t border-slate-200 pt-4 text-sm"
          >
            <ClinicalRoleToggle role={editorRole} onChange={handleRoleChange} />

            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-1">
                <label className="text-xs text-slate-600">
                  Fecha de atención (ficha)
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              {autosaveStatus !== "idle" && (
                <span
                  className={`text-[11px] ${
                    autosaveStatus === "error"
                      ? "text-red-600"
                      : autosaveStatus === "saved"
                        ? "text-emerald-700"
                        : "text-slate-500"
                  }`}
                >
                  {autosaveStatus === "pending" && "Guardando en breve…"}
                  {autosaveStatus === "saving" && "Guardando automáticamente…"}
                  {autosaveStatus === "saved" && "Guardado · misma ficha compartida"}
                  {autosaveStatus === "error" &&
                    "No se pudo guardar automáticamente"}
                </span>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* —— Enfermería —— */}
              <section
                className={
                  "space-y-3 rounded-xl border p-3 " +
                  (enfermeriaEditable
                    ? "border-teal-300 bg-teal-50/40"
                    : "border-slate-200 bg-slate-50/60")
                }
              >
                <div>
                  <h3 className="text-sm font-semibold text-teal-900">
                    Enfermería
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {enfermeriaEditable
                      ? "Puedes editar esta sección. Se guarda sola (~2 s) y no sobrescribe lo de la doctora."
                      : "Solo lectura en este dispositivo. Cambia el rol a Enfermería para escribir aquí."}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Motivo de consulta
                  </label>
                  <textarea
                    className={fieldClass(enfermeriaEditable)}
                    value={consultationReason}
                    readOnly={!enfermeriaEditable}
                    onChange={(e) => {
                      markDirty("consultationReason");
                      setConsultationReason(e.target.value);
                    }}
                    onBlur={() => enfermeriaEditable && flushRoleAutosave()}
                    placeholder="Razón principal de la consulta actual"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Notas de Enfermería
                  </label>
                  <textarea
                    className={fieldClass(enfermeriaEditable)}
                    value={nursingNotes}
                    readOnly={!enfermeriaEditable}
                    onChange={(e) => {
                      markDirty("nursingNotes");
                      setNursingNotes(e.target.value);
                    }}
                    onBlur={() => enfermeriaEditable && flushRoleAutosave()}
                    placeholder="Observaciones y evolución por enfermería…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">Signos vitales</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["weight", weight, setWeight, "Peso (ej. 72 kg)"],
                        ["height", height, setHeight, "Talla (ej. 1.68 m)"],
                        [
                          "bodyTemperature",
                          bodyTemperature,
                          setBodyTemperature,
                          "Temperatura (ej. 36.7 °C)",
                        ],
                        [
                          "bloodPressure",
                          bloodPressure,
                          setBloodPressure,
                          "Presión arterial (ej. 120/80)",
                        ],
                        [
                          "oxygenSaturation",
                          oxygenSaturation,
                          setOxygenSaturation,
                          "Saturación (ej. 98%)",
                        ],
                        [
                          "heartRate",
                          heartRate,
                          setHeartRate,
                          "Frecuencia cardíaca (ej. 72 lpm)",
                        ],
                        [
                          "respiratoryRate",
                          respiratoryRate,
                          setRespiratoryRate,
                          "Frecuencia respiratoria (ej. 18 rpm)",
                        ],
                        ["glucose", glucose, setGlucose, "Glucosa (ej. 95 mg/dL)"],
                      ] as const
                    ).map(([key, value, setter, placeholder]) => (
                      <input
                        key={key}
                        className={inputClass(enfermeriaEditable)}
                        placeholder={placeholder}
                        value={value}
                        readOnly={!enfermeriaEditable}
                        onChange={(e) => {
                          markDirty(key);
                          setter(e.target.value);
                        }}
                        onBlur={() => enfermeriaEditable && flushRoleAutosave()}
                      />
                    ))}
                  </div>
                </div>
              </section>

              {/* —— Doctora —— */}
              <section
                className={
                  "space-y-3 rounded-xl border p-3 " +
                  (doctoraEditable
                    ? "border-amber-300 bg-amber-50/50"
                    : "border-slate-200 bg-slate-50/60")
                }
              >
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">
                    Doctora
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {doctoraEditable
                      ? "Puedes editar esta sección. Se guarda sola (~2 s) y no sobrescribe lo de enfermería."
                      : "Solo lectura en este dispositivo. Cambia el rol a Doctora para escribir aquí."}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Historia de la enfermedad actual
                  </label>
                  <textarea
                    className={fieldClass(doctoraEditable) + " min-h-[80px]"}
                    value={currentIllness}
                    readOnly={!doctoraEditable}
                    onChange={(e) => {
                      markDirty("currentIllness");
                      setCurrentIllness(e.target.value);
                    }}
                    onBlur={() => doctoraEditable && flushRoleAutosave()}
                    placeholder="Descripción de síntomas, duración, factores desencadenantes…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">Examen físico</label>
                  <textarea
                    className={fieldClass(doctoraEditable)}
                    value={physicalExam}
                    readOnly={!doctoraEditable}
                    onChange={(e) => {
                      markDirty("physicalExam");
                      setPhysicalExam(e.target.value);
                    }}
                    onBlur={() => doctoraEditable && flushRoleAutosave()}
                    placeholder="Hallazgos relevantes del examen"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Resultados de pruebas / estudios
                  </label>
                  <textarea
                    className={fieldClass(doctoraEditable)}
                    value={diagnostics}
                    readOnly={!doctoraEditable}
                    onChange={(e) => {
                      markDirty("diagnostics");
                      setDiagnostics(e.target.value);
                    }}
                    onBlur={() => doctoraEditable && flushRoleAutosave()}
                    placeholder="Resultados de laboratorio, imágenes…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">Diagnóstico</label>
                  <textarea
                    className={fieldClass(doctoraEditable)}
                    value={diagnosis}
                    readOnly={!doctoraEditable}
                    onChange={(e) => {
                      markDirty("diagnosis");
                      setDiagnosis(e.target.value);
                    }}
                    onBlur={() => doctoraEditable && flushRoleAutosave()}
                    placeholder="Diagnóstico clínico"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Notas de tratamiento
                  </label>
                  <textarea
                    className={fieldClass(doctoraEditable)}
                    value={treatmentNotes}
                    readOnly={!doctoraEditable}
                    onChange={(e) => {
                      markDirty("treatmentNotes");
                      setTreatmentNotes(e.target.value);
                    }}
                    onBlur={() => doctoraEditable && flushRoleAutosave()}
                    placeholder="Respuesta al tratamiento, indicaciones, etc…"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600">
                    Evolución / notas de progreso
                  </label>
                  <textarea
                    className={fieldClass(doctoraEditable)}
                    value={evolutionNotes}
                    readOnly={!doctoraEditable}
                    onChange={(e) => {
                      markDirty("evolutionNotes");
                      setEvolutionNotes(e.target.value);
                    }}
                    onBlur={() => doctoraEditable && flushRoleAutosave()}
                    placeholder="Cambios en la condición, respuesta al tratamiento…"
                  />
                </div>
              </section>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <label className="text-xs font-semibold text-slate-700">
                  Archivos adjuntos
                </label>
                <p className="text-[11px] text-slate-500">
                  PDF o imagen (máx. 15 MB). El archivo se sube al almacenamiento
                  configurado; aquí solo guardamos el enlace.
                </p>
                {!editingNoteId ? (
                  <p className="text-xs text-amber-800">
                    Guarda la ficha primero para poder adjuntar archivos (o
                    selecciona una atención existente).
                  </p>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
                      disabled={uploadingAttachment || saving}
                      onChange={handleAttachmentFileChange}
                      className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-amber-100 file:px-2 file:py-1 file:text-[11px] file:font-semibold"
                    />
                    {uploadingAttachment && (
                      <p className="text-[11px] text-slate-500">
                        Subiendo archivo…
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
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {editingNoteId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoteId(null);
                      setAttachments([]);
                      pendingDriveIdsRef.current.clear();
                      setConsultationReason("");
                      setCurrentIllness("");
                      setPhysicalExam("");
                      setDiagnostics("");
                      setDiagnosis("");
                      setEvolutionNotes("");
                      setNursingNotes("");
                      setTreatmentNotes("");
                      setWeight("");
                      setHeight("");
                      setBodyTemperature("");
                      setBloodPressure("");
                      setOxygenSaturation("");
                      setHeartRate("");
                      setRespiratoryRate("");
                      setGlucose("");
                      setVisitDate(toLocalISODate(new Date()));
                      armAutosaveFromNote({});
                    }}
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar edición
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-600 disabled:opacity-60"
                >
                  {saving
                    ? "Guardando…"
                    : editingNoteId
                    ? `Actualizar sección ${editorRole === "enfermeria" ? "de enfermería" : "de la doctora"}`
                    : `Guardar ficha (${editorRole === "enfermeria" ? "enfermería" : "doctora"})`}
                </button>
              </div>

            {error && (
              <div className="text-xs text-red-600">{error}</div>
            )}
          </form>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Historial clínico
          </h2>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Orden de fechas
            </label>
            <select
              value={historySortOrder}
              onChange={(e) =>
                setHistorySortOrder(e.target.value as "desc" | "asc")
              }
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value="desc">Más recientes primero</option>
              <option value="asc">Más antiguas primero</option>
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-700">
              Fecha de atención
            </p>
            <DateRangeFilter
              dateFrom={noteDateFrom}
              dateTo={noteDateTo}
              onDateFromChange={setNoteDateFrom}
              onDateToChange={setNoteDateTo}
              onClear={() => {
                setNoteDateFrom("");
                setNoteDateTo("");
              }}
              showPresets
            />
          </div>
        </div>
        {!selectedPatientId ? (
          <p className="text-xs text-slate-500">
            Selecciona un paciente para ver sus historias clínicas.
          </p>
        ) : loadingNotes ? (
          <p className="text-xs text-slate-500">Cargando notas clínicas…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no hay notas clínicas registradas para este paciente.
          </p>
        ) : filteredNotes.length === 0 ? (
          <p className="text-xs text-slate-500">
            No hay fichas en el rango de fechas seleccionado.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {filteredNotes.map((n) => {
                  const labelDate = n.visitDate
                    ? new Date(n.visitDate + "T00:00:00")
                    : new Date(n.createdAt);
                  const label = labelDate.toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  const isActive = editingNoteId === n.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setEditingNoteId(n.id);
                        setAttachments(n.attachments ?? []);
                        pendingDriveIdsRef.current.clear();
                        setConsultationReason(n.consultationReason ?? "");
                        setCurrentIllness(n.currentIllness ?? "");
                        setPhysicalExam(n.physicalExam ?? "");
                        setDiagnostics(n.diagnostics ?? "");
                        setDiagnosis(n.diagnosis ?? "");
                        setEvolutionNotes(n.evolutionNotes ?? "");
                        setNursingNotes(n.nursingNotes ?? "");
                        setTreatmentNotes(n.treatmentNotes ?? "");
                        setWeight(n.weight ?? "");
                        setHeight(n.height ?? "");
                        setBodyTemperature(n.bodyTemperature ?? "");
                        setBloodPressure(n.bloodPressure ?? "");
                        setOxygenSaturation(n.oxygenSaturation ?? "");
                        setHeartRate(n.heartRate ?? "");
                        setRespiratoryRate(n.respiratoryRate ?? "");
                        setGlucose(n.glucose ?? "");
                        setVisitDate(
                          n.visitDate ?? toLocalISODate(new Date(n.createdAt)),
                        );
                        armAutosaveFromNote(n);
                      }}
                      className={
                        isActive
                          ? "rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-900"
                          : "rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50"
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingNoteId(null);
                  setAttachments([]);
                  pendingDriveIdsRef.current.clear();
                  setConsultationReason("");
                  setCurrentIllness("");
                  setPhysicalExam("");
                  setDiagnostics("");
                  setDiagnosis("");
                  setEvolutionNotes("");
                  setNursingNotes("");
                  setTreatmentNotes("");
                  setWeight("");
                  setHeight("");
                  setBodyTemperature("");
                  setBloodPressure("");
                  setOxygenSaturation("");
                  setHeartRate("");
                  setRespiratoryRate("");
                  setGlucose("");
                  setVisitDate(toLocalISODate(new Date()));
                }}
                className="self-start rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Nueva atención (nueva ficha)
              </button>
            </div>

            <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {orderedNotes.map((n) => (
              <article
                key={n.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
              >
                <header className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      N.º Historia clínica: {n.historyNumber}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Fecha de atención:{" "}
                      {new Date(
                        (n.visitDate ?? n.createdAt.slice(0, 10)) + "T00:00:00",
                      ).toLocaleDateString("es-PE", { dateStyle: "medium" })}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {new Date(n.createdAt).toLocaleString("es-PE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.diagnosis && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        {n.diagnosis.slice(0, 40)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePrintNote(n)}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Imprimir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(n.id);
                        setAttachments(n.attachments ?? []);
                        pendingDriveIdsRef.current.clear();
                        setConsultationReason(n.consultationReason ?? "");
                        setCurrentIllness(n.currentIllness ?? "");
                        setPhysicalExam(n.physicalExam ?? "");
                        setDiagnostics(n.diagnostics ?? "");
                        setDiagnosis(n.diagnosis ?? "");
                        setEvolutionNotes(n.evolutionNotes ?? "");
                        setNursingNotes(n.nursingNotes ?? "");
                        setTreatmentNotes(n.treatmentNotes ?? "");
                        setWeight(n.weight ?? "");
                        setHeight(n.height ?? "");
                        setBodyTemperature(n.bodyTemperature ?? "");
                        setBloodPressure(n.bloodPressure ?? "");
                        setOxygenSaturation(n.oxygenSaturation ?? "");
                        setHeartRate(n.heartRate ?? "");
                        setRespiratoryRate(n.respiratoryRate ?? "");
                        setGlucose(n.glucose ?? "");
                        setVisitDate(
                          n.visitDate ?? toLocalISODate(new Date(n.createdAt)),
                        );
                        armAutosaveFromNote(n);
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(n.id)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </header>
                {n.consultationReason && (
                  <p className="text-slate-800">
                    <span className="font-semibold">Motivo: </span>
                    {n.consultationReason}
                  </p>
                )}
                {n.currentIllness && (
                  <p className="mt-1 text-slate-700">
                    <span className="font-semibold">Historia actual: </span>
                    {n.currentIllness}
                  </p>
                )}
                {n.evolutionNotes && (
                  <p className="mt-1 text-slate-700">
                    <span className="font-semibold">Evolución: </span>
                    {n.evolutionNotes}
                  </p>
                )}
                {(() => {
                  const treatmentSplit = splitTreatmentNotesAndRecipe(
                    n.treatmentNotes,
                  );
                  return (
                    <>
                      {treatmentSplit.treatmentNotes && (
                        <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                          <span className="font-semibold">
                            Notas de tratamiento:{" "}
                          </span>
                          {treatmentSplit.treatmentNotes}
                        </p>
                      )}
                      {treatmentSplit.recipe && (
                        <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                          <span className="font-semibold">Receta: </span>
                          {treatmentSplit.recipe}
                        </p>
                      )}
                    </>
                  );
                })()}
                {n.attachments && n.attachments.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <p className="font-semibold text-slate-800">
                      Archivos adjuntos
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-amber-900">
                      {n.attachments.map((a) => (
                        <li key={a.id}>
                          <span className="font-medium text-slate-800">{a.name}</span>
                          {a.webViewLink && (
                            <a
                              href={a.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-block max-w-[420px] truncate align-bottom underline"
                              title={a.webViewLink}
                            >
                              {a.webViewLink}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function HistoriasClinicasPage() {
  return (
    <Suspense
      fallback={
        <main className="space-y-4 p-4 sm:p-6">
          <p className="text-sm text-slate-500">Cargando historias clínicas…</p>
        </main>
      }
    >
      <HistoriasClinicasPageInner />
    </Suspense>
  );
}


export type ClinicalEditorRole = "enfermeria" | "doctora";

/** Campos que suele llenar enfermería (misma ficha / visita). */
export const ENFERMERIA_FIELD_KEYS = [
  "consultationReason",
  "nursingNotes",
  "weight",
  "height",
  "bodyTemperature",
  "bloodPressure",
  "oxygenSaturation",
  "heartRate",
  "respiratoryRate",
  "glucose",
] as const;

/** Campos que suele llenar la doctora (misma ficha / visita). */
export const DOCTORA_FIELD_KEYS = [
  "currentIllness",
  "physicalExam",
  "diagnostics",
  "diagnosis",
  "evolutionNotes",
  "treatmentNotes",
  "treatmentPlan",
] as const;

export type EnfermeriaFieldKey = (typeof ENFERMERIA_FIELD_KEYS)[number];
export type DoctoraFieldKey = (typeof DOCTORA_FIELD_KEYS)[number];

const STORAGE_KEY = "harmonia-clinical-editor-role";

export function loadClinicalEditorRole(): ClinicalEditorRole {
  if (typeof window === "undefined") return "enfermeria";
  try {
    const v = window.sessionStorage.getItem(STORAGE_KEY);
    if (v === "doctora" || v === "enfermeria") return v;
  } catch {
    // ignore
  }
  return "enfermeria";
}

export function saveClinicalEditorRole(role: ClinicalEditorRole) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, role);
  } catch {
    // ignore
  }
}

export function fieldsForRole(role: ClinicalEditorRole): readonly string[] {
  return role === "enfermeria" ? ENFERMERIA_FIELD_KEYS : DOCTORA_FIELD_KEYS;
}

/** Aplica valores remotos sin pisar campos que el usuario local está editando. */
export function mergeRemoteIntoLocal(
  local: Record<string, string | null | undefined>,
  remote: Record<string, string | null | undefined>,
  dirtyKeys: Set<string>,
  keys: readonly string[],
): Record<string, string | null> {
  const next: Record<string, string | null> = { ...local } as Record<
    string,
    string | null
  >;
  for (const key of keys) {
    if (dirtyKeys.has(key)) continue;
    const val = remote[key];
    next[key] = val == null ? null : String(val);
  }
  return next;
}

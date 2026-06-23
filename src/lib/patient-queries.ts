/** Campos suficientes para listas, buscadores y mensajería (sin historial completo). */
export const PATIENT_LIST_SELECT = {
  id: true,
  fullName: true,
  documentType: true,
  dni: true,
  phone: true,
  birthDate: true,
  createdAt: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  allergyNotes: true,
  notes: true,
  referralSource: true,
  status: true,
} as const;
